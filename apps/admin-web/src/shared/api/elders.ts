import { request } from "@/shared/api/client";
import { buildQueryString } from "@/shared/api/query";

export interface AdminElderListItem {
  elderId: string;
  nickname: string | null;
  realName: string | null;
  displayName: string;
  phone: string;
  avatar: string | null;
  gender: string;
  city: string | null;
  realNameStatus: string;
  createdAt: string | null;
  tags: string[];
  tagCount: number;
}

export interface AdminElderListResponse {
  list: AdminElderListItem[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
}

export interface AdminElderDetailResponse {
  elderId: string;
  nickname: string | null;
  realName: string | null;
  name: string;
  phone: string;
  gender: string;
  birthday: string | null;
  age: number | null;
  avatar: string | null;
  city: string | null;
  realNameStatus: string;
  createdAt: string | null;
  archiveSummary: {
    riskTags?: unknown;
    longTermMemory?: unknown;
    baseProfile?: unknown;
  };
  familyMembers: Array<{
    userId: string;
    name: string;
    relationLabel: string;
    phone: string;
    authScope?: unknown;
  }>;
  recentOrders: Array<{
    orderId: string;
    orderNo: string;
    status: string;
    title: string;
    bookingDate: string | null;
  }>;
  devices: Array<{
    deviceId: string;
    type: string;
    name: string | null;
    status: string;
    batteryLevel: number | null;
  }>;
  reports: Array<{
    reportId: string;
    title: string;
    type: string;
    status: string;
    createdAt: string | null;
    publishedAt: string | null;
  }>;
  medications: Array<{
    medicationId: string;
    name: string;
    dosage: string;
    frequency: string;
    startDate: string | null;
    endDate: string | null;
  }>;
  latestMetrics: Array<{
    metricId: string;
    metricType: string;
    value: number | null;
    unit: string | null;
    abnormal: boolean;
    measuredAt: string | null;
  }>;
  alerts: Array<{
    alertId: string;
    title: string;
    level: string;
    status: string;
    triggeredAt: string | null;
  }>;
}

export interface AdminEldersQuery {
  page?: number;
  pageSize?: number;
  keyword?: string;
  tag?: string;
}

export function getAdminElders(query: AdminEldersQuery = {}) {
  return request<AdminElderListResponse>(`/admin/elders${buildQueryString(query)}`, {
    auth: true
  });
}

export function getAdminElderDetail(elderId: string) {
  return request<AdminElderDetailResponse>(`/admin/elders/${elderId}`, {
    auth: true
  });
}
