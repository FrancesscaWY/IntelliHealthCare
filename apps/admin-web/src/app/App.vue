<script setup lang="ts">
import { computed, ref, shallowRef, watch } from "vue";
import type { Component } from "vue";
import { Analysis, HexagonOne, Home, People, Protect, Search, Star, Video } from "@icon-park/vue-next";
import { groupPagesByGroup } from "@ihc/page-core/runtime";
import type { PageEntry } from "@ihc/page-core/types";
import manifestEntries from "./pages.manifest.json";
import { loadPageComponent } from "./page-registry";
import { resolveConfig } from "./resolve-config";
import { usePageNavigation } from "./usePageNavigation";
import { useToastQueue } from "./useToastQueue";
import { groupMeta, pageMeta, projectInfo, railGroupOrder } from "@/shared/project-info";
import PagePlaceholder from "@/components/PagePlaceholder.vue";
import ToastViewport from "@/components/ToastViewport.vue";

const manifest = manifestEntries as PageEntry[];
const config = resolveConfig();
const { activePage, navigation } = usePageNavigation({
  manifest,
  preferredPageId: config.preferredPageId,
  pathname: window.location.pathname,
  fallbackPageId: projectInfo.homePageId,
});
const { items: toastItems, showToast } = useToastQueue();

const activeComponent = shallowRef<Component | null>(null);
const activeComponentPageId = shallowRef("");
const loadError = shallowRef("");
const searchKeyword = ref("");

const isAuthPage = computed(() => activePage.value?.group === "auth");
const groupedPages = computed(() => groupPagesByGroup(manifest));
const currentGroup = computed(() => activePage.value?.group || "dashboard");

const resolvedComponent = computed(() => {
  if (!activePage.value || activeComponentPageId.value !== activePage.value.id) {
    return null;
  }

  return activeComponent.value;
});

const railItems = computed(() =>
  railGroupOrder
    .map((groupKey) => {
      const pages = groupedPages.value[groupKey] || [];
      if (!pages.length) {
        return null;
      }

      return {
        key: groupKey,
        title: groupMeta[groupKey]?.title || groupKey,
        pageId:
          groupKey === "system"
            ? "system/reset-password"
            : groupKey === "service"
              ? "service/staff-management"
              : pages[0].id,
        icon: railIcons[groupKey] || railIcons.dashboard,
      };
    })
    .filter(Boolean) as Array<{ key: string; title: string; pageId: string; icon: Component }>,
);

