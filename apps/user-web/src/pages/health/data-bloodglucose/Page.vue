<script setup lang="ts">
import { computed, ref } from "vue";
import type { PageComponentProps } from "@ihc/page-core/types";
import mock from "./mock";

type ChartMode = "day" | "week" | "month";
type BloodGlucoseRecord = {
  date: string;
  fasting: number;
  postMealPeak: number;
  bloodSugar: number;
};
type TimelinePoint = {
  time: string;
  value: number;
};
type TimelineEntry = {
  date: string;
  items: TimelinePoint[];
};
type RangeItem = {
  label: string;
  min: number;
  max: number;
  avg: number;
};

const props = defineProps<PageComponentProps>();
const selectedChartMode = ref<ChartMode>("day");

const healthList = computed<BloodGlucoseRecord[] | null>(() => {
  if (mock && Array.isArray(mock.list) && mock.list.length > 0) {
    return mock.list as BloodGlucoseRecord[];
  }
  return null;
});

const bloodGlucoseData = computed(() => healthList.value ?? []);
const timelineEntries = computed<TimelineEntry[]>(() => (mock.dailyTimeline ?? []) as TimelineEntry[]);

const latest = computed(
  () =>
    bloodGlucoseData.value[bloodGlucoseData.value.length - 1] ?? {
      date: "",
      fasting: 0,
      postMealPeak: 0,
      bloodSugar: 0,
    }
);

const previous = computed(() => bloodGlucoseData.value[bloodGlucoseData.value.length - 2] ?? latest.value);

const latestTimeline = computed<TimelinePoint[]>(() => {
  const entry = timelineEntries.value.find((item) => item.date === latest.value.date);
  return entry?.items ?? [];
});

const weekRangeItems = computed<RangeItem[]>(() =>
  timelineEntries.value.map((entry) => {
    const values = entry.items.map((item) => item.value);
    const total = values.reduce((sum, value) => sum + value, 0);
    return {
      label: entry.date.slice(5).replace("-", "/"),
      min: Math.min(...values),
      max: Math.max(...values),
      avg: Number((total / Math.max(values.length, 1)).toFixed(1)),
    };
  })
);

const monthRangeItems = computed<RangeItem[]>(() =>
  (mock.monthlyData ?? []).map((item: { label: string; min: number; max: number; avg: number }) => ({
    label: item.label,
    min: Number(item.min),
    max: Number(item.max),
    avg: Number(item.avg),
  }))
);

const averageBloodGlucose = computed(() => {
  if (!bloodGlucoseData.value.length) return 0;
  const total = bloodGlucoseData.value.reduce((sum, item) => sum + item.bloodSugar, 0);
  return Number((total / bloodGlucoseData.value.length).toFixed(1));
});

const change = computed(() => Number((latest.value.bloodSugar - previous.value.bloodSugar).toFixed(1)));
const fastingAverage = computed(() => {
  if (!bloodGlucoseData.value.length) return 0;
  const total = bloodGlucoseData.value.reduce((sum, item) => sum + item.fasting, 0);
  return Number((total / bloodGlucoseData.value.length).toFixed(1));
});
const peakAverage = computed(() => {
  if (!bloodGlucoseData.value.length) return 0;
  const total = bloodGlucoseData.value.reduce((sum, item) => sum + item.postMealPeak, 0);
  return Number((total / bloodGlucoseData.value.length).toFixed(1));
});

function formatValue(value: number) {
  if (Number.isInteger(value)) return `${value}`;
  return value.toFixed(1);
}

