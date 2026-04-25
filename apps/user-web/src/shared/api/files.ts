import { request } from "@/shared/api/client";

export type UserFileCategory =
  | "REPORT"
  | "AVATAR"
  | "POST_IMAGE"
  | "CHAT_IMAGE"
  | "CHAT_AUDIO"
  | "CONTENT_COVER"
  | "ACTIVITY_BANNER";

export interface PresignedUploadResponse {
  uploadId: string;
  bucket: string;
  objectKey: string;
  method: "PUT";
  uploadUrl: string;
  headers: Record<string, string>;
  expiresInSeconds: number;
  uploaderId: string;
}

export interface UploadedFileAsset {
  fileId: string;
  category: UserFileCategory;
  fileName: string;
  objectKey: string;
  mimeType: string;
  size: number;
  url: string;
  createdAt: string;
}

export interface FileAssetInfo extends UploadedFileAsset {
  bucket: string;
  metadata: unknown;
}

export function createUserFilePresign(payload: {
  category: UserFileCategory;
  fileName: string;
  mimeType: string;
  size: number;
}) {
  return request<PresignedUploadResponse>("/app/files/presign", {
    method: "POST",
    auth: true,
    body: payload
  });
}

export const createFilePresign = createUserFilePresign;

export function completeUserFileUpload(payload: {
  category: UserFileCategory;
  fileName: string;
  objectKey: string;
  mimeType: string;
  size: number;
  metadata?: Record<string, unknown>;
}) {
  return request<UploadedFileAsset>("/app/files/complete", {
    method: "POST",
    auth: true,
    body: payload
  });
}

export const completeFileUpload = completeUserFileUpload;

export function getFileInfo(fileId: string) {
  return request<FileAssetInfo>(`/app/files/${fileId}`, {
    auth: true
  });
}

export async function uploadFileByPresign(presign: PresignedUploadResponse, file: File) {
  const headers = new Headers(presign.headers);
  if (!headers.has("content-type")) {
    headers.set("content-type", file.type || "application/octet-stream");
  }

  const uploadResponse = await fetch(presign.uploadUrl, {
    method: presign.method,
    headers,
    body: file
  });

  if (!uploadResponse.ok) {
    throw new Error(`文件上传失败 (${uploadResponse.status})`);
  }
}

export async function uploadUserFile(input: {
  category: UserFileCategory;
  file: File;
  metadata?: Record<string, unknown>;
}) {
  const presign = await createUserFilePresign({
    category: input.category,
    fileName: input.file.name,
    mimeType: input.file.type || "application/octet-stream",
    size: input.file.size
  });

  await uploadFileByPresign(presign, input.file);

  return completeUserFileUpload({
    category: input.category,
    fileName: input.file.name,
    objectKey: presign.objectKey,
    mimeType: input.file.type || "application/octet-stream",
    size: input.file.size,
    metadata: input.metadata
  });
}

export function uploadAppFile(
  category: UserFileCategory,
  file: File,
  metadata?: Record<string, unknown>
) {
  return uploadUserFile({ category, file, metadata });
}
