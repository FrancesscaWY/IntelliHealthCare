<script setup lang="ts">
import { computed, onActivated, onMounted, ref } from "vue";
import type { PageComponentProps } from "@ihc/page-core/types";
import { getAdminOrders, type AdminOrderListItem } from "@/shared/api/orders";
import { clearAdminAuthSession } from "@/shared/auth/session";
import { deriveDateRange, extractDatePart } from "@/shared/date-range";
import mock, {
  orderDetailPendingActionStorageKey,
  orderDetailStorageKey,
  saveRemoteOrders,
  type AdminOrderRecord
} from "./mock";

const localServiceCoverFallback = "/api/v1/assets/demo/services/service-cleaning.jpg";
const localAvatarFallback = "/api/v1/assets/demo/avatars/avatar-1.jpg";

const props = defineProps<PageComponentProps>();
const orders = ref<AdminOrderRecord[]>(mock.orders);

const selectedServiceType = ref(mock.serviceTypes[0]);
const paymentMethod = ref(mock.paymentOptions[0]);
const startDate = ref("");
const endDate = ref("");
const minPrice = ref("");
const maxPrice = ref("");
const keyword = ref("");
const activeStatus = ref("全部");
const listRefreshTick = ref(0);
const reusableDetailActionLabels = new Set(["关闭订单", "手动派单", "退款", "发起售后", "处理售后"]);

function refreshList() {
  listRefreshTick.value += 1;
}

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const year = date.getUTCFullYear();
  const month = `${date.getUTCMonth() + 1}`.padStart(2, "0");
  const day = `${date.getUTCDate()}`.padStart(2, "0");
  const hour = `${date.getUTCHours()}`.padStart(2, "0");
  const minute = `${date.getUTCMinutes()}`.padStart(2, "0");
  const second = `${date.getUTCSeconds()}`.padStart(2, "0");

  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

function formatMoney(value: number | null | undefined) {
  return Number(value || 0).toFixed(2);
}

function mapOrderStatus(status: string) {
  switch (status) {
    case "PENDING_PAYMENT":
      return "待付款" as const;
    case "PENDING_CONFIRMATION":
    case "DISPATCHING":
      return "待接单" as const;
    case "WAITING_ASSESSMENT":
    case "SCHEDULED":
    case "IN_SERVICE":
      return "待服务" as const;
    case "COMPLETED":
      return "已完成" as const;
    case "AFTER_SALE":
    case "REFUNDED":
      return "退款售后" as const;
    case "CANCELLED":
    default:
      return "已关闭" as const;
  }
}

function buildDetailCopy(order: AdminOrderListItem, status: AdminOrderRecord["status"]) {
  if (status === "待付款") {
    return {
      detailTitle: "商品已拍下，等待买家付款",
      detailDescription: "订单已创建，等待买家完成支付。",
      productActionLabel: "-"
    };
  }

  if (status === "待接单") {
    return {
      detailTitle: "买家已支付，等待服务人员接单",
      detailDescription: "后台可直接进入派单流程，确认机构、人员和服务时间。",
      productActionLabel: "可派单"
    };
  }

  if (status === "待服务") {
    return {
      detailTitle: "服务已排期，等待上门",
      detailDescription: "请按预约时间上门并在服务结束后同步结果。",
      productActionLabel: "联系客服"
    };
  }

  if (status === "已完成") {
    return {
      detailTitle: "服务已完成",
      detailDescription: "订单已闭环，可回看服务记录和报告。",
      productActionLabel: "查看记录"
    };
  }

  if (status === "退款售后") {
    return {
      detailTitle: "订单处于售后处理中",
      detailDescription: order.afterSaleReason || "请及时跟进售后处理进度。",
      productActionLabel: "处理售后"
    };
  }

  return {
    detailTitle: "订单已关闭",
    detailDescription: order.afterSaleReason || "订单已关闭，可查看关闭原因和处理记录。",
    productActionLabel: "-"
  };
}

