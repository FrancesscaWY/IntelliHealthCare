import { BadRequestException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { MetricType, ServiceCategory } from "@prisma/client";
import type { EnvironmentVariables } from "../../../common/config/env.schema";
import {
  REPORT_SUMMARY_AGENT,
  SERVICE_RECOMMENDATION_AGENT
} from "../agents.constants";
import { AgentRegistry } from "../domain/agent-registry";
import type {
  AgentDefinition,
  AgentExecutionEnvelope,
  AgentExecutionTrace,
  AgentRuntimeAttempt,
  AgentToolName,
  ArchiveContext,
  MetricRecordContext,
  ReportContext,
  SerializableAgentTask,
  ServiceCatalogItem,
  ServiceRecommendationInput,
  ServiceRecommendationOutput,
  ToolCallTrace
} from "../domain/agent-types";
import {
  AgentExecutionError,
  reportSummaryInputSchema,
  reportSummaryOutputSchema,
  serviceRecommendationInputSchema,
  serviceRecommendationOutputSchema
} from "../domain/agent-types";
import { LlmGateway } from "../gateways/llm.gateway";
import { HealthArchiveTool } from "../tools/health-archive.tool";
import { HealthMetricsTool } from "../tools/health-metrics.tool";
import { ReportsTool } from "../tools/reports.tool";
import { ServiceCatalogTool } from "../tools/service-catalog.tool";

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
    const { resolved, route } = this.agentRegistry.resolve(task.agentName, task.taskType);
    const toolCalls: ToolCallTrace[] = [];

    try {
      const execution =
        resolved.name === REPORT_SUMMARY_AGENT
          ? await this.executeReportSummary(task, resolved, toolCalls)
          : await this.executeServiceRecommendation(task, resolved, toolCalls);
      const completedAt = new Date().toISOString();

      return {
        status: "succeeded",
        agent: {
          requestedName: task.agentName,
          resolvedName: resolved.name,
          taskType: task.taskType,
          triggerSource: task.triggerSource,
          ownerId: task.ownerId
        },
        output: execution.data,
        trace: this.buildTrace({
          route,
          toolCalls,
          llm: execution.trace.llm,
          promptVersion: resolved.promptVersion,
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

  private async executeReportSummary(
    task: SerializableAgentTask,
    definition: AgentDefinition,
    toolCalls: ToolCallTrace[]
  ) {
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

    const output = reportSummaryOutputSchema.parse(llmResponse.output);

    return {
      data: output,
      trace: {
        llm: llmResponse.trace
      }
    };
  }

  private async executeServiceRecommendation(
    task: SerializableAgentTask,
    definition: AgentDefinition,
    toolCalls: ToolCallTrace[]
  ) {
    let input: ServiceRecommendationInput;

    try {
      input = serviceRecommendationInputSchema.parse(task.payload);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error
          ? error.message
          : "Invalid service recommendation payload"
      );
    }

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

    const output = serviceRecommendationOutputSchema.parse(llmResponse.output);

    return {
      data: output,
      trace: {
        llm: llmResponse.trace
      }
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
    const reasons = [
      service.summary ?? "服务目录已覆盖当前需求"
    ];

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
