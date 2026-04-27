<script setup lang="ts">
import { computed, onBeforeUnmount, shallowRef, watch } from "vue";
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
const loadingProgress = shallowRef(0);
const PAGE_LOAD_TIMEOUT_MS = 8000;
let loadingFrame: number | null = null;
let loadingStartedAt = 0;
let loadingProgressSeed = 0;

const pageEntry = computed<PageEntry | null>(() => getPageEntryById(props.pageId));

const resolvedComponent = computed(() => {
  if (!pageEntry.value || activeComponentPageId.value !== pageEntry.value.id) {
    return null;
  }

  return activeComponent.value;
});

const loadingHeadline = computed(() => `${pageEntry.value?.title || "页面"} 加载中`);
const loadingDescription = computed(() => {
  return loadingProgress.value < 82 ? "请稍候" : "马上完成";
});

const loadingStageLabel = computed(() => {
  if (loadingProgress.value < 30) {
    return "载入中";
  }

  if (loadingProgress.value < 68) {
    return "准备中";
  }

  return "即将完成";
});

function stopLoadingProgress(finalValue = loadingProgress.value) {
  if (loadingFrame !== null) {
    window.cancelAnimationFrame(loadingFrame);
    loadingFrame = null;
  }

  loadingProgress.value = Math.max(0, Math.min(100, Math.round(finalValue)));
}

function tickLoadingProgress(seed: number) {
  if (seed !== loadingProgressSeed) {
    return;
  }

  const elapsed = performance.now() - loadingStartedAt;
  const ratio = Math.min(elapsed / PAGE_LOAD_TIMEOUT_MS, 1);
  const eased = 1 - Math.pow(1 - ratio, 2.4);
  const nextProgress = 12 + eased * 84;

  loadingProgress.value = Math.max(loadingProgress.value, Math.min(96, Math.round(nextProgress)));

  if (loadingProgress.value >= 96) {
    loadingFrame = null;
    return;
  }

  loadingFrame = window.requestAnimationFrame(() => tickLoadingProgress(seed));
}

function startLoadingProgress() {
  loadingProgressSeed += 1;
  stopLoadingProgress(12);
  loadingStartedAt = performance.now();
  const seed = loadingProgressSeed;
  loadingFrame = window.requestAnimationFrame(() => tickLoadingProgress(seed));
}

watch(
  () => props.pageId,
  async (pageId) => {
    const currentPageId = pageEntry.value?.id || pageId;
    activeComponent.value = null;
    activeComponentPageId.value = "";
    loadError.value = "";
    isPageLoading.value = false;
    stopLoadingProgress(0);

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
    startLoadingProgress();

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
      stopLoadingProgress(100);
    } catch (error) {
      if (props.pageId !== currentPageId) {
        return;
      }

      loadError.value = error instanceof Error ? error.message : "Failed to load page component.";
      stopLoadingProgress(100);
    } finally {
      if (props.pageId === currentPageId) {
        isPageLoading.value = false;
      }
    }
  },
  { immediate: true, flush: "sync" },
);

onBeforeUnmount(() => {
  loadingProgressSeed += 1;
  stopLoadingProgress(0);
});

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
    <div class="page-loader__panel">
      <div class="page-loader__signal" aria-hidden="true">
        <span class="page-loader__signal-ring page-loader__signal-ring--outer"></span>
        <span class="page-loader__signal-ring page-loader__signal-ring--inner"></span>
        <span class="page-loader__signal-core"></span>
      </div>

      <p class="page-loader__eyebrow">LOADING</p>
      <strong>{{ loadingHeadline }}</strong>
      <p>{{ loadingDescription }}</p>

      <div
        class="page-loader__progress"
        role="progressbar"
        :aria-valuenow="loadingProgress"
        aria-valuemin="0"
        aria-valuemax="100"
        :aria-valuetext="`${loadingStageLabel} ${loadingProgress}%`"
      >
        <span class="page-loader__progress-fill" :style="{ width: `${loadingProgress}%` }"></span>
      </div>

      <div class="page-loader__meta">
        <span>{{ loadingStageLabel }}</span>
        <strong class="page-loader__percent">{{ loadingProgress }}%</strong>
      </div>

      <div class="page-loader__steps" aria-hidden="true">
        <span :class="{ 'is-active': loadingProgress >= 14 }">载入</span>
        <span :class="{ 'is-active': loadingProgress >= 46 }">准备</span>
        <span :class="{ 'is-active': loadingProgress >= 78 }">完成</span>
      </div>
    </div>
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
.page-loader {
  min-height: calc(var(--ihc-page-min-height) - 36px);
  display: grid;
  place-items: center;
  padding: 10px 0;
}

