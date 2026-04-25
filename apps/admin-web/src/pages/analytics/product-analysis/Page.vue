<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef } from "vue";
import * as echarts from "echarts";
import type { ECharts, EChartsOption } from "echarts";
import type { PageComponentProps } from "@ihc/page-core/types";
import mock from "./mock";

type Column = {
  key: string;
  label: string;
  align?: "left" | "center" | "right";
  width?: string;
  minWidth?: string;
  nowrap?: boolean;
};

type ImageCell = {
  type: "image-text";
  image: string;
  primary: string;
  secondary?: string;
};

type Row = {
  info: ImageCell;
  category: string;
  browse: number;
  visitors: number;
  favorites: number;
  shares: number;
  payUsers: number;
  payOrders: number;
  amount: string;
  conversion: string;
};

const props = defineProps<PageComponentProps>();
const columns = mock.columns as readonly Column[];
const rows = mock.rows as readonly Row[];

const amountChartEl = ref<HTMLElement | null>(null);
const categoryChartEl = ref<HTMLElement | null>(null);
const amountChart = shallowRef<ECharts | null>(null);
const categoryChart = shallowRef<ECharts | null>(null);

const categoryColors = ["#46d1aa", "#74b9ff", "#ff9f7f", "#ffc861", "#b39dfa"] as const;

function trigger(label: string) {
  props.showToast(`${label}为演示状态。`);
}

function parseNumber(value: string | number) {
  if (typeof value === "number") {
    return value;
  }

  return Number.parseFloat(value.replace(/,/g, "").replace("%", "")) || 0;
}

function formatNumber(value: number) {
  return value.toLocaleString("zh-CN");
}

function formatCurrency(value: number) {
  return value.toLocaleString("zh-CN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatPercent(value: number) {
  return `${value.toFixed(1).replace(/\.0$/, "")}%`;
}

function getRowName(row: Row) {
  return row.info.primary;
}

const totalBrowse = computed(() => rows.reduce((sum, row) => sum + parseNumber(row.browse), 0));
const totalPayUsers = computed(() => rows.reduce((sum, row) => sum + parseNumber(row.payUsers), 0));
const totalPayOrders = computed(() => rows.reduce((sum, row) => sum + parseNumber(row.payOrders), 0));
const totalAmount = computed(() => rows.reduce((sum, row) => sum + parseNumber(row.amount), 0));
const averageConversion = computed(() => {
  if (!rows.length) {
    return 0;
  }

  const total = rows.reduce((sum, row) => sum + parseNumber(row.conversion), 0);
  return total / rows.length;
});

const summaryCards = computed(() => {
  const productCount = rows.length;
  const averageBrowse = productCount ? Math.round(totalBrowse.value / productCount) : 0;
  const averageTicket = totalPayOrders.value ? totalAmount.value / totalPayOrders.value : 0;

  return [
    {
      label: "重点产品数",
      value: `${productCount}`,
      helper: "当前分析样本",
      tone: "green",
    },
    {
      label: "总浏览量",
      value: formatNumber(totalBrowse.value),
      helper: `单品均值 ${formatNumber(averageBrowse)}`,
      tone: "teal",
    },
    {
      label: "支付订单数",
      value: formatNumber(totalPayOrders.value),
      helper: `支付人数 ${formatNumber(totalPayUsers.value)}`,
      tone: "amber",
    },
    {
      label: "成交金额（元）",
      value: formatCurrency(totalAmount.value),
      helper: `平均转化 ${formatPercent(averageConversion.value)} / 客单 ${formatCurrency(averageTicket)}`,
      tone: "blue",
    },
  ] as const;
});

const topProducts = computed(() =>
  [...rows]
    .sort((left, right) => parseNumber(right.amount) - parseNumber(left.amount))
    .slice(0, 5),
);

const categoryDistribution = computed(() => {
  const categoryMap = new Map<string, number>();

  for (const row of rows) {
    categoryMap.set(row.category, (categoryMap.get(row.category) || 0) + parseNumber(row.amount));
  }

  return [...categoryMap.entries()]
    .map(([label, value], index) => ({
      label,
      value,
      color: categoryColors[index % categoryColors.length],
    }))
    .sort((left, right) => right.value - left.value);
});

const topProductName = computed(() => topProducts.value[0]?.info.primary || "暂无数据");

function createAmountOption(): EChartsOption {
  const labels = topProducts.value.map((row) => getRowName(row));
  const values = topProducts.value.map((row) => parseNumber(row.amount));
  const highlightIndex = values.indexOf(Math.max(...values));
  const maxValue = Math.max(...values, 1);

  return {
    animationDuration: 550,
    grid: {
      top: 28,
      right: 18,
      bottom: 54,
      left: 58,
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
      },
      formatter(params: unknown) {
        const record = (Array.isArray(params) ? params[0] : params) as { axisValueLabel?: string; value?: number };
        return `${record?.axisValueLabel || ""}<br/>成交金额：${formatCurrency(record?.value || 0)} 元`;
      },
    },
    xAxis: {
      type: "category",
      data: labels,
      axisLine: {
        lineStyle: {
          color: "#edf2ef",
        },
      },
      axisTick: {
        show: false,
      },
      axisLabel: {
        color: "#7a8490",
        fontSize: 11,
        interval: 0,
        margin: 14,
        formatter(value: string) {
          return value.length > 8 ? `${value.slice(0, 8)}...` : value;
        },
      },
    },
    yAxis: {
      type: "value",
      min: 0,
      max: Math.ceil(maxValue * 1.18),
      splitNumber: 5,
      axisLabel: {
        color: "#7a8490",
        fontSize: 12,
        formatter(value: number) {
          return `${Math.round(value / 1000)}k`;
        },
      },
      axisLine: {
        show: false,
      },
      axisTick: {
        show: false,
      },
      splitLine: {
        lineStyle: {
          color: "#edf3f1",
        },
      },
    },
    series: [
      {
        name: "成交金额",
        type: "bar",
        barWidth: 42,
        data: values.map((value, index) => ({
          value,
          itemStyle: {
            color:
              index === highlightIndex
                ? new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                    { offset: 0, color: "#91e2b2" },
                    { offset: 1, color: "#44ba8a" },
                  ])
                : new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                    { offset: 0, color: "#d9efe4" },
                    { offset: 1, color: "#7bcfa7" },
                  ]),
            borderRadius: [12, 12, 0, 0],
          },
        })),
        label: {
          show: true,
          position: "top",
          color: "#2f3946",
          fontSize: 12,
          fontWeight: 700,
          formatter(params: { value?: unknown }) {
            const rawValue = typeof params.value === "number" ? params.value : Number(params.value) || 0;
            return rawValue === values[highlightIndex] ? formatCurrency(rawValue) : "";
          },
        },
      },
    ],
  };
}

