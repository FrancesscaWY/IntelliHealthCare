import { normalizePageId } from "@ihc/page-core/runtime";
import { requiresUserAuth } from "./navigation";

const LAST_AUTH_PAGE_STORAGE_KEY = "ihc:user-web:last-auth-page-id";
const LAST_AUTH_PAGE_COOKIE_KEY = "ihc_user_web_last_auth_page";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

function canUseLocalStorage() {
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

function normalizeProtectedPageId(pageId: string) {
  const normalizedPageId = normalizePageId(pageId);
  return requiresUserAuth(normalizedPageId) ? normalizedPageId : "";
}

export function loadLastAuthenticatedPageId() {
  const storedPageId = canUseLocalStorage()
    ? window.localStorage.getItem(LAST_AUTH_PAGE_STORAGE_KEY) || ""
    : "";
  const normalizedStoredPageId = normalizeProtectedPageId(storedPageId);

  if (normalizedStoredPageId) {
    return normalizedStoredPageId;
  }

  return normalizeProtectedPageId(readCookie(LAST_AUTH_PAGE_COOKIE_KEY));
}

export function saveLastAuthenticatedPageId(pageId: string) {
  const normalizedPageId = normalizeProtectedPageId(pageId);

  if (!normalizedPageId) {
    return;
  }

  if (canUseLocalStorage()) {
    window.localStorage.setItem(LAST_AUTH_PAGE_STORAGE_KEY, normalizedPageId);
  }

  writeCookie(LAST_AUTH_PAGE_COOKIE_KEY, normalizedPageId);
}

export function clearLastAuthenticatedPageId() {
  if (canUseLocalStorage()) {
    window.localStorage.removeItem(LAST_AUTH_PAGE_STORAGE_KEY);
  }

  removeCookie(LAST_AUTH_PAGE_COOKIE_KEY);
}
