<script setup lang="ts">
import { computed, ref } from "vue";
import type { PageComponentProps } from "@ihc/page-core/types";
import { Leaf, Sport, Stopwatch } from "@icon-park/vue-next";
import stepsRingImage from "@/assets/health/img.png";
import mock from "./mock";

const props = defineProps<PageComponentProps>();

type HistoryMode = "steps" | "distance";

const historyMode = ref<HistoryMode>("steps");

const healthList = computed(() => {
  if (mock?.list && Array.isArray(mock.list) && mock.list.length > 0) {
    return mock.list;
  }

  return null;
});

const stepsData = computed(() =>
  healthList.value?.map((item) => ({
    date: item.date,
    steps: item.steps,
    distance: item.distance ?? 0,
  })) ?? [],
);

const maxSteps = computed(() => Math.max(...stepsData.value.map((item) => item.steps), 1));
const maxDistance = computed(() => Math.max(...stepsData.value.map((item) => item.distance), 1));

const routeNames = ["慢跑 前往鸽岗公园", "徒步 前往大蜀山", "慢跑 前往鸽岗公园", "饭后散步 社区花园"];

const historyItems = computed(() =>
  [...stepsData.value]
    .reverse()
    .map((item, index) => {
      const value = historyMode.value === "steps" ? item.steps : item.distance;
      const max = historyMode.value === "steps" ? maxSteps.value : maxDistance.value;
      const progress = Math.max(12, Math.min(100, (value / max) * 100));

      return {
        ...item,
        day: item.date.slice(8),
        month: `${Number(item.date.slice(5, 7))}月`,
        title: routeNames[index % routeNames.length],
        progress,
        duration: index === 0 ? "25分钟" : index === 1 ? "您已经完成了这项练习" : "20分钟",
        calories: Math.max(120, Math.round(item.steps * 0.064)),
        primary: historyMode.value === "steps" ? `${formatNumber(item.steps)}步` : `${item.distance.toFixed(1)}公里`,
        completed: index === 1,
      };
    }),
);

function formatNumber(num: number) {
  return num.toLocaleString();
}

function goBack() {
  if (props.navigation?.navigateTo) {
    props.navigation.navigateTo("health/health-data");
    return;
  }

  window.history.back();
}
</script>

<template>
  <section class="steps-page">
    <header class="page-header">
      <button class="back-btn" type="button" aria-label="返回" @click="goBack">
        <span aria-hidden="true"></span>
      </button>
      <h1>步数详情</h1>
    </header>

    <main v-if="healthList" class="steps-scroll">
      <section class="steps-hero" aria-label="总步数">
        <img class="steps-ring-image" :src="stepsRingImage" alt="总步数" draggable="false" />
      </section>

      <section class="legend-row" aria-label="步数图例">
        <span><i class="legend-dot legend-dot--done"></i>已完成</span>
        <span><i class="legend-dot legend-dot--remaining"></i>剩余</span>
        <span><i class="legend-dot legend-dot--challenge"></i>挑战</span>
      </section>

      <section class="history-panel">
        <span class="panel-handle" aria-hidden="true"></span>
        <header class="history-header">
          <h2>{{ historyMode === "steps" ? "历史步数" : "历史距离" }}</h2>
          <button type="button" @click="props.showToast('查看全部功能待接入')">查看全部</button>
        </header>

        <div class="history-switch" role="tablist" aria-label="历史数据类型">
          <button type="button" :class="{ active: historyMode === 'steps' }" @click="historyMode = 'steps'">历史步数</button>
          <button type="button" :class="{ active: historyMode === 'distance' }" @click="historyMode = 'distance'">历史距离</button>
        </div>

        <div class="history-list">
          <article v-for="item in historyItems" :key="item.date" class="history-card">
            <div class="date-box">
              <strong>{{ item.day }}</strong>
              <span>{{ item.month }}</span>
            </div>
            <div class="history-content">
              <h3>{{ item.title }}</h3>
              <div class="progress-track">
                <span :class="{ completed: item.completed }" :style="{ width: `${item.progress}%` }"></span>
              </div>
              <div v-if="item.completed" class="complete-text">
                <i aria-hidden="true"></i>
                {{ item.duration }}
              </div>
              <div v-else class="history-metrics">
                <span class="metric-time">
                  <Stopwatch theme="filled" size="17" fill="currentColor" />
                  {{ item.duration }}
                </span>
                <span class="metric-steps">
                  <Sport theme="filled" size="17" fill="currentColor" />
                  {{ item.primary }}
                </span>
                <span class="metric-calories">
                  <Leaf theme="filled" size="17" fill="currentColor" />
                  {{ item.calories }}kcal
                </span>
              </div>
            </div>
          </article>
        </div>
      </section>

      <article class="next-steps-card" v-if="false && mock.nextSteps && mock.nextSteps.length">
        <p class="page-eyebrow">Roadmap</p>
        <strong>后续计划</strong>
        <ol>
          <li v-for="item in mock.nextSteps" :key="item">{{ item }}</li>
        </ol>
      </article>
    </template>

    <div v-else class="error-card">
      <strong>数据加载失败</strong>
      <p>请检查 mock.ts 文件，确保导出了有效的 `list` 数组。</p>
    </div>
  </section>
