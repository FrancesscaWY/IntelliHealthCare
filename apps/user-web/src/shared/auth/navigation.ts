import { normalizePageId } from "@ihc/page-core/runtime";

export const LOGIN_PAGE_ID = "auth/login";
export const REAL_NAME_PAGE_ID = "auth/real-name";
export const DEFAULT_AUTHENTICATED_PAGE_ID = "home/dashboard";

const POST_LOGIN_REDIRECT_STORAGE_KEY = "ihc:user-web:post-login-page-id";
const PUBLIC_PAGE_IDS = new Set([
  "onboarding/intro",
  LOGIN_PAGE_ID,
  "auth/forgot-password",
  "auth/reset-password"
]);

function canUseSessionStorage() {
  try {
    return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
  } catch {
    return false;
  }
}

export function isPublicPageId(pageId: string) {
  return PUBLIC_PAGE_IDS.has(normalizePageId(pageId));
}

export function requiresUserAuth(pageId: string) {
  const normalizedPageId = normalizePageId(pageId);
  return Boolean(normalizedPageId) && !isPublicPageId(normalizedPageId);
}

export function rememberPostLoginPageId(pageId: string) {
  const normalizedPageId = normalizePageId(pageId);

  if (!requiresUserAuth(normalizedPageId) || !canUseSessionStorage()) {
    return;
  }

  try {
    window.sessionStorage.setItem(POST_LOGIN_REDIRECT_STORAGE_KEY, normalizedPageId);
  } catch {
    // Ignore storage write failures in restricted browser contexts.
  }
}

export function getPostLoginPageId() {
  if (!canUseSessionStorage()) {
    return "";
  }

  let storedValue = "";

  try {
    storedValue = window.sessionStorage.getItem(POST_LOGIN_REDIRECT_STORAGE_KEY) || "";
  } catch {
    return "";
  }

  const storedPageId = normalizePageId(storedValue);

  return requiresUserAuth(storedPageId) ? storedPageId : "";
}

export function clearPostLoginPageId() {
  if (!canUseSessionStorage()) {
    return;
  }

  try {
    window.sessionStorage.removeItem(POST_LOGIN_REDIRECT_STORAGE_KEY);
  } catch {
    // Ignore storage cleanup failures in restricted browser contexts.
  }
}

export function resolvePostLoginPageId(realNameVerified: boolean) {
  if (!realNameVerified) {
    return REAL_NAME_PAGE_ID;
  }

  const pendingPageId = getPostLoginPageId();
  clearPostLoginPageId();

  if (pendingPageId && pendingPageId !== REAL_NAME_PAGE_ID) {
    return pendingPageId;
  }

  return DEFAULT_AUTHENTICATED_PAGE_ID;
}
