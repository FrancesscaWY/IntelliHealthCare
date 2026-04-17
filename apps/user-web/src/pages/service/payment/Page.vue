<script setup lang="ts">
import { computed, ref } from "vue";
import type { PageComponentProps } from "@ihc/page-core/types";
import { Left } from "@icon-park/vue-next";
import mock from "./mock";
import {
  getActiveHomeCareOrder,
  payHomeCareOrder,
} from "../home-care-orders/store";

const props = defineProps<PageComponentProps>();

const activeOrder = getActiveHomeCareOrder();
const selectedPayment = ref("alipay");

const displayAmount = computed(() => {
  if (!activeOrder) {
    return "0.00";
  }

  return activeOrder.actualAmount.toFixed(2);
});

function goBack() {
  if (!props.navigation.navigateBack()) {
    props.navigation.reLaunch("service/home-care-orders");
  }
}

function confirmPay() {
  if (!activeOrder) {
    props.showToast("未找到待支付订单");
    props.navigation.reLaunch("service/home-care-orders");
    return;
  }

  payHomeCareOrder(activeOrder.id);
  props.showToast("支付成功");
  props.navigation.navigateTo("service/payment-result");
}
</script>

<template>
  <section class="payment-page">
    <div class="status-bar">
      <span class="time">8:30</span>
      <div class="status-icons">
        <span class="signal">
          <i></i>
          <i></i>
          <i></i>
          <i></i>
        </span>
        <span class="wifi"></span>
        <span class="battery"></span>
      </div>
    </div>

    <header class="page-header">
      <button class="back-button" type="button" aria-label="返回" @click="goBack">
        <Left theme="outline" size="18" fill="currentColor" />
      </button>
      <div>
        <h1>支付订单</h1>
        <p>请在保留时限内完成支付</p>
      </div>
    </header>

    <main class="payment-content">
      <section class="amount-card">
        <div class="amount-row">
          <span>需支付</span>
          <strong>¥{{ displayAmount }}</strong>
        </div>
        <div v-if="activeOrder" class="amount-info">
          <p>{{ activeOrder.title }}</p>
          <div class="amount-meta">
            <span>预约时间 {{ activeOrder.bookingDate }} {{ activeOrder.bookingTimeSlot }}</span>
            <span>剩余 {{ activeOrder.paymentDeadline || "保留中" }}</span>
          </div>
        </div>
      </section>

      <section class="summary-card" v-if="activeOrder">
        <div class="summary-row">
          <span>联系人</span>
          <p>{{ activeOrder.contactName }} {{ activeOrder.contactPhone }}</p>
        </div>
        <div class="summary-row">
          <span>服务地址</span>
          <p>{{ activeOrder.address }}</p>
        </div>
        <div class="summary-row">
          <span>优惠抵扣</span>
          <p>-¥{{ activeOrder.couponAmount.toFixed(2) }}</p>
        </div>
      </section>

      <section class="method-section">
        <div class="section-title">
          <h2>支付方式</h2>
          <span>请选择一种方式完成付款</span>
        </div>
        <div class="method-card">
          <button
            v-for="method in mock.methods"
            :key="method.id"
            class="method-row"
            type="button"
            @click="selectedPayment = method.id"
          >
            <span class="method-icon" :class="`method-icon--${method.id}`">
              <img v-if="method.icon" :src="method.icon" :alt="method.name" />
              <span v-else>卡</span>
            </span>
            <span class="method-info">
              <strong>{{ method.name }}</strong>
              <small>{{ method.cardNo || method.desc }}</small>
            </span>
            <span class="radio" :class="{ 'radio--active': selectedPayment === method.id }"></span>
          </button>
        </div>
      </section>
    </main>

    <footer class="pay-bar">
      <button class="pay-button" type="button" @click="confirmPay">确认支付</button>
    </footer>
  </section>
</template>

