import { request } from "@/shared/api/client";
import { buildQueryString } from "@/shared/api/query";

export interface AdminHealthAlertListItem {
  alertId: string;
  level: string;
  levelText: string;
  status: string;
  statusText: string;
  sourceType: string;
  title: string;
  summary: string;
  relatedMetric: string | null;
  ownerId: string;
  ownerName: string;
  ownerPhone: string;
  ownerAvatar: string | null;
  followUpSuggestion: string;
  triggeredAt: string | null;
  handledAt: string | null;
}

export interface AdminHealthAlertDetail extends AdminHealthAlertListItem {
  suggestion: Record<string, unknown>;
  riskSignals: string[];
  followUpSuggestions: string[];
  archiveTags: string[];
  metricValue: string | number | null;
  handlerName: string | null;
}

export interface AdminHealthAlertsResponse {
  title: string;
  summary: string;
  levelOptions: string[];
  statusOptions: string[];
  list: AdminHealthAlertListItem[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
}

export interface AdminHealthAlertsQuery {
  page?: number;
  pageSize?: number;
  level?: string;
  status?: string;
  keyword?: string;
}

export function getAdminHealthAlerts(query: AdminHealthAlertsQuery = {}) {
  return request<AdminHealthAlertsResponse>(`/admin/health-alerts${buildQueryString(query)}`, {
    auth: true
  });
}

export function getAdminHealthAlertDetail(alertId: string) {
  return request<AdminHealthAlertDetail>(`/admin/health-alerts/${alertId}`, {
    auth: true
  });
}
