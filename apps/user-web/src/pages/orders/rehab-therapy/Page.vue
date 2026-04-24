<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import type { PageComponentProps } from "@ihc/page-core/types";
import { Headset } from "@icon-park/vue-next";
import mock from "./mock";
import {
  formatOrderTime,
  getOrderCategoryLabel,
  getOrderServiceTypeKey,
  resolveOrderBookingText,
  resolveOrderAssetUrl,
  useOrderCenter
} from "@/pages/service/order-center";

const props = defineProps<PageComponentProps>();
const {
  orders,
  ensureOrdersLoaded,
  selectOrder,
  cancelCurrentOrder,
  isOrdersLoading,
  ordersError
} = useOrderCenter();

type ServiceKey = "homeCare" | "therapy" | "exam";
const activeService = ref<ServiceKey>("therapy");
const activeTab = ref("all");

const currentOrders = computed(() =>
  orders.value.filter((item) => getOrderServiceTypeKey(item.serviceCategory) === activeService.value)
);
const visibleOrders = computed(() => {
  if (activeTab.value === "all") {
    return currentOrders.value;
  }

  if (activeTab.value === "review") {
    return currentOrders.value.filter((item) => item.status === "COMPLETED");
  }

  return currentOrders.value.filter((item) => item.status === activeTab.value);
});

function selectService(key: string) {
  activeService.value = key as ServiceKey;
  activeTab.value = "all";
}

function goBack() {
  if (!props.navigation.navigateBack()) {
    props.navigation.reLaunch("home/mine");
  }
}

async function handleAction(actionKey: string, orderId: string) {
  selectOrder(orderId);

  if (actionKey === "edit") {
    props.navigation.navigateTo("service/order-edit");
    return;
  }

  if (actionKey === "record") {
    props.navigation.navigateTo("service/service-track");
    return;
  }

  if (actionKey === "coupon") {
    props.navigation.navigateTo("orders/checkup-voucher");
    return;
  }

  if (actionKey === "checkup-report") {
    props.navigation.navigateTo("orders/checkup-report");
    return;
  }

  if (actionKey === "cancel") {
    try {
      await cancelCurrentOrder("用户主动取消");
      props.showToast("订单已取消");
      await ensureOrdersLoaded(true);
    } catch (error) {
      props.showToast(error instanceof Error ? error.message : "取消订单失败");
    }
    return;
  }

  props.navigation.navigateTo("service/order-detail");
}

function getOrderActions(order: (typeof visibleOrders.value)[number]) {
  if (order.status === "COMPLETED" && activeService.value === "exam") {
    return [{ key: "checkup-report", label: "查看报告", type: "primary" as const }];
  }

  if (order.status === "COMPLETED") {
    return [{ key: "record", label: "服务记录", type: "primary" as const }];
  }

  return [
    { key: "cancel", label: "取消订单", type: "ghost" as const },
    { key: "edit", label: "修改信息", type: "ghost" as const },
    { key: "record", label: "订单详情", type: "primary" as const }
  ];
}

onMounted(() => {
  void ensureOrdersLoaded();
});
</script>

<template>
  <section class="rehab-order-page">
    <header class="page-header">
      <button class="back-button" type="button" aria-label="返回" @click="goBack">‹</button>
      <h1>我的订单</h1>
      <button class="service-button" type="button" aria-label="客服" @click="props.showToast('客服功能待接入')">
        <Headset theme="outline" size="22" fill="#34383f" />
      </button>
    </header>

    <nav class="service-tabs" aria-label="服务分类">
      <button
        v-for="tab in mock.serviceTabs"
        :key="tab.key"
        class="service-tab"
        :class="{ active: activeService === tab.key }"
        type="button"
        @click="selectService(tab.key)"
      >
        {{ tab.label }}
      </button>
    </nav>

    <nav class="order-tabs" aria-label="订单状态">
      <button
        v-for="tab in mock.tabs"
        :key="tab.key"
        class="order-tab"
        :class="{ active: activeTab === tab.key }"
        type="button"
        @click="activeTab = tab.key"
      >
        {{ tab.label }}
      </button>
    </nav>

    <main class="order-scroll">
      <p v-if="isOrdersLoading" class="empty-text">正在同步订单...</p>
      <p v-else-if="ordersError" class="empty-text">{{ ordersError }}</p>

      <article v-for="order in visibleOrders" :key="order.orderId" class="order-card">
        <div class="order-card-top">
          <p class="countdown">{{ getOrderCategoryLabel(order.serviceCategory) }}</p>
          <strong>{{ order.statusText }}</strong>
        </div>

        <section class="product-row">
          <img class="product-image" :src="resolveOrderAssetUrl(order.image)" :alt="order.title" />
          <div class="product-copy">
            <h2>{{ order.title }}</h2>
            <p>¥{{ order.actualAmount }}</p>
            <small>{{ resolveOrderBookingText(order.orderId, order.bookingDate, order.bookingTimeSlot) }}</small>
          </div>
        </section>

        <footer class="action-row">
          <button
            v-for="action in getOrderActions(order)"
            :key="action.key"
            class="action-button"
            :class="{ primary: action.type === 'primary' }"
            type="button"
            @click="handleAction(action.key, order.orderId)"
          >
            {{ action.label }}
          </button>
        </footer>
      </article>

      <p v-if="!isOrdersLoading && !visibleOrders.length" class="empty-text">当前没有相关订单</p>
    </main>
  </section>
