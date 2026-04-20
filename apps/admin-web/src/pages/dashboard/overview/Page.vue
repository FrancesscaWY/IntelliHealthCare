<script setup lang="ts">
import { computed } from "vue";
import type { PageComponentProps } from "@ihc/page-core/types";
import mock from "./mock";

const props = defineProps<PageComponentProps>();

const quickIcons: Record<string, string> = {
  users: `
    <circle cx="18.5" cy="18" r="5.4" />
    <path d="M10.8 31.4c1.1-4.3 4.5-6.8 8.4-6.8 1.7 0 3.3.4 4.6 1.1" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" />
    <path d="M29 18.8h8.6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" />
    <path d="M29 24.7h6.7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" />
  `,
  report: `
    <path d="M16.2 11.6h10.6l5.4 5.3v19H16.2a2 2 0 0 1-2-2v-20.3a2 2 0 0 1 2-2Z" fill="none" stroke="currentColor" stroke-width="2.2" />
    <path d="M26.8 11.6v5.8h5.4" fill="none" stroke="currentColor" stroke-width="2.2" />
    <path d="M19.6 24.2h8.8" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" />
    <path d="M19.6 29.8h8.8" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" />
  `,
  message: `
    <path d="M11.4 14.6h25.2v18.6H18.4L11.4 38V14.6Z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" />
    <path d="m15 18.8 9 6.8 9-6.8" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
  `,
  database: `
    <ellipse cx="24" cy="15.8" rx="10.1" ry="4.4" fill="none" stroke="currentColor" stroke-width="2.2" />
    <path d="M13.9 15.8v12.8c0 2.4 4.5 4.4 10.1 4.4 5.6 0 10.1-2 10.1-4.4V15.8" fill="none" stroke="currentColor" stroke-width="2.2" />
    <path d="M13.9 22.4c0 2.4 4.5 4.4 10.1 4.4 5.6 0 10.1-2 10.1-4.4" fill="none" stroke="currentColor" stroke-width="2.2" />
  `,
  file: `
    <path d="M16.4 11.8h10.2l5.5 5.3v18.8H16.4a2 2 0 0 1-2-2V13.8a2 2 0 0 1 2-2Z" fill="none" stroke="currentColor" stroke-width="2.2" />
    <path d="M26.6 11.8v5.8h5.5" fill="none" stroke="currentColor" stroke-width="2.2" />
    <path d="M19.4 24h9" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" />
    <path d="M19.4 29.6h9" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" />
  `,
  refresh: `
    <path d="M16.4 18.2A10 10 0 0 1 34 15.6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" />
    <path d="m33 11.8 1 3.8-3.8.4" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M31.6 29.7A10 10 0 0 1 14 32.4" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" />
    <path d="m15 36.2-1-3.8 3.8-.4" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
  `,
  star: `
    <path d="m24 12.2 3.5 7.2 8 1.1-5.8 5.5 1.3 7.9-7-3.8-7 3.8 1.3-7.9-5.8-5.5 8-1.1 3.5-7.2Z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" />
  `,
  send: `
    <path d="m13.4 14.5 21.8 9.4-21.8 9.7 4.3-9.7-4.3-9.4Z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" />
    <path d="M17.5 24h8.8" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" />
  `,
};

const pieStyle = computed(() => {
  const segments = mock.serviceOrderShare
    .map((item, index, list) => {
      const start = list.slice(0, index).reduce((sum, current) => sum + current.value, 0);
      const end = start + item.value;
      return `${item.color} ${start}% ${end}%`;
    })
    .join(", ");

  return { background: `conic-gradient(${segments})` };
});

const trendMax = computed(() => Math.max(...mock.trend.values));
const trendMin = computed(() => Math.min(...mock.trend.values));

function metricPoints(values: number[], width = 148, height = 82, padding = 6) {
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = Math.max(max - min, 1);

  return values
    .map((value, index) => {
      const x = padding + (index * (width - padding * 2)) / Math.max(values.length - 1, 1);
      const y = height - padding - ((value - min) / range) * (height - padding * 2);
      return `${x},${y}`;
    })
    .join(" ");
}

function metricArea(values: number[]) {
  const points = metricPoints(values).split(" ");
  const first = points[0]?.split(",") || ["0", "82"];
  const last = points[points.length - 1]?.split(",") || ["148", "82"];
  return `M ${first[0]} 76 L ${points.map((point) => point.replace(",", " ")).join(" L ")} L ${last[0]} 76 Z`;
}

