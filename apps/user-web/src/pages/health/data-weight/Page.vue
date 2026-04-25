<script setup lang="ts">
import { computed } from "vue";
import type { PageComponentProps } from "@ihc/page-core/types";
import mock from "./mock";

type WeightRecord = {
  date: string;
  weight: number;
  bmi: number;
};

const props = defineProps<PageComponentProps>();

const healthList = computed<WeightRecord[] | null>(() => {
  if (mock && Array.isArray(mock.list) && mock.list.length > 0) {
    return mock.list as WeightRecord[];
  }
  return null;
});

const weightData = computed(() => healthList.value ?? []);
const latest = computed(() => weightData.value[weightData.value.length - 1] ?? { date: "", weight: 0, bmi: 0 });
const previous = computed(() => weightData.value[weightData.value.length - 2] ?? latest.value);

const averageWeight = computed(() => {
  if (!weightData.value.length) return 0;
  return Number((weightData.value.reduce((sum, item) => sum + item.weight, 0) / weightData.value.length).toFixed(1));
});

const averageBmi = computed(() => {
  if (!weightData.value.length) return 0;
  return Number((weightData.value.reduce((sum, item) => sum + item.bmi, 0) / weightData.value.length).toFixed(1));
});

const weightChange = computed(() => Number((latest.value.weight - previous.value.weight).toFixed(1)));
const bmiChange = computed(() => Number((latest.value.bmi - previous.value.bmi).toFixed(1)));

function formatNumber(value: number) {
  if (Number.isInteger(value)) return `${value}`;
  return value.toFixed(1);
}

function getWeightStatus(value: number) {
  if (value < 50.5) return "偏瘦";
  if (value < 66.5) return "标准";
  if (value < 74.5) return "微胖";
  if (value < 80.5) return "肥胖";
  return "重度";
}

function getBmiStatus(value: number) {
  if (value < 18.5) return "偏瘦";
  if (value < 24) return "标准";
  if (value < 27) return "微胖";
  if (value < 30) return "肥胖";
  return "重度";
}

function getStatusClass(status: string) {
  return status === "标准" ? "status-pill status-pill--normal" : "status-pill status-pill--alert";
}

function getChangeClass(diff: number) {
  if (diff > 0) return "positive";
  if (diff < 0) return "negative";
  return "";
}

function formatChange(diff: number, unit: string) {
  if (diff === 0) return "持平";
  return `${diff > 0 ? "+" : ""}${formatNumber(Math.abs(diff))}${unit}`;
}

function createAreaChart(values: number[], width = 320, height = 204) {
  const paddingLeft = 18;
  const paddingRight = 10;
  const paddingTop = 12;
  const paddingBottom = 26;
  const innerWidth = width - paddingLeft - paddingRight;
  const innerHeight = height - paddingTop - paddingBottom;

  if (!values.length) {
    return {
      width,
      height,
      yLines: [],
      yMin: 0,
      yMax: 1,
      points: [],
      linePath: "",
      areaPath: "",
      paddingLeft,
      paddingRight,
      paddingBottom,
    };
  }

  const min = Math.floor((Math.min(...values) - 2) * 2) / 2;
  const max = Math.ceil((Math.max(...values) + 2) * 2) / 2;
  const range = max - min || 1;

  const points = values.map((value, index) => {
    const x = paddingLeft + (index * innerWidth) / Math.max(values.length - 1, 1);
    const y = paddingTop + (1 - (value - min) / range) * innerHeight;
    return { x, y, value };
  });

  const linePath = points.reduce((path, point, index) => {
    if (index === 0) return `M ${point.x} ${point.y}`;
    return `${path} L ${point.x} ${point.y}`;
  }, "");

  const areaPath = `${linePath} L ${points[points.length - 1].x} ${height - paddingBottom} L ${points[0].x} ${
    height - paddingBottom
  } Z`;

  return {
    width,
    height,
    yLines: [0, 0.25, 0.5, 0.75, 1].map((ratio) => paddingTop + innerHeight * ratio),
    yMin: min,
    yMax: max,
    points,
    linePath,
    areaPath,
    paddingLeft,
    paddingRight,
    paddingBottom,
  };
}

