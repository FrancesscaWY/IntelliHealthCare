<script setup lang="ts">
import { computed, ref } from "vue";
import type { PageComponentProps } from "@ihc/page-core/types";
import { createHistoryData, type HistoryMonthOption, type HistoryViewKey } from "./mock";
import { getDietRecordDays } from "../state";

const props = defineProps<PageComponentProps>();

const historyData = createHistoryData(getDietRecordDays());
const activeView = ref<HistoryViewKey>("day");
const activeYear = ref(historyData.years[historyData.years.length - 1]?.value ?? new Date().getFullYear());
const activeDateId = ref(historyData.selectedDateId);
const activeMonthId = ref(
  historyData.selectedDateId ? historyData.selectedDateId.slice(0, 7) : historyData.months[historyData.months.length - 1]?.id ?? "",
);

const visibleMonths = computed(() => historyData.months.filter((item) => item.year === activeYear.value));
const visibleMonthOptions = computed(() => historyData.monthOptions.filter((item) => item.year === activeYear.value));

function goBack() {
  if (!props.navigation.navigateBack()) {
    props.navigation.reLaunch("diet-record");
  }
}

function switchView(view: HistoryViewKey) {
  activeView.value = view;
}

function selectDate(dateId: string | null) {
  if (!dateId) {
    return;
  }

  activeDateId.value = dateId;
  activeMonthId.value = dateId.slice(0, 7);
}

function openMonth(month: HistoryMonthOption) {
  activeYear.value = month.year;
  activeMonthId.value = month.id;

  const firstRecordedDate = historyData.months
    .find((item) => item.id === month.id)
    ?.cells.find((item) => item.dateId && item.isRecorded)?.dateId;

  if (firstRecordedDate) {
    activeDateId.value = firstRecordedDate;
  }

  activeView.value = "day";
}

function openYear(year: number) {
  activeYear.value = year;
  activeView.value = "month";
}
</script>

<template>
  <section class="history-page">
    <header class="history-header">
      <button class="back-btn" type="button" aria-label="返回" @click="goBack">
        <span class="back-arrow" aria-hidden="true"></span>
      </button>
      <h1>{{ historyData.title }}</h1>
      <span class="header-spacer" aria-hidden="true"></span>
    </header>

    <main class="history-content">
      <nav class="view-tabs" aria-label="历史数据视图">
        <button
          v-for="item in historyData.viewOptions"
          :key="item.key"
          type="button"
          class="view-tab"
          :class="{ 'view-tab--active': activeView === item.key }"
          @click="switchView(item.key)"
        >
          {{ item.label }}
        </button>
      </nav>

      <section v-if="activeView === 'day'" class="day-view">
        <article v-for="month in visibleMonths" :key="month.id" class="month-section">
          <h2>{{ month.label }}</h2>

          <div class="month-card">
            <div class="week-row">
              <span v-for="label in historyData.weekLabels" :key="label" class="week-cell">
                {{ label }}
              </span>
            </div>

            <div class="day-grid">
              <button
                v-for="cell in month.cells"
                :key="cell.key"
                type="button"
                class="day-cell"
                :class="{
                  'day-cell--empty': !cell.dateId,
                  'day-cell--recorded': cell.isRecorded,
                  'day-cell--selected': cell.dateId === activeDateId,
                }"
                :disabled="!cell.dateId"
                @click="selectDate(cell.dateId)"
              >
                <span>{{ cell.label }}</span>
                <i v-if="cell.isRecorded && cell.dateId !== activeDateId" class="record-dot" aria-hidden="true"></i>
              </button>
            </div>
          </div>
        </article>
      </section>

      <section v-else-if="activeView === 'month'" class="month-view">
        <article class="year-card">
          <header class="year-card-header">
            <h2>{{ activeYear }}年</h2>
            <span>{{ visibleMonths.length }}个月有记录</span>
          </header>

          <div class="month-chip-grid">
            <button
              v-for="month in visibleMonthOptions"
              :key="month.id"
              type="button"
              class="month-chip"
              :class="{
                'month-chip--active': activeMonthId === month.id,
                'month-chip--filled': month.hasRecords,
              }"
              @click="openMonth(month)"
            >
              <strong>{{ month.shortLabel }}</strong>
              <small>{{ month.hasRecords ? `${month.recordCount}条` : "无记录" }}</small>
            </button>
          </div>
        </article>
      </section>

      <section v-else class="year-view">
        <button
          v-for="year in historyData.years"
          :key="year.value"
          type="button"
          class="year-summary"
          :class="{ 'year-summary--active': activeYear === year.value }"
          @click="openYear(year.value)"
        >
          <div class="year-summary-copy">
            <strong>{{ year.label }}</strong>
            <span>饮食记录年度概览</span>
          </div>
          <div class="year-summary-meta">
            <small>{{ year.monthCount }}个月有记录</small>
            <em>{{ year.recordCount }}天已留存</em>
          </div>
        </button>
      </section>
    </main>
  </section>
</template>