function trendPoint(index: number, value: number, width = 1128, height = 336, paddingX = 62, paddingY = 18) {
  const x = paddingX + (index * (width - paddingX * 2)) / Math.max(mock.trend.values.length - 1, 1);
  const range = Math.max(trendMax.value - trendMin.value, 1);
  const y = height - paddingY - ((value - trendMin.value) / range) * (height - paddingY * 2);
  return { x, y };
}

const trendPoints = computed(() => mock.trend.values.map((value, index) => trendPoint(index, value)));
const trendPolyline = computed(() => trendPoints.value.map((point) => `${point.x},${point.y}`).join(" "));
const trendArea = computed(() => {
  const first = trendPoints.value[0];
  const last = trendPoints.value[trendPoints.value.length - 1];
  return `M ${first.x} 318 L ${trendPoints.value.map((point) => `${point.x} ${point.y}`).join(" L ")} L ${last.x} 318 Z`;
});
const highlightPoint = computed(() => trendPoints.value[mock.trend.highlightIndex] || trendPoints.value[0]);

function compareClass(tone: string) {
  return tone === "negative" ? "metric__delta-value--negative" : "metric__delta-value--positive";
}

function openQuickEntry(entry: { title: string; pageId?: string }) {
  if (entry.pageId) {
    props.navigation.reLaunch(entry.pageId);
    return;
  }

  props.showToast(`${entry.title}功能正在接入中。`);
}
</script>

