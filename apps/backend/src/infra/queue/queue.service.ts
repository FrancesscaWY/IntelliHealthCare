import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import IORedis from "ioredis";
import type { EnvironmentVariables } from "../../common/config/env.schema";

@Injectable()
export class QueueService implements OnModuleDestroy {
  private readonly redis: IORedis;

  constructor(
    private readonly configService: ConfigService<EnvironmentVariables, true>
  ) {
    this.redis = new IORedis(
      this.configService.get("REDIS_URL", { infer: true }),
      {
        lazyConnect: true,
        maxRetriesPerRequest: null
      }
    );
  }

  async ping() {
    if (this.redis.status === "wait") {
      await this.redis.connect();
    }

    return (await this.redis.ping()) === "PONG";
  }

  getConnection() {
    return this.redis;
  }

  async onModuleDestroy() {
    if (this.redis.status !== "end") {
      await this.redis.quit();
    }
  }
}
