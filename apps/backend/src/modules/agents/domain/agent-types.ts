import type { AgentTaskStatus, MetricType, ServiceCategory } from "@prisma/client";
import { MetricType as MetricTypeEnum, ServiceCategory as ServiceCategoryEnum } from "@prisma/client";
import { z } from "zod";

export type AgentCategory = "router" | "planner" | "reviewer" | "specialist";
export type AgentRiskLevel = "low" | "medium" | "high";
export type AgentTriggerMode = "sync" | "async" | "event";
export type AgentToolName =
  | "getTaskMetadata"
  | "getConversationContext"
  | "getPolicyRules"
  | "getAgentRegistry"
  | "getConversationHistory"
  | "getResponseTemplates"
  | "getPageRegistry"
  | "getTaskOrchestratorOutput"
  | "getReportContext"
  | "getHealthArchive"
  | "getLatestHealthMetrics"
  | "getMetricHistory"
  | "getMedicationContext"
  | "getDietContext"
  | "getSelfTestContext"
  | "searchServiceCatalog"
  | "getAddressBook"
  | "getOrderContext"
  | "getStaffRoster"
  | "getScheduleAvailability"
  | "getInstitutionCoverage"
  | "getRecentReports"
  | "getOpenAlerts"
  | "getInterventionPlaybook"
  | "getDeviceStatusBoard"
  | "getRecentDeviceAlerts"
  | "getInstitutionTopology"
  | "getContentLibrary"
  | "getActivityRegistry"
  | "getContentInteractionStats"
  | "getDashboardMetrics"
  | "getDispatchBoard"
  | "getContentOpsBoard"
  | "getActivityOpsBoard"
  | "getPromptTrace"
  | "getToolTrace"
  | "getRiskRuleSet";

export interface AgentDefinition<TInput = unknown, TOutput = unknown> {
  name: string;
  category: AgentCategory;
  domain: string;
  riskLevel: AgentRiskLevel;
  triggerMode: AgentTriggerMode;
  description: string;
  taskTypes: string[];
  inputSchema: z.ZodType<TInput>;
  outputSchema: z.ZodType<TOutput>;
  allowedTools: AgentToolName[];
  forbiddenActions: string[];
  timeoutMs: number;
  maxSteps: number;
  humanReviewRequired: boolean;
  promptVersion: string;
}

export interface AgentDefinitionSummary {
  name: string;
  category: AgentCategory;
  domain: string;
  riskLevel: AgentRiskLevel;
  triggerMode: AgentTriggerMode;
  description: string;
  taskTypes: string[];
  allowedTools: AgentToolName[];
  forbiddenActions: string[];
  timeoutMs: number;
  maxSteps: number;
  humanReviewRequired: boolean;
  promptVersion: string;
  inputFields: string[];
  outputFields: string[];
}

export interface AgentQueueJobData {
  taskId: string;
}

export interface AgentRuntimeAttempt {
  attempt: number;
  maxAttempts: number;
}

export interface AgentRouteTrace {
  requestedAgent: string;
  resolvedAgent: string;
  reason: string;
}

export interface ToolCallTrace {
  tool: AgentToolName;
  status: "succeeded" | "failed";
  durationMs: number;
  input: Record<string, unknown>;
  outputSummary?: Record<string, unknown>;
  error?: string;
}

export type LlmModelTier = "primary" | "light" | "fallback";

export interface LlmTrace {
  provider: string;
  model: string;
  fallbackMode: boolean;
  modelTier?: LlmModelTier;
  attemptedModels?: string[];
  strictJson?: boolean;
  toolCalling?: boolean;
  error?: string;
}

const genericRecordSchema = z.record(z.string(), z.any());
const stringListSchema = z.array(z.string()).max(12);
const nullableStringSchema = z.string().min(1).nullable();

export const conversationTurnSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string().min(1),
  createdAt: z.string().optional()
});

export const pageContextSchema = z.object({
  pageId: z.string().min(1).optional(),
  route: z.string().min(1).optional(),
  metadata: genericRecordSchema.optional()
});

export const policyRuleRefSchema = z.object({
  key: z.string().min(1),
  version: z.string().min(1).optional(),
  note: z.string().min(1).optional()
});

export const domainBriefSchema = z.object({
  domain: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().min(1),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  data: genericRecordSchema.optional()
});

