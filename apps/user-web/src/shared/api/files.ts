import { request } from "@/shared/api/client";

export type UserFileCategory =
  | "REPORT"
  | "AVATAR"
  | "POST_IMAGE"
  | "CHAT_IMAGE"
  | "CHAT_AUDIO"
  | "CONTENT_COVER"
  | "ACTIVITY_BANNER";

interface PresignedUploadResponse {
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

  const headers = new Headers(presign.headers);
  if (!headers.has("content-type")) {
    headers.set("content-type", input.file.type || "application/octet-stream");
  }

  const uploadResponse = await fetch(presign.uploadUrl, {
    method: presign.method,
    headers,
    body: input.file
  });

  if (!uploadResponse.ok) {
    throw new Error(`文件上传失败 (${uploadResponse.status})`);
  }

  return completeUserFileUpload({
    category: input.category,
    fileName: input.file.name,
    objectKey: presign.objectKey,
    mimeType: input.file.type || "application/octet-stream",
    size: input.file.size,
    metadata: input.metadata
  });
}
