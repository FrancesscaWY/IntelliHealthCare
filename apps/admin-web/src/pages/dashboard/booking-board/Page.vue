<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import type { PageComponentProps } from "@ihc/page-core/types";
import { getAdminBookingBoard } from "@/shared/api/dashboard";
import { handleAdminPageError } from "@/shared/api/error";
import mock from "./mock";

const props = defineProps<PageComponentProps>();
const pageData = ref<typeof mock>(mock);
const selectedDate = ref("");
const selectedStaff = ref(mock.staffOptions[0]);
const selectedServiceType = ref(mock.serviceTypeOptions[0]);

const slotHeight = 156;
const minimumLaneCount = 1;

function formatDateLabel(value: string) {
  const [year, month, day] = value.split("-");

  if (!year || !month || !day) {
    return value;
  }

  return `${year}年${month}月${day}日`;
}

const activeDateValue = computed(() => selectedDate.value || pageData.value.defaultDate);
const activeDateLabel = computed(() => formatDateLabel(activeDateValue.value));

const startHour = computed(() => pageData.value.timeSlots[0] ?? 0);
const rowCount = computed(() => Math.max(pageData.value.timeSlots.length - 1, 0));
const hourLabels = computed(() => pageData.value.timeSlots.slice(0, -1));
const closingHour = computed(() => pageData.value.timeSlots[pageData.value.timeSlots.length - 1] ?? 0);

const filteredBookings = computed(() =>
  pageData.value.bookings.filter((item) => {
    const matchesDate = !selectedDate.value || item.date === selectedDate.value;
    const matchesStaff =
      selectedStaff.value === pageData.value.staffOptions[0] || item.staffs.includes(selectedStaff.value);
    const matchesServiceType =
      selectedServiceType.value === pageData.value.serviceTypeOptions[0] || item.serviceType === selectedServiceType.value;
    return matchesDate && matchesStaff && matchesServiceType;
  }),
);

const laneCount = computed(() =>
  Math.max(
    minimumLaneCount,
    ...filteredBookings.value.map((item) => item.lane + item.laneSpan - 1),
  ),
);

const occupiedLaneCount = computed(() => {
  const activeLanes = new Set<number>();

  filteredBookings.value.forEach((item) => {
    for (let index = 0; index < item.laneSpan; index += 1) {
      activeLanes.add(item.lane + index);
    }
  });

  return activeLanes.size;
});

const totalServiceHours = computed(() =>
  filteredBookings.value.reduce((total, item) => total + item.endHour - item.startHour, 0),
);

const occupancyRate = computed(() => {
  const availableSlots = rowCount.value * laneCount.value;

  if (!availableSlots) {
    return "0%";
  }

  return `${Math.min(100, Math.round((totalServiceHours.value / availableSlots) * 100))}%`;
});

const summaryCards = computed(() => {
  const bookings = filteredBookings.value;
  const pendingCount = bookings.filter((item) => item.tone === "red").length;
  const servingCount = bookings.filter((item) => item.tone === "green").length;
  const finishedCount = bookings.filter((item) => item.tone === "amber").length;

  return [
    {
      label: "今日预约",
      value: String(bookings.length),
      unit: "项",
      note: "当前筛选结果",
      tone: "mint",
    },
    {
      label: "待服务",
      value: String(pendingCount),
      unit: "项",
      note: "待分发或即将开始",
      tone: "rose",
    },
    {
      label: "服务中",
      value: String(servingCount),
      unit: "项",
      note: "进行中的服务任务",
      tone: "blue",
    },
    {
      label: "已完成",
      value: String(finishedCount),
      unit: "项",
      note: "已闭环服务任务",
      tone: "amber",
    },
  ] as const;
});

const topMetricItems = computed(() => [
  ...summaryCards.value,
  {
    label: "排班利用率",
    value: occupancyRate.value,
    unit: "",
    note: `${occupiedLaneCount.value}/${laneCount.value} 通道已占用`,
    tone: "teal",
  },
]);

