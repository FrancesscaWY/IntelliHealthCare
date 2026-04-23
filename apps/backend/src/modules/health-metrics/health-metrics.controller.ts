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
import {
  ApiBearerAuth,
  ApiOperation,
  ApiProperty,
  ApiPropertyOptional,
  ApiTags
} from "@nestjs/swagger";
import { CurrentUser } from "../../common/auth/current-user.decorator";
import { JwtAuthGuard } from "../../common/auth/jwt-auth.guard";
import type { AuthenticatedUser } from "../../common/auth/auth.types";
import { PaginationQueryDto } from "../../common/dto/pagination-query.dto";
import { SwaggerTags } from "../../common/http/swagger-tags";
import { HealthMetricsService } from "./health-metrics.service";
import { DeviceType } from "@prisma/client";

class ElderQueryDto {
  @ApiPropertyOptional({
    description: "长者用户 ID。家属代长者查看健康数据时填写；不填则默认当前对象。",
    example: "user_elder_joy"
  })
  @IsOptional()
  @IsString()
  elderId?: string;
}

class MetricParamDto {
  @ApiProperty({
    description: "健康指标类型。",
    enum: [
      "steps",
      "heartRate",
      "sleep",
      "weight",
      "bloodSugar",
      "bloodPressure",
      "oxygen",
      "stress"
    ],
    example: "bloodPressure"
  })
  @IsIn(["steps", "heartRate", "sleep", "weight", "bloodSugar", "bloodPressure", "oxygen", "stress"])
  metricKey!: "steps" | "heartRate" | "sleep" | "weight" | "bloodSugar" | "bloodPressure" | "oxygen" | "stress";
}

class MetricRecordBodyDto {
  @ApiPropertyOptional({
    description: "长者用户 ID。代长者录入数据时填写。",
    example: "user_elder_joy"
  })
  @IsOptional()
  @IsString()
  elderId?: string;

  @ApiPropertyOptional({
    description: "设备 ID。设备同步写入时填写；手工录入可不填。",
    example: "dev_joy_watch"
  })
  @IsOptional()
  @IsString()
  deviceId?: string;

  @ApiPropertyOptional({
    description: "主数值。血糖、体重、心率等单值指标通常填这里。",
    example: 78
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  value?: number;

  @ApiPropertyOptional({
    description: "单位。",
    example: "bpm"
  })
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiPropertyOptional({
    description: "复杂指标扩展对象。血压可在此传入收缩压/舒张压等结构化数据。",
    example: {
      systolic: 146,
      diastolic: 92
    }
  })
  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: "备注。",
    example: "晨起空腹测量"
  })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional({
    description: "测量时间，建议使用 ISO 字符串。",
    example: "2026-04-22T08:15:00.000Z"
  })
  @IsOptional()
  @IsString()
  measuredAt?: string;
}

class BindDeviceDto {
  @ApiPropertyOptional({
    description: "长者用户 ID。给指定长者绑定设备时填写。",
    example: "user_elder_joy"
  })
  @IsOptional()
  @IsString()
  elderId?: string;

  @ApiProperty({
    description: "设备序列号或绑定码。",
    example: "WATCH-A001"
  })
  @IsString()
  @MinLength(4)
  serialNo!: string;

  @ApiProperty({
    description: "设备类型。",
    enum: DeviceType,
    example: DeviceType.WATCH
  })
  @IsEnum(DeviceType)
  type!: DeviceType;

  @ApiPropertyOptional({
    description: "设备昵称。",
    example: "母亲手表"
  })
  @IsOptional()
  @IsString()
  nickname?: string;
}

class UpdateDeviceSettingsDto extends ElderQueryDto {
  @ApiProperty({
    description: "设备设置对象。结构按前端页面提交，可包含提醒开关、阈值、采样频率等。",
    example: {
      alertEnabled: true,
      syncIntervalMinutes: 30
    }
  })
  @IsObject()
  settings!: Record<string, unknown>;
}

class UpdateDevicePasswordDto extends ElderQueryDto {
  @ApiProperty({
    description: "设备密码。",
    example: "1234"
  })
  @IsString()
  @MinLength(4)
  password!: string;
}

class CreateMedicationDto extends ElderQueryDto {
  @ApiProperty({
    description: "药品名称。",
    example: "氯沙坦"
  })
  @IsString()
  name!: string;

  @ApiProperty({
    description: "剂量说明。",
    example: "50mg"
  })
  @IsString()
  dosage!: string;

  @ApiProperty({
    description: "服用频次。",
    example: "每日 2 次"
  })
  @IsString()
  frequency!: string;

