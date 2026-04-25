import { request } from "@/shared/api/client";

export interface HealthDeviceItem {
  deviceId: string;
  type: string;
  name: string;
  status: string;
  batteryText: string;
  latestPayload: unknown;
  locationLabel: string | null;
  updatedAt: string | null;
}

function createHealthSearchParams(elderId?: string) {
  const searchParams = new URLSearchParams();

  if (elderId?.trim()) {
    searchParams.set("elderId", elderId.trim());
  }

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : "";
}

export function getHealthDevices(elderId?: string) {
  return request<HealthDeviceItem[]>(`/app/health/devices${createHealthSearchParams(elderId)}`, {
    auth: true
  });
}

export function getHealthDeviceDetail(deviceId: string, elderId?: string) {
  return request<HealthDeviceItem>(`/app/health/devices/${deviceId}${createHealthSearchParams(elderId)}`, {
    auth: true
  });
}

export function unbindHealthDevice(deviceId: string, elderId?: string) {
  return request<{ deleted: boolean }>(`/app/health/devices/${deviceId}${createHealthSearchParams(elderId)}`, {
    method: "DELETE",
    auth: true
  });
}

export interface HealthDeviceMeasurement {
  measurementId: string;
  type: string;
  value: number;
  unit?: string;
  measuredAt: string;
}

export interface HealthDeviceMeasurementsResponse {
  list: HealthDeviceMeasurement[];
  page: number;
  pageSize: number;
  total: number;
}

export function getHealthDeviceMeasurements(deviceId: string, elderId?: string) {
  return request<HealthDeviceMeasurementsResponse>(`/app/health/devices/${deviceId}/measurements${createHealthSearchParams(elderId)}`, {
    auth: true
  });
}
