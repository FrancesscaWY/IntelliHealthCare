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
import { InstitutionType } from "@prisma/client";
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MinLength
} from "class-validator";
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

class InstitutionsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: "区域筛选。",
    example: "浦东新区"
  })
  @IsOptional()
  @IsString()
  region?: string;

  @ApiPropertyOptional({
    description: "发布状态筛选。",
    example: "已发布"
  })
  @IsOptional()
  @IsString()
  status?: string;
}

class InstitutionUpsertDto {
  @ApiProperty({
    description: "机构名称。",
    example: "金慧福养老机构（朝阳店）"
  })
  @IsString()
  name!: string;

  @ApiPropertyOptional({
    description: "机构编码。",
    example: "JG2024001"
  })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional({
    description: "机构类型。",
    enum: InstitutionType,
    example: InstitutionType.NURSING_HOME
  })
  @IsOptional()
  @IsEnum(InstitutionType)
  type?: InstitutionType;

  @ApiProperty({
    description: "所在城市。",
    example: "上海市"
  })
  @IsString()
  city!: string;

  @ApiPropertyOptional({
    description: "所在区域。",
    example: "浦东新区"
  })
  @IsOptional()
  @IsString()
  district?: string;

  @ApiProperty({
    description: "详细地址。",
    example: "浦东新区张杨路188号3层"
  })
  @IsString()
  address!: string;

  @ApiPropertyOptional({
    description: "联系人姓名。",
    example: "李慧"
  })
  @IsOptional()
  @IsString()
  contactName?: string;

  @ApiPropertyOptional({
    description: "联系人手机号。",
    example: "17655551001"
  })
  @IsOptional()
  @Matches(/^1\d{10}$/)
  contactPhone?: string;

  @ApiPropertyOptional({
    description: "服务标签。",
    example: ["24h监护", "特殊护理"]
  })
  @IsOptional()
  @IsArray()
  serviceTags?: string[];

  @ApiPropertyOptional({
    description: "机构备注。",
    example: "覆盖日间照护、夜间值守和重点长者护理服务。"
  })
  @IsOptional()
  @IsString()
  note?: string;
}

class BatchInstitutionDeleteDto {
  @ApiProperty({
    description: "机构 ID 列表。",
    example: ["inst_qingsong", "inst_nuanyang"]
  })
  @IsArray()
  institutionIds!: string[];
}

class AccountsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: "角色筛选。",
    example: "平台管理员"
  })
  @IsOptional()
  @IsString()
  role?: string;

  @ApiPropertyOptional({
    description: "状态筛选。",
    example: "启用"
  })
  @IsOptional()
  @IsString()
  status?: string;
}

class AccountUpsertDto {
  @ApiProperty({
    description: "员工编号。",
    example: "2001009001"
  })
  @IsString()
  employeeNo!: string;

  @ApiProperty({
    description: "员工姓名。",
    example: "李明明"
  })
  @IsString()
  employeeName!: string;

  @ApiProperty({
    description: "角色名称。",
    example: "平台管理员"
  })
  @IsString()
  role!: string;

  @ApiProperty({
    description: "手机号。",
    example: "17655558888"
  })
  @Matches(/^1\d{10}$/)
  phone!: string;

  @ApiPropertyOptional({
    description: "登录密码。",
    example: "admin001"
  })
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @ApiPropertyOptional({
    description: "备注。",
    example: "负责平台内容审核和活动配置"
  })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional({
    description: "是否启用。",
    example: true
  })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

class UpdateAccountStatusDto {
  @ApiProperty({
    description: "是否启用。",
    example: true
  })
  @IsBoolean()
  enabled!: boolean;
}

class BatchAccountStatusDto {
  @ApiProperty({
    description: "账号 ID 列表。",
    example: ["user_admin_ops", "user_org_chenan"]
  })
  @IsArray()
  accountIds!: string[];

  @ApiProperty({
    description: "是否启用。",
    example: true
  })
  @IsBoolean()
  enabled!: boolean;
}

class RoleUpsertDto {
  @ApiProperty({
    description: "角色编码。",
    example: "PLATFORM_ADMIN"
  })
  @IsString()
  code!: string;

  @ApiProperty({
    description: "角色名称。",
    example: "平台管理员"
  })
  @IsString()
  name!: string;

  @ApiPropertyOptional({
    description: "角色描述。",
    example: "平台级后台运营管理"
  })
  @IsOptional()
  @IsString()
  description?: string;
}

@Controller("admin")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("PLATFORM_ADMIN", "ORG_MANAGER")
@ApiTags(SwaggerTags.AdminSystem)
@ApiBearerAuth()
export class AdminSystemController {
  constructor(private readonly adminService: AdminService) {}

  @Get("institutions")
  @ApiOperation({
    summary: "获取机构管理页数据",
    description: "system/institution-management 页面接口。"
  })
  listInstitutions(@Query() query: InstitutionsQueryDto) {
    return this.adminService.listInstitutions(
      query.page,
      query.pageSize,
      query.region,
      query.status
    );
  }

