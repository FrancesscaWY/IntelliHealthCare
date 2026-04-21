import {
  BadRequestException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { z } from "zod";
import {
  ASSISTANT_CONVERSATION_AGENT,
  CARE_COORDINATION_AGENT,
  CONTENT_ACTIVITY_OPS_AGENT,
  DEVICE_OPERATIONS_AGENT,
  HEALTH_MANAGEMENT_AGENT,
  LEGACY_INTENT_ROUTER_AGENT,
  LEGACY_REPORT_SUMMARY_AGENT,
  LEGACY_SERVICE_RECOMMENDATION_AGENT,
  OPERATIONS_COPILOT_AGENT,
  RISK_OPERATIONS_AGENT,
  SAFETY_REVIEW_AGENT,
  TASK_ORCHESTRATOR_AGENT
} from "../agents.constants";
import type {
  AgentDefinition,
  AgentDefinitionSummary,
  AgentRouteTrace
} from "./agent-types";
import {
  assistantConversationInputSchema,
  assistantConversationOutputSchema,
  careCoordinationExecutionOutputSchema,
  careCoordinationInputSchema,
  contentActivityOpsInputSchema,
  contentActivityOpsOutputSchema,
  deviceOperationsInputSchema,
  deviceOperationsOutputSchema,
  healthManagementExecutionOutputSchema,
  healthManagementInputSchema,
  operationsCopilotInputSchema,
  operationsCopilotOutputSchema,
  riskOperationsInputSchema,
  riskOperationsOutputSchema,
  safetyReviewInputSchema,
  safetyReviewOutputSchema,
  taskOrchestratorInputSchema,
  taskOrchestratorOutputSchema
} from "./agent-types";

@Injectable()
export class AgentRegistry {
  private readonly definitions = new Map<string, AgentDefinition>([
    [
      TASK_ORCHESTRATOR_AGENT,
      {
        name: TASK_ORCHESTRATOR_AGENT,
        category: "planner",
        domain: "control",
        riskLevel: "low",
        triggerMode: "async",
        description: "统一控制面，负责任务标准化、路由、协作策略和人工复核提示。",
        taskTypes: [
          "task-orchestration",
          "assistant-conversation",
          "report-summary",
          "report-interpretation",
          "health-summary",
          "focus-elder-brief",
          "service-recommendation",
          "booking-prefill",
          "dispatch-suggestion",
          "risk-screening",
          "alert-triage",
          "risk-reminder",
          "device-diagnosis",
          "device-inspection",
          "content-summary",
          "activity-analysis",
          "campaign-suggestion",
          "dashboard-digest",
          "shift-summary",
          "morning-brief",
          "safety-review"
        ],
        inputSchema: taskOrchestratorInputSchema,
        outputSchema: taskOrchestratorOutputSchema,
        allowedTools: [
          "getTaskMetadata",
          "getConversationContext",
          "getPolicyRules",
          "getAgentRegistry"
        ],
        forbiddenActions: [
          "database-write",
          "medical-final-decision",
          "high-risk-auto-execution",
          "unregistered-agent-creation"
        ],
        timeoutMs: 10_000,
        maxSteps: 2,
        humanReviewRequired: false,
        promptVersion: "TaskOrchestratorAgent.v1"
      }
    ],
    [
      ASSISTANT_CONVERSATION_AGENT,
      {
        name: ASSISTANT_CONVERSATION_AGENT,
        category: "specialist",
        domain: "conversation",
        riskLevel: "low",
        triggerMode: "sync",
        description: "用户侧统一康养助手门面，承接会话并整合下游结果。",
        taskTypes: ["assistant-conversation"],
        inputSchema: assistantConversationInputSchema,
        outputSchema: assistantConversationOutputSchema,
        allowedTools: [
          "getConversationHistory",
          "getResponseTemplates",
          "getPageRegistry",
          "getTaskOrchestratorOutput"
        ],
        forbiddenActions: [
          "bypass-control-layer",
          "high-risk-direct-write",
          "private-data-leak"
        ],
        timeoutMs: 12_000,
        maxSteps: 2,
        humanReviewRequired: false,
        promptVersion: "AssistantConversationAgent.v1"
      }
    ],
    [
      HEALTH_MANAGEMENT_AGENT,
      {
        name: HEALTH_MANAGEMENT_AGENT,
        category: "specialist",
        domain: "health-management",
        riskLevel: "medium",
        triggerMode: "async",
        description: "统一承担报告解读、健康摘要和重点长者健康简报。",
        taskTypes: [
          "report-summary",
          "report-interpretation",
          "health-summary",
          "focus-elder-brief"
        ],
        inputSchema: healthManagementInputSchema,
        outputSchema: healthManagementExecutionOutputSchema,
        allowedTools: [
          "getReportContext",
          "getHealthArchive",
          "getLatestHealthMetrics",
          "getMetricHistory",
          "getMedicationContext",
          "getDietContext",
          "getSelfTestContext"
        ],
        forbiddenActions: [
          "medical-diagnosis",
          "database-write",
          "high-risk-direct-action"
        ],
        timeoutMs: 30_000,
        maxSteps: 4,
        humanReviewRequired: true,
        promptVersion: "HealthManagementAgent.v1"
      }
    ],
    [
      CARE_COORDINATION_AGENT,
      {
        name: CARE_COORDINATION_AGENT,
        category: "specialist",
        domain: "care-coordination",
        riskLevel: "medium",
        triggerMode: "async",
        description: "统一承担服务推荐、预约预填和派单候选排序。",
        taskTypes: [
          "service-recommendation",
          "booking-prefill",
          "dispatch-suggestion"
        ],
        inputSchema: careCoordinationInputSchema,
        outputSchema: careCoordinationExecutionOutputSchema,
        allowedTools: [
          "searchServiceCatalog",
          "getHealthArchive",
          "getLatestHealthMetrics",
          "getAddressBook",
          "getOrderContext",
          "getStaffRoster",
          "getScheduleAvailability",
          "getInstitutionCoverage"
        ],
        forbiddenActions: [
          "database-write",
          "auto-purchase",
          "autonomous-dispatch"
        ],
        timeoutMs: 30_000,
        maxSteps: 4,
        humanReviewRequired: false,
        promptVersion: "CareCoordinationAgent.v1"
      }
    ],
    [
      RISK_OPERATIONS_AGENT,
      {
        name: RISK_OPERATIONS_AGENT,
        category: "specialist",
        domain: "risk-operations",
        riskLevel: "high",
        triggerMode: "event",
        description: "统一承担风险识别、风险分级、预警分诊和回访建议。",
        taskTypes: ["risk-screening", "alert-triage", "risk-reminder"],
        inputSchema: riskOperationsInputSchema,
        outputSchema: riskOperationsOutputSchema,
        allowedTools: [
          "getMetricHistory",
          "getHealthArchive",
          "getRecentReports",
          "getOpenAlerts",
          "getStaffRoster",
          "getInterventionPlaybook"
        ],
        forbiddenActions: [
          "medical-diagnosis",
          "high-risk-direct-outreach",
          "final-status-change"
        ],
        timeoutMs: 120_000,
        maxSteps: 4,
        humanReviewRequired: true,
        promptVersion: "RiskOperationsAgent.v1"
      }
    ],
    [
      DEVICE_OPERATIONS_AGENT,
      {
        name: DEVICE_OPERATIONS_AGENT,
        category: "specialist",
        domain: "device-operations",
        riskLevel: "medium",
        triggerMode: "event",
        description: "围绕设备异常输出诊断、巡检优先级和处理建议。",
        taskTypes: ["device-diagnosis", "device-inspection"],
        inputSchema: deviceOperationsInputSchema,
        outputSchema: deviceOperationsOutputSchema,
        allowedTools: [
          "getDeviceStatusBoard",
          "getRecentDeviceAlerts",
          "getInstitutionTopology"
        ],
        forbiddenActions: [
          "device-control-command",
          "auto-close-alert",
          "final-repair-write"
        ],
        timeoutMs: 60_000,
        maxSteps: 3,
        humanReviewRequired: false,
        promptVersion: "DeviceOperationsAgent.v1"
      }
    ],
    [
      CONTENT_ACTIVITY_OPS_AGENT,
      {
        name: CONTENT_ACTIVITY_OPS_AGENT,
        category: "specialist",
        domain: "content-activity-ops",
        riskLevel: "low",
        triggerMode: "async",
        description: "围绕资讯、讲堂和活动输出摘要、标签和运营建议。",
        taskTypes: ["content-summary", "activity-analysis", "campaign-suggestion"],
        inputSchema: contentActivityOpsInputSchema,
        outputSchema: contentActivityOpsOutputSchema,
        allowedTools: [
          "getContentLibrary",
          "getActivityRegistry",
          "getContentInteractionStats"
        ],
        forbiddenActions: [
          "content-publish",
          "formal-schedule-write",
          "external-plan-write"
        ],
        timeoutMs: 60_000,
        maxSteps: 3,
        humanReviewRequired: false,
        promptVersion: "ContentActivityOpsAgent.v1"
      }
    ],
    [
      OPERATIONS_COPILOT_AGENT,
      {
        name: OPERATIONS_COPILOT_AGENT,
        category: "specialist",
        domain: "operations-copilot",
        riskLevel: "medium",
        triggerMode: "sync",
        description: "整合多领域结果，形成后台工作台摘要和优先级看板。",
        taskTypes: ["dashboard-digest", "shift-summary", "morning-brief"],
        inputSchema: operationsCopilotInputSchema,
        outputSchema: operationsCopilotOutputSchema,
        allowedTools: [
          "getDashboardMetrics",
          "getDispatchBoard",
          "getOpenAlerts",
          "getDeviceStatusBoard",
          "getContentOpsBoard",
          "getActivityOpsBoard"
        ],
        forbiddenActions: [
          "dashboard-status-write",
          "cross-domain-final-decision",
          "auto-close-alert"
        ],
        timeoutMs: 60_000,
        maxSteps: 4,
        humanReviewRequired: true,
        promptVersion: "OperationsCopilotAgent.v1"
      }
    ],
    [
      SAFETY_REVIEW_AGENT,
      {
        name: SAFETY_REVIEW_AGENT,
        category: "reviewer",
        domain: "safety-governance",
        riskLevel: "high",
        triggerMode: "sync",
        description: "统一安全复核门禁，决定放行、阻断或转人工复核。",
        taskTypes: ["safety-review"],
        inputSchema: safetyReviewInputSchema,
        outputSchema: safetyReviewOutputSchema,
        allowedTools: [
          "getPolicyRules",
          "getPromptTrace",
          "getToolTrace",
          "getRiskRuleSet"
        ],
        forbiddenActions: [
          "replace-upstream-decision",
          "bypass-human-approval",
          "database-write"
        ],
        timeoutMs: 15_000,
        maxSteps: 2,
        humanReviewRequired: true,
        promptVersion: "SafetyReviewAgent.v1"
      }
    ]
  ]);

  private readonly aliases = new Map<string, string>([
    [LEGACY_INTENT_ROUTER_AGENT, TASK_ORCHESTRATOR_AGENT],
    [LEGACY_REPORT_SUMMARY_AGENT, HEALTH_MANAGEMENT_AGENT],
    [LEGACY_SERVICE_RECOMMENDATION_AGENT, CARE_COORDINATION_AGENT]
  ]);

  private readonly taskTypeRouting = new Map<string, string>([
    ["task-orchestration", TASK_ORCHESTRATOR_AGENT],
    ["assistant-conversation", ASSISTANT_CONVERSATION_AGENT],
    ["report-summary", HEALTH_MANAGEMENT_AGENT],
    ["report-interpretation", HEALTH_MANAGEMENT_AGENT],
    ["health-summary", HEALTH_MANAGEMENT_AGENT],
    ["focus-elder-brief", HEALTH_MANAGEMENT_AGENT],
    ["service-recommendation", CARE_COORDINATION_AGENT],
    ["booking-prefill", CARE_COORDINATION_AGENT],
    ["dispatch-suggestion", CARE_COORDINATION_AGENT],
    ["risk-screening", RISK_OPERATIONS_AGENT],
    ["alert-triage", RISK_OPERATIONS_AGENT],
    ["risk-reminder", RISK_OPERATIONS_AGENT],
    ["device-diagnosis", DEVICE_OPERATIONS_AGENT],
    ["device-inspection", DEVICE_OPERATIONS_AGENT],
    ["content-summary", CONTENT_ACTIVITY_OPS_AGENT],
    ["activity-analysis", CONTENT_ACTIVITY_OPS_AGENT],
    ["campaign-suggestion", CONTENT_ACTIVITY_OPS_AGENT],
    ["dashboard-digest", OPERATIONS_COPILOT_AGENT],
    ["shift-summary", OPERATIONS_COPILOT_AGENT],
    ["morning-brief", OPERATIONS_COPILOT_AGENT],
    ["safety-review", SAFETY_REVIEW_AGENT]
  ]);

  normalizeAgentName(name: string) {
    return this.aliases.get(name) ?? name;
  }

  normalizeTaskType(taskType: string) {
    return taskType.replace(/_/g, "-");
  }

  getDefinition(name: string) {
    const definition = this.definitions.get(this.normalizeAgentName(name));

    if (!definition) {
      throw new NotFoundException(`Unknown agent: ${name}`);
    }

    return definition;
  }

  resolve(requestedAgentName: string, taskType: string) {
    const normalizedTaskType = this.normalizeTaskType(taskType);
    const requested = this.getDefinition(requestedAgentName);

    if (requested.name !== TASK_ORCHESTRATOR_AGENT) {
      if (!requested.taskTypes.includes(normalizedTaskType)) {
        throw new BadRequestException(
          `Agent ${requestedAgentName} does not support task type ${taskType}`
        );
      }

      return {
        requested,
        resolved: requested,
        taskType: normalizedTaskType,
        route: null as AgentRouteTrace | null
      };
    }

    const resolvedName = this.taskTypeRouting.get(normalizedTaskType);

    if (!resolvedName) {
      throw new BadRequestException(`Unsupported task type: ${taskType}`);
    }

    const resolved = this.getDefinition(resolvedName);

    return {
      requested,
      resolved,
      taskType: normalizedTaskType,
      route:
        resolved.name === requested.name
          ? null
          : ({
              requestedAgent: requested.name,
              resolvedAgent: resolved.name,
              reason: `taskType ${normalizedTaskType} matched ${resolved.name}`
            } satisfies AgentRouteTrace)
    };
  }

  listSummaries(): AgentDefinitionSummary[] {
    return Array.from(this.definitions.values()).map((definition) => ({
      name: definition.name,
      category: definition.category,
      domain: definition.domain,
      riskLevel: definition.riskLevel,
      triggerMode: definition.triggerMode,
      description: definition.description,
      taskTypes: definition.taskTypes,
      allowedTools: definition.allowedTools,
      forbiddenActions: definition.forbiddenActions,
      timeoutMs: definition.timeoutMs,
      maxSteps: definition.maxSteps,
      humanReviewRequired: definition.humanReviewRequired,
      promptVersion: definition.promptVersion,
      inputFields: this.getSchemaFields(definition.inputSchema),
      outputFields: this.getSchemaFields(definition.outputSchema)
    }));
  }

  private getSchemaFields(schema: z.ZodTypeAny): string[] {
    if (schema instanceof z.ZodObject) {
      return Object.keys(schema.shape as Record<string, unknown>);
    }

    if (schema instanceof z.ZodUnion) {
      return Array.from(
        new Set(
          (schema.options as z.ZodTypeAny[]).flatMap((option) =>
            this.getSchemaFields(option)
          )
        )
      );
    }

    if (schema instanceof z.ZodOptional || schema instanceof z.ZodNullable) {
      return this.getSchemaFields(schema.unwrap() as z.ZodTypeAny);
    }

    return [];
  }
}
