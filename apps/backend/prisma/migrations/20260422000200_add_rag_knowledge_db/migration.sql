-- CreateEnum
CREATE TYPE "RagKnowledgeType" AS ENUM (
    'SERVICE_CATALOG',
    'HEALTH_KNOWLEDGE',
    'PLATFORM_RULE',
    'INSTITUTION_RESOURCE',
    'USER_PRIVATE_ARCHIVE'
);

-- CreateEnum
CREATE TYPE "RagVisibilityScope" AS ENUM (
    'PUBLIC',
    'INSTITUTION',
    'USER_PRIVATE'
);

-- CreateEnum
CREATE TYPE "RagDocumentStatus" AS ENUM (
    'ACTIVE',
    'ARCHIVED',
    'ERROR'
);

-- CreateEnum
CREATE TYPE "RagIngestionStatus" AS ENUM (
    'RUNNING',
    'SUCCEEDED',
    'FAILED',
    'PARTIAL'
);

-- CreateEnum
CREATE TYPE "RagSourceType" AS ENUM (
    'WEB_CRAWL',
    'API_IMPORT',
    'INTERNAL_TABLE',
    'SYSTEM_RULE',
    'USER_ARCHIVE',
    'SEEDED_SAMPLE'
);

-- CreateTable
CREATE TABLE "RagKnowledgeBase" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "knowledgeType" "RagKnowledgeType" NOT NULL,
    "visibility" "RagVisibilityScope" NOT NULL,
    "description" TEXT,
    "sourceConfig" JSONB,
    "refreshPolicy" JSONB,
    "chunkConfig" JSONB,
    "metadata" JSONB,
    "ownerUserId" TEXT,
    "institutionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RagKnowledgeBase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RagDocument" (
    "id" TEXT NOT NULL,
    "knowledgeBaseId" TEXT NOT NULL,
    "sourceType" "RagSourceType" NOT NULL,
    "sourceUri" TEXT,
    "externalId" TEXT,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "contentText" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'zh-CN',
    "tags" JSONB,
    "metadata" JSONB,
    "accessPolicy" JSONB,
    "contentHash" TEXT NOT NULL,
    "status" "RagDocumentStatus" NOT NULL DEFAULT 'ACTIVE',
    "ownerUserId" TEXT,
    "institutionId" TEXT,
    "retrievedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RagDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RagChunk" (
    "id" TEXT NOT NULL,
    "knowledgeBaseId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "title" TEXT,
    "content" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "tokenCount" INTEGER,
    "charCount" INTEGER NOT NULL,
    "headings" JSONB,
    "keywords" JSONB,
    "metadata" JSONB,
    "embedding" JSONB,
    "embeddingModel" TEXT,
    "visibility" "RagVisibilityScope" NOT NULL,
    "ownerUserId" TEXT,
    "institutionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RagChunk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RagIngestionRun" (
    "id" TEXT NOT NULL,
    "knowledgeBaseId" TEXT NOT NULL,
    "triggerSource" TEXT NOT NULL,
    "status" "RagIngestionStatus" NOT NULL DEFAULT 'RUNNING',
    "documentCount" INTEGER NOT NULL DEFAULT 0,
    "chunkCount" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "RagIngestionRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RagKnowledgeBase_code_key" ON "RagKnowledgeBase"("code");

-- CreateIndex
CREATE INDEX "RagKnowledgeBase_knowledgeType_visibility_idx" ON "RagKnowledgeBase"("knowledgeType", "visibility");

-- CreateIndex
CREATE INDEX "RagKnowledgeBase_ownerUserId_visibility_idx" ON "RagKnowledgeBase"("ownerUserId", "visibility");

-- CreateIndex
CREATE INDEX "RagKnowledgeBase_institutionId_visibility_idx" ON "RagKnowledgeBase"("institutionId", "visibility");

-- CreateIndex
CREATE INDEX "RagDocument_knowledgeBaseId_status_idx" ON "RagDocument"("knowledgeBaseId", "status");

-- CreateIndex
CREATE INDEX "RagDocument_ownerUserId_status_idx" ON "RagDocument"("ownerUserId", "status");

-- CreateIndex
CREATE INDEX "RagDocument_institutionId_status_idx" ON "RagDocument"("institutionId", "status");

-- CreateIndex
CREATE INDEX "RagDocument_knowledgeBaseId_contentHash_idx" ON "RagDocument"("knowledgeBaseId", "contentHash");

-- CreateIndex
CREATE UNIQUE INDEX "RagChunk_documentId_chunkIndex_key" ON "RagChunk"("documentId", "chunkIndex");

-- CreateIndex
CREATE INDEX "RagChunk_knowledgeBaseId_visibility_idx" ON "RagChunk"("knowledgeBaseId", "visibility");

-- CreateIndex
CREATE INDEX "RagChunk_ownerUserId_visibility_idx" ON "RagChunk"("ownerUserId", "visibility");

-- CreateIndex
CREATE INDEX "RagChunk_institutionId_visibility_idx" ON "RagChunk"("institutionId", "visibility");

-- CreateIndex
CREATE INDEX "RagChunk_documentId_contentHash_idx" ON "RagChunk"("documentId", "contentHash");

-- CreateIndex
CREATE INDEX "RagIngestionRun_knowledgeBaseId_startedAt_idx" ON "RagIngestionRun"("knowledgeBaseId", "startedAt");

-- CreateIndex
CREATE INDEX "RagIngestionRun_status_startedAt_idx" ON "RagIngestionRun"("status", "startedAt");

-- AddForeignKey
ALTER TABLE "RagKnowledgeBase" ADD CONSTRAINT "RagKnowledgeBase_ownerUserId_fkey"
FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RagKnowledgeBase" ADD CONSTRAINT "RagKnowledgeBase_institutionId_fkey"
FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RagDocument" ADD CONSTRAINT "RagDocument_knowledgeBaseId_fkey"
FOREIGN KEY ("knowledgeBaseId") REFERENCES "RagKnowledgeBase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RagDocument" ADD CONSTRAINT "RagDocument_ownerUserId_fkey"
FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RagDocument" ADD CONSTRAINT "RagDocument_institutionId_fkey"
FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RagChunk" ADD CONSTRAINT "RagChunk_knowledgeBaseId_fkey"
FOREIGN KEY ("knowledgeBaseId") REFERENCES "RagKnowledgeBase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RagChunk" ADD CONSTRAINT "RagChunk_documentId_fkey"
FOREIGN KEY ("documentId") REFERENCES "RagDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RagChunk" ADD CONSTRAINT "RagChunk_ownerUserId_fkey"
FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RagChunk" ADD CONSTRAINT "RagChunk_institutionId_fkey"
FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RagIngestionRun" ADD CONSTRAINT "RagIngestionRun_knowledgeBaseId_fkey"
FOREIGN KEY ("knowledgeBaseId") REFERENCES "RagKnowledgeBase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
