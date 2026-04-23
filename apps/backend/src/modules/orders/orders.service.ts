import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import {
  AfterSaleType,
  OrderStatus,
  Prisma,
  UserType,
  WorkOrderStatus
} from "@prisma/client";
import type { AuthenticatedUser } from "../../common/auth/auth.types";
import { paginate, toDateString, toDateTimeString, toNumber } from "../../common/utils/serializers";
import { PrismaService } from "../../infra/prisma/prisma.service";

@Injectable()
export class OrdersService {
  constructor(private readonly prismaService: PrismaService) {}

  async getBookingOptions(currentUser: AuthenticatedUser, serviceId?: string) {
    const [elders, addresses] = await Promise.all([
      this.getAccessibleElders(currentUser),
      this.getAccessibleAddresses(currentUser)
    ]);

    const availableDates = Array.from({ length: 7 }, (_, index) => {
      const date = new Date();
      date.setUTCDate(date.getUTCDate() + index + 1);
      return {
        date: toDateString(date),
        timeSlots: ["09:00-11:00", "13:00-15:00", "15:30-17:30", "18:00-20:00"]
      };
    });

    let service = null;
    if (serviceId) {
      const matched = await this.prismaService.serviceItem.findUnique({
        where: { id: serviceId }
      });

      service = matched
        ? {
            serviceId: matched.id,
            title: matched.title,
            price: toNumber(matched.price)
          }
        : null;
    }

    return {
      service,
      elders,
      addresses,
      availableDates
    };
  }

  async previewOrder(
    currentUser: AuthenticatedUser,
    payload: {
      serviceId: string;
      addressId: string;
      elderId?: string;
      bookingDate?: string;
      bookingTimeSlot?: string;
      couponId?: string;
      remark?: string;
    }
  ) {
    const ownerUserId = currentUser.id;
    const elderUserId = await this.resolveOrderElder(currentUser, payload.elderId);
    const [service, address, coupon, archive] = await Promise.all([
      this.prismaService.serviceItem.findUnique({
        where: { id: payload.serviceId }
      }),
      this.prismaService.address.findUnique({
        where: { id: payload.addressId }
      }),
      payload.couponId
        ? this.prismaService.userCoupon.findUnique({
            where: { id: payload.couponId },
            include: {
              couponTemplate: true
            }
          })
        : Promise.resolve(null),
      this.prismaService.healthArchive.findUnique({
        where: { userId: elderUserId }
      })
    ]);

    if (!service) {
      throw new NotFoundException("Service not found");
    }

    if (!address) {
      throw new NotFoundException("Address not found");
    }

    if (address.ownerId !== ownerUserId && address.elderId !== elderUserId) {
      throw new ForbiddenException("Address is not accessible");
    }

    const originalAmount = toNumber(service.price) ?? 0;
    const discountAmount = coupon
      ? this.resolveCouponDiscount(originalAmount, coupon.couponTemplate)
      : 0;
    const payableAmount = Math.max(0, originalAmount - discountAmount);

    return {
      service: {
        serviceId: service.id,
        title: service.title,
        category: service.category,
        price: originalAmount,
        coverUrl: service.coverUrl
      },
      elderId: elderUserId,
      address: this.toAddressCard(address),
      bookingDate: payload.bookingDate ?? null,
      bookingTimeSlot: payload.bookingTimeSlot ?? null,
      remark: payload.remark ?? null,
      coupon: coupon
        ? {
            couponId: coupon.id,
            title: coupon.couponTemplate.title,
            discountAmount
          }
        : null,
      price: {
        originalAmount,
        discountAmount,
        payableAmount
      },
      healthSummary: archive
        ? {
            riskTags: archive.riskTags,
            longTermMemory: archive.longTermMemory
          }
        : null
    };
  }

