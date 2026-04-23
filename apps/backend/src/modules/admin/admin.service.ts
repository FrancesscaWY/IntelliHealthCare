import { Injectable, NotFoundException } from "@nestjs/common";
import {
  ServiceCategory,
  WorkOrderStatus
} from "@prisma/client";
import {
  ensureArray,
  getAge,
  paginate,
  toDateString,
  toDateTimeString,
  toNumber
} from "../../common/utils/serializers";
import { PrismaService } from "../../infra/prisma/prisma.service";

@Injectable()
export class AdminService {
  constructor(private readonly prismaService: PrismaService) {}

  async getDashboardOverview() {
    const [orders, workOrders, reports, alerts, elders] = await Promise.all([
      this.prismaService.order.count(),
      this.prismaService.workOrder.count(),
      this.prismaService.report.count(),
      this.prismaService.healthAlert.count({
        where: { status: "OPEN" }
      }),
      this.prismaService.user.count({
        where: { type: "ELDER" }
      })
    ]);

    return {
      elderCount: elders,
      orderCount: orders,
      workOrderCount: workOrders,
      reportCount: reports,
      openAlertCount: alerts
    };
  }

  async listElders(
    page: number,
    pageSize: number,
    keyword?: string,
    tag?: string
  ) {
    const normalizedKeyword = keyword?.trim().toLowerCase();
    const normalizedTag = tag?.trim();
    const elders = await this.prismaService.user.findMany({
      where: {
        type: "ELDER"
      },
      include: {
        archive: true
      },
      orderBy: { createdAt: "desc" }
    });

    const list = elders
      .map((item) => {
        const riskTags = ensureArray<string>(item.archive?.riskTags).filter(
          (entry): entry is string => typeof entry === "string" && entry.trim().length > 0
        );

        return {
          elderId: item.id,
          nickname: item.nickname,
          realName: item.realName,
          displayName: item.realName ?? item.nickname ?? item.phone,
          phone: item.phone,
          avatar: item.avatarUrl,
          gender: item.gender,
          city: item.city,
          realNameStatus: item.realNameStatus,
          createdAt: toDateTimeString(item.createdAt),
          tags: riskTags,
          tagCount: riskTags.length
        };
      })
      .filter((item) => {
        const matchesKeyword =
          !normalizedKeyword ||
          [
            item.displayName,
            item.nickname,
            item.realName,
            item.phone,
            item.elderId
          ]
            .filter(Boolean)
            .some((field) => String(field).toLowerCase().includes(normalizedKeyword));
        const matchesTag =
          !normalizedTag || item.tags.some((entry) => entry === normalizedTag);

        return matchesKeyword && matchesTag;
      });

    return paginate(list, page, pageSize);
  }

