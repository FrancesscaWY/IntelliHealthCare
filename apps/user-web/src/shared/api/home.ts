import { request } from "@/shared/api/client";

export interface HomeDashboardServiceEntry {
  serviceId: string;
  title: string;
  category: string;
  price: number;
  image: string | null;
}

export interface HomeDashboardFeatureEntry {
  key: string;
  title: string;
}

export interface HomeDashboardReminder {
  type: string;
  title: string;
  content: string;
}

export interface HomeDashboardDisease {
  diseaseId: string;
  title: string;
  summary: string | null;
}

export interface HomeDashboardArticle {
  articleId: string;
  title: string;
  summary: string | null;
  coverUrl: string | null;
}

export interface HomeDashboardResponse {
  city: string;
  serviceEntries: HomeDashboardServiceEntry[];
  featureEntries: HomeDashboardFeatureEntry[];
  healthReminder: HomeDashboardReminder | null;
  hotDiseases: HomeDashboardDisease[];
  recommendedArticles: HomeDashboardArticle[];
}

export function getHomeDashboard() {
  return request<HomeDashboardResponse>("/app/home/dashboard", {
    auth: true
  });
}
