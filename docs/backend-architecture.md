# 智诊康养后端开发文档

更新时间：`2026-04-22`

## 1. 文档目标与适用范围

本文档基于当前仓库真实实现编写，覆盖范围以以下代码为准：

- `apps/backend/src`
- `apps/backend/prisma/schema.prisma`
- `apps/backend/scripts/build-rag-db.ts`
- `apps/backend/scripts/eval-rag.ts`
- `apps/backend/src/modules/agents`

本文档的目标有三点：

1. 说明当前后端已经落地的技术方案和工程边界。
2. 说明多智能体框架、RAG 数据库和质量治理闭环是如何在项目中实现的。
3. 为后续开发、联调、测试、扩展和运维提供统一参考口径。

说明原则：

- 只写当前代码已经存在或可以直接从代码推导出的能力。
- 对于“已实现”“部分实现”“未实现”明确区分，不混用产品蓝图和现状。
- 优先描述项目内真实路径、真实脚本、真实模型和真实接口。

---

## 2. 后端定位与总体架构

### 2.1 系统定位

当前后端是一个放在 Monorepo 中的 `NestJS` 模块化单体，不是微服务集群。它统一承接四类能力：

- 用户端业务 API：`/api/v1/app/*`
- 后台业务 API：`/api/v1/admin/*`
- 系统检查与公开接口：`/api/v1/system/*`、`/api/v1/app/agreements/*`
- 内部智能体运行时与 RAG 管理接口：`/api/v1/internal/agents/*`

这套设计的核心原因是：

- 健康档案、健康指标、服务、订单、报告、消息、Agent 之间数据耦合强。
- 当前项目更需要一套稳定业务底座，而不是过早拆散成多个服务。
- AI 能力在本项目中属于业务增强层，必须受业务权限、审计和治理约束，适合放在统一后端里实现。

### 2.2 总体架构图

```text
apps/user-web / apps/admin-web / internal jobs
                |
                v
         NestJS Controllers
                |
                v
         Domain Modules
                |
      +---------+---------+-----------------+
      |                   |                 |
      v                   v                 v
  Prisma/PostgreSQL   Redis/BullMQ      MinIO
      |                   |
      +---------+---------+
                |
                v
       Hermes Agents Runtime
                |
      +---------+---------+-------------------+
      |                   |                   |
      v                   v                   v
  Agent Registry      LLM Gateway       Embedding Gateway
      |                   |                   |
      +---------+---------+-------------------+
                |
                v
           RAG Knowledge
```

### 2.3 API 面划分

| 作用域 | 前缀 | 使用对象 | 说明 |
| --- | --- | --- | --- |
| `system` | `/api/v1/system` | 运维、联调 | 健康检查、架构摘要 |
| `public` | `/api/v1/app/agreements` | 用户端登录前页面 | 隐私协议等公开内容 |
| `app` | `/api/v1/app` | 长者、家属 | 用户端业务接口和 AI 助手接口 |
| `admin` | `/api/v1/admin` | 后台运营、医生、护理、机构人员 | 后台业务接口 |
| `internal` | `/api/v1/internal/agents` | 内部系统、后台管理链路 | 智能体任务、复核、审计、RAG 管理 |

---

## 3. 后端使用到的技术

### 3.1 技术栈总览

| 层级 | 当前选型 | 说明 |
| --- | --- | --- |
| 运行时 | `Node.js 20` | `apps/backend/package.json` 要求 `node >= 20` |
| 语言 | `TypeScript` | 与前端 Monorepo 统一 |
| 框架 | `NestJS` | 控制器、守卫、拦截器、过滤器、模块化组织 |
| 配置校验 | `@nestjs/config + zod` | `env.schema.ts` 负责环境变量归一化与校验 |
| ORM | `Prisma` | 统一访问 PostgreSQL |
| 数据库 | `PostgreSQL` | 核心业务数据、RAG 元数据、Agent 任务数据 |
| 开发数据库回退 | `PGlite + PGLiteSocketServer` | 开发时 PostgreSQL 不可达会自动回退到嵌入式数据库 |
| 缓存与队列 | `ioredis + BullMQ` | Agent 队列、Redis 健康检查、异步执行 |
| 对象存储 | `MinIO` | 文件上传、对象 URL、Bucket 初始化 |
| API 文档 | `Swagger / OpenAPI` | `main.ts` 中统一挂载 `/api/v1/docs` |
| 参数校验 | `ValidationPipe + class-validator + class-transformer` | 全局白名单、转换、非白名单字段拦截 |
| AI 输出校验 | `zod` | Agent 输入输出、工具调用、结构化输出约束 |
| AI 网关 | 自建 `LlmGateway`、`EmbeddingGateway` | DeepSeek、OpenRouter、OpenAI-compatible 接入 |

### 3.2 关键技术决策

