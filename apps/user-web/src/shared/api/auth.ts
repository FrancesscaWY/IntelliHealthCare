import { request } from "@/shared/api/client";

export interface LoginRequest {
  phone: string;
  password: string;
  agreePrivacy?: boolean;
  deviceId?: string;
}

export interface SmsLoginRequest {
  phone: string;
  code: string;
}

export interface ThirdPartyLoginRequest {
  phone?: string;
  provider?: string;
}

export interface LoginResponse {
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

export interface CurrentUserResponse {
  userId: string;
  name: string;
  phone: string;
  avatar: string | null;
  gender: string | null;
  birthday: string | null;
  realNameVerified: boolean;
  type: string;
  roles: string[];
}

export interface PrivacyAgreementResponse {
  title: string;
  version: string;
  content: string;
}

export function loginWithPassword(payload: LoginRequest) {
  return request<LoginResponse>("/app/auth/login/password", {
    method: "POST",
    body: payload
  });
}

export function loginWithSms(payload: SmsLoginRequest) {
  return request<LoginResponse>("/app/auth/login/sms", {
    method: "POST",
    body: payload
  });
}

export function loginWithThirdParty(payload: ThirdPartyLoginRequest) {
  return request<LoginResponse>("/app/auth/login/third-party", {
    method: "POST",
    body: payload
  });
}

export function sendSmsCode(phone: string, purpose = "login") {
  return request<{ sent: boolean; debugCode?: string }>("/app/auth/sms/send", {
    method: "POST",
    body: {
      phone,
      purpose
    }
  });
}

export function getCurrentUser() {
  return request<CurrentUserResponse>("/app/users/me", {
    auth: true
  });
}

export function submitRealName(payload: { realName: string; idCard: string }) {
  return request<{ verified?: boolean }>("/app/users/me/real-name", {
    method: "PUT",
    auth: true,
    body: payload
  });
}

export function updateUserProfile(payload: {
  gender?: "MALE" | "FEMALE" | "UNKNOWN";
  birthday?: string;
}) {
  return request("/app/users/me/profile", {
    method: "PUT",
    auth: true,
    body: payload
  });
}

export function logout() {
  return request<{ loggedOut: boolean }>("/app/auth/logout", {
    method: "POST",
    auth: true
  });
}

export function getPrivacyAgreement() {
  return request<PrivacyAgreementResponse>("/app/agreements/privacy");
}
