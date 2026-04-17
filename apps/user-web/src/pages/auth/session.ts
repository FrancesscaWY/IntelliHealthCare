import { ref } from "vue";

export const lastLoginPhone = ref("");

export function setLastLoginPhone(phone: string) {
  lastLoginPhone.value = phone.trim();
}
