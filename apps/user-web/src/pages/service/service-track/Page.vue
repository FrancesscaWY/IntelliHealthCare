<script setup lang="ts">
import type { PageComponentProps } from '@ihc/page-core/types'
import mock from './mock'

const props = defineProps<PageComponentProps>()

const goBack = () => {
  if (!props.navigation.navigateBack()) {
    props.navigation.reLaunch('service/order-detail')
  }
}
</script>

<template>
  <div class="service-track-page">
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
      <h1>服务跟踪</h1>
    </header>

    <main class="track-content">
      <section class="track-card">
        <article
          v-for="(step, index) in mock.steps"
          :key="step.id"
          class="track-step"
          :class="{ active: step.active }"
        >
          <time>{{ step.time }}</time>
          <div class="track-line">
            <span class="dot"></span>
            <span v-if="index < mock.steps.length - 1" class="line"></span>
          </div>
          <div class="track-text">
            <h2>{{ step.title }}</h2>
            <p v-if="step.desc">{{ step.desc }}</p>
          </div>
        </article>
      </section>
    </main>
  </div>
</template>

<style scoped>
.service-track-page {
  position: relative;
  left: 50%;
  width: min(402px, 100vw);
  min-height: 874px;
  margin: -18px 0;
  transform: translateX(-50%);
  padding: 0 14px 40px;
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
  margin-bottom: 34px;
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

.track-card {
  min-height: 330px;
  padding: 34px 28px 24px;
  border-radius: 16px;
  background: #fff;
  box-sizing: border-box;
}

.track-step {
  display: grid;
  grid-template-columns: 112px 36px 1fr;
  min-height: 86px;
  color: #b8bbc1;
}

.track-step time {
  padding-top: 2px;
  font-size: 15px;
  font-weight: 600;
  white-space: nowrap;
}

.track-line {
  position: relative;
  display: flex;
  justify-content: center;
}

.dot {
  width: 9px;
  height: 9px;
  margin-top: 8px;
  border-radius: 50%;
  background: #cfd1d5;
  z-index: 2;
}

.line {
  position: absolute;
  top: 21px;
  bottom: -8px;
  left: 50%;
  width: 1px;
  transform: translateX(-50%);
  background: repeating-linear-gradient(
    to bottom,
    #e5e6e9 0,
    #e5e6e9 4px,
    transparent 4px,
    transparent 8px
  );
}

.track-text {
  padding-left: 20px;
}

.track-text h2 {
  margin: 0;
  color: #9699a0;
  font-size: 17px;
  font-weight: 700;
  letter-spacing: 0;
}

.track-text p {
  margin: 18px 0 0;
  color: #9699a0;
  font-size: 16px;
  font-weight: 600;
}

.track-step.active {
  color: #34383f;
}

.track-step.active .dot {
  width: 10px;
  height: 10px;
  background: #34383f;
}

.track-step.active .track-text h2 {
  color: #34383f;
}
</style>
