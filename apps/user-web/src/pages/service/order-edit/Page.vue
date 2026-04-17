<script setup lang="ts">
import { computed, ref } from "vue";
import type { PageComponentProps } from "@ihc/page-core/types";
import { Left } from "@icon-park/vue-next";
import mock from "./mock";
import {
  getActiveHomeCareOrder,
  updateHomeCareOrderSchedule,
} from "../home-care-orders/store";

const props = defineProps<PageComponentProps>();

const activeOrder = getActiveHomeCareOrder();
const selectedDate = ref(activeOrder?.bookingDate || mock.dateOptions[0].value);
const selectedWeekday = ref(activeOrder?.bookingWeekday || mock.dateOptions[0].weekday);
const selectedTime = ref(activeOrder?.bookingTimeSlot || mock.timeSlots[0]);

const selectedDateLabel = computed(() => `${selectedDate.value} ${selectedWeekday.value}`);

function goBack() {
  if (!props.navigation.navigateBack()) {
    props.navigation.reLaunch("service/home-care-orders");
  }
}

function chooseDate(dateValue: string, weekday: string) {
  selectedDate.value = dateValue;
  selectedWeekday.value = weekday;
}

function submit() {
  if (!activeOrder) {
    props.showToast("未找到当前订单");
    props.navigation.reLaunch("service/home-care-orders");
    return;
  }

  updateHomeCareOrderSchedule(activeOrder.id, selectedDate.value, selectedWeekday.value, selectedTime.value);
  props.showToast("预约信息已更新");
  props.navigation.reLaunch("service/home-care-orders");
}
</script>

<template>
  <section class="order-edit-page">
    <div class="status-bar">
      <span class="time">8:30</span>
      <div class="status-icons">
        <span class="signal">
          <i></i>
          <i></i>
          <i></i>
          <i></i>
        </span>
        <span class="wifi"></span>
        <span class="battery"></span>
      </div>
    </div>

    <header class="page-header">
      <button class="back-button" type="button" aria-label="返回" @click="goBack">
        <Left theme="outline" size="18" fill="currentColor" />
      </button>
      <div>
        <h1>修改订单信息</h1>
        <p>重新选择更合适的到家服务时间</p>
      </div>
    </header>

    <main class="edit-content">
      <section v-if="activeOrder" class="summary-card">
        <h2>{{ activeOrder.title }}</h2>
        <p>{{ activeOrder.address }}</p>
        <div class="summary-meta">
          <span>{{ activeOrder.contactName }} {{ activeOrder.contactPhone }}</span>
          <strong>{{ selectedDateLabel }} {{ selectedTime }}</strong>
        </div>
      </section>

      <section class="panel">
        <div class="panel-heading">
          <h2>预约日期</h2>
          <span>建议提前 1 天预约</span>
        </div>
        <div class="date-grid">
          <button
            v-for="option in mock.dateOptions"
            :key="option.value"
            class="date-button"
            :class="{ 'date-button--active': selectedDate === option.value }"
            type="button"
            @click="chooseDate(option.value, option.weekday)"
          >
            <strong>{{ option.value }}</strong>
            <span>{{ option.weekday }}</span>
          </button>
        </div>
      </section>

      <section class="panel">
        <div class="panel-heading">
          <h2>服务时段</h2>
          <span>选择上门时间段</span>
        </div>
        <div class="time-grid">
          <button
            v-for="slot in mock.timeSlots"
            :key="slot"
            class="time-button"
            :class="{ 'time-button--active': selectedTime === slot }"
            type="button"
            @click="selectedTime = slot"
          >
            {{ slot }}
          </button>
        </div>
      </section>
    </main>

    <footer class="submit-bar">
      <button class="submit-button" type="button" @click="submit">保存修改</button>
    </footer>
  </section>
</template>

