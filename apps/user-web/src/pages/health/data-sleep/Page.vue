<script setup lang="ts">
import { computed, ref } from "vue";
import type { PageComponentProps } from "@ihc/page-core/types";
import mock from "./mock";

type ChartMode = "day" | "week" | "month";
type SleepRecord = {
  date: string;
  sleep: number;
  deepSleep: number;
  lightSleep: number;
  remSleep: number;
  awakeCount: number;
};
type LineItem = { label: string; value: number };
type StackItem = { label: string; deepSleep: number; lightSleep: number; remSleep: number };
type ScheduleItem = { label: string; sleepStartHour: number; wakeTimeHour: number };

const props = defineProps<PageComponentProps>();
const selectedChartMode = ref<ChartMode>("day");

const healthList = computed<SleepRecord[] | null>(() =>
  mock && Array.isArray(mock.list) && mock.list.length ? (mock.list as SleepRecord[]) : null
);

const sleepData = computed(() => healthList.value ?? []);
const latest = computed(
  () =>
    sleepData.value[sleepData.value.length - 1] || {
      date: "",
      sleep: 0,
      deepSleep: 0,
      lightSleep: 0,
      remSleep: 0,
      awakeCount: 0,
    }
);
const previous = computed(() => sleepData.value[sleepData.value.length - 2] ?? latest.value);
const averageSleep = computed(() => {
  if (!sleepData.value.length) return 0;
  return Number((sleepData.value.reduce((sum, item) => sum + item.sleep, 0) / sleepData.value.length).toFixed(1));
});
const change = computed(() => Number((latest.value.sleep - previous.value.sleep).toFixed(1)));

const dayLineItems = computed<LineItem[]>(() => {
  const entry = mock.dailyTimeline?.find((item: { date: string }) => item.date === latest.value.date);
  return (entry?.items ?? []).map((item: { time: string; value: number }) => ({
    label: item.time,
    value: Number(item.value ?? 0),
  }));
});

const weekStackItems = computed<StackItem[]>(() =>
  sleepData.value.map((item) => ({
    label: item.date.slice(5).replace("-", "/"),
    deepSleep: item.deepSleep,
    lightSleep: item.lightSleep,
    remSleep: item.remSleep,
  }))
);

const monthStackItems = computed<StackItem[]>(() =>
  (mock.monthlyData ?? []).map((item: { label: string; deepSleep: number; lightSleep: number; remSleep: number }) => ({
    label: item.label,
    deepSleep: Number(item.deepSleep ?? 0),
    lightSleep: Number(item.lightSleep ?? 0),
    remSleep: Number(item.remSleep ?? 0),
  }))
);

const scheduleItems = computed<ScheduleItem[]>(() =>
  (
    selectedChartMode.value === "month" ? mock.monthlySchedule ?? [] : mock.weeklySchedule ?? []
  ).map((item: { label: string; sleepStartHour: number; wakeTimeHour: number }) => ({
    label: item.label,
    sleepStartHour: Number(item.sleepStartHour ?? 0),
    wakeTimeHour: Number(item.wakeTimeHour ?? 0),
  }))
);

const scheduleSummary = computed(() =>
  selectedChartMode.value === "month" ? mock.monthlySummary : mock.weeklySummary
);

function formatSleep(value: number) {
  return Number.isInteger(value) ? `${value}` : value.toFixed(1);
}

function formatDuration(hours: number) {
  const totalMinutes = Math.round(hours * 60);
  const hourPart = Math.floor(totalMinutes / 60);
  const minutePart = totalMinutes % 60;
  if (!hourPart) return `${minutePart}分钟`;
  if (!minutePart) return `${hourPart}小时`;
  return `${hourPart}小时${minutePart}分钟`;
}

function stageStatus(value: number, min: number, max: number): "" | "偏高" | "偏低" {
  if (value > max) return "偏高";
  if (value < min) return "偏低";
  return "";
}