const secondaryNavItems = computed(() => {
  if (currentGroup.value === "dashboard") {
    return [
      { key: "home", label: "首页", active: false, pageId: "dashboard/overview", kind: "item" },
      { key: "workbench", label: "工作台", active: true, pageId: "dashboard/overview", kind: "item" },
      { key: "booking", label: "预约看板", active: false, pageId: "", toast: "预约看板原型页暂未接入。", kind: "item" },
    ];
  }

  if (currentGroup.value === "elder") {
    return [
      { key: "elder-section-user", label: "用户管理", kind: "section" },
      { key: "elder-member-list", label: "用户列表", active: activePage.value?.id === "elder/member-list", pageId: "elder/member-list", kind: "item" },
      { key: "elder-tags", label: "标签管理", active: false, pageId: "", toast: "标签管理原型页暂未接入。", kind: "item" },
      {
        key: "elder-reports",
        label: "报告管理",
        active: activePage.value?.id === "elder/report-management",
        pageId: "elder/report-management",
        kind: "item",
      },
      { key: "elder-levels", label: "等级管理", active: false, pageId: "", toast: "等级管理原型页暂未接入。", kind: "item" },
      { key: "elder-section-message", label: "消息管理", kind: "section" },
      { key: "elder-mass-message", label: "消息群发", active: false, pageId: "", toast: "消息群发原型页暂未接入。", kind: "item" },
      { key: "elder-session", label: "会话", active: false, pageId: "", toast: "会话原型页暂未接入。", kind: "item" },
      { key: "elder-section-marketing", label: "营销管理", kind: "section" },
      { key: "elder-coupon", label: "优惠券管理", active: false, pageId: "", toast: "优惠券管理原型页暂未接入。", kind: "item" },
      { key: "elder-points", label: "积分规则", active: false, pageId: "", toast: "积分规则原型页暂未接入。", kind: "item" },
      { key: "elder-growth", label: "成长值规则", active: false, pageId: "", toast: "成长值规则原型页暂未接入。", kind: "item" },
    ];
  }

  if (currentGroup.value === "service") {
    return [
      { key: "service-section-staff", label: "服务人员管理", kind: "section" },
      {
        key: "service-staff-management",
        label: "全部服务人员",
        active: activePage.value?.id === "service/staff-management",
        pageId: "service/staff-management",
        kind: "item",
      },
      { key: "service-staff-tags", label: "标签管理", active: false, pageId: "", toast: "标签管理原型页暂未接入。", kind: "item" },
      {
        key: "service-staff-review",
        label: "审核管理",
        active: ["service/review-management", "service/review-detail"].includes(activePage.value?.id || ""),
        pageId: "service/review-management",
        kind: "item",
      },
      { key: "service-section-order", label: "服务管理", kind: "section" },
      {
        key: "service-order-dispatch",
        label: "工单管理",
        active: activePage.value?.id === "service/order-dispatch",
        pageId: "service/order-dispatch",
        kind: "item",
      },
      { key: "service-commission", label: "佣金记录", active: false, pageId: "", toast: "佣金记录原型页暂未接入。", kind: "item" },
      { key: "service-reward", label: "打赏记录", active: false, pageId: "", toast: "打赏记录原型页暂未接入。", kind: "item" },
      { key: "service-setting", label: "工单设置", active: false, pageId: "", toast: "工单设置原型页暂未接入。", kind: "item" },
    ];
  }

  if (currentGroup.value === "system") {
    return [
      { key: "system-section", label: "系统设置", kind: "section" },
      { key: "system-staff", label: "员工管理", active: false, pageId: "", toast: "员工管理原型页暂未接入。", kind: "item" },
      { key: "system-role", label: "角色管理", active: false, pageId: "", toast: "角色管理原型页暂未接入。", kind: "item" },
      { key: "system-unit", label: "药品单位管理", active: false, pageId: "", toast: "药品单位管理原型页暂未接入。", kind: "item" },
      { key: "system-protocol", label: "协议管理", active: false, pageId: "", toast: "协议管理原型页暂未接入。", kind: "item" },
      { key: "system-log", label: "操作日志", active: false, pageId: "", toast: "操作日志原型页暂未接入。", kind: "item" },
      {
        key: "system-profile",
        label: "个人资料",
        active: activePage.value?.id === "system/account-settings",
        pageId: "system/account-settings",
        kind: "item",
      },
      {
        key: "system-reset-password",
        label: "重置密码",
        active: activePage.value?.id === "system/reset-password",
        pageId: "system/reset-password",
        kind: "item",
      },
    ];
  }

  return (groupedPages.value[currentGroup.value] || []).map((page) => ({
    key: page.id,
    label: pageMeta[page.id]?.shortTitle || pageMeta[page.id]?.title || page.title,
    active: page.id === activePage.value?.id,
    pageId: page.id,
    kind: "item",
  }));
});

const currentGroupTitle = computed(() => {
  if (currentGroup.value === "elder") {
    return "用户";
  }

  if (currentGroup.value === "service") {
    return "服务";
  }

  if (currentGroup.value === "system") {
    return "设置";
  }

  return groupMeta[currentGroup.value]?.title || pageMeta[activePage.value?.id || ""]?.title || "首页";
});

watch(
  activePage,
  async (pageEntry) => {
    const currentPageId = pageEntry?.id || "";
    activeComponent.value = null;
    activeComponentPageId.value = "";
    loadError.value = "";

    if (!pageEntry) {
      return;
    }

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
    }
  },
  { immediate: true },
);

watch(
  activePage,
  (pageEntry) => {
    const pageTitle = pageEntry ? pageMeta[pageEntry.id]?.title || pageEntry.title : projectInfo.name;
    document.title = `${pageTitle} - ${projectInfo.name}`;
  },
  { immediate: true },
);

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

function submitSearch() {
  const keyword = searchKeyword.value.trim();
  showToast(keyword ? `已搜索：${keyword}` : "请输入关键字后再搜索。");
}

