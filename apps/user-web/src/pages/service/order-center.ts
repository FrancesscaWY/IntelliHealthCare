import { computed, ref } from "vue";
import { hasUserAuthSession } from "@/shared/auth/session";
import { getOrderFlowState } from "@/pages/service/order-flow";
import {
  cancelOrder,
  createOrderAfterSale,
  createOrderReview,
  getOrderAfterSales,
  getOrderAssessmentReport,
  getOrderDetail,
  getOrderRehabReport,
  getOrderReview,
  getOrderServiceRecords,
  getOrderTimeline,
  getOrderVoucher,
  listOrders,
  type OrderAfterSaleItem,
  type OrderDetailResponse,
  type OrderListItem,
  type OrderReportResponse,
  type OrderReviewResponse,
  type OrderServiceRecordItem,
  type OrderTimelineItem,
  type OrderVoucherResponse
} from "@/shared/api/orders";

const ACTIVE_ORDER_STORAGE_KEY = "ihc:user-web:active-order-id";

const orders = ref<OrderListItem[]>([]);
const currentOrderId = ref("");
const currentOrderDetail = ref<OrderDetailResponse | null>(null);
const currentOrderTimeline = ref<OrderTimelineItem[]>([]);
const currentOrderVoucher = ref<OrderVoucherResponse | null>(null);
const currentOrderServiceRecords = ref<OrderServiceRecordItem[]>([]);
const currentOrderAssessmentReport = ref<OrderReportResponse | null>(null);
const currentOrderRehabReport = ref<OrderReportResponse | null>(null);
const currentOrderReview = ref<OrderReviewResponse | null>(null);
const currentOrderAfterSales = ref<OrderAfterSaleItem[]>([]);
const isOrdersLoading = ref(false);
const isCurrentOrderLoading = ref(false);
const ordersError = ref("");

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function loadStoredOrderId() {
  if (!canUseStorage()) {
    return "";
  }

  return window.localStorage.getItem(ACTIVE_ORDER_STORAGE_KEY) || "";
}

function saveStoredOrderId(orderId: string) {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(ACTIVE_ORDER_STORAGE_KEY, orderId);
}

currentOrderId.value = loadStoredOrderId();

function ensureCurrentOrderId() {
  if (currentOrderId.value) {
    return;
  }

  currentOrderId.value = orders.value[0]?.orderId || "";
}

function resetCurrentOrderExtraState() {
  currentOrderTimeline.value = [];
  currentOrderVoucher.value = null;
  currentOrderServiceRecords.value = [];
  currentOrderAssessmentReport.value = null;
  currentOrderRehabReport.value = null;
  currentOrderReview.value = null;
  currentOrderAfterSales.value = [];
}

export function formatOrderTime(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  return String(value).replace("T", " ").slice(0, 16);
}

export function getOrderCategoryLabel(category: string) {
  switch (category) {
    case "HOME_CARE":
      return "家政护理";
    case "REHAB_THERAPY":
      return "康复理疗";
    case "CHECKUP":
      return "上门体检";
    default:
      return "订单服务";
  }
}

export function getOrderServiceTypeKey(category: string) {
  switch (category) {
    case "HOME_CARE":
      return "homeCare";
    case "CHECKUP":
      return "exam";
    default:
      return "therapy";
  }
}

export function resolveOrderAssetUrl(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  if (/^https?:\/\//.test(value) || /^data:/.test(value)) {
    return value;
  }

  return value.startsWith("/") ? `http://server.mctown.online:8190${value}` : value;
}

function getPendingLocalBooking(orderId: string) {
  const orderFlowState = getOrderFlowState();
  if (orderFlowState.createdOrder?.orderId !== orderId) {
    return null;
  }

  if (!orderFlowState.booking?.bookingDate || !orderFlowState.booking?.bookingTimeSlot) {
    return null;
  }

  return orderFlowState.booking;
}

export function resolveOrderBookingDate(orderId: string, fallback?: string | null) {
  return getPendingLocalBooking(orderId)?.bookingDate || fallback || "";
}

export function resolveOrderBookingTimeSlot(orderId: string, fallback?: string | null) {
  return getPendingLocalBooking(orderId)?.bookingTimeSlot || fallback || "";
}

export function resolveOrderBookingText(orderId: string, fallbackDate?: string | null, fallbackTimeSlot?: string | null) {
  const bookingDate = resolveOrderBookingDate(orderId, fallbackDate);
  const bookingTimeSlot = resolveOrderBookingTimeSlot(orderId, fallbackTimeSlot);
  return `${bookingDate} ${bookingTimeSlot}`.trim();
}

export function resolveOrderAddressText(orderId: string, fallback?: string | null) {
  return getPendingLocalBooking(orderId)?.addressText || fallback || "";
}

export function resolveOrderContactPhone(orderId: string, fallback?: string | null) {
  return getPendingLocalBooking(orderId)?.contactPhone || fallback || "";
}

