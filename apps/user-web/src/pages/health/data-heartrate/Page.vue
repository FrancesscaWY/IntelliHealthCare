<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import type { PageComponentProps } from "@ihc/page-core/types";
import { Like } from "@icon-park/vue-next";
import { loadHeartRateSource } from "../measurement-source";

type ChartMode = "day" | "week" | "month" | "all";

type RangeChartItem = {
  label: string;
  low: number;
  avg: number;
  high: number;
};

const props = defineProps<PageComponentProps>();
const isLoading = ref(true);
const pageData = ref<Awaited<ReturnType<typeof loadHeartRateSource>>>({
  list: [],
  dailyTimeline: [],
  monthlyData: []
});

const healthList = computed(() => {
  if (pageData.value.list.length > 0) {
    return pageData.value.list;
  }
  return null;
});

const selectedChartMode = ref<ChartMode>("day");

const heartRateData = computed(
  () =>
    healthList.value?.map((item) => ({
      date: item.date,
      heartRate: item.heartRate,
      lowHeartRate: item.lowHeartRate ?? item.heartRate,
      highHeartRate: item.highHeartRate ?? item.heartRate,
    })) ?? []
);

const heartRateValues = computed(() => heartRateData.value.map((item) => item.heartRate));
const averageHeartRate = computed(() =>
  heartRateValues.value.length
    ? Math.round(heartRateValues.value.reduce((sum, value) => sum + value, 0) / heartRateValues.value.length)
    : 0
);
const maxHeartRate = computed(() =>
  heartRateData.value.length ? Math.max(...heartRateData.value.map((item) => item.highHeartRate)) : 0
);
const minHeartRate = computed(() =>
  heartRateData.value.length ? Math.min(...heartRateData.value.map((item) => item.lowHeartRate)) : 0
);
const maxDate = computed(
  () => heartRateData.value.find((item) => item.highHeartRate === maxHeartRate.value)?.date || ""
);
const minDate = computed(
  () => heartRateData.value.find((item) => item.lowHeartRate === minHeartRate.value)?.date || ""
);

const heartHistoryTitles = ["晨间静息心率", "日常心率记录", "运动后恢复", "夜间心率回落"];

const latest = computed(
  () =>
    heartRateData.value[heartRateData.value.length - 1] || {
      date: "",
      heartRate: 0,
      lowHeartRate: 0,
      highHeartRate: 0,
    }
);
const previous = computed(() => heartRateData.value[heartRateData.value.length - 2] ?? latest.value);
const change = computed(() => latest.value.heartRate - previous.value.heartRate);
const latestChangeText = computed(() => {
  if (change.value === 0) return "较前一日持平";
  return change.value > 0
    ? `较前一日增加 ${formatNumber(change.value)} bpm`
    : `较前一日减少 ${formatNumber(Math.abs(change.value))} bpm`;
});

const dailyTimeline = computed(() => {
  const entry = pageData.value.dailyTimeline.find((item) => item.date === latest.value.date);
  return entry?.items ?? [];
});

function createHeartHeroChart(items: RangeChartItem[], width = 336, height = 236) {
  if (!items.length) {
    return {
      width,
      height,
      axisY: 184,
      labelY: 216,
      guideLines: [42, 83, 124, 165],
      columns: [],
    };
  }

  const left = 28;
  const right = 24;
  const top = 42;
  const bottom = 154;
  const axisY = 184;
  const labelY = 216;
  const innerWidth = width - left - right;
  const values = items.flatMap((item) => [item.low, item.high]);
  const minValue = values.length ? Math.min(...values) : 50;
  const maxValue = values.length ? Math.max(...values) : 100;
  const min = Math.max(40, Math.floor((minValue - 6) / 10) * 10);
  const max = Math.ceil((maxValue + 4) / 10) * 10;
  const range = max - min || 1;
  const getY = (value: number) => bottom - ((value - min) / range) * (bottom - top);
  const step = items.length > 1 ? innerWidth / (items.length - 1) : 0;

  return {
    width,
    height,
    axisY,
    labelY,
    guideLines: [42, 83, 124, 165],
    columns: items.map((item, index) => {
      const high = item.high;
      const low = item.low;
      const highY = getY(high);
      const lowY = getY(low);
      const centerX = left + index * step;

      return {
        item,
        high,
        low,
        centerX,
        x: centerX - 9,
        y: highY,
        width: 18,
        height: Math.max(24, lowY - highY),
        highLabelY: Math.max(18, highY - 11),
        lowLabelY: Math.min(axisY - 12, lowY + 20),
      };
    }),
  };
}

