<script setup lang="ts">
import { computed, ref } from "vue";
import type { PageComponentProps } from "@ihc/page-core/types";
import mock from "./mock";

type ChartMode = "day" | "week" | "month";

type RangeChartItem = {
  label: string;
  low: number;
  avg: number;
  high: number;
};

const props = defineProps<PageComponentProps>();

const healthList = computed(() => {
  if (mock && Array.isArray(mock.list) && mock.list.length > 0) {
    return mock.list;
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

const dailyTimeline = computed(() => {
  const entry = mock.dailyTimeline?.find((item) => item.date === latest.value.date);
  return entry?.items ?? [];
});

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

  return (mock.monthlyData ?? []).map((item) => ({
    label: item.week,
    low: item.lowHeartRate ?? item.heartRate,
    avg: item.heartRate,
    high: item.highHeartRate ?? item.heartRate,
  }));
});

const chartTitle = computed(() => {
  if (selectedChartMode.value === "day") return "今日每小时心率";
  if (selectedChartMode.value === "week") return "近7天心率趋势";
  return "本月每周心率趋势";
});

function createRangeChart(items: RangeChartItem[], width = 320, height = 188) {
  const padding = 16;
  const topPadding = 24;
  const innerWidth = width - padding * 2;
  const maxValue = items.length ? Math.max(...items.map((item) => item.high), 100) : 100;
  const minValue = items.length ? Math.min(...items.map((item) => item.low), 0) : 0;
  const min = Math.min(0, Math.floor(minValue / 10) * 10);
  const max = Math.ceil(maxValue / 10) * 10;
  const range = max - min || 1;

  if (!items.length) {
    return {
      width,
      height,
      padding,
      baselineY: height - padding,
      guideLines: [],
      columns: [],
    };
  }

  const barWidth = Math.min(20, Math.max(12, innerWidth / Math.max(1, items.length * 2.4)));
  const gap = items.length > 1 ? (innerWidth - barWidth * items.length) / (items.length - 1) : 0;
  const getY = (value: number) =>
    height - padding - ((value - min) / range) * (height - padding - topPadding);

  const columns = items.map((item, index) => {
    const x = padding + index * (barWidth + gap);
    const highY = getY(item.high);
    const lowY = getY(item.low);

    return {
      x,
      centerX: x + barWidth / 2,
      width: barWidth,
      y: highY,
      height: Math.max(10, lowY - highY),
      highLabelY: Math.max(highY - 8, 14),
      lowLabelY: Math.min(lowY + 14, height - padding - 4),
      item,
    };
  });

  return {
    width,
    height,
    padding,
    baselineY: height - padding,
    guideLines: [0.2, 0.4, 0.6, 0.8].map((ratio) => height * ratio),
    columns,
  };
}

const rangeChart = computed(() => createRangeChart(chartItems.value));

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
  if (props.navigation?.navigateTo) {
    props.navigation.navigateTo("health/health-data");
  } else {
    window.history.back();
  }
}

function goToAddData() {
  sessionStorage.setItem("addMetric", "heartRate");
  sessionStorage.setItem("addReturnPath", "health/data-heartrate");
  props.navigation?.navigateTo?.("health/add-data");
}
</script>

