<script setup lang="ts">
import { computed } from "vue";
import type { PageComponentProps } from "@ihc/page-core/types";
import mock from "./mock";

const props = defineProps<PageComponentProps>();

type HealthDataItem = (typeof mock.list)[number];

const dataList = computed<HealthDataItem[]>(() => mock.list);
const latest = computed(() => dataList.value[dataList.value.length - 1]);
const previous = computed(() => dataList.value[dataList.value.length - 2] ?? latest.value);

const summaryCards = computed(() => {
  const current = latest.value;
  const prev = previous.value;

  return [
    {
      key: "steps",
      label: "步数",
      value: current.steps.toLocaleString(),
      unit: "步",
      change: current.steps - prev.steps,
      tone: current.steps >= 8000 ? "good" : "warn",
    },
    {
      key: "heartRate",
      label: "心率",
      value: `${current.heartRate}`,
      unit: "bpm",
      change: current.heartRate - prev.heartRate,
      tone: current.heartRate <= 80 ? "good" : "warn",
    },
    {
      key: "sleep",
      label: "睡眠",
      value: `${current.sleep}`,
      unit: "小时",
      change: current.sleep - prev.sleep,
      tone: current.sleep >= 7 ? "good" : "warn",
    },

    {
      key: "weight",
      label: "体重",
      value: `${current.weight}`,
      unit: "kg",
      change: current.weight - prev.weight,
      tone: current.weight <= prev.weight ? "good" : "warn",
    },
    {
      key: "bloodSugar",
      label: "血糖",
      value: `${current.bloodSugar}`,
      unit: "mmol/L",
      change: current.bloodSugar - prev.bloodSugar,
      tone: current.bloodSugar <= 6 ? "good" : "warn",
    },
    {
      key: "bloodPressure",
      label: "血压",
      value: current.bloodPressure,
      unit: "",
      change: 0,
      tone: "good",
    },
    {
      key: "oxygen",
      label: "血氧",
      value: `${current.oxygen}`,
      unit: "%",
      change: current.oxygen - prev.oxygen,
      tone: current.oxygen >= 95 ? "good" : "warn",
    },
    {
      key: "stress",
      label: "压力",
      value: `${current.stress}`,
      unit: "",
      change: current.stress - prev.stress,
      tone: current.stress <= 50 ? "good" : "warn",
    },
  ];
});

const healthScore = computed(() => {
  const current = latest.value;
  const stepScore = Math.min(100, Math.round((current.steps / 10000) * 100));
  const sleepScore = Math.min(100, Math.round((current.sleep / 8) * 100));
  const heartRateScore = Math.max(0, 100 - Math.max(0, current.heartRate - 70) * 4);

  return Math.round(stepScore * 0.45 + sleepScore * 0.3 + heartRateScore * 0.25);
});

const scoreLabel = computed(() => {
  if (healthScore.value >= 90) return "状态很稳";
  if (healthScore.value >= 75) return "状态良好";
  return "建议关注";
});

const trendText = computed(() => {
  const current = latest.value;
  const prev = previous.value;
  const trend: string[] = [];

  trend.push(current.steps >= prev.steps ? "最近活动量有回升" : "最近活动量略有下降");
  trend.push(current.sleep >= 7 ? "睡眠时长达标" : "睡眠时长偏少");
  trend.push(current.heartRate <= 80 ? "静息心率稳定" : "心率偏高，注意休息");

  // ✅ 新增
  trend.push(current.bloodSugar <= 6 ? "血糖正常" : "血糖偏高");
  trend.push(current.oxygen >= 95 ? "血氧正常" : "血氧偏低");
  trend.push(current.stress <= 50 ? "压力较低" : "压力偏高");

  return `${trend.join("，")}。`;
});

const insights = computed(() => {
  const stepsPeak = [...dataList.value].sort((a, b) => b.steps - a.steps)[0];
  const sleepPeak = [...dataList.value].sort((a, b) => b.sleep - a.sleep)[0];
  const heartRateLow = [...dataList.value].sort((a, b) => a.heartRate - b.heartRate)[0];

  // ✅ 新增
  const sugarBest = [...dataList.value].sort((a, b) => a.bloodSugar - b.bloodSugar)[0];
  const stressLowest = [...dataList.value].sort((a, b) => a.stress - b.stress)[0];

  return [
    `最佳活动日：${stepsPeak.date}，步数 ${stepsPeak.steps.toLocaleString()}。`,
    `最佳睡眠日：${sleepPeak.date}，睡眠 ${sleepPeak.sleep} 小时。`,
    `最平稳心率：${heartRateLow.date}，心率 ${heartRateLow.heartRate} bpm。`,

    // ✅ 新增
    `最佳血糖：${sugarBest.date}，血糖 ${sugarBest.bloodSugar} mmol/L。`,
    `最低压力日：${stressLowest.date}，压力 ${stressLowest.stress}。`,
  ];
});

