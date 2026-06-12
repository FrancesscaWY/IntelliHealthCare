<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import type { PageComponentProps } from "@ihc/page-core/types";
import Headset from "@icon-park/vue-next/es/icons/Headset";
import type { OrderDetailResponse } from "@/shared/api/orders";
import {
  formatOrderTime,
  resolveOrderAddressText,
  resolveOrderAssetUrl,
  resolveOrderBookingText,
  resolveOrderContactPhone,
  useOrderCenter
} from "@/pages/service/order-center";

const props = defineProps<PageComponentProps>();
const {
  currentOrder,
  currentOrderReview,
  currentOrderAfterSales,
  ensureCurrentOrderReady,
  ensureCurrentReview,
  ensureCurrentAfterSales,
  cancelCurrentOrder,
  submitCurrentReview,
  submitCurrentAfterSale
} = useOrderCenter();

const currentOrderDetail = computed(
  () => (currentOrder.value && "address" in currentOrder.value ? (currentOrder.value as OrderDetailResponse) : null)
);

const reviewDraft = ref("");
const afterSaleReason = ref("");
const afterSaleDescription = ref("");
const reviewSubmitting = ref(false);
const afterSaleSubmitting = ref(false);

const statusText = computed(() => currentOrder.value?.statusText || "订单详情");
const serviceAssignment = computed(() => {
  const workOrder = currentOrderDetail.value?.workOrders?.find(
    (item) => item.assigneeName || item.institutionName || item.scheduleAt
  );

  return {
    assigneeName: workOrder?.assigneeName || "--",
    institutionName: workOrder?.institutionName || "--",
    scheduleAt: formatOrderTime(workOrder?.scheduleAt) || "--"
  };
});
const orderAddress = computed(() => {
  const address = currentOrderDetail.value?.address || null;
  const backendAddress = address
    ? [address.province, address.city, address.district, address.detailAddress].filter(Boolean).join("")
    : "";
  return resolveOrderAddressText(currentOrder.value?.orderId || "", backendAddress) || "--";
});
const orderPhone = computed(() => {
  const contact = currentOrderDetail.value?.contact || null;
  return (
    resolveOrderContactPhone(
      currentOrder.value?.orderId || "",
      contact?.contactPhone || currentOrderDetail.value?.address?.receiverPhone || ""
    ) || "--"
  );
});
const orderBookingTime = computed(
  () =>
    resolveOrderBookingText(
      currentOrder.value?.orderId || "",
      currentOrder.value?.bookingDate || "",
      currentOrder.value?.bookingTimeSlot || ""
    ) || "--"
);
const canReview = computed(() => currentOrder.value?.status === "COMPLETED" && !currentOrderReview.value);
const canAfterSale = computed(() => currentOrder.value?.status === "COMPLETED");
const scoreText = computed(() => {
  if (!currentOrderReview.value) {
    return "";
  }
  return "★".repeat(Math.max(0, Math.min(5, currentOrderReview.value.score)));
});

function goBack() {
  if (!props.navigation.navigateBack()) {
    props.navigation.reLaunch("orders/rehab-therapy");
  }
}

function editOrder() {
  props.navigation.navigateTo("service/order-edit");
}

function goTrack() {
  props.navigation.navigateTo("service/service-track");
}

async function doCancel() {
  try {
    await cancelCurrentOrder("用户主动取消");
    props.showToast("订单已取消");
    await ensureCurrentOrderReady(undefined, true).catch(() => null);
  } catch (error) {
    props.showToast(error instanceof Error ? error.message : "取消订单失败");
  }
}

async function submitReviewForm() {
  const content = reviewDraft.value.trim();
  if (!content) {
    props.showToast("请输入评价内容");
    return;
  }

  if (reviewSubmitting.value) {
    return;
  }

  reviewSubmitting.value = true;
  try {
    await submitCurrentReview({
      score: 5,
      content,
      tags: ["服务及时", "沟通顺畅"]
    });
    reviewDraft.value = "";
    props.showToast("评价已提交");
  } catch (error) {
    props.showToast(error instanceof Error ? error.message : "提交评价失败");
  } finally {
    reviewSubmitting.value = false;
  }
}

async function submitAfterSaleForm() {
  const reason = afterSaleReason.value.trim();
  if (!reason) {
    props.showToast("请填写售后原因");
    return;
  }

  if (afterSaleSubmitting.value) {
    return;
  }

  afterSaleSubmitting.value = true;
  try {
    await submitCurrentAfterSale({
      type: "CONSULT",
      reason,
      description: afterSaleDescription.value.trim() || undefined
    });
    afterSaleReason.value = "";
    afterSaleDescription.value = "";
    props.showToast("售后申请已提交");
  } catch (error) {
    props.showToast(error instanceof Error ? error.message : "提交售后失败");
  } finally {
    afterSaleSubmitting.value = false;
  }
}

