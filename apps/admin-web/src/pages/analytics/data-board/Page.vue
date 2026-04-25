<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from "vue";
import * as echarts from "echarts";
import type { ECharts, EChartsOption } from "echarts";
import type { PageComponentProps } from "@ihc/page-core/types";
import { getAnalyticsDataBoard } from "@/shared/api/analytics";
import { handleAdminPageError } from "@/shared/api/error";
import mock from "./mock";

type RangeKey = (typeof mock.rangeOptions)[number]["key"];
type DistributionItem = {
  label: string;
  value: number;
  color: string;
  highlightColor?: string;
};

type DataBoardPageData = typeof mock & {
  activeRange?: RangeKey;
};

const props = defineProps<PageComponentProps>();
const pageData = ref<DataBoardPageData>(mock);
const currentRange = ref<RangeKey>(mock.rangeOptions[0].key);
const activePeriod = computed(() => pageData.value.periods[currentRange.value]);

const lineChartEl = ref<HTMLElement | null>(null);
const ageChartEl = ref<HTMLElement | null>(null);
const genderChartEl = ref<HTMLElement | null>(null);

const lineChart = shallowRef<ECharts | null>(null);
const ageChart = shallowRef<ECharts | null>(null);
const genderChart = shallowRef<ECharts | null>(null);

function getChartInstance(target: HTMLElement | null, current: ECharts | null) {
  if (!target) {
    return null;
  }

  if (current) {
    return current;
  }

  return echarts.init(target);
}

function createLineOption(): EChartsOption {
  const labels = Array.from(activePeriod.value.trend.labels);
  const values = Array.from(activePeriod.value.trend.values);
  const { highlightIndex, seriesName } = activePeriod.value.trend;
  const maxValue = Math.max(...values);
  const highlightBars = values.map((value, index) => (index === highlightIndex ? value : 0));

  return {
    animationDuration: 500,
    grid: {
      top: 24,
      right: 18,
      bottom: 30,
      left: 44,
    },
    tooltip: {
      trigger: "axis",
      backgroundColor: "rgba(255,255,255,0.96)",
      borderColor: "#e5efea",
      borderWidth: 1,
      padding: [10, 12],
      textStyle: {
        color: "#2f3946",
        fontSize: 12,
      },
      formatter(params: unknown) {
        const normalized = Array.isArray(params) ? params : [params];
        const records = normalized as Array<{ axisValueLabel?: string; value?: number; seriesName?: string }>;
        const target = records.find((item) => item.seriesName === seriesName) || records[0];
        return `${target?.axisValueLabel || ""}<br/>${seriesName}：${target?.value ?? "--"}`;
      },
    },
    xAxis: {
      type: "category",
      data: labels,
      boundaryGap: false,
      axisLine: {
        lineStyle: {
          color: "#edf2ef",
        },
      },
      axisTick: {
        show: false,
      },
      axisLabel: {
        color: "#93a0ac",
        fontSize: 12,
        margin: 14,
      },
    },
    yAxis: {
      type: "value",
      min: 0,
      max: Math.ceil(maxValue * 1.12),
      splitNumber: 6,
      axisLabel: {
        color: "#93a0ac",
        fontSize: 12,
      },
      axisLine: {
        show: false,
      },
      axisTick: {
        show: false,
      },
      splitLine: {
        lineStyle: {
          color: "rgba(213, 226, 220, 0.7)",
        },
      },
    },
    series: [
      {
        name: "highlight",
        type: "bar",
        data: highlightBars,
        barWidth: 28,
        z: 1,
        silent: true,
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: "rgba(65, 209, 167, 0.22)" },
            { offset: 1, color: "rgba(65, 209, 167, 0.92)" },
          ]),
          borderRadius: [10, 10, 0, 0],
        },
      },
      {
        name: seriesName,
        type: "line",
        data: values,
        smooth: true,
        symbol: "circle",
        symbolSize: 10,
        z: 3,
        lineStyle: {
          width: 4,
          color: "#41d1a7",
        },
        itemStyle: {
          color: "#ffffff",
          borderColor: "#41d1a7",
          borderWidth: 4,
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: "rgba(65, 209, 167, 0.42)" },
            { offset: 1, color: "rgba(65, 209, 167, 0.02)" },
          ]),
        },
        markLine: {
          silent: true,
          symbol: "none",
          label: {
            show: false,
          },
          lineStyle: {
            color: "#41d1a7",
            width: 2,
            type: "dashed",
          },
          data: [{ xAxis: labels[highlightIndex] }],
        },
      },
    ] as EChartsOption["series"],
  };
}

