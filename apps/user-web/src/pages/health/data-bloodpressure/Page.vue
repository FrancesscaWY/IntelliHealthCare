<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import type { PageComponentProps } from "@ihc/page-core/types";
import { loadBloodPressureSource } from "../measurement-source";

type ChartMode = "day" | "week" | "month";
type BloodPressureRecord = {
  date: string;
  systolic: number;
  diastolic: number;
  time?: string;
};
type DailyItem = {
  time: string;
  systolic: number;
  diastolic: number;
};
type DailyTimeline = {
  date: string;
  items: DailyItem[];
};
type PeriodItem = {
  label: string;
  systolic: number;
  diastolic: number;
  maxSystolic: number;
  minDiastolic: number;
};

const props = defineProps<PageComponentProps>();
const selectedChartMode = ref<ChartMode>("day");
const isLoading = ref(true);
const pageData = ref<Awaited<ReturnType<typeof loadBloodPressureSource>>>({
  list: [],
  dailyTimeline: [],
  monthlyData: []
});

const healthList = computed<BloodPressureRecord[] | null>(() => {
  if (pageData.value.list.length > 0) {
    return pageData.value.list as BloodPressureRecord[];
  }
  return null;
});

const bloodPressureData = computed(() => healthList.value ?? []);
const dailyTimelines = computed<DailyTimeline[]>(() => pageData.value.dailyTimeline as DailyTimeline[]);

const latest = computed(
  () =>
    bloodPressureData.value[bloodPressureData.value.length - 1] ?? {
      date: "",
      time: "",
      systolic: 0,
      diastolic: 0,
    }
);
const previous = computed(() => bloodPressureData.value[bloodPressureData.value.length - 2] ?? latest.value);

const averageSystolic = computed(() => {
  if (!bloodPressureData.value.length) return 0;
  const total = bloodPressureData.value.reduce((sum, item) => sum + item.systolic, 0);
  return Math.round(total / bloodPressureData.value.length);
});
const averageDiastolic = computed(() => {
  if (!bloodPressureData.value.length) return 0;
  const total = bloodPressureData.value.reduce((sum, item) => sum + item.diastolic, 0);
  return Math.round(total / bloodPressureData.value.length);
});

const latestTimeline = computed<DailyItem[]>(() => {
  const entry = dailyTimelines.value.find((item) => item.date === latest.value.date);
  return entry?.items ?? [];
});

const weekItems = computed<PeriodItem[]>(() =>
  bloodPressureData.value.map((item) => ({
    label: item.date.slice(5).replace("-", "/"),
    systolic: item.systolic,
    diastolic: item.diastolic,
    maxSystolic: item.systolic,
    minDiastolic: item.diastolic,
  }))
);

const monthItems = computed<PeriodItem[]>(() =>
  pageData.value.monthlyData.map(
    (item: { label: string; systolic: number; diastolic: number; maxSystolic: number; minDiastolic: number }) => ({
      label: item.label,
      systolic: Number(item.systolic),
      diastolic: Number(item.diastolic),
      maxSystolic: Number(item.maxSystolic),
      minDiastolic: Number(item.minDiastolic),
    })
  )
);

const maxSystolic = computed(() => Math.max(...bloodPressureData.value.map((item) => item.systolic), 0));
const minSystolic = computed(() => Math.min(...bloodPressureData.value.map((item) => item.systolic), Infinity));
const maxDiastolic = computed(() => Math.max(...bloodPressureData.value.map((item) => item.diastolic), 0));
const minDiastolic = computed(() => Math.min(...bloodPressureData.value.map((item) => item.diastolic), Infinity));

const changeSystolic = computed(() => latest.value.systolic - previous.value.systolic);
const changeDiastolic = computed(() => latest.value.diastolic - previous.value.diastolic);

function getPressureStatus(systolic: number, diastolic: number) {
  if (systolic >= 140 || diastolic >= 90) return "偏高";
  if (systolic < 90 || diastolic < 60) return "偏低";
  return "正常";
}

const currentStatus = computed(() => getPressureStatus(latest.value.systolic, latest.value.diastolic));

const formattedLatestDate = computed(() => {
  if (!latest.value.date) return "";
  const [year, month, day] = latest.value.date.split("-");
  return `${year}年${month}月${day}日 ${latest.value.time || "23:59"}`;
});

function getChangeClass(value: number) {
  if (value > 0) return "positive";
  if (value < 0) return "negative";
  return "";
}

