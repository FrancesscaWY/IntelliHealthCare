<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import type { PageComponentProps } from "@ihc/page-core/types";
import { SetOff } from "@icon-park/vue-next";
import avatarImage from "@/assets/community/activities/people.png";
import { syncHealthDeviceItems } from "../device-center/state";
import mock from "./mock";
import { takeHealthDataBackTarget } from "./source";

const props = defineProps<PageComponentProps>();

const metricColorMap: Record<string, string> = {
  steps: "#66cfa7",
  heartRate: "#ff8a98",
  sleep: "#69d5d1",
  weight: "#9da7f2",
  bloodSugar: "#e9b957",
  bloodPressure: "#75a7f7",
  oxygen: "#56c9b3",
  stress: "#d9b46a",
};

type HealthDataItem = (typeof mock.list)[number];

const dataList = computed<HealthDataItem[]>(() => mock.list);
const latest = computed(() => dataList.value[dataList.value.length - 1]);
const previous = computed(() => dataList.value[dataList.value.length - 2] ?? latest.value);

const weightTrend = computed(() => {
  const weights = dataList.value.map((item) => item.weight);
  const current = latest.value.weight;
  const prev = previous.value.weight;

  if (weights.length < 2) {
    return {
      change: current - prev,
      isStable: true,
    };
  }

  const weightRange = Math.max(...weights) - Math.min(...weights);
  const dailyJump = Math.abs(current - prev);

  return {
    change: current - prev,
    isStable: weightRange <= 1.2 && dailyJump <= 0.8,
  };
});

const summaryCards = computed(() => {
  const current = latest.value;
  const prev = previous.value;

  return [
    {
      key: "steps",
      label: "步数",
      value: current.steps.toLocaleString(),
      unit: "步",
      change: current.steps - prev.steps,
      tone: current.steps >= 8000 ? "good" : "warn",
    },
    {
      key: "heartRate",
      label: "心率",
      value: `${current.heartRate}`,
      unit: "bpm",
      change: current.heartRate - prev.heartRate,
      tone: current.heartRate <= 80 ? "good" : "warn",
    },
    {
      key: "sleep",
      label: "睡眠",
      value: `${current.sleep}`,
      unit: "小时",
      change: current.sleep - prev.sleep,
      tone: current.sleep >= 7 ? "good" : "warn",
    },
    {
      key: "weight",
      label: "体重",
      value: `${current.weight}`,
      unit: "kg",
      change: weightTrend.value.change,
      tone: weightTrend.value.isStable ? "good" : "warn",
    },
    {
      key: "bloodSugar",
      label: "血糖",
      value: `${current.bloodSugar}`,
      unit: "mmol/L",
      change: current.bloodSugar - prev.bloodSugar,
      tone: current.bloodSugar <= 6 ? "good" : "warn",
    },
    {
      key: "bloodPressure",
      label: "血压",
      value: current.bloodPressure,
      unit: "mmHg",
      change: parseInt((current.bloodPressure as string).split('/')[0]) - parseInt((prev.bloodPressure as string).split('/')[0]),
      tone: parseInt((current.bloodPressure as string).split('/')[0]) <= 140 && parseInt((current.bloodPressure as string).split('/')[1]) <= 90 ? "good" : "warn",
    },
    {
      key: "oxygen",
      label: "血氧",
      value: `${current.oxygen}`,
      unit: "%",
      change: current.oxygen - prev.oxygen,
      tone: current.oxygen >= 95 ? "good" : "warn",
    },
    {
      key: "stress",
      label: "压力",
      value: `${current.stress}`,
      unit: "",
      change: current.stress - prev.stress,
      tone: current.stress <= 50 ? "good" : "warn",
    },
  ];
});

const healthScore = computed(() => {
  const current = latest.value;
  const stepScore = Math.min(100, Math.round((current.steps / 10000) * 100));
  const sleepScore = Math.min(100, Math.round((current.sleep / 8) * 100));
  const heartRateScore = Math.max(0, 100 - Math.max(0, current.heartRate - 70) * 4);

  return Math.round(stepScore * 0.45 + sleepScore * 0.3 + heartRateScore * 0.25);
});

