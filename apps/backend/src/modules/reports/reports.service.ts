import {
  ForbiddenException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { ReportStatus, ReportType, UserType } from "@prisma/client";
import type { AuthenticatedUser } from "../../common/auth/auth.types";
import {
  paginate,
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

  async listAdminReports(page: number, pageSize: number, status?: ReportStatus) {
    const reports = await this.prismaService.report.findMany({
      where: {
        status: status ?? undefined
      },
      orderBy: { createdAt: "desc" }
    });

    return paginate(reports.map((item) => this.toReportCard(item)), page, pageSize);
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
}
