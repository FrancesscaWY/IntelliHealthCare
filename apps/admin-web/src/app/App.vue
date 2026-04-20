<script setup lang="ts">
import { computed, onMounted, shallowRef, watch } from "vue";
import type { Component } from "vue";
import { getStatusMeta, groupPagesByGroup } from "@ihc/page-core/runtime";
import type { PageEntry } from "@ihc/page-core/types";
import manifestEntries from "./pages.manifest.json";
import { loadPageComponent, preloadPageComponents } from "./page-registry";
import { resolveConfig } from "./resolve-config";
import { usePageNavigation } from "./usePageNavigation";
import { useToastQueue } from "./useToastQueue";
import { groupMeta, projectInfo } from "@/shared/project-info";
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

const resolvedComponent = computed(() => {
  if (!activePage.value || activeComponentPageId.value !== activePage.value.id) {
    return null;
  }

  return activeComponent.value;
});

const sidebarGroups = computed(() =>
  Object.entries(groupPagesByGroup(manifest))
    .filter(([group]) => group !== "auth")
    .map(([group, pages]) => ({
      key: group,
      title: groupMeta[group]?.title || group,
      description: groupMeta[group]?.description || "",
      pages,
    })),
);

const currentStatusMeta = computed(() => (activePage.value ? getStatusMeta(activePage.value.status) : null));
const currentGroupMeta = computed(() => (activePage.value ? groupMeta[activePage.value.group] : null));
const isAuthPage = computed(() => activePage.value?.group === "auth");

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
  { immediate: true, flush: "sync" },
);

watch(
  activePage,
  (pageEntry) => {
    if (!pageEntry) {
      document.title = projectInfo.name;
      return;
    }

    document.title = config.mode === "page" ? `${pageEntry.title} - 单页预览` : `${pageEntry.title} - ${projectInfo.name}`;
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
  navigation.reLaunch(pageId);
}

function copyCommand(command: string) {
  showToast(`调试命令：${command}`);
}
onMounted(() => {
  if (config.mode === "page") {
    return;
  }

  const preload = () => preloadPageComponents();

  if (typeof window !== "undefined" && "requestIdleCallback" in window) {
    (window as Window & { requestIdleCallback: (callback: IdleRequestCallback) => number }).requestIdleCallback(() => preload());
    return;
  }

  globalThis.setTimeout(preload, 0);
});
</script>

<template>
  <main class="admin-shell" :class="[`admin-shell--${config.mode}`, { 'admin-shell--auth': isAuthPage }]">
    <template v-if="isAuthPage">
      <section class="auth-stage">
        <component v-if="resolvedComponent && pageProps" :is="resolvedComponent" :key="activePage?.id" v-bind="pageProps" />
        <PagePlaceholder v-else-if="activePage" :page-entry="activePage" :error-message="loadError || undefined" />
        <section v-else class="empty-state">当前没有可加载的页面，请检查 pages.manifest.json 配置。</section>
      </section>
    </template>

    <template v-else>
      <aside v-if="config.mode === 'app'" class="admin-sidebar">
        <div class="brand-panel">
          <span class="brand-badge">IHC Admin</span>
          <h1>{{ projectInfo.name }}</h1>
          <p>{{ projectInfo.summary }}</p>
        </div>

        <nav class="sidebar-nav" aria-label="后台导航">
          <section v-for="group in sidebarGroups" :key="group.key" class="sidebar-group">
            <header>
              <strong>{{ group.title }}</strong>
              <span>{{ group.description }}</span>
            </header>
            <button
              v-for="page in group.pages"
              :key="page.id"
              class="sidebar-link"
              :class="{ 'sidebar-link--active': page.id === activePage?.id }"
              type="button"
              @click="openPage(page.id)"
            >
              <span>{{ page.title }}</span>
              <small>{{ page.id }}</small>
            </button>
          </section>
        </nav>
      </aside>

      <section class="admin-main">
        <header class="admin-topbar">
          <div>
            <p class="eyebrow">{{ currentGroupMeta?.title || "后台工作台" }}</p>
            <h2>{{ activePage?.title || projectInfo.name }}</h2>
            <p class="topbar-summary">{{ activePage?.summary || projectInfo.summary }}</p>
          </div>

          <div class="topbar-actions">
            <span v-if="currentStatusMeta" class="status-pill" :class="`status-pill--${currentStatusMeta.tone}`">{{ currentStatusMeta.label }}</span>
            <button class="command-chip" type="button" @click="copyCommand('npm run dev:admin')">整站入口</button>
            <button
              v-if="activePage"
              class="command-chip"
              type="button"
              @click="copyCommand(`npm run dev:admin:page -- --page ${activePage.id}`)"
            >
              单页入口
            </button>
          </div>
        </header>

        <section class="workspace-metrics">
          <article>
            <span>当前模式</span>
            <strong>{{ config.mode === "page" ? "单页预览" : "整站预览" }}</strong>
          </article>
          <article>
            <span>已登记页面</span>
            <strong>{{ manifest.length }}</strong>
          </article>
          <article>
            <span>登录入口</span>
            <strong>{{ projectInfo.homePageId }}</strong>
          </article>
        </section>

        <section class="admin-content">
          <component v-if="resolvedComponent && pageProps" :is="resolvedComponent" :key="activePage?.id" v-bind="pageProps" />
          <PagePlaceholder v-else-if="activePage" :page-entry="activePage" :error-message="loadError || undefined" />
          <section v-else class="empty-state">当前没有可加载的页面，请检查 pages.manifest.json 配置。</section>
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
  padding: 24px;
  gap: 20px;
}

