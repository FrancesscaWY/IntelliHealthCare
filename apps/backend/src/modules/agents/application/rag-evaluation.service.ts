import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../../infra/prisma/prisma.service";
import type { ListRagEvalRunsQueryDto } from "../dto/governance.dto";

@Injectable()
export class RagEvaluationService {
  constructor(private readonly prismaService: PrismaService) {}

  async listRuns(query: ListRagEvalRunsQueryDto) {
    const rows = await this.prismaService.ragEvalRun.findMany({
      where: {
        ...(query.status ? { status: query.status } : {}),
        ...(query.datasetName ? { datasetName: query.datasetName } : {})
      },
      orderBy: [{ startedAt: "desc" }],
      take: query.limit,
      include: {
        _count: {
          select: {
            caseResults: true
          }
        }
      }
    });

    return {
      total: rows.length,
      runs: rows.map((row) => ({
        id: row.id,
        datasetName: row.datasetName,
        datasetVersion: row.datasetVersion,
        triggerSource: row.triggerSource,
        status: row.status,
        summary: row.summary,
        metadata: row.metadata,
        caseCount: row._count.caseResults,
        startedAt: row.startedAt.toISOString(),
        completedAt: row.completedAt?.toISOString() ?? null
      }))
    };
  }

  async getRunById(runId: string) {
    const run = await this.prismaService.ragEvalRun.findUnique({
      where: { id: runId },
      include: {
        caseResults: {
          orderBy: [{ createdAt: "asc" }]
        }
      }
    });

    if (!run) {
      throw new NotFoundException(`RAG eval run ${runId} not found`);
    }

    return {
      id: run.id,
      datasetName: run.datasetName,
      datasetVersion: run.datasetVersion,
      triggerSource: run.triggerSource,
      status: run.status,
      summary: run.summary,
      metadata: run.metadata,
      startedAt: run.startedAt.toISOString(),
      completedAt: run.completedAt?.toISOString() ?? null,
      caseResults: run.caseResults.map((item) => ({
        id: item.id,
        caseKey: item.caseKey,
        status: item.status,
        query: item.query,
        limit: item.limit,
        targetUserId: item.targetUserId,
        institutionId: item.institutionId,
        knowledgeTypes: item.knowledgeTypes,
        visibilityScopes: item.visibilityScopes,
        expected: item.expected,
        actual: item.actual,
        metrics: item.metrics,
        createdAt: item.createdAt.toISOString()
      }))
    };
  }
}