onMounted(() => {
  void ensureCurrentOrderReady();
  void ensureCurrentReview();
  void ensureCurrentAfterSales();
});
</script>

<template>
  <div class="order-detail-page">
    <header class="top-header">
      <button class="back-button" type="button" aria-label="返回" @click="goBack">‹</button>
      <button class="service-button" type="button" aria-label="客服" @click="props.showToast('客服功能待接入')">
        <Headset theme="outline" size="24" fill="#34383f" />
      </button>
    </header>

    <main class="order-scroll">
      <section class="status-section" role="button" tabindex="0" @click="goTrack">
        <h1>{{ statusText }}<span>›</span></h1>
        <p>可查看服务进度、修改预约时间或取消订单</p>
      </section>

      <section v-if="currentOrder" class="card product-card">
        <div class="product-main">
          <img class="product-image" :src="resolveOrderAssetUrl(currentOrder.image)" :alt="currentOrder.title" />
          <div class="product-info">
            <h2>{{ currentOrder.title }}</h2>
            <span>¥{{ currentOrder.actualAmount }}</span>
          </div>
        </div>
      </section>

      <section v-if="currentOrder" class="card info-card">
        <h2>预约信息</h2>
        <dl>
          <div>
            <dt>上门地址</dt>
            <dd>{{ orderAddress }}</dd>
          </div>
          <div>
            <dt>预约时间</dt>
            <dd>{{ orderBookingTime }}</dd>
          </div>
          <div>
            <dt>联系方式</dt>
            <dd>{{ orderPhone }}</dd>
          </div>
          <div>
            <dt>服务人员</dt>
            <dd>{{ serviceAssignment.assigneeName }}</dd>
          </div>
          <div>
            <dt>服务机构</dt>
            <dd>{{ serviceAssignment.institutionName }}</dd>
          </div>
          <div>
            <dt>服务安排</dt>
            <dd>{{ serviceAssignment.scheduleAt }}</dd>
          </div>
        </dl>
      </section>

      <section v-if="currentOrder" class="card order-info-card">
        <h2>订单信息</h2>
        <dl>
          <div>
            <dt>订单编号</dt>
            <dd>{{ currentOrder.orderNo }}</dd>
          </div>
          <div>
            <dt>订单状态</dt>
            <dd>{{ currentOrder.statusText }}</dd>
          </div>
          <div>
            <dt>创建时间</dt>
            <dd>{{ formatOrderTime(currentOrder.createdAt) }}</dd>
          </div>
        </dl>
      </section>

      <section class="card review-card">
        <h2>订单评价</h2>
        <div v-if="currentOrderReview" class="review-result">
          <p class="review-score">{{ scoreText }}</p>
          <p>{{ currentOrderReview.content || "用户未填写文字评价" }}</p>
          <small>{{ formatOrderTime(currentOrderReview.createdAt) }}</small>
        </div>
        <div v-else-if="canReview" class="review-form">
          <textarea v-model="reviewDraft" placeholder="请输入本次服务评价"></textarea>
          <button type="button" :disabled="reviewSubmitting" @click="submitReviewForm">
            {{ reviewSubmitting ? "提交中..." : "提交评价" }}
          </button>
        </div>
        <p v-else class="empty-block">当前订单暂无评价</p>
      </section>

      <section class="card after-sale-card">
        <h2>售后记录</h2>
        <div v-if="currentOrderAfterSales.length" class="after-sale-list">
          <article v-for="item in currentOrderAfterSales" :key="item.requestId" class="after-sale-item">
            <div class="after-sale-head">
              <strong>{{ item.type }}</strong>
              <span>{{ item.status }}</span>
            </div>
            <p>{{ item.reason }}</p>
            <small>{{ formatOrderTime(item.createdAt) }}</small>
          </article>
        </div>
        <div v-else-if="canAfterSale" class="after-sale-form">
          <input v-model="afterSaleReason" type="text" placeholder="请输入售后原因" />
          <textarea v-model="afterSaleDescription" placeholder="补充说明（选填）"></textarea>
          <button type="button" :disabled="afterSaleSubmitting" @click="submitAfterSaleForm">
            {{ afterSaleSubmitting ? "提交中..." : "申请售后" }}
          </button>
        </div>
        <p v-else class="empty-block">当前订单暂无售后记录</p>
      </section>
    </main>

    <div class="order-action-bar">
      <button type="button" @click="editOrder">修改订单信息</button>
      <button type="button" @click="doCancel">取消订单</button>
    </div>
  </div>
