#!/usr/bin/env node

const BASE_URL = process.env.BASE_URL ?? "http://localhost:8190/api/v1";
const APP_PHONE = process.env.APP_TEST_PHONE ?? "13900139000";
const APP_PASSWORD = process.env.APP_TEST_PASSWORD ?? "123456";
const ADMIN_PHONE = process.env.ADMIN_TEST_PHONE ?? "13600136000";
const ADMIN_PASSWORD = process.env.ADMIN_TEST_PASSWORD ?? "123456";
const APP_TEST_SMS_CODE = process.env.APP_TEST_SMS_CODE ?? "";
const REQUEST_TIMEOUT_MS = Number(process.env.SMOKE_TIMEOUT_MS ?? 120000);

const state = {
  appToken: "",
  adminToken: "",
  reportIdForAi: ""
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

function normalizePath(path) {
  if (!path.startsWith("/")) {
    return `/${path}`;
  }

  return path;
}

function uniqueSuffix(prefix) {
  return `${prefix}_${Date.now().toString(36)}`;
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
  url,
  token,
  body,
  headers: customHeaders
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

function requireSuccess(response, operation) {
  assert(
    response.status >= 200 && response.status < 300,
    `${operation} http status ${response.status}, body: ${response.text}`
  );
  assert(response.json && typeof response.json === "object", `${operation} response is not JSON`);
  assert(response.json.code === 0, `${operation} business code ${response.json.code}`);

  return response.json.data;
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

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function waitForTaskToLeaveRunning(taskId, token, timeoutMs = 120000) {
  const deadline = Date.now() + timeoutMs;
  let lastStatus = "";

  while (Date.now() < deadline) {
    const task = requireSuccess(
      await httpRequest({
        path: `/internal/agents/tasks/${taskId}`,
        token
      }),
      "poll task"
    );

    lastStatus = String(task.status ?? "");
    if (lastStatus !== "RUNNING") {
      return task;
    }

    await sleep(1000);
  }

  throw new Error(`task ${taskId} stayed RUNNING for more than ${timeoutMs}ms`);
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

  console.log("\n=== Expanded Smoke Summary ===");
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

  return { total, passed, failed, passRate };
}

async function main() {
  await runCase("precheck", "system health and architecture", async () => {
    requireSuccess(
      await httpRequest({
        path: "/system/health"
      }),
      "system health"
    );
    requireSuccess(
      await httpRequest({
        path: "/system/architecture"
      }),
      "system architecture"
    );
  });

  await runCase("auth", "password logins", async () => {
    const appLogin = requireSuccess(
      await httpRequest({
        method: "POST",
        path: "/app/auth/login/password",
        body: {
          phone: APP_PHONE,
          password: APP_PASSWORD,
          agreePrivacy: true
        }
      }),
      "app password login"
    );
    const adminLogin = requireSuccess(
      await httpRequest({
        method: "POST",
        path: "/admin/auth/login/password",
        body: {
          phone: ADMIN_PHONE,
          password: ADMIN_PASSWORD
        }
      }),
      "admin password login"
    );

    assert(typeof appLogin.accessToken === "string" && appLogin.accessToken.length > 10, "missing app token");
    assert(typeof adminLogin.accessToken === "string" && adminLogin.accessToken.length > 10, "missing admin token");
    state.appToken = appLogin.accessToken;
    state.adminToken = adminLogin.accessToken;
  });

  await runCase("auth", "alternate auth flows", async () => {
    const smsResponse = requireSuccess(
      await httpRequest({
        method: "POST",
        path: "/app/auth/sms/send",
        body: {
          phone: APP_PHONE,
          purpose: "login"
        }
      }),
      "send sms code"
    );
    const smsCode =
      typeof smsResponse.debugCode === "string" && smsResponse.debugCode.length >= 4
        ? smsResponse.debugCode
        : APP_TEST_SMS_CODE;
    assert(smsCode.length >= 4, "missing sms code, expected debugCode or APP_TEST_SMS_CODE");
    requireSuccess(
      await httpRequest({
        method: "POST",
        path: "/app/auth/login/sms",
        body: {
          phone: APP_PHONE,
          code: smsCode
        }
      }),
      "login with sms"
    );
    requireSuccess(
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
    requireSuccess(
      await httpRequest({
        method: "POST",
        path: "/app/auth/logout",
        token: state.appToken
      }),
      "logout"
    );
    requireSuccess(
      await httpRequest({
        path: "/admin/auth/me",
        token: state.adminToken
      }),
      "admin me"
    );
  });

  await runCase("users", "user center and home", async () => {
    requireSuccess(
      await httpRequest({
        path: "/app/users/me",
        token: state.appToken
      }),
      "get me"
    );
    requireSuccess(
      await httpRequest({
        path: "/app/users/me/profile",
        token: state.appToken
      }),
      "get profile"
    );
    requireSuccess(
      await httpRequest({
        path: "/app/users/me/security",
        token: state.appToken
      }),
      "get security"
    );
    requireSuccess(
      await httpRequest({
        path: "/app/users/me/settings",
        token: state.appToken
      }),
      "get settings"
    );
    requireSuccess(
      await httpRequest({
        path: "/app/home/dashboard",
        token: state.appToken
      }),
      "dashboard"
    );
    requireSuccess(
      await httpRequest({
        path: "/app/locations/current",
        token: state.appToken
      }),
      "current location"
    );
    requireSuccess(
      await httpRequest({
        path: "/app/locations/cities",
        token: state.appToken
      }),
      "cities"
    );
  });

  await runCase("users", "user mutations and search", async () => {
    requireSuccess(
      await httpRequest({
        method: "PUT",
        path: "/app/users/me/settings/message",
        token: state.appToken,
        body: {
          systemNotice: true,
          orderNotice: true,
          healthAlert: true,
          communityNotice: true,
          smsEnabled: false
        }
      }),
      "update message settings"
    );
    requireSuccess(
      await httpRequest({
        method: "PUT",
        path: "/app/users/me/profile",
        token: state.appToken,
        body: {
          nickname: "Smoke Expanded User",
          city: "Shanghai",
          gender: "UNKNOWN"
        }
      }),
      "update profile"
    );
    requireSuccess(
      await httpRequest({
        method: "PUT",
        path: "/app/users/me/real-name",
        token: state.appToken,
        body: {
          realName: "Zhang San",
          idCard: "110101199003074512"
        }
      }),
      "submit real name"
    );
    requireSuccess(
      await httpRequest({
        path: "/app/users/me/points?page=1&pageSize=5",
        token: state.appToken
      }),
      "points"
    );
    requireSuccess(
      await httpRequest({
        path: "/app/users/me/footprints?page=1&pageSize=5",
        token: state.appToken
      }),
      "footprints"
    );
    requireSuccess(
      await httpRequest({
        path: "/app/users/me/activities?page=1&pageSize=5",
        token: state.appToken
      }),
      "my activities"
    );
    requireSuccess(
      await httpRequest({
        path: "/app/users/me/reviews?page=1&pageSize=5",
        token: state.appToken
      }),
      "my reviews"
    );
    requireSuccess(
      await httpRequest({
        path: "/app/users/me/coupons?page=1&pageSize=5",
        token: state.appToken
      }),
      "my coupons"
    );
    requireSuccess(
      await httpRequest({
        path: "/app/search/hot-tags",
        token: state.appToken
      }),
      "hot tags"
    );
    requireSuccess(
      await httpRequest({
        path: "/app/search/history",
        token: state.appToken
      }),
      "search history"
    );
    requireSuccess(
      await httpRequest({
        method: "POST",
        path: "/app/search/history",
        token: state.appToken,
        body: {
          keyword: "rehab"
        }
      }),
      "record search history"
    );
    requireSuccess(
      await httpRequest({
        path: "/app/search/global?keyword=rehab&page=1&pageSize=5",
        token: state.appToken
      }),
      "global search"
    );
  });

  await runCase("family", "family bindings and addresses", async () => {
    requireSuccess(
      await httpRequest({
        path: "/app/family/bindings",
        token: state.appToken
      }),
      "family bindings"
    );
    requireSuccess(
      await httpRequest({
        path: "/app/family/addresses",
        token: state.appToken
      }),
      "list addresses"
    );

    const created = requireSuccess(
      await httpRequest({
        method: "POST",
        path: "/app/family/addresses",
        token: state.appToken,
        body: {
          label: "Smoke Address",
          receiverName: "API Receiver",
          receiverPhone: "13900000000",
          province: "Shanghai",
          city: "Shanghai",
          district: "Pudong",
          street: "Century Avenue",
          detailAddress: uniqueSuffix("Building 100"),
          isDefault: false
        }
      }),
      "create address"
    );
    const addressId = pickId(created, ["addressId", "id"]);
    assert(addressId, "missing address id");

    requireSuccess(
      await httpRequest({
        method: "PUT",
        path: `/app/family/addresses/${addressId}`,
        token: state.appToken,
        body: {
          label: "Smoke Address Updated",
          receiverName: "API Receiver",
          receiverPhone: "13900000000",
          province: "Shanghai",
          city: "Shanghai",
          district: "Pudong",
          street: "Century Avenue",
          detailAddress: uniqueSuffix("Building 101"),
          isDefault: false
        }
      }),
      "update address"
    );
  });

  await runCase("archive", "health archive read and write", async () => {
    requireSuccess(
      await httpRequest({
        path: "/app/health/archive/summary",
        token: state.appToken
      }),
      "archive summary"
    );
    requireSuccess(
      await httpRequest({
        path: "/app/health/archive/basic-info",
        token: state.appToken
      }),
      "archive basic info"
    );
    requireSuccess(
      await httpRequest({
        path: "/app/health/archive/medical-history",
        token: state.appToken
      }),
      "archive medical history"
    );
    requireSuccess(
      await httpRequest({
        method: "PUT",
        path: "/app/health/archive/basic-info",
        token: state.appToken,
        body: {
          occupation: "Retired",
          education: "High School",
          height: 170,
          weight: 65
        }
      }),
      "update basic info"
    );
    requireSuccess(
      await httpRequest({
        method: "PUT",
        path: "/app/health/archive/medical-history",
        token: state.appToken,
        body: {
          medicalHistory: {
            allergies: ["penicillin"]
          },
          riskTags: ["fall-risk"],
          longTermMemory: {
            preference: "light-diet"
          }
        }
      }),
      "update medical history"
    );
  });

  await runCase("metrics", "metric, device, and medication flows", async () => {
    requireSuccess(
      await httpRequest({
        path: "/app/health/metrics/overview",
        token: state.appToken
      }),
      "metrics overview"
    );
    requireSuccess(
      await httpRequest({
        path: "/app/health/metrics/bloodPressure/trend",
        token: state.appToken
      }),
      "metric trend"
    );
    requireSuccess(
      await httpRequest({
        path: "/app/health/metrics/weight/records?page=1&pageSize=5",
        token: state.appToken
      }),
      "metric records"
    );

    const metricRecord = requireSuccess(
      await httpRequest({
        method: "POST",
        path: "/app/health/metrics/weight/records",
        token: state.appToken,
        body: {
          value: 61.2,
          unit: "kg",
          note: "expanded smoke",
          measuredAt: new Date().toISOString()
        }
      }),
      "create metric record"
    );
    const metricRecordId = pickId(metricRecord, ["recordId", "id"]);
    assert(metricRecordId, "missing metric record id");

    requireSuccess(
      await httpRequest({
        method: "PUT",
        path: `/app/health/metrics/weight/records/${metricRecordId}`,
        token: state.appToken,
        body: {
          value: 61.8,
          unit: "kg",
          note: "expanded smoke update",
          measuredAt: new Date().toISOString()
        }
      }),
      "update metric record"
    );
    requireSuccess(
      await httpRequest({
        method: "DELETE",
        path: `/app/health/metrics/weight/records/${metricRecordId}`,
        token: state.appToken
      }),
      "delete metric record"
    );

    const devices = requireSuccess(
      await httpRequest({
        path: "/app/health/devices",
        token: state.appToken
      }),
      "list devices"
    );
    const deviceList = listOf(devices);
    assert(deviceList.length > 0, "devices list is empty");
    const deviceId = pickId(deviceList[0], ["deviceId", "id"]);
    assert(deviceId, "missing device id");

    requireSuccess(
      await httpRequest({
        path: `/app/health/devices/${deviceId}`,
        token: state.appToken
      }),
      "device detail"
    );
    requireSuccess(
      await httpRequest({
        path: `/app/health/devices/${deviceId}/measurements`,
        token: state.appToken
      }),
      "device measurements"
    );
    requireSuccess(
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
      "device settings"
    );
    requireSuccess(
      await httpRequest({
        method: "PUT",
        path: `/app/health/devices/${deviceId}/password`,
        token: state.appToken,
        body: {
          password: "4321"
        }
      }),
      "device password"
    );
    requireSuccess(
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
      "heart rate settings"
    );

    const deviceBind = requireSuccess(
      await httpRequest({
        method: "POST",
        path: "/app/health/devices/scan/bind",
        token: state.appToken,
        body: {
          serialNo: uniqueSuffix("SCAN"),
          type: "OXIMETER",
          nickname: "Expanded Smoke Device"
        }
      }),
      "scan bind device"
    );
    const boundDeviceId = pickId(deviceBind, ["deviceId", "id"]);
    assert(boundDeviceId, "missing bound device id");
    requireSuccess(
      await httpRequest({
        method: "DELETE",
        path: `/app/health/devices/${boundDeviceId}`,
        token: state.appToken
      }),
      "unbind device"
    );

    requireSuccess(
      await httpRequest({
        path: "/app/health/medications/today",
        token: state.appToken
      }),
      "medications today"
    );
    requireSuccess(
      await httpRequest({
        path: "/app/health/medications",
        token: state.appToken
      }),
      "medications list"
    );
    const medication = requireSuccess(
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
    const medicationId = pickId(medication, ["medicationId", "id"]);
    assert(medicationId, "missing medication id");
    requireSuccess(
      await httpRequest({
        method: "PUT",
        path: `/app/health/medications/${medicationId}`,
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
    requireSuccess(
      await httpRequest({
        method: "POST",
        path: `/app/health/medications/${medicationId}/take`,
        token: state.appToken,
        body: {
          note: "taken",
          scheduledAt: new Date().toISOString()
        }
      }),
      "take medication"
    );
    requireSuccess(
      await httpRequest({
        method: "DELETE",
        path: `/app/health/medications/${medicationId}`,
        token: state.appToken
      }),
      "delete medication"
    );
  });

  await runCase("lifestyle", "diet and self-test flows", async () => {
    requireSuccess(
      await httpRequest({
        path: "/app/health/diet/plan",
        token: state.appToken
      }),
      "diet plan"
    );
    const recipes = requireSuccess(
      await httpRequest({
        path: "/app/health/diet/recipes?page=1&pageSize=5",
        token: state.appToken
      }),
      "diet recipes"
    );
    const recipeList = listOf(recipes);
    assert(recipeList.length > 0, "recipes list is empty");
    const recipeId = pickId(recipeList[0], ["recipeId", "id"]);
    assert(recipeId, "missing recipe id");

    requireSuccess(
      await httpRequest({
        path: `/app/health/diet/recipes/${recipeId}`,
        token: state.appToken
      }),
      "diet recipe detail"
    );
    requireSuccess(
      await httpRequest({
        path: "/app/health/diet-records",
        token: state.appToken
      }),
      "diet records"
    );
    requireSuccess(
      await httpRequest({
        path: "/app/health/diet-records/history?page=1&pageSize=5",
        token: state.appToken
      }),
      "diet history"
    );
    requireSuccess(
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
          note: "expanded smoke diet",
          eatenAt: new Date().toISOString()
        }
      }),
      "create diet record"
    );

    const selfTests = requireSuccess(
      await httpRequest({
        path: "/app/health/self-tests",
        token: state.appToken
      }),
      "self tests"
    );
    const selfTestList = listOf(selfTests);
    assert(selfTestList.length > 0, "self tests list is empty");
    const testId = pickId(selfTestList[0], ["testId", "id"]);
    assert(testId, "missing self test id");

    const selfTestDetail = requireSuccess(
      await httpRequest({
        path: `/app/health/self-tests/${testId}`,
        token: state.appToken
      }),
      "self test detail"
    );
    const answers = listOf(selfTestDetail.questions).map((item) => ({
      questionId: item.questionId,
      optionIndex: 0
    }));
    requireSuccess(
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
    requireSuccess(
      await httpRequest({
        path: "/app/health/self-tests/history?page=1&pageSize=5",
        token: state.appToken
      }),
      "self test history"
    );
  });

  await runCase("reports", "report and file flows", async () => {
    const report = requireSuccess(
      await httpRequest({
        method: "POST",
        path: "/app/health/reports/checkups",
        token: state.appToken,
        body: {
          title: uniqueSuffix("Expanded Smoke Report"),
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
    const reportId = pickId(report, ["reportId", "id"]);
    assert(reportId, "missing report id");
    state.reportIdForAi = reportId;

    requireSuccess(
      await httpRequest({
        path: `/app/health/reports/checkups/${reportId}`,
        token: state.appToken
      }),
      "report detail"
    );
    requireSuccess(
      await httpRequest({
        path: `/app/health/reports/checkups/${reportId}/interpretation`,
        token: state.appToken
      }),
      "report interpretation"
    );

    const fileContent = "expanded smoke upload";
    const fileSize = new TextEncoder().encode(fileContent).byteLength;
    const presign = requireSuccess(
      await httpRequest({
        method: "POST",
        path: "/app/files/presign",
        token: state.appToken,
        body: {
          category: "REPORT",
          fileName: "expanded-smoke.txt",
          mimeType: "text/plain",
          size: fileSize
        }
      }),
      "presign upload"
    );
    await uploadViaPresign(presign.uploadUrl, fileContent, presign.headers);
    const file = requireSuccess(
      await httpRequest({
        method: "POST",
        path: "/app/files/complete",
        token: state.appToken,
        body: {
          category: "REPORT",
          fileName: "expanded-smoke.txt",
          objectKey: presign.objectKey,
          mimeType: "text/plain",
          size: fileSize,
          metadata: {
            source: "expanded-smoke"
          }
        }
      }),
      "complete upload"
    );
    const fileId = pickId(file, ["fileId", "id"]);
    assert(fileId, "missing file id");
    requireSuccess(
      await httpRequest({
        path: `/app/files/${fileId}`,
        token: state.appToken
      }),
      "file detail"
    );
  });

  await runCase("messaging", "messages and conversations", async () => {
    requireSuccess(
      await httpRequest({
        path: "/app/messages/overview",
        token: state.appToken
      }),
      "message overview"
    );
    const notices = requireSuccess(
      await httpRequest({
        path: "/app/messages/notices?page=1&pageSize=5",
        token: state.appToken
      }),
      "message notices"
    );
    const noticeIds = listOf(notices)
      .slice(0, 2)
      .map((item) => pickId(item, ["noticeId", "id"]))
      .filter(Boolean);
    requireSuccess(
      await httpRequest({
        method: "POST",
        path: "/app/messages/notices/read",
        token: state.appToken,
        body: {
          noticeIds
        }
      }),
      "mark notices read"
    );

    const conversations = requireSuccess(
      await httpRequest({
        path: "/app/conversations?page=1&pageSize=5",
        token: state.appToken
      }),
      "conversations"
    );
    const conversationList = listOf(conversations);
    assert(conversationList.length > 0, "conversations list is empty");
    const conversationId = pickId(conversationList[0], ["conversationId", "id"]);
    assert(conversationId, "missing conversation id");
    requireSuccess(
      await httpRequest({
        path: `/app/conversations/${conversationId}/messages?page=1&pageSize=5`,
        token: state.appToken
      }),
      "conversation messages"
    );
    requireSuccess(
      await httpRequest({
        method: "POST",
        path: `/app/conversations/${conversationId}/messages`,
        token: state.appToken,
        body: {
          contentType: "TEXT",
          content: "expanded smoke message"
        }
      }),
      "send conversation message"
    );
    requireSuccess(
      await httpRequest({
        method: "POST",
        path: `/app/conversations/${conversationId}/read`,
        token: state.appToken,
        body: {}
      }),
      "mark conversation read"
    );
    requireSuccess(
      await httpRequest({
        method: "POST",
        path: "/app/conversations/doctor",
        token: state.appToken,
        body: {
          topic: uniqueSuffix("Doctor Consultation")
        }
      }),
      "create doctor conversation"
    );
  });

  await runCase("content", "content and disease endpoints", async () => {
    const news = requireSuccess(
      await httpRequest({
        path: "/app/content/news?page=1&pageSize=5&sort=latest",
        token: state.appToken
      }),
      "news list"
    );
    const newsList = listOf(news);
    assert(newsList.length > 0, "news list is empty");
    const newsId = pickId(newsList[0], ["newsId", "id"]);
    assert(newsId, "missing news id");
    requireSuccess(
      await httpRequest({
        path: `/app/content/news/${newsId}`,
        token: state.appToken
      }),
      "news detail"
    );
    requireSuccess(
      await httpRequest({
        method: "POST",
        path: `/app/content/news/${newsId}/like`,
        token: state.appToken
      }),
      "news like"
    );
    requireSuccess(
      await httpRequest({
        method: "POST",
        path: `/app/content/news/${newsId}/favorite`,
        token: state.appToken
      }),
      "news favorite"
    );
    requireSuccess(
      await httpRequest({
        method: "POST",
        path: `/app/content/news/${newsId}/share`,
        token: state.appToken
      }),
      "news share"
    );
    requireSuccess(
      await httpRequest({
        path: `/app/content/news/${newsId}/comments?page=1&pageSize=5`,
        token: state.appToken
      }),
      "news comments"
    );
    requireSuccess(
      await httpRequest({
        method: "POST",
        path: `/app/content/news/${newsId}/comments`,
        token: state.appToken,
        body: {
          content: uniqueSuffix("news comment")
        }
      }),
      "create news comment"
    );

    const lectures = requireSuccess(
      await httpRequest({
        path: "/app/content/lectures?page=1&pageSize=5&sort=hot",
        token: state.appToken
      }),
      "lectures list"
    );
    const lectureList = listOf(lectures);
    assert(lectureList.length > 0, "lectures list is empty");
    const lectureId = pickId(lectureList[0], ["lectureId", "id"]);
    assert(lectureId, "missing lecture id");
    requireSuccess(
      await httpRequest({
        path: `/app/content/lectures/${lectureId}`,
        token: state.appToken
      }),
      "lecture detail"
    );
    requireSuccess(
      await httpRequest({
        method: "POST",
        path: `/app/content/lectures/${lectureId}/like`,
        token: state.appToken
      }),
      "lecture like"
    );
    requireSuccess(
      await httpRequest({
        method: "POST",
        path: `/app/content/lectures/${lectureId}/favorite`,
        token: state.appToken
      }),
      "lecture favorite"
    );
    requireSuccess(
      await httpRequest({
        method: "POST",
        path: `/app/content/lectures/${lectureId}/share`,
        token: state.appToken
      }),
      "lecture share"
    );
    requireSuccess(
      await httpRequest({
        path: `/app/content/lectures/${lectureId}/comments?page=1&pageSize=5`,
        token: state.appToken
      }),
      "lecture comments"
    );
    requireSuccess(
      await httpRequest({
        method: "POST",
        path: `/app/content/lectures/${lectureId}/comments`,
        token: state.appToken,
        body: {
          content: uniqueSuffix("lecture comment")
        }
      }),
      "create lecture comment"
    );

    const departments = requireSuccess(
      await httpRequest({
        path: "/app/content/diseases/departments",
        token: state.appToken
      }),
      "disease departments"
    );
    const departmentList = listOf(departments);
    const departmentId =
      departmentList.length > 0 ? pickId(departmentList[0], ["departmentId", "id"]) : "";
    const diseases = requireSuccess(
      await httpRequest({
        path: `/app/content/diseases?page=1&pageSize=5${departmentId ? `&departmentId=${departmentId}` : ""}`,
        token: state.appToken
      }),
      "diseases"
    );
    const diseaseList = listOf(diseases);
    assert(diseaseList.length > 0, "disease list is empty");
    const diseaseId = pickId(diseaseList[0], ["diseaseId", "id"]);
    assert(diseaseId, "missing disease id");
    requireSuccess(
      await httpRequest({
        path: `/app/content/diseases/${diseaseId}`,
        token: state.appToken
      }),
      "disease detail"
    );
  });

  await runCase("community", "community posts and activities", async () => {
    const topics = requireSuccess(
      await httpRequest({
        path: "/app/community/topics",
        token: state.appToken
      }),
      "community topics"
    );
    const topicList = listOf(topics);
    assert(topicList.length > 0, "topic list is empty");
    const topicId = pickId(topicList[0], ["topicId", "id"]);
    assert(topicId, "missing topic id");

    const posts = requireSuccess(
      await httpRequest({
        path: "/app/community/posts?page=1&pageSize=5&feedType=recommended",
        token: state.appToken
      }),
      "post feed"
    );
    const postList = listOf(posts);
    assert(postList.length > 0, "post list is empty");
    const existingPostId = pickId(postList[0], ["postId", "id"]);
    assert(existingPostId, "missing post id");
    requireSuccess(
      await httpRequest({
        path: `/app/community/posts/${existingPostId}`,
        token: state.appToken
      }),
      "post detail"
    );
    requireSuccess(
      await httpRequest({
        method: "POST",
        path: `/app/community/posts/${existingPostId}/like`,
        token: state.appToken
      }),
      "post like"
    );
    requireSuccess(
      await httpRequest({
        method: "POST",
        path: `/app/community/posts/${existingPostId}/favorite`,
        token: state.appToken
      }),
      "post favorite"
    );
    requireSuccess(
      await httpRequest({
        method: "POST",
        path: `/app/community/posts/${existingPostId}/share`,
        token: state.appToken
      }),
      "post share"
    );
    requireSuccess(
      await httpRequest({
        path: `/app/community/posts/${existingPostId}/comments?page=1&pageSize=5`,
        token: state.appToken
      }),
      "post comments"
    );
    requireSuccess(
      await httpRequest({
        method: "POST",
        path: `/app/community/posts/${existingPostId}/comments`,
        token: state.appToken,
        body: {
          content: uniqueSuffix("post comment")
        }
      }),
      "create post comment"
    );

    const createdPost = requireSuccess(
      await httpRequest({
        method: "POST",
        path: "/app/community/posts",
        token: state.appToken,
        body: {
          topicId,
          content: uniqueSuffix("expanded smoke post"),
          images: [],
          tagLabel: "expanded-smoke"
        }
      }),
      "create post"
    );
    const createdPostId = pickId(createdPost, ["postId", "id"]);
    assert(createdPostId, "missing created post id");
    requireSuccess(
      await httpRequest({
        method: "PUT",
        path: `/app/community/posts/${createdPostId}`,
        token: state.appToken,
        body: {
          content: uniqueSuffix("expanded smoke post update"),
          images: [],
          tagLabel: "expanded-smoke-updated"
        }
      }),
      "update post"
    );
    requireSuccess(
      await httpRequest({
        method: "DELETE",
        path: `/app/community/posts/${createdPostId}`,
        token: state.appToken
      }),
      "delete post"
    );

    const activities = requireSuccess(
      await httpRequest({
        path: "/app/community/activities?page=1&pageSize=5&sort=hot",
        token: state.appToken
      }),
      "activities"
    );
    const activityList = listOf(activities);
    assert(activityList.length > 0, "activity list is empty");
    const activityId = pickId(activityList[0], ["activityId", "id"]);
    assert(activityId, "missing activity id");
    requireSuccess(
      await httpRequest({
        path: "/app/community/activities/my?page=1&pageSize=5",
        token: state.appToken
      }),
      "my activity list"
    );
    requireSuccess(
      await httpRequest({
        path: `/app/community/activities/${activityId}`,
        token: state.appToken
      }),
      "activity detail"
    );
    requireSuccess(
      await httpRequest({
        method: "POST",
        path: `/app/community/activities/${activityId}/like`,
        token: state.appToken
      }),
      "activity like"
    );
    requireSuccess(
      await httpRequest({
        method: "POST",
        path: `/app/community/activities/${activityId}/favorite`,
        token: state.appToken
      }),
      "activity favorite"
    );
    requireSuccess(
      await httpRequest({
        method: "POST",
        path: `/app/community/activities/${activityId}/share`,
        token: state.appToken
      }),
      "activity share"
    );
    requireSuccess(
      await httpRequest({
        path: `/app/community/activities/${activityId}/comments?page=1&pageSize=5`,
        token: state.appToken
      }),
      "activity comments"
    );
    requireSuccess(
      await httpRequest({
        method: "POST",
        path: `/app/community/activities/${activityId}/comments`,
        token: state.appToken,
        body: {
          content: uniqueSuffix("activity comment")
        }
      }),
      "create activity comment"
    );
    requireSuccess(
      await httpRequest({
        method: "POST",
        path: `/app/community/activities/${activityId}/register`,
        token: state.appToken,
        body: {
          remark: "expanded smoke register"
        }
      }),
      "register activity"
    );
    requireSuccess(
      await httpRequest({
        method: "POST",
        path: `/app/community/activities/${activityId}/cancel`,
        token: state.appToken,
        body: {
          reason: "expanded smoke rollback"
        }
      }),
      "cancel activity"
    );
  });

  await runCase("admin", "admin dashboard, orders, and report review", async () => {
    requireSuccess(
      await httpRequest({
        path: "/admin/dashboard/overview",
        token: state.adminToken
      }),
      "admin dashboard"
    );
    requireSuccess(
      await httpRequest({
        path: "/admin/work-orders?page=1&pageSize=5",
        token: state.adminToken
      }),
      "admin work orders"
    );
    const adminOrders = requireSuccess(
      await httpRequest({
        path: "/admin/orders?page=1&pageSize=5",
        token: state.adminToken
      }),
      "admin orders"
    );
    const adminOrderList = listOf(adminOrders);
    assert(adminOrderList.length > 0, "admin order list is empty");
    const adminOrderId = pickId(adminOrderList[0], ["orderId", "id"]);
    assert(adminOrderId, "missing admin order id");
    requireSuccess(
      await httpRequest({
        path: `/admin/orders/${adminOrderId}`,
        token: state.adminToken
      }),
      "admin order detail"
    );
    requireSuccess(
      await httpRequest({
        path: "/admin/elders/user_elder_joy",
        token: state.adminToken
      }),
      "admin elder detail"
    );
    requireSuccess(
      await httpRequest({
        path: "/admin/reports?page=1&pageSize=5",
        token: state.adminToken
      }),
      "admin reports"
    );

    const reviewReport = requireSuccess(
      await httpRequest({
        method: "POST",
        path: "/app/health/reports/checkups",
        token: state.appToken,
        body: {
          title: uniqueSuffix("Admin Review Report"),
          summary: {
            result: "pending-review"
          },
          attachment: {
            name: "review.pdf"
          }
        }
      }),
      "create review report"
    );
    const reviewReportId = pickId(reviewReport, ["reportId", "id"]);
    assert(reviewReportId, "missing review report id");
    requireSuccess(
      await httpRequest({
        method: "PUT",
        path: `/admin/reports/${reviewReportId}/review`,
        token: state.adminToken,
        body: {
          status: "PUBLISHED"
        }
      }),
      "review report"
    );
  });

  await runCase("app_ai", "assistant conversation flow", async () => {
    const assistantConversation = requireSuccess(
      await httpRequest({
        method: "POST",
        path: "/app/ai/assistant/conversations",
        token: state.appToken,
        body: {
          topic: uniqueSuffix("AI Conversation")
        }
      }),
      "create ai conversation"
    );
    const assistantConversationId = pickId(assistantConversation, ["conversationId", "id"]);
    assert(assistantConversationId, "missing ai conversation id");
    requireSuccess(
      await httpRequest({
        path: `/app/ai/assistant/conversations/${assistantConversationId}`,
        token: state.appToken
      }),
      "ai conversation detail"
    );
    requireSuccess(
      await httpRequest({
        path: `/app/ai/assistant/conversations/${assistantConversationId}/messages?page=1&pageSize=10`,
        token: state.appToken
      }),
      "ai conversation messages"
    );
    requireSuccess(
      await httpRequest({
        method: "POST",
        path: `/app/ai/assistant/conversations/${assistantConversationId}/messages`,
        token: state.appToken,
        body: {
          content: "Please summarize my recent health risks",
          pageId: "health/health-data",
          route: "/health/health-data"
        }
      }),
      "send ai message"
    );
  });

  await runCase("app_ai", "ai summaries, reports, and risk alerts", async () => {
    requireSuccess(
      await httpRequest({
        method: "POST",
        path: "/app/ai/service-recommendations",
        token: state.appToken,
        body: {
          query: "Need home rehab support",
          limit: 3
        }
      }),
      "service recommendations"
    );
    requireSuccess(
      await httpRequest({
        method: "POST",
        path: "/app/ai/order-prefill",
        token: state.appToken,
        body: {
          serviceRequest: "Arrange a home rehabilitation assessment next week"
        }
      }),
      "order prefill"
    );
    requireSuccess(
      await httpRequest({
        path: "/app/ai/health-summary",
        token: state.appToken
      }),
      "health summary"
    );
    requireSuccess(
      await httpRequest({
        path: "/app/ai/health-metric-explanations?metricTypes=bloodPressure,heartRate",
        token: state.appToken
      }),
      "health metric explanations"
    );
    assert(state.reportIdForAi, "missing ai report id");
    requireSuccess(
      await httpRequest({
        path: `/app/ai/reports/${state.reportIdForAi}/interpretation`,
        token: state.appToken
      }),
      "ai report interpretation"
    );
    requireSuccess(
      await httpRequest({
        path: `/app/ai/reports/${state.reportIdForAi}/followup-suggestions`,
        token: state.appToken
      }),
      "ai report followup"
    );
    const alerts = requireSuccess(
      await httpRequest({
        path: "/app/ai/risk-alerts?page=1&pageSize=5",
        token: state.appToken
      }),
      "risk alerts"
    );
    const alertList = listOf(alerts);
    assert(alertList.length > 0, "risk alerts list is empty");
    const alertId = pickId(alertList[0], ["alertId", "id"]);
    assert(alertId, "missing alert id");
    requireSuccess(
      await httpRequest({
        path: `/app/ai/risk-alerts/${alertId}`,
        token: state.appToken
      }),
      "risk alert detail"
    );
    requireSuccess(
      await httpRequest({
        path: "/app/ai/knowledge/search?query=rehab&limit=3",
        token: state.appToken
      }),
      "ai knowledge search"
    );
  });

  await runCase("internal_agents", "definitions and rag endpoints", async () => {
    requireSuccess(
      await httpRequest({
        path: "/internal/agents/definitions",
        token: state.adminToken
      }),
      "agent definitions"
    );
    requireSuccess(
      await httpRequest({
        path: "/internal/agents/blueprint",
        token: state.adminToken
      }),
      "agent blueprint"
    );
    requireSuccess(
      await httpRequest({
        path: "/internal/agents/tasks?limit=5",
        token: state.adminToken
      }),
      "agent task list"
    );
    requireSuccess(
      await httpRequest({
        path: "/internal/agents/rag/knowledge-bases",
        token: state.adminToken
      }),
      "knowledge bases"
    );
    requireSuccess(
      await httpRequest({
        method: "POST",
        path: "/internal/agents/rag/search",
        token: state.adminToken,
        body: {
          query: "rehab",
          limit: 3
        }
      }),
      "rag search"
    );
  });

  await runCase("internal_agents", "task lifecycle", async () => {
    const task = requireSuccess(
      await httpRequest({
        method: "POST",
        path: "/internal/agents/tasks",
        token: state.adminToken,
        body: {
          agentName: "intent-router",
          taskType: "report-summary",
          ownerId: "user_elder_zhou",
          triggerSource: "internal-api",
          payload: {
            reportId: "report_checkup_exam",
            userId: "user_elder_zhou"
          }
        }
      }),
      "create task"
    );
    const taskId = pickId(task.task ?? task, ["id", "taskId"]);
    assert(taskId, "missing task id");
    await waitForTaskToLeaveRunning(taskId, state.adminToken);
    requireSuccess(
      await httpRequest({
        method: "POST",
        path: `/internal/agents/tasks/${taskId}/retry`,
        token: state.adminToken,
        body: {}
      }),
      "retry task"
    );
  });

  const summary = summarize();

  if (summary.failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  const detail = error instanceof Error ? error.message : String(error);
  console.error(detail);
  process.exit(1);
});
