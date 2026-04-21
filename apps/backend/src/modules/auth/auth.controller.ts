import {
  Body,
  Controller,
  Get,
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
import { CurrentUser } from "../../common/auth/current-user.decorator";
import { JwtAuthGuard } from "../../common/auth/jwt-auth.guard";
import type { AuthenticatedUser } from "../../common/auth/auth.types";
import { AuthService } from "./auth.service";

class SendSmsCodeDto {
  @Matches(/^1\d{10}$/)
  phone!: string;

  @IsOptional()
  @IsString()
  purpose = "login";
}

class LoginWithPasswordDto {
  @Matches(/^1\d{10}$/)
  phone!: string;

  @IsString()
  @MinLength(1)
  password!: string;

  @IsOptional()
  @IsBoolean()
  agreePrivacy = true;

  @IsOptional()
  @IsString()
  deviceId = "";
}

class LoginWithSmsDto {
  @Matches(/^1\d{10}$/)
  phone!: string;

  @IsString()
  @MinLength(4)
  code!: string;
}

class ThirdPartyLoginDto {
  @IsOptional()
  @Matches(/^1\d{10}$/)
  phone?: string;

  @IsOptional()
  @IsString()
  provider = "wechat";
}

class VerifyCodeDto {
  @Matches(/^1\d{10}$/)
  phone!: string;

  @IsString()
  @MinLength(4)
  code!: string;
}

class ResetPasswordDto extends VerifyCodeDto {
  @IsString()
  @MinLength(6)
  newPassword!: string;
}

class RefreshTokenDto {
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}

@Controller("app/auth")
export class AppAuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("sms/send")
  sendSmsCode(@Body() body: SendSmsCodeDto) {
    return this.authService.sendSmsCode(body.phone, body.purpose);
  }

  @Post("login/password")
  loginWithPassword(@Body() body: LoginWithPasswordDto) {
    return this.authService.loginWithPassword(body.phone, body.password, "app");
  }

  @Post("login/sms")
  loginWithSms(@Body() body: LoginWithSmsDto) {
    return this.authService.loginWithSms(body.phone, body.code, "app");
  }

  @Post("login/third-party")
  loginWithThirdParty(@Body() body: ThirdPartyLoginDto) {
    return this.authService.loginWithThirdParty(body.phone, "app");
  }

  @Post("password/verify-code")
  async verifyResetCode(@Body() body: VerifyCodeDto) {
    await this.authService.verifySmsCode(body.phone, body.code, "password-reset");
    return {
      verified: true
    };
  }

  @Post("password/reset")
  resetPassword(@Body() body: ResetPasswordDto) {
    return this.authService.resetPassword(body.phone, body.code, body.newPassword);
  }

  @Post("token/refresh")
  refreshToken(@Body() body: RefreshTokenDto) {
    return this.authService.refreshToken(body.refreshToken, "app");
  }

  @Post("logout")
  @UseGuards(JwtAuthGuard)
  logout() {
    return this.authService.logout();
  }
}

@Controller("admin/auth")
export class AdminAuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("login/password")
  loginWithPassword(@Body() body: LoginWithPasswordDto) {
    return this.authService.loginWithPassword(body.phone, body.password, "admin");
  }

  @Post("token/refresh")
  refreshToken(@Body() body: RefreshTokenDto) {
    return this.authService.refreshToken(body.refreshToken, "admin");
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: AuthenticatedUser) {
    return user;
  }
}

@Controller()
export class PublicDocumentController {
  @Get("app/agreements/privacy")
  getPrivacyAgreement() {
    return {
      title: "智诊康养隐私政策",
      version: "2026-04-20",
      content:
        "本地开发环境提供演示版隐私政策文本。正式环境应替换为法务确认后的协议全文。"
    };
  }
}