export function useOrderCenter() {
  const currentOrder = computed(() => {
    if (currentOrderDetail.value?.orderId === currentOrderId.value) {
      return currentOrderDetail.value;
    }

    return orders.value.find((item) => item.orderId === currentOrderId.value) || null;
  });

  async function ensureOrdersLoaded(force = false) {
    if (isOrdersLoading.value) {
      return;
    }

    if (!force && orders.value.length > 0) {
      ensureCurrentOrderId();
      return;
    }

    if (!hasUserAuthSession()) {
      orders.value = [];
      currentOrderId.value = "";
      return;
    }

    isOrdersLoading.value = true;
    ordersError.value = "";

    try {
      const response = await listOrders({
        page: 1,
        pageSize: 50
      });
      orders.value = response.list;
      ensureCurrentOrderId();
      if (currentOrderId.value) {
        saveStoredOrderId(currentOrderId.value);
      }
    } catch (error) {
      ordersError.value = error instanceof Error ? error.message : "订单列表加载失败";
    } finally {
      isOrdersLoading.value = false;
    }
  }

  function selectOrder(orderId: string) {
    currentOrderId.value = orderId;
    saveStoredOrderId(orderId);
    resetCurrentOrderExtraState();
  }

  async function ensureCurrentOrderReady(orderId = currentOrderId.value, force = false) {
    if (!orderId || !hasUserAuthSession()) {
      return null;
    }

    if (
      !force &&
      currentOrderDetail.value &&
      currentOrderDetail.value.orderId === orderId
    ) {
      return currentOrderDetail.value;
    }

    isCurrentOrderLoading.value = true;

    try {
      const detail = await getOrderDetail(orderId);
      currentOrderDetail.value = detail;
      selectOrder(orderId);
      return detail;
    } finally {
      isCurrentOrderLoading.value = false;
    }
  }

  async function ensureCurrentTimeline(orderId = currentOrderId.value, force = false) {
    if (!orderId || (!force && currentOrderTimeline.value.length > 0)) {
      return currentOrderTimeline.value;
    }

    currentOrderTimeline.value = await getOrderTimeline(orderId);
    return currentOrderTimeline.value;
  }

  async function ensureCurrentVoucher(orderId = currentOrderId.value, force = false) {
    if (!orderId || (!force && currentOrderVoucher.value)) {
      return currentOrderVoucher.value;
    }

    currentOrderVoucher.value = await getOrderVoucher(orderId);
    return currentOrderVoucher.value;
  }

  async function ensureCurrentServiceRecords(orderId = currentOrderId.value, force = false) {
    if (!orderId || (!force && currentOrderServiceRecords.value.length > 0)) {
      return currentOrderServiceRecords.value;
    }

    currentOrderServiceRecords.value = await getOrderServiceRecords(orderId);
    return currentOrderServiceRecords.value;
  }

  async function ensureCurrentAssessmentReport(orderId = currentOrderId.value, force = false) {
    if (!orderId || (!force && currentOrderAssessmentReport.value)) {
      return currentOrderAssessmentReport.value;
    }

    currentOrderAssessmentReport.value = await getOrderAssessmentReport(orderId);
    return currentOrderAssessmentReport.value;
  }

  async function ensureCurrentRehabReport(orderId = currentOrderId.value, force = false) {
    if (!orderId || (!force && currentOrderRehabReport.value)) {
      return currentOrderRehabReport.value;
    }

    currentOrderRehabReport.value = await getOrderRehabReport(orderId);
    return currentOrderRehabReport.value;
  }

  async function ensureCurrentReview(orderId = currentOrderId.value, force = false) {
    if (!orderId || (!force && currentOrderReview.value)) {
      return currentOrderReview.value;
    }

    currentOrderReview.value = await getOrderReview(orderId).catch(() => null);
    return currentOrderReview.value;
  }

  async function ensureCurrentAfterSales(orderId = currentOrderId.value, force = false) {
    if (!orderId || (!force && currentOrderAfterSales.value.length > 0)) {
      return currentOrderAfterSales.value;
    }

    currentOrderAfterSales.value = await getOrderAfterSales(orderId).catch(() => []);
    return currentOrderAfterSales.value;
  }

  async function cancelCurrentOrder(reason?: string) {
    const orderId = currentOrderId.value;
    if (!orderId) {
      return null;
    }

    const result = await cancelOrder(orderId, reason);
    await ensureOrdersLoaded(true);
    await ensureCurrentOrderReady(orderId, true).catch(() => null);
    return result;
  }

  async function submitCurrentReview(payload: { score: number; tags?: string[]; content?: string }) {
    const orderId = currentOrderId.value;
    if (!orderId) {
      return null;
    }

    const result = await createOrderReview(orderId, payload);
    await ensureCurrentReview(orderId, true);
    return result;
  }

  async function submitCurrentAfterSale(payload: {
    type: string;
    reason: string;
    description?: string;
    amountRequested?: number;
  }) {
    const orderId = currentOrderId.value;
    if (!orderId) {
      return null;
    }

    const result = await createOrderAfterSale(orderId, payload);
    await ensureCurrentAfterSales(orderId, true);
    return result;
  }

  return {
    orders,
    currentOrderId,
    currentOrder,
    currentOrderDetail,
    currentOrderTimeline,
    currentOrderVoucher,
    currentOrderServiceRecords,
    currentOrderAssessmentReport,
    currentOrderRehabReport,
    currentOrderReview,
    currentOrderAfterSales,
    isOrdersLoading,
    isCurrentOrderLoading,
    ordersError,
    ensureOrdersLoaded,
    selectOrder,
    ensureCurrentOrderReady,
    ensureCurrentTimeline,
    ensureCurrentVoucher,
    ensureCurrentServiceRecords,
    ensureCurrentAssessmentReport,
    ensureCurrentRehabReport,
    ensureCurrentReview,
    ensureCurrentAfterSales,
    cancelCurrentOrder,
    submitCurrentReview,
    submitCurrentAfterSale
  };
}
