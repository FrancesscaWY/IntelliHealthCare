<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from "vue";
import type { Component } from "vue";
import {
  ApplicationMenu,
  ChartHistogram,
  EveryUser,
  Home,
  MessageOne,
  Search,
  SettingTwo,
  TransactionOrder,
} from "@icon-park/vue-next";
import type { PageEntry } from "@ihc/page-core/types";
import manifestEntries from "./pages.manifest.json";
import { loadPageComponent, preloadPageComponents } from "./page-registry";
import { resolveConfig } from "./resolve-config";
import { usePageNavigation } from "./usePageNavigation";
import { useToastQueue } from "./useToastQueue";
import { pageMeta, projectInfo } from "@/shared/project-info";
import {
  clearPostLoginPageId
} from "@/shared/auth/navigation";
import {
  clearAdminAuthSession
} from "@/shared/auth/session";
import { currentAdminAvatarUrl, currentAdminDisplayName } from "@/shared/current-admin-user";
import AdminUserAvatar from "@/components/AdminUserAvatar.vue";
import PagePlaceholder from "@/components/PagePlaceholder.vue";
import ToastViewport from "@/components/ToastViewport.vue";

const manifest = manifestEntries as PageEntry[];
const config = resolveConfig();
const { activePage, navigation } = usePageNavigation({
  manifest,
  preferredPageId: config.preferredPageId,
  pathname: config.mode === "page" ? window.location.pathname : "",
  fallbackPageId: projectInfo.homePageId,
});
const { items: toastItems, showToast } = useToastQueue();

  const activeComponent = shallowRef<Component | null>(null);
  const activeComponentPageId = shallowRef("");
  const loadError = shallowRef("");
  const isPageLoading = shallowRef(false);
const searchKeyword = ref("");
const isAccountMenuOpen = ref(false);
const isNotificationOpen = ref(false);
const sidebarCollapsedStorageKey = "ihc-admin-sidebar-collapsed";
const isSidebarCollapsed = ref(
  typeof window !== "undefined" ? window.localStorage.getItem(sidebarCollapsedStorageKey) === "1" : false,
);
const accountMenuRef = ref<HTMLElement | null>(null);
const notificationPanelRef = ref<HTMLElement | null>(null);

const notificationItems = [
  {
    id: "notice-1",
    title: "订单通知",
    summary: "您有一条新的订单，订单金额：4509元……",
    date: "2021-03-30",
    unread: true,
  },
  {
    id: "notice-2",
    title: "订单通知",
    summary: "您有一条新的订单，订单金额：4509元……",
    date: "2021-03-30",
    unread: true,
  },
  {
    id: "notice-3",
    title: "订单通知",
    summary: "您有一条新的订单，订单金额：4509元……",
    date: "2021-03-30",
    unread: true,
  },
  {
    id: "notice-4",
    title: "订单通知",
    summary: "您有一条新的订单，订单金额：4509元……",
    date: "2021-03-30",
    unread: true,
  },
  {
    id: "notice-5",
    title: "订单通知",
    summary: "您有一条新的订单，订单金额：4509元……",
    date: "2021-03-30",
    unread: true,
  },
];

type PrimaryNavKey = "home" | "users" | "services" | "transactions" | "analytics" | "system" | "messages";
type SecondaryNavItem = {
  key: string;
  label: string;
  kind: "section" | "item";
  active?: boolean;
  pageId?: string;
  toast?: string;
};

const isAuthPage = computed(() => activePage.value?.group === "auth");
const activePageId = computed(() => activePage.value?.id || "");
const shellModeClass = computed(() => (isAuthPage.value ? "admin-shell--auth" : `admin-shell--${config.mode}`));

const resolvedComponent = computed(() => {
  if (!activePage.value || activeComponentPageId.value !== activePage.value.id) {
    return null;
  }

  return activeComponent.value;
});

const isShowPageLoading = computed(() => {
  if (!activePage.value) return false;
  return isPageLoading.value && activeComponentPageId.value !== activePage.value.id;
});

const railItems: Array<{ key: PrimaryNavKey; label: string; pageId: string; icon: Component }> = [
  { key: "home", label: "首页", pageId: "dashboard/overview", icon: Home },
  { key: "analytics", label: "数据分析", pageId: "analytics/data-board", icon: ChartHistogram },
  { key: "users", label: "用户管理", pageId: "elder/member-list", icon: EveryUser },
  { key: "services", label: "服务管理", pageId: "service/staff-management", icon: ApplicationMenu },
  { key: "transactions", label: "交易管理", pageId: "dashboard/order-list", icon: TransactionOrder },
  { key: "system", label: "系统设置", pageId: "system/account-settings", icon: SettingTwo },
  { key: "messages", label: "消息管理", pageId: "dashboard/session", icon: MessageOne },
];

