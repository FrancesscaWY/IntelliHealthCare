<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, shallowRef } from "vue";
import * as echarts from "echarts";

type RingItem = {
  label: string;
  value: number;
  color: string;
  highlightColor?: string;
};

type TableColumn = {
  key: string;
  label: string;
  align?: "left" | "center" | "right";
};

type Config = {
  title: string;
  filterLabel: string;
  rangeLabel: string;
  sectionTitle: string;
  chartTitle: string;
  totalLabel: string;
  total: number;
  chartHeight?: number;
  chartRadius?: readonly [string, string];
  chartCenter?: readonly [string, string];
  items: ReadonlyArray<RingItem>;
  columns: ReadonlyArray<TableColumn>;
  rows: ReadonlyArray<Record<string, string | number>>;
};

const props = defineProps<{
  config: Config;
  showToast: (message: string) => void;
}>();

const chartRef = ref<HTMLElement | null>(null);
const chart = shallowRef<echarts.ECharts | null>(null);

function renderChart() {
  if (!chartRef.value) {
    return;
  }

  if (!chart.value) {
    chart.value = echarts.init(chartRef.value);
  }

  chart.value.setOption(
    {
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
          const total = props.config.total || 1;
          const value = record.value ?? 0;
          const percent = `${((value / total) * 100).toFixed(1).replace(/\.0$/, "")}%`;
          return `${record.marker || ""}${record.name || ""}<br/>${value} (${percent})`;
        },
      },
      graphic: [
        {
          type: "text",
          left: "center",
          top: "44%",
          style: {
            text: `${props.config.total}`,
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
            text: props.config.totalLabel,
            fill: "#41515e",
            fontSize: 12,
            fontWeight: 800,
            align: "center",
          },
        },
      ],
      series: [
        {
          name: props.config.chartTitle,
          type: "pie",
          radius: props.config.chartRadius || ["68%", "100%"],
          center: props.config.chartCenter || ["50%", "52%"],
          avoidLabelOverlap: false,
          label: { show: false },
          labelLine: { show: false },
          itemStyle: {
            borderColor: "transparent",
            borderWidth: 0,
          },
          data: props.config.items.map((item) => ({
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
                  { offset: 0, color: item.highlightColor || item.color },
                  { offset: 1, color: item.color },
                ],
              },
              shadowBlur: 14,
              shadowColor: `${item.color}80`,
              shadowOffsetY: 6,
            },
          })),
          emphasis: {
            itemStyle: {
              shadowBlur: 24,
              shadowOffsetY: 8,
            },
            label: {
              show: true,
              fontSize: 36,
              fontWeight: "bold",
              color: "#1f7b70",
            },
          },
        },
      ],
    },
    true,
  );
}

function handleResize() {
  chart.value?.resize();
}

function trigger(label: string) {
  props.showToast(`${label}为演示状态。`);
}

onMounted(() => {
  renderChart();
  window.addEventListener("resize", handleResize);
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", handleResize);
  chart.value?.dispose();
  chart.value = null;
});
</script>

<template>
  <section class="analysis-page">
    <article class="analysis-card analysis-card--filter">
      <header class="analysis-heading">
        <span class="analysis-heading__accent"></span>
        <h1>{{ config.title }}</h1>
      </header>

      <div class="filter-stack">
        <div class="filter-row-grid">
          <div class="filter-field" style="grid-column: span 12">
            <span class="filter-field__label">{{ config.filterLabel }}</span>
            <button class="filter-field__control filter-field__control--range" type="button" @click="trigger('日期筛选')">
              <span class="filter-field__input">{{ config.rangeLabel.split(" ~ ")[0] }}</span>
              <span class="filter-field__divider">~</span>
              <span class="filter-field__input">{{ config.rangeLabel.split(" ~ ")[1] }}</span>
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
          <h2>{{ config.sectionTitle }}</h2>
        </div>
        <button class="card-toolbar__button" type="button" @click="trigger('导出')">导出</button>
      </div>

      <div ref="chartRef" class="ring-chart" :style="{ height: `${config.chartHeight || 420}px` }"></div>

      <div class="ring-legend">
        <span v-for="item in config.items" :key="item.label" class="ring-legend__item">
          <i :style="{ backgroundColor: item.color }"></i>
          <span>{{ item.label }}</span>
          <strong>{{ item.value }}</strong>
        </span>
      </div>

      <div class="data-table ring-table">
        <table>
          <thead>
            <tr>
              <th
                v-for="column in config.columns"
                :key="column.key"
                :data-align="column.align || 'left'"
              >
                {{ column.label }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, index) in config.rows" :key="index">
              <td
                v-for="column in config.columns"
                :key="column.key"
                :data-align="column.align || 'left'"
              >
                {{ row[column.key] }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </article>
  </section>
</template>

<style scoped src="./analysis-ui.css"></style>

<style scoped>
.filter-field__control {
  border: 1px solid #dfe9e4;
}

.filter-field__icon--calendar {
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.ring-chart {
  margin-top: 6px;
}

.ring-legend {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 18px 32px;
  margin-top: -18px;
  margin-bottom: 10px;
}

.ring-legend__item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #66727e;
  font-size: 12px;
}

.ring-legend__item i {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  box-shadow: 0 0 0 3px rgba(235, 247, 243, 0.9);
}

.ring-legend__item strong {
  color: #364351;
  font-size: 12px;
  font-weight: 500;
}

.ring-table {
  margin-top: 0;
}
</style>
