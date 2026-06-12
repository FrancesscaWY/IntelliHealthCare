<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef } from "vue";
import * as echarts from "echarts";
import type { PageComponentProps } from "@ihc/page-core/types";
import { getAnalyticsTradeOverview } from "@/shared/api/analytics";
import { handleAdminPageError } from "@/shared/api/error";
import mock from "./mock";

const props = defineProps<PageComponentProps>();
const pageData = ref<typeof mock>(mock);

const lineRef = ref<HTMLElement | null>(null);
const barRef = ref<HTMLElement | null>(null);
const lineChart = shallowRef<echarts.ECharts | null>(null);
const barChart = shallowRef<echarts.ECharts | null>(null);

const metricTones = ["mint", "blue", "rose", "teal", "amber", "pink"] as const;
const overviewItems = computed(() => pageData.value.overviewRows.flat());
const spotlightSeries = computed(() => pageData.value.spotlightCharts);

function buildSparkPoints(values: readonly number[], width = 150, height = 44) {
  if (!values.length) {
    return "";
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  return values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * width;
      const y = height - ((value - min) / range) * (height - 10) - 5;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
}

function buildSparkArea(points: string, width = 150, height = 44) {
  const normalized = points.trim().split(/\s+/);
  const firstPoint = normalized[0];
  const lastPoint = normalized[normalized.length - 1];

  if (!firstPoint || !lastPoint) {
    return "";
  }

  const [firstX] = firstPoint.split(",");
  const [lastX] = lastPoint.split(",");
  return `${firstX},${height} ${points} ${lastX},${height}`;
}

function getOverviewItem(label: string) {
  return overviewItems.value.find((item) => item.label === label);
}

const topMetricItems = computed(() => [
  { ...(getOverviewItem("浏览量") || { label: "浏览量", value: "--" }), tone: metricTones[0] },
  { ...(getOverviewItem("访客量") || { label: "访客量", value: "--" }), tone: metricTones[1] },
  { ...(getOverviewItem("退款订单数") || { label: "退款订单数", value: "--" }), tone: metricTones[2] },
  { ...(getOverviewItem("退款金额（元）") || { label: "退款金额（元）", value: "--" }), tone: metricTones[4] },
  { ...(getOverviewItem("退款率") || { label: "退款率", value: "--" }), tone: metricTones[3] },
]);

const spotlightMetricItems = computed(() =>
  [
    {
      ...(getOverviewItem("支付金额（元）") || { label: "支付金额（元）", value: "--" }),
      label: "支付金额(元)",
      note: "重点成交金额",
      tone: "amber" as const,
      lineColor: "#f1b24b",
      lineGlow: "rgba(241, 178, 75, 0.22)",
      series: spotlightSeries.value.paymentAmount,
    },
    {
      ...(getOverviewItem("支付订单数") || { label: "支付订单数", value: "--" }),
      label: "订单数",
      note: "已支付订单总量",
      tone: "mint" as const,
      lineColor: "#55c9b4",
      lineGlow: "rgba(85, 201, 180, 0.22)",
      series: spotlightSeries.value.orderCount,
    },
  ].map((item, index) => {
    const points = buildSparkPoints(item.series.values);

    return {
      ...item,
      gradientId: `trade-spotlight-gradient-${index}`,
      points,
      areaPoints: buildSparkArea(points),
      axisLabels: [
        item.series.labels[0],
        item.series.labels[Math.floor(item.series.labels.length / 2)],
        item.series.labels[item.series.labels.length - 1],
      ],
    };
  }),
);

const funnelSummary = computed(() => {
  const primary = pageData.value.funnel[0];
  const secondary = pageData.value.funnel[pageData.value.funnel.length - 1];

  return {
    primary: primary?.label || "访客",
    secondary: secondary?.label || "退款",
  };
});

function buildLineOption() {
  const { labels, values, legend, highlightIndex } = pageData.value.lineChart;
  const maxValue = Math.max(...values);

  return {
    animationDuration: 500,
    grid: {
      top: 20,
      right: 14,
      bottom: 28,
      left: 42,
    },
    tooltip: {
      trigger: "axis",
      backgroundColor: "rgba(255,255,255,0.96)",
      borderColor: "#dfeeea",
      borderWidth: 1,
      padding: [10, 12],
      textStyle: {
        color: "#2f3946",
        fontSize: 12,
        fontWeight: 700,
      },
      formatter(params: unknown) {
        const records = (Array.isArray(params) ? params : [params]) as Array<{ axisValueLabel?: string; value?: number }>;
        const item = records[0];
        return `${item?.axisValueLabel || ""}<br/>${legend}：${item?.value ?? "--"}`;
      },
    },
    xAxis: {
      type: "category",
      data: labels,
      boundaryGap: false,
      axisLine: { lineStyle: { color: "#edf2ef" } },
      axisTick: { show: false },
      axisLabel: { color: "#7a8490", fontSize: 12, fontWeight: 700, margin: 14 },
    },
    yAxis: {
      type: "value",
      min: 0,
      max: Math.ceil(maxValue * 1.2),
      splitNumber: 6,
      axisLabel: { color: "#7a8490", fontSize: 12, fontWeight: 700 },
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: "#edf3f1" } },
    },
    series: [
      {
        type: "bar",
        data: values.map((value, index) => (index === highlightIndex ? value : 0)),
        barWidth: 28,
        z: 1,
        silent: true,
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: "rgba(84, 195, 154, 0.22)" },
            { offset: 1, color: "rgba(84, 195, 154, 0.92)" },
          ]),
          borderRadius: [10, 10, 0, 0],
        },
      },
      {
        name: legend,
        type: "line",
        data: values,
        smooth: true,
        symbol: "circle",
        symbolSize: 9,
        z: 3,
        lineStyle: {
          width: 3,
          color: "#42b884",
        },
        itemStyle: {
          color: "#42b884",
          borderColor: "#ffffff",
          borderWidth: 2,
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: "rgba(84, 195, 154, 0.34)" },
            { offset: 1, color: "rgba(84, 195, 154, 0.04)" },
          ]),
        },
        markLine: {
          silent: true,
          symbol: "none",
          label: { show: false },
          lineStyle: {
            color: "#42b884",
            width: 2,
            type: "dashed",
          },
          data: [{ xAxis: labels[highlightIndex] }],
        },
      },
    ],
  };
}

