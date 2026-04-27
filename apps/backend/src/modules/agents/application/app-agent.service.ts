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
  FileCategory,
  MessageContentType,
  ServiceCategory,
  UserType
} from "@prisma/client";
import type { AuthenticatedUser } from "../../../common/auth/auth.types";
import { toDateTimeString, toPrismaJson } from "../../../common/utils/serializers";
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

interface AssistantAudioMetadata {
  fileId: string;
  url: string;
  fileName: string;
  mimeType: string;
  durationSeconds: number | null;
  transcript: string | null;
}

interface ResolvedAssistantUserMessage {
  contentType: "TEXT" | "AUDIO";
  content: Record<string, unknown>;
  userMessageText: string;
  previewText: string;
}

const DEFAULT_ASSISTANT_NAME = "豆沙包";
const DEFAULT_ASSISTANT_TOPIC = "豆沙包健康咨询";
const DEFAULT_ASSISTANT_WELCOME_MESSAGE =
  "你好，我在。你可以直接和我聊报告、健康变化，或者服务怎么选。";

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
      payload.welcomeMessage ?? DEFAULT_ASSISTANT_WELCOME_MESSAGE;
    const conversation = await this.prismaService.$transaction(async (tx) => {
      const created = await tx.conversation.create({
        data: {
          scene: ConversationScene.ASSISTANT,
          topic: payload.topic?.trim() || DEFAULT_ASSISTANT_TOPIC,
          metadata: {
            channel: "app-ai",
            source: "app",
            assistantUserId,
            assistantName: DEFAULT_ASSISTANT_NAME
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
    const rows = messages.map((item) => this.mapAssistantMessage(item, user.id));
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
    const conversation = await this.assertAssistantConversationParticipant(
      user.id,
      conversationId
    );
    const assistantUserId = await this.findConversationAssistantUserId(conversationId, user.id);
    const metadata = this.ensureRecord(payload.metadata);
    const normalizedMessage = await this.resolveAssistantUserMessage(user.id, payload);
    const targetUserId = await this.resolveTargetUserId(
      user,
      this.extractAssistantElderId(metadata)
    );
    const reportContext = await this.resolveAssistantReportContext(
      user,
      targetUserId,
      this.extractAssistantReportId(metadata)
    );

    const userMessage = await this.prismaService.conversationMessage.create({
      data: {
        conversationId,
        senderId: user.id,
        contentType: normalizedMessage.contentType,
        content: toPrismaJson(normalizedMessage.content)
      }
    });

    const history = await this.buildConversationHistory(conversationId, user.id);
    const agent = await this.executeInlineTask({
      ownerId: user.id,
      taskType: "assistant-conversation",
      triggerSource: "assistant",
      payload: {
        sessionId: conversationId,
        userMessage: normalizedMessage.userMessageText,
        conversationHistory: history,
        pageContext:
          payload.pageId || payload.route || payload.metadata
            ? {
                pageId: payload.pageId,
                route: payload.route,
                metadata: payload.metadata ?? undefined
              }
            : undefined,
        contextSnapshot: {
          ownerUserId: user.id,
          targetUserId,
          authorizedScope: this.buildAuthorizedScope(user, targetUserId),
          selectedReportId: reportContext?.selectedReportId ?? null,
          latestReportId: reportContext?.latestReportId ?? null,
          latestReportTitle: reportContext?.latestReportTitle ?? null,
          preferredServiceCategory: this.extractAssistantServiceCategory(metadata),
          preferredServiceScene: this.extractAssistantServiceScene(metadata)
        }
      }
    });
    const generatedReplyText =
      typeof agent.output.assistantReply === "string"
        ? agent.output.assistantReply
        : `${DEFAULT_ASSISTANT_NAME}在，我会继续结合当前上下文帮你整理重点。`;
    const directReplyText = this.orchestrator.resolveAssistantDirectReply(
      normalizedMessage.userMessageText
    );
    const replyText = directReplyText ?? generatedReplyText;

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
      userMessage: this.mapAssistantMessage(userMessage, user.id),
      reply: this.mapAssistantMessage(assistantMessage, user.id),
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
    const interpretation =
      this.toNullableString(task.output.conclusion) ??
      this.toNullableString(task.output.healthSummary) ??
      "";
    const highlights = this.pickFirstNonEmptyStringArray(
      task.output.reportHighlights,
      task.output.keyFindings
    );
    const riskSignals = this.ensureStringArray(task.output.riskSignals);
    const followUpSuggestions = this.pickFirstNonEmptyStringArray(
      task.output.followUpActions,
      task.output.followUpSuggestions
    );

    return {
      taskId: task.taskId,
      reportId,
      interpretation,
      highlights,
      keywords: this.buildReportKeywords(highlights, riskSignals, followUpSuggestions, [
        interpretation
      ]),
      riskSignals,
      followUpSuggestions,
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

  private mapAssistantMessage(
    item: {
      id: string;
      senderId: string | null;
      contentType: MessageContentType;
      content: unknown;
      createdAt: Date;
    },
    userId: string
  ) {
    const audio = this.extractAssistantAudio(item.contentType, item.content);

    return {
      messageId: item.id,
      role: item.senderId === userId ? "user" : "assistant",
      type: item.contentType === MessageContentType.AUDIO ? "voice" : "text",
      content: this.extractMessageText(item.contentType, item.content),
      audio,
      createdAt: toDateTimeString(item.createdAt)
    };
  }

  private async resolveAssistantUserMessage(
    userId: string,
    payload: SendAssistantMessageDto
  ): Promise<ResolvedAssistantUserMessage> {
    const contentType =
      payload.contentType === "AUDIO"
        ? MessageContentType.AUDIO
        : MessageContentType.TEXT;

    if (contentType === MessageContentType.TEXT) {
      const text = payload.content?.trim();

      if (!text) {
        throw new BadRequestException("Message content is required");
      }

      return {
        contentType,
        content: {
          text
        },
        userMessageText: text,
        previewText: text
      };
    }

    const fileId = payload.fileId?.trim();
    if (!fileId) {
      throw new BadRequestException("Audio message fileId is required");
    }

    const file = await this.prismaService.fileAsset.findUnique({
      where: { id: fileId }
    });

    if (!file) {
      throw new NotFoundException("Audio file not found");
    }

    if (file.uploaderId && file.uploaderId !== userId) {
      throw new ForbiddenException("No permission to use this audio file");
    }

    if (file.category !== FileCategory.CHAT_AUDIO) {
      throw new BadRequestException("Audio file category is invalid");
    }

    const transcript = payload.transcript?.trim() || null;
    const durationSeconds = this.normalizeDurationSeconds(payload.durationSeconds);

    return {
      contentType,
      content: {
        fileId: file.id,
        url: file.url ?? "",
        fileName: file.fileName,
        mimeType: payload.mimeType?.trim() || file.mimeType,
        durationSeconds,
        transcript,
        text: transcript ?? "语音消息"
      },
      userMessageText:
        transcript ??
        "用户发来一条未转写的语音，请明确说明当前环境暂时无法直接理解纯音频内容，并请用户重试语音或补充文字。",
      previewText: transcript ?? "语音消息"
    };
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
    const record = this.ensureRecord(value);

    if (contentType === MessageContentType.TEXT) {
      const text =
        typeof record.text === "string"
          ? record.text
          : typeof record.content === "string"
            ? record.content
            : null;
      if (text) {
        return text;
      }
    }

    if (contentType === MessageContentType.AUDIO) {
      const transcript =
        typeof record.transcript === "string"
          ? record.transcript
          : typeof record.text === "string"
            ? record.text
            : null;

      if (transcript?.trim()) {
        return transcript.trim();
      }

      return "语音消息";
    }

    if (typeof value === "string") {
      return value;
    }

    return JSON.stringify(value ?? {});
  }

  private extractAssistantAudio(contentType: MessageContentType, value: unknown) {
    if (contentType !== MessageContentType.AUDIO) {
      return null;
    }

    const record = this.ensureRecord(value);
    const fileId = typeof record.fileId === "string" ? record.fileId : "";
    const url = typeof record.url === "string" ? record.url : "";

    if (!fileId || !url) {
      return null;
    }

    return {
      fileId,
      url,
      fileName: typeof record.fileName === "string" ? record.fileName : "voice-message.webm",
      mimeType: typeof record.mimeType === "string" ? record.mimeType : "audio/webm",
      durationSeconds: this.normalizeDurationSeconds(record.durationSeconds),
      transcript:
        typeof record.transcript === "string" && record.transcript.trim().length > 0
          ? record.transcript.trim()
          : null
    } satisfies AssistantAudioMetadata;
  }

  private normalizeDurationSeconds(value: unknown) {
    if (typeof value !== "number" || Number.isNaN(value)) {
      return null;
    }

    return value > 0 ? Math.round(value) : null;
  }

  private extractAssistantElderId(metadata: Record<string, unknown>) {
    return typeof metadata.elderId === "string" && metadata.elderId.trim().length > 0
      ? metadata.elderId.trim()
      : undefined;
  }

  private extractAssistantReportId(metadata: Record<string, unknown>) {
    for (const key of ["selectedReportId", "reportId"]) {
      const value = metadata[key];

      if (typeof value === "string" && value.trim().length > 0) {
        return value.trim();
      }
    }

    return undefined;
  }

  private extractAssistantServiceCategory(metadata: Record<string, unknown>) {
    const value = metadata.serviceCategory;

    return typeof value === "string" &&
      Object.values(ServiceCategory).includes(value as ServiceCategory)
      ? (value as ServiceCategory)
      : null;
  }

  private extractAssistantServiceScene(metadata: Record<string, unknown>) {
    const value = metadata.aiScene;

    return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
  }

  private async resolveAssistantReportContext(
    currentUser: AuthenticatedUser,
    targetUserId: string,
    preferredReportId?: string
  ) {
    if (preferredReportId) {
      const accessible = await this.getAccessibleReport(currentUser, preferredReportId, targetUserId);
      const report = await this.prismaService.report.findUnique({
        where: { id: accessible.reportId },
        select: {
          id: true,
          title: true
        }
      });

      if (report) {
        return {
          selectedReportId: report.id,
          latestReportId: report.id,
          latestReportTitle: report.title
        };
      }
    }

    const report = await this.prismaService.report.findFirst({
      where: {
        OR: [
          {
            archive: {
              is: {
                userId: targetUserId
              }
            }
          },
          {
            order: {
              is: {
                elderId: targetUserId
              }
            }
          },
          {
            order: {
              is: {
                ownerId: currentUser.id
              }
            }
          }
        ]
      },
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        title: true
      }
    });

    if (!report) {
      return null;
    }

    return {
      selectedReportId: null,
      latestReportId: report.id,
      latestReportTitle: report.title
    };
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

  private buildReportKeywords(...groups: string[][]) {
    const keywords: string[] = [];

    for (const value of groups.flat()) {
      for (const candidate of this.splitKeywordCandidates(value)) {
        if (keywords.includes(candidate)) {
          continue;
        }

        keywords.push(candidate);

        if (keywords.length >= 4) {
          return keywords;
        }
      }
    }

    return keywords;
  }

  private splitKeywordCandidates(value: string) {
    const normalized = this.normalizeKeywordText(value);

    if (!normalized) {
      return [];
    }

    const segments = normalized
      .split(/[；;、，,]/u)
      .map((item) => this.normalizeKeywordText(item))
      .filter(Boolean);
    const nextSegments = segments.length > 1 ? segments : [normalized];

    return nextSegments.filter((item) => item.length >= 2 && item.length <= 18);
  }

  private normalizeKeywordText(value: string) {
    return value
      .replace(/^(内容评估|风险提醒|后续建议|建议|提示|摘要|结论|分析|重点)[：:]\s*/u, "")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/[。；;、，,]+$/u, "");
  }

  private toNullableString(value: unknown) {
    return typeof value === "string" ? value : null;
  }
}
