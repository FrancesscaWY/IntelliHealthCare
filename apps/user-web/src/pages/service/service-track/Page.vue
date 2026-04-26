<script setup lang="ts">
import { onMounted } from "vue";
import type { PageComponentProps } from "@ihc/page-core/types";
import { formatOrderTime, useOrderCenter } from "@/pages/service/order-center";

const props = defineProps<PageComponentProps>();
const { currentOrderTimeline, ensureCurrentTimeline } = useOrderCenter();

function goBack() {
  if (!props.navigation.navigateBack()) {
    props.navigation.reLaunch("service/order-detail");
  }
}

onMounted(() => {
  void ensureCurrentTimeline();
});
</script>

<template>
  <div class="service-track-page">
    <header class="page-header">
      <button class="back-button" type="button" aria-label="返回" @click="goBack">‹</button>
      <h1>服务跟踪</h1>
    </header>

    <main class="track-content">
      <section class="track-card">
        <article
          v-for="(step, index) in currentOrderTimeline"
          :key="step.timelineId"
          class="track-step"
          :class="{ active: index === currentOrderTimeline.length - 1 }"
        >
          <time>{{ formatOrderTime(step.createdAt) }}</time>
          <div class="track-line">
            <span class="dot"></span>
            <span v-if="index < currentOrderTimeline.length - 1" class="line"></span>
          </div>
          <div class="track-text">
            <h2>{{ step.title }}</h2>
            <p v-if="step.description">{{ step.description }}</p>
          </div>
        </article>
      </section>
    </main>
  </div>
</template>

<style scoped>
.service-track-page { position: relative; left: 50%; width: min(402px, 100vw); min-height: 874px; margin: -18px 0; transform: translateX(-50%); padding: 16px 14px 40px; box-sizing: border-box; background: #f5f6f7; color: #34383f; font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif; }
.page-header { height: 64px; display: flex; align-items: center; margin-bottom: 34px; }
.back-button { width: 24px; height: 32px; display: flex; align-items: center; justify-content: center; margin: 0 8px 0 -4px; padding: 0; border: 0; background: transparent; color: #34383f; font-size: 34px; line-height: 26px; font-weight: 300; cursor: pointer; }
.page-header h1 { margin: 0; color: #34383f; font-size: 22px; font-weight: 600; }
.track-card { min-height: 330px; padding: 34px 28px 24px; border-radius: 16px; background: #fff; box-sizing: border-box; }
.track-step { display: grid; grid-template-columns: 112px 36px 1fr; min-height: 86px; color: #b8bbc1; }
.track-step time { padding-top: 2px; font-size: 15px; font-weight: 600; white-space: nowrap; }
.track-line { position: relative; display: flex; justify-content: center; }
.dot { width: 9px; height: 9px; margin-top: 8px; border-radius: 50%; background: #cfd1d5; z-index: 2; }
.line { position: absolute; top: 21px; bottom: -8px; left: 50%; width: 1px; transform: translateX(-50%); background: repeating-linear-gradient(to bottom,#e5e6e9 0,#e5e6e9 4px,transparent 4px,transparent 8px); }
.track-text { padding-left: 20px; }
.track-text h2 { margin: 0; color: #9699a0; font-size: 17px; font-weight: 700; }
.track-text p { margin: 18px 0 0; color: #9699a0; font-size: 16px; font-weight: 600; }
.track-step.active { color: #34383f; }
.track-step.active .dot { width: 10px; height: 10px; background: #34383f; }
.track-step.active .track-text h2 { color: #34383f; }
</style>
