<script setup lang="ts">
import { computed, ref } from "vue";
import type { PageComponentProps } from "@ihc/page-core/types";
import mock from "./mock";

const props = defineProps<PageComponentProps>();

// 仅使用 mock.list，如果无效则显示错误（不再使用硬编码备用数据）
const healthList = computed(() => {
  if (mock && mock.list && Array.isArray(mock.list) && mock.list.length > 0) {
    return mock.list;
  }
  return null;
});

const selectedChartMode = ref<'day' | 'week' | 'month'>('day');

const stepsData = computed(() => healthList.value?.map(item => ({ date: item.date, steps: item.steps, distance: item.distance ?? 0 })) || []);
const stepsValues = computed(() => stepsData.value.map(d => d.steps));
const dates = computed(() => stepsData.value.map(d => d.date));

const totalSteps = computed(() => stepsValues.value.reduce((a, b) => a + b, 0));
const averageSteps = computed(() => stepsValues.value.length ? Math.round(totalSteps.value / stepsValues.value.length) : 0);
const maxSteps = computed(() => Math.max(...stepsValues.value, 0));
const minSteps = computed(() => Math.min(...stepsValues.value, 0));
const maxDate = computed(() => stepsData.value.find(d => d.steps === maxSteps.value)?.date || '');
const minDate = computed(() => stepsData.value.find(d => d.steps === minSteps.value)?.date || '');

const latest = computed(() => stepsData.value[stepsData.value.length - 1] || { date: '', steps: 0, distance: 0 });
const previous = computed(() => stepsData.value[stepsData.value.length - 2] ?? latest.value);
const change = computed(() => latest.value.steps - previous.value.steps);
const changePercent = computed(() => previous.value.steps === 0 ? 0 : ((change.value / previous.value.steps) * 100).toFixed(1));
const todayDistance = computed(() => latest.value.distance ?? 0);
const yesterdayDistance = computed(() => previous.value.distance ?? 0);

const dailyTimeline = computed(() => {
  const entry = mock.dailyTimeline?.find(item => item.date === latest.value.date);
  return entry?.items ?? [];
});

const chartItems = computed(() => {
  if (selectedChartMode.value === 'day') {
    return dailyTimeline.value.map(item => ({ label: item.time, value: item.steps }));
  }
  if (selectedChartMode.value === 'week') {
    return stepsData.value.map(item => ({ label: item.date.slice(5), value: item.steps }));
  }
  return (mock.monthlyData ?? []).map(item => ({ label: item.week, value: item.steps }));
});

const chartData = computed(() => ({
  labels: chartItems.value.map(item => item.label),
  values: chartItems.value.map(item => item.value),
}));

const chartTitle = computed(() => {
  if (selectedChartMode.value === 'day') return '今日每小时步数';
  if (selectedChartMode.value === 'week') return '最近 7 天步数';
  return '本月每周步数';
});

const detailLabel = computed(() => {
  if (selectedChartMode.value === 'day') return '时间';
  if (selectedChartMode.value === 'week') return '日期';
  return '周次';
});

const detailCardTitle = computed(() => {
  if (selectedChartMode.value === 'day') return '每日步数明细';
  if (selectedChartMode.value === 'week') return '每日步数明细';
  return '每周步数明细';
});

function formatChartChange(idx: number) {
  if (idx === 0) return '—';
  const diff = chartItems.value[idx].value - chartItems.value[idx - 1].value;
  if (diff === 0) return '持平';
  return `${diff > 0 ? '+' : ''}${diff} 步`;
}

function getChartChangeClass(idx: number) {
  if (idx === 0) return '';
  const diff = chartItems.value[idx].value - chartItems.value[idx - 1].value;
  if (diff > 0) return 'positive';
  if (diff < 0) return 'negative';
  return '';
}

function createSparkline(values: number[]) {
  const width = 600;
  const height = 200;
  const padding = 20;
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 1);
  const range = max - min || 1;
  const points = values
    .map((value, index) => {
      const x = padding + (index * (width - padding * 2)) / Math.max(1, values.length - 1);
      const y = height - padding - ((value - min) / range) * (height - padding * 2);
      return `${x},${y}`;
    })
    .join(" ");
  return { points, width, height };
}

