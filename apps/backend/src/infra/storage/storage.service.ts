import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Client } from "minio";
import type { EnvironmentVariables } from "../../common/config/env.schema";

@Injectable()
export class StorageService {
  private readonly client: Client;

  constructor(
    private readonly configService: ConfigService<EnvironmentVariables, true>
  ) {
    this.client = new Client({
      endPoint: this.configService.get("MINIO_ENDPOINT", { infer: true }),
      port: this.configService.get("MINIO_PORT", { infer: true }),
      useSSL: this.configService.get("MINIO_USE_SSL", { infer: true }),
      accessKey: this.configService.get("MINIO_ACCESS_KEY", { infer: true }),
      secretKey: this.configService.get("MINIO_SECRET_KEY", { infer: true })
    });
  }

  getClient() {
    return this.client;
  }

  getBucketName() {
    return this.configService.get("MINIO_BUCKET", { infer: true });
  }
}