function createRingOption(
  title: string,
  total: number,
  items: ReadonlyArray<DistributionItem>,
  centerText: string,
  centerSubtext: string,
): EChartsOption {
  const ringData = items.map((item) => {
    const baseColor = item.color;
    const highlightColor = item.highlightColor || item.color;

    return {
      name: item.label,
      value: item.value,
      itemStyle: {
        color: {
          type: "linear" as const,
          x: 0,
          y: 0,
          x2: 1,
          y2: 1,
          colorStops: [
            { offset: 0, color: highlightColor },
            { offset: 1, color: baseColor },
          ],
        },
        shadowBlur: 14,
        shadowColor: `${baseColor}80`,
        shadowOffsetY: 6,
      },
      emphasis: {
        itemStyle: {
          color: {
            type: "linear" as const,
            x: 0,
            y: 0,
            x2: 1,
            y2: 1,
            colorStops: [
              { offset: 0, color: "#ffffff" },
              { offset: 0.42, color: highlightColor },
              { offset: 1, color: baseColor },
            ],
          },
          shadowBlur: 24,
          shadowColor: `${baseColor}a8`,
          shadowOffsetY: 8,
        },
      },
    };
  });

  return {
    animationDuration: 650,
    color: items.map((item) => item.color),
    tooltip: {
      trigger: "item",
      backgroundColor: "rgba(255,255,255,0.96)",
      borderColor: "#dfeeea",
      borderWidth: 1,
      padding: [9, 12],
      textStyle: {
        color: "#2f3946",
        fontSize: 12,
        fontWeight: 700,
      },
      formatter(params: unknown) {
        const record = params as { name?: string; value?: number; marker?: string };
        const value = record.value ?? 0;
        return `${record.marker || ""}${record.name || ""}<br/>${formatCount(value)} (${formatPercent(value, total)})`;
      },
    },
    graphic: [
      {
        type: "text",
        left: "center",
        top: "44%",
        style: {
          text: centerText,
          fill: "#23302e",
          fontSize: 20,
          fontWeight: 900,
          align: "center",
        },
      },
      {
        type: "text",
        left: "center",
        top: "57%",
        style: {
          text: centerSubtext,
          fill: "#41515e",
          fontSize: 12,
          fontWeight: 800,
          align: "center",
        },
      },
    ],
    series: [
      {
        name: title,
        type: "pie",
        radius: ["68%", "100%"],
        center: ["50%", "52%"],
        avoidLabelOverlap: false,
        itemStyle: {
          borderWidth: 0,
          borderColor: "transparent",
        },
        label: {
          show: false,
          position: "center",
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 36,
            fontWeight: "bold",
            color: "#1f7b70",
          },
        },
        labelLine: {
          show: false,
        },
        data: ringData,
      },
    ],
  };
}

function formatCount(value: number) {
  return value.toLocaleString("zh-CN");
}

function formatPercent(value: number, total: number) {
  if (!total) {
    return "0%";
  }

  return `${((value / total) * 100).toFixed(1).replace(/\.0$/, "")}%`;
}

function renderCharts() {
  lineChart.value = getChartInstance(lineChartEl.value, lineChart.value);
  ageChart.value = getChartInstance(ageChartEl.value, ageChart.value);
  genderChart.value = getChartInstance(genderChartEl.value, genderChart.value);

  lineChart.value?.setOption(createLineOption(), true);
  ageChart.value?.setOption(
    createRingOption(
      activePeriod.value.ageDistribution.title,
      activePeriod.value.ageDistribution.total,
      activePeriod.value.ageDistribution.items,
      formatCount(activePeriod.value.ageDistribution.total),
      "在册用户",
    ),
    true,
  );
  genderChart.value?.setOption(
    createRingOption(
      activePeriod.value.genderDistribution.title,
      activePeriod.value.genderDistribution.total,
      activePeriod.value.genderDistribution.items,
      formatCount(activePeriod.value.genderDistribution.total),
      "用户总数",
    ),
    true,
  );

  lineChart.value?.dispatchAction({
    type: "showTip",
    seriesIndex: 1,
    dataIndex: activePeriod.value.trend.highlightIndex,
  });
}

function handleResize() {
  lineChart.value?.resize();
  ageChart.value?.resize();
  genderChart.value?.resize();
}

function disposeCharts() {
  lineChart.value?.dispose();
  ageChart.value?.dispose();
  genderChart.value?.dispose();
  lineChart.value = null;
  ageChart.value = null;
  genderChart.value = null;
}

function triggerAction(label: string) {
  props.showToast(`${label}为演示状态。`);
}

