<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import type { PageComponentProps } from "@ihc/page-core/types";
import { bindHealthDevice } from "@/shared/api/health";
import { selectDevice, syncHealthDeviceItems } from "../device-center/state";
import mock from "./mock";

const props = defineProps<PageComponentProps>();
const isSearching = ref(true);
const isBinding = ref(false);
const manualDeviceId = ref("");
let searchTimer: ReturnType<typeof setTimeout> | undefined;

function goBack() {
  if (!props.navigation.navigateBack()) {
    props.navigation.reLaunch("health/device-center");
  }
}

function startSearch() {
  if (searchTimer) {
    clearTimeout(searchTimer);
  }

  isSearching.value = true;
  searchTimer = setTimeout(() => {
    isSearching.value = false;
  }, 2000);
}

function openScanner() {
  props.navigation.navigateTo("health/device-scan");
}

async function bindByManualInput() {
  const deviceId = manualDeviceId.value.trim();
  if (!deviceId || isBinding.value) {
    return;
  }

  try {
    isBinding.value = true;
    const device = await bindHealthDevice(deviceId);
    selectDevice(device.deviceId);
    await syncHealthDeviceItems();
    props.showToast("绑定成功");
    props.navigation.reLaunch("health/device-detail");
  } catch (error) {
    const message = error instanceof Error ? error.message : "绑定失败，请检查设备ID是否正确";
    props.showToast(message);
  } finally {
    isBinding.value = false;
  }
}

onMounted(() => {
  startSearch();
});

onBeforeUnmount(() => {
  if (searchTimer) {
    clearTimeout(searchTimer);
  }
});
</script>

<template>
  <section class="device-add-page">
    <header class="add-nav">
      <button class="back-btn" type="button" aria-label="返回" @click="goBack">
        <span class="back-arrow" aria-hidden="true"></span>
      </button>
      <h1>{{ mock.title }}</h1>
      <button v-if="!isSearching" class="retry-btn" type="button" @click="startSearch">{{ mock.retryText }}</button>
    </header>

    <main class="add-content">
      <section v-if="isSearching" class="search-panel search-panel--loading">
        <span class="spinner" aria-hidden="true"></span>
        <span>{{ mock.searchingText }}</span>
      </section>

      <button v-else class="search-panel search-result" type="button">
        <span>{{ mock.deviceName }}</span>
        <span class="row-arrow" aria-hidden="true"></span>
      </button>

      <section class="manual-bind-section">
        <h2 class="manual-bind-title">手动绑定</h2>
        <label class="manual-bind-field">
          <span class="sr-only">输入设备ID</span>
          <input
            v-model="manualDeviceId"
            type="text"
            placeholder="请输入设备ID或序列号"
            :disabled="isBinding"
          />
        </label>
        <button
          class="manual-bind-btn"
          type="button"
          :disabled="!manualDeviceId.trim() || isBinding"
          @click="bindByManualInput"
        >
          {{ isBinding ? "绑定中..." : "绑定设备" }}
        </button>
      </section>
    </main>

    <footer class="add-footer">
      <button class="scan-btn" type="button" @click="openScanner">{{ mock.scanText }}</button>
    </footer>
  </section>
</template>

<style scoped>
.device-add-page {
  position: relative;
  left: 50%;
  width: min(390px, 100vw);
  height: auto;
  min-height: var(--ihc-page-min-height);
  max-height: none;
  margin: -18px 0;
  overflow: hidden;
  background: linear-gradient(180deg, #f7f8fc 0%, #f8f9fd 100%);
  color: #2e3340;
  font-family: var(--ihc-font-family);
  transform: translateX(-50%);
  -webkit-font-smoothing: antialiased;
}

.add-nav {
  display: grid;
  grid-template-columns: 28px 1fr auto;
  align-items: center;
  gap: 10px;
  height: 60px;
  padding: 0 20px;
}

.back-btn,
.retry-btn,
.search-result,
.scan-btn,
.manual-bind-btn {
  border: 0;
  color: inherit;
}

.back-btn {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  padding: 0;
  background: transparent;
}

.back-arrow {
  width: 12px;
  height: 12px;
  border-bottom: 3px solid #2d3038;
  border-left: 3px solid #2d3038;
  transform: rotate(45deg);
}

.add-nav h1 {
  margin: 0;
  font-size: 17px;
  font-weight: 500;
  color: #323742;
}

.retry-btn {
  padding: 0;
  background: transparent;
  color: #6872f0;
  font-size: 14px;
  font-weight: 400;
}

.add-content {
  height: calc(100% - 60px - 98px);
  padding: 52px 18px 0;
  overflow-y: auto;
  scrollbar-width: none;
}

.add-content::-webkit-scrollbar {
  display: none;
}

.search-panel {
  display: flex;
  align-items: center;
  width: 100%;
  min-height: 78px;
  padding: 0 26px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 10px 26px rgba(110, 124, 154, 0.04);
}

.search-panel--loading {
  gap: 14px;
  color: #8d919a;
  font-size: 14px;
  font-weight: 400;
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(84, 89, 100, 0.18);
  border-top-color: #545964;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.search-result {
  justify-content: space-between;
  padding-right: 30px;
  padding-left: 30px;
  background: rgba(255, 255, 255, 0.98);
  color: #2f333b;
  font-size: 16px;
  font-weight: 500;
  text-align: left;
}

.row-arrow {
  width: 9px;
  height: 9px;
  border-top: 2px solid #d0d1d6;
  border-right: 2px solid #d0d1d6;
  transform: rotate(45deg);
}

.manual-bind-section {
  margin-top: 32px;
  padding: 20px 18px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 10px 26px rgba(110, 124, 154, 0.04);
}

.manual-bind-title {
  margin: 0 0 16px;
  color: #323742;
  font-size: 15px;
  font-weight: 500;
}

.manual-bind-field {
  display: block;
  border-bottom: 1px solid #ececef;
}

.manual-bind-field input {
  width: 100%;
  height: 48px;
  padding: 0 8px;
  border: 0;
  outline: none;
  background: transparent;
  color: #383d46;
  font-size: 15px;
  font-weight: 400;
}

.manual-bind-field input::placeholder {
  color: #d1d3d8;
}

.manual-bind-btn {
  width: 100%;
  height: 48px;
  margin-top: 20px;
  border-radius: 14px;
  background: #cfd3ff;
  color: #ffffff;
  font-size: 15px;
  font-weight: 400;
}

.manual-bind-btn:disabled {
  cursor: default;
  opacity: 1;
}

.manual-bind-btn:not(:disabled) {
  background: linear-gradient(180deg, #aeb7ff 0%, #9ea9ff 100%);
}

.add-footer {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  padding: 0 18px 18px;
}

.scan-btn {
  width: 100%;
  height: 56px;
  border-radius: 18px;
  background: linear-gradient(180deg, #7280f6 0%, #6570f0 100%);
  color: #ffffff;
  font-size: 18px;
  font-weight: 400;
  box-shadow: 0 14px 28px rgba(102, 112, 240, 0.2);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

@media (min-width: 561px) {
  .device-add-page {
    height: auto;
    min-height: var(--ihc-page-min-height);
  }
}

@media (max-width: 389px) {
  .add-nav,
  .add-content,
  .add-footer {
    padding-right: 16px;
    padding-left: 16px;
  }

  .scan-btn {
    height: 54px;
  }
}
</style>
