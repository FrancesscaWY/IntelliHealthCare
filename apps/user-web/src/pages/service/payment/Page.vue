<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import alipayIcon from "@/assets/login/zfb.png";
import wechatIcon from "@/assets/login/wx.png";
import type { PageComponentProps } from "@ihc/page-core/types";
import {
  confirmPayment,
  createPayment,
  getPaymentChannels,
  type PaymentChannel,
  type PaymentChannelOption
} from "@/shared/api/payments";
import {
  mergeServicePaymentContext,
  readServicePaymentContext
} from "@/shared/payment/session";

const props = defineProps<PageComponentProps>();

const DEFAULT_REMAINING_TIME = "01:06:09";

const CHANNEL_META: Record<
  PaymentChannel,
  {
    uiKey: string;
    title: string;
    icon?: string;
    badgeText?: string;
  }
> = {
  ALIPAY: {
    uiKey: "alipay",
    title: "\u652f\u4ed8\u5b9d",
    icon: alipayIcon
  },
  WECHAT: {
    uiKey: "wechat",
    title: "\u5fae\u4fe1\u652f\u4ed8",
    icon: wechatIcon
  },
  BALANCE: {
    uiKey: "balance",
    title: "\u4f59\u989d\u652f\u4ed8",
    badgeText: "\u4f59"
  },
  OFFLINE: {
    uiKey: "offline",
    title: "\u7ebf\u4e0b\u652f\u4ed8",
    badgeText: "\u7ebf"
  }
};

const FALLBACK_CHANNELS: PaymentChannelOption[] = [
  {
    channel: "ALIPAY",
    title: CHANNEL_META.ALIPAY.title,
    enabled: true
  },
  {
    channel: "WECHAT",
    title: CHANNEL_META.WECHAT.title,
    enabled: true
  },
  {
    channel: "BALANCE",
    title: CHANNEL_META.BALANCE.title,
    enabled: true
  }
];

const UI = {
  backAria: "\u8fd4\u56de",
  pageTitle: "\u652f\u4ed8\u8ba2\u5355",
  amountLabel: "\u652f\u4ed8\u91d1\u989d",
  countdownLabel: "\u5269\u4f59\u652f\u4ed8\u65f6\u95f4",
  orderInfoTitle: "\u8ba2\u5355\u4fe1\u606f",
  serviceLabel: "\u670d\u52a1\u540d\u79f0",
  orderNoLabel: "\u8ba2\u5355\u53f7",
  methodTitle: "\u9009\u62e9\u652f\u4ed8\u65b9\u5f0f",
  methodLoading: "\u652f\u4ed8\u6e20\u9053\u52a0\u8f7d\u4e2d...",
  methodEmpty: "\u6682\u65e0\u53ef\u7528\u652f\u4ed8\u6e20\u9053",
  confirmPay: "\u786e\u8ba4\u652f\u4ed8",
  creating: "\u652f\u4ed8\u786e\u8ba4\u4e2d...",
  serviceFallback: "\u5f85\u652f\u4ed8\u670d\u52a1",
  orderNoFallback: "--",
  methodFallback: "\u652f\u4ed8\u65b9\u5f0f",
  missingOrder: "\u7f3a\u5c11\u8ba2\u5355\u4fe1\u606f\uff0c\u8bf7\u5148\u63d0\u4ea4\u8ba2\u5355",
  legacyPendingOrder:
    "\u8be5\u5f85\u652f\u4ed8\u8ba2\u5355\u4ecd\u662f\u539f\u6709\u793a\u4f8b\u6570\u636e\uff0c\u672a\u63a5\u5165\u540e\u7aef\u771f\u5b9e orderId\uff0c\u6682\u65f6\u65e0\u6cd5\u76f4\u63a5\u652f\u4ed8",
  legacyPendingHint:
    "\u5f53\u524d\u8ba2\u5355\u662f\u65e7\u7684\u5f85\u652f\u4ed8\u793a\u4f8b\u6570\u636e\uff0c\u9875\u9762\u5df2\u5e26\u51fa\u8ba2\u5355\u4fe1\u606f\uff0c\u4f46\u56e0\u4e3a\u7f3a\u5c11\u540e\u7aef\u771f\u5b9e orderId\uff0c\u8fd8\u4e0d\u80fd\u76f4\u63a5\u53d1\u8d77\u652f\u4ed8\u3002",
  channelLoadFailed: "\u652f\u4ed8\u6e20\u9053\u52a0\u8f7d\u5931\u8d25\uff0c\u5df2\u5207\u6362\u9ed8\u8ba4\u652f\u4ed8\u65b9\u5f0f",
  payFailed: "\u652f\u4ed8\u786e\u8ba4\u5931\u8d25"
} as const;