.page-loader__panel {
  position: relative;
  width: min(100%, 332px);
  padding: 28px 24px 24px;
  border: 1px solid rgba(255, 255, 255, 0.78);
  border-radius: 28px;
  overflow: hidden;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.97) 0%, rgba(246, 251, 255, 0.98) 100%);
  box-shadow:
    0 24px 56px rgba(46, 90, 132, 0.12),
    inset 0 1px 0 rgba(255, 255, 255, 0.92);
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
  border: 1px solid rgba(92, 170, 212, 0.16);
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
  background: linear-gradient(135deg, #75d6df 0%, #7be28e 100%);
  box-shadow:
    0 0 0 10px rgba(117, 214, 223, 0.12),
    0 14px 28px rgba(64, 152, 164, 0.26);
  animation: page-loader-core 1.9s ease-in-out infinite;
}

.page-loader__eyebrow {
  position: relative;
  z-index: 1;
  margin: 0 0 10px;
  color: #57a6ba;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.22em;
  text-align: center;
}

.page-loader strong,
.page-error strong {
  position: relative;
  z-index: 1;
  font-size: 22px;
  line-height: 1.3;
  text-align: center;
}

.page-error strong {
  font-size: 18px;
}

.page-loader p,
.page-error p {
  position: relative;
  z-index: 1;
  margin: 0;
  color: var(--muted);
  line-height: 1.7;
  text-align: center;
}

.page-loader p {
  margin-bottom: 18px;
  font-size: 14px;
}

.page-loader__progress {
  position: relative;
  z-index: 1;
  width: 100%;
  height: 12px;
  overflow: hidden;
  border-radius: 999px;
  background: linear-gradient(180deg, rgba(117, 214, 223, 0.12) 0%, rgba(123, 226, 142, 0.18) 100%);
  box-shadow: inset 0 1px 3px rgba(69, 101, 129, 0.08);
}

.page-loader__progress-fill {
  position: relative;
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #75d6df 0%, #68b8f3 48%, #7be28e 100%);
  box-shadow: 0 8px 18px rgba(91, 178, 210, 0.24);
  transition: width 180ms ease;
}

.page-loader__progress-fill::after {
  position: absolute;
  inset: 0;
  content: "";
  background: linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.36) 48%, transparent 100%);
  transform: translateX(-100%);
  animation: page-loader-sheen 1.6s ease-in-out infinite;
}

.page-loader__meta {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 12px;
  color: #5f728c;
  font-size: 12px;
  font-weight: 800;
}

.page-loader__percent {
  color: #2f9eb4;
  font-size: 14px;
}

.page-loader__steps {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-top: 18px;
}

.page-loader__steps span {
  display: grid;
  place-items: center;
  min-height: 34px;
  border-radius: 12px;
  background: rgba(239, 245, 253, 0.9);
  color: #9aa9bc;
  font-size: 12px;
  font-weight: 900;
  transition:
    background 180ms ease,
    color 180ms ease,
    transform 180ms ease,
    box-shadow 180ms ease;
}

.page-loader__steps span.is-active {
  background: rgba(117, 214, 223, 0.16);
  color: #2d92a9;
  box-shadow: inset 0 0 0 1px rgba(117, 214, 223, 0.16);
  transform: translateY(-1px);
}

.page-error {
  display: grid;
  gap: 8px;
  padding: 24px 20px;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 18px 42px rgba(34, 67, 118, 0.1);
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

@keyframes page-loader-sheen {
  100% {
    transform: translateX(160%);
  }
}

@media (prefers-reduced-motion: reduce) {
  .page-loader__signal-ring,
  .page-loader__signal-core,
  .page-loader__progress-fill::after {
    animation: none;
  }

  .page-loader__progress-fill,
  .page-loader__steps span {
    transition: none;
  }
}
</style>
