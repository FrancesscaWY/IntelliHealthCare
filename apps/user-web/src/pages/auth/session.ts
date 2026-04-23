import { ref } from "vue";
import { getUserAuthSession } from "@/shared/auth/session";

const lastStoredPhone =
  typeof window === "undefined"
    ? ""
    : window.localStorage.getItem("ihc:user-web:last-login-phone") || "";
const lastSessionPhone = getUserAuthSession()?.user.phone || lastStoredPhone;
export const lastLoginPhone = ref(lastSessionPhone);
const PASSWORD_RESET_VERIFICATION_KEY =
  "ihc:user-web:password-reset-verification";
const PASSWORD_RESET_VERIFICATION_TTL = 10 * 60 * 1000;

export interface PasswordResetVerificationState {
  phone: string;
  code: string;
  verifiedAt: number;
}

function canUseSessionStorage() {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
}

function clearInvalidPasswordResetVerification() {
  if (!canUseSessionStorage()) {
    return;
  }

  window.sessionStorage.removeItem(PASSWORD_RESET_VERIFICATION_KEY);
}

export function setLastLoginPhone(phone: string) {
  const normalizedPhone = phone.trim();
  lastLoginPhone.value = normalizedPhone;

  if (typeof window === "undefined") {
    return;
  }

  if (normalizedPhone) {
    window.localStorage.setItem("ihc:user-web:last-login-phone", normalizedPhone);
    return;
  }

  window.localStorage.removeItem("ihc:user-web:last-login-phone");
}

export function savePasswordResetVerificationState(payload: {
  phone: string;
  code: string;
}) {
  if (!canUseSessionStorage()) {
    return;
  }

  const value: PasswordResetVerificationState = {
    phone: payload.phone.trim(),
    code: payload.code.trim(),
    verifiedAt: Date.now()
  };

  window.sessionStorage.setItem(
    PASSWORD_RESET_VERIFICATION_KEY,
    JSON.stringify(value)
  );
}

export function getPasswordResetVerificationState() {
  if (!canUseSessionStorage()) {
    return null;
  }

  const rawValue = window.sessionStorage.getItem(PASSWORD_RESET_VERIFICATION_KEY);

  if (!rawValue) {
    return null;
  }

  try {
    const parsedValue = JSON.parse(rawValue) as Partial<PasswordResetVerificationState>;

    if (
      typeof parsedValue.phone !== "string" ||
      typeof parsedValue.code !== "string" ||
      typeof parsedValue.verifiedAt !== "number"
    ) {
      clearInvalidPasswordResetVerification();
      return null;
    }

    if (Date.now() - parsedValue.verifiedAt > PASSWORD_RESET_VERIFICATION_TTL) {
      clearInvalidPasswordResetVerification();
      return null;
    }

    return parsedValue as PasswordResetVerificationState;
  } catch {
    clearInvalidPasswordResetVerification();
    return null;
  }
}

export function clearPasswordResetVerificationState() {
  clearInvalidPasswordResetVerification();
}
