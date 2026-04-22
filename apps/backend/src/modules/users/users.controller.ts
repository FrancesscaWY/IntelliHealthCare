import {
  Body,
  Controller,
  Delete,
  Get,
  Post,
  Put,
  Query,
  UseGuards
} from "@nestjs/common";
import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Min
} from "class-validator";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../../common/auth/current-user.decorator";
import { JwtAuthGuard } from "../../common/auth/jwt-auth.guard";
import type { AuthenticatedUser } from "../../common/auth/auth.types";
import { PaginationQueryDto } from "../../common/dto/pagination-query.dto";
import { UsersService } from "./users.service";

class UpdateProfileDto {
  @IsOptional()
  @IsString()
  nickname?: string;

  @IsOptional()
  @IsString()
  avatar?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsIn(["MALE", "FEMALE", "UNKNOWN"])
  gender?: "MALE" | "FEMALE" | "UNKNOWN";

  @IsOptional()
  @IsString()
  birthday?: string;
}

class SubmitRealNameDto {
  @IsString()
  @IsNotEmpty()
  realName!: string;

  @Matches(/^\d{17}[\dXx]$/)
  idCard!: string;
}

class SearchHistoryDto {
  @IsString()
  @IsNotEmpty()
  keyword!: string;
}

class SearchGlobalQueryDto extends PaginationQueryDto {
  @IsString()
  @IsNotEmpty()
  keyword!: string;
}

class UpdateMessageSettingsDto {
  @IsOptional()
  @IsBoolean()
  systemNotice?: boolean;

  @IsOptional()
  @IsBoolean()
  orderNotice?: boolean;

  @IsOptional()
  @IsBoolean()
  healthAlert?: boolean;

  @IsOptional()
  @IsBoolean()
  communityNotice?: boolean;

  @IsOptional()
  @IsBoolean()
  smsEnabled?: boolean;
}

class CouponQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(["UNUSED", "USED", "EXPIRED"])
  status?: "UNUSED" | "USED" | "EXPIRED";
}

@Controller("app/users")
@UseGuards(JwtAuthGuard)
@ApiTags("用户中心")
@ApiBearerAuth()
export class AppUsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get("me")
  @ApiOperation({ summary: "获取当前登录用户" })
  getCurrentUser(@CurrentUser("id") userId: string) {
    return this.usersService.getCurrentUser(userId);
  }

  @Get("me/profile")
  @ApiOperation({ summary: "获取个人主页信息" })
  getProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.getProfile(user);
  }

  @Get("me/security")
  @ApiOperation({ summary: "获取账号与安全信息" })
  getSecurity(@CurrentUser("id") userId: string) {
    return this.usersService.getSecurity(userId);
  }

  @Get("me/settings")
  @ApiOperation({ summary: "获取设置详情" })
  getSettings(@CurrentUser("id") userId: string) {
    return this.usersService.getSettings(userId);
  }

  @Put("me/settings/message")
  @ApiOperation({ summary: "更新消息设置" })
  updateMessageSettings(
    @CurrentUser("id") userId: string,
    @Body() body: UpdateMessageSettingsDto
  ) {
    return this.usersService.updateMessageSettings(userId, body);
  }

  @Get("me/points")
  @ApiOperation({ summary: "获取积分概览与明细" })
  getPoints(
    @CurrentUser("id") userId: string,
    @Query() query: PaginationQueryDto
  ) {
    return this.usersService.getPoints(userId, query.page, query.pageSize);
  }

  @Get("me/footprints")
  @ApiOperation({ summary: "获取我的足迹" })
  getFootprints(
    @CurrentUser("id") userId: string,
    @Query() query: PaginationQueryDto
  ) {
    return this.usersService.getFootprints(userId, query.page, query.pageSize);
  }

  @Delete("me/footprints")
  @ApiOperation({ summary: "清空我的足迹" })
  clearFootprints(@CurrentUser("id") userId: string) {
    return this.usersService.clearFootprints(userId);
  }

  @Get("me/activities")
  @ApiOperation({ summary: "获取我参加的活动" })
  getMyActivities(
    @CurrentUser("id") userId: string,
    @Query() query: PaginationQueryDto
  ) {
    return this.usersService.getMyActivities(userId, query.page, query.pageSize);
  }

  @Get("me/reviews")
  @ApiOperation({ summary: "获取我的评价列表" })
  getMyReviews(
    @CurrentUser("id") userId: string,
    @Query() query: PaginationQueryDto
  ) {
    return this.usersService.getMyReviews(userId, query.page, query.pageSize);
  }

  @Get("me/coupons")
  @ApiOperation({ summary: "获取优惠券列表" })
  getMyCoupons(
    @CurrentUser("id") userId: string,
    @Query() query: CouponQueryDto
  ) {
    return this.usersService.getMyCoupons(
      userId,
      query.page,
      query.pageSize,
      query.status
    );
  }

  @Put("me/profile")
  @ApiOperation({ summary: "更新个人资料" })
  updateProfile(
    @CurrentUser("id") userId: string,
    @Body() body: UpdateProfileDto
  ) {
    return this.usersService.updateProfile(userId, body);
  }

  @Put("me/real-name")
  @ApiOperation({ summary: "提交实名认证资料" })
  submitRealName(
    @CurrentUser("id") userId: string,
    @Body() body: SubmitRealNameDto
  ) {
    return this.usersService.submitRealName(userId, body);
  }
}

@Controller("app/home")
@UseGuards(JwtAuthGuard)
@ApiTags("首页")
@ApiBearerAuth()
export class AppHomeController {
  constructor(private readonly usersService: UsersService) {}

  @Get("dashboard")
  @ApiOperation({ summary: "获取首页聚合数据" })
  getDashboard(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.getHomeDashboard(user);
  }
}

@Controller("app/locations")
@UseGuards(JwtAuthGuard)
@ApiTags("定位")
@ApiBearerAuth()
export class AppLocationController {
  constructor(private readonly usersService: UsersService) {}

  @Get("current")
  @ApiOperation({ summary: "获取当前定位城市" })
  getCurrentLocation(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.getCurrentLocation(user);
  }

  @Get("cities")
  @ApiOperation({ summary: "获取城市地区列表" })
  getCities() {
    return this.usersService.getLocationCities();
  }
}

@Controller("app/search")
@UseGuards(JwtAuthGuard)
@ApiTags("搜索")
@ApiBearerAuth()
export class AppSearchController {
  constructor(private readonly usersService: UsersService) {}

  @Get("hot-tags")
  @ApiOperation({ summary: "获取热搜标签" })
  getHotTags() {
    return this.usersService.getHotTags();
  }

  @Get("history")
  @ApiOperation({ summary: "获取搜索历史" })
  getSearchHistory(@CurrentUser("id") userId: string) {
    return this.usersService.getSearchHistory(userId);
  }

  @Post("history")
  @ApiOperation({ summary: "记录搜索历史" })
  addSearchHistory(
    @CurrentUser("id") userId: string,
    @Body() body: SearchHistoryDto
  ) {
    return this.usersService.addSearchHistory(userId, body.keyword);
  }

  @Delete("history")
  @ApiOperation({ summary: "清空搜索历史" })
  clearSearchHistory(@CurrentUser("id") userId: string) {
    return this.usersService.clearSearchHistory(userId);
  }

  @Get("global")
  @ApiOperation({ summary: "执行全局搜索" })
  searchGlobal(@Query() query: SearchGlobalQueryDto) {
    return this.usersService.searchGlobal(query.keyword, query.page, query.pageSize);
  }
}
