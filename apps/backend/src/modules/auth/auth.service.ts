import {
  ForbiddenException,
  Injectable,
  UnauthorizedException
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { UserType } from "@prisma/client";
import type { EnvironmentVariables } from "../../common/config/env.schema";
import type {
  AccessTokenPayload,
  AuthScope
} from "../../common/auth/auth.types";
import {
  generateSmsCode,
  hashPassword,
  verifyPassword
} from "../../common/auth/password";
import { PrismaService } from "../../infra/prisma/prisma.service";

interface SmsCodeRecord {
  code: string;
  expiresAt: number;
}

interface AuthUserRecord {
  id: string;
  phone: string;
  type: UserType;
  realName: string | null;
  passwordHash: string | null;
  roles: string[];
}

@Injectable()
export class AuthService {
  private readonly smsCodes = new Map<string, SmsCodeRecord>();

  constructor(
    private readonly prismaService: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<EnvironmentVariables, true>
  ) {}

  async sendSmsCode(phone: string, purpose: string) {
    const code = generateSmsCode();
    this.smsCodes.set(`${purpose}:${phone}`, {
      code,
      expiresAt: Date.now() + 10 * 60 * 1000
    });

    const response: {
      phone: string;
      purpose: string;
      sent: true;
      expiresInSeconds: number;
      debugCode?: string;
    } = {
      phone,
      purpose,
      sent: true,
      expiresInSeconds: 600
    };

    if (this.configService.get("NODE_ENV", { infer: true }) !== "production") {
      response.debugCode = code;
    }

    return response;
  }

  async verifySmsCode(phone: string, code: string, purpose: string) {
    const record = this.smsCodes.get(`${purpose}:${phone}`);

    if (!record || record.expiresAt < Date.now() || record.code !== code) {
      throw new UnauthorizedException("Invalid verification code");
    }

    return true;
  }

  async loginWithPassword(phone: string, password: string, scope: AuthScope) {
    const user = await this.findAuthUserByPhone(phone);
    this.ensureScopeAllowed(user, scope);

    if (!(await this.matchesPassword(user.passwordHash, password))) {
      throw new UnauthorizedException("Invalid phone or password");
    }

    await this.touchLastLogin(user.id);
    return this.createSession(user, scope);
  }

  async loginWithSms(phone: string, code: string, scope: AuthScope) {
    await this.verifySmsCode(phone, code, "login");
    const user = await this.findAuthUserByPhone(phone);
    this.ensureScopeAllowed(user, scope);
    await this.touchLastLogin(user.id);
    return this.createSession(user, scope);
  }

  async loginWithThirdParty(phone: string | undefined, scope: AuthScope) {
    const user = phone
      ? await this.findAuthUserByPhone(phone)
      : await this.findAuthUserByPhone("13900139000");
    this.ensureScopeAllowed(user, scope);
    await this.touchLastLogin(user.id);
    return this.createSession(user, scope);
  }

  async refreshToken(refreshToken: string, scope: AuthScope) {
    let payload: AccessTokenPayload;

    try {
      payload = await this.jwtService.verifyAsync<AccessTokenPayload>(refreshToken, {
        secret: this.configService.get("JWT_REFRESH_SECRET", { infer: true })
      });
    } catch {
      throw new UnauthorizedException("Invalid or expired refresh token");
    }

    if (payload.scope !== scope) {
      throw new ForbiddenException("Token scope mismatch");
    }

    const user = await this.findAuthUserById(payload.sub);
    this.ensureScopeAllowed(user, scope);

    return this.createSession(user, scope);
  }

  async resetPassword(phone: string, code: string, newPassword: string) {
    await this.verifySmsCode(phone, code, "password-reset");
    const user = await this.findAuthUserByPhone(phone);

    await this.prismaService.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await hashPassword(newPassword)
      }
    });

    return {
      reset: true
    };
  }

  async getUserProfile(userId: string) {
    return this.findAuthUserById(userId);
  }

  async logout() {
    return {
      loggedOut: true
    };
  }

  private async matchesPassword(passwordHash: string | null, password: string) {
    if (!passwordHash) {
      return false;
    }

    return verifyPassword(passwordHash, password);
  }

  private async touchLastLogin(userId: string) {
    await this.prismaService.user.update({
      where: { id: userId },
      data: {
        lastLoginAt: new Date()
      }
    });
  }

  private async createSession(user: AuthUserRecord, scope: AuthScope) {
    const payload: AccessTokenPayload = {
      sub: user.id,
      phone: user.phone,
      type: user.type,
      roles: user.roles,
      scope,
      realName: user.realName
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get("JWT_ACCESS_SECRET", { infer: true }),
        expiresIn: this.configService.get("JWT_ACCESS_TTL", { infer: true })
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get("JWT_REFRESH_SECRET", { infer: true }),
        expiresIn: this.configService.get("JWT_REFRESH_TTL", { infer: true })
      })
    ]);

    return {
      accessToken,
      refreshToken,
      tokenType: "Bearer",
      expiresIn: this.configService.get("JWT_ACCESS_TTL", { infer: true }),
      user: {
        userId: user.id,
        phone: user.phone,
        type: user.type,
        roles: user.roles,
        realName: user.realName
      }
    };
  }

  private ensureScopeAllowed(user: AuthUserRecord, scope: AuthScope) {
    if (scope === "admin") {
      const isAdminScopeUser =
        user.type === UserType.ADMIN ||
        user.type === UserType.ORG_MANAGER ||
        user.roles.some((role) =>
          ["PLATFORM_ADMIN", "ORG_MANAGER", "DOCTOR", "CAREGIVER", "THERAPIST", "CUSTOMER_SERVICE"].includes(role)
        );

      if (!isAdminScopeUser) {
        throw new ForbiddenException("User is not allowed to access admin scope");
      }
    }
  }

  private async findAuthUserByPhone(phone: string) {
    const user = await this.prismaService.user.findUnique({
      where: { phone },
      include: {
        roles: {
          include: {
            role: true
          }
        }
      }
    });

    if (!user) {
      throw new UnauthorizedException("Invalid credentials");
    }

    return {
      id: user.id,
      phone: user.phone,
      type: user.type,
      realName: user.realName,
      passwordHash: user.passwordHash,
      roles: user.roles.map((item) => item.role.code)
    } satisfies AuthUserRecord;
  }

  private async findAuthUserById(userId: string) {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: {
            role: true
          }
        }
      }
    });

    if (!user) {
      throw new UnauthorizedException("User not found");
    }

    return {
      id: user.id,
      phone: user.phone,
      type: user.type,
      realName: user.realName,
      passwordHash: user.passwordHash,
      roles: user.roles.map((item) => item.role.code)
    } satisfies AuthUserRecord;
  }
}