function buildOrderActions(status: AdminOrderRecord["status"]) {
  if (status === "待付款") {
    return [
      { label: "订单详情", tone: "green" as const },
      { label: "关闭订单", tone: "red" as const },
      { label: "联系用户", tone: "green" as const },
      { label: "备注", tone: "green" as const }
    ];
  }

  if (status === "待接单") {
    return [
      { label: "订单详情", tone: "green" as const },
      { label: "手动派单", tone: "green" as const },
      { label: "退款", tone: "red" as const },
      { label: "联系用户", tone: "green" as const },
      { label: "备注", tone: "green" as const }
    ];
  }

  if (status === "待服务") {
    return [
      { label: "订单详情", tone: "green" as const },
      { label: "退款", tone: "red" as const },
      { label: "联系用户", tone: "green" as const },
      { label: "备注", tone: "green" as const }
    ];
  }

  if (status === "已完成") {
    return [
      { label: "订单详情", tone: "green" as const },
      { label: "发起售后", tone: "red" as const },
      { label: "联系用户", tone: "green" as const },
      { label: "备注", tone: "green" as const }
    ];
  }

  if (status === "退款售后") {
    return [
      { label: "订单详情", tone: "green" as const },
      { label: "处理售后", tone: "red" as const },
      { label: "联系用户", tone: "green" as const },
      { label: "备注", tone: "green" as const }
    ];
  }

  return [
    { label: "订单详情", tone: "green" as const },
    { label: "联系用户", tone: "green" as const },
    { label: "备注", tone: "green" as const }
  ];
}

function buildFooterActions(status: AdminOrderRecord["status"]) {
  if (status === "待付款") {
    return [
      { label: "修改价格", tone: "primary" as const },
      { label: "关闭订单", tone: "danger" as const },
      { label: "返回", tone: "ghost" as const }
    ];
  }

  if (status === "待接单") {
    return [
      { label: "手动派单", tone: "primary" as const },
      { label: "退款", tone: "danger" as const },
      { label: "返回", tone: "ghost" as const }
    ];
  }

  if (status === "待服务") {
    return [
      { label: "退款", tone: "danger" as const },
      { label: "返回", tone: "ghost" as const }
    ];
  }

  if (status === "退款售后") {
    return [
      { label: "处理售后", tone: "primary" as const },
      { label: "返回", tone: "ghost" as const }
    ];
  }

  return [{ label: "返回", tone: "ghost" as const }];
}

function buildPaymentDeadlineAt(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  const createdAt = new Date(value);

  if (Number.isNaN(createdAt.getTime())) {
    return "";
  }

  return new Date(createdAt.getTime() + 30 * 60 * 1000).toISOString();
}

