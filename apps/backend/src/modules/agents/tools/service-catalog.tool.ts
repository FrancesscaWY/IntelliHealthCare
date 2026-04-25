import { Injectable } from "@nestjs/common";
import { Prisma, ServiceCategory } from "@prisma/client";
import { PrismaService } from "../../../infra/prisma/prisma.service";
import type { ServiceCatalogItem } from "../domain/agent-types";

interface SearchServiceCatalogInput {
  query?: string;
  category?: ServiceCategory;
  city?: string;
  limit: number;
}

@Injectable()
export class ServiceCatalogTool {
  constructor(private readonly prismaService: PrismaService) {}

  async searchServiceCatalog(
    input: SearchServiceCatalogInput
  ): Promise<ServiceCatalogItem[]> {
    const searchTerms = this.buildSearchTerms(input.query);
    const searchWhere = this.buildSearchWhere(input.category, searchTerms);
    const fallbackWhere = this.buildSearchWhere(input.category, []);
    const items = await this.prismaService.serviceItem.findMany({
      where: searchWhere,
      orderBy: [{ rating: "desc" }, { salesVolume: "desc" }],
      take: Math.max(input.limit * 3, input.limit)
    });
    const fallbackItems =
      items.length === 0 && searchTerms.length > 0
        ? await this.prismaService.serviceItem.findMany({
            where: fallbackWhere,
            orderBy: [{ rating: "desc" }, { salesVolume: "desc" }],
            take: Math.max(input.limit * 3, input.limit)
          })
        : items;

    const normalized = fallbackItems.map((item) => ({
      id: item.id,
      title: item.title,
      category: item.category,
      summary: item.summary,
      price: Number(item.price),
      rating: item.rating ? Number(item.rating) : null,
      salesVolume: item.salesVolume,
      regionScope: this.asStringArray(item.regionScope),
      tags: this.asStringArray(item.tags),
      coverUrl: item.coverUrl
    }));

    const filtered =
      input.city?.trim()
        ? normalized.filter((item) =>
            item.regionScope.some((region) => region.includes(input.city!))
          )
        : normalized;

    const candidates = filtered.length > 0 ? filtered : normalized;

    return candidates.slice(0, input.limit);
  }

  private buildSearchWhere(category: ServiceCategory | undefined, searchTerms: string[]) {
    const where: Prisma.ServiceItemWhereInput = {
      enabled: true
    };

    if (category) {
      where.category = category;
    }

    if (searchTerms.length > 0) {
      where.OR = searchTerms.flatMap((term) => [
        {
          title: {
            contains: term,
            mode: "insensitive"
          }
        },
        {
          summary: {
            contains: term,
            mode: "insensitive"
          }
        }
      ]);
    }

    return where;
  }

  private buildSearchTerms(query?: string) {
    const normalized = query?.trim();

    if (!normalized) {
      return [];
    }

    const tokens = normalized
      .split(/[\s,，。！？、;；/]+/)
      .map((item) => item.trim())
      .filter((item) => item.length >= 2);
    const domainKeywords = [
      "康复",
      "理疗",
      "训练",
      "护理",
      "家政",
      "体检",
      "慢病",
      "养老",
      "照护",
      "陪诊",
      "清洁"
    ].filter((keyword) => normalized.includes(keyword));

    return Array.from(new Set([normalized, ...tokens, ...domainKeywords]));
  }

  private asStringArray(value: unknown) {
    if (!Array.isArray(value)) {
      return [];
    }

    return value.filter((item): item is string => typeof item === "string");
  }
}
