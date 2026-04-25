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

export function bindHealthDevice(deviceId: string, elderId?: string) {
  return request<HealthDeviceItem>(`/app/health/devices/bind${createHealthSearchParams(elderId)}`, {
    method: "POST",
    body: { deviceId },
    auth: true
  });
}

export function scanBindHealthDevice(scanData: string, elderId?: string) {
  return request<HealthDeviceItem>(`/app/health/devices/scan/bind${createHealthSearchParams(elderId)}`, {
    method: "POST",
    body: { scanData },
    auth: true
  });
}

export function updateDevicePassword(deviceId: string, password: string, elderId?: string) {
  return request<{ deviceId: string; settings: Record<string, unknown> }>(
    `/app/health/devices/${deviceId}/password${createHealthSearchParams(elderId)}`,
    {
      method: "PUT",
      body: { password },
      auth: true
    }
  );
}

export function updateDeviceSettings(
  deviceId: string,
  settings: Record<string, unknown>,
  elderId?: string
) {
  return request<{ deviceId: string; settings: Record<string, unknown> }>(
    `/app/health/devices/${deviceId}/settings${createHealthSearchParams(elderId)}`,
    {
      method: "PUT",
      body: { settings },
      auth: true
    }
  );
}

export function updateHeartRateSettings(
  deviceId: string,
  settings: Record<string, unknown>,
  elderId?: string
) {
  return request<{ deviceId: string; settings: Record<string, unknown> }>(
    `/app/health/devices/${deviceId}/heart-rate-settings${createHealthSearchParams(elderId)}`,
    {
      method: "PUT",
      body: { settings },
      auth: true
    }
  );
}

export type HealthMetricKey =
  | "steps"
  | "heartRate"
  | "sleep"
  | "weight"
  | "bloodSugar"
  | "bloodPressure"
  | "oxygen"
  | "stress";

export interface HealthDeviceMeasurement {
  recordId: string;
  metricKey: HealthMetricKey;
  label?: string | null;
  value: number | null;
  displayValue?: string | number | null;
  unit?: string | null;
  payload?: Record<string, unknown> | null;
  note?: string | null;
  abnormal?: boolean;
  deviceId?: string | null;
  measuredAt: string;
}

type LegacyHealthDeviceMeasurement = {
  measurementId: string;
  type: HealthMetricKey;
  value: number;
  unit?: string;
  measuredAt: string;
};

type HealthDeviceMeasurementsApiResponse =
  | HealthDeviceMeasurement[]
  | {
      list: Array<HealthDeviceMeasurement | LegacyHealthDeviceMeasurement>;
      page?: number;
      pageSize?: number;
      total?: number;
    };

function normalizeHealthDeviceMeasurement(
  measurement: HealthDeviceMeasurement | LegacyHealthDeviceMeasurement
): HealthDeviceMeasurement {
  if ("recordId" in measurement) {
    return measurement;
  }

  return {
    recordId: measurement.measurementId,
    metricKey: measurement.type,
    value: measurement.value,
    unit: measurement.unit ?? null,
    measuredAt: measurement.measuredAt
  };
}

export async function getHealthDeviceMeasurements(deviceId: string, elderId?: string) {
  const data = await request<HealthDeviceMeasurementsApiResponse>(
    `/app/health/devices/${deviceId}/measurements${createHealthSearchParams(elderId)}`,
    {
      auth: true
    }
  );

  const list = Array.isArray(data) ? data : Array.isArray(data.list) ? data.list : [];
  return list.map(normalizeHealthDeviceMeasurement);
}

export interface HealthMetricRecordsResponse {
  list: HealthDeviceMeasurement[];
  page: number;
  pageSize: number;
  total: number;
}

export function getHealthMetricRecords(
  metricKey: HealthMetricKey,
  options?: {
    page?: number;
    pageSize?: number;
    elderId?: string;
  }
) {
  const searchParams = new URLSearchParams();

  if (options?.page) {
    searchParams.set("page", String(options.page));
  }

  if (options?.pageSize) {
    searchParams.set("pageSize", String(options.pageSize));
  }

  if (options?.elderId?.trim()) {
    searchParams.set("elderId", options.elderId.trim());
  }

  const queryString = searchParams.toString();
  return request<HealthMetricRecordsResponse>(
    `/app/health/metrics/${metricKey}/records${queryString ? `?${queryString}` : ""}`,
    {
      auth: true
    }
  );
}

export interface MedicationItem {
  medicationId: string;
  name: string;
  dosage: string;
  frequency: string;
  mealTiming: string | null;
  route: string | null;
  indication: string | null;
  scheduleTimes: string[];
  startDate: string;
  endDate: string | null;
  active: boolean;
  logs: Array<{
    logId: string;
    scheduledAt: string;
    takenAt: string | null;
    status: string;
    note: string | null;
  }>;
}

