import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { IsEnum, IsString } from "class-validator";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiProperty,
  ApiTags
} from "@nestjs/swagger";
import { PaymentChannel } from "@prisma/client";
import { CurrentUser } from "../../common/auth/current-user.decorator";
import { JwtAuthGuard } from "../../common/auth/jwt-auth.guard";
import type { AuthenticatedUser } from "../../common/auth/auth.types";
import { SwaggerTags } from "../../common/http/swagger-tags";
import { PaymentsService } from "./payments.service";

class CreatePaymentDto {
  @ApiProperty({
    description: "订单 ID。请先通过创建订单接口或订单列表接口获取。",
    example: "order_rehab_assess"
  })
  @IsString()
  orderId!: string;

  @ApiProperty({
    description: "支付渠道。",
    enum: PaymentChannel,
    example: PaymentChannel.WECHAT
  })
  @IsEnum(PaymentChannel)
  channel!: PaymentChannel;
}

@Controller("app/payments")
@UseGuards(JwtAuthGuard)
@ApiTags(SwaggerTags.AppPayments)
@ApiBearerAuth()
export class AppPaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get("channels")
  @ApiOperation({
    summary: "获取支付渠道",
    description: "支付页打开后先调用，用于渲染可选支付方式。"
  })
  getChannels() {
    return this.paymentsService.getChannels();
  }

  @Post()
  @ApiOperation({
    summary: "创建支付单",
    description: "支付页点击立即支付时调用。成功后重点查看 data.paymentId，用于后续确认支付和结果页查询。"
  })
  createPayment(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreatePaymentDto
  ) {
    return this.paymentsService.createPayment(user, body);
  }

  @Get(":paymentId")
  @ApiOperation({
    summary: "获取支付单详情",
    description: "支付结果页或轮询状态时调用。paymentId 来自创建支付单接口返回。"
  })
  getPayment(
    @CurrentUser() user: AuthenticatedUser,
    @Param("paymentId") paymentId: string
  ) {
    return this.paymentsService.getPayment(user, paymentId);
  }

  @Post(":paymentId/confirm")
  @ApiOperation({
    summary: "确认支付",
    description: "模拟支付完成后的确认动作。联调时通常在创建支付单后直接执行。"
  })
  confirmPayment(
    @CurrentUser() user: AuthenticatedUser,
    @Param("paymentId") paymentId: string
  ) {
    return this.paymentsService.confirmPayment(user, paymentId);
  }
}
