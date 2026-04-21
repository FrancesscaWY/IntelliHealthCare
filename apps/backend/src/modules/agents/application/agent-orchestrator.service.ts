import { BadRequestException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { MetricType, ServiceCategory } from "@prisma/client";
import type { EnvironmentVariables } from "../../../common/config/env.schema";
import {
  ASSISTANT_CONVERSATION_AGENT,
  CARE_COORDINATION_AGENT,
  CONTENT_ACTIVITY_OPS_AGENT,
  DEVICE_OPERATIONS_AGENT,
  HEALTH_MANAGEMENT_AGENT,
  OPERATIONS_COPILOT_AGENT,
  RISK_OPERATIONS_AGENT,
  SAFETY_REVIEW_AGENT,
  TASK_ORCHESTRATOR_AGENT
} from "../agents.constants";
import { AgentRegistry } from "../domain/agent-registry";
import type {
  AgentDefinition,
  AgentExecutionEnvelope,
  AgentExecutionTrace,
  AgentRuntimeAttempt,
  AgentToolName,
  ArchiveContext,
  AssistantConversationInput,
  ContentActivityOpsInput,
  DeviceOperationsInput,
  MetricRecordContext,
  OperationsCopilotInput,
  ReportContext,
  RiskOperationsInput,
  SafetyReviewInput,
  SafetyReviewOutput,
  SerializableAgentTask,
  ServiceCatalogItem,
  ServiceRecommendationInput,
  ServiceRecommendationOutput,
  TaskOrchestratorInput,
  TaskOrchestratorOutput,
  ToolCallTrace
} from "../domain/agent-types";
import {
  AgentExecutionError,
  assistantConversationInputSchema,
  assistantConversationOutputSchema,
  careCoordinationCardInputSchema,
  careCoordinationOutputSchema,
  contentActivityOpsInputSchema,
  contentActivityOpsOutputSchema,
  deviceOperationsInputSchema,
  deviceOperationsOutputSchema,
  healthManagementCardInputSchema,
  healthManagementOutputSchema,
  operationsCopilotInputSchema,
  operationsCopilotOutputSchema,
  reportSummaryInputSchema,
  reportSummaryOutputSchema,
  riskOperationsInputSchema,
  riskOperationsOutputSchema,
  safetyReviewInputSchema,
  safetyReviewOutputSchema,
  serviceRecommendationInputSchema,
  serviceRecommendationOutputSchema,
  taskOrchestratorInputSchema,
  taskOrchestratorOutputSchema
} from "../domain/agent-types";
import { LlmGateway } from "../gateways/llm.gateway";
import { HealthArchiveTool } from "../tools/health-archive.tool";
import { HealthMetricsTool } from "../tools/health-metrics.tool";
import { ReportsTool } from "../tools/reports.tool";
import { ServiceCatalogTool } from "../tools/service-catalog.tool";

interface AgentExecutionData {
  data: unknown;
  trace: {
    llm: AgentExecutionTrace["llm"];
  };
}

@Injectable()
export class AgentOrchestratorService {
  constructor(
    private readonly agentRegistry: AgentRegistry,
    private readonly llmGateway: LlmGateway,
    private readonly reportsTool: ReportsTool,
    private readonly healthArchiveTool: HealthArchiveTool,
    private readonly healthMetricsTool: HealthMetricsTool,
    private readonly serviceCatalogTool: ServiceCatalogTool,
    private readonly configService: ConfigService<EnvironmentVariables, true>
  ) {}

  buildRunningEnvelope(
    task: SerializableAgentTask,
    runtime: AgentRuntimeAttempt
  ): AgentExecutionEnvelope {
    const startedAt = new Date().toISOString();

    return {
      status: "running",
      agent: {
        requestedName: task.agentName,
        resolvedName: task.agentName,
        taskType: task.taskType,
        triggerSource: task.triggerSource,
        ownerId: task.ownerId
      },
      trace: {
        startedAt,
        attempt: runtime.attempt,
        maxAttempts: runtime.maxAttempts
      }
    };
  }

  async executeTask(
    task: SerializableAgentTask,
    runtime: AgentRuntimeAttempt
  ): Promise<AgentExecutionEnvelope> {
    const startedAtMs = Date.now();
    const startedAt = new Date(startedAtMs).toISOString();
    const resolution = this.agentRegistry.resolve(task.agentName, task.taskType);
    const { requested, resolved, route, taskType } = resolution;
    const toolCalls: ToolCallTrace[] = [];

    try {
      const executionPlan =
        requested.name === TASK_ORCHESTRATOR_AGENT
          ? await this.buildExecutionPlan({
              task,
              route,
              resolved,
              taskType
            })
          : undefined;

      const execution = await this.executeResolvedTask({
        task: {
          ...task,
          taskType
        },
        resolved,
        toolCalls
      });

      const safetyReview = await this.maybeRunSafetyReview(
        {
          ...task,
          taskType
        },
        resolved,
        execution.data
      );
      const output = safetyReview
        ? this.applySafetyReviewResult(execution.data, safetyReview)
        : execution.data;
      const completedAt = new Date().toISOString();

      return {
        status: "succeeded",
        agent: {
          requestedName: task.agentName,
          resolvedName: resolved.name,
          taskType,
          triggerSource: task.triggerSource,
          ownerId: task.ownerId
        },
        output,
        trace: this.buildTrace({
          route,
          toolCalls,
          llm: execution.trace.llm,
          promptVersion: resolved.promptVersion,
          coordination:
            executionPlan || safetyReview
              ? {
                  executionPlan,
                  safetyReview
                }
              : undefined,
          startedAt,
          completedAt,
          durationMs: Date.now() - startedAtMs,
          attempt: runtime.attempt,
          maxAttempts: runtime.maxAttempts
        })
      };
    } catch (error) {
      if (error instanceof AgentExecutionError) {
        throw error;
      }

      throw new AgentExecutionError(
        error instanceof Error ? error.message : "Agent execution failed",
        this.buildFailureEnvelope({
          task,
          resolvedName: resolved.name,
          route,
          toolCalls,
          startedAt,
          runtime,
          promptVersion: resolved.promptVersion,
          error
        })
      );
    }
  }

  buildRetryEnvelope(
    task: SerializableAgentTask,
    runtime: AgentRuntimeAttempt,
    failureResult: AgentExecutionEnvelope
  ): AgentExecutionEnvelope {
    return {
      ...failureResult,
      status: "retry-scheduled",
      trace: {
        ...failureResult.trace,
        attempt: runtime.attempt,
        maxAttempts: runtime.maxAttempts
      }
    };
  }

  buildDispatchFailureEnvelope(
    task: SerializableAgentTask,
    error: unknown
  ): AgentExecutionEnvelope {
    const startedAt = new Date().toISOString();

    return {
      status: "failed",
      agent: {
        requestedName: task.agentName,
        resolvedName: task.agentName,
        taskType: task.taskType,
        triggerSource: task.triggerSource,
        ownerId: task.ownerId
      },
      error: {
        name: "QueueDispatchError",
        message: this.getErrorMessage(error)
      },
      trace: {
        startedAt,
        completedAt: startedAt,
        durationMs: 0,
        attempt: 1,
        maxAttempts: 1
      }
    };
  }

  private async executeResolvedTask(input: {
    task: SerializableAgentTask;
    resolved: AgentDefinition;
    toolCalls: ToolCallTrace[];
  }): Promise<AgentExecutionData> {
    switch (input.resolved.name) {
      case TASK_ORCHESTRATOR_AGENT:
        return this.executeTaskOrchestrator(input.task, input.resolved);
      case ASSISTANT_CONVERSATION_AGENT:
        return this.executeAssistantConversation(input.task, input.resolved);
      case HEALTH_MANAGEMENT_AGENT:
        return this.executeHealthManagement(
          input.task,
          input.resolved,
          input.toolCalls
        );
      case CARE_COORDINATION_AGENT:
        return this.executeCareCoordination(
          input.task,
          input.resolved,
          input.toolCalls
        );
      case RISK_OPERATIONS_AGENT:
        return this.executeRiskOperations(input.task, input.resolved);
      case DEVICE_OPERATIONS_AGENT:
        return this.executeDeviceOperations(input.task, input.resolved);
      case CONTENT_ACTIVITY_OPS_AGENT:
        return this.executeContentActivityOps(input.task, input.resolved);
      case OPERATIONS_COPILOT_AGENT:
        return this.executeOperationsCopilot(input.task, input.resolved);
      case SAFETY_REVIEW_AGENT:
        return this.executeSafetyReviewTask(input.task, input.resolved);
      default:
        throw new BadRequestException(`Unsupported resolved agent ${input.resolved.name}`);
    }
  }

  private async executeTaskOrchestrator(
    task: SerializableAgentTask,
    definition: AgentDefinition
  ): Promise<AgentExecutionData> {
    let input: TaskOrchestratorInput;

    try {
      input = taskOrchestratorInputSchema.parse(task.payload);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : "Invalid task orchestration payload"
      );
    }

    const resolution = this.agentRegistry.resolve(TASK_ORCHESTRATOR_AGENT, input.taskType);
    const llmResponse = await this.llmGateway.generateStructuredObject({
      agentName: definition.name,
      modelTier: "light",
      systemPrompt:
        "你是 IntelliHealthCare 的 TaskOrchestratorAgent。只能输出 JSON，不给出业务结论，只负责生成受控执行计划。",
      userPrompt: JSON.stringify(
        {
          requestedTaskType: input.taskType,
          triggerSource: input.triggerSource,
          ownerId: input.ownerId ?? task.ownerId,
          targetAgent: resolution.resolved.name,
          targetRiskLevel: resolution.resolved.riskLevel,
          allowedTools: resolution.resolved.allowedTools,
          taskContext: input.taskContext ?? null,
          policySnapshot: input.policySnapshot ?? []
        },
        null,
        2
      ),
      outputSchema: taskOrchestratorOutputSchema,
      fallbackFactory: () =>
        this.buildExecutionPlanFallback({
          taskType: resolution.taskType,
          triggerSource: input.triggerSource,
          resolved: resolution.resolved,
          route: resolution.route
        })
    });

    return {
      data: taskOrchestratorOutputSchema.parse(llmResponse.output),
      trace: {
        llm: llmResponse.trace
      }
    };
  }

  private async executeAssistantConversation(
    task: SerializableAgentTask,
    definition: AgentDefinition
  ): Promise<AgentExecutionData> {
    let input: AssistantConversationInput;

    try {
      input = assistantConversationInputSchema.parse(task.payload);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error
          ? error.message
          : "Invalid assistant conversation payload"
      );
    }

    const fallback = this.buildAssistantConversationFallback(input);
    const llmResponse = await this.llmGateway.generateStructuredObject({
      agentName: definition.name,
      modelTier: "light",
      systemPrompt:
        "你是 IntelliHealthCare 的统一康养助手门面。只能输出 JSON，回复要克制、清晰，不伪造医学结论。",
      userPrompt: JSON.stringify(
        {
          userMessage: input.userMessage,
          conversationHistory: input.conversationHistory ?? [],
          resolvedIntent: input.resolvedIntent ?? null,
          pageContext: input.pageContext ?? null
        },
        null,
        2
      ),
      outputSchema: assistantConversationOutputSchema,
      fallbackFactory: () => fallback
    });

    return {
      data: assistantConversationOutputSchema.parse(llmResponse.output),
      trace: {
        llm: llmResponse.trace
      }
    };
  }

  private async executeHealthManagement(
    task: SerializableAgentTask,
    definition: AgentDefinition,
    toolCalls: ToolCallTrace[]
  ): Promise<AgentExecutionData> {
    const taskType = this.agentRegistry.normalizeTaskType(task.taskType);

    if (taskType === "report-summary" || taskType === "report-interpretation") {
      return this.executeReportSummary(task, definition, toolCalls);
    }

    let input: ReturnType<typeof healthManagementCardInputSchema.parse>;

    try {
      input = healthManagementCardInputSchema.parse(task.payload);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : "Invalid health management payload"
      );
    }

    const report = input.reportId
      ? await this.useTool(
          definition,
          toolCalls,
          "getReportContext",
          {
            reportId: input.reportId
          },
          () => this.reportsTool.getReportContext(input.reportId!),
          (value) => ({
            reportId: value.id,
            title: value.title,
            type: value.type
          })
        ).catch(() => null)
      : null;
    const archive =
      input.userId || input.archiveId
        ? await this.useTool(
            definition,
            toolCalls,
            "getHealthArchive",
            {
              userId: input.userId,
              archiveId: input.archiveId
            },
            () =>
              this.healthArchiveTool.getArchiveContext({
                userId: input.userId,
                archiveId: input.archiveId
              }),
            (value) => ({
              archiveId: value.id,
              userId: value.userId,
              riskTags: value.riskTags.slice(0, 3)
            })
          ).catch(() => null)
        : null;
    const metricTypes = this.toMetricTypes(input.metricTypes);
    const metrics =
      archive?.userId || input.userId
        ? await this.useTool(
            definition,
            toolCalls,
            "getLatestHealthMetrics",
            {
              userId: archive?.userId ?? input.userId ?? "",
              metricTypes
            },
            () =>
              this.healthMetricsTool.getLatestMetrics(
                archive?.userId ?? input.userId ?? "",
                metricTypes
              ),
            (value) => ({
              count: value.length,
              abnormalCount: value.filter((item) => item.abnormal).length
            })
          ).catch(() => [])
        : [];

    const fallback = this.buildHealthManagementFallback(
      input.viewMode,
      report,
      archive,
      metrics,
      definition.humanReviewRequired
    );
    const llmResponse = await this.llmGateway.generateStructuredObject({
      agentName: definition.name,
      modelTier: "primary",
      systemPrompt:
        "你是 IntelliHealthCare 的 HealthManagementAgent。只能输出 JSON，只做健康理解和摘要，不给出医学诊断结论。",
      userPrompt: JSON.stringify(
        {
          taskType,
          viewMode: input.viewMode,
          report,
          archive,
          metrics,
          authorizedScope: input.authorizedScope
        },
        null,
        2
      ),
      outputSchema: healthManagementOutputSchema,
      fallbackFactory: () => fallback
    });

    return {
      data: healthManagementOutputSchema.parse(llmResponse.output),
      trace: {
        llm: llmResponse.trace
      }
    };
  }

  private async executeReportSummary(
    task: SerializableAgentTask,
    definition: AgentDefinition,
    toolCalls: ToolCallTrace[]
  ): Promise<AgentExecutionData> {
    let input: ReturnType<typeof reportSummaryInputSchema.parse>;

    try {
      input = reportSummaryInputSchema.parse(task.payload);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : "Invalid report summary payload"
      );
    }

    const report = await this.useTool(
      definition,
      toolCalls,
      "getReportContext",
      {
        reportId: input.reportId
      },
      () => this.reportsTool.getReportContext(input.reportId),
      (value) => ({
        reportId: value.id,
        title: value.title,
        type: value.type
      })
    );

    const archive =
      input.includeArchive && (report.archiveId || input.userId)
        ? await this.useTool(
            definition,
            toolCalls,
            "getHealthArchive",
            {
              archiveId: report.archiveId,
              userId: input.userId
            },
            () =>
              this.healthArchiveTool.getArchiveContext({
                archiveId: report.archiveId,
                userId: input.userId
              }),
            (value) => ({
              archiveId: value.id,
              userId: value.userId,
              riskTags: value.riskTags.slice(0, 3)
            })
          )
        : null;

    const metricTypes = input.metricTypes ?? [
      MetricType.BLOOD_GLUCOSE,
      MetricType.BLOOD_PRESSURE,
      MetricType.HEART_RATE
    ];
    const metrics =
      input.includeLatestMetrics && (archive?.userId || input.userId)
        ? await this.useTool(
            definition,
            toolCalls,
            "getLatestHealthMetrics",
            {
              userId: archive?.userId ?? input.userId ?? "",
              metricTypes
            },
            () =>
              this.healthMetricsTool.getLatestMetrics(
                archive?.userId ?? input.userId ?? "",
                metricTypes
              ),
            (value) => ({
              count: value.length,
              abnormalCount: value.filter((item) => item.abnormal).length
            })
          )
        : [];

    const deterministicOutput = this.buildReportSummaryFallback(
      report,
      archive,
      metrics,
      definition.humanReviewRequired
    );
    const llmResponse = await this.llmGateway.generateStructuredObject({
      agentName: definition.name,
      modelTier: "primary",
      systemPrompt:
        "你是 IntelliHealthCare 的报告摘要 Specialist Agent。只能输出 JSON，不要输出 Markdown。结论必须简洁，证据必须引用报告、档案或指标。",
      userPrompt: JSON.stringify(
        {
          taskType: task.taskType,
          report,
          archive,
          metrics,
          outputKeys: [
            "conclusion",
            "evidence",
            "uncertainties",
            "followUpActions",
            "requiresHumanReview",
            "reportHighlights",
            "riskSignals"
          ]
        },
        null,
        2
      ),
      outputSchema: reportSummaryOutputSchema,
      fallbackFactory: () => deterministicOutput
    });

    return {
      data: reportSummaryOutputSchema.parse(llmResponse.output),
      trace: {
        llm: llmResponse.trace
      }
    };
  }

  private async executeCareCoordination(
    task: SerializableAgentTask,
    definition: AgentDefinition,
    toolCalls: ToolCallTrace[]
  ): Promise<AgentExecutionData> {
    const taskType = this.agentRegistry.normalizeTaskType(task.taskType);

    if (taskType === "service-recommendation") {
      const legacyInput = this.parseServiceRecommendationPayload(task.payload);
      if (legacyInput) {
        return this.executeServiceRecommendation(legacyInput, task, definition, toolCalls);
      }

      const cardInput = careCoordinationCardInputSchema.parse(task.payload);
      return this.executeServiceRecommendation(
        {
          userId: cardInput.userId,
          query: cardInput.serviceRequest,
          limit: 3
        },
        task,
        definition,
        toolCalls
      );
    }

    let input: ReturnType<typeof careCoordinationCardInputSchema.parse>;

    try {
      input = careCoordinationCardInputSchema.parse(task.payload);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error
          ? error.message
          : "Invalid care coordination payload"
      );
    }

    const fallback = this.buildCareCoordinationFallback(input);
    const llmResponse = await this.llmGateway.generateStructuredObject({
      agentName: definition.name,
      modelTier: "light",
      systemPrompt:
        "你是 IntelliHealthCare 的 CareCoordinationAgent。只能输出 JSON，不创建订单、不自动派单。",
      userPrompt: JSON.stringify(
        {
          taskType,
          requestMode: input.requestMode,
          userId: input.userId,
          orderId: input.orderId,
          serviceRequest: input.serviceRequest,
          resourceConstraints: input.resourceConstraints ?? [],
          healthContextRef: input.healthContextRef ?? null
        },
        null,
        2
      ),
      outputSchema: careCoordinationOutputSchema,
      fallbackFactory: () => fallback
    });

    return {
      data: careCoordinationOutputSchema.parse(llmResponse.output),
      trace: {
        llm: llmResponse.trace
      }
    };
  }

  private async executeServiceRecommendation(
    input: ServiceRecommendationInput,
    task: SerializableAgentTask,
    definition: AgentDefinition,
    toolCalls: ToolCallTrace[]
  ): Promise<AgentExecutionData> {
    const archive = input.userId
      ? await this.useTool(
          definition,
          toolCalls,
          "getHealthArchive",
          {
            userId: input.userId
          },
          () =>
            this.healthArchiveTool.getArchiveContext({
              userId: input.userId
            }),
          (value) => ({
            archiveId: value.id,
            riskTags: value.riskTags.slice(0, 3)
          })
        ).catch(() => null)
      : null;

    const metrics = input.userId
      ? await this.useTool(
          definition,
          toolCalls,
          "getLatestHealthMetrics",
          {
            userId: input.userId,
            metricTypes: [MetricType.BLOOD_GLUCOSE, MetricType.BLOOD_PRESSURE]
          },
          () =>
            this.healthMetricsTool.getLatestMetrics(input.userId!, [
              MetricType.BLOOD_GLUCOSE,
              MetricType.BLOOD_PRESSURE
            ]),
          (value) => ({
            count: value.length,
            abnormalCount: value.filter((item) => item.abnormal).length
          })
        ).catch(() => [])
      : [];

    const category = input.category ?? this.inferCategory(input, archive);
    const query = input.query ?? this.buildRecommendationQuery(archive, category);
    const services = await this.useTool(
      definition,
      toolCalls,
      "searchServiceCatalog",
      {
        query,
        category,
        city: input.city,
        limit: input.limit
      },
      () =>
        this.serviceCatalogTool.searchServiceCatalog({
          query,
          category,
          city: input.city,
          limit: input.limit
        }),
      (value) => ({
        count: value.length,
        ids: value.map((item) => item.id)
      })
    );

    const deterministicOutput = this.buildServiceRecommendationFallback(
      input,
      category,
      archive,
      metrics,
      services
    );
    const llmResponse = await this.llmGateway.generateStructuredObject({
      agentName: definition.name,
      modelTier: "primary",
      systemPrompt:
        "你是 IntelliHealthCare 的服务推荐 Specialist Agent。只能输出 JSON，不要给出诊断结论，推荐理由必须对应服务目录或用户上下文。",
      userPrompt: JSON.stringify(
        {
          taskType: task.taskType,
          input: {
            ...input,
            category,
            query
          },
          archive,
          metrics,
          services,
          outputKeys: [
            "conclusion",
            "evidence",
            "uncertainties",
            "followUpActions",
            "requiresHumanReview",
            "recommendations",
            "matchingSignals"
          ]
        },
        null,
        2
      ),
      outputSchema: serviceRecommendationOutputSchema,
      fallbackFactory: () => deterministicOutput
    });

    return {
      data: serviceRecommendationOutputSchema.parse(llmResponse.output),
      trace: {
        llm: llmResponse.trace
      }
    };
  }

  private async executeRiskOperations(
    task: SerializableAgentTask,
    definition: AgentDefinition
  ): Promise<AgentExecutionData> {
    let input: RiskOperationsInput;

    try {
      input = riskOperationsInputSchema.parse(task.payload);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : "Invalid risk operations payload"
      );
    }

    const fallback = this.buildRiskOperationsFallback(input);
    const llmResponse = await this.llmGateway.generateStructuredObject({
      agentName: definition.name,
      modelTier: "primary",
      systemPrompt:
        "你是 IntelliHealthCare 的 RiskOperationsAgent。只能输出 JSON，保留证据链，不给出医疗诊断。",
      userPrompt: JSON.stringify(input, null, 2),
      outputSchema: riskOperationsOutputSchema,
      fallbackFactory: () => fallback
    });

    return {
      data: riskOperationsOutputSchema.parse(llmResponse.output),
      trace: {
        llm: llmResponse.trace
      }
    };
  }

  private async executeDeviceOperations(
    task: SerializableAgentTask,
    definition: AgentDefinition
  ): Promise<AgentExecutionData> {
    let input: DeviceOperationsInput;

    try {
      input = deviceOperationsInputSchema.parse(task.payload);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : "Invalid device operations payload"
      );
    }

    const fallback = this.buildDeviceOperationsFallback(input);
    const llmResponse = await this.llmGateway.generateStructuredObject({
      agentName: definition.name,
      modelTier: "light",
      systemPrompt:
        "你是 IntelliHealthCare 的 DeviceOperationsAgent。只能输出 JSON，给出诊断和建议，不直接下发设备控制命令。",
      userPrompt: JSON.stringify(input, null, 2),
      outputSchema: deviceOperationsOutputSchema,
      fallbackFactory: () => fallback
    });

    return {
      data: deviceOperationsOutputSchema.parse(llmResponse.output),
      trace: {
        llm: llmResponse.trace
      }
    };
  }

  private async executeContentActivityOps(
    task: SerializableAgentTask,
    definition: AgentDefinition
  ): Promise<AgentExecutionData> {
    let input: ContentActivityOpsInput;

    try {
      input = contentActivityOpsInputSchema.parse(task.payload);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error
          ? error.message
          : "Invalid content activity ops payload"
      );
    }

    const fallback = this.buildContentActivityOpsFallback(input);
    const llmResponse = await this.llmGateway.generateStructuredObject({
      agentName: definition.name,
      modelTier: "light",
      systemPrompt:
        "你是 IntelliHealthCare 的 ContentActivityOpsAgent。只能输出 JSON，提供摘要、标签和运营建议。",
      userPrompt: JSON.stringify(input, null, 2),
      outputSchema: contentActivityOpsOutputSchema,
      fallbackFactory: () => fallback
    });

    return {
      data: contentActivityOpsOutputSchema.parse(llmResponse.output),
      trace: {
        llm: llmResponse.trace
      }
    };
  }

  private async executeOperationsCopilot(
    task: SerializableAgentTask,
    definition: AgentDefinition
  ): Promise<AgentExecutionData> {
    let input: OperationsCopilotInput;

    try {
      input = operationsCopilotInputSchema.parse(task.payload);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : "Invalid operations copilot payload"
      );
    }

    const fallback = this.buildOperationsCopilotFallback(input);
    const llmResponse = await this.llmGateway.generateStructuredObject({
      agentName: definition.name,
      modelTier: "light",
      systemPrompt:
        "你是 IntelliHealthCare 的 OperationsCopilotAgent。只能输出 JSON，聚合多域摘要，不直接修改后台状态。",
      userPrompt: JSON.stringify(input, null, 2),
      outputSchema: operationsCopilotOutputSchema,
      fallbackFactory: () => fallback
    });

    return {
      data: operationsCopilotOutputSchema.parse(llmResponse.output),
      trace: {
        llm: llmResponse.trace
      }
    };
  }

  private async executeSafetyReviewTask(
    task: SerializableAgentTask,
    definition: AgentDefinition
  ): Promise<AgentExecutionData> {
    let input: SafetyReviewInput;

    try {
      input = safetyReviewInputSchema.parse(task.payload);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : "Invalid safety review payload"
      );
    }

    const review = await this.reviewOutput(input, definition);

    return {
      data: review,
      trace: {
        llm: {
          provider: "safety-review",
          model: definition.promptVersion,
          fallbackMode: false,
          modelTier: "light",
          strictJson: true,
          toolCalling: false
        }
      }
    };
  }

  private async buildExecutionPlan(input: {
    task: SerializableAgentTask;
    route: AgentExecutionTrace["route"];
    resolved: AgentDefinition;
    taskType: string;
  }) {
    const fallback = this.buildExecutionPlanFallback({
      taskType: input.taskType,
      triggerSource: input.task.triggerSource ?? "internal-api",
      resolved: input.resolved,
      route: input.route
    });
    const llmResponse = await this.llmGateway.generateStructuredObject({
      agentName: TASK_ORCHESTRATOR_AGENT,
      modelTier: "light",
      systemPrompt:
        "你是 IntelliHealthCare 的 TaskOrchestratorAgent。只能输出 JSON，给出受控执行计划和人工复核提示。",
      userPrompt: JSON.stringify(
        {
          taskId: input.task.id,
          taskType: input.taskType,
          triggerSource: input.task.triggerSource,
          ownerId: input.task.ownerId,
          requestedAgent: input.task.agentName,
          resolvedAgent: input.resolved.name,
          allowedTools: input.resolved.allowedTools,
          riskLevel: input.resolved.riskLevel,
          route: input.route
        },
        null,
        2
      ),
      outputSchema: taskOrchestratorOutputSchema,
      fallbackFactory: () => fallback
    });

    return taskOrchestratorOutputSchema.parse(llmResponse.output);
  }

  private async maybeRunSafetyReview(
    task: SerializableAgentTask,
    definition: AgentDefinition,
    output: unknown
  ): Promise<SafetyReviewOutput | null> {
    if (!this.shouldRunSafetyReview(task, definition)) {
      return null;
    }

    return this.reviewOutput(
      {
        sourceAgent: definition.name,
        sourceOutput: this.toRecord(output),
        policySnapshot: [],
        promptTraceRef: definition.promptVersion,
        toolTraceRef: null,
        declaredRiskLevel: definition.riskLevel
      },
      this.agentRegistry.getDefinition(SAFETY_REVIEW_AGENT)
    );
  }

  private async reviewOutput(
    input: SafetyReviewInput,
    definition: AgentDefinition
  ): Promise<SafetyReviewOutput> {
    const fallback = this.buildSafetyReviewFallback(input);
    const llmResponse = await this.llmGateway.generateStructuredObject({
      agentName: definition.name,
      modelTier: "light",
      systemPrompt:
        "你是 IntelliHealthCare 的 SafetyReviewAgent。只能输出 JSON，只做风险复核门禁，不重做上游专业判断。",
      userPrompt: JSON.stringify(input, null, 2),
      outputSchema: safetyReviewOutputSchema,
      fallbackFactory: () => fallback
    });

    return safetyReviewOutputSchema.parse(llmResponse.output);
  }

  private shouldRunSafetyReview(task: SerializableAgentTask, definition: AgentDefinition) {
    const taskType = this.agentRegistry.normalizeTaskType(task.taskType);

    if (definition.name === SAFETY_REVIEW_AGENT || definition.name === TASK_ORCHESTRATOR_AGENT) {
      return false;
    }

    if (
      [
        HEALTH_MANAGEMENT_AGENT,
        CARE_COORDINATION_AGENT,
        RISK_OPERATIONS_AGENT,
        OPERATIONS_COPILOT_AGENT
      ].includes(definition.name)
    ) {
      return true;
    }

    return definition.humanReviewRequired || taskType === "dispatch-suggestion";
  }

  private applySafetyReviewResult(output: unknown, review: SafetyReviewOutput) {
    if (!review.humanReviewRequired && review.reviewDecision === "approved") {
      return output;
    }

    const nextOutput = this.toRecord(output);

    if ("requiresHumanReview" in nextOutput) {
      nextOutput.requiresHumanReview = true;
    }

    if ("humanReviewRequired" in nextOutput) {
      nextOutput.humanReviewRequired = true;
    }

    if ("humanEscalationRequired" in nextOutput) {
      nextOutput.humanEscalationRequired = true;
    }

    const reviewNote =
      review.reviewNotes?.[0] ??
      (review.reviewDecision === "blocked"
        ? "当前结果已被安全门禁阻断，需人工复核。"
        : "当前结果需人工复核后再继续。");

    if ("followUpActions" in nextOutput && Array.isArray(nextOutput.followUpActions)) {
      nextOutput.followUpActions = this.appendUniqueString(
        nextOutput.followUpActions,
        reviewNote
      );
    }

    if (
      "followUpSuggestions" in nextOutput &&
      Array.isArray(nextOutput.followUpSuggestions)
    ) {
      nextOutput.followUpSuggestions = this.appendUniqueString(
        nextOutput.followUpSuggestions,
        reviewNote
      );
    }

    if (
      "recommendedActions" in nextOutput &&
      Array.isArray(nextOutput.recommendedActions)
    ) {
      nextOutput.recommendedActions = this.appendUniqueString(
        nextOutput.recommendedActions,
        reviewNote
      );
    }

    if (review.reviewDecision === "blocked") {
      if ("assistantReply" in nextOutput) {
        nextOutput.assistantReply = "当前请求涉及高风险内容，已转人工服务处理。";
      }

      if ("conclusion" in nextOutput) {
        nextOutput.conclusion = "当前结论已转人工复核，暂不自动下发。";
      }

      if ("healthSummary" in nextOutput) {
        nextOutput.healthSummary = "当前健康解读需人工复核后提供。";
      }

      if ("dashboardDigest" in nextOutput) {
        nextOutput.dashboardDigest = "当前后台摘要需人工复核后展示。";
      }
    }

    return nextOutput;
  }

  private buildAssistantConversationFallback(input: AssistantConversationInput) {
    const keywordHint = this.pickAssistantHint(input.userMessage);

    return {
      assistantReply: `已收到你的问题：“${input.userMessage}”。${keywordHint}`,
      followUpQuestion:
        input.userMessage.length < 8
          ? "可以再补充一下具体需求，例如报告、服务或风险提醒。"
          : null,
      navigationSuggestion: input.pageContext?.pageId
        ? {
            pageId: input.pageContext.pageId,
            label: "当前页面",
            reason: "继续在当前页面补充上下文可以减少来回跳转。"
          }
        : null,
      pendingTaskHint:
        input.resolvedIntent?.workflowRoute === "serial"
          ? "当前请求可能需要进入受控任务处理和人工复核。"
          : null
    };
  }

  private buildExecutionPlanFallback(input: {
    taskType: string;
    triggerSource: string;
    resolved: AgentDefinition;
    route: AgentExecutionTrace["route"];
  }): TaskOrchestratorOutput {
    const workflowRoute =
      input.triggerSource === "event" || input.triggerSource === "schedule"
        ? "event-driven"
        : this.shouldSeriallyReview(input.resolved)
          ? "serial"
          : "single-agent";

    const steps: TaskOrchestratorOutput["executionPlan"]["steps"] = [
      {
        step: "route",
        agent: input.resolved.name,
        reason: input.route?.reason ?? `taskType ${input.taskType} matched ${input.resolved.name}`
      }
    ];

    if (workflowRoute === "serial" && input.resolved.name !== SAFETY_REVIEW_AGENT) {
      steps.push({
        step: "safety-review",
        agent: SAFETY_REVIEW_AGENT,
        reason: "中高风险或声明需要人工复核的任务执行后进入统一安全门禁。"
      });
    }

    return {
      executionPlan: {
        summary: `任务 ${input.taskType} 将由 ${input.resolved.name} 执行。`,
        steps
      },
      targetAgentList:
        workflowRoute === "serial" && input.resolved.name !== SAFETY_REVIEW_AGENT
          ? [input.resolved.name, SAFETY_REVIEW_AGENT]
          : [input.resolved.name],
      workflowRoute,
      requiredContext: input.resolved.allowedTools.slice(0, 6),
      humanReviewHint: this.shouldSeriallyReview(input.resolved)
        ? "该任务执行后需要进入 SafetyReviewAgent 或人工复核队列。"
        : null
    };
  }

  private buildHealthManagementFallback(
    viewMode: "report-interpretation" | "health-summary" | "focus-elder-brief",
    report: ReportContext | null,
    archive: ArchiveContext | null,
    metrics: MetricRecordContext[],
    humanReviewRequired: boolean
  ) {
    const keyFindings = [
      ...(report ? this.pickHighlights(report.summary) : []),
      ...(archive?.riskTags ?? []),
      ...metrics
        .filter((item) => item.abnormal)
        .map((item) => `${this.metricLabel(item.metricType)} 指标需关注`)
    ].filter(Boolean);
    const summaryPrefix =
      viewMode === "focus-elder-brief" ? "重点长者简报" : viewMode === "health-summary" ? "健康摘要" : "报告解读";

    return {
      healthSummary: `${summaryPrefix}已生成，当前重点为 ${keyFindings[0] ?? "暂无明显异常摘要"}。`,
      keyFindings: keyFindings.slice(0, 6),
      riskSignals: [
        ...(archive?.riskTags ?? []),
        ...metrics
          .filter((item) => item.abnormal)
          .map((item) => `${this.metricLabel(item.metricType)}异常`)
      ].slice(0, 6),
      followUpSuggestions: [
        report ? "结合报告原文确认重点结论是否需要同步给家属或医生。" : "继续补充近期报告或自测数据。",
        archive ? "核对长期风险标签是否需要更新。" : "补充健康档案以完善长期背景。",
        metrics.length ? "跟踪最近异常指标变化趋势。" : "补充最近健康指标以提高判断稳定性。"
      ].slice(0, 6),
      uncertainties: [
        ...(report ? [] : ["缺少报告原文，无法给出更细的报告视角摘要。"]),
        ...(archive ? [] : ["缺少健康档案，长期背景信息不足。"]),
        ...(metrics.length ? [] : ["缺少最近指标，趋势判断存在不确定性。"])
      ].slice(0, 6),
      humanReviewRequired: humanReviewRequired || viewMode === "report-interpretation"
    };
  }

  private buildReportSummaryFallback(
    report: ReportContext,
    archive: ArchiveContext | null,
    metrics: MetricRecordContext[],
    humanReviewRequired: boolean
  ) {
    const reportHighlights = this.pickHighlights(report.summary);
    const riskSignals = [
      ...(archive?.riskTags ?? []),
      ...metrics
        .filter((item) => item.abnormal)
        .map((item) => `${this.metricLabel(item.metricType)} 指标需关注`)
    ].slice(0, 6);
    const primaryHighlight = reportHighlights[0] ?? report.title;

    return {
      conclusion: `已完成《${report.title}》摘要，当前重点为 ${primaryHighlight}。`,
      evidence: [
        {
          source: "report",
          summary: `报告标题为《${report.title}》，类型 ${report.type}。`,
          data: {
            reportId: report.id,
            publishedAt: report.publishedAt
          }
        },
        ...(archive
          ? [
              {
                source: "health-archive",
                summary: `已关联健康档案风险标签：${archive.riskTags.join("、") || "暂无"}`,
                data: {
                  archiveId: archive.id
                }
              }
            ]
          : []),
        ...(metrics.length
          ? [
              {
                source: "health-metrics",
                summary: `提取到 ${metrics.length} 项最近健康指标，异常 ${metrics.filter((item) => item.abnormal).length} 项。`,
                data: {
                  metricTypes: metrics.map((item) => item.metricType)
                }
              }
            ]
          : [])
      ],
      uncertainties: [
        ...(archive ? [] : ["缺少关联健康档案，无法补充长期风险背景"]),
        ...(metrics.length ? [] : ["缺少最近健康指标，无法补充趋势判断"])
      ].slice(0, 6),
      followUpActions: this.deriveReportFollowUps(report, riskSignals),
      requiresHumanReview: humanReviewRequired || report.status !== "PUBLISHED",
      reportHighlights,
      riskSignals
    };
  }

  private buildCareCoordinationFallback(
    input: ReturnType<typeof careCoordinationCardInputSchema.parse>
  ) {
    if (input.requestMode === "booking-prefill") {
      return {
        recommendedServices: undefined,
        bookingPrefill: {
          serviceId: input.orderId ?? "draft-service",
          title: input.serviceRequest ?? "待确认服务",
          suggestedSlots: ["明天上午", "明天下午"],
          missingFields: [
            ...(input.userId ? [] : ["联系人"]),
            ...(input.healthContextRef ? [] : ["健康背景摘要"])
          ]
        },
        dispatchCandidates: undefined,
        rankingReasons: ["已根据当前服务请求生成预约草稿。"],
        missingInfo: [
          ...(input.userId ? [] : ["缺少用户信息"]),
          ...(input.serviceRequest ? [] : ["缺少服务需求描述"])
        ].slice(0, 6),
        humanReviewRequired: false
      };
    }

    return {
      recommendedServices: undefined,
      bookingPrefill: null,
      dispatchCandidates: [
        {
          candidateId: "dispatch-candidate-1",
          label: "值班护理人员 A",
          score: 0.86,
          reason: "区域和时段匹配度较高。"
        },
        {
          candidateId: "dispatch-candidate-2",
          label: "值班康复师 B",
          score: 0.73,
          reason: "具备相近服务经验，可作为备选。"
        }
      ],
      rankingReasons: [
        "当前资源候选基于静态约束生成，尚未自动确认排班。",
        "涉及履约建议，默认保留人工复核入口。"
      ],
      missingInfo: input.resourceConstraints?.length
        ? []
        : ["缺少更细的资源约束，候选排序仅供运营参考。"],
      humanReviewRequired: input.requestMode === "dispatch-suggestion"
    };
  }

  private buildServiceRecommendationFallback(
    input: ServiceRecommendationInput,
    category: ServiceCategory,
    archive: ArchiveContext | null,
    metrics: MetricRecordContext[],
    services: ServiceCatalogItem[]
  ): ServiceRecommendationOutput {
    const recommendations = services.slice(0, input.limit).map((service) => ({
      serviceId: service.id,
      title: service.title,
      category: service.category,
      price: service.price,
      regionScope: service.regionScope,
      reason: this.buildServiceReason(service, input, archive, metrics)
    }));
    const matchingSignals = [
      ...(input.query ? [input.query] : []),
      ...(archive?.riskTags ?? []),
      ...metrics
        .filter((item) => item.abnormal)
        .map((item) => `${this.metricLabel(item.metricType)}异常`)
    ].slice(0, 6);
    const firstTitle = recommendations[0]?.title ?? "人工服务咨询";

    return {
      conclusion: `已根据当前需求筛选 ${category} 类服务，优先建议 ${firstTitle}。`,
      evidence: [
        {
          source: "service-catalog",
          summary: `命中 ${services.length} 个服务目录候选。`,
          data: {
            category,
            city: input.city ?? null
          }
        },
        ...(archive
          ? [
              {
                source: "health-archive",
                summary: `已参考档案风险标签：${archive.riskTags.join("、") || "暂无"}`,
                data: {
                  archiveId: archive.id
                }
              }
            ]
          : []),
        ...(metrics.length
          ? [
              {
                source: "health-metrics",
                summary: `已参考 ${metrics.length} 条最近健康指标。`,
                data: {
                  abnormalCount: metrics.filter((item) => item.abnormal).length
                }
              }
            ]
          : [])
      ],
      uncertainties: [
        ...(input.city ? [] : ["未指定服务城市，推荐结果按全量服务目录筛选"]),
        ...(archive ? [] : ["缺少健康档案，推荐无法结合长期风险标签"]),
        ...(services.length ? [] : ["当前筛选条件下暂无可直接推荐的服务"])
      ].slice(0, 6),
      followUpActions: [
        "确认服务地址和可预约时间",
        "如涉及慢病管理，先核对最近报告和用药情况",
        "下单前由人工客服确认服务边界"
      ],
      requiresHumanReview: false,
      recommendations,
      matchingSignals
    };
  }

  private buildRiskOperationsFallback(input: RiskOperationsInput) {
    const alertCount = input.openAlerts?.length ?? 0;
    const abnormalMetricCount =
      input.metricHistoryWindow?.filter((item) => this.isAbnormalMetricRecord(item)).length ?? 0;
    const riskLevel: "low" | "medium" | "high" =
      alertCount >= 3 || abnormalMetricCount >= 3
        ? "high"
        : alertCount > 0 || abnormalMetricCount > 0 || input.reportSummaryRef
          ? "medium"
          : "low";
    const riskSignals = [
      ...(alertCount ? [`存在 ${alertCount} 条待处理预警`] : []),
      ...(abnormalMetricCount ? [`存在 ${abnormalMetricCount} 条异常指标记录`] : []),
      ...(input.reportSummaryRef ? ["存在待参考的报告摘要结论"] : [])
    ].slice(0, 6);

    return {
      riskLevel,
      riskSignals,
      evidence: [
        {
          source: "input",
          summary: "风险判断基于事件输入、指标窗口和待处理预警数量。",
          data: {
            eventId: input.eventId ?? null,
            alertCount,
            abnormalMetricCount
          }
        }
      ],
      recommendedActions:
        riskLevel === "high"
          ? ["立即进入人工分诊队列。", "值班人员核对最近报告与异常指标。"]
          : riskLevel === "medium"
            ? ["安排人工回访或继续观察。", "补充最近健康背景和预警处置记录。"]
            : ["继续监测。", "定时巡检下次再评估。"],
      triageQueueHint:
        riskLevel === "high" ? "high-risk-ops-queue" : riskLevel === "medium" ? "risk-followup-queue" : null,
      humanEscalationRequired: riskLevel !== "low"
    };
  }

  private buildDeviceOperationsFallback(input: DeviceOperationsInput) {
    const alertCount = input.alertSnapshot?.length ?? 0;
    const inspectionPriority: "low" | "medium" | "high" =
      alertCount >= 3 ? "high" : alertCount > 0 || input.deviceId ? "medium" : "low";

    return {
      deviceDiagnosis:
        alertCount > 0
          ? `检测到 ${alertCount} 条设备异常，优先排查连接、电量和同步状态。`
          : "当前未发现明确异常快照，建议例行巡检。",
      inspectionPriority,
      suggestedActions: [
        "核对设备在线状态和最近心跳时间。",
        "检查电量、网络和机构侧拓扑关联。",
        "如持续异常，转设备运维人工巡检。"
      ],
      suggestedWorkOrder:
        inspectionPriority === "high"
          ? {
              title: "设备异常人工巡检",
              priority: "high" as const,
              assigneeHint: input.institutionId ?? "device-ops-duty",
              reason: "多条设备异常需要现场核查。"
            }
          : null
    };
  }

  private buildContentActivityOpsFallback(input: ContentActivityOpsInput) {
    if (input.analysisMode === "content-summary") {
      return {
        contentBrief: `已为内容 ${input.contentId ?? "draft"} 生成运营摘要。`,
        tags: ["康养", "用户教育", "内容复盘"],
        activityAnalysis: null,
        campaignSuggestion: ["补充封面与摘要文案。", "发布后观察首日互动情况。"]
      };
    }

    if (input.analysisMode === "activity-analysis") {
      return {
        contentBrief: undefined,
        tags: ["社区活动", "互动分析"],
        activityAnalysis: `已对活动 ${input.activityId ?? "draft"} 做基础互动分析，建议关注报名转化与到场率。`,
        campaignSuggestion: ["按报名高峰时段优化提醒。", "梳理活动后的复盘内容。"]
      };
    }

    return {
      contentBrief: undefined,
      tags: ["运营策划"],
      activityAnalysis: null,
      campaignSuggestion: [
        "优先围绕高互动主题生成下期活动建议。",
        "结合排期窗口控制预算和发布时间。"
      ]
    };
  }

  private buildOperationsCopilotFallback(input: OperationsCopilotInput) {
    const briefs = this.collectDomainBriefs(input);
    const focusList = briefs.slice(0, 5).map((brief) => ({
      title: brief.title,
      summary: brief.summary,
      priority: brief.priority
    }));

    return {
      dashboardDigest:
        focusList.length > 0
          ? `当前工作台共聚合 ${focusList.length} 条重点事项，优先关注 ${focusList[0].title}。`
          : "当前暂无待聚合的重点事项。",
      focusList,
      opsTaskBoard: [
        {
          title: "待跟进",
          items: focusList.map((item) => item.title).slice(0, 6)
        },
        {
          title: "建议动作",
          items: [
            "核对高优先级摘要是否需要人工确认。",
            "将跨域事项同步给对应模块负责人。"
          ]
        }
      ],
      humanReviewRequired: focusList.some((item) => item.priority === "high")
    };
  }

  private buildSafetyReviewFallback(input: SafetyReviewInput): SafetyReviewOutput {
    const serialized = JSON.stringify(input.sourceOutput);
    const riskFlags: string[] = [];

    if (!input.sourceOutput || Object.keys(input.sourceOutput).length === 0) {
      riskFlags.push("source-output-empty");
      return {
        reviewDecision: "retry",
        riskFlags,
        humanReviewRequired: true,
        blockedAction: null,
        reviewNotes: ["上游输出为空，建议重试或转人工确认。"]
      };
    }

    if (input.declaredRiskLevel === "high") {
      riskFlags.push("declared-high-risk");
    }

    if (/诊断|处方|急救|自动执行|自动派单/.test(serialized)) {
      riskFlags.push("medical-or-auto-execution-boundary");
    }

    if (/dispatchCandidates/.test(serialized)) {
      riskFlags.push("dispatch-suggestion-needs-review");
    }

    if (riskFlags.includes("medical-or-auto-execution-boundary")) {
      return {
        reviewDecision: "blocked",
        riskFlags,
        humanReviewRequired: true,
        blockedAction: "high-risk-output",
        reviewNotes: ["命中医学或自动执行边界，禁止直接放行。"]
      };
    }

    if (riskFlags.length > 0) {
      return {
        reviewDecision: "needs-human-review",
        riskFlags,
        humanReviewRequired: true,
        blockedAction: null,
        reviewNotes: ["命中风险规则，需人工复核。"]
      };
    }

    return {
      reviewDecision: "approved",
      riskFlags: [],
      humanReviewRequired: false,
      blockedAction: null,
      reviewNotes: ["未命中高风险规则，可继续流转。"]
    };
  }

  private async useTool<T>(
    definition: AgentDefinition,
    toolCalls: ToolCallTrace[],
    toolName: AgentToolName,
    input: Record<string, unknown>,
    action: () => Promise<T>,
    summarize: (value: T) => Record<string, unknown>
  ) {
    this.ensureToolAllowed(definition, toolName);
    this.ensureToolBudget(definition, toolCalls.length);
    const startedAt = Date.now();

    try {
      const result = await action();
      toolCalls.push({
        tool: toolName,
        status: "succeeded",
        durationMs: Date.now() - startedAt,
        input,
        outputSummary: summarize(result)
      });

      return result;
    } catch (error) {
      toolCalls.push({
        tool: toolName,
        status: "failed",
        durationMs: Date.now() - startedAt,
        input,
        error: this.getErrorMessage(error)
      });
      throw error;
    }
  }

  private ensureToolAllowed(definition: AgentDefinition, toolName: AgentToolName) {
    if (!definition.allowedTools.includes(toolName)) {
      throw new BadRequestException(
        `Tool ${toolName} is not allowed for agent ${definition.name}`
      );
    }
  }

  private ensureToolBudget(definition: AgentDefinition, toolCallCount: number) {
    const runtimeBudget = this.configService.get("AGENT_MAX_TOOL_STEPS", {
      infer: true
    });

    if (toolCallCount >= Math.min(runtimeBudget, definition.maxSteps)) {
      throw new BadRequestException(
        `Agent ${definition.name} exceeded its tool budget`
      );
    }
  }

  private buildTrace(trace: AgentExecutionTrace): AgentExecutionTrace {
    const tracingEnabled = this.configService.get("AGENT_ENABLE_TRACING", {
      infer: true
    });

    if (tracingEnabled) {
      return trace;
    }

    return {
      ...trace,
      toolCalls: []
    };
  }

  private buildFailureEnvelope(input: {
    task: SerializableAgentTask;
    resolvedName: string;
    route: AgentExecutionTrace["route"];
    toolCalls: ToolCallTrace[];
    startedAt: string;
    runtime: AgentRuntimeAttempt;
    promptVersion: string;
    error: unknown;
  }): AgentExecutionEnvelope {
    const completedAt = new Date().toISOString();
    const message = this.getErrorMessage(input.error);

    return {
      status: "failed",
      agent: {
        requestedName: input.task.agentName,
        resolvedName: input.resolvedName,
        taskType: input.task.taskType,
        triggerSource: input.task.triggerSource,
        ownerId: input.task.ownerId
      },
      error: {
        name:
          input.error instanceof Error ? input.error.name : "AgentExecutionError",
        message
      },
      trace: this.buildTrace({
        route: input.route,
        toolCalls: input.toolCalls,
        promptVersion: input.promptVersion,
        llm: {
          provider: "unknown",
          model: this.configService.get("AGENT_LLM_FALLBACK_MODEL", {
            infer: true
          }),
          fallbackMode: true,
          error: message
        },
        startedAt: input.startedAt,
        completedAt,
        durationMs:
          new Date(completedAt).getTime() - new Date(input.startedAt).getTime(),
        attempt: input.runtime.attempt,
        maxAttempts: input.runtime.maxAttempts
      })
    };
  }

  private parseServiceRecommendationPayload(payload: unknown) {
    const parsed = serviceRecommendationInputSchema.safeParse(payload);
    return parsed.success ? parsed.data : null;
  }

  private toMetricTypes(metricTypes?: string[]) {
    if (!metricTypes?.length) {
      return [MetricType.BLOOD_GLUCOSE, MetricType.BLOOD_PRESSURE, MetricType.HEART_RATE];
    }

    const validTypes = new Set(Object.values(MetricType));
    const normalized = metricTypes.filter((type): type is MetricType =>
      validTypes.has(type as MetricType)
    );

    return normalized.length > 0
      ? normalized.slice(0, 6)
      : [MetricType.BLOOD_GLUCOSE, MetricType.BLOOD_PRESSURE, MetricType.HEART_RATE];
  }

  private shouldSeriallyReview(definition: AgentDefinition) {
    return definition.humanReviewRequired || definition.riskLevel !== "low";
  }

  private toRecord(value: unknown): Record<string, unknown> {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return { ...(value as Record<string, unknown>) };
    }

    return {
      value
    };
  }

  private appendUniqueString(values: unknown, nextValue: string) {
    const current = Array.isArray(values)
      ? values.filter((value): value is string => typeof value === "string")
      : [];

    if (current.includes(nextValue)) {
      return current;
    }

    return [...current, nextValue].slice(0, 10);
  }

  private isAbnormalMetricRecord(record: Record<string, unknown>) {
    return record.abnormal === true || record.status === "abnormal";
  }

  private collectDomainBriefs(input: OperationsCopilotInput) {
    const briefs = [
      ...(input.healthBriefs ?? []),
      ...(input.careBriefs ?? []),
      ...(input.riskBriefs ?? []),
      ...(input.deviceBriefs ?? []),
      ...(input.contentBriefs ?? [])
    ];

    return [...briefs].sort((left, right) => this.priorityScore(right.priority) - this.priorityScore(left.priority));
  }

  private priorityScore(priority: "low" | "medium" | "high") {
    switch (priority) {
      case "high":
        return 3;
      case "medium":
        return 2;
      default:
        return 1;
    }
  }

  private pickAssistantHint(userMessage: string) {
    if (/报告|体检|检查/.test(userMessage)) {
      return "这更像报告解读场景，我会优先走健康理解链路。";
    }

    if (/服务|上门|预约|护理/.test(userMessage)) {
      return "这更像服务协同场景，我会优先走服务推荐和预约链路。";
    }

    if (/风险|异常|预警/.test(userMessage)) {
      return "这更像风险提醒场景，我会优先走风险运营链路。";
    }

    return "如需更精确处理，可以继续补充报告、服务或风险相关细节。";
  }

  private pickHighlights(summary: Record<string, unknown>) {
    const highlights: string[] = [];

    for (const value of Object.values(summary)) {
      if (typeof value === "string") {
        highlights.push(value);
      }

      if (Array.isArray(value)) {
        for (const item of value) {
          if (typeof item === "string") {
            highlights.push(item);
          }
        }
      }
    }

    return highlights.slice(0, 6);
  }

  private deriveReportFollowUps(report: ReportContext, riskSignals: string[]) {
    const actions = ["由医生或客服确认摘要结果是否需要同步到业务流程"];

    if (report.type === "CHECKUP") {
      actions.push("提醒家属或老人按报告建议完成复诊和复查");
    }

    if (riskSignals.length > 0) {
      actions.push("结合风险标签核对是否需要人工随访");
    }

    return actions.slice(0, 6);
  }

  private inferCategory(
    input: ServiceRecommendationInput,
    archive: ArchiveContext | null
  ) {
    const sourceText = [input.query, ...(archive?.riskTags ?? [])].join(" ");

    if (/康复|卒中|关节|步态/.test(sourceText)) {
      return ServiceCategory.REHAB_THERAPY;
    }

    if (/血糖|血压|慢病|体检|复查/.test(sourceText)) {
      return ServiceCategory.HOME_EXAM;
    }

    if (/入住|照料|照护|日间/.test(sourceText)) {
      return ServiceCategory.ELDERLY_CARE;
    }

    return ServiceCategory.HOME_CARE;
  }

  private buildRecommendationQuery(
    archive: ArchiveContext | null,
    category: ServiceCategory
  ) {
    const riskSignals = archive?.riskTags ?? [];

    if (riskSignals.length > 0) {
      return riskSignals[0];
    }

    switch (category) {
      case ServiceCategory.REHAB_THERAPY:
        return "康复训练";
      case ServiceCategory.HOME_EXAM:
        return "慢病随访";
      case ServiceCategory.ELDERLY_CARE:
        return "照护陪伴";
      default:
        return "上门服务";
    }
  }

  private buildServiceReason(
    service: ServiceCatalogItem,
    input: ServiceRecommendationInput,
    archive: ArchiveContext | null,
    metrics: MetricRecordContext[]
  ) {
    const city = input.city;
    const reasons = [service.summary ?? "服务目录已覆盖当前需求"];

    if (city && service.regionScope.some((region) => region.includes(city))) {
      reasons.push(`服务范围覆盖 ${city}`);
    }

    if (archive?.riskTags.length) {
      reasons.push(`与风险标签 ${archive.riskTags[0]} 有一定匹配`);
    }

    if (metrics.some((item) => item.abnormal)) {
      reasons.push("已参考最近异常指标，需要结合人工确认");
    }

    return reasons.slice(0, 3).join("；");
  }

  private metricLabel(metricType: MetricType) {
    const labels: Record<MetricType, string> = {
      [MetricType.STEPS]: "步数",
      [MetricType.HEART_RATE]: "心率",
      [MetricType.SLEEP]: "睡眠",
      [MetricType.WEIGHT]: "体重",
      [MetricType.BLOOD_GLUCOSE]: "血糖",
      [MetricType.BLOOD_PRESSURE]: "血压",
      [MetricType.OXYGEN]: "血氧",
      [MetricType.STRESS]: "压力",
      [MetricType.TEMPERATURE]: "体温"
    };

    return labels[metricType] ?? metricType;
  }

  private getErrorMessage(error: unknown) {
    if (error instanceof Error) {
      return error.message;
    }

    return "Unknown error";
  }
}
