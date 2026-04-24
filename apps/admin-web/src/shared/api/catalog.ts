import { request } from "@/shared/api/client";
import { buildQueryString } from "@/shared/api/query";

export function getAdminProducts(query: {
  page?: number;
  pageSize?: number;
  category?: string;
  status?: string;
  keyword?: string;
} = {}) {
  return request<any>(`/admin/products${buildQueryString(query)}`, {
    auth: true
  });
}

export function getAdminProductEditorOptions() {
  return request<any>("/admin/products/editor/options", {
    auth: true
  });
}

export function getAdminProductDetail(productId: string) {
  return request<any>(`/admin/products/${productId}`, {
    auth: true
  });
}

export function createAdminProduct(payload: Record<string, unknown>) {
  return request<any>("/admin/products", {
    method: "POST",
    auth: true,
    body: payload
  });
}

export function updateAdminProduct(productId: string, payload: Record<string, unknown>) {
  return request<any>(`/admin/products/${productId}`, {
    method: "PUT",
    auth: true,
    body: payload
  });
}

export function updateAdminProductStatus(productId: string, payload: { enabled: boolean }) {
  return request<any>(`/admin/products/${productId}/status`, {
    method: "PUT",
    auth: true,
    body: payload
  });
}

export function deleteAdminProduct(productId: string) {
  return request<any>(`/admin/products/${productId}`, {
    method: "DELETE",
    auth: true
  });
}

export function getAdminStaffs(query: {
  page?: number;
  pageSize?: number;
  serviceType?: string;
  tag?: string;
} = {}) {
  return request<any>(`/admin/staffs${buildQueryString(query)}`, {
    auth: true
  });
}

export function updateAdminStaffStatus(staffId: string, payload: { enabled: boolean }) {
  return request<any>(`/admin/staffs/${staffId}/status`, {
    method: "PUT",
    auth: true,
    body: payload
  });
}

export function getAdminStaffApplications(query: {
  page?: number;
  pageSize?: number;
  status?: string;
  serviceType?: string;
} = {}) {
  return request<any>(`/admin/staff-applications${buildQueryString(query)}`, {
    auth: true
  });
}

export function getAdminStaffApplicationDetail(applicationId: string) {
  return request<any>(`/admin/staff-applications/${applicationId}`, {
    auth: true
  });
}

export function reviewAdminStaffApplication(
  applicationId: string,
  payload: {
    status: string;
    remark?: string;
  }
) {
  return request<any>(`/admin/staff-applications/${applicationId}/review`, {
    method: "PUT",
    auth: true,
    body: payload
  });
}
