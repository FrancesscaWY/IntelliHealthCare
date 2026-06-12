import { request } from "@/shared/api/client";

export type ServiceCategorySlug =
  | "home-care"
  | "home-exam"
  | "rehab-therapy"
  | "elderly-care";


function createCatalogSearchParams(page = 1, pageSize = 20) {
  const searchParams = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize)
  });

  return `?${searchParams.toString()}`;
}

export interface ServiceCatalogInstitutionSummary {
  institutionId: string;
  name: string;
  city: string;
}

export interface ServiceCatalogInstitutionDetail extends ServiceCatalogInstitutionSummary {
  district: string;
  address: string;
  rating: number | null;
}

export interface ServiceCatalogItem {
  serviceId: string;
  code: string;
  category: string;
  title: string;
  summary: string | null;
  price: number;
  marketPrice: number | null;
  durationMinutes: number | null;
  rating: number | null;
  salesVolume: number;
  coverUrl: string | null;
  tags: unknown;
  institution: ServiceCatalogInstitutionSummary | null;
}

export interface ServiceCatalogListResponse {
  list: ServiceCatalogItem[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
}

export interface ServiceCatalogDetail extends ServiceCatalogItem {
  regionScope: unknown;
  serviceContent: unknown;
  ragSnippet: unknown;
  institution: ServiceCatalogInstitutionDetail | null;
}

function getServiceList(categorySlug: ServiceCategorySlug, page = 1, pageSize = 20) {
  return request<ServiceCatalogListResponse>(
    `/app/services/${categorySlug}${createCatalogSearchParams(page, pageSize)}`,
    {
      auth: true
    }
  );
}

function getServiceDetail(categorySlug: ServiceCategorySlug, serviceId: string) {
  return request<ServiceCatalogDetail>(`/app/services/${categorySlug}/${serviceId}`, {
    auth: true
  });
}

export function getHomeCareServices(page = 1, pageSize = 20) {
  return getServiceList("home-care", page, pageSize);
}

export function getHomeCareServiceDetail(serviceId: string) {
  return getServiceDetail("home-care", serviceId);
}

export function getHomeExamServices(page = 1, pageSize = 20) {
  return getServiceList("home-exam", page, pageSize);
}

export function getHomeExamServiceDetail(serviceId: string) {
  return getServiceDetail("home-exam", serviceId);
}

export function getRehabTherapyServices(page = 1, pageSize = 20) {
  return getServiceList("rehab-therapy", page, pageSize);
}

export function getRehabTherapyServiceDetail(serviceId: string) {
  return getServiceDetail("rehab-therapy", serviceId);
}

export function getElderlyCareServices(page = 1, pageSize = 20) {
  return getServiceList("elderly-care", page, pageSize);
}

export function getElderlyCareServiceDetail(serviceId: string) {
  return getServiceDetail("elderly-care", serviceId);
}