export interface TodayMedicationsResponse {
  date: string;
  list: MedicationItem[];
}

export function getTodayMedications(elderId?: string) {
  return request<TodayMedicationsResponse>(`/app/health/medications/today${createHealthSearchParams(elderId)}`, {
    auth: true
  });
}

export function getHealthMedications(elderId?: string) {
  return request<MedicationItem[]>(`/app/health/medications${createHealthSearchParams(elderId)}`, {
    auth: true
  });
}

export function deleteHealthMedication(medicationId: string, elderId?: string) {
  return request<{ deleted: boolean }>(
    `/app/health/medications/${medicationId}${createHealthSearchParams(elderId)}`,
    {
      method: "DELETE",
      auth: true
    }
  );
}

export interface CreateMedicationParams {
  elderId?: string;
  name: string;
  dosage: string;
  frequency: string;
  mealTiming?: string;
  route?: string;
  indication?: string;
  scheduleTimes?: string[];
  startDate: string;
  endDate?: string;
}

export function createHealthMedication(params: CreateMedicationParams) {
  const { elderId, ...body } = params;
  return request<MedicationItem>(`/app/health/medications${createHealthSearchParams(elderId)}`, {
    method: "POST",
    body,
    auth: true
  });
}

export interface CreateMetricRecordParams {
  elderId?: string;
  deviceId?: string;
  value?: number;
  unit?: string;
  payload?: Record<string, unknown>;
  note?: string;
  measuredAt?: string;
}

export function createHealthMetricRecord(
  metricKey: HealthMetricKey,
  params: CreateMetricRecordParams
) {
  const { elderId, ...body } = params;
  return request<{ recordId: string; created: boolean }>(
    `/app/health/metrics/${metricKey}/records${createHealthSearchParams(elderId)}`,
    {
      method: "POST",
      body,
      auth: true
    }
  );
}

export function updateHealthMetricRecord(
  metricKey: HealthMetricKey,
  recordId: string,
  params: CreateMetricRecordParams
) {
  const { elderId, ...body } = params;
  return request<{ updated: boolean; recordId: string }>(
    `/app/health/metrics/${metricKey}/records/${recordId}${createHealthSearchParams(elderId)}`,
    {
      method: "PUT",
      body,
      auth: true
    }
  );
}

export function deleteHealthMetricRecord(
  metricKey: HealthMetricKey,
  recordId: string,
  elderId?: string
) {
  return request<{ deleted: boolean; recordId: string }>(
    `/app/health/metrics/${metricKey}/records/${recordId}${createHealthSearchParams(elderId)}`,
    {
      method: "DELETE",
      auth: true
    }
  );
}

// ─── 指标趋势 ─────────────────────────────────────────

export interface TrendDataPoint {
  date: string;
  value: number;
  /** 血压收缩压（仅血压指标） */
  systolic?: number;
  /** 血压舒张压（仅血压指标） */
  diastolic?: number;
  /** 睡眠深度睡眠（仅睡眠指标） */
  deepSleep?: number;
  /** 睡眠浅睡眠（仅睡眠指标） */
  lightSleep?: number;
  /** 睡眠 REM（仅睡眠指标） */
  remSleep?: number;
  /** 额外元数据 */
  payload?: Record<string, unknown>;
}

export interface HealthMetricTrendResponse {
  metricKey: HealthMetricKey;
  list: TrendDataPoint[];
  summary?: {
    avg: number;
    min: number;
    max: number;
    latest: number;
  };
}

/**
 * 获取单项指标趋势数据
 * GET /app/health/metrics/{metricKey}/trend
 */
export function getHealthMetricTrend(
  metricKey: HealthMetricKey,
  options?: {
    days?: number;
    elderId?: string;
  }
) {
  const searchParams = new URLSearchParams();

  if (options?.days) {
    searchParams.set("days", String(options.days));
  }

  if (options?.elderId?.trim()) {
    searchParams.set("elderId", options.elderId.trim());
  }

  const queryString = searchParams.toString();
  return request<HealthMetricTrendResponse>(
    `/app/health/metrics/${metricKey}/trend${queryString ? `?${queryString}` : ""}`,
    { auth: true }
  );
}

// ─── 健康指标总览 ─────────────────────────────────────

export interface HealthMetricOverviewItem {
  metricKey: HealthMetricKey;
  label: string;
  value: number | null;
  displayValue?: string | number | null;
  unit: string | null;
  status?: string | null;
  trend?: "up" | "down" | "stable" | null;
  updatedAt: string | null;
}

export interface HealthMetricsOverviewResponse {
  list: HealthMetricOverviewItem[];
}

/**
 * 获取健康指标总览
 * GET /app/health/metrics/overview
 */
export function getHealthMetricsOverview(elderId?: string) {
  return request<HealthMetricsOverviewResponse>(
    `/app/health/metrics/overview${createHealthSearchParams(elderId)}`,
    { auth: true }
  );
}