#### 3.2.1 模块化单体而非微服务

当前采用模块化单体，是因为：

- 订单、报告、档案、风险提醒、智能体之间需要高频共享上下文。
- 当前阶段更强调联调效率、接口一致性、统一权限和治理链路。
- Hermes 智能体运行时需要复用业务模型、权限和审计，不适合绕过业务层独立部署。

#### 3.2.2 Prisma + PostgreSQL

当前模型同时承接结构化交易数据和半结构化 AI 数据：

- 强结构化部分：用户、角色、订单、工单、支付、报告、会话、通知。
- 半结构化部分：健康档案、报告摘要、服务知识片段、Agent 输出、RAG accessPolicy、RAG metadata。

因此选用了：

- `PostgreSQL` 承载事务与关系模型。
- `JSON / JSONB` 字段承接迭代期结构尚未完全稳定的数据。
- `Prisma` 提供统一访问层与类型安全。

#### 3.2.3 Redis + BullMQ

Redis 当前并不只是缓存组件，还承担：

- Agent 任务队列连接基础
- BullMQ Worker 执行底座
- 系统健康检查中的 Redis 可达性检测

BullMQ 当前主要用于：

- `AgentTask` 的异步调度
- 多次重试与指数退避
- Worker 并发控制

#### 3.2.4 MinIO

MinIO 当前承担：

- 文件上传预签名 URL
- 文件对象存在性校验
- 文件对外访问 URL 生成
- Bucket 自动初始化

---

## 4. 工程结构与模块划分

### 4.1 后端目录结构

```text
apps/backend/
├── .env.example
├── package.json
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── scripts/
│   ├── build-rag-db.ts
│   ├── eval-rag.ts
│   └── evals/
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── common/
│   ├── infra/
│   └── modules/
└── test/
```

### 4.2 `common` 层

`common` 主要放全局横切能力：

- `config`：环境变量 schema 与运行时配置
- `auth`：`JwtAuthGuard`、`RolesGuard`、`InternalAccessGuard`、`CurrentUser`
- `http`：成功响应包装、异常过滤、错误码映射
- `middleware`：请求级 `requestId` 注入
- `utils`：时间序列化等通用工具

### 4.3 `infra` 层

| 目录 | 说明 |
| --- | --- |
| `infra/prisma` | `PrismaService` 与数据库访问基础 |
| `infra/queue` | `QueueService`，封装 Redis 连接与 BullMQ 连接创建 |
| `infra/storage` | `StorageService`，封装 MinIO/S3-compatible 能力 |

### 4.4 业务模块

当前 `AppModule` 已挂载以下模块：

| 模块 | 主要前缀 | 职责 |
| --- | --- | --- |
| `system` | `/system` | 健康检查、架构信息 |
| `auth` | `/app/auth`、`/admin/auth` | 登录、刷新、退出、公开协议 |
| `users` | `/app/users`、`/app/home`、`/app/locations`、`/app/search` | 用户中心、首页、定位、搜索 |
| `family` | `/app/family` | 家庭绑定、地址维护 |
| `health-archive` | `/app/health/archive` | 健康档案摘要、基础信息、病史与长期记忆 |
| `health-metrics` | `/app/health` | 健康指标、设备、用药 |
| `health-lifestyle` | `/app/health` | 膳食与自测 |
| `service-catalog` | `/app/services` | 服务分类、列表、详情 |
| `orders` | `/app/orders`、`/admin/orders`、`/admin/work-orders` | 预约、订单、工单、售后、后台派单 |
| `payments` | `/app/payments` | 支付单创建、状态确认 |
| `reports` | `/app/health/reports/checkups`、`/admin/reports` | 报告上传、查询、后台审核 |
| `files` | `/app/files` | 文件上传与元数据 |
| `messaging` | `/app/messages`、`/app/conversations` | 通知、会话、医生咨询 |
| `community` | `/app/community` | 社区帖子、活动、互动 |
| `content` | `/app/content` | 资讯、讲堂、疾病知识 |
| `agents` | `/app/ai`、`/internal/agents` | AI 助手、内部 Agent 运行时、RAG 管理 |
| `admin` | `/admin` | 后台工作台总览、长者详情、工单列表 |

---

## 5. 基础设施与运行机制

### 5.1 应用启动

应用入口在 `src/main.ts`，启动过程包括：

1. 执行 `bootstrapDatabase`。
2. 创建 Nest 应用。
3. 读取配置并设置 CORS、全局前缀、全局校验器、异常过滤器、拦截器。
4. 生成 Swagger 文档。
5. 监听端口并注册优雅退出逻辑。

### 5.2 开发环境数据库自动回退

`bootstrapDatabase` 是当前后端一个重要特性：

