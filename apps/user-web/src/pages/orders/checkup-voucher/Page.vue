<script setup lang="ts">
import { computed, onMounted } from "vue";
import type { PageComponentProps } from "@ihc/page-core/types";
import mock from "./mock";
import { useOrderCenter } from "@/pages/service/order-center";

const props = defineProps<PageComponentProps>();
const { currentOrder, currentOrderVoucher, ensureCurrentOrderReady, ensureCurrentVoucher } = useOrderCenter();

const qrCells = new Set([0,1,2,3,4,5,6,8,10,12,14,16,18,20,22,24,26,28,30,32,34,36,38,40,42,44,48,49,50,51,52,53,54,60,63,64,67,70,72,76,78,81,83,85,88,90,91,94,97,100,102,105,108,110,111,114,117,119,121,124,126,128,129,132,134,137,140,142,145,147,149,152,154,155,158,160,162,165,168,170,173,176,178,180,181,184,187,190,192,194,197,200,202,205,207,209,212,214,216,219,220,221,224]);

const serviceTitle = computed(() => currentOrder.value?.title || mock.serviceName);
const voucherCode = computed(() => currentOrderVoucher.value?.voucherCode || mock.code);
const codeGroups = computed(() => voucherCode.value.split("-"));
const bookingTime = computed(() => {
  if (currentOrderVoucher.value?.bookingDate) {
    return `${currentOrderVoucher.value.bookingDate} ${currentOrderVoucher.value.bookingTimeSlot || ""}`.trim();
  }
  return mock.serviceTime;
});

function goBack() {
  if (!props.navigation.navigateBack()) {
    props.navigation.reLaunch("orders/rehab-therapy");
  }
}

onMounted(async () => {
  await ensureCurrentOrderReady();
  await ensureCurrentVoucher();
});
</script>

<template>
  <section class="voucher-page">
    <header class="page-nav">
      <button class="back-btn" type="button" aria-label="返回" @click="goBack">
        <span aria-hidden="true"></span>
      </button>
      <h1>{{ mock.title }}</h1>
    </header>

    <main class="voucher-scroll">
      <section class="service-card">
        <span class="service-tag">{{ mock.serviceType }}</span>
        <h2>{{ serviceTitle }}</h2>
        <div class="meta-row">
          <span>服务时间</span>
          <p>{{ bookingTime }}</p>
        </div>
      </section>

      <section class="code-card">
        <div class="qr-shell" aria-label="服务二维码">
          <span v-for="index in 225" :key="index" :class="{ active: qrCells.has(index - 1) }"></span>
        </div>
        <p class="code-title">核销码</p>
        <div class="verify-code">
          <strong v-for="group in codeGroups" :key="group">{{ group }}</strong>
        </div>
        <p class="code-hint">{{ mock.hint }}</p>
      </section>
    </main>
  </section>
</template>

<style scoped>
.voucher-page { position: relative; left: 50%; width: min(402px, 100vw); height: min(874px, calc(100vh - 36px)); min-height: min(874px, calc(100vh - 36px)); max-height: 874px; margin: -18px 0; overflow: hidden; background: #ffffff; color: #30343f; font-family: var(--ihc-font-family); transform: translateX(-50%); -webkit-font-smoothing: antialiased; }
.page-nav { display: flex; align-items: center; height: 74px; padding: 0 29px; }
.back-btn { display: grid; place-items: center; width: 30px; height: 44px; padding: 0; border: 0; background: transparent; }
.back-btn span { width: 14px; height: 14px; border-bottom: 4px solid #333333; border-left: 4px solid #333333; transform: rotate(45deg); }
.page-nav h1 { margin: 0 0 0 9px; color: #30343f; font-size: 24px; font-weight: 500; letter-spacing: 0.03em; }
.voucher-scroll { height: calc(100% - 74px); padding: 16px 18px 34px; overflow-y: auto; scrollbar-width: none; }
.voucher-scroll::-webkit-scrollbar { display: none; }
.service-card,.code-card { border-radius: 18px; background: #f8fbfc; box-shadow: 0 12px 30px rgba(70, 110, 140, 0.08); }
.service-card { padding: 20px 18px; }
.service-tag { display: inline-flex; align-items: center; height: 26px; padding: 0 12px; border-radius: 999px; background: rgba(117,214,223,.18); color: #2b9fa9; font-size: 13px; font-weight: 900; }
.service-card h2 { margin: 14px 0 18px; color: #1f2a44; font-size: 21px; font-weight: 900; line-height: 1.35; }
.meta-row { display: grid; gap: 6px; padding: 13px 0; border-top: 1px solid rgba(120,146,166,.16); }
.meta-row span { color: rgba(48,52,63,.52); font-size: 13px; font-weight: 900; }
.meta-row p { margin: 0; color: #30343f; font-size: 15px; font-weight: 900; line-height: 1.45; }
.code-card { display: grid; justify-items: center; margin-top: 18px; padding: 26px 18px 24px; }
.qr-shell { display: grid; grid-template-columns: repeat(15, 8px); grid-auto-rows: 8px; gap: 3px; padding: 18px; border: 10px solid #ffffff; border-radius: 18px; background: #ffffff; box-shadow: 0 16px 34px rgba(60,106,139,.12); }
.qr-shell span { border-radius: 2px; background: #eef4f6; }
.qr-shell span.active { background: #1f2a44; }
.code-title { margin: 22px 0 10px; color: rgba(48,52,63,.55); font-size: 13px; font-weight: 900; }
.verify-code { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; }
.verify-code strong { padding: 7px 9px; border-radius: 10px; background: #ffffff; color: #2d90f0; font-size: 15px; font-weight: 900; letter-spacing: .02em; }
.code-hint { margin: 18px 0 0; color: rgba(48,52,63,.58); font-size: 13px; font-weight: 800; line-height: 1.6; text-align: center; }
</style>