</template>

<style scoped>
.rehab-order-page {
  position: relative;
  left: 50%;
  width: min(402px, 100vw);
  height: min(874px, calc(100vh - 36px));
  min-height: min(874px, calc(100vh - 36px));
  max-height: 874px;
  margin: -18px 0;
  padding: 16px 18px 28px;
  box-sizing: border-box;
  transform: translateX(-50%);
  overflow: hidden;
  background: #f5f6f7;
  color: #252939;
  font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif;
}

button {
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
}

.page-header {
  height: 52px;
  display: grid;
  grid-template-columns: 34px 1fr 34px;
  align-items: center;
}

.back-button {
  width: 32px;
  height: 38px;
  padding: 0;
  color: #34383f;
  font-size: 38px;
  font-weight: 300;
  line-height: 30px;
}

.page-header h1 {
  margin: 0;
  color: #34383f;
  font-size: 20px;
  font-weight: 900;
  letter-spacing: 0;
}

.service-button {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  padding: 0;
}

.service-tabs {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin: 4px 0 10px;
}

.service-tab {
  height: 38px;
  border-radius: 14px;
  background: #fff;
  color: #8d929b;
  font-size: 14px;
  font-weight: 900;
  box-shadow: 0 8px 22px rgba(31, 40, 58, 0.04);
}

.service-tab.active {
  background: #75d6df;
  color: #1f2a44;
}

.order-tabs {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  align-items: end;
  gap: 5px;
  height: 48px;
  margin-bottom: 8px;
}

.order-tab {
  position: relative;
  padding: 0 0 12px;
  color: #b9bdc5;
  font-size: 16px;
  font-weight: 900;
  white-space: nowrap;
}

.order-tab.active {
  color: #34383f;
}

.order-tab.active::after {
  content: "";
  position: absolute;
  left: 50%;
  bottom: 0;
  width: 22px;
  height: 4px;
  border-radius: 999px;
  background: #75d6df;
  transform: translateX(-50%);
}

.order-scroll {
  height: calc(100% - 158px);
  padding: 0 0 12px;
  overflow-y: auto;
  scrollbar-width: none;
}

.order-scroll::-webkit-scrollbar {
  display: none;
}

.order-card {
  padding: 18px 18px 20px;
  margin-bottom: 16px;
  border-radius: 18px;
  background: #fff;
  box-shadow: 0 10px 28px rgba(31, 40, 58, 0.045);
}

.order-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 22px;
  margin-bottom: 16px;
}

.countdown {
  margin: 0;
  color: #f47875;
  font-size: 14px;
  font-weight: 900;
}

.order-card-top strong {
  color: #2d90f0;
  font-size: 14px;
  font-weight: 900;
}

.product-row {
  display: grid;
  grid-template-columns: 88px 1fr;
  gap: 14px;
  align-items: center;
}

.product-image {
  width: 88px;
  height: 88px;
  display: block;
  border-radius: 12px;
  object-fit: cover;
}

.product-copy h2 {
  margin: 0 0 18px;
  color: #34383f;
  font-size: 17px;
  font-weight: 800;
  line-height: 1.42;
}

.product-copy p {
  margin: 0;
  color: #464a52;
  font-size: 16px;
  font-weight: 900;
}

.product-copy small {
  display: block;
  margin-top: 6px;
  color: #8d929b;
  font-size: 12px;
}

.action-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-top: 22px;
}

.action-button {
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 8px;
  border: 1px solid rgba(117, 214, 223, 0.45);
  border-radius: 18px;
  background: #fff;
  color: #2b9fa9;
  font-size: 13px;
  font-weight: 900;
  white-space: nowrap;
}

.action-button.primary {
  border-color: transparent;
  background: #75d6df;
  color: #1f2a44;
}

.empty-text {
  margin: 80px 0 0;
  color: #a5a9b2;
  font-size: 14px;
  font-weight: 800;
  text-align: center;
}
</style>
