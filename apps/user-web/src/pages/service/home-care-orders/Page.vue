<script setup lang="ts">
import { computed, onActivated, onMounted, ref } from "vue";
import type { PageComponentProps } from "@ihc/page-core/types";
import { Headset, Left, More } from "@icon-park/vue-next";
import mock from "./mock";
import {
  cancelHomeCareOrder,
  deleteHomeCareOrder,
  ensureHomeCareOrders,
  getHomeCareOrders,
  getHomeCareOrderStatusLabel,
  setActiveHomeCareOrderId,
  type HomeCareOrder,
  type HomeCareOrderStatus,
} from "./store";

const props = defineProps<PageComponentProps>();

type FilterKey = "all" | HomeCareOrderStatus;

ensureHomeCareOrders();

const activeTab = ref<FilterKey>("all");
const pendingCancelOrder = ref<HomeCareOrder | null>(null);
const orders = ref<HomeCareOrder[]>(getHomeCareOrders());

const visibleOrders = computed(() => {
  if (activeTab.value === "all") {
    return orders.value;
  }

  return orders.value.filter((order) => order.status === activeTab.value);
});

function refreshOrders() {
  orders.value = getHomeCareOrders();
}

onMounted(refreshOrders);
onActivated(refreshOrders);

function goBack() {
  if (!props.navigation.navigateBack()) {
    props.navigation.reLaunch("home/mine");
  }
}

function selectOrder(orderId: string) {
  setActiveHomeCareOrderId(orderId);
}

function openEdit(orderId: string) {
  selectOrder(orderId);
  props.navigation.navigateTo("service/order-edit");
}

function openPayment(orderId: string) {
  selectOrder(orderId);
  props.navigation.navigateTo("service/payment");
}

function openVoucher(orderId: string) {
  selectOrder(orderId);
  props.navigation.navigateTo("service/payment-result");
}

function openTrack(orderId: string) {
  selectOrder(orderId);
  props.navigation.navigateTo("service/service-track");
}

function confirmCancel() {
  if (!pendingCancelOrder.value) {
    return;
  }

  cancelHomeCareOrder(pendingCancelOrder.value.id);
  props.showToast("订单已取消");
  pendingCancelOrder.value = null;
  refreshOrders();
}

function removeCompletedOrder(orderId: string) {
  deleteHomeCareOrder(orderId);
  props.showToast("订单已删除");
  refreshOrders();
}

function handlePending(label: string) {
  props.showToast(`${label}功能待接入`);
}

function getSecondaryMeta(order: HomeCareOrder) {
  return `${order.bookingDate} ${order.bookingWeekday} ${order.bookingTimeSlot}`;
}

function getAmountText(order: HomeCareOrder) {
  return `¥${order.actualAmount.toFixed(2)}`;
}
</script>

