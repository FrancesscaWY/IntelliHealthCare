import { request } from "@/shared/api/client";
import type { PaginatedParams, PaginatedResponse } from "@/shared/api/ai";

export interface DoctorConversation {
  conversationId: string;
  scene: string;
  topic: string;
}

export interface ConversationMessage {
  messageId: string;
  id: string;
  contentType: "TEXT" | "IMAGE" | "AUDIO";
  content: string;
  createdAt: string;
  time: string;
  from: "me" | "doctor";
  sender: {
    userId: string;
    name: string;
    avatar?: string | null;
  } | null;
}

export function createDoctorConversation(payload: {
  doctorUserId?: string;
  topic?: string;
} = {}) {
  return request<DoctorConversation>("/app/conversations/doctor", {
    method: "POST",
    auth: true,
    body: payload
  });
}

export function listConversationMessages(
  conversationId: string,
  params: PaginatedParams = {}
) {
  const searchParams = new URLSearchParams({
    page: String(params.page ?? 1),
    pageSize: String(params.pageSize ?? 100)
  });

  return request<PaginatedResponse<ConversationMessage>>(
    `/app/conversations/${conversationId}/messages?${searchParams.toString()}`,
    {
      auth: true
    }
  );
}

export function sendConversationMessage(
  conversationId: string,
  payload: {
    contentType: "TEXT" | "IMAGE" | "AUDIO";
    content: string;
  }
) {
  return request<{
    messageId: string;
    conversationId: string;
    contentType: "TEXT" | "IMAGE" | "AUDIO";
    content: string;
    createdAt: string;
  }>(`/app/conversations/${conversationId}/messages`, {
    method: "POST",
    auth: true,
    body: payload
  });
}

export function markConversationAsRead(conversationId: string) {
  return request<{ read: true }>(`/app/conversations/${conversationId}/read`, {
    method: "POST",
    auth: true
  });
}
