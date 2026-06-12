import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards
} from "@nestjs/common";
import { Gender } from "@prisma/client";
import { IsArray, IsEnum, IsOptional, IsString, Matches } from "class-validator";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiProperty,
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
    description: "关键字，可匹配长者昵称、姓名、手机号或档案编号。",
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

class CreateAdminElderDto {
  @ApiProperty({
    description: "长者姓名。",
    example: "王秀珍"
  })
  @IsString()
  realName!: string;

  @ApiProperty({
    description: "手机号。",
    example: "13800138099"
  })
  @Matches(/^1\d{10}$/)
  phone!: string;

  @ApiPropertyOptional({
    description: "昵称。",
    example: "笑看人生"
  })
  @IsOptional()
  @IsString()
  nickname?: string;

  @ApiPropertyOptional({
    description: "性别。",
    enum: Gender,
    example: Gender.FEMALE
  })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @ApiPropertyOptional({
    description: "出生日期，建议 YYYY-MM-DD。",
    example: "1958-10-11"
  })
  @IsOptional()
  @IsString()
  birthday?: string;

  @ApiPropertyOptional({
    description: "民族。",
    example: "汉族"
  })
  @IsOptional()
  @IsString()
  ethnicity?: string;

  @ApiPropertyOptional({
    description: "学历。",
    example: "高中"
  })
  @IsOptional()
  @IsString()
  education?: string;

  @ApiPropertyOptional({
    description: "婚姻状态。",
    example: "已婚"
  })
  @IsOptional()
  @IsString()
  maritalStatus?: string;

  @ApiPropertyOptional({
    description: "血型。",
    example: "A"
  })
  @IsOptional()
  @IsString()
  bloodType?: string;

  @ApiPropertyOptional({
    description: "城市。",
    example: "上海市"
  })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({
    description: "地址。",
    example: "上海市浦东新区丹桂路 68 号 2 栋 502"
  })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({
    description: "风险标签。",
    example: ["高血压", "康复训练"]
  })
  @IsOptional()
  @IsArray()
  tags?: string[];

  @ApiPropertyOptional({
    description: "紧急联系人。",
    example: {
      name: "王兰",
      relation: "女儿",
      phone: "13900139000"
    }
  })
  @IsOptional()
  emergencyContact?: Record<string, unknown>;
}

class BatchElderTagsDto {
  @ApiProperty({
    description: "长者 ID 列表。",
    example: ["user_elder_joy", "user_elder_zhou"]
  })
  @IsArray()
  elderIds!: string[];

  @ApiProperty({
    description: "需要写入的标签。",
    example: ["重点关注", "康复训练"]
  })
  @IsArray()
  tags!: string[];
}

@Controller("admin/elders")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("PLATFORM_ADMIN", "ORG_MANAGER", "DOCTOR", "CUSTOMER_SERVICE")
@ApiTags(SwaggerTags.AdminElders)
@ApiBearerAuth()
export class AdminEldersController {
  constructor(private readonly adminService: AdminService) {}

  @Get()
  @ApiOperation({
    summary: "获取长者列表",
    description: "后台长者列表页接口，返回页面筛选项、卡片列表与分页信息。"
  })
  listElders(@Query() query: AdminEldersQueryDto) {
    return this.adminService.listElders(
      query.page,
      query.pageSize,
      query.keyword,
      query.tag
    );
  }

  @Post()
  @ApiOperation({
    summary: "创建长者档案",
    description: "后台新增用户信息页提交接口。创建后会同步生成健康档案基础骨架。"
  })
  createElder(@Body() body: CreateAdminElderDto) {
    return this.adminService.createElder(body);
  }

  @Delete(":elderId")
  @ApiOperation({
    summary: "删除长者档案",
    description: "后台长者列表页删除动作接口。当前实现为禁用档案，不做破坏式硬删除。"
  })
  deleteElder(@Param("elderId") elderId: string) {
    return this.adminService.deleteElder(elderId);
  }

  @Post("tags/batch")
  @ApiOperation({
    summary: "批量维护长者标签",
    description: "后台长者列表页批量标签维护接口。"
  })
  batchUpdateTags(@Body() body: BatchElderTagsDto) {
    return this.adminService.batchUpdateElderTags(body.elderIds, body.tags);
  }

  @Get(":elderId")
  @ApiOperation({
    summary: "获取长者详情总览",
    description: "后台长者详情页首屏接口，返回头部摘要、tab 导航和关键指标。"
  })
  getElderOverview(@Param("elderId") elderId: string) {
    return this.adminService.getElderOverview(elderId);
  }

  @Get(":elderId/profile")
  @ApiOperation({
    summary: "获取长者档案 tab",
    description: "member-detail/profile tab 接口。"
  })
  getElderProfile(@Param("elderId") elderId: string) {
    return this.adminService.getElderProfileTab(elderId);
  }

  @Get(":elderId/health")
  @ApiOperation({
    summary: "获取长者健康 tab",
    description: "member-detail/health tab 接口。"
  })
  getElderHealth(@Param("elderId") elderId: string) {
    return this.adminService.getElderHealthTab(elderId);
  }

  @Get(":elderId/medication")
  @ApiOperation({
    summary: "获取长者用药 tab",
    description: "member-detail/medication tab 接口。"
  })
  getElderMedication(@Param("elderId") elderId: string) {
    return this.adminService.getElderMedicationTab(elderId);
  }

  @Get(":elderId/metrics")
  @ApiOperation({
    summary: "获取长者健康数据 tab",
    description: "member-detail/metrics tab 接口。"
  })
  getElderMetrics(@Param("elderId") elderId: string) {
    return this.adminService.getElderMetricsTab(elderId);
  }

  @Get(":elderId/devices")
  @ApiOperation({
    summary: "获取长者设备 tab",
    description: "member-detail/device tab 接口。"
  })
  getElderDevices(@Param("elderId") elderId: string) {
    return this.adminService.getElderDevicesTab(elderId);
  }

  @Get(":elderId/reports")
  @ApiOperation({
    summary: "获取长者报告 tab",
    description: "member-detail/report tab 接口。"
  })
  getElderReports(@Param("elderId") elderId: string) {
    return this.adminService.getElderReportsTab(elderId);
  }

  @Get(":elderId/orders")
  @ApiOperation({
    summary: "获取长者订单 tab",
    description: "member-detail/order tab 接口。"
  })
  getElderOrders(@Param("elderId") elderId: string) {
    return this.adminService.getElderOrdersTab(elderId);
  }

  @Get(":elderId/assets")
  @ApiOperation({
    summary: "获取长者资产 tab",
    description: "member-detail/asset tab 接口。"
  })
  getElderAssets(@Param("elderId") elderId: string) {
    return this.adminService.getElderAssetsTab(elderId);
  }

  @Get(":elderId/contents")
  @ApiOperation({
    summary: "获取长者内容 tab",
    description: "member-detail/content tab 接口。"
  })
  getElderContents(@Param("elderId") elderId: string) {
    return this.adminService.getElderContentsTab(elderId);
  }

  @Get(":elderId/service-records")
  @ApiOperation({
    summary: "获取长者服务记录 tab",
    description: "member-detail/service tab 接口。"
  })
  getElderServiceRecords(@Param("elderId") elderId: string) {
    return this.adminService.getElderServiceRecordsTab(elderId);
  }
}