<style scoped>
.payment-page {
  --page-bg: #edf4ff;
  --card-bg: rgba(255, 255, 255, 0.9);
  --card-border: #e3ebf7;
  --primary: #6872f0;
  --primary-soft: rgba(104, 114, 240, 0.1);
  --primary-2: #ed6d88;
  --text-3: #8ea0bc;
  position: relative;
  left: 50%;
  width: min(402px, 100vw);
  min-height: 874px;
  margin: -18px 0;
  transform: translateX(-50%);
  padding: 0 14px 84px;
  box-sizing: border-box;
  background: var(--page-bg);
  color: #34383f;
  font-family: "HarmonyOS Sans SC", "MiSans", "Source Han Sans SC", "PingFang SC", "Microsoft YaHei UI", sans-serif;
}

.status-bar {
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 6px 0;
  box-sizing: border-box;
}

.time {
  font-size: 14px;
  font-weight: 600;
}

.status-icons {
  display: flex;
  align-items: center;
  gap: 8px;
}

.signal {
  width: 18px;
  height: 12px;
  display: flex;
  align-items: flex-end;
  gap: 2px;
}

.signal i {
  width: 3px;
  border-radius: 1px;
  background: #111;
}

.signal i:nth-child(1) {
  height: 4px;
}

.signal i:nth-child(2) {
  height: 6px;
}

.signal i:nth-child(3) {
  height: 9px;
}

.signal i:nth-child(4) {
  height: 12px;
}

.wifi {
  position: relative;
  width: 15px;
  height: 11px;
  overflow: hidden;
}

.wifi::before,
.wifi::after {
  position: absolute;
  left: 50%;
  content: "";
  border: 2px solid #111;
  border-color: #111 transparent transparent;
  border-radius: 50%;
  transform: translateX(-50%);
}

.wifi::before {
  top: 0;
  width: 17px;
  height: 17px;
}

.wifi::after {
  top: 5px;
  width: 8px;
  height: 8px;
}

.battery {
  position: relative;
  width: 20px;
  height: 10px;
  border: 1.6px solid #111;
  border-radius: 3px;
  box-sizing: border-box;
}

.battery::before {
  position: absolute;
  top: 2px;
  right: -4px;
  width: 2px;
  height: 4px;
  content: "";
  background: #111;
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

.payment-content {
  display: grid;
  gap: 12px;
}

.amount-card,
.summary-card,
.method-card {
  padding: 14px;
  border: 1px solid var(--card-border);
  border-radius: 18px;
  background: var(--card-bg);
}

.amount-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.amount-row span {
  font-size: 11px;
  color: #9097a0;
}

.amount-row strong {
  font-size: 24px;
  font-weight: 700;
  color: var(--primary);
}

.amount-info p {
  margin: 10px 0 0;
  font-size: 12px;
  font-weight: 600;
}

.amount-meta {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  margin-top: 8px;
  font-size: 10px;
  color: var(--text-3);
}

.summary-card {
  display: grid;
  gap: 9px;
}

.summary-row {
  display: grid;
  grid-template-columns: 56px minmax(0, 1fr);
  gap: 10px;
}

.summary-row span {
  font-size: 11px;
  color: var(--text-3);
}

.summary-row p {
  margin: 0;
  font-size: 11px;
  line-height: 1.55;
  color: #535a63;
}

.section-title {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 10px;
}

.section-title h2 {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
}

.section-title span {
  font-size: 10px;
  color: var(--text-3);
}

.method-card {
  padding-top: 6px;
  padding-bottom: 6px;
}

.method-row {
  width: 100%;
  display: grid;
  grid-template-columns: 30px minmax(0, 1fr) 18px;
  gap: 10px;
  align-items: center;
  padding: 10px 0;
  border: 0;
  border-bottom: 1px solid #eff0f2;
  background: transparent;
  text-align: left;
}

.method-row:last-child {
  border-bottom: 0;
}

.method-icon {
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  border-radius: 10px;
  background: #f4f6f9;
  overflow: hidden;
  font-size: 10px;
  color: #66707a;
}

.method-icon img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.method-info {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.method-info strong {
  font-size: 12px;
  font-weight: 600;
  color: #35393e;
}

.method-info small {
  font-size: 10px;
  color: #98a0a8;
}

.radio {
  width: 16px;
  height: 16px;
  border: 1.6px solid #cfd4dc;
  border-radius: 50%;
}

.radio--active {
  border-color: var(--primary);
  background: #ffffff;
  box-shadow: inset 0 0 0 4px var(--primary);
}

.pay-bar {
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

.pay-button {
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
