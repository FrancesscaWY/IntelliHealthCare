<script setup lang="ts">
import { computed, onActivated, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";
import type { PageComponentProps } from "@ihc/page-core/types";
import {
  closeAdminOrder,
  createAdminOrderAfterSale,
  dispatchAdminOrder,
  getAdminOrderDetail,
  saveAdminOrderRemark,
  updateAdminOrderPrice,
} from "@/shared/api/dashboard";
import { handleAdminPageError } from "@/shared/api/error";
import { getAdminStaffs } from "@/shared/api/catalog";
import {
  buildOrderDetail,
  getActiveOrder,
  readSelectedOrderId,
  type DetailField,
} from "./mock";
import { afterSaleDetailStorageKey } from "../after-sale-detail/mock";
import { getAfterSaleRowByNo, upsertAfterSaleRow } from "../after-sale/mock";
import {
  updateOrderById,
  type AdminOrderRecord,
} from "../order-list/mock";

const props = defineProps<PageComponentProps>();
const nowTimestamp = ref(Date.now());
const selectedOrderId = ref(readSelectedOrderId());
const selectedOrder = ref<AdminOrderRecord | null>(getActiveOrder());
const hasRemoteDispatchStaff = ref(false);
const priceEditorOpen = ref(false);
const closeConfirmOpen = ref(false);
const dispatchDialogOpen = ref(false);
const refundConfirmOpen = ref(false);
const afterSaleDialogOpen = ref(false);
const afterSaleHandleDialogOpen = ref(false);
const priceAdjustmentInput = ref("");
const afterSaleRefundInput = ref("");
const afterSaleReasonInput = ref("");
const afterSaleHandleDecision = ref<"complete" | "close">("complete");
const afterSaleHandleRemark = ref("");
let countdownTimer: number | null = null;

type DispatchStaffStatus = "空闲" | "忙碌";
type DispatchStaffOption = {
  id: string;
  name: string;
  employeeNo: string;
  region: string;
  phone: string;
  avatar: string;
  status: DispatchStaffStatus;
};

const fallbackDispatchStaffOptions: DispatchStaffOption[] = [
  {
    id: "staff-1001",
    name: "王小倩",
    employeeNo: "2024340089",
    region: "上海徐汇",
    phone: "15689004488",
    avatar: "/api/v1/assets/demo/staff/staff-1.png",
    status: "空闲",
  },
  {
    id: "staff-1002",
    name: "李阿姨",
    employeeNo: "2024340126",
    region: "上海徐汇",
    phone: "15689002218",
    avatar: "/api/v1/assets/demo/staff/staff-2.png",
    status: "空闲",
  },
  {
    id: "staff-1003",
    name: "周洁",
    employeeNo: "2024340172",
    region: "上海徐汇",
    phone: "15689003116",
    avatar: "/api/v1/assets/demo/staff/staff-3.png",
    status: "空闲",
  },
  {
    id: "staff-1004",
    name: "陈阿姨",
    employeeNo: "2024340198",
    region: "上海徐汇",
    phone: "15689006542",
    avatar: "/api/v1/assets/demo/avatars/avatar-4.jpg",
    status: "空闲",
  },
  {
    id: "staff-1005",
    name: "赵阿姨",
    employeeNo: "2024340241",
    region: "上海徐汇",
    phone: "15689007425",
    avatar: "/api/v1/assets/demo/avatars/avatar-5.jpg",
    status: "忙碌",
  },
  {
    id: "staff-1006",
    name: "刘康复师",
    employeeNo: "2024340314",
    region: "上海浦东",
    phone: "15689008310",
    avatar: "/api/v1/assets/demo/staff/staff-2.png",
    status: "忙碌",
  },
];
const dispatchStaffOptions = ref<DispatchStaffOption[]>(fallbackDispatchStaffOptions);

const dispatchForm = reactive({
  appointmentDate: "",
  appointmentTime: "",
  durationHours: "",
  selectedStaffId: "",
  remark: "",
});

const detail = computed(() => {
  const order = selectedOrder.value;
  return order ? buildOrderDetail(order) : null;
});
const currentAfterSaleRecord = computed(() => {
  const afterSaleNo = selectedOrder.value?.afterSaleNo;
  return afterSaleNo ? getAfterSaleRowByNo(afterSaleNo) ?? null : null;
});

const basePayableAmount = computed(() => {
  const order = selectedOrder.value;

  if (!order) {
    return 0;
  }

  return Math.max(Number(order.originalPrice) - Number(order.discountAmount), 0);
});

const priceAdjustmentValid = computed(() => {
  const rawValue = priceAdjustmentInput.value.trim();

  if (!rawValue) {
    return true;
  }

  return /^-?\d+(\.\d{0,2})?$/.test(rawValue);
});

const priceAdjustmentAmount = computed(() => {
  if (!priceAdjustmentValid.value) {
    return 0;
  }

  const rawValue = priceAdjustmentInput.value.trim();
  return rawValue ? Number(rawValue) : 0;
});

const adjustedPayableAmount = computed(() => Math.max(basePayableAmount.value + priceAdjustmentAmount.value, 0));

const priceAdjustmentError = computed(() => {
  if (!priceAdjustmentValid.value) {
    return "请输入合法金额，最多保留两位小数";
  }

  const rawValue = priceAdjustmentInput.value.trim();

  if (rawValue && basePayableAmount.value + priceAdjustmentAmount.value < 0) {
    return "应付款不能小于 0";
  }

  return "";
});

const canConfirmPriceChange = computed(() => !priceAdjustmentError.value);
const selectedDispatchStaff = computed(
  () => dispatchStaffOptions.value.find((item) => item.id === dispatchForm.selectedStaffId) ?? null,
);
const availableDispatchStaffCount = computed(
  () => dispatchStaffOptions.value.filter((item) => item.status === "空闲").length,
);
const canConfirmDispatch = computed(
  () => !!dispatchForm.appointmentDate && !!dispatchForm.appointmentTime && !!dispatchForm.durationHours && !!dispatchForm.selectedStaffId,
);
const maxAfterSaleRefundAmount = computed(() => Number(selectedOrder.value?.settleAmount || 0));
const afterSaleRefundAmountValid = computed(() => /^\d+(\.\d{0,2})?$/.test(afterSaleRefundInput.value.trim()));
const afterSaleRefundAmount = computed(() => (afterSaleRefundAmountValid.value ? Number(afterSaleRefundInput.value.trim()) : 0));
const afterSaleRefundError = computed(() => {
  const rawValue = afterSaleRefundInput.value.trim();

  if (!rawValue) {
    return "请输入申请退款金额";
  }

  if (!afterSaleRefundAmountValid.value) {
    return "请输入合法金额，最多保留两位小数";
  }

  if (afterSaleRefundAmount.value <= 0) {
    return "申请退款金额需大于 0";
  }

  if (afterSaleRefundAmount.value > maxAfterSaleRefundAmount.value) {
    return `申请退款金额不能超过实付款 ¥${formatAmount(maxAfterSaleRefundAmount.value)}`;
  }

  return "";
});
const afterSaleReasonError = computed(() => (afterSaleReasonInput.value.trim() ? "" : "请输入售后说明"));
const canConfirmAfterSale = computed(() => !afterSaleRefundError.value && !afterSaleReasonError.value);
const currentAfterSaleRefundAmount = computed(() => {
  const order = selectedOrder.value;

  if (!order) {
    return "0.00";
  }

  if (currentAfterSaleRecord.value?.refundAmount) {
    return currentAfterSaleRecord.value.refundAmount;
  }

  const matchedAmount = order.afterSaleReason?.match(/(\d+(?:\.\d{1,2})?)/);
  return matchedAmount ? formatAmount(Number(matchedAmount[1])) : order.settleAmount;
});
const afterSaleHandleRemarkError = computed(() => (afterSaleHandleRemark.value.trim() ? "" : "请输入处理备注"));
const canConfirmAfterSaleHandle = computed(() => !afterSaleHandleRemarkError.value);

const remainingPaymentText = computed(() => {
  const deadlineAt = detail.value?.order.paymentDeadlineAt;

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

async function syncDispatchStaffOptions(serviceType?: string) {
  try {
    const response = await getAdminStaffs({
      page: 1,
      pageSize: 100,
      serviceType: serviceType || undefined,
    });
    const rows = Array.isArray(response?.rows) ? response.rows : [];

    dispatchStaffOptions.value = rows.length
      ? rows.map((item: Record<string, unknown>) => ({
          id: String(item.id ?? ""),
          name: String(item.name ?? "待分配"),
          employeeNo: String(item.staffId ?? item.employeeNo ?? ""),
          region: String(item.district ?? "上海"),
          phone: String(item.phone ?? ""),
          avatar: String(
            item.avatar ||
              "/api/v1/assets/demo/staff/staff-2.png",
          ),
          status: item.enabled === false ? "忙碌" : "空闲",
        }))
      : fallbackDispatchStaffOptions;
    hasRemoteDispatchStaff.value = rows.length > 0;
  } catch {
    dispatchStaffOptions.value = fallbackDispatchStaffOptions;
    hasRemoteDispatchStaff.value = false;
  }
}

async function syncPageData() {
  const orderId = readSelectedOrderId();

  selectedOrderId.value = orderId;

  if (!orderId) {
    selectedOrder.value = getActiveOrder();
    await syncDispatchStaffOptions(selectedOrder.value?.serviceType);
    return;
  }

  try {
    const response = await getAdminOrderDetail(orderId);
    const remoteOrder = (response?.viewModel?.order ?? null) as AdminOrderRecord | null;

    if (remoteOrder) {
      selectedOrder.value = { ...remoteOrder };
    } else {
      selectedOrder.value = getActiveOrder();
    }

    await syncDispatchStaffOptions(selectedOrder.value?.serviceType);
  } catch (error) {
    handleAdminPageError(error, {
      navigation: props.navigation,
      showToast: props.showToast,
      fallbackMessage: "订单详情加载失败，已回退到演示数据",
    });
    selectedOrder.value = getActiveOrder();
    await syncDispatchStaffOptions(selectedOrder.value?.serviceType);
  }
}

watch(
  () => detail.value?.order.paymentDeadlineAt ?? "",
  (deadlineAt) => {
    nowTimestamp.value = Date.now();
    stopCountdown();

    if (deadlineAt) {
      startCountdown();
    }
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  stopCountdown();
});

onMounted(() => {
  void syncPageData();
});

onActivated(() => {
  void syncPageData();
});

function goBack() {
  if (!props.navigation.navigateBack()) {
    props.navigation.reLaunch("dashboard/order-list");
  }
}

function formatAmount(value: number) {
  return value.toFixed(2);
}

function formatCurrentTime() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function formatDateInputFromAppointment(appointmentTime: string) {
  const matchedValue = appointmentTime.match(/^(\d{4}-\d{2}-\d{2})/);
  return matchedValue ? matchedValue[1] : "";
}

function formatTimeInputFromAppointment(appointmentTime: string) {
  const matchedValue = appointmentTime.match(/(\d{2}:\d{2})/);
  return matchedValue ? matchedValue[1] : "";
}

function formatDurationInput(duration: string) {
  const matchedValue = duration.match(/(\d+(?:\.\d+)?)/);
  return matchedValue ? matchedValue[1] : "";
}

function formatDurationText(durationHours: string) {
  const numericValue = Number(durationHours);

  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return "0小时";
  }

  return Number.isInteger(numericValue) ? `${numericValue}小时` : `${numericValue.toFixed(1)}小时`;
}

function formatAppointmentRange(dateValue: string, timeValue: string, durationHours: string) {
  const [hourText, minuteText] = timeValue.split(":");
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const startMinutes = hour * 60 + minute;
  const durationMinutes = Math.max(Math.round(Number(durationHours) * 60), 0);
  const endMinutes = startMinutes + durationMinutes;
  const endHour = Math.floor(endMinutes / 60) % 24;
  const endMinute = endMinutes % 60;
  return `${dateValue} ${timeValue}-${String(endHour).padStart(2, "0")}:${String(endMinute).padStart(2, "0")}`;
}

function generateAfterSaleNo(orderId: string) {
  const compactTimestamp = formatCurrentTime().replace(/\D/g, "").slice(0, 14);
  return `AS${compactTimestamp}${orderId.slice(-2)}`;
}

function getRequiredStaffCount(order: AdminOrderRecord) {
  const matchedValue = order.title.match(/(\d+(?:\.\d+)?)人/);
  return matchedValue ? `${matchedValue[1]}人` : "1人";
}

function getServiceRegion(address: string) {
  const district = address.split("区")[0];
  return district ? `上海市${district}区` : "上海市";
}

function applyOrderPatch(patch: Partial<AdminOrderRecord>) {
  const order = selectedOrder.value;

  if (!order) {
    return;
  }

  const nextOrder = { ...order, ...patch };
  selectedOrder.value = nextOrder;
  if (selectedOrderId.value) {
    updateOrderById(selectedOrderId.value, patch);
  }
}

async function copyText(value: string, label: string) {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
    }

    props.showToast(`已复制${label}`);
  } catch {
    props.showToast(`${label}复制为演示状态`);
  }
}

