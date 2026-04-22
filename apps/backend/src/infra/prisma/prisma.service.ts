import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaClient } from "@prisma/client";
import type { EnvironmentVariables } from "../../common/config/env.schema";

@Injectable()
export class PrismaService extends PrismaClient {
  constructor(
    private readonly configService: ConfigService<EnvironmentVariables, true>
  ) {
    super({
      datasources: {
        db: {
          url: configService.get("DATABASE_URL", { infer: true })
        }
      },
      log:
        configService.get("NODE_ENV", { infer: true }) === "development"
          ? ["warn", "error"]
          : ["error"]
    });
  }

  async ping() {
    await this.$queryRaw`SELECT 1`;
    return true;
  }
}
