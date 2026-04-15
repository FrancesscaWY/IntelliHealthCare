<script setup lang="ts">
import { computed, ref } from "vue";
import type { PageComponentProps } from "@ihc/page-core/types";
import mock from "./mock";

type ChartMode = "day" | "week" | "month";
type SpO2Record = {
  date: string;
  oxygen: number;
  time?: string;
};
type TimelineItem = {
  time: string;
  value: number;
};
type TimelineEntry = {
  date: string;
  items: TimelineItem[];
};
type PeriodItem = {
  label: string;
  min: number;
  max: number;
  avg: number;
};

const props = defineProps<PageComponentProps>();
const selectedChartMode = ref<ChartMode>("day");

const healthList = computed<SpO2Record[] | null>(() => {
  if (mock && Array.isArray(mock.list) && mock.list.length > 0) {
    return mock.list as SpO2Record[];
  }
  return null;
});

const spo2Data = computed(() => healthList.value ?? []);
const timelineEntries = computed<TimelineEntry[]>(() => (mock.dailyTimeline ?? []) as TimelineEntry[]);

const latest = computed(
  () =>
    spo2Data.value[spo2Data.value.length - 1] ?? {
      date: "",
      oxygen: 0,
      time: "",
    }
);

const previous = computed(() => spo2Data.value[spo2Data.value.length - 2] ?? latest.value);

const latestTimeline = computed<TimelineItem[]>(() => {
  const entry = timelineEntries.value.find((item) => item.date === latest.value.date);
  return entry?.items ?? [];
});

const weekItems = computed<PeriodItem[]>(() =>
  spo2Data.value.map((item) => ({
    label: item.date.slice(5).replace("-", "/"),
    min: item.oxygen,
    max: item.oxygen,
    avg: item.oxygen,
  }))
);

const monthItems = computed<PeriodItem[]>(() =>
  (mock.monthlyData ?? []).map((item: { label: string; min: number; max: number; avg: number }) => ({
    label: item.label,
    min: Number(item.min),
    max: Number(item.max),
    avg: Number(item.avg),
  }))
);

const averageSpO2 = computed(() => {
  if (!spo2Data.value.length) return 0;
  const total = spo2Data.value.reduce((sum, item) => sum + item.oxygen, 0);
  return Math.round(total / spo2Data.value.length);
});

const latestChange = computed(() => latest.value.oxygen - previous.value.oxygen);

const formattedLatestDate = computed(() => {
  if (!latest.value.date) return "";
  const [year, month, day] = latest.value.date.split("-");
  return `${year}年${month}月${day}日 ${latest.value.time || "23:59"}`;
});

function formatPercent(value: number) {
  return `${Math.round(value)}%`;
}

function createDayChart(items: TimelineItem[], width = 320, height = 230) {
  const left = 28;
  const right = 10;
  const top = 10;
  const bottom = 30;
  const innerWidth = width - left - right;
  const innerHeight = height - top - bottom;
  const min = 75;
  const max = 100;
  const range = max - min || 1;

  return {
    width,
    height,
    left,
    right,
    yLines: [0, 0.2, 0.4, 0.6, 0.8, 1].map((ratio) => top + innerHeight * ratio),
    yLabels: [100, 95, 90, 85, 80, 75],
    points: items.map((item, index) => ({
      x: left + (index * innerWidth) / Math.max(items.length - 1, 1),
      y: top + (1 - (item.value - min) / range) * innerHeight,
    })),
  };
}

function createRangeChart(items: PeriodItem[], width = 320, height = 230) {
  const left = 28;
  const right = 10;
  const top = 10;
  const bottom = 30;
  const innerWidth = width - left - right;
  const innerHeight = height - top - bottom;
  const min = 75;
  const max = 100;
  const range = max - min || 1;
  const step = items.length > 1 ? innerWidth / Math.max(items.length - 1, 1) : 0;

  return {
    width,
    height,
    left,
    right,
    yLines: [0, 0.2, 0.4, 0.6, 0.8, 1].map((ratio) => top + innerHeight * ratio),
    yLabels: [100, 95, 90, 85, 80, 75],
    points: items.map((item, index) => ({
      x: left + index * step,
      minY: top + (1 - (item.min - min) / range) * innerHeight,
      maxY: top + (1 - (item.max - min) / range) * innerHeight,
      avgY: top + (1 - (item.avg - min) / range) * innerHeight,
    })),
  };
}

