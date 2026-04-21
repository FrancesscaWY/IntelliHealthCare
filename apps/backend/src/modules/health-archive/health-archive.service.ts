import {
  ForbiddenException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { Prisma, UserType } from "@prisma/client";
import type { AuthenticatedUser } from "../../common/auth/auth.types";
import {
  ensureArray,
  ensureRecord,
  getAge,
  toDateString,
  toPrismaJson
} from "../../common/utils/serializers";
import { PrismaService } from "../../infra/prisma/prisma.service";

@Injectable()
export class HealthArchiveService {
  constructor(private readonly prismaService: PrismaService) {}

  async getArchiveSummary(currentUser: AuthenticatedUser, elderId?: string) {
    const targetUserId = await this.resolveTargetUserId(currentUser, elderId);
    const [user, archive, reports, devices, alerts] = await Promise.all([
      this.prismaService.user.findUnique({
        where: { id: targetUserId }
      }),
      this.prismaService.healthArchive.findUnique({
        where: { userId: targetUserId }
      }),
      this.prismaService.report.count({
        where: {
          archive: {
            userId: targetUserId
          }
        }
      }),
      this.prismaService.device.count({
        where: { ownerId: targetUserId }
      }),
      this.prismaService.healthAlert.findMany({
        where: { userId: targetUserId },
        orderBy: { triggeredAt: "desc" },
        take: 3
      })
    ]);

    if (!user || !archive) {
      throw new NotFoundException("Health archive not found");
    }

    const baseProfile = ensureRecord(archive.baseProfile);

    return {
      userId: user.id,
      name: user.realName ?? user.nickname ?? user.phone,
      age: getAge(user.birthday),
      avatar: user.avatarUrl ?? (typeof baseProfile.avatar === "string" ? baseProfile.avatar : null),
      gender: user.gender,
      birthday: toDateString(user.birthday),
      reportCount: reports,
      deviceCount: devices,
      riskTags: ensureArray<string>(archive.riskTags),
      longTermMemory: archive.longTermMemory,
      recentAlerts: alerts.map((item) => ({
        alertId: item.id,
        title: item.title,
        level: item.level,
        status: item.status,
        triggeredAt: item.triggeredAt.toISOString()
      }))
    };
  }

  async getBasicInfo(currentUser: AuthenticatedUser, elderId?: string) {
    const targetUserId = await this.resolveTargetUserId(currentUser, elderId);
    const [user, archive] = await Promise.all([
      this.prismaService.user.findUnique({ where: { id: targetUserId } }),
      this.prismaService.healthArchive.findUnique({ where: { userId: targetUserId } })
    ]);

    if (!user || !archive) {
      throw new NotFoundException("Health archive not found");
    }

    const baseProfile = ensureRecord(archive.baseProfile);

    return {
      avatar: user.avatarUrl ?? baseProfile.avatar ?? null,
      name: user.realName ?? baseProfile.name ?? user.nickname ?? user.phone,
      idCard: user.idCard,
      gender: user.gender,
      birthday: toDateString(user.birthday),
      phone: user.phone,
      address: baseProfile.address ?? null,
      height: baseProfile.height ?? null,
      weight: baseProfile.weight ?? null,
      nativePlace: baseProfile.nativePlace ?? null,
      ethnicity: baseProfile.ethnicity ?? null,
      education: baseProfile.education ?? null,
      maritalStatus: baseProfile.maritalStatus ?? null,
      occupation: baseProfile.occupation ?? null,
      bloodType: baseProfile.bloodType ?? null,
      emergencyContact: baseProfile.emergencyContact ?? null
    };
  }

  async updateBasicInfo(
    currentUser: AuthenticatedUser,
    payload: Record<string, unknown>,
    elderId?: string
  ) {
    const targetUserId = await this.resolveTargetUserId(currentUser, elderId);
    const archive = await this.prismaService.healthArchive.findUnique({
      where: { userId: targetUserId }
    });

    if (!archive) {
      throw new NotFoundException("Health archive not found");
    }

    const baseProfile = ensureRecord(archive.baseProfile);
    const nextProfile = {
      ...baseProfile,
      ...payload
    };

    await this.prismaService.$transaction([
      this.prismaService.user.update({
        where: { id: targetUserId },
        data: {
          realName:
            typeof payload.name === "string" ? payload.name : undefined,
          avatarUrl:
            typeof payload.avatar === "string" ? payload.avatar : undefined,
          phone:
            typeof payload.phone === "string" ? payload.phone : undefined,
          birthday:
            typeof payload.birthday === "string"
              ? new Date(payload.birthday)
              : undefined
        }
      }),
      this.prismaService.healthArchive.update({
        where: { userId: targetUserId },
        data: {
          baseProfile: nextProfile as Prisma.InputJsonValue
        }
      })
    ]);

    return this.getBasicInfo(currentUser, targetUserId);
  }

  async getMedicalHistory(currentUser: AuthenticatedUser, elderId?: string) {
    const targetUserId = await this.resolveTargetUserId(currentUser, elderId);
    const archive = await this.prismaService.healthArchive.findUnique({
      where: { userId: targetUserId }
    });

    if (!archive) {
      throw new NotFoundException("Health archive not found");
    }

    return {
      medicalHistory: archive.medicalHistory,
      riskTags: archive.riskTags,
      longTermMemory: archive.longTermMemory
    };
  }

  async updateMedicalHistory(
    currentUser: AuthenticatedUser,
    payload: {
      medicalHistory?: Record<string, unknown>;
      riskTags?: unknown[];
      longTermMemory?: Record<string, unknown>;
    },
    elderId?: string
  ) {
    const targetUserId = await this.resolveTargetUserId(currentUser, elderId);
    const archive = await this.prismaService.healthArchive.findUnique({
      where: { userId: targetUserId }
    });

    if (!archive) {
      throw new NotFoundException("Health archive not found");
    }

    await this.prismaService.healthArchive.update({
      where: { userId: targetUserId },
      data: {
        medicalHistory: toPrismaJson(
          payload.medicalHistory ?? archive.medicalHistory
        ),
        riskTags: toPrismaJson(payload.riskTags ?? archive.riskTags),
        longTermMemory: toPrismaJson(
          payload.longTermMemory ?? archive.longTermMemory
        )
      }
    });

    return this.getMedicalHistory(currentUser, targetUserId);
  }

  private async resolveTargetUserId(currentUser: AuthenticatedUser, elderId?: string) {
    if (!elderId) {
      if (currentUser.type === UserType.ELDER) {
        return currentUser.id;
      }

      const binding = await this.prismaService.familyBinding.findFirst({
        where: { familyMemberId: currentUser.id },
        orderBy: { createdAt: "asc" }
      });

      return binding?.elderMemberId ?? currentUser.id;
    }

    if (currentUser.id === elderId) {
      return elderId;
    }

    if (
      ([UserType.ADMIN, UserType.ORG_MANAGER, UserType.STAFF] as UserType[]).includes(
        currentUser.type
      )
    ) {
      return elderId;
    }

    const binding = await this.prismaService.familyBinding.findFirst({
      where: {
        familyMemberId: currentUser.id,
        elderMemberId: elderId
      }
    });

    if (!binding) {
      throw new ForbiddenException("No permission to access elder archive");
    }

    return elderId;
  }
}
