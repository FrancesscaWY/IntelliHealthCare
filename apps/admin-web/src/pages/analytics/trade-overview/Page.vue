<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, shallowRef } from "vue";
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

function buildLineOption() {
  const { labels, values, legend, highlightIndex } = pageData.value.lineChart;
  const maxValue = Math.max(...values);

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
      textStyle: {
        color: "#2f3946",
        fontSize: 12,
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
      axisLabel: { color: "#93a0ac", fontSize: 12, margin: 14 },
    },
    yAxis: {
      type: "value",
      min: 0,
      max: Math.ceil(maxValue * 1.2),
      splitNumber: 6,
      axisLabel: { color: "#93a0ac", fontSize: 12 },
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: "rgba(213, 226, 220, 0.7)" } },
    },
    series: [
      {
        type: "bar",
        data: values.map((value, index) => (index === highlightIndex ? value : 0)),
        barWidth: 30,
        z: 1,
        silent: true,
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: "rgba(65, 209, 167, 0.2)" },
            { offset: 1, color: "rgba(65, 209, 167, 0.95)" },
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
        symbolSize: 10,
        lineStyle: {
          width: 4,
          color: "#41d1a7",
        },
        itemStyle: {
          color: "#ffffff",
          borderColor: "#41d1a7",
          borderWidth: 4,
        },
        markLine: {
          silent: true,
          symbol: "none",
          label: { show: false },
          lineStyle: {
            color: "#41d1a7",
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
      textStyle: {
        color: "#2f3946",
        fontSize: 12,
      },
    },
    xAxis: {
      type: "category",
      data: labels,
      axisLine: { lineStyle: { color: "#edf2ef" } },
      axisTick: { show: false },
      axisLabel: { color: "#93a0ac", fontSize: 12, margin: 14 },
    },
    yAxis: {
      type: "value",
      axisLabel: { color: "#93a0ac", fontSize: 12 },
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: "rgba(213, 226, 220, 0.7)" } },
    },
    series: [
      {
        name: legend,
        type: "bar",
        barWidth: 72,
        data: values.map((value, index) => ({
          value,
          itemStyle: {
            color:
              index === highlightIndex
                ? new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                    { offset: 0, color: "#41d1a7" },
                    { offset: 1, color: "#39c89e" },
                  ])
                : "#45cdab",
            borderRadius: [0, 0, 0, 0],
          },
        })),
        label: {
          show: true,
          position: "top",
          color: "#2f3946",
          fontSize: 12,
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
  <section class="analysis-page">
    <article class="analysis-card analysis-card--filter">
      <header class="analysis-heading">
        <span class="analysis-heading__accent"></span>
        <h1>{{ pageData.title }}</h1>
      </header>

      <div class="filter-stack">
        <div class="filter-row-grid">
          <div class="filter-field" style="grid-column: span 12">
            <span class="filter-field__label">{{ pageData.filterLabel }}</span>
            <button class="filter-field__control filter-field__control--range" type="button" @click="trigger('日期筛选')">
              <span class="filter-field__input">{{ pageData.rangeLabel.split(" ~ ")[0] }}</span>
              <span class="filter-field__divider">~</span>
              <span class="filter-field__input">{{ pageData.rangeLabel.split(" ~ ")[1] }}</span>
              <svg class="filter-field__icon filter-field__icon--calendar" viewBox="0 0 24 24" focusable="false" aria-hidden="true">
                <path d="M7 3v3M17 3v3M4 9h16M6 6h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </article>

    <article class="analysis-card analysis-card--content">
      <div class="section-heading">
        <div>
          <h2>交易概况</h2>
        </div>
      </div>

      <section class="overview-grid">
        <div class="overview-panel">
          <div v-for="(row, index) in pageData.overviewRows" :key="index" class="overview-row" :style="{ gridTemplateColumns: `repeat(${row.length}, minmax(0, 1fr))` }">
            <div v-for="item in row" :key="item.label" class="overview-item">
              <span>{{ item.label }}</span>
              <strong>{{ item.value }}</strong>
            </div>
          </div>
        </div>

        <div class="funnel-panel">
          <div v-for="item in pageData.funnel" :key="item.label" class="funnel-segment">
            <div class="funnel-segment__shape" :style="{ width: item.width, background: item.color }">
              {{ item.label }}
            </div>
          </div>
        </div>
      </section>

      <section class="chart-section">
        <div class="section-heading">
          <div>
            <h2>{{ pageData.lineChart.title }}</h2>
            <p>（元）</p>
          </div>
        </div>
        <div ref="lineRef" class="chart-box chart-box--line"></div>
        <div class="chart-legend">
          <span class="chart-legend__dot"></span>
          <span>{{ pageData.lineChart.legend }}</span>
        </div>
      </section>

      <section class="chart-section">
        <div class="section-heading">
          <div>
            <h2>{{ pageData.barChart.title }}</h2>
            <p>（元）</p>
          </div>
        </div>
        <div ref="barRef" class="chart-box chart-box--bar"></div>
        <div class="chart-legend">
          <span class="chart-legend__dot"></span>
          <span>{{ pageData.barChart.legend }}</span>
        </div>
      </section>
    </article>
  </section>
</template>

<style scoped src="../_shared/analysis-ui.css"></style>

<style scoped>
.filter-field__icon--calendar {
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.overview-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.55fr) minmax(260px, 0.45fr);
  gap: 0;
  margin-bottom: 34px;
  background: #e8f8f2;
  border-radius: 0;
  overflow: hidden;
}

.overview-panel {
  display: grid;
}

.overview-row {
  display: grid;
  border-bottom: 2px solid rgba(255, 255, 255, 0.88);
}

.overview-row:last-child {
  border-bottom: 0;
}

.overview-item {
  padding: 24px 38px 20px;
}

.overview-item span {
  display: block;
  color: #8aa09a;
  font-size: 12px;
}

.overview-item strong {
  display: block;
  margin-top: 10px;
  color: #2f3946;
  font-size: 22px;
  font-weight: 500;
}

.funnel-panel {
  display: grid;
  align-content: stretch;
  padding: 0 12px 0 0;
  background: linear-gradient(180deg, rgba(232, 248, 242, 0.96) 0%, rgba(223, 247, 238, 0.84) 100%);
}

.funnel-segment {
  display: flex;
  align-items: stretch;
  justify-content: flex-end;
  border-bottom: 2px solid rgba(255, 255, 255, 0.88);
}

.funnel-segment:last-child {
  border-bottom: 0;
}

.funnel-segment__shape {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 122px;
  color: #ffffff;
  font-size: 17px;
  font-weight: 600;
  clip-path: polygon(15% 0, 100% 0, 85% 100%, 0 100%);
}

.chart-section + .chart-section {
  margin-top: 26px;
}

.chart-box {
  width: 100%;
}

.chart-box--line {
  height: 440px;
}

.chart-box--bar {
  height: 440px;
}

.chart-legend {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin: 4px auto 0;
  color: #64707b;
  font-size: 12px;
}

.chart-legend__dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #41d1a7;
}
</style>
