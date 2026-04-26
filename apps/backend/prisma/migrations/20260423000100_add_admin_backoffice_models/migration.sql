-- CreateEnum
CREATE TYPE "StaffApplicationStatus" AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED'
);

-- CreateEnum
CREATE TYPE "AdminMessageCampaignStatus" AS ENUM (
    'DRAFT',
    'SCHEDULED',
    'REVIEWING',
    'SENT',
    'WITHDRAWN'
);

-- CreateEnum
CREATE TYPE "AdminMessageCampaignChannel" AS ENUM (
    'SYSTEM',
    'SMS',
    'CONVERSATION'
);

-- AlterEnum
ALTER TYPE "FileCategory" ADD VALUE IF NOT EXISTS 'ADMIN_AVATAR';
ALTER TYPE "FileCategory" ADD VALUE IF NOT EXISTS 'ADMIN_DOCUMENT';
ALTER TYPE "FileCategory" ADD VALUE IF NOT EXISTS 'INSTITUTION_COVER';
ALTER TYPE "FileCategory" ADD VALUE IF NOT EXISTS 'SERVICE_COVER';

-- AlterTable
ALTER TABLE "OrderReview"
ADD COLUMN "isVisible" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "isPinned" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "deletedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "StaffApplication" (
    "id" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "status" "StaffApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "channel" TEXT,
    "rewardEnabled" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    "attachments" JSONB,
    "reviewerUserId" TEXT,
    "reviewRemark" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminMessageCampaign" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" "AdminMessageCampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "channel" "AdminMessageCampaignChannel" NOT NULL,
    "receiverType" TEXT NOT NULL,
    "receiverSnapshot" JSONB,
    "insertProductLink" BOOLEAN NOT NULL DEFAULT false,
    "productSnapshot" JSONB,
    "scheduledAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "withdrawnAt" TIMESTAMP(3),
    "createdByUserId" TEXT,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminMessageCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StaffApplication_staffId_key" ON "StaffApplication"("staffId");

-- CreateIndex
CREATE INDEX "StaffApplication_status_createdAt_idx" ON "StaffApplication"("status", "createdAt");

-- CreateIndex
CREATE INDEX "OrderReview_isVisible_isPinned_deletedAt_idx" ON "OrderReview"("isVisible", "isPinned", "deletedAt");

-- CreateIndex
CREATE INDEX "AdminMessageCampaign_status_createdAt_idx" ON "AdminMessageCampaign"("status", "createdAt");
