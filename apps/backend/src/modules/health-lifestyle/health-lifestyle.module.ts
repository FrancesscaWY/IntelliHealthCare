import { Module } from "@nestjs/common";
import { AppHealthLifestyleController } from "./health-lifestyle.controller";
import { AppHealthLifestyleService } from "./health-lifestyle.service";

@Module({
  controllers: [AppHealthLifestyleController],
  providers: [AppHealthLifestyleService]
})
export class HealthLifestyleModule {}
