<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import type { PageComponentProps } from "@ihc/page-core/types";
import type { BookingOptionAddress, PreviewOrderResponse } from "@/shared/api/orders";
import { createOrder, getBookingOptions, previewOrder } from "@/shared/api/orders";
import { writeServicePaymentContext } from "@/shared/payment/session";
import {
  readSelectedServiceContext,
  type SelectedServiceContext
} from "@/shared/service/catalog";
import mock from "./mock";

const props = defineProps<PageComponentProps>();

const SERVICE_ID_MAP = {
  homeCare: "srv_home_clean_2h",
  rehab: "srv_rehab_stroke",
  exam: "srv_exam_basic"
} as const;

const SERVICE_TITLE_MAP: Record<keyof typeof SERVICE_ID_MAP, string> = {
  homeCare: "\u65e5\u5e38\u6e05\u6d01 2\u5c0f\u65f61\u4eba\u4e0a\u95e8\u670d\u52a1",
  rehab: "\u8111\u5352\u4e2d\u672f\u540e\u5eb7\u590d\u5957\u9910",
  exam: "\u957f\u8005\u57fa\u7840\u4f53\u68c0\u5957\u9910"
};

const UI = {
  backAria: "\u8fd4\u56de",
  pageTitle: "\u8ba2\u5355\u786e\u8ba4",
  totalLabel: "\u5546\u54c1\u603b\u989d",
  couponLabel: "\u4f18\u60e0\u51cf\u514d",
  subtotalLabel: "\u5c0f\u8ba1",
  bookingTitle: "\u9884\u7ea6\u4fe1\u606f",
  addressLabel: "\u4e0a\u95e8\u5730\u5740",
  timeLabel: "\u9884\u7ea6\u65f6\u95f4",
  phoneLabel: "\u8054\u7cfb\u65b9\u5f0f",
  noticeTitle: "\u9884\u7ea6\u8bf4\u660e",
  totalBarLabel: "\u5408\u8ba1",
  submitOrder: "\u63d0\u4ea4\u8ba2\u5355",
  submitting: "\u63d0\u4ea4\u4e2d...",
  loading: "\u9884\u7ea6\u4fe1\u606f\u52a0\u8f7d\u4e2d...",
  unknownAddress: "\u5f85\u751f\u6210\u9884\u7ea6\u5730\u5740",
  unknownSchedule: "\u5f85\u751f\u6210\u9884\u7ea6\u65f6\u95f4",
  unknownPhone: "\u5f85\u751f\u6210\u8054\u7cfb\u65b9\u5f0f"
} as const;

const NOTICE_ITEMS = [
  {
    label: "\u6709\u6548\u671f",
    value: "\u8d2d\u4e70\u540e30\u5929\u5185\u6709\u6548"
  },
  {
    label: "\u9884\u7ea6\u89c4\u5219",
    value: "\u8bf7\u6309\u9884\u7ea6\u65f6\u95f4\u4f7f\u7528\uff0c\u670d\u52a1\u5f00\u59cb\u524d2\u5c0f\u65f6\u5185\u53ef\u53d6\u6d88"
  }
] as const;

const TOASTS = {
  noAddress: "\u672a\u83b7\u53d6\u5230\u53ef\u7528\u5730\u5740",
  noSchedule: "\u672a\u83b7\u53d6\u5230\u53ef\u7528\u9884\u7ea6\u65f6\u95f4",
  createFailed: "\u8ba2\u5355\u63d0\u4ea4\u5931\u8d25",
  previewFailed: "\u9884\u7ea6\u4fe1\u606f\u52a0\u8f7d\u5931\u8d25"
} as const;

type OrderServiceKey = keyof typeof SERVICE_ID_MAP;

interface ResolvedOrderContext {
  address: BookingOptionAddress;
  bookingDate: string;
  bookingTimeSlot: string;
  preview: PreviewOrderResponse;
}

const selectedServiceContext = ref<SelectedServiceContext | null>(readSelectedServiceContext());

function getOrderServiceKeyFromCategory(categorySlug: string): OrderServiceKey {
  if (categorySlug === "rehab-therapy") {
    return "rehab";
  }

  if (categorySlug === "home-exam") {
    return "exam";
  }

  return "homeCare";
}

