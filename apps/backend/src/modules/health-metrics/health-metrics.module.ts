import { Module } from "@nestjs/common";
import { AppHealthMetricsController } from "./health-metrics.controller";
import { HealthMetricsService } from "./health-metrics.service";

@Module({
  controllers: [AppHealthMetricsController],
  providers: [HealthMetricsService],
  exports: [HealthMetricsService]
})
export class HealthMetricsModule {}
