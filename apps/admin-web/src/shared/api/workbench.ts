import { request } from "@/shared/api/client";

export interface DashboardOverviewResponse {
  elderCount: number;
  orderCount: number;
  workOrderCount: number;
  reportCount: number;
  openAlertCount: number;
}

export function getDashboardOverview() {
  return request<DashboardOverviewResponse>("/admin/dashboard/overview", {
    auth: true
  });
}
