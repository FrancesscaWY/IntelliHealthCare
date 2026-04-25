<script setup lang="ts">
import { computed, ref } from "vue";
import type { PageComponentProps } from "@ihc/page-core/types";
import mock from "./mock";

const props = defineProps<PageComponentProps>();

const selectedDate = ref<string>(mock.defaultDate);
const selectedStaff = ref<string>(mock.staffOptions[0]);
const selectedServiceType = ref<string>(mock.serviceTypeOptions[0]);

const startHour = mock.timeSlots[0];
const rowCount = mock.timeSlots.length - 1;
const hourLabels = mock.timeSlots.slice(0, -1);
const closingHour = mock.timeSlots[mock.timeSlots.length - 1];
const slotHeight = 148;
const minimumLaneCount = 4;

const filteredBookings = computed(() =>
  mock.bookings.filter((item) => {
    const matchesDate = item.date === selectedDate.value;
    const matchesStaff =
      selectedStaff.value === mock.staffOptions[0] || item.staffs.some((staffName) => staffName === selectedStaff.value);
    const matchesServiceType =
      selectedServiceType.value === mock.serviceTypeOptions[0] || item.serviceType === selectedServiceType.value;
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
  const activeLanes = new Set(filteredBookings.value.map((item) => item.lane));
  return activeLanes.size;
});

const totalServiceHours = computed(() =>
  filteredBookings.value.reduce((total, item) => total + item.endHour - item.startHour, 0),
);

const occupancyRate = computed(() => {
  const availableSlots = rowCount * laneCount.value;

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
  mock.serviceTypeOptions.slice(1).map((serviceType) => ({
    label: serviceType,
    count: filteredBookings.value.filter((item) => item.serviceType === serviceType).length,
  })),
);

const selectedDateLabel = computed(() => {
  const [year, month, day] = selectedDate.value.split("-");

  if (!year || !month || !day) {
    return selectedDate.value;
  }

  return `${year}年${month}月${day}日`;
});

const boardGridStyle = computed(() => ({
  gridTemplateRows: `repeat(${rowCount}, minmax(${slotHeight}px, ${slotHeight}px))`,
  gridTemplateColumns: `repeat(${laneCount.value}, minmax(170px, 1fr))`,
}));

function getBookingStyle(start: number, end: number, lane: number, laneSpan: number) {
  return {
    gridRow: `${start - startHour + 1} / span ${end - start}`,
    gridColumn: `${lane} / span ${laneSpan}`,
  };
}

function getCardAriaLabel(title: string, timeLabel: string, userName: string) {
  return `${title}，${timeLabel}，服务对象${userName}`;
}

function openBooking(title: string) {
  props.showToast(`查看预约：${title}`);
}
</script>

<template>
  <section class="booking-page">
    <article class="booking-hero">
      <div class="booking-hero__main">
        <div class="booking-hero__copy">
          <h1>{{ mock.title }}</h1>
          <p class="booking-hero__description">
            统一总览页的视觉语言，集中查看当日排班密度、服务状态与资源占用。
          </p>
          <div class="booking-hero__tags">
            <span>{{ selectedDateLabel }}</span>
            <span>{{ filteredBookings.length }} 项预约</span>
            <span>{{ occupiedLaneCount || 0 }} 条通道启用</span>
          </div>
        </div>

        <aside class="hero-highlight">
          <small>今日排班状态</small>
          <strong>{{ occupancyRate }}</strong>
          <p>时段占用率</p>
          <div class="hero-highlight__meta">
            <span>{{ totalServiceHours }} 小时服务量</span>
            <span>{{ laneCount }} 条排班通道</span>
          </div>
        </aside>
      </div>

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
              <option v-for="item in mock.staffOptions" :key="item" :value="item">{{ item }}</option>
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
              <option v-for="item in mock.serviceTypeOptions" :key="item" :value="item">{{ item }}</option>
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

    <section class="summary-grid" aria-label="预约摘要">
      <article v-for="item in summaryCards" :key="item.label" class="summary-card" :class="`summary-card--${item.tone}`">
        <div class="summary-card__halo" aria-hidden="true"></div>
        <p>{{ item.label }}</p>
        <strong>{{ item.value }}<small>{{ item.unit }}</small></strong>
        <span>{{ item.note }}</span>
      </article>
    </section>

    <article class="booking-panel booking-panel--board">
      <header class="panel-head">
        <div>
          <small>Timeline Board</small>
          <h2>当日预约时间轴</h2>
        </div>
        <p>{{ selectedDateLabel }} · 共 {{ filteredBookings.length }} 项预约</p>
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
          <div class="lane-strip" :style="{ gridTemplateColumns: `repeat(${laneCount}, minmax(170px, 1fr))` }">
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
.booking-page {
  --mint: #4fbf91;
  --green-deep: #1f7b70;
  --blue: #5aaef5;
  --rose: #ff7f98;
  --amber: #ffa63d;
  --slate: #253244;
  display: grid;
  gap: 16px;
  width: 100%;
  min-width: 0;
  color: #253244;
  font-family: "PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif;
}

.booking-hero,
.booking-panel,
.summary-card,
.lane-card,
.booking-card {
  border: 1px solid rgba(224, 240, 238, 0.86);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 8px 24px rgba(66, 122, 116, 0.08);
}

.booking-hero {
  position: relative;
  overflow: hidden;
  padding: 18px;
  background:
    radial-gradient(circle at top right, rgba(170, 235, 255, 0.34), transparent 26%),
    radial-gradient(circle at left top, rgba(102, 214, 174, 0.18), transparent 28%),
    linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(245, 251, 248, 0.96));
}

.booking-hero::after {
  content: "";
  position: absolute;
  right: -40px;
  top: -52px;
  width: 180px;
  height: 180px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(95, 224, 186, 0.22), rgba(95, 224, 186, 0));
  pointer-events: none;
}