export const baseEvidenceSchema = z.object({
  source: z.string(),
  summary: z.string(),
  data: genericRecordSchema.optional()
});

export const executionPlanStepSchema = z.object({
  step: z.string().min(1),
  agent: z.string().min(1),
  reason: z.string().min(1).optional()
});

export const taskOrchestratorInputSchema = z.object({
  taskId: z.string().min(1),
  taskType: z.string().min(1),
  triggerSource: z.enum(["assistant", "internal-api", "event", "schedule"]),
  ownerId: z.string().min(1).optional(),
  conversationContext: z.array(conversationTurnSchema).max(20).optional(),
  taskContext: genericRecordSchema.optional(),
  policySnapshot: z.array(policyRuleRefSchema).max(20).optional()
});

export const taskOrchestratorOutputSchema = z.object({
  executionPlan: z.object({
    summary: z.string().min(1),
    steps: z.array(executionPlanStepSchema).min(1).max(8)
  }),
  targetAgentList: z.array(z.string().min(1)).min(1).max(8),
  workflowRoute: z.enum(["single-agent", "serial", "event-driven"]),
  requiredContext: z.array(z.string().min(1)).max(8).optional(),
  humanReviewHint: nullableStringSchema.optional()
});

export type TaskOrchestratorInput = z.infer<typeof taskOrchestratorInputSchema>;
export type TaskOrchestratorOutput = z.infer<typeof taskOrchestratorOutputSchema>;

export const navigationSuggestionSchema = z.object({
  pageId: z.string().min(1),
  label: z.string().min(1),
  reason: z.string().min(1).optional()
});

export const assistantConversationInputSchema = z.object({
  sessionId: z.string().min(1),
  userMessage: z.string().min(1),
  conversationHistory: z.array(conversationTurnSchema).max(30).optional(),
  resolvedIntent: taskOrchestratorOutputSchema.nullable().optional(),
  pageContext: pageContextSchema.optional()
});

export const assistantConversationOutputSchema = z.object({
  assistantReply: z.string().min(1),
  followUpQuestion: nullableStringSchema.optional(),
  navigationSuggestion: navigationSuggestionSchema.nullable().optional(),
  pendingTaskHint: nullableStringSchema.optional()
});

export type AssistantConversationInput = z.infer<
  typeof assistantConversationInputSchema
>;
export type AssistantConversationOutput = z.infer<
  typeof assistantConversationOutputSchema
>;

export const reportSummaryInputSchema = z.object({
  reportId: z.string().min(1),
  userId: z.string().min(1).optional(),
  includeArchive: z.boolean().default(true),
  includeLatestMetrics: z.boolean().default(true),
  metricTypes: z.array(z.nativeEnum(MetricTypeEnum)).max(6).optional()
});

export type ReportSummaryInput = z.infer<typeof reportSummaryInputSchema>;

export const healthManagementCardInputSchema = z.object({
  userId: z.string().min(1).optional(),
  archiveId: z.string().min(1).optional(),
  reportId: z.string().min(1).optional(),
  viewMode: z.enum([
    "report-interpretation",
    "health-summary",
    "focus-elder-brief"
  ]),
  authorizedScope: z.array(z.string().min(1)).max(20).default([]),
  metricTypes: z.array(z.string().min(1)).max(10).optional()
});

export const healthManagementInputSchema = z.union([
  reportSummaryInputSchema,
  healthManagementCardInputSchema
]);

export const baseAgentOutputSchema = z.object({
  conclusion: z.string().min(1),
  evidence: z.array(baseEvidenceSchema).max(8),
  uncertainties: z.array(z.string()).max(6).default([]),
  followUpActions: z.array(z.string()).max(6).default([]),
  requiresHumanReview: z.boolean().default(false)
});

export const reportSummaryOutputSchema = baseAgentOutputSchema.extend({
  reportHighlights: z.array(z.string()).max(6),
  riskSignals: z.array(z.string()).max(6)
});

export const healthManagementOutputSchema = z.object({
  healthSummary: z.string().min(1),
  keyFindings: z.array(z.string().min(1)).max(8),
  riskSignals: z.array(z.string().min(1)).max(8).optional(),
  followUpSuggestions: z.array(z.string().min(1)).max(8).optional(),
  uncertainties: z.array(z.string().min(1)).max(8).optional(),
  humanReviewRequired: z.boolean()
});

