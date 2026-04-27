<script setup lang="ts">
import { computed, shallowRef, watch } from "vue";
import type { Component } from "vue";
import type { PageEntry } from "@ihc/page-core/types";
import { loadRoutePageComponent, peekRoutePageComponent } from "./page-loader";
import { getPageEntryById, userPageManifest } from "./page-manifest";
import { usePageRouterNavigation } from "./router-navigation";
import { useToastQueue } from "./useToastQueue";

const props = defineProps<{
  pageId: string;
}>();

const navigation = usePageRouterNavigation();
const { showToast } = useToastQueue();
const activeComponent = shallowRef<Component | null>(null);
const activeComponentPageId = shallowRef("");
const loadError = shallowRef("");
const isPageLoading = shallowRef(false);
const PAGE_LOAD_TIMEOUT_MS = 8000;

const pageEntry = computed<PageEntry | null>(() => getPageEntryById(props.pageId));

const resolvedComponent = computed(() => {
  if (!pageEntry.value || activeComponentPageId.value !== pageEntry.value.id) {
    return null;
  }

  return activeComponent.value;
});

watch(
  () => props.pageId,
  async (pageId) => {
    const currentPageId = pageEntry.value?.id || pageId;
    activeComponent.value = null;
    activeComponentPageId.value = "";
    loadError.value = "";
    isPageLoading.value = false;

    if (!pageEntry.value) {
      return;
    }

    const cachedComponent = peekRoutePageComponent(currentPageId);
    if (cachedComponent !== undefined) {
      activeComponent.value = cachedComponent;
      activeComponentPageId.value = cachedComponent ? currentPageId : "";
      return;
    }

    isPageLoading.value = true;

    try {
      const component = await Promise.race([
        loadRoutePageComponent(currentPageId),
        new Promise<null>((_, reject) => {
          window.setTimeout(() => {
            reject(new Error(`Page module timed out while loading: ${currentPageId}`));
          }, PAGE_LOAD_TIMEOUT_MS);
        }),
      ]);

      if (props.pageId !== currentPageId) {
        return;
      }

      activeComponent.value = component;
      activeComponentPageId.value = component ? currentPageId : "";
    } catch (error) {
      if (props.pageId !== currentPageId) {
        return;
      }

      loadError.value = error instanceof Error ? error.message : "Failed to load page component.";
    } finally {
      if (props.pageId === currentPageId) {
        isPageLoading.value = false;
      }
    }
  },
  { immediate: true, flush: "sync" },
);

const pageProps = computed(() => {
  if (!pageEntry.value) {
    return null;
  }

  return {
    pageEntry: pageEntry.value,
    mode: "app" as const,
    manifest: userPageManifest,
    navigation,
    showToast,
  };
});
</script>

<template>
  <component v-if="resolvedComponent && pageProps" :is="resolvedComponent" :key="pageEntry?.id" v-bind="pageProps" />
  <section v-else-if="pageEntry && isPageLoading" class="page-loader">
    <strong>页面加载中</strong>
    <p>首次访问页面时会按需加载模块，通常只会短暂出现；若持续停留将自动转为错误提示。</p>
  </section>
  <section v-else-if="pageEntry" class="page-error">
    <strong>页面加载失败</strong>
    <p>{{ loadError || "页面组件不可用，请检查模块导出和模板语法。" }}</p>
  </section>
  <section v-else class="page-error">
    <strong>页面不存在</strong>
    <p>当前访问地址没有对应的用户端页面，请检查路由配置。</p>
  </section>
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