const dayStageCards = computed(() => {
  const total = latest.value.sleep || 1;
  const deepPercent = (latest.value.deepSleep / total) * 100;
  const lightPercent = (latest.value.lightSleep / total) * 100;
  const remPercent = (latest.value.remSleep / total) * 100;
  return [
    { key: "deep", label: "深睡", valueText: formatDuration(latest.value.deepSleep), rangeText: "20%-40%", status: stageStatus(deepPercent, 20, 40), color: "#355fe9" },
    { key: "light", label: "浅睡", valueText: formatDuration(latest.value.lightSleep), rangeText: "20%-60%", status: stageStatus(lightPercent, 20, 60), color: "#3290f3" },
    { key: "rem", label: "快速眼动", valueText: formatDuration(latest.value.remSleep), rangeText: "10%-30%", status: stageStatus(remPercent, 10, 30), color: "#96e9f5" },
    { key: "awake", label: "清醒", valueText: `${latest.value.awakeCount}次`, rangeText: "0-2次", status: latest.value.awakeCount > 2 ? "偏高" : "", color: "#ffd45a" },
  ];
});

function buildSmoothPath(points: { x: number; y: number }[]) {
  if (!points.length) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  const smoothing = 0.18;
  const line = (a: { x: number; y: number }, b: { x: number; y: number }) => ({
    length: Math.hypot(b.x - a.x, b.y - a.y),
    angle: Math.atan2(b.y - a.y, b.x - a.x),
  });
  const control = (current: { x: number; y: number }, previous?: { x: number; y: number }, next?: { x: number; y: number }, reverse = false) => {
    const p = previous ?? current;
    const n = next ?? current;
    const l = line(p, n);
    const angle = l.angle + (reverse ? Math.PI : 0);
    const length = l.length * smoothing;
    return { x: current.x + Math.cos(angle) * length, y: current.y + Math.sin(angle) * length };
  };
  return points.reduce((path, point, index) => {
    if (!index) return `M ${point.x} ${point.y}`;
    const cps = control(points[index - 1], points[index - 2], point);
    const cpe = control(point, points[index - 1], points[index + 1], true);
    return `${path} C ${cps.x} ${cps.y}, ${cpe.x} ${cpe.y}, ${point.x} ${point.y}`;
  }, "");
}

function createLineChart(items: LineItem[], width = 320, height = 220) {
  const px = 16;
  const top = 12;
  const bottom = 28;
  const innerWidth = width - px * 2;
  const innerHeight = height - top - bottom;
  if (!items.length) return { width, height, linesY: [], linesX: [], path: "", polyline: "" };
  const values = items.map((item) => item.value);
  const min = Math.min(...values) - 0.6;
  const max = Math.max(...values) + 0.6;
  const range = max - min || 1;
  const points = items.map((item, index) => ({
    x: px + (index * innerWidth) / Math.max(items.length - 1, 1),
    y: top + (1 - (item.value - min) / range) * innerHeight,
  }));
  return {
    width,
    height,
    linesY: [0, 0.25, 0.5, 0.75, 1].map((ratio) => top + innerHeight * ratio),
    linesX: points.map((point) => point.x),
    path: buildSmoothPath(points),
    polyline: points.map((point) => `${point.x},${point.y}`).join(" "),
  };
}

function createStackChart(items: StackItem[], width = 320, height = 228) {
  const left = 26;
  const right = 12;
  const top = 8;
  const bottom = 30;
  const innerWidth = width - left - right;
  const innerHeight = height - top - bottom;
  const maxTotal = Math.max(10, ...items.map((item) => item.deepSleep + item.lightSleep + item.remSleep));
  const barWidth = Math.min(26, Math.max(16, innerWidth / Math.max(items.length * 2.1, 1)));
  const gap = items.length > 1 ? (innerWidth - barWidth * items.length) / (items.length - 1) : 0;
  return {
    width,
    height,
    left,
    right,
    lines: [0, 2, 4, 6, 8, 10].map((value) => ({ value, y: height - bottom - (value / maxTotal) * innerHeight })),
    bars: items.map((item, index) => {
      const x = left + index * (barWidth + gap);
      const deep = (item.deepSleep / maxTotal) * innerHeight;
      const light = (item.lightSleep / maxTotal) * innerHeight;
      const rem = (item.remSleep / maxTotal) * innerHeight;
      const base = height - bottom;
      return {
        x,
        width: barWidth,
        deep: { y: base - deep, height: deep },
        light: { y: base - deep - light, height: light },
        rem: { y: base - deep - light - rem, height: rem },
      };
    }),
  };
}

