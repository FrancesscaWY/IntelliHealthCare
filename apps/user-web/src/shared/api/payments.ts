import { request } from "@/shared/api/client";

export type PaymentChannel = "WECHAT" | "ALIPAY" | "BALANCE" | "OFFLINE";
export type PaymentStatus = "PENDING" | "PAID" | "FAILED" | "REFUNDED" | "CLOSED";

export interface CreatePaymentParams {
  orderId: string;
  channel: PaymentChannel;
}

export interface PaymentChannelOption {
  channel: PaymentChannel;
  title: string;
  enabled: boolean;
}

export interface PaymentSummary {
  paymentId: string;
  paymentNo: string;
  status: PaymentStatus;
  amount: number;
  channel: PaymentChannel;
}

export interface PaymentDetail extends PaymentSummary {
  orderId: string;
  paidAt: string | null;
  createdAt: string | null;
}

export function getPaymentChannels() {
  return request<PaymentChannelOption[]>("/app/payments/channels", {
    auth: true
  });
}

export function createPayment(body: CreatePaymentParams) {
  return request<PaymentSummary>("/app/payments", {
    method: "POST",
    body,
    auth: true
  });
}

export function getPayment(paymentId: string) {
  return request<PaymentDetail>(`/app/payments/${paymentId}`, {
    auth: true
  });
}

export function confirmPayment(paymentId: string) {
  return request<PaymentDetail>(`/app/payments/${paymentId}/confirm`, {
    method: "POST",
    auth: true
  });
}
