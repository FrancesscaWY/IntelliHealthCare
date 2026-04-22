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
  box-sizing: border-box;
  width: min(402px, 100vw);
  height: min(874px, calc(100vh - 36px));
  min-height: min(874px, calc(100vh - 36px));
  max-height: 874px;
  margin: -18px 0;
  padding: 16px 18px 28px;
  overflow: hidden;
  background: #f5f6f7;
  color: #252939;
  font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif;
  transform: translateX(-50%);
  -webkit-font-smoothing: antialiased;
}

.device-nav {
  display: grid;
  grid-template-columns: 34px 1fr 34px;
  align-items: center;
  gap: 18px;
  height: 52px;
  padding: 0 2px;
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
  width: 34px;
  height: 38px;
  padding: 0;
}

.back-arrow {
  width: 15px;
  height: 15px;
  border-bottom: 4px solid #34383f;
  border-left: 4px solid #34383f;
  transform: rotate(45deg) translate(3px, -3px);
}

.device-nav h1 {
  margin: 0;
  overflow: hidden;
  color: #34383f;
  font-size: 20px;
  font-weight: 900;
  letter-spacing: 0;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.add-btn {
  justify-self: end;
}

.add-btn svg {
  display: block;
  width: 38px;
  height: 38px;
  fill: none;
  stroke: #34383f;
  stroke-width: 1.7;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.device-scroll {
  height: calc(100% - 52px);
  padding: 34px 2px 0;
  overflow-y: auto;
  scrollbar-width: none;
}

.device-scroll::-webkit-scrollbar {
  display: none;
}

.device-card {
  display: grid;
  grid-template-columns: 100px minmax(0, 1fr) 22px;
  align-items: center;
  width: 100%;
  min-height: 132px;
  margin-top: 24px;
  padding: 0 22px 0 26px;
  border-radius: 28px;
  background: #ffffff;
  box-shadow: 0 14px 34px rgba(31, 40, 58, 0.04);
  text-align: left;
}

.device-card:first-child {
  margin-top: 0;
}

.device-icon-wrap {
  display: grid;
  place-items: center;
  width: 78px;
  height: 78px;
  border-radius: 50%;
}

.device-icon-wrap svg {
  display: block;
  width: 32px;
  height: 32px;
  fill: currentColor;
  stroke: currentColor;
  stroke-width: 2.1;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.device-copy {
  display: grid;
  gap: 10px;
  min-width: 0;
}

.device-copy strong {
  color: #252939;
  font-size: 22px;
  font-weight: 900;
  line-height: 1.2;
}

.device-copy small {
  color: #9a9fa8;
  font-size: 14px;
  font-weight: 800;
  line-height: 1;
}

.device-arrow {
  justify-self: end;
  width: 15px;
  height: 15px;
  border-top: 4px solid #c9ccd3;
  border-right: 4px solid #c9ccd3;
  transform: rotate(45deg);
}

@media (min-width: 561px) {
  .device-page {
    height: 874px;
    min-height: 874px;
  }
}

@media (max-width: 389px) {
  .device-nav {
    gap: 14px;
  }

  .device-scroll {
    padding-top: 28px;
  }

  .device-card {
    grid-template-columns: 86px minmax(0, 1fr) 20px;
    min-height: 116px;
    padding-right: 18px;
    padding-left: 20px;
  }

  .device-icon-wrap {
    width: 68px;
    height: 68px;
  }

  .device-copy strong {
    font-size: 19px;
  }
}
</style>
