import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { validateEnv } from "./common/config/env.schema";
import { RequestContextMiddleware } from "./common/middleware/request-context.middleware";
import { resolveBackendEnvFilePaths } from "./common/utils/backend-paths";
import { PrismaModule } from "./infra/prisma/prisma.module";
import { QueueModule } from "./infra/queue/queue.module";
import { StorageModule } from "./infra/storage/storage.module";
import { AdminModule } from "./modules/admin/admin.module";
import { AgentsModule } from "./modules/agents/agents.module";
import { AuthModule } from "./modules/auth/auth.module";
import { CommunityModule } from "./modules/community/community.module";
import { ContentModule } from "./modules/content/content.module";
import { FamilyModule } from "./modules/family/family.module";
import { HealthArchiveModule } from "./modules/health-archive/health-archive.module";
import { HealthLifestyleModule } from "./modules/health-lifestyle/health-lifestyle.module";
import { HealthMetricsModule } from "./modules/health-metrics/health-metrics.module";
import { MessagingModule } from "./modules/messaging/messaging.module";
import { OrdersModule } from "./modules/orders/orders.module";
import { PaymentsModule } from "./modules/payments/payments.module";
import { ReportsModule } from "./modules/reports/reports.module";
import { ServiceCatalogModule } from "./modules/service-catalog/service-catalog.module";
import { SystemModule } from "./modules/system/system.module";
import { UsersModule } from "./modules/users/users.module";
import { FilesModule } from "./modules/files/files.module";

const envFilePath = resolveBackendEnvFilePaths();

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath,
      validate: validateEnv
    }),
    PrismaModule,
    QueueModule,
    StorageModule,
    SystemModule,
    AuthModule,
    UsersModule,
    FamilyModule,
    HealthArchiveModule,
    HealthMetricsModule,
    HealthLifestyleModule,
    ServiceCatalogModule,
    OrdersModule,
    PaymentsModule,
    ReportsModule,
    FilesModule,
    MessagingModule,
    CommunityModule,
    ContentModule,
    AgentsModule,
    AdminModule
  ]
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestContextMiddleware).forRoutes("*");
  }
}
