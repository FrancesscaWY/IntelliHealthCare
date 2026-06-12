import orderListMock, {
  getOrderById,
  orderDetailStorageKey,
  type AdminOrderRecord,
  type OrderFooterAction,
  type OrderStatus,
} from "../order-list/mock";

export type DetailActionKind = "copy" | "edit";
export type DetailStatusTone = "amber" | "blue" | "mint" | "green" | "gray" | "rose";

export interface DetailFieldAction {
  label: string;
  kind: DetailActionKind;
}

export interface DetailField {
  label: string;
  value: string;
  action?: DetailFieldAction;
}

export interface DetailSummaryRow {
  label: string;
  value: string;
  highlight?: boolean;
}

export interface OrderDetailViewModel {
  title: string;
  order: AdminOrderRecord;
  statusTone: DetailStatusTone;
  userFields: DetailField[];
  orderFields: DetailField[];
  bookingFields: DetailField[];
  summaryRows: DetailSummaryRow[];
  footerActions: OrderFooterAction[];
}

const statusToneMap: Record<OrderStatus, DetailStatusTone> = {
  待付款: "amber",
  待接单: "blue",
  待服务: "mint",
  已完成: "green",
  已关闭: "gray",
  退款售后: "rose",
};

const mock = {
  title: "订单详情",
};

function makeField(label: string, value: string, action?: DetailFieldAction): DetailField {
  return { label, value, action };
}

function buildUserFields(order: AdminOrderRecord) {
  return [
    makeField("手机号", order.buyerPhone),
    makeField("注册时间", order.registerTime),
    makeField("注册方式", order.registerMethod),
    makeField("最近登录时间", order.lastLoginTime),
    makeField("最近购买时间", order.lastPurchaseTime),
    makeField("用户备注", order.userRemark || "暂无"),
  ];
}

function buildOrderFields(order: AdminOrderRecord) {
  const fields: DetailField[] = [
    makeField("订单编号", order.id, { label: "复制", kind: "copy" }),
    makeField("下单时间", order.orderTime),
    makeField("订单状态", order.status),
  ];

  if (order.paymentTime) {
    fields.push(makeField("付款时间", order.paymentTime));
  }

  if (order.acceptedTime) {
    fields.push(makeField("接单时间", order.acceptedTime));
  }

  if (order.completedTime) {
    fields.push(makeField("完成时间", order.completedTime));
  }

  if (order.closedTime) {
    fields.push(makeField("关闭时间", order.closedTime));
  }

  if (order.verifier) {
    fields.push(makeField("核销人员", order.verifier));
  }

  fields.push(makeField("支付方式", order.payment === "-" ? "未支付" : order.payment));
  fields.push(makeField("订单来源", order.orderSource));

  return fields;
}

function buildBookingFields(order: AdminOrderRecord) {
  const canEditAppointment = ["待付款", "待接单", "待服务"].includes(order.status);
  const fields: DetailField[] = [
    makeField("上门地址", order.serviceAddress),
    makeField("预约时间", order.appointmentTime, canEditAppointment ? { label: "修改", kind: "edit" } : undefined),
    makeField("服务时长", order.duration),
    makeField("联系人", order.contactName),
    makeField("联系方式", order.contactPhone),
  ];

  if (order.serviceCode) {
    fields.push(makeField("服务券码", order.serviceCode));
  }

  if (order.serviceStaff) {
    fields.push(makeField("服务人员", order.serviceStaff));
  }

  if (order.closeReason) {
    fields.push(makeField("关闭原因", order.closeReason));
  }

  if (order.afterSaleNo) {
    fields.push(makeField("售后单号", order.afterSaleNo));
  }

  if (order.afterSaleStatus) {
    fields.push(makeField("售后状态", order.afterSaleStatus));
  }

  if (order.afterSaleReason) {
    fields.push(makeField("售后说明", order.afterSaleReason));
  }

  return fields;
}

function buildSummaryRows(order: AdminOrderRecord) {
  return [
    { label: "商品总价", value: `¥${order.originalPrice}` },
    { label: "优惠", value: `-¥${order.discountAmount}` },
    { label: order.settleLabel, value: `¥${order.settleAmount}`, highlight: true },
  ];
}

export function readSelectedOrderId() {
  if (typeof window === "undefined") {
    return orderListMock.orders[0]?.id ?? "";
  }

  return window.sessionStorage.getItem(orderDetailStorageKey) || orderListMock.orders[0]?.id || "";
}

export function getActiveOrder() {
  return getOrderById(readSelectedOrderId()) ?? orderListMock.orders[0];
}

export function buildOrderDetail(order: AdminOrderRecord): OrderDetailViewModel {
  return {
    title: mock.title,
    order,
    statusTone: statusToneMap[order.status],
    userFields: buildUserFields(order),
    orderFields: buildOrderFields(order),
    bookingFields: buildBookingFields(order),
    summaryRows: buildSummaryRows(order),
    footerActions: order.footerActions,
  };
}

export default mock;
