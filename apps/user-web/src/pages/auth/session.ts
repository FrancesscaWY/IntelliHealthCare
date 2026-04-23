import { ref } from "vue";
import { getUserAuthSession } from "@/shared/auth/session";

const lastStoredPhone =
  typeof window === "undefined"
    ? ""
    : window.localStorage.getItem("ihc:user-web:last-login-phone") || "";
const lastSessionPhone = getUserAuthSession()?.user.phone || lastStoredPhone;
export const lastLoginPhone = ref(lastSessionPhone);

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