  async createOrder(
    currentUser: AuthenticatedUser,
    payload: {
      serviceId: string;
      addressId: string;
      elderId?: string;
      bookingDate?: string;
      bookingTimeSlot?: string;
      contactName?: string;
      contactPhone?: string;
      remark?: string;
      couponId?: string;
    }
  ) {
    const preview = await this.previewOrder(currentUser, payload);
    const orderNo = this.generateOrderNo();

    const result = await this.prismaService.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          orderNo,
          ownerId: currentUser.id,
          elderId: preview.elderId,
          serviceId: payload.serviceId,
          addressId: payload.addressId,
          couponId: payload.couponId,
          status: OrderStatus.PENDING_PAYMENT,
          bookingDate: payload.bookingDate ? new Date(payload.bookingDate) : null,
          bookingTimeSlot: payload.bookingTimeSlot ?? null,
          remark: payload.remark ?? null,
          originalAmount: preview.price.originalAmount,
          discountAmount: preview.price.discountAmount,
          payableAmount: preview.price.payableAmount,
          addressSnapshot: preview.address,
          contactSnapshot: {
            name: payload.contactName ?? preview.address.receiverName,
            phone: payload.contactPhone ?? preview.address.receiverPhone
          },
          healthSummarySnapshot: preview.healthSummary ?? Prisma.JsonNull,
          aiSummary: Prisma.JsonNull
        }
      });

      await tx.orderTimeline.create({
        data: {
          orderId: order.id,
          status: OrderStatus.PENDING_PAYMENT,
          title: "订单已创建",
          description: "等待支付完成",
          operatorName: currentUser.realName ?? currentUser.phone
        }
      });

      return order;
    });

    return {
      orderId: result.id,
      orderNo: result.orderNo,
      status: result.status
    };
  }

  async listOrders(
    currentUser: AuthenticatedUser,
    page: number,
    pageSize: number,
    status?: OrderStatus
  ) {
    const where = await this.buildOrderAccessWhere(currentUser, status);
    const orders = await this.prismaService.order.findMany({
      where,
      include: {
        service: true
      },
      orderBy: { createdAt: "desc" }
    });

    return paginate(orders.map((item) => this.toOrderCard(item)), page, pageSize);
  }

  async getOrderDetail(currentUser: AuthenticatedUser, orderId: string) {
    const order = await this.getAccessibleOrder(currentUser, orderId);

    return {
      ...this.toOrderCard(order),
      remark: order.remark,
      source: order.source,
      urgencyLevel: order.urgencyLevel,
      address: order.addressSnapshot,
      contact: order.contactSnapshot,
      healthSummary: order.healthSummarySnapshot,
      payments: order.payments.map((item) => ({
        paymentId: item.id,
        paymentNo: item.paymentNo,
        channel: item.channel,
        status: item.status,
        amount: toNumber(item.amount),
        paidAt: toDateTimeString(item.paidAt)
      })),
      workOrders: order.workOrders.map((item) => ({
        workOrderId: item.id,
        status: item.status,
        assigneeName: item.assigneeName,
        institutionName: item.institutionName,
        scheduleAt: toDateTimeString(item.scheduleAt)
      })),
      reports: order.reports.map((item) => ({
        reportId: item.id,
        type: item.type,
        title: item.title,
        status: item.status,
        publishedAt: toDateTimeString(item.publishedAt)
      }))
    };
  }

  async updateSchedule(
    currentUser: AuthenticatedUser,
    orderId: string,
    bookingDate: string,
    bookingTimeSlot: string
  ) {
    const order = await this.getAccessibleOrder(currentUser, orderId);

    if (
      ([OrderStatus.CANCELLED, OrderStatus.COMPLETED, OrderStatus.REFUNDED] as OrderStatus[]).includes(
        order.status
      )
    ) {
      throw new BadRequestException("Current order status does not support rescheduling");
    }

    const updated = await this.prismaService.$transaction(async (tx) => {
      const next = await tx.order.update({
        where: { id: orderId },
        data: {
          bookingDate: new Date(bookingDate),
          bookingTimeSlot
        }
      });

      await tx.orderTimeline.create({
        data: {
          orderId,
          status: next.status,
          title: "用户改约",
          description: `${bookingDate} ${bookingTimeSlot}`,
          operatorName: currentUser.realName ?? currentUser.phone
        }
      });

      return next;
    });

    return {
      orderId: updated.id,
      bookingDate: toDateString(updated.bookingDate),
      bookingTimeSlot: updated.bookingTimeSlot
    };
  }

  async cancelOrder(currentUser: AuthenticatedUser, orderId: string, reason?: string) {
    const order = await this.getAccessibleOrder(currentUser, orderId);

    if (
      ([OrderStatus.COMPLETED, OrderStatus.REFUNDED, OrderStatus.CANCELLED] as OrderStatus[]).includes(
        order.status
      )
    ) {
      throw new BadRequestException("Current order status does not support cancellation");
    }

    const updated = await this.prismaService.$transaction(async (tx) => {
      const next = await tx.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.CANCELLED,
          cancelledAt: new Date()
        }
      });

      await tx.orderTimeline.create({
        data: {
          orderId,
          status: OrderStatus.CANCELLED,
          title: "订单已取消",
          description: reason ?? "用户主动取消",
          operatorName: currentUser.realName ?? currentUser.phone
        }
      });

      return next;
    });

    return {
      orderId: updated.id,
      status: updated.status
    };
  }

  async getTimeline(currentUser: AuthenticatedUser, orderId: string) {
    await this.getAccessibleOrder(currentUser, orderId);
    const timeline = await this.prismaService.orderTimeline.findMany({
      where: { orderId },
      orderBy: { createdAt: "asc" }
    });

    return timeline.map((item) => ({
      timelineId: item.id,
      status: item.status,
      title: item.title,
      description: item.description,
      operatorName: item.operatorName,
      createdAt: toDateTimeString(item.createdAt)
    }));
  }

  async getVoucher(currentUser: AuthenticatedUser, orderId: string) {
    const order = await this.getAccessibleOrder(currentUser, orderId);
    return {
      orderId: order.id,
      voucherCode: `VC-${order.orderNo.slice(-8)}`,
      status: order.status,
      bookingDate: toDateString(order.bookingDate),
      bookingTimeSlot: order.bookingTimeSlot
    };
  }

  async getServiceRecords(currentUser: AuthenticatedUser, orderId: string) {
    const order = await this.getAccessibleOrder(currentUser, orderId);
    return order.workOrders.map((item) => ({
      workOrderId: item.id,
      status: item.status,
      institutionName: item.institutionName,
      assigneeName: item.assigneeName,
      scheduleAt: toDateTimeString(item.scheduleAt),
      startedAt: toDateTimeString(item.startedAt),
      completedAt: toDateTimeString(item.completedAt),
      dispatchNote: item.dispatchNote
    }));
  }

  async getReportByType(
    currentUser: AuthenticatedUser,
    orderId: string,
    type: "ASSESSMENT" | "REHAB" | "SERVICE"
  ) {
    const order = await this.getAccessibleOrder(currentUser, orderId);
    const report = order.reports.find((item) => item.type === type);

    if (!report) {
      throw new NotFoundException("Report not found");
    }

    return {
      reportId: report.id,
      type: report.type,
      title: report.title,
      status: report.status,
      summary: report.summary,
      attachment: report.attachment,
      reviewedAt: toDateTimeString(report.reviewedAt),
      publishedAt: toDateTimeString(report.publishedAt)
    };
  }

  async submitReview(
    currentUser: AuthenticatedUser,
    orderId: string,
    payload: { score: number; tags?: string[]; content?: string }
  ) {
    const order = await this.getAccessibleOrder(currentUser, orderId);
    const review = await this.prismaService.orderReview.upsert({
      where: { orderId: order.id },
      update: {
        score: payload.score,
        tags: payload.tags ?? [],
        content: payload.content
      },
      create: {
        orderId: order.id,
        userId: currentUser.id,
        score: payload.score,
        tags: payload.tags ?? [],
        content: payload.content
      }
    });

    return {
      reviewId: review.id,
      score: review.score
    };
  }

  async getReview(currentUser: AuthenticatedUser, orderId: string) {
    await this.getAccessibleOrder(currentUser, orderId);
    const review = await this.prismaService.orderReview.findUnique({
      where: { orderId }
    });

    if (!review) {
      return null;
    }

    return {
      reviewId: review.id,
      score: review.score,
      tags: review.tags,
      content: review.content,
      createdAt: toDateTimeString(review.createdAt)
    };
  }

  async createAfterSale(
    currentUser: AuthenticatedUser,
    orderId: string,
    payload: {
      type: AfterSaleType;
      reason: string;
      description?: string;
      amountRequested?: number;
    }
  ) {
    const order = await this.getAccessibleOrder(currentUser, orderId);
    const request = await this.prismaService.afterSaleRequest.create({
      data: {
        orderId: order.id,
        userId: currentUser.id,
        type: payload.type,
        reason: payload.reason,
        description: payload.description,
        amountRequested: payload.amountRequested ?? null
      }
    });

    return {
      requestId: request.id,
      status: request.status
    };
  }

  async getAfterSales(currentUser: AuthenticatedUser, orderId: string) {
    await this.getAccessibleOrder(currentUser, orderId);
    const requests = await this.prismaService.afterSaleRequest.findMany({
      where: { orderId },
      orderBy: { createdAt: "desc" }
    });

    return requests.map((item) => ({
      requestId: item.id,
      type: item.type,
      status: item.status,
      reason: item.reason,
      description: item.description,
      amountRequested: toNumber(item.amountRequested),
      createdAt: toDateTimeString(item.createdAt)
    }));
  }

  async listAdminOrders(page: number, pageSize: number, status?: OrderStatus) {
    const orders = await this.prismaService.order.findMany({
      where: {
        status: status ?? undefined
      },
      include: {
        service: true,
        owner: true,
        elder: true
      },
      orderBy: { createdAt: "desc" }
    });

    return paginate(
      orders.map((item) => ({
        ...this.toOrderCard(item),
        ownerName: item.owner.realName ?? item.owner.nickname ?? item.owner.phone,
        elderName: item.elder?.realName ?? item.elder?.nickname ?? null
      })),
      page,
      pageSize
    );
  }

  async getAdminOrderDetail(orderId: string) {
    const order = await this.prismaService.order.findUnique({
      where: { id: orderId },
      include: {
        service: true,
        owner: true,
        elder: true,
        payments: true,
        workOrders: {
          include: {
            assignee: true,
            institution: true,
            schedule: true
          }
        },
        reports: true,
        timeline: {
          orderBy: { createdAt: "asc" }
        }
      }
    });

    if (!order) {
      throw new NotFoundException("Order not found");
    }

    return {
      ...this.toOrderCard(order),
      owner: {
        userId: order.owner.id,
        name: order.owner.realName ?? order.owner.nickname ?? order.owner.phone,
        phone: order.owner.phone
      },
      elder: order.elder
        ? {
            userId: order.elder.id,
            name: order.elder.realName ?? order.elder.nickname ?? order.elder.phone,
            phone: order.elder.phone
          }
        : null,
      payments: order.payments,
      workOrders: order.workOrders,
      reports: order.reports,
      timeline: order.timeline.map((item) => ({
        ...item,
        createdAt: toDateTimeString(item.createdAt)
      }))
    };
  }

  async dispatchOrder(
    adminUser: AuthenticatedUser,
    orderId: string,
    payload: {
      institutionId?: string;
      assigneeStaffId?: string;
      scheduleId?: string;
      dispatchNote?: string;
    }
  ) {
    const order = await this.prismaService.order.findUnique({
      where: { id: orderId },
      include: {
        service: true,
        workOrders: true
      }
    });

    if (!order) {
      throw new NotFoundException("Order not found");
    }

    const [institution, assignee, schedule] = await Promise.all([
      payload.institutionId
        ? this.prismaService.institution.findUnique({ where: { id: payload.institutionId } })
        : Promise.resolve(null),
      payload.assigneeStaffId
        ? this.prismaService.staff.findUnique({ where: { id: payload.assigneeStaffId } })
        : Promise.resolve(null),
      payload.scheduleId
        ? this.prismaService.staffSchedule.findUnique({ where: { id: payload.scheduleId } })
        : Promise.resolve(null)
    ]);

    const workOrder = order.workOrders[0];
    const result = await this.prismaService.$transaction(async (tx) => {
      const nextWorkOrder = workOrder
        ? await tx.workOrder.update({
            where: { id: workOrder.id },
            data: {
              institutionId: payload.institutionId ?? workOrder.institutionId,
              assigneeStaffId: payload.assigneeStaffId ?? workOrder.assigneeStaffId,
              scheduleId: payload.scheduleId ?? workOrder.scheduleId,
              dispatcherId: adminUser.id,
              status: WorkOrderStatus.ASSIGNED,
              institutionName: institution?.name ?? workOrder.institutionName,
              assigneeName: assignee?.name ?? workOrder.assigneeName,
              scheduleAt: schedule?.startAt ?? workOrder.scheduleAt,
              dispatchNote: payload.dispatchNote ?? workOrder.dispatchNote
            }
          })
        : await tx.workOrder.create({
            data: {
              orderId,
              institutionId: payload.institutionId,
              assigneeStaffId: payload.assigneeStaffId,
              scheduleId: payload.scheduleId,
              dispatcherId: adminUser.id,
              status: WorkOrderStatus.ASSIGNED,
              institutionName: institution?.name ?? null,
              assigneeName: assignee?.name ?? null,
              scheduleAt: schedule?.startAt ?? null,
              dispatchNote: payload.dispatchNote
            }
          });

      await tx.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.DISPATCHING
        }
      });

      await tx.orderTimeline.create({
        data: {
          orderId,
          status: OrderStatus.DISPATCHING,
          title: "后台已派单",
          description: payload.dispatchNote ?? "已分配服务人员",
          operatorName: adminUser.realName ?? adminUser.phone
        }
      });

      return nextWorkOrder;
    });

    return {
      workOrderId: result.id,
      status: result.status
    };
  }

  async updateWorkOrderStatus(
    adminUser: AuthenticatedUser,
    workOrderId: string,
    status: WorkOrderStatus
  ) {
    const workOrder = await this.prismaService.workOrder.findUnique({
      where: { id: workOrderId }
    });

    if (!workOrder) {
      throw new NotFoundException("Work order not found");
    }

    const result = await this.prismaService.$transaction(async (tx) => {
      const next = await tx.workOrder.update({
        where: { id: workOrderId },
        data: {
          status,
          startedAt: status === WorkOrderStatus.SERVING ? new Date() : workOrder.startedAt,
          completedAt: status === WorkOrderStatus.COMPLETED ? new Date() : workOrder.completedAt
        }
      });

      await tx.orderTimeline.create({
        data: {
          orderId: workOrder.orderId,
          title: `工单状态更新为 ${status}`,
          description: null,
          operatorName: adminUser.realName ?? adminUser.phone
        }
      });

      await tx.order.update({
        where: { id: workOrder.orderId },
        data: {
          status:
            status === WorkOrderStatus.COMPLETED
              ? OrderStatus.COMPLETED
              : status === WorkOrderStatus.SERVING
                ? OrderStatus.IN_SERVICE
                : OrderStatus.SCHEDULED
        }
      });

      return next;
    });

    return {
      workOrderId: result.id,
      status: result.status
    };
  }

  private resolveCouponDiscount(
    originalAmount: number,
    couponTemplate: {
      discountType: "CASH" | "DISCOUNT";
      discountValue: Prisma.Decimal;
      minSpend: Prisma.Decimal | null;
    }
  ) {
    const minSpend = toNumber(couponTemplate.minSpend) ?? 0;
    if (originalAmount < minSpend) {
      return 0;
    }

    const discountValue = toNumber(couponTemplate.discountValue) ?? 0;

    return couponTemplate.discountType === "CASH"
      ? discountValue
      : Number((originalAmount * (1 - discountValue / 10)).toFixed(2));
  }

  private async getAccessibleOrder(currentUser: AuthenticatedUser, orderId: string) {
    const order = await this.prismaService.order.findUnique({
      where: { id: orderId },
      include: {
        service: true,
        payments: true,
        workOrders: true,
        reports: true
      }
    });

    if (!order) {
      throw new NotFoundException("Order not found");
    }

    const allowed =
      ([UserType.ADMIN, UserType.ORG_MANAGER, UserType.STAFF] as UserType[]).includes(
        currentUser.type
      ) ||
      order.ownerId === currentUser.id ||
      order.elderId === currentUser.id ||
      Boolean(
        order.elderId &&
          (
            await this.prismaService.familyBinding.findFirst({
              where: {
                familyMemberId: currentUser.id,
                elderMemberId: order.elderId
              }
            })
          )
      );

    if (!allowed) {
      throw new ForbiddenException("No permission to access order");
    }

    return order;
  }

  private async buildOrderAccessWhere(currentUser: AuthenticatedUser, status?: OrderStatus) {
    if (
      ([UserType.ADMIN, UserType.ORG_MANAGER, UserType.STAFF] as UserType[]).includes(
        currentUser.type
      )
    ) {
      return {
        status: status ?? undefined
      };
    }

    const elderBindings = await this.prismaService.familyBinding.findMany({
      where: { familyMemberId: currentUser.id },
      select: { elderMemberId: true }
    });

    return {
      status: status ?? undefined,
      OR: [
        { ownerId: currentUser.id },
        { elderId: currentUser.id },
        {
          elderId: {
            in: elderBindings.map((item) => item.elderMemberId)
          }
        }
      ]
    };
  }

  private async resolveOrderElder(currentUser: AuthenticatedUser, elderId?: string) {
    if (elderId) {
      if (elderId === currentUser.id) {
        return elderId;
      }

      const binding = await this.prismaService.familyBinding.findFirst({
        where: {
          familyMemberId: currentUser.id,
          elderMemberId: elderId
        }
      });

      if (
        !binding &&
        !([UserType.ADMIN, UserType.ORG_MANAGER, UserType.STAFF] as UserType[]).includes(
          currentUser.type
        )
      ) {
        throw new ForbiddenException("No permission to place order for elder");
      }

      return elderId;
    }

    if (currentUser.type === UserType.ELDER) {
      return currentUser.id;
    }

    const binding = await this.prismaService.familyBinding.findFirst({
      where: { familyMemberId: currentUser.id },
      orderBy: { createdAt: "asc" }
    });

    return binding?.elderMemberId ?? currentUser.id;
  }

  private async getAccessibleElders(currentUser: AuthenticatedUser) {
    if (currentUser.type === UserType.ELDER) {
      const elder = await this.prismaService.user.findUnique({
        where: { id: currentUser.id }
      });

      return elder
        ? [
            {
              elderId: elder.id,
              name: elder.realName ?? elder.nickname ?? elder.phone
            }
          ]
        : [];
    }

    if (currentUser.type === UserType.FAMILY) {
      const bindings = await this.prismaService.familyBinding.findMany({
        where: { familyMemberId: currentUser.id },
        include: { elderMember: true }
      });

      return bindings.map((item) => ({
        elderId: item.elderMemberId,
        name: item.elderMember.realName ?? item.elderMember.nickname ?? item.elderMember.phone,
        relationLabel: item.relationLabel
      }));
    }

    return [];
  }

  private async getAccessibleAddresses(currentUser: AuthenticatedUser) {
    const where =
      currentUser.type === UserType.FAMILY
        ? { ownerId: currentUser.id }
        : {
            OR: [{ ownerId: currentUser.id }, { elderId: currentUser.id }]
          };

    const addresses = await this.prismaService.address.findMany({
      where,
      orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }]
    });

    return addresses.map((item) => this.toAddressCard(item));
  }

  private toAddressCard(address: {
    id: string;
    label: string | null;
    receiverName: string;
    receiverPhone: string;
    province: string;
    city: string;
    district: string;
    street: string | null;
    detailAddress: string;
    longitude: unknown;
    latitude: unknown;
    isDefault: boolean;
  }) {
    return {
      addressId: address.id,
      label: address.label,
      receiverName: address.receiverName,
      receiverPhone: address.receiverPhone,
      province: address.province,
      city: address.city,
      district: address.district,
      street: address.street,
      detailAddress: address.detailAddress,
      longitude: toNumber(address.longitude),
      latitude: toNumber(address.latitude),
      isDefault: address.isDefault
    };
  }

  private toOrderCard(order: {
    id: string;
    orderNo: string;
    status: OrderStatus;
    bookingDate: Date | null;
    bookingTimeSlot: string | null;
    payableAmount: unknown;
    actualAmount: unknown;
    createdAt: Date;
    service: {
      id: string;
      category: string;
      title: string;
      coverUrl: string | null;
    };
  }) {
    return {
      orderId: order.id,
      orderNo: order.orderNo,
      serviceCategory: order.service.category,
      status: order.status,
      statusText: this.getOrderStatusText(order.status),
      title: order.service.title,
      image: order.service.coverUrl,
      actualAmount: toNumber(order.actualAmount) ?? toNumber(order.payableAmount),
      bookingDate: toDateString(order.bookingDate),
      bookingTimeSlot: order.bookingTimeSlot,
      createdAt: toDateTimeString(order.createdAt)
    };
  }

  private getOrderStatusText(status: OrderStatus) {
    switch (status) {
      case OrderStatus.PENDING_PAYMENT:
        return "待支付";
      case OrderStatus.PENDING_CONFIRMATION:
        return "待确认";
      case OrderStatus.DISPATCHING:
        return "派单中";
      case OrderStatus.WAITING_ASSESSMENT:
        return "待评估";
      case OrderStatus.SCHEDULED:
        return "已排期";
      case OrderStatus.IN_SERVICE:
        return "服务中";
      case OrderStatus.COMPLETED:
        return "已完成";
      case OrderStatus.AFTER_SALE:
        return "售后中";
      case OrderStatus.REFUNDED:
        return "已退款";
      case OrderStatus.CANCELLED:
        return "已取消";
    }
  }

  private generateOrderNo() {
    return `IHC${Date.now().toString().slice(-10)}`;
  }
}
