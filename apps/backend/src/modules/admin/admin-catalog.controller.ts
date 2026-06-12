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
import { ServiceCategory, StaffApplicationStatus } from "@prisma/client";
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min
} from "class-validator";
import { Type } from "class-transformer";
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
import { CurrentUser } from "../../common/auth/current-user.decorator";
import type { AuthenticatedUser } from "../../common/auth/auth.types";
import { SwaggerTags } from "../../common/http/swagger-tags";
import { AdminService } from "./admin.service";

class AdminProductsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: "服务分类。",
    enum: ServiceCategory,
    example: ServiceCategory.HOME_CARE
  })
  @IsOptional()
  @IsEnum(ServiceCategory)
  category?: ServiceCategory;

  @ApiPropertyOptional({
    description: "状态筛选。",
    example: "已上架"
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({
    description: "关键字。",
    example: "康复"
  })
  @IsOptional()
  @IsString()
  keyword?: string;
}

class ProductUpsertDto {
  @ApiProperty({
    description: "商品标题。",
    example: "脑中风术后康复理疗套餐"
  })
  @IsString()
  title!: string;

  @ApiProperty({
    description: "服务分类。",
    enum: ServiceCategory,
    example: ServiceCategory.REHAB_THERAPY
  })
  @IsEnum(ServiceCategory)
  category!: ServiceCategory;

  @ApiPropertyOptional({
    description: "商品编码。",
    example: "323009000"
  })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional({
    description: "摘要。",
    example: "上门评估与居家理疗组合。"
  })
  @IsOptional()
  @IsString()
  summary?: string;

  @ApiProperty({
    description: "售价。",
    example: 599
  })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price!: number;

  @ApiPropertyOptional({
    description: "划线价。",
    example: 899
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  marketPrice?: number;

  @ApiPropertyOptional({
    description: "服务标签。",
    example: ["脑血管疾病", "运动疗法"]
  })
  @IsOptional()
  @IsArray()
  tags?: string[];

  @ApiPropertyOptional({
    description: "封面 URL。",
    example: "https://cdn.intellihealthcare.demo/services/rehab.jpg"
  })
  @IsOptional()
  @IsString()
  coverUrl?: string;

  @ApiPropertyOptional({
    description: "关联机构 ID。",
    example: "inst_qingsong"
  })
  @IsOptional()
  @IsString()
  institutionId?: string;

  @ApiPropertyOptional({
    description: "商品编辑页扩展内容。",
    example: {
      parameterRows: [],
      sellInfo: {
        duration: "60",
        staffCount: "1"
      }
    }
  })
  @IsOptional()
  @IsObject()
  serviceContent?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: "是否立即上架。",
    example: true
  })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

class UpdateProductStatusDto {
  @ApiProperty({
    description: "是否上架。",
    example: true
  })
  @IsBoolean()
  enabled!: boolean;
}

class StaffsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: "服务类型。",
    example: "康复理疗"
  })
  @IsOptional()
  @IsString()
  serviceType?: string;

  @ApiPropertyOptional({
    description: "标签。",
    example: "康复护理"
  })
  @IsOptional()
  @IsString()
  tag?: string;
}

class UpdateStaffStatusDto {
  @ApiProperty({
    description: "是否启用。",
    example: true
  })
  @IsBoolean()
  enabled!: boolean;
}

class StaffApplicationsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: "审核状态。",
    enum: StaffApplicationStatus,
    example: StaffApplicationStatus.PENDING
  })
  @IsOptional()
  @IsEnum(StaffApplicationStatus)
  status?: StaffApplicationStatus;

  @ApiPropertyOptional({
    description: "服务类型。",
    example: "家政护工"
  })
  @IsOptional()
  @IsString()
  serviceType?: string;
}

class ReviewStaffApplicationDto {
  @ApiProperty({
    description: "审核状态。",
    enum: StaffApplicationStatus,
    example: StaffApplicationStatus.APPROVED
  })
  @IsEnum(StaffApplicationStatus)
  status!: StaffApplicationStatus;

  @ApiPropertyOptional({
    description: "审核备注。",
    example: "资料齐全，审核通过。"
  })
  @IsOptional()
  @IsString()
  remark?: string;
}

