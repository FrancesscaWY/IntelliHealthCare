import {
  Body,
  Controller,
  Get,
  Put,
  Post,
  UseGuards
} from "@nestjs/common";
import {
  IsBoolean,
  IsNotEmpty,
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
import { CurrentUser } from "../../common/auth/current-user.decorator";
import { JwtAuthGuard } from "../../common/auth/jwt-auth.guard";
import type { AuthenticatedUser } from "../../common/auth/auth.types";
import { SwaggerTags } from "../../common/http/swagger-tags";
import { AuthService } from "./auth.service";

class SendSmsCodeDto {
  @ApiProperty({
    description: "手机号，固定 11 位大陆手机号。",
    example: "13900139000"
  })
  @Matches(/^1\d{10}$/)
  phone!: string;

  @ApiPropertyOptional({
    description: "验证码用途。登录联调通常填写 login，重置密码填写 password-reset。",
    example: "login",
    default: "login"
  })
  @IsOptional()
  @IsString()
  purpose: string = "login";
}

class LoginWithPasswordDto {
  @ApiProperty({
    description: "登录手机号。",
    example: "13900139000"
  })
  @Matches(/^1\d{10}$/)
  phone!: string;

  @ApiProperty({
    description: "登录密码。",
    example: "123456"
  })
  @IsString()
  @MinLength(1)
  password!: string;

  @ApiPropertyOptional({
    description: "是否已勾选隐私协议。用户端联调建议保持 true。",
    example: true,
    default: true
  })
  @IsOptional()
  @IsBoolean()
  agreePrivacy: boolean = true;

  @ApiPropertyOptional({
    description: "设备标识。Web 端可填写浏览器生成的任意唯一值，也可先留空。",
    example: "web-chrome-001",
    default: ""
  })
  @IsOptional()
  @IsString()
  deviceId: string = "";
}

class LoginWithSmsDto {
  @ApiProperty({
    description: "登录手机号。",
    example: "13900139000"
  })
  @Matches(/^1\d{10}$/)
  phone!: string;

  @ApiProperty({
    description: "短信验证码。",
    example: "1234"
  })
  @IsString()
  @MinLength(4)
  code!: string;
}

class ThirdPartyLoginDto {
  @ApiPropertyOptional({
    description: "手机号。需要绑定手机号时填写。",
    example: "13900139000"
  })
  @IsOptional()
  @Matches(/^1\d{10}$/)
  phone?: string;

  @ApiPropertyOptional({
    description: "第三方平台类型。当前联调默认使用 wechat。",
    example: "wechat",
    default: "wechat"
  })
  @IsOptional()
  @IsString()
  provider: string = "wechat";
}

class VerifyCodeDto {
  @ApiProperty({
    description: "找回密码时输入的手机号。",
    example: "13900139000"
  })
  @Matches(/^1\d{10}$/)
  phone!: string;

  @ApiProperty({
    description: "收到的短信验证码。",
    example: "1234"
  })
  @IsString()
  @MinLength(4)
  code!: string;
}

class ResetPasswordDto extends VerifyCodeDto {
  @ApiProperty({
    description: "新密码，至少 6 位。",
    example: "654321"
  })
  @IsString()
  @MinLength(6)
  newPassword!: string;
}

class RefreshTokenDto {
  @ApiProperty({
    description: "登录接口返回的 data.refreshToken。",
    example: "eyJhbGciOi..."
  })
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}

class UpdateAdminProfileDto {
  @ApiPropertyOptional({
    description: "后台账号姓名。",
    example: "李明明"
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @ApiPropertyOptional({
    description: "后台账号手机号。",
    example: "17615904456"
  })
  @IsOptional()
  @Matches(/^1\d{10}$/)
  phone?: string;

  @ApiPropertyOptional({
    description: "后台账号备注。",
    example: "负责订单派单与履约协同。"
  })
  @IsOptional()
  @IsString()
  note?: string;
}

class UpdateAdminPasswordDto {
  @ApiProperty({
    description: "旧密码。",
    example: "123456"
  })
  @IsString()
  @MinLength(6)
  oldPassword!: string;

  @ApiProperty({
    description: "新密码，至少 6 位。",
    example: "654321"
  })
  @IsString()
  @MinLength(6)
  newPassword!: string;

  @ApiPropertyOptional({
    description: "确认新密码，可选。若传入则必须与 newPassword 一致。",
    example: "654321"
  })
  @IsOptional()
  @IsString()
  @MinLength(6)
  confirmPassword?: string;
}

class UpdateAdminAvatarDto {
  @ApiPropertyOptional({
    description: "已上传完成的文件 ID。优先从后台文件上传接口获取。",
    example: "file_admin_avatar_001"
  })
  @IsOptional()
  @IsString()
  fileId?: string;

  @ApiPropertyOptional({
    description: "头像 URL。已知 URL 时可直接写入。",
    example: "https://cdn.intellihealthcare.demo/admin/avatar.jpg"
  })
  @IsOptional()
  @IsString()
  avatarUrl?: string;
}

@Controller("app/auth")
@ApiTags(SwaggerTags.AppAuth)
export class AppAuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("sms/send")
  @ApiOperation({
    summary: "发送短信验证码",
    description: "用于验证码登录或重置密码前的验证码获取。前端一般先调用此接口，再调用短信登录或验证码校验接口。"
  })
  sendSmsCode(@Body() body: SendSmsCodeDto) {
    return this.authService.sendSmsCode(body.phone, body.purpose);
  }

  @Post("login/password")
  @ApiOperation({
    summary: "用户端密码登录",
    description:
      "前端联调获取 APP_TOKEN 的首选入口。执行成功后，请复制返回 data.accessToken，并在右上角 Authorize 中填写 Bearer <accessToken>。"
  })
  loginWithPassword(@Body() body: LoginWithPasswordDto) {
    return this.authService.loginWithPassword(body.phone, body.password, "app");
  }

  @Post("login/sms")
  @ApiOperation({
    summary: "用户端短信登录",
    description: "适合联调验证码登录流程。通常在发送短信验证码成功后调用。"
  })
  loginWithSms(@Body() body: LoginWithSmsDto) {
    return this.authService.loginWithSms(body.phone, body.code, "app");
  }

  @Post("login/third-party")
  @ApiOperation({
    summary: "用户端第三方登录",
    description: "用于模拟微信等第三方登录入口。当前联调环境默认 provider 填写 wechat。"
  })
  loginWithThirdParty(@Body() body: ThirdPartyLoginDto) {
    return this.authService.loginWithThirdParty(body.phone, "app");
  }

  @Post("password/verify-code")
  @ApiOperation({
    summary: "校验重置密码验证码",
    description: "忘记密码页先调用该接口校验验证码是否正确，再进入重置密码提交。"
  })
  async verifyResetCode(@Body() body: VerifyCodeDto) {
    await this.authService.verifySmsCode(body.phone, body.code, "password-reset");
    return {
      verified: true
    };
  }

  @Post("password/reset")
  @ApiOperation({
    summary: "重置密码",
    description: "验证码校验通过后调用，成功后使用新密码重新登录。"
  })
  resetPassword(@Body() body: ResetPasswordDto) {
    return this.authService.resetPassword(body.phone, body.code, body.newPassword);
  }

  @Post("token/refresh")
  @ApiOperation({
    summary: "刷新用户端 Token",
    description: "当 accessToken 过期时，使用 refreshToken 换取新的登录态。"
  })
  refreshToken(@Body() body: RefreshTokenDto) {
    return this.authService.refreshToken(body.refreshToken, "app");
  }

  @Post("logout")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "用户端退出登录",
    description: "用于清理当前登录态。测试前请先在右上角 Authorize 中填入用户端 token。"
  })
  logout() {
    return this.authService.logout();
  }
}

