import { Module } from "@nestjs/common";
import { AppCommunityController } from "./community.controller";
import { AppCommunityService } from "./community.service";

@Module({
  controllers: [AppCommunityController],
  providers: [AppCommunityService]
})
export class CommunityModule {}
