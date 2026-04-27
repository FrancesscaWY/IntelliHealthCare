<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import type { PageComponentProps } from "@ihc/page-core/types";
import { getPayment, type PaymentChannel, type PaymentStatus } from "@/shared/api/payments";
import {
  mergeServicePaymentContext,
  readServicePaymentContext
} from "@/shared/payment/session";

const props = defineProps<PageComponentProps>();

const STATUS_COPY: Record<
  PaymentStatus,
  {
    title: string;
    description: string;
    tone: "success" | "pending" | "warning";
    symbol: string;
  }
> = {
  PENDING: {
    title: "\u652f\u4ed8\u5904\u7406\u4e2d",
    description: "\u652f\u4ed8\u5355\u5df2\u521b\u5efa\uff0c\u8bf7\u7a0d\u540e\u5237\u65b0\u67e5\u770b\u652f\u4ed8\u7ed3\u679c",
    tone: "pending",
    symbol: "..."
  },
  PAID: {
    title: "\u652f\u4ed8\u6210\u529f",
    description: "\u60a8\u7684\u8ba2\u5355\u5df2\u652f\u4ed8\u6210\u529f",
    tone: "success",
    symbol: "OK"
  },
  FAILED: {
    title: "\u652f\u4ed8\u5931\u8d25",
    description: "\u652f\u4ed8\u672a\u6210\u529f\uff0c\u8bf7\u8fd4\u56de\u91cd\u8bd5",
    tone: "warning",
    symbol: "!"
  },
  REFUNDED: {
    title: "\u5df2\u9000\u6b3e",
    description: "\u8be5\u652f\u4ed8\u5355\u5df2\u9000\u6b3e",
    tone: "warning",
    symbol: "!"
  },
  CLOSED: {
    title: "\u652f\u4ed8\u5df2\u5173\u95ed",
    description: "\u8be5\u652f\u4ed8\u5355\u5df2\u5173\u95ed",
    tone: "warning",
    symbol: "!"
  }
};

const CHANNEL_COPY: Record<PaymentChannel, string> = {
  WECHAT: "\u5fae\u4fe1\u652f\u4ed8",
  ALIPAY: "\u652f\u4ed8\u5b9d",
  BALANCE: "\u4f59\u989d\u652f\u4ed8",
  OFFLINE: "\u7ebf\u4e0b\u652f\u4ed8"
};

const UI = {
  backAria: "\u8fd4\u56de",
  pageTitle: "\u652f\u4ed8\u7ed3\u679c",
  resultAria: "\u652f\u4ed8\u7ed3\u679c",
  loading: "\u7ed3\u679c\u52a0\u8f7d\u4e2d...",
  viewOrder: "\u67e5\u770b\u8ba2\u5355",
  paymentNoLabel: "\u652f\u4ed8\u5355\u53f7",
  orderLabel: "\u8ba2\u5355\u4fe1\u606f",
  channelLabel: "\u652f\u4ed8\u65b9\u5f0f",
  statusLabel: "\u652f\u4ed8\u72b6\u6001",
  amountLabel: "\u652f\u4ed8\u91d1\u989d",
  createdAtLabel: "\u521b\u5efa\u65f6\u95f4",
  paidAtLabel: "\u652f\u4ed8\u65f6\u95f4",
  serviceLabel: "\u670d\u52a1\u540d\u79f0",
  emptyValue: "--",
  missingOrder: "\u672a\u627e\u5230\u8ba2\u5355\u4fe1\u606f",
  missingPayment: "\u672a\u627e\u5230\u652f\u4ed8\u5355",
  loadFailed: "\u652f\u4ed8\u7ed3\u679c\u52a0\u8f7d\u5931\u8d25"
} as const;

const paymentContext = ref(readServicePaymentContext());
const paymentStatus = ref<PaymentStatus>(paymentContext.value?.paymentStatus ?? "PENDING");
const isLoading = ref(false);
const loadError = ref<string | null>(null);

const resultCopy = computed(() => STATUS_COPY[paymentStatus.value]);

const displayAmount = computed(() => {
  const amount = paymentContext.value?.amount;
  return typeof amount === "number" ? formatCurrency(amount) : UI.emptyValue;
});

const displayChannel = computed(() => {
  const channel = paymentContext.value?.paymentChannel;
  return channel ? CHANNEL_COPY[channel] : UI.emptyValue;
});

const displayStatus = computed(() => STATUS_COPY[paymentStatus.value].title);

const displayOrderText = computed(() => {
  const serviceTitle = paymentContext.value?.serviceTitle;
  const orderNo = paymentContext.value?.orderNo;

  if (serviceTitle && orderNo) {
    return `${serviceTitle} / ${orderNo}`;
  }

  if (serviceTitle) {
    return serviceTitle;
  }

  if (orderNo) {
    return orderNo;
  }

  return paymentContext.value?.orderId ?? UI.emptyValue;
});

function formatCurrency(amount: number) {
  return `\uFFE5${amount.toFixed(2)}`;
}

function goBack() {
  if (!props.navigation.navigateBack()) {
    props.navigation.reLaunch(
      paymentContext.value?.orderId ? "service/payment" : "service/order-confirm"
    );
  }
}

function viewOrder() {
  const orderId = paymentContext.value?.orderId;

  if (!orderId) {
    props.showToast(UI.missingOrder);
    return;
  }

  props.navigation.navigateTo("service/order-detail");
}

