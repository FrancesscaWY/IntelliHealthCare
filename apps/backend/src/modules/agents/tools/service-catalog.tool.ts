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
    const where: Prisma.ServiceItemWhereInput = {
      enabled: true
    };

    if (input.category) {
      where.category = input.category;
    }

    if (input.query) {
      where.OR = [
        {
          title: {
            contains: input.query,
            mode: "insensitive"
          }
        },
        {
          summary: {
            contains: input.query,
            mode: "insensitive"
          }
        }
      ];
    }

    const items = await this.prismaService.serviceItem.findMany({
      where,
      orderBy: [{ rating: "desc" }, { salesVolume: "desc" }],
      take: Math.max(input.limit * 3, input.limit)
    });

    const normalized = items.map((item) => ({
      id: item.id,
      title: item.title,
      category: item.category,
      summary: item.summary,
      price: Number(item.price),
      rating: item.rating ? Number(item.rating) : null,
      salesVolume: item.salesVolume,
      regionScope: this.asStringArray(item.regionScope),
      tags: this.asStringArray(item.tags)
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

  private asStringArray(value: unknown) {
    if (!Array.isArray(value)) {
      return [];
    }

    return value.filter((item): item is string => typeof item === "string");
  }
}