function buildSmoothPath(points: { x: number; y: number }[]) {
  if (!points.length) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  const smoothing = 0.18;
  const line = (a: { x: number; y: number }, b: { x: number; y: number }) => ({
    length: Math.hypot(b.x - a.x, b.y - a.y),
    angle: Math.atan2(b.y - a.y, b.x - a.x),
  });
  const control = (
    current: { x: number; y: number },
    previousPoint?: { x: number; y: number },
    nextPoint?: { x: number; y: number },
    reverse = false
  ) => {
    const previousValue = previousPoint ?? current;
    const nextValue = nextPoint ?? current;
    const lineData = line(previousValue, nextValue);
    const angle = lineData.angle + (reverse ? Math.PI : 0);
    const length = lineData.length * smoothing;

    return {
      x: current.x + Math.cos(angle) * length,
      y: current.y + Math.sin(angle) * length,
    };
  };

  return points.reduce((path, point, index) => {
    if (index === 0) return `M ${point.x} ${point.y}`;
    const startControl = control(points[index - 1], points[index - 2], point);
    const endControl = control(point, points[index - 1], points[index + 1], true);
    return `${path} C ${startControl.x} ${startControl.y}, ${endControl.x} ${endControl.y}, ${point.x} ${point.y}`;
  }, "");
}

function getAxisBounds(values: number[]) {
  if (!values.length) {
    return { min: 0, max: 1 };
  }

  const min = Math.floor((Math.min(...values) - 0.4) * 2) / 2;
  const max = Math.ceil((Math.max(...values) + 0.4) * 2) / 2;

  return {
    min,
    max: max === min ? min + 1 : max,
  };
}

function createDotChart(items: TimelinePoint[], width = 320, height = 220) {
  const paddingLeft = 28;
  const paddingRight = 10;
  const paddingTop = 14;
  const paddingBottom = 28;
  const innerWidth = width - paddingLeft - paddingRight;
  const innerHeight = height - paddingTop - paddingBottom;
  const values = items.map((item) => item.value);
  const bounds = getAxisBounds(values);
  const range = bounds.max - bounds.min || 1;

  const points = items.map((item, index) => ({
    x: paddingLeft + (index * innerWidth) / Math.max(items.length - 1, 1),
    y: paddingTop + (1 - (item.value - bounds.min) / range) * innerHeight,
    value: item.value,
  }));

  return {
    width,
    height,
    paddingLeft,
    paddingRight,
    paddingBottom,
    yLines: [0, 0.25, 0.5, 0.75, 1].map((ratio) => paddingTop + innerHeight * ratio),
    yLabels: [0, 1, 2, 3, 4].map((index) => Number((bounds.max - ((bounds.max - bounds.min) / 4) * index).toFixed(1))),
    points,
    linePath: buildSmoothPath(points),
  };
}

function createRangeChart(items: RangeItem[], width = 320, height = 220) {
  const paddingLeft = 24;
  const paddingRight = 10;
  const paddingTop = 12;
  const paddingBottom = 30;
  const innerWidth = width - paddingLeft - paddingRight;
  const innerHeight = height - paddingTop - paddingBottom;
  const values = items.flatMap((item) => [item.min, item.max, item.avg]);
  const bounds = getAxisBounds(values);
  const range = bounds.max - bounds.min || 1;
  const trackWidth = Math.min(18, Math.max(14, innerWidth / Math.max(items.length * 2.8, 1)));
  const gap = items.length > 1 ? (innerWidth - trackWidth * items.length) / (items.length - 1) : 0;

  return {
    width,
    height,
    paddingLeft,
    paddingRight,
    paddingBottom,
    yLines: [0, 0.25, 0.5, 0.75, 1].map((ratio) => paddingTop + innerHeight * ratio),
    yLabels: [0, 1, 2, 3, 4].map((index) => Number((bounds.max - ((bounds.max - bounds.min) / 4) * index).toFixed(1))),
    bars: items.map((item, index) => {
      const x = paddingLeft + index * (trackWidth + gap) + trackWidth / 2;
      const maxY = paddingTop + (1 - (item.max - bounds.min) / range) * innerHeight;
      const minY = paddingTop + (1 - (item.min - bounds.min) / range) * innerHeight;
      const avgY = paddingTop + (1 - (item.avg - bounds.min) / range) * innerHeight;
      return {
        x,
        trackWidth,
        maxY,
        minY,
        avgY,
        max: item.max,
        min: item.min,
        avg: item.avg,
      };
    }),
  };
}

