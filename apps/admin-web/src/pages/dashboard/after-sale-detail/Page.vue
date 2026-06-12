<script setup lang="ts">
import { computed, onActivated, onBeforeUnmount, onMounted, ref, watch } from "vue";
import type { PageComponentProps } from "@ihc/page-core/types";
import {
  approveAdminAfterSale,
  getAdminAfterSaleDetail,
  rejectAdminAfterSale,
} from "@/shared/api/dashboard";
import { handleAdminPageError } from "@/shared/api/error";
import {
  buildAfterSaleDetail,
  getActiveAfterSaleRow,
  getLinkedOrder,
  readSelectedAfterSaleNo,
  type AfterSaleDetailViewModel,
} from "./mock";
import { upsertAfterSaleRow } from "../after-sale/mock";
import { orderDetailStorageKey } from "../order-list/mock";

const props = defineProps<PageComponentProps>();

const nowTimestamp = ref(Date.now());
const afterSaleId = ref(readSelectedAfterSaleNo());
const orderId = ref("");
const decisionDialogOpen = ref(false);
const decisionMode = ref<"approve" | "reject">("approve");
const approveRefundAmountInput = ref("");
const approveRemarkInput = ref("");
const rejectRemarkInput = ref("");
const detail = ref<AfterSaleDetailViewModel | null>(null);
let countdownTimer: number | null = null;

function buildFallbackDetail() {
  const row = getActiveAfterSaleRow();
  return row ? buildAfterSaleDetail(row, getLinkedOrder(row)) : null;
}

detail.value = buildFallbackDetail();

const canProcess = computed(() => detail.value?.status === "处理中");
const requestedRefundAmount = computed(() => Number(detail.value?.refundAmount || 0));
const approveRefundAmountValid = computed(() => /^\d+(\.\d{0,2})?$/.test(approveRefundAmountInput.value.trim()));
const approveRefundError = computed(() => {
  if (decisionMode.value !== "approve") {
    return "";
  }

  const rawValue = approveRefundAmountInput.value.trim();

  if (!rawValue) {
    return "请输入退款金额";
  }

  if (!approveRefundAmountValid.value) {
    return "请输入合法金额，最多保留两位小数";
  }

  const numericValue = Number(rawValue);

  if (numericValue <= 0) {
    return "退款金额需大于 0";
  }

  if (numericValue > requestedRefundAmount.value) {
    return `退款金额不能超过申请退款金额 ¥${requestedRefundAmount.value.toFixed(2)}`;
  }

  return "";
});
const approveRemarkError = computed(() => {
  if (decisionMode.value !== "approve") {
    return "";
  }

  return approveRemarkInput.value.trim() ? "" : "请输入退款说明";
});
const rejectRemarkError = computed(() => {
  if (decisionMode.value !== "reject") {
    return "";
  }

  return rejectRemarkInput.value.trim() ? "" : "请输入退款说明";
});
const decisionError = computed(() =>
  decisionMode.value === "approve" ? approveRefundError.value || approveRemarkError.value : rejectRemarkError.value,
);
const canConfirmDecision = computed(() => !decisionError.value);

