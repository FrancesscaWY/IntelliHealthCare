import { watch } from "vue";
import { normalizePageId } from "@ihc/page-core/runtime";
import type { PageEntry } from "@ihc/page-core/types";
import {
  createRouter,
  createWebHashHistory,
  createWebHistory,
  type RouteLocationNormalized,
  type RouteRecordRaw,
} from "vue-router";
import PageHost from "./PageHost.vue";
import { getPageEntryById, getPageEntryByRoutePath, resolveRoutePathByPageId, userPageManifest } from "./page-manifest";
import { recordVisitedPage } from "./router-navigation";
import { projectInfo } from "@/shared/project-info";
import { getCurrentUser } from "@/shared/api/auth";
import {
  DEFAULT_AUTHENTICATED_PAGE_ID,
  LOGIN_PAGE_ID,
  REAL_NAME_PAGE_ID,
  rememberPostLoginPageId,
  requiresUserAuth,
} from "@/shared/auth/navigation";
import {
  currentUserAuthSession,
  getUserAuthSession,
  hasUserAuthSession,
  updateUserAuthSessionRealNameVerified,
} from "@/shared/auth/session";

declare module "vue-router" {
  interface RouteMeta {
    pageId?: string;
    pageEntry?: PageEntry;
    requiresAuth?: boolean;
  }
}

function resolveDefaultPageId() {
  if (!hasUserAuthSession()) {
    return projectInfo.homePageId;
  }

  if (getUserAuthSession()?.user.realNameVerified === false) {
    return REAL_NAME_PAGE_ID;
  }

  return DEFAULT_AUTHENTICATED_PAGE_ID;
}

function stripLegacyPreviewQuery(
  query: RouteLocationNormalized["query"],
) {
  const nextQuery = { ...query };
  delete nextQuery.mode;
  delete nextQuery.page;
  delete nextQuery.pageId;
  return nextQuery;
}

function resolvePageIdFromRoute(route: RouteLocationNormalized) {
  const routeName = normalizePageId(typeof route.name === "string" ? route.name : "");
  if (routeName && getPageEntryById(routeName)) {
    return routeName;
  }

  return getPageEntryByRoutePath(route.path)?.id || "";
}

const routes: RouteRecordRaw[] = [
  {
    path: "/",
    name: "root",
    redirect: (to) => {
      const legacyPageId = normalizePageId(
        String(to.query.page || to.query.pageId || ""),
      );
      const targetPath = legacyPageId
        ? resolveRoutePathByPageId(legacyPageId)
        : resolveRoutePathByPageId(resolveDefaultPageId());

      return {
        path: targetPath || resolveRoutePathByPageId(projectInfo.homePageId) || "/onboarding/intro",
        query: stripLegacyPreviewQuery(to.query),
        hash: to.hash,
      };
    },
  },
  ...userPageManifest.map((entry) => ({
    path: entry.route,
    name: entry.id,
    component: PageHost,
    props: {
      pageId: entry.id,
    },
    meta: {
      pageId: entry.id,
      pageEntry: entry,
      requiresAuth: requiresUserAuth(entry.id),
    },
  })),
  {
    path: "/:pathMatch(.*)*",
    redirect: "/",
  },
];

function createAppHistory() {
  if (typeof window !== "undefined" && window.location.protocol === "file:") {
    return createWebHashHistory();
  }

  return createWebHistory();
}

const router = createRouter({
  history: createAppHistory(),
  routes,
  scrollBehavior() {
    return {
      left: 0,
      top: 0,
    };
  },
});

router.beforeEach((to) => {
  const pageId = resolvePageIdFromRoute(to);
  if (!pageId) {
    return true;
  }

  if (!requiresUserAuth(pageId) || hasUserAuthSession()) {
    return true;
  }

  rememberPostLoginPageId(pageId);

  if (to.name === LOGIN_PAGE_ID) {
    return true;
  }

  return {
    name: LOGIN_PAGE_ID,
    replace: true,
  };
});

router.afterEach((to) => {
  const pageEntry = getPageEntryById(resolvePageIdFromRoute(to));
  document.title = pageEntry
    ? `${pageEntry.title} - ${projectInfo.name}`
    : projectInfo.name;

  if (pageEntry) {
    recordVisitedPage(pageEntry.id);
  }
});

export function installAuthSessionRouteSync() {
  async function syncAuthenticatedRealNameRouteState() {
    if (!hasUserAuthSession()) {
      return;
    }

    try {
      const currentUser = await getCurrentUser();
      const currentPageId = resolvePageIdFromRoute(router.currentRoute.value);
      updateUserAuthSessionRealNameVerified(currentUser.realNameVerified);

      if (!currentUser.realNameVerified) {
        if (currentPageId && currentPageId !== REAL_NAME_PAGE_ID && requiresUserAuth(currentPageId)) {
          rememberPostLoginPageId(currentPageId);
          await router.replace({ name: REAL_NAME_PAGE_ID });
        }

        return;
      }

      if (currentPageId === REAL_NAME_PAGE_ID) {
        await router.replace({ name: DEFAULT_AUTHENTICATED_PAGE_ID });
      }
    } catch {
      // Keep the current route when user profile sync is temporarily unavailable.
    }
  }

  watch(
    currentUserAuthSession,
    (session) => {
      if (session?.accessToken) {
        void syncAuthenticatedRealNameRouteState();
        return;
      }

      const currentPageId = resolvePageIdFromRoute(router.currentRoute.value);
      if (!currentPageId || !requiresUserAuth(currentPageId)) {
        return;
      }

      rememberPostLoginPageId(currentPageId);
      void router.replace({ name: LOGIN_PAGE_ID }).catch(() => undefined);
    },
    { flush: "sync" },
  );

  if (hasUserAuthSession()) {
    void syncAuthenticatedRealNameRouteState();
  }
}

export default router;
