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
import { Type } from "class-transformer";
import {
  IsBoolean,
  IsArray,
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  MinLength
} from "class-validator";
import { CurrentUser } from "../../common/auth/current-user.decorator";
import { JwtAuthGuard } from "../../common/auth/jwt-auth.guard";
import type { AuthenticatedUser } from "../../common/auth/auth.types";
import { PaginationQueryDto } from "../../common/dto/pagination-query.dto";
import { HealthMetricsService } from "./health-metrics.service";
import { DeviceType } from "@prisma/client";

class ElderQueryDto {
  @IsOptional()
  @IsString()
  elderId?: string;
}

class MetricParamDto {
  @IsIn(["steps", "heartRate", "sleep", "weight", "bloodSugar", "bloodPressure", "oxygen", "stress"])
  metricKey!: "steps" | "heartRate" | "sleep" | "weight" | "bloodSugar" | "bloodPressure" | "oxygen" | "stress";
}

class MetricRecordBodyDto {
  @IsOptional()
  @IsString()
  elderId?: string;

  @IsOptional()
  @IsString()
  deviceId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  value?: number;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsString()
  measuredAt?: string;
}

class BindDeviceDto {
  @IsOptional()
  @IsString()
  elderId?: string;

  @IsString()
  @MinLength(4)
  serialNo!: string;

  @IsEnum(DeviceType)
  type!: DeviceType;

  @IsOptional()
  @IsString()
  nickname?: string;
}

class UpdateDeviceSettingsDto extends ElderQueryDto {
  @IsObject()
  settings!: Record<string, unknown>;
}

class UpdateDevicePasswordDto extends ElderQueryDto {
  @IsString()
  @MinLength(4)
  password!: string;
}

class CreateMedicationDto extends ElderQueryDto {
  @IsString()
  name!: string;

  @IsString()
  dosage!: string;

  @IsString()
  frequency!: string;

  @IsOptional()
  @IsString()
  mealTiming?: string;

  @IsOptional()
  @IsString()
  route?: string;

  @IsOptional()
  @IsString()
  indication?: string;

  @IsOptional()
  @IsArray()
  scheduleTimes?: string[];

  @IsString()
  startDate!: string;

  @IsOptional()
  @IsString()
  endDate?: string;
}

class UpdateMedicationDto extends CreateMedicationDto {
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

class TakeMedicationDto extends ElderQueryDto {
  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsString()
  scheduledAt?: string;
}

@Controller("app/health")
@UseGuards(JwtAuthGuard)
export class AppHealthMetricsController {
  constructor(private readonly healthMetricsService: HealthMetricsService) {}

  @Get("metrics/overview")
  getOverview(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ElderQueryDto
  ) {
    return this.healthMetricsService.getOverview(user, query.elderId);
  }

  @Get("metrics/:metricKey/trend")
  getTrend(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: MetricParamDto,
    @Query() query: ElderQueryDto
  ) {
    return this.healthMetricsService.getMetricTrend(user, params.metricKey, query.elderId);
  }

  @Get("metrics/:metricKey/records")
  getMetricRecords(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: MetricParamDto,
    @Query() query: PaginationQueryDto & ElderQueryDto
  ) {
    return this.healthMetricsService.getMetricRecords(
      user,
      params.metricKey,
      query.page,
      query.pageSize,
      query.elderId
    );
  }

  @Post("metrics/:metricKey/records")
  createMetricRecord(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: MetricParamDto,
    @Body() body: MetricRecordBodyDto
  ) {
    return this.healthMetricsService.createMetricRecord(user, params.metricKey, body);
  }

  @Put("metrics/:metricKey/records/:recordId")
  updateMetricRecord(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: MetricParamDto & { recordId: string },
    @Body() body: MetricRecordBodyDto
  ) {
    return this.healthMetricsService.updateMetricRecord(user, params.metricKey, params.recordId, body);
  }

