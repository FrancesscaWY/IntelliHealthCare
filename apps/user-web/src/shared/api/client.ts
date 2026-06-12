import { clearUserAuthSession, getUserAuthorizationValue } from "@/shared/auth/session";

const REMOTE_API_ORIGIN = "http://server.mctown.online:8190";
const DEFAULT_API_BASE_URL = `${REMOTE_API_ORIGIN}/api/v1`;
const DEFAULT_GET_CACHE_TTL_MS = 8_000;
const inFlightGetRequests = new Map<string, Promise<unknown>>();
const getResponseCache = new Map<string, { expiresAt: number; data: unknown }>();

export interface ApiEnvelope<T> {
  code: number;
  message: string;
  requestId: string | null;
  data: T;
}

interface RequestOptions extends Omit<RequestInit, "body" | "headers"> {
  auth?: boolean;
  body?: BodyInit | object | null;
  headers?: HeadersInit;
  cacheTtlMs?: number;
  dedupe?: boolean;
}

export class ApiClientError extends Error {
  status: number;
  code: number;
  requestId: string | null;

  constructor(message: string, options?: { status?: number; code?: number; requestId?: string | null }) {
    super(message);
    this.name = "ApiClientError";
    this.status = options?.status ?? 0;
    this.code = options?.code ?? 0;
    this.requestId = options?.requestId ?? null;
  }
}

function resolveApiBaseUrl() {
  const envBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
  if (envBaseUrl) {
    return envBaseUrl.replace(/\/+$/, "");
  }

  if (import.meta.env.DEV) {
    return "/api/v1";
  }

  if (typeof window !== "undefined") {
    const { hostname, protocol } = window.location;
    const isLocalPreview = hostname === "localhost" || hostname === "127.0.0.1";
    const isHttpsPage = protocol === "https:";

    if (isLocalPreview) {
      return "/api/v1";
    }

    // Avoid browser mixed-content blocking when the page itself is loaded via HTTPS.
    if (isHttpsPage && REMOTE_API_ORIGIN.startsWith("http://")) {
      return "/api/v1";
    }
  }

  return DEFAULT_API_BASE_URL.replace(/\/+$/, "");
}

function isBodyInit(value: unknown): value is BodyInit {
  return (
    typeof value === "string" ||
    value instanceof FormData ||
    value instanceof URLSearchParams ||
    value instanceof Blob ||
    value instanceof ArrayBuffer
  );
}

function getRequestMethod(method?: string) {
  return (method || "GET").toUpperCase();
}

function isCacheableGetRequest(method: string, body: BodyInit | undefined, cacheTtlMs: number) {
  return (method === "GET" || method === "HEAD") && body === undefined && cacheTtlMs > 0;
}

function createRequestCacheKey(input: {
  method: string;
  url: string;
  headers: Headers;
}) {
  const normalizedHeaders = Array.from(input.headers.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}:${value}`)
    .join("|");

  return `${input.method} ${input.url} ${normalizedHeaders}`;
}

function clearExpiredGetResponseCache(now = Date.now()) {
  for (const [key, value] of getResponseCache.entries()) {
    if (value.expiresAt <= now) {
      getResponseCache.delete(key);
    }
  }
}

export function clearApiResponseCache() {
  getResponseCache.clear();
}

export async function request<T>(path: string, options: RequestOptions = {}) {
  const {
    auth = false,
    body,
    headers,
    cacheTtlMs = DEFAULT_GET_CACHE_TTL_MS,
    dedupe = true,
    ...rest
  } = options;
  const requestHeaders = new Headers(headers);
  const method = getRequestMethod(rest.method);
  const apiBaseUrl = resolveApiBaseUrl();
  const requestUrl = `${apiBaseUrl}${path}`;

  if (auth) {
    const authorizationValue = getUserAuthorizationValue();

    if (!authorizationValue) {
      throw new ApiClientError("登录状态已失效，请重新登录");
    }

    requestHeaders.set("Authorization", authorizationValue);
  }

  let requestBody: BodyInit | undefined;

  if (body !== undefined && body !== null) {
    if (isBodyInit(body)) {
      requestBody = body;
    } else {
      requestHeaders.set("Content-Type", "application/json");
      requestBody = JSON.stringify(body);
    }
  }

  const canUseGetCache = isCacheableGetRequest(method, requestBody, cacheTtlMs);
  const cacheKey = canUseGetCache
    ? createRequestCacheKey({
        method,
        url: requestUrl,
        headers: requestHeaders
      })
    : "";

  if (canUseGetCache) {
    const now = Date.now();
    clearExpiredGetResponseCache(now);

    const cachedResponse = getResponseCache.get(cacheKey);
    if (cachedResponse && cachedResponse.expiresAt > now) {
      return cachedResponse.data as T;
    }

    const inFlightRequest = inFlightGetRequests.get(cacheKey);
    if (dedupe && inFlightRequest) {
      return inFlightRequest as Promise<T>;
    }
  }

  let response: Response;

  const requestTask = (async () => {
    try {
      response = await fetch(requestUrl, {
        ...rest,
        method,
        body: requestBody,
        headers: requestHeaders
      });
    } catch {
      throw new ApiClientError(
        `无法连接后端接口，请检查 API 地址 ${apiBaseUrl}，并确认后端已启动或当前请求未被浏览器跨域/协议策略拦截`
      );
    }

    const rawText = await response.text();
    let payload: ApiEnvelope<T> | null = null;

    if (rawText) {
      try {
        payload = JSON.parse(rawText) as ApiEnvelope<T>;
      } catch {
        throw new ApiClientError("接口返回了无法解析的响应内容", {
          status: response.status
        });
      }
    }

    if (!response.ok || !payload || payload.code !== 0) {
      const errorMessage = payload?.message || `请求失败 (${response.status})`;
      const error = new ApiClientError(errorMessage, {
        status: response.status,
        code: payload?.code,
        requestId: payload?.requestId
      });

      if (auth && (response.status === 401 || response.status === 403)) {
        clearApiResponseCache();
        clearUserAuthSession();
      }

      throw error;
    }

    if (!canUseGetCache) {
      clearApiResponseCache();
    }

    if (canUseGetCache) {
      getResponseCache.set(cacheKey, {
        data: payload.data,
        expiresAt: Date.now() + cacheTtlMs
      });
    }

    return payload.data;
  })();

  if (canUseGetCache && dedupe) {
    inFlightGetRequests.set(cacheKey, requestTask);
    void requestTask
      .finally(() => {
        inFlightGetRequests.delete(cacheKey);
      })
      .catch(() => undefined);
  }

  return requestTask;
}
