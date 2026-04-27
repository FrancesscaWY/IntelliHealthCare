<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import type { PageComponentProps } from "@ihc/page-core/types";
import watchA001Image from "@/assets/devices/watch-a001-device.jpg";
import { scanBindHealthDevice } from "@/shared/api/health";
import { selectDevice, syncHealthDeviceItems } from "../device-center/state";
import mock from "./mock";

const props = defineProps<PageComponentProps>();
const phase = ref<"scanning" | "success">("scanning");
const progressWidth = ref(0);
const isBinding = ref(false);
let scanTimer: ReturnType<typeof setTimeout> | undefined;

function goBack() {
  if (!props.navigation.navigateBack()) {
    props.navigation.reLaunch("health/device-add");
  }
}

function beginScanFlow() {
  if (scanTimer) {
    clearTimeout(scanTimer);
  }

  phase.value = "scanning";
  progressWidth.value = 0;
  scanTimer = setTimeout(async () => {
    phase.value = "success";
    await nextTick();
    requestAnimationFrame(() => {
      progressWidth.value = 100;
    });
  }, 2000);
}

async function finishBinding() {
  if (isBinding.value) {
    return;
  }

  try {
    isBinding.value = true;
    const device = await scanBindHealthDevice("watch-a001");
    selectDevice(device.deviceId);
    await syncHealthDeviceItems();
    props.showToast("绑定成功");
    props.navigation.reLaunch("health/device-detail");
  } catch (error) {
    const message = error instanceof Error ? error.message : "绑定失败，请稍后重试";
    props.showToast(message);
  } finally {
    isBinding.value = false;
  }
}

onMounted(() => {
  beginScanFlow();
});

onBeforeUnmount(() => {
  if (scanTimer) {
    clearTimeout(scanTimer);
  }
});
</script>

<template>
  <section v-if="phase === 'scanning'" class="device-scan-page device-scan-page--scanner">
    <div class="scanner-panel">
      <div class="scan-box">
        <span class="corner corner--tl"></span>
        <span class="corner corner--tr"></span>
        <span class="corner corner--bl"></span>
        <span class="corner corner--br"></span>
        <span class="scan-line" aria-hidden="true"></span>
      </div>

      <p>{{ mock.scanningHint }}</p>

      <button class="torch-btn" type="button">
        <span class="torch-icon" aria-hidden="true"></span>
        <span>{{ mock.lightText }}</span>
      </button>
    </div>
  </section>

  <section v-else class="device-scan-page device-scan-page--success">
    <header class="success-nav">
      <button class="back-btn" type="button" aria-label="返回" @click="goBack">
        <span class="back-arrow" aria-hidden="true"></span>
      </button>
      <h1>{{ mock.title }}</h1>
    </header>

    <main class="success-content">
      <div class="device-photo-card">
        <img :src="watchA001Image" :alt="mock.deviceName" draggable="false" />
      </div>
      <h2>{{ mock.deviceName }}</h2>

      <div class="progress-track" aria-hidden="true">
        <span class="progress-bar" :style="{ width: `${progressWidth}%` }"></span>
      </div>
      <p>{{ mock.successText }}</p>
    </main>

    <footer class="success-footer">
      <button class="finish-btn" type="button" :disabled="isBinding" @click="finishBinding">
        {{ isBinding ? "绑定中..." : mock.finishText }}
      </button>
    </footer>
  </section>
</template>

<style scoped>
.device-scan-page {
  position: relative;
  left: 50%;
  width: min(390px, 100vw);
  height: min(844px, calc(100vh - 36px));
  min-height: min(844px, calc(100vh - 36px));
  max-height: 844px;
  margin: -18px 0;
  overflow: hidden;
  font-family: var(--ihc-font-family);
  transform: translateX(-50%);
  -webkit-font-smoothing: antialiased;
}

.device-scan-page--scanner {
  background: #444444;
  color: #ffffff;
}

.scanner-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 24px;
}

.scan-box {
  position: relative;
  width: min(316px, calc(100vw - 80px));
  aspect-ratio: 1;
  background: rgba(255, 255, 255, 0.98);
}

.corner {
  position: absolute;
  width: 40px;
  height: 40px;
  border-color: #6872f0;
  border-style: solid;
  border-width: 0;
}