const weightTrend = computed(() => createAreaChart(weightData.value.map((item) => item.weight), 320, 208));
const bmiTrend = computed(() => createAreaChart(weightData.value.map((item) => item.bmi), 320, 208));

function getAxisLabels(chart: ReturnType<typeof createAreaChart>) {
  const step = (chart.yMax - chart.yMin) / 4;
  return [0, 1, 2, 3, 4].map((index) => Number((chart.yMax - step * index).toFixed(1)));
}

const weightAxisLabels = computed(() => getAxisLabels(weightTrend.value));
const bmiAxisLabels = computed(() => getAxisLabels(bmiTrend.value));

function getIndexPosition(value: number, min: number, max: number) {
  const clamped = Math.min(Math.max(value, min), max);
  return `${((clamped - min) / (max - min)) * 100}%`;
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
  sessionStorage.setItem("addMetric", "weight");
  sessionStorage.setItem("addReturnPath", "health/data-weight");
  props.navigation?.navigateTo?.("health/add-data");
}
</script>

<template>
  <section class="health-data-page">
    <header class="medication-nav">
      <button class="back-btn" type="button" aria-label="返回" @click="goBack">
        <span class="back-arrow" aria-hidden="true"></span>
      </button>
      <h1>体重详情</h1>
    </header>

    <main class="medication-scroll">
      <template v-if="healthList">
        <section class="latest-small-card">
          <div class="latest-card-main">
            <div>
              <h2 class="small-card-label">最新记录</h2>
              <strong>{{ formatNumber(latest.weight) }} kg</strong>
              <p class="small-card-date">{{ latest.date }}</p>
            </div>
            <div class="latest-card-summary">
              <span>平均 BMI</span>
              <strong>{{ formatNumber(averageBmi) }}</strong>
              <p>{{ weightChange >= 0 ? `较前一日增加 ${formatNumber(weightChange)} kg` : `较前一日减少 ${formatNumber(Math.abs(weightChange))} kg` }}</p>
            </div>
          </div>
        </section>

        <section class="metric-overview-card">
          <article class="overview-block">
            <span>体重</span>
            <strong>{{ formatNumber(latest.weight) }}<small>kg</small></strong>
          </article>
          <article class="overview-block">
            <span>BMI</span>
            <strong>{{ formatNumber(latest.bmi) }}</strong>
          </article>
        </section>

        <section class="chart-card large">
          <div class="chart-card__header">
            <div>
              <h2>体重趋势 <small>kg</small></h2>
            </div>
          </div>
          <div class="chart-card__chart">
            <svg class="trend-chart" :viewBox="'0 0 ' + weightTrend.width + ' ' + weightTrend.height" preserveAspectRatio="none">
              <defs>
                <linearGradient id="weight-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#47d0ae" stop-opacity="0.42" />
                  <stop offset="100%" stop-color="#47d0ae" stop-opacity="0.08" />
                </linearGradient>
              </defs>
              <g class="metric-card-grid">
                <line
                  v-for="(lineY, index) in weightTrend.yLines"
                  :key="`weight-grid-${index}`"
                  :x1="weightTrend.paddingLeft"
                  :y1="lineY"
                  :x2="weightTrend.width - weightTrend.paddingRight"
                  :y2="lineY"
                />
              </g>
              <path :d="weightTrend.areaPath" fill="url(#weight-fill)" />
              <path :d="weightTrend.linePath" fill="none" stroke="#47d0ae" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
              <circle
                v-for="(point, index) in weightTrend.points"
                :key="`weight-point-${index}`"
                :cx="point.x"
                :cy="point.y"
                r="5"
                fill="#ffffff"
                stroke="#47d0ae"
                stroke-width="3"
              />
            </svg>
            <div class="chart-axis-left">
              <span v-for="label in weightAxisLabels" :key="`weight-label-${label}`">{{ label }}</span>
            </div>
          </div>
          <div class="chart-card__labels" :style="{ gridTemplateColumns: `repeat(${weightData.length}, minmax(0, 1fr))` }">
            <span v-for="item in weightData" :key="item.date">{{ item.date.slice(5).replace('-', '/') }}</span>
          </div>
        </section>

        <section class="chart-card large">
          <div class="chart-card__header">
            <div>
              <h2>BMI趋势</h2>
            </div>
          </div>
          <div class="chart-card__chart">
            <svg class="trend-chart" :viewBox="'0 0 ' + bmiTrend.width + ' ' + bmiTrend.height" preserveAspectRatio="none">
              <defs>
                <linearGradient id="bmi-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#ffd766" stop-opacity="0.42" />
                  <stop offset="100%" stop-color="#ffd766" stop-opacity="0.08" />
                </linearGradient>
              </defs>
              <g class="metric-card-grid">
                <line
                  v-for="(lineY, index) in bmiTrend.yLines"
                  :key="`bmi-grid-${index}`"
                  :x1="bmiTrend.paddingLeft"
                  :y1="lineY"
                  :x2="bmiTrend.width - bmiTrend.paddingRight"
                  :y2="lineY"
                />
              </g>
              <path :d="bmiTrend.areaPath" fill="url(#bmi-fill)" />
              <path :d="bmiTrend.linePath" fill="none" stroke="#ffd15b" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
              <circle
                v-for="(point, index) in bmiTrend.points"
                :key="`bmi-point-${index}`"
                :cx="point.x"
                :cy="point.y"
                r="5"
                fill="#ffffff"
                stroke="#ffd15b"
                stroke-width="3"
              />
            </svg>
            <div class="chart-axis-left">
              <span v-for="label in bmiAxisLabels" :key="`bmi-label-${label}`">{{ label }}</span>
            </div>
          </div>
          <div class="chart-card__labels" :style="{ gridTemplateColumns: `repeat(${weightData.length}, minmax(0, 1fr))` }">
            <span v-for="item in weightData" :key="`bmi-${item.date}`">{{ item.date.slice(5).replace('-', '/') }}</span>
          </div>
        </section>

        <section class="index-card">
          <article class="index-panel">
            <h2>体重指数</h2>
            <div class="index-current">
              <span>当前体重：</span>
              <strong>{{ formatNumber(latest.weight) }}<small>Kg</small></strong>
            </div>
            <span :class="getStatusClass(getWeightStatus(latest.weight))">{{ getWeightStatus(latest.weight) }}</span>
            <div class="index-scale">
              <div class="index-scale__segments weight">
                <span></span><span></span><span></span><span></span><span></span>
                <i class="scale-marker" :style="{ left: getIndexPosition(latest.weight, 40, 95) }"></i>
              </div>
              <div class="scale-values">
                <span>50.5</span>
                <span>66.5</span>
                <span>74.5</span>
                <span>80.5</span>
              </div>
              <div class="scale-labels">
                <span>偏瘦</span>
                <span>标准</span>
                <span>微胖</span>
                <span>肥胖</span>
                <span>重度</span>
              </div>
            </div>
          </article>

          <article class="index-panel index-panel--bmi">
            <h2>BMI指数</h2>
            <div class="index-current">
              <span>当前BMI：</span>
              <strong>{{ formatNumber(latest.bmi) }}</strong>
            </div>
            <span :class="getStatusClass(getBmiStatus(latest.bmi))">{{ getBmiStatus(latest.bmi) }}</span>
            <div class="index-scale">
              <div class="index-scale__segments bmi">
                <span></span><span></span><span></span><span></span><span></span>
                <i class="scale-marker" :style="{ left: getIndexPosition(latest.bmi, 15, 34) }"></i>
              </div>
              <div class="scale-values">
                <span>18.5</span>
                <span>24</span>
                <span>27</span>
                <span>30</span>
              </div>
              <div class="scale-labels">
                <span>偏瘦</span>
                <span>标准</span>
                <span>微胖</span>
                <span>肥胖</span>
                <span>重度</span>
              </div>
            </div>
          </article>
        </section>

        <section class="detail-table-card">
          <div class="detail-card__header">
            <div>
              <h2>每日体重明细</h2>
            </div>
          </div>
          <div class="table-wrapper">
            <table class="metric-table">
              <thead>
                <tr>
                  <th>日期</th>
                  <th>体重</th>
                  <th>BMI</th>
                  <th>体重变化</th>
                  <th>BMI变化</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(item, idx) in weightData" :key="item.date">
                  <td>{{ item.date }}</td>
                  <td>{{ formatNumber(item.weight) }} kg</td>
                  <td>{{ formatNumber(item.bmi) }}</td>
                  <td :class="getChangeClass(idx === 0 ? 0 : Number((item.weight - weightData[idx - 1].weight).toFixed(1)))">
                    {{ idx === 0 ? "—" : formatChange(Number((item.weight - weightData[idx - 1].weight).toFixed(1)), "kg") }}
                  </td>
                  <td :class="getChangeClass(idx === 0 ? 0 : Number((item.bmi - weightData[idx - 1].bmi).toFixed(1)))">
                    {{ idx === 0 ? "—" : formatChange(Number((item.bmi - weightData[idx - 1].bmi).toFixed(1)), "") }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </template>

      <div v-else class="error-card">
        <strong>数据加载失败</strong>
        <p>请检查 `mock.ts` 文件，确保导出了有效的 `list` 数组。</p>
      </div>

      <footer class="add-area">
        <button class="add-btn" type="button" @click="goToAddData">+ 添加体重记录</button>
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
  padding: 22px 35px 112px;
  overflow-y: auto;
  scrollbar-width: none;
}