function isPageActive(...pageIds: string[]) {
  return pageIds.includes(activePageId.value);
}

function resolvePrimaryNavKey(pageEntry?: PageEntry | null): PrimaryNavKey {
  const pageId = pageEntry?.id || "";

  if (pageId.startsWith("elder/")) {
    return "users";
  }

  if (
    [
      "service/staff-management",
      "service/review-management",
      "service/review-detail",
      "service/product-management",
      "service/product-editor",
    ].includes(pageId)
  ) {
    return "services";
  }

  if (
    [
      "dashboard/order-list",
      "dashboard/order-detail",
      "dashboard/work-order",
      "dashboard/after-sale",
      "dashboard/after-sale-detail",
      "dashboard/comment-management",
    ].includes(pageId)
  ) {
    return "transactions";
  }

  if (
    pageId.startsWith("analytics/") ||
    pageId.startsWith("health/") ||
    pageId.startsWith("device/") ||
    pageId.startsWith("staff/")
  ) {
    return "analytics";
  }

  if (pageId.startsWith("system/")) {
    return "system";
  }

  if (pageId.startsWith("content/") || pageId.startsWith("community/") || pageId === "dashboard/session") {
    return "messages";
  }

  return "home";
}

const activePrimaryNavKey = computed(() => resolvePrimaryNavKey(activePage.value));

const secondaryNavItems = computed<SecondaryNavItem[]>(() => {
  if (activePrimaryNavKey.value === "home") {
    return [
      { key: "home-section", label: "工作台", kind: "section" },
      { key: "overview", label: "首页总览", active: isPageActive("dashboard/overview"), pageId: "dashboard/overview", kind: "item" },
      { key: "booking", label: "预约看板", active: isPageActive("dashboard/booking-board"), pageId: "dashboard/booking-board", kind: "item" },
    ];
  }

  if (activePrimaryNavKey.value === "users") {
    return [
      { key: "users-section", label: "用户中心", kind: "section" },
      { key: "member-list", label: "用户列表", active: isPageActive("elder/member-list"), pageId: "elder/member-list", kind: "item" },
      { key: "report-management", label: "报告管理", active: isPageActive("elder/report-management"), pageId: "elder/report-management", kind: "item" },
    ];
  }

  if (activePrimaryNavKey.value === "services") {
    return [
      { key: "service-team", label: "服务团队", kind: "section" },
      {
        key: "staff-management",
        label: "服务人员",
        active: isPageActive("service/staff-management"),
        pageId: "service/staff-management",
        kind: "item",
      },
      {
        key: "service-review",
        label: "审核管理",
        active: isPageActive("service/review-management", "service/review-detail"),
        pageId: "service/review-management",
        kind: "item",
      },
      { key: "service-product", label: "商品管理", active: isPageActive("service/product-management"), pageId: "service/product-management", kind: "item" },
      { key: "service-editor", label: "新增服务", active: isPageActive("service/product-editor"), pageId: "service/product-editor", kind: "item" },
    ];
  }

  if (activePrimaryNavKey.value === "transactions") {
    return [
      { key: "transaction-section", label: "交易中心", kind: "section" },
      {
        key: "order-list",
        label: "全部订单",
        active: isPageActive("dashboard/order-list", "dashboard/order-detail"),
        pageId: "dashboard/order-list",
        kind: "item",
      },
      { key: "work-order", label: "工单管理", active: isPageActive("dashboard/work-order"), pageId: "dashboard/work-order", kind: "item" },
      {
        key: "after-sale",
        label: "售后管理",
        active: isPageActive("dashboard/after-sale", "dashboard/after-sale-detail"),
        pageId: "dashboard/after-sale",
        kind: "item",
      },
      {
        key: "comment-management",
        label: "评价管理",
        active: isPageActive("dashboard/comment-management"),
        pageId: "dashboard/comment-management",
        kind: "item",
      },
    ];
  }

  if (activePrimaryNavKey.value === "analytics") {
    return [
      { key: "analytics-user", label: "用户分析", kind: "section" },
      { key: "data-board", label: "用户概况", active: isPageActive("analytics/data-board"), pageId: "analytics/data-board", kind: "item" },
      { key: "age-analysis", label: "用户年龄分析", active: isPageActive("analytics/user-age"), pageId: "analytics/user-age", kind: "item" },
      { key: "gender-analysis", label: "用户性别分析", active: isPageActive("analytics/user-gender"), pageId: "analytics/user-gender", kind: "item" },
      { key: "social-analysis", label: "用户社交统计", active: isPageActive("analytics/user-social"), pageId: "analytics/user-social", kind: "item" },
      { key: "analytics-transaction", label: "交易分析", kind: "section" },
      { key: "trade-overview", label: "交易概况", active: isPageActive("analytics/trade-overview"), pageId: "analytics/trade-overview", kind: "item" },
      { key: "product-analysis", label: "产品分析", active: isPageActive("analytics/product-analysis"), pageId: "analytics/product-analysis", kind: "item" },
      { key: "analytics-service", label: "服务分析", kind: "section" },
      { key: "workorder-analysis", label: "工单分析", active: isPageActive("analytics/service-workorder"), pageId: "analytics/service-workorder", kind: "item" },
      { key: "repurchase-analysis", label: "复购分析", active: isPageActive("analytics/service-repurchase"), pageId: "analytics/service-repurchase", kind: "item" },
      { key: "performance-analysis", label: "业绩统计", active: isPageActive("analytics/service-performance"), pageId: "analytics/service-performance", kind: "item" },
      { key: "review-analysis", label: "评价统计", active: isPageActive("analytics/service-review"), pageId: "analytics/service-review", kind: "item" },
    ];
  }

  if (activePrimaryNavKey.value === "system") {
    return [
      { key: "system-section", label: "系统配置", kind: "section" },
      { key: "account-settings", label: "账号设置", active: isPageActive("system/account-settings"), pageId: "system/account-settings", kind: "item" },
      { key: "reset-password", label: "重置密码", active: isPageActive("system/reset-password"), pageId: "system/reset-password", kind: "item" },
      { key: "institution", label: "机构管理", active: isPageActive("system/institution-management"), pageId: "system/institution-management", kind: "item" },
      { key: "role", label: "角色管理", active: isPageActive("system/role-management"), pageId: "system/role-management", kind: "item" },
      { key: "log", label: "操作日志", toast: "操作日志原型页暂未接入。", kind: "item" },
    ];
  }

  return [
    { key: "message-section", label: "消息中心", kind: "section" },
    { key: "session", label: "会话中心", active: isPageActive("dashboard/session"), pageId: "dashboard/session", kind: "item" },
    {
      key: "mass-message",
      label: "群发消息",
      active: isPageActive("content/mass-message", "content/mass-message-create"),
      pageId: "content/mass-message",
      kind: "item",
    },
  ];
});

