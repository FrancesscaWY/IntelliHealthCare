import {
  BadRequestException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import {
  INTENT_ROUTER_AGENT,
  REPORT_SUMMARY_AGENT,
  SERVICE_RECOMMENDATION_AGENT
} from "../agents.constants";
import type {
  AgentDefinition,
  AgentDefinitionSummary,
  AgentRouteTrace
} from "./agent-types";
import {
  reportSummaryInputSchema,
  reportSummaryOutputSchema,
  routerInputSchema,
  routerOutputSchema,
  serviceRecommendationInputSchema,
  serviceRecommendationOutputSchema
} from "./agent-types";
import { z } from "zod";

@Injectable()
export class AgentRegistry {
  private readonly definitions = new Map<string, AgentDefinition>([
    [
      INTENT_ROUTER_AGENT,
      {
        name: INTENT_ROUTER_AGENT,
        category: "router",
        domain: "general",
        riskLevel: "low",
        triggerMode: "async",
        description: "根据任务类型将请求路由到受控 Specialist Agent。",
        taskTypes: [
          "report-summary",
          "report_interpretation",
          "service-recommendation",
          "service_recommendation"
        ],
        inputSchema: routerInputSchema,
        outputSchema: routerOutputSchema,
        allowedTools: [],
        forbiddenActions: [
          "database-write",
          "direct-business-state-transition",
          "tool-discovery"
        ],
        timeoutMs: 3_000,
        maxSteps: 1,
        humanReviewRequired: false,
        promptVersion: "intent-router.v1"
      }
    ],
    [
      REPORT_SUMMARY_AGENT,
      {
        name: REPORT_SUMMARY_AGENT,
        category: "specialist",
        domain: "reports",
        riskLevel: "medium",
        triggerMode: "async",
        description: "围绕报告与档案上下文输出结构化摘要和需跟进事项。",
        taskTypes: ["report-summary", "report_interpretation"],
        inputSchema: reportSummaryInputSchema,
        outputSchema: reportSummaryOutputSchema,
        allowedTools: ["getReportContext", "getHealthArchive", "getLatestHealthMetrics"],
        forbiddenActions: ["database-write", "medical-diagnosis", "autonomous-order-update"],
        timeoutMs: 20_000,
        maxSteps: 4,
        humanReviewRequired: true,
        promptVersion: "report-summary.v1"
      }
    ],
    [
      SERVICE_RECOMMENDATION_AGENT,
      {
        name: SERVICE_RECOMMENDATION_AGENT,
        category: "specialist",
        domain: "service-catalog",
        riskLevel: "low",
        triggerMode: "async",
        description: "基于用户意图、档案与服务目录输出可解释的服务推荐。",
        taskTypes: ["service-recommendation", "service_recommendation"],
        inputSchema: serviceRecommendationInputSchema,
        outputSchema: serviceRecommendationOutputSchema,
        allowedTools: [
          "getHealthArchive",
          "getLatestHealthMetrics",
          "searchServiceCatalog"
        ],
        forbiddenActions: ["database-write", "auto-purchase", "autonomous-dispatch"],
        timeoutMs: 18_000,
        maxSteps: 4,
        humanReviewRequired: false,
        promptVersion: "service-recommendation.v1"
      }
    ]
  ]);

  private readonly taskTypeRouting = new Map<string, string>([
    ["report-summary", REPORT_SUMMARY_AGENT],
    ["report_interpretation", REPORT_SUMMARY_AGENT],
    ["service-recommendation", SERVICE_RECOMMENDATION_AGENT],
    ["service_recommendation", SERVICE_RECOMMENDATION_AGENT]
  ]);

  getDefinition(name: string) {
    const definition = this.definitions.get(name);

    if (!definition) {
      throw new NotFoundException(`Unknown agent: ${name}`);
    }

    return definition;
  }

  resolve(requestedAgentName: string, taskType: string) {
    const requested = this.getDefinition(requestedAgentName);

    if (requested.category !== "router") {
      if (!requested.taskTypes.includes(taskType)) {
        throw new BadRequestException(
          `Agent ${requestedAgentName} does not support task type ${taskType}`
        );
      }

      return {
        requested,
        resolved: requested,
        route: null as AgentRouteTrace | null
      };
    }

    const resolvedName = this.taskTypeRouting.get(taskType);

    if (!resolvedName) {
      throw new BadRequestException(`Unsupported task type: ${taskType}`);
    }

    const resolved = this.getDefinition(resolvedName);

    return {
      requested,
      resolved,
      route: {
        requestedAgent: requested.name,
        resolvedAgent: resolved.name,
        reason: `taskType ${taskType} matched ${resolved.name}`
      } satisfies AgentRouteTrace
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

  private getSchemaFields(schema: AgentDefinition["inputSchema"]) {
    if (schema instanceof z.ZodObject) {
      return Object.keys(schema.shape as Record<string, unknown>);
    }

    return [];
  }
}
