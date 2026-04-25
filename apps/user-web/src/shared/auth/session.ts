import { shallowRef } from "vue";
import { clearLastAuthenticatedPageId } from "./page-session";

const USER_AUTH_STORAGE_KEY = "ihc:user-web:auth-session";
const USER_AUTH_COOKIE_KEY = "ihc_user_web_auth_session";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export interface UserAuthSessionUser {
  userId: string;
  phone: string;
  type: string;
  roles: string[];
  realName: string | null;
}

export interface UserAuthSession {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: string | number;
  user: UserAuthSessionUser;
}

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function canUseCookie() {
  return typeof document !== "undefined";
}

function readCookie(name: string) {
  if (!canUseCookie()) {
    return "";
  }

  const cookiePrefix = `${name}=`;
  const cookieValue = document.cookie
    .split("; ")
    .find((item) => item.startsWith(cookiePrefix));

  if (!cookieValue) {
    return "";
  }

  return decodeURIComponent(cookieValue.slice(cookiePrefix.length));
}

function writeCookie(name: string, value: string, maxAgeSeconds = COOKIE_MAX_AGE_SECONDS) {
  if (!canUseCookie()) {
    return;
  }

  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax`;
}

function removeCookie(name: string) {
  if (!canUseCookie()) {
    return;
  }

  document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
}

function isValidSession(value: unknown): value is UserAuthSession {
  if (!value || typeof value !== "object") {
    return false;
  }

  const session = value as Partial<UserAuthSession>;
  return (
    typeof session.accessToken === "string" &&
    typeof session.refreshToken === "string" &&
    typeof session.tokenType === "string" &&
    typeof session.user?.userId === "string" &&
    typeof session.user?.phone === "string" &&
    Array.isArray(session.user?.roles)
  );
}

function loadUserAuthSession() {
  const rawStorageValue = canUseStorage()
    ? window.localStorage.getItem(USER_AUTH_STORAGE_KEY) || ""
    : "";
  const rawCookieValue = readCookie(USER_AUTH_COOKIE_KEY);
  const rawValue = rawStorageValue || rawCookieValue;

  if (!rawValue) {
    return null;
  }

  try {
    const parsedValue = JSON.parse(rawValue);
    return isValidSession(parsedValue) ? parsedValue : null;
  } catch {
    if (canUseStorage()) {
      window.localStorage.removeItem(USER_AUTH_STORAGE_KEY);
    }
    removeCookie(USER_AUTH_COOKIE_KEY);
    return null;
  }
}

export const currentUserAuthSession = shallowRef<UserAuthSession | null>(
  loadUserAuthSession()
);

export function getUserAuthSession() {
  return currentUserAuthSession.value;
}

export function getUserAccessToken() {
  return currentUserAuthSession.value?.accessToken || "";
}

export function getUserAuthorizationValue() {
  const session = currentUserAuthSession.value;

  if (!session?.accessToken) {
    return "";
  }

  const tokenType = session.tokenType.trim() || "Bearer";
  return `${tokenType} ${session.accessToken}`;
}

export function saveUserAuthSession(session: UserAuthSession) {
  currentUserAuthSession.value = session;

  if (!canUseStorage()) {
    writeCookie(USER_AUTH_COOKIE_KEY, JSON.stringify(session));
    return;
  }

  window.localStorage.setItem(USER_AUTH_STORAGE_KEY, JSON.stringify(session));
  writeCookie(USER_AUTH_COOKIE_KEY, JSON.stringify(session));
}

export function clearUserAuthSession() {
  currentUserAuthSession.value = null;
  clearLastAuthenticatedPageId();

  if (!canUseStorage()) {
    removeCookie(USER_AUTH_COOKIE_KEY);
    return;
  }

  window.localStorage.removeItem(USER_AUTH_STORAGE_KEY);
  removeCookie(USER_AUTH_COOKIE_KEY);
}

export function hasUserAuthSession() {
  return Boolean(currentUserAuthSession.value?.accessToken);
}