  @ApiPropertyOptional({
    description: "餐前餐后说明。",
    example: "饭后"
  })
  @IsOptional()
  @IsString()
  mealTiming?: string;

  @ApiPropertyOptional({
    description: "给药途径。",
    example: "口服"
  })
  @IsOptional()
  @IsString()
  route?: string;

  @ApiPropertyOptional({
    description: "适应症或备注。",
    example: "高血压控制"
  })
  @IsOptional()
  @IsString()
  indication?: string;

  @ApiPropertyOptional({
    description: "每日计划服药时间数组。",
    example: ["08:00", "20:00"]
  })
  @IsOptional()
  @IsArray()
  scheduleTimes?: string[];

  @ApiProperty({
    description: "开始日期，建议使用 YYYY-MM-DD。",
    example: "2026-04-22"
  })
  @IsString()
  startDate!: string;

  @ApiPropertyOptional({
    description: "结束日期，长期用药可不填。",
    example: "2026-05-22"
  })
  @IsOptional()
  @IsString()
  endDate?: string;
}

class UpdateMedicationDto extends CreateMedicationDto {
  @ApiPropertyOptional({
    description: "是否仍在服用。",
    example: true
  })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

class TakeMedicationDto extends ElderQueryDto {
  @ApiPropertyOptional({
    description: "服药备注。",
    example: "早餐后已服用"
  })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional({
    description: "计划服药时间，补记服药时可填写。",
    example: "2026-04-22T08:00:00.000Z"
  })
  @IsOptional()
  @IsString()
  scheduledAt?: string;
}

@Controller("app/health")
@UseGuards(JwtAuthGuard)
@ApiTags(SwaggerTags.AppHealthMetrics)
@ApiBearerAuth()
export class AppHealthMetricsController {
  constructor(private readonly healthMetricsService: HealthMetricsService) {}

  @Get("metrics/overview")
  @ApiOperation({
    summary: "获取健康指标总览",
    description: "健康数据首页先调用，查看综合评分、摘要卡片、最近提醒和绑定设备概览。"
  })
  getOverview(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ElderQueryDto
  ) {
    return this.healthMetricsService.getOverview(user, query.elderId);
  }

  @Get("metrics/:metricKey/trend")
  @ApiOperation({
    summary: "获取单项指标趋势",
    description: "血压、血糖、睡眠、体重等单项详情页趋势图接口。metricKey 由页面类型决定。"
  })
  getTrend(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: MetricParamDto,
    @Query() query: ElderQueryDto
  ) {
    return this.healthMetricsService.getMetricTrend(user, params.metricKey, query.elderId);
  }

  @Get("metrics/:metricKey/records")
  @ApiOperation({
    summary: "获取单项指标记录列表",
    description: "单项指标明细列表接口。recordId 需要从该接口返回中获取。"
  })
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
  @ApiOperation({
    summary: "新增指标记录",
    description: "添加健康数据页保存接口。手工录入时通常填写 value、unit、note、measuredAt。"
  })
  createMetricRecord(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: MetricParamDto,
    @Body() body: MetricRecordBodyDto
  ) {
    return this.healthMetricsService.createMetricRecord(user, params.metricKey, body);
  }

  @Put("metrics/:metricKey/records/:recordId")
  @ApiOperation({
    summary: "更新指标记录",
    description: "编辑历史指标记录时调用。recordId 请先从记录列表接口返回中获取。"
  })
  updateMetricRecord(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: MetricParamDto & { recordId: string },
    @Body() body: MetricRecordBodyDto
  ) {
    return this.healthMetricsService.updateMetricRecord(user, params.metricKey, params.recordId, body);
  }

  @Delete("metrics/:metricKey/records/:recordId")
  @ApiOperation({
    summary: "删除指标记录",
    description: "删除历史健康记录。删除前请确认 recordId 来自当前指标的记录列表。"
  })
  deleteMetricRecord(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: MetricParamDto & { recordId: string },
    @Query() query: ElderQueryDto
  ) {
    return this.healthMetricsService.deleteMetricRecord(user, params.recordId, query.elderId);
  }

  @Get("devices")
  @ApiOperation({
    summary: "获取设备列表",
    description: "设备中心首页接口。deviceId 需要从该列表返回中获取。"
  })
  getDevices(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ElderQueryDto
  ) {
    return this.healthMetricsService.getDevices(user, query.elderId);
  }

