import {
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
    const bucket = this.storageService.getBucketName();
    const objectKey = this.buildObjectKey(payload.category, payload.fileName);

    return {
      uploadId: `upl_${randomUUID().slice(0, 8)}`,
      bucket,
      objectKey,
      method: "PUT",
      uploadUrl: `/minio/${bucket}/${objectKey}`,
      headers: {
        "content-type": payload.mimeType,
        "x-upload-user": userId
      },
      expiresInSeconds: 900
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
    const bucket = this.storageService.getBucketName();
    const url = `/storage/${bucket}/${payload.objectKey}`;

    const file = await this.prismaService.fileAsset.create({
      data: {
        uploaderId: userId,
        category: payload.category,
        fileName: payload.fileName,
        objectKey: payload.objectKey,
        mimeType: payload.mimeType,
        size: payload.size,
        bucket,
        url,
        metadata: toPrismaJson(payload.metadata ?? {})
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

  private buildObjectKey(category: FileCategory, fileName: string) {
    const ext = fileName.includes(".") ? fileName.split(".").pop() : "bin";
    const day = new Date().toISOString().slice(0, 10);
    return `app/${category.toLowerCase()}/${day}/${randomUUID()}.${ext}`;
  }
}