function adaptOrder(item: AdminOrderListItem): AdminOrderRecord {
  const status = mapOrderStatus(item.status);
  const detailCopy = buildDetailCopy(item, status);

  return {
    id: item.orderId,
    orderTime: formatDateTime(item.createdAt),
    settleLabel: item.paymentChannel ? "实付款" : "应付款",
    settleAmount: formatMoney(item.actualAmount ?? item.payableAmount),
    title: item.title,
    image: item.image || localServiceCoverFallback,
    price: formatMoney(item.payableAmount),
    originalPrice: formatMoney(item.originalAmount ?? item.payableAmount),
    discountAmount: formatMoney(item.discountAmount),
    buyerName: item.ownerName,
    buyerId: item.ownerId,
    buyerPhone: item.ownerPhone,
    buyerAvatar: item.ownerAvatar || localAvatarFallback,
    status,
    payment: item.paymentChannelText === "线下" ? "银行卡" : item.paymentChannelText || "-",
    serviceType: item.serviceCategoryText,
    serviceSummary: item.serviceSummary || "暂无服务摘要",
    actions: buildOrderActions(status),
    orderSource: item.source.toUpperCase(),
    registerTime: formatDateTime(item.ownerCreatedAt) || "-",
    registerMethod: "平台注册",
    lastLoginTime: formatDateTime(item.ownerLastLoginAt) || "-",
    lastPurchaseTime: formatDateTime(item.createdAt) || "-",
    userRemark: item.elderName ? `服务对象：${item.elderName}` : "暂无",
    orderRemark: item.remark || "暂无",
    contactName: item.contactName || item.ownerName,
    contactPhone: item.contactPhone || item.ownerPhone,
    serviceAddress: item.addressText || "待补充服务地址",
    appointmentTime: `${item.bookingDate || "待排期"}${item.bookingTimeSlot ? ` ${item.bookingTimeSlot}` : ""}`,
    duration: item.serviceCategoryText === "上门体检" ? "约2小时" : "约1.5小时",
    paymentTime: formatDateTime(item.paidAt) || undefined,
    acceptedTime: item.workOrderId ? formatDateTime(item.createdAt) || undefined : undefined,
    completedTime: formatDateTime(item.completedAt) || undefined,
    closedTime: formatDateTime(item.cancelledAt) || undefined,
    orderDate: extractDatePart(item.createdAt),
    closeReason: status === "已关闭" ? item.afterSaleReason || "系统关闭" : undefined,
    serviceCode: item.orderNo.slice(-8).toUpperCase(),
    serviceStaff: item.assigneeName || undefined,
    verifier: item.assigneeName || undefined,
    afterSaleNo: item.afterSaleId || undefined,
    afterSaleReason: item.afterSaleReason || undefined,
    afterSaleStatus: item.afterSaleStatus || undefined,
    paymentDeadlineAt: status === "待付款" ? buildPaymentDeadlineAt(item.createdAt) : undefined,
    detailTitle: detailCopy.detailTitle,
    detailDescription: detailCopy.detailDescription,
    productActionLabel: detailCopy.productActionLabel,
    footerActions: buildFooterActions(status)
  };
}

function syncOrderDateRange(nextOrders = orders.value, force = false) {
  if (!force && startDate.value && endDate.value) {
    return;
  }

  const range = deriveDateRange(nextOrders.map((order) => order.orderDate));
  startDate.value = range.start;
  endDate.value = range.end;
}

async function syncOrdersFromApi(options: { resetDateRange?: boolean } = {}) {
  try {
    const response = await getAdminOrders({
      page: 1,
      pageSize: 100
    });
    const nextOrders = response.list.map(adaptOrder);

    if (nextOrders.length > 0) {
      orders.value = nextOrders;
      saveRemoteOrders(nextOrders);
      syncOrderDateRange(nextOrders, options.resetDateRange);
      refreshList();
    }
  } catch (error) {
    const status = typeof error === "object" && error !== null && "status" in error ? Number(error.status) : 0;

    if (status === 401 || status === 403) {
      clearAdminAuthSession();
      props.showToast(error instanceof Error ? error.message : "后台鉴权失败，请重新登录");
      props.navigation.reLaunch("auth/login");
      return;
    }

    props.showToast(error instanceof Error ? error.message : "订单列表加载失败，已回退到演示数据");
  }
}

onMounted(() => {
  refreshList();
  void syncOrdersFromApi({
    resetDateRange: true,
  });
});

onActivated(() => {
  refreshList();
  void syncOrdersFromApi();
});

const filteredOrders = computed(() =>
  (listRefreshTick.value,
  orders.value.filter((order) => {
    const matchesType = selectedServiceType.value === "全部类型" || order.serviceType === selectedServiceType.value;
    const matchesPayment = paymentMethod.value === "全部方式" || order.payment === paymentMethod.value;
    const matchesKeyword =
      !keyword.value.trim() || `${order.title}${order.buyerName}${order.id}${order.buyerPhone}`.includes(keyword.value.trim());
    const matchesStatus = activeStatus.value === "全部" || order.status === activeStatus.value;
    const matchesMin = !minPrice.value || Number(order.price) >= Number(minPrice.value);
    const matchesMax = !maxPrice.value || Number(order.price) <= Number(maxPrice.value);
    const matchesDate =
      (!startDate.value || !order.orderDate || order.orderDate >= startDate.value) &&
      (!endDate.value || !order.orderDate || order.orderDate <= endDate.value);
    return matchesType && matchesPayment && matchesKeyword && matchesStatus && matchesMin && matchesMax && matchesDate;
  })),
);