const dayChart = computed(() => createDayChart(latestTimeline.value));
const weekChart = computed(() => createRangeChart(weekItems.value));
const monthChart = computed(() => createRangeChart(monthItems.value));

const chartLabels = computed(() => {
  if (selectedChartMode.value === "day") return latestTimeline.value.map((item) => item.time);
  if (selectedChartMode.value === "week") return weekItems.value.map((item) => item.label);
  return monthItems.value.map((item) => item.label);
});

const chartLabelStyle = computed(() => ({
  gridTemplateColumns: `repeat(${Math.max(chartLabels.value.length, 1)}, minmax(0, 1fr))`,
}));

const summary = computed(() => {
  if (selectedChartMode.value === "day") {
    const values = latestTimeline.value.map((item) => item.value);
    if (!values.length) return { max: 0, min: 0, avg: 0 };
    return {
      max: Math.max(...values),
      min: Math.min(...values),
      avg: Math.round(values.reduce((sum, value) => sum + value, 0) / values.length),
    };
  }

  const source = selectedChartMode.value === "week" ? weekItems.value : monthItems.value;
  if (!source.length) return { max: 0, min: 0, avg: 0 };
  return {
    max: Math.max(...source.map((item) => item.max)),
    min: Math.min(...source.map((item) => item.min)),
    avg: Math.round(source.reduce((sum, item) => sum + item.avg, 0) / source.length),
  };
});

function formatChange(index: number) {
  if (index === 0) return "—";
  const diff = spo2Data.value[index].oxygen - spo2Data.value[index - 1].oxygen;
  if (diff === 0) return "持平";
  return `${diff > 0 ? "+" : ""}${diff}%`;
}

function getChangeClass(index: number) {
  if (index === 0) return "";
  const diff = spo2Data.value[index].oxygen - spo2Data.value[index - 1].oxygen;
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
  sessionStorage.setItem("addMetric", "oxygen");
  sessionStorage.setItem("addReturnPath", "health/data-spo2");
  props.navigation?.navigateTo?.("health/add-data");
}
</script>

