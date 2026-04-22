import { Logger, ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import "reflect-metadata";
import { AppModule } from "./app.module";
import { EnvironmentVariables } from "./common/config/env.schema";
import { AllExceptionsFilter } from "./common/http/all-exceptions.filter";
import { ApiResponseInterceptor } from "./common/http/api-response.interceptor";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true
  });

  const logger = new Logger("Bootstrap");
  const configService = app.get<ConfigService<EnvironmentVariables, true>>(
    ConfigService
  );
  const apiPrefix = configService.get("API_PREFIX", { infer: true });
  const port = configService.get("PORT", { infer: true });
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
    .setTitle("IntelliHealthCare Backend API")
    .setDescription("Backend foundation for the IntelliHealthCare platform")
    .setVersion("0.1.0")
    .addBearerAuth()
    .build();

  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup(`${apiPrefix}/docs`, app, swaggerDocument, {
    jsonDocumentUrl: `${apiPrefix}/docs/json`
  });

  await app.listen(port);

  logger.log(
    `${configService.get("APP_NAME", { infer: true })} is running at ${await app.getUrl()}/${apiPrefix}`
  );
}

bootstrap().catch((error: unknown) => {
  const logger = new Logger("Bootstrap");
  logger.error(error);
  process.exit(1);
});
