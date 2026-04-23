import { Injectable, NotFoundException } from "@nestjs/common";
import { getAge, toDateString, toDateTimeString, toNumber } from "../../common/utils/serializers";
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

  async getElderDetail(elderId: string) {
    const [elder, archive, bindings, orders, devices, alerts] = await Promise.all([
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
      })
    ]);

    if (!elder || !archive) {
      throw new NotFoundException("Elder archive not found");
    }

    return {
      elderId: elder.id,
      name: elder.realName ?? elder.nickname ?? elder.phone,
      phone: elder.phone,
      gender: elder.gender,
      birthday: toDateString(elder.birthday),
      age: getAge(elder.birthday),
      avatar: elder.avatarUrl,
      city: elder.city,
      realNameStatus: elder.realNameStatus,
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
      alerts: alerts.map((item) => ({
        alertId: item.id,
        title: item.title,
        level: item.level,
        status: item.status,
        triggeredAt: toDateTimeString(item.triggeredAt)
      }))
    };
  }

  async listWorkOrders(page: number, pageSize: number) {
    const workOrders = await this.prismaService.workOrder.findMany({
      include: {
        order: {
          include: {
            service: true
          }
        },
        assignee: true,
        institution: true
      },
      orderBy: { createdAt: "desc" }
    });

    const start = (page - 1) * pageSize;
    const list = workOrders.slice(start, start + pageSize).map((item) => ({
      workOrderId: item.id,
      orderId: item.orderId,
      orderNo: item.order.orderNo,
      status: item.status,
      serviceTitle: item.order.service.title,
      assigneeName: item.assignee?.name ?? item.assigneeName,
      institutionName: item.institution?.name ?? item.institutionName,
      scheduleAt: toDateTimeString(item.scheduleAt),
      createdAt: toDateTimeString(item.createdAt),
      payableAmount: toNumber(item.order.payableAmount)
    }));

    return {
      list,
      page,
      pageSize,
      total: workOrders.length,
      hasMore: start + pageSize < workOrders.length
    };
  }
}