export const healthManagementExecutionOutputSchema = z.union([
  reportSummaryOutputSchema,
  healthManagementOutputSchema
]);

export type ReportSummaryOutput = z.infer<typeof reportSummaryOutputSchema>;
export type HealthManagementInput = z.infer<typeof healthManagementInputSchema>;
export type HealthManagementOutput = z.infer<typeof healthManagementOutputSchema>;

export const serviceRecommendationInputSchema = z
  .object({
    userId: z.string().min(1).optional(),
    query: z.string().trim().min(1).optional(),
    category: z.nativeEnum(ServiceCategoryEnum).optional(),
    city: z.string().trim().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(5).default(3)
  })
  .refine((value) => Boolean(value.userId || value.query), {
    message: "query or userId is required"
  });

export type ServiceRecommendationInput = z.infer<
  typeof serviceRecommendationInputSchema
>;

export const resourceConstraintSchema = z.object({
  key: z.string().min(1),
  value: z.union([z.string(), z.number(), z.boolean()])
});

export const careCoordinationCardInputSchema = z.object({
  requestMode: z.enum([
    "service-recommendation",
    "booking-prefill",
    "dispatch-suggestion"
  ]),
  userId: z.string().min(1).optional(),
  orderId: z.string().min(1).optional(),
  serviceRequest: z.string().min(1).optional(),
  resourceConstraints: z.array(resourceConstraintSchema).max(10).optional(),
  healthContextRef: nullableStringSchema.optional()
});

export const careCoordinationInputSchema = z.union([
  careCoordinationCardInputSchema,
  serviceRecommendationInputSchema
]);

export const serviceRecommendationItemSchema = z.object({
  serviceId: z.string(),
  title: z.string(),
  category: z.nativeEnum(ServiceCategoryEnum),
  price: z.number().nonnegative(),
  regionScope: z.array(z.string()).max(10),
  reason: z.string()
});

export const serviceRecommendationOutputSchema = baseAgentOutputSchema.extend({
  recommendations: z.array(serviceRecommendationItemSchema).max(5),
  matchingSignals: z.array(z.string()).max(6)
});

export const bookingDraftSchema = z.object({
  serviceId: z.string().min(1),
  title: z.string().min(1),
  suggestedSlots: z.array(z.string().min(1)).max(6),
  missingFields: z.array(z.string().min(1)).max(6).optional()
});

export const dispatchCandidateSchema = z.object({
  candidateId: z.string().min(1),
  label: z.string().min(1),
  score: z.number().min(0).max(1),
  reason: z.string().min(1)
});

export const careCoordinationOutputSchema = z.object({
  recommendedServices: z.array(serviceRecommendationItemSchema).max(5).optional(),
  bookingPrefill: bookingDraftSchema.nullable().optional(),
  dispatchCandidates: z.array(dispatchCandidateSchema).max(5).optional(),
  rankingReasons: z.array(z.string().min(1)).max(8).optional(),
  missingInfo: z.array(z.string().min(1)).max(8).optional(),
  humanReviewRequired: z.boolean()
});

export const careCoordinationExecutionOutputSchema = z.union([
  serviceRecommendationOutputSchema,
  careCoordinationOutputSchema
]);

export type ServiceRecommendationOutput = z.infer<
  typeof serviceRecommendationOutputSchema
>;
export type CareCoordinationInput = z.infer<typeof careCoordinationInputSchema>;
export type CareCoordinationOutput = z.infer<typeof careCoordinationOutputSchema>;
export type HealthManagementCardInput = z.infer<typeof healthManagementCardInputSchema>;
export type CareCoordinationCardInput = z.infer<typeof careCoordinationCardInputSchema>;

export const riskOperationsInputSchema = z.object({
  eventId: z.string().min(1).optional(),
  userId: z.string().min(1).optional(),
  metricHistoryWindow: z.array(genericRecordSchema).max(50).optional(),
  reportSummaryRef: nullableStringSchema.optional(),
  openAlerts: z.array(genericRecordSchema).max(20).optional(),
  interventionPlaybookVersion: z.string().min(1).optional()
});