const spotlightItems = computed(() => [
  {
    label: "服务时长",
    value: `${totalServiceHours.value}`,
    unit: "小时",
    note: "按当前筛选累计排班时长",
    tone: "mint",
    meta: `${filteredBookings.value.length} 项预约参与排班`,
  },
  {
    label: "排班通道",
    value: `${occupiedLaneCount.value}/${laneCount.value}`,
    unit: "通道",
    note: "当前在用通道 / 可用通道",
    tone: "blue",
    meta: `时间范围 ${startHour.value}:00-${closingHour.value}:00`,
  },
]);

const laneSummaries = computed(() =>
  Array.from({ length: laneCount.value }, (_, index) => {
    const lane = index + 1;
    const laneBookings = filteredBookings.value.filter((item) => item.lane === lane);
    const laneHours = laneBookings.reduce((total, item) => total + item.endHour - item.startHour, 0);
    const dominantTone = laneBookings[0]?.tone;

    return {
      lane,
      title: `排班通道 ${String(lane).padStart(2, "0")}`,
      bookingCount: laneBookings.length,
      laneHours,
      status: laneBookings.length ? `${laneHours} 小时已排班` : "当前空闲",
      toneClass: dominantTone ? `lane-card--${dominantTone}` : "",
    };
  }),
);

const serviceTypeChips = computed(() =>
  pageData.value.serviceTypeOptions.slice(1).map((serviceType) => ({
    label: serviceType,
    count: filteredBookings.value.filter((item) => item.serviceType === serviceType).length,
  })),
);

const boardGridStyle = computed(() => ({
  gridTemplateRows: `repeat(${rowCount.value}, minmax(${slotHeight}px, ${slotHeight}px))`,
  gridTemplateColumns: `repeat(${laneCount.value}, minmax(190px, 1fr))`,
}));

const filterTags = computed(() => [
  `日期：${activeDateLabel.value}`,
  `服务人员：${selectedStaff.value}`,
  `服务类型：${selectedServiceType.value}`,
]);

function getBookingStyle(start: number, end: number, lane: number, laneSpan: number) {
  return {
    gridRow: `${start - startHour.value + 1} / span ${end - start}`,
    gridColumn: `${lane} / span ${laneSpan}`,
  };
}

function getCardAriaLabel(title: string, timeLabel: string, userName: string) {
  return `${title}，${timeLabel}，服务对象${userName}`;
}

function openBooking(title: string) {
  props.showToast(`查看预约：${title}`);
}

function triggerAction(label: string) {
  props.showToast(`${label}为演示状态。`);
}

async function syncPageData(query: {
  date?: string;
  serviceType?: string;
} = {}) {
  try {
    pageData.value = (await getAdminBookingBoard(query)) as typeof mock;
  } catch (error) {
    handleAdminPageError(error, {
      navigation: props.navigation,
      showToast: props.showToast,
      fallbackMessage: "预约看板加载失败，已回退到演示数据",
    });
  }

  if (!selectedDate.value) {
    selectedDate.value = pageData.value.defaultDate;
  }

  if (!pageData.value.staffOptions.includes(selectedStaff.value)) {
    selectedStaff.value = pageData.value.staffOptions[0];
  }

  if (!pageData.value.serviceTypeOptions.includes(selectedServiceType.value)) {
    selectedServiceType.value = pageData.value.serviceTypeOptions[0];
  }
}

watch([selectedDate, selectedServiceType], ([date, serviceType], previousValues) => {
  if (!date) {
    return;
  }

  if (previousValues && date === previousValues[0] && serviceType === previousValues[1]) {
    return;
  }

  void syncPageData({
    date,
    serviceType:
      serviceType && serviceType !== pageData.value.serviceTypeOptions[0] ? serviceType : undefined,
  });
});

onMounted(() => {
  void syncPageData();
});
</script>