const currentGroupTitle = computed(() => {
  if (activePrimaryNavKey.value === "analytics") {
    return "数据";
  }

  return railItems.find((item) => item.key === activePrimaryNavKey.value)?.label || pageMeta[activePageId.value]?.title || "首页";
});

watch(
  activePage,
  async (pageEntry) => {
    const currentPageId = pageEntry?.id || "";
    loadError.value = "";

    if (!pageEntry) {
      activeComponent.value = null;
      activeComponentPageId.value = "";
      return;
    }

    const cachedComponent = activeComponent.value;
    const cachedPageId = activeComponentPageId.value;

    // 如果是新页面且没有缓存，先清空旧组件以避免显示旧页面内容
    if (cachedPageId !== currentPageId) {
      activeComponent.value = null;
      activeComponentPageId.value = "";
    }

    isPageLoading.value = true;

    try {
      const component = await loadPageComponent(pageEntry.id);
      if (activePage.value?.id !== currentPageId) {
        return;
      }

      activeComponent.value = component;
      activeComponentPageId.value = component ? currentPageId : "";
    } catch (error) {
      if (activePage.value?.id !== currentPageId) {
        return;
      }

      loadError.value = error instanceof Error ? error.message : "页面组件加载失败，请检查 Vue 文件语法。";
      activeComponent.value = null;
      activeComponentPageId.value = "";
    } finally {
      isPageLoading.value = false;
    }
  },
  { immediate: true, flush: "sync" },
);

watch(
  activePage,
  (pageEntry) => {
    const pageTitle = pageEntry ? pageMeta[pageEntry.id]?.title || pageEntry.title : projectInfo.name;
    document.title = `${pageTitle} - ${projectInfo.name}`;
  },
  { immediate: true },
);

watch(isSidebarCollapsed, (collapsed) => {
  window.localStorage.setItem(sidebarCollapsedStorageKey, collapsed ? "1" : "0");
});

const pageProps = computed(() => {
  if (!activePage.value) {
    return null;
  }

  return {
    pageEntry: activePage.value,
    mode: config.mode,
    manifest,
    navigation,
    showToast,
  };
});

function openPage(pageId: string) {
  if (!pageId) {
    return;
  }

  isAccountMenuOpen.value = false;
  isNotificationOpen.value = false;
  navigation.reLaunch(pageId);
}