async function syncPageData(range = currentRange.value) {
  try {
    const response = (await getAnalyticsDataBoard({
      range,
    })) as DataBoardPageData;
    pageData.value = response;
    currentRange.value = response.activeRange ?? range;
  } catch (error) {
    handleAdminPageError(error, {
      navigation: props.navigation,
      showToast: props.showToast,
      fallbackMessage: "用户概况加载失败，已回退到演示数据",
    });
  }

  await nextTick();
  renderCharts();
}

watch(currentRange, (range, previousRange) => {
  if (range === previousRange) {
    return;
  }

  void syncPageData(range);
});

onMounted(async () => {
  await syncPageData();
  window.addEventListener("resize", handleResize);
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", handleResize);
  disposeCharts();
});
</script>

<template>
  <section class="trade-overview-page user-overview-page">
    <article class="trade-hero">
        <div class="trade-hero__main">
        <div class="trade-hero__copy">
          <h1>{{ pageData.title }}</h1>
          <p class="trade-hero__description">{{ pageData.subtitle }}</p>
        </div>

        <div class="range-switch range-switch--hero" role="tablist" aria-label="数据周期">
          <button
            v-for="option in pageData.rangeOptions"
            :key="option.key"
            class="range-switch__item"
            :class="{ 'range-switch__item--active': currentRange === option.key }"
            type="button"
            :aria-selected="currentRange === option.key"
            @click="currentRange = option.key"
          >
            <strong>{{ option.label }}</strong>
            <span>{{ option.caption }}</span>
          </button>
        </div>
      </div>
    </article>

    <section class="metrics-panel" aria-label="用户核心指标">
      <header class="metrics-panel__head">
        <h2>用户核心指标</h2>
      </header>

      <div class="metric-grid metric-grid--user">
        <article
          v-for="item in activePeriod.summary"
          :key="item.label"
          class="metric-card"
          :class="`metric-card--${item.tone}`"
        >
          <div class="metric-copy">
            <strong>{{ item.value }}</strong>
            <h2>{{ item.label }}</h2>
            <p>{{ item.delta }}</p>
          </div>
        </article>
      </div>
    </section>

    <section class="panel chart-panel chart-panel--line">
      <header class="panel-head panel-head--between">
        <div>
          <h2>用户趋势统计 <small>（阶段变化）</small></h2>
          <p class="panel-subtitle">{{ activePeriod.updatedAt }} 更新</p>
        </div>

        <div class="chart-card__tools">
          <button class="date-range" type="button" @click="triggerAction('日期筛选')">
            <span class="date-range__label">选择日期</span>
            <strong>{{ activePeriod.rangeLabel }}</strong>
            <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
              <path d="M7 3v3M17 3v3M4 9h16M6 6h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z" />
            </svg>
          </button>
          <button class="ghost-button" type="button" @click="triggerAction('导出报表')">导出报表</button>
        </div>
      </header>

      <div ref="lineChartEl" class="chart-box chart-box--line"></div>

      <div class="chart-legend">
        <span class="chart-legend__dot"></span>
        <span>{{ activePeriod.trend.seriesName }}</span>
      </div>
    </section>

    <section class="trade-grid trade-grid--user">
      <article class="panel chart-panel">
        <header class="panel-head">
          <div>
            <h2>{{ activePeriod.ageDistribution.title }} <small>（结构分布）</small></h2>
            <p class="panel-subtitle">按年龄层查看用户覆盖结构</p>
          </div>
        </header>

        <div class="ring-panel">
          <div ref="ageChartEl" class="chart-card__canvas chart-card__canvas--ring"></div>

          <div class="side-legend">
            <div
              v-for="item in activePeriod.ageDistribution.items"
              :key="item.label"
              class="side-legend__row"
            >
              <i :style="{ backgroundColor: item.color }"></i>
              <span>{{ item.label }}</span>
              <strong>{{ formatCount(item.value) }}</strong>
              <em>({{ formatPercent(item.value, activePeriod.ageDistribution.total) }})</em>
            </div>
          </div>
        </div>
      </article>

      <article class="panel chart-panel">
        <header class="panel-head">
          <div>
            <h2>{{ activePeriod.genderDistribution.title }} <small>（结构分布）</small></h2>
            <p class="panel-subtitle">按性别查看用户分布占比</p>
          </div>
        </header>

        <div class="ring-panel">
          <div ref="genderChartEl" class="chart-card__canvas chart-card__canvas--ring"></div>

          <div class="side-legend">
            <div
              v-for="item in activePeriod.genderDistribution.items"
              :key="item.label"
              class="side-legend__row"
            >
              <i :style="{ backgroundColor: item.color }"></i>
              <span>{{ item.label }}</span>
              <strong>{{ formatCount(item.value) }}</strong>
              <em>({{ formatPercent(item.value, activePeriod.genderDistribution.total) }})</em>
            </div>
          </div>
        </div>
      </article>
    </section>
  </section>
