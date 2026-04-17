<script setup lang="ts">
import { computed } from "vue";
import type { PageComponentProps } from "@ihc/page-core/types";
import { Left } from "@icon-park/vue-next";
import mock from "./mock";
import { getActiveHomeCareOrder } from "../home-care-orders/store";

const props = defineProps<PageComponentProps>();

const activeOrder = getActiveHomeCareOrder();

const steps = computed(() => {
  if (!activeOrder) {
    return mock.pendingPaymentSteps;
  }

  if (activeOrder.status === "pending_payment") {
    return mock.pendingPaymentSteps;
  }

  if (activeOrder.status === "awaiting_accept") {
    return mock.awaitingAcceptSteps;
  }

  if (activeOrder.status === "awaiting_service") {
    return mock.awaitingServiceSteps;
  }

  return mock.completedSteps;
});

function goBack() {
  if (!props.navigation.navigateBack()) {
    props.navigation.reLaunch("service/home-care-orders");
  }
}
</script>

<template>
  <div class="service-track-page">
    <header class="page-header">
      <button class="back-button" type="button" aria-label="返回" @click="goBack">
        <Left theme="outline" size="18" fill="currentColor" />
      </button>
      <div>
        <h1>服务进度</h1>
        <p v-if="activeOrder">{{ activeOrder.title }}</p>
      </div>
    </header>

    <main class="track-content">
      <section class="track-card">
        <article v-for="(step, index) in steps" :key="step.id" class="track-step" :class="{ active: step.active }">
          <time>{{ step.time }}</time>
          <div class="track-line">
            <span class="dot"></span>
            <span v-if="index < steps.length - 1" class="line"></span>
          </div>
          <div class="track-text">
            <h2>{{ step.title }}</h2>
            <p v-if="step.desc">{{ step.desc }}</p>
          </div>
        </article>
      </section>
    </main>
  </section>
</template>

<style scoped>
.service-track-page {
  --page-bg: #edf4ff;
  --card-border: #e3ebf7;
  --primary: #6872f0;
  --text-3: #8ea0bc;
  position: relative;
  left: 50%;
  width: min(402px, 100vw);
  min-height: 874px;
  margin: -18px 0;
  transform: translateX(-50%);
  padding: 16px 14px 40px;
  box-sizing: border-box;
  background: var(--page-bg);
  color: #34383f;
  font-family: "HarmonyOS Sans SC", "MiSans", "Source Han Sans SC", "PingFang SC", "Microsoft YaHei UI", sans-serif;
}

.page-header {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr);
  gap: 10px;
  align-items: center;
  padding: 6px 0 14px;
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

.track-card {
  padding: 16px 14px 8px;
  border: 1px solid var(--card-border);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.94);
}

.track-step {
  display: grid;
  grid-template-columns: 84px 24px minmax(0, 1fr);
  min-height: 74px;
  color: #a5abb2;
}

.track-step time {
  padding-top: 2px;
  font-size: 11px;
}

.track-line {
  position: relative;
  display: flex;
  justify-content: center;
}

.dot {
  width: 8px;
  height: 8px;
  margin-top: 5px;
  border-radius: 50%;
  background: #d3d7dc;
  z-index: 1;
}

.line {
  position: absolute;
  top: 16px;
  bottom: -8px;
  left: 50%;
  width: 1px;
  transform: translateX(-50%);
  background: #dfe6f5;
}

.track-text h2 {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
}

.track-text p {
  margin: 5px 0 0;
  font-size: 10px;
  line-height: 1.6;
}

.track-step.active {
  color: #43484f;
}

.track-step.active .dot {
  background: var(--primary);
}
</style>