export const riskOperationsOutputSchema = z.object({
  riskLevel: z.enum(["low", "medium", "high"]),
  riskSignals: z.array(z.string().min(1)).max(10),
  evidence: z.array(baseEvidenceSchema).max(8),
  recommendedActions: z.array(z.string().min(1)).max(10),
  triageQueueHint: nullableStringSchema.optional(),
  humanEscalationRequired: z.boolean()
});

export type RiskOperationsInput = z.infer<typeof riskOperationsInputSchema>;
export type RiskOperationsOutput = z.infer<typeof riskOperationsOutputSchema>;

export const deviceOperationsInputSchema = z.object({
  deviceId: z.string().min(1).optional(),
  institutionId: z.string().min(1).optional(),
  alertSnapshot: z.array(genericRecordSchema).max(20).optional(),
  statusBoardRef: z.string().min(1).optional(),
  topologyScope: genericRecordSchema.nullable().optional()
});

export const workOrderDraftSchema = z.object({
  title: z.string().min(1),
  priority: z.enum(["low", "medium", "high"]),
  assigneeHint: z.string().min(1).optional(),
  reason: z.string().min(1)
});

export const deviceOperationsOutputSchema = z.object({
  deviceDiagnosis: z.string().min(1),
  inspectionPriority: z.enum(["low", "medium", "high"]),
  suggestedActions: z.array(z.string().min(1)).max(8),
  suggestedWorkOrder: workOrderDraftSchema.nullable().optional()
});

export type DeviceOperationsInput = z.infer<typeof deviceOperationsInputSchema>;
export type DeviceOperationsOutput = z.infer<typeof deviceOperationsOutputSchema>;

export const contentActivityOpsInputSchema = z.object({
  contentId: z.string().min(1).optional(),
  activityId: z.string().min(1).optional(),
  analysisMode: z.enum([
    "content-summary",
    "activity-analysis",
    "campaign-suggestion"
  ]),
  interactionStatsRef: nullableStringSchema.optional(),
  scheduleWindow: nullableStringSchema.optional()
});

export const contentActivityOpsOutputSchema = z.object({
  contentBrief: z.string().min(1).optional(),
  tags: z.array(z.string().min(1)).max(8).optional(),
  activityAnalysis: nullableStringSchema.optional(),
  campaignSuggestion: z.array(z.string().min(1)).max(8).optional()
});

export type ContentActivityOpsInput = z.infer<
  typeof contentActivityOpsInputSchema
>;
export type ContentActivityOpsOutput = z.infer<
  typeof contentActivityOpsOutputSchema
>;

export const focusItemSchema = z.object({
  title: z.string().min(1),
  summary: z.string().min(1),
  priority: z.enum(["low", "medium", "high"])
});

export const taskBoardSectionSchema = z.object({
  title: z.string().min(1),
  items: z.array(z.string().min(1)).max(10)
});

export const operationsCopilotInputSchema = z.object({
  dashboardScope: z.string().min(1),
  healthBriefs: z.array(domainBriefSchema).max(20).optional(),
  careBriefs: z.array(domainBriefSchema).max(20).optional(),
  riskBriefs: z.array(domainBriefSchema).max(20).optional(),
  deviceBriefs: z.array(domainBriefSchema).max(20).optional(),
  contentBriefs: z.array(domainBriefSchema).max(20).optional(),
  domainRequests: z
    .object({
      health: healthManagementCardInputSchema.optional(),
      care: careCoordinationCardInputSchema.optional(),
      risk: riskOperationsInputSchema.optional(),
      device: deviceOperationsInputSchema.optional(),
      content: contentActivityOpsInputSchema.optional()
    })
    .optional()
});

export const operationsCopilotOutputSchema = z.object({
  dashboardDigest: z.string().min(1),
  focusList: z.array(focusItemSchema).max(10),
  opsTaskBoard: z.array(taskBoardSectionSchema).max(8),
  humanReviewRequired: z.boolean()
});

export type OperationsCopilotInput = z.infer<typeof operationsCopilotInputSchema>;
export type OperationsCopilotOutput = z.infer<typeof operationsCopilotOutputSchema>;

export const safetyReviewInputSchema = z.object({
  sourceAgent: z.string().min(1),
  sourceOutput: genericRecordSchema,
  policySnapshot: z.array(policyRuleRefSchema).max(20).default([]),
  promptTraceRef: nullableStringSchema.optional(),
  toolTraceRef: nullableStringSchema.optional(),
  declaredRiskLevel: z.enum(["low", "medium", "high"])
});

