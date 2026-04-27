import { request } from "@/shared/api/client";
import type { PaginatedResponse } from "@/shared/api/ai";

export interface CheckupReportCard {
  reportId: string;
  type: string;
  status: string;
  title: string;
  createdAt: string;
  publishedAt: string | null;
}

export type CheckupReportAttachmentPreviewKind =
  | "image"
  | "pdf"
  | "video"
  | "unsupported";

export interface CheckupReportAttachment {
  fileId: string | null;
  fileName: string;
  url: string | null;
  mimeType: string | null;
  previewKind: CheckupReportAttachmentPreviewKind;
}

export interface CheckupReportDetail {
  reportId: string;
  type: string;
  status: string;
  title: string;
  summary: Record<string, unknown>;
  attachment: CheckupReportAttachment | null;
  reviewedAt: string | null;
  publishedAt: string | null;
  createdAt: string;
}

function buildQueryString(params: Record<string, unknown>) {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") {
      continue;
    }

    searchParams.set(key, String(value));
  }

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : "";
}

export function listCheckupReports(params: {
  page?: number;
  pageSize?: number;
  elderId?: string;
} = {}) {
  return request<PaginatedResponse<CheckupReportCard>>(
    `/app/health/reports/checkups${buildQueryString({
      page: params.page ?? 1,
      pageSize: params.pageSize ?? 20,
      elderId: params.elderId
    })}`,
    {
      auth: true
    }
  );
}

export function getCheckupReport(reportId: string) {
  return request<CheckupReportDetail>(`/app/health/reports/checkups/${reportId}`, {
    auth: true
  });
}
