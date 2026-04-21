import {
  ForbiddenException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import {
  OrderStatus,
  PaymentChannel,
  PaymentStatus,
  UserType
} from "@prisma/client";
import type { AuthenticatedUser } from "../../common/auth/auth.types";
import { toDateTimeString, toNumber } from "../../common/utils/serializers";
import { PrismaService } from "../../infra/prisma/prisma.service";

@Injectable()
export class PaymentsService {
  constructor(private readonly prismaService: PrismaService) {}

  getChannels() {
    return [
      {
        channel: PaymentChannel.WECHAT,
        title: "微信支付",
        enabled: true
      },
      {
        channel: PaymentChannel.ALIPAY,
        title: "支付宝",
        enabled: true
      },
      {
        channel: PaymentChannel.BALANCE,
        title: "余额支付",
        enabled: true
      }
    ];
  }

  async createPayment(
    currentUser: AuthenticatedUser,
    payload: {
      orderId: string;
      channel: PaymentChannel;
    }
  ) {
    const order = await this.getAccessibleOrder(currentUser, payload.orderId);
    const payment = await this.prismaService.paymentOrder.create({
      data: {
        paymentNo: this.generatePaymentNo(),
        orderId: order.id,
        payerId: currentUser.id,
        channel: payload.channel,
        status: PaymentStatus.PENDING,
        amount: toNumber(order.payableAmount) ?? 0
      }
    });

    return {
      paymentId: payment.id,
      paymentNo: payment.paymentNo,
      status: payment.status,
      amount: toNumber(payment.amount),
      channel: payment.channel
    };
  }

  async getPayment(currentUser: AuthenticatedUser, paymentId: string) {
    const payment = await this.getAccessiblePayment(currentUser, paymentId);
    return {
      paymentId: payment.id,
      paymentNo: payment.paymentNo,
      orderId: payment.orderId,
      status: payment.status,
      channel: payment.channel,
      amount: toNumber(payment.amount),
      paidAt: toDateTimeString(payment.paidAt),
      createdAt: toDateTimeString(payment.createdAt)
    };
  }

  async confirmPayment(currentUser: AuthenticatedUser, paymentId: string) {
    const payment = await this.getAccessiblePayment(currentUser, paymentId);

    if (payment.status === PaymentStatus.PAID) {
      return this.getPayment(currentUser, paymentId);
    }

    await this.prismaService.$transaction(async (tx) => {
      await tx.paymentOrder.update({
        where: { id: paymentId },
        data: {
          status: PaymentStatus.PAID,
          paidAt: new Date(),
          transactionNo: `TXN-${Date.now()}`
        }
      });

      await tx.order.update({
        where: { id: payment.orderId },
        data: {
          status: OrderStatus.PENDING_CONFIRMATION,
          actualAmount: payment.amount,
          paidAt: new Date()
        }
      });

      await tx.orderTimeline.create({
        data: {
          orderId: payment.orderId,
          status: OrderStatus.PENDING_CONFIRMATION,
          title: "支付成功",
          description: `${payment.channel} 已支付`,
          operatorName: currentUser.realName ?? currentUser.phone
        }
      });
    });

    return this.getPayment(currentUser, paymentId);
  }

  private async getAccessibleOrder(currentUser: AuthenticatedUser, orderId: string) {
    const order = await this.prismaService.order.findUnique({
      where: { id: orderId }
    });

    if (!order) {
      throw new NotFoundException("Order not found");
    }

    const allowed =
      ([UserType.ADMIN, UserType.ORG_MANAGER, UserType.STAFF] as UserType[]).includes(
        currentUser.type
      ) ||
      order.ownerId === currentUser.id;

    if (!allowed) {
      throw new ForbiddenException("No permission to create payment for this order");
    }

    return order;
  }

  private async getAccessiblePayment(currentUser: AuthenticatedUser, paymentId: string) {
    const payment = await this.prismaService.paymentOrder.findUnique({
      where: { id: paymentId }
    });

    if (!payment) {
      throw new NotFoundException("Payment not found");
    }

    const allowed =
      ([UserType.ADMIN, UserType.ORG_MANAGER, UserType.STAFF] as UserType[]).includes(
        currentUser.type
      ) ||
      payment.payerId === currentUser.id;

    if (!allowed) {
      throw new ForbiddenException("No permission to access payment");
    }

    return payment;
  }

  private generatePaymentNo() {
    return `PAY${Date.now().toString().slice(-10)}`;
  }
}