const chartItems = computed<RangeChartItem[]>(() => {
  if (selectedChartMode.value === "day") {
    return dailyTimeline.value.map((item) => ({
      label: item.time,
      low: item.lowHeartRate ?? item.heartRate,
      avg: item.heartRate,
      high: item.highHeartRate ?? item.heartRate,
    }));
  }

  if (selectedChartMode.value === "week") {
    return heartRateData.value.map((item) => ({
      label: item.date.slice(5),
      low: item.lowHeartRate,
      avg: item.heartRate,
      high: item.highHeartRate,
    }));
  }

  if (selectedChartMode.value === "all") {
    return heartRateData.value.map((item) => ({
      label: item.date.slice(5),
      low: item.lowHeartRate,
      avg: item.heartRate,
      high: item.highHeartRate,
    }));
  }

  return pageData.value.monthlyData.map((item) => ({
    label: item.week,
    low: item.lowHeartRate ?? item.heartRate,
    avg: item.heartRate,
    high: item.highHeartRate ?? item.heartRate,
  }));
});

const chartTitle = computed(() => {
  if (selectedChartMode.value === "day") return "今日每小时心率";
  if (selectedChartMode.value === "week") return "近7天心率趋势";
  if (selectedChartMode.value === "all") return "全部心率趋势";
  return "本月每周心率趋势";
});

const heartHeroChart = computed(() => createHeartHeroChart(chartItems.value));

const heartHistoryItems = computed(() => {
  const min = minHeartRate.value || 0;
  const span = Math.max(maxHeartRate.value - min, 1);

  return heartRateData.value
    .map((item, index) => ({
      ...item,
      day: item.date.slice(8),
      month: `${Number(item.date.slice(5, 7))}月`,
      title: heartHistoryTitles[index % heartHistoryTitles.length],
      progress: Math.max(18, Math.min(100, ((item.highHeartRate - min) / span) * 100)),
      range: `${formatNumber(item.lowHeartRate)}-${formatNumber(item.highHeartRate)} bpm`,
      primary: `${formatNumber(item.heartRate)} bpm`,
      changeLabel: formatChange(index),
      changeClass: getChangeClass(index),
      highlighted: index === heartRateData.value.length - 1,
    }))
    .reverse();
});

function formatNumber(num: number) {
  return num.toLocaleString();
}

function formatChange(idx: number) {
  if (idx === 0) return "—";
  const diff = heartRateData.value[idx].heartRate - heartRateData.value[idx - 1].heartRate;
  if (diff === 0) return "持平";
  return `${diff > 0 ? "+" : ""}${diff} bpm`;
}

function getChangeClass(idx: number) {
  if (idx === 0) return "";
  const diff = heartRateData.value[idx].heartRate - heartRateData.value[idx - 1].heartRate;
  if (diff > 0) return "positive";
  if (diff < 0) return "negative";
  return "";
}

function goBack() {
  if (props.navigation?.navigateBack?.()) {
    return;
  }

  if (props.navigation?.reLaunch) {
    props.navigation.reLaunch("health/health-data");
    return;
  }

  window.history.back();
}

function goToAddData() {
  sessionStorage.setItem("addMetric", "heartRate");
  sessionStorage.setItem("addReturnPath", "health/data-heartrate");
  props.navigation?.navigateTo?.("health/add-data");
}

async function loadPageData() {
  try {
    pageData.value = await loadHeartRateSource();
  } finally {
    isLoading.value = false;
  }
}

onMounted(() => {
  void loadPageData();
});
</script>

