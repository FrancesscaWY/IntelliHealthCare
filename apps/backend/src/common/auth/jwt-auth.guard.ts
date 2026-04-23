import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import type { EnvironmentVariables } from "../config/env.schema";
import type { AccessTokenPayload, AuthenticatedUser } from "./auth.types";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<EnvironmentVariables, true>
  ) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
      user?: AuthenticatedUser;
    }>();
    const authorization = request.headers.authorization;
    const token = typeof authorization === "string"
      ? authorization.replace(/^Bearer\s+/i, "").trim()
      : "";

    if (!token) {
      throw new UnauthorizedException("Missing bearer token");
    }

    try {
      const payload = await this.jwtService.verifyAsync<AccessTokenPayload>(token, {
        secret: this.configService.get("JWT_ACCESS_SECRET", { infer: true })
      });

      request.user = {
        id: payload.sub,
        phone: payload.phone,
        type: payload.type,
        roles: payload.roles,
        scope: payload.scope,
        realName: payload.realName
      };

      return true;
    } catch {
      throw new UnauthorizedException("Invalid or expired access token");
    }
  }
}
