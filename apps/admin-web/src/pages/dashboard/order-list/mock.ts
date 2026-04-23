export type OrderStatus = "待付款" | "待接单" | "待服务" | "已完成" | "已关闭" | "退款售后";
export type OrderActionTone = "green" | "red";
export type OrderFooterActionTone = "primary" | "danger" | "ghost";

export interface OrderActionItem {
  label: string;
  tone: OrderActionTone;
}

export interface OrderFooterAction {
  label: string;
  tone: OrderFooterActionTone;
}

export interface AdminOrderRecord {
  id: string;
  orderTime: string;
  settleLabel: string;
  settleAmount: string;
  title: string;
  image: string;
  price: string;
  originalPrice: string;
  discountAmount: string;
  buyerName: string;
  buyerId: string;
  buyerPhone: string;
  buyerAvatar: string;
  status: OrderStatus;
  payment: string;
  serviceType: string;
  serviceSummary: string;
  actions: OrderActionItem[];
  orderSource: string;
  registerTime: string;
  registerMethod: string;
  lastLoginTime: string;
  lastPurchaseTime: string;
  userRemark: string;
  orderRemark: string;
  contactName: string;
  contactPhone: string;
  serviceAddress: string;
  appointmentTime: string;
  duration: string;
  paymentTime?: string;
  acceptedTime?: string;
  completedTime?: string;
  closedTime?: string;
  closeReason?: string;
  serviceCode?: string;
  serviceStaff?: string;
  verifier?: string;
  afterSaleNo?: string;
  afterSaleReason?: string;
  afterSaleStatus?: string;
  paymentDeadlineAt?: string;
  detailTitle: string;
  detailDescription: string;
  productActionLabel: string;
  footerActions: OrderFooterAction[];
}

export const orderDetailStorageKey = "admin:dashboard:selected-order-id";
export const orderDetailPendingActionStorageKey = "admin:dashboard:selected-order-action";

const cleaningImage =
  "https://images.pexels.com/photos/4239031/pexels-photo-4239031.jpeg?auto=compress&cs=tinysrgb&w=320";
const rehabImage =
  "https://images.pexels.com/photos/5793996/pexels-photo-5793996.jpeg?auto=compress&cs=tinysrgb&w=320";
const buyerAvatarA =
  "https://images.pexels.com/photos/6129501/pexels-photo-6129501.jpeg?auto=compress&cs=tinysrgb&w=240";
const buyerAvatarB =
  "https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=240";

function createFutureIso(secondsFromNow: number) {
  return new Date(Date.now() + secondsFromNow * 1000).toISOString();
}

