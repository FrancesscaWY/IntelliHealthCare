import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../common/auth/jwt-auth.guard";
import { PaginationQueryDto } from "../../common/dto/pagination-query.dto";
import { SwaggerTags } from "../../common/http/swagger-tags";
import { ServiceCatalogService } from "./service-catalog.service";

@Controller("app/services")
@UseGuards(JwtAuthGuard)
@ApiTags(SwaggerTags.AppServiceCatalog)
@ApiBearerAuth()
export class AppServiceCatalogController {
  constructor(private readonly serviceCatalogService: ServiceCatalogService) {}

  @Get("categories")
  @ApiOperation({
    summary: "获取服务分类",
    description: "服务首页进入后先调用，用于展示家政护理、康复理疗、上门体检、养老机构等一级入口。"
  })
  getCategories() {
    return this.serviceCatalogService.getCategories();
  }

  @Get("home-care")
  @ApiOperation({
    summary: "获取家政护理列表",
    description: "家政护理列表页接口，支持分页。serviceId 需从此列表返回中获取。"
  })
  listHomeCareServices(@Query() query: PaginationQueryDto) {
    return this.serviceCatalogService.listServices("home-care", query);
  }

  @Get("home-care/:serviceId")
  @ApiOperation({
    summary: "获取家政护理详情",
    description: "家政护理详情页接口。serviceId 请先从家政护理列表中取得。"
  })
  getHomeCareServiceDetail(@Param("serviceId") serviceId: string) {
    return this.serviceCatalogService.getServiceDetail("home-care", serviceId);
  }

  @Get("rehab-therapy")
  @ApiOperation({
    summary: "获取康复理疗列表",
    description: "康复理疗列表页接口，常用于康复项目浏览和下单前选择服务。"
  })
  listRehabTherapyServices(@Query() query: PaginationQueryDto) {
    return this.serviceCatalogService.listServices("rehab-therapy", query);
  }

  @Get("rehab-therapy/:serviceId")
  @ApiOperation({
    summary: "获取康复理疗详情",
    description: "康复理疗详情页接口。可配合预约选项接口进入下单链路。"
  })
  getRehabTherapyServiceDetail(@Param("serviceId") serviceId: string) {
    return this.serviceCatalogService.getServiceDetail("rehab-therapy", serviceId);
  }

  @Get("home-exam")
  @ApiOperation({
    summary: "获取上门体检列表",
    description: "上门体检列表页接口，支持分页。"
  })
  listHomeExamServices(@Query() query: PaginationQueryDto) {
    return this.serviceCatalogService.listServices("home-exam", query);
  }

  @Get("home-exam/:serviceId")
  @ApiOperation({
    summary: "获取上门体检详情",
    description: "上门体检详情页接口。serviceId 请先从上门体检列表返回中获取。"
  })
  getHomeExamServiceDetail(@Param("serviceId") serviceId: string) {
    return this.serviceCatalogService.getServiceDetail("home-exam", serviceId);
  }

  @Get("elderly-care")
  @ApiOperation({
    summary: "获取养老机构列表",
    description: "养老机构列表页接口，支持分页。"
  })
  listElderlyCareServices(@Query() query: PaginationQueryDto) {
    return this.serviceCatalogService.listServices("elderly-care", query);
  }

  @Get("elderly-care/:serviceId")
  @ApiOperation({
    summary: "获取养老机构详情",
    description: "养老机构详情页接口。serviceId 请先从养老机构列表中获取。"
  })
  getElderlyCareServiceDetail(@Param("serviceId") serviceId: string) {
    return this.serviceCatalogService.getServiceDetail("elderly-care", serviceId);
  }
}
