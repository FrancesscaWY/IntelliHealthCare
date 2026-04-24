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

export interface CreateAdminElderPayload {
  realName: string;
  phone: string;
  nickname?: string;
  gender?: string;
  birthday?: string;
  ethnicity?: string;
  education?: string;
  maritalStatus?: string;
  bloodType?: string;
  city?: string;
  address?: string;
  tags?: string[];
  emergencyContact?: Record<string, unknown>;
}

export function getAdminElders(query: AdminEldersQuery = {}) {
  return request<AdminElderListResponse>(`/admin/elders${buildQueryString(query)}`, {
    auth: true
  });
}

export function createAdminElder(payload: CreateAdminElderPayload) {
  return request<any>("/admin/elders", {
    method: "POST",
    auth: true,
    body: payload
  });
}

export function deleteAdminElder(elderId: string) {
  return request<any>(`/admin/elders/${elderId}`, {
    method: "DELETE",
    auth: true
  });
}

export function batchUpdateAdminElderTags(payload: {
  elderIds: string[];
  tags: string[];
}) {
  return request<any>("/admin/elders/tags/batch", {
    method: "POST",
    auth: true,
    body: payload
  });
}

export function getAdminElderDetail(elderId: string) {
  return request<AdminElderDetailResponse>(`/admin/elders/${elderId}`, {
    auth: true
  });
}

export function getAdminElderProfile(elderId: string) {
  return request<any>(`/admin/elders/${elderId}/profile`, {
    auth: true
  });
}

export function getAdminElderHealth(elderId: string) {
  return request<any>(`/admin/elders/${elderId}/health`, {
    auth: true
  });
}

export function getAdminElderMedication(elderId: string) {
  return request<any>(`/admin/elders/${elderId}/medication`, {
    auth: true
  });
}

export function getAdminElderMetrics(elderId: string) {
  return request<any>(`/admin/elders/${elderId}/metrics`, {
    auth: true
  });
}

export function getAdminElderDevices(elderId: string) {
  return request<any>(`/admin/elders/${elderId}/devices`, {
    auth: true
  });
}

export function getAdminElderReports(elderId: string) {
  return request<any>(`/admin/elders/${elderId}/reports`, {
    auth: true
  });
}

export function getAdminElderOrders(elderId: string) {
  return request<any>(`/admin/elders/${elderId}/orders`, {
    auth: true
  });
}

export function getAdminElderAssets(elderId: string) {
  return request<any>(`/admin/elders/${elderId}/assets`, {
    auth: true
  });
}

export function getAdminElderContents(elderId: string) {
  return request<any>(`/admin/elders/${elderId}/contents`, {
    auth: true
  });
}

export function getAdminElderServiceRecords(elderId: string) {
  return request<any>(`/admin/elders/${elderId}/service-records`, {
    auth: true
  });
}