<style scoped>
.history-page {
  position: relative;
  left: 50%;
  width: min(390px, 100vw);
  height: auto;
  min-height: var(--ihc-page-min-height);
  max-height: none;
  margin: -18px 0;
  overflow: hidden;
  background: linear-gradient(180deg, #f4f6f8 0%, #f7f8fa 100%);
  color: #2f3137;
  font-family: var(--ihc-font-family);
  transform: translateX(-50%);
  -webkit-font-smoothing: antialiased;
}

.history-header {
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr) 40px;
  align-items: center;
  gap: 12px;
  padding: 20px 20px 14px;
}

.back-btn {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
}

.back-arrow {
  width: 12px;
  height: 12px;
  border-bottom: 2px solid #3f434c;
  border-left: 2px solid #3f434c;
  transform: rotate(45deg);
}

.history-header h1 {
  margin: 0;
  text-align: center;
  color: #2d3138;
  font-size: 28px;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.header-spacer {
  width: 40px;
  height: 40px;
}

.history-content {
  height: calc(100% - 74px);
  padding: 0 18px 26px;
  overflow-y: auto;
  scrollbar-width: none;
}

.history-content::-webkit-scrollbar {
  display: none;
}

.view-tabs {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  padding: 6px;
  border-radius: 18px;
  background: #eef0f3;
}

.view-tab {
  height: 48px;
  padding: 0;
  border: 0;
  border-radius: 14px;
  background: transparent;
  color: #6d7480;
  font-size: 15px;
  font-weight: 600;
}

.view-tab--active {
  background: #ffffff;
  color: #6a6ff7;
  box-shadow: 0 8px 20px rgba(79, 89, 135, 0.08);
}

.day-view,
.month-view,
.year-view {
  margin-top: 18px;
}

.month-section + .month-section {
  margin-top: 18px;
}

.month-section h2,
.year-card-header h2 {
  margin: 0 0 14px;
  color: #31343a;
  font-size: 18px;
  font-weight: 600;
}

.month-card,
.year-card {
  padding: 18px 14px 16px;
  border: 1px solid rgba(235, 238, 243, 0.96);
  border-radius: 24px;
  background: #ffffff;
  box-shadow: 0 14px 34px rgba(67, 74, 90, 0.06);
}

.week-row {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  padding-bottom: 14px;
  border-bottom: 1px solid #eef1f4;
}

.week-cell {
  text-align: center;
  color: #b5bcc8;
  font-size: 13px;
  font-weight: 600;
}

.day-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 8px 2px;
  padding-top: 14px;
}

.day-cell {
  position: relative;
  display: grid;
  place-items: center;
  height: 46px;
  padding: 0;
  border: 0;
  border-radius: 14px;
  background: transparent;
  color: #32353d;
  font-size: 15px;
  font-weight: 500;
}

.day-cell--empty {
  pointer-events: none;
}

.day-cell--selected {
  color: #ffffff;
  background: linear-gradient(135deg, #6d73f8 0%, #7f88ff 100%);
  box-shadow: 0 12px 20px rgba(109, 115, 248, 0.24);
}

.day-cell--recorded:not(.day-cell--selected) {
  background: rgba(109, 115, 248, 0.08);
  color: #5360df;
}

.record-dot {
  position: absolute;
  bottom: 7px;
  left: 50%;
  width: 5px;
  height: 5px;
  margin-left: -2.5px;
  border-radius: 50%;
  background: currentColor;
  opacity: 0.68;
}

.year-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.year-card-header span {
  color: #9097a2;
  font-size: 13px;
}

.month-chip-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.month-chip {
  display: grid;
  gap: 6px;
  min-height: 84px;
  padding: 14px 10px;
  border: 1px solid #eceff3;
  border-radius: 18px;
  background: #f8f9fb;
  color: #656c78;
  text-align: left;
}

.month-chip strong {
  font-size: 16px;
  font-weight: 700;
}

.month-chip small {
  color: #a0a7b3;
  font-size: 12px;
}

.month-chip--filled {
  background: #eef1ff;
  color: #5f67ee;
}

.month-chip--active {
  border-color: rgba(108, 114, 248, 0.18);
  background: linear-gradient(135deg, #6d73f8 0%, #838bff 100%);
  color: #ffffff;
  box-shadow: 0 14px 22px rgba(109, 115, 248, 0.18);
}

.month-chip--active small {
  color: rgba(255, 255, 255, 0.8);
}

.year-view {
  display: grid;
  gap: 14px;
}

.year-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 20px 18px;
  border: 1px solid #eceff3;
  border-radius: 22px;
  background: #ffffff;
  box-shadow: 0 14px 34px rgba(67, 74, 90, 0.06);
  text-align: left;
}

.year-summary-copy {
  display: grid;
  gap: 6px;
}

.year-summary-copy strong {
  color: #31343a;
  font-size: 20px;
  font-weight: 700;
}

.year-summary-copy span,
.year-summary-meta small {
  color: #97a0ac;
  font-size: 13px;
}

.year-summary-meta {
  display: grid;
  justify-items: end;
  gap: 8px;
}

.year-summary-meta em {
  color: #5f67ee;
  font-size: 15px;
  font-style: normal;
  font-weight: 700;
}

.year-summary--active {
  border-color: rgba(108, 114, 248, 0.16);
  background: linear-gradient(180deg, #ffffff 0%, #f4f6ff 100%);
}
</style>
