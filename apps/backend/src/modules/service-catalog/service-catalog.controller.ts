import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import { IsIn } from "class-validator";
import { JwtAuthGuard } from "../../common/auth/jwt-auth.guard";
import { PaginationQueryDto } from "../../common/dto/pagination-query.dto";
import { ServiceCatalogService } from "./service-catalog.service";

class CategoryParamDto {
  @IsIn(["home-care", "rehab-therapy", "home-exam", "elderly-care"])
  category!: "home-care" | "rehab-therapy" | "home-exam" | "elderly-care";
}

@Controller("app/services")
@UseGuards(JwtAuthGuard)
export class AppServiceCatalogController {
  constructor(private readonly serviceCatalogService: ServiceCatalogService) {}

  @Get("categories")
  getCategories() {
    return this.serviceCatalogService.getCategories();
  }

  @Get(":category")
  listServices(
    @Param() params: CategoryParamDto,
    @Query() query: PaginationQueryDto
  ) {
    return this.serviceCatalogService.listServices(params.category, query);
  }

  @Get(":category/:serviceId")
  getServiceDetail(
    @Param() params: CategoryParamDto & { serviceId: string }
  ) {
    return this.serviceCatalogService.getServiceDetail(params.category, params.serviceId);
  }
}
