<script setup lang="ts">
import { computed, shallowRef, watch } from "vue";
import type { Component } from "vue";
import type { PageEntry } from "@ihc/page-core/types";
import manifestEntries from "./pages.manifest.json";
import { loadPageComponent, peekPageComponent } from "./page-registry";
import { resolveConfig } from "./resolve-config";
import { usePageNavigation } from "./usePageNavigation";
import { useToastQueue } from "./useToastQueue";
import { projectInfo } from "@/shared/project-info";
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
let appReadyMarked = false;

const resolvedComponent = computed(() => {
  if (!activePage.value || activeComponentPageId.value !== activePage.value.id) {
    return null;
  }

  return activeComponent.value;
});

function markAppReady() {
  if (appReadyMarked || typeof document === "undefined") {
    return;
  }

  document.documentElement.classList.add("ihc-app-ready");
  appReadyMarked = true;
}

watch(
  activePage,
  async (pageEntry) => {
    const currentPageId = pageEntry?.id || "";
    activeComponent.value = null;
    activeComponentPageId.value = "";
    loadError.value = "";
    isPageLoading.value = false;

    if (!pageEntry) {
      return;
    }

    const cachedComponent = peekPageComponent(currentPageId);
    if (cachedComponent !== undefined) {
      activeComponent.value = cachedComponent;
      activeComponentPageId.value = cachedComponent ? currentPageId : "";
      return;
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

      loadError.value = error instanceof Error ? error.message : "Failed to load page component.";
    } finally {
      if (activePage.value?.id === currentPageId) {
        isPageLoading.value = false;
      }
    }
  },
  { immediate: true, flush: "sync" },
);

watch(
  [resolvedComponent, loadError, activePage, isPageLoading],
  ([component, error, pageEntry, loading]) => {
    if (component || error || !pageEntry || loading) {
      markAppReady();
    }
  },
  { immediate: true, flush: "post" },
);

watch(
  activePage,
  (pageEntry) => {
    if (!pageEntry) {
      document.title = projectInfo.name;
      return;
    }

    document.title = config.mode === "page" ? `${pageEntry.title} - Single Page Preview` : `${pageEntry.title} - ${projectInfo.name}`;
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
</script>

<template>
  <main class="app-shell" :class="config.mode === 'page' ? 'app-shell--page' : 'app-shell--site'">
    <section class="app-canvas">
      <div class="mobile-page-root">
        <component v-if="resolvedComponent && pageProps" :is="resolvedComponent" :key="activePage?.id" v-bind="pageProps" />
        <section v-else-if="activePage && isPageLoading" class="page-loader">
          <strong>页面加载中</strong>
          <p>开发模式首次进入页面会编译模块，通常只会在未缓存页面上短暂出现。</p>
        </section>
        <section v-else-if="activePage" class="page-error">
          <strong>页面加载失败</strong>
          <p>{{ loadError || "页面组件不可用，请检查模块导出和模板语法。" }}</p>
        </section>
        <section v-else class="page-loader">
          <strong>没有可用页面</strong>
          <p>请检查 `pages.manifest.json` 和当前页面配置。</p>
        </section>
      </div>
    </section>

    <ToastViewport :items="toastItems" />
  </main>
</template>

<style scoped>
.page-loader,
.page-error {
  display: grid;
  gap: 8px;
  padding: 24px 20px;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 18px 42px rgba(34, 67, 118, 0.1);
}

.page-loader strong,
.page-error strong {
  font-size: 18px;
}

.page-loader p,
.page-error p {
  margin: 0;
  color: var(--muted);
  line-height: 1.7;
}
</style>
