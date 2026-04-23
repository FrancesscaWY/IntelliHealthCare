import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Roles } from "../../common/auth/roles.decorator";
import { RolesGuard } from "../../common/auth/roles.guard";
import { JwtAuthGuard } from "../../common/auth/jwt-auth.guard";
import { PaginationQueryDto } from "../../common/dto/pagination-query.dto";
import { SwaggerTags } from "../../common/http/swagger-tags";
import { AdminService } from "./admin.service";

@Controller("admin")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("PLATFORM_ADMIN", "ORG_MANAGER", "DOCTOR", "CAREGIVER", "THERAPIST", "CUSTOMER_SERVICE")
@ApiTags(SwaggerTags.AdminWorkbench)
@ApiBearerAuth()
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get("dashboard/overview")
  @ApiOperation({
    summary: "获取后台总览数据",
    description: "后台首页进入后的首个接口，用于统计卡片、待处理事项和运营概览。"
  })
  getDashboardOverview() {
    return this.adminService.getDashboardOverview();
  }

  @Get("elders/:elderId")
  @ApiOperation({
    summary: "获取长者详情",
    description: "后台长者详情页接口。elderId 通常来自后台列表、工单或订单关联数据。"
  })
  getElderDetail(@Param("elderId") elderId: string) {
    return this.adminService.getElderDetail(elderId);
  }

  @Get("work-orders")
  @ApiOperation({
    summary: "获取工单列表",
    description: "后台工单列表页接口，支持分页。workOrderId 需要从该列表返回中获取。"
  })
  listWorkOrders(@Query() query: PaginationQueryDto) {
    return this.adminService.listWorkOrders(query.page, query.pageSize);
  }
}