</template>

<style scoped>
.order-detail-page { position: relative; left: 50%; width: min(402px, 100vw); min-height: var(--ihc-page-min-height); margin: -18px 0; transform: translateX(-50%); padding: 16px 14px 96px; box-sizing: border-box; background: #f5f6f7; color: #34383f; font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif; }
.top-header { height: 70px; display: flex; align-items: center; justify-content: space-between; }
.back-button,.service-button { padding: 0; border: 0; background: transparent; cursor: pointer; }
.back-button { width: 28px; height: 36px; color: #34383f; font-size: 42px; line-height: 30px; font-weight: 300; }
.service-button { width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; }
.order-scroll { display: flex; flex-direction: column; gap: 18px; }
.status-section { padding-bottom: 26px; cursor: pointer; }
.status-section h1 { display: flex; align-items: center; gap: 8px; margin: 0 0 14px; color: #34383f; font-size: 28px; font-weight: 800; }
.status-section p { margin: 0; color: #9fa2a9; font-size: 16px; font-weight: 700; }
.card { padding: 22px; border-radius: 16px; background: #fff; box-sizing: border-box; }
.product-main { display: grid; grid-template-columns: 96px 1fr; gap: 18px; align-items: center; }
.product-image { width: 96px; height: 96px; border-radius: 8px; object-fit: cover; display: block; }
.product-info h2 { margin: 0 0 16px; color: #34383f; font-size: 18px; font-weight: 800; line-height: 1.45; }
.product-info span { color: #34383f; font-size: 17px; font-weight: 700; }
.info-card h2,.order-info-card h2,.review-card h2,.after-sale-card h2 { margin: 0 0 24px; color: #34383f; font-size: 22px; font-weight: 800; }
dl { margin: 0; }
dl div { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 14px; }
dl div:last-child { margin-bottom: 0; }
dt { color: #a0a3aa; font-size: 16px; font-weight: 700; white-space: nowrap; }
dd { margin: 0; color: #34383f; font-size: 17px; font-weight: 700; line-height: 1.45; text-align: right; }
.review-result p,.after-sale-item p,.empty-block { margin: 0; color: #34383f; font-size: 15px; line-height: 1.6; }
.review-score { margin-bottom: 8px !important; color: #f4b73f !important; font-size: 20px !important; }
.review-result small,.after-sale-item small { display: block; margin-top: 10px; color: #9fa2a9; font-size: 12px; }
.review-form,.after-sale-form,.after-sale-list { display: flex; flex-direction: column; gap: 12px; }
.review-form textarea,.after-sale-form textarea,.after-sale-form input { width: 100%; padding: 12px 14px; box-sizing: border-box; border: 1px solid #eceef1; border-radius: 12px; background: #fafbfc; color: #34383f; font-size: 14px; font-family: inherit; }
.review-form textarea,.after-sale-form textarea { min-height: 90px; resize: none; }
.review-form button,.after-sale-form button { align-self: flex-end; min-width: 120px; height: 40px; border: 0; border-radius: 20px; background: #75d6df; color: #1f2a44; font-size: 14px; font-weight: 800; cursor: pointer; }
.review-form button:disabled,.after-sale-form button:disabled { opacity: .7; cursor: not-allowed; }
.after-sale-item { padding: 14px 0; border-bottom: 1px solid #f0f1f3; }
.after-sale-item:first-child { padding-top: 0; }
.after-sale-item:last-child { padding-bottom: 0; border-bottom: 0; }
.after-sale-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 8px; }
.after-sale-head strong { color: #34383f; font-size: 15px; font-weight: 800; }
.after-sale-head span { color: #2d90f0; font-size: 13px; font-weight: 700; }
.order-action-bar { position: fixed; left: 50%; bottom: 0; z-index: 20; width: 100%; max-width: 402px; display: flex; justify-content: flex-end; gap: 12px; padding: 14px 24px 22px; box-sizing: border-box; transform: translateX(-50%); background: rgba(255,255,255,.96); box-shadow: 0 -8px 20px rgba(20,24,36,.04); }
.order-action-bar button { min-width: 118px; height: 42px; padding: 0 16px; border: 1px solid #eceef1; border-radius: 21px; background: #fff; color: #34383f; font-size: 15px; font-weight: 700; cursor: pointer; }
</style>
