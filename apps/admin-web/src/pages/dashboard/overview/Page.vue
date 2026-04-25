<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, shallowRef } from "vue";
import * as echarts from "echarts";
import type { ECharts, EChartsOption } from "echarts";
import shanghaiGeoJson from "@/assets/map/shanghai.json";
import mock from "./mock";

type ChartItem = {
  label: string;
  value: number;
  color: string;
  highlightColor?: string;
  count?: string;
  percent?: string;
};

const iconMarkup: Record<string, string> = {
  users: `
    <circle cx="19" cy="15.5" r="5.2" />
    <path d="M9.6 34.8c1.3-7.2 5.2-10.9 11.8-10.9 5.9 0 9.6 3.1 11.2 9.3" />
    <circle cx="31.7" cy="18" r="3.6" opacity=".72" />
    <path d="M31.4 28.2c3.8.2 6.3 2 7.4 5.3" opacity=".72" />
  `,
  heart: `
    <path d="M22 35.8S8.8 28.4 8.8 17.8c0-4.8 3.7-8.2 8.1-8.2 2.7 0 4.5 1.2 5.1 2.4.7-1.2 2.5-2.4 5.2-2.4 4.4 0 8 3.4 8 8.2 0 10.6-13.2 18-13.2 18Z" />
    <path d="M12.5 22.4h6.2l2.2-5.4 3.9 10.1 2.4-4.7h4.4" fill="none" stroke="#fff" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" />
  `,
  shield: `
    <path d="M22 7.8 35 12v9.5c0 8.4-5.6 13.1-13 16.7C14.6 34.6 9 29.9 9 21.5V12l13-4.2Z" />
    <path d="m17.4 22 3.1 3.1 6.2-7.1" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
  `,
  building: `
    <path d="M11.5 36.5V12l15.4-4.6v29.1" />
    <path d="M26.9 18.8h8.6v17.7" opacity=".72" />
    <path d="M16.2 16.2h3.1M16.2 23h3.1M16.2 29.8h3.1" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" />
  `,
  staff: `
    <circle cx="17" cy="15" r="5.2" />
    <circle cx="31.4" cy="16.6" r="4" opacity=".72" />
    <path d="M7.8 35.2c1.2-7 4.9-10.6 11.1-10.6s9.9 3.6 11.1 10.6" />
    <path d="M29.4 27.4c4.6.3 7.6 2.8 8.8 7.5" opacity=".72" />
  `,
  warning: `
    <path d="M22 7.5 39 36.2H5L22 7.5Z" />
    <path d="M22 17.2v9.4M22 31.8h.1" fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round" />
  `,
  elder: `
    <circle cx="22" cy="14.2" r="6" />
    <path d="M10.8 36c1.5-7.5 5.2-11.3 11.2-11.3S31.7 28.5 33.2 36" />
    <path d="M34 15.4v8.8M29.6 19.8h8.8" opacity=".72" />
  `,
  medicine: `
    <path d="M13.5 30.5 30.5 13.5a6 6 0 1 1 8.5 8.5L22 39a6 6 0 1 1-8.5-8.5Z" />
    <path d="m21.8 22.2 8 8" opacity=".76" />
  `,
  bed: `
    <path d="M8 15.5v21M8 27h29.5a4 4 0 0 1 4 4v5.5" />
    <path d="M8 23.5h12.5v-6.2H12a4 4 0 0 0-4 4v2.2Z" />
  `,
};

const shanghaiMapName = "shanghai";
const shanghaiMapGeoJson = {
  ...shanghaiGeoJson,
  features: shanghaiGeoJson.features.filter((feature) => feature.properties?.name !== "崇明区"),
};

echarts.registerMap(shanghaiMapName, shanghaiMapGeoJson as Parameters<typeof echarts.registerMap>[1]);

const serviceChartEl = ref<HTMLElement | null>(null);
const ageChartEl = ref<HTMLElement | null>(null);
const healthChartEl = ref<HTMLElement | null>(null);
const trendChartEl = ref<HTMLElement | null>(null);
const mapChartEl = ref<HTMLElement | null>(null);

