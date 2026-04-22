import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  UseGuards
} from "@nestjs/common";
import { Type } from "class-transformer";
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Matches
} from "class-validator";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { AuthenticatedUser } from "../../common/auth/auth.types";
import { CurrentUser } from "../../common/auth/current-user.decorator";
import { JwtAuthGuard } from "../../common/auth/jwt-auth.guard";
import { SwaggerTags } from "../../common/http/swagger-tags";
import { FamilyService } from "./family.service";

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

@Controller("app/family")
@UseGuards(JwtAuthGuard)
@ApiTags(SwaggerTags.AppFamily)
@ApiBearerAuth()
export class AppFamilyController {
  constructor(private readonly familyService: FamilyService) {}

  @Get("bindings")
  @ApiOperation({ summary: "获取家属绑定关系" })
  getFamilyBindings(@CurrentUser() user: AuthenticatedUser) {
    return this.familyService.getFamilyBindings(user);
  }

  @Get("addresses")
  @ApiOperation({ summary: "获取地址列表" })
  getAddresses(@CurrentUser() user: AuthenticatedUser) {
    return this.familyService.getAddresses(user);
  }

  @Post("addresses")
  @ApiOperation({ summary: "新增地址" })
  createAddress(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: SaveAddressDto
  ) {
    return this.familyService.createAddress(user, body);
  }

  @Put("addresses/:addressId")
  @ApiOperation({ summary: "更新地址" })
  updateAddress(
    @CurrentUser() user: AuthenticatedUser,
    @Param("addressId") addressId: string,
    @Body() body: SaveAddressDto
  ) {
    return this.familyService.updateAddress(user, addressId, body);
  }
}