.medication-scroll::-webkit-scrollbar {
  display: none;
}

.chart-card,
.detail-table-card,
.error-card,
.index-card,
.metric-overview-card {
  background: rgba(255, 255, 255, 0.94);
  border-radius: 20px;
  box-shadow: 0 15px 34px rgba(72, 104, 148, 0.075);
}

.latest-small-card {
  box-sizing: border-box;
  position: relative;
  overflow: hidden;
  min-height: 148px;
  padding: 14px 14px 14px 16px;
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
  grid-template-columns: minmax(0, 1fr) 116px;
  gap: 10px;
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
  font-size: 16px;
  font-weight: 500;
  letter-spacing: 0.03em;
  line-height: 1.25;
}

.latest-small-card strong,
.latest-card-summary strong {
  display: block;
  font-size: 25px;
  line-height: 1.08;
  margin-bottom: 4px;
  font-weight: 700;
}

.latest-card-summary {
  box-sizing: border-box;
  width: 116px;
  aspect-ratio: 1;
  min-width: 0;
  padding: 11px 12px;
  border-radius: 18px;
  background: linear-gradient(180deg, #ffffff 0%, #f4f8ff 100%);
  border: 1px solid rgba(255, 255, 255, 0.84);
  box-shadow: 0 8px 18px rgba(54, 67, 92, 0.06);
  display: grid;
  align-content: center;
  gap: 6px;
  align-self: center;
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
  font-size: 14px;
  font-weight: 500;
}

.metric-overview-card {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0;
  padding: 0;
  overflow: hidden;
}

.overview-block {
  padding: 15px 14px;
  border-right: 1px solid #eef2f8;
}

.overview-block:last-child {
  border-right: 0;
}

.overview-block span {
  display: block;
  color: #a3aab7;
  font-size: 13px;
  margin-bottom: 10px;
}

.overview-block strong {
  display: flex;
  align-items: baseline;
  gap: 2px;
  color: #30343f;
  font-size: 21px;
  font-weight: 700;
}

.overview-block small {
  font-size: 12px;
  color: #8b95a5;
}

.chart-card {
  padding: 18px;
}

.chart-card.large {
  padding-bottom: 14px;
}

.chart-card__header {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  margin-bottom: 12px;
  gap: 6px;
}

.chart-card__header h2 {
  margin: 0;
  font-size: 21px;
  font-weight: 600;
}

.chart-card__header h2 small {
  color: #9aa4b7;
  font-size: 14px;
  font-weight: 500;
}

.chart-card__chart {
  position: relative;
}

.trend-chart {
  width: 100%;
  height: 208px;
  display: block;
}

.metric-card-grid line {
  stroke: rgba(47, 124, 246, 0.08);
  stroke-width: 1;
  stroke-dasharray: 4 6;
}

.chart-axis-left {
  position: absolute;
  top: 6px;
  left: 0;
  bottom: 26px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  color: #bcc5d1;
  font-size: 11px;
}

.chart-card__labels {
  display: grid;
  gap: 6px;
  color: #b7b7bb;
  font-size: 11px;
  padding-top: 8px;
}

.chart-card__labels span {
  text-align: center;
  white-space: nowrap;
}

.index-card {
  padding: 0 16px;
}

.index-panel {
  padding: 18px 0 22px;
  border-bottom: 1px solid #eef2f8;
}

.index-panel:last-child {
  border-bottom: 0;
}

.index-panel h2 {
  margin: 0 0 14px;
  font-size: 18px;
}

.index-current {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 6px;
  margin-bottom: 12px;
  color: #4e5560;
  font-size: 15px;
}

.index-current strong {
  color: #30343f;
  font-size: 25px;
  font-weight: 700;
}

.index-current small {
  font-size: 13px;
  color: #6a7484;
}

.status-pill {
  display: flex;
  align-items: center;
  justify-content: center;
  width: max-content;
  margin: 0 auto 20px;
  min-width: 64px;
  height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  border: 0;
  font-size: 13px;
  font-weight: 600;
  line-height: 28px;
  text-align: center;
}

.status-pill--normal {
  background: #d7f5eb;
  color: #31c79b;
}

.status-pill--alert {
  background: #fff0f0;
  color: #f06969;
}

.index-scale__segments {
  position: relative;
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  height: 12px;
  border-radius: 999px;
  overflow: hidden;
}

.index-scale__segments span:nth-child(1) {
  background: #ffd766;
}

.index-scale__segments span:nth-child(2) {
  background: #3e62f3;
}

.index-scale__segments span:nth-child(3) {
  background: #46d0a9;
}

.index-scale__segments span:nth-child(4) {
  background: #7c75ef;
}

.index-scale__segments span:nth-child(5) {
  background: #ff7673;
}

.scale-marker {
  position: absolute;
  top: -5px;
  width: 3px;
  height: 22px;
  background: #1f2a3d;
  border-radius: 999px;
  transform: translateX(-50%);
}

.scale-values,
.scale-labels {
  display: grid;
  text-align: center;
  color: #99a3b3;
}

.scale-values {
  grid-template-columns: repeat(4, minmax(0, 1fr));
  margin: 10px 30px 0 30px;
  font-size: 11px;
}

.scale-labels {
  grid-template-columns: repeat(5, minmax(0, 1fr));
  margin-top: 10px;
  font-size: 13px;
}

.detail-table-card {
  padding: 18px;
}

.detail-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.detail-card__header h2 {
  margin: 0;
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
  font-size: 20px;
  margin-bottom: 8px;
}

.add-area {
  position: absolute;
  right: 35px;
  bottom: 26px;
  left: 35px;
}

.add-btn {
  width: 100%;
  height: 66px;
  border-radius: 13px;
  background: #6670f0;
  box-shadow: 0 14px 28px rgba(102, 112, 240, 0.18);
  color: #ffffff;
  font-size: 21px;
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