<style scoped>
.order-edit-page {
  --page-bg: #edf4ff;
  --card-bg: rgba(255, 255, 255, 0.9);
  --card-border: #e3ebf7;
  --primary: #6872f0;
  --primary-soft: rgba(104, 114, 240, 0.1);
  --primary-2: #ed6d88;
  --text-2: #6a727d;
  --text-3: #8ea0bc;
  position: relative;
  left: 50%;
  width: min(402px, 100vw);
  min-height: 874px;
  margin: -18px 0;
  transform: translateX(-50%);
  padding: 0 14px 84px;
  box-sizing: border-box;
  background: var(--page-bg);
  color: #33363b;
  font-family: "HarmonyOS Sans SC", "MiSans", "Source Han Sans SC", "PingFang SC", "Microsoft YaHei UI", sans-serif;
}

.status-bar {
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 6px 0;
  box-sizing: border-box;
}

.time {
  font-size: 14px;
  font-weight: 600;
}

.status-icons {
  display: flex;
  align-items: center;
  gap: 8px;
}

.signal {
  width: 18px;
  height: 12px;
  display: flex;
  align-items: flex-end;
  gap: 2px;
}

.signal i {
  width: 3px;
  border-radius: 1px;
  background: #111;
}

.signal i:nth-child(1) {
  height: 4px;
}

.signal i:nth-child(2) {
  height: 6px;
}

.signal i:nth-child(3) {
  height: 9px;
}

.signal i:nth-child(4) {
  height: 12px;
}

.wifi {
  position: relative;
  width: 15px;
  height: 11px;
  overflow: hidden;
}

.wifi::before,
.wifi::after {
  position: absolute;
  left: 50%;
  content: "";
  border: 2px solid #111;
  border-color: #111 transparent transparent;
  border-radius: 50%;
  transform: translateX(-50%);
}

.wifi::before {
  top: 0;
  width: 17px;
  height: 17px;
}

.wifi::after {
  top: 5px;
  width: 8px;
  height: 8px;
}

.battery {
  position: relative;
  width: 20px;
  height: 10px;
  border: 1.6px solid #111;
  border-radius: 3px;
  box-sizing: border-box;
}

.battery::before {
  position: absolute;
  top: 2px;
  right: -4px;
  width: 2px;
  height: 4px;
  content: "";
  background: #111;
}

.page-header {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr);
  gap: 10px;
  align-items: center;
  padding: 6px 0 12px;
}

.back-button {
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  padding: 0;
  border: 1px solid #e3e4e7;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.88);
  color: #50555d;
}

.page-header h1 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.page-header p {
  margin: 3px 0 0;
  font-size: 11px;
  color: var(--text-3);
}

.edit-content {
  display: grid;
  gap: 12px;
}

.summary-card,
.panel {
  padding: 14px;
  border: 1px solid var(--card-border);
  border-radius: 18px;
  background: var(--card-bg);
}

.summary-card h2,
.panel-heading h2 {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
}

.summary-card p {
  margin: 8px 0 0;
  font-size: 11px;
  line-height: 1.6;
  color: var(--text-3);
}

.summary-meta {
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin-top: 10px;
}

.summary-meta span {
  font-size: 11px;
  color: var(--text-2);
}

.summary-meta strong {
  font-size: 12px;
  font-weight: 600;
  color: #2f3338;
}

.panel-heading {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 12px;
}

.panel-heading span {
  font-size: 10px;
  color: var(--text-3);
}

.date-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}

.date-button,
.time-button {
  min-height: 42px;
  padding: 8px 6px;
  border: 1px solid #dfe6f4;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.82);
  color: #646b74;
}

.date-button {
  display: grid;
  gap: 3px;
}

.date-button strong {
  font-size: 11px;
  font-weight: 600;
}

.date-button span {
  font-size: 10px;
}

.date-button--active,
.time-button--active {
  border-color: var(--primary);
  background: var(--primary-soft);
  color: var(--primary);
}

.time-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.time-button {
  font-size: 11px;
  font-weight: 500;
}

.submit-bar {
  position: fixed;
  left: 50%;
  bottom: 0;
  width: 100%;
  max-width: 402px;
  padding: 10px 16px 18px;
  box-sizing: border-box;
  transform: translateX(-50%);
  background: rgba(240, 248, 251, 0.96);
}

.submit-button {
  width: 100%;
  height: 36px;
  border: 0;
  border-radius: 999px;
  background: var(--primary);
  color: #fff;
  font-size: 12px;
  font-weight: 600;
}
</style>