<template>
  <section class="overview">
    <header class="overview__greeting">
      <span class="overview__emoji">👋</span>
      <h1>{{ mock.greeting }}</h1>
    </header>

    <section class="metrics">
      <article v-for="item in mock.stats" :key="item.label" class="metric">
        <div class="metric__main">
          <p class="metric__label">{{ item.label }}</p>
          <strong class="metric__value">{{ item.value }}</strong>
          <div class="metric__delta">
            <span>{{ item.compareLabel }}</span>
            <strong :class="compareClass(item.compareTone)">{{ item.compareValue }}</strong>
          </div>
        </div>

        <div class="metric__chart">
          <svg v-if="item.chartType === 'area'" viewBox="0 0 148 82" preserveAspectRatio="none">
            <defs>
              <linearGradient :id="`metricGradient-${item.label}`" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" :stop-color="item.chartColor" stop-opacity="0.5" />
                <stop offset="100%" :stop-color="item.chartColor" stop-opacity="0" />
              </linearGradient>
            </defs>
            <path :d="metricArea(item.values)" :fill="`url(#metricGradient-${item.label})`" />
            <polyline :points="metricPoints(item.values)" fill="none" :stroke="item.chartColor" stroke-width="3" />
          </svg>

          <svg v-else viewBox="0 0 148 82" preserveAspectRatio="none">
            <rect
              v-for="(value, index) in item.values"
              :key="`${item.label}-${index}`"
              :x="10 + index * 24"
              :y="82 - value"
              width="14"
              :height="value"
              rx="3.5"
              :fill="item.chartColor"
              :fill-opacity="item.label === '新增动态数量' && index >= item.values.length - 2 ? 0.18 : 1"
            />
          </svg>
        </div>
      </article>
    </section>

    <section class="row row--middle">
      <article class="panel panel--quick">
        <header class="panel__head">
          <span class="panel__accent"></span>
          <h2>快捷入口</h2>
        </header>

        <div class="quick-grid">
          <button v-for="entry in mock.quickEntries" :key="entry.title" class="quick-grid__item" type="button" @click="openQuickEntry(entry)">
            <span class="quick-grid__icon" :class="`quick-grid__icon--${entry.tone}`">
              <svg viewBox="0 0 48 48" focusable="false" aria-hidden="true">
                <g fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" v-html="quickIcons[entry.icon]"></g>
              </svg>
            </span>
            <span class="quick-grid__label">{{ entry.title }}</span>
          </button>
        </div>
      </article>

      <article class="panel">
        <header class="panel__head">
          <span class="panel__accent"></span>
          <h2>用户标签分布</h2>
        </header>

        <div class="bars">
          <div v-for="item in mock.tagDistribution" :key="item.label" class="bars__item">
            <span class="bars__label">{{ item.label }}</span>
            <div class="bars__track">
              <span class="bars__fill" :style="{ width: `${(item.value / item.max) * 100}%` }"></span>
            </div>
            <strong class="bars__value">{{ item.value }}</strong>
          </div>
        </div>
      </article>

      <article class="panel">
        <header class="panel__head">
          <span class="panel__accent"></span>
          <h2>各服务类型商品订单量占比</h2>
        </header>

        <div class="pie-card">
          <div class="pie-card__chart" :style="pieStyle"></div>

          <div class="pie-card__legend">
            <div v-for="item in mock.serviceOrderShare" :key="item.label" class="pie-card__legend-item">
              <span class="pie-card__dot" :style="{ background: item.color }"></span>
              <span class="pie-card__legend-label">{{ item.label }}</span>
              <strong class="pie-card__legend-value">{{ item.value }}%</strong>
            </div>
          </div>
        </div>
      </article>
    </section>

    <article class="panel panel--trend">
      <header class="panel__head">
        <span class="panel__accent"></span>
        <h2>用户趋势统计</h2>
      </header>

      <div class="trend">
        <div class="trend__y">
          <span>3500</span>
          <span>3000</span>
          <span>2500</span>
          <span>2000</span>
        </div>

        <div class="trend__canvas">
          <svg viewBox="0 0 1128 336" preserveAspectRatio="none">
            <defs>
              <linearGradient id="trendGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="#42d1a6" stop-opacity="0.42" />
                <stop offset="100%" stop-color="#42d1a6" stop-opacity="0.04" />
              </linearGradient>
            </defs>

            <line v-for="lineIndex in 4" :key="lineIndex" x1="62" x2="1066" :y1="44 + (lineIndex - 1) * 74" :y2="44 + (lineIndex - 1) * 74" stroke="#edf0ef" stroke-width="1" />
            <rect :x="highlightPoint.x - 19" y="18" width="38" height="300" fill="#42d1a6" fill-opacity="0.2" />
            <line :x1="highlightPoint.x" :x2="highlightPoint.x" y1="18" y2="318" stroke="#42d1a6" stroke-width="3" stroke-dasharray="8 6" />
            <path :d="trendArea" fill="url(#trendGradient)" />
            <polyline :points="trendPolyline" fill="none" stroke="#42d1a6" stroke-width="4" />

            <g v-for="(point, index) in trendPoints" :key="mock.trend.labels[index]">
              <circle :cx="point.x" :cy="point.y" r="6.2" fill="#ffffff" stroke="#42d1a6" stroke-width="4" />
            </g>
          </svg>

          <div class="trend__tooltip" :style="{ left: `${(highlightPoint.x / 1128) * 100}%`, top: `${(highlightPoint.y / 336) * 100}%` }">
            {{ mock.trend.highlightValue }}
          </div>

          <div class="trend__x">
            <span v-for="label in mock.trend.labels" :key="label">{{ label }}</span>
          </div>
        </div>
      </div>

      <div class="trend__legend">
        <span class="trend__legend-dot"></span>
        <span>{{ mock.trend.legend }}</span>
      </div>
    </article>

    <section class="row row--bottom">
      <article class="panel">
        <header class="panel__head">
          <span class="panel__accent"></span>
          <h2>支付榜TOP5商品排行</h2>
        </header>

        <div class="table">
          <div class="table__head table__head--product">
            <span>序号</span>
            <span>商品信息</span>
            <span>支付订单数</span>
          </div>

          <div v-for="item in mock.productRanking" :key="item.rank" class="table__row table__row--product">
            <span class="table__rank">{{ item.rank }}</span>
            <div class="table__product">
              <img :src="mock.productImage" alt="商品图片" />
              <strong>{{ item.title }}</strong>
            </div>
            <span class="table__number">{{ item.orders }}</span>
          </div>
        </div>
      </article>

      <article class="panel">
        <header class="panel__head">
          <span class="panel__accent"></span>
          <h2>服务人员业绩TOP5排行</h2>
        </header>

        <div class="table">
          <div class="table__head table__head--staff">
            <span>序号</span>
            <span>个人信息</span>
            <span>服务类型</span>
            <span>服务工单数</span>
          </div>

          <div v-for="item in mock.staffRanking" :key="item.rank" class="table__row table__row--staff">
            <span class="table__rank">{{ item.rank }}</span>
            <div class="table__staff">
              <img :src="mock.staffAvatar" alt="人员头像" />
              <strong>{{ item.name }}</strong>
            </div>
            <span class="table__type">{{ item.category }}</span>
            <span class="table__number">{{ item.orders }}</span>
          </div>
        </div>
      </article>
    </section>

    <footer class="overview__footer">Copyright © DaisyAxure All Rights Reserved</footer>
  </section>
</template>

<style scoped>
.overview {
  display: grid;
  gap: 30px;
  font-family: "PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.overview__greeting {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #313c49;
}

.overview__emoji {
  font-size: 24px;
}

