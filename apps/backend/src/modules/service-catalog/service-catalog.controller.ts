import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../../common/auth/jwt-auth.guard";
import { PaginationQueryDto } from "../../common/dto/pagination-query.dto";
import { ServiceCatalogService } from "./service-catalog.service";

@Controller("app/services")
@UseGuards(JwtAuthGuard)
export class AppServiceCatalogController {
  constructor(private readonly serviceCatalogService: ServiceCatalogService) {}

  @Get("categories")
  getCategories() {
    return this.serviceCatalogService.getCategories();
  }

  @Get("home-care")
  listHomeCareServices(@Query() query: PaginationQueryDto) {
    return this.serviceCatalogService.listServices("home-care", query);
  }

  @Get("home-care/:serviceId")
  getHomeCareServiceDetail(@Param("serviceId") serviceId: string) {
    return this.serviceCatalogService.getServiceDetail("home-care", serviceId);
  }

  @Get("rehab-therapy")
  listRehabTherapyServices(@Query() query: PaginationQueryDto) {
    return this.serviceCatalogService.listServices("rehab-therapy", query);
  }

  @Get("rehab-therapy/:serviceId")
  getRehabTherapyServiceDetail(@Param("serviceId") serviceId: string) {
    return this.serviceCatalogService.getServiceDetail("rehab-therapy", serviceId);
  }

  @Get("home-exam")
  listHomeExamServices(@Query() query: PaginationQueryDto) {
    return this.serviceCatalogService.listServices("home-exam", query);
  }

  @Get("home-exam/:serviceId")
  getHomeExamServiceDetail(@Param("serviceId") serviceId: string) {
    return this.serviceCatalogService.getServiceDetail("home-exam", serviceId);
  }

  @Get("elderly-care")
  listElderlyCareServices(@Query() query: PaginationQueryDto) {
    return this.serviceCatalogService.listServices("elderly-care", query);
  }

  @Get("elderly-care/:serviceId")
  getElderlyCareServiceDetail(@Param("serviceId") serviceId: string) {
    return this.serviceCatalogService.getServiceDetail("elderly-care", serviceId);
  }
}
