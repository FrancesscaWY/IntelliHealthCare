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

const swaggerGithubIssuesUrl = "https://github.com/FrancesscaWY/IntelliHealthCare/issues";
const swaggerGithubNewIssueUrl = `${swaggerGithubIssuesUrl}/new`;
const swaggerFeedbackTemplate = [
  "【问题类型】接口错误 / 字段缺失 / 权限异常 / 页面显示异常",
  "【接口路径】GET /api/v1/...",
  "【请求参数】请粘贴 Swagger 中的 query、path、body 或 headers",
  "【期望结果】请描述预期返回的数据或页面行为",
  "【实际结果】请粘贴返回体、报错信息或异常现象",
  "【影响范围】用户端 / 后台端 / Swagger 页面",
  "【联调环境】server.mctown.online:8190",
  "【问题页面】{{SWAGGER_URL}}",
  "【截图附件】如有请附上"
].join("\n");

const swaggerDescription = [
  "前后端联调说明已通过页面自定义面板展示。",
  "",
  "后台端主链路文档摘要已挂载到当前 Swagger 首页。",
  "",
  "如果字段、权限或返回结构有问题，可使用右上角 `反馈 Issue`。"
].join("\n");

const swaggerInfoPanelHtml = String.raw`
<div class="ihc-doc-grid">
  <section class="ihc-doc-card">
    <h3>联调入口</h3>
    <ul>
      <li>统一从域名入口进入 Swagger。</li>
      <li>文档地址：<code>http://server.mctown.online:8190/api/v1/docs</code></li>
      <li><code>Try it out</code> 会跟随当前页面的域名和端口。</li>
      <li>API Base URL：http://server.mctown.online:8190/api/v1</li>
    </ul>
  </section>
  <section class="ihc-doc-card">
    <h3>模块说明</h3>
    <ul>
      <li><code>/app/*</code>：用户端接口，对应 <code>apps/user-web</code></li>
      <li><code>/admin/*</code>：后台接口，对应 <code>apps/admin-web</code></li>
      <li><code>/app/ai/*</code>：用户端 AI 增强接口</li>
      <li><code>/internal/*</code>：内部治理接口，不面向普通前端页面</li>
    </ul>
  </section>
  <section class="ihc-doc-card">
    <h3>首次联调顺序</h3>
    <ol>
      <li>先执行 <code>GET /system/health</code> 确认服务可用。</li>
      <li>用户端先测 <code>POST /app/auth/login/password</code>。</li>
      <li>后台端先测 <code>POST /admin/auth/login/password</code>。</li>
      <li>复制登录返回中的 <code>data.accessToken</code>。</li>
      <li>在右上角 <code>Authorize</code> 中填写 <code>Bearer accessToken</code>。</li>
    </ol>
  </section>
  <section class="ihc-doc-card">
    <h3>Token 与返回结构</h3>
    <ul>
      <li><code>APP_TOKEN</code> / <code>ADMIN_TOKEN</code> 都来自登录返回的 <code>data.accessToken</code></li>
      <li><code>Authorize</code> 中必须保留 <code>Bearer</code> 和后面的空格</li>
      <li>注意部分API的调用需要登录产生的<code>TOKEN</code></li>
      <li>成功响应重点看 <code>code</code>、<code>message</code>、<code>requestId</code>、<code>data</code></li>
      <li>列表通常在 <code>data.list</code>，详情通常直接在 <code>data</code></li>
    </ul>
  </section>
  <section class="ihc-doc-card">
    <h3>联调测试账号</h3>
    <ul>
      <li>家属账号：<code>13900139000 / 123456</code></li>
      <li>长者账号：<code>13800138000 / 123456</code></li>
      <li>后台账号：<code>13600136000 / 123456</code></li>
    </ul>
  </section>
  <section class="ihc-doc-card">
    <h3>快速提示</h3>
    <ul>
      <li>支持一键复制当前接口的请求方法和完整 URL。</li>
      <li>切换用户端 / 后台端测试时，记得替换全局 Bearer Token。</li>
    </ul>
  </section>
  <section class="ihc-doc-card">
    <h3>后台端联调地图</h3>
    <ul>
      <li>后台认证：<code>POST /admin/auth/login/password</code>、<code>GET /admin/auth/me</code></li>
      <li>后台工作台：<code>GET /admin/dashboard/overview</code>、<code>GET /admin/elders</code>、<code>GET /admin/work-orders</code></li>
      <li>后台订单调度：<code>GET /admin/orders</code>、<code>GET /admin/orders/:orderId</code>、<code>POST /admin/orders/:orderId/dispatch</code></li>
      <li>后台报告审核：<code>GET /admin/reports</code>、<code>PUT /admin/reports/:reportId/review</code></li>
    </ul>
  </section>
  <section class="ihc-doc-card">
    <h3>后台页面映射</h3>
    <ol>
      <li><code>admin-web/dashboard/overview</code> 对应后台总览接口。</li>
      <li><code>admin-web/elder/member-list</code> 对应长者列表与长者详情接口。</li>
      <li><code>admin-web/dashboard/work-order</code> 对应工单列表与工单状态流转接口。</li>
      <li><code>admin-web/dashboard/order-list</code> 对应订单列表、订单详情与派单接口。</li>
      <li><code>admin-web/elder/report-management</code> 对应报告列表与审核接口。</li>
    </ol>
  </section>
</div>
<section class="ihc-doc-feedback">
  <div class="ihc-doc-feedback-head">
    <div>
      <h3>问题反馈</h3>
      <p>字段缺失、权限异常、返回结构与页面联调不一致时，可直接提交 GitHub Issue。</p>
    </div>
    <div class="ihc-doc-feedback-actions">
      <a class="ihc-doc-link ihc-open-issue-link" href="${swaggerGithubNewIssueUrl}" target="_blank" rel="noreferrer">提交 Issue</a>
      <a class="ihc-doc-link is-secondary" href="${swaggerGithubIssuesUrl}" target="_blank" rel="noreferrer">查看 Issues</a>
      <button class="ihc-doc-link is-secondary ihc-feedback-copy-button" type="button" data-default-label="复制反馈模板">复制模板</button>
    </div>
  </div>
  <pre class="ihc-feedback-template"><code>${swaggerFeedbackTemplate.replace(
    "{{SWAGGER_URL}}",
    "{{当前 Swagger 页面地址}}"
  )}</code></pre>
</section>
`;