const scoreLabel = computed(() => {
  if (healthScore.value >= 90) return "状态很稳";
  if (healthScore.value >= 75) return "状态良好";
  return "建议关注";
});

const addDevicePageId = "health/add-device-placeholder";
const deviceCount = ref(3);
const linkedDevices = ref([
  { id: "watch-alpha", name: "智能手表 A" },
  { id: "watch-beta", name: "智能手表 B" },
  { id: "watch-gamma", name: "智能手表 C" }
]);

const profileSummary = computed(() => ({
  name: "张爱清",
  avatar: avatarImage,
  age: 65,
  height: 172,
  weight: latest.value.weight.toFixed(1),
  deviceCount: deviceCount.value,
}));

const healthAlerts = computed(() =>
  summaryCards.value
    .filter((item) => item.key !== "bloodPressure")
    .filter((item) => item.tone === "warn")
    .slice(0, 2)
    .map((item) => `${item.label}偏高`)
);

const linkedDevicesFallback = [
  { id: "watch-alpha", name: "智能手表 A" },
  { id: "watch-beta", name: "智能手表 B" },
  { id: "watch-gamma", name: "智能手表 C" },
];

// sparkline
function createMiniSparkline(values: number[], stroke: string, width = 180, height = 82) {
  const padding = 6;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;
  const barWidth = Math.min(14, Math.max(8, innerWidth / Math.max(1, values.length * 1.6)));

  const pointList = values.map((v, i) => {
    const x = padding + (i * innerWidth) / Math.max(1, values.length - 1);
    const y = height - padding - ((v - min) / range) * innerHeight;
    return { x, y };
  });

  const points = pointList.map(p => `${p.x},${p.y}`).join(" ");
  const linePath = createSmoothPath(pointList);
  const areaPath = `${linePath} L ${width - padding} ${height - padding} L ${padding} ${height - padding} Z`;
  const areaPoints = `${points} ${width - padding},${height - padding} ${padding},${height - padding}`;
  const barRects = pointList.map(point => ({
    x: point.x - barWidth / 2,
    y: point.y,
    width: barWidth,
    height: height - padding - point.y,
  }));

  return { points, linePath, areaPath, areaPoints, pointList, barRects, width, height, stroke, padding };
};

function createSmoothPath(points: { x: number; y: number }[]) {
  if (!points.length) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  const smoothing = 0.18;
  const line = (a: { x: number; y: number }, b: { x: number; y: number }) => ({
    length: Math.hypot(b.x - a.x, b.y - a.y),
    angle: Math.atan2(b.y - a.y, b.x - a.x),
  });
  const control = (
    current: { x: number; y: number },
    previous?: { x: number; y: number },
    next?: { x: number; y: number },
    reverse = false,
  ) => {
    const p = previous ?? current;
    const n = next ?? current;
    const l = line(p, n);
    const angle = l.angle + (reverse ? Math.PI : 0);
    const length = l.length * smoothing;
    return {
      x: current.x + Math.cos(angle) * length,
      y: current.y + Math.sin(angle) * length,
    };
  };
  return points.reduce((path, point, index) => {
    if (!index) return `M ${point.x} ${point.y}`;
    const cps = control(points[index - 1], points[index - 2], point);
    const cpe = control(point, points[index - 1], points[index + 1], true);
    return `${path} C ${cps.x} ${cps.y}, ${cpe.x} ${cpe.y}, ${point.x} ${point.y}`;
  }, "");
}

const trendDataMap = computed(() => {
  const d = dataList.value;

  return {
    steps: { values: d.map(i => i.steps), stroke: metricColorMap.steps },
    heartRate: { values: d.map(i => i.heartRate), stroke: metricColorMap.heartRate },
    sleep: { values: d.map(i => i.sleep), stroke: metricColorMap.sleep },
    weight: { values: d.map(i => i.weight), stroke: metricColorMap.weight },
    bloodSugar: { values: d.map(i => i.bloodSugar), stroke: metricColorMap.bloodSugar },
    oxygen: { values: d.map(i => i.oxygen), stroke: metricColorMap.oxygen },
    bloodPressure: { values: d.map(i => parseInt((i.bloodPressure as string).split('/')[0])), stroke: metricColorMap.bloodPressure },
    stress: { values: d.map(i => i.stress), stroke: metricColorMap.stress },
  };
});