.overview__greeting h1 {
  margin: 0;
  font-size: 18px;
  font-weight: 500;
  letter-spacing: 0.01em;
}

.metrics,
.row {
  display: grid;
  gap: 26px;
}

.metrics {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.row--middle {
  grid-template-columns: 0.96fr 0.97fr 0.97fr;
}

.row--bottom {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.metric,
.panel {
  border-radius: 16px;
  background: #ffffff;
  box-shadow: 0 6px 20px rgba(59, 103, 82, 0.05);
}

.metric {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 124px;
  align-items: center;
  gap: 10px;
  min-height: 146px;
  padding: 18px 18px 16px;
}

.metric__main {
  min-width: 0;
}

.metric__label {
  margin: 0;
  color: #b0bac4;
  font-size: 12px;
  font-weight: 400;
  letter-spacing: 0.01em;
  white-space: nowrap;
}

.metric__value {
  display: block;
  margin-top: 8px;
  color: #313844;
  font-size: 28px;
  font-weight: 600;
  line-height: 1;
  white-space: nowrap;
}

.metric__delta {
  display: inline-flex;
  gap: 6px;
  margin-top: 10px;
  padding: 5px 9px;
  border-radius: 8px;
  background: #f7f7f7;
  color: #a3aab1;
  font-size: 11px;
  font-weight: 400;
  letter-spacing: 0.01em;
  line-height: 1;
  white-space: nowrap;
}

.metric__delta-value--positive {
  color: #10c89a;
}

.metric__delta-value--negative {
  color: #ff7b75;
}

.metric__chart {
  width: 110px;
  height: 60px;
  justify-self: end;
  margin-right: -10px;
}

.metric__chart svg {
  width: 100%;
  height: 100%;
}

.panel {
  padding: 28px;
}

.panel--quick {
  min-height: 312px;
  padding: 20px 18px 18px;
}

.panel--trend {
  min-height: 470px;
  padding-bottom: 24px;
}

.panel__head {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 28px;
}

.panel__accent {
  width: 8px;
  height: 30px;
  border-radius: 999px;
  background: #10c89a;
}

.panel__head h2 {
  margin: 0;
  color: #2f3946;
  font-size: 16px;
  font-weight: 500;
  letter-spacing: 0.01em;
}

.row--middle > .panel {
  min-height: 312px;
  padding: 20px 18px 18px;
}

.row--middle .panel__head {
  gap: 10px;
  margin-bottom: 18px;
}

.row--middle .panel__accent {
  width: 6px;
  height: 22px;
}

.row--middle .panel__head h2 {
  font-size: 15px;
  font-weight: 500;
  letter-spacing: 0.01em;
}

.quick-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px 6px;
  padding-top: 0;
}

.quick-grid__item {
  display: grid;
  justify-items: center;
  gap: 7px;
  padding: 0;
  border: 0;
  background: transparent;
  color: #313b48;
}

.quick-grid__icon {
  display: grid;
  place-items: center;
  width: 56px;
  height: 56px;
  border-radius: 50%;
}

.quick-grid__icon svg {
  width: 28px;
  height: 28px;
}

.quick-grid__icon--mint {
  background: rgba(16, 200, 154, 0.16);
  color: #10c89a;
}

.quick-grid__icon--amber {
  background: rgba(255, 216, 106, 0.2);
  color: #ffc94f;
}

.quick-grid__icon--rose {
  background: rgba(255, 123, 117, 0.18);
  color: #ff7b75;
}

.quick-grid__icon--violet {
  background: rgba(104, 112, 245, 0.18);
  color: #6870f5;
}

.quick-grid__icon--blue {
  background: rgba(81, 143, 255, 0.18);
  color: #528eff;
}

.quick-grid__icon--teal {
  background: rgba(66, 209, 166, 0.18);
  color: #42d1a6;
}

.quick-grid__icon--yellow {
  background: rgba(255, 213, 87, 0.18);
  color: #ffc94f;
}

.quick-grid__icon--salmon {
  background: rgba(255, 111, 106, 0.18);
  color: #ff6f6a;
}

.quick-grid__label {
  font-size: 13px;
  font-weight: 400;
  line-height: 1.2;
  letter-spacing: 0.01em;
  white-space: nowrap;
}

.bars {
  display: grid;
  gap: 18px;
  padding-top: 2px;
}

.bars__item {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
}

.bars__label,
.bars__value {
  color: #778594;
  font-size: 13px;
  font-weight: 400;
  line-height: 1.2;
  letter-spacing: 0.01em;
}

.bars__track {
  position: relative;
  height: 6px;
  border-radius: 999px;
  background: #d9f5ed;
}

.bars__fill {
  position: absolute;
  inset: 0 auto 0 0;
  border-radius: inherit;
  background: #10c89a;
}

.pie-card {
  display: grid;
  grid-template-columns: 188px minmax(0, 1fr);
  align-items: center;
  gap: 14px;
  min-height: 234px;
}

.pie-card__chart {
  width: 176px;
  height: 176px;
  border-radius: 50%;
  justify-self: center;
}

.pie-card__legend {
  display: grid;
  gap: 14px;
}

.pie-card__legend-item {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 10px;
  color: #6f7d8b;
  font-size: 13px;
  font-weight: 400;
  line-height: 1.2;
  letter-spacing: 0.01em;
}

.pie-card__dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.pie-card__legend-value {
  color: #3d4653;
  font-weight: 500;
}

.trend {
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr);
  gap: 18px;
}