- 开发环境下如果 `DATABASE_URL` 指向的 PostgreSQL 不可达，会自动启动嵌入式 PostgreSQL。
- 自动执行 Prisma migration。
- 可按配置自动执行 `seed.ts` 导入演示数据。

对应环境变量：

- `DATABASE_DEV_FALLBACK_ENABLED`
- `DATABASE_DEV_FALLBACK_AUTO_SEED`
- `DATABASE_DEV_FALLBACK_HOST`
- `DATABASE_DEV_FALLBACK_DIR`
- `DATABASE_DEV_FALLBACK_MAX_CONNECTIONS`

这保证了本地联调时，哪怕没有手动启动 PostgreSQL，也能先把业务 API 跑起来。

### 5.3 配置管理

当前环境变量由 `src/common/config/env.schema.ts` 统一定义。主要分为 6 组：

| 分组 | 关键变量 |
| --- | --- |
| 基础运行 | `NODE_ENV`、`HOST`、`PORT`、`APP_NAME`、`API_PREFIX`、`CORS_ORIGINS` |
| 数据库 | `DATABASE_URL`、`DATABASE_DEV_FALLBACK_*` |
| Redis / JWT | `REDIS_URL`、`JWT_ACCESS_SECRET`、`JWT_REFRESH_SECRET`、`JWT_*_TTL` |
| 内部接口 | `INTERNAL_API_ALLOWED_CIDRS`、`INTERNAL_API_TRUST_PROXY_HEADERS`、`INTERNAL_API_SHARED_SECRET` |
| 存储 | `MINIO_*` |
| AI / RAG | `AGENT_LLM_*`、`AGENT_EMBEDDING_*`、`AGENT_MAX_RETRIES`、`AGENT_WORKER_CONCURRENCY` |

额外特性：

- 如果 `AGENT_LLM_API_KEY` 为空但系统环境里提供了 `DEEPSEEK_API_KEY`，会自动回退使用后者。
- 如果未显式配置 embedding provider，会按 LLM provider 推导，无法推导时回退到 `mock`。

### 5.4 通用请求链路

#### 5.4.1 请求 ID

`RequestContextMiddleware` 会在每个请求上挂载 `requestId`：

- 若请求头中带 `x-request-id`，优先沿用。
- 否则自动生成新的请求 ID。
- 响应体和响应头会带回同一个 ID，便于联调和审计。

#### 5.4.2 统一成功响应

所有成功响应都经由 `ApiResponseInterceptor` 包装为：

```json
{
  "code": 0,
  "message": "ok",
  "requestId": "req_xxx",
  "data": {}
}
```

#### 5.4.3 统一错误响应

`AllExceptionsFilter` 会把异常映射为统一错误结构，并将常见 HTTP 状态码映射为业务码：

| HTTP 状态码 | 业务码 |
| --- | --- |
| `400` | `40001` |
| `401` | `40003` |
| `403` | `40004` |
| `404` | `40400` |
| `409` | `40900` |
| `422` | `42200` |
| `500` | `50000` |

#### 5.4.4 参数校验

全局 `ValidationPipe` 已开启：

- `whitelist: true`
- `transform: true`
- `forbidNonWhitelisted: true`

这意味着：

- DTO 未声明的字段会直接报错。
- 查询参数、路由参数和请求体会自动做基础转换。

### 5.5 Swagger

Swagger 已挂载：

- UI：`/api/v1/docs`
- JSON：`/api/v1/docs/json`

当前 Swagger 文档已内置：

- 用户端与后台端 token 使用说明
- 测试账号说明
- 常用联调顺序说明
- Bearer Token 全局鉴权配置

### 5.6 存储层

`StorageService` 当前实现了：

- Bucket 自动检查与创建
- 预签名上传 URL 生成
- 文件对象存在性校验
- 对外访问 URL 组装

涉及配置：

- `MINIO_ENDPOINT`
- `MINIO_PORT`
- `MINIO_USE_SSL`
- `MINIO_PUBLIC_ENDPOINT`
- `MINIO_PUBLIC_PORT`
- `MINIO_PUBLIC_USE_SSL`
- `MINIO_BUCKET`

### 5.7 队列层

`QueueService` 统一封装 Redis 连接，并为 BullMQ 提供：

- 主连接
- duplicate client
- `ping()` 健康检查

BullMQ 当前主要由 `agents` 模块使用，负责：

- Agent 任务入队
- Worker 并发执行
- 重试与退避

---

## 6. 认证、权限与访问控制

### 6.1 JWT 鉴权

当前业务接口大多通过 `JwtAuthGuard` 保护。Guard 会：

- 从 `Authorization: Bearer <token>` 读取 access token
- 用 `JWT_ACCESS_SECRET` 校验 token
- 将 `user.id`、`phone`、`type`、`roles`、`scope`、`realName` 注入 `request.user`

当前 `scope` 分两类：