const dayChart = computed(() => createDotChart(latestTimeline.value));
const weekChart = computed(() => createRangeChart(weekRangeItems.value));
const monthChart = computed(() => createRangeChart(monthRangeItems.value));

const dayLabelStyle = computed(() => ({
  gridTemplateColumns: `repeat(${Math.max(latestTimeline.value.length, 1)}, minmax(0, 1fr))`,
}));
const weekLabelStyle = computed(() => ({
  gridTemplateColumns: `repeat(${Math.max(weekRangeItems.value.length, 1)}, minmax(0, 1fr))`,
}));
const monthLabelStyle = computed(() => ({
  gridTemplateColumns: `repeat(${Math.max(monthRangeItems.value.length, 1)}, minmax(0, 1fr))`,
}));

const chartTitle = computed(() => {
  if (selectedChartMode.value === "day") return "今日血糖趋势";
  if (selectedChartMode.value === "week") return "近 7 天血糖趋势";
  return "本月每周血糖趋势";
});

const chartSummary = computed(() => {
  if (selectedChartMode.value === "day") {
    const values = latestTimeline.value.map((item) => item.value);
    const total = values.reduce((sum, value) => sum + value, 0);
    const maxValue = Math.max(...values);
    const minValue = Math.min(...values);
    const maxItem = latestTimeline.value.find((item) => item.value === maxValue);
    const minItem = latestTimeline.value.find((item) => item.value === minValue);

    return {
      highestValue: maxValue,
      highestLabel: maxItem?.time ?? "--",
      lowestValue: minValue,
      lowestLabel: minItem?.time ?? "--",
      averageValue: Number((total / Math.max(values.length, 1)).toFixed(1)),
      averageLabel: latest.value.date,
    };
  }

  const source = selectedChartMode.value === "week" ? weekRangeItems.value : monthRangeItems.value;
  const maxItem = source.reduce((result, item) => (item.max > result.max ? item : result), source[0]);
  const minItem = source.reduce((result, item) => (item.min < result.min ? item : result), source[0]);
  const averageValue = Number(
    (
      source.reduce((sum, item) => sum + item.avg, 0) /
      Math.max(source.length, 1)
    ).toFixed(1)
  );

  return {
    highestValue: maxItem?.max ?? 0,
    highestLabel: maxItem?.label ?? "--",
    lowestValue: minItem?.min ?? 0,
    lowestLabel: minItem?.label ?? "--",
    averageValue,
    averageLabel: selectedChartMode.value === "week" ? "近 7 天" : "本月",
  };
});

function getStatusText(min: number, max: number) {
  if (min < 3.9 || max > 7.8) return "需要关注";
  return "状态正常";
}

function getStatusClass(status: string) {
  return status === "状态正常" ? "status-pill status-pill--normal" : "status-pill status-pill--alert";
}

function formatChange(index: number) {
  if (index === 0) return "—";
  const diff = Number((bloodGlucoseData.value[index].bloodSugar - bloodGlucoseData.value[index - 1].bloodSugar).toFixed(1));
  if (diff === 0) return "持平";
  return `${diff > 0 ? "+" : ""}${formatValue(diff)} mmol/L`;
}

function getChangeClass(index: number) {
  if (index === 0) return "";
  const diff = bloodGlucoseData.value[index].bloodSugar - bloodGlucoseData.value[index - 1].bloodSugar;
  if (diff > 0) return "positive";
  if (diff < 0) return "negative";
  return "";
}

function goBack() {
  if (props.navigation?.navigateTo) {
    props.navigation.navigateTo("health/health-data");
  } else {
    window.history.back();
  }
}

