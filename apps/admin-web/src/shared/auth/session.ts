import { shallowRef } from "vue";

const ADMIN_AUTH_STORAGE_KEY = "ihc:admin-web:auth-session";

export interface AdminAuthSessionUser {
  userId?: string;
  id?: string;
  phone: string;
  type: string;
  roles: string[];
  realName: string | null;
}

export interface AdminAuthSession {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: string | number;
  user: AdminAuthSessionUser;
}

function canUseStorage() {
  return typeof window !== "undefined";
}

function isValidSession(value: unknown): value is AdminAuthSession {
  if (!value || typeof value !== "object") {
    return false;
  }

  const session = value as Partial<AdminAuthSession>;
  return (
    typeof session.accessToken === "string" &&
    typeof session.refreshToken === "string" &&
    typeof session.tokenType === "string" &&
    typeof session.user?.phone === "string" &&
    Array.isArray(session.user?.roles)
  );
}

function loadFromStorage(storage: Storage) {
  const rawValue = storage.getItem(ADMIN_AUTH_STORAGE_KEY);

  if (!rawValue) {
    return null;
  }

  try {
    const parsedValue = JSON.parse(rawValue);
    return isValidSession(parsedValue) ? parsedValue : null;
  } catch {
    storage.removeItem(ADMIN_AUTH_STORAGE_KEY);
    return null;
  }
}

function loadAdminAuthSession() {
  if (!canUseStorage()) {
    return null;
  }

  return (
    loadFromStorage(window.sessionStorage) ||
    loadFromStorage(window.localStorage)
  );
}

export const currentAdminAuthSession = shallowRef<AdminAuthSession | null>(
  loadAdminAuthSession()
);

export function getAdminAuthSession() {
  return currentAdminAuthSession.value;
}

export function getAdminAccessToken() {
  return currentAdminAuthSession.value?.accessToken || "";
}

export function getAdminAuthorizationValue() {
  const session = currentAdminAuthSession.value;

  if (!session?.accessToken) {
    return "";
  }

  const tokenType = session.tokenType.trim() || "Bearer";
  return `${tokenType} ${session.accessToken}`;
}

export function saveAdminAuthSession(
  session: AdminAuthSession,
  options?: { persist?: boolean }
) {
  currentAdminAuthSession.value = session;

  if (!canUseStorage()) {
    return;
  }

  const targetStorage = options?.persist ? window.localStorage : window.sessionStorage;
  const otherStorage = options?.persist ? window.sessionStorage : window.localStorage;
  targetStorage.setItem(ADMIN_AUTH_STORAGE_KEY, JSON.stringify(session));
  otherStorage.removeItem(ADMIN_AUTH_STORAGE_KEY);
}

export function clearAdminAuthSession() {
  currentAdminAuthSession.value = null;

  if (!canUseStorage()) {
    return;
  }

  window.localStorage.removeItem(ADMIN_AUTH_STORAGE_KEY);
  window.sessionStorage.removeItem(ADMIN_AUTH_STORAGE_KEY);
}

export function hasAdminAuthSession() {
  return Boolean(currentAdminAuthSession.value?.accessToken);
}