- `app`
- `admin`

### 6.2 后台角色控制

`RolesGuard` 与 `@Roles()` 共同控制后台接口。当前后台常用角色包括：

- `PLATFORM_ADMIN`
- `ORG_MANAGER`
- `DOCTOR`
- `CAREGIVER`
- `THERAPIST`
- `CUSTOMER_SERVICE`

### 6.3 内部接口控制

`InternalAccessGuard` 用于 `/internal/agents/*`：

- 必须是 `admin` scope token
- 必须命中 `INTERNAL_API_ALLOWED_CIDRS`
- 若配置了 `INTERNAL_API_SHARED_SECRET`，还需要 `X-Internal-Token`
- 反向代理场景下可通过 `INTERNAL_API_TRUST_PROXY_HEADERS=true` 信任转发头

这确保内部智能体接口不会被普通前端或外部来源直接调用。

### 6.4 登录实现

`AuthService` 当前支持：

- 密码登录
- 短信验证码登录
- 第三方登录模拟
- refresh token 刷新
- 忘记密码验证码校验与密码重置
- 后台账号与用户账号的 scope 隔离

开发环境下短信验证码会在返回体中给出 `debugCode`，便于联调。

---

## 7. 数据模型与 Prisma Schema

### 7.1 数据模型分层

当前 `schema.prisma` 中的模型可以分为 7 组：

| 分组 | 代表模型 |
| --- | --- |
| 用户与权限 | `User`、`Role`、`UserRole`、`FamilyBinding`、`Address` |
| 健康与照护 | `HealthArchive`、`Device`、`HealthMetricRecord`、`HealthAlert`、`Medication`、`DietRecipe`、`DietRecord`、`SelfTest*` |
| 机构与服务 | `Institution`、`Staff`、`StaffSchedule`、`ServiceItem` |
| 订单与支付 | `Order`、`OrderTimeline`、`WorkOrder`、`PaymentOrder`、`RefundOrder`、`AfterSaleRequest`、`OrderReview` |
| 报告与文件 | `Report`、`FileAsset` |
| 消息、内容与社区 | `Conversation*`、`Notification*`、`Article`、`Lecture`、`DiseaseKnowledge`、`Community*`、`Activity*` |
| AI / RAG / 治理 | `AgentTask`、`AgentHumanReview`、`AgentAuditLog`、`RagKnowledgeBase`、`RagDocument`、`RagChunk`、`RagIngestionRun`、`RagEvalRun`、`RagEvalCaseResult` |

### 7.2 关键业务模型说明

#### 7.2.1 用户与家庭

- `User`：统一承接长者、家属、后台管理员、机构管理者、员工账号。
- `FamilyBinding`：记录家属与长者之间的绑定和授权关系。
- `Address`：地址簿与下单收货/服务地址。

#### 7.2.2 健康数据

- `HealthArchive`：基础档案、病史、风险标签、长期记忆。
- `HealthMetricRecord`：血压、血糖、体重、心率、睡眠等指标记录。
- `HealthAlert`：风险预警与处理状态。
- `Medication` / `MedicationDoseLog`：用药计划与服药记录。
- `DietRecord` / `SelfTestAttempt`：饮食与自测结果。

#### 7.2.3 服务履约

- `ServiceItem`：家政护理、康复理疗、上门体检、养老机构等服务目录。
- `Order`：用户预约订单。
- `WorkOrder`：后台派单后的履约工单。
- `PaymentOrder` / `RefundOrder`：支付与退款。
- `AfterSaleRequest` / `OrderReview`：售后与评价。

#### 7.2.4 会话与内容

- `Conversation` / `ConversationMessage`：医生咨询、客服会话、AI 助手会话。
- `Notification` / `NotificationRecipient`：系统通知、订单通知、健康提醒。
- `Article`、`Lecture`、`DiseaseKnowledge`：内容知识域。
- `CommunityPost`、`Activity`：社区帖子和活动。

### 7.3 JSON 字段的使用原则

当前后端大量使用 JSON 字段，主要用于：

- 快照：`Order.addressSnapshot`、`Order.contactSnapshot`
- 结构化摘要：`Report.summary`
- 健康档案扩展：`HealthArchive.baseProfile`、`medicalHistory`、`longTermMemory`
- AI 输出：`Order.aiSummary`、`AgentTask.result`
- RAG 元数据：`RagKnowledgeBase.sourceConfig`、`refreshPolicy`、`chunkConfig`

这样做的好处是：

- 可以先稳定主表和主流程。
- 对仍在演进中的 AI / RAG / 页面结构保持足够灵活。

---

## 8. 多智能体框架的搭建

### 8.1 模块定位

`apps/backend/src/modules/agents` 是当前项目的 Hermes 受控多智能体运行时宿主，不是开放自治平台。它负责：

