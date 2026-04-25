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

export interface CurrentUserProfileResponse {
  userId: string;
  nickname: string | null;
  realName: string | null;
  avatar: string | null;
  phone: string;
  city: string | null;
  gender: string | null;
  birthday: string | null;
  realNameStatus: string | null;
  stats?: {
    footprints?: number;
    reviews?: number;
    coupons?: number;
  };
  boundElders?: Array<{
    elderId: string;
    relation: string;
    name: string;
  }>;
}

export interface CurrentUserSecurityResponse {
  userId: string;
  phone: string;
  realNameStatus: string | null;
  hasPassword: boolean;
  lastLoginAt: string | null;
  thirdPartyBindings: Array<{
    provider: string;
    bound: boolean;
  }>;
}

export interface MessageSettingsPayload {
  systemNotice?: boolean;
  orderNotice?: boolean;
  healthAlert?: boolean;
  communityNotice?: boolean;
  smsEnabled?: boolean;
}

export interface CurrentUserSettingsResponse {
  messageSettings: Required<MessageSettingsPayload>;
  privacySettings?: {
    searchableByPhone?: boolean;
    allowFamilyAccessReminder?: boolean;
  };
  commonSettings?: {
    language?: string;
    fontScale?: string;
  };
}

export interface UpdateMessageSettingsResponse {
  updated: boolean;
  messageSettings: Required<MessageSettingsPayload>;
}

export interface UserPointsRecord {
  pointId: string;
  type: "INCOME" | "EXPENSE" | string;
  title: string;
  delta: number;
  balanceAfter: number;
  relatedOrderNo: string | null;
  createdAt: string;
}

export interface UserPointsResponse {
  summary: {
    balance: number;
    totalIncome: number;
    totalExpense: number;
  };
  records: {
    list: UserPointsRecord[];
    page: number;
    pageSize: number;
    total: number;
    hasMore: boolean;
  };
}

export interface UserFootprintItem {
  footprintId: string;
  targetType: "SERVICE" | "ACTIVITY" | string;
  targetId: string;
  title: string;
  coverUrl: string | null;
  metadata?: Record<string, string | number | boolean | null | undefined>;
  viewedAt: string;
}

export interface UserFootprintsResponse {
  list: UserFootprintItem[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
}

export interface UserActivityItem {
  registrationId: string;
  status: "REGISTERED" | "CHECKED_IN" | "CANCELLED" | string;
  registeredAt: string;
  checkedInAt: string | null;
  cancellationReason: string | null;
  activity: {
    activityId: string;
    title: string;
    category: string;
    status: "UPCOMING" | "ONGOING" | "ENDED" | string;
    location: string;
    coverUrl: string | null;
    startAt: string;
    endAt: string;
  };
}

export interface UserActivitiesResponse {
  list: UserActivityItem[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
}

export interface UserCouponItem {
  couponId: string;
  status: "UNUSED" | "USED" | "EXPIRED" | string;
  claimedAt: string;
  usedAt: string | null;
  expiresAt: string;
  orderRemark: string | null;
  template: {
    couponTemplateId: string;
    title: string;
    description: string;
    discountType: string;
    discountValue: number;
    minSpend: number;
  };
}

export interface UserCouponsResponse {
  list: UserCouponItem[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
}

export interface UserReviewItem {
  reviewId: string;
  orderId: string;
  orderNo: string;
  score: number;
  tags: string[];
  content: string;
  createdAt: string;
  service: {
    serviceId: string;
    title: string;
    category: string;
    coverUrl: string | null;
  };
}

export interface UserReviewsResponse {
  list: UserReviewItem[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
}

function toQueryString(query: Record<string, string | number | undefined>) {
  const params = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined) {
      return;
    }

    params.set(key, String(value));
  });

  const text = params.toString();
  return text ? `?${text}` : "";
}

export interface PrivacyAgreementResponse {
  title: string;
  version: string;
  content: string;
}

export interface SendSmsCodeResponse {
  phone: string;
  purpose: string;
  sent: boolean;
  expiresInSeconds: number;
  debugCode?: string;
}

export interface VerifyResetCodeRequest {
  phone: string;
  code: string;
}

export interface ResetPasswordRequest extends VerifyResetCodeRequest {
  newPassword: string;
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
  return request<SendSmsCodeResponse>("/app/auth/sms/send", {
    method: "POST",
    body: {
      phone,
      purpose
    }
  });
}

export function verifyResetCode(payload: VerifyResetCodeRequest) {
  return request<{ verified: boolean }>("/app/auth/password/verify-code", {
    method: "POST",
    body: payload
  });
}

export function resetPassword(payload: ResetPasswordRequest) {
  return request<{ reset: boolean }>("/app/auth/password/reset", {
    method: "POST",
    body: payload
  });
}

export function getCurrentUser() {
  return request<CurrentUserResponse>("/app/users/me", {
    auth: true
  });
}

export function getCurrentUserProfile() {
  return request<CurrentUserProfileResponse>("/app/users/me/profile", {
    auth: true
  });
}

export function submitRealName(payload: { realName: string; idCard: string }) {
  return request<{ verified?: boolean; realName?: string }>("/app/users/me/real-name", {
    method: "PUT",
    auth: true,
    body: payload
  });
}

export function updateUserProfile(payload: {
  nickname?: string;
  avatar?: string;
  city?: string;
  gender?: "MALE" | "FEMALE" | "UNKNOWN";
  birthday?: string;
}) {
  return request<{ updated?: boolean; profile?: Partial<CurrentUserProfileResponse> }>("/app/users/me/profile", {
    method: "PUT",
    auth: true,
    body: payload
  });
}

export function getCurrentUserSecurity() {
  return request<CurrentUserSecurityResponse>("/app/users/me/security", {
    auth: true
  });
}

export function getCurrentUserSettings() {
  return request<CurrentUserSettingsResponse>("/app/users/me/settings", {
    auth: true
  });
}

export function updateMessageSettings(payload: MessageSettingsPayload) {
  return request<UpdateMessageSettingsResponse>("/app/users/me/settings/message", {
    method: "PUT",
    auth: true,
    body: payload
  });
}

export function getUserPoints(query: { page?: number; pageSize?: number } = {}) {
  return request<UserPointsResponse>(`/app/users/me/points${toQueryString(query)}`, {
    auth: true
  });
}

export function getUserFootprints(query: { page?: number; pageSize?: number } = {}) {
  return request<UserFootprintsResponse>(`/app/users/me/footprints${toQueryString(query)}`, {
    auth: true
  });
}

export function clearUserFootprints() {
  return request<{ cleared?: boolean } | UserFootprintsResponse>("/app/users/me/footprints", {
    method: "DELETE",
    auth: true
  });
}

export function getUserActivities(query: { page?: number; pageSize?: number } = {}) {
  return request<UserActivitiesResponse>(`/app/users/me/activities${toQueryString(query)}`, {
    auth: true
  });
}

export function getUserCoupons(query: {
  status?: "UNUSED" | "USED" | "EXPIRED";
  page?: number;
  pageSize?: number;
} = {}) {
  return request<UserCouponsResponse>(`/app/users/me/coupons${toQueryString(query)}`, {
    auth: true
  });
}

export function getUserReviews(query: { page?: number; pageSize?: number } = {}) {
  return request<UserReviewsResponse>(`/app/users/me/reviews${toQueryString(query)}`, {
    auth: true
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