function createScheduleChart(items: ScheduleItem[], width = 320, height = 280) {
  const left = 44;
  const right = 10;
  const top = 10;
  const bottom = 18;
  const innerWidth = width - left - right;
  const innerHeight = height - top - bottom;
  const hours = [0, 4, 8, 12, 16, 20, 24];
  return {
    width,
    height,
    left,
    right,
    lines: hours.map((hour) => ({ hour, y: top + (hour / 24) * innerHeight })),
    segments: items.map((item, index) => ({
      x: left + ((index + 0.5) * innerWidth) / Math.max(items.length, 1),
      y1: top + (item.sleepStartHour / 24) * innerHeight,
      y2: top + (item.wakeTimeHour / 24) * innerHeight,
    })),
  };
}

const dayChart = computed(() => createLineChart(dayLineItems.value));
const weekChart = computed(() => createStackChart(weekStackItems.value));
const monthChart = computed(() => createStackChart(monthStackItems.value));
const scheduleChart = computed(() => createScheduleChart(scheduleItems.value));
const dayLabelStyle = computed(() => ({
  gridTemplateColumns: `repeat(${Math.max(dayLineItems.value.length, 1)}, minmax(0, 1fr))`,
}));
const weekLabelStyle = computed(() => ({
  gridTemplateColumns: `repeat(${Math.max(weekStackItems.value.length, 1)}, minmax(0, 1fr))`,
}));
const monthAxisLabels = computed(() => monthStackItems.value.map((item) => item.label));
const monthLabelStyle = computed(() => ({
  gridTemplateColumns: `repeat(${monthAxisLabels.value.length}, minmax(0, 1fr))`,
}));

function formatChange(idx: number) {
  if (!idx) return "—";
  const diff = sleepData.value[idx].sleep - sleepData.value[idx - 1].sleep;
  if (diff === 0) return "持平";
  return `${diff > 0 ? "+" : ""}${formatSleep(Number(diff.toFixed(1)))} 小时`;
}

function getChangeClass(idx: number) {
  if (!idx) return "";
  const diff = sleepData.value[idx].sleep - sleepData.value[idx - 1].sleep;
  if (diff > 0) return "positive";
  if (diff < 0) return "negative";
  return "";
}

function goBack() {
  if (props.navigation?.navigateTo) props.navigation.navigateTo("health/health-data");
  else window.history.back();
}

function goToAddData() {
  sessionStorage.setItem("addMetric", "sleep");
  sessionStorage.setItem("addReturnPath", "health/data-sleep");
  props.navigation?.navigateTo?.("health/add-data");
}
</script>