<template>
  <section class="health-data-page">
    <header class="medication-nav">
      <button class="back-btn" type="button" aria-label="返回" @click="goBack">
        <span class="back-arrow" aria-hidden="true"></span>
      </button>
      <h1>{{ props.pageEntry?.title || "血氧" }}</h1>
    </header>

    <main class="medication-scroll">
      <template v-if="healthList">
        <section class="latest-small-card">
          <div class="latest-card-main">
            <div>
              <h2 class="small-card-label">最新记录</h2>
              <strong>{{ formatPercent(latest.oxygen) }}</strong>
              <p class="small-card-date">{{ latest.date }}</p>
            </div>
            <div class="latest-card-summary">
              <span>平均血氧</span>
              <strong>{{ formatPercent(averageSpO2) }}</strong>
              <p>{{ latestChange >= 0 ? `较前一日增加 ${latestChange}%` : `较前一日减少 ${Math.abs(latestChange)}%` }}</p>
            </div>
          </div>
        </section>

        <section class="spo2-panel-card">
          <div class="chart-switch chart-switch--wide">
            <button type="button" :class="{ active: selectedChartMode === 'day' }" @click="selectedChartMode = 'day'">日</button>
            <button type="button" :class="{ active: selectedChartMode === 'week' }" @click="selectedChartMode = 'week'">周</button>
            <button type="button" :class="{ active: selectedChartMode === 'month' }" @click="selectedChartMode = 'month'">月</button>
          </div>

          <div class="spo2-current-card">
            <span>{{ formattedLatestDate }}</span>
            <strong>{{ formatPercent(latest.oxygen) }}</strong>
          </div>

          <div class="chart-card__chart">
            <template v-if="selectedChartMode === 'day'">
              <svg class="main-chart" :viewBox="'0 0 ' + dayChart.width + ' ' + dayChart.height" preserveAspectRatio="none">
                <g class="chart-grid">
                  <line
                    v-for="(lineY, index) in dayChart.yLines"
                    :key="`day-line-${index}`"
                    :x1="dayChart.left"
                    :y1="lineY"
                    :x2="dayChart.width - dayChart.right"
                    :y2="lineY"
                  />
                </g>
                <circle
                  v-for="(point, index) in dayChart.points"
                  :key="`day-point-${index}`"
                  :cx="point.x"
                  :cy="point.y"
                  r="4.5"
                  class="spo2-point"
                />
              </svg>
              <div class="chart-axis-left">
                <span v-for="label in dayChart.yLabels" :key="`day-axis-${label}`">{{ label }}</span>
              </div>
            </template>

            <template v-else-if="selectedChartMode === 'week'">
              <svg class="main-chart" :viewBox="'0 0 ' + weekChart.width + ' ' + weekChart.height" preserveAspectRatio="none">
                <g class="chart-grid">
                  <line
                    v-for="(lineY, index) in weekChart.yLines"
                    :key="`week-line-${index}`"
                    :x1="weekChart.left"
                    :y1="lineY"
                    :x2="weekChart.width - weekChart.right"
                    :y2="lineY"
                  />
                </g>
                <g v-for="(point, index) in weekChart.points" :key="`week-point-${index}`">
                  <line :x1="point.x" :y1="point.maxY" :x2="point.x" :y2="point.minY" class="spo2-range-line" />
                  <circle :cx="point.x" :cy="point.avgY" r="4.5" class="spo2-point" />
                </g>
              </svg>
              <div class="chart-axis-left">
                <span v-for="label in weekChart.yLabels" :key="`week-axis-${label}`">{{ label }}</span>
              </div>
            </template>

            <template v-else>
              <svg class="main-chart" :viewBox="'0 0 ' + monthChart.width + ' ' + monthChart.height" preserveAspectRatio="none">
                <g class="chart-grid">
                  <line
                    v-for="(lineY, index) in monthChart.yLines"
                    :key="`month-line-${index}`"
                    :x1="monthChart.left"
                    :y1="lineY"
                    :x2="monthChart.width - monthChart.right"
                    :y2="lineY"
                  />
                </g>
                <g v-for="(point, index) in monthChart.points" :key="`month-point-${index}`">
                  <line :x1="point.x" :y1="point.maxY" :x2="point.x" :y2="point.minY" class="spo2-range-line" />
                  <circle :cx="point.x" :cy="point.avgY" r="4.5" class="spo2-point" />
                </g>
              </svg>
              <div class="chart-axis-left">
                <span v-for="label in monthChart.yLabels" :key="`month-axis-${label}`">{{ label }}</span>
              </div>
            </template>
          </div>

          <div class="chart-card__labels" :style="chartLabelStyle">
            <span v-for="label in chartLabels" :key="label">{{ label }}</span>
          </div>

          <div class="summary-strip">
            <article class="summary-block">
              <span>最高</span>
              <strong>{{ formatPercent(summary.max) }}</strong>
            </article>
            <article class="summary-block">
              <span>最低</span>
              <strong>{{ formatPercent(summary.min) }}</strong>
            </article>
            <article class="summary-block">
              <span>平均</span>
              <strong>{{ formatPercent(summary.avg) }}</strong>
            </article>
          </div>
        </section>

        <section class="detail-table-card">
          <div class="detail-card__header">
            <h2>每日血氧明细</h2>
          </div>
          <div class="table-wrapper">
            <table class="metric-table">
              <thead>
                <tr>
                  <th>日期</th>
                  <th>血氧</th>
                  <th>较前一日变化</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(item, index) in spo2Data" :key="item.date">
                  <td>{{ item.date }}</td>
                  <td>{{ formatPercent(item.oxygen) }}</td>
                  <td :class="getChangeClass(index)">{{ formatChange(index) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </template>

      <div v-else class="error-card">
        <strong>数据加载失败</strong>
        <p>请检查 `mock.ts` 文件，确认已导出有效的 `list` 数据。</p>
      </div>

      <footer class="add-area">
        <button class="add-btn" type="button" @click="goToAddData">+ 添加血氧记录</button>
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

.latest-small-card,
.spo2-panel-card,
.detail-table-card,
.error-card {
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid rgba(255, 255, 255, 0.74);
  border-radius: 20px;
  box-shadow: 0 15px 34px rgba(72, 104, 148, 0.075);
}

.latest-small-card {
  position: relative;
  overflow: hidden;
  min-height: 156px;
  padding: 16px 16px 16px 18px;
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

.latest-small-card strong,
.latest-card-summary strong {
  display: block;
  margin-bottom: 4px;
  font-size: 28px;
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
  gap: 6px;
}

.latest-card-summary span {
  color: #8e8f94;
  font-size: 13px;
  font-weight: 500;
}

.latest-card-summary p {
  margin: 0;
  color: #8e8f94;
  font-size: 12px;
  line-height: 1.35;
}

.small-card-date {
  margin: 0;
  color: #b7b7bb;
  font-size: 15px;
  font-weight: 500;
}

.spo2-panel-card {
  padding: 14px;
}

.chart-switch {
  display: flex;
  gap: 6px;
  padding: 4px;
  border-radius: 20px;
  background: rgba(0, 0, 0, 0.04);
}

.chart-switch--wide {
  width: 100%;
}

.chart-switch--wide button {
  flex: 1 1 0;
}

.chart-switch button {
  min-width: 48px;
  padding: 8px 10px;
  border: none;
  border-radius: 16px;
  background: transparent;
  color: #5a6474;
  font-size: 15px;
  font-weight: 500;
}

.chart-switch button.active {
  background: #ffffff;
  color: #5766ff;
  box-shadow: 0 2px 10px rgba(69, 88, 129, 0.08);
}

.spo2-current-card {
  margin-top: 18px;
  padding: 22px 18px;
  border-radius: 18px;
  background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
  border: 1px solid rgba(232, 238, 246, 0.95);
}

.spo2-current-card span {
  display: block;
  color: #8e8f94;
  font-size: 14px;
}

.spo2-current-card strong {
  display: block;
  margin-top: 12px;
  color: #1f2a3d;
  font-size: 42px;
  font-weight: 700;
  line-height: 1;
}

.chart-card__chart {
  position: relative;
  margin-top: 16px;
}

.main-chart {
  width: 100%;
  height: 230px;
  display: block;
}

.chart-grid line {
  stroke: rgba(125, 141, 176, 0.16);
  stroke-width: 1;
  stroke-dasharray: 4 4;
}

.chart-axis-left {
  position: absolute;
  top: 8px;
  left: 0;
  bottom: 30px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  color: #c4c7d1;
  font-size: 11px;
}

.spo2-point {
  fill: #48cdb0;
}

.spo2-range-line {
  stroke: rgba(72, 205, 176, 0.32);
  stroke-width: 10;
  stroke-linecap: round;
}

.chart-card__labels {
  display: grid;
  gap: 6px;
  padding-top: 8px;
  color: #b7b7bb;
  font-size: 12px;
}

.chart-card__labels span {
  text-align: center;
  white-space: nowrap;
}

.summary-strip {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-top: 18px;
}

.summary-block {
  padding: 16px 14px;
  border-radius: 18px;
  background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
  border: 1px solid rgba(232, 238, 246, 0.95);
}

.summary-block span {
  display: block;
  color: #8e8f94;
  font-size: 13px;
}

.summary-block strong {
  display: block;
  margin-top: 12px;
  color: #1f2a3d;
  font-size: 26px;
  font-weight: 700;
  line-height: 1;
}

.detail-table-card {
  padding: 20px;
}

.detail-card__header {
  margin-bottom: 16px;
}

.detail-card__header h2 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
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
  padding: 10px 6px;
  text-align: left;
  border-bottom: 1px solid #eef2f8;
  white-space: nowrap;
  font-size: 14px;
}

.metric-table th {
  font-weight: 600;
  color: #2b4469;
}

.metric-table td.positive {
  color: #2e7d32;
}

.metric-table td.negative {
  color: #c62828;
}

.error-card {
  padding: 40px;
  text-align: center;
  color: #c62828;
}

.error-card strong {
  display: block;
  margin-bottom: 8px;
  font-size: 20px;
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
  border-radius: 13px;
  background: #6670f0;
  box-shadow: 0 14px 28px rgba(102, 112, 240, 0.18);
  color: #ffffff;
  font-size: 24px;
  font-weight: 500;
  letter-spacing: 0.04em;
  border: 0;
}

@media (max-width: 720px) {
  .chart-card__labels span {
    font-size: 10px;
  }
}

@media (max-width: 389px) {
  .latest-card-main,
  .summary-strip {
    grid-template-columns: 1fr;
  }

  .spo2-current-card strong {
    font-size: 36px;
  }
}
</style>
