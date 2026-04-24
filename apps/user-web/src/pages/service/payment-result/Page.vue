<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import type { PageComponentProps } from "@ihc/page-core/types";
import { getOrderFlowState } from "@/pages/service/order-flow";
import { useOrderCenter } from "@/pages/service/order-center";
import { getPaymentDetail } from "@/shared/api/payments";

const props = defineProps<PageComponentProps>();
const orderFlowState = getOrderFlowState();
const { selectOrder } = useOrderCenter();
const paymentStatus = ref(orderFlowState.payment?.status || "PAID");
const paymentAmount = ref<number | null>(orderFlowState.payment?.amount ?? null);

const paymentStatusText = computed(() => {
  if (paymentStatus.value === "PAID") {
    return "支付成功";
  }
  if (paymentStatus.value === "PENDING") {
    return "支付处理中";
  }
  return "支付结果待确认";
});

const paymentDescription = computed(() => {
  const amountText =
    typeof paymentAmount.value === "number" ? `订单金额 ¥${paymentAmount.value.toFixed(2)}` : "订单金额待确认";
  return `${amountText}，请前往订单页查看最新状态`;
});

function goBack() {
  props.navigation.navigateBack();
}

function viewOrder() {
  const createdOrderId = orderFlowState.createdOrder?.orderId || "";
  if (createdOrderId) {
    selectOrder(createdOrderId);
  }
  props.navigation.navigateTo("service/order-detail");
}

async function loadPaymentDetail() {
  const paymentId = orderFlowState.payment?.paymentId;
  if (!paymentId) {
    return;
  }

  try {
    const payment = await getPaymentDetail(paymentId);
    paymentStatus.value = payment.status;
    paymentAmount.value = payment.amount;
  } catch {}
}

onMounted(() => {
  void loadPaymentDetail();
});
</script>

<template>
  <div class="payment-result-page">
    <header class="page-header">
      <button class="back-button" type="button" aria-label="返回" @click="goBack">‹</button>
      <h1>支付结果</h1>
    </header>

    <main class="result-content" aria-label="支付结果">
      <div class="success-icon" aria-hidden="true">
        <span class="success-check"></span>
      </div>
      <h2>{{ paymentStatusText }}</h2>
      <p>{{ paymentDescription }}</p>
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
  font-size: 42px;
  line-height: 28px;
  font-weight: 300;
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
  min-height: 540px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding-top: 286px;
  box-sizing: border-box;
}

.success-icon {
  width: 120px;
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #75d6df;
}

.success-check {
  width: 54px;
  height: 30px;
  margin-top: -10px;
  border-left: 9px solid #ffffff;
  border-bottom: 9px solid #ffffff;
  transform: rotate(-45deg);
  box-sizing: border-box;
}

.result-content h2 {
  margin: 44px 0 0;
  color: #34383f;
  font-size: 40px;
  line-height: 1.2;
  font-weight: 600;
  letter-spacing: 0;
}

.result-content p {
  margin: 26px 0 0;
  color: #a8adb4;
  font-size: 24px;
  line-height: 1.4;
  font-weight: 600;
  letter-spacing: 0;
  text-align: center;
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
  height: 86px;
  display: block;
  margin: 0 auto;
  border: 0;
  border-radius: 14px;
  background: #75d6df;
  color: #ffffff;
  font-size: 28px;
  font-weight: 600;
  letter-spacing: 0;
  cursor: pointer;
}
</style>