function buildBarOption() {
  const { labels, values, legend, highlightIndex } = pageData.value.barChart;

  return {
    animationDuration: 500,
    grid: {
      top: 20,
      right: 14,
      bottom: 34,
      left: 42,
    },
    tooltip: {
      trigger: "axis",
      backgroundColor: "rgba(255,255,255,0.96)",
      borderColor: "#dfeeea",
      borderWidth: 1,
      padding: [10, 12],
      textStyle: {
        color: "#2f3946",
        fontSize: 12,
        fontWeight: 700,
      },
    },
    xAxis: {
      type: "category",
      data: labels,
      axisLine: { lineStyle: { color: "#edf2ef" } },
      axisTick: { show: false },
      axisLabel: {
        color: "#7a8490",
        fontSize: 11,
        fontWeight: 700,
        margin: 14,
        interval: 0,
      },
    },
    yAxis: {
      type: "value",
      axisLabel: { color: "#7a8490", fontSize: 12, fontWeight: 700 },
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: "#edf3f1" } },
    },
    series: [
      {
        name: legend,
        type: "bar",
        barWidth: 44,
        data: values.map((value, index) => ({
          value,
          itemStyle: {
            color:
              index === highlightIndex
                ? new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                    { offset: 0, color: "#91e2b2" },
                    { offset: 1, color: "#4dbc8c" },
                  ])
                : new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                    { offset: 0, color: "#cdeee1" },
                    { offset: 1, color: "#7fd6b0" },
                  ]),
            borderRadius: [10, 10, 0, 0],
          },
        })),
        label: {
          show: true,
          position: "top",
          color: "#2f3946",
          fontSize: 12,
          fontWeight: 800,
          formatter(params: { value: number }) {
            return params.value === values[highlightIndex] ? `${params.value}` : "";
          },
        },
      },
    ],
  };
}

function renderCharts() {
  if (lineRef.value && !lineChart.value) {
    lineChart.value = echarts.init(lineRef.value);
  }

  if (barRef.value && !barChart.value) {
    barChart.value = echarts.init(barRef.value);
  }

  lineChart.value?.setOption(buildLineOption(), true);
  barChart.value?.setOption(buildBarOption(), true);
}