function notifyAction(label: string) {
  showToast(`${label}入口为演示状态。`);
}

const railIcons: Record<string, Component> = {
  dashboard: Home,
  elder: People,
  service: Protect,
  health: Star,
  device: Video,
  analytics: Analysis,
  system: HexagonOne,
};
</script>

<template>
  <main class="admin-shell" :class="[`admin-shell--${config.mode}`, { 'admin-shell--auth': isAuthPage }]">
    <template v-if="isAuthPage">
      <section class="auth-stage">
        <component v-if="resolvedComponent && pageProps" :is="resolvedComponent" v-bind="pageProps" />
        <PagePlaceholder v-else-if="activePage" :page-entry="activePage" :error-message="loadError || undefined" />
        <section v-else class="empty-state">当前没有可加载的页面，请检查页面清单配置。</section>
      </section>
    </template>

    <template v-else>
      <aside v-if="config.mode === 'app'" class="rail">
        <button class="rail__logo" type="button" aria-label="返回首页" @click="openPage('dashboard/overview')">
          <svg viewBox="0 0 48 48" focusable="false" aria-hidden="true">
            <path
              d="M24 39.5 10.7 26.4c-3.3-3.3-5.3-6.4-5.3-10.7 0-5.7 4.5-10.2 10.1-10.2 3.4 0 6.1 1.6 8.5 4.8 2.4-3.2 5.1-4.8 8.5-4.8 5.6 0 10.1 4.5 10.1 10.2 0 4.3-2 7.4-5.3 10.7L24 39.5Z"
            />
            <path d="M24 14.6v10.5" fill="none" stroke="#111432" stroke-linecap="round" stroke-width="3.5" />
            <path d="M18.7 19.85h10.6" fill="none" stroke="#111432" stroke-linecap="round" stroke-width="3.5" />
          </svg>
        </button>

        <div class="rail__brand">
          <span>黛西健康</span>
        </div>

        <nav class="rail__nav" aria-label="分组导航">
          <button
            v-for="item in railItems"
            :key="item.key"
            class="rail__item"
            :class="{ 'rail__item--active': item.key === currentGroup }"
            type="button"
            :aria-label="item.title"
            @click="openPage(item.pageId)"
          >
            <component :is="item.icon" theme="outline" :size="24" :stroke-width="3" />
          </button>
        </nav>
      </aside>

      <aside v-if="config.mode === 'app'" class="subnav">
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
            <input v-model="searchKeyword" type="text" placeholder="请输入关键字" @keydown.enter="submitSearch" />
          </div>

          <div class="topbar__actions">
            <button class="topbar__icon" type="button" aria-label="客服" @click="notifyAction('客服')">
              <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
                <path d="M5 12a7 7 0 1 1 14 0v4a2 2 0 0 1-2 2h-2v-6h4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                <path d="M5 18H3a2 2 0 0 1-2-2v-4h4v6Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" />
              </svg>
            </button>

            <button class="topbar__icon topbar__icon--badge" type="button" aria-label="消息" @click="notifyAction('消息')">
              <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
                <path d="M12 4a5 5 0 0 1 5 5v2.7c0 .8.2 1.6.7 2.3l1 1.5H5.3l1-1.5c.5-.7.7-1.5.7-2.3V9a5 5 0 0 1 5-5Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" />
                <path d="M9.5 18a2.5 2.5 0 0 0 5 0" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
              </svg>
            </button>

            <button class="account" type="button" @click="notifyAction('账号菜单')">
              <span class="account__avatar">
                <svg viewBox="0 0 48 48" focusable="false" aria-hidden="true">
                  <circle cx="24" cy="24" r="24" fill="currentColor" />
                  <path d="M24 9.5v8.2" fill="none" stroke="#ffd46b" stroke-width="2.6" stroke-linecap="round" />
                  <path d="M24 30.3v8.2" fill="none" stroke="#ffd46b" stroke-width="2.6" stroke-linecap="round" />
                  <path d="m18.2 17.6 5.8 14.2 5.8-14.2" fill="none" stroke="#ffd46b" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.6" />
                  <circle cx="24" cy="24" r="2.8" fill="#ffffff" />
                  <path d="M11.2 12.6h4.6" fill="none" stroke="#ffd46b" stroke-width="2.2" stroke-linecap="round" />
                  <path d="M32.2 12.6h4.6" fill="none" stroke="#ffd46b" stroke-width="2.2" stroke-linecap="round" />
                </svg>
              </span>
              <span class="account__name">Daisy</span>
              <span class="account__caret">▼</span>
            </button>
          </div>
        </header>

        <section class="content">
          <component v-if="resolvedComponent && pageProps" :is="resolvedComponent" v-bind="pageProps" />
          <PagePlaceholder v-else-if="activePage" :page-entry="activePage" :error-message="loadError || undefined" />
          <section v-else class="empty-state">当前没有可加载的页面，请检查页面清单配置。</section>
        </section>
      </section>
    </template>

    <ToastViewport :items="toastItems" />
  </main>