</template>

<style scoped>
.steps-page {
  position: relative;
  left: 50%;
  width: min(390px, 100vw);
  height: min(844px, calc(100vh - 36px));
  min-height: min(844px, calc(100vh - 36px));
  max-height: 844px;
  margin: -18px 0;
  overflow: hidden;
  background: #ecffd3;
  color: #283528;
  font-family: "PingFang SC", "Microsoft YaHei", sans-serif;
  transform: translateX(-50%);
  -webkit-font-smoothing: antialiased;
}

.page-header {
  display: flex;
  align-items: center;
  gap: 17px;
  height: 98px;
  padding: 0 30px;
}

.back-btn {
  display: grid;
  place-items: center;
  width: 36px;
  height: 44px;
  padding: 0;
  border: 0;
  background: transparent;
}

.back-btn span {
  width: 17px;
  height: 17px;
  border-bottom: 3px solid #283528;
  border-left: 3px solid #283528;
  transform: rotate(45deg) translate(3px, -3px);
}

.page-header h1 {
  margin: 0;
  color: #283528;
  font-size: 22px;
  font-weight: 900;
  letter-spacing: 0.02em;
}

.steps-scroll {
  height: calc(100% - 98px);
  overflow-y: auto;
  scrollbar-width: none;
}

.steps-scroll::-webkit-scrollbar {
  display: none;
}

.steps-hero {
  position: relative;
  display: grid;
  place-items: center;
  height: 330px;
  margin: 0 30px;
}

.steps-ring-image {
  display: block;
  width: 278px;
  height: 278px;
  object-fit: contain;
  user-select: none;
}

.legend-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin: 0 36px 38px;
  color: rgba(40, 53, 40, 0.6);
  font-size: 18px;
  font-weight: 900;
}

