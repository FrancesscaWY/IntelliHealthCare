import { Global, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import type { EnvironmentVariables } from "../../common/config/env.schema";
import { InternalAccessGuard } from "../../common/auth/internal-access.guard";
import { JwtAuthGuard } from "../../common/auth/jwt-auth.guard";
import { RolesGuard } from "../../common/auth/roles.guard";
import {
  AdminAuthController,
  AppAuthController,
  PublicDocumentController
} from "./auth.controller";
import { AuthSecurityService } from "./auth-security.service";
import { AuthService } from "./auth.service";

@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService<EnvironmentVariables, true>) => ({
        secret: configService.get("JWT_ACCESS_SECRET", { infer: true })
      })
    })
  ],
  controllers: [
    AppAuthController,
    AdminAuthController,
    PublicDocumentController
  ],
  providers: [
    AuthService,
    AuthSecurityService,
    JwtAuthGuard,
    InternalAccessGuard,
    RolesGuard
  ],
  exports: [
    AuthService,
    JwtModule,
    JwtAuthGuard,
    InternalAccessGuard,
    RolesGuard
  ]
})
export class AuthModule {}