.booking-hero__main {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) 240px;
  gap: 18px;
  align-items: stretch;
  margin-bottom: 18px;
}

.booking-hero__eyebrow {
  margin: 0 0 8px;
  color: #4f8a7b;
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.booking-hero h1 {
  margin: 0;
  color: #1f6f67;
  font-size: 28px;
  font-weight: 900;
  line-height: 1.15;
}

.booking-hero__description {
  max-width: 680px;
  margin: 12px 0 0;
  color: #5d6876;
  font-size: 14px;
  font-weight: 600;
}

.booking-hero__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 16px;
}

.booking-hero__tags span {
  padding: 8px 12px;
  border: 1px solid rgba(93, 188, 153, 0.18);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.72);
  color: #48606d;
  font-size: 12px;
  font-weight: 800;
}

.hero-highlight {
  position: relative;
  display: grid;
  align-content: center;
  gap: 6px;
  padding: 18px;
  border-radius: 10px;
  background: linear-gradient(145deg, #1f7b70, #5bc29d);
  color: #ffffff;
  overflow: hidden;
}

.hero-highlight::after {
  content: "";
  position: absolute;
  inset: auto -18px -28px auto;
  width: 96px;
  height: 96px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.12);
}

.hero-highlight small,
.hero-highlight p,
.hero-highlight span {
  position: relative;
  z-index: 1;
}

.hero-highlight small {
  font-size: 12px;
  font-weight: 800;
  opacity: 0.84;
}

.hero-highlight strong {
  position: relative;
  z-index: 1;
  font-size: 46px;
  font-weight: 900;
  line-height: 1;
}

.hero-highlight p {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  opacity: 0.9;
}

.hero-highlight__meta {
  display: grid;
  gap: 6px;
  margin-top: 10px;
}

.hero-highlight__meta span {
  font-size: 12px;
  font-weight: 700;
  opacity: 0.9;
}

