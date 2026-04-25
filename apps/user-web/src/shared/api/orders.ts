import { request } from "@/shared/api/client";

function createOrdersSearchParams(params?: { serviceId?: string }) {
  const searchParams = new URLSearchParams();

  if (params?.serviceId?.trim()) {
    searchParams.set("serviceId", params.serviceId.trim());
  }

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : "";
}

export interface BookingOptionAddress {
  addressId: string;
  label: string;
  receiverName: string;
  receiverPhone: string;
  province: string;
  city: string;
  district: string;
  street: string;
  detailAddress: string;
}

export interface BookingOptionDate {
  date: string;
  timeSlots: string[];
}

export interface BookingOptionsResponse {
  service: {
    serviceId: string;
    title: string;
    price: number;
  } | null;
  elders: Array<{
    userId: string;
    name: string;
  }>;
  addresses: BookingOptionAddress[];
  availableDates: BookingOptionDate[];
}

export interface PreviewOrderResponse {
  service: {
    serviceId: string;
    title: string;
    category: string;
    price: number;
    coverUrl: string | null;
  };
  elderId: string;
  address: BookingOptionAddress;
  bookingDate: string | null;
  bookingTimeSlot: string | null;
  remark: string | null;
  coupon: {
    couponId: string;
    title: string;
    discountAmount: number;
  } | null;
  price: {
    originalAmount: number;
    discountAmount: number;
    payableAmount: number;
  };
  healthSummary: unknown;
}

export interface CreateOrderParams {
  serviceId: string;
  addressId: string;
  elderId?: string;
  bookingDate?: string;
  bookingTimeSlot?: string;
  contactName?: string;
  contactPhone?: string;
  remark?: string;
  couponId?: string;
}

export interface CreateOrderResponse {
  orderId: string;
  orderNo: string;
  status: string;
}

export function getBookingOptions(serviceId?: string) {
  return request<BookingOptionsResponse>(
    `/app/orders/booking/options${createOrdersSearchParams({ serviceId })}`,
    {
      auth: true
    }
  );
}

export function previewOrder(body: Omit<CreateOrderParams, "contactName" | "contactPhone">) {
  return request<PreviewOrderResponse>("/app/orders/preview", {
    method: "POST",
    body,
    auth: true
  });
}

export function createOrder(body: CreateOrderParams) {
  return request<CreateOrderResponse>("/app/orders", {
    method: "POST",
    body,
    auth: true
  });
}
