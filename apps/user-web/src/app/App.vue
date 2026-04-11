<script setup lang="ts">
import { computed, shallowRef, watch } from "vue";
import type { Component } from "vue";
import type { PageEntry } from "@ihc/page-core/types";
import manifestEntries from "./pages.manifest.json";
import { loadPageComponent } from "./page-registry";
import { resolveConfig } from "./resolve-config";
import { usePageNavigation } from "./usePageNavigation";
import { useToastQueue } from "./useToastQueue";
import { projectInfo } from "@/shared/project-info";
import PagePlaceholder from "@/components/PagePlaceholder.vue";
import ToastViewport from "@/components/ToastViewport.vue";

const manifest = manifestEntries as PageEntry[];
const config = resolveConfig();
const { activePage, navigate, navigation } = usePageNavigation({
  manifest,
  preferredPageId: config.preferredPageId,
  pathname: window.location.pathname,
  fallbackPageId: projectInfo.homePageId,
});
const { items: toastItems, showToast } = useToastQueue();

const activeComponent = shallowRef<Component | null>(null);
const loadError = shallowRef("");

watch(
  activePage,
  async (pageEntry) => {
    const currentPageId = pageEntry?.id || "";
    activeComponent.value = null;
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
</script>

<template>
  <main class="app-shell" :class="config.mode === 'page' ? 'app-shell--page' : 'app-shell--site'">
    <section class="app-canvas">
      <div class="mobile-page-root">
        <component v-if="activeComponent && pageProps" :is="activeComponent" v-bind="pageProps" />
        <PagePlaceholder v-else-if="activePage" :page-entry="activePage" :error-message="loadError || undefined" />
        <section v-else class="page-loader">
          当前没有可加载的页面，请检查 `pages.manifest.json` 配置。
        </section>
      </div>
    </section>

    <ToastViewport :items="toastItems" />
  </main>
</template>
