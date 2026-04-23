import { shallowRef } from "vue";

const USER_AUTH_STORAGE_KEY = "ihc:user-web:auth-session";

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
  if (!canUseStorage()) {
    return null;
  }

  const rawValue = window.localStorage.getItem(USER_AUTH_STORAGE_KEY);

  if (!rawValue) {
    return null;
  }

  try {
    const parsedValue = JSON.parse(rawValue);
    return isValidSession(parsedValue) ? parsedValue : null;
  } catch {
    window.localStorage.removeItem(USER_AUTH_STORAGE_KEY);
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

export function saveUserAuthSession(session: UserAuthSession) {
  currentUserAuthSession.value = session;

  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(USER_AUTH_STORAGE_KEY, JSON.stringify(session));
}

export function clearUserAuthSession() {
  currentUserAuthSession.value = null;

  if (!canUseStorage()) {
    return;
  }

  window.localStorage.removeItem(USER_AUTH_STORAGE_KEY);
}

export function hasUserAuthSession() {
  return Boolean(currentUserAuthSession.value?.accessToken);
}
