import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { Type } from "class-transformer";
import {
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min
} from "class-validator";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../../common/auth/current-user.decorator";
import { JwtAuthGuard } from "../../common/auth/jwt-auth.guard";
import type { AuthenticatedUser } from "../../common/auth/auth.types";
import { PaginationQueryDto } from "../../common/dto/pagination-query.dto";
import { SwaggerTags } from "../../common/http/swagger-tags";
import { AppHealthLifestyleService } from "./health-lifestyle.service";

class ElderQueryDto {
  @IsOptional()
  @IsString()
  elderId?: string;
}

class DietRecipeQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(["BREAKFAST", "LUNCH", "SNACK", "DINNER"])
  mealType?: "BREAKFAST" | "LUNCH" | "SNACK" | "DINNER";
}

class DietRecordsQueryDto extends ElderQueryDto {
  @IsOptional()
  @IsString()
  date?: string;
}

class CreateDietRecordDto extends ElderQueryDto {
  @IsOptional()
  @IsString()
  recipeId?: string;

  @IsIn(["BREAKFAST", "LUNCH", "SNACK", "DINNER"])
  mealType!: "BREAKFAST" | "LUNCH" | "SNACK" | "DINNER";

  @IsArray()
  foods!: Array<Record<string, unknown>>;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(5000)
  totalCalories!: number;

  @IsOptional()
  macros?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsString()
  eatenAt?: string;
}

class SelfTestDetailQueryDto extends ElderQueryDto {}

class SelfTestHistoryQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  elderId?: string;
}

class SubmitSelfTestDto extends ElderQueryDto {
  @IsArray()
  answers!: Array<{
    questionId: string;
    optionIndex?: number;
    score?: number;
  }>;
}

@ApiTags(SwaggerTags.AppHealthLifestyle)
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("app/health")
export class AppHealthLifestyleController {
  constructor(private readonly lifestyleService: AppHealthLifestyleService) {}

  @Get("diet/plan")
  @ApiOperation({ summary: "获取健康膳食首页" })
  getDietPlan(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ElderQueryDto
  ) {
    return this.lifestyleService.getDietPlan(user, query.elderId);
  }

  @Get("diet/recipes")
  @ApiOperation({ summary: "获取食谱列表" })
  listDietRecipes(@Query() query: DietRecipeQueryDto) {
    return this.lifestyleService.listDietRecipes(query.page, query.pageSize, query.mealType);
  }

  @Get("diet/recipes/:recipeId")
  @ApiOperation({ summary: "获取食谱详情" })
  getDietRecipeDetail(@Param("recipeId") recipeId: string) {
    return this.lifestyleService.getDietRecipeDetail(recipeId);
  }

  @Get("diet-records")
  @ApiOperation({ summary: "获取饮食记录日报" })
  getDietRecords(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: DietRecordsQueryDto
  ) {
    return this.lifestyleService.getDietRecords(user, query.elderId, query.date);
  }

  @Post("diet-records")
  @ApiOperation({ summary: "新增饮食记录" })
  createDietRecord(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateDietRecordDto
  ) {
    return this.lifestyleService.createDietRecord(user, body);
  }

  @Get("diet-records/history")
  @ApiOperation({ summary: "获取饮食历史统计" })
  getDietRecordHistory(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: SelfTestHistoryQueryDto
  ) {
    return this.lifestyleService.getDietRecordHistory(
      user,
      query.page,
      query.pageSize,
      query.elderId
    );
  }

  @Get("self-tests")
  @ApiOperation({ summary: "获取自测项目列表" })
  listSelfTests() {
    return this.lifestyleService.listSelfTests();
  }

  @Get("self-tests/history")
  @ApiOperation({ summary: "获取自测历史" })
  getSelfTestHistory(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: SelfTestHistoryQueryDto
  ) {
    return this.lifestyleService.getSelfTestHistory(
      user,
      query.page,
      query.pageSize,
      query.elderId
    );
  }

  @Get("self-tests/:testId")
  @ApiOperation({ summary: "获取自测详情与题目" })
  getSelfTestDetail(
    @CurrentUser() user: AuthenticatedUser,
    @Param("testId") testId: string,
    @Query() query: SelfTestDetailQueryDto
  ) {
    return this.lifestyleService.getSelfTestDetail(user, testId, query.elderId);
  }

  @Post("self-tests/:testId/submit")
  @ApiOperation({ summary: "提交自测结果" })
  submitSelfTest(
    @CurrentUser() user: AuthenticatedUser,
    @Param("testId") testId: string,
    @Body() body: SubmitSelfTestDto
  ) {
    return this.lifestyleService.submitSelfTest(user, testId, body);
  }
}
