import { Module } from "@nestjs/common";
import { AppPaymentsController } from "./payments.controller";
import { PaymentsService } from "./payments.service";

@Module({
  controllers: [AppPaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService]
})
export class PaymentsModule {}
