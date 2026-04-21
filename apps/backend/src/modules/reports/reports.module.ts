import { Module } from "@nestjs/common";
import { AdminReportsController, AppReportsController } from "./reports.controller";
import { ReportsService } from "./reports.service";

@Module({
  controllers: [AppReportsController, AdminReportsController],
  providers: [ReportsService],
  exports: [ReportsService]
})
export class ReportsModule {}
