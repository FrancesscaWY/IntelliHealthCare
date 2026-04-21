import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { IsEnum, IsString } from "class-validator";
import { PaymentChannel } from "@prisma/client";
import { CurrentUser } from "../../common/auth/current-user.decorator";
import { JwtAuthGuard } from "../../common/auth/jwt-auth.guard";
import type { AuthenticatedUser } from "../../common/auth/auth.types";
import { PaymentsService } from "./payments.service";

class CreatePaymentDto {
  @IsString()
  orderId!: string;

  @IsEnum(PaymentChannel)
  channel!: PaymentChannel;
}

@Controller("app/payments")
@UseGuards(JwtAuthGuard)
export class AppPaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get("channels")
  getChannels() {
    return this.paymentsService.getChannels();
  }

  @Post()
  createPayment(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreatePaymentDto
  ) {
    return this.paymentsService.createPayment(user, body);
  }

  @Get(":paymentId")
  getPayment(
    @CurrentUser() user: AuthenticatedUser,
    @Param("paymentId") paymentId: string
  ) {
    return this.paymentsService.getPayment(user, paymentId);
  }

  @Post(":paymentId/confirm")
  confirmPayment(
    @CurrentUser() user: AuthenticatedUser,
    @Param("paymentId") paymentId: string
  ) {
    return this.paymentsService.confirmPayment(user, paymentId);
  }
}