const swaggerUiEnhancementScript = String.raw`
  (() => {
    const BUTTON_CLASS = "ihc-copy-api-button";
    const INFO_PANEL_CLASS = "ihc-swagger-intro";
    const ISSUE_LINK_CLASS = "ihc-open-issue-link";
    const ISSUE_BUTTON_CLASS = "ihc-open-issue-button";
    const FEEDBACK_COPY_BUTTON_CLASS = "ihc-feedback-copy-button";
    const COPIED_CLASS = "is-copied";
    const ERROR_CLASS = "is-error";
    const DEFAULT_TEXT = "复制 API";
    const DEFAULT_TEMPLATE_TEXT = "复制模板";
    const COPIED_TEXT = "已复制";
    const ERROR_TEXT = "复制失败";
    const ISSUE_NEW_URL = ${JSON.stringify(swaggerGithubNewIssueUrl)};
    const FEEDBACK_TEMPLATE = ${JSON.stringify(swaggerFeedbackTemplate)};
    const INFO_PANEL_HTML = ${JSON.stringify(swaggerInfoPanelHtml)};

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

    const getDefaultButtonText = (button) =>
      button.getAttribute("data-default-label") || DEFAULT_TEXT;

    const buildFeedbackTemplate = () =>
      FEEDBACK_TEMPLATE.replace("{{SWAGGER_URL}}", window.location.href);

    const buildIssueUrl = () => {
      const issueUrl = new URL(ISSUE_NEW_URL);
      issueUrl.searchParams.set("title", "[Swagger反馈] 请简述问题");
      issueUrl.searchParams.set("body", buildFeedbackTemplate());
      return issueUrl.toString();
    };

    const ensureInfoPanel = () => {
      const info = document.querySelector(".swagger-ui .info");
      if (!info) {
        return;
      }

      const existingPanel = info.querySelector("." + INFO_PANEL_CLASS);
      if (existingPanel) {
        return;
      }

      const description = info.querySelector(".description");
      if (description instanceof HTMLElement) {
        description.style.display = "none";
      }

      const panel = document.createElement("section");
      panel.className = INFO_PANEL_CLASS;
      panel.innerHTML = INFO_PANEL_HTML;
      info.appendChild(panel);
    };

    const resetButtonState = (button) => {
      button.textContent = getDefaultButtonText(button);
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
      button.setAttribute("data-default-label", DEFAULT_TEXT);
      button.setAttribute("aria-label", "复制当前接口地址");
      button.setAttribute("title", "复制请求方法和完整地址");
      summary.appendChild(button);
    };

    const decorateIssueLinks = () => {
      document.querySelectorAll(".swagger-ui ." + ISSUE_LINK_CLASS).forEach((link) => {
        if (!(link instanceof HTMLAnchorElement)) {
          return;
        }

        link.href = buildIssueUrl();

        if (link.dataset.issueBound === "true") {
          return;
        }

        link.dataset.issueBound = "true";
        link.title = "前往 GitHub Issue 反馈问题";
        link.addEventListener("click", () => {
          link.href = buildIssueUrl();
        });
      });
    };

    const decorateTopbarIssueEntry = () => {
      const topbar = document.querySelector(".swagger-ui .topbar");
      if (!topbar) {
        return;
      }

      const topbarWrapper =
        topbar.querySelector(".topbar-wrapper") || topbar.querySelector(".wrapper") || topbar;
      if (!(topbarWrapper instanceof HTMLElement)) {
        return;
      }

      let actions = topbarWrapper.querySelector(".ihc-topbar-actions");
      if (!(actions instanceof HTMLElement)) {
        actions = document.createElement("div");
        actions.className = "ihc-topbar-actions";
        topbarWrapper.appendChild(actions);
      }

      let issueLink = actions.querySelector("." + ISSUE_BUTTON_CLASS);
      if (!(issueLink instanceof HTMLAnchorElement)) {
        issueLink = document.createElement("a");
        issueLink.className = ISSUE_LINK_CLASS + " " + ISSUE_BUTTON_CLASS;
        issueLink.target = "_blank";
        issueLink.rel = "noreferrer";
        issueLink.textContent = "反馈 Issue";
        issueLink.setAttribute("aria-label", "前往 GitHub Issue 页面");
        actions.appendChild(issueLink);
      }

      issueLink.href = buildIssueUrl();

      let templateButton = actions.querySelector("." + FEEDBACK_COPY_BUTTON_CLASS);
      if (!(templateButton instanceof HTMLButtonElement)) {
        templateButton = document.createElement("button");
        templateButton.type = "button";
        templateButton.className = "btn " + FEEDBACK_COPY_BUTTON_CLASS + " ihc-topbar-feedback-copy-button";
        templateButton.textContent = DEFAULT_TEMPLATE_TEXT;
        templateButton.setAttribute("data-default-label", DEFAULT_TEMPLATE_TEXT);
        actions.appendChild(templateButton);
      }

      decorateIssueLinks();
    };

    const decorateFeedbackControls = () => {
      document.querySelectorAll(".swagger-ui ." + FEEDBACK_COPY_BUTTON_CLASS).forEach((button) => {
        if (!(button instanceof HTMLButtonElement)) {
          return;
        }

        if (!button.getAttribute("data-default-label")) {
          const defaultLabel =
            typeof button.textContent === "string" && button.textContent.trim()
              ? button.textContent.trim()
              : DEFAULT_TEMPLATE_TEXT;
          button.setAttribute("data-default-label", defaultLabel);
        }

        button.setAttribute("title", "复制 GitHub issue 反馈模板");
      });
    };

    const updateApiScrollShellHeight = (shell) => {
      const resolvedShell =
        shell instanceof HTMLElement
          ? shell
          : document.querySelector(".swagger-ui .ihc-api-scroll-shell");
      if (!(resolvedShell instanceof HTMLElement)) {
        return;
      }

      const availableHeight = window.innerHeight - resolvedShell.getBoundingClientRect().top - 16;
      resolvedShell.style.maxHeight = Math.max(320, availableHeight) + "px";
    };

    const flattenLegacyApiScrollShells = (host) => {
      if (!(host instanceof HTMLElement)) {
        return;
      }

      Array.from(host.querySelectorAll(".ihc-api-scroll-shell"))
        .reverse()
        .forEach((shell) => {
          const parent = shell.parentNode;
          if (!(shell instanceof HTMLElement) || !(parent instanceof HTMLElement)) {
            return;
          }

          while (shell.firstChild) {
            parent.insertBefore(shell.firstChild, shell);
          }

          parent.removeChild(shell);
        });
    };

    const decorateApiScrollShell = () => {
      const firstTagSection = document.querySelector(".swagger-ui .opblock-tag-section");
      if (!firstTagSection) {
        return;
      }

      const parent = firstTagSection.parentElement;
      if (!(parent instanceof HTMLElement)) {
        return;
      }

      if (parent.classList.contains("ihc-api-scroll-shell")) {
        updateApiScrollShellHeight(parent);
        return;
      }

      flattenLegacyApiScrollShells(parent);
      parent.classList.add("ihc-api-scroll-shell");
      updateApiScrollShellHeight(parent);
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

      const apiButton = target.closest(buttonSelector);
      if (apiButton) {
        event.preventDefault();
        event.stopPropagation();

        const opblock = apiButton.closest(".opblock");
        if (!opblock) {
          return;
        }

        const textToCopy = getOperationCopyText(opblock);
        if (!textToCopy) {
          setButtonState(apiButton, ERROR_TEXT, ERROR_CLASS);
          return;
        }

        try {
          await copyText(textToCopy);
          setButtonState(apiButton, COPIED_TEXT, COPIED_CLASS);
        } catch (error) {
          console.error(error);
          setButtonState(apiButton, ERROR_TEXT, ERROR_CLASS);
        }

        return;
      }

      const feedbackButton = target.closest("." + FEEDBACK_COPY_BUTTON_CLASS);
      if (!feedbackButton) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      try {
        await copyText(buildFeedbackTemplate());
        setButtonState(feedbackButton, COPIED_TEXT, COPIED_CLASS);
      } catch (error) {
        console.error(error);
        setButtonState(feedbackButton, ERROR_TEXT, ERROR_CLASS);
      }
    };

    const bootstrapCopyButtons = () => {
      const swaggerRoot = document.getElementById("swagger-ui");
      if (!swaggerRoot) {
        window.setTimeout(bootstrapCopyButtons, 200);
        return;
      }

      decorateAllOperations();
      ensureInfoPanel();
      decorateTopbarIssueEntry();
      decorateIssueLinks();
      decorateFeedbackControls();
      decorateApiScrollShell();
      swaggerRoot.addEventListener("click", handleCopyClick);

      if (swaggerRoot.dataset.ihcResizeBound !== "true") {
        swaggerRoot.dataset.ihcResizeBound = "true";
        window.addEventListener("resize", () => {
          window.requestAnimationFrame(updateApiScrollShellHeight);
        });
      }

      const observer = new MutationObserver(() => {
        window.requestAnimationFrame(() => {
          decorateAllOperations();
          ensureInfoPanel();
          decorateTopbarIssueEntry();
          decorateIssueLinks();
          decorateFeedbackControls();
          decorateApiScrollShell();
        });
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
    .setDescription(swaggerDescription)
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
        margin: 0;
        background: linear-gradient(180deg, #f1f5f9 0, #ffffff 180px);
      }
      .swagger-ui {
        padding: 12px 16px 28px;
      }
      .swagger-ui .topbar {
        background: linear-gradient(90deg, #0f766e, #155e75);
        margin: 0;
        border-radius: 16px;
        box-shadow: 0 14px 30px rgba(15, 118, 110, 0.18);
      }
      .swagger-ui .topbar .wrapper {
        max-width: min(1680px, 100%);
        padding: 0 18px;
      }
      .swagger-ui .topbar .topbar-wrapper,
      .swagger-ui .topbar .wrapper {
        display: flex;
        align-items: center;
        gap: 16px;
      }
      .swagger-ui .topbar .topbar-wrapper {
        width: 100%;
      }
      .swagger-ui .ihc-topbar-actions {
        margin-left: auto;
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 10px;
      }
      .swagger-ui .ihc-open-issue-button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 36px;
        padding: 0 14px;
        border: 1px solid rgba(255, 255, 255, 0.32);
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.14);
        color: #ffffff;
        font-size: 14px;
        font-weight: 600;
        text-decoration: none;
        white-space: nowrap;
      }
      .swagger-ui .wrapper {
        max-width: min(1680px, 100%);
        padding: 0 16px 24px;
      }
      .swagger-ui .info {
        margin: 0;
      }
      .swagger-ui .info .title {
        margin: 0;
        font-size: 30px;
        line-height: 1.15;
      }
      .swagger-ui .info .base-url {
        margin: 8px 0 0;
      }
      .swagger-ui .info .description {
        display: none;
      }
      .swagger-ui .ihc-swagger-intro {
        margin-top: 12px;
      }
      .swagger-ui .ihc-swagger-intro .ihc-doc-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(280px, 1fr));
        gap: 12px;
      }
      .swagger-ui .ihc-swagger-intro .ihc-doc-card,
      .swagger-ui .ihc-swagger-intro .ihc-doc-feedback {
        border: 1px solid #dbe4ea;
        border-radius: 16px;
        background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
        box-shadow: 0 12px 24px rgba(15, 23, 42, 0.05);
      }
      .swagger-ui .ihc-swagger-intro .ihc-doc-card {
        padding: 14px 16px;
      }
      .swagger-ui .ihc-swagger-intro .ihc-doc-card h3,
      .swagger-ui .ihc-swagger-intro .ihc-doc-feedback h3 {
        margin: 0;
        color: #0f172a;
        font-size: 16px;
        font-weight: 700;
      }
      .swagger-ui .ihc-swagger-intro .ihc-doc-card ul,
      .swagger-ui .ihc-swagger-intro .ihc-doc-card ol {
        margin: 10px 0 0;
        padding-left: 20px;
        color: #334155;
      }
      .swagger-ui .ihc-swagger-intro .ihc-doc-card li,
      .swagger-ui .ihc-swagger-intro .ihc-doc-feedback p {
        margin: 0 0 6px;
        line-height: 1.55;
      }
      .swagger-ui .ihc-swagger-intro .ihc-doc-card li:last-child,
      .swagger-ui .ihc-swagger-intro .ihc-doc-feedback p:last-child {
        margin-bottom: 0;
      }
      .swagger-ui .ihc-swagger-intro .ihc-doc-feedback {
        margin-top: 12px;
        padding: 14px 16px 16px;
      }
      .swagger-ui .ihc-swagger-intro .ihc-doc-feedback-head {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 14px;
      }
      .swagger-ui .ihc-swagger-intro .ihc-doc-feedback-actions {
        display: flex;
        flex-wrap: wrap;
        justify-content: flex-end;
        gap: 8px;
      }
      .swagger-ui .ihc-doc-link {
        appearance: none;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 38px;
        padding: 0 14px;
        border: 1px solid #0f766e;
        border-radius: 999px;
        background: #0f766e;
        color: #ffffff;
        font-size: 14px;
        font-weight: 600;
        line-height: 1;
        text-decoration: none;
        white-space: nowrap;
        cursor: pointer;
        font-family: inherit;
      }
      .swagger-ui .ihc-doc-link.is-secondary {
        background: #ffffff;
        border-color: #99f6e4;
        color: #0f766e;
      }
      .swagger-ui .ihc-doc-link:hover,
      .swagger-ui .ihc-doc-link:focus-visible,
      .swagger-ui .ihc-open-issue-button:hover,
      .swagger-ui .ihc-open-issue-button:focus-visible {
        text-decoration: none;
        filter: brightness(0.98);
      }
      .swagger-ui .ihc-topbar-feedback-copy-button {
        min-height: 36px;
        padding: 0 14px;
        border-radius: 999px;
        border-color: rgba(255, 255, 255, 0.32);
        background: rgba(255, 255, 255, 0.14);
        color: #ffffff;
      }
      .swagger-ui .ihc-swagger-intro .ihc-feedback-template {
        margin: 14px 0 0;
        padding: 12px 14px;
        overflow: auto;
        border-radius: 12px;
        background: #0f172a;
        color: #e2e8f0;
        font-size: 12px;
        line-height: 1.55;
      }
      .swagger-ui .ihc-swagger-intro .ihc-feedback-template code {
        color: inherit;
        white-space: pre-wrap;
      }
      .swagger-ui .scheme-container {
        padding: 12px 16px;
        margin-top: 12px;
        background: #fff7ed;
        border: 1px solid #fdba74;
        box-shadow: none;
        position: sticky;
        top: 12px;
        z-index: 5;
        border-radius: 14px;
      }
      .swagger-ui .ihc-api-scroll-shell {
        margin-top: 12px;
        padding: 8px 16px 22px;
        overflow-y: auto;
        overflow-x: hidden;
        scrollbar-gutter: stable;
        overscroll-behavior: contain;
        border: 1px solid #dbe4ea;
        border-radius: 18px;
        background: rgba(255, 255, 255, 0.94);
        box-shadow: 0 18px 36px rgba(15, 23, 42, 0.06);
      }
      .swagger-ui .ihc-api-scroll-shell::-webkit-scrollbar {
        width: 10px;
      }
      .swagger-ui .ihc-api-scroll-shell::-webkit-scrollbar-thumb {
        border: 2px solid transparent;
        border-radius: 999px;
        background: #cbd5e1;
        background-clip: padding-box;
      }
      .swagger-ui .opblock-tag-section {
        margin-bottom: 10px;
      }
      .swagger-ui .opblock-tag {
        position: sticky;
        top: 0;
        z-index: 2;
        margin: 0 0 10px;
        padding: 12px 0 10px;
        background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(255, 255, 255, 0.92));
        backdrop-filter: blur(8px);
        font-size: 15px;
        font-weight: 700;
      }
      .swagger-ui .opblock-tag small {
        display: block;
        margin-top: 4px;
        color: #475569;
      }
      .swagger-ui .opblock {
        margin-bottom: 10px;
      }
      .swagger-ui .opblock .opblock-summary {
        column-gap: 12px;
        padding-right: 8px;
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
        max-height: 320px;
        overflow: auto;
      }
      .swagger-ui textarea {
        min-height: 160px;
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
      .swagger-ui .ihc-copy-api-button,
      .swagger-ui .ihc-feedback-copy-button {
        align-self: center;
        flex-shrink: 0;
        margin: 6px 8px 6px 0;
        min-width: 88px;
        border-color: #0f766e;
        color: #0f766e;
        background: #ffffff;
      }
      .swagger-ui .ihc-copy-api-button:hover,
      .swagger-ui .ihc-copy-api-button:focus-visible,
      .swagger-ui .ihc-feedback-copy-button:hover,
      .swagger-ui .ihc-feedback-copy-button:focus-visible {
        border-color: #115e59;
        color: #115e59;
        background: #f0fdfa;
      }
      .swagger-ui .ihc-copy-api-button.is-copied,
      .swagger-ui .ihc-feedback-copy-button.is-copied {
        border-color: #0f766e;
        background: #0f766e;
        color: #ffffff;
      }
      .swagger-ui .ihc-copy-api-button.is-error,
      .swagger-ui .ihc-feedback-copy-button.is-error {
        border-color: #dc2626;
        color: #dc2626;
      }
      .swagger-ui .ihc-topbar-actions .ihc-feedback-copy-button {
        min-height: 36px;
        margin: 0;
        border-color: rgba(255, 255, 255, 0.32);
        background: rgba(255, 255, 255, 0.14);
        color: #ffffff;
      }
      .swagger-ui .ihc-topbar-actions .ihc-feedback-copy-button:hover,
      .swagger-ui .ihc-topbar-actions .ihc-feedback-copy-button:focus-visible {
        border-color: rgba(255, 255, 255, 0.44);
        background: rgba(255, 255, 255, 0.2);
        color: #ffffff;
      }
      .swagger-ui .ihc-topbar-actions .ihc-feedback-copy-button.is-copied {
        border-color: rgba(255, 255, 255, 0.32);
        background: rgba(255, 255, 255, 0.26);
        color: #ffffff;
      }
      .swagger-ui .ihc-topbar-actions .ihc-feedback-copy-button.is-error {
        border-color: #fecaca;
        color: #ffffff;
      }
      .swagger-ui .models {
        margin-top: 10px;
      }
      @media (max-width: 768px) {
        .swagger-ui {
          padding: 8px 8px 14px;
        }
        .swagger-ui .topbar {
          border-radius: 14px;
        }
        .swagger-ui .topbar .wrapper {
          padding: 0 12px;
        }
        .swagger-ui .ihc-topbar-actions {
          width: 100%;
          margin-left: auto;
          padding-bottom: 12px;
          justify-content: flex-end;
        }
        .swagger-ui .info .title {
          font-size: 24px;
        }
        .swagger-ui .ihc-swagger-intro .ihc-doc-grid {
          grid-template-columns: 1fr;
        }
        .swagger-ui .ihc-swagger-intro .ihc-doc-feedback-head {
          flex-direction: column;
        }
        .swagger-ui .ihc-swagger-intro .ihc-doc-feedback-actions {
          width: 100%;
          justify-content: flex-start;
        }
        .swagger-ui .ihc-api-scroll-shell {
          padding: 8px 10px 18px;
        }
        .swagger-ui .ihc-copy-api-button,
        .swagger-ui .ihc-feedback-copy-button {
          min-width: 76px;
          margin-right: 4px;
        }
      }
    `,
    customJsStr: swaggerUiEnhancementScript,
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