function createCategoryOption(): EChartsOption {
  return {
    animationDuration: 650,
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
        const record = params as { marker?: string; name?: string; value?: number };
        const value = record.value ?? 0;
        const ratio = totalAmount.value ? (value / totalAmount.value) * 100 : 0;
        return `${record.marker || ""}${record.name || ""}<br/>${formatCurrency(value)} 元 (${formatPercent(ratio)})`;
      },
    },
    graphic: [
      {
        type: "text",
        left: "center",
        top: "44%",
        style: {
          text: formatCurrency(totalAmount.value),
          fill: "#23302e",
          fontSize: 18,
          fontWeight: 800,
          align: "center",
        },
      },
      {
        type: "text",
        left: "center",
        top: "57%",
        style: {
          text: "总成交金额",
          fill: "#41515e",
          fontSize: 12,
          fontWeight: 700,
          align: "center",
        },
      },
    ],
    series: [
      {
        name: "品类成交占比",
        type: "pie",
        radius: ["66%", "100%"],
        center: ["50%", "52%"],
        avoidLabelOverlap: false,
        label: {
          show: false,
        },
        labelLine: {
          show: false,
        },
        itemStyle: {
          borderColor: "transparent",
          borderWidth: 0,
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 28,
            fontWeight: "bold",
            color: "#1f7b70",
            formatter(params: { percent?: number }) {
              return `${Math.round(params.percent || 0)}%`;
            },
          },
        },
        data: categoryDistribution.value.map((item) => ({
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
                { offset: 0, color: `${item.color}cc` },
                { offset: 1, color: item.color },
              ],
            },
            shadowBlur: 14,
            shadowColor: `${item.color}66`,
            shadowOffsetY: 6,
          },
        })),
      },
    ],
  };
}

