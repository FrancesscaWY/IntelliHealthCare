import { computed, ref, watch } from "vue";
import { normalizePageId, resolveInitialPage } from "@ihc/page-core/runtime";
import type { NavigationApi, PageEntry } from "@ihc/page-core/types";
import { currentUserAuthSession, hasUserAuthSession } from "@/shared/auth/session";
import {
  LOGIN_PAGE_ID,
  isPublicPageId,
  rememberPostLoginPageId,
  requiresUserAuth
} from "@/shared/auth/navigation";
import {
  loadLastAuthenticatedPageId,
  saveLastAuthenticatedPageId
} from "@/shared/auth/page-session";

interface UsePageNavigationOptions {
  manifest: PageEntry[];
  preferredPageId: string;
  pathname: string;
  fallbackPageId: string;
}

export function usePageNavigation(options: UsePageNavigationOptions) {
  const { manifest, preferredPageId, pathname, fallbackPageId } = options;

  const hasPage = (pageId: string) => {
    const normalizedPageId = normalizePageId(pageId);
    return manifest.some((entry) => entry.id === normalizedPageId);
  };

  const getPageEntry = (pageId: string) => {
    const normalizedPageId = normalizePageId(pageId);
    return manifest.find((entry) => entry.id === normalizedPageId);
  };

  const resolveAccessiblePageId = (pageId: string, rememberRedirect = false) => {
    const normalizedPageId = normalizePageId(pageId);

    if (!normalizedPageId || !hasPage(normalizedPageId)) {
      return "";
    }

    if (!requiresUserAuth(normalizedPageId) || hasUserAuthSession()) {
      return normalizedPageId;
    }

    if (rememberRedirect) {
      rememberPostLoginPageId(normalizedPageId);
    }

    return hasPage(LOGIN_PAGE_ID) ? LOGIN_PAGE_ID : normalizedPageId;
  };

  const resolvedInitialPageId = resolveInitialPage(
    manifest,
    preferredPageId,
    pathname,
    fallbackPageId
  );
  const lastAuthenticatedPageId = loadLastAuthenticatedPageId();
  const preferredInitialPageId =
    hasUserAuthSession() &&
    lastAuthenticatedPageId &&
    (!resolvedInitialPageId || isPublicPageId(resolvedInitialPageId))
      ? lastAuthenticatedPageId
      : resolvedInitialPageId;
  const initialPageId = resolveAccessiblePageId(preferredInitialPageId, true);
  const stack = ref<string[]>(initialPageId ? [initialPageId] : []);

  const setStack = (nextStack: string[]) => {
    const validStack = nextStack.map((pageId) => normalizePageId(pageId)).filter((pageId) => hasPage(pageId));
    stack.value = validStack.length > 0 ? validStack : initialPageId ? [initialPageId] : [];
  };

  const navigate = (pageId: string) => {
    const normalizedPageId = resolveAccessiblePageId(pageId, true);
    if (!normalizedPageId || !getPageEntry(normalizedPageId)) {
      return false;
    }

    setStack([...stack.value, normalizedPageId]);
    return true;
  };

  const activePage = computed(() => getPageEntry(stack.value[stack.value.length - 1] || "") || manifest[0]);

  const navigation: NavigationApi = {
    navigateTo(pageId) {
      navigate(pageId);
    },
    redirectTo(pageId) {
      const normalizedPageId = resolveAccessiblePageId(pageId, true);
      if (!normalizedPageId || !getPageEntry(normalizedPageId)) {
        return;
      }

      const nextStack = stack.value.length > 0 ? [...stack.value.slice(0, -1), normalizedPageId] : [normalizedPageId];
      setStack(nextStack);
    },
    reLaunch(pageId) {
      const normalizedPageId = resolveAccessiblePageId(pageId, true);
      if (!normalizedPageId || !getPageEntry(normalizedPageId)) {
        return;
      }

      setStack([normalizedPageId]);
    },
    navigateBack() {
      if (stack.value.length <= 1) {
        return false;
      }

      setStack(stack.value.slice(0, -1));
      return true;
    },
    canGoBack() {
      return stack.value.length > 1;
    },
    getStack() {
      return [...stack.value];
    },
  };

  watch(
    activePage,
    (pageEntry) => {
      const currentPageId = pageEntry?.id || "";

      if (!hasUserAuthSession() || !requiresUserAuth(currentPageId)) {
        return;
      }

      saveLastAuthenticatedPageId(currentPageId);
    },
    { immediate: true, flush: "sync" }
  );

  watch(
    currentUserAuthSession,
    (session) => {
      if (session?.accessToken) {
        return;
      }

      const currentPageId = activePage.value?.id || "";
      if (!requiresUserAuth(currentPageId)) {
        return;
      }

      rememberPostLoginPageId(currentPageId);
      setStack([LOGIN_PAGE_ID]);
    },
    { flush: "sync" }
  );

  return {
    stack,
    activePage,
    navigate,
    navigation,
  };
}
