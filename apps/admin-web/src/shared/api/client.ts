import { clearAdminAuthSession, getAdminAuthorizationValue } from "@/shared/auth/session";

const REMOTE_API_ORIGIN = "http://server.mctown.online:8190";
const DEFAULT_API_BASE_URL = `${REMOTE_API_ORIGIN}/api/v1`;

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

  if (typeof window !== "undefined") {
    const { hostname, protocol } = window.location;
    const isLocalPreview =
      hostname === "localhost" ||
      hostname === "127.0.0.1";

    // 本地开发时优先走 Vite 代理，避免浏览器因 CORS 直接拦截远端接口。
    if (isLocalPreview && protocol === "http:") {
      return "/api/v1";
    }
  }

  const normalizedBaseUrl = DEFAULT_API_BASE_URL;
  return normalizedBaseUrl.replace(/\/+$/, "");
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

export async function request<T>(path: string, options: RequestOptions = {}) {
  const { auth = false, body, headers, ...rest } = options;
  const requestHeaders = new Headers(headers);

  if (auth) {
    const authorizationValue = getAdminAuthorizationValue();

    if (!authorizationValue) {
      throw new ApiClientError("后台登录已失效，请重新登录");
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

  let response: Response;

  try {
    response = await fetch(`${resolveApiBaseUrl()}${path}`, {
      ...rest,
      body: requestBody,
      headers: requestHeaders
    });
  } catch {
    throw new ApiClientError(
      `无法连接后端接口，请检查 API 地址 ${resolveApiBaseUrl()}，并确认后端已启动或当前请求未被浏览器跨域/协议策略拦截`
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
      clearAdminAuthSession();
    }

    throw error;
  }

  return payload.data;
}