function openSecondaryItem(item: { pageId?: string; toast?: string }) {
  if (item.pageId) {
    openPage(item.pageId);
    return;
  }

  if (item.toast) {
    showToast(item.toast);
  }
}

function toggleSidebar() {
  isSidebarCollapsed.value = !isSidebarCollapsed.value;
}

function submitSearch() {
  const keyword = searchKeyword.value.trim();
  showToast(keyword ? `已搜索：${keyword}` : "请输入关键词后再搜索。");
}

function shouldToggleAccountMenu(label: string) {
  return label === "账号菜单";
}

function notifyAction(label: string) {
  if (shouldToggleAccountMenu(label)) {
    toggleAccountMenu();
    return;
  }

  if (label === "消息") {
    toggleNotificationPanel();
    return;
  }

  if (label === "客服") {
    openPage("dashboard/session");
    return;
  }

  showToast(`${label}入口为演示状态。`);
}
function getRailItemOrder(key: PrimaryNavKey) {
  if (key === "messages") {
    return 1;
  }

  if (key === "system") {
    return 2;
  }

  return 0;
}

function toggleAccountMenu() {
  isNotificationOpen.value = false;
  isAccountMenuOpen.value = !isAccountMenuOpen.value;
}

function toggleNotificationPanel() {
  isAccountMenuOpen.value = false;
  isNotificationOpen.value = !isNotificationOpen.value;
}

function closeNotificationPanel() {
  isNotificationOpen.value = false;
}

function handleAccountMenuSelect(action: "profile" | "password" | "logout") {
  if (action === "profile") {
    openPage("system/account-settings");
    return;
  }

  if (action === "password") {
    openPage("system/reset-password");
    return;
  }

  clearAdminAuthSession();
  clearPostLoginPageId();
  openPage("auth/login");
}

function handleDocumentClick(event: MouseEvent) {
  const target = event.target;
  if (
    target instanceof Element &&
    (target.closest(".account") ||
      target.closest(".account-menu__panel") ||
      target.closest(".topbar__icon--notice") ||
      target.closest(".notification-panel"))
  ) {
    return;
  }

  if (!(target instanceof Node)) {
    return;
  }

  if (!accountMenuRef.value?.contains(target)) {
    isAccountMenuOpen.value = false;
  }

  if (!notificationPanelRef.value?.contains(target)) {
    isNotificationOpen.value = false;
  }
}

onMounted(() => {
  document.addEventListener("click", handleDocumentClick);
});

onBeforeUnmount(() => {
  document.removeEventListener("click", handleDocumentClick);
});
</script>

