import { Module } from "@nestjs/common";
import { AppContentController } from "./content.controller";
import { AppContentService } from "./content.service";

@Module({
  controllers: [AppContentController],
  providers: [AppContentService]
})
export class ContentModule {}
