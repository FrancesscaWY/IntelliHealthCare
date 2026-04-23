import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards
} from "@nestjs/common";
import { IsEnum, IsObject, IsOptional, IsString } from "class-validator";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiProperty,
  ApiPropertyOptional,
  ApiTags
} from "@nestjs/swagger";
import { ReportStatus, ReportType } from "@prisma/client";
import { CurrentUser } from "../../common/auth/current-user.decorator";
import { JwtAuthGuard } from "../../common/auth/jwt-auth.guard";
import { Roles } from "../../common/auth/roles.decorator";
import { RolesGuard } from "../../common/auth/roles.guard";
import type { AuthenticatedUser } from "../../common/auth/auth.types";
import { PaginationQueryDto } from "../../common/dto/pagination-query.dto";
import { SwaggerTags } from "../../common/http/swagger-tags";
import { ReportsService } from "./reports.service";

class CheckupQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: "长者用户 ID。家属代看报告时填写；不填则取默认对象。",
    example: "user_elder_joy"
  })
  @IsOptional()
  @IsString()
  elderId?: string;
}

class CreateCheckupReportDto {
  @ApiPropertyOptional({
    description: "长者用户 ID。代他人上传报告时填写。",
    example: "user_elder_joy"
  })
  @IsOptional()
  @IsString()
  elderId?: string;

  @ApiProperty({
    description: "报告标题。",
    example: "2026 年 4 月体检报告"
  })
  @IsString()
  title!: string;

  @ApiProperty({
    description: "报告摘要对象，可直接按前端表单结构提交关键指标、结论等。",
    example: {
      conclusion: "血压偏高，建议继续复查",
      highlights: ["收缩压偏高", "空腹血糖正常"]
    }
  })
  @IsObject()
  summary!: Record<string, unknown>;

  @ApiPropertyOptional({
    description: "附件对象。通常在文件上传完成后，把 fileId、fileName、url 等信息放在这里。",
    example: {
      fileId: "file_report_001",
      fileName: "checkup-report.pdf"
    }
  })
  @IsOptional()
  @IsObject()
  attachment?: Record<string, unknown>;
}

class AdminReportsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: "后台审核状态筛选。",
    enum: ReportStatus,
    example: ReportStatus.PENDING_REVIEW
  })
  @IsOptional()
  @IsEnum(ReportStatus)
  status?: ReportStatus;

  @ApiPropertyOptional({
    description: "报告类型筛选。",
    enum: ReportType,
    example: ReportType.CHECKUP
  })
  @IsOptional()
  @IsEnum(ReportType)
  type?: ReportType;

  @ApiPropertyOptional({
    description: "关键字，可匹配报告标题、长者姓名、上传人或关联订单号。",
    example: "体检"
  })
  @IsOptional()
  @IsString()
  keyword?: string;
}

class ReviewReportDto {
  @ApiProperty({
    description: "审核后的报告状态。",
    enum: ReportStatus,
    example: ReportStatus.PUBLISHED
  })
  @IsEnum(ReportStatus)
  status!: ReportStatus;
}

@Controller("app/health/reports/checkups")
@UseGuards(JwtAuthGuard)
@ApiTags(SwaggerTags.AppReports)
@ApiBearerAuth()
export class AppReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get()
  @ApiOperation({
    summary: "获取体检报告列表",
    description: "体检报告列表页进入时先调用。reportId 需要从该列表返回中获取。"
  })
  listReports(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: CheckupQueryDto
  ) {
    return this.reportsService.listCheckupReports(user, query.page, query.pageSize, query.elderId);
  }

  @Post()
  @ApiOperation({
    summary: "上传体检报告",
    description: "报告上传页提交接口。通常先完成文件上传，再把 summary 和 attachment 一并提交。"
  })
  createReport(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateCheckupReportDto
  ) {
    return this.reportsService.createCheckupReport(user, body);
  }

  @Get(":reportId")
  @ApiOperation({
    summary: "获取体检报告详情",
    description: "报告详情页接口。reportId 请先从报告列表中获取。"
  })
  getReport(
    @CurrentUser() user: AuthenticatedUser,
    @Param("reportId") reportId: string
  ) {
    return this.reportsService.getCheckupReport(user, reportId);
  }

  @Delete(":reportId")
  @ApiOperation({
    summary: "删除体检报告",
    description: "删除已上传的报告。请先确认 reportId 来源于列表或详情。"
  })
  deleteReport(
    @CurrentUser() user: AuthenticatedUser,
    @Param("reportId") reportId: string
  ) {
    return this.reportsService.deleteCheckupReport(user, reportId);
  }

  @Get(":reportId/interpretation")
  @ApiOperation({
    summary: "获取报告解读",
    description: "非 AI 版报告解读接口。报告解读页可先调用此接口，再按需补充 AI 增强接口。"
  })
  getInterpretation(
    @CurrentUser() user: AuthenticatedUser,
    @Param("reportId") reportId: string
  ) {
    return this.reportsService.getInterpretation(user, reportId);
  }
}

@Controller("admin/reports")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("PLATFORM_ADMIN", "ORG_MANAGER", "DOCTOR")
@ApiTags(SwaggerTags.AdminReports)
@ApiBearerAuth()
export class AdminReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get()
  @ApiOperation({
    summary: "后台获取报告列表",
    description: "后台报告管理页接口，可按审核状态筛选。"
  })
  listReports(@Query() query: AdminReportsQueryDto) {
    return this.reportsService.listAdminReports(
      query.page,
      query.pageSize,
      query.status,
      query.type,
      query.keyword
    );
  }

  @Put(":reportId/review")
  @ApiOperation({
    summary: "后台审核报告",
    description: "后台审核动作接口。reportId 来自后台报告列表。"
  })
  reviewReport(
    @Param("reportId") reportId: string,
    @Body() body: ReviewReportDto
  ) {
    return this.reportsService.reviewReport(reportId, body.status);
  }
}
