import { BadRequestException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { MetricType, RagKnowledgeType, ServiceCategory } from "@prisma/client";
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
  AgentCoordinationStepTrace,
  AgentDefinition,
  AgentExecutionEnvelope,
  AgentExecutionTrace,
  AgentRuntimeAttempt,
  AgentToolName,
  ArchiveContext,
  AssistantConversationInput,
  AssistantDomainInsight,
  CareCoordinationCardInput,
  ContentActivityOpsInput,
  DeviceOperationsInput,
  HealthManagementCardInput,
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
import { RagRetrievalTool } from "../tools/rag-retrieval.tool";
import { ReportsTool } from "../tools/reports.tool";
import { ServiceCatalogTool } from "../tools/service-catalog.tool";
import type {
  RagSearchHit,
  RagSearchResponse
} from "./rag-knowledge.service";

interface AgentExecutionData {
  data: unknown;
  trace: {
    llm: AgentExecutionTrace["llm"];
  };
}

interface CoordinatedExecutionResult {
  execution: AgentExecutionData;
  coordinationSteps: AgentCoordinationStepTrace[];
}

interface AssistantWorkflowRequest {
  taskType: "report-interpretation" | "health-summary" | "service-recommendation" | "booking-prefill";
  payload: Record<string, unknown>;
  reason: string;
}

interface NestedWorkflowExecution {
  data: unknown;
  trace: AgentExecutionData["trace"];
  coordinationSteps: AgentCoordinationStepTrace[];
  resolved: AgentDefinition;
  toolCalls: ToolCallTrace[];
}

@Injectable()
export class AgentOrchestratorService {
  constructor(
    private readonly agentRegistry: AgentRegistry,
    private readonly llmGateway: LlmGateway,
    private readonly reportsTool: ReportsTool,
    private readonly healthArchiveTool: HealthArchiveTool,
    private readonly healthMetricsTool: HealthMetricsTool,
    private readonly ragRetrievalTool: RagRetrievalTool,
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
              taskType,
              payload: task.payload
            })
          : undefined;

      const coordinatedExecution =
        requested.name === TASK_ORCHESTRATOR_AGENT
          ? await this.executeWithCoordination({
              task: {
                ...task,
                taskType
              },
              resolved,
              toolCalls
            })
          : {
              execution: await this.executeResolvedTask({
                task: {
                  ...task,
                  taskType
                },
                resolved,
                toolCalls
              }),
              coordinationSteps: []
            };
      const { execution, coordinationSteps } = coordinatedExecution;

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
            executionPlan || safetyReview || coordinationSteps.length > 0
              ? {
                  executionPlan,
                  steps: coordinationSteps,
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

  private async executeWithCoordination(input: {
    task: SerializableAgentTask;
    resolved: AgentDefinition;
    toolCalls: ToolCallTrace[];
  }): Promise<CoordinatedExecutionResult> {
    switch (input.resolved.name) {
      case ASSISTANT_CONVERSATION_AGENT:
        return this.executeAssistantWorkflow(input.task, input.resolved, input.toolCalls);
      case HEALTH_MANAGEMENT_AGENT:
        return this.executeHealthWorkflow(input.task, input.resolved, input.toolCalls);
      case RISK_OPERATIONS_AGENT:
        return this.executeRiskWorkflow(input.task, input.resolved, input.toolCalls);
      case OPERATIONS_COPILOT_AGENT:
        return this.executeOperationsWorkflow(input.task, input.resolved, input.toolCalls);
      default:
        return {
          execution: await this.executeResolvedTask(input),
          coordinationSteps: []
        };
    }
  }

  private async executeAssistantWorkflow(
    task: SerializableAgentTask,
    definition: AgentDefinition,
    toolCalls: ToolCallTrace[]
  ): Promise<CoordinatedExecutionResult> {
    const input = assistantConversationInputSchema.parse(task.payload);
    const directExecution = this.buildAssistantDirectConversationExecution(input);

    if (directExecution) {
      return {
        execution: directExecution,
        coordinationSteps: []
      };
    }

    const requests = this.buildAssistantWorkflowRequests(input);
    const knowledgeInsight = await this.buildAssistantKnowledgeInsight({
      definition,
      toolCalls,
      ownerId: task.ownerId,
      input
    });
    const baseInsights = [...(input.domainInsights ?? [])];

    if (knowledgeInsight) {
      baseInsights.push(knowledgeInsight);
    }

    if (requests.length === 0) {
      return {
        execution: await this.executeAssistantConversation(
          {
            ...task,
            payload: {
              ...input,
              domainInsights: baseInsights.slice(0, 6)
            }
          },
          definition
        ),
        coordinationSteps: []
      };
    }

    const coordinationSteps: AgentCoordinationStepTrace[] = [];
    const domainInsights = [...baseInsights];
    const referencedTaskTypes: string[] = [];
    let latestHealthContextRef: string | null = null;

    for (const request of requests) {
      const nestedExecution = await this.executeNestedWorkflowTask({
        parentTask: task,
        taskType: request.taskType,
        payload:
          request.taskType === "booking-prefill" &&
          latestHealthContextRef &&
          !("healthContextRef" in request.payload)
            ? {
                ...request.payload,
                healthContextRef: latestHealthContextRef
              }
            : request.payload,
        reason: request.reason
      });

      toolCalls.push(...nestedExecution.toolCalls);
      coordinationSteps.push(...nestedExecution.coordinationSteps);
      referencedTaskTypes.push(request.taskType);
      domainInsights.push(
        this.buildAssistantDomainInsight(
          request.taskType,
          nestedExecution.resolved.name,
          nestedExecution.data
        )
      );
      latestHealthContextRef =
        this.extractAssistantHealthContextRef(nestedExecution.data) ?? latestHealthContextRef;
    }

    const assistantExecution = await this.executeAssistantConversation(
      {
        ...task,
        payload: {
          ...input,
          resolvedIntent: this.buildAssistantResolvedIntent(requests),
          domainInsights: domainInsights.slice(0, 6)
        }
      },
      definition
    );
    const nextOutput = this.toRecord(assistantExecution.data);
    nextOutput.referencedTaskTypes = Array.from(new Set(referencedTaskTypes)).slice(0, 6);
    const parsedOutput = assistantConversationOutputSchema.parse(nextOutput);

    coordinationSteps.push({
      step: "assistant-response",
      agentName: definition.name,
      taskType: task.taskType,
      status: "succeeded",
      reason: "AssistantConversationAgent 汇总下游多智能体结果，生成面向用户的最终回复。",
      outputSummary: this.summarizeCoordinationOutput(parsedOutput),
      llm: assistantExecution.trace.llm
    });

    return {
      execution: {
        data: parsedOutput,
        trace: assistantExecution.trace
      },
      coordinationSteps
    };
  }

  private async executeHealthWorkflow(
    task: SerializableAgentTask,
    definition: AgentDefinition,
    toolCalls: ToolCallTrace[]
  ): Promise<CoordinatedExecutionResult> {
    const primary = await this.executeStepAgent({
      task,
      toolCalls,
      step: "health-management",
      agentName: definition.name,
      taskType: task.taskType,
      payload: task.payload,
      reason: "健康理解主域先产出结构化摘要和重点发现。"
    });

    const riskFollowUpInput = this.buildRiskFollowUpInput(task, primary.execution.data);

    if (!riskFollowUpInput) {
      return {
        execution: primary.execution,
        coordinationSteps: [
          primary.step,
          this.buildSkippedStepTrace({
            step: "risk-enrichment",
            agentName: RISK_OPERATIONS_AGENT,
            taskType: "risk-screening",
            reason: "当前健康输出未命中补充风险研判条件，跳过二次分工。"
          })
        ]
      };
    }

    const riskStep = await this.executeStepAgent({
      task,
      toolCalls,
      step: "risk-enrichment",
      agentName: RISK_OPERATIONS_AGENT,
      taskType: "risk-screening",
      payload: riskFollowUpInput,
      reason: "命中健康风险信号后补充风险分级与后续动作。"
    });

    return {
      execution: {
        data: this.mergeHealthWorkflowOutput(primary.execution.data, riskStep.execution.data),
        trace: primary.execution.trace
      },
      coordinationSteps: [primary.step, riskStep.step]
    };
  }

  private async executeRiskWorkflow(
    task: SerializableAgentTask,
    definition: AgentDefinition,
    toolCalls: ToolCallTrace[]
  ): Promise<CoordinatedExecutionResult> {
    const primary = await this.executeStepAgent({
      task,
      toolCalls,
      step: "risk-operations",
      agentName: definition.name,
      taskType: task.taskType,
      payload: task.payload,
      reason: "风险主域先完成分级、证据整理和处置建议。"
    });

    const healthFollowUp = this.buildHealthFollowUpInput(task.payload);

    if (!healthFollowUp) {
      return {
        execution: primary.execution,
        coordinationSteps: [
          primary.step,
          this.buildSkippedStepTrace({
            step: "health-context",
            agentName: HEALTH_MANAGEMENT_AGENT,
            taskType: "health-summary",
            reason: "当前风险任务缺少可复用的用户或报告上下文，跳过健康背景补充。"
          })
        ]
      };
    }

    const healthStep = await this.executeStepAgent({
      task,
      toolCalls,
      step: "health-context",
      agentName: HEALTH_MANAGEMENT_AGENT,
      taskType: healthFollowUp.viewMode,
      payload: healthFollowUp,
      reason: "风险处置前补充健康背景，避免只看异常事件做决策。"
    });

    return {
      execution: {
        data: this.mergeRiskWorkflowOutput(primary.execution.data, healthStep.execution.data),
        trace: primary.execution.trace
      },
      coordinationSteps: [primary.step, healthStep.step]
    };
  }

  private async executeOperationsWorkflow(
    task: SerializableAgentTask,
    definition: AgentDefinition,
    toolCalls: ToolCallTrace[]
  ): Promise<CoordinatedExecutionResult> {
    const parsed = operationsCopilotInputSchema.parse(task.payload);
    const coordinationSteps: AgentCoordinationStepTrace[] = [];
    let payload: OperationsCopilotInput = {
      ...parsed,
      healthBriefs: [...(parsed.healthBriefs ?? [])],
      careBriefs: [...(parsed.careBriefs ?? [])],
      riskBriefs: [...(parsed.riskBriefs ?? [])],
      deviceBriefs: [...(parsed.deviceBriefs ?? [])],
      contentBriefs: [...(parsed.contentBriefs ?? [])]
    };

    if (parsed.domainRequests?.health) {
      const healthStep = await this.executeStepAgent({
        task,
        toolCalls,
        step: "collect-health-brief",
        agentName: HEALTH_MANAGEMENT_AGENT,
        taskType: parsed.domainRequests.health.viewMode,
        payload: parsed.domainRequests.health,
        reason: "后台摘要先拉取健康主域简报。"
      });
      coordinationSteps.push(healthStep.step);
      payload = {
        ...payload,
        healthBriefs: [
          ...(payload.healthBriefs ?? []),
          this.toHealthDomainBrief(healthStep.execution.data)
        ]
      };
    }

    if (parsed.domainRequests?.care) {
      const careStep = await this.executeStepAgent({
        task,
        toolCalls,
        step: "collect-care-brief",
        agentName: CARE_COORDINATION_AGENT,
        taskType: parsed.domainRequests.care.requestMode,
        payload: parsed.domainRequests.care,
        reason: "后台摘要汇总服务协同主域的推荐或派单信号。"
      });
      coordinationSteps.push(careStep.step);
      payload = {
        ...payload,
        careBriefs: [
          ...(payload.careBriefs ?? []),
          this.toCareDomainBrief(careStep.execution.data)
        ]
      };
    }

    if (parsed.domainRequests?.risk) {
      const riskTaskType = this.resolveOperationsRiskTaskType(task.taskType);
      const riskStep = await this.executeStepAgent({
        task,
        toolCalls,
        step: "collect-risk-brief",
        agentName: RISK_OPERATIONS_AGENT,
        taskType: riskTaskType,
        payload: parsed.domainRequests.risk,
        reason: "后台摘要需要先纳入风险分级和待办信号。"
      });
      coordinationSteps.push(riskStep.step);
      payload = {
        ...payload,
        riskBriefs: [
          ...(payload.riskBriefs ?? []),
          this.toRiskDomainBrief(riskStep.execution.data)
        ]
      };
    }

    if (parsed.domainRequests?.device) {
      const deviceStep = await this.executeStepAgent({
        task,
        toolCalls,
        step: "collect-device-brief",
        agentName: DEVICE_OPERATIONS_AGENT,
        taskType: "device-inspection",
        payload: parsed.domainRequests.device,
        reason: "后台摘要接入设备运维侧异常和巡检优先级。"
      });
      coordinationSteps.push(deviceStep.step);
      payload = {
        ...payload,
        deviceBriefs: [
          ...(payload.deviceBriefs ?? []),
          this.toDeviceDomainBrief(deviceStep.execution.data)
        ]
      };
    }

    if (parsed.domainRequests?.content) {
      const contentStep = await this.executeStepAgent({
        task,
        toolCalls,
        step: "collect-content-brief",
        agentName: CONTENT_ACTIVITY_OPS_AGENT,
        taskType: parsed.domainRequests.content.analysisMode,
        payload: parsed.domainRequests.content,
        reason: "后台摘要纳入内容和活动运营侧信号。"
      });
      coordinationSteps.push(contentStep.step);
      payload = {
        ...payload,
        contentBriefs: [
          ...(payload.contentBriefs ?? []),
          this.toContentDomainBrief(contentStep.execution.data)
        ]
      };
    }

    const opsStep = await this.executeStepAgent({
      task,
      toolCalls,
      step: "operations-copilot",
      agentName: definition.name,
      taskType: task.taskType,
      payload,
      reason: "OperationsCopilotAgent 汇总多域简报，生成后台工作台摘要。"
    });

    return {
      execution: opsStep.execution,
      coordinationSteps: [...coordinationSteps, opsStep.step]
    };
  }

  private async executeStepAgent(input: {
    task: SerializableAgentTask;
    toolCalls: ToolCallTrace[];
    step: string;
    agentName: string;
    taskType: string;
    payload: unknown;
    reason: string;
  }) {
    const resolved = this.agentRegistry.resolve(input.agentName, input.taskType).resolved;
    const startToolIndex = input.toolCalls.length;
    const execution = await this.executeResolvedTask({
      task: {
        ...input.task,
        agentName: input.agentName,
        taskType: input.taskType,
        payload: input.payload
      },
      resolved,
      toolCalls: input.toolCalls
    });

    return {
      execution,
      step: {
        step: input.step,
        agentName: resolved.name,
        taskType: input.taskType,
        status: "succeeded" as const,
        reason: input.reason,
        outputSummary: this.summarizeCoordinationOutput(execution.data),
        llm: execution.trace.llm,
        toolCalls: input.toolCalls.slice(startToolIndex)
      }
    };
  }

  private buildSkippedStepTrace(input: {
    step: string;
    agentName: string;
    taskType: string;
    reason: string;
  }): AgentCoordinationStepTrace {
    return {
      step: input.step,
      agentName: input.agentName,
      taskType: input.taskType,
      status: "skipped",
      reason: input.reason
    };
  }

  private buildRiskFollowUpInput(task: SerializableAgentTask, output: unknown) {
    const taskType = this.agentRegistry.normalizeTaskType(task.taskType);
    const record = this.toRecord(output);
    const riskSignals = this.readStringArray(record.riskSignals);
    const requiresHumanReview =
      this.readBoolean(record.requiresHumanReview) ||
      this.readBoolean(record.humanReviewRequired);
    const shouldCoordinate =
      taskType === "report-interpretation" ||
      taskType === "health-summary" ||
      taskType === "focus-elder-brief" ||
      riskSignals.length > 0 ||
      requiresHumanReview;

    if (!shouldCoordinate) {
      return null;
    }

    const reportInput = reportSummaryInputSchema.safeParse(task.payload);
    const healthInput = healthManagementCardInputSchema.safeParse(task.payload);
    const userId = reportInput.success
      ? reportInput.data.userId
      : healthInput.success
        ? healthInput.data.userId
        : undefined;
    const summaryRef =
      this.readString(record.conclusion) ?? this.readString(record.healthSummary);

    return {
      eventId: task.id,
      userId,
      metricHistoryWindow: riskSignals.map((signal) => ({
        signal,
        abnormal: true
      })),
      reportSummaryRef: summaryRef ?? null,
      openAlerts: [],
      interventionPlaybookVersion: "health-follow-up.v1"
    } satisfies RiskOperationsInput;
  }

  private buildHealthFollowUpInput(payload: unknown): HealthManagementCardInput | null {
    const parsed = riskOperationsInputSchema.safeParse(payload);

    if (!parsed.success || !parsed.data.userId) {
      return null;
    }

    const metricTypes = this.inferMetricTypesFromRiskInput(parsed.data);

    return {
      userId: parsed.data.userId,
      viewMode: "health-summary",
      authorizedScope: [],
      ...(metricTypes.length > 0 ? { metricTypes } : {})
    };
  }

  private mergeHealthWorkflowOutput(output: unknown, riskOutput: unknown) {
    const nextOutput = this.toRecord(output);
    const risk = riskOperationsOutputSchema.parse(riskOutput);

    nextOutput.riskSignals = this.mergeStringLists(nextOutput.riskSignals, risk.riskSignals, 8);

    if ("followUpActions" in nextOutput) {
      nextOutput.followUpActions = this.mergeStringLists(
        nextOutput.followUpActions,
        risk.recommendedActions,
        8
      );
    }

    if ("followUpSuggestions" in nextOutput) {
      nextOutput.followUpSuggestions = this.mergeStringLists(
        nextOutput.followUpSuggestions,
        risk.recommendedActions,
        8
      );
    }

    if ("uncertainties" in nextOutput && risk.triageQueueHint) {
      nextOutput.uncertainties = this.appendUniqueString(
        nextOutput.uncertainties,
        `风险分诊建议进入 ${risk.triageQueueHint}。`
      );
    }

    if ("evidence" in nextOutput && Array.isArray(nextOutput.evidence)) {
      nextOutput.evidence = [
        ...nextOutput.evidence,
        {
          source: "risk-operations",
          summary: `RiskOperationsAgent 判定风险等级为 ${risk.riskLevel}。`,
          data: {
            riskLevel: risk.riskLevel,
            riskSignals: risk.riskSignals.slice(0, 4)
          }
        }
      ].slice(0, 8);
    }

    if ("requiresHumanReview" in nextOutput) {
      nextOutput.requiresHumanReview =
        this.readBoolean(nextOutput.requiresHumanReview) || risk.humanEscalationRequired;
    }

    if ("humanReviewRequired" in nextOutput) {
      nextOutput.humanReviewRequired =
        this.readBoolean(nextOutput.humanReviewRequired) || risk.humanEscalationRequired;
    }

    return nextOutput;
  }

  private mergeRiskWorkflowOutput(output: unknown, healthOutput: unknown) {
    const nextOutput = this.toRecord(output);
    const health = healthManagementOutputSchema.parse(healthOutput);

    nextOutput.riskSignals = this.mergeStringLists(
      nextOutput.riskSignals,
      health.riskSignals ?? health.keyFindings,
      10
    );
    nextOutput.recommendedActions = this.mergeStringLists(
      nextOutput.recommendedActions,
      health.followUpSuggestions ?? [],
      10
    );

    if ("evidence" in nextOutput && Array.isArray(nextOutput.evidence)) {
      nextOutput.evidence = [
        ...nextOutput.evidence,
        {
          source: "health-management",
          summary: health.healthSummary,
          data: {
            keyFindings: health.keyFindings.slice(0, 4)
          }
        }
      ].slice(0, 8);
    }

    nextOutput.humanEscalationRequired =
      this.readBoolean(nextOutput.humanEscalationRequired) ||
      health.humanReviewRequired;

    return nextOutput;
  }

  private toHealthDomainBrief(
    output: unknown
  ): NonNullable<OperationsCopilotInput["healthBriefs"]>[number] {
    const record = this.toRecord(output);
    const summary =
      this.readString(record.healthSummary) ?? this.readString(record.conclusion) ?? "已生成健康简报。";
    const keyFindings = this.readStringArray(record.keyFindings);
    const riskSignals = this.readStringArray(record.riskSignals);

    return {
      domain: "health-management",
      title: "健康理解简报",
      summary,
      priority:
        this.readBoolean(record.humanReviewRequired) || this.readBoolean(record.requiresHumanReview)
          ? "high"
          : riskSignals.length > 0
            ? "medium"
            : "low",
      data: {
        keyFindings: keyFindings.slice(0, 4),
        riskSignals: riskSignals.slice(0, 4)
      }
    };
  }

  private toCareDomainBrief(
    output: unknown
  ): NonNullable<OperationsCopilotInput["careBriefs"]>[number] {
    const record = this.toRecord(output);
    const services = Array.isArray(record.recommendedServices)
      ? record.recommendedServices
      : Array.isArray(record.recommendations)
        ? record.recommendations
        : [];
    const dispatchCandidates = Array.isArray(record.dispatchCandidates)
      ? record.dispatchCandidates
      : [];
    const summary =
      this.readString(record.conclusion) ??
      (dispatchCandidates.length > 0
        ? `已生成 ${dispatchCandidates.length} 个派单候选。`
        : `已生成 ${services.length} 条服务协同建议。`);

    return {
      domain: "care-coordination",
      title: "服务协同简报",
      summary,
      priority:
        this.readBoolean(record.humanReviewRequired) || dispatchCandidates.length > 0
          ? "medium"
          : "low",
      data: {
        recommendationCount: services.length,
        dispatchCandidateCount: dispatchCandidates.length
      }
    };
  }

  private toRiskDomainBrief(
    output: unknown
  ): NonNullable<OperationsCopilotInput["riskBriefs"]>[number] {
    const risk = riskOperationsOutputSchema.parse(output);

    return {
      domain: "risk-operations",
      title: "风险运营简报",
      summary: `${risk.riskLevel.toUpperCase()} 风险，重点信号：${risk.riskSignals[0] ?? "暂无"}`,
      priority: risk.riskLevel,
      data: {
        triageQueueHint: risk.triageQueueHint,
        riskSignals: risk.riskSignals.slice(0, 4)
      }
    };
  }

  private toDeviceDomainBrief(
    output: unknown
  ): NonNullable<OperationsCopilotInput["deviceBriefs"]>[number] {
    const device = deviceOperationsOutputSchema.parse(output);

    return {
      domain: "device-operations",
      title: "设备运维简报",
      summary: device.deviceDiagnosis,
      priority: device.inspectionPriority,
      data: {
        suggestedActions: device.suggestedActions.slice(0, 4),
        suggestedWorkOrder: device.suggestedWorkOrder ?? null
      }
    };
  }

  private toContentDomainBrief(
    output: unknown
  ): NonNullable<OperationsCopilotInput["contentBriefs"]>[number] {
    const content = contentActivityOpsOutputSchema.parse(output);
    const summary =
      content.activityAnalysis ??
      content.contentBrief ??
      content.campaignSuggestion?.[0] ??
      "已生成内容运营简报。";

    return {
      domain: "content-activity-ops",
      title: "内容活动简报",
      summary,
      priority:
        (content.campaignSuggestion?.length ?? 0) > 0 || Boolean(content.activityAnalysis)
          ? "medium"
          : "low",
      data: {
        tags: content.tags ?? [],
        campaignSuggestion: content.campaignSuggestion ?? []
      }
    };
  }

  private summarizeCoordinationOutput(output: unknown) {
    const record = this.toRecord(output);
    const summary: Record<string, unknown> = {};

    for (const key of [
      "conclusion",
      "healthSummary",
      "assistantReply",
      "dashboardDigest",
      "deviceDiagnosis",
      "reviewDecision",
      "riskLevel"
    ]) {
      if (typeof record[key] === "string") {
        summary[key] = record[key];
      }
    }

    for (const key of [
      "riskSignals",
      "keyFindings",
      "followUpActions",
      "followUpSuggestions",
      "recommendedActions",
      "rankingReasons"
    ]) {
      if (Array.isArray(record[key])) {
        summary[key] = record[key].slice(0, 3);
      }
    }

    if (Array.isArray(record.recommendations)) {
      summary.recommendationCount = record.recommendations.length;
    }

    if (Array.isArray(record.dispatchCandidates)) {
      summary.dispatchCandidateCount = record.dispatchCandidates.length;
    }

    if (Array.isArray(record.focusList)) {
      summary.focusCount = record.focusList.length;
    }

    return Object.keys(summary).length > 0
      ? summary
      : Object.fromEntries(Object.entries(record).slice(0, 4));
  }

  private resolveOperationsRiskTaskType(taskType: string) {
    return taskType === "morning-brief" ? "risk-reminder" : "alert-triage";
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

    const directExecution = this.buildAssistantDirectConversationExecution(input);
    if (directExecution) {
      return directExecution;
    }

    const fallback = this.buildAssistantConversationFallback(input);
    const llmResponse = await this.llmGateway.generateStructuredObject({
      agentName: definition.name,
      modelTier: "light",
      systemPrompt:
        "你是 IntelliHealthCare 用户端的康养助手“豆沙包”。只能输出 JSON。回复要自然、简短、亲切。用户提出明确问题时，必须先直接回答这个问题；domainInsights 只能作为辅助上下文，不能替代答案。不要机械回显用户问题，不要说“已收到你的问题”这类模板话术，不要重复自我介绍，也不要把多段固定模板直接拼接在一起。除非用户明确要求生成摘要，不要用“健康摘要已生成”“当前重点为”“建议下一步”这类摘要模板开头。对问候、感谢、闲聊、笑话、自我介绍可以直接自然回答；涉及医学结论时保持谨慎，不伪造诊断。",
      userPrompt: JSON.stringify(
        {
          userMessage: input.userMessage,
          conversationHistory: input.conversationHistory ?? [],
          resolvedIntent: input.resolvedIntent ?? null,
          pageContext: input.pageContext ?? null,
          contextSnapshot: input.contextSnapshot ?? null,
          domainInsights: input.domainInsights ?? []
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

  private buildAssistantDirectConversationExecution(
    input: AssistantConversationInput
  ): AgentExecutionData | null {
    const directReply = this.resolveAssistantDirectReply(input.userMessage);

    if (!directReply) {
      return null;
    }

    return {
      data: assistantConversationOutputSchema.parse({
        assistantReply: directReply,
        followUpQuestion: null,
        navigationSuggestion: null,
        pendingTaskHint: null,
        referencedTaskTypes: []
      }),
      trace: {
        llm: {
          provider: "local",
          model: "assistant-direct-answer",
          fallbackMode: true,
          modelTier: "light",
          attemptedModels: ["assistant-direct-answer"],
          strictJson: true,
          toolCalling: false
        }
      }
    };
  }

  resolveAssistantDirectReply(userMessage: string) {
    return this.buildAssistantCommonKnowledgeReply(userMessage.trim());
  }

  private async executeNestedWorkflowTask(input: {
    parentTask: SerializableAgentTask;
    taskType: AssistantWorkflowRequest["taskType"];
    payload: Record<string, unknown>;
    reason: string;
  }): Promise<NestedWorkflowExecution> {
    const resolution = this.agentRegistry.resolve(TASK_ORCHESTRATOR_AGENT, input.taskType);
    const nestedTask: SerializableAgentTask = {
      ...input.parentTask,
      agentName: TASK_ORCHESTRATOR_AGENT,
      taskType: resolution.taskType,
      payload: input.payload
    };
    const nestedToolCalls: ToolCallTrace[] = [];
    const coordinatedExecution = await this.executeWithCoordination({
      task: nestedTask,
      resolved: resolution.resolved,
      toolCalls: nestedToolCalls
    });
    const safetyReview = await this.maybeRunSafetyReview(
      nestedTask,
      resolution.resolved,
      coordinatedExecution.execution.data
    );
    const output = safetyReview
      ? this.applySafetyReviewResult(coordinatedExecution.execution.data, safetyReview)
      : coordinatedExecution.execution.data;
    const coordinationSteps =
      coordinatedExecution.coordinationSteps.length > 0
        ? coordinatedExecution.coordinationSteps
        : [
            {
              step: `assistant-${resolution.taskType}`,
              agentName: resolution.resolved.name,
              taskType: resolution.taskType,
              status: "succeeded" as const,
              reason: input.reason,
              outputSummary: this.summarizeCoordinationOutput(output),
              llm: coordinatedExecution.execution.trace.llm,
              toolCalls: nestedToolCalls
            }
          ];

    return {
      data: output,
      trace: coordinatedExecution.execution.trace,
      coordinationSteps,
      resolved: resolution.resolved,
      toolCalls: nestedToolCalls
    };
  }

  private buildAssistantWorkflowRequests(
    input: AssistantConversationInput
  ): AssistantWorkflowRequest[] {
    const userMessage = input.userMessage.trim();
    const selectedReportId =
      input.contextSnapshot?.selectedReportId ?? input.contextSnapshot?.latestReportId ?? null;
    const targetUserId = input.contextSnapshot?.targetUserId;
    const authorizedScope = input.contextSnapshot?.authorizedScope ?? [];
    const metricTypes = this.inferAssistantMetricTypes(userMessage);
    const hasPersonalContextReference =
      /我|我的|我们|家里|家属|父母|爸妈|爸爸|妈妈|爷爷|奶奶|姥姥|姥爷|外公|外婆|长辈|本人|最近|近期|这几天|目前|当前|这项|这个|这些|刚做完|刚查完/.test(
        userMessage
      );
    const hasReportContextReference =
      selectedReportId !== null &&
      /这份报告|这个报告|报告里|报告单|当前报告|这张单子|这个结果|这些指标/.test(
        userMessage
      );
    const hasReportIntent =
      /报告|体检报告|检查结果|解读|分析|复查/.test(userMessage) ||
      hasReportContextReference;
    const hasServiceContextReference =
      Boolean(input.contextSnapshot?.preferredServiceCategory) &&
      /这项服务|这个服务|这类服务|适合我|适不适合|怎么选|怎么约|继续说说|详细说说/.test(
        userMessage
      );
    const hasServiceTopic =
      /服务|项目|上门|家政|护理|康复|理疗|养老机构|养老院|照护|陪诊|陪护|日间照料/.test(
        userMessage
      );
    const hasServiceActionIntent =
      /推荐|适合|怎么选|如何选|怎么约|预约|下单|安排|档期|想约|帮我选|筛选|比较|对比|哪种|哪项|哪家|继续说说|详细说说/.test(
        userMessage
      );
    const hasServiceIntent =
      hasServiceContextReference || (hasServiceTopic && hasServiceActionIntent);
    const hasHealthTopic =
      /血压|血糖|心率|睡眠|体重|血氧|压力|步数|指标|健康|慢病|异常|风险|预警/.test(
        userMessage
      );
    const hasHealthDataAnalysisIntent =
      hasReportContextReference ||
      /(?:我的|我们|家里|家属|父母|爸妈|爸爸|妈妈|爷爷|奶奶|姥姥|姥爷|外公|外婆|长辈|本人|帮我|给我|替我).*(?:报告|体检|检查|指标|数据|记录|趋势|摘要|档案|结果)/.test(
        userMessage
      ) ||
      /(?:血压|血糖|心率|睡眠|体重|血氧|压力|步数|指标|慢病).*(?:记录|数据|趋势|曲线|报告|结果|档案|监测|复查|复测)/.test(
        userMessage
      ) ||
      /(?:帮我|给我|替我).*(?:看|分析|解读|总结|评估).*(?:健康|血压|血糖|心率|睡眠|体重|血氧|指标|报告|体检|检查)/.test(
        userMessage
      ) ||
      /(?:刚做完|刚查完|上传了|记录了|测了|量了).*(?:报告|体检|检查|指标|血压|血糖|心率|血氧)/.test(
        userMessage
      );
    const hasHealthIntent =
      hasHealthTopic && hasHealthDataAnalysisIntent;
    const wantsBooking = /预约|下单|安排|时间|档期|什么时候|上门时间/.test(userMessage);
    const requests: AssistantWorkflowRequest[] = [];

    if (hasReportIntent && selectedReportId) {
      requests.push({
        taskType: "report-interpretation",
        payload: {
          reportId: selectedReportId,
          userId: targetUserId,
          includeArchive: true,
          includeLatestMetrics: true,
          ...(metricTypes.length > 0 ? { metricTypes } : {})
        },
        reason: "命中报告解读意图，优先调用健康理解工作流解析当前报告。"
      });
    } else if (
      targetUserId &&
      (
        hasHealthIntent ||
        (hasServiceIntent &&
          hasPersonalContextReference &&
          /(适合|怎么选|如何选|需要|推荐)/.test(userMessage))
      )
    ) {
      requests.push({
        taskType: "health-summary",
        payload: {
          userId: targetUserId,
          viewMode: "health-summary",
          authorizedScope,
          ...(metricTypes.length > 0 ? { metricTypes } : {})
        },
        reason: "命中健康背景意图，先补充健康摘要作为后续建议的上下文。"
      });
    }

    if (hasServiceIntent) {
      requests.push({
        taskType: "service-recommendation",
        payload: {
          userId: targetUserId,
          query: userMessage,
          category: this.inferAssistantServiceCategory(
            userMessage,
            input.contextSnapshot?.preferredServiceCategory ?? null
          ),
          limit: 3
        },
        reason: "命中服务推荐意图，调用服务协同工作流给出候选项目。"
      });
    }

    if (wantsBooking && hasServiceIntent) {
      requests.push({
        taskType: "booking-prefill",
        payload: {
          requestMode: "booking-prefill",
          userId: targetUserId,
          serviceRequest: userMessage
        },
        reason: "命中预约诉求，补充预约草稿和缺失信息提示。"
      });
    }

    return requests.slice(0, 3);
  }

  private async buildAssistantKnowledgeInsight(input: {
    definition: AgentDefinition;
    toolCalls: ToolCallTrace[];
    ownerId?: string | null;
    input: AssistantConversationInput;
  }): Promise<AssistantDomainInsight | null> {
    const userMessage = input.input.userMessage.trim();

    if (!this.shouldAssistantSearchKnowledge(userMessage)) {
      return null;
    }

    const result = await this.searchKnowledgeBase(input.definition, input.toolCalls, {
      query: userMessage,
      knowledgeTypes: this.resolveAssistantKnowledgeTypes(userMessage),
      actorUserId: input.ownerId ?? null,
      targetUserId: input.input.contextSnapshot?.targetUserId ?? null,
      limit: 3
    });

    if (!result || result.results.length === 0) {
      return null;
    }

    const topHits = result.results.slice(0, 2);
    const answerSegments = topHits
      .map((item) => this.normalizeAssistantExcerpt(item.excerpt))
      .filter(Boolean);

    if (answerSegments.length === 0) {
      return null;
    }

    return {
      sourceTaskType: "knowledge-search",
      sourceAgent: ASSISTANT_CONVERSATION_AGENT,
      title: "养老知识检索",
      summary: `按知识库里现有资料，${answerSegments.join(" ")}`,
      highlights: topHits.map((item) => item.document.title).slice(0, 2),
      followUpActions: [
        "如果你愿意，我可以再结合老人年龄、慢病、用药或家庭照护场景，把建议收窄一点。"
      ],
      data: {
        citationTitles: topHits.map((item) => item.document.title),
        knowledgeTypes: topHits.map((item) => item.knowledgeBase.knowledgeType)
      }
    };
  }

  private buildAssistantResolvedIntent(
    requests: AssistantWorkflowRequest[]
  ): TaskOrchestratorOutput {
    const steps: TaskOrchestratorOutput["executionPlan"]["steps"] = [
      {
        step: "assistant-route",
        agent: TASK_ORCHESTRATOR_AGENT,
        reason: "统一助手先识别用户意图，再按需调用领域 Agent。"
      }
    ];
    const targetAgentList = new Set<string>();

    for (const request of requests) {
      const resolution = this.agentRegistry.resolve(TASK_ORCHESTRATOR_AGENT, request.taskType);
      targetAgentList.add(resolution.resolved.name);
      steps.push({
        step: request.taskType,
        agent: resolution.resolved.name,
        reason: request.reason
      });

      if (this.shouldSeriallyReview(resolution.resolved)) {
        targetAgentList.add(SAFETY_REVIEW_AGENT);
      }
    }

    if (Array.from(targetAgentList).includes(SAFETY_REVIEW_AGENT)) {
      steps.push({
        step: "assistant-safety-review",
        agent: SAFETY_REVIEW_AGENT,
        reason: "命中中高风险或需要人工复核的结果时，进入统一安全门禁。"
      });
    }

    const targetAgents = Array.from(targetAgentList);

    return {
      executionPlan: {
        summary: `助手会话将串联 ${targetAgents.join(" -> ")} 处理当前诉求。`,
        steps
      },
      targetAgentList: targetAgents,
      workflowRoute: requests.length > 1 ? "serial" : "single-agent",
      requiredContext: this.collectRequiredContext(targetAgents),
      humanReviewHint: targetAgents.includes(SAFETY_REVIEW_AGENT)
        ? "当前链路包含中高风险结果，必要时会触发统一安全复核。"
        : null
    };
  }

  private buildAssistantDomainInsight(
    taskType: AssistantWorkflowRequest["taskType"],
    sourceAgent: string,
    output: unknown
  ): AssistantDomainInsight {
    const record = this.toRecord(output);
    const summary =
      this.readString(record.conclusion) ??
      this.readString(record.healthSummary) ??
      this.readString(record.assistantReply) ??
      "已生成辅助结果。";
    const followUpActions = this.pickAssistantFollowUpActions(record);
    const insight: AssistantDomainInsight = {
      sourceTaskType: taskType,
      sourceAgent,
      title: this.assistantInsightTitle(taskType),
      summary,
      highlights: this.pickAssistantInsightHighlights(record),
      followUpActions,
      data: this.buildAssistantInsightData(taskType, record)
    };

    if (!insight.highlights?.length) {
      delete insight.highlights;
    }

    if (!insight.followUpActions?.length) {
      delete insight.followUpActions;
    }

    if (!insight.data || Object.keys(insight.data).length === 0) {
      delete insight.data;
    }

    return insight;
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
    const knowledgeHits = await this.searchKnowledgeBase(definition, toolCalls, {
      query: this.buildHealthKnowledgeQuery({
        report,
        archive,
        metrics
      }),
      knowledgeTypes: [RagKnowledgeType.HEALTH_KNOWLEDGE],
      actorUserId: task.ownerId,
      targetUserId: archive?.userId ?? input.userId ?? null,
      limit: 3
    });

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
          knowledgeHits: this.compactKnowledgeHits(knowledgeHits),
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
    const knowledgeHits = await this.searchKnowledgeBase(definition, toolCalls, {
      query: this.buildHealthKnowledgeQuery({
        report,
        archive,
        metrics
      }),
      knowledgeTypes: [RagKnowledgeType.HEALTH_KNOWLEDGE],
      actorUserId: task.ownerId,
      targetUserId: archive?.userId ?? input.userId ?? null,
      limit: 3
    });

    const deterministicOutput = this.enrichEvidenceWithKnowledge(
      this.buildReportSummaryFallback(
        report,
        archive,
        metrics,
        definition.humanReviewRequired
      ),
      knowledgeHits
    );
    const llmResponse = await this.llmGateway.generateStructuredObject({
      agentName: definition.name,
      modelTier: "primary",
      systemPrompt:
        "你是 IntelliHealthCare 的报告摘要 Specialist Agent。只能输出 JSON，不要输出 Markdown。结论必须简洁，证据必须引用报告、档案、指标或检索到的知识片段；若使用检索结果，请把 citation 写入 evidence.data.citations。",
      userPrompt: JSON.stringify(
        {
          taskType: task.taskType,
          report,
          archive,
          metrics,
          knowledgeHits: this.compactKnowledgeHits(knowledgeHits),
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
    const knowledgeHits = await this.searchKnowledgeBase(definition, toolCalls, {
      query: [query, ...(archive?.riskTags ?? [])].filter(Boolean).join(" "),
      knowledgeTypes: [
        RagKnowledgeType.SERVICE_CATALOG,
        RagKnowledgeType.PLATFORM_RULE,
        RagKnowledgeType.HEALTH_KNOWLEDGE
      ],
      actorUserId: task.ownerId,
      targetUserId: input.userId ?? null,
      limit: 4
    });

    const deterministicOutput = this.enrichEvidenceWithKnowledge(
      this.buildServiceRecommendationFallback(
        input,
        category,
        archive,
        metrics,
        services
      ),
      knowledgeHits
    );
    const llmResponse = await this.llmGateway.generateStructuredObject({
      agentName: definition.name,
      modelTier: "primary",
      systemPrompt:
        "你是 IntelliHealthCare 的服务推荐 Specialist Agent。只能输出 JSON，不要给出诊断结论，推荐理由必须对应服务目录、平台规则或用户上下文；若使用检索结果，请把 citation 写入 evidence.data.citations。",
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
          knowledgeHits: this.compactKnowledgeHits(knowledgeHits),
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
    const output = serviceRecommendationOutputSchema.parse(llmResponse.output);

    return {
      data: {
        ...output,
        recommendations: this.withRecommendationImages(output.recommendations, services)
      },
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
    payload?: unknown;
  }) {
    const fallback = this.buildExecutionPlanFallback({
      taskType: input.taskType,
      triggerSource: input.task.triggerSource ?? "internal-api",
      resolved: input.resolved,
      route: input.route,
      payload: input.payload ?? input.task.payload
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

    return this.reconcileExecutionPlan(
      taskOrchestratorOutputSchema.parse(llmResponse.output),
      fallback
    );
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
    const insightReply = this.composeAssistantReplyFromInsights(input.domainInsights ?? []);
    const helperReply = this.buildAssistantHelperReply(input);
    const directReply = this.buildAssistantCommonKnowledgeReply(input.userMessage.trim());
    const followUpQuestion = this.buildAssistantFollowUpQuestion(input.domainInsights ?? []);
    const pendingTaskHint = this.buildAssistantPendingTaskHint(input);
    const referencedTaskTypes = Array.from(
      new Set((input.domainInsights ?? []).map((item) => item.sourceTaskType))
    ).slice(0, 6);

    return {
      assistantReply:
        directReply || insightReply || helperReply,
      followUpQuestion:
        followUpQuestion ??
        this.buildAssistantGenericFollowUpQuestion(input),
      navigationSuggestion: input.pageContext?.pageId
        ? {
            pageId: input.pageContext.pageId,
            label: "当前页面",
            reason: "继续在当前页面补充上下文可以减少来回跳转。"
          }
        : null,
      pendingTaskHint: pendingTaskHint,
      referencedTaskTypes
    };
  }

  private buildExecutionPlanFallback(input: {
    taskType: string;
    triggerSource: string;
    resolved: AgentDefinition;
    route: AgentExecutionTrace["route"];
    payload?: unknown;
  }): TaskOrchestratorOutput {
    const steps = [
      {
        step: "route",
        agent: TASK_ORCHESTRATOR_AGENT,
        reason:
          input.route?.reason ?? `taskType ${input.taskType} matched ${input.resolved.name}`
      },
      ...this.buildPlannedExecutionSteps({
        taskType: input.taskType,
        resolved: input.resolved,
        payload: input.payload
      })
    ];
    const needsSafetyReview =
      this.shouldSeriallyReview(input.resolved) && input.resolved.name !== SAFETY_REVIEW_AGENT;
    const workflowRoute =
      input.triggerSource === "event" || input.triggerSource === "schedule"
        ? "event-driven"
        : steps.length > 2 || needsSafetyReview
          ? "serial"
          : "single-agent";
    const targetAgentList = Array.from(
      new Set(
        steps
          .filter((step) => step.agent !== TASK_ORCHESTRATOR_AGENT)
          .map((step) => step.agent)
      )
    );

    if (needsSafetyReview) {
      steps.push({
        step: "safety-review",
        agent: SAFETY_REVIEW_AGENT,
        reason: "中高风险或声明需要人工复核的任务执行后进入统一安全门禁。"
      });
      targetAgentList.push(SAFETY_REVIEW_AGENT);
    }

    return {
      executionPlan: {
        summary: `任务 ${input.taskType} 将由 ${targetAgentList.join(" -> ")} 协同处理。`,
        steps
      },
      targetAgentList,
      workflowRoute,
      requiredContext: this.collectRequiredContext(targetAgentList),
      humanReviewHint: needsSafetyReview
        ? "该任务执行后需要进入 SafetyReviewAgent 或人工复核队列。"
        : targetAgentList.length > 1
          ? "该任务会按受控步骤在多个 Agent 间顺序交接。"
        : null
    };
  }

  private reconcileExecutionPlan(
    candidate: TaskOrchestratorOutput,
    fallback: TaskOrchestratorOutput
  ): TaskOrchestratorOutput {
    return {
      ...candidate,
      executionPlan: {
        summary: candidate.executionPlan.summary,
        steps: fallback.executionPlan.steps
      },
      targetAgentList: fallback.targetAgentList,
      workflowRoute: fallback.workflowRoute,
      requiredContext: fallback.requiredContext,
      humanReviewHint: candidate.humanReviewHint ?? fallback.humanReviewHint
    };
  }

  private buildPlannedExecutionSteps(input: {
    taskType: string;
    resolved: AgentDefinition;
    payload?: unknown;
  }): TaskOrchestratorOutput["executionPlan"]["steps"] {
    if (input.resolved.name === ASSISTANT_CONVERSATION_AGENT) {
      const parsed = assistantConversationInputSchema.safeParse(input.payload);
      const requests = parsed.success ? this.buildAssistantWorkflowRequests(parsed.data) : [];

      if (requests.length === 0) {
        return [
          {
            step: "assistant-response",
            agent: ASSISTANT_CONVERSATION_AGENT,
            reason: "AssistantConversationAgent 直接处理通用会话请求。"
          }
        ];
      }

      return [
        ...requests.map((request) => ({
          step: request.taskType,
          agent: this.agentRegistry.resolve(TASK_ORCHESTRATOR_AGENT, request.taskType).resolved
            .name,
          reason: request.reason
        })),
        {
          step: "assistant-response",
          agent: ASSISTANT_CONVERSATION_AGENT,
          reason: "AssistantConversationAgent 汇总领域 Agent 结果并输出最终回复。"
        }
      ];
    }

    if (input.resolved.name === HEALTH_MANAGEMENT_AGENT) {
      return [
        {
          step: "health-management",
          agent: HEALTH_MANAGEMENT_AGENT,
          reason: "HealthManagementAgent 先产出健康理解结果。"
        },
        {
          step: "risk-enrichment",
          agent: RISK_OPERATIONS_AGENT,
          reason: "命中风险信号时，再由 RiskOperationsAgent 补充分级和动作建议。"
        }
      ];
    }

    if (input.resolved.name === RISK_OPERATIONS_AGENT) {
      return [
        {
          step: "risk-operations",
          agent: RISK_OPERATIONS_AGENT,
          reason: "RiskOperationsAgent 先输出风险等级、证据和处置建议。"
        },
        {
          step: "health-context",
          agent: HEALTH_MANAGEMENT_AGENT,
          reason: "如存在用户上下文，则补充健康主域背景，避免只看异常事件。"
        }
      ];
    }

    if (input.resolved.name === OPERATIONS_COPILOT_AGENT) {
      const parsed = operationsCopilotInputSchema.safeParse(input.payload);
      const domainRequests = parsed.success ? parsed.data.domainRequests : undefined;
      const steps: TaskOrchestratorOutput["executionPlan"]["steps"] = [];

      if (domainRequests?.health) {
        steps.push({
          step: "collect-health-brief",
          agent: HEALTH_MANAGEMENT_AGENT,
          reason: "先拉取健康主域简报。"
        });
      }

      if (domainRequests?.care) {
        steps.push({
          step: "collect-care-brief",
          agent: CARE_COORDINATION_AGENT,
          reason: "补充服务协同主域的推荐或派单信号。"
        });
      }

      if (domainRequests?.risk) {
        steps.push({
          step: "collect-risk-brief",
          agent: RISK_OPERATIONS_AGENT,
          reason: "纳入风险运营的优先级和处置建议。"
        });
      }

      if (domainRequests?.device) {
        steps.push({
          step: "collect-device-brief",
          agent: DEVICE_OPERATIONS_AGENT,
          reason: "纳入设备异常与巡检优先级。"
        });
      }

      if (domainRequests?.content) {
        steps.push({
          step: "collect-content-brief",
          agent: CONTENT_ACTIVITY_OPS_AGENT,
          reason: "纳入内容和活动运营侧摘要。"
        });
      }

      steps.push({
        step: "operations-copilot",
        agent: OPERATIONS_COPILOT_AGENT,
        reason: "OperationsCopilotAgent 汇总多域简报并生成工作台摘要。"
      });

      return steps;
    }

    return [
      {
        step: "execute-primary",
        agent: input.resolved.name,
        reason: `${input.resolved.name} 承担当前任务的主执行职责。`
      }
    ];
  }

  private collectRequiredContext(agentNames: string[]) {
    return Array.from(
      new Set(
        agentNames.flatMap((agentName) =>
          this.agentRegistry.getDefinition(agentName).allowedTools
        )
      )
    ).slice(0, 8);
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
      reason: this.buildServiceReason(service, input, archive, metrics),
      imageUrl: service.coverUrl
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

  private withRecommendationImages(
    recommendations: ServiceRecommendationOutput["recommendations"],
    services: ServiceCatalogItem[]
  ): ServiceRecommendationOutput["recommendations"] {
    const serviceImageMap = new Map(services.map((item) => [item.id, item.coverUrl]));

    return recommendations.map((item) => ({
      ...item,
      imageUrl: serviceImageMap.get(item.serviceId) ?? item.imageUrl ?? null
    }));
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

  private inferMetricTypesFromRiskInput(input: RiskOperationsInput) {
    const metricTypes = (input.metricHistoryWindow ?? [])
      .map((record) => record.metricType)
      .filter((metricType): metricType is string => typeof metricType === "string");

    return this.toMetricTypes(metricTypes).map((metricType) => metricType as string);
  }

  private mergeStringLists(current: unknown, next: string[], limit: number) {
    const merged = Array.isArray(current)
      ? current.filter((value): value is string => typeof value === "string")
      : [];

    for (const value of next) {
      if (!merged.includes(value)) {
        merged.push(value);
      }

      if (merged.length >= limit) {
        break;
      }
    }

    return merged.slice(0, limit);
  }

  private readString(value: unknown) {
    return typeof value === "string" && value.trim().length > 0 ? value : null;
  }

  private readBoolean(value: unknown) {
    return value === true;
  }

  private readStringArray(value: unknown) {
    if (!Array.isArray(value)) {
      return [];
    }

    return value.filter((item): item is string => typeof item === "string");
  }

  private inferAssistantMetricTypes(userMessage: string) {
    const metricTypes = new Set<MetricType>();

    if (/血压/.test(userMessage)) {
      metricTypes.add(MetricType.BLOOD_PRESSURE);
    }

    if (/血糖/.test(userMessage)) {
      metricTypes.add(MetricType.BLOOD_GLUCOSE);
    }

    if (/心率|心跳|脉搏/.test(userMessage)) {
      metricTypes.add(MetricType.HEART_RATE);
    }

    if (/睡眠/.test(userMessage)) {
      metricTypes.add(MetricType.SLEEP);
    }

    if (/体重/.test(userMessage)) {
      metricTypes.add(MetricType.WEIGHT);
    }

    if (/血氧/.test(userMessage)) {
      metricTypes.add(MetricType.OXYGEN);
    }

    if (/压力/.test(userMessage)) {
      metricTypes.add(MetricType.STRESS);
    }

    if (/步数|运动/.test(userMessage)) {
      metricTypes.add(MetricType.STEPS);
    }

    return Array.from(metricTypes);
  }

  private inferAssistantServiceCategory(
    userMessage: string,
    preferredCategory: ServiceCategory | null
  ) {
    if (preferredCategory) {
      return preferredCategory;
    }

    if (/康复|理疗|训练|关节|步态/.test(userMessage)) {
      return ServiceCategory.REHAB_THERAPY;
    }

    if (/体检|复查|慢病|检查|检验/.test(userMessage)) {
      return ServiceCategory.HOME_EXAM;
    }

    if (/养老|机构|入住|床位|照料/.test(userMessage)) {
      return ServiceCategory.ELDERLY_CARE;
    }

    return ServiceCategory.HOME_CARE;
  }

  private assistantInsightTitle(taskType: AssistantWorkflowRequest["taskType"]) {
    switch (taskType) {
      case "report-interpretation":
        return "报告解读";
      case "health-summary":
        return "健康摘要";
      case "service-recommendation":
        return "服务推荐";
      case "booking-prefill":
        return "预约草稿";
      default:
        return "智能体结果";
    }
  }

  private pickAssistantInsightHighlights(record: Record<string, unknown>) {
    return [
      ...this.readStringArray(record.reportHighlights),
      ...this.readStringArray(record.keyFindings),
      ...this.readStringArray(record.riskSignals),
      ...this.readStringArray(record.matchingSignals),
      ...this.readStringArray(record.missingInfo)
    ].slice(0, 6);
  }

  private pickAssistantFollowUpActions(record: Record<string, unknown>) {
    const actions = [
      ...this.readStringArray(record.followUpActions),
      ...this.readStringArray(record.followUpSuggestions),
      ...this.readStringArray(record.rankingReasons)
    ];

    return Array.from(new Set(actions)).slice(0, 6);
  }

  private buildAssistantInsightData(
    taskType: AssistantWorkflowRequest["taskType"],
    record: Record<string, unknown>
  ) {
    const nextData: Record<string, unknown> = {};

    if ("requiresHumanReview" in record) {
      nextData.requiresHumanReview = this.readBoolean(record.requiresHumanReview);
    }

    if ("humanReviewRequired" in record) {
      nextData.humanReviewRequired = this.readBoolean(record.humanReviewRequired);
    }

    if (taskType === "service-recommendation") {
      nextData.recommendationTitles = this.ensureServiceRecommendationTitles(record);
    }

    if (taskType === "booking-prefill") {
      const bookingPrefill = this.toRecord(record.bookingPrefill);
      nextData.suggestedSlots = this.readStringArray(bookingPrefill.suggestedSlots);
      nextData.missingFields = this.readStringArray(bookingPrefill.missingFields);
    }

    return nextData;
  }

  private ensureServiceRecommendationTitles(record: Record<string, unknown>) {
    const recommendations = Array.isArray(record.recommendations)
      ? record.recommendations
      : Array.isArray(record.recommendedServices)
        ? record.recommendedServices
        : [];

    return recommendations
      .map((item) => this.readString(this.toRecord(item).title))
      .filter((item): item is string => Boolean(item))
      .slice(0, 3);
  }

  private extractAssistantHealthContextRef(output: unknown) {
    const record = this.toRecord(output);

    return (
      this.readString(record.conclusion) ??
      this.readString(record.healthSummary) ??
      this.readString(record.assistantReply)
    );
  }

  private composeAssistantReplyFromInsights(insights: AssistantDomainInsight[]) {
    if (!insights.length) {
      return "";
    }

    if (insights.every((insight) => insight.sourceTaskType === "knowledge-search")) {
      return insights
        .map((insight) => insight.summary)
        .filter(Boolean)
        .join(" ")
        .trim();
    }

    const segments = insights.map((insight) => insight.summary).filter(Boolean);
    const highlights = Array.from(
      new Set(insights.flatMap((insight) => insight.highlights ?? []))
    ).slice(0, 3);
    const followUpActions = Array.from(
      new Set(insights.flatMap((insight) => insight.followUpActions ?? []))
    ).slice(0, 2);
    const recommendationTitles = Array.from(
      new Set(
        insights.flatMap((insight) => {
          const titles = insight.data?.recommendationTitles;
          return Array.isArray(titles)
            ? titles.filter((item): item is string => typeof item === "string")
            : [];
        })
      )
    ).slice(0, 3);
    const lines = [segments.join(" ")];

    if (recommendationTitles.length > 0) {
      lines.push(`如果你想先看具体项目，可以先从 ${recommendationTitles.join("、")} 看起。`);
    }

    if (highlights.length > 0) {
      lines.push(`我先帮你抓到的重点有：${highlights.join("；")}。`);
    }

    if (followUpActions.length > 0) {
      lines.push(`接下来可以考虑：${followUpActions.join("；")}。`);
    }

    return lines.filter(Boolean).join(" ").trim();
  }

  private buildAssistantFollowUpQuestion(insights: AssistantDomainInsight[]) {
    const missingFields = Array.from(
      new Set(
        insights.flatMap((insight) => {
          const values = insight.data?.missingFields;
          return Array.isArray(values)
            ? values.filter((item): item is string => typeof item === "string")
            : [];
        })
      )
    ).slice(0, 2);

    if (missingFields.length === 0) {
      return null;
    }

    return `如果继续帮你往下看，还可以再补充：${missingFields.join("、")}。`;
  }

  private buildAssistantPendingTaskHint(input: AssistantConversationInput) {
    const needsHumanReview = (input.domainInsights ?? []).some((insight) => {
      const data = insight.data ?? {};
      return (
        this.readBoolean(data.requiresHumanReview) ||
        this.readBoolean(data.humanReviewRequired)
      );
    });

    if (needsHumanReview) {
      return "当前结果包含需人工复核的环节，系统会保留人工确认入口。";
    }

    if (input.resolvedIntent?.workflowRoute === "serial") {
      return "当前请求已进入受控多智能体串行处理链路。";
    }

    return null;
  }

  private buildAssistantHelperReply(input: AssistantConversationInput) {
    const userMessage = input.userMessage.trim();
    const rawContextHint = this.buildAssistantContextHint(input);
    const contextHint = this.shouldUseAssistantContextHint(userMessage)
      ? rawContextHint
      : "";
    const capabilitySummary = this.buildAssistantCapabilitySummary(input);

    if (this.isAssistantUntranscribedVoiceRequest(userMessage)) {
      return "我先收到了这条语音，但当前环境还没拿到可用转写。你可以再说一遍，或者直接打字给我，我马上继续接着看。";
    }

    const commonKnowledgeReply = this.buildAssistantCommonKnowledgeReply(userMessage);
    if (commonKnowledgeReply) {
      return commonKnowledgeReply;
    }

    if (this.isAssistantIdentityQuestion(userMessage)) {
      return this.joinAssistantReplySegments(
        "我是豆沙包，一个陪你看健康、报告和照护服务的康养助手。",
        rawContextHint || capabilitySummary
      );
    }

    if (this.isAssistantGreeting(userMessage)) {
      return this.joinAssistantReplySegments(
        "你好，我在。",
        contextHint || "你可以直接告诉我，想聊报告、健康情况，还是服务安排。"
      );
    }

    if (this.isAssistantCapabilityQuestion(userMessage)) {
      return this.joinAssistantReplySegments(capabilitySummary, contextHint);
    }

    if (this.isAssistantThanks(userMessage)) {
      return this.joinAssistantReplySegments(
        "不客气。",
        contextHint || "如果你愿意，我们可以继续把报告、健康重点或服务安排往下聊。"
      );
    }

    if (this.isAssistantCompanionSmallTalk(userMessage)) {
      return "可以，我陪你聊会儿。想轻松说说话也行，想认真看看健康、照护、体检或服务问题也行。";
    }

    if (this.isAssistantJokeRequest(userMessage)) {
      return this.buildAssistantJokeReply(userMessage);
    }

    if (this.isAssistantComfortRequest(userMessage)) {
      return "辛苦了，先缓一口气。你把现在最困扰你的事告诉我，我陪你一件件拆开看。";
    }

    if (this.isAssistantFarewell(userMessage)) {
      return "好，先这样。你随时叫我，我都在。";
    }

    return this.joinAssistantReplySegments(this.pickAssistantHint(userMessage), contextHint);
  }

  private buildAssistantGenericFollowUpQuestion(input: AssistantConversationInput) {
    if (input.userMessage.length >= 8 && !this.isAssistantGreeting(input.userMessage.trim())) {
      return null;
    }

    const selectedReportTitle = input.contextSnapshot?.latestReportTitle;

    if (selectedReportTitle) {
      return `要不要先从《${selectedReportTitle}》开始？你也可以直接说“帮我解读这份报告”。`;
    }

    switch (input.contextSnapshot?.preferredServiceCategory) {
      case ServiceCategory.REHAB_THERAPY:
        return "你想继续看康复理疗推荐、预约建议，还是先总结近期健康情况？";
      case ServiceCategory.HOME_EXAM:
        return "你想继续看上门体检推荐，还是先结合最近指标做个健康摘要？";
      case ServiceCategory.ELDERLY_CARE:
        return "你想继续筛选养老机构，还是先说一下老人当前照护需求？";
      case ServiceCategory.HOME_CARE:
        return "你想继续筛选家政护理服务，还是先告诉我老人当前最需要解决的问题？";
      default:
        return "你现在想看报告解读、健康摘要，还是服务推荐？";
    }
  }

  private buildAssistantCapabilitySummary(input: AssistantConversationInput) {
    const routeText = `${input.pageContext?.route ?? ""} ${input.pageContext?.pageId ?? ""}`;

    if (/health|metric|diet|report/i.test(routeText)) {
      return "我能结合当前页面帮你看报告，也能把近期指标变化和需要留意的风险重点梳理清楚。";
    }

    if (/service|order/i.test(routeText)) {
      return "我能先陪你把需求聊清楚，再一起筛服务、看适不适合，也能补上预约前要准备的信息。";
    }

    return "我可以陪你聊日常，也能帮你解读报告、整理健康重点、挑选更合适的康养服务。";
  }

  private buildAssistantContextHint(input: AssistantConversationInput) {
    const selectedReportTitle = input.contextSnapshot?.latestReportTitle;

    if (selectedReportTitle) {
      return `你现在关联着《${selectedReportTitle}》，想继续的话可以直接围绕这份报告往下问。`;
    }

    switch (input.contextSnapshot?.preferredServiceCategory) {
      case ServiceCategory.REHAB_THERAPY:
        return "你现在在看康复理疗，我可以直接帮你比较项目、适用人群和预约前要问的问题。";
      case ServiceCategory.HOME_EXAM:
        return "你现在在看上门体检，我可以继续帮你筛项目，并把体检前要准备的事一起列出来。";
      case ServiceCategory.ELDERLY_CARE:
        return "你现在在看养老机构，我可以继续帮你对照照护需求、入住条件和服务侧重点。";
      case ServiceCategory.HOME_CARE:
        return "你现在在看家政护理，我可以继续帮你梳理需求、筛服务，或者顺手生成预约草稿。";
      default:
        return "";
    }
  }

  private shouldUseAssistantContextHint(userMessage: string) {
    return (
      this.isAssistantGreeting(userMessage) ||
      this.isAssistantThanks(userMessage) ||
      this.isAssistantCapabilityQuestion(userMessage) ||
      /这份报告|这个报告|报告里|这项服务|这个服务|适合我|这个指标|这些指标/.test(
        userMessage
      )
    );
  }

  private async searchKnowledgeBase(
    definition: AgentDefinition,
    toolCalls: ToolCallTrace[],
    input: {
      query: string;
      knowledgeTypes: RagKnowledgeType[];
      actorUserId?: string | null;
      targetUserId?: string | null;
      institutionId?: string | null;
      limit: number;
    }
  ) {
    if (!input.query.trim()) {
      return null;
    }

    return this.useTool(
      definition,
      toolCalls,
      "searchKnowledgeBase",
      {
        query: input.query,
        knowledgeTypes: input.knowledgeTypes,
        actorUserId: input.actorUserId ?? null,
        targetUserId: input.targetUserId ?? null,
        institutionId: input.institutionId ?? null,
        limit: input.limit
      },
      () =>
        this.ragRetrievalTool.searchKnowledge({
          query: input.query,
          knowledgeTypes: input.knowledgeTypes,
          actorUserId: input.actorUserId,
          targetUserId: input.targetUserId,
          institutionId: input.institutionId,
          limit: input.limit
        }),
      (value) => ({
        total: value.total,
        knowledgeBaseCodes: value.results
          .slice(0, 3)
          .map((item) => item.knowledgeBase.code),
        topTitle: value.results[0]?.document.title ?? null
      })
    ).catch(() => null);
  }

  private compactKnowledgeHits(result: RagSearchResponse | null) {
    return (
      result?.results.slice(0, 4).map((item) => ({
        title: item.document.title,
        excerpt: item.excerpt,
        knowledgeType: item.knowledgeBase.knowledgeType,
        sourceUri: item.citation.sourceUri,
        citation: {
          documentId: item.citation.documentId,
          chunkId: item.citation.chunkId,
          chunkIndex: item.citation.chunkIndex
        }
      })) ?? []
    );
  }

  private enrichEvidenceWithKnowledge<
    T extends {
      evidence: Array<{
        source: string;
        summary: string;
        data?: Record<string, unknown>;
      }>;
    }
  >(output: T, knowledgeHits: RagSearchResponse | null) {
    const evidence = this.buildKnowledgeEvidence(knowledgeHits?.results ?? []);

    if (evidence.length === 0) {
      return output;
    }

    return {
      ...output,
      evidence: [...output.evidence, ...evidence].slice(0, 8)
    };
  }

  private buildKnowledgeEvidence(results: RagSearchHit[]) {
    return results.slice(0, 2).map((item) => ({
      source: "rag",
      summary: `检索命中 ${item.document.title}，来自 ${item.knowledgeBase.name}。`,
      data: {
        citations: [
          {
            knowledgeBaseCode: item.citation.knowledgeBaseCode,
            documentId: item.citation.documentId,
            chunkId: item.citation.chunkId,
            sourceUri: item.citation.sourceUri,
            chunkIndex: item.citation.chunkIndex
          }
        ],
        knowledgeType: item.knowledgeBase.knowledgeType,
        excerpt: item.excerpt
      }
    }));
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
      toolCalls: [],
      coordination: trace.coordination
        ? {
            ...trace.coordination,
            steps: trace.coordination.steps?.map((step) => ({
              ...step,
              toolCalls: undefined
            }))
          }
        : trace.coordination
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
      return "把报告里的结论、指标或你看不懂的地方发我，我先帮你抓重点。";
    }

    if (/服务|上门|预约|护理/.test(userMessage)) {
      return "你把想解决的问题告诉我，我先帮你缩小服务范围，再看怎么约更合适。";
    }

    if (/风险|异常|预警/.test(userMessage)) {
      return "你先把异常或预警说给我，我帮你分清现在最该留意哪一项。";
    }

    return "你直接把情况告诉我就行，我会结合当前页面和已有信息一起看。";
  }

  private joinAssistantReplySegments(...segments: Array<string | null | undefined>) {
    return segments
      .map((segment) => (typeof segment === "string" ? segment.trim() : ""))
      .filter(Boolean)
      .join(" ")
      .trim();
  }

  private isAssistantGreeting(userMessage: string) {
    return /^(你好|您好|嗨|哈喽|hi|hello|在吗|早上好|上午好|下午好|晚上好)[\s!！?？。~～]*$/i.test(
      userMessage
    );
  }

  private isAssistantThanks(userMessage: string) {
    return /谢谢|感谢|辛苦了|麻烦你了/.test(userMessage);
  }

  private isAssistantCapabilityQuestion(userMessage: string) {
    return /你能做什么|你可以做什么|怎么用|如何用|帮助|帮我做什么|能帮我什么/.test(
      userMessage
    );
  }

  private isAssistantIdentityQuestion(userMessage: string) {
    return /你是谁|你叫什么|怎么称呼你|你叫啥|你是干嘛的/.test(userMessage);
  }

  private isAssistantJokeRequest(userMessage: string) {
    return /笑话|段子|逗我|幽默一点|讲个梗/.test(userMessage);
  }

  private isAssistantCompanionSmallTalk(userMessage: string) {
    return /无聊|陪我聊|聊聊天|陪陪我|想找人说说话/.test(userMessage);
  }

  private isAssistantUntranscribedVoiceRequest(userMessage: string) {
    return /未转写的语音|无法直接理解纯音频内容|重试语音或补充文字/.test(userMessage);
  }

  private isAssistantComfortRequest(userMessage: string) {
    return /有点烦|有点累|心情不好|难受|焦虑|安慰我|鼓励我/.test(userMessage);
  }

  private isAssistantFarewell(userMessage: string) {
    return /^(拜拜|再见|回头聊|先这样|晚安)[\s!！?？。~～]*$/i.test(userMessage);
  }

  private buildAssistantJokeReply(userMessage: string) {
    const jokes = [
      "讲个轻松的: 医生问你最近睡得怎么样，你说挺好，就是闹钟还没响，压力先醒了。",
      "来个不伤身的冷笑话: 体重秤最擅长的不是测体重，是提醒人昨天那顿夜宵还没下班。",
      "给你一个康养版段子: 我问血压计今天稳不稳，它说先别问我，先问你昨晚几点睡的。"
    ];

    return jokes[userMessage.length % jokes.length] ?? jokes[0];
  }

  private buildAssistantCommonKnowledgeReply(userMessage: string) {
    if (/HPV.*(2价|二价).*(4价|四价).*(9价|九价)|HPV.*(4价|四价).*(9价|九价)|HPV2价|HPV4价|HPV9价/.test(userMessage)) {
      return "简单说：2价主要覆盖 HPV 16、18 型；4价在此基础上增加 6、11 型；9价再增加 31、33、45、52、58 型，覆盖范围更广。怎么选主要看年龄、性别、当地可接种范围、预算和医生建议，不是价越高就一定越适合。";
    }

    if (/(血压).*(高|偏高|升高)|高血压|血压有点高/.test(userMessage)) {
      return "血压偏高先别只看一次结果，建议连续几天在固定时间测量并记录。近期重点是少盐、少酒、睡够、避免熬夜和情绪激动；如果多次达到 140/90 mmHg 以上，或伴有头痛、胸闷、头晕、视物模糊，要尽快咨询医生。";
    }

    if (/防癌体检|肿瘤筛查|癌症筛查/.test(userMessage)) {
      return "防癌体检要按年龄、性别、家族史和既往病史来选，不建议只买项目最多的套餐。一般可先覆盖常规体检、胸部影像、腹部/甲状腺等超声、便潜血或肠镜评估；女性再关注乳腺和宫颈筛查，男性可结合前列腺风险。";
    }

    if (/体检前.*注意|注意.*体检前|体检.*准备/.test(userMessage)) {
      return "体检前一天尽量清淡饮食、别饮酒、别熬夜；抽血项目通常需要空腹 8-12 小时。降压药等长期用药不要自行停，糖尿病用药和胰岛素最好提前按医生要求确认。带好身份证、既往报告和正在服用的药物清单。";
    }

    return null;
  }

  private shouldAssistantSearchKnowledge(userMessage: string) {
    if (userMessage.length < 6) {
      return false;
    }

    return !(
      this.isAssistantGreeting(userMessage) ||
      this.isAssistantThanks(userMessage) ||
      this.isAssistantJokeRequest(userMessage) ||
      this.isAssistantIdentityQuestion(userMessage) ||
      this.isAssistantCapabilityQuestion(userMessage) ||
      this.isAssistantFarewell(userMessage) ||
      this.isAssistantCompanionSmallTalk(userMessage)
    );
  }

  private resolveAssistantKnowledgeTypes(userMessage: string) {
    const knowledgeTypes = new Set<RagKnowledgeType>();

    if (/服务|预约|项目|家政|护理|康复|理疗|养老|机构|照护/.test(userMessage)) {
      knowledgeTypes.add(RagKnowledgeType.SERVICE_CATALOG);
    }

    if (/退款|改期|取消|规则|怎么约|流程|平台/.test(userMessage)) {
      knowledgeTypes.add(RagKnowledgeType.PLATFORM_RULE);
    }

    knowledgeTypes.add(RagKnowledgeType.HEALTH_KNOWLEDGE);

    return Array.from(knowledgeTypes);
  }

  private normalizeAssistantExcerpt(excerpt: string) {
    return excerpt.replace(/\s+/g, " ").trim().replace(/^[，。；、\s]+/, "");
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

  private buildHealthKnowledgeQuery(input: {
    report: ReportContext | null;
    archive: ArchiveContext | null;
    metrics: MetricRecordContext[];
  }) {
    const segments = [
      ...(input.report ? [input.report.title, ...this.pickHighlights(input.report.summary).slice(0, 2)] : []),
      ...(input.archive?.riskTags.slice(0, 3) ?? []),
      ...input.metrics
        .filter((item) => item.abnormal)
        .slice(0, 2)
        .map((item) => this.metricLabel(item.metricType))
    ]
      .map((item) => item.trim())
      .filter(Boolean);

    return Array.from(new Set(segments)).join(" ");
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
