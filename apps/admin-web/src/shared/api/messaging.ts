import { request } from "@/shared/api/client";
import { buildQueryString } from "@/shared/api/query";

export function getAdminCampaigns(query: {
  page?: number;
  pageSize?: number;
  status?: string;
} = {}) {
  return request<any>(`/admin/message-campaigns${buildQueryString(query)}`, {
    auth: true
  });
}

export function getAdminCampaignOptions() {
  return request<any>("/admin/message-campaigns/options", {
    auth: true
  });
}

export function getAdminCampaignDetail(campaignId: string) {
  return request<any>(`/admin/message-campaigns/${campaignId}`, {
    auth: true
  });
}

export function createAdminCampaign(payload: Record<string, unknown>) {
  return request<any>("/admin/message-campaigns", {
    method: "POST",
    auth: true,
    body: payload
  });
}

export function updateAdminCampaign(campaignId: string, payload: Record<string, unknown>) {
  return request<any>(`/admin/message-campaigns/${campaignId}`, {
    method: "PUT",
    auth: true,
    body: payload
  });
}

export function deleteAdminCampaign(campaignId: string) {
  return request<any>(`/admin/message-campaigns/${campaignId}`, {
    method: "DELETE",
    auth: true
  });
}

export function withdrawAdminCampaign(campaignId: string) {
  return request<any>(`/admin/message-campaigns/${campaignId}/withdraw`, {
    method: "POST",
    auth: true
  });
}

export function batchOperateAdminCampaigns(payload: {
  campaignIds: string[];
  action: "DELETE" | "WITHDRAW";
}) {
  return request<any>("/admin/message-campaigns/batch", {
    method: "POST",
    auth: true,
    body: payload
  });
}

export function getAdminConversations(query: {
  page?: number;
  pageSize?: number;
  keyword?: string;
} = {}) {
  return request<any>(`/admin/conversations${buildQueryString(query)}`, {
    auth: true
  });
}

export function getAdminConversationDetail(conversationId: string) {
  return request<any>(`/admin/conversations/${conversationId}`, {
    auth: true
  });
}

export function getAdminConversationMessages(
  conversationId: string,
  query: {
    page?: number;
    pageSize?: number;
  } = {}
) {
  return request<any>(
    `/admin/conversations/${conversationId}/messages${buildQueryString(query)}`,
    {
      auth: true
    }
  );
}

export function sendAdminConversationMessage(
  conversationId: string,
  payload: {
    contentType: "TEXT" | "IMAGE" | "AUDIO";
    content: string;
  }
) {
  return request<any>(`/admin/conversations/${conversationId}/messages`, {
    method: "POST",
    auth: true,
    body: payload
  });
}

export function endAdminConversation(conversationId: string) {
  return request<any>(`/admin/conversations/${conversationId}/end`, {
    method: "POST",
    auth: true
  });
}