function handleResize() {
  lineChart.value?.resize();
  barChart.value?.resize();
}

function trigger(label: string) {
  props.showToast(`${label}为演示状态。`);
}

async function syncPageData() {
  try {
    pageData.value = (await getAnalyticsTradeOverview()) as typeof mock;
  } catch (error) {
    handleAdminPageError(error, {
      navigation: props.navigation,
      showToast: props.showToast,
      fallbackMessage: "交易概况加载失败，已回退到演示数据",
    });
  }

  await nextTick();
  renderCharts();
}

onMounted(() => {
  void syncPageData();
  window.addEventListener("resize", handleResize);
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", handleResize);
  lineChart.value?.dispose();
  barChart.value?.dispose();
  lineChart.value = null;
  barChart.value = null;
});
</script>

<template>
  <section class="trade-overview-page">
    <article class="trade-hero">
      <div class="trade-hero__main">
        <div class="trade-hero__copy">
          <h1>{{ pageData.title }}</h1>
          <p class="trade-hero__description">
            聚焦浏览、下单、支付与退款链路，用统一的运营看板视觉查看交易转化情况。
          </p>
        </div>

        <button class="date-range date-range--hero" type="button" @click="trigger('日期筛选')">
          <span class="date-range__label">{{ pageData.filterLabel }}</span>
          <strong>{{ pageData.rangeLabel }}</strong>
          <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
            <path d="M7 3v3M17 3v3M4 9h16M6 6h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z" />
          </svg>
        </button>
      </div>
    </article>

    <section class="metrics-panel" aria-label="交易核心指标">
      <header class="metrics-panel__head">
        <h2>交易核心指标</h2>
      </header>

      <div class="metric-grid">
        <article v-for="item in topMetricItems" :key="item.label" class="metric-card" :class="`metric-card--${item.tone}`">
          <div class="metric-copy">
            <strong>{{ item.value }}</strong>
            <h2>{{ item.label }}</h2>
          </div>
        </article>
      </div>

      <div class="spotlight-grid">
        <article
          v-for="item in spotlightMetricItems"
          :key="item.label"
          class="spotlight-card"
          :class="`spotlight-card--${item.tone}`"
          :style="{ '--chart-glow': item.lineGlow }"
        >
          <div class="spotlight-card__copy">
            <span>{{ item.label }}</span>
            <strong>{{ item.value }}</strong>
            <p>{{ item.note }}</p>
          </div>

          <div class="spotlight-card__chart">
            <svg viewBox="0 0 150 44" preserveAspectRatio="none" aria-hidden="true">
              <defs>
                <linearGradient :id="item.gradientId" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" :stop-color="item.lineColor" stop-opacity="0.26" />
                  <stop offset="100%" :stop-color="item.lineColor" stop-opacity="0.03" />
                </linearGradient>
              </defs>
              <polygon :points="item.areaPoints" :fill="`url(#${item.gradientId})`" />
              <polyline
                :points="item.points"
                fill="none"
                :stroke="item.lineColor"
                stroke-width="3"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
            <div class="spotlight-card__axis">
              <span v-for="axisLabel in item.axisLabels" :key="axisLabel">{{ axisLabel }}</span>
            </div>
          </div>
        </article>
      </div>
    </section>

    <section class="trade-grid">
      <article class="panel funnel-panel">
        <header class="panel-head">
          <h2>交易转化漏斗 <small>（链路概览）</small></h2>
        </header>

        <div class="funnel-summary">
          <strong>{{ funnelSummary.primary }}</strong>
          <span>到 {{ funnelSummary.secondary }} 的交易层级转化</span>
        </div>

        <div class="funnel-list">
          <div v-for="item in pageData.funnel" :key="item.label" class="funnel-row">
            <span class="funnel-row__label">{{ item.label }}</span>
            <div class="funnel-row__track">
              <div class="funnel-row__bar" :style="{ width: item.width, background: item.color }"></div>
            </div>
          </div>
        </div>
      </article>

      <article class="panel chart-panel">
        <header class="panel-head">
          <h2>{{ pageData.lineChart.title }} <small>（元）</small></h2>
        </header>
        <div ref="lineRef" class="chart-box chart-box--line"></div>
        <div class="chart-legend">
          <span class="chart-legend__dot"></span>
          <span>{{ pageData.lineChart.legend }}</span>
        </div>
      </article>

      <article class="panel chart-panel">
        <header class="panel-head">
          <h2>{{ pageData.barChart.title }} <small>（元）</small></h2>
        </header>
        <div ref="barRef" class="chart-box chart-box--bar"></div>
        <div class="chart-legend">
          <span class="chart-legend__dot"></span>
          <span>{{ pageData.barChart.legend }}</span>
        </div>
      </article>
    </section>
  </section>
