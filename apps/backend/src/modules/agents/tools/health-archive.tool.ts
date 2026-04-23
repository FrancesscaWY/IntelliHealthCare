import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../../infra/prisma/prisma.service";
import type { ArchiveContext } from "../domain/agent-types";

interface ArchiveLookupInput {
  archiveId?: string | null;
  userId?: string | null;
}

@Injectable()
export class HealthArchiveTool {
  constructor(private readonly prismaService: PrismaService) {}

  async getArchiveContext(input: ArchiveLookupInput): Promise<ArchiveContext> {
    if (!input.archiveId && !input.userId) {
      throw new NotFoundException("archiveId or userId is required");
    }

    const archive = input.archiveId
      ? await this.prismaService.healthArchive.findUnique({
          where: { id: input.archiveId },
          include: {
            user: {
              select: {
                id: true,
                realName: true
              }
            }
          }
        })
      : await this.prismaService.healthArchive.findUnique({
          where: { userId: input.userId! },
          include: {
            user: {
              select: {
                id: true,
                realName: true
              }
            }
          }
        });

    if (!archive) {
      throw new NotFoundException("Health archive not found");
    }

    return {
      id: archive.id,
      userId: archive.userId,
      userName: archive.user.realName,
      riskTags: this.asStringArray(archive.riskTags),
      baseProfile: this.asObject(archive.baseProfile),
      medicalHistory: this.asObject(archive.medicalHistory),
      longTermMemory: this.asObject(archive.longTermMemory)
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

  private asStringArray(value: unknown) {
    if (!Array.isArray(value)) {
      return [];
    }

    return value.filter((item): item is string => typeof item === "string");
  }
}
