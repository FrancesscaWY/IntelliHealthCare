import "reflect-metadata";
import assert from "node:assert/strict";
import test from "node:test";
import { ConfigService } from "@nestjs/config";
import { JwtModule, JwtService } from "@nestjs/jwt";
import { Test } from "@nestjs/testing";
import { FileCategory, UserType } from "@prisma/client";
import { JwtAuthGuard } from "../../src/common/auth/jwt-auth.guard";
import { AppFilesController } from "../../src/modules/files/files.controller";
import { AppFilesService } from "../../src/modules/files/files.service";
import { PrismaService } from "../../src/infra/prisma/prisma.service";
import { StorageService } from "../../src/infra/storage/storage.service";
import { requestJson, startTestApp, stopTestApp } from "../support/test-app";

test("files integration covers presign, complete and detail lookup", async () => {
  const storedFiles = new Map<string, Record<string, unknown>>();
  const prismaService = {
    fileAsset: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const record = {
          id: "file_001",
          createdAt: new Date("2026-04-22T10:00:00Z"),
          ...data
        };

        storedFiles.set(String(record.id), record);
        return record;
      },
      findUnique: async ({ where }: { where: { id: string } }) =>
        storedFiles.get(where.id) ?? null
    }
  };

  const storageService = {
    getBucketName: () => "ihc-files",
    createPresignedUpload: async (objectKey: string) => ({
      bucket: "ihc-files",
      uploadUrl: `http://localhost:9000/ihc-files/${objectKey}?X-Amz-Signature=test`,
      expiresInSeconds: 900
    }),
    assertObjectExists: async () => ({
      size: 12,
      etag: "etag-001"
    }),
    getObjectUrl: (objectKey: string) =>
      `http://localhost:9000/ihc-files/${objectKey}`
  };

  const configService = {
    get: (key: string) => {
      const values: Record<string, string> = {
        JWT_ACCESS_SECRET: "test-access-secret-1234567890"
      };

      return values[key];
    }
  };

  const moduleRef = await Test.createTestingModule({
    imports: [
      JwtModule.register({
        secret: "test-access-secret-1234567890"
      })
    ],
    controllers: [AppFilesController],
    providers: [
      AppFilesService,
      {
        provide: PrismaService,
        useValue: prismaService
      },
      {
        provide: StorageService,
        useValue: storageService
      },
      JwtAuthGuard,
      {
        provide: ConfigService,
        useValue: configService
      }
    ]
  }).compile();

  const { app, baseUrl } = await startTestApp(moduleRef);
  const jwtService = moduleRef.get(JwtService);
  const token = await jwtService.signAsync({
    sub: "user_family_wanglan",
    phone: "13900139000",
    type: UserType.FAMILY,
    roles: ["MEMBER"],
    scope: "app",
    realName: "王兰"
  });

  try {
    const presign = await requestJson<{
      code: number;
      data: {
        objectKey: string;
        uploadUrl: string;
      };
      }>(baseUrl, "/app/files/presign", {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`
      },
      body: {
        category: FileCategory.REPORT,
        fileName: "report.pdf",
        mimeType: "application/pdf",
        size: 12
      }
    });
    assert.equal(presign.status, 201, JSON.stringify(presign.json));
    assert.equal(presign.json.code, 0);
    assert.match(
      presign.json.data.uploadUrl,
      /^http:\/\/localhost:9000\/ihc-files\/app\/report\/.+X-Amz-Signature=test$/
    );

    const complete = await requestJson<{
      code: number;
      data: {
        fileId: string;
        size: number;
      };
      }>(baseUrl, "/app/files/complete", {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`
      },
      body: {
        category: FileCategory.REPORT,
        fileName: "report.pdf",
        objectKey: presign.json.data.objectKey,
        mimeType: "application/pdf",
        size: 12
      }
    });
    assert.equal(complete.status, 201);
    assert.equal(complete.json.data.size, 12);

    const detail = await requestJson<{
      code: number;
      data: {
        fileId: string;
        bucket: string;
      };
    }>(baseUrl, `/app/files/${complete.json.data.fileId}`, {
      headers: {
        authorization: `Bearer ${token}`
      }
    });
    assert.equal(detail.status, 200);
    assert.equal(detail.json.data.fileId, complete.json.data.fileId);
    assert.equal(detail.json.data.bucket, "ihc-files");
  } finally {
    await stopTestApp(app);
  }
});
