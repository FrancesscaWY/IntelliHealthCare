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

const hostDebugLines = computed(() => [
  `props.pageId: ${props.pageId || "(empty)"}`,
  `pageEntry.id: ${pageEntry.value?.id || "(missing)"}`,
  `pageEntry.route: ${pageEntry.value?.route || "(missing)"}`,
  `isPageLoading: ${String(isPageLoading.value)}`,
  `activeComponentPageId: ${activeComponentPageId.value || "(empty)"}`,
  `hasResolvedComponent: ${String(Boolean(resolvedComponent.value))}`,
  `hasPageProps: ${String(Boolean(pageProps.value))}`,
  `loadError: ${loadError.value || "(none)"}`,
]);
</script>

<template>
  <section class="page-host-debug-shell">
    <aside class="page-host-debug" aria-label="page-host-debug">
      <strong>PageHost Runtime</strong>
      <p v-for="line in hostDebugLines" :key="line">{{ line }}</p>
    </aside>

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
  </section>
</template>

<style scoped>
.page-host-debug-shell {
  display: grid;
  gap: 10px;
}

.page-host-debug,
.page-loader,
.page-error {
  display: grid;
  gap: 8px;
  padding: 24px 20px;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 18px 42px rgba(34, 67, 118, 0.1);
}

.page-host-debug {
  padding: 12px 14px;
  border: 1px dashed rgba(35, 97, 235, 0.24);
  background: rgba(250, 252, 255, 0.98);
  color: #24324a;
  font-size: 12px;
  line-height: 1.5;
}

.page-host-debug strong {
  font-size: 12px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.page-host-debug p {
  margin: 0;
  word-break: break-all;
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