function searchOrders() {
  props.showToast(`已筛选 ${filteredOrders.value.length} 笔订单`);
}

function resetFilters() {
  selectedServiceType.value = mock.serviceTypes[0];
  paymentMethod.value = mock.paymentOptions[0];
  startDate.value = "";
  endDate.value = "";
  minPrice.value = "";
  maxPrice.value = "";
  keyword.value = "";
  activeStatus.value = "全部";
  syncOrderDateRange(orders.value, true);
  props.showToast("筛选条件已重置");
}

function openOrderDetail(orderId: string, pendingAction?: string) {
  if (typeof window !== "undefined") {
    window.sessionStorage.setItem(orderDetailStorageKey, orderId);

    if (pendingAction) {
      window.sessionStorage.setItem(orderDetailPendingActionStorageKey, pendingAction);
    } else {
      window.sessionStorage.removeItem(orderDetailPendingActionStorageKey);
    }
  }

  const targetPageId = "dashboard/order-detail";
  const previousStack = props.navigation.getStack();

  props.navigation.navigateTo(targetPageId);

  const nextStack = props.navigation.getStack();
  const activePageId = nextStack[nextStack.length - 1] || "";

  if (activePageId !== targetPageId) {
    props.navigation.reLaunch(targetPageId);
  }

  const finalStack = props.navigation.getStack();
  const resolvedPageId = finalStack[finalStack.length - 1] || "";

  if (resolvedPageId !== targetPageId) {
    props.showToast(`跳转失败，当前导航栈：${previousStack.join(" > ") || "空"}`);
  }
}

function triggerAction(label: string, orderId?: string) {
  if (label === "订单详情" && orderId) {
    openOrderDetail(orderId);
    return;
  }

  if (orderId && reusableDetailActionLabels.has(label)) {
    openOrderDetail(orderId, label);
    return;
  }

  const order = orderId ? orders.value.find((item) => item.id === orderId) : undefined;

  if (label === "联系用户" && order) {
    props.showToast(`已打开 ${order.contactName} 的联系入口`);
    return;
  }

  if (label === "备注" && orderId) {
    props.showToast(`已打开订单 ${orderId} 的备注入口`);
    return;
  }

  props.showToast(orderId ? `${label}：${orderId}` : `${label}功能为演示状态`);
}
</script>

