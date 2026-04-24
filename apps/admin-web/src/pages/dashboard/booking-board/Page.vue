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

const startHour = computed(() => pageData.value.timeSlots[0] ?? 0);
const rowCount = computed(() => Math.max(pageData.value.timeSlots.length - 1, 0));
const hourLabels = computed(() => pageData.value.timeSlots.slice(0, -1));
const closingHour = computed(() => pageData.value.timeSlots[pageData.value.timeSlots.length - 1] ?? 0);
const slotHeight = 156;

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

function getBookingStyle(start: number, end: number, lane: number, laneSpan: number) {
  return {
    gridRow: `${start - startHour.value + 1} / span ${end - start}`,
    gridColumn: `${lane} / span ${laneSpan}`,
  };
}

function openBooking(title: string) {
  props.showToast(`查看预约：${title}`);
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
  <section class="booking-page">
    <article class="booking-panel booking-panel--filters">
      <header class="section-head">
        <span class="section-head__accent"></span>
        <h1>{{ pageData.title }}</h1>
      </header>

      <div class="filters">
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
    </article>

    <article class="booking-panel booking-panel--board">
      <div class="timeline">
        <div class="timeline__sidebar">
          <div
            v-for="time in hourLabels"
            :key="time"
            class="timeline__label"
            :style="{ minHeight: `${slotHeight}px` }"
          >
            {{ time }}:00
          </div>
          <div class="timeline__label timeline__label--closing">{{ closingHour }}:00</div>
        </div>

        <div class="timeline__main">
          <div
            class="timeline__grid"
            :style="{
              gridTemplateRows: `repeat(${rowCount}, minmax(${slotHeight}px, ${slotHeight}px))`,
            }"
          >
            <div
              v-for="index in rowCount"
              :key="`line-${index}`"
              class="timeline__line"
              :style="{ gridRow: `${index}` }"
            ></div>

            <button
              v-for="item in filteredBookings"
              :key="item.id"
              class="booking-card"
              :class="`booking-card--${item.tone}`"
              type="button"
              :style="getBookingStyle(item.startHour, item.endHour, item.lane, item.laneSpan)"
              @click="openBooking(item.title)"
            >
              <div class="booking-card__top">
                <strong>{{ item.title }}</strong>
              </div>
              <div class="booking-card__meta">
                <p>时间：{{ item.timeLabel }}</p>
                <p>用户：{{ item.userName }}</p>
              </div>
              <div class="booking-card__foot">
                <div class="booking-card__avatars">
                  <img v-for="avatar in item.avatars" :key="avatar" :src="avatar" :alt="item.title" />
                </div>
                <span :class="['booking-card__status', `booking-card__status--${item.tone}`]">{{ item.status }}</span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </article>
  </section>
</template>

<style scoped>
.booking-page {
  display: grid;
  gap: 14px;
  font-family: var(--admin-font-family);
  color: #2f3946;
  font-size: 13px;
  line-height: 1.45;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.booking-panel {
  border-radius: 16px;
  background: #ffffff;
  box-shadow: 0 6px 20px rgba(59, 103, 82, 0.05);
}

.booking-panel--filters {
  padding: 16px 18px;
}

.booking-panel--board {
  padding: 8px 0 12px;
  overflow: hidden;
}

.section-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 18px;
}

.section-head__accent {
  width: 6px;
  height: 28px;
  border-radius: 999px;
  background: #39cf9d;
}

.section-head h1 {
  margin: 0;
  color: #2f3946;
  font-size: 16px;
  font-weight: 600;
}

.filters {
  display: grid;
  grid-template-columns: 320px 340px 280px;
  gap: 18px 28px;
  align-items: end;
}

.field {
  display: grid;
  gap: 8px;
}

.field__label {
  color: #96a1ab;
  font-size: 12px;
}

.field__control {
  position: relative;
  display: flex;
  align-items: center;
  min-height: 42px;
  padding: 0 14px;
  border: 1px solid #e8eeeb;
  border-radius: 10px;
  background: #ffffff;
}

.field__control input,
.field__control select {
  width: 100%;
  border: 0;
  background: transparent;
  color: #44515d;
  font-size: 13px;
  outline: none;
}

.field__control--select select {
  appearance: none;
  padding-right: 20px;
}

.field__control svg {
  width: 18px;
  height: 18px;
  color: #c2c8ce;
}

.field__control--date svg,
.field__control--select svg {
  position: absolute;
  right: 14px;
}

.timeline {
  display: grid;
  grid-template-columns: 76px minmax(0, 1fr);
  min-width: 0;
}

.timeline__sidebar {
  position: relative;
  display: grid;
  padding-top: 46px;
}

.timeline__label {
  display: flex;
  align-items: flex-start;
  justify-content: flex-end;
  padding: 0 18px 0 0;
  color: #2f3946;
  font-size: 14px;
  font-weight: 500;
}

.timeline__label--closing {
  position: absolute;
  right: 18px;
  bottom: -2px;
  padding-right: 0;
}

.timeline__main {
  min-width: 0;
  padding-right: 18px;
  overflow-x: auto;
}

.timeline__grid {
  position: relative;
  display: grid;
  grid-template-columns: repeat(4, minmax(156px, 188px));
  grid-auto-flow: row dense;
  column-gap: 18px;
  min-width: 860px;
  padding-top: 42px;
}

.timeline__line {
  grid-column: 1 / -1;
  align-self: start;
  height: 1px;
  background: #edf1ee;
}

.booking-card {
  position: relative;
  display: grid;
  align-content: start;
  gap: 10px;
  margin-top: 6px;
  padding: 14px 16px 14px;
  border: 0;
  border-radius: 0;
  background: #fbfbfa;
  text-align: left;
  min-height: calc(100% - 6px);
}

.booking-card::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 5px;
}

.booking-card--amber::before {
  background: #ffd65f;
}

.booking-card--green::before {
  background: #39cf9d;
}

.booking-card--red::before {
  background: #ff7e76;
}

.booking-card__top strong {
  color: #2f3946;
  font-size: 13px;
  font-weight: 600;
}

.booking-card__meta {
  display: grid;
  gap: 4px;
}

.booking-card__meta p {
  margin: 0;
  color: #9ba5b0;
  font-size: 11px;
}

.booking-card__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: auto;
  padding-top: 8px;
}

.booking-card__avatars {
  display: flex;
  align-items: center;
  min-width: 0;
}

.booking-card__avatars img {
  width: 40px;
  height: 40px;
  margin-left: -8px;
  border: 2px solid #fbfbfa;
  border-radius: 50%;
  object-fit: cover;
  filter: grayscale(1);
}

.booking-card__avatars img:first-child {
  margin-left: 0;
}

.booking-card__status {
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
}

.booking-card__status--amber {
  color: #efbf54;
}

.booking-card__status--green {
  color: #39cf9d;
}

.booking-card__status--red {
  color: #ff7e76;
}

@media (max-width: 1400px) {
  .filters {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 960px) {
  .filters {
    grid-template-columns: 1fr;
  }

  .timeline {
    grid-template-columns: 58px minmax(0, 1fr);
  }

  .timeline__label {
    padding-right: 10px;
    font-size: 12px;
  }

  .timeline__grid {
    grid-template-columns: repeat(4, minmax(144px, 1fr));
  }
}
</style>
