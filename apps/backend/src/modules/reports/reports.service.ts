import {
  ForbiddenException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { ReportStatus, ReportType, UserType } from "@prisma/client";
import type { AuthenticatedUser } from "../../common/auth/auth.types";
import {
  ensureRecord,
  paginate,
  toDateString,
  toDateTimeString,
  toPrismaJson,
  toPrismaNullableJson
} from "../../common/utils/serializers";
import { PrismaService } from "../../infra/prisma/prisma.service";

@Injectable()
export class ReportsService {
  constructor(private readonly prismaService: PrismaService) {}

  async listCheckupReports(
    currentUser: AuthenticatedUser,
    page: number,
    pageSize: number,
    elderId?: string
  ) {
    const archiveId = await this.resolveArchiveId(currentUser, elderId);
    const reports = await this.prismaService.report.findMany({
      where: {
        archiveId,
        type: ReportType.CHECKUP
      },
      orderBy: { createdAt: "desc" }
    });

    return paginate(reports.map((item) => this.toReportCard(item)), page, pageSize);
  }

  async createCheckupReport(
    currentUser: AuthenticatedUser,
    payload: {
      elderId?: string;
      title: string;
      summary: Record<string, unknown>;
      attachment?: Record<string, unknown>;
    }
  ) {
    const archiveId = await this.resolveArchiveId(currentUser, payload.elderId);
    const report = await this.prismaService.report.create({
      data: {
        archiveId,
        type: ReportType.CHECKUP,
        status: ReportStatus.PUBLISHED,
        title: payload.title,
        summary: toPrismaJson(payload.summary),
        attachment: toPrismaNullableJson(payload.attachment ?? null),
        publishedAt: new Date()
      }
    });

    return this.toReportCard(report);
  }

  async getCheckupReport(currentUser: AuthenticatedUser, reportId: string) {
    const report = await this.getAccessibleReport(currentUser, reportId);

    return {
      reportId: report.id,
      type: report.type,
      status: report.status,
      title: report.title,
      summary: report.summary,
      attachment: report.attachment,
      reviewedAt: toDateTimeString(report.reviewedAt),
      publishedAt: toDateTimeString(report.publishedAt),
      createdAt: toDateTimeString(report.createdAt)
    };
  }

  async deleteCheckupReport(currentUser: AuthenticatedUser, reportId: string) {
    await this.getAccessibleReport(currentUser, reportId);
    await this.prismaService.report.delete({
      where: { id: reportId }
    });

    return {
      deleted: true
    };
  }

  async getInterpretation(currentUser: AuthenticatedUser, reportId: string) {
    const report = await this.getAccessibleReport(currentUser, reportId);
    const summary = JSON.stringify(report.summary);

    return {
      reportId: report.id,
      interpretation: `报告《${report.title}》已归档。当前摘要包含 ${summary.length} 个字符，建议重点关注异常指标、慢病随访建议和后续复查时间。`,
      followupSuggestions: [
        "如存在异常指标，请在 1-2 周内安排复查。",
        "将体检结论与既往慢病用药方案一并交由医生复核。",
        "若需要家属协助，可同步分享报告摘要与注意事项。"
      ]
    };
  }

  async listAdminReports(
    page: number,
    pageSize: number,
    status?: ReportStatus,
    type?: ReportType,
    keyword?: string
  ) {
    const normalizedKeyword = keyword?.trim().toLowerCase();
    const reports = await this.prismaService.report.findMany({
      where: {
        status: status ?? undefined,
        type: type ?? undefined
      },
      include: {
        archive: {
          include: {
            user: true
          }
        },
        order: true,
        author: true
      },
      orderBy: { createdAt: "desc" }
    });

    const list = reports
      .map((item) => ({
        reportId: item.id,
        title: item.title,
        type: item.type,
        typeText: this.getReportTypeText(item.type),
        status: item.status,
        createdAt: toDateTimeString(item.createdAt),
        publishedAt: toDateTimeString(item.publishedAt),
        elderId: item.archive?.userId ?? null,
        elderName:
          item.archive?.user.realName ??
          item.archive?.user.nickname ??
          item.archive?.user.phone ??
          null,
        elderPhone: item.archive?.user.phone ?? null,
        source: item.author ? "后台上传" : item.orderId ? "订单关联" : "用户上传",
        uploader: item.author?.name ?? "系统",
        orderId: item.orderId,
        orderNo: item.order?.orderNo ?? null,
        reportDate: toDateString(item.publishedAt ?? item.createdAt)
      }))
      .filter((item) => {
        if (!normalizedKeyword) {
          return true;
        }

        return [item.title, item.elderName, item.uploader, item.orderNo]
          .filter(Boolean)
          .some((field) => String(field).toLowerCase().includes(normalizedKeyword));
      });

    const result = paginate(list, page, pageSize);

    return {
      title: "报告管理",
      reportTypes: ["全部类型", "体检报告", "检验报告", "影像报告"],
      rows: result.list.map((item) => ({
        id: item.reportId,
        uploadedAt: item.createdAt ? item.createdAt.replace("T", " ").slice(0, 16) : "-",
        userName: item.elderName ?? "-",
        avatar: null,
        reportName: item.title,
        reportType: item.typeText,
        source: item.source,
        uploader: item.uploader,
        ticketNo: item.orderNo ?? "-",
        reportDate: item.reportDate
      })),
      ...result
    };
  }

  async getAdminReportDetail(reportId: string) {
    const report = await this.prismaService.report.findUnique({
      where: { id: reportId },
      include: {
        archive: {
          include: {
            user: true
          }
        },
        order: true,
        author: true
      }
    });

    if (!report) {
      throw new NotFoundException("Report not found");
    }

    return {
      reportId: report.id,
      type: report.type,
      typeText: this.getReportTypeText(report.type),
      status: report.status,
      title: report.title,
      summary: report.summary,
      attachment: report.attachment,
      reviewedAt: toDateTimeString(report.reviewedAt),
      publishedAt: toDateTimeString(report.publishedAt),
      createdAt: toDateTimeString(report.createdAt),
      elderId: report.archive?.userId ?? null,
      elderName:
        report.archive?.user.realName ??
        report.archive?.user.nickname ??
        report.archive?.user.phone ??
        null,
      elderPhone: report.archive?.user.phone ?? null,
      source: report.author ? "后台上传" : report.orderId ? "订单关联" : "用户上传",
      uploader: report.author?.name ?? "系统",
      orderId: report.orderId,
      orderNo: report.order?.orderNo ?? null
    };
  }

  async createAdminReport(payload: {
    elderId?: string;
    orderId?: string;
    type: ReportType;
    title: string;
    summary: Record<string, unknown>;
    attachment?: Record<string, unknown>;
  }) {
    const archiveId = payload.elderId
      ? (
          await this.prismaService.healthArchive.findUnique({
            where: { userId: payload.elderId }
          })
        )?.id ?? null
      : null;

    const report = await this.prismaService.report.create({
      data: {
        archiveId,
        orderId: payload.orderId ?? null,
        type: payload.type,
        status: ReportStatus.PENDING_REVIEW,
        title: payload.title,
        summary: toPrismaJson(payload.summary),
        attachment: toPrismaNullableJson(payload.attachment ?? null)
      }
    });

    return {
      reportId: report.id,
      status: report.status
    };
  }

  async deleteAdminReport(reportId: string) {
    await this.prismaService.report.delete({
      where: { id: reportId }
    });

    return {
      deleted: true,
      reportId
    };
  }

  async getAdminReportDownloadMetadata(reportId: string) {
    const report = await this.prismaService.report.findUnique({
      where: { id: reportId }
    });

    if (!report) {
      throw new NotFoundException("Report not found");
    }

    const attachment = ensureRecord(report.attachment);

    return {
      reportId: report.id,
      fileId: attachment.fileId ?? null,
      fileName: attachment.fileName ?? `${report.title}.pdf`,
      url: attachment.url ?? null,
      mimeType: attachment.mimeType ?? "application/pdf"
    };
  }

  async reviewReport(reportId: string, status: ReportStatus) {
    const report = await this.prismaService.report.update({
      where: { id: reportId },
      data: {
        status,
        reviewedAt: new Date(),
        publishedAt: status === ReportStatus.PUBLISHED ? new Date() : undefined
      }
    });

    return this.toReportCard(report);
  }

  private async getAccessibleReport(currentUser: AuthenticatedUser, reportId: string) {
    const report = await this.prismaService.report.findUnique({
      where: { id: reportId },
      include: {
        archive: true,
        order: true
      }
    });

    if (!report) {
      throw new NotFoundException("Report not found");
    }

    if (
      ([UserType.ADMIN, UserType.ORG_MANAGER, UserType.STAFF] as UserType[]).includes(
        currentUser.type
      )
    ) {
      return report;
    }

    const archiveOwnerId = report.archive?.userId;
    const orderOwnerId = report.order?.ownerId;
    const allowed =
      archiveOwnerId === currentUser.id ||
      orderOwnerId === currentUser.id ||
      Boolean(
        archiveOwnerId &&
          (
            await this.prismaService.familyBinding.findFirst({
              where: {
                familyMemberId: currentUser.id,
                elderMemberId: archiveOwnerId
              }
            })
          )
      );

    if (!allowed) {
      throw new ForbiddenException("No permission to access report");
    }

    return report;
  }

  private async resolveArchiveId(currentUser: AuthenticatedUser, elderId?: string) {
    let targetUserId = elderId;

    if (!targetUserId) {
      if (currentUser.type === UserType.ELDER) {
        targetUserId = currentUser.id;
      } else {
        const binding = await this.prismaService.familyBinding.findFirst({
          where: { familyMemberId: currentUser.id },
          orderBy: { createdAt: "asc" }
        });
        targetUserId = binding?.elderMemberId ?? currentUser.id;
      }
    }

    if (
      targetUserId !== currentUser.id &&
      !([UserType.ADMIN, UserType.ORG_MANAGER, UserType.STAFF] as UserType[]).includes(
        currentUser.type
      )
    ) {
      const binding = await this.prismaService.familyBinding.findFirst({
        where: {
          familyMemberId: currentUser.id,
          elderMemberId: targetUserId
        }
      });

      if (!binding) {
        throw new ForbiddenException("No permission to access elder reports");
      }
    }

    const archive = await this.prismaService.healthArchive.findUnique({
      where: { userId: targetUserId }
    });

    if (!archive) {
      throw new NotFoundException("Health archive not found");
    }

    return archive.id;
  }

  private toReportCard(report: {
    id: string;
    type: ReportType;
    status: ReportStatus;
    title: string;
    createdAt: Date;
    publishedAt: Date | null;
  }) {
    return {
      reportId: report.id,
      type: report.type,
      status: report.status,
      title: report.title,
      createdAt: toDateTimeString(report.createdAt),
      publishedAt: toDateTimeString(report.publishedAt)
    };
  }

  private getReportTypeText(type: ReportType) {
    switch (type) {
      case ReportType.CHECKUP:
        return "体检报告";
      case ReportType.SERVICE:
        return "服务报告";
      case ReportType.REHAB:
        return "康复报告";
      case ReportType.ASSESSMENT:
        return "评估报告";
    }
  }
}