const inferredOrderServiceKey = computed<OrderServiceKey>(() => {
  const stack = props.navigation.getStack();

  if (stack.includes("service/rehab-therapy-detail")) {
    return "rehab";
  }

  if (stack.includes("service/home-exam-detail")) {
    return "exam";
  }

  return "homeCare";
});

const orderServiceKey = computed<OrderServiceKey>(() => {
  const stack = props.navigation.getStack();
  const selectedCategory = selectedServiceContext.value?.categorySlug;

  if (
    !stack.includes("service/home-care-detail") &&
    !stack.includes("service/home-exam-detail") &&
    !stack.includes("service/rehab-therapy-detail") &&
    selectedCategory
  ) {
    return getOrderServiceKeyFromCategory(selectedCategory);
  }

  return inferredOrderServiceKey.value;
});

const resolvedServiceId = computed(() => {
  const expectedCategory =
    orderServiceKey.value === "rehab"
      ? "rehab-therapy"
      : orderServiceKey.value === "exam"
        ? "home-exam"
        : "home-care";

  if (
    selectedServiceContext.value?.categorySlug === expectedCategory &&
    selectedServiceContext.value.serviceId.trim()
  ) {
    return selectedServiceContext.value.serviceId.trim();
  }

  return SERVICE_ID_MAP[orderServiceKey.value];
});

const isLoadingPreview = ref(false);
const isSubmitting = ref(false);
const previewError = ref<string | null>(null);
const previewData = ref<PreviewOrderResponse | null>(null);
const selectedAddress = ref<BookingOptionAddress | null>(null);
const selectedBookingDate = ref<string | null>(null);
const selectedBookingTimeSlot = ref<string | null>(null);

const fallbackService = computed(() => mock.services[orderServiceKey.value]);
const fallbackPrice = computed(() => mock.prices[orderServiceKey.value]);

const serviceTitle = computed(
  () =>
    previewData.value?.service.title ??
    selectedServiceContext.value?.title ??
    SERVICE_TITLE_MAP[orderServiceKey.value]
);

const serviceImage = computed(
  () =>
    previewData.value?.service.coverUrl ||
    selectedServiceContext.value?.coverUrl ||
    fallbackService.value.image
);

const servicePriceText = computed(() =>
  formatCurrency(
    previewData.value?.service.price ??
      selectedServiceContext.value?.price ??
      fallbackService.value.price
  )
);

const totalAmountText = computed(() =>
  formatCurrency(previewData.value?.price.originalAmount ?? fallbackPrice.value.total)
);

const discountAmountText = computed(() =>
  formatSignedCurrency(-(previewData.value?.price.discountAmount ?? Math.abs(fallbackPrice.value.coupon)))
);

const payableAmountText = computed(() =>
  formatCurrency(previewData.value?.price.payableAmount ?? fallbackPrice.value.subtotal)
);

const bookingAddressText = computed(() => {
  if (!selectedAddress.value) {
    return isLoadingPreview.value ? UI.loading : UI.unknownAddress;
  }

  return buildAddressText(selectedAddress.value);
});

const bookingTimeText = computed(() => {
  if (!selectedBookingDate.value || !selectedBookingTimeSlot.value) {
    return isLoadingPreview.value ? UI.loading : UI.unknownSchedule;
  }

  return `${selectedBookingDate.value} ${selectedBookingTimeSlot.value}`;
});

const bookingPhoneText = computed(
  () => selectedAddress.value?.receiverPhone ?? (isLoadingPreview.value ? UI.loading : UI.unknownPhone)
);

const goBack = () => {
  if (!props.navigation.navigateBack()) {
    props.navigation.reLaunch("service/booking");
    props.navigation.reLaunch("service/booking");
  }
};

function formatCurrency(amount: number) {
  return `\uFFE5${amount.toFixed(2)}`;
}

function formatSignedCurrency(amount: number) {
  const sign = amount < 0 ? "-" : "";
  return `${sign}\uFFE5${Math.abs(amount).toFixed(2)}`;
}

function buildAddressText(address: BookingOptionAddress) {
  return [
    address.province,
    address.city,
    address.district,
    address.street,
    address.detailAddress
  ]
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    .join("");
}