  @Get("institutions/:institutionId")
  @ApiOperation({
    summary: "获取机构详情",
    description: "机构编辑态详情接口。"
  })
  getInstitutionDetail(@Param("institutionId") institutionId: string) {
    return this.adminService.getInstitutionDetail(institutionId);
  }

  @Post("institutions")
  @ApiOperation({
    summary: "创建机构",
    description: "机构管理页新增机构接口。"
  })
  createInstitution(@Body() body: InstitutionUpsertDto) {
    return this.adminService.createInstitution(body);
  }

  @Put("institutions/:institutionId")
  @ApiOperation({
    summary: "更新机构",
    description: "机构管理页编辑机构接口。"
  })
  updateInstitution(
    @Param("institutionId") institutionId: string,
    @Body() body: InstitutionUpsertDto
  ) {
    return this.adminService.updateInstitution(institutionId, body);
  }

  @Post("institutions/:institutionId/publish")
  @ApiOperation({
    summary: "发布机构",
    description: "机构管理页发布动作接口。"
  })
  publishInstitution(@Param("institutionId") institutionId: string) {
    return this.adminService.publishInstitution(institutionId);
  }

  @Post("institutions/:institutionId/unpublish")
  @ApiOperation({
    summary: "下架机构",
    description: "机构管理页下架动作接口。"
  })
  unpublishInstitution(@Param("institutionId") institutionId: string) {
    return this.adminService.unpublishInstitution(institutionId);
  }

  @Post("institutions/batch-delete")
  @ApiOperation({
    summary: "批量删除机构",
    description: "机构管理页批量删除动作接口。当前实现为批量下架并标记关闭。"
  })
  batchDeleteInstitutions(@Body() body: BatchInstitutionDeleteDto) {
    return this.adminService.batchDeleteInstitutions(body.institutionIds);
  }

  @Get("accounts")
  @ApiOperation({
    summary: "获取后台账号列表",
    description: "system/role-management 页面列表接口。"
  })
  listAccounts(@Query() query: AccountsQueryDto) {
    return this.adminService.listAdminAccounts(
      query.page,
      query.pageSize,
      query.role,
      query.status
    );
  }

  @Post("accounts")
  @ApiOperation({
    summary: "创建后台账号",
    description: "角色管理页新增账号接口。"
  })
  createAccount(@Body() body: AccountUpsertDto) {
    return this.adminService.createAdminAccount(body);
  }

  @Put("accounts/:accountId")
  @ApiOperation({
    summary: "更新后台账号",
    description: "角色管理页编辑账号接口。"
  })
  updateAccount(
    @Param("accountId") accountId: string,
    @Body() body: AccountUpsertDto
  ) {
    return this.adminService.updateAdminAccount(accountId, body);
  }

  @Put("accounts/:accountId/status")
  @ApiOperation({
    summary: "启停后台账号",
    description: "角色管理页单条启停接口。"
  })
  updateAccountStatus(
    @Param("accountId") accountId: string,
    @Body() body: UpdateAccountStatusDto
  ) {
    return this.adminService.updateAdminAccountStatus(accountId, body.enabled);
  }

  @Post("accounts/batch-status")
  @ApiOperation({
    summary: "批量启停后台账号",
    description: "角色管理页批量启停接口。"
  })
  batchUpdateAccountStatus(@Body() body: BatchAccountStatusDto) {
    return this.adminService.batchUpdateAdminAccountStatus(
      body.accountIds,
      body.enabled
    );
  }

  @Delete("accounts/:accountId")
  @ApiOperation({
    summary: "删除后台账号",
    description: "角色管理页删除接口。当前实现为禁用账号并保留历史关系。"
  })
  deleteAccount(@Param("accountId") accountId: string) {
    return this.adminService.deleteAdminAccount(accountId);
  }

  @Get("roles")
  @ApiOperation({
    summary: "获取角色定义列表",
    description: "后台角色定义接口，供账号列表页和编辑弹窗使用。"
  })
  listRoles() {
    return this.adminService.listRoles();
  }

  @Post("roles")
  @ApiOperation({
    summary: "创建角色定义",
    description: "后台新增角色定义接口。"
  })
  createRole(@Body() body: RoleUpsertDto) {
    return this.adminService.createRole(body);
  }

  @Put("roles/:roleId")
  @ApiOperation({
    summary: "更新角色定义",
    description: "后台编辑角色定义接口。"
  })
  updateRole(@Param("roleId") roleId: string, @Body() body: RoleUpsertDto) {
    return this.adminService.updateRole(roleId, body);
  }

  @Delete("roles/:roleId")
  @ApiOperation({
    summary: "删除角色定义",
    description: "后台删除角色定义接口。若角色已有绑定账号，将拒绝删除。"
  })
  deleteRole(@Param("roleId") roleId: string) {
    return this.adminService.deleteRole(roleId);
  }
}
