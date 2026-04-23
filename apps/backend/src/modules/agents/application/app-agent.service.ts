import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import {
  AlertLevel,
  AlertStatus,
  ConversationScene,
  MessageContentType,
  UserType
} from "@prisma/client";
import type { AuthenticatedUser } from "../../../common/auth/auth.types";
import { toDateTimeString } from "../../../common/utils/serializers";
import { PrismaService } from "../../../infra/prisma/prisma.service";
import { DEFAULT_AGENT_NAME } from "../agents.constants";
import { AgentOrchestratorService } from "./agent-orchestrator.service";
import { AgentTaskService } from "./agent-task.service";
import type {
  AiHealthSummaryQueryDto,
  AiRiskAlertsQueryDto,
  CreateAssistantConversationDto,
  OrderPrefillDto,
  SendAssistantMessageDto,
  ServiceRecommendationDto
} from "../dto/app-agent.dto";
import { AgentExecutionError } from "../domain/agent-types";

interface AgentRunResult {
  taskId: string;
  output: Record<string, unknown>;
  trace?: Record<string, unknown>;
  status: string;
}

@Injectable()
export class AppAgentService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly taskService: AgentTaskService,
    private readonly orchestrator: AgentOrchestratorService
  ) {}

  async createAssistantConversation(
    user: AuthenticatedUser,
    payload: CreateAssistantConversationDto
  ) {
    const assistantUserId = await this.findAssistantUserId(user.id);
    const welcomeMessage =
      payload.welcomeMessage ??
      "您好，我是智能康养助手。您可以问我报告解读、健康摘要或服务推荐。";
    const conversation = await this.prismaService.$transaction(async (tx) => {
      const created = await tx.conversation.create({
        data: {
          scene: ConversationScene.ASSISTANT,
          topic: payload.topic?.trim() || "智能康养助手会话",
          metadata: {
            channel: "app-ai",
            source: "app",
            assistantUserId
          }
        }
      });

      const participants = [{ conversationId: created.id, userId: user.id, roleLabel: "用户" }];
      if (assistantUserId) {
        participants.push({
          conversationId: created.id,
          userId: assistantUserId,
          roleLabel: "助手"
        });
      }

      await tx.conversationParticipant.createMany({
        data: participants
      });

      const welcome = await tx.conversationMessage.create({
        data: {
          conversationId: created.id,
          senderId: assistantUserId ?? null,
          contentType: MessageContentType.TEXT,
          content: {
            text: welcomeMessage
          }
        }
      });

      await tx.conversation.update({
        where: { id: created.id },
        data: {
          lastMessageAt: welcome.createdAt
        }
      });

      return created;
    });

    return {
      conversationId: conversation.id,
      scene: conversation.scene,
      topic: conversation.topic,
      createdAt: toDateTimeString(conversation.createdAt)
    };
  }

  async getAssistantConversation(user: AuthenticatedUser, conversationId: string) {
    const conversation = await this.assertAssistantConversationParticipant(
      user.id,
      conversationId
    );

    return {
      conversationId: conversation.id,
      scene: conversation.scene,
      topic: conversation.topic,
      metadata: this.ensureRecord(conversation.metadata),
      lastMessageAt: toDateTimeString(conversation.lastMessageAt),
      createdAt: toDateTimeString(conversation.createdAt),
      updatedAt: toDateTimeString(conversation.updatedAt)
    };
  }

  async listAssistantMessages(
    user: AuthenticatedUser,
    conversationId: string,
    query: { page: number; pageSize: number }
  ) {
    await this.assertAssistantConversationParticipant(user.id, conversationId);

    const messages = await this.prismaService.conversationMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" }
    });
    const rows = messages.map((item) => ({
      messageId: item.id,
      role: item.senderId === user.id ? "user" : "assistant",
      type: item.contentType.toLowerCase(),
      content: this.extractMessageText(item.contentType, item.content),
      createdAt: toDateTimeString(item.createdAt)
    }));
    const start = (query.page - 1) * query.pageSize;
    const list = rows.slice(start, start + query.pageSize);

    return {
      list,
      page: query.page,
      pageSize: query.pageSize,
      total: rows.length,
      hasMore: start + query.pageSize < rows.length
    };
  }

  async sendAssistantMessage(
    user: AuthenticatedUser,
    conversationId: string,
    payload: SendAssistantMessageDto
  ) {
    if (!payload.content?.trim()) {
      throw new BadRequestException("Message content is required");
    }

    const conversation = await this.assertAssistantConversationParticipant(
      user.id,
      conversationId
    );
    const assistantUserId = await this.findConversationAssistantUserId(conversationId, user.id);

    const userMessage = await this.prismaService.conversationMessage.create({
      data: {
        conversationId,
        senderId: user.id,
        contentType: MessageContentType.TEXT,
        content: {
          text: payload.content.trim()
        }
      }
    });

    const history = await this.buildConversationHistory(conversationId, user.id);
    const agent = await this.executeInlineTask({
      ownerId: user.id,
      taskType: "assistant-conversation",
      triggerSource: "assistant",
      payload: {
        sessionId: conversationId,
        userMessage: payload.content.trim(),
        conversationHistory: history,
        pageContext:
          payload.pageId || payload.route || payload.metadata
            ? {
                pageId: payload.pageId,
                route: payload.route,
                metadata: payload.metadata ?? undefined
              }
            : undefined
      }
    });
    const replyText =
      typeof agent.output.assistantReply === "string"
        ? agent.output.assistantReply
        : "已收到你的消息，我们会继续为你整理建议。";

    const assistantMessage = await this.prismaService.$transaction(async (tx) => {
      const created = await tx.conversationMessage.create({
        data: {
          conversationId,
          senderId: assistantUserId ?? null,
          contentType: MessageContentType.TEXT,
          content: {
            text: replyText,
            taskId: agent.taskId
          }
        }
      });

      await tx.conversation.update({
        where: { id: conversationId },
        data: {
          lastMessageAt: created.createdAt
        }
      });

      return created;
    });

    return {
      conversationId,
      userMessage: {
        messageId: userMessage.id,
        role: "user",
        content: payload.content.trim(),
        createdAt: toDateTimeString(userMessage.createdAt)
      },
      reply: {
        messageId: assistantMessage.id,
        role: "assistant",
        type: "text",
        content: replyText,
        createdAt: toDateTimeString(assistantMessage.createdAt)
      },
      task: {
        taskId: agent.taskId,
        status: agent.status,
        trace: agent.trace ?? null
      }
    };
  }

  async createServiceRecommendations(
    user: AuthenticatedUser,
    payload: ServiceRecommendationDto
  ) {
    const targetUserId = await this.resolveTargetUserId(user, payload.elderId);
    const task = await this.executeInlineTask({
      ownerId: user.id,
      taskType: "service-recommendation",
      triggerSource: "assistant",
      payload: {
        userId: targetUserId,
        query: payload.query?.trim() || undefined,
        category: payload.category,
        city: payload.city?.trim() || undefined,
        limit: payload.limit ?? 3
      }
    });

    return {
      taskId: task.taskId,
      recommendations: this.pickFirstNonEmptyArray(
        task.output.recommendations,
        task.output.recommendedServices
      ),
      matchingSignals: this.ensureStringArray(task.output.matchingSignals),
      conclusion: this.toNullableString(task.output.conclusion),
      raw: task.output
    };
  }

  async createOrderPrefill(user: AuthenticatedUser, payload: OrderPrefillDto) {
    const targetUserId = await this.resolveTargetUserId(user, payload.elderId);
    const resourceConstraints = Array.isArray(payload.resourceConstraints)
      ? payload.resourceConstraints.map((item) => ({
          key: item.key,
          value: item.value
        }))
      : undefined;
    const task = await this.executeInlineTask({
      ownerId: user.id,
      taskType: "booking-prefill",
      triggerSource: "assistant",
      payload: {
        requestMode: "booking-prefill",
        userId: targetUserId,
        orderId: payload.orderId,
        serviceRequest: payload.serviceRequest,
        resourceConstraints,
        healthContextRef: payload.healthContextRef
      }
    });

    return {
      taskId: task.taskId,
      bookingPrefill: this.ensureRecord(task.output.bookingPrefill),
      missingInfo: this.ensureStringArray(task.output.missingInfo),
      rankingReasons: this.ensureStringArray(task.output.rankingReasons),
      humanReviewRequired: Boolean(task.output.humanReviewRequired),
      raw: task.output
    };
  }

  async getHealthSummary(
    user: AuthenticatedUser,
    query: AiHealthSummaryQueryDto
  ) {
    const targetUserId = await this.resolveTargetUserId(user, query.elderId);
    const task = await this.executeInlineTask({
      ownerId: user.id,
      taskType: "health-summary",
      triggerSource: "assistant",
      payload: {
        userId: targetUserId,
        viewMode: "health-summary",
        authorizedScope: this.buildAuthorizedScope(user, targetUserId),
        metricTypes: query.metricTypes
      }
    });

    return {
      taskId: task.taskId,
      summary:
        this.toNullableString(task.output.healthSummary) ??
        this.toNullableString(task.output.conclusion) ??
        "",
      keyFindings: this.ensureStringArray(task.output.keyFindings),
      riskSignals: this.ensureStringArray(task.output.riskSignals),
      followUpSuggestions: this.pickFirstNonEmptyStringArray(
        task.output.followUpSuggestions,
        task.output.followUpActions
      ),
      humanReviewRequired: Boolean(
        task.output.humanReviewRequired ?? task.output.requiresHumanReview
      ),
      raw: task.output
    };
  }

  async getHealthMetricExplanations(
    user: AuthenticatedUser,
    query: AiHealthSummaryQueryDto
  ) {
    const targetUserId = await this.resolveTargetUserId(user, query.elderId);
    const task = await this.executeInlineTask({
      ownerId: user.id,
      taskType: "focus-elder-brief",
      triggerSource: "assistant",
      payload: {
        userId: targetUserId,
        viewMode: "focus-elder-brief",
        authorizedScope: this.buildAuthorizedScope(user, targetUserId),
        metricTypes: query.metricTypes
      }
    });

    return {
      taskId: task.taskId,
      brief:
        this.toNullableString(task.output.healthSummary) ??
        this.toNullableString(task.output.conclusion) ??
        "",
      keyFindings: this.ensureStringArray(task.output.keyFindings),
      riskSignals: this.ensureStringArray(task.output.riskSignals),
      followUpSuggestions: this.pickFirstNonEmptyStringArray(
        task.output.followUpSuggestions,
        task.output.followUpActions
      ),
      raw: task.output
    };
  }

  async getReportInterpretation(
    user: AuthenticatedUser,
    reportId: string,
    query: AiHealthSummaryQueryDto
  ) {
    const report = await this.getAccessibleReport(user, reportId, query.elderId);
    const task = await this.executeInlineTask({
      ownerId: user.id,
      taskType: "report-interpretation",
      triggerSource: "assistant",
      payload: {
        reportId,
        userId: report.targetUserId,
        includeArchive: true,
        includeLatestMetrics: true
      }
    });

    return {
      taskId: task.taskId,
      reportId,
      interpretation:
        this.toNullableString(task.output.conclusion) ??
        this.toNullableString(task.output.healthSummary) ??
        "",
      highlights: this.pickFirstNonEmptyStringArray(
        task.output.reportHighlights,
        task.output.keyFindings
      ),
      riskSignals: this.ensureStringArray(task.output.riskSignals),
      followUpSuggestions: this.pickFirstNonEmptyStringArray(
        task.output.followUpActions,
        task.output.followUpSuggestions
      ),
      humanReviewRequired: Boolean(
        task.output.requiresHumanReview ?? task.output.humanReviewRequired
      ),
      raw: task.output
    };
  }

  async getReportFollowUpSuggestions(
    user: AuthenticatedUser,
    reportId: string,
    query: AiHealthSummaryQueryDto
  ) {
    const interpretation = await this.getReportInterpretation(user, reportId, query);

    return {
      taskId: interpretation.taskId,
      reportId: interpretation.reportId,
      followUpSuggestions: interpretation.followUpSuggestions,
      riskSignals: interpretation.riskSignals,
      humanReviewRequired: interpretation.humanReviewRequired
    };
  }

  async listRiskAlerts(user: AuthenticatedUser, query: AiRiskAlertsQueryDto) {
    const accessibleUserIds = await this.resolveAccessibleUserIds(user);
    const rows = await this.prismaService.healthAlert.findMany({
      where: {
        userId: {
          in: accessibleUserIds
        }
      },
      orderBy: [{ triggeredAt: "desc" }],
      include: {
        owner: {
          select: {
            id: true,
            realName: true,
            nickname: true,
            phone: true
          }
        }
      }
    });
    const list = rows.map((item) => this.mapRiskAlert(item));
    const start = (query.page - 1) * query.pageSize;

    return {
      list: list.slice(start, start + query.pageSize),
      page: query.page,
      pageSize: query.pageSize,
      total: list.length,
      hasMore: start + query.pageSize < list.length
    };
  }

  async getRiskAlertDetail(user: AuthenticatedUser, alertId: string) {
    const accessibleUserIds = await this.resolveAccessibleUserIds(user);
    const alert = await this.prismaService.healthAlert.findUnique({
      where: { id: alertId },
      include: {
        owner: {
          select: {
            id: true,
            realName: true,
            nickname: true,
            phone: true
          }
        }
      }
    });

    if (!alert || !accessibleUserIds.includes(alert.userId)) {
      throw new NotFoundException("Risk alert not found");
    }

    return this.mapRiskAlert(alert, true);
  }

  private async executeInlineTask(input: {
    ownerId: string;
    taskType: string;
    payload: Record<string, unknown>;
    triggerSource: "assistant" | "internal-api" | "event" | "schedule";
  }): Promise<AgentRunResult> {
    const task = await this.taskService.createTask({
      agentName: DEFAULT_AGENT_NAME,
      taskType: input.taskType,
      ownerId: input.ownerId,
      triggerSource: input.triggerSource,
      payload: input.payload
    });
    const runtime = {
      attempt: 1,
      maxAttempts: 1
    };

    await this.taskService.markRunning(
      task.id,
      this.orchestrator.buildRunningEnvelope(task, runtime)
    );

    try {
      const envelope = await this.orchestrator.executeTask(task, runtime);
      const persistedTask = await this.taskService.markSucceeded(task.id, envelope);
      const persistedResult = this.ensureRecord(persistedTask.result);

      return {
        taskId: task.id,
        status:
          typeof persistedResult.status === "string" ? persistedResult.status : envelope.status,
        output: this.ensureRecord(persistedResult.output),
        trace: this.ensureRecord(persistedResult.trace)
      };
    } catch (error) {
      const failureEnvelope =
        error instanceof AgentExecutionError
          ? error.failureResult
          : this.orchestrator.buildDispatchFailureEnvelope(task, error);

      await this.taskService.markFailed(task.id, failureEnvelope);

      if (error instanceof Error) {
        throw error;
      }

      throw new BadRequestException("Agent task execution failed");
    }
  }

  private async assertAssistantConversationParticipant(
    userId: string,
    conversationId: string
  ) {
    const participant = await this.prismaService.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId
        }
      },
      include: {
        conversation: true
      }
    });

    if (!participant) {
      throw new ForbiddenException("No permission to access this conversation");
    }

    if (participant.conversation.scene !== ConversationScene.ASSISTANT) {
      throw new BadRequestException("Conversation is not an assistant session");
    }

    return participant.conversation;
  }

  private async buildConversationHistory(conversationId: string, userId: string) {
    const messages = await this.prismaService.conversationMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: "desc" },
      take: 20
    });

    return messages
      .slice()
      .reverse()
      .map((item) => ({
        role: item.senderId === userId ? "user" : "assistant",
        content: this.extractMessageText(item.contentType, item.content),
        createdAt: toDateTimeString(item.createdAt)
      }));
  }

  private async findAssistantUserId(excludeUserId: string) {
    const staff = await this.prismaService.user.findFirst({
      where: {
        id: {
          not: excludeUserId
        },
        type: UserType.STAFF
      },
      orderBy: { createdAt: "asc" }
    });

    return staff?.id ?? null;
  }

  private async findConversationAssistantUserId(
    conversationId: string,
    ownerUserId: string
  ) {
    const participant = await this.prismaService.conversationParticipant.findFirst({
      where: {
        conversationId,
        userId: {
          not: ownerUserId
        }
      },
      orderBy: { joinedAt: "asc" }
    });

    return participant?.userId ?? null;
  }

  private extractMessageText(contentType: MessageContentType, value: unknown) {
    if (contentType === MessageContentType.TEXT) {
      const record = this.ensureRecord(value);
      const text = typeof record.text === "string" ? record.text : null;
      if (text) {
        return text;
      }
    }

    if (typeof value === "string") {
      return value;
    }

    return JSON.stringify(value ?? {});
  }

  private async resolveTargetUserId(currentUser: AuthenticatedUser, elderId?: string) {
    if (!elderId) {
      if (currentUser.type === UserType.ELDER) {
        return currentUser.id;
      }

      const binding = await this.prismaService.familyBinding.findFirst({
        where: { familyMemberId: currentUser.id },
        orderBy: { createdAt: "asc" }
      });

      return binding?.elderMemberId ?? currentUser.id;
    }

    if (elderId === currentUser.id) {
      return elderId;
    }

    if (
      ([UserType.ADMIN, UserType.ORG_MANAGER, UserType.STAFF] as UserType[]).includes(
        currentUser.type
      )
    ) {
      return elderId;
    }

    const binding = await this.prismaService.familyBinding.findFirst({
      where: {
        familyMemberId: currentUser.id,
        elderMemberId: elderId
      }
    });

    if (!binding) {
      throw new ForbiddenException("No permission to access elder data");
    }

    return elderId;
  }

  private async resolveAccessibleUserIds(currentUser: AuthenticatedUser) {
    if (
      ([UserType.ADMIN, UserType.ORG_MANAGER, UserType.STAFF] as UserType[]).includes(
        currentUser.type
      )
    ) {
      const rows = await this.prismaService.user.findMany({
        where: { type: UserType.ELDER },
        select: { id: true }
      });
      return rows.map((item) => item.id);
    }

    if (currentUser.type === UserType.ELDER) {
      return [currentUser.id];
    }

    const bindings = await this.prismaService.familyBinding.findMany({
      where: {
        familyMemberId: currentUser.id
      },
      select: {
        elderMemberId: true
      }
    });
    const elderIds = bindings.map((item) => item.elderMemberId);
    return Array.from(new Set([currentUser.id, ...elderIds]));
  }

  private async getAccessibleReport(
    currentUser: AuthenticatedUser,
    reportId: string,
    elderId?: string
  ) {
    const report = await this.prismaService.report.findUnique({
      where: { id: reportId },
      select: {
        id: true,
        archive: {
          select: {
            userId: true
          }
        },
        order: {
          select: {
            ownerId: true,
            elderId: true
          }
        }
      }
    });

    if (!report) {
      throw new NotFoundException("Report not found");
    }

    const targetUserId = await this.resolveTargetUserId(
      currentUser,
      elderId ?? report.archive?.userId ?? report.order?.elderId ?? undefined
    );
    const allowed =
      report.archive?.userId === targetUserId ||
      report.order?.elderId === targetUserId ||
      report.order?.ownerId === currentUser.id;

    if (!allowed) {
      throw new ForbiddenException("No permission to access report");
    }

    return {
      reportId: report.id,
      targetUserId
    };
  }

  private buildAuthorizedScope(currentUser: AuthenticatedUser, targetUserId: string) {
    return targetUserId === currentUser.id
      ? ["self"]
      : ["family-authorized"];
  }

  private mapRiskAlert(
    item: {
      id: string;
      userId: string;
      level: AlertLevel;
      status: AlertStatus;
      sourceType: string;
      title: string;
      summary: string;
      suggestion: unknown;
      triggeredAt: Date;
      handledAt: Date | null;
      owner?: {
        id: string;
        realName: string | null;
        nickname: string | null;
        phone: string;
      } | null;
    },
    includeDetail = false
  ) {
    const suggestion = this.ensureRecord(item.suggestion);
    const summary = {
      alertId: item.id,
      type: item.sourceType,
      level: item.level.toLowerCase(),
      status: item.status.toLowerCase(),
      title: item.title,
      summary: item.summary,
      relatedMetric:
        typeof suggestion.relatedMetric === "string"
          ? suggestion.relatedMetric
          : null,
      owner: item.owner
        ? {
            userId: item.owner.id,
            name: item.owner.realName ?? item.owner.nickname ?? item.owner.phone
          }
        : null,
      createdAt: toDateTimeString(item.triggeredAt),
      handledAt: toDateTimeString(item.handledAt)
    };

    if (!includeDetail) {
      return summary;
    }

    return {
      ...summary,
      suggestion
    };
  }

  private ensureRecord(value: unknown) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }

    return {};
  }

  private ensureArray(value: unknown) {
    return Array.isArray(value) ? value : [];
  }

  private pickFirstNonEmptyArray(primary: unknown, fallback: unknown) {
    const primaryRows = this.ensureArray(primary);
    if (primaryRows.length > 0) {
      return primaryRows;
    }
    return this.ensureArray(fallback);
  }

  private ensureStringArray(value: unknown) {
    if (!Array.isArray(value)) {
      return [];
    }

    return value.filter((item): item is string => typeof item === "string");
  }

  private pickFirstNonEmptyStringArray(primary: unknown, fallback: unknown) {
    const primaryRows = this.ensureStringArray(primary);
    if (primaryRows.length > 0) {
      return primaryRows;
    }
    return this.ensureStringArray(fallback);
  }

  private toNullableString(value: unknown) {
    return typeof value === "string" ? value : null;
  }
}
