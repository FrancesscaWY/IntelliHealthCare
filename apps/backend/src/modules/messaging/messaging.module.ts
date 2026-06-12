import { Module } from "@nestjs/common";
import { AdminMessagingController, AppMessagingController } from "./messaging.controller";
import { AppMessagingService } from "./messaging.service";

@Module({
  controllers: [AppMessagingController, AdminMessagingController],
  providers: [AppMessagingService]
})
export class MessagingModule {}