const compactMetricsList = computed(() => {
  const chartKeys = ["steps", "heartRate", "sleep", "weight", "bloodSugar", "oxygen", "bloodPressure", "stress"];

  return summaryCards.value.map(card => {
    let chartData = null;

    if (chartKeys.includes(card.key)) {
      const trend = trendDataMap.value[card.key as keyof typeof trendDataMap.value];
      chartData = card.key === "heartRate"
        ? createMiniSparkline(trend.values, trend.stroke, 300, 70)
        : createMiniSparkline(trend.values, trend.stroke, 300, 82);
    }

    return {
      ...card,
      chartData,
      color: metricColorMap[card.key] || "#c8d1df",
    };
  });
});

function getNavigateKey(key: string) {
  const map: Record<string, string> = {
    steps: "health/data-steps",
    heartRate: "health/data-heartrate",
    sleep: "health/data-sleep",
    weight: "health/data-weight",
    bloodSugar: "health/data-bloodglucose",
    oxygen: "health/data-spo2",
    bloodPressure: "health/data-bloodpressure",
    stress: "health/data-pressure",
  };
  return map[key];
}

function goBack() {
  if (props.navigation?.navigateBack?.()) {
    return;
  }

  const backTarget = takeHealthDataBackTarget();

  if (backTarget) {
    if (props.navigation?.reLaunch) {
      props.navigation.reLaunch(backTarget);
      return;
    }

    if (props.navigation?.navigateTo) {
      props.navigation.navigateTo(backTarget);
      return;
    }
  }

  props.navigation?.reLaunch?.("home/dashboard");
}

function goToAddDevice() {
  if (props.navigation?.navigateTo) {
    props.navigation.navigateTo(addDevicePageId);
  }
}

function getDeviceErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "设备列表加载失败，请稍后重试";
}

onMounted(() => {
  void syncHealthDeviceItems()
    .then((items) => {
      deviceCount.value = items.length;
      linkedDevices.value = items.slice(0, 4).map((item) => ({
        id: item.id,
        name: item.name
      }));
    })
    .catch((error) => {
      props.showToast(getDeviceErrorMessage(error));
    });
});
</script>