<template>
  <section class="order-page">
    <article class="order-panel order-panel--filters">
      <header class="section-head">
        <span class="section-head__accent"></span>
        <h1>{{ mock.title }}</h1>
      </header>

      <div class="filters">
        <div class="field field--radio">
          <span class="field__label">服务类型</span>
          <div class="radio-group">
            <label v-for="item in mock.serviceTypes" :key="item" class="radio-item">
              <input v-model="selectedServiceType" type="radio" name="serviceType" :value="item" />
              <span>{{ item }}</span>
            </label>
          </div>
        </div>

        <label class="field">
          <span class="field__label">支付方式</span>
          <div class="field__control field__control--select">
            <select v-model="paymentMethod">
              <option v-for="item in mock.paymentOptions" :key="item" :value="item">{{ item }}</option>
            </select>
            <svg viewBox="0 0 16 16" focusable="false" aria-hidden="true">
              <path d="m3 6 5 5 5-5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.7" />
            </svg>
          </div>
        </label>

        <label class="field field--date">
          <span class="field__label">下单日期</span>
          <div class="field__range">
            <div class="field__control">
              <input v-model="startDate" type="date" />
            </div>
            <span class="field__split">~</span>
            <div class="field__control">
              <input v-model="endDate" type="date" />
              <svg viewBox="0 0 18 18" focusable="false" aria-hidden="true">
                <rect x="2.5" y="3.5" width="13" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="1.6" />
                <path d="M5.5 2.5v3M12.5 2.5v3M2.5 7.5h13" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.6" />
              </svg>
            </div>
          </div>
        </label>

        <div class="field field--price">
          <span class="field__label">实付金额</span>
          <div class="field__range field__range--price">
            <div class="field__control">
              <input v-model="minPrice" type="text" placeholder="最低价格" />
            </div>
            <span class="field__split">-</span>
            <div class="field__control">
              <input v-model="maxPrice" type="text" placeholder="最高价格" />
            </div>
          </div>
        </div>

        <label class="field field--keyword">
          <span class="field__label">关键字</span>
          <div class="field__control">
            <input v-model="keyword" type="text" placeholder="请输入关键字" @keydown.enter="searchOrders" />
          </div>
        </label>

        <div class="field field--actions">
          <span class="field__label field__label--hidden">操作</span>
          <div class="filter-actions">
            <button class="action-button action-button--primary" type="button" @click="searchOrders">
              <svg viewBox="0 0 20 20" focusable="false" aria-hidden="true">
                <circle cx="9" cy="9" r="5.6" fill="none" stroke="currentColor" stroke-width="1.8" />
                <path d="m13.3 13.3 4 4" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.8" />
              </svg>
            </button>
            <button class="action-button action-button--ghost" type="button" @click="resetFilters">
              <svg viewBox="0 0 20 20" focusable="false" aria-hidden="true">
                <path d="M4.7 8.6A6.2 6.2 0 1 1 6.2 14" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.8" />
                <path d="M4.4 3.8v5.1h5.1" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </article>

    <article class="order-panel order-panel--content">
      <header class="status-bar">
        <div class="status-tabs">
          <button
            v-for="item in mock.statusTabs"
            :key="item"
            class="status-tabs__item"
            :class="{ 'status-tabs__item--active': activeStatus === item }"
            type="button"
            @click="activeStatus = item"
          >
            {{ item }}
          </button>
        </div>

        <button class="toolbar-button" type="button" @click="triggerAction('批量操作')">批量操作</button>
      </header>

      <div class="order-table-head">
        <span>商品信息</span>
        <span>价格（元）</span>
        <span>买家</span>
        <span>订单状态</span>
        <span>支付方式</span>
        <span>操作</span>
      </div>

      <div class="order-list">
        <article v-for="order in filteredOrders" :key="order.id" class="order-card">
          <header class="order-card__meta">
            <div>
              <span>下单时间: {{ order.orderTime }}</span>
              <span>订单编号: {{ order.id }}</span>
            </div>
            <strong>{{ order.settleLabel }}: ¥{{ order.settleAmount }}</strong>
          </header>

          <div class="order-card__body">
            <div class="order-card__product">
              <img :src="order.image" :alt="order.title" />
              <strong>{{ order.title }}</strong>
            </div>
            <div class="order-card__price">¥{{ order.price }}</div>
            <div class="order-card__buyer">
              <img :src="order.buyerAvatar" :alt="order.buyerName" />
              <div>
                <strong>{{ order.buyerName }}</strong>
                <span>{{ order.buyerPhone }}</span>
              </div>
            </div>
            <div class="order-card__status">{{ order.status }}</div>
            <div class="order-card__payment">{{ order.payment }}</div>
            <div class="order-card__actions">
              <button
                v-for="action in order.actions"
                :key="action.label"
                type="button"
                class="order-link"
                :class="`order-link--${action.tone}`"
                @click="triggerAction(action.label, order.id)"
              >
                {{ action.label }}
              </button>
            </div>
          </div>
        </article>
      </div>

      <footer class="pagination">
        <span>共7条</span>
        <button type="button" class="pagination__ghost">每页10条</button>
        <button type="button" class="pagination__ghost">&lt;&lt;</button>
        <button type="button" class="pagination__ghost">&lt;</button>
        <button type="button" class="pagination__active">1</button>
        <button type="button" class="pagination__ghost">&gt;</button>
        <button type="button" class="pagination__ghost">&gt;&gt;</button>
        <span>前往第</span>
        <input type="text" value="1" />
        <span>页</span>
      </footer>
    </article>
  </section>