  @Delete("metrics/:metricKey/records/:recordId")
  deleteMetricRecord(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: MetricParamDto & { recordId: string },
    @Query() query: ElderQueryDto
  ) {
    return this.healthMetricsService.deleteMetricRecord(user, params.recordId, query.elderId);
  }

  @Get("devices")
  getDevices(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ElderQueryDto
  ) {
    return this.healthMetricsService.getDevices(user, query.elderId);
  }

  @Get("devices/:deviceId")
  getDeviceDetail(
    @CurrentUser() user: AuthenticatedUser,
    @Param("deviceId") deviceId: string,
    @Query() query: ElderQueryDto
  ) {
    return this.healthMetricsService.getDeviceDetail(user, deviceId, query.elderId);
  }

  @Post("devices/bind")
  bindDevice(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: BindDeviceDto
  ) {
    return this.healthMetricsService.bindDevice(user, body);
  }

  @Post("devices/scan/bind")
  scanBindDevice(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: BindDeviceDto
  ) {
    return this.healthMetricsService.bindDevice(user, body);
  }

  @Delete("devices/:deviceId")
  unbindDevice(
    @CurrentUser() user: AuthenticatedUser,
    @Param("deviceId") deviceId: string,
    @Query() query: ElderQueryDto
  ) {
    return this.healthMetricsService.unbindDevice(user, deviceId, query.elderId);
  }

  @Put("devices/:deviceId/settings")
  updateDeviceSettings(
    @CurrentUser() user: AuthenticatedUser,
    @Param("deviceId") deviceId: string,
    @Body() body: UpdateDeviceSettingsDto
  ) {
    return this.healthMetricsService.updateDeviceSettings(
      user,
      deviceId,
      body.settings,
      body.elderId
    );
  }

  @Put("devices/:deviceId/password")
  updateDevicePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Param("deviceId") deviceId: string,
    @Body() body: UpdateDevicePasswordDto
  ) {
    return this.healthMetricsService.updateDevicePassword(
      user,
      deviceId,
      body.password,
      body.elderId
    );
  }

  @Put("devices/:deviceId/heart-rate-settings")
  updateHeartRateSettings(
    @CurrentUser() user: AuthenticatedUser,
    @Param("deviceId") deviceId: string,
    @Body() body: UpdateDeviceSettingsDto
  ) {
    return this.healthMetricsService.updateHeartRateSettings(
      user,
      deviceId,
      body.settings,
      body.elderId
    );
  }

  @Get("devices/:deviceId/measurements")
  getDeviceMeasurements(
    @CurrentUser() user: AuthenticatedUser,
    @Param("deviceId") deviceId: string,
    @Query() query: ElderQueryDto
  ) {
    return this.healthMetricsService.getDeviceMeasurements(user, deviceId, query.elderId);
  }

  @Get("medications/today")
  getTodayMedications(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ElderQueryDto
  ) {
    return this.healthMetricsService.getTodayMedications(user, query.elderId);
  }

  @Get("medications")
  getMedications(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ElderQueryDto
  ) {
    return this.healthMetricsService.getMedications(user, query.elderId);
  }

  @Post("medications")
  createMedication(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateMedicationDto
  ) {
    return this.healthMetricsService.createMedication(user, body);
  }

  @Put("medications/:medicationId")
  updateMedication(
    @CurrentUser() user: AuthenticatedUser,
    @Param("medicationId") medicationId: string,
    @Body() body: UpdateMedicationDto
  ) {
    return this.healthMetricsService.updateMedication(user, medicationId, body);
  }

  @Delete("medications/:medicationId")
  deleteMedication(
    @CurrentUser() user: AuthenticatedUser,
    @Param("medicationId") medicationId: string,
    @Query() query: ElderQueryDto
  ) {
    return this.healthMetricsService.deleteMedication(user, medicationId, query.elderId);
  }

  @Post("medications/:medicationId/take")
  takeMedication(
    @CurrentUser() user: AuthenticatedUser,
    @Param("medicationId") medicationId: string,
    @Body() body: TakeMedicationDto
  ) {
    return this.healthMetricsService.takeMedication(user, medicationId, body);
  }
}