- Agent 注册与任务路由
- 任务入库与队列调度
- 工具调用与模型调用
- 结果追踪、人工复核与审计
- App 侧 AI 能力输出
- RAG 检索与评测管理

### 8.2 组成结构

`agents` 模块当前主要由 6 层组成：

| 层级 | 代表组件 | 说明 |
| --- | --- | --- |
| Controller 层 | `AppAgentsController`、`AgentsController` | App AI 接口与内部管理接口 |
| Application 层 | `AppAgentService`、`AgentTaskService`、`AgentDispatchService`、`AgentOrchestratorService`、`AgentGovernanceService`、`RagKnowledgeService` | 任务、编排、治理、RAG 服务 |
| Domain 层 | `AgentRegistry`、`framework-blueprint.ts`、`agent-types.ts` | Agent 定义、蓝图、输入输出 schema |
| Gateway 层 | `LlmGateway`、`EmbeddingGateway` | 大模型和 embedding 统一调用口 |
| Tool 层 | `ReportsTool`、`HealthArchiveTool`、`HealthMetricsTool`、`RagRetrievalTool`、`ServiceCatalogTool` | 受控工具调用 |
| Worker 层 | `AgentTaskProcessor` | BullMQ Worker，负责异步执行 |

### 8.3 当前注册的 9 个核心 Agent

| Agent | 角色 | 主要任务类型 | 风险等级 | 说明 |
| --- | --- | --- | --- | --- |
| `TaskOrchestratorAgent` | 控制层 | `task-orchestration`、`assistant-conversation`、`report-summary`、`dispatch-suggestion` 等 | 低 | 统一路由与编排入口 |
| `AssistantConversationAgent` | 交互层 | `assistant-conversation` | 低 | 用户侧统一助手门面 |
| `HealthManagementAgent` | 领域层 | `report-summary`、`report-interpretation`、`health-summary`、`focus-elder-brief` | 中 | 健康理解与报告解读 |
| `CareCoordinationAgent` | 领域层 | `service-recommendation`、`booking-prefill`、`dispatch-suggestion` | 中 | 服务推荐与服务协同 |
| `RiskOperationsAgent` | 领域层 | `risk-screening`、`alert-triage`、`risk-reminder` | 高 | 风险识别、预警分诊 |
| `DeviceOperationsAgent` | 领域层 | `device-diagnosis`、`device-inspection` | 中 | 设备异常诊断 |
| `ContentActivityOpsAgent` | 领域层 | `content-summary`、`activity-analysis`、`campaign-suggestion` | 低 | 内容与活动运营支持 |
| `OperationsCopilotAgent` | 交互层 | `dashboard-digest`、`shift-summary`、`morning-brief` | 中 | 后台运营 Copilot |
| `SafetyReviewAgent` | 治理层 | `safety-review` | 高 | 统一安全门禁与人工复核判定 |

兼容别名：

- `intent-router`
- `report-summary-agent`
- `service-recommendation-agent`

### 8.4 运行时执行链路

当前 Agent 执行链路如下：

1. 创建 `AgentTask`，状态初始化为 `PENDING`。
2. `AgentDispatchService` 把任务投递到 `agent-task` 队列。
3. `AgentTaskProcessor` 从 BullMQ Worker 拉取任务。
4. `AgentTaskService` 先把状态标记为 `RUNNING`，并写入运行中的 envelope。
5. `AgentOrchestratorService` 解析路由、调用工具、调用 LLM、执行多 Agent 协作。
6. 若成功，结果写回 `AgentTask.result` 并进入治理检查。
7. 若失败，则根据异常类型决定重试或直接失败。

### 8.5 受控多 Agent 协作

当前不是“无限轮自由协作”，而是受控串行协作，已落地的典型模式包括：

- 健康理解链路：
  `TaskOrchestratorAgent -> HealthManagementAgent -> RiskOperationsAgent(按需) -> SafetyReviewAgent`
- 风险运营链路：
  `TaskOrchestratorAgent -> RiskOperationsAgent -> HealthManagementAgent(补背景) -> SafetyReviewAgent`
- 后台 Copilot 链路：
  先汇总 `health / care / risk / device / content` 域简报，再进入 `OperationsCopilotAgent -> SafetyReviewAgent`

### 8.6 工具边界

当前 Agent 只能通过受控工具读取业务上下文，不能直接绕过业务层写数据库。当前已经接入：

- 报告工具
- 健康档案工具
- 健康指标工具
- 服务目录工具
- RAG 检索工具

这保证：

- 权限边界可控
- 工具输出可追踪
- 领域上下文可复用

### 8.7 LLM Gateway

`LlmGateway` 当前支持：

- `deepseek`
- `openrouter`
- `openai-compatible`
- `mock` 回退

行为特点：

