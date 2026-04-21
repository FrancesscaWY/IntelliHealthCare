import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../../infra/prisma/prisma.service";
import type { ReportContext } from "../domain/agent-types";

@Injectable()
export class ReportsTool {
  constructor(private readonly prismaService: PrismaService) {}

  async getReportContext(reportId: string): Promise<ReportContext> {
    const report = await this.prismaService.report.findUnique({
      where: { id: reportId },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            role: true,
            title: true
          }
        },
        order: {
          select: {
            id: true,
            orderNo: true,
            status: true,
            service: {
              select: {
                id: true,
                title: true,
                category: true
              }
            }
          }
        }
      }
    });

    if (!report) {
      throw new NotFoundException(`Report ${reportId} not found`);
    }

    return {
      id: report.id,
      title: report.title,
      type: report.type,
      status: report.status,
      publishedAt: report.publishedAt?.toISOString() ?? null,
      reviewedAt: report.reviewedAt?.toISOString() ?? null,
      summary: this.asObject(report.summary),
      attachment: report.attachment,
      archiveId: report.archiveId,
      order: report.order
        ? {
            id: report.order.id,
            orderNo: report.order.orderNo,
            status: report.order.status,
            service: report.order.service
              ? {
                  id: report.order.service.id,
                  title: report.order.service.title,
                  category: report.order.service.category
                }
              : null
          }
        : null,
      author: report.author
        ? {
            id: report.author.id,
            name: report.author.name,
            role: report.author.role,
            title: report.author.title
          }
        : null
    };
  }

  private asObject(value: unknown) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }

    return {
      value
    };
  }
}