<template>
  <section class="home-care-orders-page">
    <header class="page-header">
      <button class="header-icon" type="button" aria-label="返回" @click="goBack">
        <Left theme="outline" size="18" fill="currentColor" />
      </button>
      <div class="page-title">
        <h1>家政护理</h1>
        <p>我的订单</p>
      </div>
      <div class="header-actions">
        <button class="header-icon" type="button" aria-label="客服" @click="handlePending('客服')">
          <Headset theme="outline" size="18" fill="currentColor" />
        </button>
        <button class="header-icon" type="button" aria-label="更多" @click="handlePending('更多')">
          <More theme="outline" size="18" fill="currentColor" />
        </button>
      </div>
    </header>

    <nav class="tab-bar" aria-label="订单状态筛选">
      <button
        v-for="tab in mock.tabs"
        :key="tab.key"
        class="tab-button"
        :class="{ 'tab-button--active': activeTab === tab.key }"
        type="button"
        @click="activeTab = tab.key"
      >
        {{ tab.label }}
      </button>
    </nav>

    <main class="order-list">
      <article v-for="order in visibleOrders" :key="order.id" class="order-card">
        <header class="order-card__header">
          <div class="order-badge">家政护理</div>
          <button
            v-if="order.status !== 'completed'"
            class="status-link"
            type="button"
            @click="openTrack(order.id)"
          >
            {{ getHomeCareOrderStatusLabel(order.status) }}
          </button>
          <span v-else class="status-text">{{ getHomeCareOrderStatusLabel(order.status) }}</span>
        </header>

        <button class="order-main" type="button" @click="selectOrder(order.id)">
          <img class="order-image" :src="order.image" :alt="order.title" />
          <div class="order-info">
            <h2>{{ order.title }}</h2>
            <p>{{ order.subtitle }}</p>
            <div class="order-meta">
              <span>{{ getSecondaryMeta(order) }}</span>
              <strong>{{ getAmountText(order) }}</strong>
            </div>
          </div>
        </button>

        <div class="order-detail-row">
          <span>服务地址</span>
          <p>{{ order.address }}</p>
        </div>
        <div class="order-detail-row">
          <span>联系电话</span>
          <p>{{ order.contactName }} {{ order.contactPhone }}</p>
        </div>

        <footer class="order-actions">
          <template v-if="order.status === 'pending_payment'">
            <button class="ghost-button" type="button" @click="pendingCancelOrder = order">取消订单</button>
            <button class="ghost-button" type="button" @click="openEdit(order.id)">修改订单信息</button>
            <button class="primary-button" type="button" @click="openPayment(order.id)">继续支付</button>
          </template>

          <template v-else-if="order.status === 'awaiting_accept'">
            <button class="ghost-button" type="button" @click="pendingCancelOrder = order">取消订单</button>
            <button class="ghost-button" type="button" @click="openEdit(order.id)">修改订单信息</button>
            <button class="ghost-button ghost-button--link" type="button" @click="openTrack(order.id)">查看进度</button>
          </template>

          <template v-else-if="order.status === 'awaiting_service'">
            <button class="ghost-button" type="button" @click="pendingCancelOrder = order">取消订单</button>
            <button class="ghost-button ghost-button--link" type="button" @click="openTrack(order.id)">服务进度</button>
            <button class="primary-button" type="button" @click="openVoucher(order.id)">服务券码</button>
          </template>

          <template v-else>
            <button class="ghost-button" type="button" @click="removeCompletedOrder(order.id)">删除订单</button>
            <button class="ghost-button" type="button" @click="handlePending('申请退款')">申请退款</button>
            <button class="primary-button" type="button" @click="handlePending('评价')">评价</button>
          </template>
        </footer>
      </article>

      <div v-if="!visibleOrders.length" class="empty-state">
        <strong>暂无相关订单</strong>
        <p>可返回“我的”页面继续查看其他服务。</p>
      </div>
    </main>

    <footer class="page-footer">没有更多了 · 客服热线 {{ mock.servicePhone }}</footer>

    <div v-if="pendingCancelOrder" class="modal-mask" @click.self="pendingCancelOrder = null">
      <section class="confirm-modal" role="dialog" aria-modal="true" aria-label="取消订单确认">
        <h2>确认取消订单吗？</h2>
        <p>取消后将失去当前预约时间段，如需服务需要重新下单。</p>
        <div class="modal-actions">
          <button class="modal-button modal-button--ghost" type="button" @click="pendingCancelOrder = null">
            暂不取消
          </button>
          <button class="modal-button modal-button--danger" type="button" @click="confirmCancel">确认取消</button>
        </div>
      </section>
    </div>
  </section>
</template>

<style scoped>
.home-care-orders-page {
  --page-bg: #edf4ff;
  --card-bg: rgba(255, 255, 255, 0.9);
  --card-border: #e3ebf7;
  --primary: #6872f0;
  --primary-soft: rgba(104, 114, 240, 0.1);
  --primary-2: #ed6d88;
  --text-1: #2e3135;
  --text-2: #68717b;
  --text-3: #97a3b8;
  position: relative;
  left: 50%;
  width: min(402px, 100vw);
  min-height: 874px;
  margin: -18px 0;
  transform: translateX(-50%);
  padding: 16px 14px 28px;
  box-sizing: border-box;
  background: var(--page-bg);
  color: var(--text-1);
  font-family: "HarmonyOS Sans SC", "MiSans", "Source Han Sans SC", "PingFang SC", "Microsoft YaHei UI", sans-serif;
}

.page-header {
  display: grid;
  grid-template-columns: 36px minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  padding: 4px 0 10px;
}

.page-title h1 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  line-height: 1.25;
}

.page-title p {
  margin: 2px 0 0;
  font-size: 11px;
  color: #8f959d;
}