- 若未配置 API Key 或 Base URL，会自动回退到确定性结构化输出。
- 结构化输出优先使用 `json_schema`，但 DeepSeek 官方直连时会自动降级为 `json_object`。
- 支持主模型、轻量模型、fallback 模型切换。
- 支持 tool-calling，且可通过配置要求必须发生工具调用。

### 8.8 Trace 与结果持久化

`AgentTask.result` 中会写入：

- 请求 agent 与实际 resolved agent
- route / workflow 信息
- tool calls
- LLM trace
- coordination steps
- safety review 结果
- 最终 output / error

这使得每个任务都可以回溯：

- 路由到了哪个 Agent
- 调用了哪些工具
- 用了哪个模型
- 是否命中了安全门禁
- 是否进入人工复核

---

## 9. RAG 数据库的搭建

### 9.1 RAG 数据结构

当前 RAG 使用 PostgreSQL 中的关系表存储元数据和 chunk，而不是引入外部向量数据库。核心表包括：

| 模型 | 用途 |
| --- | --- |
| `RagKnowledgeBase` | 知识库定义、可见性、来源配置、刷新策略、分块配置 |
| `RagDocument` | 文档级记录、来源 URI、摘要、访问策略、内容 Hash |
| `RagChunk` | chunk 文本、关键词、heading、embedding、embeddingModel |
| `RagIngestionRun` | 建库/增量同步运行记录 |
| `RagEvalRun` | 评测运行记录 |
| `RagEvalCaseResult` | 单条评测用例结果 |

### 9.2 知识类型与可见性

当前知识库按两层分类：

#### 9.2.1 `RagKnowledgeType`

- `SERVICE_CATALOG`
- `HEALTH_KNOWLEDGE`
- `PLATFORM_RULE`
- `INSTITUTION_RESOURCE`
- `USER_PRIVATE_ARCHIVE`

#### 9.2.2 `RagVisibilityScope`

- `PUBLIC`
- `INSTITUTION`
- `USER_PRIVATE`

### 9.3 已实现的知识库类型

`build-rag-db.ts` 当前会构建以下知识库：

| 知识库编码 | 类型 | 可见性 | 数据来源 |
| --- | --- | --- | --- |
| `rag-service-catalog-public` | 服务目录知识库 | `PUBLIC` | `ServiceItem`、`Institution` |
| `rag-health-knowledge-public` | 健康知识库 | `PUBLIC` | WHO、CDC、MedlinePlus、`Article`、`Lecture`、`DiseaseKnowledge` |
| `rag-platform-rule-public` | 平台规则知识库 | `PUBLIC` | 仓库文档、访问边界规则、RAG 规则 |
| `rag-institution-resource-{institution.code}` | 机构资源知识库 | `INSTITUTION` | `Institution`、`Staff`、`StaffSchedule`、`ServiceItem` |
| `rag-user-private-{userId}` | 用户私有档案知识库 | `USER_PRIVATE` | `HealthArchive`、`Report`、`HealthMetricRecord`、`Order`、`FamilyBinding` |

### 9.4 数据来源与内容构建

#### 9.4.1 服务目录知识库

从 `ServiceItem` 和 `Institution` 生成文档，内容会整合：

- 服务基本信息
- 价格、时长、评分、销量
- 服务内容与适用区域
- `ragSnippet` 中的知识片段

#### 9.4.2 健康知识库

当前来源包含两类：

- 公开网页抓取：
  WHO、CDC、MedlinePlus
- 内部内容表：
  `Article`、`Lecture`、`DiseaseKnowledge`

#### 9.4.3 平台规则知识库

当前会从项目文档中提取平台规则，包括：

- 多智能体实施文档
- 后端开发文档中的接入边界与未实现能力说明
- 私有知识访问策略说明

#### 9.4.4 机构资源知识库

每个机构单独建库，内容包括：

- 机构信息
- 可提供服务
- 员工专长、资质
- 近期排班能力

#### 9.4.5 用户私有档案知识库

每个用户单独建库，内容包括：

- 基础档案
- 病史、风险标签、长期记忆
- 近期健康指标
- 已发布报告
- 历史订单
- 访问策略与绑定关系

### 9.5 分块与索引策略

默认 chunk 配置为：

```ts
{
  strategy: "paragraph-window",
  targetChars: 820,
  overlapChars: 140,
  minChunkChars: 180
}
```

每个 chunk 会额外记录：

- `chunkIndex`
- `contentHash`
- `tokenCount`
- `charCount`
- `headings`
- `keywords`
- `metadata`
- `embedding`
- `embeddingModel`

### 9.6 真实 embedding 能力

当前项目已经不是只靠占位向量：

