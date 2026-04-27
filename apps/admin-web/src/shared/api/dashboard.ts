import { request } from "@/shared/api/client";
import { buildQueryString } from "@/shared/api/query";

export function getAdminDashboardOverview() {
  return request<any>("/admin/dashboard/overview", {
    auth: true
  });
}

export function getAdminBookingBoard(query: {
  date?: string;
  serviceType?: string;
  staffId?: string;
} = {}) {
  return request<any>(`/admin/booking-board${buildQueryString(query)}`, {
    auth: true
  });
}

export function getAdminOrderDetail(orderId: string) {
  return request<any>(`/admin/orders/${orderId}`, {
    auth: true
  });
}

export function updateAdminOrderPrice(
  orderId: string,
  payload: {
    payableAmount: number;
    remark?: string;
  }
) {
  return request<any>(`/admin/orders/${orderId}/price`, {
    method: "PUT",
    auth: true,
    body: payload
  });
}

export function closeAdminOrder(orderId: string, payload: { reason?: string }) {
  return request<any>(`/admin/orders/${orderId}/close`, {
    method: "POST",
    auth: true,
    body: payload
  });
}

export function saveAdminOrderRemark(orderId: string, payload: { remark?: string }) {
  return request<any>(`/admin/orders/${orderId}/remark`, {
    method: "POST",
    auth: true,
    body: payload
  });
}

export function getAdminOrderTimeline(orderId: string) {
  return request<any>(`/admin/orders/${orderId}/timeline`, {
    auth: true
  });
}

export function dispatchAdminOrder(
  orderId: string,
  payload: {
    institutionId?: string;
    assigneeStaffId?: string;
    scheduleId?: string;
    scheduleAt?: string;
    timeSlot?: string;
    dispatchNote?: string;
    remark?: string;
  }
) {
  return request<any>(`/admin/orders/${orderId}/dispatch`, {
    method: "POST",
    auth: true,
    body: payload
  });
}

export function createAdminOrderAfterSale(
  orderId: string,
  payload: {
    type: "REFUND" | "COMPLAINT" | "RESCHEDULE" | "OTHER";
    reason: string;
    description?: string;
    amountRequested?: number;
  }
) {
  return request<any>(`/admin/orders/${orderId}/after-sales`, {
    method: "POST",
    auth: true,
    body: payload
  });
}

export function getAdminAfterSales(query: {
  page?: number;
  pageSize?: number;
  status?: string;
  keyword?: string;
} = {}) {
  return request<any>(`/admin/after-sales${buildQueryString(query)}`, {
    auth: true
  });
}

export function getAdminAfterSaleDetail(afterSaleId: string) {
  return request<any>(`/admin/after-sales/${afterSaleId}`, {
    auth: true
  });
}

export function approveAdminAfterSale(
  afterSaleId: string,
  payload: {
    remark?: string;
    refundAmount?: number;
  }
) {
  return request<any>(`/admin/after-sales/${afterSaleId}/approve`, {
    method: "PUT",
    auth: true,
    body: payload
  });
}

export function rejectAdminAfterSale(afterSaleId: string, payload: { remark?: string }) {
  return request<any>(`/admin/after-sales/${afterSaleId}/reject`, {
    method: "PUT",
    auth: true,
    body: payload
  });
}

export function closeAdminAfterSale(afterSaleId: string, payload: { remark?: string }) {
  return request<any>(`/admin/after-sales/${afterSaleId}/close`, {
    method: "PUT",
    auth: true,
    body: payload
  });
}

export function getAdminOrderReviews(query: {
  page?: number;
  pageSize?: number;
  serviceType?: string;
  rating?: number;
  isPinned?: boolean;
} = {}) {
  return request<any>(`/admin/order-reviews${buildQueryString(query)}`, {
    auth: true
  });
}

export function getAdminOrderReviewDetail(reviewId: string) {
  return request<any>(`/admin/order-reviews/${reviewId}`, {
    auth: true
  });
}

export function updateAdminOrderReviewVisibility(reviewId: string, payload: { isVisible: boolean }) {
  return request<any>(`/admin/order-reviews/${reviewId}/visibility`, {
    method: "PUT",
    auth: true,
    body: payload
  });
}

export function updateAdminOrderReviewPin(reviewId: string, payload: { isPinned: boolean }) {
  return request<any>(`/admin/order-reviews/${reviewId}/pin`, {
    method: "PUT",
    auth: true,
    body: payload
  });
}

export function deleteAdminOrderReview(reviewId: string) {
  return request<any>(`/admin/order-reviews/${reviewId}`, {
    method: "DELETE",
    auth: true
  });
}

export function batchOperateAdminOrderReviews(payload: {
  reviewIds: string[];
  action: "SHOW" | "HIDE" | "PIN" | "UNPIN" | "DELETE";
}) {
  return request<any>("/admin/order-reviews/batch", {
    method: "POST",
    auth: true,
    body: payload
  });
}
