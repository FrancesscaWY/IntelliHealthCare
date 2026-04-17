import orderImage from "@/assets/service/home-care-orders/cleaning-order.jpg";

export type HomeCareOrderStatus =
  | "pending_payment"
  | "awaiting_accept"
  | "awaiting_service"
  | "completed";

export type HomeCareOrder = {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  status: HomeCareOrderStatus;
  price: number;
  quantity: number;
  address: string;
  contactName: string;
  contactPhone: string;
  bookingDate: string;
  bookingWeekday: string;
  bookingTimeSlot: string;
  createdAt: string;
  paidAt?: string;
  paymentDeadline?: string;
  couponAmount: number;
  actualAmount: number;
  orderNo: string;
  serviceCode: string;
  serviceCodeHint: string;
};

const ORDER_STORAGE_KEY = "ihc_home_care_orders";
const ACTIVE_ORDER_STORAGE_KEY = "ihc_home_care_active_order_id";

const defaultOrders: HomeCareOrder[] = [
  {
    id: "hc-order-001",
    title: "家政护理 2 小时上门服务",
    subtitle: "日常整理 / 擦拭收纳 / 温和清洁",
    image: orderImage,
    status: "pending_payment",
    price: 168,
    quantity: 1,
    address: "上海市浦东新区丁香路 168 弄 12 号 302",
    contactName: "王阿姨",
    contactPhone: "138 5566 1024",
    bookingDate: "04月18日",
    bookingWeekday: "周五",
    bookingTimeSlot: "09:00-11:00",
    createdAt: "2026-04-16 14:11",
    paymentDeadline: "14分36秒",
    couponAmount: 20,
    actualAmount: 148,
    orderNo: "HC202604160011",
    serviceCode: "7824 6159 3402",
    serviceCodeHint: "服务开始前向护理人员出示此码",
  },
  {
    id: "hc-order-002",
    title: "居家陪护整理 3 小时",
    subtitle: "起居协助 / 生活陪伴 / 卫生整理",
    image: orderImage,
    status: "awaiting_accept",
    price: 228,
    quantity: 1,
    address: "上海市徐汇区田林路 88 弄 9 号 602",
    contactName: "陈叔叔",
    contactPhone: "139 2201 8821",
    bookingDate: "04月19日",
    bookingWeekday: "周六",
    bookingTimeSlot: "13:00-16:00",
    createdAt: "2026-04-16 11:08",
    paidAt: "2026-04-16 11:15",
    couponAmount: 30,
    actualAmount: 198,
    orderNo: "HC202604160072",
    serviceCode: "5601 7743 2289",
    serviceCodeHint: "接单后可继续查看服务进度",
  },
  {
    id: "hc-order-003",
    title: "深度保洁护理 4 小时",
    subtitle: "厨房清洁 / 卫浴护理 / 地面除尘",
    image: orderImage,
    status: "awaiting_service",
    price: 298,
    quantity: 1,
    address: "上海市静安区万航渡路 566 号 8 楼 801",
    contactName: "李奶奶",
    contactPhone: "137 6628 5108",
    bookingDate: "04月17日",
    bookingWeekday: "周四",
    bookingTimeSlot: "15:00-19:00",
    createdAt: "2026-04-15 19:40",
    paidAt: "2026-04-15 19:46",
    couponAmount: 40,
    actualAmount: 258,
    orderNo: "HC202604150196",
    serviceCode: "4462 5801 9714",
    serviceCodeHint: "服务当天请保持电话畅通",
  },
  {
    id: "hc-order-004",
    title: "长者卧室整理护理 2 小时",
    subtitle: "床品整理 / 衣物归纳 / 环境清洁",
    image: orderImage,
    status: "completed",
    price: 158,
    quantity: 1,
    address: "上海市杨浦区国顺东路 208 号 5 号楼 201",
    contactName: "张阿姨",
    contactPhone: "136 0198 2257",
    bookingDate: "04月14日",
    bookingWeekday: "周一",
    bookingTimeSlot: "09:30-11:30",
    createdAt: "2026-04-13 17:05",
    paidAt: "2026-04-13 17:10",
    couponAmount: 10,
    actualAmount: 148,
    orderNo: "HC202604130088",
    serviceCode: "9021 5530 4428",
    serviceCodeHint: "已完成服务，可继续评价或申请售后",
  },
];

