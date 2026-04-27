import { computed, ref } from "vue";
import type {
  AiKnowledgeSearchResult,
  AiRiskAlertDetail,
  AiServiceCategory,
  OrderPrefillResponse
} from "@/shared/api/ai";

const ASSISTANT_HISTORY_STORAGE_KEY = "ihc:user-web:ai-assistant-history";
const ACTIVE_ASSISTANT_CONVERSATION_STORAGE_KEY = "ihc:user-web:ai-active-conversation";
const SERVICE_RECOMMENDATION_STORAGE_KEY = "ihc:user-web:ai-service-recommendations";
const REPORT_ANALYSIS_STORAGE_KEY = "ihc:user-web:ai-report-analysis";
const SELECTED_REPORT_STORAGE_KEY = "ihc:user-web:ai-selected-report";
const ASSISTANT_ENTRY_INTENT_STORAGE_KEY = "ihc:user-web:ai-assistant-entry-intent";

export interface AssistantConversationHistoryEntry {
  conversationId: string;
  topic: string;
  preview: string;
  createdAt: string;
  updatedAt: string;
}

export interface AssistantEntryIntent {
  mode: "text" | "voice";
  draft?: string;
  sourcePageId?: string;
  requestedAt: string;
}

export interface NormalizedAiRecommendation {
  serviceId: string;
  title: string;
  category: AiServiceCategory;
  price: number;
  priceLabel: string;
  reason: string;
  regionScope: string[];
  imageUrl: string;
}

export interface NormalizedBookingPrefill {
  serviceId: string;
  title: string;
  suggestedSlots: string[];
  missingFields: string[];
}

export type AiServiceScene = "home-care" | "home-exam" | "rehab";

export interface AiServiceRecommendationState {
  scene: AiServiceScene;
  title: string;
  category: AiServiceCategory;
  query: string;
  conclusion: string;
  matchingSignals: string[];
  recommendations: NormalizedAiRecommendation[];
  bookingPrefill: NormalizedBookingPrefill | null;
  rankingReasons: string[];
  missingInfo: string[];
  healthSummary: {
    summary: string;
    keyFindings: string[];
    riskSignals: string[];
    followUpSuggestions: string[];
  } | null;
  metricBrief: {
    brief: string;
    keyFindings: string[];
    riskSignals: string[];
    followUpSuggestions: string[];
  } | null;
  knowledgeResults: AiKnowledgeSearchResult[];
  fetchedAt: string;
  errorMessage: string;
}

export interface AiReportAnalysisState {
  reportId: string;
  reportTitle: string;
  keywords: string[];
  summaryLines: string[];
  highlights: string[];
  interpretation: string;
  evaluationSummary: string;
  evaluationPoints: string[];
  riskSignals: string[];
  riskReminderItems: string[];
  followUpSuggestions: string[];
  followUpItems: string[];
  latestRiskAlert: AiRiskAlertDetail | null;
  fetchedAt: string;
  errorMessage: string;
}

function canUseStorage() {
  try {
    return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
  } catch {
    return false;
  }
}

function loadJson<T>(storageKey: string, fallbackValue: T) {
  if (!canUseStorage()) {
    return fallbackValue;
  }

  let rawValue = "";

  try {
    rawValue = window.localStorage.getItem(storageKey) || "";
  } catch {
    return fallbackValue;
  }

  if (!rawValue) {
    return fallbackValue;
  }

  try {
    const parsedValue = JSON.parse(rawValue) as T | null;
    return parsedValue ?? fallbackValue;
  } catch {
    try {
      window.localStorage.removeItem(storageKey);
    } catch {
      // Ignore storage cleanup failures in restricted browser contexts.
    }
    return fallbackValue;
  }
}

function persistJson(storageKey: string, value: unknown) {
  if (!canUseStorage()) {
    return;
  }

  try {
    window.localStorage.setItem(storageKey, JSON.stringify(value));
  } catch {
    // Ignore storage write failures in restricted browser contexts.
  }
}

export const assistantConversationHistory = ref<AssistantConversationHistoryEntry[]>(
  loadJson<AssistantConversationHistoryEntry[]>(ASSISTANT_HISTORY_STORAGE_KEY, [])
);

export const activeAssistantConversationId = ref<string>(
  loadJson<string>(ACTIVE_ASSISTANT_CONVERSATION_STORAGE_KEY, "")
);

const initialServiceRecommendationState: Record<AiServiceScene, AiServiceRecommendationState | null> = {
  "home-care": null,
  "home-exam": null,
  rehab: null
};