function createColumnChart(values: number[], color = "#2f7cf6", width = 320, height = 188) {
  const padding = 16;
  const min = 0;
  const max = Math.max(...values, 1);
  const range = max - min || 1;
  const innerWidth = width - padding * 2;
  const barWidth = Math.min(20, Math.max(12, innerWidth / Math.max(1, values.length * 2.4)));
  const gap = values.length > 1 ? (innerWidth - barWidth * values.length) / (values.length - 1) : 0;

  const bars = values.map((value, index) => {
    const x = padding + index * (barWidth + gap);
    const barHeight = ((value - min) / range) * (height - padding * 2);
    return {
      x,
      y: height - padding - barHeight,
      width: barWidth,
      height: Math.max(8, barHeight),
      value,
    };
  });

  return { width, height, padding, bars, color };
}

const barChart = computed(() => createColumnChart(chartData.value.values, "#ff7b64"));

function formatNumber(num: number) {
  return num.toLocaleString();
}

function formatChange(idx: number) {
  if (idx === 0) return '—';
  const diff = stepsData.value[idx].steps - stepsData.value[idx-1].steps;
  if (diff === 0) return '持平';
  return `${diff > 0 ? '+' : ''}${diff} 步`;
}

function getChangeClass(idx: number) {
  if (idx === 0) return '';
  const diff = stepsData.value[idx].steps - stepsData.value[idx-1].steps;
  if (diff > 0) return 'positive';
  if (diff < 0) return 'negative';
  return '';
}

function goBack() {
  if (props.navigation?.navigateTo) {
    props.navigation.navigateTo('health/health-data');
  } else {
    window.history.back();
  }
}

// 添加数据跳转（使用 sessionStorage 传递指标类型）
function goToAddData() {
  sessionStorage.setItem('addMetric', 'steps');
  sessionStorage.setItem('addReturnPath', 'health/data-steps');
  props.navigation.navigateTo('health/add-data');
}
</script>