</template>

<style scoped>
.admin-shell {
  display: grid;
  min-height: 100vh;
}

.admin-shell--app {
  grid-template-columns: 68px 160px minmax(0, 1fr);
  background: #f0fdf9;
  font-family: "PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.admin-shell--page,
.admin-shell--auth {
  grid-template-columns: minmax(0, 1fr);
}

.admin-shell--auth {
  background: #ffffff;
}

.auth-stage {
  min-height: 100vh;
}

.rail {
  display: grid;
  grid-template-rows: auto auto 1fr;
  justify-items: center;
  gap: 6px;
  padding: 10px 0 18px;
  background: #111432;
}

.rail__logo {
  width: 36px;
  height: 36px;
  padding: 0;
  border: 0;
  background: transparent;
  color: #8eeab6;
}

.rail__logo svg {
  width: 36px;
  height: 36px;
  fill: currentColor;
}

.rail__brand {
  width: 48px;
  color: #ffffff;
  font-size: 10px;
  font-weight: 600;
  line-height: 1.2;
  letter-spacing: 0.03em;
  text-align: center;
}

.rail__nav {
  display: grid;
  justify-items: center;
  align-content: start;
  grid-auto-rows: max-content;
  gap: 14px;
  padding-top: 8px;
  width: 100%;
}

.rail__item {
  display: grid;
  place-items: center;
  width: 46px;
  height: 46px;
  padding: 0;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: rgba(255, 255, 255, 0.92);
}

.rail__item :deep(svg) {
  width: 21px;
  height: 21px;
}

.rail__item--active {
  background: #42d1a6;
  color: #ffffff;
}

.subnav {
  display: grid;
  align-content: start;
  background: #ffffff;
  border-right: 1px solid #edf3ef;
}

.subnav__header {
  display: flex;
  align-items: center;
  min-height: 58px;
  padding: 0 18px;
  border-bottom: 1px solid #edf3ef;
  color: #2f3946;
  font-size: 16px;
  font-weight: 500;
  letter-spacing: 0.01em;
}

.subnav__list {
  display: grid;
  gap: 2px;
  padding: 12px 14px 18px;
}

.subnav__section {
  margin-top: 10px;
  padding: 8px 2px 10px;
  color: #2f3946;
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 0.01em;
}

.subnav__section:first-child {
  margin-top: 0;
}

.subnav__item {
  width: 100%;
  min-height: 48px;
  padding: 12px 14px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: #9ca7b4;
  font-size: 13px;
  font-weight: 400;
  line-height: 1.25;
  letter-spacing: 0.01em;
  text-align: left;
}

.subnav__item--active {
  background: #42d1a6;
  color: #ffffff;
  font-weight: 500;
}

.main {
  display: grid;
  grid-template-rows: 56px minmax(0, 1fr);
  min-width: 0;
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
}

.account__avatar {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  color: #6970f5;
}

.account__avatar svg {
  width: 40px;
  height: 40px;
}

.account__name {
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.01em;
}

.account__caret {
  color: #45505c;
  font-size: 11px;
}

.content {
  min-width: 0;
  padding: 26px 28px 16px;
  background: #f0fdf9;
}

.empty-state {
  padding: 24px;
  border-radius: 16px;
  background: #ffffff;
  color: #7f8994;
}

@media (max-width: 1280px) {
  .admin-shell--app {
    grid-template-columns: 64px 148px minmax(0, 1fr);
  }

  .content {
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

  .content {
    padding: 16px;
  }
}
</style>