.trend__y {
  display: grid;
  align-content: start;
  gap: 47px;
  padding-top: 42px;
  color: #9aa7b4;
  font-size: 12px;
  font-weight: 400;
  letter-spacing: 0.01em;
}

.trend__canvas {
  position: relative;
}

.trend__canvas svg {
  width: 100%;
  height: 336px;
}

.trend__x {
  display: flex;
  justify-content: space-between;
  padding: 12px 20px 0 54px;
  color: #9aa7b4;
  font-size: 12px;
  font-weight: 400;
  letter-spacing: 0.01em;
}

.trend__tooltip {
  position: absolute;
  transform: translate(-50%, 12px);
  padding: 7px 14px;
  border-radius: 8px;
  background: #ffffff;
  color: #313844;
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 0.01em;
  box-shadow: 0 8px 18px rgba(80, 104, 91, 0.1);
}

.trend__legend {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-top: 8px;
  color: #788594;
  font-size: 13px;
  font-weight: 400;
  letter-spacing: 0.01em;
}

.trend__legend-dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #10c89a;
}

.table {
  overflow: hidden;
  border: 1px solid #eef2f0;
  border-radius: 16px;
}

.table__head,
.table__row {
  display: grid;
  align-items: center;
}

.table__head {
  min-height: 66px;
  padding: 0 16px;
  background: #fafafa;
  color: #313b48;
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.01em;
}

.table__head--product,
.table__row--product {
  grid-template-columns: 70px minmax(0, 1fr) 150px;
}

.table__head--staff,
.table__row--staff {
  grid-template-columns: 70px minmax(0, 1.15fr) 1fr 148px;
}

.table__row {
  min-height: 92px;
  padding: 0 16px;
  border-top: 1px solid #f0f2f1;
  background: #ffffff;
  font-size: 13px;
  font-weight: 400;
  letter-spacing: 0.01em;
}

.table__rank {
  color: #ffc33d;
  font-size: 16px;
  font-weight: 500;
  text-align: center;
}

.table__product,
.table__staff {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
}

.table__product img {
  width: 88px;
  height: 58px;
  border-radius: 16px;
  object-fit: cover;
}

.table__staff img {
  width: 58px;
  height: 58px;
  border-radius: 50%;
  object-fit: cover;
}

.table__product strong,
.table__staff strong {
  color: #313b48;
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 0.01em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.table__type,
.table__number {
  color: #3d4653;
  font-size: 14px;
  font-weight: 400;
  letter-spacing: 0.01em;
}

.overview__footer {
  padding-bottom: 6px;
  color: #c4cbc8;
  font-size: 12px;
  font-weight: 400;
  letter-spacing: 0.01em;
  text-align: center;
}

@media (max-width: 1380px) {
  .metrics {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .row--middle,
  .row--bottom {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 1200px) {
  .quick-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .pie-card {
    grid-template-columns: 1fr;
    justify-items: center;
  }

  .trend {
    grid-template-columns: 1fr;
  }

  .trend__y {
    display: none;
  }
}

@media (max-width: 720px) {
  .metrics {
    grid-template-columns: 1fr;
  }

  .metric {
    grid-template-columns: 1fr;
  }

  .table__head,
  .table__row {
    padding: 0 10px;
  }

  .table__head--product,
  .table__row--product {
    grid-template-columns: 52px minmax(0, 1fr) 90px;
  }

  .table__head--staff,
  .table__row--staff {
    grid-template-columns: 52px minmax(0, 1fr) 0.9fr 90px;
  }

  .table__product img {
    width: 62px;
    height: 42px;
  }

  .table__staff img {
    width: 42px;
    height: 42px;
  }
}
</style>
