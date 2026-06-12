import { request } from "@/shared/api/client";
import { buildQueryString } from "@/shared/api/query";

export function getAdminInstitutions(query: {
  page?: number;
  pageSize?: number;
  region?: string;
  status?: string;
} = {}) {
  return request<any>(`/admin/institutions${buildQueryString(query)}`, {
    auth: true
  });
}

export function getAdminInstitutionDetail(institutionId: string) {
  return request<any>(`/admin/institutions/${institutionId}`, {
    auth: true
  });
}

export function createAdminInstitution(payload: Record<string, unknown>) {
  return request<any>("/admin/institutions", {
    method: "POST",
    auth: true,
    body: payload
  });
}

export function updateAdminInstitution(institutionId: string, payload: Record<string, unknown>) {
  return request<any>(`/admin/institutions/${institutionId}`, {
    method: "PUT",
    auth: true,
    body: payload
  });
}

export function publishAdminInstitution(institutionId: string) {
  return request<any>(`/admin/institutions/${institutionId}/publish`, {
    method: "POST",
    auth: true
  });
}

export function unpublishAdminInstitution(institutionId: string) {
  return request<any>(`/admin/institutions/${institutionId}/unpublish`, {
    method: "POST",
    auth: true
  });
}

export function batchDeleteAdminInstitutions(payload: { institutionIds: string[] }) {
  return request<any>("/admin/institutions/batch-delete", {
    method: "POST",
    auth: true,
    body: payload
  });
}

export function getAdminAccounts(query: {
  page?: number;
  pageSize?: number;
  role?: string;
  status?: string;
} = {}) {
  return request<any>(`/admin/accounts${buildQueryString(query)}`, {
    auth: true
  });
}

export function createAdminAccount(payload: Record<string, unknown>) {
  return request<any>("/admin/accounts", {
    method: "POST",
    auth: true,
    body: payload
  });
}

export function updateAdminAccount(accountId: string, payload: Record<string, unknown>) {
  return request<any>(`/admin/accounts/${accountId}`, {
    method: "PUT",
    auth: true,
    body: payload
  });
}

export function updateAdminAccountStatus(accountId: string, payload: { enabled: boolean }) {
  return request<any>(`/admin/accounts/${accountId}/status`, {
    method: "PUT",
    auth: true,
    body: payload
  });
}

export function batchUpdateAdminAccountStatus(payload: {
  accountIds: string[];
  enabled: boolean;
}) {
  return request<any>("/admin/accounts/batch-status", {
    method: "POST",
    auth: true,
    body: payload
  });
}

export function deleteAdminAccount(accountId: string) {
  return request<any>(`/admin/accounts/${accountId}`, {
    method: "DELETE",
    auth: true
  });
}

export function getAdminRoles() {
  return request<any>("/admin/roles", {
    auth: true
  });
}

export function createAdminRole(payload: Record<string, unknown>) {
  return request<any>("/admin/roles", {
    method: "POST",
    auth: true,
    body: payload
  });
}

export function updateAdminRole(roleId: string, payload: Record<string, unknown>) {
  return request<any>(`/admin/roles/${roleId}`, {
    method: "PUT",
    auth: true,
    body: payload
  });
}

export function deleteAdminRole(roleId: string) {
  return request<any>(`/admin/roles/${roleId}`, {
    method: "DELETE",
    auth: true
  });
}