function handleFieldAction(field: DetailField) {
  const action = field.action;
  const order = detail.value?.order;

  if (!action || !order) {
    return;
  }

  if (action.kind === "copy") {
    void copyText(field.value, field.label);
    return;
  }

  openDispatchDialog();
}

function openUserProfile() {
  const order = detail.value?.order;

  if (!order) {
    return;
  }

  props.showToast(`已打开用户 ${order.buyerName} 的详情入口`);
}

function contactUser() {
  const order = detail.value?.order;

  if (!order) {
    return;
  }

  props.showToast(`已打开 ${order.contactName} 的联系入口`);
}

async function editRemark() {
  const order = detail.value?.order;

  if (!order) {
    return;
  }

  const nextRemark = typeof window !== "undefined" ? window.prompt("请输入订单备注", order.orderRemark || "") : order.orderRemark;

  if (nextRemark === null) {
    return;
  }

  try {
    await saveAdminOrderRemark(selectedOrderId.value, {
      remark: nextRemark.trim(),
    });
    applyOrderPatch({
      orderRemark: nextRemark.trim() || "暂无订单备注",
    });
    props.showToast("订单备注已保存");
  } catch (error) {
    handleAdminPageError(error, {
      navigation: props.navigation,
      showToast: props.showToast,
      fallbackMessage: "订单备注保存失败，请稍后重试",
    });
  }
}