<template>
  <section class="health-data-page">
    <header class="medication-nav">
      <button class="back-btn" type="button" aria-label="返回" @click="goBack">
        <span class="back-arrow" aria-hidden="true"></span>
      </button>
      <h1>健康数据</h1>
    </header>

    <main class="medication-scroll">
      <section class="overview-card">
        <div class="overview-device">
          <div class="overview-profile">
            <img class="profile-avatar" :src="profileSummary.avatar" :alt="profileSummary.name" draggable="false" />
            <div class="profile-copy">
              <h2>{{ profileSummary.name }}</h2>
            </div>
            <div class="profile-alerts">
              <span v-for="alert in healthAlerts" :key="alert" class="profile-alert-chip">{{ alert }}</span>
            </div>
          </div>

          <div class="device-panel">
            <div class="device-stats">
              <div class="device-stat">
                <span>年龄</span>
                <strong>{{ profileSummary.age }}</strong>
              </div>
              <div class="device-stat">
                <span>身高</span>
                <strong>{{ profileSummary.height }}<small>cm</small></strong>
              </div>
              <div class="device-stat">
                <span>体重</span>
                <strong>{{ profileSummary.weight }}<small>kg</small></strong>
              </div>
            </div>

          </div>
        </div>
        <p class="device-panel__meta">已绑定{{ profileSummary.deviceCount }}个设备</p>
        <div class="device-list">
          <div v-for="device in linkedDevices" :key="device.id" class="device-tile" :title="device.name">
            <div class="device-watch">
              <span class="device-watch__screen"></span>
            </div>
          </div>

          <button class="device-tile device-tile--add" type="button" aria-label="添加设备" @click="goToAddDevice">
            <span class="device-plus" aria-hidden="true"></span>
          </button>
        </div>

        <div class="overview-copy">
          <span>最近 {{ dataList.length }} 天健康数据分析</span>
          <h2>健康评分</h2>
          <p>{{ scoreLabel }}</p>
        </div>
        <div class="overview-metrics">
          <strong>{{ healthScore }}</strong>
          <small>健康评分</small>
          <em>{{ scoreLabel }}</em>
        </div>
      </section>

      <section class="metric-card-list">
        <article
          v-for="item in compactMetricsList"
          :key="item.key"
          class="metric-card"
          :class="`metric-card--${item.key}`"
          :style="{ '--metric-color': item.color }"
        >
          <button class="metric-card-button" type="button" @click="props.navigation?.navigateTo(getNavigateKey(item.key))">
            <SetOff
              v-if="item.key === 'steps'"
              class="metric-card-corner-icon"
              theme="filled"
              size="34"
              fill="currentColor"
              aria-hidden="true"
            />

            <div class="metric-card-header">
              <div class="metric-card-label">
                <div>
                  <div class="metric-card-title">{{ item.label }}</div>
                  <div class="metric-card-subtitle">近10天趋势</div>
                </div>
              </div>
            </div>

            <div class="metric-card-value">
              <strong>{{ item.value }}</strong>
              <small>{{ item.unit }}</small>
            </div>

            <div class="metric-card-detail">
              <span class="metric-card-change" :class="item.tone">{{ item.change >= 0 ? `+${item.change}` : item.change }}</span>
              <span class="metric-card-status" :class="`metric-card-status--${item.tone}`">{{ item.tone === 'good' ? '状态正常' : '需要关注' }}</span>
            </div>

            <div class="metric-card-chart" v-if="item.chartData">
              <svg
                :viewBox="`0 0 ${item.chartData.width} ${item.chartData.height}`"
                :preserveAspectRatio="item.key === 'steps' ? 'none' : 'xMidYMid meet'"
              >
                <defs>
                  <linearGradient :id="`sparkline-${item.key}`" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" :stop-color="item.chartData.stroke" stop-opacity="0.24" />
                    <stop offset="100%" :stop-color="item.chartData.stroke" stop-opacity="0" />
                  </linearGradient>
                </defs>

                <g v-if="!['steps', 'heartRate'].includes(item.key)" class="metric-card-grid">
                  <line :x1="item.chartData.padding" :y1="item.chartData.height * 0.25" :x2="item.chartData.width - item.chartData.padding" :y2="item.chartData.height * 0.25" />
                  <line :x1="item.chartData.padding" :y1="item.chartData.height * 0.5" :x2="item.chartData.width - item.chartData.padding" :y2="item.chartData.height * 0.5" />
                  <line :x1="item.chartData.padding" :y1="item.chartData.height * 0.75" :x2="item.chartData.width - item.chartData.padding" :y2="item.chartData.height * 0.75" />
                </g>

                <path
                  v-if="item.key === 'steps'"
                  :d="item.chartData.areaPath"
                  :fill="`url(#sparkline-${item.key})`"
                  opacity="0.95"
                />

                <polygon
                  v-else-if="item.key !== 'heartRate'"
                  :points="item.chartData.areaPoints"
                  :fill="`url(#sparkline-${item.key})`"
                  opacity="0.95"
                />

                <path
                  v-if="item.key === 'steps'"
                  :d="item.chartData.linePath"
                  fill="none"
                  :stroke="item.chartData.stroke"
                  stroke-width="5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />

                <polyline
                  v-else
                  :points="item.chartData.points"
                  fill="none"
                  :stroke="item.chartData.stroke"
                  :stroke-width="item.key === 'heartRate' ? 3.5 : 3"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />

                <template v-if="item.key === 'heartRate'">
                  <g v-for="(point, index) in item.chartData.pointList" :key="`${item.key}-dot-${index}`">
                    <circle
                      :cx="point.x"
                      :cy="point.y"
                      :r="index === item.chartData.pointList.length - 1 ? 4.2 : 3.6"
                      fill="#ffffff"
                      :stroke="item.chartData.stroke"
                      stroke-width="2"
                    />
                  </g>
                </template>

                <template v-else-if="item.key !== 'steps'">
                  <g v-for="(point, index) in item.chartData.pointList" :key="`${item.key}-dot-${index}`">
                    <circle
                      :cx="point.x"
                      :cy="point.y"
                      :r="index === item.chartData.pointList.length - 1 ? 4.5 : 3.5"
                      fill="#ffffff"
                      :stroke="item.chartData.stroke"
                      stroke-width="2"
                    />
                  </g>
                </template>
              </svg>
            </div>
          </button>
        </article>
      </section>

      <p class="no-more">没有更多了</p>
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
    radial-gradient(circle at 82% 8%, rgba(117, 214, 223, 0.18) 0, rgba(117, 214, 223, 0) 28%),
    linear-gradient(180deg, #f1f8ff 0%, #f7f9fb 42%, #f5f6f7 100%);
  color: #252939;
  font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif;
  transform: translateX(-50%);
  -webkit-font-smoothing: antialiased;
  text-rendering: geometricPrecision;
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
  border-bottom: 3px solid #252939;
  border-left: 3px solid #252939;
  transform: rotate(45deg);
}