function createGaugePath(startAngle: number, endAngle: number, radius: number) {
  const centerX = 160;
  const centerY = 160;
  const polarToCartesian = (angle: number) => {
    const radian = ((angle - 90) * Math.PI) / 180;
    return {
      x: centerX + radius * Math.cos(radian),
      y: centerY + radius * Math.sin(radian),
    };
  };
  const start = polarToCartesian(startAngle);
  const end = polarToCartesian(endAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;

  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`;
}

function getGaugeNeedleAngle(systolic: number) {
  const clamped = Math.min(Math.max(systolic, 80), 180);
  return -130 + ((clamped - 80) / 100) * 260;
}

function getNeedlePosition(angle: number, radius: number) {
  const centerX = 160;
  const centerY = 160;
  const radian = ((angle - 90) * Math.PI) / 180;
  return {
    x: centerX + radius * Math.cos(radian),
    y: centerY + radius * Math.sin(radian),
  };
}

const gaugeNeedle = computed(() => getNeedlePosition(getGaugeNeedleAngle(latest.value.systolic), 98));
const gaugeSegments = computed(() => ({
  good: createGaugePath(-130, -42, 108),
  normal: createGaugePath(-38, 42, 108),
  high: createGaugePath(46, 130, 108),
  track: createGaugePath(-130, 130, 108),
}));

function getAxisScale(minValue: number, maxValue: number) {
  return [minValue, minValue + (maxValue - minValue) * 0.25, minValue + (maxValue - minValue) * 0.5, minValue + (maxValue - minValue) * 0.75, maxValue];
}

function createDayChart(items: DailyItem[], width = 320, height = 230) {
  const left = 34;
  const right = 12;
  const top = 10;
  const bottom = 32;
  const innerWidth = width - left - right;
  const innerHeight = height - top - bottom;
  const maxValue = 160;
  const minValue = 40;
  const range = maxValue - minValue;
  const step = items.length > 1 ? innerWidth / Math.max(items.length - 1, 1) : 0;

  return {
    width,
    height,
    left,
    right,
    bottom,
    yLabels: getAxisScale(minValue, maxValue).reverse().map((value) => Math.round(value)),
    yLines: [0, 0.25, 0.5, 0.75, 1].map((ratio) => top + innerHeight * ratio),
    bars: items.map((item, index) => {
      const x = left + index * step;
      const sysY = top + (1 - (item.systolic - minValue) / range) * innerHeight;
      const diaY = top + (1 - (item.diastolic - minValue) / range) * innerHeight;
      return { x, sysY, diaY };
    }),
  };
}

function createPeriodChart(items: PeriodItem[], width = 320, height = 230) {
  const left = 34;
  const right = 12;
  const top = 10;
  const bottom = 32;
  const innerWidth = width - left - right;
  const innerHeight = height - top - bottom;
  const maxValue = 160;
  const minValue = 60;
  const range = maxValue - minValue;
  const barWidth = Math.min(20, Math.max(16, innerWidth / Math.max(items.length * 2.5, 1)));
  const gap = items.length > 1 ? (innerWidth - items.length * barWidth) / (items.length - 1) : 0;

  return {
    width,
    height,
    left,
    right,
    bottom,
    yLabels: getAxisScale(minValue, maxValue).reverse().map((value) => Math.round(value)),
    yLines: [0, 0.25, 0.5, 0.75, 1].map((ratio) => top + innerHeight * ratio),
    bars: items.map((item, index) => {
      const x = left + index * (barWidth + gap) + barWidth / 2;
      const sysY = top + (1 - (item.maxSystolic - minValue) / range) * innerHeight;
      const diaY = top + (1 - (item.minDiastolic - minValue) / range) * innerHeight;
      const avgSysY = top + (1 - (item.systolic - minValue) / range) * innerHeight;
      const avgDiaY = top + (1 - (item.diastolic - minValue) / range) * innerHeight;
      return { x, sysY, diaY, avgSysY, avgDiaY };
    }),
  };
}

const dayChart = computed(() => createDayChart(latestTimeline.value));
const weekChart = computed(() => createPeriodChart(weekItems.value));
const monthChart = computed(() => createPeriodChart(monthItems.value));

const dayLabelStyle = computed(() => ({
  gridTemplateColumns: `repeat(${Math.max(latestTimeline.value.length, 1)}, minmax(0, 1fr))`,
}));
const weekLabelStyle = computed(() => ({
  gridTemplateColumns: `repeat(${Math.max(weekItems.value.length, 1)}, minmax(0, 1fr))`,
}));
const monthLabelStyle = computed(() => ({
  gridTemplateColumns: `repeat(${Math.max(monthItems.value.length, 1)}, minmax(0, 1fr))`,
}));

function formatTableChange(index: number, key: "systolic" | "diastolic") {
  if (index === 0) return "—";
  const diff = bloodPressureData.value[index][key] - bloodPressureData.value[index - 1][key];
  if (diff === 0) return "持平";
  return `${diff > 0 ? "+" : ""}${diff} mmHg`;
}

function getTableChangeClass(index: number, key: "systolic" | "diastolic") {
  if (index === 0) return "";
  const diff = bloodPressureData.value[index][key] - bloodPressureData.value[index - 1][key];
  return getChangeClass(diff);
}

function goBack() {
  if (props.navigation?.navigateBack?.()) {
    return;
  }

  if (props.navigation?.reLaunch) {
    props.navigation.reLaunch("health/health-data");
    return;
  }

  window.history.back();
}

function goToAddData() {
  sessionStorage.setItem("addMetric", "bloodPressure");
  sessionStorage.setItem("addReturnPath", "health/data-bloodpressure");
  props.navigation?.navigateTo?.("health/add-data");
}

async function loadPageData() {
  try {
    pageData.value = await loadBloodPressureSource();
  } finally {
    isLoading.value = false;
  }
}

onMounted(() => {
  void loadPageData();
});
</script>

<template>
  <section class="health-data-page">
    <header class="medication-nav">
      <button class="back-btn" type="button" aria-label="返回" @click="goBack">
        <span class="back-arrow" aria-hidden="true"></span>
      </button>
      <h1>{{ props.pageEntry?.title || "血压详情" }}</h1>
    </header>

    <main class="medication-scroll">
      <template v-if="healthList">
        <section class="latest-small-card">
          <div class="latest-card-main">
            <div>
              <h2 class="small-card-label">最新记录</h2>
              <strong>{{ latest.systolic }}/{{ latest.diastolic }} mmHg</strong>
              <p class="small-card-date">{{ latest.date }}</p>
            </div>
            <div class="latest-card-summary">
              <span>平均血压</span>
              <strong>{{ averageSystolic }}/{{ averageDiastolic }}</strong>
              <p>
                {{ changeSystolic >= 0 ? `收缩压 +${changeSystolic}` : `收缩压 ${changeSystolic}` }}
                / {{ changeDiastolic >= 0 ? `舒张压 +${changeDiastolic}` : `舒张压 ${changeDiastolic}` }}
              </p>
            </div>
          </div>
        </section>

        <section class="pressure-panel-card">
          <div class="chart-switch chart-switch--wide">
            <button type="button" :class="{ active: selectedChartMode === 'day' }" @click="selectedChartMode = 'day'">日</button>
            <button type="button" :class="{ active: selectedChartMode === 'week' }" @click="selectedChartMode = 'week'">周</button>
            <button type="button" :class="{ active: selectedChartMode === 'month' }" @click="selectedChartMode = 'month'">月</button>
          </div>

          <template v-if="selectedChartMode === 'day'">
            <p class="pressure-timestamp">{{ formattedLatestDate }}</p>

            <div class="pressure-gauge">
              <svg viewBox="0 0 320 280" class="gauge-svg" preserveAspectRatio="xMidYMid meet">
                <path :d="gaugeSegments.track" class="gauge-track" />
                <path :d="gaugeSegments.good" class="gauge-zone gauge-zone--good" />
                <path :d="gaugeSegments.normal" class="gauge-zone gauge-zone--normal" />
                <path :d="gaugeSegments.high" class="gauge-zone gauge-zone--high" />
                <circle cx="160" cy="160" r="78" class="gauge-inner-ring" />
                <line x1="160" y1="160" :x2="gaugeNeedle.x" :y2="gaugeNeedle.y" class="gauge-needle" />
                <circle cx="160" cy="160" r="8" class="gauge-center" />
              </svg>

              <div class="gauge-content">
                <span>收缩压/舒张压</span>
                <strong>{{ latest.systolic }}/{{ latest.diastolic }}</strong>
                <small :class="`status-chip status-chip--${currentStatus === '正常' ? 'normal' : 'alert'}`">{{ currentStatus }}</small>
              </div>
            </div>
          </template>

          <div v-else class="pressure-summary-panel">
            <article class="pressure-summary-item">
              <span>平均血压</span>
              <strong>{{ averageSystolic }}/{{ averageDiastolic }}</strong>
              <small>mmHg</small>
            </article>
            <article class="pressure-summary-item">
              <span>当前状态</span>
              <strong>{{ currentStatus }}</strong>
              <small>{{ selectedChartMode === "week" ? "近 7 天趋势" : "本月趋势" }}</small>
            </article>
          </div>
        </section>

        <section class="chart-card">
          <div class="chart-card__header">
            <h2>{{ selectedChartMode === "day" ? "今日血压趋势" : selectedChartMode === "week" ? "近 7 天血压趋势" : "本月血压趋势" }}</h2>
          </div>

          <template v-if="selectedChartMode === 'day'">
            <div class="chart-card__chart">
              <svg class="main-chart" :viewBox="'0 0 ' + dayChart.width + ' ' + dayChart.height" preserveAspectRatio="none">
                <g class="chart-grid">
                  <line
                    v-for="(lineY, index) in dayChart.yLines"
                    :key="`day-line-${index}`"
                    :x1="dayChart.left"
                    :y1="lineY"
                    :x2="dayChart.width - dayChart.right"
                    :y2="lineY"
                  />
                </g>
                <g v-for="(bar, index) in dayChart.bars" :key="`day-bar-${index}`">
                  <line :x1="bar.x" :y1="bar.sysY" :x2="bar.x" :y2="bar.diaY" class="pressure-range-line" />
                  <circle :cx="bar.x" :cy="bar.sysY" r="4.5" class="pressure-range-dot" />
                  <circle :cx="bar.x" :cy="bar.diaY" r="4.5" class="pressure-range-dot pressure-range-dot--low" />
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
                    :x1="weekChart.left"
                    :y1="lineY"
                    :x2="weekChart.width - weekChart.right"
                    :y2="lineY"
                  />
                </g>
                <g v-for="(bar, index) in weekChart.bars" :key="`week-bar-${index}`">
                  <line :x1="bar.x" :y1="bar.sysY" :x2="bar.x" :y2="bar.diaY" class="pressure-range-line" />
                  <circle :cx="bar.x" :cy="bar.avgSysY" r="4.5" class="pressure-range-dot" />
                  <circle :cx="bar.x" :cy="bar.avgDiaY" r="4.5" class="pressure-range-dot pressure-range-dot--low" />
                </g>
              </svg>
              <div class="chart-axis-left">
                <span v-for="label in weekChart.yLabels" :key="`week-axis-${label}`">{{ label }}</span>
              </div>
            </div>
            <div class="chart-card__labels" :style="weekLabelStyle">
              <span v-for="item in weekItems" :key="item.label">{{ item.label }}</span>
            </div>
          </template>

          <template v-else>
            <div class="chart-card__chart">
              <svg class="main-chart" :viewBox="'0 0 ' + monthChart.width + ' ' + monthChart.height" preserveAspectRatio="none">
                <g class="chart-grid">
                  <line
                    v-for="(lineY, index) in monthChart.yLines"
                    :key="`month-line-${index}`"
                    :x1="monthChart.left"
                    :y1="lineY"
                    :x2="monthChart.width - monthChart.right"
                    :y2="lineY"
                  />
                </g>
                <g v-for="(bar, index) in monthChart.bars" :key="`month-bar-${index}`">
                  <line :x1="bar.x" :y1="bar.sysY" :x2="bar.x" :y2="bar.diaY" class="pressure-range-line" />
                  <circle :cx="bar.x" :cy="bar.avgSysY" r="4.5" class="pressure-range-dot" />
                  <circle :cx="bar.x" :cy="bar.avgDiaY" r="4.5" class="pressure-range-dot pressure-range-dot--low" />
                </g>
              </svg>
              <div class="chart-axis-left">
                <span v-for="label in monthChart.yLabels" :key="`month-axis-${label}`">{{ label }}</span>
              </div>
            </div>
            <div class="chart-card__labels" :style="monthLabelStyle">
              <span v-for="item in monthItems" :key="item.label">{{ item.label }}</span>
            </div>
          </template>
        </section>

        <section class="stat-card-grid">
          <article class="stats-card large-stats-card">
            <span class="stats-card__label">血压平均值</span>
            <div class="stats-card__average">
              <strong>{{ averageSystolic }}/{{ averageDiastolic }}</strong>
              <small>mmHg</small>
            </div>
            <div class="stats-matrix">
              <div class="stats-matrix__item">
                <span>最高收缩压</span>
                <div class="stats-matrix__value">
                  <strong>{{ maxSystolic }}</strong>
                  <em v-if="maxSystolic >= 140" class="stats-badge">偏高</em>
                </div>
              </div>
              <div class="stats-matrix__item">
                <span>最高舒张压</span>
                <div class="stats-matrix__value">
                  <strong>{{ maxDiastolic }}</strong>
                </div>
              </div>
              <div class="stats-matrix__item">
                <span>最低收缩压</span>
                <div class="stats-matrix__value">
                  <strong>{{ minSystolic === Infinity ? 0 : minSystolic }}</strong>
                </div>
              </div>
              <div class="stats-matrix__item">
                <span>最低舒张压</span>
                <div class="stats-matrix__value">
                  <strong>{{ minDiastolic === Infinity ? 0 : minDiastolic }}</strong>
                </div>
              </div>
            </div>
          </article>
        </section>

        <section class="detail-table-card">
          <div class="detail-card__header">
            <h2>每日血压明细</h2>
          </div>
          <div class="table-wrapper">
            <table class="metric-table">
              <thead>
                <tr>
                  <th>日期</th>
                  <th>收缩压</th>
                  <th>变化</th>
                  <th>舒张压</th>
                  <th>变化</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(item, index) in bloodPressureData" :key="item.date">
                  <td>{{ item.date }}</td>
                  <td>{{ item.systolic }} mmHg</td>
                  <td :class="getTableChangeClass(index, 'systolic')">{{ formatTableChange(index, "systolic") }}</td>
                  <td>{{ item.diastolic }} mmHg</td>
                  <td :class="getTableChangeClass(index, 'diastolic')">{{ formatTableChange(index, "diastolic") }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </template>

      <div v-else-if="isLoading" class="error-card">
        <strong>加载中...</strong>
      </div>
      <div v-else class="error-card">
        <strong>数据加载失败</strong>
        <p>请检查 `mock.ts` 文件，确认已导出有效的 `list` 数据。</p>
      </div>

      <footer class="add-area">
        <button class="add-btn" type="button" @click="goToAddData">+ 添加血压记录</button>
      </footer>
    </main>
  </section>
</template>

<style scoped>
.health-data-page {
  position: relative;
  left: 50%;
  width: min(390px, 100vw);
  height: auto;
  min-height: var(--ihc-page-min-height);
  max-height: none;
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

.latest-small-card,
.pressure-panel-card,
.chart-card,
.stats-card,
.detail-table-card,
.error-card {
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid rgba(255, 255, 255, 0.74);
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
  font-size: 15px;
  font-weight: 500;
  letter-spacing: 0.03em;
  line-height: 1.25;
}

.latest-small-card strong,
.latest-card-summary strong {
  display: block;
  margin-bottom: 4px;
  font-size: 24px;
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
  font-size: 12px;
  font-weight: 500;
}

.latest-card-summary p {
  margin: 0;
  color: #8e8f94;
  font-size: 11px;
  line-height: 1.35;
}

.small-card-date {
  margin: 0;
  color: #b7b7bb;
  font-size: 13px;
  font-weight: 500;
}

.pressure-panel-card {
  padding: 18px;
}

.pressure-summary-panel {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  margin-top: 16px;
}

.pressure-summary-item {
  padding: 16px 14px;
  border-radius: 16px;
  background: linear-gradient(180deg, #fbfcff 0%, #f5f7fc 100%);
}

.pressure-summary-item span {
  display: block;
  color: #9aa4b7;
  font-size: 12px;
}

.pressure-summary-item strong {
  display: block;
  margin-top: 10px;
  color: #30343f;
  font-size: 20px;
  font-weight: 700;
  line-height: 1.1;
}

.pressure-summary-item small {
  display: block;
  margin-top: 6px;
  color: #b7b7bb;
  font-size: 11px;
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
  font-size: 14px;
  font-weight: 500;
}

.chart-switch button.active {
  background: #ffffff;
  color: #5766ff;
  box-shadow: 0 2px 10px rgba(69, 88, 129, 0.08);
}

.pressure-timestamp {
  margin: 12px 0 0;
  color: #8e8f94;
  font-size: 12px;
  line-height: 1.3;
}

.pressure-gauge {
  position: relative;
  display: grid;
  place-items: center;
  margin-top: 4px;
}

.gauge-svg {
  width: 100%;
  height: 300px;
  display: block;
}

.gauge-track,
.gauge-zone {
  fill: none;
  stroke-width: 18;
  stroke-linecap: round;
}

.gauge-track {
  stroke: rgba(108, 116, 136, 0.08);
}

.gauge-inner-ring {
  fill: none;
  stroke: rgba(108, 116, 136, 0.06);
  stroke-width: 18;
}

.gauge-zone--good {
  stroke: #37d2ad;
}

.gauge-zone--normal {
  stroke: #6670f0;
}

.gauge-zone--high {
  stroke: #ff7268;
}

.gauge-needle {
  stroke: #6670f0;
  stroke-width: 5;
  stroke-linecap: round;
}

.gauge-center {
  fill: #6670f0;
}

.gauge-content {
  position: absolute;
  inset: 0;
  display: grid;
  place-content: center;
  align-content: center;
  gap: 8px;
  padding-top: 22px;
  text-align: center;
}

.gauge-content span {
  color: #9aa4b7;
  font-size: 13px;
  line-height: 1.3;
}

.gauge-content strong {
  color: #30343f;
  font-size: 28px;
  font-weight: 700;
  line-height: 1;
}

.status-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: fit-content;
  margin: 0 auto;
  min-width: 54px;
  height: 30px;
  padding: 0 12px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 500;
}

.status-chip--normal {
  background: rgba(102, 112, 240, 0.1);
  color: #6670f0;
}

.status-chip--alert {
  background: rgba(255, 114, 104, 0.12);
  color: #ff7268;
}

.chart-card {
  padding: 18px 18px 14px;
}

.chart-card__header {
  margin-bottom: 14px;
}

.chart-card__header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.chart-card__chart {
  position: relative;
}

.main-chart {
  width: 100%;
  height: 230px;
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
  bottom: 32px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  color: #c4c7d1;
  font-size: 11px;
}

.pressure-range-line {
  stroke: #6670f0;
  stroke-width: 10;
  stroke-linecap: round;
}

.pressure-range-dot {
  fill: #6670f0;
}

.pressure-range-dot--low {
  fill: #5562dd;
}

.chart-card__labels {
  display: grid;
  gap: 6px;
  padding-top: 8px;
  color: #b7b7bb;
  font-size: 11px;
}

.chart-card__labels span {
  text-align: center;
  white-space: nowrap;
}

.stat-card-grid {
  display: grid;
}

.large-stats-card {
  padding: 22px 18px 18px;
}

.stats-card__label {
  display: block;
  color: #8e8f94;
  font-size: 13px;
}

.stats-card__average {
  display: flex;
  align-items: baseline;
  gap: 4px;
  margin-top: 14px;
}

.stats-card__average strong {
  color: #30343f;
  font-size: 32px;
  line-height: 1;
  font-weight: 700;
}

.stats-card__average small {
  color: #5a6474;
  font-size: 14px;
}

.stats-matrix {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 22px 18px;
  margin-top: 26px;
}

.stats-matrix__item span {
  display: block;
  margin-bottom: 12px;
  color: #9aa4b7;
  font-size: 12px;
}

.stats-matrix__value {
  display: flex;
  align-items: center;
  gap: 8px;
}

.stats-matrix__value strong {
  color: #30343f;
  font-size: 24px;
  line-height: 1;
  font-weight: 700;
}

.stats-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 46px;
  height: 28px;
  padding: 0 10px;
  border-radius: 10px;
  background: rgba(255, 114, 104, 0.12);
  color: #ff7268;
  font-size: 12px;
  font-style: normal;
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
  padding: 10px 6px;
  text-align: left;
  border-bottom: 1px solid #eef2f8;
  white-space: nowrap;
  font-size: 11px;
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
  border-radius: 13px;
  background: #6670f0;
  box-shadow: 0 14px 28px rgba(102, 112, 240, 0.18);
  color: #ffffff;
  font-size: 24px;
  font-weight: 500;
  letter-spacing: 0.04em;
  border: 0;
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

  .pressure-summary-panel,
  .stats-matrix {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .stats-card__average strong {
    font-size: 32px;
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
  font-size: 11px;
  word-break: keep-all;
  overflow-wrap: normal;
}
</style>
