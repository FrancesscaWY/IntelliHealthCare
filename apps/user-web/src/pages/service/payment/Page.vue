<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import type { PageComponentProps } from "@ihc/page-core/types";
import mock from "./mock";
import {
  getOrderFlowState,
  resetPaymentSnapshot,
  setPaymentSnapshot
} from "@/pages/service/order-flow";
import {
  confirmPayment,
  createPayment,
  getPaymentChannels,
  type PaymentChannelItem
} from "@/shared/api/payments";

const props = defineProps<PageComponentProps>();

const PAYMENT_EXPIRE_MS = 15 * 60 * 1000;

const selectedPayment = ref("ALIPAY");
const submitting = ref(false);
const channels = ref<PaymentChannelItem[]>([]);
const countdownText = ref(mock.remainingTime);
const orderFlowState = getOrderFlowState();

let countdownTimer: ReturnType<typeof setInterval> | null = null;

const paymentAmount = computed(() => {
  const createdAmount = orderFlowState.createdOrder?.payableAmount;
  if (typeof createdAmount === "number") {
    return createdAmount.toFixed(2);
  }

  return mock.amount;
});

const isExpired = computed(() => countdownText.value === "00:00");

const paymentMethods = computed(() => {
  if (channels.value.length > 0) {
    return channels.value.map((method) => ({
      id: method.code,
      name: method.name,
      cardNo: undefined,
      icon:
        method.code === "ALIPAY"
          ? mock.methods.find((item) => item.id === "ALIPAY")?.icon
          : method.code === "WECHAT"
            ? mock.methods.find((item) => item.id === "WECHAT")?.icon
            : undefined
    }));
  }

  return mock.methods;
});

