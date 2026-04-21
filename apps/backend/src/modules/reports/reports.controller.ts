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
import { ReportStatus } from "@prisma/client";
import { CurrentUser } from "../../common/auth/current-user.decorator";
import { JwtAuthGuard } from "../../common/auth/jwt-auth.guard";
import { Roles } from "../../common/auth/roles.decorator";
import { RolesGuard } from "../../common/auth/roles.guard";
import type { AuthenticatedUser } from "../../common/auth/auth.types";
import { PaginationQueryDto } from "../../common/dto/pagination-query.dto";
import { ReportsService } from "./reports.service";

class CheckupQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  elderId?: string;
}

class CreateCheckupReportDto {
  @IsOptional()
  @IsString()
  elderId?: string;

  @IsString()
  title!: string;

  @IsObject()
  summary!: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  attachment?: Record<string, unknown>;
}

class AdminReportsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(ReportStatus)
  status?: ReportStatus;
}

class ReviewReportDto {
  @IsEnum(ReportStatus)
  status!: ReportStatus;
}

@Controller("app/health/reports/checkups")
@UseGuards(JwtAuthGuard)
export class AppReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get()
  listReports(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: CheckupQueryDto
  ) {
    return this.reportsService.listCheckupReports(user, query.page, query.pageSize, query.elderId);
  }

  @Post()
  createReport(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateCheckupReportDto
  ) {
    return this.reportsService.createCheckupReport(user, body);
  }

  @Get(":reportId")
  getReport(
    @CurrentUser() user: AuthenticatedUser,
    @Param("reportId") reportId: string
  ) {
    return this.reportsService.getCheckupReport(user, reportId);
  }

  @Delete(":reportId")
  deleteReport(
    @CurrentUser() user: AuthenticatedUser,
    @Param("reportId") reportId: string
  ) {
    return this.reportsService.deleteCheckupReport(user, reportId);
  }

  @Get(":reportId/interpretation")
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
export class AdminReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get()
  listReports(@Query() query: AdminReportsQueryDto) {
    return this.reportsService.listAdminReports(query.page, query.pageSize, query.status);
  }

  @Put(":reportId/review")
  reviewReport(
    @Param("reportId") reportId: string,
    @Body() body: ReviewReportDto
  ) {
    return this.reportsService.reviewReport(reportId, body.status);
  }
}
