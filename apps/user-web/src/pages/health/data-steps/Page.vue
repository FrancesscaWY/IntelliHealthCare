<script setup lang="ts">
import { computed } from "vue";
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

const stepsData = computed(() => healthList.value?.map(item => ({ date: item.date, steps: item.steps })) || []);
const stepsValues = computed(() => stepsData.value.map(d => d.steps));
const dates = computed(() => stepsData.value.map(d => d.date));

const totalSteps = computed(() => stepsValues.value.reduce((a, b) => a + b, 0));
const averageSteps = computed(() => stepsValues.value.length ? Math.round(totalSteps.value / stepsValues.value.length) : 0);
const maxSteps = computed(() => Math.max(...stepsValues.value, 0));
const minSteps = computed(() => Math.min(...stepsValues.value, 0));
const maxDate = computed(() => stepsData.value.find(d => d.steps === maxSteps.value)?.date || '');
const minDate = computed(() => stepsData.value.find(d => d.steps === minSteps.value)?.date || '');

const latest = computed(() => stepsData.value[stepsData.value.length - 1] || { date: '', steps: 0 });
const previous = computed(() => stepsData.value[stepsData.value.length - 2] ?? latest.value);
const change = computed(() => latest.value.steps - previous.value.steps);
const changePercent = computed(() => previous.value.steps === 0 ? 0 : ((change.value / previous.value.steps) * 100).toFixed(1));

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

const chart = computed(() => createSparkline(stepsValues.value));

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
</script>

<template>
  <section class="steps-detail-page">
    <div class="detail-header">
      <button class="back-button" @click="goBack">← 返回</button>
      <h1>{{ props.pageEntry?.title || mock.title || "步数详情" }}</h1>
      <div></div>
    </div>

    <!-- 数据有效时显示详情，否则显示错误提示 -->
    <template v-if="healthList">
      <div class="summary-card">
        <p class="summary-text">{{ mock.summary || "步数变化趋势分析" }}</p>
      </div>

      <div class="stats-grid">
        <div class="stat-card"><span>总步数</span><strong>{{ formatNumber(totalSteps) }}</strong><small>步</small></div>
        <div class="stat-card"><span>日均步数</span><strong>{{ formatNumber(averageSteps) }}</strong><small>步/天</small></div>
        <div class="stat-card"><span>最高步数</span><strong>{{ formatNumber(maxSteps) }}</strong><small>{{ maxDate }}</small></div>
        <div class="stat-card"><span>最低步数</span><strong>{{ formatNumber(minSteps) }}</strong><small>{{ minDate }}</small></div>
      </div>

      <div class="comparison-card">
        <div class="comparison-item"><p class="label">最新记录</p><p class="date">{{ latest.date }}</p><p class="value">{{ formatNumber(latest.steps) }} 步</p></div>
        <div class="comparison-arrow">→</div>
        <div class="comparison-item"><p class="label">前一日</p><p class="date">{{ previous.date }}</p><p class="value">{{ formatNumber(previous.steps) }} 步</p></div>
        <div class="comparison-change" :class="change >= 0 ? 'positive' : 'negative'">{{ change >= 0 ? '+' : '' }}{{ formatNumber(change) }} 步<span>({{ changePercent }}%)</span></div>
      </div>

      <div class="chart-card large">
        <div class="chart-card__header"><div><p class="page-eyebrow">Trend</p><h2>步数变化趋势</h2></div><strong>近{{ stepsValues.length }}天</strong></div>
        <svg class="large-trend-chart" :viewBox="`0 0 ${chart.width} ${chart.height}`" preserveAspectRatio="none">
          <polyline :points="chart.points" fill="none" stroke="#2f7cf6" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        <div class="chart-card__labels">
          <span v-for="date in dates" :key="date">{{ date.slice(5) }}</span>
        </div>
      </div>

      <div class="detail-table-card">
        <div class="detail-card__header"><div><p class="page-eyebrow">Daily View</p><h2>每日步数明细</h2></div></div>
        <div class="table-wrapper">
          <table class="steps-table">
            <thead>
              <tr><th>日期</th><th>步数</th><th>较前一日变化</th></tr>
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
      </div>

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
  </section>
</template>

<style scoped>
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

/* 最新对比卡片 */
.comparison-card {
  padding: 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
}
.comparison-item {
  text-align: center;
}
.comparison-item .label {
  color: var(--muted, #6c7a8e);
  font-size: 13px;
}
.comparison-item .date {
  font-weight: 600;
  margin: 4px 0;
}
.comparison-item .value {
  font-size: 24px;
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
</style>