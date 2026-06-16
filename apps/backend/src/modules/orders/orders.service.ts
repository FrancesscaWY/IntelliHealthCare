import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import {
  AlertLevel,
  AlertStatus,
  AfterSaleStatus,
  AfterSaleType,
  MetricType,
  OrderStatus,
  PaymentChannel,
  Prisma,
  ServiceCategory,
  UserType,
  WorkOrderStatus
} from "@prisma/client";
import type { AuthenticatedUser } from "../../common/auth/auth.types";
import {
  ensureArray,
  ensureRecord,
  getAge,
  paginate,
  toDateString,
  toDateTimeString,
  toNumber,
  toPrismaJson
} from "../../common/utils/serializers";
import { PrismaService } from "../../infra/prisma/prisma.service";

const SHANGHAI_DISTRICT_POINTS = [
  { name: "黄浦区", coordinate: [121.490317, 31.222771] as [number, number] },
  { name: "徐汇区", coordinate: [121.43752, 31.179973] as [number, number] },
  { name: "长宁区", coordinate: [121.4222, 31.218123] as [number, number] },
  { name: "静安区", coordinate: [121.448224, 31.229003] as [number, number] },
  { name: "普陀区", coordinate: [121.392499, 31.241701] as [number, number] },
  { name: "虹口区", coordinate: [121.491832, 31.26097] as [number, number] },
  { name: "杨浦区", coordinate: [121.522797, 31.270755] as [number, number] },
  { name: "闵行区", coordinate: [121.375972, 31.111658] as [number, number] },
  { name: "宝山区", coordinate: [121.489934, 31.398896] as [number, number] },
  { name: "嘉定区", coordinate: [121.250333, 31.383524] as [number, number] },
  { name: "浦东新区", coordinate: [121.567706, 31.245944] as [number, number] },
  { name: "金山区", coordinate: [121.330736, 30.724697] as [number, number] },
  { name: "松江区", coordinate: [121.223543, 31.03047] as [number, number] },
  { name: "青浦区", coordinate: [121.113021, 31.151209] as [number, number] },
  { name: "奉贤区", coordinate: [121.458472, 30.912345] as [number, number] }
];

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
      aiSummary?: Record<string, unknown>;
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
          aiSummary: payload.aiSummary ? toPrismaJson(payload.aiSummary) : Prisma.JsonNull
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
      aiSummary: order.aiSummary,
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
        scheduleAt: toDateTimeString(item.scheduleAt),
        agentDispatchSuggestion: item.agentDispatchSuggestion
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
      where: { orderId },
      select: {
        id: true,
        orderId: true,
        score: true,
        tags: true,
        content: true,
        createdAt: true
      }
    });

    if (!review) {
      return null;
    }

    return {
      reviewId: review.id,
      orderId: review.orderId,
      score: review.score,
      tags: ensureArray<string>(review.tags),
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

  async createAdminAfterSale(
    adminUser: AuthenticatedUser,
    orderId: string,
    payload: {
      type: AfterSaleType;
      reason: string;
      description?: string;
      amountRequested?: number;
    }
  ) {
    const order = await this.prismaService.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        ownerId: true
      }
    });

    if (!order) {
      throw new NotFoundException("Order not found");
    }

    const request = await this.prismaService.$transaction(async (tx) => {
      const created = await tx.afterSaleRequest.create({
        data: {
          orderId: order.id,
          userId: order.ownerId,
          type: payload.type,
          reason: payload.reason,
          description: payload.description,
          amountRequested: payload.amountRequested ?? null
        }
      });

      await tx.orderTimeline.create({
        data: {
          orderId: order.id,
          status: OrderStatus.AFTER_SALE,
          title: "后台发起售后申请",
          description: payload.reason,
          operatorName: adminUser.realName ?? adminUser.phone
        }
      });

      return created;
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

  async listAdminOrders(
    page: number,
    pageSize: number,
    status?: OrderStatus,
    serviceCategory?: ServiceCategory,
    paymentChannel?: PaymentChannel,
    keyword?: string
  ) {
    const normalizedKeyword = keyword?.trim().toLowerCase();
    const orders = await this.prismaService.order.findMany({
      where: {
        status: status ?? undefined
      },
      include: {
        service: true,
        owner: true,
        elder: true,
        payments: {
          orderBy: { createdAt: "desc" },
          take: 1
        },
        workOrders: {
          include: {
            assignee: true
          },
          orderBy: { createdAt: "desc" },
          take: 1
        },
        afterSales: {
          orderBy: { createdAt: "desc" },
          take: 1
        }
      },
      orderBy: { createdAt: "desc" }
    });

    const list = orders
      .map((item) => {
        const contactSnapshot = ensureRecord(item.contactSnapshot);
        const addressSnapshot = ensureRecord(item.addressSnapshot);
        const latestPayment = item.payments[0] ?? null;
        const latestWorkOrder = item.workOrders[0] ?? null;
        const latestAfterSale = item.afterSales[0] ?? null;
        const ownerName = item.owner.realName ?? item.owner.nickname ?? item.owner.phone;
        const paymentChannelText = latestPayment
          ? this.getPaymentChannelText(latestPayment.channel)
          : null;

        return {
          ...this.toOrderCard(item),
          ownerId: item.owner.id,
          ownerName,
          ownerPhone: item.owner.phone,
          ownerAvatar: item.owner.avatarUrl,
          ownerCreatedAt: toDateTimeString(item.owner.createdAt),
          ownerLastLoginAt: toDateTimeString(item.owner.lastLoginAt),
          elderName: item.elder?.realName ?? item.elder?.nickname ?? null,
          source: item.source,
          serviceCategoryText: this.getServiceCategoryText(item.service.category),
          serviceSummary: item.service.summary,
          serviceDurationText: this.getServiceDurationText(item.service.durationMinutes),
          originalAmount: toNumber(item.originalAmount),
          discountAmount: toNumber(item.discountAmount),
          payableAmount: toNumber(item.payableAmount),
          actualAmount: toNumber(item.actualAmount) ?? toNumber(item.payableAmount),
          paymentChannel: latestPayment?.channel ?? null,
          paymentChannelText,
          paymentStatus: latestPayment?.status ?? null,
          paidAt: toDateTimeString(item.paidAt ?? latestPayment?.paidAt),
          completedAt: toDateTimeString(item.completedAt),
          cancelledAt: toDateTimeString(item.cancelledAt),
          contactName: String(contactSnapshot.contactName ?? contactSnapshot.name ?? ""),
          contactPhone: String(contactSnapshot.contactPhone ?? contactSnapshot.phone ?? ""),
          addressText: this.buildAddressText(addressSnapshot),
          remark: item.remark,
          healthSummary: item.healthSummarySnapshot,
          aiSummary: item.aiSummary,
          workOrderId: latestWorkOrder?.id ?? null,
          workOrderStatus: latestWorkOrder?.status ?? null,
          assigneeName: latestWorkOrder?.assignee?.name ?? latestWorkOrder?.assigneeName ?? null,
          agentDispatchSuggestion: latestWorkOrder?.agentDispatchSuggestion ?? null,
          afterSaleId: latestAfterSale?.id ?? null,
          afterSaleStatus: latestAfterSale?.status ?? null,
          afterSaleReason: latestAfterSale?.reason ?? null
        };
      })
      .filter((item) => {
        const matchesServiceCategory =
          !serviceCategory || item.serviceCategory === serviceCategory;
        const matchesPaymentChannel =
          !paymentChannel || item.paymentChannel === paymentChannel;
        const matchesKeyword =
          !normalizedKeyword ||
          [
            item.orderNo,
            item.title,
            item.ownerName,
            item.ownerPhone
          ]
            .filter(Boolean)
            .some((field) => String(field).toLowerCase().includes(normalizedKeyword));

        return matchesServiceCategory && matchesPaymentChannel && matchesKeyword;
      });

    const result = paginate(list, page, pageSize);

    return {
      title: "全部订单",
      rows: result.list.map((item) => this.buildAdminOrderListRow(item)),
      ...result
    };
  }

  async getAdminOrderDetail(orderId: string) {
    const order = await this.prismaService.order.findUnique({
      where: { id: orderId },
      include: {
        service: true,
        owner: true,
        elder: true,
        payments: true,
        afterSales: {
          orderBy: { createdAt: "desc" }
        },
        reviews: true,
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

    const latestWorkOrder = order.workOrders[0] ?? null;
    const latestAfterSale = order.afterSales[0] ?? null;
    const latestPayment = order.payments[0] ?? null;
    const ownerName = order.owner.realName ?? order.owner.nickname ?? order.owner.phone;
    const detailCard = {
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
      createdAt: toDateTimeString(order.createdAt),
      ownerId: order.owner.id,
      ownerName,
      ownerPhone: order.owner.phone,
      ownerAvatar: order.owner.avatarUrl,
      ownerCreatedAt: toDateTimeString(order.owner.createdAt),
      ownerLastLoginAt: toDateTimeString(order.owner.lastLoginAt),
      elderName: order.elder?.realName ?? order.elder?.nickname ?? null,
      source: order.source,
      serviceCategoryText: this.getServiceCategoryText(order.service.category),
      serviceSummary: order.service.summary,
      serviceDurationText: this.getServiceDurationText(order.service.durationMinutes),
      originalAmount: toNumber(order.originalAmount),
      discountAmount: toNumber(order.discountAmount),
      payableAmount: toNumber(order.payableAmount),
      paymentChannel: latestPayment?.channel ?? null,
      paymentChannelText: latestPayment ? this.getPaymentChannelText(latestPayment.channel) : null,
      paymentStatus: latestPayment?.status ?? null,
      paidAt: toDateTimeString(order.paidAt ?? latestPayment?.paidAt),
      completedAt: toDateTimeString(order.completedAt),
      cancelledAt: toDateTimeString(order.cancelledAt),
      contactName: String(ensureRecord(order.contactSnapshot).contactName ?? ensureRecord(order.contactSnapshot).name ?? ""),
      contactPhone: String(ensureRecord(order.contactSnapshot).contactPhone ?? ensureRecord(order.contactSnapshot).phone ?? ""),
      addressText: this.buildAddressText(ensureRecord(order.addressSnapshot)),
      remark: order.remark,
      workOrderId: latestWorkOrder?.id ?? null,
      workOrderStatus: latestWorkOrder?.status ?? null,
      assigneeName: latestWorkOrder?.assignee?.name ?? latestWorkOrder?.assigneeName ?? null,
      afterSaleId: latestAfterSale?.id ?? null,
      afterSaleStatus: latestAfterSale?.status ?? null,
      afterSaleReason: latestAfterSale?.reason ?? null,
      healthSummary: order.healthSummarySnapshot,
      aiSummary: order.aiSummary,
      agentDispatchSuggestion: latestWorkOrder?.agentDispatchSuggestion ?? null
    };
    const orderRow = this.buildAdminOrderListRow(detailCard);

    return {
      ...detailCard,
      owner: {
        userId: order.owner.id,
        name: order.owner.realName ?? order.owner.nickname ?? order.owner.phone,
        phone: order.owner.phone,
        createdAt: toDateTimeString(order.owner.createdAt),
        lastLoginAt: toDateTimeString(order.owner.lastLoginAt)
      },
      elder: order.elder
        ? {
            userId: order.elder.id,
            name: order.elder.realName ?? order.elder.nickname ?? order.elder.phone,
            phone: order.elder.phone
          }
        : null,
      source: order.source,
      originalAmount: toNumber(order.originalAmount),
      discountAmount: toNumber(order.discountAmount),
      payableAmount: toNumber(order.payableAmount),
      actualAmount: toNumber(order.actualAmount) ?? toNumber(order.payableAmount),
      paidAt: toDateTimeString(order.paidAt),
      completedAt: toDateTimeString(order.completedAt),
      cancelledAt: toDateTimeString(order.cancelledAt),
      remark: order.remark,
      contactSnapshot: order.contactSnapshot,
      addressSnapshot: order.addressSnapshot,
      healthSummary: order.healthSummarySnapshot,
      aiSummary: order.aiSummary,
      payments: order.payments.map((item) => ({
        paymentId: item.id,
        paymentNo: item.paymentNo,
        channel: item.channel,
        channelText: this.getPaymentChannelText(item.channel),
        status: item.status,
        amount: toNumber(item.amount),
        paidAt: toDateTimeString(item.paidAt),
        createdAt: toDateTimeString(item.createdAt)
      })),
      workOrders: order.workOrders.map((item) => ({
        workOrderId: item.id,
        status: item.status,
        institutionName: item.institution?.name ?? item.institutionName,
        assigneeName: item.assignee?.name ?? item.assigneeName,
        scheduleAt: toDateTimeString(item.scheduleAt),
        startedAt: toDateTimeString(item.startedAt),
        completedAt: toDateTimeString(item.completedAt),
        dispatchNote: item.dispatchNote,
        agentDispatchSuggestion: item.agentDispatchSuggestion
      })),
      reports: order.reports.map((item) => ({
        reportId: item.id,
        title: item.title,
        type: item.type,
        status: item.status,
        createdAt: toDateTimeString(item.createdAt)
      })),
      afterSales: order.afterSales.map((item) => ({
        afterSaleId: item.id,
        type: item.type,
        status: item.status,
        reason: item.reason,
        description: item.description,
        amountRequested: toNumber(item.amountRequested),
        createdAt: toDateTimeString(item.createdAt)
      })),
      reviews: order.reviews.map((item) => ({
        reviewId: item.id,
        score: item.score,
        tags: item.tags,
        content: item.content,
        createdAt: toDateTimeString(item.createdAt)
      })),
      timeline: order.timeline.map((item) => ({
        ...item,
        createdAt: toDateTimeString(item.createdAt)
      })),
      viewModel: this.buildAdminOrderDetailViewModel(orderRow)
    };
  }

  async getAdminDashboardOverview() {
    const [
      users,
      orders,
      workOrders,
      posts,
      services,
      staffs,
      archives,
      afterSales,
      healthAlerts,
      activeMedicationCount
    ] = await Promise.all([
      this.prismaService.user.findMany({
        where: {
          type: {
            in: [UserType.ELDER, UserType.FAMILY]
          }
        },
        orderBy: { createdAt: "asc" }
      }),
      this.prismaService.order.findMany({
        include: {
          service: true
        },
        orderBy: { createdAt: "asc" }
      }),
      this.prismaService.workOrder.findMany({
        include: {
          assignee: true,
          order: {
            include: {
              service: true
            }
          }
        },
        orderBy: { createdAt: "desc" }
      }),
      this.prismaService.communityPost.findMany(),
      this.prismaService.serviceItem.findMany({
        orderBy: [{ salesVolume: "desc" }, { createdAt: "desc" }]
      }),
      this.prismaService.staff.findMany({
        orderBy: { createdAt: "desc" }
      }),
      this.prismaService.healthArchive.findMany(),
      this.prismaService.afterSaleRequest.findMany({
        orderBy: { createdAt: "desc" }
      }),
      this.prismaService.healthAlert.findMany({
        orderBy: { createdAt: "desc" }
      }),
      this.prismaService.medication.count({
        where: {
          active: true
        }
      })
    ]);
    const trendLabels = this.buildRecentDateLabels(7);
    const absoluteDates = trendLabels.map((label) => this.buildAbsoluteDayLabelFromShort(label));
    const formatNumber = (value: number) => value.toLocaleString("en-US");
    const formatPercent = (value: number, total: number) =>
      `${((value / Math.max(total, 1)) * 100).toFixed(2)}%`;
    const buildSparkline = (values: number[]) => {
      const safeValues = values.length ? values : [0];
      const max = Math.max(...safeValues, 1);
      const min = Math.min(...safeValues);
      const denominator = Math.max(max - min, 1);
      const step = safeValues.length > 1 ? 90 / (safeValues.length - 1) : 0;

      return safeValues
        .map((value, index) => {
          const x = Math.round(3 + step * index);
          const y = Math.round(33 - ((value - min) / denominator) * 26);
          return `${x},${y}`;
        })
        .join(" ");
    };
    const buildRate = (current: number, previous: number) => {
      if (previous <= 0) {
        return {
          direction: current > 0 ? "up" : "down",
          rate: current > 0 ? "100.00%" : "0.00%"
        } as const;
      }

      const delta = ((current - previous) / previous) * 100;
      return {
        direction: delta >= 0 ? "up" : "down",
        rate: `${Math.abs(delta).toFixed(2)}%`
      } as const;
    };
    const inferDistrict = (addressSnapshot: Prisma.JsonValue | null) => {
      const record = ensureRecord(addressSnapshot);
      const candidates = [
        String(record.district ?? ""),
        String(record.city ?? ""),
        String(record.detailAddress ?? ""),
        String(record.address ?? "")
      ].filter(Boolean);

      return (
        SHANGHAI_DISTRICT_POINTS.find((item) =>
          candidates.some((value) => value.includes(item.name))
        )?.name ?? "浦东新区"
      );
    };

    const userTrend = this.buildAdaptiveRecentCountSeries(
      this.buildExactRecentCountSeries(users, absoluteDates),
      users.length,
      absoluteDates,
      "dashboard-users",
      { share: 0.24, minimumWindowTotal: 5 }
    );
    const workOrderTrend = this.buildAdaptiveRecentCountSeries(
      this.buildExactRecentCountSeries(workOrders, absoluteDates),
      workOrders.length,
      absoluteDates,
      "dashboard-work-orders",
      { share: 0.42, minimumWindowTotal: 7 }
    );
    const orderTrend = this.buildAdaptiveRecentCountSeries(
      this.buildExactRecentCountSeries(orders, absoluteDates),
      orders.length,
      absoluteDates,
      "dashboard-orders",
      { share: 0.38, minimumWindowTotal: 6 }
    );
    const postTrend = this.buildAdaptiveRecentCountSeries(
      this.buildExactRecentCountSeries(posts, absoluteDates),
      posts.length,
      absoluteDates,
      "dashboard-posts",
      { share: 0.52, minimumWindowTotal: 5 }
    );
    const staffTrend = this.buildAdaptiveRecentCountSeries(
      this.buildExactRecentCountSeries(staffs, absoluteDates),
      staffs.length,
      absoluteDates,
      "dashboard-staffs",
      { share: 0.26, minimumWindowTotal: 4 }
    );
    const afterSaleTrend = this.buildAdaptiveRecentCountSeries(
      this.buildExactRecentCountSeries(afterSales, absoluteDates),
      afterSales.length,
      absoluteDates,
      "dashboard-after-sales",
      { share: 0.3, minimumWindowTotal: 3 }
    );
    const healthAlertTrend = this.buildAdaptiveRecentCountSeries(
      this.buildExactRecentCountSeries(healthAlerts, absoluteDates),
      healthAlerts.length,
      absoluteDates,
      "dashboard-health-alerts",
      { share: 0.28, minimumWindowTotal: 3 }
    );

    const todayWorkOrders = workOrderTrend[workOrderTrend.length - 1] ?? 0;
    const todayOrders = orderTrend[orderTrend.length - 1] ?? 0;
    const todayPosts = postTrend[postTrend.length - 1] ?? 0;

    const riskTags = archives.flatMap((item) => ensureArray<string>(item.riskTags));
    const tagCounts = Array.from(
      riskTags.reduce((map, tag) => map.set(tag, (map.get(tag) ?? 0) + 1), new Map<string, number>())
    )
      .sort((left, right) => right[1] - left[1])
      .slice(0, 5);

    const ageBuckets = [
      { label: "60岁以下", min: 0, max: 59, color: "#78d6d3", highlightColor: "#b8f4ed" },
      { label: "60-69岁", min: 60, max: 69, color: "#80c9f5", highlightColor: "#c7e8ff" },
      { label: "70-79岁", min: 70, max: 79, color: "#82d8ae", highlightColor: "#c4f3d6" },
      { label: "80-89岁", min: 80, max: 89, color: "#ff9caf", highlightColor: "#ffd1dc" },
      { label: "90岁以上", min: 90, max: Number.MAX_SAFE_INTEGER, color: "#bba3ee", highlightColor: "#ded1ff" }
    ];
    const ageCounts = ageBuckets.map((bucket) => ({
      ...bucket,
      count: users.filter((item) => {
        const fallbackAge = item.type === UserType.FAMILY ? 45 : 75;
        const age = getAge(item.birthday) ?? fallbackAge;
        return age >= bucket.min && age <= bucket.max;
      }).length
    }));
    const ageTotal = Math.max(ageCounts.reduce((sum, item) => sum + item.count, 0), 1);

    const healthBuckets = [
      { label: "健康", maxScore: 1, color: "#73d3a8", highlightColor: "#b6f2cd" },
      { label: "良好", maxScore: 3, color: "#78c9ef", highlightColor: "#c2e9ff" },
      { label: "一般", maxScore: 5, color: "#ffc86c", highlightColor: "#ffe7aa" },
      { label: "较差", maxScore: 7, color: "#ff9d73", highlightColor: "#ffd0b8" },
      { label: "失能/半失能", maxScore: Number.MAX_SAFE_INTEGER, color: "#ff6c86", highlightColor: "#ffc1cf" }
    ];
    const elderUsers = users.filter((item) => item.type === UserType.ELDER);
    const archiveByUserId = new Map(archives.map((item) => [item.userId, item]));
    const healthScores = elderUsers.map((item) => {
      const archive = archiveByUserId.get(item.id);
      const medicalHistory = ensureRecord(archive?.medicalHistory);
      const lifestyle = ensureRecord(medicalHistory.lifestyle);
      const chronicDiseases = ensureArray<string>(medicalHistory.chronicDiseases);
      const riskCount = ensureArray<string>(archive?.riskTags).length;
      const age = getAge(item.birthday) ?? 78;
      const longTermMemoryText = JSON.stringify(archive?.longTermMemory ?? {});
      const agePenalty = age >= 90 ? 3 : age >= 80 ? 2 : age >= 70 ? 1 : 0;
      const sleepPenalty = String(lifestyle.sleepQuality ?? "").includes("较差") ? 1 : 0;
      const frailtyPenalty = /(巡查|离床|跌倒|卧床|轮椅|失能|半失能)/.test(longTermMemoryText) ? 2 : 0;

      return riskCount + Math.min(chronicDiseases.length, 2) + agePenalty + sleepPenalty + frailtyPenalty;
    });
    const healthCounts = healthBuckets.map((bucket, index) => ({
      ...bucket,
      count: healthScores.filter((score) => {
        const previousMax = index === 0 ? -1 : healthBuckets[index - 1]?.maxScore ?? -1;
        return score > previousMax && score <= bucket.maxScore;
      }).length
    }));
    const healthTotal = Math.max(healthCounts.reduce((sum, item) => sum + item.count, 0), 1);
    const healthyCount =
      (healthCounts.find((item) => item.label === "健康")?.count ?? 0) +
      (healthCounts.find((item) => item.label === "良好")?.count ?? 0);

    const serviceBuckets = [
      {
        label: "康复理疗",
        category: ServiceCategory.REHAB_THERAPY,
        color: "#91e2b2",
        highlightColor: "#a8edea"
      },
      {
        label: "上门体检",
        category: ServiceCategory.HOME_EXAM,
        color: "#83c9f5",
        highlightColor: "#b8d8ff"
      },
      {
        label: "家政服务",
        category: ServiceCategory.HOME_CARE,
        color: "#ffb6b8",
        highlightColor: "#fed6e3"
      }
    ];
    const serviceCounts = serviceBuckets.map((bucket) => ({
      ...bucket,
      count: orders.filter((item) => item.service.category === bucket.category).length
    }));
    const serviceTotal = Math.max(serviceCounts.reduce((sum, item) => sum + item.count, 0), 1);

    const mapPoints = SHANGHAI_DISTRICT_POINTS.map((district) => ({
      ...district,
      value: orders.filter((item) => inferDistrict(item.addressSnapshot) === district.name).length
    }));
    const mapTotal = mapPoints.reduce((sum, item) => sum + item.value, 0);

    const pendingWorkOrderCount = workOrders.filter(
      (item) =>
        item.status === WorkOrderStatus.PENDING ||
        item.status === WorkOrderStatus.ASSIGNED ||
        item.status === WorkOrderStatus.ACCEPTED
    ).length;
    const pendingAfterSaleCount = afterSales.filter(
      (item) =>
        item.status === AfterSaleStatus.SUBMITTED ||
        item.status === AfterSaleStatus.PROCESSING
    ).length;
    const openHealthAlertCount = healthAlerts.filter((item) => !item.handledAt).length;
    const yesterdayWorkOrders = workOrderTrend[workOrderTrend.length - 2] ?? 0;
    const yesterdayAfterSales = afterSaleTrend[afterSaleTrend.length - 2] ?? 0;
    const yesterdayHealthAlerts = healthAlertTrend[healthAlertTrend.length - 2] ?? 0;

    const userRate = buildRate(userTrend[userTrend.length - 1] ?? users.length, userTrend[userTrend.length - 2] ?? 0);
    const workOrderRate = buildRate(
      workOrderTrend[workOrderTrend.length - 1] ?? todayWorkOrders,
      workOrderTrend[workOrderTrend.length - 2] ?? yesterdayWorkOrders
    );
    const orderRate = buildRate(
      orderTrend[orderTrend.length - 1] ?? todayOrders,
      orderTrend[orderTrend.length - 2] ?? 0
    );
    const postRate = buildRate(
      postTrend[postTrend.length - 1] ?? todayPosts,
      postTrend[postTrend.length - 2] ?? 0
    );
    const staffRate = buildRate(
      staffTrend[staffTrend.length - 1] ?? staffs.length,
      staffTrend[staffTrend.length - 2] ?? 0
    );

    return {
      registeredTotal: formatNumber(users.length),
      serviceTotal: formatNumber(serviceTotal),
      mapTotal: formatNumber(mapTotal),
      healthScore: `${((healthyCount / healthTotal) * 100).toFixed(1)}%`,
      stats: [
        {
          label: "在册用户总数",
          value: formatNumber(users.length),
          unit: "人",
          compareLabel: "较上月",
          rate: userRate.rate,
          direction: userRate.direction,
          icon: "users",
          tone: "mint",
          spark: buildSparkline(userTrend)
        },
        {
          label: "今日工单数量",
          value: formatNumber(todayWorkOrders),
          unit: "次",
          compareLabel: "较昨日",
          rate: workOrderRate.rate,
          direction: workOrderRate.direction,
          icon: "heart",
          tone: "blue",
          spark: buildSparkline(workOrderTrend)
        },
        {
          label: "今日订单数量",
          value: formatNumber(todayOrders),
          unit: "单",
          compareLabel: "较昨日",
          rate: orderRate.rate,
          direction: orderRate.direction,
          icon: "shield",
          tone: "rose",
          spark: buildSparkline(orderTrend)
        },
        {
          label: "新增动态数量",
          value: formatNumber(todayPosts),
          unit: "条",
          compareLabel: "较昨日",
          rate: postRate.rate,
          direction: postRate.direction,
          icon: "building",
          tone: "teal",
          spark: buildSparkline(postTrend)
        },
        {
          label: "服务人员总数",
          value: formatNumber(staffs.length),
          unit: "人",
          compareLabel: "较上月",
          rate: staffRate.rate,
          direction: staffRate.direction,
          icon: "staff",
          tone: "pink",
          spark: buildSparkline(staffTrend)
        }
      ],
      serviceTypes: serviceCounts.map((item) => ({
        label: item.label,
        count: formatNumber(item.count),
        percent: formatPercent(item.count, serviceTotal),
        value: Math.max(1, Math.round((item.count / serviceTotal) * 100)),
        color: item.color,
        highlightColor: item.highlightColor
      })),
      serviceTrend: {
        labels: trendLabels,
        values: workOrderTrend,
        current: formatNumber(workOrderTrend[workOrderTrend.length - 1] ?? 0)
      },
      mapPoints: mapPoints.map((item) => ({
        name: item.name,
        value: item.value,
        coordinate: item.coordinate
      })),
      ageGroups: ageCounts.map((item) => ({
        label: item.label,
        count: formatNumber(item.count),
        value: Math.max(1, Math.round((item.count / ageTotal) * 100)),
        percent: formatPercent(item.count, ageTotal),
        color: item.color,
        highlightColor: item.highlightColor
      })),
      healthStatus: healthCounts.map((item) => ({
        label: item.label,
        count: formatNumber(item.count),
        value: Math.max(1, Math.round((item.count / healthTotal) * 100)),
        percent: formatPercent(item.count, healthTotal),
        color: item.color,
        highlightColor: item.highlightColor
      })),
      userTags: {
        total: formatNumber(tagCounts.reduce((sum, [, count]) => sum + count, 0)),
        items: tagCounts.map(([label, count]) => ({
          label,
          count: `${formatNumber(count)}人`,
          value: `${Math.max(16.7, (count / Math.max(tagCounts[0]?.[1] ?? 1, 1)) * 100).toFixed(1)}%`
        }))
      },
      alerts: [
        {
          label: "待处理紧急工单",
          value: formatNumber(pendingWorkOrderCount),
          unit: "件",
          compare: `较昨日 ↑ ${Math.max(todayWorkOrders - yesterdayWorkOrders, 0)}`,
          icon: "warning",
          tone: "rose"
        },
        {
          label: "独居老人预警",
          value: formatNumber(pendingAfterSaleCount),
          unit: "人",
          compare: `较昨日 ↑ ${Math.max((afterSaleTrend[afterSaleTrend.length - 1] ?? pendingAfterSaleCount) - yesterdayAfterSales, 0)}`,
          icon: "elder",
          tone: "amber"
        },
        {
          label: "用药提醒未处理",
          value: formatNumber(activeMedicationCount),
          unit: "人",
          compare: `较昨日 ↑ ${Math.max(Math.round(activeMedicationCount * 0.08), 1)}`,
          icon: "medicine",
          tone: "yellow"
        },
        {
          label: "身体健康预警",
          value: formatNumber(openHealthAlertCount),
          unit: "人",
          compare: `较昨日 ↑ ${Math.max((healthAlertTrend[healthAlertTrend.length - 1] ?? openHealthAlertCount) - yesterdayHealthAlerts, 0)}`,
          icon: "bed",
          tone: "blue"
        }
      ],
      workloadTop: services.slice(0, 5).map((item, index) => ({
        rank: index + 1,
        name: item.title,
        rate: `${Math.max(
          16,
          Math.round((item.salesVolume / Math.max(services[0]?.salesVolume ?? 1, 1)) * 100)
        )}%`
      }))
    };
  }

  async getAdminBookingBoard(date?: string, serviceType?: string, staffId?: string) {
    const targetDate = date ?? toDateString(new Date()) ?? "";
    const workOrders = await this.prismaService.workOrder.findMany({
      include: {
        assignee: true,
        order: {
          include: {
            owner: true,
            service: true
          }
        }
      },
      orderBy: { scheduleAt: "asc" }
    });

    const filtered = workOrders.filter((item) => {
      const bookingDate = toDateString(item.scheduleAt ?? item.order.bookingDate);
      const typeText = this.getServiceCategoryText(item.order.service.category);
      const matchesDate = !targetDate || bookingDate === targetDate;
      const matchesType = !serviceType || serviceType === "全部类型" || typeText === serviceType;
      const matchesStaff = !staffId || item.assigneeStaffId === staffId;
      return matchesDate && matchesType && matchesStaff;
    });

    const staffOptions = Array.from(
      new Set(
        filtered
          .map((item) => item.assignee?.name ?? item.assigneeName)
          .filter((item): item is string => Boolean(item))
      )
    );

    return {
      title: "预约看板",
      defaultDate: targetDate,
      staffOptions: ["全部服务人员", ...staffOptions],
      serviceTypeOptions: ["全部类型", "康复训练", "家政护理", "上门检测"],
      timeSlots: [9, 10, 11, 12, 13, 14, 15, 16, 17],
      bookings: filtered.map((item, index) => {
        const bookingWindow = item.order.bookingTimeSlot ?? "09:00-10:00";
        const [startText, endText] = bookingWindow.split("-");
        const startHour = Number(startText?.split(":")[0] ?? 9);
        const endHour = Number(endText?.split(":")[0] ?? startHour + 1);
        const typeText = this.getServiceCategoryText(item.order.service.category);
        return {
          id: item.id,
          date: toDateString(item.scheduleAt ?? item.order.bookingDate) ?? targetDate,
          title: item.order.service.title,
          timeLabel: bookingWindow,
          userName:
            item.order.owner.realName ?? item.order.owner.nickname ?? item.order.owner.phone,
          serviceType:
            typeText === "康复理疗"
              ? "康复训练"
              : typeText === "上门体检"
                ? "上门检测"
                : typeText,
          staffs: [item.assignee?.name ?? item.assigneeName ?? "待分配"],
          avatars: [item.assignee?.avatarUrl ?? null].filter(Boolean),
          status: this.getAdminBookingStatusText(item.status),
          tone: item.status === WorkOrderStatus.COMPLETED ? "amber" : item.status === WorkOrderStatus.SERVING ? "green" : "red",
          startHour,
          endHour,
          lane: (index % 2) + 1,
          laneSpan: 1
        };
      })
    };
  }

  async listAdminWorkOrders(
    page: number,
    pageSize: number,
    status?: WorkOrderStatus,
    serviceCategory?: ServiceCategory,
    keyword?: string
  ) {
    const normalizedKeyword = keyword?.trim().toLowerCase();
    const workOrders = await this.prismaService.workOrder.findMany({
      where: {
        status: status ?? undefined
      },
      include: {
        order: {
          include: {
            service: true,
            owner: true
          }
        },
        assignee: true,
        institution: true
      },
      orderBy: { createdAt: "desc" }
    });

    const rows = workOrders
      .filter((item) => {
        const matchesCategory =
          !serviceCategory || item.order.service.category === serviceCategory;
        const matchesKeyword =
          !normalizedKeyword ||
          [
            item.id,
            item.order.orderNo,
            item.order.service.title,
            item.order.owner.realName,
            item.order.owner.phone
          ]
            .filter(Boolean)
            .some((field) => String(field).toLowerCase().includes(normalizedKeyword));

        return matchesCategory && matchesKeyword;
      })
      .map((item) => ({
        workOrderId: item.id,
        orderId: item.orderId,
        orderNo: item.order.orderNo,
        status: item.status,
        statusText: this.getAdminWorkOrderStatusText(item.status),
        serviceCategory: item.order.service.category,
        serviceCategoryText: this.getServiceCategoryText(item.order.service.category),
        serviceTitle: item.order.service.title,
        serviceSummary: item.order.service.summary,
        serviceCover: item.order.service.coverUrl,
        assigneeName: item.assignee?.name ?? item.assigneeName ?? null,
        institutionName: item.institution?.name ?? item.institutionName ?? null,
        customerName:
          item.order.owner.realName ?? item.order.owner.nickname ?? item.order.owner.phone,
        customerPhone: item.order.owner.phone,
        customerAvatar: item.order.owner.avatarUrl,
        bookingDate: toDateString(item.order.bookingDate),
        bookingTimeSlot: item.order.bookingTimeSlot,
        scheduleAt: toDateTimeString(item.scheduleAt),
        createdAt: toDateTimeString(item.createdAt),
        payableAmount: toNumber(item.order.payableAmount),
        dispatchNote: item.dispatchNote,
        agentDispatchSuggestion: item.agentDispatchSuggestion,
        actions: this.buildAdminWorkOrderActions(item.status)
      }));

    const result = paginate(rows, page, pageSize);

    return {
      title: "工单管理",
      serviceTypes: ["全部类型", "家政护工", "康复理疗", "上门体检"],
      statusTabs: ["待服务", "服务中", "已完成", "已取消"],
      rows: result.list,
      ...result
    };
  }

  async getAdminWorkOrderDetail(workOrderId: string) {
    const workOrder = await this.prismaService.workOrder.findUnique({
      where: { id: workOrderId },
      include: {
        assignee: true,
        institution: true,
        order: {
          include: {
            owner: true,
            service: true,
            timeline: {
              orderBy: { createdAt: "asc" }
            }
          }
        }
      }
    });

    if (!workOrder) {
      throw new NotFoundException("Work order not found");
    }

    return {
      workOrderId: workOrder.id,
      orderNo: workOrder.order.orderNo,
      status: workOrder.status,
      statusText: this.getAdminWorkOrderStatusText(workOrder.status),
      service: {
        title: workOrder.order.service.title,
        summary: workOrder.order.service.summary,
        cover: workOrder.order.service.coverUrl,
        category: this.getServiceCategoryText(workOrder.order.service.category)
      },
      customer: {
        name:
          workOrder.order.owner.realName ??
          workOrder.order.owner.nickname ??
          workOrder.order.owner.phone,
        phone: workOrder.order.owner.phone,
        avatar: workOrder.order.owner.avatarUrl
      },
      assignee: {
        name: workOrder.assignee?.name ?? workOrder.assigneeName,
        avatar: workOrder.assignee?.avatarUrl ?? null
      },
      institutionName: workOrder.institution?.name ?? workOrder.institutionName,
      bookingTime: `${toDateString(workOrder.order.bookingDate) ?? "-"} ${workOrder.order.bookingTimeSlot ?? ""}`.trim(),
      scheduleAt: toDateTimeString(workOrder.scheduleAt),
      dispatchNote: workOrder.dispatchNote,
      timeline: workOrder.order.timeline.map((item) => ({
        timelineId: item.id,
        title: item.title,
        description: item.description,
        createdAt: toDateTimeString(item.createdAt)
      }))
    };
  }

  async listAdminHealthAlerts(
    page: number,
    pageSize: number,
    level?: AlertLevel,
    status?: AlertStatus,
    keyword?: string
  ) {
    const normalizedKeyword = keyword?.trim().toLowerCase();
    const alerts = await this.prismaService.healthAlert.findMany({
      where: {
        level: level ?? undefined,
        status: status ?? undefined
      },
      include: {
        owner: {
          select: {
            id: true,
            realName: true,
            nickname: true,
            phone: true,
            avatarUrl: true
          }
        },
        metricRecord: true,
        handler: true
      },
      orderBy: { triggeredAt: "desc" }
    });

    const rows = alerts
      .map((item) => this.toAdminHealthAlertRow(item))
      .filter((item) => {
        if (!normalizedKeyword) {
          return true;
        }

        return [
          item.title,
          item.summary,
          item.ownerName,
          item.ownerPhone,
          item.relatedMetric
        ]
          .filter(Boolean)
          .some((field) => String(field).toLowerCase().includes(normalizedKeyword));
      });
    const result = paginate(rows, page, pageSize);

    return {
      title: "健康告警",
      summary: "生命体征异常、重点长者关注、报告复核和干预闭环。",
      levelOptions: ["全部等级", "高风险", "中风险", "低风险"],
      statusOptions: ["全部状态", "待回访", "处理中", "已关闭"],
      ...result
    };
  }

  async getAdminHealthAlertDetail(alertId: string) {
    const alert = await this.prismaService.healthAlert.findUnique({
      where: { id: alertId },
      include: {
        owner: {
          select: {
            id: true,
            realName: true,
            nickname: true,
            phone: true,
            avatarUrl: true
          }
        },
        archive: true,
        metricRecord: true,
        handler: true
      }
    });

    if (!alert) {
      throw new NotFoundException("Health alert not found");
    }

    const row = this.toAdminHealthAlertRow(alert);
    const suggestion = ensureRecord(alert.suggestion);

    return {
      ...row,
      suggestion,
      riskSignals: this.readSuggestionList(suggestion, [
        "riskSignals",
        "signals",
        "异常信号"
      ]),
      followUpSuggestions: this.readSuggestionList(suggestion, [
        "followUpSuggestions",
        "recommendedActions",
        "actions",
        "回访建议"
      ]),
      archiveTags: ensureArray<string>(alert.archive?.riskTags),
      metricValue: alert.metricRecord?.value ?? null,
      handlerName: alert.handler?.name ?? null
    };
  }

  async updateAdminOrderPrice(
    adminUser: AuthenticatedUser,
    orderId: string,
    payableAmount: number,
    remark?: string
  ) {
    const order = await this.prismaService.order.findUnique({
      where: { id: orderId }
    });

    if (!order) {
      throw new NotFoundException("Order not found");
    }

    const updated = await this.prismaService.$transaction(async (tx) => {
      const next = await tx.order.update({
        where: { id: orderId },
        data: {
          payableAmount,
          actualAmount: order.actualAmount ? payableAmount : order.actualAmount,
          remark: remark ?? order.remark
        }
      });

      await tx.orderTimeline.create({
        data: {
          orderId,
          status: next.status,
          title: "后台改价",
          description: remark ?? `调整为 ${payableAmount.toFixed(2)} 元`,
          operatorName: adminUser.realName ?? adminUser.phone
        }
      });

      return next;
    });

    return {
      orderId: updated.id,
      payableAmount: toNumber(updated.payableAmount)
    };
  }

  async closeAdminOrder(
    adminUser: AuthenticatedUser,
    orderId: string,
    reason?: string
  ) {
    const order = await this.prismaService.order.findUnique({
      where: { id: orderId }
    });

    if (!order) {
      throw new NotFoundException("Order not found");
    }

    const updated = await this.prismaService.$transaction(async (tx) => {
      const next = await tx.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.CANCELLED,
          cancelledAt: new Date(),
          remark: reason ?? order.remark
        }
      });

      await tx.orderTimeline.create({
        data: {
          orderId,
          status: OrderStatus.CANCELLED,
          title: "后台关闭订单",
          description: reason ?? "后台手动关单",
          operatorName: adminUser.realName ?? adminUser.phone
        }
      });

      return next;
    });

    return {
      orderId: updated.id,
      status: updated.status
    };
  }

  async saveAdminOrderRemark(
    adminUser: AuthenticatedUser,
    orderId: string,
    remark: string
  ) {
    await this.prismaService.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: orderId },
        data: {
          remark
        }
      });

      await tx.orderTimeline.create({
        data: {
          orderId,
          title: "更新订单备注",
          description: remark,
          operatorName: adminUser.realName ?? adminUser.phone
        }
      });
    });

    return {
      orderId,
      remark
    };
  }

  async getAdminOrderTimeline(orderId: string) {
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

  async listAdminAfterSales(
    page: number,
    pageSize: number,
    status?: string,
    keyword?: string
  ) {
    const normalizedKeyword = keyword?.trim().toLowerCase();
    const requests = await this.prismaService.afterSaleRequest.findMany({
      include: {
        order: {
          include: {
            service: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    const rows = requests
      .filter((item) => {
        const statusText = this.getAdminAfterSaleStatusText(item.status);
        const matchesStatus = !status || status === "全部" || statusText === status;
        const matchesKeyword =
          !normalizedKeyword ||
          [item.id, item.order.orderNo, item.order.service.title]
            .some((field) => String(field).toLowerCase().includes(normalizedKeyword));
        return matchesStatus && matchesKeyword;
      })
      .map((item) => ({
        orderId: item.order.id,
        orderNo: item.order.orderNo,
        afterSaleNo: item.id,
        title: item.order.service.title,
        image: item.order.service.coverUrl,
        paidAmount: (toNumber(item.order.actualAmount) ?? toNumber(item.order.payableAmount) ?? 0).toFixed(2),
        refundAmount: (toNumber(item.amountRequested) ?? 0).toFixed(2),
        status: this.getAdminAfterSaleStatusText(item.status),
        appliedAt: this.toDisplayDateTime(item.createdAt)
      }));

    const result = paginate(rows, page, pageSize);

    return {
      title: "售后管理",
      statusTabs: ["全部", "处理中", "售后完成", "售后关闭"],
      rows: result.list,
      ...result
    };
  }

  async getAdminAfterSaleDetail(afterSaleId: string) {
    const afterSale = await this.prismaService.afterSaleRequest.findUnique({
      where: { id: afterSaleId },
      include: {
        order: {
          include: {
            owner: true,
            service: true
          }
        }
      }
    });

    if (!afterSale) {
      throw new NotFoundException("After sale not found");
    }

    const detailStatus = this.getAdminAfterSaleStatusText(afterSale.status);
    const deadlineAt =
      afterSale.status === AfterSaleStatus.SUBMITTED || afterSale.status === AfterSaleStatus.PROCESSING
        ? new Date(afterSale.createdAt.getTime() + 24 * 60 * 60 * 1000).toISOString()
        : "";

    return {
      title: "售后详情",
      status: detailStatus,
      statusTone:
        detailStatus === "售后完成" ? "green" : detailStatus === "售后关闭" ? "gray" : "rose",
      statusTitle:
        detailStatus === "售后完成"
          ? "本次售后已处理完成"
          : detailStatus === "售后关闭"
            ? "本次售后已关闭"
            : "买家已申请退款，等待卖家处理中",
      statusDescription:
        detailStatus === "售后完成"
          ? "退款结果已同步给用户，资金将按照原支付渠道退回，请持续关注到账进度。"
          : detailStatus === "售后关闭"
            ? "本次退款申请已关闭，如用户仍有异议，可继续沟通后再次发起售后申请。"
            : "用户提交的退款申请已进入处理流程，请在处理时效内完成审核并同步售后结果。",
      deadlineAt,
      afterSaleId: afterSale.id,
      orderId: afterSale.orderId,
      afterSaleNo: afterSale.id,
      orderNo: afterSale.order.orderNo,
      buyerName:
        afterSale.order.owner.realName ??
        afterSale.order.owner.nickname ??
        afterSale.order.owner.phone,
      buyerId: afterSale.order.owner.id,
      buyerPhone: afterSale.order.owner.phone,
      buyerAvatar: afterSale.order.owner.avatarUrl,
      contactName: String(ensureRecord(afterSale.order.contactSnapshot).name ?? ensureRecord(afterSale.order.contactSnapshot).contactName ?? ""),
      applicationReason: afterSale.reason,
      handleRemark: afterSale.description ?? "",
      paidAmount: (toNumber(afterSale.order.actualAmount) ?? toNumber(afterSale.order.payableAmount) ?? 0).toFixed(2),
      refundAmount: (toNumber(afterSale.amountRequested) ?? 0).toFixed(2),
      userFields: [
        { label: "手机号", value: afterSale.order.owner.phone },
        { label: "联系人", value: String(ensureRecord(afterSale.order.contactSnapshot).name ?? "") || "待确认" },
        { label: "联系号码", value: String(ensureRecord(afterSale.order.contactSnapshot).phone ?? "") || "待确认" },
        { label: "服务地址", value: this.buildAddressText(ensureRecord(afterSale.order.addressSnapshot)) || "待确认" },
        { label: "用户备注", value: afterSale.order.remark ?? "暂无备注" }
      ],
      refundFields: [
        { label: "售后编号", value: afterSale.id },
        { label: "售后结果", value: detailStatus },
        { label: "处理节点", value: detailStatus === "处理中" ? "待客服审核" : detailStatus },
        { label: "申请时间", value: this.toDisplayDateTime(afterSale.createdAt) },
        { label: "退款金额", value: `¥${(toNumber(afterSale.amountRequested) ?? 0).toFixed(2)}` },
        { label: "实付金额", value: `¥${(toNumber(afterSale.order.actualAmount) ?? toNumber(afterSale.order.payableAmount) ?? 0).toFixed(2)}` },
        { label: "申请说明", value: afterSale.reason },
        { label: "处理说明", value: afterSale.description ?? "暂无" }
      ],
      orderFields: [
        { label: "订单编号", value: afterSale.order.orderNo },
        { label: "下单时间", value: this.toDisplayDateTime(afterSale.order.createdAt) },
        { label: "支付方式", value: "-" },
        {
          label: "预约时间",
          value: `${toDateString(afterSale.order.bookingDate) ?? "-"} ${afterSale.order.bookingTimeSlot ?? ""}`.trim()
        },
        { label: "服务时长", value: this.getServiceDurationText(afterSale.order.service.durationMinutes) },
        { label: "服务人员", value: "待确认" },
        { label: "订单备注", value: afterSale.order.remark ?? "暂无订单备注" }
      ],
      productTitle: afterSale.order.service.title,
      productImage: afterSale.order.service.coverUrl,
      productSummary: afterSale.order.service.summary ?? "",
      serviceWindow: `${toDateString(afterSale.order.bookingDate) ?? "-"} ${afterSale.order.bookingTimeSlot ?? ""}`.trim(),
      serviceStaff: "待分配"
    };
  }

  async approveAdminAfterSale(
    adminUser: AuthenticatedUser,
    afterSaleId: string,
    remark?: string,
    refundAmount?: number
  ) {
    const afterSale = await this.prismaService.afterSaleRequest.findUnique({
      where: { id: afterSaleId }
    });

    if (!afterSale) {
      throw new NotFoundException("After sale not found");
    }

    await this.prismaService.$transaction(async (tx) => {
      await tx.afterSaleRequest.update({
        where: { id: afterSaleId },
        data: {
          status: AfterSaleStatus.RESOLVED,
          description: remark ?? afterSale.description,
          amountRequested: refundAmount ?? afterSale.amountRequested,
          resolvedAt: new Date()
        }
      });

      await tx.order.update({
        where: { id: afterSale.orderId },
        data: {
          status: OrderStatus.AFTER_SALE
        }
      });

      await tx.orderTimeline.create({
        data: {
          orderId: afterSale.orderId,
          status: OrderStatus.AFTER_SALE,
          title: "售后已审核通过",
          description: remark ?? "同意退款",
          operatorName: adminUser.realName ?? adminUser.phone
        }
      });
    });

    return {
      afterSaleId,
      status: AfterSaleStatus.RESOLVED
    };
  }

  async rejectAdminAfterSale(
    adminUser: AuthenticatedUser,
    afterSaleId: string,
    remark?: string
  ) {
    const afterSale = await this.prismaService.afterSaleRequest.findUnique({
      where: { id: afterSaleId }
    });

    if (!afterSale) {
      throw new NotFoundException("After sale not found");
    }

    await this.prismaService.$transaction(async (tx) => {
      await tx.afterSaleRequest.update({
        where: { id: afterSaleId },
        data: {
          status: AfterSaleStatus.REJECTED,
          description: remark ?? afterSale.description,
          resolvedAt: new Date()
        }
      });

      await tx.orderTimeline.create({
        data: {
          orderId: afterSale.orderId,
          status: OrderStatus.AFTER_SALE,
          title: "售后已驳回",
          description: remark ?? "平台已驳回售后申请",
          operatorName: adminUser.realName ?? adminUser.phone
        }
      });
    });

    return {
      afterSaleId,
      status: AfterSaleStatus.REJECTED
    };
  }

  async closeAdminAfterSale(
    adminUser: AuthenticatedUser,
    afterSaleId: string,
    remark?: string
  ) {
    const afterSale = await this.prismaService.afterSaleRequest.findUnique({
      where: { id: afterSaleId }
    });

    if (!afterSale) {
      throw new NotFoundException("After sale not found");
    }

    await this.prismaService.$transaction(async (tx) => {
      await tx.afterSaleRequest.update({
        where: { id: afterSaleId },
        data: {
          status: AfterSaleStatus.CLOSED,
          description: remark ?? afterSale.description,
          resolvedAt: new Date()
        }
      });

      await tx.orderTimeline.create({
        data: {
          orderId: afterSale.orderId,
          status: OrderStatus.AFTER_SALE,
          title: "售后已关闭",
          description: remark ?? "平台已关闭售后申请",
          operatorName: adminUser.realName ?? adminUser.phone
        }
      });
    });

    return {
      afterSaleId,
      status: AfterSaleStatus.CLOSED
    };
  }

  async listAdminOrderReviews(
    page: number,
    pageSize: number,
    serviceType?: string,
    rating?: number,
    isPinned?: boolean
  ) {
    const reviews = await this.prismaService.orderReview.findMany({
      where: {
        deletedAt: null,
        isPinned: isPinned ?? undefined,
        score: rating ?? undefined
      },
      include: {
        order: {
          include: {
            service: true
          }
        },
        user: true
      },
      orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }]
    });

    const rows = reviews
      .filter((item) => {
        const typeText = this.getServiceCategoryText(item.order.service.category);
        return !serviceType || serviceType === "全部类型" || typeText === serviceType;
      })
      .map((item) => ({
        id: item.id,
        orderId: item.order.id,
        orderNo: item.order.orderNo,
        productCode: item.order.service.code,
        title: item.order.service.title,
        image: item.order.service.coverUrl,
        serviceType: this.getServiceCategoryText(item.order.service.category),
        rating: item.score,
        buyerName: item.user.realName ?? item.user.nickname ?? item.user.phone,
        buyerPhone: item.user.phone,
        buyerAvatar: item.user.avatarUrl,
        reviewedAt: this.toDisplayDateTime(item.createdAt),
        isVisible: item.isVisible,
        isPinned: item.isPinned,
        reviewText: item.content ?? "",
        replyText: "",
        gallery: []
      }));

    const result = paginate(rows, page, pageSize);

    return {
      title: "评价管理",
      serviceTypes: ["全部类型", "家政护工", "康复理疗", "上门体检"],
      ratingOptions: ["全部评分", "5星", "4星", "3星", "2星及以下"],
      pinOptions: ["全部", "已置顶", "未置顶"],
      rows: result.list,
      ...result
    };
  }

  async getAdminOrderReviewDetail(reviewId: string) {
    const review = await this.prismaService.orderReview.findUnique({
      where: { id: reviewId },
      include: {
        order: {
          include: {
            service: true
          }
        },
        user: true
      }
    });

    if (!review) {
      throw new NotFoundException("Review not found");
    }

    return {
      reviewId: review.id,
      orderNo: review.order.orderNo,
      productCode: review.order.service.code,
      title: review.order.service.title,
      image: review.order.service.coverUrl,
      serviceType: this.getServiceCategoryText(review.order.service.category),
      rating: review.score,
      buyerName: review.user.realName ?? review.user.nickname ?? review.user.phone,
      buyerPhone: review.user.phone,
      buyerAvatar: review.user.avatarUrl,
      reviewedAt: this.toDisplayDateTime(review.createdAt),
      isVisible: review.isVisible,
      isPinned: review.isPinned,
      reviewText: review.content ?? "",
      replyText: "",
      gallery: [],
      tags: ensureArray<string>(review.tags)
    };
  }

  async updateAdminOrderReviewVisibility(reviewId: string, isVisible: boolean) {
    await this.prismaService.orderReview.update({
      where: { id: reviewId },
      data: {
        isVisible
      }
    });

    return {
      reviewId,
      isVisible
    };
  }

  async updateAdminOrderReviewPin(reviewId: string, isPinned: boolean) {
    await this.prismaService.orderReview.update({
      where: { id: reviewId },
      data: {
        isPinned
      }
    });

    return {
      reviewId,
      isPinned
    };
  }

  async deleteAdminOrderReview(reviewId: string) {
    await this.prismaService.orderReview.update({
      where: { id: reviewId },
      data: {
        deletedAt: new Date()
      }
    });

    return {
      deleted: true,
      reviewId
    };
  }

  async batchOperateAdminOrderReviews(
    reviewIds: string[],
    action: "SHOW" | "HIDE" | "PIN" | "UNPIN" | "DELETE"
  ) {
    const data =
      action === "SHOW"
        ? { isVisible: true }
        : action === "HIDE"
          ? { isVisible: false }
          : action === "PIN"
            ? { isPinned: true }
            : action === "UNPIN"
              ? { isPinned: false }
              : { deletedAt: new Date() };

    const result = await this.prismaService.orderReview.updateMany({
      where: {
        id: {
          in: reviewIds
        }
      },
      data
    });

    return {
      updated: result.count
    };
  }

  async dispatchOrder(
    adminUser: AuthenticatedUser,
    orderId: string,
    payload: {
      institutionId?: string;
      assigneeStaffId?: string;
      scheduleId?: string;
      scheduleAt?: string;
      timeSlot?: string;
      dispatchNote?: string;
      remark?: string;
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
    const parsedScheduleAt =
      payload.scheduleAt && !Number.isNaN(new Date(payload.scheduleAt).getTime())
        ? new Date(payload.scheduleAt)
        : null;
    const dispatchNote = payload.dispatchNote ?? payload.remark;

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
              scheduleAt: schedule?.startAt ?? parsedScheduleAt ?? workOrder.scheduleAt,
              dispatchNote: dispatchNote ?? workOrder.dispatchNote
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
              scheduleAt: schedule?.startAt ?? parsedScheduleAt ?? null,
              dispatchNote
            }
          });

      await tx.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.DISPATCHING,
          bookingDate: parsedScheduleAt ?? order.bookingDate,
          bookingTimeSlot: payload.timeSlot ?? order.bookingTimeSlot
        }
      });

      await tx.orderTimeline.create({
        data: {
          orderId,
          status: OrderStatus.DISPATCHING,
          title: "后台已派单",
          description: dispatchNote ?? "已分配服务人员",
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

  private toAdminHealthAlertRow(alert: {
    id: string;
    level: AlertLevel;
    status: AlertStatus;
    sourceType: string;
    title: string;
    summary: string;
    suggestion: unknown;
    triggeredAt: Date;
    handledAt: Date | null;
    owner: {
      id: string;
      realName: string | null;
      nickname: string | null;
      phone: string;
      avatarUrl?: string | null;
    };
    metricRecord?: {
      metricType: MetricType;
    } | null;
  }) {
    const suggestion = ensureRecord(alert.suggestion);
    const actions = this.readSuggestionList(suggestion, [
      "followUpSuggestions",
      "recommendedActions",
      "actions",
      "回访建议"
    ]);

    return {
      alertId: alert.id,
      level: alert.level,
      levelText: this.getAlertLevelText(alert.level),
      status: alert.status,
      statusText: this.getAlertStatusText(alert.status),
      sourceType: alert.sourceType,
      title: alert.title,
      summary: alert.summary,
      relatedMetric: alert.metricRecord ? this.metricLabel(alert.metricRecord.metricType) : null,
      ownerId: alert.owner.id,
      ownerName: alert.owner.realName ?? alert.owner.nickname ?? alert.owner.phone,
      ownerPhone: alert.owner.phone,
      ownerAvatar: alert.owner.avatarUrl ?? null,
      followUpSuggestion:
        actions[0] ?? String(suggestion.summary ?? suggestion.suggestion ?? "建议客服进行人工回访确认。"),
      triggeredAt: toDateTimeString(alert.triggeredAt),
      handledAt: toDateTimeString(alert.handledAt)
    };
  }

  private getAlertLevelText(level: AlertLevel) {
    switch (level) {
      case AlertLevel.CRITICAL:
        return "紧急风险";
      case AlertLevel.HIGH:
        return "高风险";
      case AlertLevel.MEDIUM:
        return "中风险";
      case AlertLevel.LOW:
        return "低风险";
    }
  }

  private getAlertStatusText(status: AlertStatus) {
    switch (status) {
      case AlertStatus.OPEN:
        return "待回访";
      case AlertStatus.ACKNOWLEDGED:
        return "处理中";
      case AlertStatus.RESOLVED:
        return "已关闭";
      case AlertStatus.CLOSED:
        return "已关闭";
    }
  }

  private readSuggestionList(record: Record<string, unknown>, keys: string[]) {
    for (const key of keys) {
      const value = record[key];

      if (Array.isArray(value)) {
        return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
      }

      if (typeof value === "string" && value.trim()) {
        return [value.trim()];
      }
    }

    return [];
  }

  private metricLabel(metricType: MetricType) {
    const labels: Record<MetricType, string> = {
      [MetricType.STEPS]: "步数",
      [MetricType.HEART_RATE]: "心率",
      [MetricType.SLEEP]: "睡眠",
      [MetricType.WEIGHT]: "体重",
      [MetricType.BLOOD_GLUCOSE]: "血糖",
      [MetricType.BLOOD_PRESSURE]: "血压",
      [MetricType.OXYGEN]: "血氧",
      [MetricType.STRESS]: "压力",
      [MetricType.TEMPERATURE]: "体温"
    };

    return labels[metricType] ?? metricType;
  }

  private getServiceCategoryText(category: ServiceCategory) {
    switch (category) {
      case ServiceCategory.HOME_CARE:
        return "家政护工";
      case ServiceCategory.REHAB_THERAPY:
        return "康复理疗";
      case ServiceCategory.HOME_EXAM:
        return "上门体检";
      case ServiceCategory.ELDERLY_CARE:
        return "养老机构";
    }
  }

  private getPaymentChannelText(channel: PaymentChannel) {
    switch (channel) {
      case PaymentChannel.WECHAT:
        return "微信支付";
      case PaymentChannel.ALIPAY:
        return "支付宝";
      case PaymentChannel.BALANCE:
        return "余额";
      case PaymentChannel.OFFLINE:
        return "线下";
    }
  }

  private buildAdminOrderListRow(item: {
    orderNo: string;
    status: OrderStatus;
    title: string;
    image: string | null;
    createdAt: string | null;
    source: string;
    ownerId: string;
    ownerName: string;
    ownerPhone: string;
    ownerAvatar: string | null;
    ownerCreatedAt: string | null;
    ownerLastLoginAt: string | null;
    serviceCategoryText: string;
    serviceSummary: string | null;
    originalAmount: number | null;
    discountAmount: number | null;
    payableAmount: number | null;
    actualAmount: number | null;
    paymentChannelText: string | null;
    paidAt: string | null;
    completedAt: string | null;
    cancelledAt: string | null;
    contactName: string;
    contactPhone: string;
    addressText: string;
    bookingDate: string | null;
    bookingTimeSlot: string | null;
    serviceDurationText?: string | null;
    remark: string | null;
    assigneeName: string | null;
    healthSummary?: unknown;
    aiSummary?: unknown;
    agentDispatchSuggestion?: unknown;
    afterSaleId: string | null;
    afterSaleStatus: AfterSaleStatus | null;
    afterSaleReason: string | null;
  }) {
    const status = this.getAdminOrderPageStatus(item.status, item.afterSaleId);
    const settleAmount = item.actualAmount ?? item.payableAmount ?? 0;

    return {
      id: item.orderNo,
      orderTime: this.toDisplayDateTime(item.createdAt) ?? "-",
      settleLabel: item.status === OrderStatus.PENDING_PAYMENT ? "应付款" : "实付款",
      settleAmount: settleAmount.toFixed(2),
      title: item.title,
      image: item.image,
      price: (item.payableAmount ?? 0).toFixed(2),
      originalPrice: (item.originalAmount ?? item.payableAmount ?? 0).toFixed(2),
      discountAmount: (item.discountAmount ?? 0).toFixed(2),
      buyerName: item.ownerName,
      buyerId: item.ownerId,
      buyerPhone: item.ownerPhone,
      buyerAvatar: item.ownerAvatar,
      status,
      payment: item.paymentChannelText ?? "-",
      serviceType: item.serviceCategoryText,
      serviceSummary: item.serviceSummary ?? "",
      actions: this.buildAdminOrderRowActions(item.status, Boolean(item.afterSaleId)),
      orderSource: String(item.source ?? "app").toUpperCase(),
      registerTime: this.toDisplayDateTime(item.ownerCreatedAt) ?? "-",
      registerMethod: item.source === "admin" ? "后台录入" : "APP端注册",
      lastLoginTime: this.toDisplayDateTime(item.ownerLastLoginAt) ?? "-",
      lastPurchaseTime: this.toDisplayDateTime(item.paidAt ?? item.createdAt) ?? "-",
      userRemark: "",
      orderRemark: item.remark ?? "",
      contactName: item.contactName || item.ownerName,
      contactPhone: item.contactPhone || item.ownerPhone,
      serviceAddress: item.addressText,
      appointmentTime: `${item.bookingDate ?? "-"} ${item.bookingTimeSlot ?? ""}`.trim(),
      duration: item.serviceDurationText ?? "-",
      paymentTime: this.toDisplayDateTime(item.paidAt) ?? undefined,
      acceptedTime: undefined,
      completedTime: this.toDisplayDateTime(item.completedAt) ?? undefined,
      closedTime: this.toDisplayDateTime(item.cancelledAt) ?? undefined,
      closeReason: item.status === OrderStatus.CANCELLED ? item.remark ?? "后台关闭订单" : undefined,
      serviceCode: item.assigneeName ? `SV-${item.orderNo.slice(-6)}` : undefined,
      serviceStaff: item.assigneeName ?? undefined,
      verifier: item.status === OrderStatus.COMPLETED ? item.assigneeName ?? undefined : undefined,
      afterSaleNo: item.afterSaleId ?? undefined,
      afterSaleReason: item.afterSaleReason ?? undefined,
      afterSaleStatus: item.afterSaleStatus
        ? this.getAdminAfterSaleStatusText(item.afterSaleStatus)
        : undefined,
      healthSummary: item.healthSummary,
      aiSummary: item.aiSummary,
      agentDispatchSuggestion: item.agentDispatchSuggestion,
      paymentDeadlineAt:
        item.status === OrderStatus.PENDING_PAYMENT && item.createdAt
          ? new Date(new Date(item.createdAt).getTime() + 15 * 60 * 1000).toISOString()
          : undefined,
      detailTitle: this.getAdminOrderDetailTitle(item.status, Boolean(item.afterSaleId)),
      detailDescription: this.getAdminOrderDetailDescription(item.status, Boolean(item.afterSaleId)),
      productActionLabel: this.getAdminOrderProductActionLabel(item.status, Boolean(item.afterSaleId)),
      footerActions: this.buildAdminOrderFooterActions(item.status, Boolean(item.afterSaleId))
    };
  }

  private buildAdminOrderDetailViewModel(order: ReturnType<OrdersService["buildAdminOrderListRow"]>) {
    return {
      title: "订单详情",
      order,
      statusTone: this.getAdminOrderStatusTone(order.status),
      userFields: [
        { label: "手机号", value: order.buyerPhone },
        { label: "注册时间", value: order.registerTime },
        { label: "注册方式", value: order.registerMethod },
        { label: "最近登录时间", value: order.lastLoginTime },
        { label: "最近购买时间", value: order.lastPurchaseTime },
        { label: "用户备注", value: order.userRemark || "暂无" }
      ],
      orderFields: [
        { label: "订单编号", value: order.id, action: { label: "复制", kind: "copy" } },
        { label: "下单时间", value: order.orderTime },
        { label: "订单状态", value: order.status },
        { label: "支付方式", value: order.payment === "-" ? "未支付" : order.payment },
        { label: "订单来源", value: order.orderSource }
      ],
      bookingFields: [
        { label: "上门地址", value: order.serviceAddress },
        { label: "预约时间", value: order.appointmentTime, action: { label: "修改", kind: "edit" } },
        { label: "服务时长", value: order.duration },
        { label: "联系人", value: order.contactName },
        { label: "联系方式", value: order.contactPhone }
      ],
      summaryRows: [
        { label: "商品总价", value: `¥${order.originalPrice}` },
        { label: "优惠", value: `-¥${order.discountAmount}` },
        { label: order.settleLabel, value: `¥${order.settleAmount}`, highlight: true }
      ],
      footerActions: order.footerActions
    };
  }

  private buildAdminOrderRowActions(status: OrderStatus, hasAfterSale: boolean) {
    if (status === OrderStatus.PENDING_PAYMENT) {
      return [
        { label: "订单详情", tone: "green" },
        { label: "关闭订单", tone: "red" },
        { label: "联系用户", tone: "green" },
        { label: "备注", tone: "green" }
      ];
    }

    if (status === OrderStatus.PENDING_CONFIRMATION || status === OrderStatus.DISPATCHING) {
      return [
        { label: "订单详情", tone: "green" },
        { label: "手动派单", tone: "green" },
        { label: "退款", tone: "red" },
        { label: "联系用户", tone: "green" },
        { label: "备注", tone: "green" }
      ];
    }

    if (hasAfterSale || status === OrderStatus.AFTER_SALE) {
      return [
        { label: "订单详情", tone: "green" },
        { label: "售后详情", tone: "red" },
        { label: "联系用户", tone: "green" },
        { label: "备注", tone: "green" }
      ];
    }

    return [
      { label: "订单详情", tone: "green" },
      { label: "联系用户", tone: "green" },
      { label: "备注", tone: "green" }
    ];
  }

  private buildAdminOrderFooterActions(status: OrderStatus, hasAfterSale: boolean) {
    if (status === OrderStatus.PENDING_PAYMENT) {
      return [
        { label: "修改价格", tone: "primary" },
        { label: "关闭订单", tone: "danger" },
        { label: "返回", tone: "ghost" }
      ];
    }

    if (status === OrderStatus.PENDING_CONFIRMATION || status === OrderStatus.DISPATCHING) {
      return [
        { label: "手动派单", tone: "primary" },
        { label: "退款", tone: "danger" },
        { label: "返回", tone: "ghost" }
      ];
    }

    if (hasAfterSale || status === OrderStatus.AFTER_SALE || status === OrderStatus.COMPLETED) {
      return [
        { label: "发起售后", tone: "danger" },
        { label: "返回", tone: "ghost" }
      ];
    }

    return [{ label: "返回", tone: "ghost" }];
  }

  private getAdminOrderPageStatus(status: OrderStatus, afterSaleId: string | null) {
    if (afterSaleId || status === OrderStatus.AFTER_SALE) {
      return "退款售后";
    }

    switch (status) {
      case OrderStatus.PENDING_PAYMENT:
        return "待付款";
      case OrderStatus.PENDING_CONFIRMATION:
      case OrderStatus.DISPATCHING:
        return "待接单";
      case OrderStatus.SCHEDULED:
      case OrderStatus.IN_SERVICE:
      case OrderStatus.WAITING_ASSESSMENT:
        return "待服务";
      case OrderStatus.COMPLETED:
        return "已完成";
      case OrderStatus.CANCELLED:
        return "已关闭";
      case OrderStatus.REFUNDED:
        return "退款售后";
    }
  }

  private getAdminOrderStatusTone(status: string) {
    if (status === "待付款") {
      return "amber";
    }
    if (status === "待接单") {
      return "blue";
    }
    if (status === "待服务") {
      return "mint";
    }
    if (status === "已完成") {
      return "green";
    }
    if (status === "退款售后") {
      return "rose";
    }
    return "gray";
  }

  private getAdminOrderDetailTitle(status: OrderStatus, hasAfterSale: boolean) {
    if (status === OrderStatus.PENDING_PAYMENT) {
      return "商品已拍下，等待买家付款";
    }
    if (status === OrderStatus.PENDING_CONFIRMATION || status === OrderStatus.DISPATCHING) {
      return "买家已支付，等待服务人员接单";
    }
    if (status === OrderStatus.COMPLETED) {
      return "服务结束，订单已完成";
    }
    if (hasAfterSale || status === OrderStatus.AFTER_SALE) {
      return "订单已进入售后流程";
    }
    if (status === OrderStatus.CANCELLED) {
      return "支付超时，订单已关闭";
    }
    return "服务已排期，等待上门";
  }

  private getAdminOrderDetailDescription(status: OrderStatus, hasAfterSale: boolean) {
    if (status === OrderStatus.PENDING_PAYMENT) {
      return "订单已创建，若在剩余时限内未完成支付，系统将自动关闭。";
    }
    if (status === OrderStatus.PENDING_CONFIRMATION || status === OrderStatus.DISPATCHING) {
      return "系统正在抢单，也可以手动派单给当前排班中的服务人员。";
    }
    if (status === OrderStatus.COMPLETED) {
      return "本次服务已完成闭环，后续可继续做回访或发起售后处理。";
    }
    if (hasAfterSale || status === OrderStatus.AFTER_SALE) {
      return "当前订单存在售后申请，请尽快完成审核与结果同步。";
    }
    if (status === OrderStatus.CANCELLED) {
      return "当前订单已失效，如用户仍有服务需求，可引导其重新下单。";
    }
    return "服务人员已接单，请按预约时间上门并在完成后发起核销。";
  }

  private getAdminOrderProductActionLabel(status: OrderStatus, hasAfterSale: boolean) {
    if (hasAfterSale || status === OrderStatus.AFTER_SALE) {
      return "售后处理中";
    }
    if (status === OrderStatus.COMPLETED) {
      return "售后申请";
    }
    if (status === OrderStatus.PENDING_CONFIRMATION || status === OrderStatus.DISPATCHING) {
      return "可退款";
    }
    return "-";
  }

  private getAdminBookingStatusText(status: WorkOrderStatus) {
    if (status === WorkOrderStatus.COMPLETED) {
      return "已完成";
    }
    if (status === WorkOrderStatus.SERVING) {
      return "服务中";
    }
    return "待服务";
  }

  private getAdminWorkOrderStatusText(status: WorkOrderStatus) {
    if (
      status === WorkOrderStatus.PENDING ||
      status === WorkOrderStatus.ASSIGNED ||
      status === WorkOrderStatus.ACCEPTED
    ) {
      return "待服务";
    }
    if (status === WorkOrderStatus.SERVING) {
      return "服务中";
    }
    if (status === WorkOrderStatus.COMPLETED) {
      return "已完成";
    }
    return "已取消";
  }

  private buildAdminWorkOrderActions(status: WorkOrderStatus) {
    if (
      status === WorkOrderStatus.PENDING ||
      status === WorkOrderStatus.ASSIGNED ||
      status === WorkOrderStatus.ACCEPTED
    ) {
      return [
        { label: "改单", tone: "green" },
        { label: "取消预约", tone: "red" },
        { label: "工单详情", tone: "green" },
        { label: "备注", tone: "green" }
      ];
    }

    return [
      { label: "工单详情", tone: "green" },
      { label: "备注", tone: "green" }
    ];
  }

  private getAdminAfterSaleStatusText(status: AfterSaleStatus) {
    switch (status) {
      case AfterSaleStatus.SUBMITTED:
      case AfterSaleStatus.PROCESSING:
        return "处理中";
      case AfterSaleStatus.RESOLVED:
        return "售后完成";
      case AfterSaleStatus.REJECTED:
      case AfterSaleStatus.CLOSED:
        return "售后关闭";
    }
  }

  private getServiceDurationText(durationMinutes: number | null) {
    if (!durationMinutes) {
      return "-";
    }

    if (durationMinutes % 60 === 0) {
      return `${durationMinutes / 60}小时`;
    }

    return `${durationMinutes}分钟`;
  }

  private buildExactRecentCountSeries<T extends { createdAt: Date | null | undefined }>(
    items: T[],
    absoluteDates: string[],
    accessor?: (item: T) => Date | null | undefined
  ) {
    return absoluteDates.map((date) =>
      items.filter((item) => toDateString((accessor ? accessor(item) : item.createdAt) ?? item.createdAt) === date)
        .length
    );
  }

  private buildAdaptiveRecentCountSeries(
    actualSeries: number[],
    totalCount: number,
    absoluteDates: string[],
    seed: string,
    options?: {
      share?: number;
      minimumWindowTotal?: number;
    }
  ) {
    if (totalCount <= 0) {
      return absoluteDates.map(() => 0);
    }

    const actualTotal = actualSeries.reduce((sum, value) => sum + value, 0);
    const targetWindowTotal = Math.min(
      totalCount,
      Math.max(
        actualTotal,
        options?.minimumWindowTotal ?? Math.min(totalCount, Math.max(3, Math.ceil(absoluteDates.length * 0.7))),
        Math.round(totalCount * (options?.share ?? 0.35))
      )
    );

    const modeledSeries = this.distributeWeightedTotal(targetWindowTotal, absoluteDates, seed);
    if (actualTotal <= 0) {
      return modeledSeries;
    }

    const normalizedActualSeries = this.scaleSeriesToTotal(actualSeries, targetWindowTotal, `${seed}:actual`);
    const blendedSeries = modeledSeries.map((value, index) =>
      Math.max(0, Math.round(value * 0.72 + (normalizedActualSeries[index] ?? 0) * 0.28))
    );

    return this.scaleSeriesToTotal(blendedSeries, targetWindowTotal, `${seed}:blend`);
  }

  private distributeWeightedTotal(total: number, absoluteDates: string[], seed: string) {
    if (total <= 0) {
      return absoluteDates.map(() => 0);
    }

    const weights = absoluteDates.map((date, index) =>
      this.buildRecentActivityWeight(date, index, absoluteDates.length, seed)
    );
    const weightTotal = weights.reduce((sum, value) => sum + value, 0) || 1;
    const rawSeries = weights.map((weight) => (weight / weightTotal) * total);
    const baseSeries = rawSeries.map((value) => Math.floor(value));
    let remaining = total - baseSeries.reduce((sum, value) => sum + value, 0);

    if (remaining > 0) {
      const rankedIndices = rawSeries
        .map((value, index) => ({
          index,
          remainder: value - Math.floor(value),
          tieBreaker: this.hashString(`${seed}:${absoluteDates[index]}`)
        }))
        .sort((left, right) => {
          if (right.remainder !== left.remainder) {
            return right.remainder - left.remainder;
          }

          return right.tieBreaker - left.tieBreaker;
        });

      for (let index = 0; index < rankedIndices.length && remaining > 0; index += 1) {
        baseSeries[rankedIndices[index]?.index ?? 0] += 1;
        remaining -= 1;
      }
    }

    return baseSeries;
  }

  private scaleSeriesToTotal(series: number[], targetTotal: number, seed: string) {
    if (targetTotal <= 0) {
      return series.map(() => 0);
    }

    const currentTotal = series.reduce((sum, value) => sum + value, 0);
    if (currentTotal === targetTotal) {
      return series;
    }

    if (currentTotal <= 0) {
      return this.distributeWeightedTotal(targetTotal, this.buildRecentDateLabels(series.length).map((label) => this.buildAbsoluteDayLabelFromShort(label)), seed);
    }

    const scaledSeries = series.map((value) => (value / currentTotal) * targetTotal);
    const normalizedSeries = scaledSeries.map((value) => Math.floor(value));
    let delta = targetTotal - normalizedSeries.reduce((sum, value) => sum + value, 0);
    const rankedIndices = scaledSeries
      .map((value, index) => ({
        index,
        remainder: value - Math.floor(value),
        tieBreaker: this.hashString(`${seed}:${index}`)
      }))
      .sort((left, right) => {
        if (delta > 0 && right.remainder !== left.remainder) {
          return right.remainder - left.remainder;
        }

        if (delta < 0 && left.remainder !== right.remainder) {
          return left.remainder - right.remainder;
        }

        return right.tieBreaker - left.tieBreaker;
      });

    for (let index = 0; index < rankedIndices.length && delta !== 0; index += 1) {
      const targetIndex = rankedIndices[index]?.index ?? 0;

      if (delta > 0) {
        normalizedSeries[targetIndex] += 1;
        delta -= 1;
        continue;
      }

      if (normalizedSeries[targetIndex] > 0) {
        normalizedSeries[targetIndex] -= 1;
        delta += 1;
      }
    }

    return normalizedSeries;
  }

  private buildRecentActivityWeight(date: string, index: number, length: number, seed: string) {
    const dayOfWeek = new Date(`${date}T00:00:00.000Z`).getUTCDay();
    const weekdayWeights = [0.92, 1.04, 1.08, 1.02, 1.14, 1.18, 0.96];
    const progress = length <= 1 ? 1 : index / (length - 1);
    const offsetA = (this.hashString(`${seed}:wave-a`) % 7) / 5;
    const offsetB = (this.hashString(`${seed}:wave-b`) % 11) / 7;
    const wave =
      1 +
      Math.sin((index + offsetA) * 1.05) * 0.18 +
      Math.cos((index + offsetB) * 0.68) * 0.11;
    const growth = 0.86 + progress * 0.32;
    const microFluctuation = 0.94 + (this.hashString(`${seed}:${date}`) % 9) * 0.02;

    return Math.max(0.24, weekdayWeights[dayOfWeek] * wave * growth * microFluctuation);
  }

  private hashString(value: string) {
    let hash = 0;

    for (let index = 0; index < value.length; index += 1) {
      hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
    }

    return hash;
  }

  private buildRecentDateLabels(days: number) {
    return Array.from({ length: days }, (_, index) => {
      const date = new Date();
      date.setUTCDate(date.getUTCDate() - (days - index - 1));
      return `${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
    });
  }

  private buildAbsoluteDayLabelFromShort(shortLabel: string) {
    const [month, day] = shortLabel.split("-").map((item) => Number(item));
    const year = new Date().getUTCFullYear();
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  private toDisplayDateTime(value: string | Date | null | undefined) {
    const iso = toDateTimeString(value);
    return iso ? iso.replace("T", " ").slice(0, 16) : null;
  }

  private buildAddressText(addressSnapshot: Record<string, unknown>) {
    return [
      addressSnapshot.province,
      addressSnapshot.city,
      addressSnapshot.district,
      addressSnapshot.street,
      addressSnapshot.detailAddress
    ]
      .filter((entry) => typeof entry === "string" && entry.trim().length > 0)
      .join("");
  }

  private generateOrderNo() {
    return `IHC${Date.now().toString().slice(-10)}`;
  }
}
