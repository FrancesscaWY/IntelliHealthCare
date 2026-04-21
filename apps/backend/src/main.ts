import { Logger, ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import "reflect-metadata";
import { bootstrapDatabase } from "./common/bootstrap/database-bootstrap";
import type { DatabaseBootstrapResult } from "./common/bootstrap/database-bootstrap";
import type { EnvironmentVariables } from "./common/config/env.schema";
import { AllExceptionsFilter } from "./common/http/all-exceptions.filter";
import { ApiResponseInterceptor } from "./common/http/api-response.interceptor";

let databaseBootstrap: DatabaseBootstrapResult | null = null;

async function bootstrap() {
  const logger = new Logger("Bootstrap");
  databaseBootstrap = await bootstrapDatabase(logger);
  const { AppModule } = await import("./app.module");
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true
  });

  const configService = app.get<ConfigService<EnvironmentVariables, true>>(
    ConfigService
  );
  const apiPrefix = configService.get("API_PREFIX", { infer: true });
  const host = configService.get("HOST", { infer: true });
  const port = configService.get("PORT", { infer: true });
  const appName = configService.get("APP_NAME", { infer: true });
  const corsOrigins = configService
    .get("CORS_ORIGINS", { infer: true })
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  app.enableCors({
    origin: corsOrigins,
    credentials: true
  });
  app.setGlobalPrefix(apiPrefix);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true
    })
  );
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new ApiResponseInterceptor());

  const swaggerConfig = new DocumentBuilder()
    .setTitle("智诊康养后端 API 文档")
    .setDescription("面向用户端与后台端的非 AI 业务接口文档")
    .setVersion("0.1.0")
    .addBearerAuth(
      {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "请输入访问令牌，格式：Bearer <token>"
      },
      "bearer"
    )
    .build();

  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup(`${apiPrefix}/docs`, app, swaggerDocument, {
    jsonDocumentUrl: `${apiPrefix}/docs/json`,
    customSiteTitle: "智诊康养 API 文档"
  });

  await app.listen(port, host);

  let shuttingDown = false;
  const shutdown = async (exitCode: number) => {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;

    await app.close().catch(() => undefined);
    await databaseBootstrap?.cleanup().catch(() => undefined);

    process.exit(exitCode);
  };

  process.once("SIGINT", () => {
    void shutdown(0);
  });

  process.once("SIGTERM", () => {
    void shutdown(0);
  });

  const displayHost = host === "0.0.0.0" ? "localhost" : host;
  logger.log(`${appName} is running at http://${displayHost}:${port}/${apiPrefix}`);

  if (host === "0.0.0.0") {
    logger.log(
      `Remote access is available at http://<server-ip>:${port}/${apiPrefix}/docs when the port is open.`
    );
  }
}

bootstrap().catch((error: unknown) => {
  const logger = new Logger("Bootstrap");
  logger.error(error);
  void databaseBootstrap?.cleanup().finally(() => {
    process.exit(1);
  });
});