.corner--tl {
  top: 0;
  left: 0;
  border-top-width: 4px;
  border-left-width: 4px;
}

.corner--tr {
  top: 0;
  right: 0;
  border-top-width: 4px;
  border-right-width: 4px;
}

.corner--bl {
  bottom: 0;
  left: 0;
  border-bottom-width: 4px;
  border-left-width: 4px;
}

.corner--br {
  right: 0;
  bottom: 0;
  border-right-width: 4px;
  border-bottom-width: 4px;
}

.scan-line {
  position: absolute;
  left: 0;
  width: 100%;
  height: 2px;
  background: #62ddd7;
  box-shadow: 0 0 10px rgba(98, 221, 215, 0.6);
  animation: scan 2s ease-in-out infinite;
}

.scanner-panel p {
  margin: 26px 0 0;
  font-size: 14px;
  font-weight: 400;
}

.torch-btn {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  margin-top: 72px;
  border: 0;
  background: transparent;
  color: #ffffff;
  font-size: 16px;
  font-weight: 400;
}

.torch-icon {
  position: relative;
  width: 18px;
  height: 26px;
  border: 3px solid currentColor;
  border-top: 0;
  border-radius: 3px;
}

.torch-icon::before,
.torch-icon::after {
  content: "";
  position: absolute;
}

.torch-icon::before {
  top: -7px;
  left: 3px;
  width: 6px;
  height: 8px;
  border: 3px solid currentColor;
  border-bottom: 0;
  border-radius: 2px 2px 0 0;
}

.torch-icon::after {
  top: 8px;
  left: 50%;
  width: 3px;
  height: 8px;
  background: currentColor;
  transform: translateX(-50%);
}

.device-scan-page--success {
  background: linear-gradient(180deg, #f7f8fc 0%, #f8f9fd 100%);
  color: #313642;
}

.success-nav {
  display: flex;
  align-items: center;
  height: 60px;
  padding: 0 20px;
}

.back-btn,
.finish-btn {
  border: 0;
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

.success-nav h1 {
  margin: 0 0 0 12px;
  font-size: 17px;
  font-weight: 500;
  color: #323742;
}

.success-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  height: calc(100% - 60px - 98px);
  padding: 54px 24px 0;
}

.device-photo-card {
  display: grid;
  place-items: center;
  width: 214px;
  height: 214px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 12px 28px rgba(110, 124, 154, 0.05);
}

.device-photo-card img {
  display: block;
  width: 100%;
  height: 100%;
  padding: 10px;
  object-fit: contain;
}

.success-content h2 {
  margin: 24px 0 0;
  font-size: 18px;
  font-weight: 500;
  color: #333843;
}

.progress-track {
  width: 100%;
  max-width: 292px;
  height: 10px;
  margin-top: 60px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(104, 114, 240, 0.18);
}

.progress-bar {
  display: block;
  width: 0;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #6872f0 0%, #6f79ff 100%);
  transition: width 1.35s ease-out;
}

.success-content p {
  margin: 16px 0 0;
  color: #a0a2a8;
  font-size: 14px;
  font-weight: 400;
}

.success-footer {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  padding: 0 18px 18px;
}

.finish-btn {
  width: 100%;
  height: 56px;
  border-radius: 18px;
  background: linear-gradient(180deg, #7280f6 0%, #6570f0 100%);
  color: #ffffff;
  font-size: 18px;
  font-weight: 400;
  box-shadow: 0 14px 28px rgba(102, 112, 240, 0.2);
}

.finish-btn:disabled {
  opacity: 0.66;
}

@keyframes scan {
  0% {
    top: 16%;
  }

  100% {
    top: 74%;
  }
}

@media (min-width: 561px) {
  .device-scan-page {
    height: 844px;
    min-height: 844px;
  }
}

@media (max-width: 389px) {
  .scan-box {
    width: calc(100vw - 72px);
  }

  .success-nav,
  .success-footer {
    padding-right: 16px;
    padding-left: 16px;
  }

  .success-content {
    padding-right: 20px;
    padding-left: 20px;
  }

  .finish-btn {
    height: 54px;
  }
}
</style>
