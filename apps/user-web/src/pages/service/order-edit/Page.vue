<script setup lang="ts">
import { ref } from 'vue'
import type { PageComponentProps } from '@ihc/page-core/types'
import mock from './mock'

const props = defineProps<PageComponentProps>()

const selectedDay = ref(1)
const selectedTime = ref('9:00')

const goBack = () => {
  if (!props.navigation.navigateBack()) {
    props.navigation.reLaunch('service/order-detail')
  }
}

const submit = () => {
  props.showToast('订单信息已提交')
  props.navigation.navigateBack()
}
</script>

<template>
  <div class="order-edit-page">
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
      <button class="back-button" type="button" aria-label="返回" @click="goBack">‹</button>
      <h1>修改订单信息</h1>
    </header>

    <main class="edit-content">
      <section class="form-section">
        <h2>选择预约时间</h2>
        <div class="calendar-card">
          <div class="month-title">{{ mock.monthTitle }}</div>
          <div class="weekdays">
            <span v-for="day in mock.weekdays" :key="day">{{ day }}</span>
          </div>
          <div class="calendar-divider"></div>
          <div class="days-grid">
            <button
              v-for="day in mock.days"
              :key="day"
              class="day-button"
              :class="{ active: selectedDay === day }"
              type="button"
              @click="selectedDay = day"
            >
              {{ day }}
            </button>
          </div>
        </div>
      </section>

      <div class="time-grid">
        <button
          v-for="slot in mock.timeSlots.slice(0, 12)"
          :key="slot.id"
          class="time-button"
          :class="{ active: selectedTime === slot.label }"
          type="button"
          @click="selectedTime = slot.label"
        >
          {{ slot.label }}
        </button>
      </div>
    </main>

    <div class="submit-bar">
      <button class="submit-button" type="button" @click="submit">提交</button>
    </div>
  </div>
</template>

<style scoped>
.order-edit-page {
  position: relative;
  left: 50%;
  width: min(402px, 100vw);
  min-height: 874px;
  margin: -18px 0;
  transform: translateX(-50%);
  padding: 0 14px 96px;
  box-sizing: border-box;
  background: #f5f6f7;
  color: #34383f;
  font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif;
}

.status-bar {
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 8px 0;
  box-sizing: border-box;
}

.time {
  font-size: 18px;
  font-weight: 500;
  color: #2e3033;
}

.status-icons {
  display: flex;
  align-items: center;
  gap: 9px;
  color: #111;
}

.signal {
  width: 22px;
  height: 16px;
  display: flex;
  align-items: flex-end;
  gap: 3px;
}

.signal i {
  width: 4px;
  border-radius: 1px;
  background: #111;
}

.signal i:nth-child(1) {
  height: 5px;
}

.signal i:nth-child(2) {
  height: 8px;
}

.signal i:nth-child(3) {
  height: 12px;
}

.signal i:nth-child(4) {
  height: 16px;
}

.wifi {
  position: relative;
  width: 19px;
  height: 14px;
  overflow: hidden;
}

.wifi::before,
.wifi::after {
  content: '';
  position: absolute;
  left: 50%;
  border: 3px solid #111;
  border-color: #111 transparent transparent;
  border-radius: 50%;
  transform: translateX(-50%);
}

.wifi::before {
  top: 0;
  width: 22px;
  height: 22px;
}

.wifi::after {
  top: 7px;
  width: 10px;
  height: 10px;
}

.battery {
  position: relative;
  width: 22px;
  height: 12px;
  border: 2px solid #111;
  border-radius: 3px;
  box-sizing: border-box;
}

.battery::before {
  content: '';
  position: absolute;
  top: 2px;
  right: -5px;
  width: 3px;
  height: 6px;
  border-radius: 0 2px 2px 0;
  background: #111;
}

.page-header {
  height: 64px;
  display: flex;
  align-items: center;
  margin-bottom: 24px;
}

.back-button {
  width: 24px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 8px 0 -4px;
  padding: 0;
  border: 0;
  background: transparent;
  color: #34383f;
  font-size: 34px;
  line-height: 26px;
  font-weight: 300;
  cursor: pointer;
}

.page-header h1 {
  margin: 0;
  color: #34383f;
  font-size: 22px;
  font-weight: 600;
  letter-spacing: 0;
}

.form-section h2 {
  margin: 0 0 36px;
  color: #9a9da4;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 0;
}

.calendar-card {
  padding: 26px 22px 40px;
  border-radius: 16px;
  background: #fff;
}

.month-title {
  margin-bottom: 28px;
  text-align: center;
  color: #34383f;
  font-size: 22px;
  font-weight: 800;
  letter-spacing: 0;
}

.weekdays,
.days-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  align-items: center;
}

.weekdays {
  color: #b7bac0;
  font-size: 16px;
  font-weight: 700;
  text-align: center;
}

.calendar-divider {
  height: 1px;
  margin: 24px 0 16px;
  background: #f0f0f1;
}

.days-grid {
  row-gap: 22px;
}

.day-button {
  width: 40px;
  height: 40px;
  justify-self: center;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: #34383f;
  font-size: 17px;
  font-weight: 700;
  cursor: pointer;
}

.day-button.active {
  background: #6d74f2;
  color: #fff;
  box-shadow: 0 12px 28px rgba(104, 112, 242, 0.24);
}

.time-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px 10px;
  margin-top: 24px;
}

.time-button {
  height: 42px;
  border: 0;
  border-radius: 8px;
  background: #fff;
  color: #34383f;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
}

.time-button.active {
  background: #6d74f2;
  color: #fff;
}

.submit-bar {
  position: fixed;
  left: 50%;
  bottom: 0;
  z-index: 20;
  width: 100%;
  max-width: 402px;
  padding: 12px 26px 28px;
  box-sizing: border-box;
  transform: translateX(-50%);
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 -8px 20px rgba(20, 24, 36, 0.04);
}

.submit-button {
  width: 350px;
  max-width: 100%;
  height: 48px;
  display: block;
  margin: 0 auto;
  border: 0;
  border-radius: 8px;
  background: #6870f2;
  color: #fff;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 0;
  cursor: pointer;
}
</style>