export const safetyReviewOutputSchema = z.object({
  reviewDecision: z.enum(["approved", "needs-human-review", "blocked", "retry"]),
  riskFlags: z.array(z.string().min(1)).max(10),
  humanReviewRequired: z.boolean(),
  blockedAction: nullableStringSchema.optional(),
  reviewNotes: z.array(z.string().min(1)).max(10).optional()
});

export type SafetyReviewInput = z.infer<typeof safetyReviewInputSchema>;
export type SafetyReviewOutput = z.infer<typeof safetyReviewOutputSchema>;

export const routerInputSchema = taskOrchestratorInputSchema;
export const routerOutputSchema = taskOrchestratorOutputSchema;

export interface AgentCoordinationStepTrace {
  step: string;
  agentName: string;
  taskType: string;
  status: "succeeded" | "skipped";
  reason: string;
  outputSummary?: Record<string, unknown>;
  llm?: LlmTrace;
  toolCalls?: ToolCallTrace[];
}

export interface AgentCoordinationTrace {
  executionPlan?: TaskOrchestratorOutput;
  steps?: AgentCoordinationStepTrace[];
  safetyReview?: SafetyReviewOutput | null;
}

export interface AgentExecutionTrace {
  route: AgentRouteTrace | null;
  toolCalls: ToolCallTrace[];
  promptVersion: string;
  llm: LlmTrace;
  coordination?: AgentCoordinationTrace;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  attempt: number;
  maxAttempts: number;
}

export interface AgentExecutionEnvelope<TOutput = unknown> {
  status: "running" | "retry-scheduled" | "succeeded" | "failed";
  agent: {
    requestedName: string;
    resolvedName: string;
    taskType: string;
    triggerSource: string | null;
    ownerId: string | null;
  };
  output?: TOutput;
  error?: {
    name: string;
    message: string;
  };
  trace: Partial<AgentExecutionTrace> & {
    attempt: number;
    maxAttempts: number;
    startedAt: string;
  };
}

export interface LlmStructuredResponse<TOutput> {
  output: TOutput;
  trace: LlmTrace;
}

export interface LlmToolDefinition {
  name: string;
  description: string;
  inputSchema: z.ZodType<Record<string, unknown>>;
}

export type LlmToolChoice = "auto" | "required" | { name: string };

export interface LlmToolCall {
  callId?: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface LlmToolCallResponse {
  toolCalls: LlmToolCall[];
  text: string;
  trace: LlmTrace;
}

export interface EmbeddingResponse {
  vectors: number[][];
  trace: LlmTrace;
}

export interface SerializableAgentTask {
  id: string;
  ownerId: string | null;
  agentName: string;
  taskType: string;
  status: AgentTaskStatus;
  triggerSource: string | null;
  payload: unknown;
}

export interface ReportContext {
  id: string;
  title: string;
  type: string;
  status: string;
  publishedAt: string | null;
  reviewedAt: string | null;
  summary: Record<string, unknown>;
  attachment: unknown;
  archiveId: string | null;
  order: {
    id: string;
    orderNo: string;
    status: string;
    service: {
      id: string;
      title: string;
      category: string;
    } | null;
  } | null;
  author: {
    id: string;
    name: string;
    role: string;
    title: string | null;
  } | null;
}

export interface ArchiveContext {
  id: string;
  userId: string;
  userName: string | null;
  riskTags: string[];
  baseProfile: Record<string, unknown>;
  medicalHistory: Record<string, unknown>;
  longTermMemory: Record<string, unknown>;
}

export interface MetricRecordContext {
  id: string;
  metricType: MetricType;
  value: number | null;
  unit: string | null;
  abnormal: boolean;
  measuredAt: string;
  payload: Record<string, unknown> | null;
}

export interface ServiceCatalogItem {
  id: string;
  title: string;
  category: ServiceCategory;
  summary: string | null;
  price: number;
  rating: number | null;
  salesVolume: number;
  regionScope: string[];
  tags: string[];
}

export class AgentExecutionError extends Error {
  constructor(
    message: string,
    readonly failureResult: AgentExecutionEnvelope
  ) {
    super(message);
  }
}