<template>
  <section class="heart-page">
    <main v-if="healthList" class="heart-scroll">
      <header class="page-header">
        <button class="back-btn" type="button" aria-label="返回" @click="goBack">
          <span aria-hidden="true"></span>
        </button>
        <h1>心率监测</h1>
      </header>

      <section class="reading-row" aria-label="当前心率">
        <div class="current-reading">
          <strong>{{ formatNumber(latest.lowHeartRate) }}</strong>
          <span>bpm</span>
        </div>
        <button class="heart-action" type="button" aria-label="心率">
          <Like theme="filled" size="40" fill="#ffffff" aria-hidden="true" />
        </button>
      </section>

      <div class="history-switch" role="tablist" aria-label="心率趋势类型">
        <button type="button" :class="{ active: selectedChartMode === 'day' }" @click="selectedChartMode = 'day'">日</button>
        <button type="button" :class="{ active: selectedChartMode === 'week' }" @click="selectedChartMode = 'week'">周</button>
        <button type="button" :class="{ active: selectedChartMode === 'month' }" @click="selectedChartMode = 'month'">月</button>
        <button type="button" :class="{ active: selectedChartMode === 'all' }" @click="selectedChartMode = 'all'">全部</button>
      </div>

      <section class="heart-hero" :aria-label="chartTitle">
        <div class="heart-chart-card">
          <svg
            class="heart-hero-chart"
            :viewBox="'0 0 ' + heartHeroChart.width + ' ' + heartHeroChart.height"
            preserveAspectRatio="none"
          >
            <g class="heart-hero-grid">
              <line
                v-for="(lineY, index) in heartHeroChart.guideLines"
                :key="`hero-guide-${index}`"
                x1="28"
                :y1="lineY"
                :x2="heartHeroChart.width - 24"
                :y2="lineY"
              />
            </g>
            <line
              x1="28"
              :y1="heartHeroChart.axisY"
              :x2="heartHeroChart.width - 24"
              :y2="heartHeroChart.axisY"
              class="heart-hero-axis"
            />
            <g>
              <template v-for="(column, index) in heartHeroChart.columns" :key="`hero-column-${index}`">
                <text :x="column.centerX" :y="column.highLabelY" text-anchor="middle" class="hero-label hero-label--high">
                  {{ column.high }}
                </text>
                <rect
                  :x="column.x"
                  :y="column.y"
                  :width="column.width"
                  :height="column.height"
                  rx="11"
                  class="heart-hero-bar"
                />
                <text :x="column.centerX" :y="column.lowLabelY" text-anchor="middle" class="hero-label hero-label--low">
                  {{ column.low }}
                </text>
                <text :x="column.centerX" :y="heartHeroChart.labelY" text-anchor="middle" class="hero-time">
                  {{ column.item.label }}
                </text>
              </template>
            </g>
            </svg>
          </div>
        </section>

      <section class="latest-summary">
        <span>当日区间</span>
        <strong>{{ formatNumber(latest.lowHeartRate) }}-{{ formatNumber(latest.highHeartRate) }}</strong>
        <p>{{ latestChangeText }}</p>
      </section>

      <section class="history-section">
        <header class="history-header">
          <h2>每日心率</h2>
        </header>
        <div class="history-list">
          <article
            v-for="item in heartHistoryItems"
            :key="item.date"
            class="history-card"
            :class="{ highlighted: item.highlighted }"
          >
            <div class="date-box">
              <strong>{{ item.day }}</strong>
              <span>{{ item.month }}</span>
            </div>
            <div class="history-content">
              <h3>{{ item.title }}</h3>
              <div class="progress-track">
                <span :style="{ width: `${item.progress}%` }"></span>
              </div>
              <div class="history-metrics">
                <span>{{ item.primary }}</span>
                <span>{{ item.range }}</span>
                <span class="metric-change" :class="item.changeClass">{{ item.changeLabel }}</span>
              </div>
            </div>
          </article>
        </div>
      </section>

      <button class="add-btn" type="button" @click="goToAddData">+ 添加心率记录</button>
    </main>

    <div v-else-if="isLoading" class="error-card">
      <strong>加载中...</strong>
    </div>

    <div v-else class="error-card">
      <strong>数据加载失败</strong>
      <p>请检查 `mock.ts` 文件，确保导出了有效的 `list` 数组。</p>
    </div>
  </section>
</template>

<style scoped>
.heart-page {
  position: relative;
  left: 50%;
  width: min(390px, 100vw);
  height: min(844px, calc(100vh - 36px));
  min-height: min(844px, calc(100vh - 36px));
  max-height: 844px;
  margin: -18px 0;
  overflow: hidden;
  background: #ffffff;
  color: #2d3b31;
  font-family: "PingFang SC", "Microsoft YaHei", sans-serif;
  transform: translateX(-50%);
  -webkit-font-smoothing: antialiased;
}

.page-header {
  display: flex;
  align-items: center;
  height: 74px;
  padding: 0 9px;
}

.back-btn {
  display: grid;
  place-items: center;
  width: 30px;
  height: 44px;
  padding: 0;
  border: 0;
  background: transparent;
}

.back-btn span {
  width: 14px;
  height: 14px;
  border-bottom: 4px solid #333333;
  border-left: 4px solid #333333;
  transform: rotate(45deg);
}

.page-header h1 {
  margin: 0 0 0 9px;
  color: #30343f;
  font-size: 24px;
  font-weight: 500;
  letter-spacing: 0.03em;
}

.heart-scroll {
  box-sizing: border-box;
  height: 100%;
  padding: 0 20px 32px;
  overflow-y: auto;
  scrollbar-width: none;
}

.heart-scroll::-webkit-scrollbar {
  display: none;
}

.reading-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 18px 8px 28px;
}

.current-reading {
  display: flex;
  align-items: baseline;
}

.current-reading strong {
  color: #2d3b31;
  font-size: 86px;
  font-weight: 900;
  letter-spacing: 0;
  line-height: 0.86;
}

.current-reading span {
  margin-left: 2px;
  color: rgba(45, 59, 49, 0.72);
  font-size: 33px;
  font-weight: 900;
}

