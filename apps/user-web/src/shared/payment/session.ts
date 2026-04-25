import type { PaymentChannel, PaymentStatus } from "@/shared/api/payments";

const STORAGE_KEY = "ihc:service:payment-context";

export interface ServicePaymentContext {
  orderId?: string;
  orderNo?: string;
  amount?: number;
  serviceTitle?: string;
  isLegacyPendingOrder?: boolean;
  legacySource?: string;
  paymentId?: string;
  paymentNo?: string;
  paymentStatus?: PaymentStatus;
  paymentChannel?: PaymentChannel;
  paidAt?: string | null;
  createdAt?: string | null;
}

function hasSessionStorage() {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
}

export function readServicePaymentContext() {
  if (!hasSessionStorage()) {
    return null;
  }

  const rawValue = window.sessionStorage.getItem(STORAGE_KEY);

  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue) as ServicePaymentContext;
  } catch {
    window.sessionStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function writeServicePaymentContext(context: ServicePaymentContext) {
  if (!hasSessionStorage()) {
    return;
  }

  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(context));
}

export function mergeServicePaymentContext(patch: Partial<ServicePaymentContext>) {
  const current = readServicePaymentContext() ?? {};
  writeServicePaymentContext({
    ...current,
    ...patch
  });
}

export function clearServicePaymentContext() {
  if (!hasSessionStorage()) {
    return;
  }

  window.sessionStorage.removeItem(STORAGE_KEY);
}