- `EmbeddingGateway` 与 `embedding.runtime.ts` 已支持真实 embedding 请求。
- 支持 `openrouter` 和 `openai-compatible` 两类 embedding 网关。
- 当 `AGENT_EMBEDDING_PROVIDER / BASE_URL / API_KEY` 有效时，构建侧与查询侧都会走真实 embedding。
- 当配置缺失或请求失败时，会回退到确定性向量 `deterministic-hash-v1`，确保流程不断。

相关环境变量：

- `AGENT_EMBEDDING_PROVIDER`
- `AGENT_EMBEDDING_BASE_URL`
- `AGENT_EMBEDDING_API_KEY`
- `AGENT_EMBEDDING_MODEL`
- `AGENT_EMBEDDING_FALLBACK_MODEL`
- `AGENT_EMBEDDING_TIMEOUT_MS`

### 9.7 增量更新机制

`build-rag-db.ts` 已支持两种同步模式：

- `incremental`
- `full`

默认执行：

```bash
npm run db:build-rag:backend
```

等价于：

```bash
npm run rag:build --workspace @ihc/backend
```

全量重建：

```bash
npm run db:rebuild-rag:backend
```

增量更新逻辑核心依赖：

- 文档级 `contentHash`
- chunk 级 `contentHash`
- `embeddingModel`
- 元数据比较
- accessPolicy 比较

当出现以下情况时会触发刷新：

- 文档正文变更
- 文档摘要、标题、可见性、ownerUserId、institutionId 变更
- chunk 数量变更
- chunk 内容变更
- 原先 embedding 不是当前模型产物

### 9.8 检索策略

当前 RAG 检索不是单纯的向量搜索，而是两段式：

1. 候选召回：
   根据标题和内容做词法 contains 查询
2. 重排：
   结合 query embedding 与 chunk embedding 做余弦相似度重排

当前检索结果会返回：

- 知识库编码与类型
- 文档 ID、标题、来源 URI
- chunk ID 与 chunkIndex
- excerpt
- citation
- embedding trace

### 9.9 权限与可见性约束

#### 9.9.1 App 侧检索

App 侧入口：`GET /api/v1/app/ai/knowledge/search`

约束：

- 默认只检索 `PUBLIC`
- `includePrivate=true` 时才会尝试联查 `USER_PRIVATE`
- `INSTITUTION_RESOURCE` 不对普通用户端开放
- 私有检索需要结合 `elderId` 与家庭绑定关系校验

#### 9.9.2 内部检索

内部入口：`POST /api/v1/internal/agents/rag/search`

支持：

- `knowledgeTypes`
- `visibilityScopes`
- `ownerUserId`
- `institutionId`

同时继续受：

- `admin` scope token
- 来源 IP
- 可选共享密钥

#### 9.9.3 Agent 检索

Agent 通过 `RagRetrievalTool` 调用 `RagKnowledgeService.searchForAgent()`：

- 默认带 `PUBLIC`
- 有授权时附加 `USER_PRIVATE`
- 后台特权角色可附加 `INSTITUTION`

### 9.10 RAG 评测机制

评测脚本：`apps/backend/scripts/eval-rag.ts`

执行命令：

```bash
npm run db:eval-rag:backend
```

默认会：

- 读取固定数据集 `scripts/evals/rag-regression.dataset.json`
- 对每条 case 执行检索
- 记录结果到 `RagEvalRun` 与 `RagEvalCaseResult`

当前统计指标包括：

- `passRate`
- `hitAt1`
- `hitAt3`
- `hitAt5`
- `MRR`

并支持：

- `--fail-on-regression`
- `--dataset=<path>`
- `--min-pass-rate=<0~1>`

这意味着当前后端已经具备 RAG 的“建库 -> 检索 -> 评测 -> 结果入库”闭环。

---

## 10. 质量闭环、治理与审计

### 10.1 当前已交付能力

当前质量治理链路已经具备以下组成：

- `SafetyReviewAgent`：统一安全门禁
- `AgentHumanReview`：人工复核工单
- `AgentAuditLog`：审计日志
- `RagEvalRun / RagEvalCaseResult`：RAG 评测结果
- `AgentTask.result.trace`：模型、工具、协作链路追踪

典型闭环为：

1. Agent 任务执行成功。
2. `SafetyReviewAgent` 检查输出是否命中高风险边界。
3. `AgentGovernanceService.finalizeSucceededTask()` 决定是否创建人工复核工单。
4. 若需要人工复核，则写入 `AgentHumanReview`。
5. 同步写入 `AgentAuditLog`。
6. 人工决策通过 `resolveReview()` 回写任务结果与审计日志。

### 10.2 当前尚未实现的关键能力

以下能力在当前仓库里还没有形成完整闭环，后续扩展时必须明确这一点：

