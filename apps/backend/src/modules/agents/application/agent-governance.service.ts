import { Injectable, NotFoundException } from "@nestjs/common";
import {
  AgentHumanReviewStatus,
  Prisma
} from "@prisma/client";
import type { AuthenticatedUser } from "../../../common/auth/auth.types";
import { PrismaService } from "../../../infra/prisma/prisma.service";
import type { AgentExecutionEnvelope } from "../domain/agent-types";
import type {
  ListAgentAuditLogsQueryDto,
  ListAgentReviewsQueryDto,
  ResolveAgentReviewDto
} from "../dto/governance.dto";

type JsonRecord = Record<string, unknown>;

interface ReviewGovernanceSnapshot {
  required: boolean;
  sourceAgent: string | null;
  reviewDecision: string | null;
  riskFlags: string[];
  reviewNotes: string[];
  blockedAction: string | null;
  riskLevel: string | null;
  queueName: string | null;
}

@Injectable()
export class AgentGovernanceService {
  constructor(private readonly prismaService: PrismaService) {}

  async recordTaskCreated(task: {
    id: string;
    ownerId: string | null;
    agentName: string;
    taskType: string;
    triggerSource: string | null;
    payload: unknown;
  }) {
    await this.createAuditLog({
      agentTaskId: task.id,
      eventType: "task-created",
      actorType: "system",
      actorId: task.ownerId,
      summary: `创建 Agent 任务 ${task.taskType}`,
      payload: {
        ownerId: task.ownerId,
        agentName: task.agentName,
        taskType: task.taskType,
        triggerSource: task.triggerSource,
        payload: task.payload
      }
    });
  }

  async recordTaskRetried(task: {
    id: string;
    ownerId: string | null;
    agentName: string;
    taskType: string;
  }) {
    await this.createAuditLog({
      agentTaskId: task.id,
      eventType: "task-retried",
      actorType: "system",
      actorId: task.ownerId,
      summary: `重试 Agent 任务 ${task.taskType}`,
      payload: {
        agentName: task.agentName,
        taskType: task.taskType
      }
    });
  }

  async recordTaskRunning(taskId: string, result: AgentExecutionEnvelope) {
    await this.createAuditLog({
      agentTaskId: taskId,
      eventType: "task-running",
      actorType: "worker",
      summary: "Agent 任务进入执行中",
      payload: {
        agent: result.agent,
        trace: result.trace
      }
    });
  }

  async recordTaskPendingRetry(taskId: string, result: AgentExecutionEnvelope) {
    await this.createAuditLog({
      agentTaskId: taskId,
      eventType: "task-retry-scheduled",
      actorType: "worker",
      summary: "Agent 任务已进入重试队列",
      payload: {
        agent: result.agent,
        error: result.error,
        trace: result.trace
      }
    });
  }

  async recordTaskFailed(taskId: string, result: AgentExecutionEnvelope) {
    await this.createAuditLog({
      agentTaskId: taskId,
      eventType: "task-failed",
      actorType: "worker",
      summary: "Agent 任务执行失败",
      payload: {
        agent: result.agent,
        error: result.error,
        trace: result.trace
      }
    });
  }

