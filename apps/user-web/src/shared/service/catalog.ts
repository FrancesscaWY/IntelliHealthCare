import type { ServiceCategorySlug } from "@/shared/api/service-catalog";

const SELECTED_SERVICE_STORAGE_KEY = "ihc-selected-service";

export interface SelectedServiceContext {
  categorySlug: ServiceCategorySlug;
  serviceId: string;
  title: string;
  coverUrl: string | null;
  price: number;
}

function canUseSessionStorage() {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
}

export function saveSelectedServiceContext(context: SelectedServiceContext) {
  if (!canUseSessionStorage()) {
    return;
  }

  window.sessionStorage.setItem(SELECTED_SERVICE_STORAGE_KEY, JSON.stringify(context));
}

export function readSelectedServiceContext() {
  if (!canUseSessionStorage()) {
    return null;
  }

  const rawValue = window.sessionStorage.getItem(SELECTED_SERVICE_STORAGE_KEY);

  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue) as SelectedServiceContext;
  } catch {
    window.sessionStorage.removeItem(SELECTED_SERVICE_STORAGE_KEY);
    return null;
  }
}

export function normalizeServiceStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function extractServiceTexts(value: unknown): string[] {
  const texts: string[] = [];

  const visit = (currentValue: unknown) => {
    if (typeof currentValue === "string") {
      const normalizedValue = currentValue.trim();

      if (normalizedValue) {
        texts.push(normalizedValue);
      }

      return;
    }

    if (Array.isArray(currentValue)) {
      currentValue.forEach(visit);
      return;
    }

    if (currentValue && typeof currentValue === "object") {
      Object.values(currentValue as Record<string, unknown>).forEach(visit);
    }
  };

  visit(value);

  return Array.from(new Set(texts));
}

export function formatServiceDurationLabel(durationMinutes: number | null | undefined) {
  if (!durationMinutes || durationMinutes <= 0) {
    return "";
  }

  if (durationMinutes < 60) {
    return `${durationMinutes}分钟`;
  }

  const hours = durationMinutes / 60;
  return Number.isInteger(hours) ? `${hours}小时` : `${hours.toFixed(1)}小时`;
}

export function formatServiceDiscountLabel(price: number | null | undefined, marketPrice: number | null | undefined) {
  if (
    !price ||
    !marketPrice ||
    price <= 0 ||
    marketPrice <= 0 ||
    price >= marketPrice
  ) {
    return "精选服务";
  }

  return `${((price / marketPrice) * 10).toFixed(1)}折`;
}

export function getServiceDetailPageId(categorySlug: ServiceCategorySlug) {
  if (categorySlug === "elderly-care") {
    return "service/elderly-care-detail";
  }

  if (categorySlug === "home-exam") {
    return "service/home-exam-detail";
  }

  if (categorySlug === "rehab-therapy") {
    return "service/rehab-therapy-detail";
  }

  return "service/home-care-detail";
}
