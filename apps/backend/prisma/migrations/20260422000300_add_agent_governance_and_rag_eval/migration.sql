-- CreateEnum
CREATE TYPE "AgentHumanReviewStatus" AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED',
    'BLOCKED'
);

-- CreateEnum
CREATE TYPE "RagEvalRunStatus" AS ENUM (
    'RUNNING',
    'SUCCEEDED',
    'FAILED',
    'PARTIAL'
);

-- CreateEnum
CREATE TYPE "RagEvalCaseStatus" AS ENUM (
    'PASSED',
    'FAILED',
    'SKIPPED'
);

-- CreateTable
CREATE TABLE "AgentHumanReview" (
    "id" TEXT NOT NULL,
    "agentTaskId" TEXT NOT NULL,
    "status" "AgentHumanReviewStatus" NOT NULL DEFAULT 'PENDING',
    "riskLevel" TEXT,
    "queueName" TEXT,
    "sourceAgent" TEXT,
    "reviewDecision" TEXT,
    "blockedAction" TEXT,
    "riskFlags" JSONB,
    "reviewNotes" JSONB,
    "payloadSnapshot" JSONB,
    "outputSnapshot" JSONB,
    "traceSnapshot" JSONB,
    "resolution" JSONB,
    "reviewerId" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentHumanReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentAuditLog" (
    "id" TEXT NOT NULL,
    "agentTaskId" TEXT,
    "humanReviewId" TEXT,
    "eventType" TEXT NOT NULL,
    "actorType" TEXT NOT NULL,
    "actorId" TEXT,
    "summary" TEXT,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RagEvalRun" (
    "id" TEXT NOT NULL,
    "datasetName" TEXT NOT NULL,
    "datasetVersion" TEXT,
    "triggerSource" TEXT NOT NULL,
    "status" "RagEvalRunStatus" NOT NULL DEFAULT 'RUNNING',
    "summary" JSONB,
    "metadata" JSONB,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "RagEvalRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RagEvalCaseResult" (
    "id" TEXT NOT NULL,
    "evalRunId" TEXT NOT NULL,
    "caseKey" TEXT NOT NULL,
    "status" "RagEvalCaseStatus" NOT NULL,
    "query" TEXT NOT NULL,
    "limit" INTEGER NOT NULL,
    "targetUserId" TEXT,
    "institutionId" TEXT,
    "knowledgeTypes" JSONB,
    "visibilityScopes" JSONB,
    "expected" JSONB,
    "actual" JSONB,
    "metrics" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RagEvalCaseResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AgentTask_status_updatedAt_idx" ON "AgentTask"("status", "updatedAt");

-- CreateIndex
CREATE INDEX "AgentTask_ownerId_status_idx" ON "AgentTask"("ownerId", "status");

-- CreateIndex
CREATE INDEX "AgentTask_agentName_taskType_status_idx" ON "AgentTask"("agentName", "taskType", "status");

-- CreateIndex
CREATE UNIQUE INDEX "AgentHumanReview_agentTaskId_key" ON "AgentHumanReview"("agentTaskId");

-- CreateIndex
CREATE INDEX "AgentHumanReview_status_requestedAt_idx" ON "AgentHumanReview"("status", "requestedAt");

-- CreateIndex
CREATE INDEX "AgentHumanReview_queueName_status_requestedAt_idx" ON "AgentHumanReview"("queueName", "status", "requestedAt");

-- CreateIndex
CREATE INDEX "AgentAuditLog_agentTaskId_createdAt_idx" ON "AgentAuditLog"("agentTaskId", "createdAt");

-- CreateIndex
CREATE INDEX "AgentAuditLog_humanReviewId_createdAt_idx" ON "AgentAuditLog"("humanReviewId", "createdAt");

-- CreateIndex
CREATE INDEX "AgentAuditLog_eventType_createdAt_idx" ON "AgentAuditLog"("eventType", "createdAt");

-- CreateIndex
CREATE INDEX "RagEvalRun_status_startedAt_idx" ON "RagEvalRun"("status", "startedAt");

-- CreateIndex
CREATE INDEX "RagEvalRun_datasetName_startedAt_idx" ON "RagEvalRun"("datasetName", "startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "RagEvalCaseResult_evalRunId_caseKey_key" ON "RagEvalCaseResult"("evalRunId", "caseKey");

-- CreateIndex
CREATE INDEX "RagEvalCaseResult_evalRunId_status_idx" ON "RagEvalCaseResult"("evalRunId", "status");

-- AddForeignKey
ALTER TABLE "AgentHumanReview" ADD CONSTRAINT "AgentHumanReview_agentTaskId_fkey"
FOREIGN KEY ("agentTaskId") REFERENCES "AgentTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentAuditLog" ADD CONSTRAINT "AgentAuditLog_agentTaskId_fkey"
FOREIGN KEY ("agentTaskId") REFERENCES "AgentTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentAuditLog" ADD CONSTRAINT "AgentAuditLog_humanReviewId_fkey"
FOREIGN KEY ("humanReviewId") REFERENCES "AgentHumanReview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RagEvalCaseResult" ADD CONSTRAINT "RagEvalCaseResult_evalRunId_fkey"
FOREIGN KEY ("evalRunId") REFERENCES "RagEvalRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