<template>
  <section class="booking-overview-page">
    <article class="trade-hero">
      <div class="trade-hero__main">
        <div class="trade-hero__copy">
          <h1>{{ pageData.title }}</h1>
          <p class="trade-hero__description">
            统一查看预约排班、服务状态与通道占用，让预约看板和概况页保持同一套清爽的医疗运营视觉。
          </p>

          <div class="trade-hero__tags">
            <span v-for="item in filterTags" :key="item">{{ item }}</span>
          </div>
        </div>

        <button class="date-range date-range--hero" type="button" @click="triggerAction('日期筛选')">
          <span class="date-range__label">当前排班日期</span>
          <strong>{{ activeDateLabel }}</strong>
          <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
            <path d="M7 3v3M17 3v3M4 9h16M6 6h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z" />
          </svg>
        </button>
      </div>
    </article>

    <section class="metrics-panel" aria-label="预约核心指标">
      <header class="metrics-panel__head">
        <h2>预约核心指标</h2>
      </header>

      <div class="metric-grid metric-grid--booking">
        <article
          v-for="item in topMetricItems"
          :key="item.label"
          class="metric-card"
          :class="`metric-card--${item.tone}`"
        >
          <div class="metric-copy">
            <strong>
              {{ item.value }}
              <small v-if="item.unit">{{ item.unit }}</small>
            </strong>
            <h2>{{ item.label }}</h2>
            <p>{{ item.note }}</p>
          </div>
        </article>
      </div>

      <div class="spotlight-grid spotlight-grid--booking">
        <article
          v-for="item in spotlightItems"
          :key="item.label"
          class="spotlight-card"
          :class="`spotlight-card--${item.tone}`"
        >
          <div class="spotlight-card__copy">
            <span>{{ item.label }}</span>
            <strong>
              {{ item.value }}
              <small>{{ item.unit }}</small>
            </strong>
            <p>{{ item.note }}</p>
          </div>
          <div class="spotlight-card__meta">{{ item.meta }}</div>
        </article>
      </div>
    </section>

    <section class="booking-grid">
      <article class="panel filter-panel">
        <header class="panel-head panel-head--between">
          <div>
            <h2>排班筛选 <small>（条件视图）</small></h2>
            <p class="panel-subtitle">按日期、服务人员和服务类型切换预约安排</p>
          </div>
          <button class="ghost-button" type="button" @click="triggerAction('导出排班')">导出排班</button>
        </header>

        <div class="filter-shell">
          <label class="field">
            <span class="field__label">选择日期</span>
            <div class="field__control field__control--date">
              <input v-model="selectedDate" type="date" />
              <svg viewBox="0 0 18 18" focusable="false" aria-hidden="true">
                <rect x="2.5" y="3.5" width="13" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="1.6" />
                <path d="M5.5 2.5v3M12.5 2.5v3M2.5 7.5h13" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.6" />
              </svg>
            </div>
          </label>

          <label class="field">
            <span class="field__label">服务人员</span>
            <div class="field__control field__control--select">
              <select v-model="selectedStaff">
                <option v-for="item in pageData.staffOptions" :key="item" :value="item">{{ item }}</option>
              </select>
              <svg viewBox="0 0 16 16" focusable="false" aria-hidden="true">
                <path d="m3 6 5 5 5-5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.7" />
              </svg>
            </div>
          </label>

          <label class="field">
            <span class="field__label">服务类型</span>
            <div class="field__control field__control--select">
              <select v-model="selectedServiceType">
                <option v-for="item in pageData.serviceTypeOptions" :key="item" :value="item">{{ item }}</option>
              </select>
              <svg viewBox="0 0 16 16" focusable="false" aria-hidden="true">
                <path d="m3 6 5 5 5-5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.7" />
              </svg>
            </div>
          </label>
        </div>

        <div class="service-distribution">
          <span class="service-distribution__label">服务分布</span>
          <div class="service-distribution__chips">
            <span v-for="item in serviceTypeChips" :key="item.label" class="service-chip">
              {{ item.label }}
              <strong>{{ item.count }}</strong>
            </span>
          </div>
        </div>
      </article>

      <article class="panel lane-panel">
        <header class="panel-head">
          <div>
            <h2>排班通道概览 <small>（资源状态）</small></h2>
            <p class="panel-subtitle">每个通道的预约数量与排班时长</p>
          </div>
        </header>

        <div class="lane-grid">
          <article
            v-for="lane in laneSummaries"
            :key="lane.lane"
            class="lane-card"
            :class="lane.toneClass"
          >
            <strong>{{ lane.title }}</strong>
            <p>{{ lane.bookingCount }} 项预约</p>
            <span>{{ lane.status }}</span>
          </article>
        </div>
      </article>
    </section>

    <article class="panel board-panel">
      <header class="panel-head panel-head--between">
        <div>
          <h2>当日预约时间轴 <small>（服务排班）</small></h2>
          <p class="panel-subtitle">{{ activeDateLabel }} · 共 {{ filteredBookings.length }} 项预约</p>
        </div>

        <div class="board-caption">
          <span>{{ selectedStaff }}</span>
          <span>{{ selectedServiceType }}</span>
        </div>
      </header>

      <div class="timeline">
        <div class="timeline__sidebar">
          <div class="timeline__spacer"></div>
          <div
            v-for="time in hourLabels"
            :key="time"
            class="timeline__label"
            :style="{ minHeight: `${slotHeight}px` }"
          >
            <span>{{ time }}:00</span>
          </div>
          <div class="timeline__label timeline__label--closing">
            <span>{{ closingHour }}:00</span>
          </div>
        </div>

        <div class="timeline__content">
          <div class="timeline__main">
            <div class="timeline__grid" :style="boardGridStyle">
              <div
                v-for="index in rowCount"
                :key="`line-${index}`"
                class="timeline__line"
                :style="{ gridRow: `${index}` }"
              ></div>

              <template v-if="filteredBookings.length">
                <button
                  v-for="item in filteredBookings"
                  :key="item.id"
                  class="booking-card"
                  :class="`booking-card--${item.tone}`"
                  type="button"
                  :style="getBookingStyle(item.startHour, item.endHour, item.lane, item.laneSpan)"
                  :aria-label="getCardAriaLabel(item.title, item.timeLabel, item.userName)"
                  @click="openBooking(item.title)"
                >
                  <div class="booking-card__tags">
                    <span class="booking-card__type">{{ item.serviceType }}</span>
                    <span :class="['booking-card__status', `booking-card__status--${item.tone}`]">{{ item.status }}</span>
                  </div>

                  <div class="booking-card__top">
                    <strong>{{ item.title }}</strong>
                    <p>{{ item.timeLabel }}</p>
                  </div>

                  <div class="booking-card__meta">
                    <div class="booking-card__meta-row">
                      <span>服务对象</span>
                      <strong>{{ item.userName }}</strong>
                    </div>
                    <div class="booking-card__meta-row">
                      <span>服务人员</span>
                      <strong>{{ item.staffs.join(" / ") }}</strong>
                    </div>
                  </div>

                  <div class="booking-card__foot">
                    <div class="booking-card__avatars">
                      <img v-for="avatar in item.avatars" :key="avatar" :src="avatar" :alt="item.title" />
                    </div>
                    <em>点击查看详情</em>
                  </div>
                </button>
              </template>

              <div v-else class="timeline-empty">
                <strong>当前筛选条件下暂无预约</strong>
                <p>可以切换日期、人员或服务类型，继续查看其它排班安排。</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </article>
  </section>
