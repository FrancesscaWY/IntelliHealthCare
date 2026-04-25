import { ApiClientError, request } from "@/shared/api/client";

export type FileCategory = "REPORT" | "AVATAR" | "POST_IMAGE" | "CHAT_IMAGE";

export interface FilePresignRequest {
  category: FileCategory;
  fileName: string;
  mimeType: string;
  size: number;
}

export interface FilePresignResponse {
  uploadId: string;
  bucket: string;
  objectKey: string;
  method: string;
  uploadUrl: string;
  headers: Record<string, string>;
  expiresInSeconds: number;
  uploaderId: string;
}

export interface CompleteFileUploadRequest {
  category: FileCategory;
  fileName: string;
  objectKey: string;
  mimeType: string;
  size: number;
  metadata?: Record<string, unknown>;
}

export interface FileInfoResponse {
  fileId: string;
  category: string;
  fileName: string;
  objectKey: string;
  mimeType: string;
  size: number;
  bucket?: string;
  url: string;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

export function createFilePresign(payload: FilePresignRequest) {
  return request<FilePresignResponse>("/app/files/presign", {
    method: "POST",
    auth: true,
    body: payload
  });
}

export function completeFileUpload(payload: CompleteFileUploadRequest) {
  return request<FileInfoResponse>("/app/files/complete", {
    method: "POST",
    auth: true,
    body: payload
  });
}

export function getFileInfo(fileId: string) {
  return request<FileInfoResponse>(`/app/files/${fileId}`, {
    auth: true
  });
}

export async function uploadFileByPresign(presign: FilePresignResponse, file: File) {
  const response = await fetch(presign.uploadUrl, {
    method: presign.method || "PUT",
    headers: presign.headers,
    body: file
  });

  if (!response.ok) {
    throw new ApiClientError(`文件上传失败 (${response.status})`, {
      status: response.status
    });
  }
}

export async function uploadAppFile(
  category: FileCategory,
  file: File,
  metadata?: Record<string, unknown>
) {
  const mimeType = file.type || "application/octet-stream";
  const presign = await createFilePresign({
    category,
    fileName: file.name,
    mimeType,
    size: file.size
  });

  await uploadFileByPresign(presign, file);

  return completeFileUpload({
    category,
    fileName: file.name,
    objectKey: presign.objectKey,
    mimeType,
    size: file.size,
    metadata
  });
}
