<script setup lang="ts">
import { ref } from 'vue'
import type { PageComponentProps } from '@ihc/page-core/types'
import mock from './mock'

const props = defineProps<PageComponentProps>()

const selectedDay = ref(1)
const selectedTime = ref('9:00')
const note = ref('')

const goBack = () => {
  if (!props.navigation.navigateBack()) {
    props.navigation.reLaunch('service/home-care-detail')
  }
}

const nextStep = () => {
  props.navigation.navigateTo('service/order-confirm')
}
</script>

<template>
  <div class="booking-page">
    <header class="page-header">
      <button class="back-button" type="button" aria-label="返回" @click="goBack">‹</button>
      <h1>预约信息</h1>
    </header>

    <main class="booking-content">
      <section class="form-section">
        <h2>选择地址</h2>
        <div class="address-card">{{ mock.address }}</div>
      </section>

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
          v-for="slot in mock.timeSlots"
          :key="slot.id"
          class="time-button"
          :class="{ active: selectedTime === slot.label }"
          type="button"
          @click="selectedTime = slot.label"
        >
          {{ slot.label }}
        </button>
      </div>

      <section class="form-section note-section">
        <h2>订单备注</h2>
        <textarea v-model="note" class="note-input" placeholder="请填写订单备注"></textarea>
      </section>
    </main>

    <div class="next-bar">
      <button class="next-button" type="button" @click="nextStep">下一步</button>
    </div>
  </div>
</template>

<style scoped>
.booking-page {
  position: relative;
  left: 50%;
  width: min(402px, 100vw);
  min-height: 874px;
  margin: -18px 0;
  transform: translateX(-50%);
  padding: 16px 14px 92px;
  box-sizing: border-box;
  background: #f5f6f7;
  color: #34383f;
  font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif;
}

.page-header {
  height: 48px;
  display: flex;
  align-items: center;
  margin-bottom: 18px;
}

.back-button {
  width: 24px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 6px 0 -3px;
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
  font-size: 18px;
  font-weight: 600;
  letter-spacing: 0;
}

.booking-content {
  display: flex;
  flex-direction: column;
}

.form-section {
  margin-bottom: 20px;
}

.form-section h2 {
  margin: 0 0 14px;
  color: #9a9da4;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0;
}

.address-card {
  min-height: 84px;
  display: flex;
  align-items: center;
  padding: 0 20px;
  box-sizing: border-box;
  border-radius: 8px;
  background: #fff;
  color: #34383f;
  font-size: 18px;
  font-weight: 700;
}

.calendar-card {
  padding: 16px 12px 28px;
  border-radius: 8px;
  background: #fff;
}

.month-title {
  margin-bottom: 18px;
  text-align: center;
  color: #34383f;
  font-size: 18px;
  font-weight: 800;
}

.weekdays,
.days-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  align-items: center;
}

.weekdays {
  color: #b7bac0;
  font-size: 14px;
  font-weight: 600;
  text-align: center;
}

.calendar-divider {
  height: 1px;
  margin: 14px 0 10px;
  background: #f0f0f1;
}

.days-grid {
  row-gap: 12px;
}

.day-button {
  width: 40px;
  height: 38px;
  justify-self: center;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #40444a;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
}

.day-button.active {
  background: #6d74f2;
  color: #fff;
}

.time-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px 10px;
  margin: -6px 0 22px;
}

.time-button {
  height: 38px;
  border: 0;
  border-radius: 8px;
  background: #fff;
  color: #43474d;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}

.time-button.active {
  background: #6d74f2;
  color: #fff;
}

.note-section {
  margin-bottom: 0;
}

.note-input {
  width: 100%;
  height: 150px;
  padding: 18px 16px;
  box-sizing: border-box;
  border: 0;
  border-radius: 8px;
  outline: none;
  resize: none;
  background: #fff;
  color: #34383f;
  font-size: 14px;
  line-height: 1.5;
  font-family: inherit;
}

.note-input::placeholder {
  color: #c4c7ce;
  font-weight: 600;
}

.next-bar {
  position: fixed;
  left: 50%;
  bottom: 0;
  z-index: 20;
  width: 100%;
  max-width: 402px;
  padding: 10px 22px 22px;
  box-sizing: border-box;
  transform: translateX(-50%);
  background: rgba(255, 255, 255, 0.96);
}

.next-button {
  width: 350px;
  max-width: 100%;
  display: block;
  margin: 0 auto;
  height: 46px;
  border: 0;
  border-radius: 8px;
  background: #6870f2;
  color: #fff;
  font-size: 17px;
  font-weight: 700;
  letter-spacing: 0;
  cursor: pointer;
}
</style>