</template>

<style scoped>
.booking-overview-page {
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
.spotlight-card,
.panel,
.lane-card,
.booking-card {
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
  max-width: 680px;
  margin: 12px 0 0;
  color: #5d6876;
  font-size: 14px;
  font-weight: 600;
}

.trade-hero__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 16px;
}

.trade-hero__tags span {
  padding: 8px 12px;
  border: 1px solid rgba(93, 188, 153, 0.18);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.72);
  color: #48606d;
  font-size: 12px;
  font-weight: 800;
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
  min-width: 288px;
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
.ghost-button svg {
  width: 18px;
  height: 18px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.metrics-panel,
.panel {
  padding: 16px;
}

.metrics-panel__head,
.panel-head {
  margin-bottom: 12px;
}

.metrics-panel__head h2,
.panel-head h2 {
  margin: 0;
  color: #1f6f67;
  font-size: 18px;
  font-weight: 900;
  line-height: 1.2;
}

.panel-head small {
  color: #7b8a94;
  font-size: 12px;
  font-weight: 800;
}

.panel-head--between {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.panel-subtitle {
  margin: 6px 0 0;
  color: #7b8994;
  font-size: 12px;
  font-weight: 700;
}

.metric-grid {
  display: grid;
  gap: 12px;
}

.metric-grid--booking {
  grid-template-columns: repeat(5, minmax(0, 1fr));
}

.metric-card {
  position: relative;
  min-height: 102px;
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

.metric-card--mint {
  --tone: #4dbc8c;
}

.metric-card--blue {
  --tone: #5aaef5;
}

.metric-card--rose {
  --tone: #ff7f98;
}

.metric-card--amber {
  --tone: #ffa63d;
}

.metric-card--teal {
  --tone: #43bfa8;
}

.metric-copy {
  position: relative;
  z-index: 1;
}

.metric-copy strong {
  display: flex;
  align-items: baseline;
  gap: 4px;
  color: #263244;
  font-size: 32px;
  font-weight: 900;
  line-height: 1;
}

.metric-copy small {
  font-size: 12px;
  font-weight: 800;
  color: #88949f;
}

.metric-copy h2 {
  margin: 8px 0 0;
  color: #55616f;
  font-size: 13px;
  font-weight: 900;
}

.metric-copy p {
  margin: 8px 0 0;
  color: #88949f;
  font-size: 12px;
  font-weight: 700;
}

.spotlight-grid {
  display: grid;
  gap: 12px;
  margin-top: 12px;
}

.spotlight-grid--booking {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.spotlight-card {
  position: relative;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  min-height: 128px;
  padding: 18px;
  overflow: hidden;
}

.spotlight-card::after {
  content: "";
  position: absolute;
  right: -18px;
  top: -18px;
  width: 110px;
  height: 110px;
  border-radius: 50%;
  opacity: 0.2;
  background: radial-gradient(circle, #ffffff, transparent 68%);
}

.spotlight-card--mint {
  background: linear-gradient(135deg, rgba(82, 192, 154, 0.18), rgba(255, 255, 255, 0.96));
}

.spotlight-card--blue {
  background: linear-gradient(135deg, rgba(90, 174, 245, 0.16), rgba(255, 255, 255, 0.96));
}

.spotlight-card__copy,
.spotlight-card__meta {
  position: relative;
  z-index: 1;
}

.spotlight-card__copy span {
  display: block;
  color: #4f8a7b;
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.spotlight-card__copy strong {
  display: flex;
  align-items: baseline;
  gap: 4px;
  margin-top: 10px;
  color: #263244;
  font-size: 34px;
  font-weight: 900;
  line-height: 1;
}

.spotlight-card__copy small {
  font-size: 12px;
  font-weight: 800;
  color: #7f8d98;
}

.spotlight-card__copy p {
  margin: 10px 0 0;
  color: #64727d;
  font-size: 13px;
  font-weight: 700;
}

.spotlight-card__meta {
  max-width: 150px;
  color: #5f6f7a;
  font-size: 12px;
  font-weight: 800;
  line-height: 1.6;
  text-align: right;
}

.booking-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.85fr);
  gap: 16px;
}

.ghost-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 40px;
  padding: 0 14px;
  border: 1px solid rgba(218, 236, 231, 0.95);
  border-radius: 12px;
  background: #ffffff;
  color: #45616f;
  font-size: 12px;
  font-weight: 800;
}

.filter-shell {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
  padding: 14px;
  border-radius: 10px;
  background: linear-gradient(135deg, rgba(248, 252, 250, 0.98), rgba(240, 248, 245, 0.92));
}

.field {
  display: grid;
  gap: 8px;
}

.field__label {
  color: #6d7b87;
  font-size: 12px;
  font-weight: 800;
}

.field__control {
  position: relative;
  display: flex;
  align-items: center;
  min-height: 46px;
  padding: 0 14px;
  border: 1px solid rgba(218, 236, 231, 0.95);
  border-radius: 10px;
  background: #ffffff;
  transition:
    border-color 180ms ease,
    box-shadow 180ms ease,
    transform 180ms ease;
}

.field__control:focus-within {
  border-color: rgba(79, 191, 145, 0.54);
  box-shadow: 0 0 0 4px rgba(79, 191, 145, 0.12);
  transform: translateY(-1px);
}

.field__control input,
.field__control select {
  width: 100%;
  border: 0;
  background: transparent;
  color: #42505e;
  font-size: 13px;
  font-weight: 700;
  outline: none;
}

.field__control--select select {
  appearance: none;
  padding-right: 20px;
}

.field__control svg {
  width: 18px;
  height: 18px;
  color: #a3b0b8;
}

.field__control--date svg,
.field__control--select svg {
  position: absolute;
  right: 14px;
}

.service-distribution {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  margin-top: 14px;
}

.service-distribution__label {
  color: #4d8a79;
  font-size: 12px;
  font-weight: 900;
}

.service-distribution__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.service-chip,
.board-caption span {
  display: inline-flex;
  gap: 8px;
  align-items: center;
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(238, 248, 244, 0.92);
  color: #4b6671;
  font-size: 12px;
  font-weight: 800;
}

.service-chip strong {
  color: #1f6f67;
}

.lane-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.lane-card {
  position: relative;
  display: grid;
  gap: 6px;
  min-height: 108px;
  padding: 16px;
  overflow: hidden;
}

.lane-card::after {
  content: "";
  position: absolute;
  inset: auto -24px -24px auto;
  width: 94px;
  height: 94px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.24), transparent 72%);
}

.lane-card strong,
.lane-card p,
.lane-card span {
  position: relative;
  z-index: 1;
}

.lane-card strong {
  color: #243141;
  font-size: 15px;
  font-weight: 900;
}

.lane-card p {
  margin: 0;
  color: #51616d;
  font-size: 13px;
  font-weight: 800;
}

.lane-card span {
  color: #7c8b96;
  font-size: 12px;
  font-weight: 700;
}

.lane-card--green {
  background: linear-gradient(135deg, rgba(91, 194, 157, 0.2), rgba(255, 255, 255, 0.96));
}

.lane-card--amber {
  background: linear-gradient(135deg, rgba(255, 178, 90, 0.22), rgba(255, 255, 255, 0.96));
}

.lane-card--red {
  background: linear-gradient(135deg, rgba(255, 135, 154, 0.2), rgba(255, 255, 255, 0.96));
}

.board-panel {
  overflow: hidden;
}

.board-caption {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
}

.timeline {
  display: grid;
  grid-template-columns: 88px minmax(0, 1fr);
  gap: 14px;
}

.timeline__sidebar {
  display: grid;
  grid-template-rows: 68px repeat(auto-fit, minmax(0, 1fr)) 24px;
}

.timeline__spacer {
  min-height: 68px;
}

.timeline__label {
  position: relative;
  display: flex;
  align-items: flex-start;
  justify-content: flex-end;
  padding-top: 8px;
}

.timeline__label span {
  color: #7c8a95;
  font-size: 12px;
  font-weight: 800;
}

.timeline__label--closing {
  align-items: flex-end;
}

.timeline__content {
  min-width: 0;
}

.timeline__main {
  overflow-x: auto;
  padding-bottom: 4px;
}

.timeline__grid {
  position: relative;
  display: grid;
  gap: 12px;
  min-width: max-content;
  padding: 14px;
  border-radius: 14px;
  background:
    linear-gradient(180deg, rgba(248, 252, 250, 0.96), rgba(241, 248, 245, 0.9)),
    #ffffff;
}

.timeline__line {
  grid-column: 1 / -1;
  align-self: end;
  border-top: 1px dashed rgba(188, 212, 205, 0.9);
  pointer-events: none;
}

.booking-card {
  position: relative;
  display: grid;
  align-content: start;
  gap: 14px;
  min-width: 0;
  padding: 16px;
  text-align: left;
  cursor: pointer;
  transition:
    transform 180ms ease,
    box-shadow 180ms ease;
}

.booking-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 14px 34px rgba(66, 122, 116, 0.14);
}