async function resolveOrderContext() {
  if (
    previewData.value &&
    selectedAddress.value &&
    selectedBookingDate.value &&
    selectedBookingTimeSlot.value
  ) {
    return {
      address: selectedAddress.value,
      bookingDate: selectedBookingDate.value,
      bookingTimeSlot: selectedBookingTimeSlot.value,
      preview: previewData.value
    } satisfies ResolvedOrderContext;
  }

  const serviceId = resolvedServiceId.value;
  const bookingOptions = await getBookingOptions(serviceId);
  const address = bookingOptions.addresses[0];
  const bookingDate = bookingOptions.availableDates[0]?.date;
  const bookingTimeSlot = bookingOptions.availableDates[0]?.timeSlots[0];

  if (!address?.addressId) {
    throw new Error(TOASTS.noAddress);
  }

  if (!bookingDate || !bookingTimeSlot) {
    throw new Error(TOASTS.noSchedule);
  }

  const preview = await previewOrder({
    serviceId,
    addressId: address.addressId,
    bookingDate,
    bookingTimeSlot
  });

  selectedAddress.value = address;
  selectedBookingDate.value = bookingDate;
  selectedBookingTimeSlot.value = bookingTimeSlot;
  previewData.value = preview;
  previewError.value = null;

  return {
    address,
    bookingDate,
    bookingTimeSlot,
    preview
  } satisfies ResolvedOrderContext;
}

async function loadPreview() {
  if (isLoadingPreview.value) {
    return;
  }

  try {
    isLoadingPreview.value = true;
    await resolveOrderContext();
  } catch (error) {
    previewError.value = error instanceof Error ? error.message : TOASTS.previewFailed;
  } finally {
    isLoadingPreview.value = false;
  }
}

const submitOrder = async () => {
  if (isSubmitting.value) {
    return;
  }

  try {
    isSubmitting.value = true;

    const serviceId = resolvedServiceId.value;
    const { address, bookingDate, bookingTimeSlot, preview } = await resolveOrderContext();
    const createdOrder = await createOrder({
      serviceId,
      addressId: address.addressId,
      bookingDate,
      bookingTimeSlot,
      contactName: address.receiverName,
      contactPhone: address.receiverPhone
    });

    writeServicePaymentContext({
      orderId: createdOrder.orderId,
      orderNo: createdOrder.orderNo,
      amount: preview.price.payableAmount,
      serviceTitle: preview.service.title
    });

    props.navigation.navigateTo("service/payment");
  } catch (error) {
    props.showToast(error instanceof Error ? error.message : TOASTS.createFailed);
  } finally {
    isSubmitting.value = false;
  }
};

onMounted(() => {
  void loadPreview();
});
</script>

