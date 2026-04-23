import { Logger, ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import "reflect-metadata";
import { bootstrapDatabase } from "./common/bootstrap/database-bootstrap";
import type { DatabaseBootstrapResult } from "./common/bootstrap/database-bootstrap";
import type { EnvironmentVariables } from "./common/config/env.schema";
import { enhanceSwaggerDocument } from "./common/http/swagger-document-enhancer";
import { AllExceptionsFilter } from "./common/http/all-exceptions.filter";
import { ApiResponseInterceptor } from "./common/http/api-response.interceptor";
import { SwaggerTagDefinitions } from "./common/http/swagger-tags";

let databaseBootstrap: DatabaseBootstrapResult | null = null;

type SwaggerUiOperationEntry = {
  get?: (key: string) => unknown;
} & Record<string, unknown>;

type SwaggerUiTagSorter = (left: string, right: string) => number;
type SwaggerUiOperationSorter = (
  left: SwaggerUiOperationEntry,
  right: SwaggerUiOperationEntry
) => number;

const swaggerTagRanksLiteral = JSON.stringify(
  Object.fromEntries(
    SwaggerTagDefinitions.map((tag, index) => [tag.name, index] as const)
  ),
  null,
  2
);

// Nest serializes Swagger UI callback source into swagger-ui-init.js.
// These functions must stay self-contained and cannot close over server variables.
const swaggerTagsSorter = new Function(
  "left",
  "right",
  `
    const tagOrder = ${swaggerTagRanksLiteral};
    const leftRank = Object.prototype.hasOwnProperty.call(tagOrder, left)
      ? tagOrder[left]
      : Number.MAX_SAFE_INTEGER;
    const rightRank = Object.prototype.hasOwnProperty.call(tagOrder, right)
      ? tagOrder[right]
      : Number.MAX_SAFE_INTEGER;

    if (leftRank !== rightRank) {
      return leftRank - rightRank;
    }

    return String(left).localeCompare(String(right), "zh-CN");
  `
) as SwaggerUiTagSorter;

const swaggerOperationsSorter = new Function(
  "left",
  "right",
  `
    const readValue = (entry, key) => {
      if (entry && typeof entry.get === "function") {
        const value = entry.get(key);
        return typeof value === "string" ? value : "";
      }

      const value = entry ? entry[key] : "";
      return typeof value === "string" ? value : "";
    };

    const pathCompare = readValue(left, "path").localeCompare(
      readValue(right, "path"),
      "zh-CN"
    );

    if (pathCompare !== 0) {
      return pathCompare;
    }

    return readValue(left, "method").localeCompare(
      readValue(right, "method"),
      "en"
    );
  `
) as SwaggerUiOperationSorter;

const swaggerCopyApiButtonScript = String.raw`
  (() => {
    const BUTTON_CLASS = "ihc-copy-api-button";
    const COPIED_CLASS = "is-copied";
    const ERROR_CLASS = "is-error";
    const DEFAULT_TEXT = "复制 API";
    const COPIED_TEXT = "已复制";
    const ERROR_TEXT = "复制失败";

    const buttonSelector = "." + BUTTON_CLASS;
    const buttonResetTimers = new WeakMap();

    const getFallbackServerPath = () =>
      window.location.pathname.replace(/\/docs(?:\/index\.html)?\/?$/, "");

    const normalizePath = (value) => {
      if (!value) {
        return "";
      }

      return value.startsWith("/") ? value : "/" + value;
    };

    const getSelectedServerValue = () => {
      const serverSelect = document.querySelector(".swagger-ui .servers select");
      const selectedOption =
        serverSelect &&
        serverSelect.selectedOptions &&
        serverSelect.selectedOptions[0];

      if (!selectedOption) {
        return getFallbackServerPath();
      }

      const optionValue =
        typeof selectedOption.value === "string" ? selectedOption.value.trim() : "";

      if (optionValue && !/^[0-9]+$/.test(optionValue)) {
        return optionValue;
      }

      const optionText =
        typeof selectedOption.textContent === "string"
          ? selectedOption.textContent.trim()
          : "";

      return optionText.split(/\s+-\s+/)[0] || getFallbackServerPath();
    };

    const buildAbsoluteApiUrl = (path) => {
      const serverValue = getSelectedServerValue();
      const normalizedPath = normalizePath(path);

      if (/^https?:\/\//i.test(serverValue)) {
        const baseUrl = serverValue.endsWith("/") ? serverValue : serverValue + "/";
        return new URL(normalizedPath.replace(/^\/+/, ""), baseUrl).toString();
      }

      return window.location.origin + serverValue.replace(/\/+$/, "") + normalizedPath;
    };

    const copyWithExecCommand = (text) => {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.setAttribute("readonly", "true");
      textarea.style.position = "fixed";
      textarea.style.top = "-9999px";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      textarea.setSelectionRange(0, textarea.value.length);
      const copied = document.execCommand("copy");
      document.body.removeChild(textarea);

      if (!copied) {
        throw new Error("copy failed");
      }
    };

    const copyText = async (text) => {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return;
      }

      copyWithExecCommand(text);
    };

    const resetButtonState = (button) => {
      button.textContent = DEFAULT_TEXT;
      button.classList.remove(COPIED_CLASS);
      button.classList.remove(ERROR_CLASS);
      buttonResetTimers.delete(button);
    };

    const setButtonState = (button, text, stateClass) => {
      button.textContent = text;
      button.classList.remove(COPIED_CLASS);
      button.classList.remove(ERROR_CLASS);

      if (stateClass) {
        button.classList.add(stateClass);
      }

      const existingTimer = buttonResetTimers.get(button);
      if (existingTimer) {
        window.clearTimeout(existingTimer);
      }

      const timer = window.setTimeout(() => {
        resetButtonState(button);
      }, 1500);
      buttonResetTimers.set(button, timer);
    };

    const getOperationCopyText = (opblock) => {
      const methodNode = opblock.querySelector(".opblock-summary-method");
      const pathNode = opblock.querySelector(".opblock-summary-path");
      const method =
        (methodNode && methodNode.textContent ? methodNode.textContent : "").trim().toUpperCase();
      const path =
        (opblock.getAttribute("data-path") ||
          (pathNode && pathNode.textContent ? pathNode.textContent : "")).trim();

      if (!method || !path) {
        return "";
      }

      return method + " " + buildAbsoluteApiUrl(path);
    };

    const decorateOperation = (opblock) => {
      if (!opblock || opblock.querySelector(buttonSelector)) {
        return;
      }

      const summary = opblock.querySelector(".opblock-summary");
      if (!summary) {
        return;
      }

      const button = document.createElement("button");
      button.type = "button";
      button.className = "btn " + BUTTON_CLASS;
      button.textContent = DEFAULT_TEXT;
      button.setAttribute("aria-label", "复制当前接口地址");
      button.setAttribute("title", "复制请求方法和完整地址");
      summary.appendChild(button);
    };

    const decorateAllOperations = () => {
      document.querySelectorAll(".swagger-ui .opblock").forEach((opblock) => {
        decorateOperation(opblock);
      });
    };

    const handleCopyClick = async (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }

      const button = target.closest(buttonSelector);
      if (!button) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const opblock = button.closest(".opblock");
      if (!opblock) {
        return;
      }

      const textToCopy = getOperationCopyText(opblock);
      if (!textToCopy) {
        setButtonState(button, ERROR_TEXT, ERROR_CLASS);
        return;
      }

      try {
        await copyText(textToCopy);
        setButtonState(button, COPIED_TEXT, COPIED_CLASS);
      } catch (error) {
        console.error(error);
        setButtonState(button, ERROR_TEXT, ERROR_CLASS);
      }
    };

    const bootstrapCopyButtons = () => {
      const swaggerRoot = document.getElementById("swagger-ui");
      if (!swaggerRoot) {
        window.setTimeout(bootstrapCopyButtons, 200);
        return;
      }

      decorateAllOperations();
      swaggerRoot.addEventListener("click", handleCopyClick);

      const observer = new MutationObserver(() => {
        window.requestAnimationFrame(decorateAllOperations);
      });

      observer.observe(swaggerRoot, {
        childList: true,
        subtree: true
      });
    };

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", bootstrapCopyButtons, {
        once: true
      });
    } else {
      bootstrapCopyButtons();
    }
  })();
`;

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
  const normalizedApiPrefix = `/${apiPrefix.replace(/^\/+|\/+$/g, "")}`;
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

  const swaggerBuilder = new DocumentBuilder()
    .setTitle("智诊康养前后端联调 API 文档")
    .setDescription(`
## 前端联调入口

- 当前 Swagger 同时支持本地和远端访问。
- 远端示例：\`http://server.mctown.online:8190/api/v1/docs\`
- 本地示例：\`http://localhost:8190/api/v1/docs\`
- \`Try it out\` 会自动跟随你当前打开的 Swagger 页面的域名和端口，不再写死远端地址。
- 推荐先在 Swagger 页面完成测试，再回到前端页面接真实接口。

## 模块说明

- \`/app/*\`：用户端接口，给 \`apps/user-web\` 使用。
- \`/admin/*\`：后台接口，给 \`apps/admin-web\` 使用。
- \`/app/ai/*\`：用户端 AI 增强接口，优先作为增强能力联调。
- \`/internal/*\`：内部接口，不面向普通前端页面直接调用。

## 第一次使用 Swagger 的顺序

1. 先执行 \`GET /system/health\`，确认服务返回 \`code = 0\`。
2. 用户端联调先执行 \`POST /app/auth/login/password\`。
3. 后台端联调先执行 \`POST /admin/auth/login/password\`。
4. 从登录返回里复制 \`data.accessToken\`。
5. 点击右上角 \`Authorize\`，输入：\`Bearer 复制出来的 accessToken\`。
6. 再去测试需要登录态的接口。

## Token 说明

- 文档里提到的 \`APP_TOKEN\`，本质上就是用户端登录接口返回的 \`data.accessToken\`。
- 文档里提到的 \`ADMIN_TOKEN\`，本质上就是后台登录接口返回的 \`data.accessToken\`。
- \`Authorize\` 里不要填写尖括号，不要只填 token，必须保留 \`Bearer\` 和后面的空格。
- Swagger 当前只维护一个全局 Bearer Token。切换到后台接口测试时，请把用户端 token 替换为后台 token。

## 联调测试账号

- 家属账号：\`13900139000 / 123456\`
- 长者账号：\`13800138000 / 123456\`
- 后台账号：\`13600136000 / 123456\`

## 返回结构速记

- 成功时重点看：\`code\`、\`message\`、\`requestId\`、\`data\`
- 列表一般在 \`data.list\`
- 详情一般在 \`data\`
- 新增动作通常会返回新的主键，如 \`orderId\`、\`paymentId\`、\`reportId\`
    `)
    .setVersion("0.1.0")
    .addServer(normalizedApiPrefix, "当前访问环境 API 前缀")
    .addBearerAuth(
      {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description:
          "请填写 Bearer accessToken。示例：Bearer eyJhbGciOi...。APP_TOKEN / ADMIN_TOKEN 都来自登录接口返回的 data.accessToken。"
      },
      "bearer"
    );

  for (const tag of SwaggerTagDefinitions) {
    swaggerBuilder.addTag(tag.name, tag.description);
  }

  const swaggerConfig = swaggerBuilder.build();

  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig, {
    ignoreGlobalPrefix: true
  });
  enhanceSwaggerDocument(swaggerDocument);

  SwaggerModule.setup(`${apiPrefix}/docs`, app, swaggerDocument, {
    jsonDocumentUrl: `${apiPrefix}/docs/json`,
    customSiteTitle: "智诊康养前后端联调 API 文档",
    customCss: `
      body {
        background: linear-gradient(180deg, #f1f5f9 0, #ffffff 180px);
      }
      .swagger-ui {
        padding: 18px 28px 48px;
      }
      .swagger-ui .topbar {
        background: linear-gradient(90deg, #0f766e, #155e75);
        margin: 0 4px 18px;
        border-radius: 0 0 18px 18px;
      }
      .swagger-ui .wrapper {
        max-width: min(1680px, 100%);
        padding: 0 16px 48px;
      }
      .swagger-ui .information-container {
        padding-bottom: 8px;
      }
      .swagger-ui .scheme-container {
        background: #fff7ed;
        border: 1px solid #fdba74;
        box-shadow: none;
        position: sticky;
        top: 12px;
        z-index: 10;
        border-radius: 14px;
      }
      .swagger-ui .opblock-tag {
        font-size: 16px;
        font-weight: 700;
      }
      .swagger-ui .opblock-tag small {
        display: block;
        margin-top: 4px;
        color: #475569;
      }
      .swagger-ui .opblock {
        margin-bottom: 12px;
      }
      .swagger-ui .opblock .opblock-summary {
        column-gap: 12px;
      }
      .swagger-ui .opblock .opblock-summary-path {
        max-width: none;
      }
      .swagger-ui .opblock .opblock-summary-description {
        white-space: normal;
      }
      .swagger-ui .opblock-body {
        overflow-x: auto;
      }
      .swagger-ui pre,
      .swagger-ui .highlight-code,
      .swagger-ui .microlight {
        max-height: 360px;
        overflow: auto;
      }
      .swagger-ui textarea {
        min-height: 180px;
      }
      .swagger-ui .model-box,
      .swagger-ui .responses-inner {
        overflow-x: auto;
      }
      .swagger-ui .parameters-col_description,
      .swagger-ui .response-col_description {
        min-width: 360px;
      }
      .swagger-ui .auth-wrapper .authorize {
        border-color: #0f766e;
        color: #0f766e;
      }
      .swagger-ui .btn.execute {
        background-color: #0f766e;
        border-color: #0f766e;
      }
      .swagger-ui .ihc-copy-api-button {
        align-self: center;
        flex-shrink: 0;
        margin: 6px 8px 6px 0;
        min-width: 88px;
        border-color: #0f766e;
        color: #0f766e;
        background: #ffffff;
      }
      .swagger-ui .ihc-copy-api-button:hover,
      .swagger-ui .ihc-copy-api-button:focus-visible {
        border-color: #115e59;
        color: #115e59;
        background: #f0fdfa;
      }
      .swagger-ui .ihc-copy-api-button.is-copied {
        border-color: #0f766e;
        background: #0f766e;
        color: #ffffff;
      }
      .swagger-ui .ihc-copy-api-button.is-error {
        border-color: #dc2626;
        color: #dc2626;
      }
      @media (max-width: 768px) {
        .swagger-ui {
          padding: 12px 12px 32px;
        }
        .swagger-ui .topbar {
          margin: 0 0 12px;
          border-radius: 0 0 14px 14px;
        }
        .swagger-ui .wrapper {
          padding: 0 0 32px;
        }
        .swagger-ui .ihc-copy-api-button {
          min-width: 76px;
          margin-right: 4px;
        }
      }
    `,
    customJsStr: swaggerCopyApiButtonScript,
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
      docExpansion: "none",
      defaultModelsExpandDepth: -1,
      deepLinking: true,
      tagsSorter: swaggerTagsSorter,
      operationsSorter: swaggerOperationsSorter
    }
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