</template>

<style scoped>
.trade-overview-page {
  display: grid;
  gap: 16px;
  width: 100%;
  min-width: 0;
  color: #253244;
  font-family: "PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif;
}

.trade-hero,
.metrics-panel,
.metric-card,
.spotlight-card,
.panel {
  border: 1px solid rgba(224, 240, 238, 0.86);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 8px 24px rgba(66, 122, 116, 0.08);
}

.trade-hero {
  position: relative;
  overflow: hidden;
  padding: 18px;
  background:
    radial-gradient(circle at top right, rgba(170, 235, 255, 0.34), transparent 26%),
    radial-gradient(circle at left top, rgba(102, 214, 174, 0.18), transparent 28%),
    linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(245, 251, 248, 0.96));
}

.trade-hero::after {
  content: "";
  position: absolute;
  right: -40px;
  top: -52px;
  width: 180px;
  height: 180px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(95, 224, 186, 0.2), rgba(95, 224, 186, 0));
  pointer-events: none;
}

.trade-hero__main {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
}

.trade-hero h1 {
  margin: 0;
  color: #1f6f67;
  font-size: 28px;
  font-weight: 900;
  line-height: 1.15;
}

.trade-hero__description {
  max-width: 680px;
  margin: 12px 0 0;
  color: #5d6876;
  font-size: 14px;
  font-weight: 600;
}

.date-range {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  min-height: 44px;
  padding: 0 14px;
  border: 1px solid rgba(218, 236, 231, 0.95);
  border-radius: 12px;
  background: #ffffff;
  color: #43515d;
}

.date-range--hero {
  flex: none;
  min-width: 288px;
  justify-content: space-between;
  align-self: center;
  box-shadow: 0 6px 18px rgba(66, 122, 116, 0.08);
}

.date-range__label {
  color: #8b96a1;
  font-size: 11px;
  font-weight: 800;
}

.date-range strong {
  font-size: 12px;
  font-weight: 800;
}

