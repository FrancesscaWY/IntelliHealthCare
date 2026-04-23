import { Module } from "@nestjs/common";
import { AdminOrdersController, AppOrdersController } from "./orders.controller";
import { OrdersService } from "./orders.service";

@Module({
  controllers: [AppOrdersController, AdminOrdersController],
  providers: [OrdersService],
  exports: [OrdersService]
})
export class OrdersModule {}