  async finalizeSucceededTask(taskId: string, result: AgentExecutionEnvelope) {
    const task = await this.prismaService.agentTask.findUnique({
      where: { id: taskId },
      select: {
        id: true,
        ownerId: true,
        taskType: true,
        payload: true
      }
    });

    if (!task) {
      throw new NotFoundException(`Agent task ${taskId} not found`);
    }

    const governance = this.extractGovernanceSnapshot(task.taskType, result);
    const reviewRecord = governance.required
      ? await this.prismaService.agentHumanReview.upsert({
          where: { agentTaskId: taskId },
          create: {
            agentTaskId: taskId,
            status: AgentHumanReviewStatus.PENDING,
            riskLevel: governance.riskLevel,
            queueName: governance.queueName,
            sourceAgent: governance.sourceAgent,
            reviewDecision: governance.reviewDecision,
            blockedAction: governance.blockedAction,
            riskFlags: this.toJsonValue(governance.riskFlags),
            reviewNotes: this.toJsonValue(governance.reviewNotes),
            payloadSnapshot: this.toJsonValue(task.payload),
            outputSnapshot: this.toJsonValue(result.output),
            traceSnapshot: this.toJsonValue(result.trace)
          },
          update: {
            status: AgentHumanReviewStatus.PENDING,
            riskLevel: governance.riskLevel,
            queueName: governance.queueName,
            sourceAgent: governance.sourceAgent,
            reviewDecision: governance.reviewDecision,
            blockedAction: governance.blockedAction,
            riskFlags: this.toJsonValue(governance.riskFlags),
            reviewNotes: this.toJsonValue(governance.reviewNotes),
            payloadSnapshot: this.toJsonValue(task.payload),
            outputSnapshot: this.toJsonValue(result.output),
            traceSnapshot: this.toJsonValue(result.trace),
            resolution: Prisma.JsonNull,
            reviewerId: null,
            reviewedAt: null
          }
        })
      : null;

    const enrichedResult = this.attachGovernanceMetadata(result, reviewRecord, governance);

    await this.createAuditLog({
      agentTaskId: taskId,
      humanReviewId: reviewRecord?.id,
      eventType: "task-succeeded",
      actorType: "worker",
      actorId: task.ownerId,
      summary: governance.required
        ? "Agent 任务执行完成并进入人工复核"
        : "Agent 任务执行完成",
      payload: {
        agent: enrichedResult.agent,
        governance,
        output: enrichedResult.output,
        trace: enrichedResult.trace
      }
    });

    const safetyReview = this.readSafetyReview(result);
    if (safetyReview) {
      await this.createAuditLog({
        agentTaskId: taskId,
        humanReviewId: reviewRecord?.id,
        eventType: "safety-review-completed",
        actorType: "system",
        summary: "统一安全门禁已完成",
        payload: safetyReview
      });
    }

    if (reviewRecord) {
      await this.createAuditLog({
        agentTaskId: taskId,
        humanReviewId: reviewRecord.id,
        eventType: "human-review-required",
        actorType: "system",
        summary: `高风险输出进入 ${reviewRecord.queueName ?? "agent-human-review"} 队列`,
        payload: {
          reviewId: reviewRecord.id,
          queueName: reviewRecord.queueName,
          riskLevel: reviewRecord.riskLevel,
          reviewDecision: reviewRecord.reviewDecision,
          riskFlags: reviewRecord.riskFlags,
          reviewNotes: reviewRecord.reviewNotes
        }
      });
    }

    return enrichedResult;
  }

  async listReviews(query: ListAgentReviewsQueryDto) {
    const rows = await this.prismaService.agentHumanReview.findMany({
      where: {
        ...(query.status ? { status: query.status } : {}),
        ...(query.queueName ? { queueName: query.queueName } : {}),
        ...(query.agentTaskId ? { agentTaskId: query.agentTaskId } : {})
      },
      include: {
        agentTask: {
          select: {
            id: true,
            ownerId: true,
            agentName: true,
            taskType: true,
            status: true,
            createdAt: true,
            updatedAt: true
          }
        }
      },
      orderBy: [{ requestedAt: "desc" }],
      take: query.limit
    });

    return {
      total: rows.length,
      reviews: rows.map((row) => this.toReviewSummary(row))
    };
  }

  async getReviewById(reviewId: string) {
    const review = await this.prismaService.agentHumanReview.findUnique({
      where: { id: reviewId },
      include: {
        agentTask: true,
        auditLogs: {
          orderBy: { createdAt: "asc" }
        }
      }
    });

    if (!review) {
      throw new NotFoundException(`Agent human review ${reviewId} not found`);
    }

    return {
      ...this.toReviewSummary(review),
      agentTask: {
        id: review.agentTask.id,
        ownerId: review.agentTask.ownerId,
        agentName: review.agentTask.agentName,
        taskType: review.agentTask.taskType,
        status: review.agentTask.status,
        payload: review.agentTask.payload,
        result: review.agentTask.result,
        createdAt: review.agentTask.createdAt.toISOString(),
        updatedAt: review.agentTask.updatedAt.toISOString()
      },
      auditLogs: review.auditLogs.map((item) => this.toAuditLog(item))
    };
  }

