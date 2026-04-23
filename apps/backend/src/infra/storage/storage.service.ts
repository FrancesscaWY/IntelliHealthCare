import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Client } from "minio";
import type { EnvironmentVariables } from "../../common/config/env.schema";

@Injectable()
export class StorageService {
  private readonly client: Client;
  private readonly presignClient: Client;
  private bucketReadyPromise: Promise<string> | null = null;

  constructor(
    private readonly configService: ConfigService<EnvironmentVariables, true>
  ) {
    this.client = this.createClient({
      endPoint: this.configService.get("MINIO_ENDPOINT", { infer: true }),
      port: this.configService.get("MINIO_PORT", { infer: true }),
      useSSL: this.configService.get("MINIO_USE_SSL", { infer: true })
    });
    this.presignClient = this.createClient({
      endPoint:
        this.configService.get("MINIO_PUBLIC_ENDPOINT", { infer: true }) ||
        this.configService.get("MINIO_ENDPOINT", { infer: true }),
      port:
        this.configService.get("MINIO_PUBLIC_PORT", { infer: true }) ??
        this.configService.get("MINIO_PORT", { infer: true }),
      useSSL:
        this.configService.get("MINIO_PUBLIC_USE_SSL", { infer: true }) ??
        this.configService.get("MINIO_USE_SSL", { infer: true })
    });
  }

  getClient() {
    return this.client;
  }

  getBucketName() {
    return this.configService.get("MINIO_BUCKET", { infer: true });
  }

  async ensureBucketExists() {
    if (!this.bucketReadyPromise) {
      this.bucketReadyPromise = this.ensureBucketExistsInternal().catch((error) => {
        this.bucketReadyPromise = null;
        throw error;
      });
    }

    return this.bucketReadyPromise;
  }

  async createPresignedUpload(objectKey: string, expiresInSeconds = 900) {
    const bucket = await this.ensureBucketExists();
    const uploadUrl = await this.presignClient.presignedPutObject(
      bucket,
      objectKey,
      expiresInSeconds
    );

    return {
      bucket,
      uploadUrl,
      expiresInSeconds
    };
  }

  async assertObjectExists(objectKey: string) {
    const bucket = await this.ensureBucketExists();
    return this.client.statObject(bucket, objectKey);
  }

  async ping() {
    const bucket = await this.ensureBucketExists();

    return {
      bucket,
      status: "up" as const
    };
  }

  getObjectUrl(objectKey: string) {
    const protocol = this.getPresignUseSsl() ? "https" : "http";
    const endpoint =
      this.configService.get("MINIO_PUBLIC_ENDPOINT", { infer: true }) ||
      this.configService.get("MINIO_ENDPOINT", { infer: true });
    const port = this.getPresignPort();

    return `${protocol}://${endpoint}${this.getPortSuffix(port, protocol)}/${this.getBucketName()}/${encodeObjectKey(objectKey)}`;
  }

  private createClient(connection: {
    endPoint: string;
    port: number;
    useSSL: boolean;
  }) {
    return new Client({
      ...connection,
      accessKey: this.configService.get("MINIO_ACCESS_KEY", { infer: true }),
      secretKey: this.configService.get("MINIO_SECRET_KEY", { infer: true })
    });
  }

  private async ensureBucketExistsInternal() {
    const bucket = this.getBucketName();
    const exists = await this.client.bucketExists(bucket);

    if (!exists) {
      await this.client.makeBucket(
        bucket,
        this.configService.get("MINIO_REGION", { infer: true })
      );
    }

    return bucket;
  }

  private getPresignUseSsl() {
    return (
      this.configService.get("MINIO_PUBLIC_USE_SSL", { infer: true }) ??
      this.configService.get("MINIO_USE_SSL", { infer: true })
    );
  }

  private getPresignPort() {
    const port =
      this.configService.get("MINIO_PUBLIC_PORT", { infer: true }) ??
      this.configService.get("MINIO_PORT", { infer: true });

    if (typeof port === "number") {
      return port;
    }

    return this.getPresignUseSsl() ? 443 : 80;
  }

  private getPortSuffix(port: number, protocol: "http" | "https") {
    if ((protocol === "http" && port === 80) || (protocol === "https" && port === 443)) {
      return "";
    }

    return `:${port}`;
  }
}

function encodeObjectKey(objectKey: string) {
  return objectKey
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}