  @Get("devices/:deviceId")
  @ApiOperation({
    summary: "获取设备详情",
    description: "设备详情页接口。可回显设备状态、电量、设置摘要和最近测量信息。"
  })
  getDeviceDetail(
    @CurrentUser() user: AuthenticatedUser,
    @Param("deviceId") deviceId: string,
    @Query() query: ElderQueryDto
  ) {
    return this.healthMetricsService.getDeviceDetail(user, deviceId, query.elderId);
  }

  @Post("devices/bind")
  @ApiOperation({
    summary: "手动绑定设备",
    description: "设备添加页保存接口。serialNo 和 type 为必填。"
  })
  bindDevice(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: BindDeviceDto
  ) {
    return this.healthMetricsService.bindDevice(user, body);
  }

  @Post("devices/scan/bind")
  @ApiOperation({
    summary: "扫码绑定设备",
    description: "扫码绑定页接口。请求体与手动绑定一致，前端只是在页面上通过扫码得到 serialNo。"
  })
  scanBindDevice(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: BindDeviceDto
  ) {
    return this.healthMetricsService.bindDevice(user, body);
  }

  @Delete("devices/:deviceId")
  @ApiOperation({
    summary: "解绑设备",
    description: "设备详情页解除绑定接口。"
  })
  unbindDevice(
    @CurrentUser() user: AuthenticatedUser,
    @Param("deviceId") deviceId: string,
    @Query() query: ElderQueryDto
  ) {
    return this.healthMetricsService.unbindDevice(user, deviceId, query.elderId);
  }

  @Put("devices/:deviceId/settings")
  @ApiOperation({
    summary: "更新设备设置",
    description: "设备设置页保存接口，settings 可按页面结构提交。"
  })
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
  @ApiOperation({
    summary: "更新设备密码",
    description: "设备密码页保存接口。"
  })
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
  @ApiOperation({
    summary: "更新心率预警设置",
    description: "心率设置页保存接口，settings 中可填写心率阈值和提醒开关。"
  })
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
  @ApiOperation({
    summary: "获取设备测量记录",
    description: "设备详情页记录列表接口，可用于回显设备同步上来的测量数据。"
  })
  getDeviceMeasurements(
    @CurrentUser() user: AuthenticatedUser,
    @Param("deviceId") deviceId: string,
    @Query() query: ElderQueryDto
  ) {
    return this.healthMetricsService.getDeviceMeasurements(user, deviceId, query.elderId);
  }

  @Get("medications/today")
  @ApiOperation({
    summary: "获取今日用药提醒",
    description: "用药信息首页优先调用，查看今天应服药项目和状态。"
  })
  getTodayMedications(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ElderQueryDto
  ) {
    return this.healthMetricsService.getTodayMedications(user, query.elderId);
  }

  @Get("medications")
  @ApiOperation({
    summary: "获取用药列表",
    description: "用药列表页接口。medicationId 需要从该列表返回中获取。"
  })
  getMedications(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ElderQueryDto
  ) {
    return this.healthMetricsService.getMedications(user, query.elderId);
  }

  @Post("medications")
  @ApiOperation({
    summary: "新增用药计划",
    description: "新增用药页保存接口。至少填写药名、剂量、频次和开始日期。"
  })
  createMedication(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateMedicationDto
  ) {
    return this.healthMetricsService.createMedication(user, body);
  }

  @Put("medications/:medicationId")
  @ApiOperation({
    summary: "更新用药计划",
    description: "编辑用药页保存接口。medicationId 请先从用药列表中获取。"
  })
  updateMedication(
    @CurrentUser() user: AuthenticatedUser,
    @Param("medicationId") medicationId: string,
    @Body() body: UpdateMedicationDto
  ) {
    return this.healthMetricsService.updateMedication(user, medicationId, body);
  }

  @Delete("medications/:medicationId")
  @ApiOperation({
    summary: "删除用药计划",
    description: "删除不再使用的用药计划。"
  })
  deleteMedication(
    @CurrentUser() user: AuthenticatedUser,
    @Param("medicationId") medicationId: string,
    @Query() query: ElderQueryDto
  ) {
    return this.healthMetricsService.deleteMedication(user, medicationId, query.elderId);
  }

  @Post("medications/:medicationId/take")
  @ApiOperation({
    summary: "记录服药",
    description: "用药提醒卡片上的已服药动作接口。"
  })
  takeMedication(
    @CurrentUser() user: AuthenticatedUser,
    @Param("medicationId") medicationId: string,
    @Body() body: TakeMedicationDto
  ) {
    return this.healthMetricsService.takeMedication(user, medicationId, body);
  }
}
