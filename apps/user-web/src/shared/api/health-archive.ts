import { request } from "@/shared/api/client";

export interface ArchiveEmergencyContact {
  name?: string | null;
  phone?: string | null;
  relation?: string | null;
  [key: string]: unknown;
}

export interface ArchiveBasicInfo {
  avatar: string | null;
  name: string | null;
  idCard: string | null;
  gender: string | null;
  birthday: string | null;
  phone: string | null;
  address: string | null;
  height: number | null;
  weight: number | null;
  nativePlace: string | null;
  ethnicity: string | null;
  education: string | null;
  maritalStatus: string | null;
  occupation: string | null;
  bloodType: string | null;
  emergencyContact: ArchiveEmergencyContact | null;
}

export interface UpdateArchiveBasicInfoPayload {
  elderId?: string;
  avatar?: string;
  name?: string;
  phone?: string;
  birthday?: string;
  address?: string;
  height?: number;
  weight?: number;
  education?: string;
  occupation?: string;
  emergencyContact?: Record<string, unknown>;
}

export interface ArchiveMedicalHistory {
  medicalHistory: Record<string, unknown> | null;
  riskTags: unknown[] | null;
  longTermMemory: Record<string, unknown> | null;
}

export function getArchiveBasicInfo(params?: { elderId?: string }) {
  const search = new URLSearchParams();

  if (params?.elderId) {
    search.set("elderId", params.elderId);
  }

  const suffix = search.size > 0 ? `?${search.toString()}` : "";
  return request<ArchiveBasicInfo>(`/app/health/archive/basic-info${suffix}`, {
    auth: true
  });
}

export function updateArchiveBasicInfo(payload: UpdateArchiveBasicInfoPayload) {
  const search = new URLSearchParams();
  const body: Record<string, unknown> = { ...payload };

  if (payload.elderId) {
    search.set("elderId", payload.elderId);
  }

  delete body.elderId;

  const suffix = search.size > 0 ? `?${search.toString()}` : "";
  return request<ArchiveBasicInfo>(`/app/health/archive/basic-info${suffix}`, {
    method: "PUT",
    auth: true,
    body
  });
}

export function getArchiveMedicalHistory(params?: { elderId?: string }) {
  const search = new URLSearchParams();

  if (params?.elderId) {
    search.set("elderId", params.elderId);
  }

  const suffix = search.size > 0 ? `?${search.toString()}` : "";
  return request<ArchiveMedicalHistory>(`/app/health/archive/medical-history${suffix}`, {
    auth: true
  });
}
