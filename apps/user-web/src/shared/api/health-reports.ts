import { request } from "@/shared/api/client";

export interface ReportListItem {
  reportId: string;
  type: string;
  status: string;
  title: string;
  createdAt: string;
  publishedAt: string | null;
}

export interface PaginatedResponse<T> {
  list: T[];
  page: number;
  pageSize: number;
  total: number;
}

export interface CheckupReportAttachment {
  fileId?: string | null;
  fileName?: string | null;
  url?: string | null;
  mimeType?: string | null;
}

export interface CheckupReportDetail {
  reportId: string;
  type: string;
  status: string;
  title: string;
  summary: Record<string, unknown> | null;
  attachment: CheckupReportAttachment | null;
  reviewedAt: string | null;
  publishedAt: string | null;
  createdAt: string;
}

export interface CreateCheckupReportRequest {
  elderId?: string;
  title: string;
  summary: Record<string, unknown>;
  attachment?: Record<string, unknown>;
}

export interface CheckupReportInterpretationResponse {
  reportId: string;
  interpretation: string;
  followupSuggestions: string[];
}

export function listCheckupReports(params?: {
  elderId?: string;
  page?: number;
  pageSize?: number;
}) {
  const search = new URLSearchParams();

  if (params?.elderId) {
    search.set("elderId", params.elderId);
  }
  if (params?.page) {
    search.set("page", String(params.page));
  }
  if (params?.pageSize) {
    search.set("pageSize", String(params.pageSize));
  }

  const suffix = search.size > 0 ? `?${search.toString()}` : "";
  return request<PaginatedResponse<ReportListItem>>(`/app/health/reports/checkups${suffix}`, {
    auth: true
  });
}

export function createCheckupReport(payload: CreateCheckupReportRequest) {
  return request<ReportListItem>("/app/health/reports/checkups", {
    method: "POST",
    auth: true,
    body: payload
  });
}

export function getCheckupReport(reportId: string) {
  return request<CheckupReportDetail>(`/app/health/reports/checkups/${reportId}`, {
    auth: true
  });
}

export function deleteCheckupReport(reportId: string) {
  return request<{ deleted: boolean }>(`/app/health/reports/checkups/${reportId}`, {
    method: "DELETE",
    auth: true
  });
}

export function getCheckupReportInterpretation(reportId: string) {
  return request<CheckupReportInterpretationResponse>(
    `/app/health/reports/checkups/${reportId}/interpretation`,
    {
      auth: true
    }
  );
}
