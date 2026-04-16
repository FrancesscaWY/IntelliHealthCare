<script setup lang="ts">
import type { PageComponentProps } from "@ihc/page-core/types";
import mock from "./mock";
import { selectedDeviceId } from "./state";

const props = defineProps<PageComponentProps>();

const deviceIconMarkup: Record<string, string> = {
  watch: `
    <rect x="11.2" y="5.2" width="9.6" height="4.4" rx="2.1" />
    <rect x="11.2" y="22.4" width="9.6" height="4.4" rx="2.1" />
    <rect x="9.2" y="8.4" width="13.6" height="15.2" rx="4.8" />
    <circle cx="16" cy="16" r="4.7" fill="none" />
    <path d="M16 16v-2.3" fill="none" />
    <path d="m16 16 2-1.85" fill="none" />
  `,
  scale: `
    <circle cx="16" cy="16" r="7.8" fill="none" />
    <path d="M12.7 13a4.8 4.8 0 0 1 6.6 0" fill="none" />
    <circle cx="16" cy="16" r="1.2" />
    <path d="m16 16 3.7-3.7" fill="none" />
    <path d="M10.9 21.1A8 8 0 0 1 8.2 16" fill="none" />
  `,
  pressure: `
    <rect x="7.8" y="7.8" width="16.4" height="16.4" rx="2.6" fill="none" />
    <circle cx="12.2" cy="12.2" r="1.25" />
    <circle cx="19.8" cy="12.2" r="1.25" />
    <circle cx="12.2" cy="19.8" r="1.25" />
    <circle cx="19.8" cy="19.8" r="1.25" />
  `,
  glucose: `
    <path d="M11.2 8.2h9.6l1.9 15.6H9.3l1.9-15.6Z" fill="none" />
    <path d="M13 18.8h6" fill="none" />
    <circle cx="13.4" cy="21" r="1.1" />
    <circle cx="18.6" cy="21" r="1.1" />
  `,
};

function goBack() {
  if (!props.navigation.navigateBack()) {
    props.navigation.reLaunch("home/dashboard");
  }
}

function addDevice() {
  props.navigation.navigateTo("health/device-add");
}

function openDevice(id: string) {
  selectedDeviceId.value = id;
  props.navigation.navigateTo("health/device-detail");
}

function getDeviceIconMarkup(type: string) {
  return deviceIconMarkup[type] || deviceIconMarkup.watch;
}
</script>

<template>
  <section class="device-page">
    <header class="device-nav">
      <button class="back-btn" type="button" aria-label="返回" @click="goBack">
        <span class="back-arrow" aria-hidden="true"></span>
      </button>
      <h1>{{ mock.title }}</h1>
      <button class="add-btn" type="button" :aria-label="mock.addLabel" @click="addDevice">
        <svg viewBox="0 0 20 20" aria-hidden="true">
          <path d="M10 4.25v11.5" />
          <path d="M4.25 10h11.5" />
          <circle cx="10" cy="10" r="8" fill="none" />
        </svg>
      </button>
    </header>

    <main class="device-scroll">
      <button
        v-for="item in mock.devices"
        :key="item.id"
        class="device-card"
        type="button"
        @click="openDevice(item.id)"
      >
        <span class="device-icon-wrap" :style="{ background: item.halo, color: item.color }" aria-hidden="true">
          <svg viewBox="0 0 32 32" focusable="false">
            <g v-html="getDeviceIconMarkup(item.type)"></g>
          </svg>
        </span>

        <span class="device-copy">
          <strong>{{ item.name }}</strong>
          <small>{{ item.status }}</small>
        </span>

        <span class="device-arrow" aria-hidden="true"></span>
      </button>
    </main>
  </section>
</template>

<style scoped>
.device-page {
  position: relative;
  left: 50%;
  width: min(390px, 100vw);
  height: min(844px, calc(100vh - 36px));
  min-height: min(844px, calc(100vh - 36px));
  max-height: 844px;
  margin: -18px 0;
  overflow: hidden;
  background: linear-gradient(180deg, #f7f8fc 0%, #f8f9fd 100%);
  color: #1d2432;
  font-family: var(--ihc-font-family);
  transform: translateX(-50%);
  -webkit-font-smoothing: antialiased;
}

.device-nav {
  display: grid;
  grid-template-columns: 28px 1fr 28px;
  align-items: center;
  gap: 10px;
  height: 60px;
  padding: 0 20px;
}

.back-btn,
.add-btn,
.device-card {
  border: 0;
  background: transparent;
  color: inherit;
}

.back-btn,
.add-btn {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  padding: 0;
}

.back-arrow {
  width: 12px;
  height: 12px;
  border-bottom: 3px solid #2c3038;
  border-left: 3px solid #2c3038;
  transform: rotate(45deg);
}

.device-nav h1 {
  margin: 0;
  color: #1f2430;
  font-size: 17px;
  font-weight: 500;
  letter-spacing: 0.01em;
}

.add-btn {
  justify-self: end;
}

.add-btn svg {
  display: block;
  width: 24px;
  height: 24px;
  fill: none;
  stroke: #3a3f4a;
  stroke-width: 1.9;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.device-scroll {
  height: calc(100% - 60px);
  padding: 8px 18px 20px;
  overflow-y: auto;
  scrollbar-width: none;
}

.device-scroll::-webkit-scrollbar {
  display: none;
}

.device-card {
  display: grid;
  grid-template-columns: 64px minmax(0, 1fr) 18px;
  align-items: center;
  width: 100%;
  min-height: 96px;
  margin-top: 14px;
  padding: 0 16px 0 14px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 8px 20px rgba(110, 124, 154, 0.04);
  text-align: left;
}

.device-card:first-child {
  margin-top: 0;
}

.device-icon-wrap {
  display: grid;
  place-items: center;
  width: 50px;
  height: 50px;
  border-radius: 50%;
}

.device-icon-wrap svg {
  display: block;
  width: 28px;
  height: 28px;
  fill: currentColor;
  stroke: currentColor;
  stroke-width: 1.95;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.device-copy {
  display: grid;
  gap: 6px;
  min-width: 0;
}

.device-copy strong {
  color: #222834;
  font-size: 15px;
  font-weight: 500;
  line-height: 1.2;
}

.device-copy small {
  color: #9ca3af;
  font-size: 11px;
  font-weight: 400;
  line-height: 1;
}

.device-arrow {
  justify-self: end;
  width: 10px;
  height: 10px;
  border-top: 2px solid #c9ccd3;
  border-right: 2px solid #c9ccd3;
  transform: rotate(45deg);
}

@media (min-width: 561px) {
  .device-page {
    height: 844px;
    min-height: 844px;
  }
}

@media (max-width: 389px) {
  .device-nav {
    padding-right: 18px;
    padding-left: 18px;
  }

  .device-scroll {
    padding-right: 16px;
    padding-left: 16px;
  }

  .device-card {
    grid-template-columns: 60px minmax(0, 1fr) 18px;
    min-height: 90px;
    padding-right: 14px;
    padding-left: 12px;
  }

  .device-copy strong {
    font-size: 14px;
  }
}
</style>
