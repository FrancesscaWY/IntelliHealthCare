import { request } from "@/shared/api/client";

export interface AdminLoginRequest {
  phone: string;
  password: string;
  agreePrivacy?: boolean;
  deviceId?: string;
}

export interface AdminLoginResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: string | number;
  user: {
    userId: string;
    phone: string;
    type: string;
    roles: string[];
    realName: string | null;
  };
}

export interface AdminCurrentUserResponse {
  id: string;
  phone: string;
  type: string;
  roles: string[];
  scope: string;
  realName: string | null;
}

export interface AdminPrivacyAgreementResponse {
  title: string;
  version: string;
  content: string;
}

export function loginWithPassword(payload: AdminLoginRequest) {
  return request<AdminLoginResponse>("/admin/auth/login/password", {
    method: "POST",
    body: payload
  });
}

export function getCurrentAdmin() {
  return request<AdminCurrentUserResponse>("/admin/auth/me", {
    auth: true
  });
}

export function getPrivacyAgreement() {
  return request<AdminPrivacyAgreementResponse>("/app/agreements/privacy");
}