</template>

<style scoped>
.order-page {
  display: grid;
  gap: 18px;
  font-family: "PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.order-panel {
  border-radius: 16px;
  background: #ffffff;
  box-shadow: 0 6px 20px rgba(59, 103, 82, 0.05);
}

.order-panel--filters {
  padding: 18px 20px;
}

.order-panel--content {
  padding: 18px 18px 20px;
}

.section-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 18px;
}

.section-head__accent {
  width: 6px;
  height: 22px;
  border-radius: 999px;
  background: #10c89a;
}

.section-head h1 {
  margin: 0;
  color: #2f3946;
  font-size: 15px;
  font-weight: 500;
  letter-spacing: 0.01em;
}

.filters {
  display: grid;
  grid-template-columns: 1.7fr 0.9fr 1.55fr;
  gap: 16px 18px;
  align-items: end;
}

.field {
  display: grid;
  gap: 8px;
}

.field--radio {
  grid-column: span 1;
}

.field--date {
  min-width: 0;
}

.field--price {
  grid-column: span 1;
}

.field--keyword {
  grid-column: span 1;
}

.field__label {
  color: #8f9aa6;
  font-size: 12px;
  font-weight: 400;
  letter-spacing: 0.01em;
}

.field__label--hidden {
  opacity: 0;
  pointer-events: none;
}

.field__control {
  position: relative;
  display: flex;
  align-items: center;
  min-height: 42px;
  padding: 0 12px;
  border: 1px solid #e9efec;
  border-radius: 10px;
  background: #ffffff;
}

.field__control input,
.field__control select {
  width: 100%;
  border: 0;
  background: transparent;
  color: #44515d;
  font-size: 13px;
  font-weight: 400;
  letter-spacing: 0.01em;
  outline: none;
}

.field__control input::placeholder {
  color: #c1c8cf;
}

.field__control--select select {
  appearance: none;
  padding-right: 18px;
}

.field__control--select svg,
.field__control svg {
  width: 16px;
  height: 16px;
  color: #c2c8ce;
}

.field__control--select svg {
  position: absolute;
  right: 12px;
}

.field__range {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  gap: 10px;
  align-items: center;
}

.field__range--price {
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
}

.field__split {
  color: #bcc5cc;
  font-size: 13px;
}

.radio-group {
  display: flex;
  flex-wrap: wrap;
  gap: 18px;
  min-height: 42px;
  align-items: center;
}

.radio-item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #44515d;
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.01em;
}

.radio-item input {
  width: 22px;
  height: 22px;
  accent-color: #39cf9d;
}

.filter-actions {
  display: flex;
  gap: 10px;
}

.action-button {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  padding: 0;
  border: 1px solid #dfe7e3;
  border-radius: 10px;
  background: #ffffff;
  color: #4b5560;
}

.action-button svg {
  width: 18px;
  height: 18px;
}

.action-button--primary {
  border-color: #39cf9d;
  background: #39cf9d;
  color: #ffffff;
}

.status-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 6px 10px 0;
}

.status-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 28px;
}

.status-tabs__item {
  padding: 12px 0 16px;
  border: 0;
  border-bottom: 4px solid transparent;
  background: transparent;
  color: #2f3946;
  font-size: 15px;
  font-weight: 500;
  letter-spacing: 0.01em;
}

.status-tabs__item--active {
  color: #39cf9d;
  border-bottom-color: #39cf9d;
}