  async resolveReview(
    reviewId: string,
    currentUser: AuthenticatedUser,
    input: ResolveAgentReviewDto
  ) {
    const review = await this.prismaService.agentHumanReview.findUnique({
      where: { id: reviewId },
      include: {
        agentTask: {
          select: {
            id: true,
            result: true
          }
        }
      }
    });

    if (!review) {
      throw new NotFoundException(`Agent human review ${reviewId} not found`);
    }

    const now = new Date();
    const status =
      input.decision === "approved"
        ? AgentHumanReviewStatus.APPROVED
        : input.decision === "blocked"
          ? AgentHumanReviewStatus.BLOCKED
          : AgentHumanReviewStatus.REJECTED;
    const resolutionPayload = {
      decision: input.decision,
      notes: input.notes ?? [],
      blockedAction: input.blockedAction ?? null,
      reviewer: {
        id: currentUser.id,
        realName: currentUser.realName,
        roles: currentUser.roles
      },
      resolvedAt: now.toISOString()
    };

    const updated = await this.prismaService.$transaction(async (tx) => {
      const nextReview = await tx.agentHumanReview.update({
        where: { id: reviewId },
        data: {
          status,
          reviewDecision: input.decision,
          reviewNotes: this.toJsonValue(input.notes ?? []),
          blockedAction: input.blockedAction ?? review.blockedAction,
          reviewerId: currentUser.id,
          reviewedAt: now,
          resolution: this.toJsonValue(resolutionPayload)
        },
        include: {
          agentTask: true
        }
      });

      const nextResult = this.attachResolvedReviewToResult(
        review.agentTask.result,
        nextReview
      );

      if (nextResult) {
        await tx.agentTask.update({
          where: { id: review.agentTask.id },
          data: {
            result: nextResult
          }
        });
      }

      await tx.agentAuditLog.create({
        data: {
          agentTaskId: review.agentTask.id,
          humanReviewId: reviewId,
          eventType: "human-review-resolved",
          actorType: "reviewer",
          actorId: currentUser.id,
          summary: `人工复核结果：${input.decision}`,
          payload: this.toJsonValue(resolutionPayload)
        }
      });

      return nextReview;
    });

    return this.getReviewById(updated.id);
  }

  async listAuditLogs(query: ListAgentAuditLogsQueryDto) {
    const rows = await this.prismaService.agentAuditLog.findMany({
      where: {
        ...(query.agentTaskId ? { agentTaskId: query.agentTaskId } : {}),
        ...(query.humanReviewId ? { humanReviewId: query.humanReviewId } : {}),
        ...(query.eventType ? { eventType: query.eventType } : {})
      },
      orderBy: [{ createdAt: "desc" }],
      take: query.limit
    });

    return {
      total: rows.length,
      logs: rows.map((row) => this.toAuditLog(row))
    };
  }

  private extractGovernanceSnapshot(taskType: string, result: AgentExecutionEnvelope) {
    const output = this.toRecord(result.output);
    const safetyReview = this.readSafetyReview(result);
    const humanReviewRequired =
      this.readBoolean(output.humanReviewRequired) ||
      this.readBoolean(output.requiresHumanReview) ||
      this.readBoolean(output.humanEscalationRequired) ||
      safetyReview?.humanReviewRequired === true ||
      safetyReview?.reviewDecision === "blocked";
    const riskLevel = this.inferRiskLevel(taskType, safetyReview, output);

    return {
      required: humanReviewRequired,
      sourceAgent:
        typeof result.agent?.resolvedName === "string"
          ? result.agent.resolvedName
          : null,
      reviewDecision:
        typeof safetyReview?.reviewDecision === "string"
          ? safetyReview.reviewDecision
          : null,
      riskFlags: this.readStringArray(safetyReview?.riskFlags),
      reviewNotes: this.readStringArray(safetyReview?.reviewNotes),
      blockedAction:
        typeof safetyReview?.blockedAction === "string"
          ? safetyReview.blockedAction
          : null,
      riskLevel,
      queueName: humanReviewRequired ? this.inferQueueName(taskType, riskLevel) : null
    } satisfies ReviewGovernanceSnapshot;
  }