<template>
  <section class="health-data-page">
    <header class="medication-nav">
      <button class="back-btn" type="button" aria-label="返回" @click="goBack">
        <span class="back-arrow" aria-hidden="true"></span>
      </button>
      <h1>{{ props.pageEntry?.title || mock.title || "步数详情" }}</h1>
    </header>

    <main class="medication-scroll">
      <template v-if="healthList">
      
      <section class="latest-small-card">
        <div class="latest-card-main">
          <div>
            <h2 class="small-card-label">最新记录</h2>
            <strong>{{ formatNumber(latest.steps) }} 步</strong>
            <p class="small-card-date">{{ latest.date }}</p>
          </div>
          <div class="latest-card-summary">
            <span>平均步数</span>
            <strong>{{ formatNumber(averageSteps) }}</strong>
            <p>{{ change >= 0 ? `较昨日增加 ${formatNumber(change)} 步` : `较昨日减少 ${formatNumber(Math.abs(change))} 步` }}</p>
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
          <svg class="steps-bar-chart" :viewBox="'0 0 ' + barChart.width + ' ' + barChart.height" preserveAspectRatio="none">
            <defs>
              <linearGradient id="steps-bar-gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#ff7b64" stop-opacity="0.95" />
                <stop offset="100%" stop-color="#ff3f55" stop-opacity="0.9" />
              </linearGradient>
            </defs>
            <g class="metric-card-grid">
              <line :x1="barChart.padding" :y1="barChart.height * 0.2" :x2="barChart.width - barChart.padding" :y2="barChart.height * 0.2" />
              <line :x1="barChart.padding" :y1="barChart.height * 0.4" :x2="barChart.width - barChart.padding" :y2="barChart.height * 0.4" />
              <line :x1="barChart.padding" :y1="barChart.height * 0.6" :x2="barChart.width - barChart.padding" :y2="barChart.height * 0.6" />
              <line :x1="barChart.padding" :y1="barChart.height * 0.8" :x2="barChart.width - barChart.padding" :y2="barChart.height * 0.8" />
            </g>
            <g>
              <rect
                v-for="(bar, index) in barChart.bars"
                :key="index"
                :x="bar.x"
                :y="bar.y"
                :width="bar.width"
                :height="bar.height"
                fill="url(#steps-bar-gradient)"
                rx="12"
              />
              <text
                v-for="(bar, index) in barChart.bars"
                :key="`label-${index}`"
                :x="bar.x + bar.width / 2"
                :y="Math.max(bar.y - 8, 14)"
                text-anchor="middle"
                alignment-baseline="baseline"
                class="bar-label"
              >
                {{ bar.value }}
              </text>
            </g>
            <line
              :x1="barChart.padding"
              :y1="barChart.height - barChart.padding"
              :x2="barChart.width - barChart.padding"
              :y2="barChart.height - barChart.padding"
              class="x-axis-line"
            />
          </svg>
        </div>
        <div class="chart-card__labels">
          <span v-for="label in chartData.labels" :key="label">{{ label }}</span>
        </div>
      </section>

      <section class="metric-blocks-card">
        <div class="metric-blocks-grid">
          <article class="metric-block">
            <span>总步数</span>
            <strong>{{ formatNumber(totalSteps) }}</strong>
            <small>步</small>
          </article>
          <article class="metric-block">
            <span>今日距离</span>
            <strong>{{ formatNumber(todayDistance) }}</strong>
            <small>公里</small>
          </article>
          <article class="metric-block">
            <span>最高步数</span>
            <strong>{{ formatNumber(maxSteps) }}</strong>
            <small>{{ maxDate }}</small>
          </article>
          <article class="metric-block">
            <span>昨日距离</span>
            <strong>{{ formatNumber(yesterdayDistance) }}</strong>
            <small>公里</small>
          </article>
        </div>
      </section>

      <section class="detail-table-card">
        <div class="detail-card__header">
          <div>
            <h2>每日步数明细</h2>
          </div>
        </div>
        <div class="table-wrapper">
          <table class="steps-table">
            <thead>
              <tr>
                <th>日期</th>
                <th>步数</th>
                <th>较前一日变化</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, idx) in stepsData" :key="item.date">
                <td>{{ item.date }}</td>
                <td>{{ formatNumber(item.steps) }} 步</td>
                <td :class="getChangeClass(idx)">{{ formatChange(idx) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <article class="next-steps-card" v-if="mock.nextSteps && mock.nextSteps.length">
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

    <footer class="add-area">
      <button class="add-btn" type="button" @click="goToAddData">+ 添加步数记录</button>
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

.overview-card,
.chart-card,
.stats-grid,
.comparison-card,
.detail-table-card,
.next-steps-card,
.error-card {
  background: rgba(255, 255, 255, 0.94);
  border-radius: 20px;
  box-shadow: 0 15px 34px rgba(72, 104, 148, 0.075);
}

.overview-card {
  position: relative;
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
  min-height: 142px;
  padding: 20px 18px 20px 20px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.72);
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.96) 0%, rgba(239, 246, 255, 0.92) 48%, rgba(226, 252, 244, 0.88) 100%);
}

.overview-card--single {
  grid-template-columns: 1fr;
}

.overview-copy span {
  display: inline-flex;
  align-items: center;
  height: 24px;
  padding: 0 11px;
  border-radius: 999px;
  background: rgba(102, 112, 240, 0.1);
  color: #6670f0;
  font-size: 13px;
  font-weight: 500;
}

.overview-copy h2 {
  margin: 13px 0 0;
  color: #293445;
  font-size: 20px;
  font-weight: 600;
  line-height: 1.35;
}

.overview-copy p {
  margin: 9px 0 0;
  color: #7f8998;
  font-size: 14px;
}