.medication-nav h1 {
  margin: 0 0 0 9px;
  color: #222733;
  font-size: 20px;
  font-weight: 900;
  letter-spacing: 0;
}

.medication-scroll {
  height: calc(100% - 74px);
  padding: 24px 20px 44px;
  overflow-y: auto;
  scrollbar-width: none;
}

.medication-scroll::-webkit-scrollbar {
  display: none;
}

.overview-card {
  position: relative;
  min-height: 350px;
  padding: 20px 18px 20px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.72);
  border-radius: 22px;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.96) 0%, rgba(239, 246, 255, 0.92) 48%, rgba(226, 252, 244, 0.88) 100%);
  box-shadow: 0 18px 42px rgba(72, 104, 148, 0.1);
}

.overview-card::after {
  position: absolute;
  right: -22px;
  bottom: -25px;
  width: 106px;
  height: 106px;
  content: "";
  border-radius: 50%;
  background: rgba(102, 112, 240, 0.08);
}

.overview-device {
  position: relative;
  z-index: 1;
  display: grid;
  gap: 10px;
}

.overview-profile {
  display: grid;
  grid-template-columns: 68px minmax(0, 1fr);
  align-items: center;
  column-gap: 14px;
  row-gap: 12px;
}

.profile-avatar {
  display: block;
  width: 76px;
  height: 76px;
  box-sizing: border-box;
  border: 2px solid rgba(255, 255, 255, 0.92);
  border-radius: 50%;
  object-fit: cover;
  box-shadow: 0 10px 18px rgba(54, 67, 92, 0.12);
  user-select: none;
}

.profile-copy h2 {
  margin: 0;
  color: #222733;
  font-size: 24px;
  font-weight: 900;
  letter-spacing: 0;
}

.profile-alerts {
  grid-column: 1 / -1;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.profile-alert-chip {
  display: inline-flex;
  align-items: center;
  min-height: 38px;
  padding: 0 16px;
  border: 1px solid rgba(255, 255, 255, 0.86);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.68);
  color: #8f95a2;
  font-size: 12px;
  font-weight: 800;
  backdrop-filter: blur(8px);
}

.profile-alert-chip--normal {
  color: #8f95a2;
}

.device-panel {
  padding: 22px 10px 10px;
  border: 1px solid rgba(255, 255, 255, 0.72);
  border-radius: 24px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.88) 0%, rgba(251, 251, 255, 0.96) 100%);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.65);
}

.device-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.device-stat {
  display: grid;
  justify-items: center;
  gap: 10px;
  padding: 10px 6px 12px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.62);
}

.device-stat span {
  color: #8f95a2;
  font-size: 12px;
  font-weight: 800;
}