.booking-card--green {
  background: linear-gradient(135deg, rgba(84, 201, 180, 0.18), rgba(255, 255, 255, 0.96));
}

.booking-card--amber {
  background: linear-gradient(135deg, rgba(255, 191, 102, 0.22), rgba(255, 255, 255, 0.96));
}

.booking-card--red {
  background: linear-gradient(135deg, rgba(255, 138, 156, 0.18), rgba(255, 255, 255, 0.96));
}

.booking-card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.booking-card__type,
.booking-card__status {
  display: inline-flex;
  align-items: center;
  min-height: 26px;
  padding: 0 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 900;
}

.booking-card__type {
  background: rgba(255, 255, 255, 0.9);
  color: #2a6156;
}

.booking-card__status {
  color: #ffffff;
}

.booking-card__status--green {
  background: #39b98a;
}

.booking-card__status--amber {
  background: #f0aa48;
}

.booking-card__status--red {
  background: #f36c87;
}

.booking-card__top strong {
  display: block;
  color: #263244;
  font-size: 17px;
  font-weight: 900;
  line-height: 1.3;
}

.booking-card__top p {
  margin: 6px 0 0;
  color: #6f7d89;
  font-size: 12px;
  font-weight: 800;
}

.booking-card__meta {
  display: grid;
  gap: 10px;
}

