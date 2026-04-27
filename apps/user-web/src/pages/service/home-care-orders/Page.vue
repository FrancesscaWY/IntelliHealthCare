<script setup lang="ts">
import { computed, onMounted } from "vue";
import type { PageComponentProps } from "@ihc/page-core/types";
import Headset from "@icon-park/vue-next/es/icons/Headset";
import Left from "@icon-park/vue-next/es/icons/Left";
import More from "@icon-park/vue-next/es/icons/More";
import {
  formatOrderTime,
  resolveOrderAssetUrl,
  resolveOrderBookingText,
  useOrderCenter,
} from "@/pages/service/order-center";
import mock from "./mock";

const props = defineProps<PageComponentProps>();
const { orders, ensureOrdersLoaded, selectOrder, cancelCurrentOrder } = useOrderCenter();

const activeTab = computed(() => "all");
const visibleOrders = computed(() =>
  orders.value.filter((order) => order.serviceCategory === "HOME_CARE")
);

function goBack() {
  if (!props.navigation.navigateBack()) {
    props.navigation.reLaunch("home/mine");
  }
}

function openEdit(orderId: string) {
  selectOrder(orderId);
  props.navigation.navigateTo("service/order-edit");
}

function openDetail(orderId: string) {
  selectOrder(orderId);
  props.navigation.navigateTo("service/order-detail");
}

function openVoucher(orderId: string) {
  selectOrder(orderId);
  props.navigation.navigateTo("orders/checkup-voucher");
}

async function doCancel(orderId: string) {
  selectOrder(orderId);
  try {
    await cancelCurrentOrder("用户主动取消");
    props.showToast("订单已取消");
    await ensureOrdersLoaded(true);
  } catch (error) {
    props.showToast(error instanceof Error ? error.message : "取消订单失败");
  }
}

onMounted(() => {
  void ensureOrdersLoaded();
});
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
        <button class="header-icon" type="button" aria-label="客服" @click="props.showToast('客服功能待接入')">
          <Headset theme="outline" size="18" fill="currentColor" />
        </button>
        <button class="header-icon" type="button" aria-label="更多" @click="props.showToast('更多功能待接入')">
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
      >
        {{ tab.label }}
      </button>
    </nav>

    <main class="order-list">
      <article v-for="order in visibleOrders" :key="order.orderId" class="order-card">
        <header class="order-card__header">
          <div class="order-badge">家政护理</div>
          <span class="status-text">{{ order.statusText }}</span>
        </header>

        <div class="order-main">
          <img class="order-image" :src="resolveOrderAssetUrl(order.image)" :alt="order.title" />
          <div class="order-info">
            <h2>{{ order.title }}</h2>
            <div class="order-meta">
              <span>{{ resolveOrderBookingText(order.orderId, order.bookingDate, order.bookingTimeSlot) }}</span>
              <strong>¥{{ order.actualAmount.toFixed(2) }}</strong>
            </div>
          </div>
        </div>

        <div class="order-detail-row">
          <span>创建时间</span>
          <p>{{ formatOrderTime(order.createdAt) }}</p>
        </div>

        <footer class="order-actions">
          <button class="ghost-button" type="button" @click="doCancel(order.orderId)">取消订单</button>
          <button class="ghost-button" type="button" @click="openEdit(order.orderId)">修改订单信息</button>
          <button class="primary-button" type="button" @click="openDetail(order.orderId)">订单详情</button>
          <button class="primary-button" type="button" @click="openVoucher(order.orderId)">服务券码</button>
        </footer>
      </article>

      <div v-if="!visibleOrders.length" class="empty-state">
        <strong>暂无相关订单</strong>
        <p>可返回“我的”页面继续查看其他服务。</p>
      </div>
    </main>

    <footer class="page-footer">没有更多了 · 客服热线 {{ mock.servicePhone }}</footer>
  </section>
</template>

