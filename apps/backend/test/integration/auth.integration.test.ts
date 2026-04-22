import "reflect-metadata";
import assert from "node:assert/strict";
import test from "node:test";
import { ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { Test } from "@nestjs/testing";
import { UserType } from "@prisma/client";
import {
  AppAuthController,
  PublicDocumentController
} from "../../src/modules/auth/auth.controller";
import { AuthService } from "../../src/modules/auth/auth.service";
import { hashPassword, isSecurePasswordHash } from "../../src/common/auth/password";
import { PrismaService } from "../../src/infra/prisma/prisma.service";
import { requestJson, startTestApp, stopTestApp } from "../support/test-app";

test("auth integration covers password login, sms login and password reset", async () => {
  const initialPasswordHash = await hashPassword("123456");
  const userRecord = {
    id: "user_family_wanglan",
    phone: "13900139000",
    type: UserType.FAMILY,
    realName: "王兰",
    passwordHash: initialPasswordHash,
    lastLoginAt: null as Date | null,
    roles: [
      {
        role: {
          code: "MEMBER"
        }
      }
    ]
  };

  const prismaService = {
    user: {
      findUnique: async ({ where }: { where: { phone?: string; id?: string } }) => {
        if (where.phone === userRecord.phone || where.id === userRecord.id) {
          return userRecord;
        }

        return null;
      },
      update: async ({
        where,
        data
      }: {
        where: { id: string };
        data: { passwordHash?: string; lastLoginAt?: Date };
      }) => {
        assert.equal(where.id, userRecord.id);

        if (data.passwordHash) {
          userRecord.passwordHash = data.passwordHash;
        }

        if (data.lastLoginAt) {
          userRecord.lastLoginAt = data.lastLoginAt;
        }

        return userRecord;
      }
    }
  };

  const configService = {
    get: (key: string) => {
      const values: Record<string, string> = {
        JWT_ACCESS_SECRET: "test-access-secret-1234567890",
        JWT_REFRESH_SECRET: "test-refresh-secret-1234567890",
        JWT_ACCESS_TTL: "2h",
        JWT_REFRESH_TTL: "30d",
        NODE_ENV: "test"
      };

      return values[key];
    }
  };

  const moduleRef = await Test.createTestingModule({
    imports: [
      JwtModule.register({
        secret: "test-access-secret-1234567890"
      })
    ],
    controllers: [AppAuthController, PublicDocumentController],
    providers: [
      AuthService,
      {
        provide: PrismaService,
        useValue: prismaService
      },
      {
        provide: ConfigService,
        useValue: configService
      }
    ]
  }).compile();

  const { app, baseUrl } = await startTestApp(moduleRef);

  try {
    const passwordLogin = await requestJson<{
      code: number;
      data: {
        accessToken: string;
        refreshToken: string;
      };
    }>(baseUrl, "/app/auth/login/password", {
      method: "POST",
      body: {
        phone: userRecord.phone,
        password: "123456",
        agreePrivacy: true
      }
    });
    assert.equal(passwordLogin.status, 201, JSON.stringify(passwordLogin.json));
    assert.equal(passwordLogin.json.code, 0);
    assert.ok(passwordLogin.json.data.accessToken.length > 10);

    const smsResponse = await requestJson<{
      code: number;
      data: {
        debugCode?: string;
      };
    }>(baseUrl, "/app/auth/sms/send", {
      method: "POST",
      body: {
        phone: userRecord.phone,
        purpose: "login"
      }
    });
    assert.equal(smsResponse.status, 201);
    assert.equal(typeof smsResponse.json.data.debugCode, "string");

    const smsLogin = await requestJson<{
      code: number;
      data: {
        accessToken: string;
      };
    }>(baseUrl, "/app/auth/login/sms", {
      method: "POST",
      body: {
        phone: userRecord.phone,
        code: smsResponse.json.data.debugCode
      }
    });
    assert.equal(smsLogin.status, 201);
    assert.equal(smsLogin.json.code, 0);

    const resetSms = await requestJson<{
      code: number;
      data: {
        debugCode?: string;
      };
    }>(baseUrl, "/app/auth/sms/send", {
      method: "POST",
      body: {
        phone: userRecord.phone,
        purpose: "password-reset"
      }
    });

    const resetResponse = await requestJson<{
      code: number;
      data: {
        reset: boolean;
      };
    }>(baseUrl, "/app/auth/password/reset", {
      method: "POST",
      body: {
        phone: userRecord.phone,
        code: resetSms.json.data.debugCode,
        newPassword: "654321"
      }
    });
    assert.equal(resetResponse.status, 201);
    assert.equal(resetResponse.json.data.reset, true);
    assert.equal(isSecurePasswordHash(userRecord.passwordHash), true);
    assert.notEqual(userRecord.passwordHash, "654321");

    const relogin = await requestJson<{
      code: number;
      data: {
        accessToken: string;
      };
    }>(baseUrl, "/app/auth/login/password", {
      method: "POST",
      body: {
        phone: userRecord.phone,
        password: "654321",
        agreePrivacy: true
      }
    });
    assert.equal(relogin.status, 201);
    assert.equal(relogin.json.code, 0);
  } finally {
    await stopTestApp(app);
  }
});
