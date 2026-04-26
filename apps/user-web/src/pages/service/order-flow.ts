import { shallowRef } from "vue";

export type OrderServiceType = "homeCare" | "rehab" | "exam";

export interface OrderServiceSummary {
  type: OrderServiceType;
  serviceId: string;
  title: string;
  price: number;
  image: string;
  detailPageId: string;
  listPageId: string;
  couponAmount?: number;
  addressId?: string;
  addressText?: string;
  contactName?: string;
  contactPhone?: string;
}

export interface OrderBookingDraft {
  addressId: string;
  addressText: string;
  contactName: string;
  contactPhone: string;
  bookingDate: string;
  bookingTimeSlot: string;
  remark: string;
  elderId?: string;
  couponId?: string;
}

export interface CreatedOrderSnapshot {
  orderId: string;
  status: string;
  payableAmount: number;
  createdAt: string;
}

export interface PaymentSnapshot {
  paymentId: string;
  orderId: string;
  channel: string;
  amount: number;
  status: string;
  paidAt?: string | null;
}

export interface OrderFlowState {
  service: OrderServiceSummary | null;
  booking: OrderBookingDraft | null;
  createdOrder: CreatedOrderSnapshot | null;
  payment: PaymentSnapshot | null;
}

const ORDER_FLOW_STORAGE_KEY = "ihc:user-web:order-flow";

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function isOrderFlowState(value: unknown): value is OrderFlowState {
  if (!value || typeof value !== "object") {
    return false;
  }

  const state = value as Partial<OrderFlowState>;
  return "service" in state && "booking" in state && "createdOrder" in state;
}

function loadOrderFlowState(): OrderFlowState {
  if (!canUseStorage()) {
    return {
      service: null,
      booking: null,
      createdOrder: null,
      payment: null
    };
  }

  const rawValue = window.localStorage.getItem(ORDER_FLOW_STORAGE_KEY);
  if (!rawValue) {
    return {
      service: null,
      booking: null,
      createdOrder: null,
      payment: null
    };
  }

  try {
    const parsedValue = JSON.parse(rawValue);
    if (isOrderFlowState(parsedValue)) {
      return parsedValue;
    }
  } catch {
    window.localStorage.removeItem(ORDER_FLOW_STORAGE_KEY);
  }

  return {
    service: null,
    booking: null,
    createdOrder: null,
    payment: null
  };
}

function persistOrderFlowState(state: OrderFlowState) {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(ORDER_FLOW_STORAGE_KEY, JSON.stringify(state));
}

export const currentOrderFlowState = shallowRef<OrderFlowState>(loadOrderFlowState());

function updateOrderFlowState(partial: Partial<OrderFlowState>) {
  currentOrderFlowState.value = {
    ...currentOrderFlowState.value,
    ...partial
  };
  persistOrderFlowState(currentOrderFlowState.value);
}

export function getOrderFlowState() {
  return currentOrderFlowState.value;
}

export function setOrderFlowService(service: OrderServiceSummary) {
  updateOrderFlowState({
    service,
    booking: {
      addressId: service.addressId || "addr_001",
      addressText: service.addressText || "",
      contactName: service.contactName || "",
      contactPhone: service.contactPhone || "",
      bookingDate: "",
      bookingTimeSlot: "",
      remark: ""
    },
    createdOrder: null,
    payment: null
  });
}

export function updateOrderFlowBooking(booking: Partial<OrderBookingDraft>) {
  const previousBooking = currentOrderFlowState.value.booking;
  const nextBooking: OrderBookingDraft = {
    addressId: booking.addressId ?? previousBooking?.addressId ?? "addr_001",
    addressText: booking.addressText ?? previousBooking?.addressText ?? "",
    contactName: booking.contactName ?? previousBooking?.contactName ?? "",
    contactPhone: booking.contactPhone ?? previousBooking?.contactPhone ?? "",
    bookingDate: booking.bookingDate ?? previousBooking?.bookingDate ?? "",
    bookingTimeSlot: booking.bookingTimeSlot ?? previousBooking?.bookingTimeSlot ?? "",
    remark: booking.remark ?? previousBooking?.remark ?? "",
    elderId: booking.elderId ?? previousBooking?.elderId,
    couponId: booking.couponId ?? previousBooking?.couponId
  };

  updateOrderFlowState({
    booking: nextBooking,
    createdOrder: null,
    payment: null
  });
}

export function setCreatedOrderSnapshot(createdOrder: CreatedOrderSnapshot) {
  updateOrderFlowState({
    createdOrder,
    payment: null
  });
}

export function resetCreatedOrderSnapshot() {
  updateOrderFlowState({
    createdOrder: null,
    payment: null
  });
}

export function setPaymentSnapshot(payment: PaymentSnapshot) {
  updateOrderFlowState({
    payment
  });
}

export function resetPaymentSnapshot() {
  updateOrderFlowState({
    payment: null
  });
}
