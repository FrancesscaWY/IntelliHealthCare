import { request } from "@/shared/api/client";
import { buildQueryString } from "@/shared/api/query";

export interface AdminWorkOrderListItem {
  workOrderId: string;
  orderId: string;
  orderNo: string;
  status: string;
  statusText: string;
  serviceCategory: string;
  serviceCategoryText: string;
  serviceTitle: string;
  serviceSummary: string | null;
  serviceCover: string | null;
  assigneeName: string | null;
  institutionName: string | null;
  customerName: string;
  customerPhone: string;
  customerAvatar: string | null;
  bookingDate: string | null;
  bookingTimeSlot: string | null;
  scheduleAt: string | null;
  createdAt: string | null;
  payableAmount: number | null;
  dispatchNote: string | null;
  agentDispatchSuggestion?: unknown;
}

export interface AdminWorkOrderListResponse {
  list: AdminWorkOrderListItem[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
}

export interface AdminWorkOrdersQuery {
  page?: number;
  pageSize?: number;
  status?: string;
  serviceCategory?: string;
  keyword?: string;
}

export function getAdminWorkOrders(query: AdminWorkOrdersQuery = {}) {
  return request<AdminWorkOrderListResponse>(
    `/admin/work-orders${buildQueryString(query)}`,
    {
      auth: true
    }
  );
}
