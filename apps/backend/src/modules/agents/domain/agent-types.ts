import type { AgentTaskStatus, MetricType, ServiceCategory } from "@prisma/client";
import { MetricType as MetricTypeEnum, ServiceCategory as ServiceCategoryEnum } from "@prisma/client";
import { z } from "zod";

export type AgentCategory = "router" | "planner" | "reviewer" | "specialist";
export type AgentRiskLevel = "low" | "medium" | "high";
export type AgentTriggerMode = "sync" | "async" | "event";
export type AgentToolName =
  | "getReportContext"
  | "getHealthArchive"
  | "getLatestHealthMetrics"
  | "searchServiceCatalog";

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

export interface LlmTrace {
  provider: string;
  model: string;
  fallbackMode: boolean;
  error?: string;
}

export interface AgentExecutionTrace {
  route: AgentRouteTrace | null;
  toolCalls: ToolCallTrace[];
  promptVersion: string;
  llm: LlmTrace;
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

export interface SerializableAgentTask {
  id: string;
  ownerId: string | null;
  agentName: string;
  taskType: string;
  status: AgentTaskStatus;
  triggerSource: string | null;
  payload: unknown;
}

export const reportSummaryInputSchema = z.object({
  reportId: z.string().min(1),
  userId: z.string().min(1).optional(),
  includeArchive: z.boolean().default(true),
  includeLatestMetrics: z.boolean().default(true),
  metricTypes: z.array(z.nativeEnum(MetricTypeEnum)).max(6).optional()
});

export type ReportSummaryInput = z.infer<typeof reportSummaryInputSchema>;

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

export const routerInputSchema = z.object({}).passthrough();

export const baseEvidenceSchema = z.object({
  source: z.string(),
  summary: z.string(),
  data: z.record(z.string(), z.any()).optional()
});

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

export type ReportSummaryOutput = z.infer<typeof reportSummaryOutputSchema>;

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

export type ServiceRecommendationOutput = z.infer<
  typeof serviceRecommendationOutputSchema
>;

export const routerOutputSchema = z.object({
  resolvedAgent: z.string(),
  reason: z.string()
});

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
