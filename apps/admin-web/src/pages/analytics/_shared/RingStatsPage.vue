<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, shallowRef } from "vue";
import * as echarts from "echarts";

type RingItem = {
  label: string;
  value: number;
  color: string;
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
      animationDuration: 500,
      title: {
        text: `${props.config.total}`,
        subtext: props.config.totalLabel,
        left: "center",
        top: "34%",
        itemGap: 10,
        textStyle: {
          color: "#2f3946",
          fontSize: 26,
          fontWeight: 600,
        },
        subtextStyle: {
          color: "#96a0ab",
          fontSize: 12,
          fontWeight: 400,
        },
      },
      tooltip: {
        trigger: "item",
        backgroundColor: "rgba(255,255,255,0.96)",
        borderColor: "#e5efea",
        borderWidth: 1,
        textStyle: {
          color: "#2f3946",
          fontSize: 12,
        },
        formatter: "{b}：{c}",
      },
      series: [
        {
          type: "pie",
          radius: ["58%", "78%"],
          center: ["50%", "48%"],
          label: { show: false },
          labelLine: { show: false },
          itemStyle: {
            borderColor: "#ffffff",
            borderWidth: 4,
          },
          data: props.config.items.map((item) => ({
            name: item.label,
            value: item.value,
            itemStyle: {
              color: item.color,
            },
          })),
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

      <div ref="chartRef" class="ring-chart"></div>

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
  height: 420px;
  margin-top: 6px;
}

.ring-legend {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 18px 32px;
  margin-top: -6px;
  margin-bottom: 20px;
}

.ring-legend__item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #66727e;
  font-size: 12px;
}

.ring-legend__item i {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.ring-legend__item strong {
  color: #364351;
  font-size: 12px;
  font-weight: 500;
}

.ring-table {
  margin-top: 8px;
}
</style>
