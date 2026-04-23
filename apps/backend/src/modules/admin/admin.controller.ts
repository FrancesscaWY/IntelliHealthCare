import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import { ServiceCategory, WorkOrderStatus } from "@prisma/client";
import { IsEnum, IsOptional, IsString } from "class-validator";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiPropertyOptional,
  ApiTags
} from "@nestjs/swagger";
import { Roles } from "../../common/auth/roles.decorator";
import { RolesGuard } from "../../common/auth/roles.guard";
import { JwtAuthGuard } from "../../common/auth/jwt-auth.guard";
import { PaginationQueryDto } from "../../common/dto/pagination-query.dto";
import { SwaggerTags } from "../../common/http/swagger-tags";
import { AdminService } from "./admin.service";

class AdminEldersQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: "关键字，可匹配长者昵称、姓名或手机号。",
    example: "王"
  })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional({
    description: "风险标签筛选。",
    example: "高血压"
  })
  @IsOptional()
  @IsString()
  tag?: string;
}

class AdminWorkOrdersQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: "工单状态筛选。",
    enum: WorkOrderStatus,
    example: WorkOrderStatus.ASSIGNED
  })
  @IsOptional()
  @IsEnum(WorkOrderStatus)
  status?: WorkOrderStatus;

  @ApiPropertyOptional({
    description: "服务分类筛选。",
    enum: ServiceCategory,
    example: ServiceCategory.REHAB_THERAPY
  })
  @IsOptional()
  @IsEnum(ServiceCategory)
  serviceCategory?: ServiceCategory;

  @ApiPropertyOptional({
    description: "关键字，可匹配工单编号、订单号、服务标题、客户姓名或手机号。",
    example: "王兰"
  })
  @IsOptional()
  @IsString()
  keyword?: string;
}

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

  @Get("elders")
  @ApiOperation({
    summary: "获取长者列表",
    description: "后台用户列表页接口，支持分页、关键字和风险标签筛选。"
  })
  listElders(@Query() query: AdminEldersQueryDto) {
    return this.adminService.listElders(
      query.page,
      query.pageSize,
      query.keyword,
      query.tag
    );
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
  listWorkOrders(@Query() query: AdminWorkOrdersQueryDto) {
    return this.adminService.listWorkOrders(
      query.page,
      query.pageSize,
      query.status,
      query.serviceCategory,
      query.keyword
    );
  }
}