  async getElderDetail(elderId: string) {
    const [elder, archive, bindings, orders, devices, alerts, reports, medications, metrics] =
      await Promise.all([
        this.prismaService.user.findUnique({
          where: { id: elderId }
        }),
        this.prismaService.healthArchive.findUnique({
          where: { userId: elderId }
        }),
        this.prismaService.familyBinding.findMany({
          where: { elderMemberId: elderId },
          include: {
            familyMember: true
          }
        }),
        this.prismaService.order.findMany({
          where: { elderId },
          include: {
            service: true
          },
          orderBy: { createdAt: "desc" },
          take: 10
        }),
        this.prismaService.device.findMany({
          where: { ownerId: elderId },
          orderBy: { updatedAt: "desc" }
        }),
        this.prismaService.healthAlert.findMany({
          where: { userId: elderId },
          orderBy: { triggeredAt: "desc" },
          take: 10
        }),
        this.prismaService.report.findMany({
          where: {
            archive: {
              userId: elderId
            }
          },
          orderBy: { createdAt: "desc" },
          take: 10
        }),
        this.prismaService.medication.findMany({
          where: { userId: elderId, active: true },
          orderBy: [{ endDate: "asc" }, { createdAt: "desc" }],
          take: 10
        }),
        this.prismaService.healthMetricRecord.findMany({
          where: { userId: elderId },
          orderBy: { measuredAt: "desc" },
          take: 20
        })
      ]);

    if (!elder || !archive) {
      throw new NotFoundException("Elder archive not found");
    }

    return {
      elderId: elder.id,
      nickname: elder.nickname,
      realName: elder.realName,
      name: elder.realName ?? elder.nickname ?? elder.phone,
      phone: elder.phone,
      gender: elder.gender,
      birthday: toDateString(elder.birthday),
      age: getAge(elder.birthday),
      avatar: elder.avatarUrl,
      city: elder.city,
      realNameStatus: elder.realNameStatus,
      createdAt: toDateTimeString(elder.createdAt),
      archiveSummary: {
        riskTags: archive.riskTags,
        longTermMemory: archive.longTermMemory,
        baseProfile: archive.baseProfile
      },
      familyMembers: bindings.map((item) => ({
        userId: item.familyMemberId,
        name: item.familyMember.realName ?? item.familyMember.nickname ?? item.familyMember.phone,
        relationLabel: item.relationLabel,
        phone: item.familyMember.phone,
        authScope: item.authScope
      })),
      recentOrders: orders.map((item) => ({
        orderId: item.id,
        orderNo: item.orderNo,
        status: item.status,
        title: item.service.title,
        bookingDate: toDateString(item.bookingDate)
      })),
      devices: devices.map((item) => ({
        deviceId: item.id,
        type: item.type,
        name: item.nickname,
        status: item.status,
        batteryLevel: item.batteryLevel
      })),
      reports: reports.map((item) => ({
        reportId: item.id,
        title: item.title,
        type: item.type,
        status: item.status,
        createdAt: toDateTimeString(item.createdAt),
        publishedAt: toDateTimeString(item.publishedAt)
      })),
      medications: medications.map((item) => ({
        medicationId: item.id,
        name: item.name,
        dosage: item.dosage,
        frequency: item.frequency,
        startDate: toDateString(item.startDate),
        endDate: toDateString(item.endDate)
      })),
      latestMetrics: metrics.map((item) => ({
        metricId: item.id,
        metricType: item.metricType,
        value: toNumber(item.value),
        unit: item.unit,
        abnormal: item.abnormal,
        measuredAt: toDateTimeString(item.measuredAt)
      })),
      alerts: alerts.map((item) => ({
        alertId: item.id,
        title: item.title,
        level: item.level,
        status: item.status,
        triggeredAt: toDateTimeString(item.triggeredAt)
      }))
    };
  }

  async listWorkOrders(
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

    const list = workOrders
      .map((item) => ({
        workOrderId: item.id,
        orderId: item.orderId,
        orderNo: item.order.orderNo,
        status: item.status,
        statusText: this.getWorkOrderStatusText(item.status),
        serviceCategory: item.order.service.category,
        serviceCategoryText: this.getServiceCategoryText(item.order.service.category),
        serviceTitle: item.order.service.title,
        serviceSummary: item.order.service.summary,
        serviceCover: item.order.service.coverUrl,
        assigneeName: item.assignee?.name ?? item.assigneeName,
        institutionName: item.institution?.name ?? item.institutionName,
        customerName:
          item.order.owner.realName ??
          item.order.owner.nickname ??
          item.order.owner.phone,
        customerPhone: item.order.owner.phone,
        customerAvatar: item.order.owner.avatarUrl,
        bookingDate: toDateString(item.order.bookingDate),
        bookingTimeSlot: item.order.bookingTimeSlot,
        scheduleAt: toDateTimeString(item.scheduleAt),
        createdAt: toDateTimeString(item.createdAt),
        payableAmount: toNumber(item.order.payableAmount),
        dispatchNote: item.dispatchNote
      }))
      .filter((item) => {
        const matchesServiceCategory =
          !serviceCategory || item.serviceCategory === serviceCategory;

        if (!matchesServiceCategory) {
          return false;
        }

        if (!normalizedKeyword) {
          return true;
        }

        return [
          item.workOrderId,
          item.orderNo,
          item.serviceTitle,
          item.customerName,
          item.customerPhone
        ]
          .filter(Boolean)
          .some((field) => String(field).toLowerCase().includes(normalizedKeyword));
      });

    return paginate(list, page, pageSize);
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

  private getWorkOrderStatusText(status: WorkOrderStatus) {
    switch (status) {
      case WorkOrderStatus.PENDING:
      case WorkOrderStatus.ASSIGNED:
      case WorkOrderStatus.ACCEPTED:
        return "待服务";
      case WorkOrderStatus.SERVING:
        return "服务中";
      case WorkOrderStatus.COMPLETED:
        return "已完成";
      case WorkOrderStatus.EXCEPTION:
      case WorkOrderStatus.CLOSED:
        return "已取消";
    }
  }
}