const orders: AdminOrderRecord[] = [
  {
    id: "2400126670",
    orderTime: "2026-04-22 10:12:07",
    settleLabel: "应付款",
    settleAmount: "300.00",
    title: "日常清洁 2小时 1人上门深度保洁",
    image: cleaningImage,
    price: "300.00",
    originalPrice: "399.00",
    discountAmount: "99.00",
    buyerName: "笑看人生",
    buyerId: "U202410090001",
    buyerPhone: "19288664488",
    buyerAvatar: buyerAvatarA,
    status: "待付款",
    payment: "-",
    serviceType: "家政护工",
    serviceSummary: "重点清洁卧室、客厅和卫浴，含基础除尘与地面清洁。",
    actions: [
      { label: "订单详情", tone: "green" },
      { label: "关闭订单", tone: "red" },
      { label: "联系用户", tone: "green" },
      { label: "备注", tone: "green" },
    ],
    orderSource: "APP",
    registerTime: "2024-10-09 10:09:09",
    registerMethod: "APP端注册",
    lastLoginTime: "2026-04-22 09:41:18",
    lastPurchaseTime: "2026-04-18 18:26:44",
    userRemark: "对上门时间较敏感，适合安排守时服务人员。",
    orderRemark: "偏好自带静音设备，午休前完成卧室和客厅清洁。",
    contactName: "赵女士",
    contactPhone: "19288664488",
    serviceAddress: "徐汇区钦州南路88弄6号1202室",
    appointmentTime: "2026-04-24 09:00-11:00",
    duration: "2小时",
    paymentDeadlineAt: createFutureIso(13 * 60 + 4),
    detailTitle: "商品已拍下，等待买家付款",
    detailDescription: "订单已创建，若在剩余时限内未完成支付，系统将自动关闭。",
    productActionLabel: "-",
    footerActions: [
      { label: "修改价格", tone: "primary" },
      { label: "关闭订单", tone: "danger" },
      { label: "返回", tone: "ghost" },
    ],
  },
  {
    id: "2400126671",
    orderTime: "2026-04-22 10:26:18",
    settleLabel: "实付款",
    settleAmount: "300.00",
    title: "日常清洁 2小时 1人上门深度保洁",
    image: cleaningImage,
    price: "300.00",
    originalPrice: "399.00",
    discountAmount: "99.00",
    buyerName: "笑看人生",
    buyerId: "U202410090001",
    buyerPhone: "19288664488",
    buyerAvatar: buyerAvatarA,
    status: "待接单",
    payment: "支付宝",
    serviceType: "家政护工",
    serviceSummary: "下单后已完成支付，待指派服务人员并确认上门安排。",
    actions: [
      { label: "订单详情", tone: "green" },
      { label: "手动派单", tone: "green" },
      { label: "退款", tone: "red" },
      { label: "联系用户", tone: "green" },
      { label: "备注", tone: "green" },
    ],
    orderSource: "APP",
    registerTime: "2024-10-09 10:09:09",
    registerMethod: "APP端注册",
    lastLoginTime: "2026-04-22 09:41:18",
    lastPurchaseTime: "2026-04-20 15:08:26",
    userRemark: "更关注清洁细节，可优先安排评分稳定的阿姨。",
    orderRemark: "服务前请先电话确认小区访客通行。",
    contactName: "赵女士",
    contactPhone: "19288664488",
    serviceAddress: "徐汇区钦州南路88弄6号1202室",
    appointmentTime: "2026-04-24 14:00-16:00",
    duration: "2小时",
    paymentTime: "2026-04-22 10:28:42",
    serviceCode: "QJ-7721-4408",
    detailTitle: "买家已支付，等待服务人员接单",
    detailDescription: "系统正在抢单，也可以手动派单给当前排班中的服务人员。",
    productActionLabel: "可退款",
    footerActions: [
      { label: "手动派单", tone: "primary" },
      { label: "退款", tone: "danger" },
      { label: "返回", tone: "ghost" },
    ],
  },
  {
    id: "2400126672",
    orderTime: "2026-04-21 18:08:11",
    settleLabel: "实付款",
    settleAmount: "300.00",
    title: "日常清洁 2小时 1人上门深度保洁",
    image: cleaningImage,
    price: "300.00",
    originalPrice: "399.00",
    discountAmount: "99.00",
    buyerName: "笑看人生",
    buyerId: "U202410090001",
    buyerPhone: "19288664488",
    buyerAvatar: buyerAvatarA,
    status: "待服务",
    payment: "支付宝",
    serviceType: "家政护工",
    serviceSummary: "服务人员已确认上门，按预约时间提供卧室与客厅深度保洁。",
    actions: [
      { label: "订单详情", tone: "green" },
      { label: "退款", tone: "red" },
      { label: "联系用户", tone: "green" },
      { label: "备注", tone: "green" },
    ],
    orderSource: "APP",
    registerTime: "2024-10-09 10:09:09",
    registerMethod: "APP端注册",
    lastLoginTime: "2026-04-22 09:41:18",
    lastPurchaseTime: "2026-04-21 18:08:11",
    userRemark: "服务满意度高，但对迟到较敏感。",
    orderRemark: "家里有猫，请使用低刺激清洁剂并注意关门。",
    contactName: "赵女士",
    contactPhone: "19288664488",
    serviceAddress: "徐汇区钦州南路88弄6号1202室",
    appointmentTime: "2026-04-23 09:30-11:30",
    duration: "2小时",
    paymentTime: "2026-04-21 18:10:36",
    acceptedTime: "2026-04-21 18:42:15",
    serviceCode: "QJ-8902-6621",
    serviceStaff: "李阿姨",
    detailTitle: "服务已排期，等待上门",
    detailDescription: "服务人员已接单，请按预约时间上门并在完成后发起核销。",
    productActionLabel: "可退款",
    footerActions: [
      { label: "退款", tone: "danger" },
      { label: "返回", tone: "ghost" },
    ],
  },
  {
    id: "2400126673",
    orderTime: "2026-04-18 09:22:34",
    settleLabel: "实付款",
    settleAmount: "300.00",
    title: "日常清洁 2小时 1人上门深度保洁",
    image: cleaningImage,
    price: "300.00",
    originalPrice: "399.00",
    discountAmount: "99.00",
    buyerName: "笑看人生",
    buyerId: "U202410090001",
    buyerPhone: "19288664488",
    buyerAvatar: buyerAvatarA,
    status: "已完成",
    payment: "支付宝",
    serviceType: "家政护工",
    serviceSummary: "服务已完成，现场已完成核销并同步回传服务结果。",
    actions: [
      { label: "订单详情", tone: "green" },
      { label: "发起售后", tone: "red" },
      { label: "联系用户", tone: "green" },
      { label: "备注", tone: "green" },
    ],
    orderSource: "APP",
    registerTime: "2024-10-09 10:09:09",
    registerMethod: "APP端注册",
    lastLoginTime: "2026-04-20 21:08:19",
    lastPurchaseTime: "2026-04-18 09:22:34",
    userRemark: "愿意配合服务回访，可继续推荐保洁套餐。",
    orderRemark: "重点清理阳台与厨房油污，完成后同步拍照。",
    contactName: "赵女士",
    contactPhone: "19288664488",
    serviceAddress: "徐汇区钦州南路88弄6号1202室",
    appointmentTime: "2026-04-19 13:00-15:00",
    duration: "2小时",
    paymentTime: "2026-04-18 09:24:08",
    acceptedTime: "2026-04-18 10:05:42",
    completedTime: "2026-04-19 15:16:20",
    serviceCode: "QJ-6612-9034",
    serviceStaff: "周洁",
    verifier: "周洁",
    detailTitle: "服务结束，订单已完成",
    detailDescription: "本次服务已完成闭环，后续可继续做回访或发起售后处理。",
    productActionLabel: "售后申请",
    footerActions: [
      { label: "发起售后", tone: "danger" },
      { label: "返回", tone: "ghost" },
    ],
  },
  {
    id: "2400126674",
    orderTime: "2026-04-17 16:45:52",
    settleLabel: "应付款",
    settleAmount: "300.00",
    title: "日常清洁 2小时 1人上门深度保洁",
    image: cleaningImage,
    price: "300.00",
    originalPrice: "399.00",
    discountAmount: "99.00",
    buyerName: "笑看人生",
    buyerId: "U202410090001",
    buyerPhone: "19288664488",
    buyerAvatar: buyerAvatarA,
    status: "已关闭",
    payment: "-",
    serviceType: "家政护工",
    serviceSummary: "订单未在支付时限内完成付款，系统已自动关闭。",
    actions: [
      { label: "订单详情", tone: "green" },
      { label: "联系用户", tone: "green" },
      { label: "备注", tone: "green" },
    ],
    orderSource: "APP",
    registerTime: "2024-10-09 10:09:09",
    registerMethod: "APP端注册",
    lastLoginTime: "2026-04-17 16:43:09",
    lastPurchaseTime: "2026-04-10 12:12:45",
    userRemark: "偶尔下单后未及时支付，建议二次触达确认需求。",
    orderRemark: "用户咨询过保洁范围，但未继续完成支付。",
    contactName: "赵女士",
    contactPhone: "19288664488",
    serviceAddress: "徐汇区钦州南路88弄6号1202室",
    appointmentTime: "2026-04-20 09:00-11:00",
    duration: "2小时",
    closedTime: "2026-04-17 17:15:52",
    closeReason: "支付超时自动关闭",
    detailTitle: "支付超时，订单已关闭",
    detailDescription: "当前订单已失效，如用户仍有服务需求，可引导其重新下单。",
    productActionLabel: "-",
    footerActions: [{ label: "返回", tone: "ghost" }],
  },
  {
    id: "2400126675",
    orderTime: "2026-04-20 11:16:23",
    settleLabel: "实付款",
    settleAmount: "300.00",
    title: "日常清洁 2小时 1人上门深度保洁",
    image: cleaningImage,
    price: "300.00",
    originalPrice: "399.00",
    discountAmount: "99.00",
    buyerName: "笑看人生",
    buyerId: "U202410090001",
    buyerPhone: "19288664488",
    buyerAvatar: buyerAvatarA,
    status: "退款售后",
    payment: "支付宝",
    serviceType: "家政护工",
    serviceSummary: "用户已提交售后退款诉求，当前进入客服审核阶段。",
    actions: [
      { label: "订单详情", tone: "green" },
      { label: "联系用户", tone: "green" },
      { label: "备注", tone: "green" },
    ],
    orderSource: "APP",
    registerTime: "2024-10-09 10:09:09",
    registerMethod: "APP端注册",
    lastLoginTime: "2026-04-20 13:21:05",
    lastPurchaseTime: "2026-04-20 11:16:23",
    userRemark: "对服务细节有明确期望，售后沟通时需同步清洁前后差异。",
    orderRemark: "用户反馈厨房台面清洁不彻底，申请部分退款。",
    contactName: "赵女士",
    contactPhone: "19288664488",
    serviceAddress: "徐汇区钦州南路88弄6号1202室",
    appointmentTime: "2026-04-21 10:00-12:00",
    duration: "2小时",
    paymentTime: "2026-04-20 11:18:09",
    acceptedTime: "2026-04-20 11:40:22",
    completedTime: "2026-04-21 12:18:36",
    serviceCode: "QJ-3348-1086",
    serviceStaff: "周洁",
    afterSaleNo: "AS202604210031",
    afterSaleReason: "用户申请部分退款 80 元，原因是厨房台面清洁不彻底。",
    afterSaleStatus: "待客服审核",
    detailTitle: "售后申请处理中",
    detailDescription: "售后单已建立，请在规定时效内完成审核并同步处理结果。",
    productActionLabel: "售后处理中",
    footerActions: [
      { label: "处理售后", tone: "danger" },
      { label: "返回", tone: "ghost" },
    ],
  },
  {
    id: "2400126676",
    orderTime: "2026-04-22 08:35:44",
    settleLabel: "实付款",
    settleAmount: "599.00",
    title: "康复训练 上门评估与基础理疗服务",
    image: rehabImage,
    price: "599.00",
    originalPrice: "699.00",
    discountAmount: "100.00",
    buyerName: "王小倩",
    buyerId: "U202402180087",
    buyerPhone: "13688664488",
    buyerAvatar: buyerAvatarB,
    status: "待服务",
    payment: "微信支付",
    serviceType: "康复理疗",
    serviceSummary: "康复师将在预约时段上门做基础评估与拉伸理疗。",
    actions: [
      { label: "订单详情", tone: "green" },
      { label: "联系用户", tone: "green" },
      { label: "备注", tone: "green" },
    ],
    orderSource: "APP",
    registerTime: "2024-02-18 14:30:22",
    registerMethod: "APP端注册",
    lastLoginTime: "2026-04-22 08:26:51",
    lastPurchaseTime: "2026-04-22 08:35:44",
    userRemark: "家属代下单，沟通时优先联系女儿手机号。",
    orderRemark: "老人腰背僵硬明显，请理疗前先做站立稳定性评估。",
    contactName: "王女士",
    contactPhone: "13688664488",
    serviceAddress: "浦东新区芳甸路189弄12号702室",
    appointmentTime: "2026-04-23 15:00-16:30",
    duration: "1.5小时",
    paymentTime: "2026-04-22 08:38:05",
    acceptedTime: "2026-04-22 08:56:48",
    serviceCode: "KF-1152-7703",
    serviceStaff: "刘康复师",
    detailTitle: "服务已排期，等待上门",
    detailDescription: "康复师已确认接单，请按预约时间上门完成评估与理疗服务。",
    productActionLabel: "联系客服",
    footerActions: [{ label: "返回", tone: "ghost" }],
  },
];

const mock = {
  title: "全部订单",
  serviceTypes: ["全部类型", "家政护工", "康复理疗", "上门体检"],
  paymentOptions: ["全部方式", "支付宝", "微信支付", "银行卡"],
  statusTabs: ["全部", "待付款", "待接单", "待服务", "已完成", "退款售后", "已关闭"],
  orders,
};

export function getOrderById(orderId: string) {
  return orders.find((order) => order.id === orderId);
}

export function updateOrderById(orderId: string, patch: Partial<AdminOrderRecord>) {
  const targetOrder = getOrderById(orderId);

  if (!targetOrder) {
    return null;
  }

  Object.assign(targetOrder, patch);
  return targetOrder;
}

export default mock;