.booking-card__meta-row {
  display: grid;
  gap: 4px;
}

.booking-card__meta-row span {
  color: #8b98a4;
  font-size: 11px;
  font-weight: 800;
}

.booking-card__meta-row strong {
  color: #40505f;
  font-size: 13px;
  font-weight: 800;
  line-height: 1.4;
}

.booking-card__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: auto;
  padding-top: 8px;
  border-top: 1px solid rgba(227, 237, 233, 0.94);
}

.booking-card__foot em {
  color: #82909c;
  font-size: 11px;
  font-style: normal;
  font-weight: 800;
}

.booking-card__avatars {
  display: flex;
  align-items: center;
  min-width: 0;
}

.booking-card__avatars img {
  width: 34px;
  height: 34px;
  margin-left: -8px;
  border: 2px solid #ffffff;
  border-radius: 50%;
  object-fit: cover;
}

.booking-card__avatars img:first-child {
  margin-left: 0;
}

.timeline-empty {
  grid-column: 1 / -1;
  display: grid;
  place-items: center;
  min-height: 280px;
  padding: 24px;
  border: 1px dashed rgba(190, 214, 207, 0.92);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.78);
  text-align: center;
}

.timeline-empty strong {
  color: #2d3d49;
  font-size: 16px;
  font-weight: 900;
}

.timeline-empty p {
  margin: 10px 0 0;
  color: #7b8994;
  font-size: 13px;
  font-weight: 700;
}

@media (max-width: 1280px) {
  .metric-grid--booking,
  .spotlight-grid--booking,
  .lane-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .booking-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 920px) {
  .trade-hero__main,
  .panel-head--between {
    flex-direction: column;
  }

  .date-range--hero {
    width: 100%;
    min-width: 0;
  }

  .metric-grid--booking,
  .spotlight-grid--booking,
  .filter-shell,
  .lane-grid {
    grid-template-columns: 1fr;
  }

  .board-caption {
    justify-content: flex-start;
  }

  .timeline {
    grid-template-columns: 1fr;
  }

  .timeline__sidebar {
    display: none;
  }
}
</style>