.date-range svg {
  width: 18px;
  height: 18px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.metrics-panel {
  padding: 16px;
}

.metrics-panel__head {
  margin-bottom: 12px;
}

.metrics-panel__head h2 {
  margin: 0;
  color: #1f6f67;
  font-size: 18px;
  font-weight: 900;
  line-height: 1.2;
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
}

.metric-card {
  position: relative;
  min-height: 94px;
  padding: 14px 16px;
  overflow: hidden;
}

.metric-card::after {
  content: "";
  position: absolute;
  right: -14px;
  bottom: -16px;
  width: 86px;
  height: 86px;
  border-radius: 50%;
  background: radial-gradient(circle, color-mix(in srgb, var(--tone) 16%, #ffffff), transparent 72%);
}

.metric-card--mint {
  --tone: #4dbc8c;
}

.metric-card--blue {
  --tone: #5aaef5;
}

.metric-card--rose {
  --tone: #ff7f98;
}

.metric-card--teal {
  --tone: #43bfa8;
}

.metric-card--amber {
  --tone: #ffa63d;
}

.metric-card--pink {
  --tone: #ff7f9b;
}

.metric-copy {
  position: relative;
  z-index: 1;
}

.metric-copy h2 {
  margin: 8px 0 0;
  color: #55616f;
  font-size: 13px;
  font-weight: 900;
}

.metric-copy strong {
  display: block;
  color: #263244;
  font-size: 32px;
  font-weight: 900;
  line-height: 1;
}

.spotlight-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 12px;
}

.spotlight-card {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 154px;
  align-items: center;
  gap: 14px;
  overflow: hidden;
  min-height: 124px;
  padding: 18px;
}

.spotlight-card::after {
  content: "";
  position: absolute;
  right: -18px;
  top: -18px;
  width: 98px;
  height: 98px;
  border-radius: 50%;
  background: radial-gradient(circle, color-mix(in srgb, var(--tone) 18%, #ffffff), transparent 72%);
}

.spotlight-card--mint {
  --tone: #4dbc8c;
}

.spotlight-card--amber {
  --tone: #ffa63d;
}

.spotlight-card__copy {
  position: relative;
  z-index: 1;
}

.spotlight-card__copy span {
  color: #5d6876;
  font-size: 14px;
  font-weight: 900;
}

.spotlight-card__copy strong {
  display: block;
  margin-top: 10px;
  color: #263244;
  font-size: 38px;
  font-weight: 900;
  line-height: 1;
}

.spotlight-card__copy p {
  margin: 10px 0 0;
  color: var(--tone);
  font-size: 12px;
  font-weight: 800;
}

.spotlight-card__chart {
  position: relative;
  z-index: 1;
  width: 154px;
  justify-self: end;
}

.spotlight-card__chart svg {
  display: block;
  width: 100%;
  height: 46px;
  overflow: visible;
  filter: drop-shadow(0 10px 14px var(--chart-glow, rgba(84, 195, 154, 0.12)));
}

.spotlight-card__axis {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  margin-top: 5px;
}

.spotlight-card__axis span {
  color: #8a96a3;
  font-size: 10px;
  font-weight: 700;
}

.trade-grid {
  display: grid;
  grid-template-columns: minmax(280px, 0.92fr) minmax(0, 1fr) minmax(0, 1fr);
  gap: 12px;
}

.panel {
  min-width: 0;
  padding: 16px;
  overflow: hidden;
}

.panel-head {
  margin-bottom: 12px;
}

.panel-head h2 {
  margin: 0;
  color: #1f6f67;
  font-size: 18px;
  font-weight: 900;
  line-height: 1.2;
}

.panel-head small {
  color: #557c77;
  font-size: 14px;
  font-weight: 900;
}

.funnel-summary {
  display: grid;
  gap: 4px;
  padding: 14px;
  border: 1px solid rgba(224, 240, 238, 0.86);
  border-radius: 10px;
  background: linear-gradient(180deg, rgba(244, 251, 247, 0.98), rgba(255, 255, 255, 0.96));
}

.funnel-summary strong {
  color: #263244;
  font-size: 24px;
  font-weight: 900;
  line-height: 1;
}

.funnel-summary span {
  color: #697483;
  font-size: 12px;
  font-weight: 800;
}

.funnel-list {
  display: grid;
  gap: 14px;
  margin-top: 16px;
}

.funnel-row {
  display: grid;
  gap: 8px;
}

.funnel-row__label {
  color: #4f5b68;
  font-size: 13px;
  font-weight: 900;
}

.funnel-row__track {
  display: flex;
  align-items: center;
  height: 16px;
  padding: 2px;
  border-radius: 999px;
  background: #edf7f2;
}

.funnel-row__bar {
  height: 100%;
  border-radius: inherit;
  box-shadow: 0 8px 20px rgba(77, 188, 140, 0.14);
}

.chart-panel {
  display: grid;
  align-content: start;
}

.chart-box {
  width: 100%;
}

.chart-box--line,
.chart-box--bar {
  height: 360px;
}

.chart-legend {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin: 6px auto 0;
  color: #64707b;
  font-size: 12px;
  font-weight: 800;
}

.chart-legend__dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: linear-gradient(135deg, #91e2b2, #4dbc8c);
  box-shadow: 0 0 0 3px rgba(235, 247, 243, 0.9);
}

@media (max-width: 1280px) {
  .metric-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .spotlight-grid {
    grid-template-columns: 1fr;
  }

  .spotlight-card {
    grid-template-columns: minmax(0, 1fr) 140px;
  }

  .spotlight-card__chart {
    width: 140px;
  }

  .trade-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 780px) {
  .trade-hero__main {
    flex-direction: column;
  }

  .date-range--hero,
  .metric-grid {
    width: 100%;
  }

  .metric-grid {
    grid-template-columns: 1fr;
  }

  .spotlight-card {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .spotlight-card__chart {
    width: 100%;
    justify-self: stretch;
  }

  .spotlight-card__chart svg {
    height: 54px;
  }

  .spotlight-card__copy strong {
    font-size: 34px;
  }

  .chart-box--line,
  .chart-box--bar {
    height: 300px;
  }
}
</style>