interface PaymentMethodView {
  channel: PaymentChannel;
  uiKey: string;
  name: string;
  icon?: string;
  badgeText?: string;
}

const selectedChannel = ref<PaymentChannel>("ALIPAY");
const isSubmitting = ref(false);
const isLoadingChannels = ref(false);
const hasLoadedChannels = ref(false);
const paymentContext = ref(readServicePaymentContext());
const paymentChannels = ref<PaymentChannelOption[]>([]);

const displayAmount = computed(() => {
  const amount = paymentContext.value?.amount;
  return typeof amount === "number" ? formatCurrency(amount) : UI.orderNoFallback;
});

const displayServiceTitle = computed(
  () => paymentContext.value?.serviceTitle ?? UI.serviceFallback
);

const displayOrderNo = computed(() => paymentContext.value?.orderNo ?? UI.orderNoFallback);
const isLegacyPendingOrder = computed(() => paymentContext.value?.isLegacyPendingOrder === true);

const paymentMethods = computed<PaymentMethodView[]>(() => {
  const source = hasLoadedChannels.value ? paymentChannels.value : FALLBACK_CHANNELS;

  return source
    .filter((channel) => channel.enabled)
    .map((channel) => {
      const meta = CHANNEL_META[channel.channel];
      return {
        channel: channel.channel,
        uiKey: meta.uiKey,
        name: meta.title || channel.title || UI.methodFallback,
        icon: meta.icon,
        badgeText: meta.badgeText
      };
    });
});

const goBack = () => {
  if (!props.navigation.navigateBack()) {
    props.navigation.reLaunch("service/order-confirm");
    props.navigation.reLaunch("service/order-confirm");
  }
};

function formatCurrency(amount: number) {
  return `\uFFE5${amount.toFixed(2)}`;
}

function syncSelectedChannel() {
  const availableChannels = paymentMethods.value.map((method) => method.channel);

  if (!availableChannels.includes(selectedChannel.value)) {
    selectedChannel.value = availableChannels[0] ?? "ALIPAY";
  }
}

async function loadPaymentChannels() {
  if (isLoadingChannels.value) {
    return;
  }

  try {
    isLoadingChannels.value = true;
    const channels = await getPaymentChannels();

    paymentChannels.value = channels;
    hasLoadedChannels.value = true;
  } catch {
    paymentChannels.value = FALLBACK_CHANNELS;
    hasLoadedChannels.value = false;
    props.showToast(UI.channelLoadFailed);
  } finally {
    isLoadingChannels.value = false;
    syncSelectedChannel();
  }
}

const confirmPay = async () => {
  if (isSubmitting.value) {
    return;
  }

  const orderId = paymentContext.value?.orderId;

  if (!orderId) {
    props.showToast(isLegacyPendingOrder.value ? UI.legacyPendingOrder : UI.missingOrder);
    return;
  }

  try {
    isSubmitting.value = true;

    const createdPayment = await createPayment({
      orderId,
      channel: selectedChannel.value
    });
    const confirmedPayment = await confirmPayment(createdPayment.paymentId);

    mergeServicePaymentContext({
      orderId: confirmedPayment.orderId,
      paymentId: confirmedPayment.paymentId,
      paymentNo: confirmedPayment.paymentNo,
      paymentStatus: confirmedPayment.status,
      paymentChannel: confirmedPayment.channel,
      amount: confirmedPayment.amount,
      paidAt: confirmedPayment.paidAt,
      createdAt: confirmedPayment.createdAt
    });

    paymentContext.value = readServicePaymentContext();
    props.navigation.navigateTo("service/payment-result");
  } catch (error) {
    props.showToast(error instanceof Error ? error.message : UI.payFailed);
  } finally {
    isSubmitting.value = false;
  }
};

onMounted(() => {
  void loadPaymentChannels();
});
</script>

