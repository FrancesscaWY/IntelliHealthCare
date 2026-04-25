<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from "vue";
import * as echarts from "echarts";
import type { ECharts, EChartsOption } from "echarts";
import type { PageComponentProps } from "@ihc/page-core/types";
import mock from "./mock";

type RangeKey = (typeof mock.rangeOptions)[number]["key"];
type DistributionItem = {
  label: string;
  value: number;
  color: string;
  highlightColor?: string;
};

const props = defineProps<PageComponentProps>();

const currentRange = ref<RangeKey>(mock.rangeOptions[0].key);
const activePeriod = computed(() => mock.periods[currentRange.value]);

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

watch(currentRange, async () => {
  await nextTick();
  renderCharts();
});

onMounted(async () => {
  await nextTick();
  renderCharts();
  window.addEventListener("resize", handleResize);
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", handleResize);
  disposeCharts();
});
</script>

<template>
  <section class="analytics-dashboard">
    <article class="dashboard-shell">
      <header class="dashboard-shell__header">
        <div class="dashboard-shell__title">
          <span class="dashboard-shell__accent"></span>
          <div>
            <h1>{{ mock.title }}</h1>
            <p>{{ mock.subtitle }}</p>
          </div>
        </div>

        <div class="range-switch" role="tablist" aria-label="数据周期">
          <button
            v-for="option in mock.rangeOptions"
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
      </header>

      <section class="summary-strip">
        <article
          v-for="item in activePeriod.summary"
          :key="item.label"
          class="summary-card"
        >
          <span class="summary-card__label">{{ item.label }}</span>
          <strong class="summary-card__value">{{ item.value }}</strong>
          <span class="summary-card__delta" :class="`summary-card__delta--${item.tone}`">{{ item.delta }}</span>
        </article>
      </section>

      <section class="chart-card chart-card--line">
        <header class="chart-card__header">
          <div>
            <h2>用户趋势统计</h2>
            <p>{{ activePeriod.updatedAt }} 更新</p>
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

        <div ref="lineChartEl" class="chart-card__canvas chart-card__canvas--line"></div>

        <div class="chart-note">
          <span class="chart-note__dot"></span>
          <span>{{ activePeriod.trend.seriesName }}</span>
        </div>
      </section>

      <section class="donut-grid">
        <article class="chart-card">
          <header class="chart-card__header chart-card__header--compact">
            <div>
              <h2>{{ activePeriod.ageDistribution.title }}</h2>
              <p>按年龄层查看用户覆盖结构</p>
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

        <article class="chart-card">
          <header class="chart-card__header chart-card__header--compact">
            <div>
              <h2>{{ activePeriod.genderDistribution.title }}</h2>
              <p>按性别查看用户分布占比</p>
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
    </article>
  </section>
</template>

<style scoped>
.analytics-dashboard {
  font-family: var(--admin-font-family);
  color: #2f3946;
  font-size: 12px;
  line-height: 1.45;
}

.dashboard-shell {
  display: grid;
  gap: 14px;
  padding: 18px;
  border: 1px solid rgba(22, 53, 45, 0.06);
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 10px 28px rgba(24, 51, 45, 0.04);
}

.dashboard-shell__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}

.dashboard-shell__title {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.dashboard-shell__accent {
  width: 6px;
  height: 28px;
  border-radius: 999px;
  background: linear-gradient(180deg, #46d1aa 0%, #22a375 100%);
}

.dashboard-shell__title h1 {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
}

.dashboard-shell__title p {
  margin: 4px 0 0;
  color: #8b96a1;
  font-size: 12px;
}

.range-switch {
  display: inline-grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
  padding: 4px;
  border-radius: 14px;
  background: #f2f8f5;
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
  font-weight: 600;
}

.range-switch__item span {
  font-size: 11px;
}

.range-switch__item--active {
  background: #ffffff;
  color: #1f8c67;
  box-shadow: 0 6px 14px rgba(24, 51, 45, 0.06);
}

.summary-strip {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.summary-card {
  display: grid;
  gap: 6px;
  padding: 12px 14px;
  border: 1px solid #edf3ef;
  border-radius: 16px;
  background: linear-gradient(180deg, #fbfdfc 0%, #f7fbf9 100%);
}

.summary-card__label {
  color: #8c97a2;
  font-size: 11px;
}

.summary-card__value {
  color: #2f3946;
  font-size: 22px;
  font-weight: 600;
  line-height: 1.1;
}

.summary-card__delta {
  width: fit-content;
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
}

.summary-card__delta--green {
  background: #eaf9f3;
  color: #1f9d72;
}

.summary-card__delta--teal {
  background: #eaf8fb;
  color: #249ba3;
}

.summary-card__delta--amber {
  background: #fff7e8;
  color: #d69a2b;
}

.chart-card {
  padding: 16px;
  border: 1px solid rgba(22, 53, 45, 0.06);
  border-radius: 18px;
  background: #ffffff;
}

.chart-card--line {
  padding-bottom: 12px;
}

.chart-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}

.chart-card__header--compact {
  margin-bottom: 0;
}

.chart-card__header h2 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}

.chart-card__header p {
  margin: 4px 0 0;
  color: #8b96a1;
  font-size: 11px;
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
  min-height: 40px;
  padding: 0 14px;
  border: 1px solid #dfe9e4;
  border-radius: 12px;
  background: #ffffff;
  color: #43515d;
}

.date-range__label {
  color: #9aa4af;
  font-size: 11px;
}

.date-range strong {
  font-size: 12px;
  font-weight: 600;
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
  height: 40px;
  padding: 0 14px;
  border: 1px solid #dfe9e4;
  border-radius: 12px;
  background: #ffffff;
  color: #44515d;
  font-size: 12px;
  font-weight: 500;
}

.chart-card__canvas {
  width: 100%;
}

.chart-card__canvas--line {
  height: 360px;
}

.chart-card__canvas--ring {
  height: 210px;
}

.chart-note {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin: 2px auto 0;
  color: #64707b;
  font-size: 12px;
}

.chart-note__dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #41d1a7;
}

.donut-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.ring-panel {
  display: grid;
  grid-template-columns: minmax(160px, 0.96fr) minmax(0, 1fr);
  align-items: center;
  gap: 10px;
}

.side-legend {
  display: grid;
  gap: 14px;
  min-width: 0;
}

.side-legend__row {
  display: grid;
  grid-template-columns: 12px minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 8px;
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

@media (max-width: 1180px) {
  .summary-strip,
  .donut-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .chart-card__header {
    flex-direction: column;
    align-items: stretch;
  }

  .chart-card__tools {
    flex-wrap: wrap;
  }

  .ring-panel {
    grid-template-columns: 1fr;
  }

  .side-legend {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px 16px;
  }
}

@media (max-width: 760px) {
  .dashboard-shell__header {
    flex-direction: column;
  }

  .range-switch,
  .summary-strip,
  .donut-grid {
    width: 100%;
    grid-template-columns: 1fr;
  }

  .chart-card__canvas--line {
    height: 300px;
  }

  .chart-card__canvas--ring {
    height: 280px;
  }

  .date-range {
    width: 100%;
    justify-content: space-between;
  }

  .side-legend {
    grid-template-columns: 1fr;
  }
}
</style>
