import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import type { INestApplication } from "@nestjs/common";
import type { AddressInfo } from "node:net";
import type { TestingModule } from "@nestjs/testing";
import { AllExceptionsFilter } from "../../src/common/http/all-exceptions.filter";
import { ApiResponseInterceptor } from "../../src/common/http/api-response.interceptor";

export async function startTestApp(moduleRef: TestingModule) {
  const app = moduleRef.createNestApplication();

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true
    })
  );
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new ApiResponseInterceptor());

  await app.listen(0, "127.0.0.1");

  const server = app.getHttpServer() as { address: () => AddressInfo };
  const address = server.address();

  return {
    app,
    baseUrl: `http://127.0.0.1:${address.port}`
  };
}

export async function stopTestApp(app: INestApplication) {
  await app.close();
}

export async function requestJson<TResponse = unknown>(
  baseUrl: string,
  path: string,
  init: {
    method?: string;
    headers?: Record<string, string>;
    body?: unknown;
  } = {}
) {
  const headers = new Headers(init.headers);
  let body: string | Uint8Array | undefined;

  if (init.body !== undefined) {
    headers.set("content-type", "application/json");
    body = JSON.stringify(init.body);
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method: init.method ?? "GET",
    headers,
    body
  });
  const text = await response.text();

  return {
    status: response.status,
    json: JSON.parse(text) as TResponse
  };
}