<style scoped>
.home-care-orders-page { --page-bg: #edf4ff; --card-bg: rgba(255,255,255,.9); --card-border: #e3ebf7; --primary: #6872f0; --text-1: #2e3135; --text-2: #68717b; --text-3: #97a3b8; position: relative; left: 50%; width: min(402px, 100vw); min-height: var(--ihc-page-min-height); margin: -18px 0; transform: translateX(-50%); padding: 16px 14px 28px; box-sizing: border-box; background: var(--page-bg); color: var(--text-1); font-family: "HarmonyOS Sans SC","MiSans","Source Han Sans SC","PingFang SC","Microsoft YaHei UI",sans-serif; }
.page-header { display: grid; grid-template-columns: 36px minmax(0, 1fr) auto; align-items: center; gap: 8px; padding: 16px 0 10px; }
.page-title h1 { margin: 0; font-size: 16px; font-weight: 600; line-height: 1.25; }
.page-title p { margin: 2px 0 0; font-size: 11px; color: #8f959d; }
.header-actions { display: flex; gap: 6px; }
.header-icon { width: 32px; height: 32px; display: grid; place-items: center; padding: 0; border: 1px solid #e4e5e8; border-radius: 12px; background: rgba(255,255,255,.88); color: #555b63; }
.tab-bar { display: grid; grid-template-columns: repeat(5, minmax(0,1fr)); gap: 6px; margin-bottom: 12px; padding: 6px; border-radius: 16px; background: rgba(255,255,255,.72); box-shadow: inset 0 0 0 1px rgba(223,225,230,.92); }
.tab-button { height: 30px; padding: 0; border: 0; border-radius: 11px; background: transparent; color: #8a9099; font-size: 11px; font-weight: 500; }
.tab-button--active { background: #ffffff; color: var(--primary); box-shadow: 0 6px 14px rgba(104,114,240,.14); }
.order-list { display: grid; gap: 10px; }
.order-card { padding: 12px; border: 1px solid var(--card-border); border-radius: 18px; background: var(--card-bg); box-shadow: 0 10px 24px rgba(77,102,170,.08); }
.order-card__header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.order-badge { padding: 3px 8px; border-radius: 999px; background: rgba(107,114,241,.1); color: var(--primary); font-size: 10px; letter-spacing: .02em; }
.status-text { font-size: 11px; font-weight: 600; color: var(--primary); }
.order-main { width: 100%; display: grid; grid-template-columns: 88px minmax(0,1fr); gap: 10px; text-align: left; }
.order-image { width: 88px; height: 88px; border-radius: 14px; object-fit: cover; }
.order-info h2 { margin: 2px 0 6px; font-size: 13px; font-weight: 600; line-height: 1.45; }
.order-meta { display: flex; justify-content: space-between; align-items: flex-end; gap: 10px; margin-top: 12px; }
.order-meta span { font-size: 11px; color: var(--text-2); }
.order-meta strong { font-size: 15px; font-weight: 600; color: #30343a; }
.order-detail-row { display: grid; grid-template-columns: 58px minmax(0,1fr); gap: 8px; margin-top: 9px; font-size: 11px; line-height: 1.5; }
.order-detail-row span { color: var(--text-3); }
.order-detail-row p { margin: 0; color: #545b64; }
.order-actions { display: flex; justify-content: flex-end; flex-wrap: wrap; gap: 8px; margin-top: 12px; padding-top: 10px; border-top: 1px solid #f0f1f3; }
.ghost-button,.primary-button { min-width: 72px; height: 31px; padding: 0 12px; border-radius: 999px; font-size: 11px; font-weight: 500; }
.ghost-button { border: 1px solid #d9e1f1; background: #fff; color: var(--text-2); }
.primary-button { border: 0; background: var(--primary); color: #fff; }
.empty-state { padding: 44px 18px; text-align: center; border-radius: 18px; background: rgba(255,255,255,.86); color: var(--text-3); }
.empty-state strong { display: block; margin-bottom: 6px; font-size: 13px; font-weight: 600; color: #4d535a; }
.empty-state p { margin: 0; font-size: 11px; }
.page-footer { padding: 14px 0 4px; text-align: center; font-size: 10px; color: var(--text-3); }
</style>