export const aiServiceRecommendationState = ref<Record<AiServiceScene, AiServiceRecommendationState | null>>(
  loadJson<Record<AiServiceScene, AiServiceRecommendationState | null>>(
    SERVICE_RECOMMENDATION_STORAGE_KEY,
    initialServiceRecommendationState
  )
);

export const aiReportAnalysisState = ref<AiReportAnalysisState | null>(
  loadJson<AiReportAnalysisState | null>(REPORT_ANALYSIS_STORAGE_KEY, null)
);

export const selectedAiReportId = ref<string>(
  loadJson<string>(SELECTED_REPORT_STORAGE_KEY, "")
);

export const assistantEntryIntent = ref<AssistantEntryIntent | null>(
  loadJson<AssistantEntryIntent | null>(ASSISTANT_ENTRY_INTENT_STORAGE_KEY, null)
);

export function getAssistantConversationEntries() {
  return computed(() => assistantConversationHistory.value);
}

export function setActiveAssistantConversation(conversationId: string) {
  activeAssistantConversationId.value = conversationId;
  persistJson(ACTIVE_ASSISTANT_CONVERSATION_STORAGE_KEY, conversationId);
}

export function setAssistantEntryIntent(value: AssistantEntryIntent | null) {
  assistantEntryIntent.value = value;
  persistJson(ASSISTANT_ENTRY_INTENT_STORAGE_KEY, value);
}

export function requestAssistantTextEntry(draft: string, sourcePageId?: string) {
  setAssistantEntryIntent({
    mode: "text",
    draft,
    sourcePageId,
    requestedAt: new Date().toISOString()
  });
}

export function requestAssistantVoiceEntry(sourcePageId?: string) {
  setAssistantEntryIntent({
    mode: "voice",
    sourcePageId,
    requestedAt: new Date().toISOString()
  });
}

export function consumeAssistantEntryIntent() {
  const current = assistantEntryIntent.value;
  setAssistantEntryIntent(null);
  return current;
}

export function rememberAssistantConversation(entry: AssistantConversationHistoryEntry) {
  const nextEntries = assistantConversationHistory.value.filter(
    (item) => item.conversationId !== entry.conversationId
  );

  nextEntries.unshift(entry);
  assistantConversationHistory.value = nextEntries
    .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())
    .slice(0, 20);
  persistJson(ASSISTANT_HISTORY_STORAGE_KEY, assistantConversationHistory.value);
  setActiveAssistantConversation(entry.conversationId);
}

export function removeAssistantConversation(conversationId: string) {
  assistantConversationHistory.value = assistantConversationHistory.value.filter(
    (item) => item.conversationId !== conversationId
  );
  persistJson(ASSISTANT_HISTORY_STORAGE_KEY, assistantConversationHistory.value);

  if (activeAssistantConversationId.value === conversationId) {
    setActiveAssistantConversation(assistantConversationHistory.value[0]?.conversationId || "");
  }
}

export function setAiServiceRecommendationResult(
  scene: AiServiceScene,
  value: AiServiceRecommendationState | null
) {
  aiServiceRecommendationState.value = {
    ...aiServiceRecommendationState.value,
    [scene]: value
  };
  persistJson(SERVICE_RECOMMENDATION_STORAGE_KEY, aiServiceRecommendationState.value);
}

export function getAiServiceRecommendationResult(scene: AiServiceScene) {
  return computed(() => aiServiceRecommendationState.value[scene]);
}

export function setAiReportAnalysisResult(value: AiReportAnalysisState | null) {
  aiReportAnalysisState.value = value;
  persistJson(REPORT_ANALYSIS_STORAGE_KEY, value);
}

export function setSelectedAiReportId(reportId: string) {
  selectedAiReportId.value = reportId;
  persistJson(SELECTED_REPORT_STORAGE_KEY, reportId);
}

export function normalizeBookingPrefill(value: OrderPrefillResponse["bookingPrefill"]) {
  const serviceId = typeof value.serviceId === "string" ? value.serviceId : "";
  const title = typeof value.title === "string" ? value.title : "";
  const suggestedSlots = Array.isArray(value.suggestedSlots)
    ? value.suggestedSlots.filter((item): item is string => typeof item === "string")
    : [];
  const missingFields = Array.isArray(value.missingFields)
    ? value.missingFields.filter((item): item is string => typeof item === "string")
    : [];

  if (!serviceId && !title && suggestedSlots.length === 0 && missingFields.length === 0) {
    return null;
  }

  return {
    serviceId,
    title,
    suggestedSlots,
    missingFields
  };
}
