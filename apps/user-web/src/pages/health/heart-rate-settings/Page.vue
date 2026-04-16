<script setup lang="ts">
import type { PageComponentProps } from "@ihc/page-core/types";
import mock from "./mock";

const props = defineProps<PageComponentProps>();

function goBack() {
  if (!props.navigation.navigateBack()) {
    props.navigation.reLaunch("health/device-detail");
  }
}

function openSetting(label: string) {
  props.showToast(`${label}功能待接入`);
}
</script>

<template>
  <section class="heart-rate-settings-page">
    <header class="settings-nav">
      <button class="back-btn" type="button" aria-label="返回" @click="goBack">
        <span class="back-arrow" aria-hidden="true"></span>
      </button>
      <h1>{{ mock.title }}</h1>
    </header>

    <main class="settings-scroll">
      <section class="settings-list" aria-label="心率设置列表">
        <button
          v-for="item in mock.items"
          :key="item.key"
          class="settings-row"
          type="button"
          @click="openSetting(item.label)"
        >
          <span class="setting-label">{{ item.label }}</span>
          <span class="setting-value">{{ item.value }}</span>
          <span class="row-arrow" aria-hidden="true"></span>
        </button>
      </section>
    </main>
  </section>
</template>

<style scoped>
.heart-rate-settings-page {
  position: relative;
  left: 50%;
  width: min(390px, 100vw);
  height: min(844px, calc(100vh - 36px));
  min-height: min(844px, calc(100vh - 36px));
  max-height: 844px;
  margin: -18px 0;
  overflow: hidden;
  background: #ffffff;
  color: #2f3136;
  font-family: var(--ihc-font-family);
  transform: translateX(-50%);
  -webkit-font-smoothing: antialiased;
}

.settings-nav {
  display: flex;
  align-items: center;
  height: 58px;
  padding: 0 18px 0 16px;
}

.back-btn,
.settings-row {
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
  width: 11px;
  height: 11px;
  border-bottom: 2px solid #2c3038;
  border-left: 2px solid #2c3038;
  transform: rotate(45deg);
}

.settings-nav h1 {
  margin: 0 0 0 10px;
  color: #3c4047;
  font-size: 16px;
  font-weight: 400;
  letter-spacing: 0.01em;
}

.settings-scroll {
  height: calc(100% - 58px);
  overflow-y: auto;
  scrollbar-width: none;
}

.settings-scroll::-webkit-scrollbar {
  display: none;
}

.settings-list {
  margin-top: 14px;
  border-top: 1px solid #efeff2;
  border-bottom: 1px solid #efeff2;
  background: #ffffff;
}

.settings-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-height: 66px;
  padding: 0 18px;
  text-align: left;
}

.settings-row + .settings-row {
  border-top: 1px solid #f3f3f5;
}

.setting-label {
  color: #b0b1b7;
  font-size: 13px;
  font-weight: 400;
}

.setting-value {
  color: #2f3136;
  font-size: 14px;
  font-weight: 400;
}

.row-arrow {
  width: 8px;
  height: 8px;
  margin-left: 8px;
  border-top: 1.5px solid #d2d3d8;
  border-right: 1.5px solid #d2d3d8;
  transform: rotate(45deg);
}

@media (min-width: 561px) {
  .heart-rate-settings-page {
    height: 844px;
    min-height: 844px;
  }
}

@media (max-width: 389px) {
  .settings-nav {
    padding-right: 16px;
    padding-left: 14px;
  }

  .settings-row {
    min-height: 62px;
    padding-right: 16px;
    padding-left: 16px;
  }

  .setting-label {
    font-size: 12px;
  }

  .setting-value {
    font-size: 13px;
  }
}
</style>
