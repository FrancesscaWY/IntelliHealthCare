import { Module } from "@nestjs/common";
import { AdminAnalyticsController } from "./admin-analytics.controller";
import { AdminCatalogStaffController } from "./admin-catalog.controller";
import { AdminEldersController } from "./admin.controller";
import { AdminSystemController } from "./admin-system.controller";
import { AdminService } from "./admin.service";

@Module({
  controllers: [
    AdminAnalyticsController,
    AdminCatalogStaffController,
    AdminEldersController,
    AdminSystemController
  ],
  providers: [AdminService]
})
export class AdminModule {}
