import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { IsIn, IsOptional, IsString } from "class-validator";
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

class AnalyticsRangeQueryDto {
  @ApiPropertyOptional({
    description: "时间视角。",
    example: "weekly",
    enum: ["weekly", "monthly"]
  })
  @IsOptional()
  @IsIn(["weekly", "monthly"])
  range?: "weekly" | "monthly";
}

class AnalyticsTableQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: "关键字。",
    example: "王"
  })
  @IsOptional()
  @IsString()
  keyword?: string;
}

@Controller("admin/analytics")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("PLATFORM_ADMIN", "ORG_MANAGER", "DOCTOR", "CUSTOMER_SERVICE")
@ApiTags(SwaggerTags.AdminAnalytics)
@ApiBearerAuth()
export class AdminAnalyticsController {
  constructor(private readonly adminService: AdminService) {}

  @Get("data-board")
  @ApiOperation({
    summary: "获取用户概况页数据",
    description: "analytics/data-board 页面接口。"
  })
  getDataBoard(@Query() query: AnalyticsRangeQueryDto) {
    return this.adminService.getAnalyticsDataBoard(query.range);
  }

  @Get("trade-overview")
  @ApiOperation({
    summary: "获取交易概况页数据",
    description: "analytics/trade-overview 页面接口。"
  })
  getTradeOverview() {
    return this.adminService.getAnalyticsTradeOverview();
  }

  @Get("product-analysis")
  @ApiOperation({
    summary: "获取产品分析页数据",
    description: "analytics/product-analysis 页面接口。"
  })
  getProductAnalysis(@Query() query: AnalyticsTableQueryDto) {
    return this.adminService.getAnalyticsProductAnalysis(
      query.page,
      query.pageSize,
      query.keyword
    );
  }

  @Get("service-performance")
  @ApiOperation({
    summary: "获取业绩统计页数据",
    description: "analytics/service-performance 页面接口。"
  })
  getServicePerformance(@Query() query: AnalyticsTableQueryDto) {
    return this.adminService.getAnalyticsServicePerformance(
      query.page,
      query.pageSize,
      query.keyword
    );
  }

  @Get("service-repurchase")
  @ApiOperation({
    summary: "获取复购分析页数据",
    description: "analytics/service-repurchase 页面接口。"
  })
  getServiceRepurchase(@Query() query: AnalyticsTableQueryDto) {
    return this.adminService.getAnalyticsServiceRepurchase(
      query.page,
      query.pageSize,
      query.keyword
    );
  }

  @Get("service-review")
  @ApiOperation({
    summary: "获取评价统计页数据",
    description: "analytics/service-review 页面接口。"
  })
  getServiceReview(@Query() query: AnalyticsTableQueryDto) {
    return this.adminService.getAnalyticsServiceReview(
      query.page,
      query.pageSize,
      query.keyword
    );
  }

  @Get("service-workorder")
  @ApiOperation({
    summary: "获取工单分析页数据",
    description: "analytics/service-workorder 页面接口。"
  })
  getServiceWorkOrder(@Query() query: AnalyticsTableQueryDto) {
    return this.adminService.getAnalyticsServiceWorkOrder(
      query.page,
      query.pageSize,
      query.keyword
    );
  }

  @Get("user-age")
  @ApiOperation({
    summary: "获取用户年龄分析页数据",
    description: "analytics/user-age 页面接口。"
  })
  getUserAge() {
    return this.adminService.getAnalyticsUserAge();
  }

  @Get("user-gender")
  @ApiOperation({
    summary: "获取用户性别分析页数据",
    description: "analytics/user-gender 页面接口。"
  })
  getUserGender() {
    return this.adminService.getAnalyticsUserGender();
  }

  @Get("user-social")
  @ApiOperation({
    summary: "获取用户社交统计页数据",
    description: "analytics/user-social 页面接口。"
  })
  getUserSocial(@Query() query: AnalyticsTableQueryDto) {
    return this.adminService.getAnalyticsUserSocial(
      query.page,
      query.pageSize,
      query.keyword
    );
  }
}