const serviceChart = shallowRef<ECharts | null>(null);
const ageChart = shallowRef<ECharts | null>(null);
const healthChart = shallowRef<ECharts | null>(null);
const trendChart = shallowRef<ECharts | null>(null);
const mapChart = shallowRef<ECharts | null>(null);

let resizeObserver: ResizeObserver | null = null;

function renderIcon(name: string) {
  return iconMarkup[name] || iconMarkup.users;
}

function getChartInstance(target: HTMLElement | null, current: ECharts | null) {
  if (!target) {
    return null;
  }

  return current || echarts.init(target);
}

function createRingOption(
  name: string,
  items: ChartItem[],
  centerText: string,
  centerSubtext: string,
  rounded = false,
): EChartsOption {
  const ringData = items.map((item) => {
    const baseColor = item.color;
    const highlightColor = item.highlightColor || item.color;

    return {
      name: item.label,
      value: item.value,
      itemStyle: {
        color: rounded
          ? {
              type: "linear",
              x: 0,
              y: 0,
              x2: 1,
              y2: 1,
              colorStops: [
                { offset: 0, color: highlightColor },
                { offset: 1, color: baseColor },
              ],
            }
          : baseColor,
        shadowBlur: rounded ? 14 : 0,
        shadowColor: rounded ? `${baseColor}80` : "transparent",
        shadowOffsetY: rounded ? 6 : 0,
      },
      emphasis: rounded
        ? {
            itemStyle: {
              color: {
                type: "linear",
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
          }
        : undefined,
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
        const record = params as { marker?: string; name?: string; value?: number };
        const item = items.find((chartItem) => chartItem.label === record.name);
        const detail = item?.count ? `${item.count} (${item.percent})` : item?.percent || `${record.value}`;
        return `${record.marker || ""}${record.name || ""}<br/>${detail}`;
      },
    },
    legend: {
      show: false,
      top: "5%",
      left: "center",
      itemWidth: 10,
      itemHeight: 10,
      icon: "circle",
      textStyle: {
        color: "#5f6b78",
        fontSize: 12,
        fontWeight: 700,
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
          fontSize: 19,
          fontWeight: 900,
          textAlign: "center",
        },
      },
      {
        type: "text",
        left: "center",
        top: "56%",
        style: {
          text: centerSubtext,
          fill: "#41515e",
          fontSize: 12,
          fontWeight: 800,
          textAlign: "center",
        },
      },
    ],
    series: [
      {
        name,
        type: "pie",
        radius: ["68%", "100%"],
        center: ["50%", "52%"],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: rounded ? 10 : 0,
          borderWidth: 2,
          borderColor: "rgba(255, 255, 255, 0.9)",
        },
        label: {
          show: false,
          position: "center",
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 40,
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

function createTrendOption(): EChartsOption {
  return {
    animationDuration: 650,
    grid: {
      top: 18,
      right: 12,
      bottom: 28,
      left: 38,
    },
    tooltip: {
      trigger: "axis",
      backgroundColor: "rgba(255,255,255,0.96)",
      borderColor: "#dfeeea",
      borderWidth: 1,
      textStyle: {
        color: "#2f3946",
        fontSize: 12,
        fontWeight: 700,
      },
      formatter(params: unknown) {
        const normalized = Array.isArray(params) ? params : [params];
        const item = normalized[0] as { axisValueLabel?: string; value?: number };
        return `${item.axisValueLabel || ""}<br/>服务人次：${item.value ?? "--"}`;
      },
    },
    xAxis: {
      type: "category",
      boundaryGap: false,
      data: mock.serviceTrend.labels,
      axisLine: {
        lineStyle: {
          color: "#edf3f1",
        },
      },
      axisTick: {
        show: false,
      },
      axisLabel: {
        color: "#7a8490",
        fontSize: 12,
        fontWeight: 700,
      },
    },
    yAxis: {
      type: "value",
      min: 0,
      splitNumber: 5,
      axisLine: {
        show: false,
      },
      axisTick: {
        show: false,
      },
      axisLabel: {
        color: "#7a8490",
        fontSize: 12,
        fontWeight: 700,
        formatter(value: number) {
          return `${Math.round(value / 1000)}K`;
        },
      },
      splitLine: {
        lineStyle: {
          color: "#edf3f1",
        },
      },
    },
    series: [
      {
        name: "服务人次",
        type: "line",
        data: mock.serviceTrend.values,
        smooth: true,
        symbol: "circle",
        symbolSize: 9,
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
      },
    ],
  };
}

function createMapOption(): EChartsOption {
  const values = mock.mapPoints.map((item) => item.value);
  const mapLayout = {
    roam: false,
    zoom: 1,
    aspectScale: 0.86,
    top: -18,
    bottom: -28,
    left: -22,
    right: -22,
  };
  const centerPointData = mock.mapPoints.map((item) => ({
    name: item.name,
    value: [...item.coordinate, item.value],
  }));

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
        const record = params as { name?: string; value?: number | number[] };
        const value = Array.isArray(record.value) ? record.value[2] : record.value;
        return `${record.name || ""}<br/>服务人次：${value ?? 0}`;
      },
    },
    geo: {
      map: shanghaiMapName,
      ...mapLayout,
      silent: true,
      itemStyle: {
        areaColor: "transparent",
        borderColor: "transparent",
      },
      emphasis: {
        disabled: true,
      },
    },
    visualMap: {
      show: false,
      min: Math.min(...values),
      max: Math.max(...values),
      seriesIndex: 0,
      inRange: {
        color: ["#dff8f2", "#aee7d7", "#75d2bd", "#ffb7c2"],
      },
    },
    series: [
      {
        name: "区域服务热力图",
        type: "map",
        map: shanghaiMapName,
        ...mapLayout,
        zlevel: 2,
        z: 10,
        label: {
          show: true,
          color: "#31504c",
          fontSize: 11,
          fontWeight: 800,
        },
        itemStyle: {
          areaColor: "#dff8f2",
          borderColor: "rgba(255,255,255,0.96)",
          borderWidth: 2,
          shadowBlur: 22,
          shadowColor: "rgba(42, 112, 143, 0.28)",
          shadowOffsetX: 0,
          shadowOffsetY: 5,
        },
        emphasis: {
          label: {
            show: true,
            color: "#1f6f67",
            fontSize: 12,
            fontWeight: 900,
          },
          itemStyle: {
            areaColor: "#91e2b2",
            borderColor: "rgba(255,255,255,0.96)",
            borderWidth: 2.4,
            shadowBlur: 28,
            shadowColor: "rgba(42, 112, 143, 0.36)",
            shadowOffsetX: 0,
            shadowOffsetY: 6,
          },
        },
        data: mock.mapPoints,
      },
      {
        name: "区域中心点",
        type: "effectScatter",
        coordinateSystem: "geo",
        zlevel: 3,
        z: 20,
        symbol: "circle",
        symbolSize: 9,
        showEffectOn: "render",
        rippleEffect: {
          brushType: "stroke",
          color: "rgba(222, 249, 255, 0.86)",
          period: 3.4,
          scale: 4.2,
        },
        label: {
          show: false,
        },
        itemStyle: {
          color: "#f8fdff",
          borderColor: "rgba(180, 241, 255, 1)",
          borderWidth: 2.5,
          shadowBlur: 16,
          shadowColor: "rgb(170,235,255)",
        },
        emphasis: {
          scale: 1.3,
          itemStyle: {
            color: "#d8f8ff",
            borderColor: "#ffffff",
            shadowBlur: 22,
            shadowColor: "rgba(170, 235, 255, 0.88)",
          },
        },
        data: centerPointData,
      },
    ],
  };
}

function renderCharts() {
  serviceChart.value = getChartInstance(serviceChartEl.value, serviceChart.value);
  ageChart.value = getChartInstance(ageChartEl.value, ageChart.value);
  healthChart.value = getChartInstance(healthChartEl.value, healthChart.value);
  trendChart.value = getChartInstance(trendChartEl.value, trendChart.value);
  mapChart.value = getChartInstance(mapChartEl.value, mapChart.value);

  serviceChart.value?.setOption(createRingOption("服务类型分布", mock.serviceTypes, mock.serviceTotal, "服务人次", true), true);
  ageChart.value?.setOption(createRingOption("用户年龄结构", mock.ageGroups, mock.registeredTotal, "在册用户", true), true);
  healthChart.value?.setOption(createRingOption("健康状态分布", mock.healthStatus, mock.healthScore, "健康/良好", true), true);
  trendChart.value?.setOption(createTrendOption(), true);
  mapChart.value?.setOption(createMapOption(), true);
}

function resizeCharts() {
  serviceChart.value?.resize();
  ageChart.value?.resize();
  healthChart.value?.resize();
  trendChart.value?.resize();
  mapChart.value?.resize();
}

onMounted(async () => {
  await nextTick();
  renderCharts();

  resizeObserver = new ResizeObserver(() => {
    resizeCharts();
  });

  [serviceChartEl.value, ageChartEl.value, healthChartEl.value, trendChartEl.value, mapChartEl.value].forEach((target) => {
    if (target) {
      resizeObserver?.observe(target);
    }
  });

  window.addEventListener("resize", resizeCharts);
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  window.removeEventListener("resize", resizeCharts);
  serviceChart.value?.dispose();
  ageChart.value?.dispose();
  healthChart.value?.dispose();
  trendChart.value?.dispose();
  mapChart.value?.dispose();
});
</script>

<template>
  <section class="overview-dashboard">
    <section class="metric-grid" aria-label="核心指标">
      <article v-for="item in mock.stats" :key="item.label" class="metric-card" :class="`metric-card--${item.tone}`">
        <span class="metric-icon" aria-hidden="true">
          <svg viewBox="0 0 44 44" focusable="false">
            <g v-html="renderIcon(item.icon)"></g>
          </svg>
        </span>
        <div class="metric-copy">
          <h2>{{ item.label }}</h2>
          <strong>{{ item.value }}<small>{{ item.unit }}</small></strong>
          <p>
            {{ item.compareLabel }}
            <em>{{ item.direction === "down" ? "↓" : "↑" }} {{ item.rate }}</em>
          </p>
        </div>
        <svg class="metric-spark" viewBox="0 0 96 38" preserveAspectRatio="none" aria-hidden="true">
          <polyline :points="item.spark" fill="none" stroke="currentColor" stroke-width="2.7" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </article>
    </section>

    <section class="dashboard-grid">
      <article class="panel service-panel">
        <header class="panel-head">
          <h2>服务类型分布 <small>（本月）</small></h2>
        </header>
        <div class="ring-with-list">
          <div ref="serviceChartEl" class="echart echart--ring"></div>
          <div class="side-legend side-legend--service">
            <div v-for="item in mock.serviceTypes" :key="item.label" class="side-legend__row">
              <i :style="{ background: item.color }"></i>
              <span>{{ item.label }}</span>
              <strong>{{ item.count }}</strong>
              <em>({{ item.percent }})</em>
            </div>
          </div>
        </div>
      </article>

      <article class="panel map-panel">
        <header class="panel-head">
          <h2>区域服务热力图 <small>（服务人次）</small></h2>
        </header>
        <div ref="mapChartEl" class="echart echart--map map-chart-hook"></div>
      </article>

      <article class="panel age-panel">
        <header class="panel-head">
          <h2>用户年龄结构 <small>（在册用户）</small></h2>
        </header>
        <div class="ring-with-list">
          <div ref="ageChartEl" class="echart echart--ring"></div>
          <div class="side-legend side-legend--service">
            <div v-for="item in mock.ageGroups" :key="item.label" class="side-legend__row">
              <i :style="{ background: item.color }"></i>
              <span>{{ item.label }}</span>
              <strong>{{ item.count }}</strong>
              <em>({{ item.percent }})</em>
            </div>
          </div>
        </div>
      </article>

      <article class="panel trend-panel">
        <header class="panel-head">
          <h2>服务趋势 <small>（近7天）</small></h2>
        </header>
        <div class="trend-chart">
          <div ref="trendChartEl" class="echart echart--trend"></div>
          <strong>{{ mock.serviceTrend.current }}</strong>
        </div>
      </article>

      <article class="panel health-panel">
        <header class="panel-head">
          <h2>健康状态分布 <small>（状态占比）</small></h2>
        </header>
        <div class="ring-with-list">
          <div ref="healthChartEl" class="echart echart--ring"></div>
          <div class="side-legend side-legend--service">
            <div v-for="item in mock.healthStatus" :key="item.label" class="side-legend__row">
              <i :style="{ background: item.color }"></i>
              <span>{{ item.label }}</span>
              <strong>{{ item.count }}</strong>
              <em>({{ item.percent }})</em>
            </div>
          </div>
        </div>
      </article>

      <article class="panel satisfaction-panel">
        <header class="panel-head">
          <h2>用户标签分布</h2>
        </header>
        <div class="satisfaction-layout">
          <div class="satisfaction-score">
            <strong>{{ mock.userTags.total }}<small>人</small></strong>
            <span>标签总数</span>
          </div>
          <div class="satisfaction-bars">
            <div v-for="item in mock.userTags.items" :key="item.label">
              <span>{{ item.label }}</span>
              <i><b :style="{ width: item.value }"></b></i>
              <em>{{ item.count }}</em>
            </div>
          </div>
        </div>
      </article>

      <article class="panel alert-panel">
        <header class="panel-head">
          <h2>预警提醒 <small>（今日）</small></h2>
        </header>
        <div class="alert-grid">
          <article v-for="item in mock.alerts" :key="item.label" class="alert-card" :class="`alert-card--${item.tone}`">
            <span aria-hidden="true">
              <svg viewBox="0 0 44 44" focusable="false">
                <g v-html="renderIcon(item.icon)"></g>
              </svg>
            </span>
            <p>{{ item.label }}</p>
            <strong>{{ item.value }}<small>{{ item.unit }}</small></strong>
            <em>{{ item.compare }}</em>
          </article>
        </div>
      </article>

      <article class="panel workload-panel">
        <header class="panel-head">
          <h2>支付榜商品排行TOP5</h2>
        </header>
        <div class="workload-list">
          <div v-for="item in mock.workloadTop" :key="item.rank">
            <strong>{{ item.rank }}</strong>
            <span>{{ item.name }}</span>
            <i><b :style="{ width: item.rate }"></b></i>
            <em>{{ item.rate }}</em>
          </div>
        </div>
      </article>
    </section>
  </section>
</template>

<style scoped>
.overview-dashboard {
  --mint: #4fbf91;
  --green-deep: #1f7b70;
  --blue: #5aaef5;
  --rose: #ff7f98;
  --amber: #ffa63d;
  --yellow: #ffc531;
  display: grid;
  gap: 16px;
  width: 100%;
  min-width: 0;
  color: #253244;
  font-family: "PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif;
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
}

.metric-card,
.panel {
  border: 1px solid rgba(224, 240, 238, 0.86);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 8px 24px rgba(66, 122, 116, 0.08);
}

.metric-card {
  position: relative;
  display: grid;
  grid-template-columns: 66px minmax(0, 1fr);
  align-items: center;
  min-height: 106px;
  padding: 14px 14px 12px;
  overflow: hidden;
}

.metric-icon {
  display: grid;
  place-items: center;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--tone) 14%, #ffffff);
  color: var(--tone);
}

.metric-icon svg,
.alert-card svg {
  width: 38px;
  height: 38px;
  fill: currentColor;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 2.1;
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

.metric-card--pink {
  --tone: #ff7f9b;
}

.metric-copy h2 {
  margin: 0;
  color: #374151;
  font-size: 14px;
  font-weight: 900;
}

.metric-copy strong {
  display: block;
  margin-top: 8px;
  color: #263244;
  font-size: 28px;
  font-weight: 900;
  line-height: 1;
}

.metric-copy strong small {
  margin-left: 6px;
  color: #4d5868;
  font-size: 13px;
  font-weight: 900;
}

.metric-copy p {
  margin: 10px 0 0;
  color: #697483;
  font-size: 12px;
  font-weight: 800;
}

.metric-copy em {
  margin-left: 6px;
  color: var(--tone);
  font-style: normal;
  font-weight: 900;
}

.metric-spark {
  position: absolute;
  right: 12px;
  bottom: 7px;
  width: 62px;
  height: 24px;
  color: var(--tone);
  opacity: 0.82;
}

.dashboard-grid {
  display: grid;
  grid-template-columns: minmax(0, 25.5%) minmax(0, 46%) minmax(0, 28.5%);
  grid-template-rows: 250px 228px 228px;
  grid-template-areas:
    "service map age"
    "trend map health"
    "satisfaction alert workload";
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

.service-panel {
  grid-area: service;
}

.map-panel {
  grid-area: map;
}

.age-panel {
  grid-area: age;
}

.trend-panel {
  grid-area: trend;
}

.health-panel {
  grid-area: health;
}

.satisfaction-panel {
  grid-area: satisfaction;
}

.alert-panel {
  grid-area: alert;
}

.workload-panel {
  grid-area: workload;
}

.echart {
  width: 100%;
  min-width: 0;
}

.echart--ring {
  height: 100%;
  min-height: 176px;
}

.echart--trend {
  width: 100%;
  height: 168px;
}

.ring-with-list {
  display: grid;
  grid-template-columns: minmax(132px, 0.92fr) minmax(0, 1fr);
  align-items: center;
  gap: 12px;
  height: calc(100% - 34px);
}

.side-legend {
  display: grid;
  gap: 14px;
  min-width: 0;
}

.side-legend__row {
  display: grid;
  grid-template-columns: 12px minmax(0, 1fr) auto;
  align-items: center;
  gap: 9px;
  color: #5d6876;
  font-size: 10px;
  font-weight: 900;
  line-height: 1.25;
}

.side-legend--service .side-legend__row {
  grid-template-columns: 12px minmax(0, 1fr) auto auto;
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

.donut-layout {
  display: grid;
  grid-template-columns: minmax(148px, 0.9fr) minmax(0, 1fr);
  align-items: center;
  gap: 16px;
  height: calc(100% - 34px);
}

.donut-layout--side {
  grid-template-columns: minmax(150px, 0.92fr) minmax(0, 1fr);
}

.donut {
  position: relative;
  display: grid;
  place-items: center;
  width: 162px;
  height: 162px;
  justify-self: center;
  border-radius: 50%;
}

.donut--service {
  width: 186px;
  height: 186px;
}

.donut::after {
  position: absolute;
  inset: 33px;
  content: "";
  border-radius: 50%;
  background: #ffffff;
  box-shadow: inset 0 0 0 1px rgba(224, 238, 236, 0.9);
}

.donut div {
  position: relative;
  z-index: 1;
  display: grid;
  justify-items: center;
  gap: 5px;
}

.donut strong {
  color: #1f7b70;
  font-size: 28px;
  font-weight: 900;
  line-height: 1;
}

.donut span {
  color: #41515e;
  font-size: 14px;
  font-weight: 900;
}

.legend {
  display: grid;
  gap: 14px;
}

.legend-row {
  display: grid;
  grid-template-columns: 12px minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 9px;
  color: #596574;
  font-size: 14px;
  font-weight: 900;
}

.legend--side .legend-row {
  grid-template-columns: 12px minmax(0, 1fr) auto;
}

.legend-row i {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.legend-row span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.legend-row strong,
.legend-row em {
  color: #697483;
  font-style: normal;
  font-weight: 900;
}

.map-chart-hook {
  position: relative;
  height: calc(100% - 36px);
  min-height: 488px;
  overflow: hidden;
  border-radius: 10px;
  background: #ffffff;
}

.map-center {
  position: absolute;
  left: 50%;
  top: 56%;
  z-index: 2;
  display: grid;
  place-items: center;
  width: 142px;
  height: 142px;
  border: 10px solid rgba(147, 230, 219, 0.58);
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 0 0 12px rgba(90, 200, 190, 0.13);
  transform: translate(-50%, -50%);
}

.map-center strong {
  color: #1f7b70;
  font-size: 32px;
  font-weight: 900;
  line-height: 1;
}

.map-center span {
  margin-top: -24px;
  color: #41515e;
  font-size: 13px;
  font-weight: 900;
}

.map-point {
  position: absolute;
  z-index: 2;
  display: grid;
  justify-items: center;
  color: #263244;
  transform: translate(-50%, -50%);
}

.map-point span {
  color: #46615e;
  font-size: 13px;
  font-weight: 900;
}

.map-point strong {
  margin-top: 3px;
  font-size: 24px;
  font-weight: 900;
}

.map-point i {
  display: block;
  width: 34px;
  height: 12px;
  margin-top: 6px;
  border: 3px solid rgba(255, 255, 255, 0.88);
  border-radius: 50%;
  box-shadow: 0 0 16px rgba(120, 222, 210, 0.86);
}

.trend-chart {
  position: relative;
  height: calc(100% - 34px);
}

.trend-chart > strong {
  position: absolute;
  right: 2px;
  top: 12px;
  color: #459d78;
  font-size: 16px;
  font-weight: 900;
}

.trend-labels {
  display: flex;
  justify-content: space-between;
  color: #7a8490;
  font-size: 12px;
  font-weight: 900;
}

.satisfaction-layout {
  display: grid;
  grid-template-columns: 112px minmax(0, 1fr);
  align-items: center;
  gap: 14px;
  height: calc(100% - 34px);
}

.satisfaction-score {
  display: grid;
  justify-items: center;
  gap: 5px;
}

.satisfaction-score strong {
  color: #1f7b70;
  font-size: 40px;
  font-weight: 900;
  line-height: 1;
}

.satisfaction-score small {
  font-size: 17px;
}

.satisfaction-score span {
  color: #4c5967;
  font-size: 14px;
  font-weight: 900;
}

.satisfaction-bars {
  display: grid;
  gap: 7px;
}

.satisfaction-bars div {
  display: grid;
  grid-template-columns: 68px minmax(0, 1fr) 44px;
  align-items: center;
  gap: 8px;
  color: #5d6876;
  font-size: 12px;
  font-weight: 900;
}

.satisfaction-bars i,
.workload-list i {
  margin-top: 10px;
  height: 9px;
  overflow: hidden;
  border-radius: 999px;
  background: #e7f6f1;
}

.satisfaction-bars i {
  margin-top: 0;
  height: 7px;
}

.satisfaction-bars b,
.workload-list b {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #78d9b8, #52c896);
}

.alert-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 18px;
  height: calc(100% - 36px);
}

.alert-card {
  display: grid;
  place-items: center;
  align-content: center;
  gap: 8px;
  min-width: 0;
  border: 1px solid color-mix(in srgb, var(--alert) 18%, #ffffff);
  border-radius: 8px;
  background: color-mix(in srgb, var(--alert) 5%, #ffffff);
}

.alert-card--rose {
  --alert: #ff6d86;
}

.alert-card--amber {
  --alert: #ffa63d;
}

.alert-card--yellow {
  --alert: #ffc531;
}

.alert-card--blue {
  --alert: #59aef5;
}

.alert-card span {
  color: var(--alert);
}

.alert-card p {
  margin: 0;
  color: #515d6b;
  font-size: 14px;
  font-weight: 900;
  text-align: center;
}

.alert-card strong {
  color: var(--alert);
  font-size: 32px;
  font-weight: 900;
  line-height: 1;
}

.alert-card small {
  margin-left: 5px;
  font-size: 14px;
}

.alert-card em {
  color: #687482;
  font-size: 13px;
  font-style: normal;
  font-weight: 900;
}

.workload-list {
  margin-top: 20px;
  display: grid;
  gap: 8px;
  height: calc(100% - 34px);
  align-content: center;
}

.workload-list div {
  display: grid;
  grid-template-columns: 20px minmax(0, 1fr) 116px 40px;
  align-items: center;
  gap: 5px;
}

.workload-list strong {
  color: #ffad2f;
  font-size: 18px;
  font-weight: 900;
}

.workload-list span {
  overflow: hidden;
  color: #4f5b68;
  font-size: 14px;
  font-weight: 900;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.workload-list b {
  background: linear-gradient(90deg, #ff91a5, #ff6f8e);
}

.workload-list em {
  color: #5d6876;
  font-size: 14px;
  font-style: normal;
  font-weight: 900;
}

@media (max-width: 780px) {
  .metric-grid,
  .satisfaction-layout,
  .ring-with-list,
  .alert-grid {
    grid-template-columns: 1fr;
  }

  .metric-card {
    grid-template-columns: 76px minmax(0, 1fr);
  }

  .dashboard-grid {
    grid-template-columns: 1fr;
    grid-template-rows: none;
    grid-template-areas:
      "service"
      "map"
      "age"
      "trend"
      "health"
      "satisfaction"
      "alert"
      "workload";
  }

  .map-chart-hook {
    min-height: 460px;
  }
}
</style>