function openPriceEditor() {
  const order = selectedOrder.value;

  if (!order) {
    return;
  }

  const currentAdjustment = Number(order.settleAmount) - basePayableAmount.value;
  priceAdjustmentInput.value = currentAdjustment === 0 ? "" : formatAmount(currentAdjustment);
  priceEditorOpen.value = true;
}

function closePriceEditor() {
  priceEditorOpen.value = false;
  priceAdjustmentInput.value = "";
}

async function confirmPriceChange() {
  const order = selectedOrder.value;

  if (!order || !canConfirmPriceChange.value) {
    return;
  }

  try {
    await updateAdminOrderPrice(selectedOrderId.value, {
      payableAmount: adjustedPayableAmount.value,
    });
    closePriceEditor();
    await syncPageData();
    props.showToast(`订单 ${order.id} 应付款已更新为 ¥${formatAmount(adjustedPayableAmount.value)}`);
  } catch (error) {
    handleAdminPageError(error, {
      navigation: props.navigation,
      showToast: props.showToast,
      fallbackMessage: "订单改价失败，请稍后重试",
    });
  }
}

function openCloseConfirm() {
  closeConfirmOpen.value = true;
}

function closeCloseConfirm() {
  closeConfirmOpen.value = false;
}

async function confirmCloseOrder() {
  const order = selectedOrder.value;

  if (!order) {
    return;
  }

  try {
    await closeAdminOrder(selectedOrderId.value, {
      reason: "后台手动关闭",
    });
    closeCloseConfirm();
    await syncPageData();
    props.showToast(`订单 ${order.id} 已关闭`);
  } catch (error) {
    handleAdminPageError(error, {
      navigation: props.navigation,
      showToast: props.showToast,
      fallbackMessage: "关闭订单失败，请稍后重试",
    });
  }
}

function openDispatchDialog() {
  const order = selectedOrder.value;

  if (!order) {
    return;
  }

  dispatchForm.appointmentDate = formatDateInputFromAppointment(order.appointmentTime);
  dispatchForm.appointmentTime = formatTimeInputFromAppointment(order.appointmentTime);
  dispatchForm.durationHours = formatDurationInput(order.duration);
  dispatchForm.selectedStaffId =
    dispatchStaffOptions.value.find((item) => item.name === order.serviceStaff && item.status === "空闲")?.id ?? "";
  dispatchForm.remark = "";
  dispatchDialogOpen.value = true;
}

function closeDispatchDialog() {
  dispatchDialogOpen.value = false;
}

function openAfterSaleDialog() {
  const order = selectedOrder.value;

  if (!order) {
    return;
  }

  afterSaleRefundInput.value = order.settleAmount;
  afterSaleReasonInput.value = "";
  afterSaleDialogOpen.value = true;
}

function closeAfterSaleDialog() {
  afterSaleDialogOpen.value = false;
  afterSaleRefundInput.value = "";
  afterSaleReasonInput.value = "";
}

function openAfterSaleHandleDialog() {
  if (!selectedOrder.value?.afterSaleNo) {
    props.showToast("当前订单暂无售后单");
    return;
  }

  afterSaleHandleDecision.value = "complete";
  afterSaleHandleRemark.value = "";
  afterSaleHandleDialogOpen.value = true;
}

function closeAfterSaleHandleDialog() {
  afterSaleHandleDialogOpen.value = false;
  afterSaleHandleDecision.value = "complete";
  afterSaleHandleRemark.value = "";
}

function selectDispatchStaff(staff: DispatchStaffOption) {
  if (staff.status !== "空闲") {
    return;
  }

  dispatchForm.selectedStaffId = staff.id;
}

async function confirmDispatch() {
  const order = selectedOrder.value;
  const selectedStaff = selectedDispatchStaff.value;

  if (!order || !selectedStaff || !canConfirmDispatch.value) {
    return;
  }

  const nextAppointmentTime = formatAppointmentRange(
    dispatchForm.appointmentDate,
    dispatchForm.appointmentTime,
    dispatchForm.durationHours,
  );

  try {
    await dispatchAdminOrder(selectedOrderId.value, {
      assigneeStaffId: hasRemoteDispatchStaff.value ? selectedStaff.id : undefined,
      scheduleAt: `${dispatchForm.appointmentDate}T${dispatchForm.appointmentTime}:00`,
      timeSlot: nextAppointmentTime.split(" ").slice(1).join(" "),
      dispatchNote: dispatchForm.remark.trim() || undefined,
    });
    closeDispatchDialog();
    await syncPageData();
    props.showToast(`已为订单 ${order.id} 指派 ${selectedStaff.name}`);
  } catch (error) {
    handleAdminPageError(error, {
      navigation: props.navigation,
      showToast: props.showToast,
      fallbackMessage: "手动派单失败，请稍后重试",
    });
  }
}

function openRefundConfirm() {
  refundConfirmOpen.value = true;
}

function closeRefundConfirm() {
  refundConfirmOpen.value = false;
}

function syncAfterSaleRecord(order: AdminOrderRecord, afterSaleNo: string, refundAmount: string, appliedAt: string, status = "处理中") {
  upsertAfterSaleRow({
    orderNo: order.id,
    afterSaleNo,
    title: order.title,
    image: order.image,
    paidAmount: order.settleAmount,
    refundAmount,
    status,
    appliedAt,
  });
}