<template>
  <main
    class="admin-shell"
    :class="[
      shellModeClass,
      {
        'admin-shell--sidebar-collapsed': !isAuthPage && config.mode === 'app' && isSidebarCollapsed,
      },
    ]"
  >
    <template v-if="isAuthPage">
      <section class="auth-stage">
        <div class="auth-stage__content">
          <component v-if="resolvedComponent && pageProps" :is="resolvedComponent" :key="activePage?.id" v-bind="pageProps" />
          <PagePlaceholder v-else-if="activePage" :page-entry="activePage" :error-message="loadError || undefined" />
          <section v-else class="empty-state">当前没有可加载的页面，请检查页面清单配置。</section>
        </div>
      </section>
    </template>

    <template v-else>
      <aside v-if="config.mode === 'app'" class="rail">
        <div class="rail__header">
          <button
            class="rail__collapse rail__collapse--leading"
            type="button"
            :aria-label="isSidebarCollapsed ? '展开左侧导航' : '收起左侧导航'"
            :title="isSidebarCollapsed ? '展开左侧导航' : '收起左侧导航'"
            @click="toggleSidebar"
          >
            <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
              <path d="M4 6h16M4 12h16M4 18h16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
            </svg>
          </button>

          <button class="rail__brand" type="button" aria-label="返回首页" @click="openPage('dashboard/overview')">
            <span class="rail__brand-main">
              <span class="rail__brand-mark">智诊康养</span>
              <span class="rail__logo" aria-hidden="true">
                <svg viewBox="0 0 48 48" focusable="false">
                  <path
                    d="M24 39.5 10.7 26.4c-3.3-3.3-5.3-6.4-5.3-10.7 0-5.7 4.5-10.2 10.1-10.2 3.4 0 6.1 1.6 8.5 4.8 2.4-3.2 5.1-4.8 8.5-4.8 5.6 0 10.1 4.5 10.1 10.2 0 4.3-2 7.4-5.3 10.7L24 39.5Z"
                  />
                  <path d="M24 14.6v10.5" fill="none" stroke="#111432" stroke-linecap="round" stroke-width="3.5" />
                  <path d="M18.7 19.85h10.6" fill="none" stroke="#111432" stroke-linecap="round" stroke-width="3.5" />
                </svg>
              </span>
            </span>
            <small>IntelliHealthCare</small>
          </button>
        </div>

        <nav class="rail__nav" aria-label="主导航">
          <button
            v-for="item in railItems"
            :key="item.key"
            class="rail__item"
            :class="{ 'rail__item--active': item.key === activePrimaryNavKey }"
            type="button"
            :aria-label="item.label"
            :style="{ order: getRailItemOrder(item.key) }"
            @click="openPage(item.pageId)"
          >
            <span class="rail__item-icon">
              <component :is="item.icon" theme="outline" :size="22" :stroke-width="3" />
            </span>
            <span class="rail__item-label">{{ item.label }}</span>
          </button>
        </nav>
      </aside>

      <aside v-if="config.mode === 'app'" class="subnav" :aria-hidden="isSidebarCollapsed">
        <header class="subnav__header">
          <strong>{{ currentGroupTitle }}</strong>
        </header>

        <nav class="subnav__list" aria-label="二级导航">
          <template v-for="item in secondaryNavItems" :key="item.key">
            <div v-if="item.kind === 'section'" class="subnav__section">
              {{ item.label }}
            </div>
            <button
              v-else
              class="subnav__item"
              :class="{ 'subnav__item--active': item.active }"
              type="button"
              @click="openSecondaryItem(item)"
            >
              {{ item.label }}
            </button>
          </template>
        </nav>
      </aside>

      <section class="main">
        <header class="topbar">
          <div class="topbar__search">
            <button class="topbar__search-icon" type="button" aria-label="搜索" @click="submitSearch">
              <Search theme="outline" :size="24" :stroke-width="3" />
            </button>
            <input v-model="searchKeyword" type="text" placeholder="请输入关键词" @keydown.enter="submitSearch" />
          </div>

          <div class="topbar__actions">
            <button class="topbar__icon" type="button" aria-label="客服" @click="notifyAction('客服')">
              <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
                <path d="M5 12a7 7 0 1 1 14 0v4a2 2 0 0 1-2 2h-2v-6h4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                <path d="M5 18H3a2 2 0 0 1-2-2v-4h4v6Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" />
              </svg>
            </button>

            <button class="topbar__icon topbar__icon--badge topbar__icon--notice" type="button" aria-label="消息" @click="notifyAction('消息')">
              <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
                <path d="M12 4a5 5 0 0 1 5 5v2.7c0 .8.2 1.6.7 2.3l1 1.5H5.3l1-1.5c.5-.7.7-1.5.7-2.3V9a5 5 0 0 1 5-5Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" />
                <path d="M9.5 18a2.5 2.5 0 0 0 5 0" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
              </svg>
            </button>

            <button class="account" type="button" @click="notifyAction('账号菜单')">
              <AdminUserAvatar :src="currentAdminAvatarUrl" :name="currentAdminDisplayName" :size="40" />
              <span class="account__name">{{ currentAdminDisplayName }}</span>
              <span class="account__caret">▼</span>
            </button>
            <div v-if="isAccountMenuOpen" ref="accountMenuRef" class="account-menu__panel" role="menu">
              <button class="account-menu__item" type="button" role="menuitem" @click="handleAccountMenuSelect('profile')">
                个人资料
              </button>
              <button class="account-menu__item" type="button" role="menuitem" @click="handleAccountMenuSelect('password')">
                修改密码
              </button>
              <button class="account-menu__item" type="button" role="menuitem" @click="handleAccountMenuSelect('logout')">
                退出系统
              </button>
            </div>
          </div>
        </header>

        <section class="admin-content">
          <div v-if="isShowPageLoading" class="page-loading">
            <div class="page-loading__spinner"></div>
            <p>页面加载中...</p>
          </div>
          <component v-if="resolvedComponent && pageProps" :is="resolvedComponent" :key="activePage?.id" v-bind="pageProps" />
          <PagePlaceholder v-else-if="activePage && !isShowPageLoading" :page-entry="activePage" :error-message="loadError || undefined" />
          <section v-else class="empty-state">当前没有可加载的页面，请检查页面清单配置。</section>
        </section>
      </section>

      <div v-if="isNotificationOpen" class="notification-mask" @click="closeNotificationPanel">
        <aside ref="notificationPanelRef" class="notification-panel" @click.stop>
          <header class="notification-panel__header">
            <strong>消息通知</strong>
            <button class="notification-panel__close" type="button" aria-label="关闭消息通知" @click="closeNotificationPanel">×</button>
          </header>

          <div class="notification-panel__list">
            <article v-for="item in notificationItems" :key="item.id" class="notification-card">
              <div class="notification-card__icon">
                <svg viewBox="0 0 48 48" focusable="false" aria-hidden="true">
                  <circle cx="24" cy="24" r="24" fill="currentColor" fill-opacity="0.16" />
                  <path d="M18 15.5h12a2.5 2.5 0 0 1 2.5 2.5v12A2.5 2.5 0 0 1 30 32.5H18a2.5 2.5 0 0 1-2.5-2.5V18a2.5 2.5 0 0 1 2.5-2.5Z" fill="none" stroke="currentColor" stroke-width="2" />
                  <path d="M20.5 21h7M20.5 25h7M20.5 29h4.5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="2" />
                </svg>
              </div>
              <div class="notification-card__body">
                <div class="notification-card__meta">
                  <strong>{{ item.title }}</strong>
                  <span>{{ item.date }}</span>
                </div>
                <p>{{ item.summary }}</p>
              </div>
              <span v-if="item.unread" class="notification-card__dot"></span>
            </article>
          </div>
        </aside>
      </div>
    </template>

    <ToastViewport :items="toastItems" />
  </main>