.admin-shell--app {
  grid-template-columns: 320px minmax(0, 1fr);
}

.admin-shell--page,
.admin-shell--auth {
  grid-template-columns: minmax(0, 1fr);
}

.admin-shell--auth {
  padding: 0;
  gap: 0;
}

.auth-stage {
  min-height: 100vh;
}

.admin-sidebar,
.admin-main {
  min-width: 0;
}

.admin-sidebar {
  display: grid;
  gap: 18px;
  padding: 24px;
  border: 1px solid rgba(255, 255, 255, 0.4);
  border-radius: var(--admin-radius-xl);
  background: linear-gradient(180deg, rgba(19, 50, 42, 0.96), rgba(24, 58, 48, 0.92));
  color: rgba(255, 255, 255, 0.92);
  box-shadow: 0 28px 52px rgba(17, 40, 34, 0.18);
}

.brand-panel {
  padding: 18px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.04);
}

.brand-badge {
  display: inline-flex;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.brand-panel h1 {
  margin: 16px 0 8px;
  font-size: 28px;
}

.brand-panel p {
  margin: 0;
  color: rgba(255, 255, 255, 0.72);
  line-height: 1.7;
}

.sidebar-nav {
  display: grid;
  gap: 14px;
  align-content: start;
  overflow: auto;
}

.sidebar-group {
  display: grid;
  gap: 8px;
}

.sidebar-group header {
  display: grid;
  gap: 4px;
  padding: 0 4px;
}

.sidebar-group strong {
  font-size: 14px;
}

.sidebar-group span {
  color: rgba(255, 255, 255, 0.58);
  font-size: 12px;
  line-height: 1.5;
}

.sidebar-link {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  padding: 12px 14px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.04);
  color: inherit;
  text-align: left;
}

.sidebar-link span {
  color: #fff;
  font-size: 14px;
}

.sidebar-link small {
  color: rgba(255, 255, 255, 0.48);
  font-size: 11px;
}

.sidebar-link--active {
  border-color: rgba(95, 211, 163, 0.34);
  background: linear-gradient(135deg, rgba(31, 122, 90, 0.42), rgba(31, 122, 90, 0.18));
}

.admin-main {
  display: grid;
  gap: 18px;
  align-content: start;
}

.admin-topbar,
.workspace-metrics,
.admin-content {
  min-width: 0;
}

.admin-topbar {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: 28px;
  border: 1px solid var(--admin-border);
  border-radius: var(--admin-radius-xl);
  background: var(--admin-surface-strong);
  box-shadow: var(--admin-shadow);
}

.eyebrow {
  margin: 0;
  color: var(--admin-brand);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.admin-topbar h2 {
  margin: 10px 0 8px;
  font-size: 34px;
}

.topbar-summary {
  margin: 0;
  max-width: 720px;
  color: var(--admin-muted);
  line-height: 1.7;
}

.topbar-actions {
  display: flex;
  align-items: flex-start;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 10px;
}

.status-pill,
.command-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 10px 14px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
}

.status-pill--implemented {
  background: rgba(31, 122, 90, 0.12);
  color: var(--admin-brand);
}

.status-pill--in-progress {
  background: rgba(31, 122, 90, 0.18);
  color: #16543d;
}

.status-pill--planned {
  background: rgba(224, 138, 58, 0.14);
  color: #9d5b1a;
}

.command-chip {
  border: 1px solid rgba(31, 122, 90, 0.16);
  background: rgba(31, 122, 90, 0.06);
  color: var(--admin-brand);
}

.workspace-metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.workspace-metrics article {
  padding: 20px 22px;
  border: 1px solid var(--admin-border);
  border-radius: var(--admin-radius-lg);
  background: var(--admin-surface);
  box-shadow: var(--admin-shadow);
}

.workspace-metrics span {
  display: block;
  color: var(--admin-muted);
  font-size: 13px;
}

.workspace-metrics strong {
  display: block;
  margin-top: 8px;
  font-size: 22px;
}

.admin-content {
  padding: 4px 0 0;
}

.empty-state {
  padding: 24px;
  border-radius: var(--admin-radius-lg);
  background: var(--admin-surface-strong);
  box-shadow: var(--admin-shadow);
  color: var(--admin-muted);
}

@media (max-width: 1080px) {
  .admin-shell {
    padding: 18px;
  }

  .admin-shell--app {
    grid-template-columns: 1fr;
  }

  .admin-topbar {
    flex-direction: column;
  }
}

@media (max-width: 720px) {
  .workspace-metrics {
    grid-template-columns: 1fr;
  }

  .admin-topbar {
    padding: 22px;
  }

  .admin-topbar h2 {
    font-size: 28px;
  }
}
</style>
