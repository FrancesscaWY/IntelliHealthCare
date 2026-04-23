import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, ServiceCategory } from "@prisma/client";
import { PaginationQueryDto } from "../../common/dto/pagination-query.dto";
import { paginate, toNumber } from "../../common/utils/serializers";
import { PrismaService } from "../../infra/prisma/prisma.service";

const CATEGORY_ROUTE_MAP = {
  "home-care": ServiceCategory.HOME_CARE,
  "rehab-therapy": ServiceCategory.REHAB_THERAPY,
  "home-exam": ServiceCategory.HOME_EXAM,
  "elderly-care": ServiceCategory.ELDERLY_CARE
} as const;

@Injectable()
export class ServiceCatalogService {
  constructor(private readonly prismaService: PrismaService) {}

  async getCategories() {
    const categories = await Promise.all(
      Object.entries(CATEGORY_ROUTE_MAP).map(async ([slug, category]) => {
        const [count, topItem] = await Promise.all([
          this.prismaService.serviceItem.count({
            where: { category, enabled: true }
          }),
          this.prismaService.serviceItem.findFirst({
            where: { category, enabled: true },
            orderBy: [{ salesVolume: "desc" }, { rating: "desc" }]
          })
        ]);

        return {
          slug,
          category,
          count,
          coverUrl: topItem?.coverUrl ?? null,
          title: this.getCategoryTitle(category)
        };
      })
    );

    return categories;
  }

  async listServices(categorySlug: keyof typeof CATEGORY_ROUTE_MAP, query: PaginationQueryDto) {
    const category = CATEGORY_ROUTE_MAP[categorySlug];
    const services = await this.prismaService.serviceItem.findMany({
      where: {
        category,
        enabled: true
      },
      include: {
        institution: true
      },
      orderBy: [{ salesVolume: "desc" }, { rating: "desc" }, { createdAt: "desc" }]
    });

    return paginate(services.map((item) => this.toServiceCard(item)), query.page, query.pageSize);
  }

  async getServiceDetail(categorySlug: keyof typeof CATEGORY_ROUTE_MAP, serviceId: string) {
    const category = CATEGORY_ROUTE_MAP[categorySlug];
    const service = await this.prismaService.serviceItem.findFirst({
      where: {
        id: serviceId,
        category,
        enabled: true
      },
      include: {
        institution: true
      }
    });

    if (!service) {
      throw new NotFoundException("Service not found");
    }

    return {
      serviceId: service.id,
      code: service.code,
      category: service.category,
      title: service.title,
      summary: service.summary,
      price: toNumber(service.price),
      marketPrice: toNumber(service.marketPrice),
      durationMinutes: service.durationMinutes,
      rating: toNumber(service.rating),
      salesVolume: service.salesVolume,
      coverUrl: service.coverUrl,
      tags: service.tags,
      regionScope: service.regionScope,
      serviceContent: service.serviceContent,
      ragSnippet: service.ragSnippet,
      institution: service.institution
        ? {
            institutionId: service.institution.id,
            name: service.institution.name,
            city: service.institution.city,
            district: service.institution.district,
            address: service.institution.address,
            rating: toNumber(service.institution.rating)
          }
        : null
    };
  }

  private getCategoryTitle(category: ServiceCategory) {
    switch (category) {
      case ServiceCategory.HOME_CARE:
        return "家政护理";
      case ServiceCategory.REHAB_THERAPY:
        return "康复理疗";
      case ServiceCategory.HOME_EXAM:
        return "上门体检";
      case ServiceCategory.ELDERLY_CARE:
        return "养老机构";
    }
  }

  private toServiceCard(
    item: {
      id: string;
      code: string;
      category: ServiceCategory;
      title: string;
      summary: string | null;
      price: Prisma.Decimal;
      marketPrice: Prisma.Decimal | null;
      durationMinutes: number | null;
      rating: Prisma.Decimal | null;
      salesVolume: number;
      coverUrl: string | null;
      tags: Prisma.JsonValue;
      institution: {
        id: string;
        name: string;
        city: string;
      } | null;
    }
  ) {
    return {
      serviceId: item.id,
      code: item.code,
      category: item.category,
      title: item.title,
      summary: item.summary,
      price: toNumber(item.price),
      marketPrice: toNumber(item.marketPrice),
      durationMinutes: item.durationMinutes,
      rating: toNumber(item.rating),
      salesVolume: item.salesVolume,
      coverUrl: item.coverUrl,
      tags: item.tags,
      institution: item.institution
        ? {
            institutionId: item.institution.id,
            name: item.institution.name,
            city: item.institution.city
          }
        : null
    };
  }
}
