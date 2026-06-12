import afterSaleMock, { getAfterSaleRowByNo, type AfterSaleRow } from "../after-sale/mock";
import { getOrderById, type AdminOrderRecord } from "../order-list/mock";

export const afterSaleDetailStorageKey = "admin:dashboard:selected-after-sale-no";

export type AfterSaleDetailStatusTone = "rose" | "green" | "gray";

export interface AfterSaleDetailField {
  label: string;
  value: string;
}

export interface AfterSaleDetailViewModel {
  title: string;
  status: string;
  statusTone: AfterSaleDetailStatusTone;
  statusTitle: string;
  statusDescription: string;
  deadlineAt: string;
  afterSaleNo: string;
  orderNo: string;
  buyerName: string;
  buyerId: string;
  buyerPhone: string;
  buyerAvatar: string;
  contactName: string;
  applicationReason: string;
  handleRemark: string;
  paidAmount: string;
  refundAmount: string;
  userFields: AfterSaleDetailField[];
  refundFields: AfterSaleDetailField[];
  orderFields: AfterSaleDetailField[];
  productTitle: string;
  productImage: string;
  productSummary: string;
  serviceWindow: string;
  serviceStaff: string;
}

const defaultBuyerAvatar = "/api/v1/assets/demo/avatars/avatar-1.jpg";

const mock = {
  title: "售后详情",
};

const statusToneMap: Record<string, AfterSaleDetailStatusTone> = {
  处理中: "rose",
  售后完成: "green",
  售后关闭: "gray",
};

function resolveDateTimestamp(dateValue: string) {
  const timestamp = new Date(dateValue.replace(/-/g, "/")).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function buildDeadlineAt(row: AfterSaleRow) {
  if (row.status !== "处理中") {
    return "";
  }

  const appliedAt = resolveDateTimestamp(row.appliedAt);

  if (!appliedAt) {
    return "";
  }

  return new Date(appliedAt + 24 * 60 * 60 * 1000).toISOString();
}

function buildStatusCopy(status: string) {
  if (status === "售后完成") {
    return {
      title: "本次售后已处理完成",
      description: "退款结果已同步给用户，资金将按照原支付渠道退回，请持续关注到账进度。",
    };
  }

  if (status === "售后关闭") {
    return {
      title: "本次售后已关闭",
      description: "本次退款申请已关闭，如用户仍有异议，可继续沟通后再次发起售后申请。",
    };
  }

  return {
    title: "买家已申请退款，等待卖家处理中",
    description: "用户提交的退款申请已进入处理流程，请在处理时效内完成审核并同步售后结果。",
  };
}

function splitAfterSaleReason(reason: string) {
  if (!reason.trim()) {
    return {
      applicationReason: "用户申请退款，等待平台处理。",
      handleRemark: "",
    };
  }

  const [applicationReason, resultText] = reason.split("；处理结果：");

  if (!resultText) {
    return {
      applicationReason,
      handleRemark: "",
    };
  }

  const remarkMatch = resultText.match(/处理备注：(.+)$/);

  return {
    applicationReason,
    handleRemark: remarkMatch ? remarkMatch[1] : resultText,
  };
}

function buildUserFields(order: AdminOrderRecord | null) {
  return [
    { label: "手机号", value: order?.buyerPhone || "--" },
    { label: "联系人", value: order?.contactName || "--" },
    { label: "联系号码", value: order?.contactPhone || "--" },
    { label: "服务地址", value: order?.serviceAddress || "--" },
    { label: "用户备注", value: order?.userRemark || "暂无备注" },
  ];
}

function buildRefundFields(row: AfterSaleRow, order: AdminOrderRecord | null, applicationReason: string, handleRemark: string) {
  const fields: AfterSaleDetailField[] = [
    { label: "售后编号", value: row.afterSaleNo },
    { label: "售后结果", value: row.status },
    { label: "处理节点", value: order?.afterSaleStatus || (row.status === "处理中" ? "待客服审核" : row.status) },
    { label: "申请时间", value: row.appliedAt },
    { label: "退款金额", value: `¥${row.refundAmount}` },
    { label: "实付金额", value: `¥${row.paidAmount}` },
    { label: "申请说明", value: applicationReason },
  ];

  if (handleRemark) {
    fields.push({ label: "处理说明", value: handleRemark });
  }

  return fields;
}

function buildOrderFields(row: AfterSaleRow, order: AdminOrderRecord | null) {
  return [
    { label: "订单编号", value: row.orderNo },
    { label: "下单时间", value: order?.orderTime || "--" },
    { label: "支付方式", value: order?.payment || "--" },
    { label: "预约时间", value: order?.appointmentTime || "--" },
    { label: "服务时长", value: order?.duration || "--" },
    { label: "服务人员", value: order?.serviceStaff || "待分配" },
    { label: "订单备注", value: order?.orderRemark || "暂无订单备注" },
  ];
}

export function readSelectedAfterSaleNo() {
  if (typeof window === "undefined") {
    return afterSaleMock.rows[0]?.afterSaleNo ?? "";
  }

  return window.sessionStorage.getItem(afterSaleDetailStorageKey) || afterSaleMock.rows[0]?.afterSaleNo || "";
}

export function getActiveAfterSaleRow() {
  return getAfterSaleRowByNo(readSelectedAfterSaleNo()) ?? afterSaleMock.rows[0] ?? null;
}

export function getLinkedOrder(row: AfterSaleRow | null) {
  return row ? getOrderById(row.orderId || row.orderNo) ?? null : null;
}

export function buildAfterSaleDetail(row: AfterSaleRow, order: AdminOrderRecord | null): AfterSaleDetailViewModel {
  const { title, description } = buildStatusCopy(row.status);
  const { applicationReason, handleRemark } = splitAfterSaleReason(order?.afterSaleReason || "");

  return {
    title: mock.title,
    status: row.status,
    statusTone: statusToneMap[row.status] || "rose",
    statusTitle: title,
    statusDescription: description,
    deadlineAt: buildDeadlineAt(row),
    afterSaleNo: row.afterSaleNo,
    orderNo: row.orderNo,
    buyerName: order?.buyerName || "平台用户",
    buyerId: order?.buyerId || `U${row.orderNo}`,
    buyerPhone: order?.buyerPhone || "--",
    buyerAvatar: order?.buyerAvatar || defaultBuyerAvatar,
    contactName: order?.contactName || "待确认",
    applicationReason,
    handleRemark,
    paidAmount: row.paidAmount,
    refundAmount: row.refundAmount,
    userFields: buildUserFields(order),
    refundFields: buildRefundFields(row, order, applicationReason, handleRemark),
    orderFields: buildOrderFields(row, order),
    productTitle: order?.title || row.title,
    productImage: order?.image || row.image,
    productSummary: order?.serviceSummary || "当前售后商品信息已从订单同步展示，可在此查看对应服务内容。",
    serviceWindow: order?.appointmentTime || "待确认",
    serviceStaff: order?.serviceStaff || "待分配",
  };
}

export default mock;