.header-actions {
  display: flex;
  gap: 6px;
}

.header-icon {
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  padding: 0;
  border: 1px solid #e4e5e8;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.88);
  color: #555b63;
}

.tab-bar {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 6px;
  margin-bottom: 12px;
  padding: 6px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.72);
  box-shadow: inset 0 0 0 1px rgba(223, 225, 230, 0.92);
}

.tab-button {
  height: 30px;
  padding: 0;
  border: 0;
  border-radius: 11px;
  background: transparent;
  color: #8a9099;
  font-size: 11px;
  font-weight: 500;
}

.tab-button--active {
  background: #ffffff;
  color: var(--primary);
  box-shadow: 0 6px 14px rgba(104, 114, 240, 0.14);
}

.order-list {
  display: grid;
  gap: 10px;
}

.order-card {
  padding: 12px;
  border: 1px solid var(--card-border);
  border-radius: 18px;
  background: var(--card-bg);
  box-shadow: 0 10px 24px rgba(77, 102, 170, 0.08);
}

.order-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.order-badge {
  padding: 3px 8px;
  border-radius: 999px;
  background: rgba(107, 114, 241, 0.1);
  color: var(--primary);
  font-size: 10px;
  letter-spacing: 0.02em;
}

.status-link,
.status-text {
  font-size: 11px;
  font-weight: 600;
  color: var(--primary);
}

.status-link {
  padding: 0;
  border: 0;
  background: transparent;
}

.order-main {
  width: 100%;
  display: grid;
  grid-template-columns: 88px minmax(0, 1fr);
  gap: 10px;
  padding: 0;
  border: 0;
  background: transparent;
  text-align: left;
}

.order-image {
  width: 88px;
  height: 88px;
  border-radius: 14px;
  object-fit: cover;
}

.order-info h2 {
  margin: 2px 0 6px;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.45;
}

.order-info p {
  margin: 0;
  font-size: 11px;
  line-height: 1.55;
  color: var(--text-3);
}

.order-meta {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 10px;
  margin-top: 12px;
}

.order-meta span {
  font-size: 11px;
  color: var(--text-2);
}

.order-meta strong {
  font-size: 15px;
  font-weight: 600;
  color: #30343a;
}

.order-detail-row {
  display: grid;
  grid-template-columns: 58px minmax(0, 1fr);
  gap: 8px;
  margin-top: 9px;
  font-size: 11px;
  line-height: 1.5;
}

.order-detail-row span {
  color: var(--text-3);
}

.order-detail-row p {
  margin: 0;
  color: #545b64;
}

.order-actions {
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid #f0f1f3;
}

.ghost-button,
.primary-button,
.modal-button {
  min-width: 72px;
  height: 31px;
  padding: 0 12px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 500;
}

.ghost-button {
  border: 1px solid #d9e1f1;
  background: #fff;
  color: var(--text-2);
}

.ghost-button--link {
  color: var(--primary);
}

.primary-button {
  border: 0;
  background: var(--primary);
  color: #fff;
}

.empty-state {
  padding: 44px 18px;
  text-align: center;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.86);
  color: var(--text-3);
}

.empty-state strong {
  display: block;
  margin-bottom: 6px;
  font-size: 13px;
  font-weight: 600;
  color: #4d535a;
}

.empty-state p {
  margin: 0;
  font-size: 11px;
}

.page-footer {
  padding: 14px 0 4px;
  text-align: center;
  font-size: 10px;
  color: var(--text-3);
}

.modal-mask {
  position: fixed;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 18px;
  background: rgba(23, 26, 32, 0.24);
}

.confirm-modal {
  width: min(300px, 100%);
  padding: 18px 16px 14px;
  border-radius: 18px;
  background: #fff;
  box-shadow: 0 18px 48px rgba(80, 100, 164, 0.18);
}

.confirm-modal h2 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #31353b;
}

.confirm-modal p {
  margin: 8px 0 0;
  font-size: 11px;
  line-height: 1.65;
  color: var(--text-3);
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 16px;
}

.modal-button--ghost {
  border: 1px solid #d9e1f1;
  background: #fff;
  color: var(--text-2);
}

.modal-button--danger {
  border: 0;
  background: var(--primary);
  color: #fff;
}
</style>
