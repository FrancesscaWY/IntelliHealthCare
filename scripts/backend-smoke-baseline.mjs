#!/usr/bin/env node

const BASE_URL = process.env.BASE_URL ?? "http://server.mctown.online:8190/api/v1";
const APP_PHONE = process.env.APP_TEST_PHONE ?? "13900139000";
const APP_PASSWORD = process.env.APP_TEST_PASSWORD ?? "123456";
const REQUEST_TIMEOUT_MS = Number(process.env.SMOKE_TIMEOUT_MS ?? 15000);

const state = {
  appToken: "",
  refreshToken: "",
  addressId: "",
  serviceId: "",
  orderId: "",
  paymentId: ""
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
  body
}) {
  const headers = {
    "content-type": "application/json"
  };

  if (token) {
    headers.authorization = `Bearer ${token}`;
  }

  const response = await requestWithTimeout(`${BASE_URL}${normalizePath(path)}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body)
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

  console.log("\n=== Smoke Summary ===");
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

function getTomorrowDateString() {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

async function main() {
  await runCase("precheck", "system health", async () => {
    const response = await httpRequest({
      path: "/system/health"
    });
    requireSuccess(response, "system health");
  });

  await runCase("auth", "privacy agreement", async () => {
    const response = await httpRequest({
      path: "/app/agreements/privacy"
    });
    requireSuccess(response, "privacy agreement");
  });

  await runCase("auth", "password login", async () => {
    const response = await httpRequest({
      method: "POST",
      path: "/app/auth/login/password",
      body: {
        phone: APP_PHONE,
        password: APP_PASSWORD,
        agreePrivacy: true
      }
    });
    const data = requireSuccess(response, "password login");
    assert(typeof data.accessToken === "string" && data.accessToken.length > 10, "missing access token");
    assert(typeof data.refreshToken === "string" && data.refreshToken.length > 10, "missing refresh token");
    state.appToken = data.accessToken;
    state.refreshToken = data.refreshToken;
  });

  await runCase("auth", "token refresh", async () => {
    const response = await httpRequest({
      method: "POST",
      path: "/app/auth/token/refresh",
      body: {
        refreshToken: state.refreshToken
      }
    });
    const data = requireSuccess(response, "token refresh");
    assert(typeof data.accessToken === "string" && data.accessToken.length > 10, "invalid refreshed token");
  });

  await runCase("auth", "unauthorized me check", async () => {
    const response = await httpRequest({
      path: "/app/users/me"
    });
    assert(response.status >= 400 && response.status < 500, `expected 4xx, got ${response.status}`);
  });

  await runCase("auth", "authorized me check", async () => {
    const response = await httpRequest({
      path: "/app/users/me",
      token: state.appToken
    });
    const data = requireSuccess(response, "authorized me check");
    assert(typeof data.userId === "string" && data.userId.length > 0, "missing userId");
  });

  await runCase("service_catalog", "list categories", async () => {
    const response = await httpRequest({
      path: "/app/services/categories",
      token: state.appToken
    });
    const data = requireSuccess(response, "list categories");
    assert(Array.isArray(data) && data.length > 0, "service categories is empty");
  });

  await runCase("service_catalog", "home-care list/detail", async () => {
    const listResponse = await httpRequest({
      path: "/app/services/home-care?page=1&pageSize=5",
      token: state.appToken
    });
    const listData = requireSuccess(listResponse, "home-care list");
    assert(Array.isArray(listData.list) && listData.list.length > 0, "home-care list is empty");
    state.serviceId = listData.list[0].serviceId;

    const detailResponse = await httpRequest({
      path: `/app/services/home-care/${state.serviceId}`,
      token: state.appToken
    });
    const detailData = requireSuccess(detailResponse, "home-care detail");
    assert(detailData.serviceId === state.serviceId, "service detail mismatch");
  });

  await runCase("service_catalog", "rehab-therapy list/detail", async () => {
    const listResponse = await httpRequest({
      path: "/app/services/rehab-therapy?page=1&pageSize=5",
      token: state.appToken
    });
    const listData = requireSuccess(listResponse, "rehab-therapy list");
    assert(Array.isArray(listData.list) && listData.list.length > 0, "rehab-therapy list is empty");
    const serviceId = listData.list[0].serviceId;

    const detailResponse = await httpRequest({
      path: `/app/services/rehab-therapy/${serviceId}`,
      token: state.appToken
    });
    const detailData = requireSuccess(detailResponse, "rehab-therapy detail");
    assert(detailData.serviceId === serviceId, "rehab-therapy detail mismatch");
  });

  await runCase("service_catalog", "home-exam list/detail", async () => {
    const listResponse = await httpRequest({
      path: "/app/services/home-exam?page=1&pageSize=5",
      token: state.appToken
    });
    const listData = requireSuccess(listResponse, "home-exam list");
    assert(Array.isArray(listData.list) && listData.list.length > 0, "home-exam list is empty");
    const serviceId = listData.list[0].serviceId;

    const detailResponse = await httpRequest({
      path: `/app/services/home-exam/${serviceId}`,
      token: state.appToken
    });
    const detailData = requireSuccess(detailResponse, "home-exam detail");
    assert(detailData.serviceId === serviceId, "home-exam detail mismatch");
  });

  await runCase("service_catalog", "elderly-care list/detail", async () => {
    const listResponse = await httpRequest({
      path: "/app/services/elderly-care?page=1&pageSize=5",
      token: state.appToken
    });
    const listData = requireSuccess(listResponse, "elderly-care list");
    assert(Array.isArray(listData.list) && listData.list.length > 0, "elderly-care list is empty");
    const serviceId = listData.list[0].serviceId;

    const detailResponse = await httpRequest({
      path: `/app/services/elderly-care/${serviceId}`,
      token: state.appToken
    });
    const detailData = requireSuccess(detailResponse, "elderly-care detail");
    assert(detailData.serviceId === serviceId, "elderly-care detail mismatch");
  });

  await runCase("orders", "load address and booking options", async () => {
    const addressResponse = await httpRequest({
      path: "/app/family/addresses",
      token: state.appToken
    });
    const addresses = requireSuccess(addressResponse, "family addresses");
    assert(Array.isArray(addresses) && addresses.length > 0, "family addresses is empty");
    state.addressId = addresses[0].addressId;

    const bookingOptionsResponse = await httpRequest({
      path: `/app/orders/booking/options?serviceId=${encodeURIComponent(state.serviceId)}`,
      token: state.appToken
    });
    const optionsData = requireSuccess(bookingOptionsResponse, "booking options");
    assert(Array.isArray(optionsData.availableDates) && optionsData.availableDates.length > 0, "booking dates is empty");
  });

  await runCase("orders", "preview order", async () => {
    const response = await httpRequest({
      method: "POST",
      path: "/app/orders/preview",
      token: state.appToken,
      body: {
        serviceId: state.serviceId,
        addressId: state.addressId
      }
    });
    const data = requireSuccess(response, "preview order");
    assert(data.service?.serviceId === state.serviceId, "preview service mismatch");
    assert(typeof data.price?.payableAmount === "number", "preview payableAmount missing");
  });

  await runCase("orders", "create order", async () => {
    const response = await httpRequest({
      method: "POST",
      path: "/app/orders",
      token: state.appToken,
      body: {
        serviceId: state.serviceId,
        addressId: state.addressId,
        bookingDate: getTomorrowDateString(),
        bookingTimeSlot: "09:00-11:00"
      }
    });
    const data = requireSuccess(response, "create order");
    assert(typeof data.orderId === "string" && data.orderId.length > 0, "missing orderId");
    state.orderId = data.orderId;
  });

  await runCase("orders", "query order list/detail", async () => {
    const listResponse = await httpRequest({
      path: "/app/orders?page=1&pageSize=10",
      token: state.appToken
    });
    const listData = requireSuccess(listResponse, "order list");
    assert(Array.isArray(listData.list) && listData.list.length > 0, "order list is empty");

    const detailResponse = await httpRequest({
      path: `/app/orders/${state.orderId}`,
      token: state.appToken
    });
    const detailData = requireSuccess(detailResponse, "order detail");
    assert(detailData.orderId === state.orderId, "order detail mismatch");
  });

  await runCase("orders", "update schedule", async () => {
    const response = await httpRequest({
      method: "PUT",
      path: `/app/orders/${state.orderId}/schedule`,
      token: state.appToken,
      body: {
        bookingDate: getTomorrowDateString(),
        bookingTimeSlot: "13:00-15:00"
      }
    });
    const data = requireSuccess(response, "update schedule");
    assert(data.orderId === state.orderId, "schedule response mismatch");
  });

  await runCase("orders", "create and confirm payment", async () => {
    const channelResponse = await httpRequest({
      path: "/app/payments/channels",
      token: state.appToken
    });
    const channels = requireSuccess(channelResponse, "payment channels");
    assert(Array.isArray(channels) && channels.length > 0, "payment channels is empty");
    const channel = channels[0].channel;

    const createResponse = await httpRequest({
      method: "POST",
      path: "/app/payments",
      token: state.appToken,
      body: {
        orderId: state.orderId,
        channel
      }
    });
    const createData = requireSuccess(createResponse, "create payment");
    assert(typeof createData.paymentId === "string" && createData.paymentId.length > 0, "missing paymentId");
    state.paymentId = createData.paymentId;

    const confirmResponse = await httpRequest({
      method: "POST",
      path: `/app/payments/${state.paymentId}/confirm`,
      token: state.appToken,
      body: {}
    });
    const confirmData = requireSuccess(confirmResponse, "confirm payment");
    assert(confirmData.status === "PAID", `payment status expected PAID, got ${confirmData.status}`);
  });

  await runCase("orders", "cancel order", async () => {
    const cancelResponse = await httpRequest({
      method: "POST",
      path: `/app/orders/${state.orderId}/cancel`,
      token: state.appToken,
      body: {
        reason: "smoke-baseline cleanup"
      }
    });
    const cancelData = requireSuccess(cancelResponse, "cancel order");
    assert(cancelData.orderId === state.orderId, "cancel response mismatch");

    const detailResponse = await httpRequest({
      path: `/app/orders/${state.orderId}`,
      token: state.appToken
    });
    const detailData = requireSuccess(detailResponse, "order detail after cancel");
    assert(detailData.status === "CANCELLED", `order status expected CANCELLED, got ${detailData.status}`);
  });

  const summary = summarize();
  if (summary.failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Smoke baseline aborted: ${message}`);
  process.exitCode = 1;
});