function renderCharts() {
  if (amountChartEl.value && !amountChart.value) {
    amountChart.value = echarts.init(amountChartEl.value);
  }

  if (categoryChartEl.value && !categoryChart.value) {
    categoryChart.value = echarts.init(categoryChartEl.value);
  }

  amountChart.value?.setOption(createAmountOption(), true);
  categoryChart.value?.setOption(createCategoryOption(), true);
}

function handleResize() {
  amountChart.value?.resize();
  categoryChart.value?.resize();
}

function getCell(row: Row, key: Column["key"]): Row[keyof Row] {
  return row[key as keyof Row];
}

function isRichCell(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && "type" in value;
}

function isImageCell(value: unknown): value is { type: string; image: string; primary: string; secondary?: string } {
  return isRichCell(value) && value.type === "image-text";
}

function getImageValue(row: Row, key: Column["key"]) {
  const value = getCell(row, key);
  return isImageCell(value) ? value : null;
}

function shouldNowrap(column: Column, value: unknown) {
  return column.nowrap || isImageCell(value);
}

function getColumnStyle(column: Column) {
  const style: Record<string, string> = {};

  if (column.width) {
    style.width = column.width;
  }

  if (column.minWidth) {
    style.minWidth = column.minWidth;
  }

  return Object.keys(style).length > 0 ? style : undefined;
}

function getCellStyle(column: Column, value: unknown) {
  const style = { ...(getColumnStyle(column) || {}) } as Record<string, string>;

  if (!style.minWidth && isImageCell(value)) {
    style.minWidth = "300px";
  }

  return Object.keys(style).length > 0 ? style : undefined;
}

onMounted(async () => {
  await nextTick();
  renderCharts();
  window.addEventListener("resize", handleResize);
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", handleResize);
  amountChart.value?.dispose();
  categoryChart.value?.dispose();
  amountChart.value = null;
  categoryChart.value = null;
});
</script>

