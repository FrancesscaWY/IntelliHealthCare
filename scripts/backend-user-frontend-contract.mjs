#!/usr/bin/env node

const BASE_URL = process.env.BASE_URL ?? "http://server.mctown.online:8190/api/v1";
const APP_PHONE = process.env.APP_TEST_PHONE ?? "13900139000";
const APP_PASSWORD = process.env.APP_TEST_PASSWORD ?? "123456";
const APP_TEST_SMS_CODE = process.env.APP_TEST_SMS_CODE ?? "";
const REQUEST_TIMEOUT_MS = Number(process.env.SMOKE_TIMEOUT_MS ?? 120000);

const state = {
  appToken: "",
  refreshToken: "",
  reportIdForAi: "",
  addressIdForOrders: "",
  serviceIdForOrders: "",
  orderIdForReviews: ""
};

const results = [];

function addResult(group, name, passed, detail = "") {
  results.push({ group, name, passed, detail });
  const marker = passed ? "PASS" : "FAIL";
  const suffix = detail ? ` - ${detail}` : "";
  console.log(`[${marker}] [${group}] ${name}${suffix}`);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function uniqueSuffix(prefix) {
  return `${prefix}_${Date.now().toString(36)}`;
}

function normalizePath(path) {
  if (!path.startsWith("/")) {
    return `/${path}`;
  }

  return path;
}

function requestWithTimeout(url, options) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  return fetch(url, {
    ...options,
    signal: controller.signal
  }).finally(() => clearTimeout(timer));
}

async function httpRequest({
  method = "GET",
  path,
  token,
  body,
  headers: customHeaders,
  url
}) {
  const headers = {
    ...(customHeaders ?? {})
  };

  if (body !== undefined && !headers["content-type"]) {
    headers["content-type"] = "application/json";
  }

  if (token) {
    headers.authorization = `Bearer ${token}`;
  }

  const response = await requestWithTimeout(url ?? `${BASE_URL}${normalizePath(path)}`, {
    method,
    headers,
    body:
      body === undefined || typeof body === "string" || body instanceof Uint8Array
        ? body
        : JSON.stringify(body)
  });

  const text = await response.text();
  let json = null;

  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }

  return {
    status: response.status,
    text,
    json
  };
}

function requireSuccess(response, operation) {
  assert(
    response.status >= 200 && response.status < 300,
    `${operation} http status ${response.status}, body: ${response.text}`
  );
  assert(response.json && typeof response.json === "object", `${operation} response is not JSON`);
  assert(response.json.code === 0, `${operation} business code ${response.json.code}`);

  return response.json.data;
}

function listOf(data) {
  if (Array.isArray(data)) {
    return data;
  }

  if (data && typeof data === "object") {
    for (const key of ["list", "items", "rows", "records"]) {
      if (Array.isArray(data[key])) {
        return data[key];
      }
    }
  }

  return [];
}

function pickId(item, keys) {
  for (const key of keys) {
    const value = item?.[key];
    if (typeof value === "string" && value.length > 0) {
      return value;
    }
  }

  return "";
}

function expectObject(value, context) {
  assert(value && typeof value === "object" && !Array.isArray(value), `${context} should be an object`);
}

function expectString(value, context, { allowNull = false } = {}) {
  if (allowNull && value === null) {
    return;
  }

  assert(typeof value === "string" && value.length > 0, `${context} should be a non-empty string`);
}