function formatCountdown(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function startCountdown() {
  const createdAt = orderFlowState.createdOrder?.createdAt;
  if (!createdAt) {
    countdownText.value = mock.remainingTime;
    return;
  }

  const expireAt = new Date(createdAt).getTime() + PAYMENT_EXPIRE_MS;
  const updateCountdown = () => {
    const remainingMs = expireAt - Date.now();
    countdownText.value = formatCountdown(remainingMs);

    if (remainingMs <= 0 && countdownTimer) {
      clearInterval(countdownTimer);
      countdownTimer = null;
    }
  };

  updateCountdown();
  countdownTimer = setInterval(updateCountdown, 1000);
}

function goBack() {
  if (!props.navigation.navigateBack()) {
    props.navigation.reLaunch("service/order-confirm");
  }
}

async function loadChannels() {
  try {
    const response = await getPaymentChannels();
    channels.value = response.list || [];
    if (channels.value.length > 0) {
      selectedPayment.value = channels.value[0].code;
    }
  } catch {
    channels.value = [];
  }
}

async function confirmPay() {
  const createdOrderId = orderFlowState.createdOrder?.orderId;
  if (!createdOrderId) {
    props.showToast("请先提交订单");
    props.navigation.reLaunch("service/order-confirm");
    return;
  }

  if (isExpired.value) {
    props.showToast("支付超时，请重新下单");
    return;
  }

  if (submitting.value) {
    return;
  }

  submitting.value = true;

  try {
    resetPaymentSnapshot();

    const createdPayment = await createPayment({
      orderId: createdOrderId,
      channel: selectedPayment.value
    });

    const confirmedPayment = await confirmPayment(createdPayment.paymentId);

    setPaymentSnapshot({
      paymentId: confirmedPayment.paymentId,
      orderId: confirmedPayment.orderId,
      channel: selectedPayment.value,
      amount: confirmedPayment.amount,
      status: confirmedPayment.status,
      paidAt: confirmedPayment.paidAt || null
    });

    props.showToast(confirmedPayment.status === "PAID" ? "支付成功" : "支付状态已更新");
    props.navigation.navigateTo("service/payment-result");
  } catch (error) {
    const message = error instanceof Error ? error.message : "支付失败";
    props.showToast(message);
  } finally {
    submitting.value = false;
  }
}

onMounted(() => {
  void loadChannels();
  startCountdown();
});

onBeforeUnmount(() => {
  if (countdownTimer) {
    clearInterval(countdownTimer);
    countdownTimer = null;
  }
});
</script>

<template>
  <div class="payment-page">
    <header class="page-header">
      <button class="back-button" type="button" aria-label="返回" @click="goBack">‹</button>
      <h1>支付订单</h1>
    </header>

    <main class="payment-content">
      <section class="amount-card">
        <div class="amount-block">
          <span>支付金额</span>
          <strong><small>¥</small>{{ paymentAmount }}</strong>
        </div>
        <div class="countdown">
          支付剩余时间：<span>{{ countdownText }}</span>
        </div>
      </section>

      <section class="method-section">
        <h2>选择支付方式</h2>
        <div class="method-card">
          <button
            v-for="method in paymentMethods"
            :key="method.id"
            class="method-row"
            type="button"
            @click="selectedPayment = method.id"
          >
            <span class="method-icon" :class="`method-icon--${method.id}`">
              <img v-if="method.icon" :src="method.icon" :alt="method.name" />
              <span v-else>银</span>
            </span>
            <span class="method-info">
              <strong>{{ method.name }}</strong>
              <small v-if="method.cardNo">{{ method.cardNo }}</small>
            </span>
            <span class="radio" :class="{ active: selectedPayment === method.id }"></span>
          </button>
        </div>
      </section>
    </main>

    <div class="pay-bar">
      <button class="pay-button" type="button" :disabled="submitting || isExpired" @click="confirmPay">
        {{ isExpired ? "支付已超时" : submitting ? "支付中..." : "确认支付" }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.payment-page {
  position: relative;
  left: 50%;
  width: min(402px, 100vw);
  min-height: 874px;
  margin: -18px 0;
  transform: translateX(-50%);
  padding: 16px 14px 96px;
  box-sizing: border-box;
  background: #ffffff;
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

.payment-content {
  display: flex;
  flex-direction: column;
}

.amount-card {
  min-height: 132px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  align-items: start;
  padding: 24px 22px;
  box-sizing: border-box;
  border-radius: 16px;
  background: #fff;
}

.amount-block span,
.countdown {
  color: #34383f;
  font-size: 17px;
  font-weight: 700;
}

.amount-block strong {
  display: block;
  margin-top: 18px;
  color: #006dff;
  font-size: 38px;
  line-height: 1;
  font-weight: 800;
  letter-spacing: 0;
}

.amount-block small {
  margin-right: 6px;
  font-size: 16px;
}

.countdown {
  padding-top: 2px;
  font-size: 15px;
  white-space: nowrap;
}

.countdown span {
  color: #2d90f0;
}

.method-section {
  margin-top: 28px;
}

.method-section h2 {
  margin: 0 0 20px;
  color: #9a9da4;
  font-size: 17px;
  font-weight: 600;
}

.method-card {
  padding: 6px 22px;
  border-radius: 16px;
  background: #fff;
}

.method-row {
  width: 100%;
  min-height: 76px;
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr) 24px;
  gap: 14px;
  align-items: center;
  padding: 0;
  border: 0;
  border-bottom: 1px solid #ededee;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.method-row:last-child {
  border-bottom: 0;
}

.method-icon {
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  overflow: hidden;
}

.method-icon img {
  width: 26px;
  height: 26px;
  object-fit: contain;
  display: block;
}

.method-icon--BANK {
  background: #d92234;
  color: #fff;
  font-size: 15px;
  font-weight: 800;
}

.method-info strong,
.method-info small {
  display: block;
}

.method-info strong {
  color: #34383f;
  font-size: 20px;
  font-weight: 800;
}

.method-info small {
  margin-top: 6px;
  color: #c4c6cc;
  font-size: 14px;
  font-weight: 700;
}

.radio {
  width: 20px;
  height: 20px;
  border: 2px solid #c4c6cc;
  border-radius: 50%;
  box-sizing: border-box;
}

.radio.active {
  border: 7px solid #75d6df;
}

.pay-bar {
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

.pay-button {
  width: 350px;
  max-width: 100%;
  height: 48px;
  display: block;
  margin: 0 auto;
  border: 0;
  border-radius: 8px;
  background: #75d6df;
  color: #fff;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 0;
  cursor: pointer;
}

.pay-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
</style>
