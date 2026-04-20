<script setup lang="ts">
import { computed } from "vue";
import type { PageComponentProps } from "@ihc/page-core/types";
import { getActiveHomeCareOrder } from "../home-care-orders/store";

const props = defineProps<PageComponentProps>();

const activeOrder = computed(() => getActiveHomeCareOrder());

const codeGroups = computed(() => {
  const serviceCode = activeOrder.value?.serviceCode || "";
  return serviceCode ? serviceCode.split(" ") : [];
});

const qrCodeUrl = computed(() => {
  const order = activeOrder.value;
  if (!order) {
    return "";
  }

  const qrPayload = [
    "IHC_SERVICE_VOUCHER",
    `orderNo=${order.orderNo}`,
    `serviceCode=${order.serviceCode.replace(/\s+/g, "")}`,
    `bookingDate=${order.bookingDate}`,
    `weekday=${order.bookingWeekday}`,
    `timeSlot=${order.bookingTimeSlot}`,
    `contactPhone=${order.contactPhone}`,
  ].join(";");

  const searchParams = new URLSearchParams({
    data: qrPayload,
    size: "156x156",
    format: "png",
    ecc: "M",
    qzone: "2",
    margin: "0",
    "charset-source": "UTF-8",
    "charset-target": "UTF-8",
    color: "1d2024",
    bgcolor: "ffffff",
  });

  return `https://api.qrserver.com/v1/create-qr-code/?${searchParams.toString()}`;
});

const barcodeUrl = computed(() => {
  const order = activeOrder.value;
  if (!order) {
    return "";
  }

  const searchParams = new URLSearchParams({
    includetext: "",
    height: "46",
  });

  return `https://barcodeapi.org/api/128/${encodeURIComponent(order.orderNo)}?${searchParams.toString()}`;
});

function goBack() {
  if (!props.navigation.navigateBack()) {
    props.navigation.reLaunch("service/home-care-orders");
  }
}

function viewOrder() {
  props.navigation.navigateTo("service/order-detail");
}
</script>

<template>
  <div class="payment-result-page">
    <header class="page-header">
      <button class="back-button" type="button" aria-label="返回" @click="goBack">‹</button>
      <h1>支付结果</h1>
    </header>

    <main class="voucher-content">
      <section v-if="activeOrder" class="voucher-card">
        <div class="voucher-top">
          <div>
            <span class="voucher-label">家政护理</span>
            <h2>{{ activeOrder.title }}</h2>
          </div>
          <strong>￥{{ activeOrder.actualAmount.toFixed(2) }}</strong>
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
          <div class="qr-code">
            <img
              v-if="qrCodeUrl"
              class="qr-code__image"
              :src="qrCodeUrl"
              :alt="`${activeOrder.title}服务二维码`"
              loading="eager"
              referrerpolicy="no-referrer"
            />
          </div>
          <div class="barcode">
            <img
              v-if="barcodeUrl"
              class="barcode__image"
              :src="barcodeUrl"
              :alt="`${activeOrder.orderNo}服务条形码`"
              loading="eager"
              referrerpolicy="no-referrer"
            />
          </div>
        </div>
      </section>

      <section v-else class="empty-card">
        <h2>未找到订单</h2>
        <p>当前没有可展示的服务券信息，请返回订单列表重新进入。</p>
      </section>
    </main>

    <div class="result-bar">
      <button class="result-button" type="button" @click="viewOrder">查看订单</button>
    </div>
  </div>
</template>

<style scoped>
.payment-result-page {
  position: relative;
  left: 50%;
  width: min(402px, 100vw);
  min-height: 874px;
  margin: -18px 0;
  transform: translateX(-50%);
  padding: 16px 14px 96px;
  box-sizing: border-box;
  background: #f5f6f7;
  color: #34383f;
  font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif;
}

.page-header {
  height: 58px;
  display: flex;
  align-items: center;
  margin-bottom: 26px;
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

.voucher-content {
  display: flex;
  flex-direction: column;
}

.voucher-card,
.empty-card {
  padding: 24px 22px;
  border-radius: 16px;
  background: #fff;
}

.voucher-top {
  display: flex;
  justify-content: space-between;
  gap: 16px;
}

.voucher-label {
  display: inline-block;
  margin-bottom: 10px;
  color: #6870f2;
  font-size: 14px;
  font-weight: 700;
}

.voucher-top h2 {
  margin: 0;
  font-size: 22px;
  line-height: 1.4;
}

.voucher-top strong {
  color: #f1736d;
  font-size: 24px;
  white-space: nowrap;
}

.voucher-meta {
  margin-top: 18px;
}

.voucher-meta span {
  display: block;
  margin-bottom: 8px;
  color: #9fa2a9;
  font-size: 14px;
  font-weight: 700;
}

.voucher-meta p,
.code-block p,
.empty-card p {
  margin: 0;
  color: #34383f;
  font-size: 16px;
  line-height: 1.6;
}

.code-block {
  margin-top: 24px;
  padding: 18px;
  border-radius: 14px;
  background: #f6f7fb;
  text-align: center;
}

.code-number {
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-bottom: 10px;
}

.code-number span {
  min-width: 60px;
  padding: 8px 10px;
  border-radius: 10px;
  background: #fff;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.scan-card {
  margin-top: 24px;
  padding: 18px 0 6px;
  border-top: 1px solid #ededee;
}

.qr-code {
  width: 156px;
  height: 156px;
  display: grid;
  place-items: center;
  margin: 0 auto;
  padding: 10px;
  border-radius: 14px;
  background: #f5f5f4;
  box-sizing: border-box;
}

.qr-code__image {
  display: block;
  width: 136px;
  height: 136px;
  border-radius: 10px;
  background: #ffffff;
}

.barcode {
  display: grid;
  place-items: center;
  margin: 14px auto 0;
  padding: 0 8px;
}

.barcode__image {
  display: block;
  width: 100%;
  max-width: 270px;
  height: 46px;
  object-fit: fill;
  background: #ffffff;
}

.empty-card h2 {
  margin: 0 0 10px;
  font-size: 22px;
}

.result-bar {
  position: fixed;
  left: 50%;
  bottom: 0;
  z-index: 20;
  width: 100%;
  max-width: 402px;
  padding: 12px 26px 28px;
  box-sizing: border-box;
  transform: translateX(-50%);
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 -8px 20px rgba(20, 24, 36, 0.04);
}

.result-button {
  width: 350px;
  max-width: 100%;
  height: 48px;
  display: block;
  margin: 0 auto;
  border: 0;
  border-radius: 8px;
  background: #6870f2;
  color: #fff;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 0;
  cursor: pointer;
}
</style>
