import { Injectable } from "@nestjs/common";
import { MetricType } from "@prisma/client";
import { PrismaService } from "../../../infra/prisma/prisma.service";
import type { MetricRecordContext } from "../domain/agent-types";

@Injectable()
export class HealthMetricsTool {
  constructor(private readonly prismaService: PrismaService) {}

  async getLatestMetrics(
    userId: string,
    metricTypes?: MetricType[]
  ): Promise<MetricRecordContext[]> {
    const metrics = await this.prismaService.healthMetricRecord.findMany({
      where: {
        userId,
        ...(metricTypes?.length
          ? {
              metricType: {
                in: metricTypes
              }
            }
          : {})
      },
      orderBy: {
        measuredAt: "desc"
      },
      take: 50
    });

    const latest = new Map<MetricType, MetricRecordContext>();

    for (const record of metrics) {
      if (latest.has(record.metricType)) {
        continue;
      }

      latest.set(record.metricType, {
        id: record.id,
        metricType: record.metricType,
        value: record.value ? Number(record.value) : null,
        unit: record.unit,
        abnormal: record.abnormal,
        measuredAt: record.measuredAt.toISOString(),
        payload:
          record.payload && typeof record.payload === "object" && !Array.isArray(record.payload)
            ? (record.payload as Record<string, unknown>)
            : null
      });
    }

    return Array.from(latest.values());
  }
}
