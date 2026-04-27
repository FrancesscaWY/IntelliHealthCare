import { request } from "@/shared/api/client";

function createOrdersSearchParams(params?: { serviceId?: string }) {
  const searchParams = new URLSearchParams();

  if (params?.serviceId?.trim()) {
    searchParams.set("serviceId", params.serviceId.trim());
  }

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : "";
}

function createListOrdersSearchParams(params?: {
  page?: number;
  pageSize?: number;
  status?: string;
}) {
  const searchParams = new URLSearchParams();

  if (params?.page) {
    searchParams.set("page", String(params.page));
  }

  if (params?.pageSize) {
    searchParams.set("pageSize", String(params.pageSize));
  }

  if (params?.status?.trim()) {
    searchParams.set("status", params.status.trim());
  }

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : "";
}

export interface PaginatedResponse<T> {
  list: T[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
}

export type OrderServiceCategory =
  | "HOME_CARE"
  | "REHAB_THERAPY"
  | "HOME_EXAM"
  | "ELDERLY_CARE"
  | "CHECKUP";

export type OrderStatus =
  | "PENDING_PAYMENT"
  | "PENDING_CONFIRMATION"
  | "DISPATCHING"
  | "WAITING_ASSESSMENT"
  | "SCHEDULED"
  | "IN_SERVICE"
  | "COMPLETED"
  | "AFTER_SALE"
  | "REFUNDED"
  | "CANCELLED";

export interface BookingOptionAddress {
  addressId: string;
  label: string;
  receiverName: string;
  receiverPhone: string;
  province: string;
  city: string;
  district: string;
  street: string;
  detailAddress: string;
  isDefault?: boolean;
}

export interface BookingOptionDate {
  date: string;
  timeSlots: string[];
}

export interface BookingOptionsResponse {
  service: {
    serviceId: string;
    title: string;
    price: number;
  } | null;
  elders: Array<{
    userId: string;
    name: string;
  }>;
  addresses: BookingOptionAddress[];
  availableDates: BookingOptionDate[];
}

export interface PreviewOrderResponse {
  service: {
    serviceId: string;
    title: string;
    category: string;
    price: number;
    coverUrl: string | null;
  };
  elderId: string;
  address: BookingOptionAddress;
  bookingDate: string | null;
  bookingTimeSlot: string | null;
  remark: string | null;
  coupon: {
    couponId: string;
    title: string;
    discountAmount: number;
  } | null;
  price: {
    originalAmount: number;
    discountAmount: number;
    payableAmount: number;
  };
  healthSummary: unknown;
}

export interface CreateOrderParams {
  serviceId: string;
  addressId: string;
  elderId?: string;
  bookingDate?: string;
  bookingTimeSlot?: string;
  contactName?: string;
  contactPhone?: string;
  remark?: string;
  couponId?: string;
}

export interface CreateOrderResponse {
  orderId: string;
  orderNo: string;
  status: string;
}

export interface OrderListItem {
  orderId: string;
  orderNo: string;
  serviceCategory: OrderServiceCategory | string;
  status: OrderStatus | string;
  statusText: string;
  title: string;
  image: string | null;
  actualAmount: number;
  bookingDate: string | null;
  bookingTimeSlot: string | null;
  createdAt: string;
}

export interface OrderDetailResponse extends OrderListItem {
  remark: string | null;
  source: string | null;
  urgencyLevel: string | null;
  address: BookingOptionAddress | null;
  contact: {
    contactName: string;
    contactPhone: string;
  } | null;
  healthSummary: unknown;
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
  createdAt: string | null;
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
  attachment: unknown;
  reviewedAt: string | null;
  publishedAt: string | null;
}

export interface OrderReviewResponse {
  reviewId: string;
  orderId: string;
  score: number;
  tags: string[];
  content: string | null;
  createdAt: string | null;
}

export interface OrderAfterSaleItem {
  requestId: string;
  type: string;
  status: string;
  reason: string;
  description: string | null;
  amountRequested: number | null;
  createdAt: string | null;
}

export function getBookingOptions(serviceId?: string) {
  return request<BookingOptionsResponse>(
    `/app/orders/booking/options${createOrdersSearchParams({ serviceId })}`,
    {
      auth: true
    }
  );
}

export function previewOrder(body: Omit<CreateOrderParams, "contactName" | "contactPhone">) {
  return request<PreviewOrderResponse>("/app/orders/preview", {
    method: "POST",
    body,
    auth: true
  });
}

export function createOrder(body: CreateOrderParams) {
  return request<CreateOrderResponse>("/app/orders", {
    method: "POST",
    body,
    auth: true
  });
}

export function getOrderBookingOptions(serviceId?: string) {
  return getBookingOptions(serviceId);
}

export function listOrders(params?: {
  page?: number;
  pageSize?: number;
  status?: string;
}) {
  return request<PaginatedResponse<OrderListItem>>(
    `/app/orders${createListOrdersSearchParams(params)}`,
    {
      auth: true
    }
  );
}

export function getOrderDetail(orderId: string) {
  return request<OrderDetailResponse>(`/app/orders/${orderId}`, {
    auth: true
  });
}

export function updateOrderSchedule(
  orderId: string,
  body: {
    bookingDate: string;
    bookingTimeSlot: string;
  }
) {
  return request<{
    orderId: string;
    bookingDate: string | null;
    bookingTimeSlot: string | null;
  }>(`/app/orders/${orderId}/schedule`, {
    method: "PUT",
    body,
    auth: true
  });
}

export function cancelOrder(orderId: string, reason?: string) {
  return request<{
    orderId: string;
    status: string;
  }>(`/app/orders/${orderId}/cancel`, {
    method: "POST",
    body: {
      reason
    },
    auth: true
  });
}

export function getOrderTimeline(orderId: string) {
  return request<OrderTimelineItem[]>(`/app/orders/${orderId}/timeline`, {
    auth: true
  });
}

export function getOrderVoucher(orderId: string) {
  return request<OrderVoucherResponse>(`/app/orders/${orderId}/voucher`, {
    auth: true
  });
}

export function getOrderServiceRecords(orderId: string) {
  return request<OrderServiceRecordItem[]>(
    `/app/orders/${orderId}/service-records`,
    {
      auth: true
    }
  );
}

export function getOrderAssessmentReport(orderId: string) {
  return request<OrderReportResponse>(
    `/app/orders/${orderId}/assessment-report`,
    {
      auth: true
    }
  );
}

export function getOrderRehabReport(orderId: string) {
  return request<OrderReportResponse>(`/app/orders/${orderId}/rehab-report`, {
    auth: true
  });
}

export function createOrderReview(
  orderId: string,
  body: {
    score: number;
    tags?: string[];
    content?: string;
  }
) {
  return request<{
    reviewId: string;
    score: number;
  }>(`/app/orders/${orderId}/reviews`, {
    method: "POST",
    body,
    auth: true
  });
}

export function getOrderReview(orderId: string) {
  return request<OrderReviewResponse | null>(`/app/orders/${orderId}/reviews`, {
    auth: true
  });
}

export function createOrderAfterSale(
  orderId: string,
  body: {
    type: string;
    reason: string;
    description?: string;
    amountRequested?: number;
  }
) {
  return request<{
    requestId: string;
    status: string;
  }>(`/app/orders/${orderId}/after-sales`, {
    method: "POST",
    body,
    auth: true
  });
}

export function getOrderAfterSales(orderId: string) {
  return request<OrderAfterSaleItem[]>(`/app/orders/${orderId}/after-sales`, {
    auth: true
  });
}
