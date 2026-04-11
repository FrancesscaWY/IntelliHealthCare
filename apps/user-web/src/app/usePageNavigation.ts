import { computed, ref } from "vue";
import { normalizePageId, resolveInitialPage } from "@ihc/page-core/runtime";
import type { NavigationApi, PageEntry } from "@ihc/page-core/types";

interface UsePageNavigationOptions {
  manifest: PageEntry[];
  preferredPageId: string;
  pathname: string;
  fallbackPageId: string;
}

export function usePageNavigation(options: UsePageNavigationOptions) {
  const { manifest, preferredPageId, pathname, fallbackPageId } = options;
  const initialPageId = resolveInitialPage(manifest, preferredPageId, pathname, fallbackPageId);
  const stack = ref<string[]>(initialPageId ? [initialPageId] : []);

  const hasPage = (pageId: string) => {
    const normalizedPageId = normalizePageId(pageId);
    return manifest.some((entry) => entry.id === normalizedPageId);
  };

  const getPageEntry = (pageId: string) => {
    const normalizedPageId = normalizePageId(pageId);
    return manifest.find((entry) => entry.id === normalizedPageId);
  };

  const setStack = (nextStack: string[]) => {
    const validStack = nextStack.map((pageId) => normalizePageId(pageId)).filter((pageId) => hasPage(pageId));
    stack.value = validStack.length > 0 ? validStack : initialPageId ? [initialPageId] : [];
  };

  const navigate = (pageId: string) => {
    const normalizedPageId = normalizePageId(pageId);
    if (!getPageEntry(normalizedPageId)) {
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
      const normalizedPageId = normalizePageId(pageId);
      if (!getPageEntry(normalizedPageId)) {
        return;
      }

      const nextStack = stack.value.length > 0 ? [...stack.value.slice(0, -1), normalizedPageId] : [normalizedPageId];
      setStack(nextStack);
    },
    reLaunch(pageId) {
      const normalizedPageId = normalizePageId(pageId);
      if (!getPageEntry(normalizedPageId)) {
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

  return {
    stack,
    activePage,
    navigate,
    navigation,
  };
}
