import { Module } from "@nestjs/common";
import { AppHealthArchiveController } from "./health-archive.controller";
import { HealthArchiveService } from "./health-archive.service";

@Module({
  controllers: [AppHealthArchiveController],
  providers: [HealthArchiveService],
  exports: [HealthArchiveService]
})
export class HealthArchiveModule {}
