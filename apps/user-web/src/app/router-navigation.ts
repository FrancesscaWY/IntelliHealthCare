import { normalizePageId } from "@ihc/page-core/runtime";
import type { NavigationApi } from "@ihc/page-core/types";
import { useRouter } from "vue-router";
import { getPageEntryById } from "./page-manifest";

const visitedPageIdsByPosition: string[] = [];

function getCurrentHistoryPosition() {
  if (typeof window === "undefined") {
    return 0;
  }

  return typeof window.history.state?.position === "number"
    ? window.history.state.position
    : 0;
}

function canUseRouterBack() {
  return typeof window !== "undefined" && Boolean(window.history.state?.back);
}

export function recordVisitedPage(pageId: string) {
  const normalizedPageId = normalizePageId(pageId);

  if (!normalizedPageId) {
    return;
  }

  visitedPageIdsByPosition[getCurrentHistoryPosition()] = normalizedPageId;
}

export function getVisitedPageStack() {
  return visitedPageIdsByPosition
    .slice(0, getCurrentHistoryPosition() + 1)
    .filter((pageId): pageId is string => Boolean(pageId));
}

export function usePageRouterNavigation(): NavigationApi {
  const router = useRouter();

  const resolvePageLocation = (pageId: string) => {
    const pageEntry = getPageEntryById(pageId);
    return pageEntry ? { name: pageEntry.id } : null;
  };

  const pushToPage = (pageId: string, replace = false) => {
    const targetLocation = resolvePageLocation(pageId);
    if (!targetLocation) {
      return false;
    }

    const navigationTask = replace
      ? router.replace(targetLocation)
      : router.push(targetLocation);

    void navigationTask.catch(() => undefined);
    return true;
  };

  return {
    navigateTo(pageId) {
      pushToPage(pageId);
    },
    redirectTo(pageId) {
      pushToPage(pageId, true);
    },
    reLaunch(pageId) {
      pushToPage(pageId, true);
    },
    navigateBack() {
      if (!canUseRouterBack()) {
        return false;
      }

      router.back();
      return true;
    },
    canGoBack() {
      return canUseRouterBack();
    },
    getStack() {
      return getVisitedPageStack();
    },
  };
}