<template>
  <div class="payment-page">
    <header class="page-header">
      <button class="back-button" type="button" :aria-label="UI.backAria" @click="goBack">
        &lt;
      </button>
      <h1>{{ UI.pageTitle }}</h1>
    </header>

    <main class="payment-content">
      <section class="amount-card">
        <div class="amount-block">
          <span>{{ UI.amountLabel }}</span>
          <strong>{{ displayAmount }}</strong>
        </div>
        <div class="countdown">
          {{ UI.countdownLabel }}
          <span>{{ DEFAULT_REMAINING_TIME }}</span>
        </div>
      </section>

      <section class="order-card">
        <h2>{{ UI.orderInfoTitle }}</h2>
        <dl>
          <div>
            <dt>{{ UI.serviceLabel }}</dt>
            <dd>{{ displayServiceTitle }}</dd>
          </div>
          <div>
            <dt>{{ UI.orderNoLabel }}</dt>
            <dd>{{ displayOrderNo }}</dd>
          </div>
        </dl>
        <p v-if="isLegacyPendingOrder" class="section-hint order-hint">{{ UI.legacyPendingHint }}</p>
      </section>

      <section class="method-section">
        <h2>{{ UI.methodTitle }}</h2>
        <p v-if="isLoadingChannels" class="section-hint">{{ UI.methodLoading }}</p>
        <div v-if="paymentMethods.length > 0" class="method-card">
          <button
            v-for="method in paymentMethods"
            :key="method.channel"
            class="method-row"
            type="button"
            @click="selectedChannel = method.channel"
          >
            <span class="method-icon" :class="`method-icon--${method.uiKey}`">
              <img v-if="method.icon" :src="method.icon" :alt="method.name" />
              <span v-else>{{ method.badgeText }}</span>
            </span>
            <span class="method-info">
              <strong>{{ method.name }}</strong>
            </span>
            <span class="radio" :class="{ active: selectedChannel === method.channel }"></span>
          </button>
        </div>
        <p v-else class="empty-text">{{ UI.methodEmpty }}</p>
      </section>
    </main>

    <div class="pay-bar">
      <button
        class="pay-button"
        type="button"
        :disabled="isSubmitting || paymentMethods.length === 0"
        @click="confirmPay"
      >
        {{ isSubmitting ? UI.creating : UI.confirmPay }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.payment-page {
  position: relative;
  left: 50%;
  width: min(402px, 100vw);
  min-height: var(--ihc-page-min-height);
  margin: -18px 0;
  transform: translateX(-50%);
  padding: 16px 14px 96px;
  box-sizing: border-box;
  background: #ffffff;
  color: #34383f;
  font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif;
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
  font-size: 28px;
  line-height: 1;
  font-weight: 400;
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
  gap: 24px;
}

.amount-card,
.order-card {
  padding: 24px 22px;
  box-sizing: border-box;
  border-radius: 16px;
  background: #fff;
}

.amount-card {
  min-height: 132px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  align-items: start;
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
  color: #006dff;
  font-size: 38px;
  line-height: 1;
  font-weight: 800;
  letter-spacing: 0;
}

.countdown {
  padding-top: 2px;
  font-size: 15px;
  white-space: nowrap;
}

.countdown span {
  margin-left: 6px;
  color: #2d90f0;
}

.order-card h2,
.method-section h2 {
  margin: 0 0 20px;
  font-size: 17px;
  font-weight: 700;
  color: #9a9da4;
}

.order-card dl {
  margin: 0;
}

.order-card div {
  display: grid;
  grid-template-columns: 92px 1fr;
  gap: 12px;
  margin-bottom: 14px;
  align-items: start;
}

.order-card div:last-child {
  margin-bottom: 0;
}

.order-card dt {
  color: #a0a3aa;
  font-size: 15px;
  font-weight: 700;
}

.order-card dd {
  margin: 0;
  color: #34383f;
  font-size: 16px;
  font-weight: 700;
  text-align: right;
  line-height: 1.5;
  word-break: break-all;
}

.section-hint,
.empty-text {
  margin: 0 0 16px;
  color: #a0a3aa;
  font-size: 14px;
  line-height: 1.5;
}

.order-hint {
  margin: 14px 0 0;
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

.method-icon--balance {
  background: #d92234;
  color: #fff;
  font-size: 14px;
  font-weight: 800;
}

.method-icon--offline {
  background: #6870f2;
  color: #fff;
  font-size: 14px;
  font-weight: 800;
}

.method-info strong {
  display: block;
  color: #34383f;
  font-size: 19px;
  font-weight: 800;
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
  opacity: 0.72;
  cursor: default;
}
</style>
