import { request } from "@/shared/api/client";
import type { PaginatedParams, PaginatedResponse } from "@/shared/api/ai";

export type NoticeType =
  | "SYSTEM"
  | "HEALTH_ALERT"
  | "ORDER"
  | "CONTENT"
  | "COMMUNITY"
  | "COMMENT"
  | "LIKE"
  | "FOLLOW";

export interface NoticeSummary {
  noticeId: string;
  id: string;
  isRead: boolean;
  readAt: string | null;
  type: NoticeType;
  title: string;
  content: string;
  desc: string;
  metadata: Record<string, unknown>;
  createdAt: string | null;
  date: string | null;
  count: number;
  icon: string;
  tone: string;
  sender: {
    userId: string;
    name: string;
  } | null;
}

export interface ConversationSummary {
  conversationId: string;
  id: string;
  scene: "DOCTOR" | "ASSISTANT" | "CUSTOMER_SERVICE" | "AFTER_SALE";
  topic: string | null;
  title: string;
  metadata: Record<string, unknown> | null;
  unreadCount: number;
  count: number;
  desc: string;
  lastMessageAt: string | null;
  date: string | null;
  icon: string;
  tone: string;
  lastMessage: {
    messageId: string;
    contentType: "TEXT" | "IMAGE" | "AUDIO";
    content: string;
    createdAt: string | null;
  } | null;
  peers: Array<{
    userId: string;
    name: string;
    avatar: string | null;
    roleLabel: string | null;
  }>;
}

export interface MessageOverview {
  unreadNoticeCount: number;
  unreadConversationCount: number;
  latestNotices: NoticeSummary[];
  latestConversations: ConversationSummary[];
}

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

export function getMessageOverview() {
  return request<MessageOverview>("/app/messages/overview", {
    auth: true
  });
}

export function listMessageNotices(
  params: PaginatedParams & {
    type?: NoticeType;
  } = {}
) {
  const searchParams = new URLSearchParams({
    page: String(params.page ?? 1),
    pageSize: String(params.pageSize ?? 20)
  });

  if (params.type) {
    searchParams.set("type", params.type);
  }

  return request<PaginatedResponse<NoticeSummary>>(
    `/app/messages/notices?${searchParams.toString()}`,
    {
      auth: true
    }
  );
}

export function markNoticesAsRead(noticeIds?: string[]) {
  return request<{ updated: number }>("/app/messages/notices/read", {
    method: "POST",
    auth: true,
    body: noticeIds?.length ? { noticeIds } : {}
  });
}

export function listConversations(params: PaginatedParams = {}) {
  const searchParams = new URLSearchParams({
    page: String(params.page ?? 1),
    pageSize: String(params.pageSize ?? 20)
  });

  return request<PaginatedResponse<ConversationSummary>>(
    `/app/conversations?${searchParams.toString()}`,
    {
      auth: true
    }
  );
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
