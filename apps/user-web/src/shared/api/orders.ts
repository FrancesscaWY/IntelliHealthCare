import { request } from "@/shared/api/client";

export interface OrderBookingOptionsResponse {
  service: {
    serviceId: string;
    title: string;
    image?: string | null;
    price?: number | null;
  } | null;
  elders: Array<{
    elderId: string;
    name: string;
    relationLabel: string;
  }>;
  addresses: Array<{
    addressId: string;
    label: string;
    receiverName: string;
    receiverPhone: string;
    province: string;
    city: string;
    district: string;
    street: string;
    detailAddress: string;
    longitude: number | null;
    latitude: number | null;
    isDefault: boolean;
  }>;
  availableDates: Array<{
    date: string;
    timeSlots: string[];
  }>;
}

export interface OrderPreviewRequest {
  serviceId: string;
  addressId: string;
  elderId?: string;
  bookingDate?: string;
  bookingTimeSlot?: string;
  couponId?: string;
  remark?: string;
}

export interface OrderPreviewResponse {
  serviceId: string;
  originalAmount: number;
  discountAmount: number;
  payableAmount: number;
}

export interface CreateOrderRequest {
  contactName?: string;
  contactPhone?: string;
  serviceId: string;
  addressId: string;
  elderId?: string;
  bookingDate?: string;
  bookingTimeSlot?: string;
  couponId?: string;
  remark?: string;
}

export interface CreateOrderResponse {
  orderId: string;
  status: string;
  payableAmount: number;
}

export interface OrderListItem {
  orderId: string;
  orderNo: string;
  serviceCategory: string;
  status: string;
  statusText: string;
  title: string;
  image: string | null;
  actualAmount: number;
  bookingDate: string | null;
  bookingTimeSlot: string | null;
  createdAt: string;
}

export interface OrderListResponse {
  list: OrderListItem[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
}

export interface OrderDetailResponse extends OrderListItem {
  remark: string | null;
  source: string | null;
  urgencyLevel: number | null;
  address: {
    city: string;
    district: string;
    province: string;
    receiverName: string;
    detailAddress: string;
    receiverPhone: string;
  } | null;
  contact: {
    relation: string | null;
    contactName: string | null;
    contactPhone: string | null;
  } | null;
  healthSummary: {
    risks?: string[];
    chronicDiseases?: string[];
  } | null;
  payments: Array<{
    paymentId: string;
    paymentNo: string;
    channel: string;
    status: string;
    amount: number;
    paidAt: string | null;
  }>;
  workOrders: Array<{
    workOrderId: string;
    status: string;
    assigneeName: string | null;
    institutionName: string | null;
    scheduleAt: string | null;
  }>;
  reports: Array<{
    reportId: string;
    type: string;
    title: string;
    status: string;
    publishedAt: string | null;
  }>;
}

export interface OrderTimelineItem {
  timelineId: string;
  status: string;
  title: string;
  description: string | null;
  operatorName: string | null;
  createdAt: string;
}

export interface OrderVoucherResponse {
  orderId: string;
  voucherCode: string;
  status: string;
  bookingDate: string | null;
  bookingTimeSlot: string | null;
}

export interface OrderServiceRecordItem {
  workOrderId: string;
  status: string;
  institutionName: string | null;
  assigneeName: string | null;
  scheduleAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  dispatchNote: string | null;
}

export interface OrderReportResponse {
  reportId: string;
  type: string;
  title: string;
  status: string;
  summary: Record<string, unknown> | null;
  attachment: Array<{
    fileId: string;
    fileName: string;
  }>;
  reviewedAt: string | null;
  publishedAt: string | null;
}

export interface OrderReviewResponse {
  reviewId: string;
  orderId: string;
  score: number;
  tags: string[];
  content: string | null;
  createdAt: string;
}

export interface CreateOrderReviewRequest {
  score: number;
  tags?: string[];
  content?: string;
}

export interface OrderAfterSaleItem {
  requestId: string;
  type: string;
  status: string;
  reason: string;
  description: string | null;
  amountRequested: number | null;
  createdAt: string;
}

export interface CreateOrderAfterSaleRequest {
  type: string;
  reason: string;
  description?: string;
  amountRequested?: number;
}

export function getOrderBookingOptions(serviceId?: string) {
  const suffix = serviceId ? `?serviceId=${encodeURIComponent(serviceId)}` : "";
  return request<OrderBookingOptionsResponse>(`/app/orders/booking/options${suffix}`, {
    auth: true
  });
}

export function previewOrder(payload: OrderPreviewRequest) {
  return request<OrderPreviewResponse>("/app/orders/preview", {
    method: "POST",
    auth: true,
    body: payload
  });
}

export function createOrder(payload: CreateOrderRequest) {
  return request<CreateOrderResponse>("/app/orders", {
    method: "POST",
    auth: true,
    body: payload
  });
}

export function listOrders(params?: {
  status?: string;
  page?: number;
  pageSize?: number;
}) {
  const search = new URLSearchParams();
  if (params?.status) search.set("status", params.status);
  if (params?.page) search.set("page", String(params.page));
  if (params?.pageSize) search.set("pageSize", String(params.pageSize));
  const suffix = search.size ? `?${search.toString()}` : "";
  return request<OrderListResponse>(`/app/orders${suffix}`, { auth: true });
}

export function getOrderDetail(orderId: string) {
  return request<OrderDetailResponse>(`/app/orders/${orderId}`, { auth: true });
}

export function updateOrderSchedule(
  orderId: string,
  payload: { bookingDate: string; bookingTimeSlot: string }
) {
  return request<{ orderId: string; bookingDate: string; bookingTimeSlot: string; updated: boolean }>(
    `/app/orders/${orderId}/schedule`,
    { method: "PUT", auth: true, body: payload }
  );
}

export function cancelOrder(orderId: string, reason?: string) {
  return request<{ orderId: string; status: string }>(`/app/orders/${orderId}/cancel`, {
    method: "POST",
    auth: true,
    body: reason ? { reason } : {}
  });
}

export function getOrderTimeline(orderId: string) {
  return request<OrderTimelineItem[]>(`/app/orders/${orderId}/timeline`, { auth: true });
}

export function getOrderVoucher(orderId: string) {
  return request<OrderVoucherResponse>(`/app/orders/${orderId}/voucher`, { auth: true });
}

export function getOrderServiceRecords(orderId: string) {
  return request<OrderServiceRecordItem[]>(`/app/orders/${orderId}/service-records`, { auth: true });
}

export function getOrderAssessmentReport(orderId: string) {
  return request<OrderReportResponse>(`/app/orders/${orderId}/assessment-report`, { auth: true });
}

export function getOrderRehabReport(orderId: string) {
  return request<OrderReportResponse>(`/app/orders/${orderId}/rehab-report`, { auth: true });
}

export function getOrderReview(orderId: string) {
  return request<OrderReviewResponse>(`/app/orders/${orderId}/reviews`, { auth: true });
}

export function createOrderReview(orderId: string, payload: CreateOrderReviewRequest) {
  return request<{ reviewId: string; submitted: boolean }>(`/app/orders/${orderId}/reviews`, {
    method: "POST",
    auth: true,
    body: payload
  });
}

export function getOrderAfterSales(orderId: string) {
  return request<OrderAfterSaleItem[]>(`/app/orders/${orderId}/after-sales`, { auth: true });
}

export function createOrderAfterSale(orderId: string, payload: CreateOrderAfterSaleRequest) {
  return request<{ afterSaleId: string; status: string }>(`/app/orders/${orderId}/after-sales`, {
    method: "POST",
    auth: true,
    body: payload
  });
}