<template>
  <section class="health-data-page">
    <header class="medication-nav">
      <button class="back-btn" type="button" aria-label="返回" @click="goBack">
        <span class="back-arrow" aria-hidden="true"></span>
      </button>
      <h1>{{ props.pageEntry?.title || mock.title || "心率详情" }}</h1>
    </header>

    <main class="medication-scroll">
      <template v-if="healthList">
        <section class="latest-small-card">
          <div class="latest-card-main">
            <div>
              <h2 class="small-card-label">最新记录</h2>
              <strong>{{ formatNumber(latest.heartRate) }} bpm</strong>
              <p class="small-card-date">{{ latest.date }}</p>
            </div>
            <div class="latest-card-summary">
              <span>当日区间</span>
              <strong>{{ formatNumber(latest.lowHeartRate) }}-{{ formatNumber(latest.highHeartRate) }}</strong>
              <p>
                {{
                  change >= 0
                    ? `较前一日增加 ${formatNumber(change)} bpm`
                    : `较前一日减少 ${formatNumber(Math.abs(change))} bpm`
                }}
              </p>
            </div>
          </div>
        </section>

        <section class="chart-card large">
          <div class="chart-card__header">
            <div>
              <h2>{{ chartTitle }}</h2>
            </div>
          </div>
          <div class="chart-card__toolbar">
            <div class="chart-switch">
              <button type="button" :class="{ active: selectedChartMode === 'day' }" @click="selectedChartMode = 'day'">日</button>
              <button type="button" :class="{ active: selectedChartMode === 'week' }" @click="selectedChartMode = 'week'">周</button>
              <button type="button" :class="{ active: selectedChartMode === 'month' }" @click="selectedChartMode = 'month'">月</button>
            </div>
          </div>
          <div class="chart-card__chart">
            <svg class="heart-rate-chart" :viewBox="'0 0 ' + rangeChart.width + ' ' + rangeChart.height" preserveAspectRatio="none">
              <defs>
                <linearGradient id="heart-rate-bar-gradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#ff7b64" stop-opacity="0.95" />
                  <stop offset="100%" stop-color="#ff3f55" stop-opacity="0.9" />
                </linearGradient>
              </defs>
              <g class="metric-card-grid">
                <line
                  v-for="(lineY, index) in rangeChart.guideLines"
                  :key="`guide-${index}`"
                  :x1="rangeChart.padding"
                  :y1="lineY"
                  :x2="rangeChart.width - rangeChart.padding"
                  :y2="lineY"
                />
              </g>
              <g>
                <rect
                  v-for="(column, index) in rangeChart.columns"
                  :key="`bar-${index}`"
                  :x="column.x"
                  :y="column.y"
                  :width="column.width"
                  :height="column.height"
                  fill="url(#heart-rate-bar-gradient)"
                  rx="12"
                />
                <text
                  v-for="(column, index) in rangeChart.columns"
                  :key="`high-${index}`"
                  :x="column.centerX"
                  :y="column.highLabelY"
                  text-anchor="middle"
                  class="range-label range-label--high"
                >
                  {{ column.item.high }}
                </text>
                <text
                  v-for="(column, index) in rangeChart.columns"
                  :key="`low-${index}`"
                  :x="column.centerX"
                  :y="column.lowLabelY"
                  text-anchor="middle"
                  class="range-label range-label--low"
                >
                  {{ column.item.low }}
                </text>
              </g>
              <line
                :x1="rangeChart.padding"
                :y1="rangeChart.baselineY"
                :x2="rangeChart.width - rangeChart.padding"
                :y2="rangeChart.baselineY"
                class="x-axis-line"
              />
            </svg>
          </div>
          <div class="chart-card__labels">
            <span v-for="item in chartItems" :key="item.label">{{ item.label }}</span>
          </div>
        </section>

        <section class="metric-blocks-card metric-blocks-card--heart">
          <div class="metric-blocks-grid">
            <article class="metric-block">
              <span>最高心率</span>
              <strong>{{ formatNumber(maxHeartRate) }}</strong>
              <small>{{ maxDate }}</small>
            </article>
            <article class="metric-block">
              <span>最低心率</span>
              <strong>{{ formatNumber(minHeartRate) }}</strong>
              <small>{{ minDate }}</small>
            </article>
            <article class="metric-block">
              <span>平均心率</span>
              <strong>{{ formatNumber(averageHeartRate) }}</strong>
              <small>bpm</small>
            </article>
          </div>
        </section>

        <section class="detail-table-card">
          <div class="detail-card__header">
            <div>
              <h2>每日心率明细</h2>
            </div>
          </div>
          <div class="table-wrapper">
            <table class="metric-table">
              <thead>
                <tr>
                  <th>日期</th>
                  <th>平均心率</th>
                  <th>最低/最高</th>
                  <th>较前一日变化</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(item, idx) in heartRateData" :key="item.date">
                  <td>{{ item.date }}</td>
                  <td>{{ formatNumber(item.heartRate) }} bpm</td>
                  <td>{{ formatNumber(item.lowHeartRate) }} / {{ formatNumber(item.highHeartRate) }}</td>
                  <td :class="getChangeClass(idx)">{{ formatChange(idx) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <article v-if="false && mock.nextSteps && mock.nextSteps.length" class="next-steps-card">
          <p class="page-eyebrow">Roadmap</p>
          <strong>后续计划</strong>
          <ol>
            <li v-for="item in mock.nextSteps" :key="item">{{ item }}</li>
          </ol>
        </article>
      </template>

      <div v-else class="error-card">
        <strong>数据加载失败</strong>
        <p>请检查 `mock.ts` 文件，确保导出了有效的 `list` 数组。</p>
      </div>

      <footer class="add-area">
        <button class="add-btn" type="button" @click="goToAddData">+ 添加心率记录</button>
      </footer>
    </main>
  </section>
</template>

<style scoped>
.health-data-page {
  position: relative;
  left: 50%;
  width: min(390px, 100vw);
  height: min(844px, calc(100vh - 36px));
  min-height: min(844px, calc(100vh - 36px));
  max-height: 844px;
  margin: -18px 0;
  overflow: hidden;
  background:
    radial-gradient(circle at 82% 8%, rgba(102, 112, 240, 0.13) 0, rgba(102, 112, 240, 0) 28%),
    linear-gradient(180deg, #f1f8ff 0%, #f7f9fb 42%, #f5f6f7 100%);
  color: #30343f;
  font-family: "HarmonyOS Sans SC", "MiSans", "Source Han Sans SC", "Noto Sans SC", "PingFang SC", "Microsoft YaHei UI", sans-serif;
  transform: translateX(-50%);
  -webkit-font-smoothing: antialiased;
}

.medication-nav {
  display: flex;
  align-items: center;
  height: 74px;
  padding: 0 29px;
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

.back-arrow {
  width: 14px;
  height: 14px;
  border-bottom: 4px solid #333333;
  border-left: 4px solid #333333;
  transform: rotate(45deg);
}

.medication-nav h1 {
  margin: 0 0 0 9px;
  color: #30343f;
  font-size: 24px;
  font-weight: 500;
  letter-spacing: 0.03em;
}

.medication-scroll {
  display: grid;
  row-gap: 18px;
  height: calc(100% - 74px);
  padding: 24px 29px 116px;
  overflow-y: auto;
  scrollbar-width: none;
}

.medication-scroll::-webkit-scrollbar {
  display: none;
}

.chart-card,
.detail-table-card,
.next-steps-card,
.error-card {
  background: rgba(255, 255, 255, 0.94);
  border-radius: 20px;
  box-shadow: 0 15px 34px rgba(72, 104, 148, 0.075);
}

.latest-small-card {
  box-sizing: border-box;
  position: relative;
  overflow: hidden;
  min-height: 156px;
  padding: 16px 16px 16px 18px;
  border: 1px solid rgba(255, 255, 255, 0.72);
  border-radius: 22px;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.96) 0%, rgba(239, 246, 255, 0.92) 48%, rgba(226, 252, 244, 0.88) 100%);
  box-shadow: 0 18px 42px rgba(72, 104, 148, 0.1);
}

.latest-small-card::after {
  position: absolute;
  right: -22px;
  bottom: -25px;
  width: 106px;
  height: 106px;
  content: "";
  border-radius: 50%;
  background: rgba(102, 112, 240, 0.08);
}

.latest-card-main {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 124px;
  gap: 12px;
  align-items: center;
}

.latest-card-main > div:first-child {
  display: grid;
  align-content: center;
  min-width: 0;
}

.small-card-label {
  display: block;
  margin: 0 0 4px;
  color: #8e8f94;
  font-size: 17px;
  font-weight: 500;
  letter-spacing: 0.03em;
  line-height: 1.25;
}

.latest-small-card strong {
  display: block;
  margin-bottom: 4px;
  font-size: 28px;
  font-weight: 700;
  line-height: 1.08;
}

.latest-card-summary strong {
  display: block;
  margin-bottom: 4px;
  font-size: 24px;
  font-weight: 700;
  line-height: 1.08;
}

.latest-card-summary {
  box-sizing: border-box;
  width: 124px;
  min-width: 0;
  aspect-ratio: 1;
  padding: 12px 14px;
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.84);
  background: linear-gradient(180deg, #ffffff 0%, #f4f8ff 100%);
  box-shadow: 0 8px 18px rgba(54, 67, 92, 0.06);
  display: grid;
  align-content: center;
  align-self: center;
  gap: 6px;
}

.latest-card-summary span {
  color: #8e8f94;
  font-size: 12px;
  font-weight: 500;
}

.latest-card-summary p {
  margin: 0;
  color: #8e8f94;
  font-size: 11px;
  line-height: 1.35;
}

.small-card-date {
  margin: 0;
  color: #b7b7bb;
  font-size: 15px;
  font-weight: 500;
}

.chart-card {
  padding: 20px;
}

.chart-card.large {
  padding-bottom: 16px;
}

.chart-card__header {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  margin-bottom: 8px;
  gap: 6px;
}

.chart-card__toolbar {
  display: flex;
  justify-content: center;
  margin-bottom: 16px;
}

.chart-switch {
  display: flex;
  gap: 6px;
  padding: 4px;
  border-radius: 20px;
  background: rgba(0, 0, 0, 0.04);
}

.chart-switch button {
  min-width: 48px;
  padding: 6px 10px;
  border: none;
  border-radius: 16px;
  background: transparent;
  color: #7f8998;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.chart-switch button.active {
  background: #ffffff;
  color: #4e5fa8;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.chart-card__header h2 {
  margin: 0;
  font-size: 21px;
  font-weight: 600;
}

.chart-card__chart {
  position: relative;
}

.heart-rate-chart {
  width: 100%;
  height: 188px;
  display: block;
  margin-bottom: 14px;
}

.metric-card-grid line {
  stroke: rgba(47, 124, 246, 0.08);
  stroke-width: 1;
  stroke-dasharray: 4 6;
}

.range-label {
  fill: #4e5fa8;
  font-size: 10px;
  font-weight: 600;
}

.range-label--low {
  fill: #6d7585;
}

.x-axis-line {
  stroke: rgba(110, 118, 143, 0.18);
  stroke-width: 1.5;
}

.chart-card__labels {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  margin-top: -4px;
  padding-top: 2px;
  color: #b7b7bb;
  font-size: 11px;
}

.chart-card__labels span {
  flex: 1 1 0;
  min-width: 0;
  text-align: center;
  white-space: nowrap;
}

.metric-blocks-card {
  background: rgba(255, 255, 255, 0.96);
  border-radius: 26px;
  box-shadow: 0 18px 42px rgba(34, 67, 118, 0.1);
  padding: 18px;
}

.metric-blocks-grid {
  display: grid;
  gap: 14px;
}

.metric-blocks-card--heart .metric-blocks-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.metric-block {
  min-width: 0;
  padding: 18px 16px;
  border-radius: 20px;
  border: 1px solid rgba(239, 241, 245, 0.9);
  background: #ffffff;
  display: grid;
  gap: 8px;
}

.metric-block span {
  color: #b7b7bb;
  font-size: 12px;
}

.metric-block strong {
  font-size: 22px;
  line-height: 1;
}

.metric-block small {
  color: #b7b7bb;
  white-space: nowrap;
  font-size: 11px;
}

.detail-table-card {
  padding: 20px;
}

.detail-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.detail-card__header h2 {
  margin: 0;
  font-size: 20px;
}

.table-wrapper {
  overflow-x: auto;
}

.metric-table {
  width: 100%;
  border-collapse: collapse;
}

.metric-table th,
.metric-table td {
  padding: 11px 6px;
  text-align: left;
  border-bottom: 1px solid #eef2f8;
  white-space: nowrap;
  font-size: 12px;
}

.metric-table th {
  font-weight: 600;
  color: #2b4469;
}

.metric-table td.positive {
  color: #c62828;
}

.metric-table td.negative {
  color: #2e7d32;
}

.next-steps-card {
  padding: 20px;
}

.next-steps-card strong {
  display: block;
  margin: 10px 0 8px;
  font-size: 18px;
}

.next-steps-card p,
.next-steps-card li {
  color: #7f8998;
  line-height: 1.7;
}

.next-steps-card ol {
  margin: 12px 0 0;
  padding-left: 20px;
}

.error-card {
  padding: 40px;
  text-align: center;
  color: #c62828;
}

.error-card strong {
  display: block;
  margin-bottom: 8px;
  font-size: 18px;
}

.page-eyebrow {
  margin: 0 0 4px;
  color: #2f7cf6;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.add-area {
  position: absolute;
  right: 29px;
  bottom: 26px;
  left: 29px;
}

.add-btn {
  width: 100%;
  height: 66px;
  border: 0;
  border-radius: 13px;
  background: #6670f0;
  box-shadow: 0 14px 28px rgba(102, 112, 240, 0.18);
  color: #ffffff;
  font-size: 21px;
  font-weight: 500;
  letter-spacing: 0.04em;
}

@media (max-width: 720px) {
  .chart-card__labels span {
    font-size: 10px;
  }
}

@media (max-width: 389px) {
  .latest-card-main {
    grid-template-columns: 1fr;
  }
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
