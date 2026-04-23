import { request } from "@/shared/api/client";
import { buildQueryString } from "@/shared/api/query";

export interface AdminReportListItem {
  reportId: string;
  title: string;
  type: string;
  typeText: string;
  status: string;
  createdAt: string | null;
  publishedAt: string | null;
  elderId: string | null;
  elderName: string | null;
  elderPhone: string | null;
  source: string;
  uploader: string;
  orderId: string | null;
  orderNo: string | null;
  reportDate: string | null;
}

export interface AdminReportListResponse {
  list: AdminReportListItem[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
}

export interface AdminReportsQuery {
  page?: number;
  pageSize?: number;
  status?: string;
  type?: string;
  keyword?: string;
}

export function getAdminReports(query: AdminReportsQuery = {}) {
  return request<AdminReportListResponse>(`/admin/reports${buildQueryString(query)}`, {
    auth: true
  });
}