- 智能体尚未开放业务写回工具，当前主要以结构化建议、摘要、推荐和审计输出为主。
- RAG 已使用关系表 + chunk + embedding 模式，但尚未引入独立向量索引或专用向量数据库。
- 增量建库已支持脚本级执行，但还没有接入自动事件触发器或 CI/CD 中的强制同步流水线。
- RAG 评测已具备脚本和结果入库，但还没有在持续集成中作为硬门禁默认启用。
- 高风险输出已有人工复核数据与接口，但尚未在独立后台页面中完全收口成专门运营工作台。
- WebSocket 相关依赖已安装，但当前消息、通知和 Agent 结果回传仍以 HTTP / 轮询为主。

### 10.3 在当前项目中的正确接入方式

后续新增 AI 或 Agent 能力时，必须遵循以下接入方式：

- 不要让 Agent 直接绕过业务模块写数据库，必须通过受控工具或显式业务服务完成。
- 新增 Agent 必须先在 `AgentRegistry` 注册，补齐输入输出 schema、allowedTools、forbiddenActions、riskLevel 和 timeout。
- 面向用户端的 AI 能力，应优先接入 `AppAgentService` 与 `/app/ai/*`，不要直接在页面层拼 Prompt 调内网接口。
- 面向后台和系统任务的 AI 能力，应通过 `AgentTask -> BullMQ -> AgentTaskProcessor -> AgentOrchestratorService` 的链路执行。
- 需要知识检索的能力，应复用 `RagKnowledgeService` 和 `RagRetrievalTool`，并明确知识类型、可见性与 citation 要求。
- 涉及高风险医学、预警外呼、履约决策、机构调度等输出，必须补充 `SafetyReviewAgent` 判定与人工复核策略。

---

## 11. 本地开发、测试与部署建议

### 11.1 常用命令

```bash
npm run dev:backend
npm run build:backend
npm run check:backend

npm run db:migrate:backend
npm run db:seed:backend
npm run db:build-rag:backend
npm run db:rebuild-rag:backend
npm run db:eval-rag:backend

npm run test:backend
npm run test:backend:unit
npm run test:backend:integration
npm run test:backend:smoke:regression
```

### 11.2 本地依赖

建议本地启动：

- PostgreSQL
- Redis
- MinIO

命令：

```bash
docker compose -f docker-compose.backend.yml up -d
```

### 11.3 开发启动顺序

推荐顺序：

1. `npm install`
2. `cp apps/backend/.env.example apps/backend/.env`
3. `docker compose -f docker-compose.backend.yml up -d`
4. `npm run db:migrate:backend`
5. `npm run db:seed:backend`
6. `npm run dev:backend`
7. 打开 `http://server.mctown.online:8190/api/v1/docs`

如果希望后端在 `tmux` 中常驻运行，可改用：

```bash
npm run dev:backend:tmux
npm run dev:backend:tmux:attach
```

如果希望前后端联调时后端保持稳定，不随着代码改动自动重启，可改用：

```bash
npm run serve:backend
```

如需让稳定模式在 `tmux` 中常驻：

```bash
npm run serve:backend:tmux
npm run serve:backend:tmux:attach
```

补充说明：

- 默认会话名：`ihc-backend`
- `backend` 窗口：`docker compose -f docker-compose.backend.yml up -d && npm run dev:backend`
- `infra` 窗口：展示依赖容器状态
- 停止命令：`npm run dev:backend:tmux:stop`
- `serve:backend` / `serve:backend:tmux` 会先编译再运行构建产物，只在手动重启时更新代码。

### 11.4 联调建议

- 第一个请求先打 `GET /api/v1/system/health`
- 用户端登录使用 `POST /api/v1/app/auth/login/password`
- 后台登录使用 `POST /api/v1/admin/auth/login/password`
- AI / RAG 联调优先从 `/api/v1/app/ai/*` 和 `/api/v1/internal/agents/*` 开始

### 11.5 默认测试账号

- 家属账号：`13900139000 / 123456`
- 长者账号：`13800138000 / 123456`
- 后台账号：`13600136000 / 123456`

---

## 12. 结论

截至当前实现，后端已经不是单纯的基础脚手架，而是一套可联调、可建库、可评测、可审计的统一业务底座。它的成熟度可以概括为：

- 业务 API 已具备完整的用户端、后台端、文件、消息、内容、社区与 AI 接口。
- 多智能体框架已具备注册、编排、队列执行、工具层、模型层、治理层和人工复核链路。
- RAG 已具备知识分层、真实 embedding 接入、增量建库、检索、评测与结果入库闭环。
- 高风险治理已经从“只做模型输出”升级为“安全门禁 + 人工复核 + 审计日志”的后端治理模式。

后续如需继续扩展，应优先围绕：

- 更多业务写回工具
- RAG 自动同步与 CI 评测门禁
- 后台复核工作台
- 更强的实时通知与事件触发

在此基础上演进，而不是绕开当前后端底座重复建设。
