<script setup lang="ts">
import { computed } from "vue";
import type { PageComponentProps } from "@ihc/page-core/types";
import mock from "./mock";

const props = defineProps<PageComponentProps>();

const healthList = computed(() => {
  if (mock && mock.list && Array.isArray(mock.list) && mock.list.length > 0) {
    return mock.list;
  }
  return null;
});

// 血糖数据提取
const bloodSugarData = computed(() => healthList.value?.map(item => ({ date: item.date, bloodSugar: item.bloodSugar })) || []);
const bloodSugarValues = computed(() => bloodSugarData.value.map(d => d.bloodSugar));
const dates = computed(() => bloodSugarData.value.map(d => d.date));

const avgBloodSugar = computed(() => {
  if (bloodSugarValues.value.length === 0) return 0;
  const sum = bloodSugarValues.value.reduce((a, b) => a + b, 0);
  return parseFloat((sum / bloodSugarValues.value.length).toFixed(1));
});
const maxBloodSugar = computed(() => Math.max(...bloodSugarValues.value, 0));
const minBloodSugar = computed(() => Math.min(...bloodSugarValues.value, 0));
const maxDate = computed(() => bloodSugarData.value.find(d => d.bloodSugar === maxBloodSugar.value)?.date || '');
const minDate = computed(() => bloodSugarData.value.find(d => d.bloodSugar === minBloodSugar.value)?.date || '');

const latest = computed(() => bloodSugarData.value[bloodSugarData.value.length - 1] || { date: '', bloodSugar: 0 });
const previous = computed(() => bloodSugarData.value[bloodSugarData.value.length - 2] ?? latest.value);
const change = computed(() => latest.value.bloodSugar - previous.value.bloodSugar);
const changePercent = computed(() => previous.value.bloodSugar === 0 ? 0 : ((change.value / previous.value.bloodSugar) * 100).toFixed(1));

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

const chart = computed(() => createSparkline(bloodSugarValues.value));

function formatNumber(num: number) {
  return num.toLocaleString();
}

function formatChange(idx: number) {
  if (idx === 0) return '—';
  const diff = bloodSugarData.value[idx].bloodSugar - bloodSugarData.value[idx-1].bloodSugar;
  if (diff === 0) return '持平';
  return `${diff > 0 ? '+' : ''}${diff.toFixed(1)} mmol/L`;
}

function getChangeClass(idx: number) {
  if (idx === 0) return '';
  const diff = bloodSugarData.value[idx].bloodSugar - bloodSugarData.value[idx-1].bloodSugar;
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
  <section class="bloodsugar-detail-page">
    <div class="hero-card">
      <div>
        <p class="page-eyebrow">血糖详情</p>
        <h1>{{ props.pageEntry?.title || mock.title || "血糖分析" }}</h1>
        <p class="hero-card__desc">{{ mock.summary || "查看每日血糖变化趋势与明细" }}</p>
      </div>
      <button class="back-button" @click="goBack">← 返回</button>
    </div>

    <template v-if="healthList">
      <div class="stats-grid">
        <div class="stat-card"><span>平均血糖</span><strong>{{ avgBloodSugar }}</strong><small>mmol/L</small></div>
        <div class="stat-card"><span>最高血糖</span><strong>{{ maxBloodSugar }}</strong><small>{{ maxDate }}</small></div>
        <div class="stat-card"><span>最低血糖</span><strong>{{ minBloodSugar }}</strong><small>{{ minDate }}</small></div>
        <div class="stat-card"><span>正常范围</span><strong>≤6.1</strong><small>mmol/L</small></div>
      </div>

      <div class="comparison-card">
        <div class="comparison-item"><p class="label">最新记录</p><p class="date">{{ latest.date }}</p><p class="value">{{ latest.bloodSugar }} mmol/L</p></div>
        <div class="comparison-arrow">→</div>
        <div class="comparison-item"><p class="label">前一日</p><p class="date">{{ previous.date }}</p><p class="value">{{ previous.bloodSugar }} mmol/L</p></div>
        <div class="comparison-change" :class="change >= 0 ? 'positive' : 'negative'">{{ change >= 0 ? '+' : '' }}{{ change.toFixed(1) }} mmol/L<span>({{ changePercent }}%)</span></div>
      </div>

      <div class="chart-card">
        <div class="chart-card__header">
          <div>
            <p class="page-eyebrow">Trend</p>
            <h3>血糖变化趋势</h3>
          </div>
          <strong>近{{ bloodSugarValues.length }}天</strong>
        </div>
        <svg class="trend-chart" :viewBox="`0 0 ${chart.width} ${chart.height}`" preserveAspectRatio="none">
          <polyline :points="chart.points" fill="none" stroke="#e67e22" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        <div class="chart-card__labels">
          <span v-for="date in dates" :key="date">{{ date.slice(5) }}</span>
        </div>
      </div>

      <div class="detail-card">
        <div class="detail-card__header">
          <div>
            <p class="page-eyebrow">Daily View</p>
            <h2>每日血糖明细</h2>
          </div>
        </div>
        <div class="table-wrapper">
          <table class="bloodsugar-table">
            <thead>
              <tr><th>日期</th><th>血糖 (mmol/L)</th><th>较前一日变化</th></tr>
            </thead>
            <tbody>
              <tr v-for="(item, idx) in bloodSugarData" :key="item.date">
                <td>{{ item.date }}</td>
                <td>{{ item.bloodSugar }} mmol/L</td>
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
/* 与之前的详情页样式完全一致，仅类名改为 bloodsugar-detail-page */
.bloodsugar-detail-page {
  display: grid;
  gap: 18px;
  min-height: 100vh;
  overflow-y: auto;
}
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
.bloodsugar-table {
  width: 100%;
  border-collapse: collapse;
}
.bloodsugar-table th,
.bloodsugar-table td {
  padding: 12px 8px;
  text-align: left;
  border-bottom: 1px solid #eef2f8;
}
.bloodsugar-table th {
  font-weight: 600;
  color: #2b4469;
}
.bloodsugar-table td.positive {
  color: #2e7d32;
}
.bloodsugar-table td.negative {
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
  color: var(--muted, #6c7a8e);
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