import assert from "node:assert/strict";
import test from "node:test";
import { AgentHumanReviewStatus, Prisma } from "@prisma/client";
import { AgentGovernanceService } from "../../src/modules/agents/application/agent-governance.service";

test("finalizeSucceededTask creates a human review ticket and enriches task output", async () => {
  const auditEvents: string[] = [];
  const prismaService = {
    agentTask: {
      findUnique: async () => ({
        id: "task_001",
        ownerId: "user_001",
        taskType: "report-interpretation",
        payload: {
          reportId: "report_001"
        }
      })
    },
    agentHumanReview: {
      upsert: async ({ create }: { create: Record<string, unknown> }) => ({
        id: "review_001",
        status: AgentHumanReviewStatus.PENDING,
        queueName: create.queueName,
        requestedAt: new Date("2026-04-22T08:00:00Z"),
        reviewedAt: null,
        riskLevel: create.riskLevel,
        reviewDecision: create.reviewDecision,
        riskFlags: create.riskFlags,
        reviewNotes: create.reviewNotes
      })
    },
    agentAuditLog: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        auditEvents.push(String(data.eventType));
        return data;
      }
    }
  };

  const service = new AgentGovernanceService(prismaService as never);
  const result = await service.finalizeSucceededTask("task_001", {
    status: "succeeded",
    agent: {
      requestedName: "intent-router",
      resolvedName: "HealthManagementAgent",
      taskType: "report-interpretation",
      triggerSource: "assistant",
      ownerId: "user_001"
    },
    output: {
      conclusion: "建议关注血压波动。",
      requiresHumanReview: true
    },
    trace: {
      attempt: 1,
      maxAttempts: 1,
      startedAt: "2026-04-22T08:00:00Z",
      coordination: {
        safetyReview: {
          reviewDecision: "blocked",
          humanReviewRequired: true,
          riskFlags: ["medical-boundary"],
          reviewNotes: ["涉及高风险医学解释，需医生复核。"],
          blockedAction: null
        }
      }
    }
  });

  const output = result.output as Record<string, unknown>;
  const trace = result.trace as Record<string, unknown>;
  const governance = (trace.governance as Record<string, unknown>).humanReview as Record<
    string,
    unknown
  >;

  assert.equal(output.humanReviewTicketId, "review_001");
  assert.equal(output.reviewStatus, AgentHumanReviewStatus.PENDING);
  assert.equal(output.reviewQueueName, "clinical-review");
  assert.equal(governance.reviewId, "review_001");
  assert.deepEqual(auditEvents, [
    "task-succeeded",
    "safety-review-completed",
    "human-review-required"
  ]);
});

test("resolveReview writes review decision back into task result and audit log", async () => {
  const updatedTaskResults: Prisma.InputJsonValue[] = [];
  const auditEvents: string[] = [];
  let findUniqueCount = 0;
  const baseResult = {
    status: "succeeded",
    output: {
      conclusion: "建议继续监测。",
      humanReviewTicketId: "review_001",
      reviewStatus: "PENDING"
    },
    trace: {
      attempt: 1,
      maxAttempts: 1,
      startedAt: "2026-04-22T08:00:00Z",
      governance: {
        humanReview: {
          required: true,
          reviewId: "review_001",
          status: "PENDING"
        }
      }
    }
  };
  const prismaService = {
    agentHumanReview: {
      findUnique: async () => {
        findUniqueCount += 1;

        if (findUniqueCount === 1) {
          return {
            id: "review_001",
            blockedAction: null,
            agentTask: {
              id: "task_001",
              result: baseResult
            }
          };
        }

        return {
          id: "review_001",
          agentTaskId: "task_001",
          status: AgentHumanReviewStatus.APPROVED,
          riskLevel: "high",
          queueName: "clinical-review",
          sourceAgent: "HealthManagementAgent",
          reviewDecision: "approved",
          blockedAction: null,
          riskFlags: ["medical-boundary"],
          reviewNotes: ["已由医生确认可下发。"],
          resolution: { decision: "approved" },
          reviewerId: "reviewer_001",
          requestedAt: new Date("2026-04-22T08:00:00Z"),
          reviewedAt: new Date("2026-04-22T08:05:00Z"),
          createdAt: new Date("2026-04-22T08:00:00Z"),
          updatedAt: new Date("2026-04-22T08:05:00Z"),
          agentTask: {
            id: "task_001",
            ownerId: "user_001",
            agentName: "intent-router",
            taskType: "report-interpretation",
            status: "SUCCEEDED",
            payload: {
              reportId: "report_001"
            },
            result: baseResult,
            createdAt: new Date("2026-04-22T08:00:00Z"),
            updatedAt: new Date("2026-04-22T08:05:00Z")
          },
          auditLogs: []
        };
      }
    },
    $transaction: async (
      callback: (tx: {
        agentHumanReview: {
          update: (args: { data: Record<string, unknown> }) => Promise<Record<string, unknown>>;
        };
        agentTask: {
          update: (args: { data: Record<string, unknown> }) => Promise<Record<string, unknown>>;
        };
        agentAuditLog: {
          create: (args: { data: Record<string, unknown> }) => Promise<Record<string, unknown>>;
        };
      }) => Promise<unknown>
    ) =>
      callback({
        agentHumanReview: {
          update: async ({ data }) => ({
            id: "review_001",
            status: data.status,
            queueName: "clinical-review",
            requestedAt: new Date("2026-04-22T08:00:00Z"),
            reviewedAt: new Date("2026-04-22T08:05:00Z"),
            reviewDecision: data.reviewDecision,
            agentTask: {
              id: "task_001"
            }
          })
        },
        agentTask: {
          update: async ({ data }) => {
            updatedTaskResults.push(data.result as Prisma.InputJsonValue);
            return data;
          }
        },
        agentAuditLog: {
          create: async ({ data }) => {
            auditEvents.push(String(data.eventType));
            return data;
          }
        }
      })
  };

  const service = new AgentGovernanceService(prismaService as never);
  const response = await service.resolveReview(
    "review_001",
    {
      id: "reviewer_001",
      phone: "13700000000",
      type: "STAFF" as never,
      roles: ["DOCTOR"],
      scope: "admin",
      realName: "王医生"
    },
    {
      decision: "approved",
      notes: ["已由医生确认可下发。"]
    }
  );

  const persistedEnvelope = updatedTaskResults[0] as Record<string, unknown>;
  const persistedOutput = persistedEnvelope.output as Record<string, unknown>;

  assert.equal(persistedOutput.reviewStatus, AgentHumanReviewStatus.APPROVED);
  assert.equal(persistedOutput.reviewDecision, "approved");
  assert.deepEqual(auditEvents, ["human-review-resolved"]);
  assert.equal(response.status, AgentHumanReviewStatus.APPROVED);
});
