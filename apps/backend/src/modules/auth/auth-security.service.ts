import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { PrismaService } from "../../infra/prisma/prisma.service";
import {
  hashPassword,
  isSecurePasswordHash,
  resolveLegacyPassword
} from "../../common/auth/password";

@Injectable()
export class AuthSecurityService implements OnModuleInit {
  private readonly logger = new Logger(AuthSecurityService.name);

  constructor(private readonly prismaService: PrismaService) {}

  async onModuleInit() {
    const users = await this.prismaService.user.findMany({
      where: {
        passwordHash: {
          not: null
        }
      },
      select: {
        id: true,
        passwordHash: true
      }
    });

    const insecureUsers = users.filter(
      (user) =>
        typeof user.passwordHash === "string" &&
        !isSecurePasswordHash(user.passwordHash) &&
        resolveLegacyPassword(user.passwordHash) !== null
    );

    if (insecureUsers.length === 0) {
      return;
    }

    const updates = await Promise.all(
      insecureUsers.map(async (user) => ({
        id: user.id,
        passwordHash: await hashPassword(resolveLegacyPassword(user.passwordHash!)!)
      }))
    );

    await this.prismaService.$transaction(
      updates.map((item) =>
        this.prismaService.user.update({
          where: { id: item.id },
          data: {
            passwordHash: item.passwordHash
          }
        })
      )
    );

    this.logger.warn(
      `Migrated ${updates.length} insecure password hash record(s) to scrypt.`
    );
  }
}
