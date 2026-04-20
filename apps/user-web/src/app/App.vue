<script setup lang="ts">
import { computed, onMounted, shallowRef, watch } from "vue";
import type { Component } from "vue";
import type { PageEntry } from "@ihc/page-core/types";
import manifestEntries from "./pages.manifest.json";
import { loadPageComponent, preloadPageComponents } from "./page-registry";
import { resolveConfig } from "./resolve-config";
import { usePageNavigation } from "./usePageNavigation";
import { useToastQueue } from "./useToastQueue";
import { projectInfo } from "@/shared/project-info";
import ToastViewport from "@/components/ToastViewport.vue";

const manifest = manifestEntries as PageEntry[];
const config = resolveConfig();
const { activePage, navigate, navigation } = usePageNavigation({
  manifest,
  preferredPageId: config.preferredPageId,
  pathname: config.mode === "page" ? window.location.pathname : "",
  fallbackPageId: projectInfo.homePageId,
});
const { items: toastItems, showToast } = useToastQueue();

const activeComponent = shallowRef<Component | null>(null);
const activeComponentPageId = shallowRef("");
const loadError = shallowRef("");
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
  [resolvedComponent, loadError, activePage],
  ([component, error, pageEntry]) => {
    if (component || error || !pageEntry) {
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
  <main class="app-shell" :class="config.mode === 'page' ? 'app-shell--page' : 'app-shell--site'">
    <section class="app-canvas">
      <div class="mobile-page-root">
        <component v-if="resolvedComponent && pageProps" :is="resolvedComponent" :key="activePage?.id" v-bind="pageProps" />
        <section v-else-if="activePage" class="page-error">
          <strong>页面加载失败</strong>
          <p>{{ loadError || "页面组件暂不可用，请检查页面模块是否存在语法或导出错误。" }}</p>
        </section>
        <section v-else class="page-loader">
          当前没有可加载的页面，请检查 `pages.manifest.json` 配置。
        </section>
      </div>
    </section>

    <ToastViewport :items="toastItems" />
  </main>
</template>

<style scoped>
.page-error {
  display: grid;
  gap: 8px;
  padding: 24px 20px;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 18px 42px rgba(34, 67, 118, 0.1);
}

.page-error strong {
  font-size: 18px;
}

.page-error p {
  margin: 0;
  color: var(--muted);
  line-height: 1.7;
}
</style>
