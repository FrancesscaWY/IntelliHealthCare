import { Module } from "@nestjs/common";
import { AppMessagingController } from "./messaging.controller";
import { AppMessagingService } from "./messaging.service";

@Module({
  controllers: [AppMessagingController],
  providers: [AppMessagingService]
})
export class MessagingModule {}