function expectHttpUrl(value, context, { allowNull = false } = {}) {
  if (allowNull && value === null) {
    return;
  }

  expectString(value, context);
  assert(/^https?:\/\//.test(value), `${context} should be an absolute http url`);
}

function expectBoolean(value, context) {
  assert(typeof value === "boolean", `${context} should be a boolean`);
}

function expectNumber(value, context) {
  assert(typeof value === "number" && Number.isFinite(value), `${context} should be a number`);
}

function expectNumberish(value, context) {
  const isNumber = typeof value === "number" && Number.isFinite(value);
  const isNumericString =
    typeof value === "string" && value.length > 0 && !Number.isNaN(Number(value));
  assert(isNumber || isNumericString, `${context} should be numeric`);
}

function expectArray(value, context, { allowEmpty = true } = {}) {
  assert(Array.isArray(value), `${context} should be an array`);
  if (!allowEmpty) {
    assert(value.length > 0, `${context} should not be empty`);
  }
}

function expectHasKeys(value, keys, context) {
  expectObject(value, context);

  for (const key of keys) {
    assert(key in value, `${context} missing key ${key}`);
  }
}

function expectPaginatedList(data, context, { allowEmpty = true } = {}) {
  expectHasKeys(data, ["list", "page", "pageSize", "total", "hasMore"], context);
  expectArray(data.list, `${context}.list`, { allowEmpty });
  expectNumberish(data.page, `${context}.page`);
  expectNumberish(data.pageSize, `${context}.pageSize`);
  expectNumber(data.total, `${context}.total`);
  expectBoolean(data.hasMore, `${context}.hasMore`);
}

function expectDirectList(data, context, { allowEmpty = true } = {}) {
  expectArray(data, context, { allowEmpty });
}

function expectAnyItem(list, context) {
  expectArray(list, context, { allowEmpty: false });
  return list[0];
}

async function uploadViaPresign(uploadUrl, body, headers) {
  const response = await httpRequest({
    method: "PUT",
    url: uploadUrl,
    headers,
    body
  });

  assert(
    response.status >= 200 && response.status < 300,
    `upload via presign http status ${response.status}, body: ${response.text}`
  );
}

async function loginWithPassword() {
  const loginData = requireSuccess(
    await httpRequest({
      method: "POST",
      path: "/app/auth/login/password",
      body: {
        phone: APP_PHONE,
        password: APP_PASSWORD,
        agreePrivacy: true
      }
    }),
    "password login"
  );

  state.appToken = loginData.accessToken;
  state.refreshToken = loginData.refreshToken;

  return loginData;
}

async function getFirstUsableOrderId() {
  const orders = requireSuccess(
    await httpRequest({
      path: "/app/orders?page=1&pageSize=10",
      token: state.appToken
    }),
    "list orders for detail pages"
  );
  expectPaginatedList(orders, "orders list for detail pages", { allowEmpty: false });

  const preferred =
    orders.list.find((item) => item.status !== "PENDING_PAYMENT") ??
    orders.list[0];
  const orderId = pickId(preferred, ["orderId", "id"]);

  assert(orderId, "missing order id from orders list");
  return orderId;
}

async function getReviewedOrderId() {
  if (state.orderIdForReviews) {
    return state.orderIdForReviews;
  }

  const myReviews = requireSuccess(
    await httpRequest({
      path: "/app/users/me/reviews?page=1&pageSize=5",
      token: state.appToken
    }),
    "list my reviews for order review detail"
  );
  expectPaginatedList(myReviews, "my reviews for order review detail", { allowEmpty: false });

  const orderId = pickId(myReviews.list[0], ["orderId", "id"]);
  assert(orderId, "missing reviewed order id");
  state.orderIdForReviews = orderId;
  return orderId;
}

async function getAddressIdForOrders() {
  if (state.addressIdForOrders) {
    return state.addressIdForOrders;
  }

  const addresses = requireSuccess(
    await httpRequest({
      path: "/app/family/addresses",
      token: state.appToken
    }),
    "list addresses for orders"
  );
  expectDirectList(addresses, "address list for orders", { allowEmpty: false });

  const addressId = pickId(addresses[0], ["addressId", "id"]);
  assert(addressId, "missing address id for orders");
  state.addressIdForOrders = addressId;
  return addressId;
}

async function getServiceIdForOrders() {
  if (state.serviceIdForOrders) {
    return state.serviceIdForOrders;
  }

  const homeCare = requireSuccess(
    await httpRequest({
      path: "/app/services/home-care?page=1&pageSize=1",
      token: state.appToken
    }),
    "list home care services for orders"
  );
  expectPaginatedList(homeCare, "home care services for orders", { allowEmpty: false });

  const serviceId = pickId(homeCare.list[0], ["serviceId", "id"]);
  assert(serviceId, "missing service id for orders");
  state.serviceIdForOrders = serviceId;
  return serviceId;
}

async function runCase(group, name, fn) {
  try {
    await fn();
    addResult(group, name, true);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    addResult(group, name, false, detail);
  }
}

function summarize() {
  const total = results.length;
  const passed = results.filter((item) => item.passed).length;
  const failed = total - passed;
  const passRate = total === 0 ? 0 : (passed / total) * 100;

  const groups = new Map();
  for (const item of results) {
    const current = groups.get(item.group) ?? { total: 0, passed: 0 };
    current.total += 1;
    if (item.passed) {
      current.passed += 1;
    }
    groups.set(item.group, current);
  }

  console.log("\n=== User Frontend Contract Summary ===");
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Total: ${total}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Pass Rate: ${passRate.toFixed(2)}%`);
  console.log("Group Coverage:");

  for (const [group, stats] of groups.entries()) {
    const groupRate = stats.total === 0 ? 0 : (stats.passed / stats.total) * 100;
    console.log(`- ${group}: ${stats.passed}/${stats.total} (${groupRate.toFixed(2)}%)`);
  }

  if (failed > 0) {
    console.log("\nFailed Cases:");
    for (const item of results.filter((entry) => !entry.passed)) {
      console.log(`- [${item.group}] ${item.name}: ${item.detail}`);
    }
  }

  return { failed };
}

async function main() {
  await runCase("auth", "login and account entry pages", async () => {
    const privacy = requireSuccess(
      await httpRequest({
        path: "/app/agreements/privacy"
      }),
      "get privacy agreement"
    );
    expectString(privacy.title, "privacy.title");
    expectString(privacy.version, "privacy.version");
    expectString(privacy.content, "privacy.content");

    const loginData = await loginWithPassword();
    expectString(loginData.accessToken, "login.accessToken");
    expectString(loginData.refreshToken, "login.refreshToken");
    expectString(loginData.tokenType, "login.tokenType");
    assert(
      typeof loginData.expiresIn === "string" || typeof loginData.expiresIn === "number",
      "login.expiresIn should be string or number"
    );
    expectHasKeys(loginData.user, ["userId", "phone", "type", "roles"], "login.user");
    expectString(loginData.user.userId, "login.user.userId");
    expectString(loginData.user.phone, "login.user.phone");
    expectArray(loginData.user.roles, "login.user.roles", { allowEmpty: false });

    const refreshed = requireSuccess(
      await httpRequest({
        method: "POST",
        path: "/app/auth/token/refresh",
        body: {
          refreshToken: state.refreshToken
        }
      }),
      "refresh app token"
    );
    expectString(refreshed.accessToken, "refresh.accessToken");
    expectString(refreshed.refreshToken, "refresh.refreshToken");

    const loginSms = requireSuccess(
      await httpRequest({
        method: "POST",
        path: "/app/auth/sms/send",
        body: {
          phone: APP_PHONE,
          purpose: "login"
        }
      }),
      "send login sms"
    );
    expectString(loginSms.phone, "login sms.phone");
    expectString(loginSms.purpose, "login sms.purpose");
    expectBoolean(loginSms.sent, "login sms.sent");
    expectNumber(loginSms.expiresInSeconds, "login sms.expiresInSeconds");

    const loginCode =
      typeof loginSms.debugCode === "string" && loginSms.debugCode.length >= 4
        ? loginSms.debugCode
        : APP_TEST_SMS_CODE;
    assert(loginCode.length >= 4, "missing login sms code");

    const smsLogin = requireSuccess(
      await httpRequest({
        method: "POST",
        path: "/app/auth/login/sms",
        body: {
          phone: APP_PHONE,
          code: loginCode
        }
      }),
      "sms login"
    );
    expectString(smsLogin.accessToken, "sms login.accessToken");

    const thirdPartyLogin = requireSuccess(
      await httpRequest({
        method: "POST",
        path: "/app/auth/login/third-party",
        body: {
          phone: APP_PHONE,
          provider: "wechat"
        }
      }),
      "third party login"
    );
    expectString(thirdPartyLogin.accessToken, "thirdParty.accessToken");

    const resetSms = requireSuccess(
      await httpRequest({
        method: "POST",
        path: "/app/auth/sms/send",
        body: {
          phone: APP_PHONE,
          purpose: "password-reset"
        }
      }),
      "send password reset sms"
    );
    const resetCode =
      typeof resetSms.debugCode === "string" && resetSms.debugCode.length >= 4
        ? resetSms.debugCode
        : APP_TEST_SMS_CODE;
    assert(resetCode.length >= 4, "missing password reset sms code");

    const verified = requireSuccess(
      await httpRequest({
        method: "POST",
        path: "/app/auth/password/verify-code",
        body: {
          phone: APP_PHONE,
          code: resetCode
        }
      }),
      "verify password reset code"
    );
    expectBoolean(verified.verified, "verify-code.verified");

    const me = requireSuccess(
      await httpRequest({
        path: "/app/users/me",
        token: state.appToken
      }),
      "get current user"
    );
    expectHasKeys(
      me,
      ["userId", "name", "phone", "avatar", "gender", "birthday", "realNameVerified", "type", "roles"],
      "current user"
    );
    expectString(me.userId, "current user.userId");
    expectString(me.name, "current user.name");
    expectString(me.phone, "current user.phone");
    expectBoolean(me.realNameVerified, "current user.realNameVerified");
    expectArray(me.roles, "current user.roles", { allowEmpty: false });
  });

  await runCase("home_user", "home, mine, profile, search, and settings pages", async () => {
    const dashboard = requireSuccess(
      await httpRequest({
        path: "/app/home/dashboard",
        token: state.appToken
      }),
      "home dashboard"
    );
    expectHasKeys(
      dashboard,
      ["city", "serviceEntries", "featureEntries", "healthReminder", "hotDiseases", "recommendedArticles"],
      "dashboard"
    );
    expectString(dashboard.city, "dashboard.city");
    expectArray(dashboard.serviceEntries, "dashboard.serviceEntries", { allowEmpty: false });
    expectHasKeys(
      dashboard.serviceEntries[0],
      ["serviceId", "title", "category", "price", "image"],
      "dashboard.serviceEntries[0]"
    );
    expectArray(dashboard.featureEntries, "dashboard.featureEntries", { allowEmpty: false });
    expectHasKeys(dashboard.featureEntries[0], ["key", "title"], "dashboard.featureEntries[0]");
    expectArray(dashboard.hotDiseases, "dashboard.hotDiseases", { allowEmpty: false });
    expectHasKeys(dashboard.hotDiseases[0], ["diseaseId", "title", "summary"], "dashboard.hotDiseases[0]");
    expectArray(dashboard.recommendedArticles, "dashboard.recommendedArticles", { allowEmpty: false });
    expectHasKeys(
      dashboard.recommendedArticles[0],
      ["articleId", "title", "summary", "coverUrl", "sourceName", "sourceUrl", "publishedAt", "readingMinutes"],
      "dashboard.recommendedArticles[0]"
    );

    const currentLocation = requireSuccess(
      await httpRequest({
        path: "/app/locations/current",
        token: state.appToken
      }),
      "current location"
    );
    expectString(currentLocation.city, "currentLocation.city");
    expectString(currentLocation.district, "currentLocation.district");

    const cities = requireSuccess(
      await httpRequest({
        path: "/app/locations/cities",
        token: state.appToken
      }),
      "location cities"
    );
    expectDirectList(cities, "location cities", { allowEmpty: false });
    expectHasKeys(cities[0], ["city", "districts"], "location cities[0]");
    expectArray(cities[0].districts, "location cities[0].districts");

    const profile = requireSuccess(
      await httpRequest({
        path: "/app/users/me/profile",
        token: state.appToken
      }),
      "user profile"
    );
    expectHasKeys(
      profile,
      ["userId", "nickname", "realName", "avatar", "phone", "city", "gender", "birthday", "realNameStatus", "stats", "boundElders"],
      "user profile"
    );
    expectString(profile.userId, "profile.userId");
    expectString(profile.phone, "profile.phone");
    expectHasKeys(profile.stats, ["footprints", "reviews", "coupons"], "profile.stats");
    expectArray(profile.boundElders, "profile.boundElders");

    const security = requireSuccess(
      await httpRequest({
        path: "/app/users/me/security",
        token: state.appToken
      }),
      "user security"
    );
    expectHasKeys(
      security,
      ["userId", "phone", "realNameStatus", "hasPassword", "lastLoginAt", "thirdPartyBindings"],
      "security"
    );
    expectString(security.phone, "security.phone");
    expectBoolean(security.hasPassword, "security.hasPassword");
    expectArray(security.thirdPartyBindings, "security.thirdPartyBindings", { allowEmpty: false });

    const settings = requireSuccess(
      await httpRequest({
        path: "/app/users/me/settings",
        token: state.appToken
      }),
      "user settings"
    );
    expectHasKeys(settings, ["messageSettings", "privacySettings", "commonSettings"], "settings");
    expectHasKeys(
      settings.messageSettings,
      ["systemNotice", "orderNotice", "healthAlert", "communityNotice", "smsEnabled"],
      "settings.messageSettings"
    );

    const updatedMessageSettings = requireSuccess(
      await httpRequest({
        method: "PUT",
        path: "/app/users/me/settings/message",
        token: state.appToken,
        body: settings.messageSettings
      }),
      "update message settings"
    );
    expectBoolean(updatedMessageSettings.updated, "update message settings.updated");
    expectHasKeys(
      updatedMessageSettings.messageSettings,
      ["systemNotice", "orderNotice", "healthAlert", "communityNotice", "smsEnabled"],
      "updated message settings.messageSettings"
    );

    const updatedProfile = requireSuccess(
      await httpRequest({
        method: "PUT",
        path: "/app/users/me/profile",
        token: state.appToken,
        body: {
          nickname: profile.nickname,
          avatar: profile.avatar,
          city: profile.city,
          gender: profile.gender,
          birthday: profile.birthday
        }
      }),
      "update profile"
    );
    expectHasKeys(
      updatedProfile,
      ["userId", "nickname", "avatar", "city", "gender", "birthday"],
      "updated profile"
    );

    const points = requireSuccess(
      await httpRequest({
        path: "/app/users/me/points?page=1&pageSize=5",
        token: state.appToken
      }),
      "user points"
    );
    expectHasKeys(points, ["summary", "records"], "points");
    expectHasKeys(points.summary, ["balance", "totalIncome", "totalExpense"], "points.summary");
    expectPaginatedList(points.records, "points.records");

    const footprints = requireSuccess(
      await httpRequest({
        path: "/app/users/me/footprints?page=1&pageSize=5",
        token: state.appToken
      }),
      "user footprints"
    );
    expectPaginatedList(footprints, "footprints");
    if (footprints.list.length > 0) {
      expectHasKeys(
        footprints.list[0],
        ["footprintId", "targetType", "targetId", "title", "coverUrl", "metadata", "viewedAt"],
        "footprints.list[0]"
      );
    }

    const activities = requireSuccess(
      await httpRequest({
        path: "/app/users/me/activities?page=1&pageSize=5",
        token: state.appToken
      }),
      "user activities"
    );
    expectPaginatedList(activities, "activities");
    if (activities.list.length > 0) {
      expectHasKeys(
        activities.list[0],
        ["registrationId", "status", "registeredAt", "checkedInAt", "cancellationReason", "activity"],
        "activities.list[0]"
      );
      expectHasKeys(
        activities.list[0].activity,
        ["activityId", "title", "category", "status", "location", "coverUrl", "startAt", "endAt"],
        "activities.list[0].activity"
      );
    }

    const coupons = requireSuccess(
      await httpRequest({
        path: "/app/users/me/coupons?page=1&pageSize=5",
        token: state.appToken
      }),
      "user coupons"
    );
    expectPaginatedList(coupons, "coupons");
    if (coupons.list.length > 0) {
      expectHasKeys(
        coupons.list[0],
        ["couponId", "status", "claimedAt", "usedAt", "expiresAt", "orderRemark", "template"],
        "coupons.list[0]"
      );
      expectHasKeys(
        coupons.list[0].template,
        ["couponTemplateId", "title", "description", "discountType", "discountValue", "minSpend"],
        "coupons.list[0].template"
      );
    }

    const hotTags = requireSuccess(
      await httpRequest({
        path: "/app/search/hot-tags",
        token: state.appToken
      }),
      "search hot tags"
    );
    expectDirectList(hotTags, "hot tags", { allowEmpty: false });
    expectHasKeys(hotTags[0], ["keyword", "rank", "hotScore"], "hotTags[0]");

    const historyBefore = requireSuccess(
      await httpRequest({
        path: "/app/search/history",
        token: state.appToken
      }),
      "search history before add"
    );
    expectDirectList(historyBefore, "search history before add");

    const keyword = uniqueSuffix("contract_search");
    const addedHistory = requireSuccess(
      await httpRequest({
        method: "POST",
        path: "/app/search/history",
        token: state.appToken,
        body: {
          keyword
        }
      }),
      "add search history"
    );
    expectString(addedHistory.id, "added search history.id");
    expectString(addedHistory.keyword, "added search history.keyword");

    const globalSearch = requireSuccess(
      await httpRequest({
        path: `/app/search/global?keyword=康复&page=1&pageSize=5`,
        token: state.appToken
      }),
      "global search"
    );
    expectPaginatedList(globalSearch, "global search");
    if (globalSearch.list.length > 0) {
      expectHasKeys(
        globalSearch.list[0],
        ["targetType", "targetId", "title", "summary", "coverUrl"],
        "globalSearch.list[0]"
      );
    }
  });

  await runCase("reviews", "review-related user pages", async () => {
    const myReviews = requireSuccess(
      await httpRequest({
        path: "/app/users/me/reviews?page=1&pageSize=5",
        token: state.appToken
      }),
      "my reviews"
    );
    expectPaginatedList(myReviews, "my reviews");
    if (myReviews.list.length > 0) {
      expectHasKeys(
        myReviews.list[0],
        ["reviewId", "orderId", "orderNo", "score", "tags", "content", "createdAt", "service"],
        "myReviews.list[0]"
      );
      state.orderIdForReviews = pickId(myReviews.list[0], ["orderId", "id"]);
    }
  });

  await runCase("family_archive", "family, address, and health archive pages", async () => {
    const bindings = requireSuccess(
      await httpRequest({
        path: "/app/family/bindings",
        token: state.appToken
      }),
      "family bindings"
    );
    expectDirectList(bindings, "family bindings");
    if (bindings.length > 0) {
      expectHasKeys(
        bindings[0],
        ["bindingId", "elderId", "elderName", "relationLabel", "authScope"],
        "family bindings[0]"
      );
    }

    const addresses = requireSuccess(
      await httpRequest({
        path: "/app/family/addresses",
        token: state.appToken
      }),
      "address list"
    );
    expectDirectList(addresses, "address list", { allowEmpty: false });
    expectHasKeys(
      addresses[0],
      ["addressId", "label", "receiverName", "receiverPhone", "province", "city", "district", "detailAddress", "isDefault"],
      "address list[0]"
    );
    state.addressIdForOrders = pickId(addresses[0], ["addressId", "id"]);

    const createdAddress = requireSuccess(
      await httpRequest({
        method: "POST",
        path: "/app/family/addresses",
        token: state.appToken,
        body: {
          label: "API Contract Address",
          receiverName: "API Contract",
          receiverPhone: "13900000000",
          province: "Shanghai",
          city: "Shanghai",
          district: "Pudong",
          street: "Century Avenue",
          detailAddress: uniqueSuffix("Room 1001"),
          isDefault: false
        }
      }),
      "create address"
    );
    expectString(createdAddress.addressId, "created address.addressId");
    expectBoolean(createdAddress.isDefault, "created address.isDefault");

    const updatedAddress = requireSuccess(
      await httpRequest({
        method: "PUT",
        path: `/app/family/addresses/${createdAddress.addressId}`,
        token: state.appToken,
        body: {
          label: "API Contract Address Updated",
          receiverName: "API Contract",
          receiverPhone: "13900000000",
          province: "Shanghai",
          city: "Shanghai",
          district: "Pudong",
          street: "Century Avenue",
          detailAddress: uniqueSuffix("Room 1002"),
          isDefault: false
        }
      }),
      "update address"
    );
    expectString(updatedAddress.addressId, "updated address.addressId");

    const summary = requireSuccess(
      await httpRequest({
        path: "/app/health/archive/summary",
        token: state.appToken
      }),
      "archive summary"
    );
    expectHasKeys(
      summary,
      ["userId", "name", "age", "avatar", "gender", "birthday", "reportCount", "deviceCount", "riskTags", "longTermMemory", "recentAlerts"],
      "archive summary"
    );
    expectString(summary.userId, "archive summary.userId");
    expectString(summary.name, "archive summary.name");
    expectNumber(summary.age, "archive summary.age");
    expectArray(summary.riskTags, "archive summary.riskTags");
    expectArray(summary.recentAlerts, "archive summary.recentAlerts");

    const basicInfo = requireSuccess(
      await httpRequest({
        path: "/app/health/archive/basic-info",
        token: state.appToken
      }),
      "archive basic info"
    );
    expectHasKeys(
      basicInfo,
      ["avatar", "name", "idCard", "gender", "birthday", "phone", "address", "height", "weight", "nativePlace", "ethnicity", "education", "maritalStatus", "occupation", "bloodType", "emergencyContact"],
      "archive basic info"
    );
    expectString(basicInfo.name, "archive basic info.name");
    expectString(basicInfo.phone, "archive basic info.phone");

    const updatedBasicInfo = requireSuccess(
      await httpRequest({
        method: "PUT",
        path: "/app/health/archive/basic-info",
        token: state.appToken,
        body: {
          avatar: basicInfo.avatar,
          name: basicInfo.name,
          phone: basicInfo.phone,
          birthday: basicInfo.birthday,
          address: basicInfo.address,
          height: basicInfo.height,
          weight: basicInfo.weight,
          education: basicInfo.education,
          occupation: basicInfo.occupation,
          emergencyContact: basicInfo.emergencyContact
        }
      }),
      "update archive basic info"
    );
    expectString(updatedBasicInfo.name, "updated archive basic info.name");

    const medicalHistory = requireSuccess(
      await httpRequest({
        path: "/app/health/archive/medical-history",
        token: state.appToken
      }),
      "archive medical history"
    );
    expectHasKeys(medicalHistory, ["medicalHistory", "riskTags", "longTermMemory"], "archive medical history");

    const updatedMedicalHistory = requireSuccess(
      await httpRequest({
        method: "PUT",
        path: "/app/health/archive/medical-history",
        token: state.appToken,
        body: {
          medicalHistory: medicalHistory.medicalHistory,
          riskTags: medicalHistory.riskTags,
          longTermMemory: medicalHistory.longTermMemory
        }
      }),
      "update archive medical history"
    );
    expectHasKeys(
      updatedMedicalHistory,
      ["medicalHistory", "riskTags", "longTermMemory"],
      "updated archive medical history"
    );
  });

  await runCase("health", "health data, devices, and medication pages", async () => {
    const overview = requireSuccess(
      await httpRequest({
        path: "/app/health/metrics/overview",
        token: state.appToken
      }),
      "health overview"
    );
    expectHasKeys(
      overview,
      ["score", "scoreLabel", "profileSummary", "summaryCards", "alerts", "linkedDevices"],
      "health overview"
    );
    expectNumber(overview.score, "health overview.score");
    expectString(overview.scoreLabel, "health overview.scoreLabel");
    expectHasKeys(
      overview.profileSummary,
      ["name", "avatar", "age", "height", "weight", "deviceCount"],
      "health overview.profileSummary"
    );
    expectHttpUrl(overview.profileSummary.avatar, "health overview.profileSummary.avatar");
    expectArray(overview.summaryCards, "health overview.summaryCards", { allowEmpty: false });
    expectHasKeys(
      overview.summaryCards[0],
      ["key", "label", "value", "unit", "measuredAt", "abnormal"],
      "health overview.summaryCards[0]"
    );

    const trend = requireSuccess(
      await httpRequest({
        path: "/app/health/metrics/bloodPressure/trend",
        token: state.appToken
      }),
      "metric trend"
    );
    expectHasKeys(trend, ["metricKey", "label", "points"], "metric trend");
    expectString(trend.metricKey, "metric trend.metricKey");
    expectArray(trend.points, "metric trend.points");
    if (trend.points.length > 0) {
      expectHasKeys(
        trend.points[0],
        ["recordId", "measuredAt", "value", "displayValue"],
        "metric trend.points[0]"
      );
    }

    const metricRecords = requireSuccess(
      await httpRequest({
        path: "/app/health/metrics/weight/records?page=1&pageSize=5",
        token: state.appToken
      }),
      "metric records"
    );
    expectPaginatedList(metricRecords, "metric records");

    const createdMetricRecord = requireSuccess(
      await httpRequest({
        method: "POST",
        path: "/app/health/metrics/weight/records",
        token: state.appToken,
        body: {
          value: 61.2,
          unit: "kg",
          note: "user frontend contract test",
          measuredAt: new Date().toISOString()
        }
      }),
      "create metric record"
    );
    expectHasKeys(
      createdMetricRecord,
      ["recordId", "metricKey", "label", "value", "displayValue", "unit", "payload", "note", "abnormal", "measuredAt"],
      "created metric record"
    );

    const updatedMetricRecord = requireSuccess(
      await httpRequest({
        method: "PUT",
        path: `/app/health/metrics/weight/records/${createdMetricRecord.recordId}`,
        token: state.appToken,
        body: {
          value: 61.8,
          unit: "kg",
          note: "user frontend contract test updated",
          measuredAt: new Date().toISOString()
        }
      }),
      "update metric record"
    );
    expectString(updatedMetricRecord.recordId, "updated metric record.recordId");

    const deletedMetricRecord = requireSuccess(
      await httpRequest({
        method: "DELETE",
        path: `/app/health/metrics/weight/records/${createdMetricRecord.recordId}`,
        token: state.appToken
      }),
      "delete metric record"
    );
    expectBoolean(deletedMetricRecord.deleted, "deleted metric record.deleted");

    const devices = requireSuccess(
      await httpRequest({
        path: "/app/health/devices",
        token: state.appToken
      }),
      "devices list"
    );
    expectDirectList(devices, "devices list", { allowEmpty: false });
    expectHasKeys(
      devices[0],
      ["deviceId", "type", "name", "status", "batteryText", "latestPayload", "locationLabel", "updatedAt"],
      "devices[0]"
    );
    const deviceId = pickId(devices[0], ["deviceId", "id"]);
    assert(deviceId, "missing deviceId for device detail");

    const deviceDetail = requireSuccess(
      await httpRequest({
        path: `/app/health/devices/${deviceId}`,
        token: state.appToken
      }),
      "device detail"
    );
    expectHasKeys(
      deviceDetail,
      ["deviceId", "type", "name", "status", "batteryText", "latestPayload", "locationLabel", "updatedAt", "serialNo", "settings", "lastSyncedAt"],
      "device detail"
    );

    const deviceMeasurements = requireSuccess(
      await httpRequest({
        path: `/app/health/devices/${deviceId}/measurements`,
        token: state.appToken
      }),
      "device measurements"
    );
    expectDirectList(deviceMeasurements, "device measurements");

    const updatedDeviceSettings = requireSuccess(
      await httpRequest({
        method: "PUT",
        path: `/app/health/devices/${deviceId}/settings`,
        token: state.appToken,
        body: {
          settings: {
            notifications: true,
            autoSync: true
          }
        }
      }),
      "update device settings"
    );
    expectString(updatedDeviceSettings.deviceId, "updated device settings.deviceId");

    const updatedDevicePassword = requireSuccess(
      await httpRequest({
        method: "PUT",
        path: `/app/health/devices/${deviceId}/password`,
        token: state.appToken,
        body: {
          password: "4321"
        }
      }),
      "update device password"
    );
    expectString(updatedDevicePassword.deviceId, "updated device password.deviceId");

    const updatedHeartRateSettings = requireSuccess(
      await httpRequest({
        method: "PUT",
        path: `/app/health/devices/${deviceId}/heart-rate-settings`,
        token: state.appToken,
        body: {
          settings: {
            high: 120,
            low: 50
          }
        }
      }),
      "update heart rate settings"
    );
    expectString(updatedHeartRateSettings.deviceId, "updated heart rate settings.deviceId");

    const boundDevice = requireSuccess(
      await httpRequest({
        method: "POST",
        path: "/app/health/devices/scan/bind",
        token: state.appToken,
        body: {
          serialNo: uniqueSuffix("CONTRACT_SCAN"),
          type: "OXIMETER",
          nickname: "Contract Device"
        }
      }),
      "bind device"
    );
    expectString(boundDevice.deviceId, "bound device.deviceId");

    const unboundDevice = requireSuccess(
      await httpRequest({
        method: "DELETE",
        path: `/app/health/devices/${boundDevice.deviceId}`,
        token: state.appToken
      }),
      "unbind device"
    );
    expectBoolean(unboundDevice.deleted, "unbind device.deleted");

    const todayMedications = requireSuccess(
      await httpRequest({
        path: "/app/health/medications/today",
        token: state.appToken
      }),
      "today medications"
    );
    expectHasKeys(todayMedications, ["date", "list"], "today medications");
    expectArray(todayMedications.list, "today medications.list");
    if (todayMedications.list.length > 0) {
      expectHasKeys(
        todayMedications.list[0],
        ["medicationId", "name", "dosage", "frequency", "mealTiming", "route", "indication", "scheduleTimes", "startDate", "endDate", "active", "logs"],
        "today medications.list[0]"
      );
    }

    const medications = requireSuccess(
      await httpRequest({
        path: "/app/health/medications",
        token: state.appToken
      }),
      "medications list"
    );
    expectDirectList(medications, "medications list");

    const createdMedication = requireSuccess(
      await httpRequest({
        method: "POST",
        path: "/app/health/medications",
        token: state.appToken,
        body: {
          name: "Vitamin D",
          dosage: "1 tablet",
          frequency: "daily",
          mealTiming: "after-meal",
          route: "oral",
          indication: "supplement",
          scheduleTimes: ["08:00"],
          startDate: new Date().toISOString().slice(0, 10)
        }
      }),
      "create medication"
    );
    expectString(createdMedication.medicationId, "created medication.medicationId");

    const updatedMedication = requireSuccess(
      await httpRequest({
        method: "PUT",
        path: `/app/health/medications/${createdMedication.medicationId}`,
        token: state.appToken,
        body: {
          name: "Vitamin D",
          dosage: "2 tablets",
          frequency: "daily",
          mealTiming: "after-meal",
          route: "oral",
          indication: "supplement",
          scheduleTimes: ["08:30"],
          startDate: new Date().toISOString().slice(0, 10),
          active: true
        }
      }),
      "update medication"
    );
    expectString(updatedMedication.medicationId, "updated medication.medicationId");

    const takenMedication = requireSuccess(
      await httpRequest({
        method: "POST",
        path: `/app/health/medications/${createdMedication.medicationId}/take`,
        token: state.appToken,
        body: {
          note: "contract taken",
          scheduledAt: new Date().toISOString()
        }
      }),
      "take medication"
    );
    expectHasKeys(takenMedication, ["logId", "status", "takenAt"], "taken medication");

    const deletedMedication = requireSuccess(
      await httpRequest({
        method: "DELETE",
        path: `/app/health/medications/${createdMedication.medicationId}`,
        token: state.appToken
      }),
      "delete medication"
    );
    expectBoolean(deletedMedication.deleted, "deleted medication.deleted");
  });

  await runCase("diet_pages", "diet plan and recipe detail pages", async () => {
    const dietPlan = requireSuccess(
      await httpRequest({
        path: "/app/health/diet/plan",
        token: state.appToken
      }),
      "diet plan"
    );
    expectHasKeys(
      dietPlan,
      ["overview", "mealTabs", "recipes"],
      "diet plan page contract"
    );
    expectHasKeys(
      dietPlan.overview,
      ["title", "subtitle", "calories", "protein", "fiber"],
      "diet plan page contract.overview"
    );
    expectArray(dietPlan.mealTabs, "diet plan page contract.mealTabs", { allowEmpty: false });
    expectHasKeys(
      dietPlan.mealTabs[0],
      ["key", "label", "desc", "highlight"],
      "diet plan page contract.mealTabs[0]"
    );
    expectArray(dietPlan.recipes, "diet plan page contract.recipes", { allowEmpty: false });
    expectHasKeys(
      dietPlan.recipes[0],
      ["id", "title", "subtitle", "publishDate", "mealKeys", "energy", "time", "tags", "imageUrl", "ingredients", "steps"],
      "diet plan page contract.recipes[0]"
    );

    const recipes = requireSuccess(
      await httpRequest({
        path: "/app/health/diet/recipes?page=1&pageSize=5",
        token: state.appToken
      }),
      "diet recipes"
    );
    expectPaginatedList(recipes, "diet recipes", { allowEmpty: false });
    expectHasKeys(
      recipes.list[0],
      ["recipeId", "title", "summary", "coverUrl", "calories", "mealType", "tags"],
      "diet recipes.list[0]"
    );
    const recipeId = pickId(recipes.list[0], ["recipeId", "id"]);
    assert(recipeId, "missing recipeId");

    const recipeDetail = requireSuccess(
      await httpRequest({
        path: `/app/health/diet/recipes/${recipeId}`,
        token: state.appToken
      }),
      "diet recipe detail"
    );
    expectHasKeys(
      recipeDetail,
      ["title", "publishDate", "imageUrl", "ingredients", "steps"],
      "diet recipe detail page contract"
    );
  });

  await runCase("diet_record_pages", "diet record pages", async () => {
    const dietRecords = requireSuccess(
      await httpRequest({
        path: "/app/health/diet-records",
        token: state.appToken
      }),
      "diet records"
    );
    expectHasKeys(dietRecords, ["days"], "diet record page contract");
    expectArray(dietRecords.days, "diet record page contract.days", { allowEmpty: false });
    expectHasKeys(
      dietRecords.days[0],
      ["id", "titleDate", "sheetLabel", "totalCalories", "macros", "meals"],
      "diet record page contract.days[0]"
    );

    const recipes = requireSuccess(
      await httpRequest({
        path: "/app/health/diet/recipes?page=1&pageSize=1",
        token: state.appToken
      }),
      "diet recipe list for record creation"
    );
    expectPaginatedList(recipes, "diet recipe list for record creation", { allowEmpty: false });
    const recipeId = pickId(recipes.list[0], ["recipeId", "id"]);
    assert(recipeId, "missing recipe id for diet record");

    const createdDietRecord = requireSuccess(
      await httpRequest({
        method: "POST",
        path: "/app/health/diet-records",
        token: state.appToken,
        body: {
          recipeId,
          mealType: "BREAKFAST",
          foods: [
            {
              name: "Oatmeal",
              amount: "1 bowl"
            }
          ],
          totalCalories: 320,
          note: "user frontend contract test",
          eatenAt: new Date().toISOString()
        }
      }),
      "create diet record"
    );
    expectString(createdDietRecord.recordId, "created diet record.recordId");

    const dietHistory = requireSuccess(
      await httpRequest({
        path: "/app/health/diet-records/history?page=1&pageSize=5",
        token: state.appToken
      }),
      "diet history"
    );
    expectHasKeys(dietHistory, ["years", "months", "monthOptions", "selectedDateId"], "diet history page contract");
  });

  await runCase("self_test_pages", "self-test pages", async () => {
    const selfTests = requireSuccess(
      await httpRequest({
        path: "/app/health/self-tests",
        token: state.appToken
      }),
      "self tests"
    );
    expectDirectList(selfTests, "self tests", { allowEmpty: false });
    expectHasKeys(
      selfTests[0],
      ["testId", "title", "category", "intro", "measuredCount", "accentColor"],
      "self tests[0]"
    );

    const testId = pickId(selfTests[0], ["testId", "id"]);
    assert(testId, "missing self test id");

    const selfTestDetail = requireSuccess(
      await httpRequest({
        path: `/app/health/self-tests/${testId}`,
        token: state.appToken
      }),
      "self test detail"
    );
    expectHasKeys(
      selfTestDetail,
      ["testId", "title", "category", "intro", "measuredCount", "resultAdvice", "questions"],
      "self test detail"
    );
    expectArray(selfTestDetail.questions, "self test detail.questions", { allowEmpty: false });
    expectHasKeys(
      selfTestDetail.questions[0],
      ["questionId", "text", "helper", "options"],
      "self test detail.questions[0]"
    );
    expectArray(selfTestDetail.questions[0].options, "self test detail.questions[0].options", { allowEmpty: false });

    const answers = selfTestDetail.questions.map((item) => ({
      questionId: item.questionId,
      optionIndex: 0
    }));
    const submittedSelfTest = requireSuccess(
      await httpRequest({
        method: "POST",
        path: `/app/health/self-tests/${testId}/submit`,
        token: state.appToken,
        body: {
          answers
        }
      }),
      "submit self test"
    );
    expectHasKeys(
      submittedSelfTest,
      ["attemptId", "testId", "totalScore", "level", "summary", "completedAt"],
      "submitted self test"
    );

    const selfTestHistory = requireSuccess(
      await httpRequest({
        path: "/app/health/self-tests/history?page=1&pageSize=5",
        token: state.appToken
      }),
      "self test history"
    );
    expectPaginatedList(selfTestHistory, "self test history");
  });

  await runCase("services_orders_payments", "service, booking, order, and payment pages", async () => {
    const categories = requireSuccess(
      await httpRequest({
        path: "/app/services/categories",
        token: state.appToken
      }),
      "service categories"
    );
    expectDirectList(categories, "service categories", { allowEmpty: false });
    expectHasKeys(categories[0], ["slug", "category", "count", "coverUrl", "title"], "service categories[0]");
    expectHttpUrl(categories[0].coverUrl, "service categories[0].coverUrl");

    const serviceRoutes = [
      "/app/services/home-care?page=1&pageSize=1",
      "/app/services/rehab-therapy?page=1&pageSize=1",
      "/app/services/home-exam?page=1&pageSize=1",
      "/app/services/elderly-care?page=1&pageSize=1"
    ];

    for (const route of serviceRoutes) {
      const list = requireSuccess(
        await httpRequest({
          path: route,
          token: state.appToken
        }),
        `service list ${route}`
      );
      expectPaginatedList(list, `service list ${route}`, { allowEmpty: false });
      expectHasKeys(
        list.list[0],
        ["serviceId", "code", "category", "title", "summary", "price", "marketPrice", "durationMinutes", "rating", "salesVolume", "coverUrl", "tags", "institution"],
        `service list item ${route}`
      );
      expectHttpUrl(list.list[0].coverUrl, `service list item ${route}.coverUrl`);
    }

    const serviceId = await getServiceIdForOrders();
    const serviceDetail = requireSuccess(
      await httpRequest({
        path: `/app/services/home-care/${serviceId}`,
        token: state.appToken
      }),
      "service detail"
    );
    expectHasKeys(
      serviceDetail,
      ["serviceId", "code", "category", "title", "summary", "price", "marketPrice", "durationMinutes", "rating", "salesVolume", "coverUrl", "tags", "regionScope", "serviceContent", "ragSnippet", "institution"],
      "service detail"
    );
    expectHttpUrl(serviceDetail.coverUrl, "service detail.coverUrl");

    const bookingOptions = requireSuccess(
      await httpRequest({
        path: `/app/orders/booking/options?serviceId=${serviceId}`,
        token: state.appToken
      }),
      "booking options"
    );
    expectHasKeys(bookingOptions, ["service", "elders", "addresses", "availableDates"], "booking options");
    expectArray(bookingOptions.elders, "booking options.elders");
    expectArray(bookingOptions.addresses, "booking options.addresses", { allowEmpty: false });
    expectArray(bookingOptions.availableDates, "booking options.availableDates", { allowEmpty: false });

    const addressId = await getAddressIdForOrders();
    const preview = requireSuccess(
      await httpRequest({
        method: "POST",
        path: "/app/orders/preview",
        token: state.appToken,
        body: {
          serviceId,
          addressId,
          bookingDate: "2026-04-30",
          bookingTimeSlot: "09:00-11:00"
        }
      }),
      "order preview"
    );
    expectHasKeys(
      preview,
      ["service", "elderId", "address", "bookingDate", "bookingTimeSlot", "remark", "coupon", "price", "healthSummary"],
      "order preview"
    );
    expectHasKeys(preview.service, ["serviceId", "title", "category", "price", "coverUrl"], "order preview.service");
    expectHasKeys(preview.address, ["addressId", "receiverName", "receiverPhone", "city", "district", "detailAddress"], "order preview.address");
    expectHasKeys(preview.price, ["originalAmount", "discountAmount", "payableAmount"], "order preview.price");

    const createdOrder = requireSuccess(
      await httpRequest({
        method: "POST",
        path: "/app/orders",
        token: state.appToken,
        body: {
          serviceId,
          addressId,
          bookingDate: "2026-04-30",
          bookingTimeSlot: "09:00-11:00",
          contactName: "User Contract",
          contactPhone: "13900139000"
        }
      }),
      "create order"
    );
    expectHasKeys(createdOrder, ["orderId", "orderNo", "status"], "created order");
    expectString(createdOrder.orderId, "created order.orderId");
    expectString(createdOrder.orderNo, "created order.orderNo");

    const orders = requireSuccess(
      await httpRequest({
        path: "/app/orders?page=1&pageSize=5",
        token: state.appToken
      }),
      "orders list"
    );
    expectPaginatedList(orders, "orders list", { allowEmpty: false });
    expectHasKeys(
      orders.list[0],
      ["orderId", "orderNo", "serviceCategory", "status", "statusText", "title", "image", "actualAmount", "bookingDate", "bookingTimeSlot", "createdAt"],
      "orders list[0]"
    );

    const orderIdForDetailPages = await getFirstUsableOrderId();
    const orderDetail = requireSuccess(
      await httpRequest({
        path: `/app/orders/${orderIdForDetailPages}`,
        token: state.appToken
      }),
      "order detail"
    );
    expectHasKeys(
      orderDetail,
      ["orderId", "orderNo", "serviceCategory", "status", "statusText", "title", "image", "bookingDate", "bookingTimeSlot", "createdAt"],
      "order detail"
    );

    const timeline = requireSuccess(
      await httpRequest({
        path: `/app/orders/${orderIdForDetailPages}/timeline`,
        token: state.appToken
      }),
      "order timeline"
    );
    expectDirectList(timeline, "order timeline", { allowEmpty: false });
    expectHasKeys(
      timeline[0],
      ["timelineId", "status", "title", "description", "operatorName", "createdAt"],
      "order timeline[0]"
    );

    const voucher = requireSuccess(
      await httpRequest({
        path: `/app/orders/${orderIdForDetailPages}/voucher`,
        token: state.appToken
      }),
      "order voucher"
    );
    expectHasKeys(
      voucher,
      ["orderId", "voucherCode", "status", "bookingDate", "bookingTimeSlot"],
      "order voucher"
    );

    const serviceRecords = requireSuccess(
      await httpRequest({
        path: `/app/orders/${orderIdForDetailPages}/service-records`,
        token: state.appToken
      }),
      "service records"
    );
    expectDirectList(serviceRecords, "service records");
    if (serviceRecords.length > 0) {
      expectHasKeys(
        serviceRecords[0],
        ["workOrderId", "status", "institutionName", "assigneeName", "scheduleAt", "startedAt", "completedAt", "dispatchNote"],
        "service records[0]"
      );
    }

    const afterSales = requireSuccess(
      await httpRequest({
        path: `/app/orders/${orderIdForDetailPages}/after-sales`,
        token: state.appToken
      }),
      "after sales list"
    );
    expectDirectList(afterSales, "after sales list");

    const paymentChannels = requireSuccess(
      await httpRequest({
        path: "/app/payments/channels",
        token: state.appToken
      }),
      "payment channels"
    );
    expectDirectList(paymentChannels, "payment channels", { allowEmpty: false });
    expectHasKeys(paymentChannels[0], ["channel", "title", "enabled"], "payment channels[0]");

    const createdPayment = requireSuccess(
      await httpRequest({
        method: "POST",
        path: "/app/payments",
        token: state.appToken,
        body: {
          orderId: createdOrder.orderId,
          channel: "WECHAT"
        }
      }),
      "create payment"
    );
    expectHasKeys(createdPayment, ["paymentId", "paymentNo", "status", "amount", "channel"], "created payment");
    expectString(createdPayment.paymentId, "created payment.paymentId");

    const paymentDetail = requireSuccess(
      await httpRequest({
        path: `/app/payments/${createdPayment.paymentId}`,
        token: state.appToken
      }),
      "payment detail"
    );
    expectHasKeys(
      paymentDetail,
      ["paymentId", "paymentNo", "orderId", "status", "channel", "amount", "paidAt", "createdAt"],
      "payment detail"
    );

    const confirmedPayment = requireSuccess(
      await httpRequest({
        method: "POST",
        path: `/app/payments/${createdPayment.paymentId}/confirm`,
        token: state.appToken
      }),
      "confirm payment"
    );
    expectHasKeys(
      confirmedPayment,
      ["paymentId", "paymentNo", "orderId", "status", "channel", "amount", "paidAt", "createdAt"],
      "confirmed payment"
    );
    expectString(confirmedPayment.paidAt, "confirmed payment.paidAt");
  });

  await runCase("order_reviews", "order review detail pages", async () => {
    const orderId = await getReviewedOrderId();
    const review = requireSuccess(
      await httpRequest({
        path: `/app/orders/${orderId}/reviews`,
        token: state.appToken
      }),
      "order review detail"
    );
    expectHasKeys(
      review,
      ["reviewId", "orderId", "score", "tags", "content", "createdAt"],
      "order review detail"
    );
  });

  await runCase("reports_files", "report center, report detail, interpretation, and upload pages", async () => {
    const reports = requireSuccess(
      await httpRequest({
        path: "/app/health/reports/checkups?page=1&pageSize=5",
        token: state.appToken
      }),
      "report list"
    );
    expectPaginatedList(reports, "report list", { allowEmpty: false });
    expectHasKeys(
      reports.list[0],
      ["reportId", "type", "status", "title", "createdAt", "publishedAt"],
      "report list[0]"
    );

    const existingReportId = pickId(reports.list[0], ["reportId", "id"]);
    assert(existingReportId, "missing report id");
    state.reportIdForAi = existingReportId;

    const reportDetail = requireSuccess(
      await httpRequest({
        path: `/app/health/reports/checkups/${existingReportId}`,
        token: state.appToken
      }),
      "report detail"
    );
    expectHasKeys(
      reportDetail,
      ["reportId", "type", "status", "title", "summary", "attachment", "reviewedAt", "publishedAt", "createdAt"],
      "report detail"
    );
    expectHasKeys(
      reportDetail.attachment,
      ["fileId", "fileName", "url", "mimeType", "previewKind"],
      "report detail.attachment"
    );
    expectString(reportDetail.attachment.fileName, "report detail.attachment.fileName");
    expectHttpUrl(reportDetail.attachment.url, "report detail.attachment.url");
    expectString(reportDetail.attachment.mimeType, "report detail.attachment.mimeType");
    expectString(reportDetail.attachment.previewKind, "report detail.attachment.previewKind");

    const reportInterpretation = requireSuccess(
      await httpRequest({
        path: `/app/health/reports/checkups/${existingReportId}/interpretation`,
        token: state.appToken
      }),
      "report interpretation"
    );
    expectHasKeys(
      reportInterpretation,
      ["reportId", "interpretation", "followupSuggestions"],
      "report interpretation"
    );
    expectArray(reportInterpretation.followupSuggestions, "report interpretation.followupSuggestions");

    const createdReport = requireSuccess(
      await httpRequest({
        method: "POST",
        path: "/app/health/reports/checkups",
        token: state.appToken,
        body: {
          title: uniqueSuffix("Contract Report"),
          summary: {
            result: "stable"
          },
          attachment: {
            name: "report.pdf"
          }
        }
      }),
      "create report"
    );
    expectString(createdReport.reportId, "created report.reportId");

    const fileContent = "user frontend contract upload";
    const fileSize = new TextEncoder().encode(fileContent).byteLength;
    const presign = requireSuccess(
      await httpRequest({
        method: "POST",
        path: "/app/files/presign",
        token: state.appToken,
        body: {
          category: "REPORT",
          fileName: "user-frontend-contract.txt",
          mimeType: "text/plain",
          size: fileSize
        }
      }),
      "presign file upload"
    );
    expectHasKeys(presign, ["objectKey", "uploadUrl", "headers"], "presign response");

    await uploadViaPresign(presign.uploadUrl, fileContent, presign.headers);

    const completedFile = requireSuccess(
      await httpRequest({
        method: "POST",
        path: "/app/files/complete",
        token: state.appToken,
        body: {
          category: "REPORT",
          fileName: "user-frontend-contract.txt",
          objectKey: presign.objectKey,
          mimeType: "text/plain",
          size: fileSize,
          metadata: {
            source: "user-frontend-contract"
          }
        }
      }),
      "complete file upload"
    );
    expectString(completedFile.fileId, "completed file.fileId");

    const fileDetail = requireSuccess(
      await httpRequest({
        path: `/app/files/${completedFile.fileId}`,
        token: state.appToken
      }),
      "file detail"
    );
    expectHasKeys(
      fileDetail,
      ["fileId", "category", "fileName", "mimeType", "size", "objectKey", "url", "metadata", "createdAt"],
      "file detail"
    );

    const deletedReport = requireSuccess(
      await httpRequest({
        method: "DELETE",
        path: `/app/health/reports/checkups/${createdReport.reportId}`,
        token: state.appToken
      }),
      "delete report"
    );
    expectBoolean(deletedReport.deleted, "deleted report.deleted");
  });

  await runCase("messaging", "message list, notice detail, and doctor chat pages", async () => {
    const overview = requireSuccess(
      await httpRequest({
        path: "/app/messages/overview",
        token: state.appToken
      }),
      "message overview"
    );
    expectHasKeys(
      overview,
      ["unreadNoticeCount", "unreadConversationCount", "latestNotices", "latestConversations"],
      "message overview"
    );
    expectNumber(overview.unreadNoticeCount, "message overview.unreadNoticeCount");
    expectNumber(overview.unreadConversationCount, "message overview.unreadConversationCount");
    expectArray(overview.latestNotices, "message overview.latestNotices");
    expectArray(overview.latestConversations, "message overview.latestConversations");

    const notices = requireSuccess(
      await httpRequest({
        path: "/app/messages/notices?page=1&pageSize=5",
        token: state.appToken
      }),
      "notices list"
    );
    expectPaginatedList(notices, "notices list");

    const commentNotices = requireSuccess(
      await httpRequest({
        path: "/app/messages/notices?type=COMMENT&page=1&pageSize=5",
        token: state.appToken
      }),
      "comment notices"
    );
    expectPaginatedList(commentNotices, "comment notices");

    const likeNotices = requireSuccess(
      await httpRequest({
        path: "/app/messages/notices?type=LIKE&page=1&pageSize=5",
        token: state.appToken
      }),
      "like notices"
    );
    expectPaginatedList(likeNotices, "like notices");

    if (notices.list.length > 0) {
      const markedNotices = requireSuccess(
        await httpRequest({
          method: "POST",
          path: "/app/messages/notices/read",
          token: state.appToken,
          body: {
            noticeIds: [pickId(notices.list[0], ["noticeId", "id"])]
          }
      }),
      "mark notices as read"
      );
      expectHasKeys(markedNotices, ["updated"], "mark notices as read");
    }

    const conversations = requireSuccess(
      await httpRequest({
        path: "/app/conversations?page=1&pageSize=5",
        token: state.appToken
      }),
      "conversations list"
    );
    expectPaginatedList(conversations, "conversations list");

    const doctorConversation = requireSuccess(
      await httpRequest({
        method: "POST",
        path: "/app/conversations/doctor",
        token: state.appToken,
        body: {
          topic: uniqueSuffix("Doctor chat")
        }
      }),
      "create doctor conversation"
    );
    const conversationId = pickId(doctorConversation, ["conversationId", "id"]);
    assert(conversationId, "missing doctor conversation id");

    const conversationMessages = requireSuccess(
      await httpRequest({
        path: `/app/conversations/${conversationId}/messages?page=1&pageSize=5`,
        token: state.appToken
      }),
      "conversation messages"
    );
    expectPaginatedList(conversationMessages, "conversation messages");

    const sentMessage = requireSuccess(
      await httpRequest({
        method: "POST",
        path: `/app/conversations/${conversationId}/messages`,
        token: state.appToken,
        body: {
          contentType: "TEXT",
          content: "这是一条用户端契约测试消息"
        }
      }),
      "send conversation message"
    );
    expectString(pickId(sentMessage, ["messageId", "id"]), "sent conversation message id");

    const markedConversation = requireSuccess(
      await httpRequest({
        method: "POST",
        path: `/app/conversations/${conversationId}/read`,
        token: state.appToken
      }),
      "mark conversation as read"
    );
    expectHasKeys(markedConversation, ["read"], "mark conversation as read");
  });

  await runCase("content", "health news, lecture, and disease pages", async () => {
    const news = requireSuccess(
      await httpRequest({
        path: "/app/content/news?page=1&pageSize=5",
        token: state.appToken
      }),
      "news list"
    );
    expectPaginatedList(news, "news list", { allowEmpty: false });
    expectHasKeys(
      news.list[0],
      ["newsId", "title", "summary", "coverUrl", "sourceName", "sourceUrl", "readingMinutes", "tags", "publishedAt", "liked", "favorited", "likesCount", "favoritesCount", "sharesCount", "viewsCount", "commentsCount"],
      "news list[0]"
    );
    const newsId = pickId(news.list[0], ["newsId", "id"]);
    assert(newsId, "missing news id");

    const newsDetail = requireSuccess(
      await httpRequest({
        path: `/app/content/news/${newsId}`,
        token: state.appToken
      }),
      "news detail"
    );
    expectHasKeys(
      newsDetail,
      ["newsId", "title", "summary", "coverUrl", "heroImage", "authorName", "sourceName", "sourceUrl", "readingMinutes", "gallery", "references", "tags", "content", "sections", "publishedAt", "liked", "favorited", "likesCount", "favoritesCount", "sharesCount", "viewsCount", "commentsCount", "comments"],
      "news detail"
    );

    const likedNews = requireSuccess(
      await httpRequest({
        method: "POST",
        path: `/app/content/news/${newsId}/like`,
        token: state.appToken
      }),
      "like news"
    );
    expectHasKeys(likedNews, ["newsId", "action", "recorded"], "like news");

    const favoritedNews = requireSuccess(
      await httpRequest({
        method: "POST",
        path: `/app/content/news/${newsId}/favorite`,
        token: state.appToken
      }),
      "favorite news"
    );
    expectHasKeys(favoritedNews, ["newsId", "action", "recorded"], "favorite news");

    const newsComments = requireSuccess(
      await httpRequest({
        path: `/app/content/news/${newsId}/comments?page=1&pageSize=5`,
        token: state.appToken
      }),
      "news comments"
    );
    expectPaginatedList(newsComments, "news comments");

    const createdNewsComment = requireSuccess(
      await httpRequest({
        method: "POST",
        path: `/app/content/news/${newsId}/comments`,
        token: state.appToken,
        body: {
          content: uniqueSuffix("news_comment")
        }
      }),
      "create news comment"
    );
    expectString(pickId(createdNewsComment, ["commentId", "id"]), "created news comment id");

    const lectures = requireSuccess(
      await httpRequest({
        path: "/app/content/lectures?page=1&pageSize=5",
        token: state.appToken
      }),
      "lecture list"
    );
    expectPaginatedList(lectures, "lecture list", { allowEmpty: false });
    expectHasKeys(
      lectures.list[0],
      ["lectureId", "title", "summary", "speakerName", "speakerTitle", "coverUrl", "videoUrl", "durationMinutes", "publishedAt", "liked", "favorited", "likesCount", "favoritesCount", "sharesCount", "viewsCount", "commentsCount"],
      "lecture list[0]"
    );
    expectHttpUrl(lectures.list[0].coverUrl, "lecture list[0].coverUrl");
    expectHttpUrl(lectures.list[0].videoUrl, "lecture list[0].videoUrl");
    const lectureId = pickId(lectures.list[0], ["lectureId", "id"]);
    assert(lectureId, "missing lecture id");

    const lectureDetail = requireSuccess(
      await httpRequest({
        path: `/app/content/lectures/${lectureId}`,
        token: state.appToken
      }),
      "lecture detail"
    );
    expectHasKeys(
      lectureDetail,
      ["lectureId", "title", "summary", "speakerName", "speakerTitle", "coverUrl", "heroImage", "videoUrl", "durationMinutes", "content", "outline", "highlights", "publishedAt", "liked", "favorited", "likesCount", "favoritesCount", "sharesCount", "viewsCount", "commentsCount", "comments"],
      "lecture detail"
    );
    expectHttpUrl(lectureDetail.coverUrl, "lecture detail.coverUrl");
    expectHttpUrl(lectureDetail.heroImage, "lecture detail.heroImage");
    expectHttpUrl(lectureDetail.videoUrl, "lecture detail.videoUrl");

    const likedLecture = requireSuccess(
      await httpRequest({
        method: "POST",
        path: `/app/content/lectures/${lectureId}/like`,
        token: state.appToken
      }),
      "like lecture"
    );
    expectHasKeys(likedLecture, ["lectureId", "action", "recorded"], "like lecture");

    const lectureComments = requireSuccess(
      await httpRequest({
        path: `/app/content/lectures/${lectureId}/comments?page=1&pageSize=5`,
        token: state.appToken
      }),
      "lecture comments"
    );
    expectPaginatedList(lectureComments, "lecture comments");

    const createdLectureComment = requireSuccess(
      await httpRequest({
        method: "POST",
        path: `/app/content/lectures/${lectureId}/comments`,
        token: state.appToken,
        body: {
          content: uniqueSuffix("lecture_comment")
        }
      }),
      "create lecture comment"
    );
    expectString(pickId(createdLectureComment, ["commentId", "id"]), "created lecture comment id");

    const diseaseDepartments = requireSuccess(
      await httpRequest({
        path: "/app/content/diseases/departments",
        token: state.appToken
      }),
      "disease departments"
    );
    expectDirectList(diseaseDepartments, "disease departments", { allowEmpty: false });
    expectHasKeys(diseaseDepartments[0], ["departmentId", "code", "name"], "disease departments[0]");

    const diseases = requireSuccess(
      await httpRequest({
        path: "/app/content/diseases?page=1&pageSize=5",
        token: state.appToken
      }),
      "disease list"
    );
    expectPaginatedList(diseases, "disease list", { allowEmpty: false });
    expectHasKeys(
      diseases.list[0],
      ["diseaseId", "title", "summary", "department", "viewed", "publishedAt"],
      "disease list[0]"
    );
    const diseaseId = pickId(diseases.list[0], ["diseaseId", "id"]);
    assert(diseaseId, "missing disease id");

    const diseaseDetail = requireSuccess(
      await httpRequest({
        path: `/app/content/diseases/${diseaseId}`,
        token: state.appToken
      }),
      "disease detail"
    );
    expectHasKeys(
      diseaseDetail,
      ["diseaseId", "title", "diseaseName", "summary", "department", "symptoms", "causes", "preventions", "treatments", "tags", "quickFacts", "sections", "publishedAt"],
      "disease detail"
    );
  });

  await runCase("community", "circle, publish, post detail, and activity pages", async () => {
    const topics = requireSuccess(
      await httpRequest({
        path: "/app/community/topics",
        token: state.appToken
      }),
      "community topics"
    );
    expectDirectList(topics, "community topics", { allowEmpty: false });
    expectHasKeys(topics[0], ["topicId", "title", "coverUrl", "participantCount", "tone"], "community topics[0]");

    const posts = requireSuccess(
      await httpRequest({
        path: "/app/community/posts?page=1&pageSize=5",
        token: state.appToken
      }),
      "community posts"
    );
    expectPaginatedList(posts, "community posts", { allowEmpty: false });
    expectHasKeys(
      posts.list[0],
      ["postId", "headline", "excerpt", "content", "images", "primaryImage", "imageCount", "tagLabel", "likesCount", "favoritesCount", "commentsCount", "sharesCount", "createdAt", "author", "liked", "favorited", "isMine"],
      "community posts[0]"
    );
    const postId = pickId(posts.list[0], ["postId", "id"]);
    assert(postId, "missing post id");

    const postDetail = requireSuccess(
      await httpRequest({
        path: `/app/community/posts/${postId}`,
        token: state.appToken
      }),
      "community post detail"
    );
    expectHasKeys(
      postDetail,
      ["postId", "headline", "excerpt", "content", "images", "primaryImage", "imageCount", "tagLabel", "likesCount", "favoritesCount", "commentsCount", "sharesCount", "createdAt", "author", "liked", "favorited", "isMine"],
      "community post detail"
    );

    const likedPost = requireSuccess(
      await httpRequest({
        method: "POST",
        path: `/app/community/posts/${postId}/like`,
        token: state.appToken
      }),
      "like community post"
    );
    expectHasKeys(likedPost, ["postId", "action", "recorded"], "like community post");

    const favoritedPost = requireSuccess(
      await httpRequest({
        method: "POST",
        path: `/app/community/posts/${postId}/favorite`,
        token: state.appToken
      }),
      "favorite community post"
    );
    expectHasKeys(favoritedPost, ["postId", "action", "recorded"], "favorite community post");

    const postComments = requireSuccess(
      await httpRequest({
        path: `/app/community/posts/${postId}/comments?page=1&pageSize=5`,
        token: state.appToken
      }),
      "community post comments"
    );
    expectPaginatedList(postComments, "community post comments");

    const createdPostComment = requireSuccess(
      await httpRequest({
        method: "POST",
        path: `/app/community/posts/${postId}/comments`,
        token: state.appToken,
        body: {
          content: uniqueSuffix("post_comment")
        }
      }),
      "create community post comment"
    );
    expectString(pickId(createdPostComment, ["commentId", "id"]), "created community post comment id");

    const createdPost = requireSuccess(
      await httpRequest({
        method: "POST",
        path: "/app/community/posts",
        token: state.appToken,
        body: {
          content: uniqueSuffix("community_post"),
          images: [],
          tagLabel: "契约测试"
        }
      }),
      "create community post"
    );
    const createdPostId = pickId(createdPost, ["postId", "id"]);
    assert(createdPostId, "missing created community post id");

    const updatedPost = requireSuccess(
      await httpRequest({
        method: "PUT",
        path: `/app/community/posts/${createdPostId}`,
        token: state.appToken,
        body: {
          content: uniqueSuffix("community_post_updated"),
          images: [],
          tagLabel: "契约测试更新"
        }
      }),
      "update community post"
    );
    expectString(pickId(updatedPost, ["postId", "id"]), "updated community post id");

    const deletedPost = requireSuccess(
      await httpRequest({
        method: "DELETE",
        path: `/app/community/posts/${createdPostId}`,
        token: state.appToken
      }),
      "delete community post"
    );
    expectBoolean(deletedPost.deleted, "deleted community post.deleted");

    const activities = requireSuccess(
      await httpRequest({
        path: "/app/community/activities?page=1&pageSize=5",
        token: state.appToken
      }),
      "community activities"
    );
    expectPaginatedList(activities, "community activities", { allowEmpty: false });
    expectHasKeys(
      activities.list[0],
      ["activityId", "title", "category", "type", "status", "fee", "location", "coverUrl", "startAt", "endAt", "signupDeadline", "maxParticipants", "likesCount", "favoritesCount", "commentsCount", "registered", "liked", "favorited"],
      "community activities[0]"
    );
    const activityId = pickId(activities.list[0], ["activityId", "id"]);
    assert(activityId, "missing activity id");

    const myActivities = requireSuccess(
      await httpRequest({
        path: "/app/community/activities/my?page=1&pageSize=5",
        token: state.appToken
      }),
      "community my activities"
    );
    expectPaginatedList(myActivities, "community my activities");

    const activityDetail = requireSuccess(
      await httpRequest({
        path: `/app/community/activities/${activityId}`,
        token: state.appToken
      }),
      "community activity detail"
    );
    expectHasKeys(
      activityDetail,
      ["activityId", "title", "category", "type", "status", "fee", "location", "coverUrl", "startAt", "endAt", "signupDeadline", "maxParticipants", "likesCount", "favoritesCount", "commentsCount", "registered", "liked", "favorited", "detailContent", "sections", "comments", "registration"],
      "community activity detail"
    );

    const likedActivity = requireSuccess(
      await httpRequest({
        method: "POST",
        path: `/app/community/activities/${activityId}/like`,
        token: state.appToken
      }),
      "like community activity"
    );
    expectHasKeys(likedActivity, ["activityId", "action", "recorded"], "like community activity");

    const favoritedActivity = requireSuccess(
      await httpRequest({
        method: "POST",
        path: `/app/community/activities/${activityId}/favorite`,
        token: state.appToken
      }),
      "favorite community activity"
    );
    expectHasKeys(favoritedActivity, ["activityId", "action", "recorded"], "favorite community activity");

    const activityComments = requireSuccess(
      await httpRequest({
        path: `/app/community/activities/${activityId}/comments?page=1&pageSize=5`,
        token: state.appToken
      }),
      "community activity comments"
    );
    expectPaginatedList(activityComments, "community activity comments");

    const createdActivityComment = requireSuccess(
      await httpRequest({
        method: "POST",
        path: `/app/community/activities/${activityId}/comments`,
        token: state.appToken,
        body: {
          content: uniqueSuffix("activity_comment")
        }
      }),
      "create community activity comment"
    );
    expectString(pickId(createdActivityComment, ["commentId", "id"]), "created community activity comment id");

    const registration = requireSuccess(
      await httpRequest({
        method: "POST",
        path: `/app/community/activities/${activityId}/register`,
        token: state.appToken,
        body: {
          remark: "用户端前端契约测试报名"
        }
      }),
      "register activity"
    );
    expectString(pickId(registration, ["registrationId", "id"]), "activity registration id");

    const cancelledRegistration = requireSuccess(
      await httpRequest({
        method: "POST",
        path: `/app/community/activities/${activityId}/cancel`,
        token: state.appToken,
        body: {
          reason: "用户端前端契约测试回滚"
        }
      }),
      "cancel activity registration"
    );
    expectHasKeys(cancelledRegistration, ["registrationId", "status"], "cancelled activity registration");
  });

  await runCase("app_ai", "assistant, recommendation, summary, and risk pages", async () => {
    const assistantConversation = requireSuccess(
      await httpRequest({
        method: "POST",
        path: "/app/ai/assistant/conversations",
        token: state.appToken,
        body: {
          topic: uniqueSuffix("AI conversation")
        }
      }),
      "create ai conversation"
    );
    const assistantConversationId = pickId(assistantConversation, ["conversationId", "id"]);
    assert(assistantConversationId, "missing ai conversation id");

    const assistantConversationDetail = requireSuccess(
      await httpRequest({
        path: `/app/ai/assistant/conversations/${assistantConversationId}`,
        token: state.appToken
      }),
      "ai conversation detail"
    );
    expectHasKeys(
      assistantConversationDetail,
      ["conversationId", "topic", "createdAt", "updatedAt"],
      "ai conversation detail"
    );

    const assistantMessages = requireSuccess(
      await httpRequest({
        path: `/app/ai/assistant/conversations/${assistantConversationId}/messages?page=1&pageSize=10`,
        token: state.appToken
      }),
      "ai messages"
    );
    expectPaginatedList(assistantMessages, "ai messages");

    const aiReply = requireSuccess(
      await httpRequest({
        method: "POST",
        path: `/app/ai/assistant/conversations/${assistantConversationId}/messages`,
        token: state.appToken,
        body: {
          content: "请总结我最近的健康风险",
          pageId: "health/health-data",
          route: "/health/health-data"
        }
      }),
      "send ai message"
    );
    expectHasKeys(aiReply, ["conversationId", "userMessage", "reply", "task"], "ai reply");

    const serviceRecommendations = requireSuccess(
      await httpRequest({
        method: "POST",
        path: "/app/ai/service-recommendations",
        token: state.appToken,
        body: {
          query: "需要上门康复服务",
          limit: 3
        }
      }),
      "ai service recommendations"
    );
    expectHasKeys(
      serviceRecommendations,
      ["taskId", "recommendations", "matchingSignals", "conclusion"],
      "ai service recommendations"
    );
    expectArray(serviceRecommendations.recommendations, "ai service recommendations.recommendations", {
      allowEmpty: false
    });
    expectHasKeys(
      serviceRecommendations.recommendations[0],
      ["serviceId", "title", "category", "price", "regionScope", "reason", "imageUrl"],
      "ai service recommendations.recommendations[0]"
    );
    expectHttpUrl(
      serviceRecommendations.recommendations[0].imageUrl,
      "ai service recommendations.recommendations[0].imageUrl"
    );

    const orderPrefill = requireSuccess(
      await httpRequest({
        method: "POST",
        path: "/app/ai/order-prefill",
        token: state.appToken,
        body: {
          serviceRequest: "帮我预约下周上门康复评估"
        }
      }),
      "ai order prefill"
    );
    expectHasKeys(orderPrefill, ["taskId", "bookingPrefill", "missingInfo", "rankingReasons", "humanReviewRequired"], "ai order prefill");

    const healthSummary = requireSuccess(
      await httpRequest({
        path: "/app/ai/health-summary",
        token: state.appToken
      }),
      "ai health summary"
    );
    expectHasKeys(
      healthSummary,
      ["taskId", "summary", "keyFindings", "riskSignals", "followUpSuggestions", "humanReviewRequired"],
      "ai health summary"
    );

    const metricExplanation = requireSuccess(
      await httpRequest({
        path: "/app/ai/health-metric-explanations?metricTypes=bloodPressure,heartRate",
        token: state.appToken
      }),
      "ai metric explanations"
    );
    expectHasKeys(metricExplanation, ["taskId", "brief", "keyFindings", "riskSignals", "followUpSuggestions"], "ai metric explanations");

    const reportIdForAi = state.reportIdForAi || pickId(
      (
        requireSuccess(
          await httpRequest({
            path: "/app/health/reports/checkups?page=1&pageSize=1",
            token: state.appToken
          }),
          "report list for ai"
        )
      ).list[0],
      ["reportId", "id"]
    );
    assert(reportIdForAi, "missing report id for ai");

    const aiReportInterpretation = requireSuccess(
      await httpRequest({
        path: `/app/ai/reports/${reportIdForAi}/interpretation`,
        token: state.appToken
      }),
      "ai report interpretation"
    );
    expectHasKeys(
      aiReportInterpretation,
      ["taskId", "reportId", "interpretation", "highlights", "riskSignals", "followUpSuggestions", "humanReviewRequired"],
      "ai report interpretation"
    );

    const aiFollowup = requireSuccess(
      await httpRequest({
        path: `/app/ai/reports/${reportIdForAi}/followup-suggestions`,
        token: state.appToken
      }),
      "ai report followup"
    );
    expectHasKeys(
      aiFollowup,
      ["taskId", "reportId", "followUpSuggestions", "riskSignals", "humanReviewRequired"],
      "ai report followup"
    );

    const riskAlerts = requireSuccess(
      await httpRequest({
        path: "/app/ai/risk-alerts?page=1&pageSize=5",
        token: state.appToken
      }),
      "ai risk alerts"
    );
    expectPaginatedList(riskAlerts, "ai risk alerts", { allowEmpty: false });
    expectHasKeys(
      riskAlerts.list[0],
      ["alertId", "level", "status", "title", "summary", "createdAt"],
      "ai risk alerts.list[0]"
    );
    const alertId = pickId(riskAlerts.list[0], ["alertId", "id"]);
    assert(alertId, "missing ai alert id");

    const riskAlertDetail = requireSuccess(
      await httpRequest({
        path: `/app/ai/risk-alerts/${alertId}`,
        token: state.appToken
      }),
      "ai risk alert detail"
    );
    expectHasKeys(
      riskAlertDetail,
      ["alertId", "level", "status", "title", "summary", "createdAt", "suggestion"],
      "ai risk alert detail"
    );
    expectHasKeys(riskAlertDetail.suggestion, ["advice", "nextStep"], "ai risk alert detail.suggestion");

    const knowledgeSearch = requireSuccess(
      await httpRequest({
        path: "/app/ai/knowledge/search?query=康复&limit=3",
        token: state.appToken
      }),
      "ai knowledge search"
    );
    expectHasKeys(knowledgeSearch, ["query", "limit", "total", "results"], "ai knowledge search");
    expectArray(knowledgeSearch.results, "ai knowledge search.results");
  });

  const summary = summarize();
  process.exit(summary.failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