const remainingHandleText = computed(() => {
  const deadlineAt = detail.value?.deadlineAt;

  if (!deadlineAt) {
    return "";
  }

  const deadlineTimestamp = Date.parse(deadlineAt);

  if (Number.isNaN(deadlineTimestamp)) {
    return "00分00秒";
  }

  const remainingMilliseconds = Math.max(deadlineTimestamp - nowTimestamp.value, 0);
  const totalSeconds = Math.floor(remainingMilliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}时${String(minutes).padStart(2, "0")}分${String(seconds).padStart(2, "0")}秒`;
  }

  return `${String(Math.floor(totalSeconds / 60)).padStart(2, "0")}分${String(seconds).padStart(2, "0")}秒`;
});

function stopCountdown() {
  if (typeof window === "undefined" || countdownTimer === null) {
    return;
  }

  window.clearInterval(countdownTimer);
  countdownTimer = null;
}

function startCountdown() {
  if (typeof window === "undefined" || countdownTimer !== null) {
    return;
  }

  countdownTimer = window.setInterval(() => {
    nowTimestamp.value = Date.now();
  }, 1000);
}

function navigateWithStorage(pageId: string, storageKey: string, value: string) {
  if (typeof window !== "undefined") {
    window.sessionStorage.setItem(storageKey, value);
  }

  props.navigation.navigateTo(pageId);

  const nextStack = props.navigation.getStack();
  const activePageId = nextStack[nextStack.length - 1] || "";

  if (activePageId !== pageId) {
    props.navigation.reLaunch(pageId);
  }
}

function syncAfterSaleCache(currentDetail: AfterSaleDetailViewModel) {
  const appliedAt = currentDetail.refundFields.find((item) => item.label === "申请时间")?.value || "";

  upsertAfterSaleRow({
    orderId: orderId.value || undefined,
    orderNo: currentDetail.orderNo,
    afterSaleNo: currentDetail.afterSaleNo,
    title: currentDetail.productTitle,
    image: currentDetail.productImage,
    paidAmount: currentDetail.paidAmount,
    refundAmount: currentDetail.refundAmount,
    status: currentDetail.status,
    appliedAt,
  });
}

async function syncPageData() {
  const currentAfterSaleId = readSelectedAfterSaleNo();

  afterSaleId.value = currentAfterSaleId;
  nowTimestamp.value = Date.now();

  if (!currentAfterSaleId) {
    detail.value = buildFallbackDetail();
    orderId.value = "";
    return;
  }

  try {
    const response = await getAdminAfterSaleDetail(currentAfterSaleId);
    detail.value = response as AfterSaleDetailViewModel;
    afterSaleId.value = String(response?.afterSaleId ?? currentAfterSaleId);
    orderId.value = String(response?.orderId ?? "");

    if (detail.value) {
      syncAfterSaleCache(detail.value);
    }
  } catch (error) {
    handleAdminPageError(error, {
      navigation: props.navigation,
      showToast: props.showToast,
      fallbackMessage: "售后详情加载失败，已回退到演示数据",
    });
    detail.value = buildFallbackDetail();
    orderId.value = "";
  }
}

watch(
  () => detail.value?.deadlineAt ?? "",
  (deadlineAt) => {
    nowTimestamp.value = Date.now();
    stopCountdown();

    if (deadlineAt) {
      startCountdown();
    }
  },
  { immediate: true },
);

onMounted(() => {
  void syncPageData();
});

onActivated(() => {
  void syncPageData();
});

onBeforeUnmount(() => {
  stopCountdown();
});

function goBack() {
  if (!props.navigation.navigateBack()) {
    props.navigation.reLaunch("dashboard/after-sale");
  }
}

function openOrderDetail() {
  const targetOrderId = orderId.value || detail.value?.orderNo || "";

  if (!targetOrderId) {
    props.showToast("当前售后记录未关联订单");
    return;
  }

  navigateWithStorage("dashboard/order-detail", orderDetailStorageKey, targetOrderId);
}

function contactUser() {
  if (!detail.value) {
    return;
  }

  props.showToast(`已打开 ${detail.value.contactName} 的联系入口`);
}

function openDecisionDialog(mode: "approve" | "reject") {
  if (!canProcess.value) {
    return;
  }

  decisionMode.value = mode;
  approveRefundAmountInput.value = detail.value?.refundAmount || "";
  approveRemarkInput.value = "";
  rejectRemarkInput.value = "";
  decisionDialogOpen.value = true;
}

function closeDecisionDialog() {
  decisionDialogOpen.value = false;
  approveRefundAmountInput.value = "";
  approveRemarkInput.value = "";
  rejectRemarkInput.value = "";
}

async function confirmDecision() {
  const currentDetail = detail.value;

  if (!currentDetail || !afterSaleId.value || !canConfirmDecision.value) {
    return;
  }

  const isApprove = decisionMode.value === "approve";

  try {
    if (isApprove) {
      await approveAdminAfterSale(afterSaleId.value, {
        refundAmount: Number(approveRefundAmountInput.value.trim()),
        remark: approveRemarkInput.value.trim(),
      });
    } else {
      await rejectAdminAfterSale(afterSaleId.value, {
        remark: rejectRemarkInput.value.trim(),
      });
    }

    closeDecisionDialog();
    await syncPageData();
    props.showToast(`售后单 ${currentDetail.afterSaleNo} 已${isApprove ? "同意退款" : "拒绝退款"}`);
  } catch (error) {
    handleAdminPageError(error, {
      navigation: props.navigation,
      showToast: props.showToast,
      fallbackMessage: `${isApprove ? "同意退款" : "拒绝退款"}失败，请稍后重试`,
    });
  }
}
</script>

<template>
  <section class="after-sale-detail-page">
    <article v-if="detail" class="detail-panel">
      <header class="page-head">
        <div class="section-head">
          <span class="section-head__accent"></span>
          <h1>{{ detail.title }}</h1>
        </div>
      </header>

      <section class="status-hero" :class="`status-hero--${detail.statusTone}`">
        <div class="status-hero__main">
          <h2>{{ detail.statusTitle }}</h2>

          <div class="status-hero__meta">
            <article class="status-stat">
              <span>售后编号</span>
              <strong>{{ detail.afterSaleNo }}</strong>
            </article>
            <article class="status-stat">
              <span>订单编号</span>
              <strong>{{ detail.orderNo }}</strong>
            </article>
            <article class="status-stat">
              <span>申请退款</span>
              <strong class="status-stat__amount">¥{{ detail.refundAmount }}</strong>
            </article>
          </div>

          <p>{{ detail.statusDescription }}</p>

          <div v-if="remainingHandleText" class="status-countdown">
            <span>剩余处理时间</span>
            <strong>{{ remainingHandleText }}</strong>
          </div>
        </div>
      </section>

      <section class="reason-bar">
        <div class="reason-bar__title">退款说明</div>
        <p>{{ detail.applicationReason }}</p>
        <button class="text-button" type="button" @click="openOrderDetail">订单详情</button>
      </section>

      <section class="detail-section">
        <header class="block-head">
          <span class="block-head__accent"></span>
          <h2>售后信息</h2>
        </header>

        <div class="info-grid">
          <article class="info-card info-card--user">
            <header class="info-card__head">
              <h3>用户信息</h3>
            </header>

            <div class="user-profile">
              <img :src="detail.buyerAvatar" :alt="detail.buyerName" />

              <div class="user-profile__copy">
                <div class="user-profile__title">
                  <strong>{{ detail.buyerName }}</strong>
                  <button class="text-button" type="button" @click="contactUser">联系用户</button>
                </div>
                <span>ID：{{ detail.buyerId }}</span>
              </div>
            </div>

            <dl class="info-list">
              <div v-for="field in detail.userFields" :key="field.label" class="info-row">
                <dt>{{ field.label }}</dt>
                <dd>{{ field.value }}</dd>
              </div>
            </dl>
          </article>

          <article class="info-card">
            <header class="info-card__head">
              <h3>退款申请信息</h3>
            </header>

            <dl class="info-list">
              <div v-for="field in detail.refundFields" :key="field.label" class="info-row">
                <dt>{{ field.label }}</dt>
                <dd>{{ field.value }}</dd>
              </div>
            </dl>
          </article>

          <article class="info-card">
            <header class="info-card__head">
              <h3>订单信息</h3>
            </header>

            <dl class="info-list">
              <div v-for="field in detail.orderFields" :key="field.label" class="info-row">
                <dt>{{ field.label }}</dt>
                <dd>{{ field.value }}</dd>
              </div>
            </dl>
          </article>
        </div>
      </section>

      <section class="detail-section">
        <header class="block-head">
          <span class="block-head__accent"></span>
          <h2>商品信息</h2>
        </header>

        <div class="product-box">
          <div class="product-table">
            <div class="product-table__head">
              <span>商品信息</span>
              <span>预约时段</span>
              <span>服务人员</span>
              <span>实付金额</span>
              <span>退款金额</span>
              <span>售后状态</span>
            </div>

            <div class="product-table__row">
              <div class="product-cell product-cell--product">
                <img :src="detail.productImage" :alt="detail.productTitle" />
                <div>
                  <strong>{{ detail.productTitle }}</strong>
                  <p>{{ detail.productSummary }}</p>
                </div>
              </div>

              <div class="product-cell">{{ detail.serviceWindow }}</div>
              <div class="product-cell">{{ detail.serviceStaff }}</div>
              <div class="product-cell">¥{{ detail.paidAmount }}</div>
              <div class="product-cell">¥{{ detail.refundAmount }}</div>
              <div class="product-cell">
                <span class="product-status" :class="`product-status--${detail.statusTone}`">{{ detail.status }}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer class="page-actions">
        <button v-if="canProcess" class="action-button action-button--danger" type="button" @click="openDecisionDialog('approve')">
          同意退款
        </button>
        <button v-if="canProcess" class="action-button action-button--primary" type="button" @click="openDecisionDialog('reject')">
          拒绝退款
        </button>
        <button class="action-button action-button--ghost" type="button" @click="goBack">返回</button>
      </footer>
    </article>

    <article v-else class="empty-panel">
      <h2>未找到售后单</h2>
      <p>当前没有可展示的售后详情，请返回售后管理列表重新选择记录。</p>
      <button class="action-button action-button--ghost" type="button" @click="goBack">返回</button>
    </article>

    <section v-if="decisionDialogOpen && detail" class="dialog-mask" @click.self="closeDecisionDialog">
      <article class="dialog-panel dialog-panel--form">
        <header class="dialog-panel__header">
          <h3>{{ decisionMode === "approve" ? "同意退款" : "拒绝退款" }}</h3>
          <button class="dialog-panel__close" type="button" aria-label="关闭售后处理弹窗" @click="closeDecisionDialog">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </header>

        <div class="decision-form">
          <p v-if="decisionMode === 'approve'" class="decision-summary">
            申请退款金额：<strong>{{ detail.refundAmount }}元</strong>
          </p>

          <div v-if="decisionMode === 'approve'" class="decision-row">
            <label class="decision-label" for="approve-refund-amount">退款金额<span>*</span></label>
            <div class="decision-control">
              <div class="decision-input" :class="{ 'decision-input--error': !!approveRefundError }">
                <input id="approve-refund-amount" v-model="approveRefundAmountInput" type="text" placeholder="请输入" />
                <span class="decision-input__unit">元</span>
              </div>
            </div>
          </div>

          <div class="decision-row decision-row--top">
            <label class="decision-label" :for="decisionMode === 'approve' ? 'approve-refund-remark' : 'reject-refund-remark'">
              退款说明<span>*</span>
            </label>
            <div class="decision-control">
              <textarea
                v-if="decisionMode === 'approve'"
                id="approve-refund-remark"
                v-model="approveRemarkInput"
                class="decision-textarea"
                :class="{ 'decision-textarea--error': !!approveRemarkError }"
                placeholder="请输入"
              />
              <textarea
                v-else
                id="reject-refund-remark"
                v-model="rejectRemarkInput"
                class="decision-textarea"
                :class="{ 'decision-textarea--error': !!rejectRemarkError }"
                placeholder="请输入"
              />
            </div>
          </div>

          <p v-if="decisionError" class="decision-error">{{ decisionError }}</p>
        </div>

        <footer class="dialog-panel__footer">
          <button class="action-button action-button--ghost" type="button" @click="closeDecisionDialog">取消</button>
          <button class="action-button action-button--primary" type="button" :disabled="!canConfirmDecision" @click="confirmDecision">
            确定
          </button>
        </footer>
      </article>
    </section>
  </section>
</template>

<style scoped>
.after-sale-detail-page {
  display: grid;
  font-family: var(--admin-font-family);
  color: #2f3946;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.detail-panel,
.empty-panel {
  display: grid;
  gap: 18px;
  padding: 18px 20px 22px;
  border-radius: 16px;
  background: #ffffff;
  box-shadow: 0 6px 20px rgba(59, 103, 82, 0.05);
}

.empty-panel {
  justify-items: start;
}

.empty-panel h2,
.empty-panel p {
  margin: 0;
}

.page-head {
  padding-bottom: 14px;
  border-bottom: 1px solid #edf2ef;
}

.section-head,
.block-head,
.info-card__head {
  display: flex;
  align-items: center;
  gap: 10px;
}

.section-head__accent,
.block-head__accent {
  width: 6px;
  border-radius: 999px;
  background: #39cf9d;
}

.section-head__accent {
  height: 24px;
}

.block-head__accent {
  height: 18px;
}

.section-head h1,
.block-head h2,
.info-card__head h3 {
  margin: 0;
  color: #2f3946;
}

.section-head h1 {
  font-size: 16px;
  font-weight: 600;
}

.block-head h2,
.info-card__head h3 {
  font-size: 15px;
  font-weight: 600;
}

.status-hero {
  display: grid;
  gap: 16px;
  padding: 20px;
  border: 1px solid #edf3ef;
  border-radius: 18px;
  background: linear-gradient(135deg, #fff6f5 0%, #ffffff 100%);
}

.status-hero--green {
  background: linear-gradient(135deg, #f6fff8 0%, #ffffff 100%);
}

.status-hero--gray {
  background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%);
}

.status-hero__main {
  display: grid;
  gap: 12px;
  align-content: start;
}

.status-hero__main h2 {
  margin: 0;
  font-size: 31px;
  line-height: 1.2;
}

.status-hero__main p {
  margin: 0;
  color: #6d7a87;
  font-size: 14px;
  line-height: 1.7;
}

.status-hero__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 24px;
}

.status-stat {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.status-stat span,
.reason-bar__title,
.info-row dt {
  color: #97a3af;
  font-size: 12px;
}

.status-stat strong {
  color: #2f3946;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.5;
}

.status-stat__amount {
  color: #ff6f61;
}

.status-countdown {
  display: inline-grid;
  grid-auto-flow: column;
  align-items: center;
  justify-content: start;
  justify-self: start;
  gap: 8px;
  width: max-content;
  padding: 8px 12px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.82);
  border: 1px solid #edf2ef;
}

.status-countdown span {
  color: #7c8792;
  font-size: 12px;
  line-height: 1.2;
}

.status-countdown strong {
  color: #ff6f61;
  font-size: 17px;
  font-weight: 700;
  line-height: 1.2;
}

.reason-bar {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 16px;
  padding: 16px 18px;
  border: 1px solid #edf2ef;
  border-radius: 14px;
  background: #fbfcfc;
}

.reason-bar p {
  margin: 0;
  color: #46515d;
  font-size: 14px;
  line-height: 1.7;
}

.text-button {
  padding: 0;
  border: 0;
  background: transparent;
  color: #39cf9d;
  font-size: 13px;
  font-weight: 500;
}

.detail-section {
  display: grid;
  gap: 14px;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.info-card {
  display: grid;
  gap: 16px;
  align-content: start;
  padding: 18px;
  border: 1px solid #edf2ef;
  border-radius: 16px;
  background: #ffffff;
}

.info-card--user {
  background: linear-gradient(180deg, #fcfffd 0%, #ffffff 100%);
}

.user-profile {
  display: grid;
  grid-template-columns: 70px minmax(0, 1fr);
  gap: 14px;
  align-items: center;
}

.user-profile img {
  width: 70px;
  height: 70px;
  border-radius: 50%;
  object-fit: cover;
  box-shadow: 0 10px 22px rgba(57, 207, 157, 0.12);
}

.user-profile__copy {
  display: grid;
  gap: 8px;
  min-width: 0;
}

.user-profile__title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.user-profile__title strong {
  color: #2f3946;
  font-size: 16px;
  font-weight: 700;
}

.user-profile__copy span {
  color: #8d99a6;
  font-size: 13px;
}

.info-list {
  display: grid;
  gap: 12px;
  margin: 0;
}

.info-row {
  display: grid;
  gap: 8px;
}

.info-row dt,
.info-row dd {
  margin: 0;
}

.info-row dd {
  color: #34404d;
  font-size: 14px;
  line-height: 1.7;
}

.product-box {
  display: grid;
  gap: 18px;
  padding: 18px;
  border: 1px solid #edf2ef;
  border-radius: 16px;
  background: #ffffff;
}

.product-table {
  overflow-x: auto;
  border: 1px solid #edf2ef;
  border-radius: 14px;
}

.product-table__head,
.product-table__row {
  display: grid;
  grid-template-columns: 2.1fr 1.1fr 0.9fr 0.8fr 0.8fr 0.8fr;
  min-width: 980px;
}

.product-table__head {
  background: #fafafa;
  color: #2f3946;
  font-size: 13px;
  font-weight: 600;
}

.product-table__head span,
.product-cell {
  padding: 20px 18px;
  border-right: 1px solid #edf2ef;
}

.product-table__head span:last-child,
.product-cell:last-child {
  border-right: 0;
}

.product-table__row {
  border-top: 1px solid #edf2ef;
}

.product-cell {
  display: flex;
  align-items: center;
  color: #34404d;
  font-size: 14px;
}

.product-cell--product {
  gap: 16px;
}

.product-cell--product img {
  width: 112px;
  height: 82px;
  border-radius: 12px;
  object-fit: cover;
  flex-shrink: 0;
}

.product-cell--product div {
  display: grid;
  gap: 8px;
}

.product-cell--product strong {
  color: #2f3946;
  font-size: 15px;
  line-height: 1.5;
}

.product-cell--product p {
  margin: 0;
  color: #7a8692;
  font-size: 13px;
  line-height: 1.7;
}

.product-status {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 82px;
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 600;
}

.product-status--rose {
  background: rgba(255, 111, 97, 0.1);
  color: #ff6f61;
}

.product-status--green {
  background: rgba(57, 207, 157, 0.12);
  color: #25b884;
}

.product-status--gray {
  background: #f1f4f7;
  color: #7f8c98;
}

.page-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  padding-top: 4px;
}

.action-button {
  min-width: 106px;
  height: 44px;
  padding: 0 18px;
  border: 1px solid #dfe8e4;
  border-radius: 10px;
  background: #ffffff;
  color: #44505d;
  font-size: 14px;
  font-weight: 600;
}

.action-button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.action-button--primary {
  border-color: #39cf9d;
  background: #39cf9d;
  color: #ffffff;
}

.action-button--danger {
  border-color: #ff847c;
  background: #ff847c;
  color: #ffffff;
}

.action-button--ghost {
  background: #ffffff;
}

.dialog-mask {
  position: fixed;
  inset: 0;
  z-index: 30;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgba(19, 27, 36, 0.28);
  backdrop-filter: blur(6px);
}

.dialog-panel {
  width: min(640px, 100%);
  border-radius: 18px;
  background: #ffffff;
  box-shadow: 0 28px 60px rgba(20, 34, 26, 0.18);
}

.dialog-panel__header,
.dialog-panel__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 20px 24px;
}

.dialog-panel__header {
  border-bottom: 1px solid #edf2ef;
}

.dialog-panel__header h3 {
  margin: 0;
  color: #2f3946;
  font-size: 15px;
  font-weight: 600;
}

.dialog-panel__close {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: #a2acb7;
}

.dialog-panel__close svg {
  width: 18px;
  height: 18px;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-width: 1.8;
}

.dialog-panel__footer {
  justify-content: flex-end;
  padding-top: 18px;
}

.decision-form {
  display: grid;
  gap: 22px;
  padding: 24px;
}

.decision-summary {
  margin: 0;
  color: #8e97a3;
  font-size: 14px;
  line-height: 1.6;
}

.decision-summary strong {
  color: #ff6f61;
  font-size: 16px;
  font-weight: 600;
}

.decision-row {
  display: grid;
  grid-template-columns: 96px minmax(0, 1fr);
  gap: 18px;
  align-items: center;
}

.decision-row--top {
  align-items: start;
}

.decision-label {
  padding-top: 2px;
  color: #8e97a3;
  font-size: 14px;
  line-height: 1.6;
}

.decision-label span {
  color: #ff6f61;
}

.decision-control {
  display: grid;
  gap: 10px;
}

.decision-input {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 56px;
  align-items: stretch;
  border: 1px solid #dfe5ea;
  border-radius: 8px;
  overflow: hidden;
  background: #ffffff;
}

.decision-input--error {
  border-color: #ff847c;
}

.decision-input input {
  width: 100%;
  height: 56px;
  padding: 0 16px;
  border: 0;
  background: transparent;
  color: #2f3946;
  font-size: 15px;
  outline: none;
}

.decision-input input::placeholder,
.decision-textarea::placeholder {
  color: #c6ccd3;
}

.decision-input__unit {
  display: grid;
  place-items: center;
  border-left: 1px solid #dfe5ea;
  background: #f8f9fb;
  color: #8e97a3;
  font-size: 14px;
}

.decision-textarea {
  min-height: 180px;
  padding: 16px;
  border: 1px solid #dfe5ea;
  border-radius: 8px;
  background: #ffffff;
  color: #2f3946;
  font-size: 15px;
  line-height: 1.7;
  resize: vertical;
  outline: none;
}

.decision-textarea--error {
  border-color: #ff847c;
}

.decision-error {
  margin: -6px 0 0 114px;
  color: #ff6f61;
  font-size: 13px;
  line-height: 1.6;
}

@media (max-width: 1380px) {
  .info-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 960px) {
  .detail-panel,
  .empty-panel {
    padding: 16px;
  }

  .status-hero__meta {
    flex-direction: column;
    gap: 6px;
  }

  .reason-bar {
    grid-template-columns: 1fr;
    justify-items: start;
  }

  .user-profile {
    grid-template-columns: 1fr;
  }

  .user-profile__title,
  .page-actions {
    flex-direction: column;
    align-items: flex-start;
  }

  .action-button {
    width: 100%;
  }

  .dialog-mask {
    padding: 16px;
  }

  .dialog-panel__header,
  .dialog-panel__footer,
  .decision-form {
    padding-right: 16px;
    padding-left: 16px;
  }

  .decision-row {
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .decision-error {
    margin-left: 0;
  }
}
</style>
