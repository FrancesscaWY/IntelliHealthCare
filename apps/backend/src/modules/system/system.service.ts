import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { EnvironmentVariables } from "../../common/config/env.schema";
import { PrismaService } from "../../infra/prisma/prisma.service";
import { QueueService } from "../../infra/queue/queue.service";
import { StorageService } from "../../infra/storage/storage.service";
import {
  BACKEND_BOUNDED_CONTEXTS,
  BACKEND_STACK
} from "./backend-blueprint";

@Injectable()
export class SystemService {
  constructor(
    private readonly configService: ConfigService<EnvironmentVariables, true>,
    private readonly prismaService: PrismaService,
    private readonly queueService: QueueService,
    private readonly storageService: StorageService
  ) {}

  async getHealth() {
    const [database, redis] = await Promise.allSettled([
      this.prismaService.ping(),
      this.queueService.ping()
    ]);

    const checks = [
      {
        name: "postgresql",
        status:
          database.status === "fulfilled" && database.value ? "up" : "down"
      },
      {
        name: "redis",
        status: redis.status === "fulfilled" && redis.value ? "up" : "down"
      },
      {
        name: "object-storage",
        status: "configured",
        bucket: this.storageService.getBucketName()
      }
    ];

    return {
      service: this.configService.get("APP_NAME", { infer: true }),
      env: this.configService.get("NODE_ENV", { infer: true }),
      status: checks.every((item) => item.status === "up" || item.status === "configured")
        ? "ok"
        : "degraded",
      timestamp: new Date().toISOString(),
      checks
    };
  }

  getArchitecture() {
    return {
      pattern: "modular-monolith",
      summary:
        "先以模块化单体承接老人端、家属端、后台端和 Agent 协同层，稳定业务边界后再拆分高吞吐或高耦合域。",
      stack: BACKEND_STACK,
      boundedContexts: BACKEND_BOUNDED_CONTEXTS,
      defaultApiPrefix: this.configService.get("API_PREFIX", { infer: true })
    };
  }
}
