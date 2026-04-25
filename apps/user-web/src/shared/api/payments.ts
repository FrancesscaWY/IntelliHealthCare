import { request } from "@/shared/api/client";

export type PaymentChannelCode = "ALIPAY" | "WECHAT" | string;

export interface PaymentChannelItem {
  code: PaymentChannelCode;
  name: string;
}

export interface PaymentChannelsResponse {
  list: PaymentChannelItem[];
}

export interface CreatePaymentRequest {
  orderId: string;
  channel: PaymentChannelCode;
}

export interface PaymentDetailResponse {
  paymentId: string;
  orderId: string;
  amount: number;
  status: string;
  paidAt?: string | null;
}

export function getPaymentChannels() {
  return request<PaymentChannelsResponse>("/app/payments/channels", {
    auth: true
  });
}

export function createPayment(payload: CreatePaymentRequest) {
  return request<PaymentDetailResponse>("/app/payments", {
    method: "POST",
    auth: true,
    body: payload
  });
}

export function getPaymentDetail(paymentId: string) {
  return request<PaymentDetailResponse>(`/app/payments/${paymentId}`, {
    auth: true
  });
}

export function confirmPayment(paymentId: string) {
  return request<PaymentDetailResponse>(`/app/payments/${paymentId}/confirm`, {
    method: "POST",
    auth: true
  });
}
