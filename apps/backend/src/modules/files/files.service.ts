import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { FileCategory } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { toDateTimeString, toPrismaJson } from "../../common/utils/serializers";
import { PrismaService } from "../../infra/prisma/prisma.service";
import { StorageService } from "../../infra/storage/storage.service";

@Injectable()
export class AppFilesService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly storageService: StorageService
  ) {}

  async createPresign(
    userId: string,
    payload: {
      category: FileCategory;
      fileName: string;
      mimeType: string;
      size: number;
    }
  ) {
    const objectKey = this.buildObjectKey("app", payload.category, payload.fileName);
    const upload = await this.storageService.createPresignedUpload(objectKey);

    return {
      uploadId: `upl_${randomUUID().slice(0, 8)}`,
      bucket: upload.bucket,
      objectKey,
      method: "PUT",
      uploadUrl: upload.uploadUrl,
      headers: {
        "content-type": payload.mimeType
      },
      expiresInSeconds: upload.expiresInSeconds,
      uploaderId: userId
    };
  }

  async completeUpload(
    userId: string,
    payload: {
      category: FileCategory;
      fileName: string;
      objectKey: string;
      mimeType: string;
      size: number;
      metadata?: Record<string, unknown>;
    }
  ) {
    this.ensureObjectKeyAllowed("app", payload.category, payload.objectKey);

    const objectStat = await this.storageService.assertObjectExists(payload.objectKey);
    if (objectStat.size !== payload.size) {
      throw new ConflictException("Uploaded object size does not match declared size");
    }

    const bucket = this.storageService.getBucketName();
    const url = this.storageService.getObjectUrl(payload.objectKey);

    const file = await this.prismaService.fileAsset.create({
      data: {
        uploaderId: userId,
        category: payload.category,
        fileName: payload.fileName,
        objectKey: payload.objectKey,
        mimeType: payload.mimeType,
        size: objectStat.size,
        bucket,
        url,
        metadata: toPrismaJson({
          ...(payload.metadata ?? {}),
          etag: objectStat.etag
        })
      }
    });

    return {
      fileId: file.id,
      category: file.category,
      fileName: file.fileName,
      objectKey: file.objectKey,
      mimeType: file.mimeType,
      size: file.size,
      url: file.url,
      createdAt: toDateTimeString(file.createdAt)
    };
  }

  async getFileInfo(userId: string, fileId: string) {
    const file = await this.prismaService.fileAsset.findUnique({
      where: { id: fileId }
    });

    if (!file) {
      throw new NotFoundException("File not found");
    }

    if (file.uploaderId && file.uploaderId !== userId) {
      throw new ForbiddenException("No permission to access this file");
    }

    return {
      fileId: file.id,
      category: file.category,
      fileName: file.fileName,
      objectKey: file.objectKey,
      mimeType: file.mimeType,
      size: file.size,
      bucket: file.bucket,
      url: file.url,
      metadata: file.metadata,
      createdAt: toDateTimeString(file.createdAt)
    };
  }

  async createAdminPresign(
    userId: string,
    payload: {
      category: FileCategory;
      fileName: string;
      mimeType: string;
      size: number;
    }
  ) {
    const objectKey = this.buildObjectKey("admin", payload.category, payload.fileName);
    const upload = await this.storageService.createPresignedUpload(objectKey);

    return {
      uploadId: `upl_${randomUUID().slice(0, 8)}`,
      bucket: upload.bucket,
      objectKey,
      method: "PUT",
      uploadUrl: upload.uploadUrl,
      headers: {
        "content-type": payload.mimeType
      },
      expiresInSeconds: upload.expiresInSeconds,
      uploaderId: userId
    };
  }

  async completeAdminUpload(
    userId: string,
    payload: {
      category: FileCategory;
      fileName: string;
      objectKey: string;
      mimeType: string;
      size: number;
      metadata?: Record<string, unknown>;
    }
  ) {
    this.ensureObjectKeyAllowed("admin", payload.category, payload.objectKey);
    return this.completeUploadInternal(userId, payload);
  }

  async getAdminFileInfo(fileId: string) {
    const file = await this.prismaService.fileAsset.findUnique({
      where: { id: fileId }
    });

    if (!file) {
      throw new NotFoundException("File not found");
    }

    return {
      fileId: file.id,
      category: file.category,
      fileName: file.fileName,
      objectKey: file.objectKey,
      mimeType: file.mimeType,
      size: file.size,
      bucket: file.bucket,
      url: file.url,
      metadata: file.metadata,
      createdAt: toDateTimeString(file.createdAt)
    };
  }

  private async completeUploadInternal(
    userId: string,
    payload: {
      category: FileCategory;
      fileName: string;
      objectKey: string;
      mimeType: string;
      size: number;
      metadata?: Record<string, unknown>;
    }
  ) {
    const objectStat = await this.storageService.assertObjectExists(payload.objectKey);
    if (objectStat.size !== payload.size) {
      throw new ConflictException("Uploaded object size does not match declared size");
    }

    const bucket = this.storageService.getBucketName();
    const url = this.storageService.getObjectUrl(payload.objectKey);

    const file = await this.prismaService.fileAsset.create({
      data: {
        uploaderId: userId,
        category: payload.category,
        fileName: payload.fileName,
        objectKey: payload.objectKey,
        mimeType: payload.mimeType,
        size: objectStat.size,
        bucket,
        url,
        metadata: toPrismaJson({
          ...(payload.metadata ?? {}),
          etag: objectStat.etag
        })
      }
    });

    return {
      fileId: file.id,
      category: file.category,
      fileName: file.fileName,
      objectKey: file.objectKey,
      mimeType: file.mimeType,
      size: file.size,
      url: file.url,
      createdAt: toDateTimeString(file.createdAt)
    };
  }

  private buildObjectKey(scope: "app" | "admin", category: FileCategory, fileName: string) {
    const ext = normalizeFileExtension(fileName);
    const day = new Date().toISOString().slice(0, 10);
    return `${scope}/${category.toLowerCase()}/${day}/${randomUUID()}.${ext}`;
  }

  private ensureObjectKeyAllowed(
    scope: "app" | "admin",
    category: FileCategory,
    objectKey: string
  ) {
    const prefix = `${scope}/${category.toLowerCase()}/`;

    if (!objectKey.startsWith(prefix)) {
      throw new BadRequestException("Object key does not match file category");
    }
  }
}

function normalizeFileExtension(fileName: string) {
  const ext = fileName.includes(".") ? fileName.split(".").pop() ?? "bin" : "bin";
  const normalized = ext.toLowerCase().replace(/[^a-z0-9]+/g, "");

  return normalized || "bin";
}