</template>

<style scoped>
.user-overview-page {
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

.range-switch {
  display: inline-grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
  padding: 4px;
  border-radius: 14px;
  background: rgba(242, 248, 245, 0.92);
}

.range-switch--hero {
  min-width: 242px;
  box-shadow: 0 6px 18px rgba(66, 122, 116, 0.08);
}

.range-switch__item {
  display: grid;
  gap: 2px;
  min-width: 92px;
  padding: 8px 12px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: #7b8793;
  text-align: left;
}

.range-switch__item strong {
  font-size: 12px;
  font-weight: 800;
}

.range-switch__item span {
  font-size: 11px;
  font-weight: 700;
}

.range-switch__item--active {
  background: #ffffff;
  color: #1f8c67;
  box-shadow: 0 6px 14px rgba(24, 51, 45, 0.06);
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
  gap: 12px;
}

.metric-grid--user {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.metric-card {
  position: relative;
  min-height: 108px;
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

.metric-card--green {
  --tone: #4dbc8c;
}

.metric-card--teal {
  --tone: #43bfa8;
}

.metric-card--amber {
  --tone: #ffa63d;
}

.metric-copy {
  position: relative;
  z-index: 1;
}

.metric-copy strong {
  display: block;
  color: #263244;
  font-size: 32px;
  font-weight: 900;
  line-height: 1;
}

.metric-copy h2 {
  margin: 10px 0 0;
  color: #55616f;
  font-size: 13px;
  font-weight: 900;
}

.metric-copy p {
  margin: 8px 0 0;
  color: var(--tone);
  font-size: 12px;
  font-weight: 800;
}

.panel {
  min-width: 0;
  padding: 16px;
  overflow: hidden;
}

.panel-head {
  margin-bottom: 12px;
}

.panel-head--between {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
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

.panel-subtitle {
  margin: 8px 0 0;
  color: #697483;
  font-size: 12px;
  font-weight: 700;
}

.chart-panel {
  display: grid;
  align-content: start;
}

.chart-panel--line {
  background:
    radial-gradient(circle at top left, rgba(145, 226, 178, 0.14), transparent 30%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(247, 251, 249, 0.96));
}

.chart-card__tools {
  display: flex;
  align-items: center;
  gap: 8px;
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

.ghost-button {
  min-width: 118px;
  height: 44px;
  padding: 0 16px;
  border: 1px solid #dfe9e4;
  border-radius: 12px;
  background: #ffffff;
  color: #33404d;
  font-size: 13px;
  font-weight: 700;
}

.chart-box {
  width: 100%;
}

.chart-box--line {
  height: 360px;
}

.chart-card__canvas--ring {
  height: 260px;
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

.trade-grid--user {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.ring-panel {
  display: grid;
  grid-template-columns: minmax(180px, 0.96fr) minmax(0, 1fr);
  align-items: center;
  gap: 10px;
}

.side-legend {
  display: grid;
  gap: 10px;
  min-width: 0;
}

.side-legend__row {
  display: grid;
  grid-template-columns: 10px minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 8px;
  padding: 12px;
  border: 1px solid rgba(224, 240, 238, 0.86);
  border-radius: 10px;
  background: linear-gradient(180deg, rgba(244, 251, 247, 0.98), rgba(255, 255, 255, 0.96));
  color: #5d6876;
  font-size: 11px;
  font-weight: 700;
  line-height: 1.25;
}

.side-legend__row i {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  box-shadow: 0 0 0 3px rgba(235, 247, 243, 0.9);
}

.side-legend__row span {
  overflow: hidden;
  color: #495765;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.side-legend__row strong,
.side-legend__row em {
  color: #697483;
  font-style: normal;
  white-space: nowrap;
}

@media (max-width: 1280px) {
  .metric-grid--user {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .trade-grid--user,
  .ring-panel {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 780px) {
  .trade-hero__main,
  .panel-head--between {
    flex-direction: column;
  }

  .range-switch--hero,
  .metric-grid--user {
    width: 100%;
  }

  .metric-grid--user {
    grid-template-columns: 1fr;
  }

  .chart-card__tools {
    width: 100%;
    flex-wrap: wrap;
  }

  .date-range,
  .ghost-button {
    width: 100%;
    justify-content: space-between;
  }

  .chart-box--line,
  .chart-card__canvas--ring {
    height: 300px;
  }
}
</style>