.overview-metrics {
  display: grid;
  place-items: center;
  width: 92px;
  height: 92px;
  border-radius: 28px;
  background: linear-gradient(135deg, #6872f0 0%, #62d8be 100%);
  color: #ffffff;
}

.overview-metrics strong {
  font-size: 28px;
  line-height: 1;
}

.overview-metrics small,
.overview-metrics em {
  color: rgba(255, 255, 255, 0.9);
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
  font-size: 23px;
  font-weight: 600;
}

.chart-card__header strong {
  color: #7f8998;
}

.steps-bar-chart {
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

.bar-label {
  fill: #4e5fa8;
  font-size: 10px;
  font-weight: 600;
}

.x-axis-line {
  stroke: rgba(110, 118, 143, 0.18);
  stroke-width: 1.5;
}

.chart-card__chart {
  position: relative;
}

.chart-card__labels {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(44px, 1fr));
  gap: 6px;
  color: #b7b7bb;
  font-size: 12px;
  padding-top: 8px;
}

.metric-blocks-card {
  background: rgba(255, 255, 255, 0.96);
  border-radius: 26px;
  box-shadow: 0 18px 42px rgba(34, 67, 118, 0.1);
  padding: 18px;
}

.metric-blocks-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.metric-block {
  padding: 18px 16px;
  border-radius: 20px;
  background: #ffffff;
  border: 1px solid rgba(239, 241, 245, 0.9);
  display: grid;
  gap: 8px;
}

.metric-block span {
  color: #b7b7bb;
  font-size: 13px;
}

.metric-block strong {
  font-size: 28px;
  line-height: 1;
}

.metric-block small {
  color: #b7b7bb;
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

.small-card-label {
  display: block;
  margin: 0 0 4px;
  color: #8e8f94;
  font-size: 17px;
  font-weight: 500;
  letter-spacing: 0.03em;
  line-height: 1.25;
}

.latest-card-main > div:first-child {
  display: grid;
  align-content: center;
  min-width: 0;
}

.latest-small-card strong,
.latest-card-summary strong {
  display: block;
  font-size: 28px;
  line-height: 1.08;
  margin-bottom: 4px;
  font-weight: 700;
}

.latest-card-summary {
  box-sizing: border-box;
  width: 124px;
  aspect-ratio: 1;
  min-width: 0;
  padding: 12px 14px;
  border-radius: 20px;
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

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 18px;
}

.stat-card {
  padding: 20px;
  text-align: center;
}

.stat-card span {
  color: #7f8998;
  font-size: 14px;
}

.stat-card strong {
  display: block;
  font-size: 32px;
  margin: 8px 0 4px;
}

.stat-card small {
  color: #7f8998;
}

.comparison-card {
  padding: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
}

.comparison-item {
  text-align: center;
  min-width: 110px;
}

.comparison-item .label {
  color: #7f8998;
  font-size: 12px;
}

.comparison-item .date {
  font-weight: 600;
  margin: 4px 0;
  font-size: 13px;
}

.comparison-item .value {
  font-size: 20px;
  font-weight: 700;
}

.comparison-arrow {
  font-size: 24px;
  color: #2f7cf6;
}

.comparison-change {
  font-size: 18px;
  font-weight: 600;
  padding: 8px 16px;
  border-radius: 40px;
  background: #f0f4fa;
}

.comparison-change.positive {
  color: #2e7d32;
}

.comparison-change.negative {
  color: #c62828;
}

.comparison-change span {
  font-size: 13px;
  font-weight: normal;
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
}

.table-wrapper {
  overflow-x: auto;
}

.steps-table {
  width: 100%;
  border-collapse: collapse;
}

.steps-table th,
.steps-table td {
  padding: 12px 8px;
  text-align: left;
  border-bottom: 1px solid #eef2f8;
}

.steps-table th {
  font-weight: 600;
  color: #2b4469;
}

.steps-table td.positive {
  color: #2e7d32;
}

.steps-table td.negative {
  color: #c62828;
}

.next-steps-card {
  padding: 20px;
}

.next-steps-card strong {
  display: block;
  margin: 10px 0 8px;
  font-size: 20px;
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
  font-size: 20px;
  margin-bottom: 8px;
}

.page-eyebrow {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: #2f7cf6;
  font-weight: 600;
  margin: 0 0 4px;
}

.add-button-container {
  display: flex;
  justify-content: center;
  margin-top: 10px;
}

.add-data-btn {
  background: linear-gradient(135deg, #2f7cf6, #6ba7ff);
  border: none;
  border-radius: 40px;
  padding: 12px 24px;
  color: white;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  box-shadow: 0 4px 12px rgba(47,124,246,0.3);
}

.add-data-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(47,124,246,0.4);
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
  .stats-grid {
    grid-template-columns: 1fr 1fr;
  }
  .comparison-card {
    flex-direction: column;
    align-items: stretch;
    text-align: center;
  }
  .comparison-arrow {
    transform: rotate(90deg);
  }
}

@media (max-width: 389px) {
  .latest-card-main {
    grid-template-columns: 1fr;
  }
}
/* 与健康数据主页保持完全一致的布局风格 */
.steps-detail-page {
  display: grid;
  gap: 18px;
}

/* 所有卡片共用样式 */
.hero-card,
.stat-card,
.comparison-card,
.chart-card,
.detail-card,
.next-steps-card,
.error-card {
  background: rgba(255, 255, 255, 0.96);
  border-radius: 26px;
  box-shadow: 0 18px 42px rgba(34, 67, 118, 0.1);
}

/* 头部卡片（与主页 hero-card 一致） */
.hero-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  background: radial-gradient(circle at top right, rgba(43, 136, 255, 0.18), transparent 28%),
              linear-gradient(135deg, rgba(255, 255, 255, 0.96), rgba(238, 246, 255, 0.98));
}
.hero-card h1 {
  margin: 6px 0 0;
  font-size: 28px;
}
.hero-card__desc {
  margin: 10px 0 0;
  color: var(--muted, #6c7a8e);
  line-height: 1.7;
}
.back-button {
  background: none;
  border: none;
  font-size: 16px;
  color: #2f7cf6;
  cursor: pointer;
  padding: 8px 16px;
  border-radius: 40px;
  transition: background 0.2s;
}
.back-button:hover {
  background: rgba(47, 124, 246, 0.1);
}

/* 统计卡片网格 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 18px;
}
.stat-card {
  padding: 20px;
  text-align: center;
}
.stat-card span {
  color: var(--muted, #6c7a8e);
  font-size: 14px;
}
.stat-card strong {
  display: block;
  font-size: 32px;
  margin: 8px 0 4px;
}
.stat-card small {
  color: var(--muted, #6c7a8e);
}

/* 趋势图卡片（与主页图表卡片一致） */
.chart-card {
  padding: 20px;
}
.chart-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.chart-card__header h3 {
  margin: 0;
  font-size: 18px;
}
.chart-card__header strong {
  color: var(--muted, #6c7a8e);
}
.trend-chart {
  width: 100%;
  height: 200px;
  display: block;
  margin: 12px 0;
}
.chart-card__labels {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  color: var(--muted, #6c7a8e);
  font-size: 12px;
  overflow-x: auto;
}

/* 每日明细卡片（与主页 detail-card 一致） */
.detail-card {
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
}
.table-wrapper {
  overflow-x: auto;
}
.steps-table {
  width: 100%;
  border-collapse: collapse;
}
.steps-table th,
.steps-table td {
  padding: 12px 8px;
  text-align: left;
  border-bottom: 1px solid #eef2f8;
}
.steps-table th {
  font-weight: 600;
  color: #2b4469;
}
.steps-table td.positive {
  color: #2e7d32;
}
.steps-table td.negative {
  color: #c62828;
}

/* 后续计划卡片 */
.next-steps-card {
  padding: 20px;
}
.next-steps-card strong {
  display: block;
  margin: 10px 0 8px;
  font-size: 20px;
}
.next-steps-card p,
.next-steps-card li {
  color: var(--muted, #6c7a8e);
  line-height: 1.7;
}
.next-steps-card ol {
  margin: 12px 0 0;
  padding-left: 20px;
}

/* 错误卡片 */
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

/* 响应式布局（与主页完全一致） */
@media (max-width: 720px) {
  .stats-grid {
    grid-template-columns: 1fr 1fr;
  }
  .hero-card {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }
  .comparison-card {
    flex-direction: column;
    align-items: stretch;
    text-align: center;
  }
  .comparison-arrow {
    transform: rotate(90deg);
  }
  .chart-card__labels span {
    font-size: 10px;
  }
}

.page-eyebrow {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: #2f7cf6;
  font-weight: 600;
  margin: 0 0 4px;
}
.add-button-container {
  display: flex;
  justify-content: center;
  margin-top: 10px;
}
.add-data-btn {
  background: linear-gradient(135deg, #2f7cf6, #6ba7ff);
  border: none;
  border-radius: 40px;
  padding: 12px 24px;
  color: white;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  box-shadow: 0 4px 12px rgba(47,124,246,0.3);
}
.add-data-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(47,124,246,0.4);
}
</style>