async function confirmAfterSale() {
  const order = selectedOrder.value;

  if (!order || !canConfirmAfterSale.value) {
    return;
  }

  const afterSaleNo = order.afterSaleNo || generateAfterSaleNo(order.id);
  const refundAmount = formatAmount(afterSaleRefundAmount.value);
  const afterSaleReason = `申请退款 ¥${refundAmount}，${afterSaleReasonInput.value.trim()}`;
  const appliedAt = formatCurrentTime();

  try {
    await createAdminOrderAfterSale(selectedOrderId.value, {
      type: "REFUND",
      reason: afterSaleReason,
      description: afterSaleReasonInput.value.trim(),
      amountRequested: afterSaleRefundAmount.value,
    });
    syncAfterSaleRecord(order, afterSaleNo, refundAmount, appliedAt);
    closeAfterSaleDialog();
    await syncPageData();
    props.showToast(`订单 ${order.id} 已发起售后申请`);
  } catch (error) {
    handleAdminPageError(error, {
      navigation: props.navigation,
      showToast: props.showToast,
      fallbackMessage: "发起售后失败，请稍后重试",
    });
  }
}

async function confirmRefund() {
  const order = selectedOrder.value;

  if (!order) {
    return;
  }

  const afterSaleNo = order.afterSaleNo || generateAfterSaleNo(order.id);
  const refundAmount = formatAmount(Number(order.settleAmount));
  const appliedAt = formatCurrentTime();

  try {
    await createAdminOrderAfterSale(selectedOrderId.value, {
      type: "REFUND",
      reason: "后台发起取消订单退款",
      description: "后台发起取消订单退款，退款将退还至原支付渠道。",
      amountRequested: Number(order.settleAmount),
    });
    syncAfterSaleRecord(order, afterSaleNo, refundAmount, appliedAt);
    closeRefundConfirm();
    await syncPageData();
    props.showToast(`订单 ${order.id} 已提交退款处理`);
  } catch (error) {
    handleAdminPageError(error, {
      navigation: props.navigation,
      showToast: props.showToast,
      fallbackMessage: "提交退款失败，请稍后重试",
    });
  }
}

function confirmAfterSaleHandle() {
  const order = selectedOrder.value;

  if (!order || !canConfirmAfterSaleHandle.value) {
    return;
  }

  const afterSaleNo = order.afterSaleNo || generateAfterSaleNo(order.id);
  const isComplete = afterSaleHandleDecision.value === "complete";
  const nextAfterSaleStatus = isComplete ? "售后完成" : "售后关闭";
  const nextDetailTitle = isComplete ? "售后处理完成" : "售后申请已关闭";
  const nextDetailDescription = isComplete
    ? "售后申请已处理完成，处理结果已同步给用户，请关注退款到账进度。"
    : "售后申请已关闭，如用户仍有异议，可继续沟通后重新发起售后。";
  const nextReason = `${order.afterSaleReason || "已创建售后申请"}；处理结果：${nextAfterSaleStatus}；处理备注：${afterSaleHandleRemark.value.trim()}`;
  const appliedAt = currentAfterSaleRecord.value?.appliedAt || formatCurrentTime();

  applyOrderPatch({
    afterSaleNo,
    afterSaleStatus: nextAfterSaleStatus,
    afterSaleReason: nextReason,
    detailTitle: nextDetailTitle,
    detailDescription: nextDetailDescription,
    productActionLabel: nextAfterSaleStatus,
    footerActions: [{ label: "返回", tone: "ghost" }],
    actions: [
      { label: "订单详情", tone: "green" },
      { label: "联系用户", tone: "green" },
      { label: "备注", tone: "green" },
    ],
  });

  syncAfterSaleRecord(order, afterSaleNo, currentAfterSaleRefundAmount.value, appliedAt, nextAfterSaleStatus);
  closeAfterSaleHandleDialog();
  props.showToast(`售后单 ${afterSaleNo} 已${isComplete ? "处理完成" : "关闭"}`);
}

function triggerFooterAction(label: string) {
  const order = detail.value?.order;

  if (!order) {
    return;
  }

  if (label === "返回") {
    goBack();
    return;
  }

  if (label === "修改价格") {
    openPriceEditor();
    return;
  }

  if (label === "关闭订单") {
    openCloseConfirm();
    return;
  }

  if (label === "手动派单") {
    openDispatchDialog();
    return;
  }

  if (label === "退款") {
    openRefundConfirm();
    return;
  }

  if (label === "发起售后") {
    openAfterSaleDialog();
    return;
  }

  if (label === "处理售后") {
    if (order.afterSaleNo) {
      navigateWithStorage("dashboard/after-sale-detail", afterSaleDetailStorageKey, order.afterSaleNo);
      return;
    }

    props.showToast("当前订单暂无售后单");
    return;
  }

  props.showToast(`${label}为演示状态：${order.id}`);
}
</script>