</template>

<style scoped>
.admin-shell {
  display: grid;
  width: 100%;
  min-width: 0;
  height: 100vh;
  height: 100svh;
  min-height: 100vh;
  min-height: 100svh;
  overflow: hidden;
}

.admin-shell--app {
  --rail-bg: #1e293b;
  --rail-bg-end: #0f172a;
  --rail-surface: rgba(255, 255, 255, 0.06);
  --rail-text: rgba(255, 255, 255, 0.72);
  --rail-muted: rgba(148, 163, 184, 0.65);
  --rail-accent: #5eead4;
  --rail-accent-strong: #2dd4bf;
  grid-template-columns: 180px 184px minmax(0, 1fr);
  background: #f8fafc;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
  font-weight: 400;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.admin-shell--app.admin-shell--sidebar-collapsed {
  grid-template-columns: 72px 0 minmax(0, 1fr);
}

.admin-shell--page,
.admin-shell--auth {
  grid-template-columns: minmax(0, 1fr);
}

.admin-shell--auth {
  display: block;
  width: 100%;
  min-width: 0;
  height: 100vh;
  height: 100svh;
  min-height: 100vh;
  min-height: 100svh;
  background: #ffffff;
  overflow: hidden;
}

.page-loading {
  display: grid;
  place-items: center;
  gap: 16px;
  padding: 60px 20px;
  color: var(--admin-muted);
  font-size: 14px;
}

.page-loading__spinner {
  width: 32px;
  height: 32px;
  border: 2px solid rgba(42, 157, 110, 0.15);
  border-top-color: var(--admin-brand);
  border-radius: 50%;
  animation: page-spin 0.8s linear infinite;
}

@keyframes page-spin {
  to { transform: rotate(360deg); }
}

.auth-stage {
  display: flex;
  justify-content: center;
  width: 100%;
  min-width: 0;
  height: 100%;
  min-height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  overscroll-behavior: contain;
}

.auth-stage__content {
  display: block;
  width: 100%;
  min-width: 0;
  min-height: 100%;
}

.rail {
  grid-column: 1;
  display: grid;
  grid-template-rows: auto 1fr;
  align-content: start;
  gap: 16px;
  padding: 14px 12px 16px;
  background: linear-gradient(180deg, var(--rail-bg) 0%, var(--rail-bg-end) 100%);
  overflow: hidden;
  transition:
    padding 0.2s ease,
    width 0.2s ease;
}

.rail__header {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.rail__brand {
  display: grid;
  flex: 1 1 auto;
  gap: 0;
  min-width: 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: #ffffff;
  text-align: left;
}

.rail__brand:hover {
  opacity: 0.96;
}

.rail__brand-main {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.rail__logo {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  border-radius: 7px;
  background: var(--rail-surface);
  color: #b7f2c9;
}

.rail__logo svg {
  width: 15px;
  height: 15px;
  fill: currentColor;
}

.rail__brand-mark {
  font-size: 15px;
  font-weight: 600;
  line-height: 1.3;
  letter-spacing: 0.02em;
}

.rail__brand small {
  color: var(--rail-muted);
  font-size: 9px;
  font-weight: 400;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.rail__collapse {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  padding: 0;
  border: 0;
  border-radius: 10px;
  background: var(--rail-surface);
  color: rgba(255, 255, 255, 0.82);
  transition:
    background-color 0.2s ease,
    color 0.2s ease,
    transform 0.2s ease;
}

.rail__collapse:hover {
  background: rgba(255, 255, 255, 0.12);
  color: #ffffff;
}

.rail__collapse svg {
  width: 18px;
  height: 18px;
}

.rail__nav {
  display: grid;
  align-content: start;
  gap: 6px;
  padding-top: 2px;
  width: 100%;
}

.rail__item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-height: 42px;
  padding: 0 12px;
  border: 1px solid transparent;
  border-radius: 12px;
  background: transparent;
  color: var(--rail-text);
  text-align: left;
  transition:
    background-color 0.2s ease,
    border-color 0.2s ease,
    color 0.2s ease,
    box-shadow 0.2s ease;
}

.rail__item:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.08);
}

.rail__item-icon {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 30px;
  height: 30px;
  border-radius: 10px;
  background: var(--rail-surface);
}

.rail__item-icon :deep(svg) {
  width: 18px;
  height: 18px;
}

.rail__item-label {
  font-size: 13px;
  font-weight: 400;
  letter-spacing: 0.01em;
}

.rail__item--active {
  border-color: rgba(255, 255, 255, 0.1);
  background: linear-gradient(135deg, var(--rail-accent) 0%, var(--rail-accent-strong) 100%);
  color: #ffffff;
  box-shadow: 0 16px 30px rgba(48, 200, 165, 0.26);
}

.rail__item--active .rail__item-icon {
  background: rgba(17, 20, 50, 0.14);
}

.subnav {
  grid-column: 2;
  display: grid;
  align-content: start;
  min-width: 0;
  min-height: 0;
  width: 100%;
  background: #ffffff;
  border-right: 1px solid #edf3ef;
  overflow-x: hidden;
  overflow-y: auto;
  transition:
    opacity 0.18s ease,
    transform 0.18s ease;
}

.subnav__header {
  display: flex;
  align-items: center;
  min-height: 50px;
  min-width: 0;
  padding: 0 18px;
  border-bottom: 1px solid #edf3ef;
  color: #2f3946;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.01em;
}

.subnav__list {
  display: grid;
  gap: 4px;
  min-width: 0;
  padding: 14px 12px 20px;
}

.subnav__section {
  margin-top: 12px;
  min-width: 0;
  padding: 8px 6px 10px;
  color: #2f3946;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.01em;
}

.subnav__section:first-child {
  margin-top: 0;
}

.subnav__item {
  width: 100%;
  min-height: 42px;
  min-width: 0;
  padding: 11px 14px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: #97a1ad;
  font-size: 12px;
  font-weight: 400;
  line-height: 1.3;
  letter-spacing: 0.01em;
  text-align: left;
  transition:
    background-color 0.2s ease,
    color 0.2s ease,
    box-shadow 0.2s ease;
}

.subnav__item:hover {
  background: #f3fbf8;
  color: #54616d;
}

.subnav__item--active {
  background: linear-gradient(135deg, #41d1a7 0%, #34c59a 100%);
  color: #ffffff;
  font-weight: 600;
  box-shadow: 0 10px 22px rgba(60, 201, 159, 0.18);
}

.admin-shell--sidebar-collapsed .rail {
  justify-items: center;
  gap: 10px;
  padding: 14px 8px;
}

.admin-shell--sidebar-collapsed .rail__header {
  justify-content: center;
}

.admin-shell--sidebar-collapsed .rail__brand {
  display: none;
}

.admin-shell--sidebar-collapsed .rail__collapse {
  width: 42px;
  transform: rotate(180deg);
}

.admin-shell--sidebar-collapsed .rail__nav {
  justify-items: center;
}

.admin-shell--sidebar-collapsed .rail__item {
  justify-content: center;
  width: 42px;
  min-height: 42px;
  padding: 0;
}

.admin-shell--sidebar-collapsed .rail__item-label {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

.admin-shell--sidebar-collapsed .rail__item-icon {
  width: 30px;
  height: 30px;
}

.admin-shell--sidebar-collapsed .subnav {
  visibility: hidden;
  overflow: hidden;
  opacity: 0;
  pointer-events: none;
}

.main {
  grid-column: 3;
  display: grid;
  grid-template-rows: 56px minmax(0, 1fr);
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 0 24px;
  background: #ffffff;
  border-bottom: 1px solid #edf3ef;
}

.topbar__search {
  display: flex;
  align-items: center;
  gap: 10px;
  width: min(520px, 100%);
}

.topbar__search-icon {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  padding: 0;
  border: 0;
  background: transparent;
  color: #8dd55f;
}

.topbar__search-icon svg {
  width: 22px;
  height: 22px;
}

.topbar__search input {
  width: 100%;
  height: 34px;
  padding: 0;
  border: 0;
  background: transparent;
  color: #2e3642;
  font-size: 13px;
  font-weight: 400;
  letter-spacing: 0.01em;
  outline: none;
}

.topbar__search input::placeholder {
  color: #c7ced6;
}

.topbar__actions {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
}

.topbar__icon {
  position: relative;
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 0;
  background: transparent;
  color: #2f3542;
}

.topbar__icon svg {
  width: 22px;
  height: 22px;
}

.topbar__icon--badge::after {
  content: "";
  position: absolute;
  top: 0;
  right: -2px;
  width: 10px;
  height: 10px;
  border: 2px solid #ffffff;
  border-radius: 50%;
  background: #ff7b75;
}

.account {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 0;
  border: 0;
  background: transparent;
  color: #253443;
  cursor: pointer;
}

.account__name {
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0;
}

.account__caret {
  color: #45505c;
  font-size: 11px;
}

.account-menu__panel {
  position: absolute;
  top: calc(100% + 12px);
  right: 0;
  min-width: 180px;
  padding: 10px 0;
  border: 1px solid #e9efea;
  border-radius: 16px;
  background: #ffffff;
  box-shadow: 0 18px 40px rgba(31, 46, 61, 0.14);
  z-index: 20;
}

.account-menu__item {
  display: block;
  width: 100%;
  padding: 14px 22px;
  border: 0;
  background: transparent;
  color: #2f3946;
  font-size: 14px;
  text-align: left;
  cursor: pointer;
}

.account-menu__item:hover {
  background: #f5fbf8;
}

.notification-mask {
  position: fixed;
  inset: 0;
  z-index: 40;
  background: rgba(22, 29, 48, 0.26);
}

.notification-panel {
  position: absolute;
  top: 0;
  right: 0;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  width: min(620px, 38vw);
  min-width: 400px;
  height: 100vh;
  background: #ffffff;
  box-shadow: -18px 0 48px rgba(26, 37, 48, 0.16);
}

.notification-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 22px 14px;
  border-bottom: 1px solid #eef2ef;
}

.notification-panel__header strong {
  color: #2f3946;
  font-size: 16px;
  font-weight: 500;
  letter-spacing: 0.01em;
}

.notification-panel__close {
  width: 28px;
  height: 28px;
  padding: 0;
  border: 0;
  background: transparent;
  color: #c3cad1;
  font-size: 22px;
  line-height: 1;
}

.notification-panel__list {
  overflow-y: auto;
  padding: 0 22px 8px;
}

.notification-card {
  position: relative;
  display: grid;
  grid-template-columns: 52px minmax(0, 1fr) 12px;
  gap: 14px;
  align-items: center;
  min-height: 92px;
  border-bottom: 1px solid #eef2ef;
}

.notification-card__icon {
  display: grid;
  place-items: center;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  color: #45d1ac;
  background: #dff8f0;
}

.notification-card__icon svg {
  width: 28px;
  height: 28px;
}

.notification-card__body {
  min-width: 0;
}

.notification-card__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 4px;
}

.notification-card__meta strong {
  color: #2f3946;
  font-size: 14px;
  font-weight: 500;
}

.notification-card__meta span {
  flex-shrink: 0;
  color: #a5adb6;
  font-size: 11px;
  font-weight: 400;
}

.notification-card__body p {
  margin: 0;
  color: #9aa3ad;
  font-size: 12px;
  font-weight: 400;
  line-height: 1.45;
}

.notification-card__dot {
  justify-self: end;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ff7b75;
}

.admin-content {
  min-width: 0;
  min-height: 0;
  height: 100%;
  padding: 26px 28px 16px;
  background: transparent;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.empty-state {
  padding: 24px;
  border-radius: 16px;
  background: var(--admin-surface-strong);
  color: var(--admin-muted);
  box-shadow: var(--admin-shadow);
}

@media (max-width: 1280px) {
  .admin-shell--app {
    grid-template-columns: 170px 170px minmax(0, 1fr);
  }

  .admin-content {
    padding-right: 20px;
    padding-left: 20px;
  }

  .admin-content {
    padding-right: 20px;
    padding-left: 20px;
  }
}

@media (max-width: 960px) {
  .admin-shell--app {
    grid-template-columns: 1fr;
  }

  .rail,
  .subnav {
    display: none;
  }

  .main {
    grid-template-rows: auto minmax(0, 1fr);
  }

  .topbar {
    flex-direction: column;
    align-items: stretch;
    padding: 16px;
  }

  .topbar__actions {
    justify-content: flex-end;
  }

  .admin-content {
    padding: 16px;
  }

  .admin-content {
    padding: 16px;
  }

  .notification-panel {
    width: min(100vw, 420px);
    min-width: 0;
  }
}
</style>