function goToAddData() {
  sessionStorage.setItem("addMetric", "bloodSugar");
  sessionStorage.setItem("addReturnPath", "health/data-bloodglucose");
  props.navigation?.navigateTo?.("health/add-data");
}
</script>

<template>
  <section class="health-data-page">
    <header class="medication-nav">
      <button class="back-btn" type="button" aria-label="返回" @click="goBack">
        <span class="back-arrow" aria-hidden="true"></span>
      </button>
      <h1>{{ props.pageEntry?.title || "血糖详情" }}</h1>
    </header>

    <main class="medication-scroll">
      <template v-if="healthList">
        <section class="latest-small-card">
          <div class="latest-card-main">
            <div>
              <h2 class="small-card-label">最新记录</h2>
              <strong>{{ formatValue(latest.bloodSugar) }} mmol/L</strong>
              <p class="small-card-date">{{ latest.date }}</p>
            </div>
            <div class="latest-card-summary">
              <span>平均血糖</span>
              <strong>{{ formatValue(averageBloodGlucose) }}</strong>
              <p>{{ change >= 0 ? `较前一日增加 ${formatValue(change)} mmol/L` : `较前一日减少 ${formatValue(Math.abs(change))} mmol/L` }}</p>
            </div>
          </div>
        </section>

        <section class="metric-overview-card">
          <article class="overview-block">
            <span>当前血糖</span>
            <strong>{{ formatValue(latest.bloodSugar) }}<small>mmol/L</small></strong>
          </article>
          <article class="overview-block">
            <span>目标范围</span>
            <strong>3.9-7.8<small>mmol/L</small></strong>
          </article>
          <article class="overview-block">
            <span>7 天空腹均值</span>
            <strong>{{ formatValue(fastingAverage) }}<small>mmol/L</small></strong>
          </article>
          <article class="overview-block">
            <span>7 天峰值均值</span>
            <strong>{{ formatValue(peakAverage) }}<small>mmol/L</small></strong>
          </article>
        </section>

        <section class="chart-card large">
          <div class="chart-card__header">
            <div>
              <h2>{{ chartTitle }}</h2>
              <p>建议空腹 3.9-6.1 mmol/L，餐后峰值不高于 7.8 mmol/L</p>
            </div>
          </div>

          <div class="chart-card__toolbar">
            <div class="chart-switch chart-switch--wide">
              <button type="button" :class="{ active: selectedChartMode === 'day' }" @click="selectedChartMode = 'day'">日</button>
              <button type="button" :class="{ active: selectedChartMode === 'week' }" @click="selectedChartMode = 'week'">周</button>
              <button type="button" :class="{ active: selectedChartMode === 'month' }" @click="selectedChartMode = 'month'">月</button>
            </div>
          </div>

          <template v-if="selectedChartMode === 'day'">
            <div class="chart-card__chart">
              <svg class="main-chart" :viewBox="'0 0 ' + dayChart.width + ' ' + dayChart.height" preserveAspectRatio="none">
                <g class="chart-grid">
                  <line
                    v-for="(lineY, index) in dayChart.yLines"
                    :key="`day-line-${index}`"
                    :x1="dayChart.paddingLeft"
                    :y1="lineY"
                    :x2="dayChart.width - dayChart.paddingRight"
                    :y2="lineY"
                  />
                </g>
                <path
                  v-if="dayChart.linePath"
                  :d="dayChart.linePath"
                  fill="none"
                  stroke="#6a73f7"
                  stroke-width="4"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <g v-for="(point, index) in dayChart.points" :key="`day-point-${index}`">
                  <circle :cx="point.x" :cy="point.y" r="5.5" fill="#ffffff" stroke="#6a73f7" stroke-width="3" />
                  <text :x="point.x" :y="point.y - 12" class="point-value" text-anchor="middle">{{ formatValue(point.value) }}</text>
                </g>
              </svg>
              <div class="chart-axis-left">
                <span v-for="label in dayChart.yLabels" :key="`day-axis-${label}`">{{ label }}</span>
              </div>
            </div>
            <div class="chart-card__labels" :style="dayLabelStyle">
              <span v-for="item in latestTimeline" :key="item.time">{{ item.time }}</span>
            </div>
          </template>

          <template v-else-if="selectedChartMode === 'week'">
            <div class="chart-card__chart">
              <svg class="main-chart" :viewBox="'0 0 ' + weekChart.width + ' ' + weekChart.height" preserveAspectRatio="none">
                <g class="chart-grid">
                  <line
                    v-for="(lineY, index) in weekChart.yLines"
                    :key="`week-line-${index}`"
                    :x1="weekChart.paddingLeft"
                    :y1="lineY"
                    :x2="weekChart.width - weekChart.paddingRight"
                    :y2="lineY"
                  />
                </g>
                <g v-for="(bar, index) in weekChart.bars" :key="`week-bar-${index}`">
                  <line :x1="bar.x" :y1="bar.maxY" :x2="bar.x" :y2="bar.minY" class="range-line" />
                  <circle :cx="bar.x" :cy="bar.maxY" r="4.5" class="range-cap" />
                  <circle :cx="bar.x" :cy="bar.minY" r="4.5" class="range-cap" />
                  <circle :cx="bar.x" :cy="bar.avgY" r="6" class="range-average" />
                </g>
              </svg>
              <div class="chart-axis-left">
                <span v-for="label in weekChart.yLabels" :key="`week-axis-${label}`">{{ label }}</span>
              </div>
            </div>
            <div class="chart-card__labels" :style="weekLabelStyle">
              <span v-for="item in weekRangeItems" :key="item.label">{{ item.label }}</span>
            </div>
          </template>

          <template v-else>
            <div class="chart-card__chart">
              <svg class="main-chart" :viewBox="'0 0 ' + monthChart.width + ' ' + monthChart.height" preserveAspectRatio="none">
                <g class="chart-grid">
                  <line
                    v-for="(lineY, index) in monthChart.yLines"
                    :key="`month-line-${index}`"
                    :x1="monthChart.paddingLeft"
                    :y1="lineY"
                    :x2="monthChart.width - monthChart.paddingRight"
                    :y2="lineY"
                  />
                </g>
                <g v-for="(bar, index) in monthChart.bars" :key="`month-bar-${index}`">
                  <line :x1="bar.x" :y1="bar.maxY" :x2="bar.x" :y2="bar.minY" class="range-line" />
                  <circle :cx="bar.x" :cy="bar.maxY" r="4.5" class="range-cap" />
                  <circle :cx="bar.x" :cy="bar.minY" r="4.5" class="range-cap" />
                  <circle :cx="bar.x" :cy="bar.avgY" r="6" class="range-average" />
                </g>
              </svg>
              <div class="chart-axis-left">
                <span v-for="label in monthChart.yLabels" :key="`month-axis-${label}`">{{ label }}</span>
              </div>
            </div>
            <div class="chart-card__labels" :style="monthLabelStyle">
              <span v-for="item in monthRangeItems" :key="item.label">{{ item.label }}</span>
            </div>
          </template>

          <div class="summary-strip">
            <article class="summary-block">
              <span>最高血糖</span>
              <strong>{{ formatValue(chartSummary.highestValue) }}</strong>
              <small>{{ chartSummary.highestLabel }}</small>
            </article>
            <article class="summary-block">
              <span>最低血糖</span>
              <strong>{{ formatValue(chartSummary.lowestValue) }}</strong>
              <small>{{ chartSummary.lowestLabel }}</small>
            </article>
            <article class="summary-block">
              <span>平均血糖</span>
              <strong>{{ formatValue(chartSummary.averageValue) }}</strong>
              <small>{{ chartSummary.averageLabel }}</small>
            </article>
          </div>
        </section>

        <section class="detail-table-card">
          <div class="detail-card__header">
            <div>
              <h2>每日血糖明细</h2>
            </div>
          </div>
          <div class="table-wrapper">
            <table class="metric-table">
              <thead>
                <tr>
                  <th>日期</th>
                  <th>日均血糖</th>
                  <th>较前一日变化</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(item, index) in bloodGlucoseData" :key="item.date">
                  <td>{{ item.date }}</td>
                  <td>{{ formatValue(item.bloodSugar) }} mmol/L</td>
                  <td :class="getChangeClass(index)">{{ formatChange(index) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </template>

      <div v-else class="error-card">
        <strong>数据加载失败</strong>
        <p>请检查 `mock.ts` 文件，确认已导出有效的 `list` 数据。</p>
      </div>

      <footer class="add-area">
        <button class="add-btn" type="button" @click="goToAddData">+ 添加血糖记录</button>
      </footer>
    </main>
  </section>
</template>

<style scoped>
.health-data-page {
  position: relative;
  left: 50%;
  width: min(390px, 100vw);
  height: min(844px, calc(100vh - 36px));
  min-height: min(844px, calc(100vh - 36px));
  max-height: 844px;
  margin: -18px 0;
  overflow: hidden;
  background:
    radial-gradient(circle at 82% 8%, rgba(102, 112, 240, 0.13) 0, rgba(102, 112, 240, 0) 28%),
    linear-gradient(180deg, #f1f8ff 0%, #f7f9fb 42%, #f5f6f7 100%);
  color: #30343f;
  font-family: "HarmonyOS Sans SC", "MiSans", "Source Han Sans SC", "Noto Sans SC", "PingFang SC", "Microsoft YaHei UI", sans-serif;
  transform: translateX(-50%);
  -webkit-font-smoothing: antialiased;
}

.medication-nav {
  display: flex;
  align-items: center;
  height: 74px;
  padding: 0 29px;
}

.back-btn {
  display: grid;
  place-items: center;
  width: 30px;
  height: 44px;
  padding: 0;
  border: 0;
  background: transparent;
}

.back-arrow {
  width: 14px;
  height: 14px;
  border-bottom: 4px solid #333333;
  border-left: 4px solid #333333;
  transform: rotate(45deg);
}

.medication-nav h1 {
  margin: 0 0 0 9px;
  color: #30343f;
  font-size: 24px;
  font-weight: 500;
  letter-spacing: 0.03em;
}

.medication-scroll {
  display: grid;
  row-gap: 18px;
  height: calc(100% - 74px);
  padding: 24px 29px 116px;
  overflow-y: auto;
  scrollbar-width: none;
}

.medication-scroll::-webkit-scrollbar {
  display: none;
}

.chart-card,
.detail-table-card,
.error-card,
.metric-overview-card {
  background: rgba(255, 255, 255, 0.94);
  border-radius: 20px;
  box-shadow: 0 15px 34px rgba(72, 104, 148, 0.075);
}

.latest-small-card {
  position: relative;
  overflow: hidden;
  min-height: 156px;
  padding: 16px 16px 16px 18px;
  border: 1px solid rgba(255, 255, 255, 0.72);
  border-radius: 22px;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.96) 0%, rgba(239, 246, 255, 0.92) 48%, rgba(226, 252, 244, 0.88) 100%);
  box-shadow: 0 18px 42px rgba(72, 104, 148, 0.1);
}

.latest-small-card::after {
  position: absolute;
  right: -22px;
  bottom: -25px;
  width: 106px;
  height: 106px;
  content: "";
  border-radius: 50%;
  background: rgba(102, 112, 240, 0.08);
}

.latest-card-main {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 124px;
  gap: 12px;
  align-items: center;
}

.latest-card-main > div:first-child {
  display: grid;
  align-content: center;
  min-width: 0;
}

.small-card-label {
  display: block;
  margin: 0 0 4px;
  color: #8e8f94;
  font-size: 17px;
  font-weight: 500;
  letter-spacing: 0.03em;
  line-height: 1.25;
}

.latest-small-card strong,
.latest-card-summary strong {
  display: block;
  margin-bottom: 4px;
  font-size: 28px;
  font-weight: 700;
  line-height: 1.08;
}

.latest-card-summary {
  box-sizing: border-box;
  width: 124px;
  min-width: 0;
  aspect-ratio: 1;
  padding: 12px 14px;
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.84);
  background: linear-gradient(180deg, #ffffff 0%, #f4f8ff 100%);
  box-shadow: 0 8px 18px rgba(54, 67, 92, 0.06);
  display: grid;
  align-content: center;
  gap: 6px;
}

.latest-card-summary span {
  color: #8e8f94;
  font-size: 13px;
  font-weight: 500;
}

.latest-card-summary p {
  margin: 0;
  color: #8e8f94;
  font-size: 12px;
  line-height: 1.35;
}

.small-card-date {
  margin: 0;
  color: #b7b7bb;
  font-size: 15px;
  font-weight: 500;
}

.metric-overview-card {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  overflow: hidden;
}

.overview-block {
  padding: 15px 14px;
  border-right: 1px solid #eef2f8;
  border-bottom: 1px solid #eef2f8;
}

.overview-block:nth-child(2n) {
  border-right: 0;
}

.overview-block:nth-last-child(-n + 2) {
  border-bottom: 0;
}

.overview-block span {
  display: block;
  margin-bottom: 10px;
  color: #a3aab7;
  font-size: 13px;
}

.overview-block strong {
  display: flex;
  align-items: baseline;
  gap: 2px;
  color: #30343f;
  font-size: 20px;
  font-weight: 700;
  line-height: 1.15;
}

.overview-block small {
  font-size: 11px;
  color: #8b95a5;
}

.chart-card {
  padding: 20px;
}

.chart-card.large {
  padding-bottom: 18px;
}

.chart-card__header {
  margin-bottom: 12px;
}

.chart-card__header h2 {
  margin: 0;
  font-size: 21px;
  font-weight: 600;
}

.chart-card__header p {
  margin: 6px 0 0;
  color: #9aa4b7;
  font-size: 13px;
  line-height: 1.45;
}

.chart-card__toolbar {
  display: flex;
  justify-content: center;
  margin-bottom: 14px;
}

.chart-switch {
  display: flex;
  gap: 6px;
  padding: 4px;
  border-radius: 20px;
  background: rgba(0, 0, 0, 0.04);
}

.chart-switch--wide {
  width: 100%;
}

.chart-switch--wide button {
  flex: 1 1 0;
}

.chart-switch button {
  min-width: 48px;
  padding: 8px 10px;
  border: none;
  border-radius: 16px;
  background: transparent;
  color: #5a6474;
  font-size: 15px;
  font-weight: 500;
}

.chart-switch button.active {
  background: #ffffff;
  color: #5766ff;
  box-shadow: 0 2px 10px rgba(69, 88, 129, 0.08);
}

.chart-card__chart {
  position: relative;
}

.main-chart {
  width: 100%;
  height: 220px;
  display: block;
}

.chart-grid line {
  stroke: rgba(125, 141, 176, 0.16);
  stroke-width: 1;
  stroke-dasharray: 4 4;
}

.chart-axis-left {
  position: absolute;
  top: 8px;
  left: 0;
  bottom: 28px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  color: #bcc5d1;
  font-size: 11px;
}

.point-value {
  fill: #6a73f7;
  font-size: 10px;
  font-weight: 600;
}

.range-line {
  stroke: rgba(102, 112, 240, 0.34);
  stroke-width: 10;
  stroke-linecap: round;
}

.range-cap {
  fill: #6a73f7;
}

.range-average {
  fill: #45d0ac;
  stroke: #ffffff;
  stroke-width: 3;
}

.chart-card__labels {
  display: grid;
  gap: 6px;
  padding-top: 8px;
  color: #b7b7bb;
  font-size: 12px;
}

.chart-card__labels span {
  text-align: center;
  white-space: nowrap;
}

.summary-strip {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-top: 16px;
}

.summary-block {
  padding: 14px 12px;
  border-radius: 16px;
  background: linear-gradient(180deg, #fbfcff 0%, #f5f7fc 100%);
  text-align: center;
}

.summary-block span {
  display: block;
  margin-bottom: 8px;
  color: #9aa4b7;
  font-size: 12px;
}

.summary-block strong {
  display: block;
  color: #30343f;
  font-size: 22px;
  font-weight: 700;
  line-height: 1.1;
}

.summary-block small {
  display: block;
  margin-top: 6px;
  color: #b7b7bb;
  font-size: 11px;
}

.detail-table-card {
  padding: 20px;
}

.detail-card__header {
  margin-bottom: 16px;
}

.detail-card__header h2 {
  margin: 0;
}

.table-wrapper {
  overflow-x: auto;
}

.metric-table {
  width: 100%;
  border-collapse: collapse;
}

.metric-table th,
.metric-table td {
  padding: 12px 8px;
  text-align: left;
  border-bottom: 1px solid #eef2f8;
  white-space: nowrap;
}

.metric-table th {
  font-weight: 600;
  color: #2b4469;
}

.metric-table td.positive {
  color: #2e7d32;
}

.metric-table td.negative {
  color: #c62828;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 72px;
  height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 600;
  line-height: 28px;
  text-align: center;
}

.status-pill--normal {
  background: #d7f5eb;
  color: #31c79b;
}

.status-pill--alert {
  background: #fff0f0;
  color: #f06969;
}

.error-card {
  padding: 40px;
  text-align: center;
  color: #c62828;
}

.error-card strong {
  display: block;
  margin-bottom: 8px;
  font-size: 20px;
}

.add-area {
  position: absolute;
  right: 29px;
  bottom: 26px;
  left: 29px;
}

.add-btn {
  width: 100%;
  height: 66px;
  border: 0;
  border-radius: 13px;
  background: #6670f0;
  box-shadow: 0 14px 28px rgba(102, 112, 240, 0.18);
  color: #ffffff;
  font-size: 24px;
  font-weight: 500;
  letter-spacing: 0.04em;
}

@media (max-width: 720px) {
  .chart-card__labels span {
    font-size: 10px;
  }
}

@media (max-width: 389px) {
  .latest-card-main {
    grid-template-columns: 1fr;
  }

  .summary-strip {
    grid-template-columns: 1fr;
  }

  .overview-block {
    border-right: 0;
    border-bottom: 1px solid #eef2f8;
  }

  .overview-block:last-child {
    border-bottom: 0;
  }
}
.health-data-page :is(.medication-nav h1, .chart-switch button, .small-card-label, .small-card-date, .latest-small-card strong, .latest-card-summary span, .latest-card-summary p, .metric-block span, .metric-block strong, .metric-block small, .detail-card__header h2, .metric-table th, .metric-table td, .steps-table th, .steps-table td) {
  white-space: nowrap;
}

.health-data-page :is(.medication-nav h1, .chart-switch button, .small-card-label, .small-card-date, .latest-small-card strong, .latest-card-summary span, .latest-card-summary p, .metric-block span, .metric-block strong, .metric-block small, .detail-card__header h2) {
  overflow: hidden;
  text-overflow: ellipsis;
}

.health-data-page :is(.table-wrapper) {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.health-data-page :is(.metric-table, .steps-table) {
  width: max-content;
  min-width: 100%;
}

.health-data-page :is(.metric-table th, .metric-table td, .steps-table th, .steps-table td) {
  padding-right: 6px;
  padding-left: 6px;
  font-size: 12px;
  word-break: keep-all;
  overflow-wrap: normal;
}
</style>
