import { request } from "@/shared/api/client";
import { buildQueryString } from "@/shared/api/query";

export interface AdminOrderListItem {
  orderId: string;
  orderNo: string;
  serviceCategory: string;
  serviceCategoryText: string;
  status: string;
  statusText: string;
  title: string;
  image: string | null;
  actualAmount: number | null;
  bookingDate: string | null;
  bookingTimeSlot: string | null;
  createdAt: string | null;
  ownerId: string;
  ownerName: string;
  ownerPhone: string;
  ownerAvatar: string | null;
  ownerCreatedAt: string | null;
  ownerLastLoginAt: string | null;
  elderName: string | null;
  source: string;
  serviceSummary: string | null;
  originalAmount: number | null;
  discountAmount: number | null;
  payableAmount: number | null;
  paymentChannel: string | null;
  paymentChannelText: string | null;
  paymentStatus: string | null;
  paidAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  contactName: string;
  contactPhone: string;
  addressText: string;
  remark: string | null;
  healthSummary?: unknown;
  aiSummary?: unknown;
  workOrderId: string | null;
  workOrderStatus: string | null;
  assigneeName: string | null;
  agentDispatchSuggestion?: unknown;
  afterSaleId: string | null;
  afterSaleStatus: string | null;
  afterSaleReason: string | null;
}

export interface AdminOrderListResponse {
  list: AdminOrderListItem[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
}

export interface AdminOrdersQuery {
  page?: number;
  pageSize?: number;
  status?: string;
  serviceCategory?: string;
  paymentChannel?: string;
  keyword?: string;
}

export function getAdminOrders(query: AdminOrdersQuery = {}) {
  return request<AdminOrderListResponse>(`/admin/orders${buildQueryString(query)}`, {
    auth: true
  });
}
