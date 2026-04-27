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
const activePageEntry = shallowRef<PageEntry | null>(null);
const loadError = shallowRef("");
const isPageLoading = shallowRef(false);
const PAGE_INSTANCE_CACHE_MAX = 24;

const pageEntry = computed<PageEntry | null>(() => getPageEntryById(props.pageId));

const resolvedComponent = computed(() => {
  if (!activePageEntry.value || !activeComponent.value) {
    return null;
  }

  return activeComponent.value;
});

function finishLoading() {
  isPageLoading.value = false;
}

watch(
  () => props.pageId,
  async (pageId) => {
    const targetPageEntry = pageEntry.value;
    const currentPageId = targetPageEntry?.id || pageId;
    loadError.value = "";

    if (!targetPageEntry) {
      if (!activeComponent.value) {
        activeComponentPageId.value = "";
        activePageEntry.value = null;
      }
      return;
    }

    const cachedComponent = peekRoutePageComponent(currentPageId);
    if (cachedComponent !== undefined) {
      activeComponent.value = cachedComponent;
      activeComponentPageId.value = cachedComponent ? currentPageId : "";
      activePageEntry.value = cachedComponent ? targetPageEntry : null;
      finishLoading();
      return;
    }

    isPageLoading.value = !activeComponent.value;

    try {
      const component = await loadRoutePageComponent(currentPageId);

      if (props.pageId !== currentPageId) {
        return;
      }

      activeComponent.value = component;
      activeComponentPageId.value = component ? currentPageId : "";
      activePageEntry.value = component ? targetPageEntry : null;
    } catch (error) {
      if (props.pageId !== currentPageId) {
        return;
      }

      const message = error instanceof Error ? error.message : "Failed to load page component.";
      loadError.value = message;

      if (activeComponent.value) {
        showToast(`页面加载失败：${message}`);
      }
    } finally {
      if (props.pageId === currentPageId) {
        finishLoading();
      }
    }
  },
  { immediate: true, flush: "sync" },
);

const pageProps = computed(() => {
  if (!activePageEntry.value) {
    return null;
  }

  return {
    pageEntry: activePageEntry.value,
    mode: "app" as const,
    manifest: userPageManifest,
    navigation,
    showToast,
  };
});
</script>

<template>
  <KeepAlive :max="PAGE_INSTANCE_CACHE_MAX">
    <component v-if="resolvedComponent && pageProps" :is="resolvedComponent" :key="activeComponentPageId" v-bind="pageProps" />
  </KeepAlive>
  <section v-if="!resolvedComponent && pageEntry && isPageLoading" class="page-loader">
    <div class="page-loader__panel">
      <div class="page-loader__signal" aria-hidden="true">
        <span class="page-loader__signal-ring page-loader__signal-ring--outer"></span>
        <span class="page-loader__signal-ring page-loader__signal-ring--inner"></span>
        <span class="page-loader__signal-core"></span>
      </div>

      <strong>加载中</strong>
    </div>
  </section>
  <section v-else-if="!resolvedComponent && pageEntry" class="page-error">
    <strong>页面加载失败</strong>
    <p>{{ loadError || "页面组件不可用，请检查模块导出和模板语法。" }}</p>
  </section>
  <section v-else-if="!resolvedComponent" class="page-error">
    <strong>页面不存在</strong>
    <p>当前访问地址没有对应的用户端页面，请检查路由配置。</p>
  </section>
</template>

<style scoped>
.page-loader {
  min-height: calc(var(--ihc-page-min-height) - 36px);
  display: grid;
  place-items: center;
  padding: 10px 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}

.page-loader__panel {
  position: relative;
  width: min(100%, 332px);
  padding: 28px 24px 30px;
  border: 1px solid rgba(181, 230, 224, 0.68);
  border-radius: 18px;
  overflow: hidden;
  background:
    linear-gradient(180deg, rgba(246, 253, 251, 0.72) 0%, rgba(239, 250, 247, 0.66) 100%);
  box-shadow:
    0 18px 42px rgba(44, 124, 118, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.58);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

.page-loader__panel::before {
  position: absolute;
  inset: -70px auto auto -48px;
  width: 170px;
  height: 170px;
  content: "";
  border-radius: 50%;
  background: radial-gradient(circle, rgba(117, 214, 223, 0.22) 0%, rgba(117, 214, 223, 0) 72%);
}

.page-loader__panel::after {
  position: absolute;
  top: 18px;
  right: -46px;
  width: 132px;
  height: 132px;
  content: "";
  border-radius: 50%;
  background: radial-gradient(circle, rgba(123, 226, 142, 0.18) 0%, rgba(123, 226, 142, 0) 70%);
}

.page-loader__signal {
  position: relative;
  display: grid;
  place-items: center;
  width: 92px;
  height: 92px;
  margin: 0 auto 18px;
}

.page-loader__signal-ring {
  position: absolute;
  border-radius: 50%;
  border: 1px solid rgba(82, 179, 170, 0.2);
  animation: page-loader-pulse 2s ease-in-out infinite;
}

.page-loader__signal-ring--outer {
  inset: 0;
}

.page-loader__signal-ring--inner {
  inset: 14px;
  animation-delay: -1s;
}

.page-loader__signal-core {
  position: relative;
  z-index: 1;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--brand) 0%, var(--brand-light) 100%);
  box-shadow:
    0 0 0 10px rgba(117, 214, 223, 0.14),
    0 14px 28px rgba(53, 161, 152, 0.22);
  animation: page-loader-core 1.9s ease-in-out infinite;
}

.page-loader strong,
.page-error strong {
  position: relative;
  z-index: 1;
  font-size: 22px;
  line-height: 1.3;
  text-align: center;
}

.page-error p {
  position: relative;
  z-index: 1;
  margin: 0;
  color: var(--muted);
  line-height: 1.7;
  text-align: center;
}

.page-loader strong {
  margin-bottom: 16px;
}

.page-error strong {
  font-size: 18px;
}

.page-error {
  display: grid;
  gap: 8px;
  padding: 24px 20px;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 18px 42px rgba(44, 124, 118, 0.1);
}

@keyframes page-loader-pulse {
  0%,
  100% {
    transform: scale(0.96);
    opacity: 0.56;
  }

  50% {
    transform: scale(1.04);
    opacity: 1;
  }
}

@keyframes page-loader-core {
  0%,
  100% {
    transform: scale(0.94);
  }

  50% {
    transform: scale(1.06);
  }
}

@media (prefers-reduced-motion: reduce) {
  .page-loader__signal-ring,
  .page-loader__signal-core {
    animation: none;
  }
}
</style>