<template>
  <section class="trade-overview-page product-analysis-page">
    <article class="trade-hero">
      <div class="trade-hero__main">
        <div class="trade-hero__copy">
          <h1>{{ mock.title }}</h1>
          <p class="trade-hero__description">
            聚焦重点产品的流量、成交与品类结构，用与交易概况一致的运营看板视觉查看产品表现。
          </p>
        </div>

        <button class="date-range date-range--hero" type="button" @click="trigger('导出报表')">
          <span class="date-range__label">当前样本</span>
          <strong>{{ rows.length }} 款重点产品</strong>
          <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
            <path d="M12 5v14M5 12h14"></path>
          </svg>
        </button>
      </div>
    </article>

    <article class="panel filter-panel">
      <header class="panel-head">
        <h2>分析筛选 <small>（沿用现有口径）</small></h2>
      </header>

      <section class="dashboard-filter">
        <div class="filter-stack">
          <div v-for="(row, rowIndex) in mock.filters" :key="rowIndex" class="filter-row-grid">
            <template v-for="(field, fieldIndex) in row" :key="fieldIndex">
              <div v-if="field.type === 'date-range'" class="filter-field" :style="{ gridColumn: `span ${field.span}` }">
                <span class="filter-field__label">{{ field.label }}</span>
                <button class="filter-field__control filter-field__control--range" type="button" @click="trigger(field.label)">
                  <span class="filter-field__input">{{ field.startPlaceholder }}</span>
                  <span class="filter-field__divider">~</span>
                  <span class="filter-field__input">{{ field.endPlaceholder }}</span>
                  <svg class="filter-field__icon filter-field__icon--calendar" viewBox="0 0 24 24" focusable="false" aria-hidden="true">
                    <path d="M7 3v3M17 3v3M4 9h16M6 6h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z" />
                  </svg>
                </button>
              </div>

              <div v-else-if="field.type === 'select'" class="filter-field" :style="{ gridColumn: `span ${field.span}` }">
                <span class="filter-field__label">{{ field.label }}</span>
                <button class="filter-field__control" type="button" @click="trigger(field.label)">
                  <span class="filter-field__input">{{ field.placeholder }}</span>
                  <span class="filter-field__icon filter-field__icon--chevron"></span>
                </button>
              </div>

              <div v-else-if="field.type === 'number-range'" class="filter-field" :style="{ gridColumn: `span ${field.span}` }">
                <span class="filter-field__label">{{ field.label }}</span>
                <div class="filter-field__control filter-field__control--range">
                  <span class="filter-field__input">{{ field.startPlaceholder }}</span>
                  <span class="filter-field__divider">-</span>
                  <span class="filter-field__input">{{ field.endPlaceholder }}</span>
                </div>
              </div>

              <div v-else-if="field.type === 'keyword'" class="filter-field" :style="{ gridColumn: `span ${field.span}` }">
                <div class="filter-field__control">
                  <span class="filter-field__input">{{ field.placeholder }}</span>
                </div>
              </div>

              <div v-else class="filter-field" :style="{ gridColumn: `span ${field.span}` }">
                <div class="filter-actions">
                  <button
                    v-for="action in field.actions"
                    :key="action"
                    class="icon-button"
                    :class="{ 'icon-button--primary': action === 'search' }"
                    type="button"
                    @click="trigger(action === 'search' ? '搜索' : '重置')"
                  >
                    <svg v-if="action === 'search'" viewBox="0 0 24 24" focusable="false" aria-hidden="true">
                      <circle cx="11" cy="11" r="7"></circle>
                      <path d="m20 20-3.6-3.6"></path>
                    </svg>
                    <svg v-else viewBox="0 0 24 24" focusable="false" aria-hidden="true">
                      <path d="M3 12a9 9 0 1 0 3-6.7"></path>
                      <path d="M3 3v6h6"></path>
                    </svg>
                  </button>
                </div>
              </div>
            </template>
          </div>
        </div>
      </section>
    </article>

    <section class="metrics-panel" aria-label="产品核心指标">
      <header class="metrics-panel__head">
        <h2>产品核心指标</h2>
      </header>

      <div class="metric-grid metric-grid--product">
        <article v-for="item in summaryCards" :key="item.label" class="metric-card" :class="`metric-card--${item.tone}`">
          <div class="metric-copy">
            <strong>{{ item.value }}</strong>
            <h2>{{ item.label }}</h2>
            <p>{{ item.helper }}</p>
          </div>
        </article>
      </div>
    </section>

    <section class="trade-grid trade-grid--product">
      <article class="panel chart-panel chart-panel--wide">
        <header class="panel-head">
          <h2>产品成交排行 <small>（Top 5）</small></h2>
          <p class="panel-subtitle">按成交金额排序，当前 Top1：{{ topProductName }}</p>
        </header>

        <div ref="amountChartEl" class="chart-box chart-box--bar"></div>
        <div class="chart-legend">
          <span class="chart-legend__dot"></span>
          <span>成交金额</span>
        </div>
      </article>

      <article class="panel chart-panel">
        <header class="panel-head">
          <h2>品类成交占比 <small>（金额结构）</small></h2>
          <p class="panel-subtitle">基于现有产品明细汇总，不新增数据口径。</p>
        </header>

        <div class="ring-panel ring-panel--panel">
          <div ref="categoryChartEl" class="chart-card__canvas chart-card__canvas--ring"></div>

          <div class="side-legend">
            <div v-for="item in categoryDistribution" :key="item.label" class="side-legend__row">
              <i :style="{ backgroundColor: item.color }"></i>
              <span>{{ item.label }}</span>
              <strong>{{ formatCurrency(item.value) }}</strong>
              <em>({{ formatPercent(totalAmount ? (item.value / totalAmount) * 100 : 0) }})</em>
            </div>
          </div>
        </div>
      </article>
    </section>

    <section class="panel table-panel">
      <header class="panel-head panel-head--between">
        <div>
          <h2>产品明细 <small>（原字段保留）</small></h2>
          <p class="panel-subtitle">继续按单品核对浏览、支付与转化表现。</p>
        </div>

        <button v-if="mock.bulkActionLabel" class="ghost-button ghost-button--compact" type="button" @click="trigger(mock.bulkActionLabel)">
          {{ mock.bulkActionLabel }}
        </button>
      </header>

      <div class="data-table">
        <div class="data-table__scroll">
          <table :style="mock.tableMinWidth ? { minWidth: `${mock.tableMinWidth}px` } : undefined">
            <colgroup>
              <col
                v-for="column in columns"
                :key="column.key"
                :style="column.width ? { width: column.width } : undefined"
              />
            </colgroup>
            <thead>
              <tr>
                <th
                  v-for="column in columns"
                  :key="column.key"
                  :data-align="column.align || 'left'"
                  :style="getColumnStyle(column)"
                >
                  {{ column.label }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, rowIndex) in rows" :key="rowIndex">
                <td
                  v-for="column in columns"
                  :key="column.key"
                  :data-align="column.align || 'left'"
                  :data-nowrap="shouldNowrap(column, getCell(row, column.key)) ? 'true' : undefined"
                  :style="getCellStyle(column, getCell(row, column.key))"
                >
                  <template v-if="getImageValue(row, column.key)">
                    <div class="image-cell">
                      <img :src="getImageValue(row, column.key)?.image" :alt="getImageValue(row, column.key)?.primary" />
                      <div class="image-cell__text">
                        <strong>{{ getImageValue(row, column.key)?.primary }}</strong>
                        <span v-if="getImageValue(row, column.key)?.secondary">{{ getImageValue(row, column.key)?.secondary }}</span>
                      </div>
                    </div>
                  </template>

                  <template v-else>
                    {{ getCell(row, column.key) }}
                  </template>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  </section>