.filter-shell {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
  padding: 14px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(12px);
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
  position: relative;
  z-index: 1;
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

.service-chip {
  display: inline-flex;
  gap: 8px;
  align-items: center;
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(237, 246, 242, 0.95);
  color: #50606d;
  font-size: 12px;
  font-weight: 800;
}

.service-chip strong {
  color: #1f6f67;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.summary-card {
  position: relative;
  overflow: hidden;
  min-height: 132px;
  padding: 18px;
}

.summary-card--mint {
  --tone: #4dbc8c;
}

.summary-card--rose {
  --tone: #ff7f98;
}

.summary-card--blue {
  --tone: #5aaef5;
}

.summary-card--amber {
  --tone: #ffa63d;
}

.summary-card__halo {
  position: absolute;
  right: -18px;
  top: -14px;
  width: 92px;
  height: 92px;
  border-radius: 50%;
  background: radial-gradient(circle, color-mix(in srgb, var(--tone) 18%, #ffffff), transparent 72%);
}

.summary-card p,
.summary-card strong,
.summary-card span {
  position: relative;
  z-index: 1;
}

.summary-card p {
  margin: 0;
  color: #55616f;
  font-size: 14px;
  font-weight: 900;
}

.summary-card strong {
  display: block;
  margin-top: 12px;
  color: var(--slate);
  font-size: 34px;
  font-weight: 900;
  line-height: 1;
}

.summary-card small {
  margin-left: 6px;
  color: #677483;
  font-size: 13px;
  font-weight: 900;
}

.summary-card span {
  display: inline-block;
  margin-top: 14px;
  color: var(--tone);
  font-size: 12px;
  font-weight: 900;
}

.booking-panel--board {
  padding: 18px;
}

.panel-head {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 16px;
}

.panel-head small {
  display: block;
  margin-bottom: 4px;
  color: #78a59b;
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.panel-head h2 {
  margin: 0;
  color: #1f6f67;
  font-size: 20px;
  font-weight: 900;
}

.panel-head p {
  margin: 0;
  color: #6a7684;
  font-size: 13px;
  font-weight: 800;
}

.timeline {
  display: grid;
  grid-template-columns: 86px minmax(0, 1fr);
  min-width: 0;
}

.timeline__sidebar {
  position: relative;
  display: grid;
  padding-top: 92px;
}

.timeline__spacer {
  position: absolute;
  top: 0;
  right: 12px;
  left: 0;
  height: 74px;
  border-radius: 10px;
  background: linear-gradient(180deg, rgba(239, 248, 244, 0.98), rgba(255, 255, 255, 0.8));
}

.timeline__label {
  display: flex;
  justify-content: flex-end;
  padding: 0 16px 0 0;
  color: #59707c;
  font-size: 13px;
  font-weight: 800;
}

.timeline__label span {
  margin-top: -10px;
}

.timeline__label--closing {
  position: absolute;
  right: 16px;
  bottom: -4px;
  padding-right: 0;
}

.timeline__content {
  min-width: 0;
}

.lane-strip {
  display: grid;
  gap: 12px;
  min-width: 0;
  margin-bottom: 12px;
}

.lane-card {
  display: grid;
  gap: 4px;
  min-height: 74px;
  padding: 14px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(246, 251, 248, 0.95));
}

.lane-card strong {
  color: #304152;
  font-size: 14px;
  font-weight: 900;
}

.lane-card p {
  margin: 0;
  color: #4d606d;
  font-size: 13px;
  font-weight: 800;
}

.lane-card span {
  color: #82909c;
  font-size: 12px;
  font-weight: 800;
}

.lane-card--amber {
  border-color: rgba(255, 194, 108, 0.28);
  background: linear-gradient(180deg, rgba(255, 248, 231, 0.98), rgba(255, 255, 255, 0.95));
}

.lane-card--green {
  border-color: rgba(79, 191, 145, 0.28);
  background: linear-gradient(180deg, rgba(238, 250, 245, 0.98), rgba(255, 255, 255, 0.95));
}

.lane-card--red {
  border-color: rgba(255, 126, 118, 0.28);
  background: linear-gradient(180deg, rgba(255, 241, 240, 0.98), rgba(255, 255, 255, 0.95));
}

.timeline__main {
  min-width: 0;
  overflow-x: auto;
}

.timeline__grid {
  position: relative;
  display: grid;
  grid-auto-flow: row dense;
  column-gap: 12px;
  min-width: 760px;
  padding: 6px 2px 2px;
}

.timeline__line {
  grid-column: 1 / -1;
  align-self: start;
  height: 1px;
  background: linear-gradient(90deg, rgba(220, 234, 229, 0.2), rgba(220, 234, 229, 1), rgba(220, 234, 229, 0.2));
}

.booking-card {
  position: relative;
  display: grid;
  align-content: start;
  gap: 12px;
  min-height: calc(100% - 8px);
  margin-top: 8px;
  padding: 14px;
  border-width: 1px;
  text-align: left;
  transition:
    transform 180ms ease,
    box-shadow 180ms ease,
    border-color 180ms ease;
}

.booking-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 16px 32px rgba(47, 86, 79, 0.14);
}

.booking-card--amber {
  border-color: rgba(255, 198, 92, 0.28);
  background: linear-gradient(180deg, rgba(255, 250, 238, 0.98), rgba(255, 255, 255, 0.98));
}

.booking-card--green {
  border-color: rgba(79, 191, 145, 0.28);
  background: linear-gradient(180deg, rgba(239, 251, 245, 0.98), rgba(255, 255, 255, 0.98));
}

.booking-card--red {
  border-color: rgba(255, 126, 118, 0.28);
  background: linear-gradient(180deg, rgba(255, 243, 241, 0.98), rgba(255, 255, 255, 0.98));
}

.booking-card__tags {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.booking-card__type,
.booking-card__status {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 900;
  white-space: nowrap;
}

.booking-card__type {
  background: rgba(255, 255, 255, 0.92);
  color: #546370;
  box-shadow: inset 0 0 0 1px rgba(222, 236, 232, 0.96);
}

.booking-card__status--amber {
  background: rgba(255, 214, 95, 0.16);
  color: #cc8b08;
}

.booking-card__status--green {
  background: rgba(57, 207, 157, 0.14);
  color: #13956b;
}

.booking-card__status--red {
  background: rgba(255, 126, 118, 0.14);
  color: #de5c53;
}

.booking-card__top strong {
  display: block;
  color: #2f3946;
  font-size: 16px;
  font-weight: 900;
  line-height: 1.25;
}

.booking-card__top p {
  margin: 1px 0 0;
  color: #6c7886;
  font-size: 12px;
  font-weight: 800;
}

.booking-card__meta {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1px;
}

.booking-card__meta-row {
  display: grid;
  gap: 0px;
  align-items: start;
  min-width: 0;
  padding: -1px 10px;
}

.booking-card__meta span {
  color: #8b98a4;
  font-size: 11px;
  font-weight: 800;
  line-height: 1.4;
}

.booking-card__meta strong {
  color: #40505f;
  font-size: 12px;
  font-weight: 800;
  line-height: 1.5;
  min-width: 0;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.booking-card__foot {
  display: flex;
  align-items: center;
  justify-content: flex-end;
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

@media (max-width: 1180px) {
  .booking-card__meta {
    grid-template-columns: 1fr;
  }
}

.timeline-empty {
  grid-column: 1 / -1;
  display: grid;
  place-items: center;
  gap: 6px;
  min-height: 260px;
  margin-top: 18px;
  border: 1px dashed rgba(151, 182, 172, 0.5);
  border-radius: 10px;
  background: linear-gradient(180deg, rgba(248, 252, 250, 0.98), rgba(255, 255, 255, 0.98));
  text-align: center;
}

.timeline-empty strong {
  color: #314353;
  font-size: 18px;
  font-weight: 900;
}

.timeline-empty p {
  margin: 0;
  color: #778390;
  font-size: 13px;
  font-weight: 700;
}

@media (max-width: 1400px) {
  .booking-hero__main {
    grid-template-columns: 1fr;
  }

  .summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .filter-shell {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 960px) {
  .filter-shell,
  .summary-grid {
    grid-template-columns: 1fr;
  }

  .timeline {
    grid-template-columns: 64px minmax(0, 1fr);
  }

  .timeline__sidebar {
    padding-top: 84px;
  }

  .timeline__label {
    padding-right: 8px;
    font-size: 12px;
  }

}
</style>
