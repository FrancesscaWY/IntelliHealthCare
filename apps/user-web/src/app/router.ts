import { watch } from "vue";
import { normalizePageId } from "@ihc/page-core/runtime";
import type { PageEntry } from "@ihc/page-core/types";
import {
  createRouter,
  createWebHistory,
  type RouteLocationNormalized,
  type RouteRecordRaw,
} from "vue-router";
import PageHost from "./PageHost.vue";
import { getPageEntryById, getPageEntryByRoutePath, resolveRoutePathByPageId, userPageManifest } from "./page-manifest";
import { recordVisitedPage } from "./router-navigation";
import { projectInfo } from "@/shared/project-info";
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
} from "@/shared/auth/session";

declare module "vue-router" {
  interface RouteMeta {
    pageId?: string;
    pageEntry?: PageEntry;
    requiresAuth?: boolean;
  }
}

function isRealNameVerified() {
  return Boolean(getUserAuthSession()?.user.realName);
}

function resolveDefaultPageId() {
  if (!hasUserAuthSession()) {
    return projectInfo.homePageId;
  }

  return isRealNameVerified() ? DEFAULT_AUTHENTICATED_PAGE_ID : REAL_NAME_PAGE_ID;
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

const router = createRouter({
  history: createWebHistory(),
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
  watch(
    currentUserAuthSession,
    (session) => {
      if (session?.accessToken) {
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
}

export default router;