<template>
  <section class="health-data-page">
    <header class="medication-nav">
      <button class="back-btn" type="button" aria-label="返回" @click="goBack"><span class="back-arrow" aria-hidden="true"></span></button>
      <h1>睡眠详情</h1>
    </header>

    <main class="medication-scroll">
      <template v-if="healthList">
        <section class="latest-small-card">
          <div class="latest-card-main">
            <div>
              <h2 class="small-card-label">最新记录</h2>
              <strong>{{ formatSleep(latest.sleep) }} 小时</strong>
              <p class="small-card-date">{{ latest.date }}</p>
            </div>
            <div class="latest-card-summary">
              <span>平均睡眠</span>
              <strong>{{ formatSleep(averageSleep) }}</strong>
              <p>{{ change >= 0 ? `较前一日增加 ${formatSleep(change)} 小时` : `较前一日减少 ${formatSleep(Math.abs(change))} 小时` }}</p>
            </div>
          </div>
        </section>

        <section class="chart-card large">
          <div class="chart-card__toolbar sleep-toolbar">
            <div class="chart-switch chart-switch--wide">
              <button type="button" :class="{ active: selectedChartMode === 'day' }" @click="selectedChartMode = 'day'">日</button>
              <button type="button" :class="{ active: selectedChartMode === 'week' }" @click="selectedChartMode = 'week'">周</button>
              <button type="button" :class="{ active: selectedChartMode === 'month' }" @click="selectedChartMode = 'month'">月</button>
            </div>
          </div>

          <template v-if="selectedChartMode === 'day'">
            <svg class="main-chart" :viewBox="'0 0 ' + dayChart.width + ' ' + dayChart.height" preserveAspectRatio="none">
              <defs>
                <linearGradient id="sleep-line-gradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stop-color="#74d6ff" />
                  <stop offset="35%" stop-color="#ffe06e" />
                  <stop offset="68%" stop-color="#338bff" />
                  <stop offset="100%" stop-color="#70d8ff" />
                </linearGradient>
              </defs>
              <g class="chart-grid">
                <line v-for="(lineY, index) in dayChart.linesY" :key="`day-y-${index}`" x1="10" :y1="lineY" :x2="dayChart.width - 10" :y2="lineY" />
                <line v-for="(lineX, index) in dayChart.linesX" :key="`day-x-${index}`" :x1="lineX" y1="8" :x2="lineX" :y2="dayChart.height - 28" />
              </g>
              <polyline v-if="dayChart.polyline" :points="dayChart.polyline" fill="none" stroke="#63bbff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" opacity="0.3" />
              <path v-if="dayChart.path" :d="dayChart.path" fill="none" stroke="url(#sleep-line-gradient)" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            <div class="chart-card__labels day-labels" :style="dayLabelStyle"><span v-for="item in dayLineItems" :key="item.label">{{ item.label }}</span></div>
          </template>

          <template v-else-if="selectedChartMode === 'week'">
            <svg class="main-chart" :viewBox="'0 0 ' + weekChart.width + ' ' + weekChart.height" preserveAspectRatio="none">
              <g class="chart-grid">
                <line v-for="line in weekChart.lines" :key="`week-line-${line.value}`" :x1="weekChart.left" :y1="line.y" :x2="weekChart.width - weekChart.right" :y2="line.y" />
              </g>
              <g class="chart-axis-text">
                <text v-for="line in weekChart.lines" :key="`week-axis-${line.value}`" x="6" :y="line.y + 4">{{ line.value }}</text>
              </g>
              <g>
                <template v-for="(bar, index) in weekChart.bars" :key="`week-bar-${index}`">
                  <rect :x="bar.x" :y="bar.deep.y" :width="bar.width" :height="bar.deep.height" fill="#355fe9" />
                  <rect :x="bar.x" :y="bar.light.y" :width="bar.width" :height="bar.light.height" fill="#3290f3" />
                  <rect :x="bar.x" :y="bar.rem.y" :width="bar.width" :height="bar.rem.height" fill="#96e9f5" rx="5" />
                </template>
              </g>
            </svg>
            <div class="chart-card__labels" :style="weekLabelStyle"><span v-for="item in weekStackItems" :key="item.label">{{ item.label }}</span></div>
            <div class="stage-legend">
              <span><i class="legend-dot deep"></i>深睡</span>
              <span><i class="legend-dot light"></i>浅睡</span>
              <span><i class="legend-dot rem"></i>快速眼动</span>
            </div>
          </template>

          <template v-else>
            <div class="month-summary">
              <span>平均睡眠时长</span>
              <div class="month-summary__row">
                <strong>{{ mock.monthlySummary.averageDuration }}</strong>
                <em>{{ mock.monthlySummary.compareText }}</em>
              </div>
            </div>
            <svg class="main-chart" :viewBox="'0 0 ' + monthChart.width + ' ' + monthChart.height" preserveAspectRatio="none">
              <g class="chart-grid">
                <line v-for="line in monthChart.lines" :key="`month-line-${line.value}`" :x1="monthChart.left" :y1="line.y" :x2="monthChart.width - monthChart.right" :y2="line.y" />
              </g>
              <g class="chart-axis-text">
                <text v-for="line in monthChart.lines" :key="`month-axis-${line.value}`" x="6" :y="line.y + 4">{{ line.value }}</text>
              </g>
              <g>
                <template v-for="(bar, index) in monthChart.bars" :key="`month-bar-${index}`">
                  <rect :x="bar.x" :y="bar.deep.y" :width="bar.width" :height="bar.deep.height" fill="#355fe9" />
                  <rect :x="bar.x" :y="bar.light.y" :width="bar.width" :height="bar.light.height" fill="#3290f3" />
                  <rect :x="bar.x" :y="bar.rem.y" :width="bar.width" :height="bar.rem.height" fill="#96e9f5" rx="5" />
                </template>
              </g>
            </svg>
            <div class="chart-card__labels chart-card__labels--month" :style="monthLabelStyle"><span v-for="label in monthAxisLabels" :key="label">{{ label }}</span></div>
            <div class="stage-legend">
              <span><i class="legend-dot deep"></i>深睡</span>
              <span><i class="legend-dot light"></i>浅睡</span>
              <span><i class="legend-dot rem"></i>快速眼动</span>
            </div>
          </template>
        </section>

        <template v-if="selectedChartMode === 'day'">
          <section class="sleep-stage-list">
            <article v-for="card in dayStageCards" :key="card.key" class="sleep-stage-card">
              <div class="sleep-stage-card__content">
                <div class="sleep-stage-card__label"><span class="sleep-stage-card__dot" :style="{ backgroundColor: card.color }"></span><span>{{ card.label }}</span></div>
                <div class="sleep-stage-card__value-row"><strong>{{ card.valueText }}</strong><span v-if="card.status" class="sleep-stage-card__badge">{{ card.status }}</span></div>
              </div>
              <div class="sleep-stage-card__range">{{ card.rangeText }}</div>
            </article>
          </section>
        </template>
        <template v-else>
          <section class="chart-card schedule-card">
            <div class="schedule-summary-panel">
              <p>平均入睡时间 <strong>{{ scheduleSummary.averageSleepTime }}</strong></p>
              <p>平均起床时间 <strong>{{ scheduleSummary.averageWakeTime }}</strong></p>
            </div>
            <svg class="schedule-chart" :viewBox="'0 0 ' + scheduleChart.width + ' ' + scheduleChart.height" preserveAspectRatio="none">
              <g class="chart-grid">
                <line v-for="line in scheduleChart.lines" :key="`schedule-line-${line.hour}`" :x1="scheduleChart.left" :y1="line.y" :x2="scheduleChart.width - scheduleChart.right" :y2="line.y" />
              </g>
              <g class="chart-axis-text">
                <text v-for="line in scheduleChart.lines" :key="`schedule-axis-${line.hour}`" x="0" :y="line.y + 4">{{ `${line.hour}:00` }}</text>
              </g>
              <g>
                <line v-for="(segment, index) in scheduleChart.segments" :key="`segment-${index}`" :x1="segment.x" :y1="segment.y1" :x2="segment.x" :y2="segment.y2" class="schedule-segment" />
              </g>
            </svg>
          </section>
        </template>

        <section class="detail-table-card">
          <div class="detail-card__header"><h2>每日睡眠明细</h2></div>
          <div class="table-wrapper">
            <table class="metric-table">
              <thead><tr><th>日期</th><th>睡眠时长</th><th>较前一日变化</th></tr></thead>
              <tbody>
                <tr v-for="(item, idx) in sleepData" :key="item.date">
                  <td>{{ item.date }}</td>
                  <td>{{ formatSleep(item.sleep) }} 小时</td>
                  <td :class="getChangeClass(idx)">{{ formatChange(idx) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </template>

      <div v-else class="error-card">
        <strong>数据加载失败</strong>
        <p>请检查 `mock.ts` 文件，确保导出了有效的 `list` 数组。</p>
      </div>

      <footer class="add-area"><button class="add-btn" type="button" @click="goToAddData">+ 添加睡眠记录</button></footer>
    </main>
  </section>
</template>

<style scoped>
.health-data-page{position:relative;left:50%;width:min(390px,100vw);height:min(844px,calc(100vh - 36px));min-height:min(844px,calc(100vh - 36px));max-height:844px;margin:-18px 0;overflow:hidden;background:radial-gradient(circle at 82% 8%,rgba(102,112,240,.13) 0,rgba(102,112,240,0) 28%),linear-gradient(180deg,#f1f8ff 0%,#f7f9fb 42%,#f5f6f7 100%);color:#30343f;font-family:"HarmonyOS Sans SC","MiSans","Source Han Sans SC","Noto Sans SC","PingFang SC","Microsoft YaHei UI",sans-serif;transform:translateX(-50%);-webkit-font-smoothing:antialiased}
.medication-nav{display:flex;align-items:center;height:74px;padding:0 29px}.back-btn{display:grid;place-items:center;width:30px;height:44px;padding:0;border:0;background:transparent}.back-arrow{width:14px;height:14px;border-bottom:4px solid #333;border-left:4px solid #333;transform:rotate(45deg)}.medication-nav h1{margin:0 0 0 9px;font-size:24px;font-weight:500;letter-spacing:.03em}
.medication-scroll{display:grid;row-gap:18px;height:calc(100% - 74px);padding:24px 29px 116px;overflow-y:auto;scrollbar-width:none}.medication-scroll::-webkit-scrollbar{display:none}
.chart-card,.detail-table-card,.error-card,.sleep-stage-card{background:rgba(255,255,255,.94);border-radius:20px;box-shadow:0 15px 34px rgba(72,104,148,.075)}
.latest-small-card{position:relative;overflow:hidden;min-height:156px;padding:16px 16px 16px 18px;border:1px solid rgba(255,255,255,.72);border-radius:22px;background:linear-gradient(135deg,rgba(255,255,255,.96) 0%,rgba(239,246,255,.92) 48%,rgba(226,252,244,.88) 100%);box-shadow:0 18px 42px rgba(72,104,148,.1)}.latest-small-card::after{position:absolute;right:-22px;bottom:-25px;width:106px;height:106px;content:"";border-radius:50%;background:rgba(102,112,240,.08)}
.latest-card-main{position:relative;z-index:1;display:grid;grid-template-columns:minmax(0,1fr) 124px;gap:12px;align-items:center}.latest-card-main>div:first-child{display:grid;align-content:center;min-width:0}.small-card-label{display:block;margin:0 0 4px;color:#8e8f94;font-size:17px;font-weight:500;letter-spacing:.03em;line-height:1.25}.latest-small-card strong,.latest-card-summary strong{display:block;margin-bottom:4px;font-size:28px;font-weight:700;line-height:1.08}.latest-card-summary{box-sizing:border-box;width:124px;min-width:0;aspect-ratio:1;padding:12px 14px;border-radius:20px;border:1px solid rgba(255,255,255,.84);background:linear-gradient(180deg,#fff 0%,#f4f8ff 100%);box-shadow:0 8px 18px rgba(54,67,92,.06);display:grid;align-content:center;gap:6px}.latest-card-summary span{color:#8e8f94;font-size:13px;font-weight:500}.latest-card-summary p{margin:0;color:#8e8f94;font-size:12px;line-height:1.35}.small-card-date{margin:0;color:#b7b7bb;font-size:15px;font-weight:500}
.chart-card{padding:20px}.chart-card.large{padding-bottom:16px}.chart-card__toolbar{display:flex;justify-content:center;margin-bottom:12px}.chart-switch{display:flex;gap:6px;padding:4px;border-radius:20px;background:rgba(0,0,0,.04)}.chart-switch--wide{width:100%}.chart-switch--wide button{flex:1 1 0}.chart-switch button{min-width:48px;padding:8px 10px;border:none;border-radius:16px;background:transparent;color:#5a6474;font-size:15px;font-weight:500}.chart-switch button.active{background:#fff;color:#5766ff;box-shadow:0 2px 10px rgba(69,88,129,.08)}
.main-chart,.schedule-chart{width:100%;display:block}.main-chart{height:220px}.schedule-chart{height:280px}.chart-grid line{stroke:rgba(125,141,176,.16);stroke-width:1;stroke-dasharray:4 4}.chart-axis-text text{fill:#bec6d4;font-size:11px}.chart-card__labels{display:grid;grid-template-columns:repeat(auto-fit,minmax(26px,1fr));gap:6px;padding-top:8px;color:#b7b7bb;font-size:12px}.chart-card__labels span{text-align:center;white-space:nowrap}.day-labels{padding-top:2px}
.chart-card__labels--month span{text-align:center}
.stage-legend{display:flex;flex-wrap:wrap;gap:18px;padding-top:14px;color:#3b4d6d;font-size:15px}.legend-dot{display:inline-block;width:14px;height:14px;margin-right:8px;border-radius:50%;vertical-align:-2px}.legend-dot.deep{background:#355fe9}.legend-dot.light{background:#3290f3}.legend-dot.rem{background:#96e9f5}
.month-summary{margin-bottom:16px;padding:18px 20px;border:1px solid rgba(234,238,245,.95);border-radius:18px;background:rgba(255,255,255,.86)}.month-summary span{display:block;margin-bottom:10px;color:#9aa4b7;font-size:15px}.month-summary__row{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap}.month-summary__row strong{color:#1f2a3d;font-size:20px;font-weight:700}.month-summary__row em{color:#ff6d63;font-size:14px;font-style:normal}
.sleep-stage-list{display:grid;gap:14px}.sleep-stage-card{display:flex;align-items:center;justify-content:space-between;min-height:94px;padding:18px 20px;border:1px solid rgba(239,241,245,.92)}.sleep-stage-card__content{display:grid;gap:10px}.sleep-stage-card__label{display:inline-flex;align-items:center;gap:8px;color:#3a4f74;font-size:17px;font-weight:500}.sleep-stage-card__dot{width:14px;height:14px;border-radius:50%;flex:0 0 14px}.sleep-stage-card__value-row{display:flex;align-items:center;gap:10px}.sleep-stage-card__value-row strong{color:#1f2a3d;font-size:22px;font-weight:700;line-height:1.15}.sleep-stage-card__badge{display:inline-flex;align-items:center;justify-content:center;min-width:44px;height:28px;padding:0 10px;border-radius:10px;background:rgba(255,142,119,.18);color:#ff7f66;font-size:16px;font-weight:500}.sleep-stage-card__range{color:#99a6ba;font-size:15px;font-weight:500;white-space:nowrap}
.schedule-card{padding:18px}.schedule-summary-panel{margin-bottom:14px;padding:18px 20px;border:1px solid rgba(234,238,245,.95);border-radius:18px;background:rgba(255,255,255,.86)}.schedule-summary-panel p{margin:0;color:#49556b;font-size:15px;line-height:1.9}.schedule-summary-panel strong{color:#3e62f3;font-size:17px;font-weight:700}.schedule-segment{stroke:#355fe9;stroke-width:7;stroke-linecap:round}
.detail-table-card{padding:20px}.detail-card__header{margin-bottom:16px}.detail-card__header h2{margin:0}.table-wrapper{overflow-x:auto}.metric-table{width:100%;border-collapse:collapse}.metric-table th,.metric-table td{padding:12px 8px;text-align:left;border-bottom:1px solid #eef2f8;white-space:nowrap}.metric-table th{font-weight:600;color:#2b4469}.metric-table td.positive{color:#2e7d32}.metric-table td.negative{color:#c62828}
.error-card{padding:40px;text-align:center;color:#c62828}.error-card strong{display:block;margin-bottom:8px;font-size:20px}
.add-area{position:absolute;right:29px;bottom:26px;left:29px}.add-btn{width:100%;height:66px;border:0;border-radius:13px;background:#6670f0;box-shadow:0 14px 28px rgba(102,112,240,.18);color:#fff;font-size:24px;font-weight:500;letter-spacing:.04em}
@media (max-width:720px){.chart-card__labels span{font-size:10px}.stage-legend{gap:12px;font-size:14px}}
@media (max-width:389px){.latest-card-main{grid-template-columns:1fr}.sleep-stage-card{padding:16px}.sleep-stage-card__label{font-size:16px}.sleep-stage-card__value-row strong{font-size:20px}}
</style>
