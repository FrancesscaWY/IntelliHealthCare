import assert from "node:assert/strict";
import test from "node:test";
import { BadRequestException, ConflictException } from "@nestjs/common";
import { FileCategory } from "@prisma/client";
import { AppFilesService } from "../../src/modules/files/files.service";

function createFilesService() {
  const prismaService = {
    fileAsset: {
      create: async ({ data }: { data: Record<string, unknown> }) => ({
        id: "file_001",
        createdAt: new Date("2026-04-22T10:00:00Z"),
        ...data
      }),
      findUnique: async () => null
    }
  };

  const storageService = {
    getBucketName: () => "ihc-files",
    createPresignedUpload: async (objectKey: string) => ({
      bucket: "ihc-files",
      uploadUrl: `http://localhost:9000/ihc-files/${objectKey}`,
      expiresInSeconds: 900
    }),
    assertObjectExists: async () => ({
      size: 12,
      etag: "etag-001"
    }),
    getObjectUrl: (objectKey: string) => `http://localhost:9000/ihc-files/${objectKey}`
  };

  return new AppFilesService(prismaService as never, storageService as never);
}

test("createPresign returns a real upload URL contract", async () => {
  const service = createFilesService();

  const result = await service.createPresign("user_001", {
    category: FileCategory.REPORT,
    fileName: "report.pdf",
    mimeType: "application/pdf",
    size: 12
  });

  assert.equal(result.bucket, "ihc-files");
  assert.equal(result.method, "PUT");
  assert.match(result.uploadUrl, /^http:\/\/localhost:9000\/ihc-files\/app\/report\//);
  assert.equal(result.headers["content-type"], "application/pdf");
});

test("completeUpload rejects object keys outside the category prefix", async () => {
  const service = createFilesService();

  await assert.rejects(
    () =>
      service.completeUpload("user_001", {
        category: FileCategory.REPORT,
        fileName: "report.pdf",
        objectKey: "app/avatar/2026-04-22/file.pdf",
        mimeType: "application/pdf",
        size: 12
      }),
    BadRequestException
  );
});

test("completeUpload rejects size mismatches against storage", async () => {
  const service = createFilesService();

  await assert.rejects(
    () =>
      service.completeUpload("user_001", {
        category: FileCategory.REPORT,
        fileName: "report.pdf",
        objectKey: "app/report/2026-04-22/file.pdf",
        mimeType: "application/pdf",
        size: 10
      }),
    ConflictException
  );
});
