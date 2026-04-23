import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import {
  AfterSaleStatus,
  AfterSaleType,
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
  paginate,
  toDateString,
  toDateTimeString,
  toNumber
} from "../../common/utils/serializers";
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
          workOrderId: latestWorkOrder?.id ?? null,
          workOrderStatus: latestWorkOrder?.status ?? null,
          assigneeName: latestWorkOrder?.assignee?.name ?? latestWorkOrder?.assigneeName ?? null,
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
      afterSaleReason: latestAfterSale?.reason ?? null
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
        dispatchNote: item.dispatchNote
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
    const [users, orders, workOrders, posts, services, staffs, archives] = await Promise.all([
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
      this.prismaService.healthArchive.findMany()
    ]);

    const trendLabels = this.buildRecentDateLabels(7);
    const trendValues = trendLabels.map((label) => {
      const day = this.buildAbsoluteDayLabelFromShort(label);
      return users.filter((item) => toDateString(item.createdAt) === day).length;
    });
    const riskTags = archives.flatMap((item) => ensureArray<string>(item.riskTags));
    const tagSet = Array.from(new Set(riskTags)).slice(0, 6);
    const serviceShareMap = new Map<ServiceCategory, number>();
    for (const order of orders) {
      serviceShareMap.set(
        order.service.category,
        (serviceShareMap.get(order.service.category) ?? 0) + 1
      );
    }
    const totalOrders = Math.max(
      1,
      Array.from(serviceShareMap.values()).reduce((sum, value) => sum + value, 0)
    );

    return {
      greeting: "早上好！Daisy",
      stats: [
        {
          label: "新增用户数量",
          value: String(users.length),
          compareLabel: "较上周",
          compareValue: "+20%",
          compareTone: "positive",
          chartType: "area",
          chartColor: "#10c89a",
          values: trendValues
        },
        {
          label: "新增工单数量",
          value: String(workOrders.length),
          compareLabel: "较上周",
          compareValue: "+12%",
          compareTone: "positive",
          chartType: "bar",
          chartColor: "#ffd86a",
          values: workOrders.slice(0, 5).map((_, index) => 30 + index * 10)
        },
        {
          label: "新增订单数量",
          value: String(orders.length),
          compareLabel: "较上周",
          compareValue: "+8%",
          compareTone: "positive",
          chartType: "area",
          chartColor: "#ff7b75",
          values: trendValues.map((value) => Math.max(1, Math.round(value * 0.7)))
        },
        {
          label: "新增动态数量",
          value: String(posts.length),
          compareLabel: "较昨日",
          compareValue: "+5%",
          compareTone: "positive",
          chartType: "bar",
          chartColor: "#6870f5",
          values: [18, 36, 58, 82, 108, 82]
        }
      ],
      quickEntries: [
        { title: "全部用户", icon: "users", tone: "mint", pageId: "elder/member-list" },
        { title: "报告管理", icon: "report", tone: "amber", pageId: "elder/report-management" },
        { title: "会话", icon: "message", tone: "rose", pageId: "dashboard/session" },
        { title: "全部订单", icon: "database", tone: "violet", pageId: "dashboard/order-list" },
        { title: "工单管理", icon: "file", tone: "blue", pageId: "dashboard/work-order" },
        { title: "审核管理", icon: "refresh", tone: "teal", pageId: "service/review-management" },
        { title: "售后管理", icon: "star", tone: "yellow", pageId: "dashboard/after-sale" },
        { title: "动态管理", icon: "send", tone: "salmon" }
      ],
      tagDistribution: tagSet.map((label) => ({
        label,
        value: riskTags.filter((item) => item === label).length,
        max: Math.max(10, riskTags.length)
      })),
      serviceOrderShare: [
        {
          label: "家政护理",
          value: Math.round(((serviceShareMap.get(ServiceCategory.HOME_CARE) ?? 0) / totalOrders) * 100),
          color: "#39cf9d"
        },
        {
          label: "康复理疗",
          value: Math.round(((serviceShareMap.get(ServiceCategory.REHAB_THERAPY) ?? 0) / totalOrders) * 100),
          color: "#ffd557"
        },
        {
          label: "上门体检",
          value: Math.round(((serviceShareMap.get(ServiceCategory.HOME_EXAM) ?? 0) / totalOrders) * 100),
          color: "#ff6f6a"
        }
      ],
      trend: {
        labels: trendLabels,
        values: trendValues,
        highlightIndex: trendValues.findIndex((value) => value === Math.min(...trendValues)),
        highlightValue: Math.min(...trendValues),
        legend: "新增用户数量"
      },
      productRanking: services.slice(0, 5).map((item, index) => ({
        rank: index + 1,
        title: item.title,
        orders: item.salesVolume
      })),
      staffRanking: staffs.slice(0, 5).map((item, index) => ({
        rank: index + 1,
        name: item.name,
        category: this.getServiceCategoryText(
          item.role === "THERAPIST"
            ? ServiceCategory.REHAB_THERAPY
            : item.role === "DOCTOR"
              ? ServiceCategory.HOME_EXAM
              : ServiceCategory.HOME_CARE
        ),
        orders: workOrders.filter((row) => row.assigneeStaffId === item.id).length
      })),
      productImage: services[0]?.coverUrl ?? null,
      staffAvatar: staffs[0]?.avatarUrl ?? null
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
        assignee: true
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
        id: item.id,
        orderNo: item.order.orderNo,
        title: item.order.service.title,
        cover: item.order.service.coverUrl,
        project: item.order.service.summary ?? item.order.service.title,
        amount: (toNumber(item.order.payableAmount) ?? 0).toFixed(2),
        staff: item.assignee?.name ?? item.assigneeName ?? "待分配",
        customerName:
          item.order.owner.realName ?? item.order.owner.nickname ?? item.order.owner.phone,
        customerPhone: item.order.owner.phone,
        customerAvatar: item.order.owner.avatarUrl,
        assignTime: this.toDisplayDateTime(item.createdAt),
        status: this.getAdminWorkOrderStatusText(item.status),
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
    remark: string | null;
    assigneeName: string | null;
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
      duration: "-",
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