@Controller("admin/auth")
@ApiTags(SwaggerTags.AdminAuth)
export class AdminAuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("login/password")
  @ApiOperation({
    summary: "后台密码登录",
    description:
      "后台联调获取 ADMIN_TOKEN 的入口。执行成功后复制 data.accessToken，并在 Authorize 中替换掉当前 token。"
  })
  loginWithPassword(@Body() body: LoginWithPasswordDto) {
    return this.authService.loginWithPassword(body.phone, body.password, "admin");
  }

  @Post("token/refresh")
  @ApiOperation({
    summary: "刷新后台 Token",
    description: "后台端 accessToken 过期后，使用 refreshToken 获取新的后台登录态。"
  })
  refreshToken(@Body() body: RefreshTokenDto) {
    return this.authService.refreshToken(body.refreshToken, "admin");
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "获取当前后台登录用户",
    description: "用于确认后台 token 是否可用，以及当前账号角色信息。"
  })
  me(@CurrentUser() user: AuthenticatedUser) {
    return user;
  }

  @Get("profile")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "获取后台个人资料",
    description: "后台个人资料页与账号设置页初始化接口。"
  })
  getProfile(@CurrentUser("id") userId: string) {
    return this.authService.getAdminProfile(userId);
  }

  @Put("profile")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "更新后台个人资料",
    description: "后台账号设置页保存个人资料时调用。"
  })
  updateProfile(
    @CurrentUser("id") userId: string,
    @Body() body: UpdateAdminProfileDto
  ) {
    return this.authService.updateAdminProfile(userId, body);
  }

  @Put("password")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "修改后台登录密码",
    description: "后台重置密码页提交接口。"
  })
  updatePassword(
    @CurrentUser("id") userId: string,
    @Body() body: UpdateAdminPasswordDto
  ) {
    return this.authService.updateAdminPassword(userId, body);
  }

  @Put("avatar")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "更新后台头像",
    description: "后台头像上传完成后写入账号资料时调用。"
  })
  updateAvatar(
    @CurrentUser("id") userId: string,
    @Body() body: UpdateAdminAvatarDto
  ) {
    return this.authService.updateAdminAvatar(userId, body);
  }
}

@Controller()
@ApiTags(SwaggerTags.SystemPublicAgreement)
export class PublicDocumentController {
  @Get("app/agreements/privacy")
  @ApiOperation({
    summary: "获取隐私协议",
    description: "登录页、勾选隐私协议弹窗等页面可直接调用，无需登录态。"
  })
  getPrivacyAgreement() {
    return {
      title: "智诊康养隐私政策",
      version: "2026-04-20",
      content:
        "本地开发环境提供演示版隐私政策文本。正式环境应替换为法务确认后的协议全文。"
    };
  }
}