  private inferRiskLevel(
    taskType: string,
    safetyReview: JsonRecord | null,
    output: JsonRecord
  ) {
    if (
      typeof safetyReview?.reviewDecision === "string" &&
      safetyReview.reviewDecision === "blocked"
    ) {
      return "high";
    }

    if (
      typeof output.riskLevel === "string" &&
      ["low", "medium", "high"].includes(output.riskLevel)
    ) {
      return output.riskLevel;
    }

    if (
      taskType === "report-interpretation" ||
      taskType === "risk-screening" ||
      taskType === "alert-triage"
    ) {
      return "high";
    }

    if (taskType === "dispatch-suggestion" || taskType === "health-summary") {
      return "medium";
    }

    return "low";
  }

  private inferQueueName(taskType: string, riskLevel: string | null) {
    if (
      taskType === "report-interpretation" ||
      taskType === "health-summary" ||
      taskType === "focus-elder-brief"
    ) {
      return riskLevel === "high" ? "clinical-review" : "health-manager-review";
    }

    if (
      taskType === "risk-screening" ||
      taskType === "alert-triage" ||
      taskType === "risk-reminder"
    ) {
      return "risk-ops-review";
    }

    if (
      taskType === "dispatch-suggestion" ||
      taskType === "service-recommendation" ||
      taskType === "booking-prefill"
    ) {
      return "care-ops-review";
    }

    return "agent-human-review";
  }

  private attachGovernanceMetadata(
    result: AgentExecutionEnvelope,
    review:
      | {
          id: string;
          status: AgentHumanReviewStatus;
          queueName: string | null;
          requestedAt: Date;
          reviewedAt: Date | null;
        }
      | null,
    governance: ReviewGovernanceSnapshot
  ): AgentExecutionEnvelope {
    const nextResult = this.cloneEnvelope(result);
    const nextTrace = this.toRecord(nextResult.trace);
    nextTrace.governance = {
      humanReview: {
        required: governance.required,
        reviewId: review?.id ?? null,
        status: review?.status ?? null,
        queueName: review?.queueName ?? governance.queueName,
        requestedAt: review?.requestedAt.toISOString() ?? null,
        reviewedAt: review?.reviewedAt?.toISOString() ?? null
      }
    };
    nextResult.trace = nextTrace as AgentExecutionEnvelope["trace"];

    const nextOutput = this.toRecord(nextResult.output);
    if (Object.keys(nextOutput).length > 0) {
      nextOutput.humanReviewRequired =
        governance.required || this.readBoolean(nextOutput.humanReviewRequired);
      nextOutput.humanReviewTicketId = review?.id ?? null;
      nextOutput.reviewStatus = review?.status ?? null;
      nextOutput.reviewQueueName = review?.queueName ?? governance.queueName;
      nextResult.output = nextOutput;
    }

    return nextResult;
  }

  private attachResolvedReviewToResult(
    result: Prisma.JsonValue | null,
    review: {
      id: string;
      status: AgentHumanReviewStatus;
      queueName: string | null;
      requestedAt: Date;
      reviewedAt: Date | null;
      reviewDecision: string | null;
    }
  ) {
    if (!result || typeof result !== "object" || Array.isArray(result)) {
      return result;
    }

    const envelope = { ...(result as JsonRecord) };
    const trace = this.toRecord(envelope.trace);
    const governance = this.toRecord(trace.governance);
    governance.humanReview = {
      required: true,
      reviewId: review.id,
      status: review.status,
      queueName: review.queueName,
      requestedAt: review.requestedAt.toISOString(),
      reviewedAt: review.reviewedAt?.toISOString() ?? null,
      reviewDecision: review.reviewDecision
    };
    trace.governance = governance;
    envelope.trace = trace;

    const output = this.toRecord(envelope.output);
    if (Object.keys(output).length > 0) {
      output.humanReviewTicketId = review.id;
      output.reviewStatus = review.status;
      output.reviewQueueName = review.queueName;
      output.reviewDecision = review.reviewDecision;
      envelope.output = output;
    }

    return envelope as Prisma.InputJsonValue;
  }