.device-stat strong {
  color: #222733;
  font-size: 24px;
  font-weight: 900;
  line-height: 1;
}

.device-stat strong small {
  margin-left: 3px;
  color: #8f95a2;
  font-size: 12px;
  font-weight: 800;
}

.device-panel__meta {
  margin: 20px 0 0;
  color: #8f95a2;
  font-size: 13px;
  font-weight: 800;
}

.device-list {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-top: 18px;
}

.device-tile {
  display: grid;
  place-items: center;
  width: 100%;
  aspect-ratio: 1;
  padding: 0;
  border: 1px solid rgba(233, 236, 241, 0.9);
  border-radius: 16px;
  background: linear-gradient(180deg, #ffffff 0%, #f7f8fb 100%);
  box-shadow: 0 8px 16px rgba(74, 90, 120, 0.06);
}

.device-watch {
  position: relative;
  width: 30px;
  height: 40px;
  border-radius: 9px;
  background: linear-gradient(180deg, #171a21 0%, #353844 100%);
  box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.05);
}

.device-watch::before,
.device-watch::after {
  position: absolute;
  left: 50%;
  width: 16px;
  height: 8px;
  content: "";
  border-radius: 999px;
  background: linear-gradient(180deg, #1d2028 0%, #3a3d47 100%);
  transform: translateX(-50%);
}

.device-watch::before {
  top: -7px;
}

.device-watch::after {
  bottom: -7px;
}

.device-watch__screen {
  position: absolute;
  inset: 5px;
  border-radius: 6px;
  background:
    radial-gradient(circle at 32% 28%, rgba(255, 186, 96, 0.92), transparent 32%),
    radial-gradient(circle at 70% 68%, rgba(255, 119, 89, 0.9), transparent 34%),
    linear-gradient(135deg, #151820 0%, #2d3140 100%);
}

.device-tile--add {
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.device-tile--add:hover {
  transform: translateY(-1px);
  box-shadow: 0 10px 18px rgba(74, 90, 120, 0.1);
}

.device-plus {
  position: relative;
  width: 26px;
  height: 26px;
}

.device-plus::before,
.device-plus::after {
  position: absolute;
  top: 50%;
  left: 50%;
  content: "";
  background: #c6c8ce;
  transform: translate(-50%, -50%);
}

.device-plus::before {
  width: 24px;
  height: 3px;
  border-radius: 999px;
}

.device-plus::after {
  width: 3px;
  height: 24px;
  border-radius: 999px;
}

.overview-copy,
.overview-metrics {
  display: none;
}

.metric-card-list {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
  margin-top: 16px;
  padding-bottom: 6px;
}

.metric-card {
  --metric-color: #66cfa7;
  min-width: 0;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.76);
  border-radius: 28px;
  background:
    radial-gradient(circle at 86% 12%, color-mix(in srgb, var(--metric-color) 20%, transparent) 0, transparent 34%),
    linear-gradient(145deg, #ffffff 0%, color-mix(in srgb, var(--metric-color) 14%, #ffffff) 100%);
  box-shadow: 0 14px 28px rgba(82, 105, 148, 0.075);
}

.metric-card--steps {
  border-color: rgba(255, 255, 255, 0.8);
}

.metric-card--heartRate {
  border-color: rgba(255, 255, 255, 0.78);
}

.metric-card-button {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 118px) minmax(0, 1fr);
  grid-template-rows: auto auto auto;
  grid-template-areas:
    "header chart"
    "value chart"
    "detail chart";
  gap: 10px;
  width: 100%;
  min-height: 148px;
  height: 100%;
  padding: 18px 16px 14px;
  border: 0;
  background: transparent;
  color: #252939;
  text-align: left;
  cursor: pointer;
}

.metric-card-corner-icon {
  position: absolute;
  top: 24px;
  right: 18px;
  color: color-mix(in srgb, var(--metric-color) 34%, transparent);
  pointer-events: none;
}

.metric-card-header {
  grid-area: header;
  min-width: 0;
}

.metric-card-label {
  display: block;
}

.metric-card-title {
  color: #222733;
  font-size: 16px;
  font-weight: 900;
  letter-spacing: 0;
}

.metric-card-subtitle {
  margin-top: 5px;
  color: #8f95a2;
  font-size: 12px;
  font-weight: 800;
}

.metric-card-value {
  grid-area: value;
  display: flex;
  align-items: baseline;
  min-width: 0;
  gap: 5px;
  margin-top: 2px;
}

.metric-card-value strong {
  max-width: 100%;
  overflow: hidden;
  color: #222733;
  font-size: 30px;
  font-weight: 900;
  line-height: 1;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.metric-card-value small {
  color: #8f95a2;
  font-size: 12px;
  font-weight: 800;
  white-space: nowrap;
}

.metric-card--bloodPressure .metric-card-value strong {
  font-size: 25px;
}

.metric-card--bloodSugar .metric-card-value strong {
  font-size: 28px;
}

.metric-card-detail {
  grid-area: detail;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: space-between;
  min-width: 0;
  gap: 7px;
  color: #8f95a2;
  font-size: 12px;
}

.metric-card-change {
  font-weight: 800;
}

.metric-card-change.good {
  color: #39b98f;
}

.metric-card-change.warn {
  color: #de8b46;
}

.metric-card-status {
  justify-self: start;
  min-width: 58px;
  height: 24px;
  border-radius: 999px;
  padding: 0 9px;
  overflow: hidden;
  background: rgba(102, 207, 167, 0.14);
  color: #39a980;
  font-size: 11px;
  font-weight: 900;
  line-height: 24px;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.metric-card-status--good {
  background: rgba(102, 207, 167, 0.14);
  color: #39a980;
}

.metric-card-status--warn {
  background: rgba(233, 185, 87, 0.18);
  color: #b37a2f;
}

.metric-card-chart {
  grid-area: chart;
  width: 100%;
  height: 94px;
  align-self: center;
  padding: 0;
}

.metric-card-chart svg {
  width: 100%;
  height: 100%;
  overflow: visible;
}

.metric-card-grid line {
  stroke: rgba(116, 128, 150, 0.14);
  stroke-width: 1;
}

.metric-card--steps .metric-card-grid line,
.metric-card--heartRate .metric-card-grid line {
  stroke: rgba(116, 128, 150, 0.14);
}

.metric-card-chart polygon {
  opacity: 0.34;
  filter: none;
}

.metric-card--steps .metric-card-chart polygon,
.metric-card--heartRate .metric-card-chart polygon {
  opacity: 0.34;
  filter: none;
}

.metric-card-chart circle {
  transition: transform 0.2s ease;
}

.metric-card-chart circle:hover {
  transform: scale(1.2);
}

.metric-card-detail {
  color: #8f95a2;
}

.no-more {
  margin: 28px 0 0;
  color: #8f95a2;
  font-size: 12px;
  font-weight: 800;
  text-align: center;
}

@media (min-width: 561px) {
  .health-data-page {
    height: 844px;
    min-height: 844px;
  }
}

@media (max-width: 389px) {
  .medication-scroll {
    padding-right: 26px;
    padding-left: 26px;
  }

  .overview-card {
    min-height: 332px;
    padding-right: 14px;
    padding-left: 14px;
  }

  .profile-copy h2 {
    font-size: 22px;
  }

  .profile-alert-chip {
    min-height: 36px;
    padding-right: 12px;
    padding-left: 12px;
    font-size: 13px;
  }

  .device-panel {
    padding-top: 10px;
    padding-right: 8px;
    padding-left: 8px;
  }

  .device-stat span {
    font-size: 13px;
  }

  .device-stat strong {
    font-size: 21px;
  }

  .device-stat strong small {
    font-size: 14px;
  }

  .device-panel__meta {
    font-size: 15px;
  }

  .device-list {
    gap: 8px;
  }

  .metric-card-button {
    padding-right: 16px;
    padding-left: 16px;
  }

  .metric-card-header {
    gap: 10px;
  }

  .metric-card-title {
    font-size: 16px;
  }

  .metric-card-value strong {
    font-size: 28px;
  }
}
</style>