<template>
  <div class="order-confirm-page">
    <header class="page-header">
      <button class="back-button" type="button" :aria-label="UI.backAria" @click="goBack">
        &lt;
      </button>
      <h1>{{ UI.pageTitle }}</h1>
    </header>

    <main class="order-content">
      <section class="card product-card">
        <div class="product-main">
          <img class="product-image" :src="serviceImage" :alt="serviceTitle" />
          <div class="product-info">
            <h2>{{ serviceTitle }}</h2>
            <span>{{ servicePriceText }}</span>
          </div>
        </div>

        <div class="price-list">
          <div class="price-row">
            <span>{{ UI.totalLabel }}</span>
            <strong>{{ totalAmountText }}</strong>
          </div>
          <div class="price-row">
            <span>{{ UI.couponLabel }}</span>
            <strong class="discount">{{ discountAmountText }}</strong>
          </div>
          <div class="divider"></div>
          <div class="price-row subtotal">
            <span>{{ UI.subtotalLabel }}</span>
            <strong>{{ payableAmountText }}</strong>
          </div>
        </div>
      </section>

      <section class="card info-card">
        <h2>{{ UI.bookingTitle }}</h2>
        <dl>
          <div>
            <dt>{{ UI.addressLabel }}</dt>
            <dd>{{ bookingAddressText }}</dd>
          </div>
          <div>
            <dt>{{ UI.timeLabel }}</dt>
            <dd>{{ bookingTimeText }}</dd>
          </div>
          <div>
            <dt>{{ UI.phoneLabel }}</dt>
            <dd>{{ bookingPhoneText }}</dd>
          </div>
        </dl>
        <p v-if="previewError" class="error-text">{{ previewError }}</p>
      </section>

      <section class="card notice-card">
        <h2>{{ UI.noticeTitle }}</h2>
        <dl>
          <div v-for="item in NOTICE_ITEMS" :key="item.label">
            <dt>{{ item.label }}</dt>
            <dd>{{ item.value }}</dd>
          </div>
        </dl>
      </section>
    </main>

    <div class="submit-bar">
      <div class="total">
        {{ UI.totalBarLabel }}
        <strong>{{ payableAmountText }}</strong>
      </div>
      <button class="submit-button" type="button" :disabled="isSubmitting" @click="submitOrder">
        {{ isSubmitting ? UI.submitting : UI.submitOrder }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.order-confirm-page {
  position: relative;
  left: 50%;
  width: min(402px, 100vw);
  min-height: var(--ihc-page-min-height);
  margin: -18px 0;
  transform: translateX(-50%);
  padding: 16px 14px 118px;
  box-sizing: border-box;
  background: #ffffff;
  color: #34383f;
  font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif;
  font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif;
}

.page-header {
  height: 58px;
  display: flex;
  align-items: center;
  margin-bottom: 18px;
}

.back-button {
  width: 24px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 8px 0 -4px;
  padding: 0;
  border: 0;
  background: transparent;
  color: #34383f;
  font-size: 28px;
  line-height: 1;
  font-weight: 400;
  cursor: pointer;
}

.page-header h1 {
  margin: 0;
  color: #34383f;
  font-size: 22px;
  font-weight: 600;
  letter-spacing: 0;
}

.order-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.card {
  padding: 24px 22px;
  border-radius: 16px;
  background: #fff;
  box-sizing: border-box;
}

.product-main {
  display: grid;
  grid-template-columns: 96px 1fr;
  gap: 18px;
  align-items: center;
  margin-bottom: 26px;
}

.product-image {
  width: 96px;
  height: 96px;
  border-radius: 8px;
  object-fit: cover;
  display: block;
}

.product-info h2 {
  margin: 0 0 14px;
  color: #34383f;
  font-size: 18px;
  font-weight: 800;
  line-height: 1.45;
  letter-spacing: 0;
}

.product-info span {
  color: #006dff;
  color: #006dff;
  font-size: 17px;
  font-weight: 700;
}

.price-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.price-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  color: #a0a3aa;
  font-size: 17px;
  font-weight: 600;
}

.price-row strong {
  color: #006dff;
  color: #006dff;
  font-size: 18px;
}

.price-row .discount {
  color: #006dff;
}

.divider {
  height: 1px;
  margin: 8px 0 10px;
  background: #ededee;
}

.subtotal strong {
  color: #006dff;
  color: #006dff;
  font-size: 24px;
}

.info-card h2,
.notice-card h2 {
  margin: 0 0 24px;
  color: #34383f;
  font-size: 22px;
  font-weight: 800;
  letter-spacing: 0;
}

dl {
  margin: 0;
}

dl div {
  display: grid;
  grid-template-columns: 104px 1fr;
  gap: 14px;
  margin-bottom: 14px;
  align-items: start;
}

dl div:last-child {
  margin-bottom: 0;
}

dt {
  color: #a0a3aa;
  font-size: 16px;
  font-weight: 700;
}

dd {
  margin: 0;
  color: #34383f;
  font-size: 17px;
  font-weight: 700;
  line-height: 1.45;
  text-align: right;
}

.notice-card dd {
  text-align: left;
}

.error-text {
  margin: 16px 0 0;
  color: #eb5757;
  font-size: 14px;
  line-height: 1.5;
}

.submit-bar {
  position: fixed;
  left: 50%;
  bottom: 0;
  z-index: 20;
  width: 100%;
  max-width: 402px;
  padding: 18px 24px 24px;
  box-sizing: border-box;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 -8px 20px rgba(20, 24, 36, 0.04);
}

.total {
  flex-shrink: 0;
  color: #34383f;
  font-size: 16px;
  font-weight: 700;
  white-space: nowrap;
}

.total strong {
  color: #006dff;
  color: #006dff;
  font-size: 32px;
  line-height: 1;
}

.submit-button {
  width: 160px;
  flex-shrink: 0;
  height: 46px;
  display: block;
  border: 0;
  border-radius: 8px;
  background: #75d6df;
  color: #fff;
  font-size: 17px;
  font-weight: 700;
  letter-spacing: 0;
  cursor: pointer;
}

.submit-button:disabled {
  opacity: 0.72;
  cursor: default;
}
</style>