  private readSafetyReview(result: AgentExecutionEnvelope) {
    const trace = this.toRecord(result.trace);
    const coordination = this.toRecord(trace.coordination);
    const review = coordination.safetyReview;

    if (!review || typeof review !== "object" || Array.isArray(review)) {
      return null;
    }

    return review as JsonRecord;
  }

  private toReviewSummary(review: {
    id: string;
    agentTaskId: string;
    status: AgentHumanReviewStatus;
    riskLevel: string | null;
    queueName: string | null;
    sourceAgent: string | null;
    reviewDecision: string | null;
    blockedAction: string | null;
    riskFlags: Prisma.JsonValue | null;
    reviewNotes: Prisma.JsonValue | null;
    resolution: Prisma.JsonValue | null;
    reviewerId: string | null;
    requestedAt: Date;
    reviewedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    agentTask?: {
      id: string;
      ownerId: string | null;
      agentName: string;
      taskType: string;
      status: string;
      createdAt: Date;
      updatedAt: Date;
    };
  }) {
    return {
      reviewId: review.id,
      agentTaskId: review.agentTaskId,
      status: review.status,
      riskLevel: review.riskLevel,
      queueName: review.queueName,
      sourceAgent: review.sourceAgent,
      reviewDecision: review.reviewDecision,
      blockedAction: review.blockedAction,
      riskFlags: this.readStringArray(review.riskFlags),
      reviewNotes: this.readStringArray(review.reviewNotes),
      reviewerId: review.reviewerId,
      resolution: review.resolution,
      requestedAt: review.requestedAt.toISOString(),
      reviewedAt: review.reviewedAt?.toISOString() ?? null,
      createdAt: review.createdAt.toISOString(),
      updatedAt: review.updatedAt.toISOString(),
      agentTask: review.agentTask
        ? {
            id: review.agentTask.id,
            ownerId: review.agentTask.ownerId,
            agentName: review.agentTask.agentName,
            taskType: review.agentTask.taskType,
            status: review.agentTask.status,
            createdAt: review.agentTask.createdAt.toISOString(),
            updatedAt: review.agentTask.updatedAt.toISOString()
          }
        : null
    };
  }

  private toAuditLog(log: {
    id: string;
    agentTaskId: string | null;
    humanReviewId: string | null;
    eventType: string;
    actorType: string;
    actorId: string | null;
    summary: string | null;
    payload: Prisma.JsonValue | null;
    createdAt: Date;
  }) {
    return {
      id: log.id,
      agentTaskId: log.agentTaskId,
      humanReviewId: log.humanReviewId,
      eventType: log.eventType,
      actorType: log.actorType,
      actorId: log.actorId,
      summary: log.summary,
      payload: log.payload,
      createdAt: log.createdAt.toISOString()
    };
  }

  private async createAuditLog(input: {
    agentTaskId?: string | null;
    humanReviewId?: string | null;
    eventType: string;
    actorType: string;
    actorId?: string | null;
    summary?: string | null;
    payload?: unknown;
  }) {
    await this.prismaService.agentAuditLog.create({
      data: {
        agentTaskId: input.agentTaskId ?? null,
        humanReviewId: input.humanReviewId ?? null,
        eventType: input.eventType,
        actorType: input.actorType,
        actorId: input.actorId ?? null,
        summary: input.summary ?? null,
        payload: this.toJsonValue(input.payload)
      }
    });
  }

  private cloneEnvelope(result: AgentExecutionEnvelope): AgentExecutionEnvelope {
    return {
      ...result,
      agent: { ...result.agent },
      trace: this.toRecord(result.trace) as AgentExecutionEnvelope["trace"],
      ...(result.output !== undefined ? { output: this.toRecord(result.output) } : {}),
      ...(result.error ? { error: { ...result.error } } : {})
    };
  }

  private toRecord(value: unknown): JsonRecord {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return {};
    }

    return { ...(value as JsonRecord) };
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

  private toJsonValue(value: unknown): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput {
    if (value === undefined) {
      return Prisma.JsonNull;
    }

    return value as Prisma.InputJsonValue;
  }
}
