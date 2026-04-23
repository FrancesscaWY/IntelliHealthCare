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
import {
  ApiBearerAuth,
  ApiOperation,
  ApiPropertyOptional,
  ApiTags
} from "@nestjs/swagger";
import { CurrentUser } from "../../common/auth/current-user.decorator";
import { JwtAuthGuard } from "../../common/auth/jwt-auth.guard";
import type { AuthenticatedUser } from "../../common/auth/auth.types";
import { SwaggerTags } from "../../common/http/swagger-tags";
import { HealthArchiveService } from "./health-archive.service";

class ArchiveQueryDto {
  @ApiPropertyOptional({
    description: "长者用户 ID。家属为指定长者查看档案时填写；不填则默认取当前登录用户或默认授权对象。",
    example: "user_elder_joy"
  })
  @IsOptional()
  @IsString()
  elderId?: string;
}

class UpdateBasicInfoDto {
  @ApiPropertyOptional({
    description: "头像地址，通常来自文件上传完成后的文件 URL。",
    example: "https://cdn.example.com/avatar/joy.png"
  })
  @IsOptional()
  @IsString()
  avatar?: string;

  @ApiPropertyOptional({
    description: "姓名。",
    example: "张秀兰"
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: "手机号。",
    example: "13800138000"
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({
    description: "出生日期，建议使用 YYYY-MM-DD。",
    example: "1953-08-12"
  })
  @IsOptional()
  @IsString()
  birthday?: string;

  @ApiPropertyOptional({
    description: "常住地址。",
    example: "上海市浦东新区花木路 88 号 1002 室"
  })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({
    description: "身高，单位厘米。",
    example: 162
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  height?: number;

  @ApiPropertyOptional({
    description: "体重，单位千克。",
    example: 58
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  weight?: number;

  @ApiPropertyOptional({
    description: "学历。",
    example: "高中"
  })
  @IsOptional()
  @IsString()
  education?: string;

  @ApiPropertyOptional({
    description: "职业。",
    example: "退休教师"
  })
  @IsOptional()
  @IsString()
  occupation?: string;

  @ApiPropertyOptional({
    description: "紧急联系人对象，建议包含 name、phone、relation。",
    example: {
      name: "王兰",
      phone: "13900139000",
      relation: "女儿"
    }
  })
  @IsOptional()
  @IsObject()
  emergencyContact?: Record<string, unknown>;
}

class UpdateMedicalHistoryDto {
  @ApiPropertyOptional({
    description: "病史对象，可按前端页面结构提交慢病、手术史、过敏史等信息。",
    example: {
      chronicDiseases: ["高血压"],
      surgeries: ["白内障手术"],
      allergies: ["青霉素"]
    }
  })
  @IsOptional()
  @IsObject()
  medicalHistory?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: "风险标签数组，用于档案首页和 AI 分析展示。",
    example: ["高血压", "跌倒风险"]
  })
  @IsOptional()
  @IsArray()
  riskTags?: unknown[];

  @ApiPropertyOptional({
    description: "长期记忆对象，用于记录偏好、习惯、照护注意事项等。",
    example: {
      habits: ["低盐饮食", "晚饭后散步"],
      preferences: ["下午预约更方便"]
    }
  })
  @IsOptional()
  @IsObject()
  longTermMemory?: Record<string, unknown>;
}

@Controller("app/health/archive")
@UseGuards(JwtAuthGuard)
@ApiTags(SwaggerTags.AppHealthArchive)
@ApiBearerAuth()
export class AppHealthArchiveController {
  constructor(private readonly healthArchiveService: HealthArchiveService) {}

  @Get("summary")
  @ApiOperation({
    summary: "获取健康档案摘要",
    description: "健康档案首页先调用该接口，查看档案总览、风险标签、最近提醒等聚合信息。"
  })
  getSummary(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ArchiveQueryDto
  ) {
    return this.healthArchiveService.getArchiveSummary(user, query.elderId);
  }

  @Get("basic-info")
  @ApiOperation({
    summary: "获取基础信息",
    description: "基础信息编辑页进入时先调用，用于回填姓名、生日、身高、体重、紧急联系人等字段。"
  })
  getBasicInfo(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ArchiveQueryDto
  ) {
    return this.healthArchiveService.getBasicInfo(user, query.elderId);
  }

  @Put("basic-info")
  @ApiOperation({
    summary: "更新基础信息",
    description: "基础信息保存按钮对应接口。建议先通过 GET 接口拿到原始数据，再按页面表单回传修改后的字段。"
  })
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
  @ApiOperation({
    summary: "获取病史与长期记忆",
    description: "病史页、照护偏好页可先调用该接口回显慢病、手术史、风险标签和长期记忆信息。"
  })
  getMedicalHistory(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ArchiveQueryDto
  ) {
    return this.healthArchiveService.getMedicalHistory(user, query.elderId);
  }

  @Put("medical-history")
  @ApiOperation({
    summary: "更新病史与长期记忆",
    description: "病史页保存接口。medicalHistory、riskTags、longTermMemory 均可按页面需要局部更新。"
  })
  updateMedicalHistory(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ArchiveQueryDto,
    @Body() body: UpdateMedicalHistoryDto
  ) {
    return this.healthArchiveService.updateMedicalHistory(user, body, query.elderId);
  }
}
