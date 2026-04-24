import { ref } from "vue";
import { getUserAuthSession } from "@/shared/auth/session";

const lastStoredPhone =
  typeof window === "undefined"
    ? ""
    : (() => {
        try {
          return window.localStorage.getItem("ihc:user-web:last-login-phone") || "";
        } catch {
          return "";
        }
      })();
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
  try {
    return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
  } catch {
    return false;
  }
}

function clearInvalidPasswordResetVerification() {
  if (!canUseSessionStorage()) {
    return;
  }

  try {
    window.sessionStorage.removeItem(PASSWORD_RESET_VERIFICATION_KEY);
  } catch {
    // Ignore storage cleanup failures in restricted browser contexts.
  }
}

export function setLastLoginPhone(phone: string) {
  const normalizedPhone = phone.trim();
  lastLoginPhone.value = normalizedPhone;

  if (typeof window === "undefined") {
    return;
  }

  if (normalizedPhone) {
    try {
      window.localStorage.setItem("ihc:user-web:last-login-phone", normalizedPhone);
    } catch {
      // Ignore storage write failures in restricted browser contexts.
    }
    return;
  }

  try {
    window.localStorage.removeItem("ihc:user-web:last-login-phone");
  } catch {
    // Ignore storage cleanup failures in restricted browser contexts.
  }
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

  try {
    window.sessionStorage.setItem(
      PASSWORD_RESET_VERIFICATION_KEY,
      JSON.stringify(value)
    );
  } catch {
    // Ignore storage write failures in restricted browser contexts.
  }
}

export function getPasswordResetVerificationState() {
  if (!canUseSessionStorage()) {
    return null;
  }

  let rawValue = "";

  try {
    rawValue = window.sessionStorage.getItem(PASSWORD_RESET_VERIFICATION_KEY) || "";
  } catch {
    return null;
  }

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
