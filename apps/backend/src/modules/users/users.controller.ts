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
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Min
} from "class-validator";
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

class SaveAddressDto {
  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsString()
  elderId?: string;

  @IsString()
  receiverName!: string;

  @Matches(/^1\d{10}$/)
  receiverPhone!: string;

  @IsString()
  province!: string;

  @IsString()
  city!: string;

  @IsString()
  district!: string;

  @IsOptional()
  @IsString()
  street?: string;

  @IsString()
  detailAddress!: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
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

@Controller("app/users")
@UseGuards(JwtAuthGuard)
export class AppUsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get("me")
  getCurrentUser(@CurrentUser("id") userId: string) {
    return this.usersService.getCurrentUser(userId);
  }

  @Get("me/profile")
  getProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.getProfile(user);
  }

  @Put("me/profile")
  updateProfile(
    @CurrentUser("id") userId: string,
    @Body() body: UpdateProfileDto
  ) {
    return this.usersService.updateProfile(userId, body);
  }

  @Put("me/real-name")
  submitRealName(
    @CurrentUser("id") userId: string,
    @Body() body: SubmitRealNameDto
  ) {
    return this.usersService.submitRealName(userId, body);
  }
}

@Controller("app/family")
@UseGuards(JwtAuthGuard)
export class AppFamilyController {
  constructor(private readonly usersService: UsersService) {}

  @Get("bindings")
  getFamilyBindings(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.getFamilyBindings(user);
  }

  @Get("addresses")
  getAddresses(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.getAddresses(user);
  }

  @Post("addresses")
  createAddress(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: SaveAddressDto
  ) {
    return this.usersService.createAddress(user, body);
  }

  @Put("addresses/:addressId")
  updateAddress(
    @CurrentUser() user: AuthenticatedUser,
    @Param("addressId") addressId: string,
    @Body() body: SaveAddressDto
  ) {
    return this.usersService.updateAddress(user, addressId, body);
  }
}

@Controller("app/home")
@UseGuards(JwtAuthGuard)
export class AppHomeController {
  constructor(private readonly usersService: UsersService) {}

  @Get("dashboard")
  getDashboard(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.getHomeDashboard(user);
  }
}

@Controller("app/locations")
@UseGuards(JwtAuthGuard)
export class AppLocationController {
  constructor(private readonly usersService: UsersService) {}

  @Get("current")
  getCurrentLocation(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.getCurrentLocation(user);
  }

  @Get("cities")
  getCities() {
    return this.usersService.getLocationCities();
  }
}

@Controller("app/search")
@UseGuards(JwtAuthGuard)
export class AppSearchController {
  constructor(private readonly usersService: UsersService) {}

  @Get("hot-tags")
  getHotTags() {
    return this.usersService.getHotTags();
  }

  @Get("history")
  getSearchHistory(@CurrentUser("id") userId: string) {
    return this.usersService.getSearchHistory(userId);
  }

  @Post("history")
  addSearchHistory(
    @CurrentUser("id") userId: string,
    @Body() body: SearchHistoryDto
  ) {
    return this.usersService.addSearchHistory(userId, body.keyword);
  }

  @Delete("history")
  clearSearchHistory(@CurrentUser("id") userId: string) {
    return this.usersService.clearSearchHistory(userId);
  }

  @Get("global")
  searchGlobal(@Query() query: SearchGlobalQueryDto) {
    return this.usersService.searchGlobal(query.keyword, query.page, query.pageSize);
  }
}