.legend-row span {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

.legend-dot {
  width: 16px;
  height: 16px;
  border-radius: 5px;
}

.legend-dot--done {
  background: #c4f75e;
}

.legend-dot--remaining {
  background: #3f6b12;
}

.legend-dot--challenge {
  background: #8bdd08;
}

.history-panel {
  position: relative;
  min-height: 395px;
  padding: 55px 30px 34px;
  border-radius: 44px 44px 0 0;
  background: #ffffff;
}

.panel-handle {
  position: absolute;
  top: 12px;
  left: 50%;
  width: 84px;
  height: 5px;
  border-radius: 999px;
  background: #d9d9d9;
  transform: translateX(-50%);
}

.history-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.history-header h2 {
  margin: 0;
  color: #283528;
  font-size: 22px;
  font-weight: 900;
}

.history-header button {
  padding: 0;
  border: 0;
  background: transparent;
  color: #67c60d;
  font-size: 17px;
  font-weight: 900;
}

.history-switch {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin-bottom: 16px;
  padding: 5px;
  border-radius: 999px;
  background: #f1f6ec;
}

.history-switch button {
  height: 36px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: rgba(40, 53, 40, 0.58);
  font-size: 15px;
  font-weight: 900;
}

.history-switch button.active {
  background: #8bdd08;
  color: #ffffff;
  box-shadow: 0 8px 18px rgba(139, 221, 8, 0.22);
}

.history-list {
  display: grid;
  gap: 14px;
}

.history-card {
  display: grid;
  grid-template-columns: 76px minmax(0, 1fr);
  gap: 12px;
  align-items: center;
  min-height: 102px;
  padding: 14px;
  border-radius: 28px;
  background: #f5f5f5;
}

.date-box {
  display: grid;
  place-items: center;
  align-content: center;
  width: 76px;
  height: 78px;
  border-radius: 24px;
  background: #ffffff;
}

.date-box strong {
  color: #283528;
  font-size: 22px;
  font-weight: 900;
  line-height: 1;
}

.date-box span {
  margin-top: 9px;
  color: rgba(40, 53, 40, 0.58);
  font-size: 15px;
  font-weight: 900;
}

.history-content {
  min-width: 0;
}

.history-content h3 {
  margin: 0 0 13px;
  overflow: hidden;
  color: #283528;
  font-size: 17px;
  font-weight: 900;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.progress-track {
  height: 7px;
  overflow: hidden;
  border-radius: 999px;
  background: #ffffff;
}

.progress-track span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: #f6ca21;
}

.progress-track span.completed {
  background: #8bdd08;
}

.history-metrics,
.complete-text {
  align-items: center;
  margin-top: 11px;
  color: #283528;
  font-size: 13px;
  font-weight: 700;
}

.history-metrics {
  display: grid;
  grid-template-columns: repeat(3, max-content);
  justify-content: space-between;
  gap: 8px;
}

.complete-text {
  display: flex;
  gap: 8px;
}

.history-metrics span,
.complete-text {
  min-width: 0;
}

.history-metrics span {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
}

.history-metrics :deep(.i-icon) {
  flex: 0 0 auto;
  color: #7b8777;
}

.complete-text {
  color: #283528;
}

.complete-text i {
  width: 18px;
  height: 18px;
  border-radius: 6px;
  background: #8bdd08;
}

.error-card {
  margin: 40px 30px;
  padding: 28px;
  border-radius: 28px;
  background: #ffffff;
  text-align: center;
  color: #c62828;
}

.error-card strong {
  display: block;
  margin-bottom: 8px;
  font-size: 20px;
}
.health-data-page :is(.medication-nav h1, .chart-switch button, .small-card-label, .small-card-date, .latest-small-card strong, .latest-card-summary span, .latest-card-summary p, .metric-block span, .metric-block strong, .metric-block small, .detail-card__header h2, .metric-table th, .metric-table td, .steps-table th, .steps-table td) {
  white-space: nowrap;
}

.health-data-page :is(.medication-nav h1, .chart-switch button, .small-card-label, .small-card-date, .latest-small-card strong, .latest-card-summary span, .latest-card-summary p, .metric-block span, .metric-block strong, .metric-block small, .detail-card__header h2) {
  overflow: hidden;
  text-overflow: ellipsis;
}

.health-data-page :is(.table-wrapper) {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.health-data-page :is(.metric-table, .steps-table) {
  width: max-content;
  min-width: 100%;
}

.health-data-page :is(.metric-table th, .metric-table td, .steps-table th, .steps-table td) {
  padding-right: 6px;
  padding-left: 6px;
  font-size: 12px;
  word-break: keep-all;
  overflow-wrap: normal;
}
</style>
