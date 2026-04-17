<script setup lang="ts">
import { computed } from "vue";
import type { PageComponentProps } from "@ihc/page-core/types";
import { Left } from "@icon-park/vue-next";
import { getActiveHomeCareOrder } from "../home-care-orders/store";

const props = defineProps<PageComponentProps>();

const activeOrder = getActiveHomeCareOrder();

const codeGroups = computed(() => {
  if (!activeOrder) {
    return ["0000", "0000", "0000"];
  }

  return activeOrder.serviceCode.split(" ");
});

function goBack() {
  props.navigation.reLaunch("service/home-care-orders");
}

function finish() {
  props.navigation.reLaunch("service/home-care-orders");
}
</script>

<template>
  <div class="payment-result-page">
    <header class="page-header">
      <button class="back-button" type="button" aria-label="返回" @click="goBack">
        <Left theme="outline" size="18" fill="currentColor" />
      </button>
      <div>
        <h1>服务券码</h1>
        <p>上门服务前向护理人员出示即可</p>
      </div>
    </header>

    <main class="voucher-content">
      <section class="voucher-card" v-if="activeOrder">
        <div class="voucher-top">
          <div>
            <span class="voucher-label">家政护理</span>
            <h2>{{ activeOrder.title }}</h2>
          </div>
          <strong>¥{{ activeOrder.actualAmount.toFixed(2) }}</strong>
        </div>

        <div class="voucher-meta">
          <span>服务时间</span>
          <p>{{ activeOrder.bookingDate }} {{ activeOrder.bookingWeekday }} {{ activeOrder.bookingTimeSlot }}</p>
        </div>
        <div class="voucher-meta">
          <span>服务地址</span>
          <p>{{ activeOrder.address }}</p>
        </div>

        <div class="code-block">
          <div class="code-number">
            <span v-for="group in codeGroups" :key="group">{{ group }}</span>
          </div>
          <p>{{ activeOrder.serviceCodeHint }}</p>
        </div>

        <div class="scan-card">
          <div class="qr-code" aria-hidden="true">
            <span v-for="index in 36" :key="index" :class="`cell cell--${index}`"></span>
          </div>
          <div class="barcode" aria-hidden="true">
            <span v-for="index in 42" :key="index" :class="{ wide: index % 5 === 0 || index % 7 === 0 }"></span>
          </div>
          <small>{{ activeOrder.orderNo }}</small>
        </div>
      </section>
    </main>

    <footer class="finish-bar">
      <button class="finish-button" type="button" @click="finish">完成</button>
    </footer>
  </section>
</template>

<style scoped>
.voucher-page {
  --page-bg: #edf4ff;
  --card-border: #e3ebf7;
  --primary: #6872f0;
  --primary-2: #ed6d88;
  --primary-soft: rgba(104, 114, 240, 0.1);
  --text-3: #8ea0bc;
  position: relative;
  left: 50%;
  width: min(402px, 100vw);
  min-height: 874px;
  margin: -18px 0;
  transform: translateX(-50%);
  padding: 16px 14px 96px;
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
  padding: 6px 0 12px;
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

.voucher-card {
  padding: 16px;
  border: 1px solid var(--card-border);
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.96);
}

.voucher-top {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
}

.voucher-label {
  display: inline-flex;
  padding: 3px 8px;
  border-radius: 999px;
  background: var(--primary-soft);
  color: var(--primary);
  font-size: 10px;
}

.voucher-top h2 {
  margin: 8px 0 0;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.45;
}

.voucher-top strong {
  font-size: 16px;
  font-weight: 700;
  color: var(--primary);
}

.voucher-meta {
  display: grid;
  grid-template-columns: 56px minmax(0, 1fr);
  gap: 10px;
  margin-top: 12px;
}

.voucher-meta span {
  font-size: 11px;
  color: var(--text-3);
}

.voucher-meta p {
  margin: 0;
  font-size: 11px;
  line-height: 1.6;
  color: #50565e;
}

.code-block {
  margin-top: 16px;
  padding: 14px 12px;
  border-radius: 18px;
  background: #fff;
  text-align: center;
}

.code-number {
  display: flex;
  justify-content: center;
  gap: 10px;
  font-size: 20px;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: #2f343a;
}

.code-block p {
  margin: 9px 0 0;
  font-size: 10px;
  color: var(--text-3);
}

.scan-card {
  margin-top: 14px;
  padding: 14px 12px 12px;
  border-radius: 18px;
  background: #fff;
  text-align: center;
}

.qr-code {
  width: 156px;
  height: 156px;
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 3px;
  margin: 0 auto;
  padding: 10px;
  border-radius: 14px;
  background: #f5f5f4;
}

.cell {
  border-radius: 2px;
  background: #17191c;
  opacity: 0.14;
}

.cell--1,
.cell--2,
.cell--3,
.cell--7,
.cell--9,
.cell--13,
.cell--15,
.cell--16,
.cell--18,
.cell--19,
.cell--21,
.cell--24,
.cell--25,
.cell--27,
.cell--28,
.cell--30,
.cell--31,
.cell--33,
.cell--34,
.cell--35,
.cell--36 {
  opacity: 1;
}

.barcode {
  display: flex;
  justify-content: center;
  gap: 2px;
  margin: 14px auto 0;
  padding: 0 8px;
}

.barcode span {
  width: 2px;
  height: 46px;
  background: #1d2024;
}

.barcode span.wide {
  width: 3px;
}

.scan-card small {
  display: block;
  margin-top: 10px;
  font-size: 10px;
  color: var(--text-3);
  letter-spacing: 0.08em;
}

.finish-bar {
  position: fixed;
  left: 50%;
  bottom: 0;
  width: 100%;
  max-width: 402px;
  padding: 10px 16px 18px;
  box-sizing: border-box;
  transform: translateX(-50%);
  background: rgba(240, 248, 251, 0.96);
}

.finish-button {
  width: 100%;
  height: 36px;
  border: 0;
  border-radius: 999px;
  background: var(--primary);
  color: #fff;
  font-size: 12px;
  font-weight: 600;
}
</style>
