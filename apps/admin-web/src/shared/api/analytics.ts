import { request } from "@/shared/api/client";
import { buildQueryString } from "@/shared/api/query";

export function getAnalyticsDataBoard(query: {
  range?: "weekly" | "monthly";
} = {}) {
  return request<any>(`/admin/analytics/data-board${buildQueryString(query)}`, {
    auth: true
  });
}

export function getAnalyticsTradeOverview() {
  return request<any>("/admin/analytics/trade-overview", {
    auth: true
  });
}

export function getAnalyticsProductAnalysis(query: {
  page?: number;
  pageSize?: number;
  keyword?: string;
} = {}) {
  return request<any>(`/admin/analytics/product-analysis${buildQueryString(query)}`, {
    auth: true
  });
}

export function getAnalyticsServicePerformance(query: {
  page?: number;
  pageSize?: number;
  keyword?: string;
} = {}) {
  return request<any>(`/admin/analytics/service-performance${buildQueryString(query)}`, {
    auth: true
  });
}

export function getAnalyticsServiceRepurchase(query: {
  page?: number;
  pageSize?: number;
  keyword?: string;
} = {}) {
  return request<any>(`/admin/analytics/service-repurchase${buildQueryString(query)}`, {
    auth: true
  });
}

export function getAnalyticsServiceReview(query: {
  page?: number;
  pageSize?: number;
  keyword?: string;
} = {}) {
  return request<any>(`/admin/analytics/service-review${buildQueryString(query)}`, {
    auth: true
  });
}

export function getAnalyticsServiceWorkOrder(query: {
  page?: number;
  pageSize?: number;
  keyword?: string;
} = {}) {
  return request<any>(`/admin/analytics/service-workorder${buildQueryString(query)}`, {
    auth: true
  });
}

export function getAnalyticsUserAge() {
  return request<any>("/admin/analytics/user-age", {
    auth: true
  });
}

export function getAnalyticsUserGender() {
  return request<any>("/admin/analytics/user-gender", {
    auth: true
  });
}

export function getAnalyticsUserSocial(query: {
  page?: number;
  pageSize?: number;
  keyword?: string;
} = {}) {
  return request<any>(`/admin/analytics/user-social${buildQueryString(query)}`, {
    auth: true
  });
}