<template>
  <section class="order-detail-page">
    <article v-if="detail" class="detail-panel">
      <header class="page-head">
        <div class="section-head">
          <span class="section-head__accent"></span>
          <h1>{{ detail.title }}</h1>
        </div>
      </header>

      <section class="status-hero" :class="`status-hero--${detail.statusTone}`">
        <div class="status-hero__main">
          <h2>{{ detail.order.detailTitle }}</h2>

          <div class="status-hero__meta">
            <article class="status-stat">
              <span>服务类型</span>
              <strong>{{ detail.order.serviceType }}</strong>
            </article>
            <article class="status-stat">
              <span>{{ detail.order.settleLabel }}</span>
              <strong class="status-stat__amount">¥{{ detail.order.settleAmount }}</strong>
            </article>
            <article class="status-stat">
              <span>预约时段</span>
              <strong>{{ detail.order.appointmentTime }}</strong>
            </article>
          </div>

          <p>{{ detail.order.detailDescription }}</p>

          <div v-if="remainingPaymentText" class="status-countdown">
            <span>剩余支付时间</span>
            <strong>{{ remainingPaymentText }}</strong>
          </div>
        </div>
      </section>

      <section class="remark-bar">
        <div class="remark-bar__title">订单备注</div>
        <p>{{ detail.order.orderRemark || "暂无订单备注" }}</p>
        <button class="text-button" type="button" @click="editRemark">编辑备注</button>
      </section>

      <section class="detail-section">
        <header class="block-head">
          <span class="block-head__accent"></span>
          <h2>订单信息</h2>
        </header>

        <div class="info-grid">
          <article class="info-card info-card--user">
            <header class="info-card__head">
              <h3>用户信息</h3>
            </header>

            <div class="user-profile">
              <img :src="detail.order.buyerAvatar" :alt="detail.order.buyerName" />

              <div class="user-profile__copy">
                <div class="user-profile__title">
                  <strong>{{ detail.order.buyerName }}</strong>
                  <div class="user-profile__actions">
                    <button class="text-button" type="button" @click="openUserProfile">查看详情</button>
                    <button class="text-button" type="button" @click="contactUser">联系用户</button>
                  </div>
                </div>
                <span>ID：{{ detail.order.buyerId }}</span>
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
              <h3>订单信息</h3>
            </header>

            <dl class="info-list">
              <div v-for="field in detail.orderFields" :key="field.label" class="info-row">
                <dt>{{ field.label }}</dt>
                <dd>
                  <span>{{ field.value }}</span>
                  <button v-if="field.action" class="inline-action" type="button" @click="handleFieldAction(field)">
                    {{ field.action.label }}
                  </button>
                </dd>
              </div>
            </dl>
          </article>

          <article class="info-card">
            <header class="info-card__head">
              <h3>预约信息</h3>
            </header>

            <dl class="info-list">
              <div v-for="field in detail.bookingFields" :key="field.label" class="info-row">
                <dt>{{ field.label }}</dt>
                <dd>
                  <span>{{ field.value }}</span>
                  <button v-if="field.action" class="inline-action" type="button" @click="handleFieldAction(field)">
                    {{ field.action.label }}
                  </button>
                </dd>
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
              <span>价格</span>
              <span>小计</span>
              <span>支付方式</span>
              <span>操作</span>
            </div>

            <div class="product-table__row">
              <div class="product-cell product-cell--product">
                <img :src="detail.order.image" :alt="detail.order.title" />
                <div>
                  <strong>{{ detail.order.title }}</strong>
                  <p>{{ detail.order.serviceSummary }}</p>
                </div>
              </div>
              <div class="product-cell">¥{{ detail.order.originalPrice }}</div>
              <div class="product-cell">¥{{ detail.order.originalPrice }}</div>
              <div class="product-cell">{{ detail.order.payment }}</div>
              <div class="product-cell">
                <span
                  class="product-action"
                  :class="{ 'product-action--muted': detail.order.productActionLabel === '-' }"
                >
                  {{ detail.order.productActionLabel }}
                </span>
              </div>
            </div>
          </div>

          <aside class="summary-card">
            <div v-for="row in detail.summaryRows" :key="row.label" class="summary-row" :class="{ 'summary-row--highlight': row.highlight }">
              <span>{{ row.label }}</span>
              <strong>{{ row.value }}</strong>
            </div>
          </aside>
        </div>
      </section>

      <footer class="page-actions">
        <button
          v-for="action in detail.footerActions"
          :key="action.label"
          class="action-button"
          :class="`action-button--${action.tone}`"
          type="button"
          @click="triggerFooterAction(action.label)"
        >
          {{ action.label }}
        </button>
      </footer>
    </article>

    <article v-else class="empty-panel">
      <h2>未找到订单</h2>
      <p>当前没有可展示的订单详情，请返回订单列表重新进入。</p>
      <button class="action-button action-button--ghost" type="button" @click="goBack">返回列表</button>
    </article>

    <section v-if="dispatchDialogOpen && detail" class="dialog-mask" @click.self="closeDispatchDialog">
      <article class="dialog-panel dialog-panel--dispatch">
        <header class="dialog-panel__header">
          <h3>手动派单</h3>
          <button class="dialog-panel__close" type="button" aria-label="关闭手动派单弹窗" @click="closeDispatchDialog">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </header>

        <div class="dispatch-content">
          <section class="dispatch-section">
            <h4>订单信息</h4>
            <div class="dispatch-order-grid">
              <div><span>服务项目</span><strong>{{ detail.order.title }}</strong></div>
              <div><span>实付款</span><strong>{{ detail.order.settleAmount }}元</strong></div>
              <div><span>服务人数</span><strong>{{ getRequiredStaffCount(detail.order) }}</strong></div>
              <div><span>客户</span><strong>{{ detail.order.contactName }} {{ detail.order.contactPhone }}</strong></div>
              <div><span>服务区域</span><strong>{{ getServiceRegion(detail.order.serviceAddress) }}</strong></div>
              <div><span>上门地址</span><strong>{{ detail.order.serviceAddress }}</strong></div>
            </div>
          </section>

          <section class="dispatch-section">
            <h4>预约信息</h4>
            <div class="dispatch-form-grid">
              <label class="dispatch-field">
                <span>预约上门时间<i>*</i></span>
                <input v-model="dispatchForm.appointmentDate" type="date" />
              </label>
              <label class="dispatch-field">
                <span>预约时段<i>*</i></span>
                <input v-model="dispatchForm.appointmentTime" type="time" />
              </label>
              <label class="dispatch-field dispatch-field--duration">
                <span>预计服务时长<i>*</i></span>
                <div class="dispatch-field__unit">
                  <input v-model="dispatchForm.durationHours" type="number" min="0.5" step="0.5" />
                  <em>h</em>
                </div>
              </label>
            </div>
          </section>

          <section class="dispatch-section">
            <div class="dispatch-section__head">
              <h4>服务人员</h4>
              <span>已选择{{ selectedDispatchStaff ? 1 : 0 }}人，可派单{{ availableDispatchStaffCount }}位空闲人员</span>
            </div>

            <div class="dispatch-staff-grid">
              <button
                v-for="staff in dispatchStaffOptions"
                :key="staff.id"
                class="dispatch-staff-card"
                :class="{
                  'dispatch-staff-card--active': dispatchForm.selectedStaffId === staff.id,
                  'dispatch-staff-card--busy': staff.status === '忙碌',
                }"
                type="button"
                @click="selectDispatchStaff(staff)"
              >
                <div class="dispatch-staff-card__top">
                  <img :src="staff.avatar" :alt="staff.name" />
                  <div>
                    <strong>{{ staff.name }}</strong>
                    <span>{{ staff.employeeNo }}</span>
                  </div>
                  <em :class="`dispatch-staff-card__status dispatch-staff-card__status--${staff.status === '空闲' ? 'idle' : 'busy'}`">
                    {{ staff.status }}
                  </em>
                </div>
                <p>区域：{{ staff.region }}</p>
                <p>电话：{{ staff.phone }}</p>
              </button>
            </div>
          </section>

          <section class="dispatch-section">
            <h4>工单备注</h4>
            <textarea v-model="dispatchForm.remark" class="dispatch-remark" placeholder="请输入派单备注"></textarea>
          </section>
        </div>

        <footer class="dialog-panel__footer">
          <button class="action-button action-button--ghost" type="button" @click="closeDispatchDialog">取消</button>
          <button class="action-button action-button--primary" type="button" :disabled="!canConfirmDispatch" @click="confirmDispatch">
            确定
          </button>
        </footer>
      </article>
    </section>

    <section v-if="priceEditorOpen && detail" class="dialog-mask" @click.self="closePriceEditor">
      <article class="dialog-panel dialog-panel--price-editor">
        <header class="dialog-panel__header">
          <h3>修改价格</h3>
          <button class="dialog-panel__close" type="button" aria-label="关闭修改价格弹窗" @click="closePriceEditor">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </header>

        <div class="price-editor-table">
          <div class="price-editor-table__head">
            <span>商品信息</span>
            <span>价格</span>
            <span>优惠</span>
            <span>调整价格金额<br /><em>（优惠为-）</em></span>
            <span>应付款</span>
          </div>

          <div class="price-editor-table__row">
            <div class="price-editor-product">
              <img :src="detail.order.image" :alt="detail.order.title" />
              <strong>{{ detail.order.title }}</strong>
            </div>
            <div class="price-editor-cell">¥{{ detail.order.originalPrice }}</div>
            <div class="price-editor-cell">¥{{ detail.order.discountAmount }}</div>
            <div class="price-editor-cell">
              <div class="price-editor-input" :class="{ 'price-editor-input--error': !!priceAdjustmentError }">
                <input v-model="priceAdjustmentInput" type="text" placeholder="0.00" />
              </div>
            </div>
            <div class="price-editor-cell">¥{{ formatAmount(adjustedPayableAmount) }}</div>
          </div>
        </div>

        <p v-if="priceAdjustmentError" class="dialog-error">{{ priceAdjustmentError }}</p>

        <footer class="dialog-panel__footer">
          <button class="action-button action-button--ghost" type="button" @click="closePriceEditor">取消</button>
          <button class="action-button action-button--primary" type="button" :disabled="!canConfirmPriceChange" @click="confirmPriceChange">
            确定
          </button>
        </footer>
      </article>
    </section>

    <section v-if="closeConfirmOpen && detail" class="dialog-mask" @click.self="closeCloseConfirm">
      <article class="dialog-panel dialog-panel--compact">
        <header class="dialog-panel__header dialog-panel__header--compact">
          <h3>关闭订单</h3>
          <button class="dialog-panel__close" type="button" aria-label="关闭关闭订单确认弹窗" @click="closeCloseConfirm">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </header>

        <p class="dialog-summary">确定关闭订单 {{ detail.order.id }} 吗？关闭后当前订单将不可继续支付。</p>

        <footer class="dialog-panel__footer">
          <button class="action-button action-button--ghost" type="button" @click="closeCloseConfirm">取消</button>
          <button class="action-button action-button--danger" type="button" @click="confirmCloseOrder">确定关闭</button>
        </footer>
      </article>
    </section>

    <section v-if="afterSaleDialogOpen && detail" class="dialog-mask" @click.self="closeAfterSaleDialog">
      <article class="dialog-panel dialog-panel--after-sale">
        <header class="dialog-panel__header">
          <h3>发起售后</h3>
          <button class="dialog-panel__close" type="button" aria-label="关闭发起售后弹窗" @click="closeAfterSaleDialog">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </header>

        <div class="after-sale-content">
          <div class="after-sale-summary">
            <div>
              <span>订单编号</span>
              <strong>{{ detail.order.id }}</strong>
            </div>
            <div>
              <span>实付款</span>
              <strong>¥{{ detail.order.settleAmount }}</strong>
            </div>
            <div>
              <span>服务完成时间</span>
              <strong>{{ detail.order.completedTime || detail.order.appointmentTime }}</strong>
            </div>
            <div class="after-sale-summary__full">
              <span>服务项目</span>
              <strong>{{ detail.order.title }}</strong>
            </div>
          </div>

          <label class="after-sale-field">
            <span>申请退款金额</span>
            <div class="after-sale-input" :class="{ 'after-sale-input--error': !!afterSaleRefundError }">
              <em>¥</em>
              <input v-model="afterSaleRefundInput" type="text" placeholder="请输入申请退款金额" />
            </div>
          </label>

          <label class="after-sale-field">
            <span>售后说明</span>
            <textarea
              v-model="afterSaleReasonInput"
              class="after-sale-textarea"
              :class="{ 'after-sale-textarea--error': !!afterSaleReasonError }"
              placeholder="请输入售后原因及处理诉求"
            ></textarea>
          </label>

          <p class="dialog-summary dialog-summary--inner">提交后订单将进入售后处理中状态，请及时跟进审核与处理结果。</p>
          <p v-if="afterSaleRefundError || afterSaleReasonError" class="dialog-error dialog-error--inner">
            {{ afterSaleRefundError || afterSaleReasonError }}
          </p>
        </div>

        <footer class="dialog-panel__footer">
          <button class="action-button action-button--ghost" type="button" @click="closeAfterSaleDialog">取消</button>
          <button class="action-button action-button--danger" type="button" :disabled="!canConfirmAfterSale" @click="confirmAfterSale">
            确定发起
          </button>
        </footer>
      </article>
    </section>

    <section v-if="afterSaleHandleDialogOpen && detail" class="dialog-mask" @click.self="closeAfterSaleHandleDialog">
      <article class="dialog-panel dialog-panel--after-sale">
        <header class="dialog-panel__header">
          <h3>处理售后</h3>
          <button class="dialog-panel__close" type="button" aria-label="关闭处理售后弹窗" @click="closeAfterSaleHandleDialog">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </header>

        <div class="after-sale-content">
          <div class="after-sale-summary">
            <div>
              <span>订单编号</span>
              <strong>{{ detail.order.id }}</strong>
            </div>
            <div>
              <span>售后单号</span>
              <strong>{{ detail.order.afterSaleNo }}</strong>
            </div>
            <div>
              <span>当前售后状态</span>
              <strong>{{ detail.order.afterSaleStatus || "处理中" }}</strong>
            </div>
            <div>
              <span>申请退款金额</span>
              <strong>¥{{ currentAfterSaleRefundAmount }}</strong>
            </div>
            <div class="after-sale-summary__full">
              <span>售后说明</span>
              <strong>{{ detail.order.afterSaleReason || "暂无售后说明" }}</strong>
            </div>
          </div>

          <section class="after-sale-process">
            <span class="after-sale-process__label">处理结果</span>
            <div class="after-sale-decision">
              <button
                class="after-sale-decision__item"
                :class="{ 'after-sale-decision__item--active': afterSaleHandleDecision === 'complete' }"
                type="button"
                @click="afterSaleHandleDecision = 'complete'"
              >
                <strong>售后完成</strong>
                <span>确认当前售后已处理完成</span>
              </button>
              <button
                class="after-sale-decision__item"
                :class="{ 'after-sale-decision__item--active': afterSaleHandleDecision === 'close' }"
                type="button"
                @click="afterSaleHandleDecision = 'close'"
              >
                <strong>关闭售后</strong>
                <span>关闭当前售后单，不再继续处理</span>
              </button>
            </div>
          </section>

          <label class="after-sale-field">
            <span>处理备注</span>
            <textarea
              v-model="afterSaleHandleRemark"
              class="after-sale-textarea"
              :class="{ 'after-sale-textarea--error': !!afterSaleHandleRemarkError }"
              placeholder="请输入售后处理结论或关闭原因"
            ></textarea>
          </label>

          <p class="dialog-summary dialog-summary--inner">
            {{
              afterSaleHandleDecision === "complete"
                ? "确认后将结束当前售后流程，并同步售后完成状态。"
                : "确认后将关闭当前售后单，如后续仍需处理可重新发起售后。"
            }}
          </p>
          <p v-if="afterSaleHandleRemarkError" class="dialog-error dialog-error--inner">{{ afterSaleHandleRemarkError }}</p>
        </div>

        <footer class="dialog-panel__footer">
          <button class="action-button action-button--ghost" type="button" @click="closeAfterSaleHandleDialog">取消</button>
          <button class="action-button action-button--danger" type="button" :disabled="!canConfirmAfterSaleHandle" @click="confirmAfterSaleHandle">
            确认处理
          </button>
        </footer>
      </article>
    </section>

    <section v-if="refundConfirmOpen && detail" class="dialog-mask" @click.self="closeRefundConfirm">
      <article class="dialog-panel dialog-panel--compact">
        <header class="dialog-panel__header dialog-panel__header--compact">
          <h3>退款确认</h3>
          <button class="dialog-panel__close" type="button" aria-label="关闭退款确认弹窗" @click="closeRefundConfirm">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </header>

        <p class="dialog-summary">退款将退还至原支付渠道,确定取消该订单吗？</p>

        <footer class="dialog-panel__footer">
          <button class="action-button action-button--ghost" type="button" @click="closeRefundConfirm">取消</button>
          <button class="action-button action-button--danger" type="button" @click="confirmRefund">确定退款</button>
        </footer>
      </article>
    </section>
  </section>
