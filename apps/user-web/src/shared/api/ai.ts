import { request } from "@/shared/api/client";

export type AiServiceCategory =
  | "HOME_CARE"
  | "REHAB_THERAPY"
  | "HOME_EXAM"
  | "ELDERLY_CARE";

export interface PaginatedParams {
  page?: number;
  pageSize?: number;
}

export interface PaginatedResponse<T> {
  list: T[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
}

export interface AssistantConversation {
  conversationId: string;
  scene: string;
  topic: string;
  metadata?: Record<string, unknown>;
  lastMessageAt?: string | null;
  createdAt: string;
  updatedAt?: string | null;
}

export interface AssistantConversationMessage {
  messageId: string;
  role: "user" | "assistant";
  type: string;
  content: string;
  audio?: {
    fileId: string;
    url: string;
    fileName: string;
    mimeType: string;
    durationSeconds: number | null;
    transcript: string | null;
  } | null;
  createdAt: string;
}

export interface SendAssistantMessageRequest {
  contentType?: "TEXT" | "AUDIO";
  content?: string;
  transcript?: string;
  fileId?: string;
  mimeType?: string;
  durationSeconds?: number;
  pageId?: string;
  route?: string;
  metadata?: Record<string, unknown>;
}

export interface SendAssistantMessageResponse {
  conversationId: string;
  userMessage: AssistantConversationMessage;
  reply: AssistantConversationMessage;
  task: {
    taskId: string;
    status: string;
    trace: Record<string, unknown> | null;
  };
}

export interface ServiceRecommendationItem {
  serviceId: string;
  title: string;
  category: AiServiceCategory;
  price: number;
  regionScope: string[];
  reason: string;
  imageUrl?: string | null;
}

export interface ServiceRecommendationResponse {
  taskId: string;
  recommendations: ServiceRecommendationItem[];
  matchingSignals: string[];
  conclusion: string | null;
  raw: Record<string, unknown>;
}

export interface ResourceConstraint {
  key: string;
  value: string;
}

export interface OrderPrefillRequest {
  elderId?: string;
  orderId?: string;
  serviceRequest?: string;
  healthContextRef?: string;
  resourceConstraints?: ResourceConstraint[];
}

export interface OrderPrefillResponse {
  taskId: string;
  bookingPrefill: Record<string, unknown>;
  missingInfo: string[];
  rankingReasons: string[];
  humanReviewRequired: boolean;
  raw: Record<string, unknown>;
}

export interface AiHealthSummaryResponse {
  taskId: string;
  summary: string;
  keyFindings: string[];
  riskSignals: string[];
  followUpSuggestions: string[];
  humanReviewRequired: boolean;
  raw: Record<string, unknown>;
}

export interface AiHealthMetricExplanationResponse {
  taskId: string;
  brief: string;
  keyFindings: string[];
  riskSignals: string[];
  followUpSuggestions: string[];
  raw: Record<string, unknown>;
}

export interface AiReportInterpretationResponse {
  taskId: string;
  reportId: string;
  interpretation: string;
  highlights: string[];
  riskSignals: string[];
  followUpSuggestions: string[];
  humanReviewRequired: boolean;
  raw: Record<string, unknown>;
}

export interface AiReportFollowUpResponse {
  taskId: string;
  reportId: string;
  followUpSuggestions: string[];
  riskSignals: string[];
  humanReviewRequired: boolean;
}

export interface AiRiskAlertOwner {
  userId: string;
  name: string;
}

export interface AiRiskAlertSummary {
  alertId: string;
  type: string;
  level: string;
  status: string;
  title: string;
  summary: string;
  relatedMetric: string | null;
  owner: AiRiskAlertOwner | null;
  createdAt: string;
  handledAt: string | null;
}

export interface AiRiskAlertDetail extends AiRiskAlertSummary {
  suggestion: Record<string, unknown>;
}

export interface AiKnowledgeSearchResult {
  score: number;
  excerpt: string;
  matchedTerms: string[];
  document: {
    id: string;
    title: string;
    summary: string | null;
    sourceType: string;
    sourceUri: string | null;
    publishedAt: string | null;
  };
  knowledgeBase: {
    code: string;
    name: string;
    knowledgeType: string;
    visibility: string;
  };
  citation: {
    knowledgeBaseCode: string;
    knowledgeType: string;
    visibility: string;
    documentId: string;
    chunkId: string;
    title: string;
    sourceType: string;
    sourceUri: string | null;
    chunkIndex: number;
    ownerUserId: string | null;
    institutionId: string | null;
  };
}

export interface AiKnowledgeSearchResponse {
  query: string;
  limit: number;
  total: number;
  targetUserId: string | null;
  institutionId: string | null;
  appliedKnowledgeTypes: string[] | null;
  appliedVisibilityScopes: string[];
  results: AiKnowledgeSearchResult[];
  trace: {
    searchMode: string;
    queryTokens: string[];
    candidateCount: number;
    embedding: {
      provider: string;
      model: string;
      fallbackMode: boolean;
    } | null;
  };
}

function buildQueryString(params: Record<string, unknown>) {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") {
      continue;
    }