onMounted(async () => {
  const paymentId = paymentContext.value?.paymentId;

  if (!paymentId) {
    loadError.value = UI.missingPayment;
    return;
  }

  try {
    isLoading.value = true;
    loadError.value = null;

    const payment = await getPayment(paymentId);
    paymentStatus.value = payment.status;

    mergeServicePaymentContext({
      orderId: payment.orderId,
      paymentId: payment.paymentId,
      paymentNo: payment.paymentNo,
      paymentStatus: payment.status,
      paymentChannel: payment.channel,
      amount: payment.amount,
      paidAt: payment.paidAt,
      createdAt: payment.createdAt
    });

    paymentContext.value = readServicePaymentContext();
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : UI.loadFailed;
  } finally {
    isLoading.value = false;
  }
});
</script>

<template>
  <div class="payment-result-page">
    <header class="page-header">
      <button class="back-button" type="button" :aria-label="UI.backAria" @click="goBack">
        &lt;
      </button>
      <h1>{{ UI.pageTitle }}</h1>
    </header>

    <main class="result-content" :aria-label="UI.resultAria">
      <div class="status-icon" :class="`status-icon--${resultCopy.tone}`" aria-hidden="true">
        <span class="status-symbol">{{ resultCopy.symbol }}</span>
      </div>
      <h2>{{ isLoading ? UI.loading : resultCopy.title }}</h2>
      <p>{{ loadError || resultCopy.description }}</p>

      <section class="detail-card">
        <dl>
          <div>
            <dt>{{ UI.paymentNoLabel }}</dt>
            <dd>{{ paymentContext?.paymentNo || UI.emptyValue }}</dd>
          </div>
          <div>
            <dt>{{ UI.orderLabel }}</dt>
            <dd>{{ displayOrderText }}</dd>
          </div>
          <div>
            <dt>{{ UI.channelLabel }}</dt>
            <dd>{{ displayChannel }}</dd>
          </div>
          <div>
            <dt>{{ UI.statusLabel }}</dt>
            <dd>{{ displayStatus }}</dd>
          </div>
          <div>
            <dt>{{ UI.amountLabel }}</dt>
            <dd>{{ displayAmount }}</dd>
          </div>
          <div>
            <dt>{{ UI.createdAtLabel }}</dt>
            <dd>{{ paymentContext?.createdAt || UI.emptyValue }}</dd>
          </div>
          <div>
            <dt>{{ UI.paidAtLabel }}</dt>
            <dd>{{ paymentContext?.paidAt || UI.emptyValue }}</dd>
          </div>
          <div>
            <dt>{{ UI.serviceLabel }}</dt>
            <dd>{{ paymentContext?.serviceTitle || UI.emptyValue }}</dd>
          </div>
        </dl>
      </section>
    </main>

    <div class="result-bar">
      <button class="result-button" type="button" @click="viewOrder">{{ UI.viewOrder }}</button>
    </div>
  </div>
</template>

<style scoped>
.payment-result-page {
  position: relative;
  left: 50%;
  width: min(402px, 100vw);
  min-height: var(--ihc-page-min-height);
  margin: -18px 0;
  transform: translateX(-50%);
  padding: 16px 14px 120px;
  box-sizing: border-box;
  background: #ffffff;
  color: #34383f;
  font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif;
}

.page-header {
  height: 58px;
  display: flex;
  align-items: center;
}

.back-button {
  width: 24px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 16px 0 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: #34383f;
  font-size: 28px;
  line-height: 1;
  font-weight: 400;
  cursor: pointer;
}

.page-header h1 {
  margin: 0;
  color: #34383f;
  font-size: 22px;
  line-height: 1;
  font-weight: 600;
  letter-spacing: 0;
}

.result-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 72px;
  box-sizing: border-box;
}

.status-icon {
  width: 120px;
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}

.status-icon--success {
  background: #75d6df;
}

.status-icon--pending {
  background: #f5c75b;
}

.status-icon--warning {
  background: #f08a7c;
}

.status-symbol {
  color: #ffffff;
  font-size: 32px;
  font-weight: 800;
  letter-spacing: 1px;
}

.result-content h2 {
  margin: 32px 0 0;
  color: #34383f;
  font-size: 32px;
  line-height: 1.2;
  font-weight: 700;
  letter-spacing: 0;
}

.result-content p {
  margin: 18px 0 0;
  color: #a8adb4;
  font-size: 16px;
  line-height: 1.6;
  font-weight: 600;
  text-align: center;
}

.detail-card {
  width: 100%;
  margin-top: 28px;
  padding: 22px;
  border-radius: 16px;
  background: #fff;
  box-sizing: border-box;
}

.detail-card dl {
  margin: 0;
}

.detail-card div {
  display: grid;
  grid-template-columns: 92px 1fr;
  gap: 14px;
  margin-bottom: 14px;
  align-items: start;
}

.detail-card div:last-child {
  margin-bottom: 0;
}

.detail-card dt {
  color: #a0a3aa;
  font-size: 15px;
  font-weight: 700;
}

.detail-card dd {
  margin: 0;
  color: #34383f;
  font-size: 16px;
  font-weight: 700;
  line-height: 1.5;
  text-align: right;
  word-break: break-all;
}

.result-bar {
  position: fixed;
  left: 50%;
  bottom: 0;
  z-index: 20;
  width: min(402px, 100vw);
  transform: translateX(-50%);
  padding: 16px 16px 28px;
  box-sizing: border-box;
  background: #ffffff;
  border-top: 1px solid #f0f1f3;
}

.result-button {
  width: 100%;
  max-width: 100%;
  height: 52px;
  display: block;
  margin: 0 auto;
  border: 0;
  border-radius: 12px;
  background: #75d6df;
  color: #ffffff;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 0;
  cursor: pointer;
}
</style>
