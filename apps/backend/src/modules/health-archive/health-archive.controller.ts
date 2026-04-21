import {
  Body,
  Controller,
  Get,
  Put,
  Query,
  UseGuards
} from "@nestjs/common";
import { Type } from "class-transformer";
import { IsArray, IsNumber, IsObject, IsOptional, IsString } from "class-validator";
import { CurrentUser } from "../../common/auth/current-user.decorator";
import { JwtAuthGuard } from "../../common/auth/jwt-auth.guard";
import type { AuthenticatedUser } from "../../common/auth/auth.types";
import { HealthArchiveService } from "./health-archive.service";

class ArchiveQueryDto {
  @IsOptional()
  @IsString()
  elderId?: string;
}

class UpdateBasicInfoDto {
  @IsOptional()
  @IsString()
  avatar?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  birthday?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  height?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  weight?: number;

  @IsOptional()
  @IsString()
  education?: string;

  @IsOptional()
  @IsString()
  occupation?: string;

  @IsOptional()
  @IsObject()
  emergencyContact?: Record<string, unknown>;
}

class UpdateMedicalHistoryDto {
  @IsOptional()
  @IsObject()
  medicalHistory?: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  riskTags?: unknown[];

  @IsOptional()
  @IsObject()
  longTermMemory?: Record<string, unknown>;
}

@Controller("app/health/archive")
@UseGuards(JwtAuthGuard)
export class AppHealthArchiveController {
  constructor(private readonly healthArchiveService: HealthArchiveService) {}

  @Get("summary")
  getSummary(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ArchiveQueryDto
  ) {
    return this.healthArchiveService.getArchiveSummary(user, query.elderId);
  }

  @Get("basic-info")
  getBasicInfo(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ArchiveQueryDto
  ) {
    return this.healthArchiveService.getBasicInfo(user, query.elderId);
  }

  @Put("basic-info")
  updateBasicInfo(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ArchiveQueryDto,
    @Body() body: UpdateBasicInfoDto
  ) {
    return this.healthArchiveService.updateBasicInfo(
      user,
      body as Record<string, unknown>,
      query.elderId
    );
  }

  @Get("medical-history")
  getMedicalHistory(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ArchiveQueryDto
  ) {
    return this.healthArchiveService.getMedicalHistory(user, query.elderId);
  }

  @Put("medical-history")
  updateMedicalHistory(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ArchiveQueryDto,
    @Body() body: UpdateMedicalHistoryDto
  ) {
    return this.healthArchiveService.updateMedicalHistory(user, body, query.elderId);
  }
}