@Controller("admin")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("PLATFORM_ADMIN", "ORG_MANAGER", "CUSTOMER_SERVICE")
@ApiTags(SwaggerTags.AdminCatalogStaff)
@ApiBearerAuth()
export class AdminCatalogStaffController {
  constructor(private readonly adminService: AdminService) {}

  @Get("products")
  @ApiOperation({
    summary: "获取商品管理页数据",
    description: "service/product-management 页面接口。"
  })
  listProducts(@Query() query: AdminProductsQueryDto) {
    return this.adminService.listProducts(
      query.page,
      query.pageSize,
      query.category,
      query.status,
      query.keyword
    );
  }

  @Get("products/editor/options")
  @ApiOperation({
    summary: "获取商品编辑页初始化选项",
    description: "service/product-editor 新增页初始化接口。"
  })
  getProductEditorOptions() {
    return this.adminService.getProductEditorOptions();
  }

  @Get("products/:productId")
  @ApiOperation({
    summary: "获取商品编辑详情",
    description: "service/product-editor 编辑态接口。"
  })
  getProductDetail(@Param("productId") productId: string) {
    return this.adminService.getProductDetail(productId);
  }

  @Post("products")
  @ApiOperation({
    summary: "创建商品",
    description: "商品编辑页提交新增接口。"
  })
  createProduct(@Body() body: ProductUpsertDto) {
    return this.adminService.createProduct(body);
  }

  @Put("products/:productId")
  @ApiOperation({
    summary: "更新商品",
    description: "商品编辑页保存接口。"
  })
  updateProduct(
    @Param("productId") productId: string,
    @Body() body: ProductUpsertDto
  ) {
    return this.adminService.updateProduct(productId, body);
  }

  @Put("products/:productId/status")
  @ApiOperation({
    summary: "更新商品上下架状态",
    description: "商品管理页上下架操作接口。"
  })
  updateProductStatus(
    @Param("productId") productId: string,
    @Body() body: UpdateProductStatusDto
  ) {
    return this.adminService.updateProductStatus(productId, body.enabled);
  }

  @Delete("products/:productId")
  @ApiOperation({
    summary: "删除商品",
    description: "商品管理页删除动作接口。"
  })
  deleteProduct(@Param("productId") productId: string) {
    return this.adminService.deleteProduct(productId);
  }

  @Get("staffs")
  @ApiOperation({
    summary: "获取服务人员列表",
    description: "service/staff-management 页面接口。"
  })
  listStaffs(@Query() query: StaffsQueryDto) {
    return this.adminService.listStaffs(
      query.page,
      query.pageSize,
      query.serviceType,
      query.tag
    );
  }

  @Put("staffs/:staffId/status")
  @ApiOperation({
    summary: "启停服务人员",
    description: "service/staff-management 启停接口。"
  })
  updateStaffStatus(
    @Param("staffId") staffId: string,
    @Body() body: UpdateStaffStatusDto
  ) {
    return this.adminService.updateStaffStatus(staffId, body.enabled);
  }

  @Get("staff-applications")
  @ApiOperation({
    summary: "获取服务人员审核列表",
    description: "dashboard/service 两套 review-management 页面共用接口。"
  })
  listStaffApplications(@Query() query: StaffApplicationsQueryDto) {
    return this.adminService.listStaffApplications(
      query.page,
      query.pageSize,
      query.status,
      query.serviceType
    );
  }

  @Get("staff-applications/:applicationId")
  @ApiOperation({
    summary: "获取服务人员审核详情",
    description: "dashboard/service 两套 review-detail 页面共用接口。"
  })
  getStaffApplicationDetail(@Param("applicationId") applicationId: string) {
    return this.adminService.getStaffApplicationDetail(applicationId);
  }

  @Put("staff-applications/:applicationId/review")
  @ApiOperation({
    summary: "审核服务人员入驻申请",
    description: "服务人员审核通过/驳回动作接口。"
  })
  reviewStaffApplication(
    @CurrentUser() user: AuthenticatedUser,
    @Param("applicationId") applicationId: string,
    @Body() body: ReviewStaffApplicationDto
  ) {
    return this.adminService.reviewStaffApplication(
      applicationId,
      body.status,
      body.remark,
      user
    );
  }
}