</template>

<style scoped>
.order-detail-page {
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
.block-head {
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
  background: linear-gradient(135deg, #f8fffc 0%, #fbfefd 100%);
}

.status-hero--amber {
  background: linear-gradient(135deg, #fffaf0 0%, #ffffff 100%);
}

.status-hero--blue {
  background: linear-gradient(135deg, #f5fbff 0%, #ffffff 100%);
}

.status-hero--mint {
  background: linear-gradient(135deg, #f4fffb 0%, #ffffff 100%);
}

.status-hero--green {
  background: linear-gradient(135deg, #f6fff8 0%, #ffffff 100%);
}

.status-hero--gray {
  background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%);
}

.status-hero--rose {
  background: linear-gradient(135deg, #fff6f5 0%, #ffffff 100%);
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
.remark-bar__title,
.info-row dt,
.summary-row span {
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

.remark-bar {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 16px;
  padding: 16px 18px;
  border: 1px solid #edf2ef;
  border-radius: 14px;
  background: #fbfcfc;
}

.remark-bar p {
  margin: 0;
  color: #46515d;
  font-size: 14px;
  line-height: 1.7;
}

.text-button,
.inline-action {
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

.user-profile__actions {
  display: inline-flex;
  align-items: center;
  gap: 14px;
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
  display: flex;
  align-items: flex-start;
  gap: 10px;
  color: #34404d;
  font-size: 14px;
  line-height: 1.65;
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
  grid-template-columns: 2.15fr 0.78fr 0.78fr 0.84fr 0.84fr;
  min-width: 880px;
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

.product-action {
  color: #39cf9d;
  font-weight: 500;
}

.product-action--muted {
  color: #a0aab5;
}

.summary-card {
  display: grid;
  justify-self: end;
  gap: 12px;
  min-width: 220px;
}

.summary-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 20px;
}

.summary-row strong {
  color: #4a5562;
  font-size: 14px;
  font-weight: 500;
}

.summary-row--highlight strong {
  color: #ff6f61;
  font-size: 20px;
  font-weight: 700;
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
  width: min(920px, 100%);
  border-radius: 18px;
  background: #ffffff;
  box-shadow: 0 28px 60px rgba(20, 34, 26, 0.18);
}

.dialog-panel--compact {
  width: min(460px, 100%);
}

.dialog-panel--dispatch {
  width: min(1120px, 100%);
  max-height: min(88vh, 920px);
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
}

.dialog-panel--after-sale {
  width: min(640px, 100%);
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

.dialog-panel__header--compact {
  padding-bottom: 12px;
  border-bottom: 0;
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

.dispatch-content {
  overflow-y: auto;
  display: grid;
  gap: 28px;
  padding: 22px 24px 0;
}

.after-sale-content {
  display: grid;
  gap: 18px;
  padding: 22px 24px 0;
}

.dispatch-section {
  display: grid;
  gap: 16px;
}

.after-sale-summary {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px 18px;
  padding: 18px;
  border: 1px solid #edf2ef;
  border-radius: 14px;
  background: #fbfcfc;
}

.after-sale-summary div,
.after-sale-field {
  display: grid;
  gap: 8px;
}

.after-sale-summary__full {
  grid-column: 1 / -1;
}

.after-sale-summary span,
.after-sale-field span {
  color: #97a3af;
  font-size: 13px;
}

.after-sale-summary strong {
  color: #2f3946;
  font-size: 14px;
  font-weight: 500;
  line-height: 1.6;
}

.after-sale-process {
  display: grid;
  gap: 10px;
}

.after-sale-process__label {
  color: #97a3af;
  font-size: 13px;
}

.after-sale-decision {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.after-sale-decision__item {
  display: grid;
  gap: 6px;
  align-content: start;
  padding: 16px;
  border: 1px solid #dfe7e3;
  border-radius: 12px;
  background: #ffffff;
  text-align: left;
  color: #44505d;
}

.after-sale-decision__item--active {
  border-color: #39cf9d;
  background: rgba(57, 207, 157, 0.08);
  box-shadow: 0 10px 20px rgba(57, 207, 157, 0.08);
}

.after-sale-decision__item strong {
  color: #2f3946;
  font-size: 14px;
  font-weight: 600;
}

.after-sale-decision__item span {
  color: #7f8b97;
  font-size: 12px;
  line-height: 1.7;
}

.after-sale-input {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  height: 48px;
  padding: 0 14px;
  border: 1px solid #dfe7e3;
  border-radius: 10px;
  background: #ffffff;
}

.after-sale-input--error,
.after-sale-textarea--error {
  border-color: #ff847c;
}

.after-sale-input em {
  color: #97a3af;
  font-style: normal;
  font-size: 14px;
}

.after-sale-input input {
  width: 100%;
  border: 0;
  background: transparent;
  color: #2f3946;
  font-size: 14px;
  outline: none;
}

.after-sale-textarea {
  min-height: 120px;
  padding: 14px 16px;
  border: 1px solid #dfe7e3;
  border-radius: 12px;
  background: #ffffff;
  color: #2f3946;
  font-size: 14px;
  line-height: 1.7;
  resize: vertical;
  outline: none;
}

.dispatch-section h4 {
  margin: 0;
  color: #2f3946;
  font-size: 15px;
  font-weight: 600;
}

.dispatch-section__head {
  display: flex;
  align-items: baseline;
  gap: 14px;
}

.dispatch-section__head span {
  color: #97a3af;
  font-size: 13px;
}

.dispatch-order-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px 28px;
}

.dispatch-order-grid div,
.dispatch-field {
  display: grid;
  gap: 8px;
}

.dispatch-order-grid span,
.dispatch-field span {
  color: #97a3af;
  font-size: 13px;
}

.dispatch-order-grid strong {
  color: #2f3946;
  font-size: 14px;
  font-weight: 500;
  line-height: 1.6;
}

.dispatch-form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px 16px;
}

.dispatch-field input {
  height: 48px;
  padding: 0 14px;
  border: 1px solid #dfe7e3;
  border-radius: 10px;
  background: #ffffff;
  color: #2f3946;
  font-size: 14px;
  outline: none;
}

.dispatch-field span i {
  color: #ff847c;
  font-style: normal;
}

.dispatch-field--duration {
  max-width: 360px;
}

.dispatch-field__unit {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 60px;
}

.dispatch-field__unit input {
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
}

.dispatch-field__unit em {
  display: grid;
  place-items: center;
  border: 1px solid #dfe7e3;
  border-left: 0;
  border-radius: 0 10px 10px 0;
  background: #f7f8fa;
  color: #97a3af;
  font-style: normal;
  font-size: 14px;
}

.dispatch-staff-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 18px;
}

.dispatch-staff-card {
  display: grid;
  gap: 12px;
  align-content: start;
  padding: 18px;
  border: 1px solid #e8ecea;
  border-radius: 22px;
  background: #ffffff;
  text-align: left;
  color: #2f3946;
}

.dispatch-staff-card--active {
  border-color: #39cf9d;
  box-shadow: 0 12px 24px rgba(57, 207, 157, 0.12);
}

.dispatch-staff-card--busy {
  background: #f5f5f5;
  color: #a0a8b1;
}

.dispatch-staff-card__top {
  display: grid;
  grid-template-columns: 52px minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
}

.dispatch-staff-card__top img {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  object-fit: cover;
}

.dispatch-staff-card__top strong {
  display: block;
  font-size: 14px;
  font-weight: 600;
}

.dispatch-staff-card__top span {
  display: block;
  margin-top: 6px;
  color: inherit;
  opacity: 0.72;
  font-size: 12px;
}

.dispatch-staff-card__status {
  font-style: normal;
  font-size: 12px;
  font-weight: 600;
}

.dispatch-staff-card__status--idle {
  color: #39cf9d;
}

.dispatch-staff-card__status--busy {
  color: #a5adb7;
}

.dispatch-staff-card p {
  margin: 0;
  color: inherit;
  opacity: 0.8;
  font-size: 12px;
  line-height: 1.7;
}

.dispatch-remark {
  min-height: 116px;
  padding: 14px 16px;
  border: 1px solid #dfe7e3;
  border-radius: 12px;
  background: #ffffff;
  color: #2f3946;
  font-size: 14px;
  line-height: 1.7;
  resize: vertical;
  outline: none;
}

.price-editor-table {
  display: grid;
  margin: 22px 24px 0;
  border: 1px solid #edf2ef;
}

.price-editor-table__head,
.price-editor-table__row {
  display: grid;
  grid-template-columns: 2.1fr 0.8fr 0.8fr 1fr 0.8fr;
}

.price-editor-table__head {
  background: #fafafa;
  color: #2f3946;
  font-size: 13px;
  font-weight: 600;
}

.price-editor-table__head span,
.price-editor-table__row > div {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
  padding: 18px 16px;
  border-right: 1px solid #edf2ef;
}

.price-editor-table__head span:last-child,
.price-editor-table__row > div:last-child {
  border-right: 0;
}

.price-editor-table__head em {
  color: #ff847c;
  font-style: normal;
  font-size: 12px;
  font-weight: 500;
}

.price-editor-table__row {
  border-top: 1px solid #edf2ef;
}

.price-editor-product {
  display: grid !important;
  grid-template-columns: 102px minmax(0, 1fr);
  gap: 14px;
  align-items: center;
  justify-content: start !important;
}

.price-editor-product img {
  width: 102px;
  height: 76px;
  border-radius: 12px;
  object-fit: cover;
}

.price-editor-product strong {
  color: #2f3946;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.6;
}

.price-editor-cell {
  color: #34404d;
  font-size: 14px;
  font-weight: 500;
}

.price-editor-input {
  width: 124px;
  height: 48px;
  padding: 0 14px;
  border: 1px solid #dfe7e3;
  border-radius: 8px;
  background: #ffffff;
}

.price-editor-input--error {
  border-color: #ff847c;
}

.price-editor-input input {
  width: 100%;
  height: 100%;
  border: 0;
  background: transparent;
  color: #2f3946;
  font-size: 14px;
  outline: none;
  text-align: center;
}

.dialog-error,
.dialog-summary {
  margin: 16px 24px 0;
  color: #6e7a87;
  font-size: 13px;
  line-height: 1.7;
}

.dialog-error {
  color: #ff6f61;
}

.dialog-summary--inner,
.dialog-error--inner {
  margin: 0;
}

@media (max-width: 1380px) {
  .info-grid {
    grid-template-columns: 1fr;
  }

  .dispatch-order-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .dispatch-staff-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
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

  .remark-bar {
    grid-template-columns: 1fr;
    justify-items: start;
  }

  .user-profile {
    grid-template-columns: 1fr;
  }

  .user-profile__title {
    flex-direction: column;
    align-items: flex-start;
  }

  .page-actions {
    flex-direction: column;
  }

  .action-button {
    width: 100%;
  }

  .dialog-mask {
    padding: 16px;
  }

  .dialog-panel__header,
  .dialog-panel__footer {
    padding-right: 16px;
    padding-left: 16px;
  }

  .dispatch-content {
    padding-right: 16px;
    padding-left: 16px;
  }

  .after-sale-content {
    padding-right: 16px;
    padding-left: 16px;
  }

  .dispatch-section__head,
  .dispatch-form-grid,
  .dispatch-order-grid,
  .dispatch-staff-grid {
    grid-template-columns: 1fr;
    flex-direction: column;
    align-items: flex-start;
  }

  .price-editor-table {
    margin-right: 16px;
    margin-left: 16px;
    overflow-x: auto;
  }

  .after-sale-summary {
    grid-template-columns: 1fr;
  }

  .after-sale-decision {
    grid-template-columns: 1fr;
  }

  .price-editor-table__head,
  .price-editor-table__row {
    min-width: 720px;
  }

  .dialog-error,
  .dialog-summary {
    margin-right: 16px;
    margin-left: 16px;
  }
}
</style>