function createSparkline(values: number[]) {
  const width = 300;
  const height = 84;
  const padding = 10;
  const min = Math.min(...values);
  const max = Math.max(...values);
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

const trendCharts = computed(() => {
  const stepsValues = dataList.value.map((item) => item.steps);
  const heartRateValues = dataList.value.map((item) => item.heartRate);
  const sleepValues = dataList.value.map((item) => item.sleep);

  // ✅ 新增
  const weightValues = dataList.value.map((item) => item.weight);
  const sugarValues = dataList.value.map((item) => item.bloodSugar);
  const oxygenValues = dataList.value.map((item) => item.oxygen);

  return [
    {
      key: "steps",
      title: "步数趋势",
      unit: "步",
      values: stepsValues,
      average: Math.round(stepsValues.reduce((s, v) => s + v, 0) / stepsValues.length),
      stroke: "#2f7cf6",
      sparkline: createSparkline(stepsValues),
    },
    {
      key: "heartRate",
      title: "心率趋势",
      unit: "bpm",
      values: heartRateValues,
      average: Math.round(heartRateValues.reduce((s, v) => s + v, 0) / heartRateValues.length),
      stroke: "#ff7b64",
      sparkline: createSparkline(heartRateValues),
    },
    {
      key: "sleep",
      title: "睡眠趋势",
      unit: "小时",
      values: sleepValues,
      average: Math.round((sleepValues.reduce((s, v) => s + v, 0) / sleepValues.length) * 10) / 10,
      stroke: "#33b18a",
      sparkline: createSparkline(sleepValues),
    },

    // ✅ 新增
    {
      key: "weight",
      title: "体重趋势",
      unit: "kg",
      values: weightValues,
      average: Math.round(weightValues.reduce((s, v) => s + v, 0) / weightValues.length),
      stroke: "#8e44ad",
      sparkline: createSparkline(weightValues),
    },
    {
      key: "bloodSugar",
      title: "血糖趋势",
      unit: "mmol/L",
      values: sugarValues,
      average: Math.round(sugarValues.reduce((s, v) => s + v, 0) / sugarValues.length * 10) / 10,
      stroke: "#e67e22",
      sparkline: createSparkline(sugarValues),
    },
    {
      key: "oxygen",
      title: "血氧趋势",
      unit: "%",
      values: oxygenValues,
      average: Math.round(oxygenValues.reduce((s, v) => s + v, 0) / oxygenValues.length),
      stroke: "#16a085",
      sparkline: createSparkline(oxygenValues),
    },
  ];
});

const stepBars = computed(() => {
  const maxSteps = Math.max(...dataList.value.map((item) => item.steps), 1);

  return dataList.value.map((item) => ({
    ...item,
    ratio: `${Math.max(12, Math.round((item.steps / maxSteps) * 100))}%`,
  }));
});

function formatDelta(value: number, unit: string) {
  if (value === 0) {
    return `较前一天持平`;
  }

  const prefix = value > 0 ? "+" : "";
  return `${prefix}${value} ${unit}`;
}

// 将summary和chart配对（仅用于有趋势图的指标）
const pairedMetrics = computed(() => {
  const pairs = [];
  const pairedKeys = ['steps', 'heartRate', 'sleep', 'weight', 'bloodSugar', 'oxygen'];
  for (const key of pairedKeys) {
    const summary = summaryCards.value.find(card => card.key === key);
    const chart = trendCharts.value.find(chart => chart.key === key);
    if (summary && chart) {
      pairs.push({ summary, chart });
    }
  }
  return pairs;
});

// 没有趋势图的指标（血压、压力）
const standaloneMetrics = computed(() => {
  return summaryCards.value.filter(card => !['steps', 'heartRate', 'sleep', 'weight', 'bloodSugar', 'oxygen'].includes(card.key));
});
</script>

<template>
  <section class="health-data-page">
    <article class="hero-card">
      <div>
        <p class="page-eyebrow">Health Data</p>
        <h1>健康数据可视页</h1>
        <p class="hero-card__desc">
          汇总最近 {{ dataList.length }} 天的步数、心率和睡眠数据，帮助快速判断身体状态变化。
        </p>
      </div>

      <div class="score-card">
        <span>健康评分</span>
        <strong>{{ healthScore }}</strong>
        <em>{{ scoreLabel }}</em>
      </div>
    </article>

    <article class="insight-card">
      <div class="insight-card__header">
        <div>
          <p class="page-eyebrow">Insight</p>
          <h2>趋势分析</h2>
        </div>
        <!-- 查看报告按钮已删除 -->
      </div>
      <p class="insight-card__copy">{{ trendText }}</p>
      <div class="insight-list">
        <div v-for="item in insights" :key="item" class="insight-item">{{ item }}</div>
      </div>
    </article>

    <!-- 配对区域：每个指标的数字卡片 + 趋势图 -->
    <div class="paired-metrics-grid">
      <div v-for="pair in pairedMetrics" :key="pair.summary.key" class="metric-pair" :class="{ 'clickable-metric': pair.summary.key === 'steps' }"
        @click="(pair.summary.key === 'steps' && props.navigation.navigateTo('health/data-steps'))
        || (pair.summary.key === 'heartRate' && props.navigation.navigateTo('health/data-heartrate'))
        ||(pair.summary.key === 'sleep' && props.navigation.navigateTo('health/data-sleep'))
        ||(pair.summary.key === 'weight' && props.navigation.navigateTo('health/data-weight'))
        ||(pair.summary.key === 'bloodSugar' && props.navigation.navigateTo('health/data-bloodglucose'))
        ||(pair.summary.key === 'oxygen' && props.navigation.navigateTo('health/data-spo2'))
        || (pair.summary.key === 'bloodPressure' && props.navigation.navigateTo('health/data-bloodpressure'))
        || (pair.summary.key === 'stress' && props.navigation.navigateTo('health/data-pressure'))
        ">        
        <!-- 数字卡片部分（复用原有样式，移除背景和阴影） -->
        <div
          class="summary-card pair-summary"
          :class="`summary-card--${pair.summary.tone}`"
        >
          <span>{{ pair.summary.label }}</span>
          <strong>{{ pair.summary.value }}</strong>
          <small>{{ pair.summary.unit }}</small>
          <p>{{ formatDelta(pair.summary.change, pair.summary.unit) }}</p>
        </div>

        <!-- 趋势图部分（复用原有图表卡片样式，移除背景和阴影） -->
        <div class="chart-card pair-chart">
          <div class="chart-card__header">
            <div>
              <p class="page-eyebrow">Trend</p>
              <h3>{{ pair.chart.title }}</h3>
            </div>
            <strong>均值 {{ pair.chart.average }} {{ pair.chart.unit }}</strong>
          </div>

          <svg
            class="trend-chart"
            :viewBox="`0 0 ${pair.chart.sparkline.width} ${pair.chart.sparkline.height}`"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <polyline
              :points="pair.chart.sparkline.points"
              fill="none"
              :stroke="pair.chart.stroke"
              stroke-width="4"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>

          <div class="chart-card__labels">
            <span v-for="item in dataList" :key="`${pair.summary.key}-${item.date}`">{{ item.date.slice(5) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 独立指标（无趋势图）血压 & 压力 -->
    <div class="standalone-metrics-grid">
      <article
        v-for="card in standaloneMetrics"
        :key="card.key"
        class="summary-card"
        :class="`summary-card--${card.tone}`"
      >
        <span>{{ card.label }}</span>
        <strong>{{ card.value }}</strong>
        <small>{{ card.unit }}</small>
        <p>{{ formatDelta(card.change, card.unit) }}</p>
      </article>
    </div>

    <article class="detail-card">
      <div class="detail-card__header">
        <div>
          <p class="page-eyebrow">Daily View</p>
          <h2>每日对比</h2>
        </div>
        <span class="detail-card__date">最新记录 {{ latest.date }}</span>
      </div>

      <div class="day-list">
        <article v-for="item in stepBars" :key="item.date" class="day-item">
          <div class="day-item__top">
            <strong>{{ item.date }}</strong>
            <span>{{ item.steps.toLocaleString() }} 步</span>
          </div>
          <div class="day-item__bar">
            <span class="day-item__fill" :style="{ width: item.ratio }"></span>
          </div>
          <div class="day-item__meta">
            <span>心率 {{ item.heartRate }} bpm</span>
            <span>睡眠 {{ item.sleep }} 小时</span>
          </div>
        </article>
      </div>
    </article>
  </section>
</template>

<style scoped>
.health-data-page {
  display: grid;
  gap: 18px;
}

.hero-card,
.insight-card,
.detail-card,
.summary-card,
.chart-card {
  background: rgba(255, 255, 255, 0.96);
  border-radius: 26px;
  box-shadow: 0 18px 42px rgba(34, 67, 118, 0.1);
}

.hero-card,
.insight-card,
.detail-card {
  padding: 20px;
}

.hero-card {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: stretch;
  background:
    radial-gradient(circle at top right, rgba(43, 136, 255, 0.18), transparent 28%),
    linear-gradient(135deg, rgba(255, 255, 255, 0.96), rgba(238, 246, 255, 0.98));
}

.hero-card h1,
.insight-card h2,
.detail-card h2,
.chart-card h3 {
  margin: 6px 0 0;
}

.hero-card__desc,
.insight-card__copy {
  margin: 10px 0 0;
  color: var(--muted);
  line-height: 1.7;
}

.score-card {
  min-width: 120px;
  padding: 16px;
  border-radius: 22px;
  background: linear-gradient(180deg, #2f7cf6 0%, #6ba7ff 100%);
  color: #fff;
  display: grid;
  align-content: center;
  justify-items: center;
}

.score-card strong {
  font-size: 40px;
  line-height: 1;
  margin: 8px 0 4px;
}

.score-card em {
  font-style: normal;
  opacity: 0.9;
}

/* 配对区域网格布局 */
.paired-metrics-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

/* 每个配对卡片容器 */
.metric-pair {
  background: rgba(255, 255, 255, 0.96);
  border-radius: 26px;
  box-shadow: 0 18px 42px rgba(34, 67, 118, 0.1);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* 配对卡片内的数字卡片部分：移除自身的背景和阴影，并调整边距 */
.pair-summary {
  background: transparent !important;
  box-shadow: none !important;
  border-radius: 0;
  padding: 20px 20px 12px 20px;
  margin: 0;
}

/* 配对卡片内的图表卡片部分：移除自身的背景和阴影，并调整边距 */
.pair-chart {
  background: transparent !important;
  box-shadow: none !important;
  border-radius: 0;
  padding: 0 20px 20px 20px;
  margin: 0;
}

/* 保留原始卡片样式供独立指标使用 */
.summary-card {
  padding: 18px 16px;
  display: grid;
  gap: 6px;
}

.summary-card span,
.summary-card small,
.summary-card p,
.chart-card strong,
.detail-card__date,
.day-item__meta {
  color: var(--muted);
}

.summary-card strong {
  font-size: 28px;
  line-height: 1;
}

.summary-card p {
  margin: 4px 0 0;
  font-size: 13px;
}

.summary-card--good {
  background: linear-gradient(180deg, rgba(240, 250, 246, 1) 0%, rgba(255, 255, 255, 0.96) 100%);
}

.summary-card--warn {
  background: linear-gradient(180deg, rgba(255, 247, 242, 1) 0%, rgba(255, 255, 255, 0.96) 100%);
}

/* 独立指标（无趋势图）网格布局 */
.standalone-metrics-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.insight-card {
  display: grid;
  gap: 14px;
}

.insight-card__header,
.detail-card__header,
.chart-card__header,
.day-item__top,
.day-item__meta {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
}

.insight-list {
  display: grid;
  gap: 10px;
}

.insight-item {
  padding: 12px 14px;
  border-radius: 18px;
  background: linear-gradient(90deg, rgba(47, 124, 246, 0.08), rgba(51, 177, 138, 0.08));
  color: #2b4469;
}

.chart-card {
  padding: 18px;
}

.trend-chart {
  width: 100%;
  height: 90px;
  margin-top: 14px;
  display: block;
}

.chart-card__labels {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  margin-top: 8px;
  color: var(--muted);
  font-size: 12px;
}

.detail-card {
  display: grid;
  gap: 16px;
}

.day-list {
  display: grid;
  gap: 12px;
}

.day-item {
  padding: 14px;
  border-radius: 20px;
  background: #f8fbff;
}

.day-item__top span {
  color: #35527d;
  font-weight: 700;
}

.day-item__bar {
  height: 10px;
  margin: 12px 0 10px;
  border-radius: 999px;
  background: rgba(47, 124, 246, 0.08);
  overflow: hidden;
}

.day-item__fill {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #2f7cf6 0%, #77b1ff 100%);
}

.day-item__meta {
  font-size: 13px;
}

@media (max-width: 720px) {
  .paired-metrics-grid,
  .standalone-metrics-grid {
    grid-template-columns: 1fr;
  }

  .hero-card,
  .insight-card__header,
  .detail-card__header {
    grid-template-columns: 1fr;
  }

  .hero-card,
  .insight-card__header,
  .detail-card__header,
  .chart-card__header,
  .day-item__top,
  .day-item__meta {
    display: grid;
    justify-content: stretch;
  }

  .score-card {
    min-width: 0;
  }

}

.clickable-metric {
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.clickable-metric:hover {
  transform: translateY(-2px);
  box-shadow: 0 24px 48px rgba(34, 67, 118, 0.15);
}
</style>