function cloneOrders(orders: HomeCareOrder[]) {
  return orders.map((order) => ({ ...order }));
}

function readOrders(): HomeCareOrder[] {
  if (typeof window === "undefined") {
    return cloneOrders(defaultOrders);
  }

  const rawValue = window.localStorage.getItem(ORDER_STORAGE_KEY);

  if (!rawValue) {
    return cloneOrders(defaultOrders);
  }

  try {
    const parsed = JSON.parse(rawValue) as HomeCareOrder[];

    if (!Array.isArray(parsed) || !parsed.length) {
      return cloneOrders(defaultOrders);
    }

    return parsed;
  } catch {
    return cloneOrders(defaultOrders);
  }
}

function writeOrders(orders: HomeCareOrder[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(orders));
}

function updateOrderById(orderId: string, updater: (order: HomeCareOrder) => HomeCareOrder) {
  const nextOrders = readOrders().map((order) => (order.id === orderId ? updater(order) : order));
  writeOrders(nextOrders);
}

export function ensureHomeCareOrders() {
  const orders = readOrders();
  writeOrders(orders);

  if (typeof window !== "undefined" && !window.localStorage.getItem(ACTIVE_ORDER_STORAGE_KEY)) {
    window.localStorage.setItem(ACTIVE_ORDER_STORAGE_KEY, orders[0]?.id || "");
  }
}

export function getHomeCareOrders() {
  return readOrders();
}

export function getHomeCareOrderById(orderId: string) {
  return readOrders().find((order) => order.id === orderId) || null;
}

export function setActiveHomeCareOrderId(orderId: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(ACTIVE_ORDER_STORAGE_KEY, orderId);
}

export function getActiveHomeCareOrderId() {
  if (typeof window === "undefined") {
    return defaultOrders[0].id;
  }

  return window.localStorage.getItem(ACTIVE_ORDER_STORAGE_KEY) || defaultOrders[0].id;
}

export function getActiveHomeCareOrder() {
  const activeOrderId = getActiveHomeCareOrderId();
  return getHomeCareOrderById(activeOrderId) || getHomeCareOrders()[0] || null;
}

export function cancelHomeCareOrder(orderId: string) {
  const nextOrders = readOrders().filter((order) => order.id !== orderId);
  writeOrders(nextOrders);

  const currentActiveId = getActiveHomeCareOrderId();
  if (currentActiveId === orderId && nextOrders[0]) {
    setActiveHomeCareOrderId(nextOrders[0].id);
  }
}

export function deleteHomeCareOrder(orderId: string) {
  cancelHomeCareOrder(orderId);
}

export function payHomeCareOrder(orderId: string) {
  updateOrderById(orderId, (order) => ({
    ...order,
    status: "awaiting_service",
    paidAt: new Date().toISOString().slice(0, 16).replace("T", " "),
    paymentDeadline: undefined,
  }));
}

export function updateHomeCareOrderSchedule(orderId: string, bookingDate: string, bookingWeekday: string, bookingTimeSlot: string) {
  updateOrderById(orderId, (order) => ({
    ...order,
    bookingDate,
    bookingWeekday,
    bookingTimeSlot,
  }));
}

export function getHomeCareOrderStatusLabel(status: HomeCareOrderStatus) {
  if (status === "pending_payment") {
    return "待付款";
  }

  if (status === "awaiting_accept") {
    return "待接单";
  }

  if (status === "awaiting_service") {
    return "待服务";
  }

  return "待评价";
}
