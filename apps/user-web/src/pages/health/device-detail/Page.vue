<script setup lang="ts">
import { computed, reactive, ref, watchEffect } from "vue";
import type { PageComponentProps } from "@ihc/page-core/types";
import mock from "./mock";
import { getDeviceById } from "../device-center/devices";
import { selectedDeviceId } from "../device-center/state";

const props = defineProps<PageComponentProps>();

const currentDevice = computed(() => getDeviceById(selectedDeviceId.value));
const toggleValues = reactive<Record<string, boolean>>({});
const imageLoadFailed = ref(false);

watchEffect(() => {
  imageLoadFailed.value = false;
  for (const item of currentDevice.value.toggles) {
    if (!(item.key in toggleValues)) {
      toggleValues[item.key] = item.enabled;
    }
  }
});

const detailIconMarkup: Record<string, string> = {
  watch: `
    <rect x="11.2" y="5.2" width="9.6" height="4.4" rx="2.1" />
    <rect x="11.2" y="22.4" width="9.6" height="4.4" rx="2.1" />
    <rect x="9.2" y="8.4" width="13.6" height="15.2" rx="4.8" />
    <circle cx="16" cy="16" r="4.7" fill="none" />
    <path d="M16 16v-2.3" fill="none" />
    <path d="m16 16 2-1.85" fill="none" />
  `,
  link: `
    <path d="m13.3 18.7-2.1 2.1a4.1 4.1 0 0 1-5.8-5.8l2.6-2.6a4.1 4.1 0 0 1 5.8 0" fill="none" />
    <path d="m18.7 13.3 2.1-2.1a4.1 4.1 0 1 0-5.8-5.8l-2.6 2.6a4.1 4.1 0 0 0 0 5.8" fill="none" />
    <path d="m12.2 19.8 7.6-7.6" fill="none" />
  `,
  battery: `
    <rect x="6.8" y="10" width="16.8" height="12" rx="1.8" fill="none" />
    <path d="M23.6 13.3h2.2v5.4h-2.2" fill="none" />
    <rect x="9.6" y="12.6" width="8.6" height="6.8" rx=".8" />
  `,
  scale: `
    <circle cx="16" cy="16" r="7.8" fill="none" />
    <path d="M12.7 13a4.8 4.8 0 0 1 6.6 0" fill="none" />
    <circle cx="16" cy="16" r="1.2" />
    <path d="m16 16 3.7-3.7" fill="none" />
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
    props.navigation.reLaunch("health/device-center");
  }
}

function getIconMarkup(type: string) {
  return detailIconMarkup[type] || detailIconMarkup.watch;
}

function toggleSetting(key: string) {
  toggleValues[key] = !toggleValues[key];
}

function openQuickLink(item: { key: string; label: string }) {
  if (item.key === "heart-rate") {
    props.navigation.navigateTo("health/heart-rate-settings");
    return;
  }

  openAction(item.label);
}

function openDeviceAction(item: { key: string; label: string }) {
  if (item.key === "password") {
    props.navigation.navigateTo("health/device-password");
    return;
  }

  openAction(item.label);
}

function openAction(label: string) {
  props.showToast(`${label}功能待接入`);
}

function unbindDevice() {
  props.showToast("解除绑定功能待接入");
}
</script>

<template>
  <section class="device-detail-page">
    <header class="detail-nav">
      <button class="back-btn" type="button" aria-label="返回" @click="goBack">
        <span class="back-arrow" aria-hidden="true"></span>
      </button>
      <h1>{{ currentDevice.name }}</h1>
    </header>

    <main class="detail-scroll">
      <section class="device-summary">
        <div class="device-photo-frame">
          <img
            v-if="currentDevice.imageUrl && !imageLoadFailed"
            class="device-photo"
            :src="currentDevice.imageUrl"
            :alt="currentDevice.name"
            draggable="false"
            @error="imageLoadFailed = true"
          />
          <span
            v-else
            class="device-photo device-photo--fallback"
            :style="{ color: currentDevice.color, background: currentDevice.halo }"
          >
            <svg viewBox="0 0 32 32" focusable="false">
              <g v-html="getIconMarkup(currentDevice.type)"></g>
            </svg>
          </span>
        </div>

        <div class="summary-copy">
          <h2>{{ currentDevice.name }}</h2>

          <div class="summary-status">
            <span class="status-chip">
              <span class="chip-icon chip-icon--link" aria-hidden="true">
                <svg viewBox="0 0 32 32" focusable="false">
                  <g v-html="getIconMarkup('link')"></g>
                </svg>
              </span>
              <span>{{ currentDevice.status }}</span>
            </span>

            <span class="status-chip">
              <span class="chip-icon chip-icon--battery" aria-hidden="true">
                <svg viewBox="0 0 32 32" focusable="false">
                  <g v-html="getIconMarkup('battery')"></g>
                </svg>
              </span>
              <span>{{ currentDevice.batteryText }}</span>
            </span>
          </div>
        </div>
      </section>

      <section class="settings-card">
        <button
          v-for="item in currentDevice.quickLinks"
          :key="item.key"
          class="settings-row settings-row--link"
          type="button"
          @click="openQuickLink(item)"
        >
          <span>{{ item.label }}</span>
          <span class="row-arrow" aria-hidden="true"></span>
        </button>

        <button
          v-for="item in currentDevice.toggles"
          :key="item.key"
          class="settings-row settings-row--toggle"
          type="button"
          @click="toggleSetting(item.key)"
        >
          <span>{{ item.label }}</span>
          <span class="switch" :class="{ 'switch--on': toggleValues[item.key] }" aria-hidden="true">
            <span></span>
          </span>
        </button>
      </section>

      <section class="settings-card settings-card--bottom">
        <button
          v-for="item in currentDevice.actions"
          :key="item.key"
          class="settings-row settings-row--link"
          type="button"
          @click="openDeviceAction(item)"
        >
          <span>{{ item.label }}</span>
          <span class="row-arrow" aria-hidden="true"></span>
        </button>
      </section>
    </main>

    <footer class="detail-footer">
      <button class="unbind-btn" type="button" @click="unbindDevice">{{ mock.unbindText }}</button>
    </footer>
  </section>
</template>

<style scoped>
.device-detail-page {
  position: relative;
  left: 50%;
  width: min(390px, 100vw);
  height: min(844px, calc(100vh - 36px));
  min-height: min(844px, calc(100vh - 36px));
  max-height: 844px;
  margin: -18px 0;
  overflow: hidden;
  background: linear-gradient(180deg, #f7f8fc 0%, #f8f9fd 100%);
  color: #232a36;
  font-family: var(--ihc-font-family);
  transform: translateX(-50%);
  -webkit-font-smoothing: antialiased;
}

.detail-nav {
  display: flex;
  align-items: center;
  height: 60px;
  padding: 0 20px;
}

.back-btn,
.settings-row,
.unbind-btn {
  border: 0;
  background: transparent;
  color: inherit;
}

.back-btn {
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

.detail-nav h1 {
  margin: 0 0 0 12px;
  color: #1f2430;
  font-size: 17px;
  font-weight: 500;
}

.detail-scroll {
  height: calc(100% - 60px - 84px);
  padding: 8px 20px 14px;
  overflow-y: auto;
  scrollbar-width: none;
}

.detail-scroll::-webkit-scrollbar {
  display: none;
}

.device-summary {
  display: grid;
  grid-template-columns: 98px minmax(0, 1fr);
  gap: 12px;
  align-items: center;
}

.device-photo-frame {
  display: grid;
  place-items: center;
  width: 98px;
  height: 98px;
  overflow: hidden;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 8px 20px rgba(110, 124, 154, 0.04);
}

.device-photo {
  display: block;
  width: 100%;
  height: 100%;
  padding: 8px;
  object-fit: contain;
  object-position: center 20%;
  background: #ffffff;
  box-sizing: border-box;
}

.device-photo--fallback {
  display: grid;
  place-items: center;
  width: 72px;
  height: 72px;
  border-radius: 50%;
}

.device-photo--fallback svg {
  width: 36px;
  height: 36px;
  fill: currentColor;
  stroke: currentColor;
  stroke-width: 1.9;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.summary-copy h2 {
  margin: 0;
  color: #3a3d43;
  font-size: 19px;
  font-weight: 500;
  line-height: 1.12;
}

.summary-status {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 14px;
  margin-top: 12px;
}

.status-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #4a4f59;
  font-size: 13px;
  font-weight: 400;
}

.chip-icon {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
}

.chip-icon svg {
  width: 19px;
  height: 19px;
  fill: currentColor;
  stroke: currentColor;
  stroke-width: 1.9;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.chip-icon--link {
  color: #ff817b;
  background: rgba(255, 129, 123, 0.14);
}

.chip-icon--battery {
  color: #37d2ab;
  background: rgba(55, 210, 171, 0.14);
}

.settings-card {
  margin-top: 14px;
  overflow: hidden;
  border-radius: 15px;
  background: rgba(255, 255, 255, 0.97);
  box-shadow: 0 8px 20px rgba(110, 124, 154, 0.04);
}

.settings-card--bottom {
  margin-top: 10px;
}

.settings-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  width: 100%;
  min-height: 60px;
  padding: 0 20px 0 18px;
  color: #383d46;
  font-size: 15px;
  font-weight: 400;
  text-align: left;
}

.settings-row + .settings-row {
  border-top: 1px solid #f0f1f4;
}

.row-arrow {
  width: 9px;
  height: 9px;
  border-top: 2px solid #cfcfd4;
  border-right: 2px solid #cfcfd4;
  transform: rotate(45deg);
}

.switch {
  position: relative;
  width: 40px;
  height: 22px;
  border-radius: 999px;
  background: #d8d8db;
  transition: background 0.2s ease;
}

.switch span {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #f7f7f8;
  transition: transform 0.2s ease;
}

.switch--on {
  background: #37d2ab;
}

.switch--on span {
  transform: translateX(18px);
}

.detail-footer {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  padding: 8px 20px 14px;
  background: linear-gradient(180deg, rgba(247, 248, 252, 0) 0%, #f7f8fc 24%);
}

.unbind-btn {
  width: 100%;
  height: 46px;
  border-radius: 14px;
  background: #ff6e68;
  color: #ffffff;
  font-size: 14px;
  font-weight: 500;
  box-shadow: 0 12px 24px rgba(255, 110, 104, 0.18);
}

@media (min-width: 561px) {
  .device-detail-page {
    height: 844px;
    min-height: 844px;
  }
}

@media (max-width: 389px) {
  .detail-nav,
  .detail-scroll,
  .detail-footer {
    padding-right: 18px;
    padding-left: 18px;
  }

  .device-summary {
    grid-template-columns: 92px minmax(0, 1fr);
    gap: 12px;
  }

  .device-photo-frame,
  .device-photo {
    width: 92px;
    height: 92px;
  }

  .summary-copy h2 {
    font-size: 18px;
  }

  .settings-row {
    min-height: 56px;
    padding-right: 18px;
    padding-left: 16px;
    font-size: 14px;
  }
}
</style>
