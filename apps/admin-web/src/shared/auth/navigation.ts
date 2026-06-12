import { normalizePageId } from "@ihc/page-core/runtime";

export const LOGIN_PAGE_ID = "auth/login";
export const DEFAULT_AUTHENTICATED_PAGE_ID = "dashboard/overview";

const POST_LOGIN_REDIRECT_STORAGE_KEY = "ihc:admin-web:post-login-page-id";
const PUBLIC_PAGE_IDS = new Set([LOGIN_PAGE_ID]);

function canUseSessionStorage() {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
}

export function isPublicPageId(pageId: string) {
  return PUBLIC_PAGE_IDS.has(normalizePageId(pageId));
}

export function requiresAdminAuth(pageId: string) {
  const normalizedPageId = normalizePageId(pageId);
  return Boolean(normalizedPageId) && !isPublicPageId(normalizedPageId);
}

export function rememberPostLoginPageId(pageId: string) {
  const normalizedPageId = normalizePageId(pageId);

  if (!requiresAdminAuth(normalizedPageId) || !canUseSessionStorage()) {
    return;
  }

  window.sessionStorage.setItem(POST_LOGIN_REDIRECT_STORAGE_KEY, normalizedPageId);
}

export function getPostLoginPageId() {
  if (!canUseSessionStorage()) {
    return "";
  }

  const storedPageId = normalizePageId(
    window.sessionStorage.getItem(POST_LOGIN_REDIRECT_STORAGE_KEY) || ""
  );

  return requiresAdminAuth(storedPageId) ? storedPageId : "";
}

export function clearPostLoginPageId() {
  if (!canUseSessionStorage()) {
    return;
  }

  window.sessionStorage.removeItem(POST_LOGIN_REDIRECT_STORAGE_KEY);
}

export function resolvePostLoginPageId() {
  const pendingPageId = getPostLoginPageId();
  clearPostLoginPageId();
  return pendingPageId || DEFAULT_AUTHENTICATED_PAGE_ID;
}