    if (Array.isArray(value)) {
      if (value.length === 0) {
        continue;
      }
      searchParams.set(key, value.join(","));
      continue;
    }

    searchParams.set(key, String(value));
  }

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : "";
}

export function createAssistantConversation(payload: {
  topic?: string;
  welcomeMessage?: string;
}) {
  return request<AssistantConversation>("/app/ai/assistant/conversations", {
    method: "POST",
    auth: true,
    body: payload
  });
}

export function getAssistantConversation(conversationId: string) {
  return request<AssistantConversation>(`/app/ai/assistant/conversations/${conversationId}`, {
    auth: true
  });
}

export function listAssistantMessages(
  conversationId: string,
  params: PaginatedParams = {}
) {
  return request<PaginatedResponse<AssistantConversationMessage>>(
    `/app/ai/assistant/conversations/${conversationId}/messages${buildQueryString({
      page: params.page ?? 1,
      pageSize: params.pageSize ?? 100
    })}`,
    {
      auth: true
    }
  );
}

export function sendAssistantMessage(
  conversationId: string,
  payload: SendAssistantMessageRequest
) {
  return request<SendAssistantMessageResponse>(
    `/app/ai/assistant/conversations/${conversationId}/messages`,
    {
      method: "POST",
      auth: true,
      body: payload
    }
  );
}

export function createAiServiceRecommendations(payload: {
  elderId?: string;
  query?: string;
  category?: AiServiceCategory;
  city?: string;
  limit?: number;
}) {
  return request<ServiceRecommendationResponse>("/app/ai/service-recommendations", {
    method: "POST",
    auth: true,
    body: payload
  });
}

export function createAiOrderPrefill(payload: OrderPrefillRequest) {
  return request<OrderPrefillResponse>("/app/ai/order-prefill", {
    method: "POST",
    auth: true,
    body: payload
  });
}

export function getAiHealthSummary(params: {
  elderId?: string;
  metricTypes?: string[];
}) {
  return request<AiHealthSummaryResponse>(
    `/app/ai/health-summary${buildQueryString(params)}`,
    {
      auth: true
    }
  );
}

export function getAiHealthMetricExplanations(params: {
  elderId?: string;
  metricTypes?: string[];
}) {
  return request<AiHealthMetricExplanationResponse>(
    `/app/ai/health-metric-explanations${buildQueryString(params)}`,
    {
      auth: true
    }
  );
}

export function getAiReportInterpretation(
  reportId: string,
  params: {
    elderId?: string;
    metricTypes?: string[];
  } = {}
) {
  return request<AiReportInterpretationResponse>(
    `/app/ai/reports/${reportId}/interpretation${buildQueryString(params)}`,
    {
      auth: true
    }
  );
}

export function getAiReportFollowUpSuggestions(
  reportId: string,
  params: {
    elderId?: string;
    metricTypes?: string[];
  } = {}
) {
  return request<AiReportFollowUpResponse>(
    `/app/ai/reports/${reportId}/followup-suggestions${buildQueryString(params)}`,
    {
      auth: true
    }
  );
}

export function listAiRiskAlerts(params: PaginatedParams = {}) {
  return request<PaginatedResponse<AiRiskAlertSummary>>(
    `/app/ai/risk-alerts${buildQueryString({
      page: params.page ?? 1,
      pageSize: params.pageSize ?? 10
    })}`,
    {
      auth: true
    }
  );
}

export function getAiRiskAlertDetail(alertId: string) {
  return request<AiRiskAlertDetail>(`/app/ai/risk-alerts/${alertId}`, {
    auth: true
  });
}

export function searchAiKnowledge(params: {
  query: string;
  limit?: number;
  elderId?: string;
  includePrivate?: boolean;
  knowledgeTypes?: string[];
}) {
  return request<AiKnowledgeSearchResponse>(
    `/app/ai/knowledge/search${buildQueryString(params)}`,
    {
      auth: true
    }
  );
}
