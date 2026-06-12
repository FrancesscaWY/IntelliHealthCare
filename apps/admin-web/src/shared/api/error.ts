import type { NavigationApi } from "@ihc/page-core/types";
import { LOGIN_PAGE_ID } from "@/shared/auth/navigation";
import { clearAdminAuthSession } from "@/shared/auth/session";

export function getApiErrorStatus(error: unknown) {
  if (!error || typeof error !== "object" || !("status" in error)) {
    return 0;
  }

  return Number(error.status) || 0;
}

export function getApiErrorMessage(error: unknown, fallbackMessage: string) {
  return error instanceof Error ? error.message : fallbackMessage;
}

export function handleAdminPageError(
  error: unknown,
  options: {
    navigation: NavigationApi;
    showToast: (message: string) => void;
    fallbackMessage: string;
  }
) {
  const { navigation, showToast, fallbackMessage } = options;
  const status = getApiErrorStatus(error);
  const message = getApiErrorMessage(error, fallbackMessage);

  if (status === 401 || status === 403) {
    clearAdminAuthSession();
    showToast(message || "后台鉴权失败，请重新登录");
    navigation.reLaunch(LOGIN_PAGE_ID);
    return true;
  }

  showToast(message);
  return false;
}