.toolbar-button {
  min-width: 92px;
  height: 40px;
  padding: 0 16px;
  border: 1px solid #dfe7e3;
  border-radius: 10px;
  background: #ffffff;
  color: #34404d;
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.01em;
}

.order-table-head {
  display: grid;
  grid-template-columns: 2.1fr 0.72fr 1.42fr 1.02fr 0.8fr 1.25fr;
  margin-top: 14px;
  padding: 22px 18px;
  border: 1px solid #eef2ef;
  background: #fafafa;
  color: #2f3946;
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.01em;
}

.order-list {
  display: grid;
  gap: 18px;
  margin-top: 16px;
}

.order-card {
  border: 1px solid #eef2ef;
  background: #ffffff;
}

.order-card__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 18px;
  border-bottom: 1px solid #eef2ef;
  color: #a2aab3;
  font-size: 12px;
  font-weight: 400;
  letter-spacing: 0.01em;
}

.order-card__meta div {
  display: flex;
  flex-wrap: wrap;
  gap: 34px;
}

.order-card__meta strong {
  color: #98a2ac;
  font-size: 12px;
  font-weight: 500;
}

.order-card__body {
  display: grid;
  grid-template-columns: 2.1fr 0.72fr 1.42fr 1.02fr 0.8fr 1.25fr;
}

.order-card__body > div {
  min-width: 0;
  padding: 18px;
  border-right: 1px solid #eef2ef;
}

.order-card__body > div:last-child {
  border-right: 0;
}

.order-card__product {
  display: grid;
  grid-template-columns: 104px minmax(0, 1fr);
  gap: 16px;
  align-items: center;
}

.order-card__product img {
  width: 104px;
  height: 78px;
  border-radius: 10px;
  object-fit: cover;
}

.order-card__product strong {
  color: #303b47;
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.01em;
  line-height: 1.55;
}

.order-card__price,
.order-card__status,
.order-card__payment {
  display: flex;
  align-items: center;
  color: #2f3946;
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.01em;
}

.order-card__buyer {
  display: grid;
  grid-template-columns: 56px minmax(0, 1fr);
  gap: 12px;
  align-items: center;
}

.order-card__buyer img {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  object-fit: cover;
}

.order-card__buyer strong {
  display: block;
  color: #2f3946;
  font-size: 13px;
  font-weight: 500;
}

.order-card__buyer span {
  display: block;
  margin-top: 8px;
  color: #3e4854;
  font-size: 13px;
  font-weight: 400;
}

.order-card__actions {
  display: flex;
  flex-wrap: wrap;
  align-content: center;
  gap: 10px 18px;
}

.order-link {
  padding: 0;
  border: 0;
  background: transparent;
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.01em;
}

.order-link--green {
  color: #39cf9d;
}

.order-link--red {
  color: #ff847c;
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  padding: 28px 8px 4px;
  color: #8f9aa5;
  font-size: 12px;
  font-weight: 400;
}

.pagination__ghost,
.pagination__active,
.pagination input {
  height: 42px;
  min-width: 42px;
  padding: 0 14px;
  border: 1px solid #eef2ef;
  border-radius: 8px;
  background: #ffffff;
  color: #55616d;
  font-size: 13px;
  font-weight: 500;
}

.pagination__active {
  border-color: #39cf9d;
  background: #39cf9d;
  color: #ffffff;
}

.pagination input {
  width: 52px;
  text-align: center;
  outline: none;
}

@media (max-width: 1380px) {
  .filters {
    grid-template-columns: 1fr 1fr;
  }

  .field--radio,
  .field--date,
  .field--price,
  .field--keyword {
    grid-column: span 1;
  }

  .status-bar {
    flex-direction: column;
    align-items: stretch;
  }

  .order-table-head,
  .order-card__body {
    grid-template-columns: 1.8fr 0.7fr 1.25fr 1fr 0.7fr 1.2fr;
  }
}
</style>
