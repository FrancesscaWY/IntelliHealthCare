import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { UserType } from "@prisma/client";
import type { AuthenticatedUser } from "../../common/auth/auth.types";
import { paginate, toDateString, toDateTimeString, toNumber } from "../../common/utils/serializers";
import { PrismaService } from "../../infra/prisma/prisma.service";

interface AddressInput {
  label?: string;
  elderId?: string | null;
  receiverName: string;
  receiverPhone: string;
  province: string;
  city: string;
  district: string;
  street?: string | null;
  detailAddress: string;
  longitude?: number | null;
  latitude?: number | null;
  isDefault?: boolean;
}

@Injectable()
export class UsersService {
  constructor(private readonly prismaService: PrismaService) {}

  async getCurrentUser(userId: string) {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: {
            role: true
          }
        }
      }
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    return {
      userId: user.id,
      name: user.realName ?? user.nickname ?? user.phone,
      phone: user.phone,
      avatar: user.avatarUrl,
      gender: user.gender,
      birthday: toDateString(user.birthday),
      realNameVerified: user.realNameStatus === "VERIFIED",
      type: user.type,
      roles: user.roles.map((item) => item.role.code)
    };
  }

  async getProfile(user: AuthenticatedUser) {
    const [profile, footprints, reviews, coupons, bindings] = await Promise.all([
      this.prismaService.user.findUnique({
        where: { id: user.id }
      }),
      this.prismaService.userFootprint.count({
        where: { userId: user.id }
      }),
      this.prismaService.orderReview.count({
        where: { userId: user.id }
      }),
      this.prismaService.userCoupon.count({
        where: { userId: user.id, status: "UNUSED" }
      }),
      this.prismaService.familyBinding.findMany({
        where: { familyMemberId: user.id },
        include: {
          elderMember: true
        }
      })
    ]);

    if (!profile) {
      throw new NotFoundException("User not found");
    }

    return {
      userId: profile.id,
      nickname: profile.nickname,
      realName: profile.realName,
      avatar: profile.avatarUrl,
      phone: profile.phone,
      city: profile.city,
      gender: profile.gender,
      birthday: toDateString(profile.birthday),
      realNameStatus: profile.realNameStatus,
      stats: {
        footprints,
        reviews,
        coupons
      },
      boundElders: bindings.map((item) => ({
        elderId: item.elderMemberId,
        relation: item.relationLabel,
        name: item.elderMember.realName ?? item.elderMember.nickname ?? item.elderMember.phone
      }))
    };
  }

  async updateProfile(
    userId: string,
    payload: {
      nickname?: string;
      avatar?: string;
      city?: string;
      gender?: "MALE" | "FEMALE" | "UNKNOWN";
      birthday?: string;
    }
  ) {
    const user = await this.prismaService.user.update({
      where: { id: userId },
      data: {
        nickname: payload.nickname,
        avatarUrl: payload.avatar,
        city: payload.city,
        gender: payload.gender,
        birthday: payload.birthday ? new Date(payload.birthday) : undefined
      }
    });

    return {
      userId: user.id,
      nickname: user.nickname,
      avatar: user.avatarUrl,
      city: user.city,
      gender: user.gender,
      birthday: toDateString(user.birthday)
    };
  }

  async submitRealName(
    userId: string,
    payload: {
      realName: string;
      idCard: string;
    }
  ) {
    const user = await this.prismaService.user.update({
      where: { id: userId },
      data: {
        realName: payload.realName,
        idCard: payload.idCard,
        realNameStatus: "PENDING"
      }
    });

    return {
      userId: user.id,
      realName: user.realName,
      realNameStatus: user.realNameStatus
    };
  }

  async getFamilyBindings(user: AuthenticatedUser) {
    if (user.type !== UserType.FAMILY) {
      return [];
    }

    const bindings = await this.prismaService.familyBinding.findMany({
      where: { familyMemberId: user.id },
      include: {
        elderMember: true
      },
      orderBy: {
        createdAt: "asc"
      }
    });

    return bindings.map((item) => ({
      bindingId: item.id,
      elderId: item.elderMemberId,
      elderName: item.elderMember.realName ?? item.elderMember.nickname ?? item.elderMember.phone,
      relationLabel: item.relationLabel,
      authScope: item.authScope
    }));
  }

  async getAddresses(user: AuthenticatedUser) {
    const where =
      user.type === UserType.FAMILY
        ? { ownerId: user.id }
        : {
            OR: [{ ownerId: user.id }, { elderId: user.id }]
          };

    const addresses = await this.prismaService.address.findMany({
      where,
      orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }]
    });

    return addresses.map((item) => ({
      addressId: item.id,
      elderId: item.elderId,
      label: item.label,
      receiverName: item.receiverName,
      receiverPhone: item.receiverPhone,
      province: item.province,
      city: item.city,
      district: item.district,
      street: item.street,
      detailAddress: item.detailAddress,
      longitude: toNumber(item.longitude),
      latitude: toNumber(item.latitude),
      isDefault: item.isDefault
    }));
  }

  async createAddress(user: AuthenticatedUser, payload: AddressInput) {
    await this.assertAddressAccess(user, payload.elderId ?? null);

    const result = await this.prismaService.$transaction(async (tx) => {
      if (payload.isDefault) {
        await tx.address.updateMany({
          where: { ownerId: user.id },
          data: { isDefault: false }
        });
      }

      return tx.address.create({
        data: {
          ownerId: user.id,
          elderId: payload.elderId ?? null,
          label: payload.label,
          receiverName: payload.receiverName,
          receiverPhone: payload.receiverPhone,
          province: payload.province,
          city: payload.city,
          district: payload.district,
          street: payload.street ?? null,
          detailAddress: payload.detailAddress,
          longitude: payload.longitude ?? null,
          latitude: payload.latitude ?? null,
          isDefault: payload.isDefault ?? false
        }
      });
    });

    return {
      addressId: result.id,
      isDefault: result.isDefault
    };
  }

  async updateAddress(user: AuthenticatedUser, addressId: string, payload: AddressInput) {
    const address = await this.prismaService.address.findUnique({
      where: { id: addressId }
    });

    if (!address) {
      throw new NotFoundException("Address not found");
    }

    if (address.ownerId !== user.id) {
      throw new ForbiddenException("Address is not owned by current user");
    }

    await this.assertAddressAccess(user, payload.elderId ?? address.elderId);

    const result = await this.prismaService.$transaction(async (tx) => {
      if (payload.isDefault) {
        await tx.address.updateMany({
          where: { ownerId: user.id },
          data: { isDefault: false }
        });
      }

      return tx.address.update({
        where: { id: addressId },
        data: {
          elderId: payload.elderId ?? address.elderId,
          label: payload.label ?? address.label,
          receiverName: payload.receiverName ?? address.receiverName,
          receiverPhone: payload.receiverPhone ?? address.receiverPhone,
          province: payload.province ?? address.province,
          city: payload.city ?? address.city,
          district: payload.district ?? address.district,
          street: payload.street ?? address.street,
          detailAddress: payload.detailAddress ?? address.detailAddress,
          longitude: payload.longitude ?? toNumber(address.longitude),
          latitude: payload.latitude ?? toNumber(address.latitude),
          isDefault: payload.isDefault ?? address.isDefault
        }
      });
    });

    return {
      addressId: result.id,
      isDefault: result.isDefault
    };
  }

  async getHomeDashboard(user: AuthenticatedUser) {
    const [services, articles, diseases, medications] = await Promise.all([
      this.prismaService.serviceItem.findMany({
        where: { enabled: true },
        orderBy: [{ salesVolume: "desc" }, { rating: "desc" }],
        take: 4
      }),
      this.prismaService.article.findMany({
        where: { status: "PUBLISHED" },
        orderBy: [{ sortOrder: "asc" }, { publishedAt: "desc" }],
        take: 3
      }),
      this.prismaService.diseaseKnowledge.findMany({
        where: { status: "PUBLISHED" },
        orderBy: { publishedAt: "desc" },
        take: 4
      }),
      this.prismaService.medication.findMany({
        where: {
          userId: await this.resolvePrimaryHealthUserId(user)
        },
        orderBy: { createdAt: "desc" },
        take: 1
      })
    ]);

    const medication = medications[0];

    return {
      city: (await this.prismaService.user.findUnique({ where: { id: user.id } }))?.city ?? "上海市",
      serviceEntries: services.map((item) => ({
        serviceId: item.id,
        title: item.title,
        category: item.category,
        price: toNumber(item.price),
        image: item.coverUrl
      })),
      featureEntries: [
        { key: "archive", title: "健康档案" },
        { key: "service", title: "上门服务" },
        { key: "report", title: "报告中心" }
      ],
      healthReminder: medication
        ? {
            type: "medication",
            title: "用药提醒",
            content: `${JSON.stringify(medication.scheduleTimes ?? []).replace(/[\[\]\"]/g, "") || "今日"} ${medication.name} ${medication.dosage}`
          }
        : null,
      hotDiseases: diseases.map((item) => ({
        diseaseId: item.id,
        title: item.title,
        summary: item.summary
      })),
      recommendedArticles: articles.map((item) => ({
        articleId: item.id,
        title: item.title,
        summary: item.summary,
        coverUrl: item.coverUrl
      }))
    };
  }

  async getCurrentLocation(user: AuthenticatedUser) {
    const profile = await this.prismaService.user.findUnique({
      where: { id: user.id }
    });

    return {
      city: profile?.city ?? "上海市",
      district: "浦东新区"
    };
  }

  async getLocationCities() {
    const institutions = await this.prismaService.institution.findMany({
      select: {
        city: true,
        district: true
      },
      orderBy: [{ city: "asc" }, { district: "asc" }]
    });

    return institutions.reduce<Array<{ city: string; districts: string[] }>>((acc, item) => {
      const existing = acc.find((entry) => entry.city === item.city);
      if (existing) {
        if (item.district && !existing.districts.includes(item.district)) {
          existing.districts.push(item.district);
        }
        return acc;
      }

      acc.push({
        city: item.city,
        districts: item.district ? [item.district] : []
      });
      return acc;
    }, []);
  }

  async getHotTags() {
    const keywords = await this.prismaService.hotSearchKeyword.findMany({
      orderBy: [{ rank: "asc" }, { hotScore: "desc" }],
      take: 10
    });

    return keywords.map((item) => ({
      keyword: item.keyword,
      rank: item.rank,
      hotScore: item.hotScore
    }));
  }

  async getSearchHistory(userId: string) {
    const history = await this.prismaService.searchHistory.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 20
    });

    return history.map((item) => ({
      id: item.id,
      keyword: item.keyword,
      targetType: item.targetType,
      createdAt: toDateTimeString(item.createdAt)
    }));
  }

  async addSearchHistory(userId: string, keyword: string) {
    const history = await this.prismaService.searchHistory.create({
      data: {
        userId,
        keyword
      }
    });

    return {
      id: history.id,
      keyword: history.keyword
    };
  }

  async clearSearchHistory(userId: string) {
    await this.prismaService.searchHistory.deleteMany({
      where: { userId }
    });

    return {
      cleared: true
    };
  }

  async searchGlobal(keyword: string, page: number, pageSize: number) {
    const [services, articles, diseases, activities] = await Promise.all([
      this.prismaService.serviceItem.findMany({
        where: { title: { contains: keyword, mode: "insensitive" }, enabled: true },
        take: 20
      }),
      this.prismaService.article.findMany({
        where: { title: { contains: keyword, mode: "insensitive" }, status: "PUBLISHED" },
        take: 20
      }),
      this.prismaService.diseaseKnowledge.findMany({
        where: { title: { contains: keyword, mode: "insensitive" }, status: "PUBLISHED" },
        take: 20
      }),
      this.prismaService.activity.findMany({
        where: { title: { contains: keyword, mode: "insensitive" } },
        take: 20
      })
    ]);

    const list = [
      ...services.map((item) => ({
        targetType: "service",
        targetId: item.id,
        title: item.title,
        summary: item.summary,
        coverUrl: item.coverUrl
      })),
      ...articles.map((item) => ({
        targetType: "article",
        targetId: item.id,
        title: item.title,
        summary: item.summary,
        coverUrl: item.coverUrl
      })),
      ...diseases.map((item) => ({
        targetType: "disease",
        targetId: item.id,
        title: item.title,
        summary: item.summary,
        coverUrl: null
      })),
      ...activities.map((item) => ({
        targetType: "activity",
        targetId: item.id,
        title: item.title,
        summary: item.category,
        coverUrl: item.coverUrl
      }))
    ];

    return paginate(list, page, pageSize);
  }

  private async resolvePrimaryHealthUserId(user: AuthenticatedUser) {
    if (user.type === UserType.ELDER) {
      return user.id;
    }

    const binding = await this.prismaService.familyBinding.findFirst({
      where: { familyMemberId: user.id },
      orderBy: { createdAt: "asc" }
    });

    return binding?.elderMemberId ?? user.id;
  }

  private async assertAddressAccess(user: AuthenticatedUser, elderId: string | null) {
    if (!elderId) {
      return;
    }

    if (user.type === UserType.ELDER && user.id !== elderId) {
      throw new ForbiddenException("Current elder cannot manage another elder address");
    }

    if (user.type === UserType.FAMILY) {
      const binding = await this.prismaService.familyBinding.findFirst({
        where: {
          familyMemberId: user.id,
          elderMemberId: elderId
        }
      });

      if (!binding) {
        throw new ForbiddenException("Elder is not bound to current family user");
      }

      return;
    }

    if (
      !([UserType.ADMIN, UserType.ORG_MANAGER, UserType.STAFF] as UserType[]).includes(
        user.type
      )
    ) {
      throw new BadRequestException("Unsupported address owner type");
    }
  }
}
