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
  try {
    return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
  } catch {
    return false;
  }
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

  let rawValue = "";

  try {
    rawValue = window.localStorage.getItem(USER_AUTH_STORAGE_KEY) || "";
  } catch {
    return null;
  }

  if (!rawValue) {
    return null;
  }

  try {
    const parsedValue = JSON.parse(rawValue);
    return isValidSession(parsedValue) ? parsedValue : null;
  } catch {
    try {
      window.localStorage.removeItem(USER_AUTH_STORAGE_KEY);
    } catch {
      // Ignore storage cleanup failures in restricted browser contexts.
    }
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
    return;
  }

  try {
    window.localStorage.setItem(USER_AUTH_STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Ignore storage write failures in restricted browser contexts.
  }
}

export function clearUserAuthSession() {
  currentUserAuthSession.value = null;

  if (!canUseStorage()) {
    return;
  }

  try {
    window.localStorage.removeItem(USER_AUTH_STORAGE_KEY);
  } catch {
    // Ignore storage cleanup failures in restricted browser contexts.
  }
}

export function hasUserAuthSession() {
  return Boolean(currentUserAuthSession.value?.accessToken);
}