.heart-action {
  display: grid;
  place-items: center;
  width: 84px;
  height: 84px;
  border: 0;
  border-radius: 26px;
  background: #f73362;
}

.heart-action :deep(.i-icon) {
  color: #ffffff;
}

.heart-hero {
  display: grid;
  place-items: center;
  height: 248px;
  margin: 14px 0 0;
}

.heart-chart-card {
  width: 100%;
  height: 236px;
  padding: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}

.heart-hero-chart {
  display: block;
  width: 100%;
  height: 100%;
}

.heart-hero-grid line {
  stroke: rgba(244, 63, 94, 0.14);
  stroke-width: 1.2;
  stroke-dasharray: 5 7;
}

.heart-hero-axis {
  stroke: rgba(59, 37, 43, 0.18);
  stroke-width: 1.7;
}

.heart-hero-bar {
  fill: #ef4660;
}

.hero-label {
  font-size: 11px;
  font-weight: 900;
}

.hero-label--high {
  fill: #d71943;
}

.hero-label--low,
.hero-time {
  fill: rgba(59, 37, 43, 0.5);
}

.hero-time {
  font-size: 13px;
  font-weight: 900;
}

.history-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.history-header h2 {
  margin: 0;
  color: #2d3b31;
  font-size: 20px;
  font-weight: 900;
}

.history-header button {
  padding: 0;
  border: 0;
  background: transparent;
  color: #e11d48;
  font-size: 17px;
  font-weight: 900;
}

.history-switch {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0;
  height: 41px;
  margin: 0 0 10px;
  padding: 0;
  overflow: hidden;
  border: 1.5px solid #2d3b31;
  border-radius: 14px;
  background: #ffffff;
}

.history-switch button {
  height: 100%;
  border: 0;
  border-radius: 0;
  background: transparent;
  color: rgba(45, 59, 49, 0.46);
  font-size: 16px;
  font-weight: 900;
}

.history-switch button.active {
  border-radius: 13px;
  background: #2d3b31;
  color: #ffffff;
  box-shadow: none;
}

.latest-summary {
  margin: 12px 0 0;
  padding: 16px 18px;
  border-radius: 16px;
  background: #f7f7f7;
}

.latest-summary span {
  color: rgba(45, 59, 49, 0.58);
  font-size: 14px;
  font-weight: 900;
}

.latest-summary strong {
  display: block;
  margin: 6px 0 5px;
  color: #2d3b31;
  font-size: 24px;
  font-weight: 900;
}

.latest-summary p {
  margin: 0;
  color: rgba(45, 59, 49, 0.58);
  font-size: 13px;
  font-weight: 900;
}

.history-section {
  margin-top: 24px;
}

.history-list {
  display: grid;
  gap: 10px;
}

.history-card {
  display: grid;
  grid-template-columns: 58px minmax(0, 1fr);
  gap: 11px;
  align-items: center;
  min-height: 82px;
  padding: 12px;
  border-radius: 16px;
  background: #f7f7f7;
}

.history-card.highlighted {
  background: #fff3f5;
}

.date-box {
  display: grid;
  place-items: center;
  align-content: center;
  width: 58px;
  height: 58px;
  border-radius: 14px;
  background: #ffffff;
}

.date-box strong {
  color: #2d3b31;
  font-size: 19px;
  font-weight: 900;
  line-height: 1;
}

.date-box span {
  margin-top: 6px;
  color: rgba(45, 59, 49, 0.58);
  font-size: 13px;
  font-weight: 900;
}

.history-content {
  min-width: 0;
}

.history-content h3 {
  margin: 0 0 10px;
  overflow: hidden;
  color: #2d3b31;
  font-size: 16px;
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
  background: #f73362;
}

.history-metrics {
  display: grid;
  grid-template-columns: repeat(3, max-content);
  justify-content: space-between;
  gap: 8px;
  align-items: center;
  margin-top: 9px;
  color: #2d3b31;
  font-size: 12px;
  font-weight: 700;
}

.history-metrics span {
  min-width: 0;
  white-space: nowrap;
}

.metric-change.positive {
  color: #be123c;
}

.metric-change.negative {
  color: #16a34a;
}

.add-btn {
  width: 100%;
  height: 58px;
  margin-top: 18px;
  border: 0;
  border-radius: 13px;
  background: #e11d48;
  box-shadow: 0 14px 28px rgba(225, 29, 72, 0.18);
  color: #ffffff;
  font-size: 20px;
  font-weight: 900;
  letter-spacing: 0.02em;
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

@media (max-width: 389px) {
  .history-metrics {
    grid-template-columns: 1fr;
    gap: 5px;
  }
}
</style>