</template>

<style scoped src="../_shared/analysis-ui.css"></style>

<style scoped>
.product-analysis-page {
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

.trade-hero__eyebrow {
  margin: 0 0 8px;
  color: #4f8a7b;
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.trade-hero h1 {
  margin: 0;
  color: #1f6f67;
  font-size: 28px;
  font-weight: 900;
  line-height: 1.15;
}

.trade-hero__description {
  max-width: 700px;
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
  min-width: 260px;
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

.date-range svg,
.filter-field__icon--calendar {
  width: 18px;
  height: 18px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
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

.filter-panel {
  background:
    radial-gradient(circle at top left, rgba(110, 215, 183, 0.08), transparent 34%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(246, 251, 248, 0.96));
}

.dashboard-filter {
  padding: 2px 0 0;
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

.metric-grid--product {
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
  --tone: #5aaef5;
}

.metric-card--amber {
  --tone: #ffa63d;
}

.metric-card--blue {
  --tone: #7b8dff;
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

.trade-grid--product {
  display: grid;
  grid-template-columns: minmax(0, 1.25fr) minmax(340px, 0.92fr);
  gap: 12px;
}

.chart-panel {
  display: grid;
  align-content: start;
}

.chart-panel--wide {
  background:
    radial-gradient(circle at top left, rgba(145, 226, 178, 0.14), transparent 30%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(247, 251, 249, 0.96));
}

.chart-box {
  width: 100%;
}

.chart-box--bar {
  height: 360px;
}

.chart-card__canvas--ring {
  min-width: 240px;
  height: 300px;
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

.ring-panel {
  display: grid;
  align-items: center;
  gap: 10px;
}

.ring-panel--panel {
  grid-template-columns: minmax(220px, 1fr) minmax(220px, 1fr);
}

.side-legend {
  display: grid;
  gap: 10px;
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
  color: #5f6d79;
}

.side-legend__row i {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.side-legend__row strong {
  color: #33404d;
  font-size: 12px;
  font-weight: 700;
}

.side-legend__row em {
  color: #8b96a1;
  font-style: normal;
  font-weight: 700;
}

.table-panel {
  background:
    radial-gradient(circle at top right, rgba(170, 235, 255, 0.2), transparent 22%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(247, 251, 249, 0.96));
}

.ghost-button {
  min-width: 118px;
  height: 40px;
  padding: 0 16px;
  border: 1px solid #dfe9e4;
  border-radius: 12px;
  background: #ffffff;
  color: #33404d;
  font-size: 13px;
  font-weight: 700;
}

.ghost-button--compact {
  min-width: 96px;
  height: 38px;
  padding: 0 14px;
}

.image-cell {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.image-cell img {
  width: 64px;
  height: 64px;
  border-radius: 14px;
  object-fit: cover;
  background: #eef4f1;
  box-shadow: 0 8px 18px rgba(51, 97, 88, 0.08);
}

.image-cell__text {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.image-cell__text strong {
  color: #2f3946;
  font-size: 12px;
  font-weight: 700;
}

.image-cell__text span {
  color: #8b96a1;
  font-size: 11px;
}

@media (max-width: 1280px) {
  .metric-grid--product {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .trade-grid--product,
  .ring-panel--panel {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 780px) {
  .trade-hero__main,
  .panel-head--between {
    flex-direction: column;
  }

  .date-range--hero,
  .metric-grid--product {
    width: 100%;
  }

  .metric-grid--product {
    grid-template-columns: 1fr;
  }

  .chart-box--bar,
  .chart-card__canvas--ring {
    height: 300px;
  }
}
</style>
