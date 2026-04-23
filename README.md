# IntelliHealthCare

IntelliHealthCare（智诊康养）是一个面向长者、家属与机构运营团队的智慧康养平台。仓库采用 `npm workspaces` 管理的 Monorepo 结构，统一维护用户端、后台端、NestJS 后端以及共享脚本与文档，目标是把健康档案、健康监测、服务预约、内容社区和智能体能力落到同一套业务底座中。

## 项目组成

| 组成 | 路径 | 说明 |
| --- | --- | --- |
| 用户端 | `apps/user-web` | 面向长者与家属的统一 Web 应用 |
| 后台端 | `apps/admin-web` | 面向运营、医生、护理、机构管理人员的后台 |
| 后端 | `apps/backend` | 基于 `NestJS + Prisma + PostgreSQL + Redis/BullMQ + MinIO` 的统一业务服务 |
| 共享运行时 | `packages/page-core` | 前端页面清单、页面元信息和共享基础能力 |
| 脚本与工具 | `scripts` | 本地开发、页面脚手架、后端冒烟回归等脚本 |
| 文档 | `docs` | 架构、开发、API、Agent、RAG 等说明文档 |

## 核心能力

- 统一用户侧入口：老人和家属共用一套用户端，通过家庭绑定、授权范围和页面差异区分角色。
- 模块化后端：认证、用户、家庭、健康档案、健康指标、服务目录、订单、支付、报告、消息、内容、社区、后台和智能体能力统一落在一个 NestJS 服务中。
- 多智能体运行时：后端内置 Hermes 受控多智能体宿主，已接入任务调度、工具调用、追踪、人工复核和审计。
- RAG 检索闭环：已具备知识库构建、增量更新、真实 embedding 接入、App 侧检索、内部检索与评测回归能力。
- 本地联调友好：Swagger、种子数据、数据库自动回退、MinIO 文件上传和冒烟脚本均已内置。

## 技术栈

| 层级 | 技术方案 |
| --- | --- |
| 前端 | Vue 3、TypeScript、Vite |
| 后端框架 | NestJS、TypeScript |
| 数据访问 | Prisma、PostgreSQL |
| 缓存与队列 | Redis、BullMQ、ioredis |
| 对象存储 | MinIO（S3-compatible） |
| 接口契约 | Swagger / OpenAPI |
| 校验与配置 | class-validator、class-transformer、zod |
| AI 能力 | LLM Gateway、Embedding Gateway、RAG、Agent Orchestration |

## 仓库结构

```text
.
├── apps/
│   ├── user-web/
│   ├── admin-web/
│   └── backend/
├── packages/
│   └── page-core/
├── scripts/
├── docs/
├── docker-compose.backend.yml
└── package.json
```

## 快速开始

### 1. 环境要求

- Node.js `>= 20`
- npm `>= 10`
- Docker 与 Docker Compose

### 2. 安装依赖

```bash
npm install
```

### 3. 配置后端环境变量

```bash
cp apps/backend/.env.example apps/backend/.env
```

### 4. 启动本地依赖

```bash
docker compose -f docker-compose.backend.yml up -d
```

默认端口：

- PostgreSQL：`5432`
- Redis：`6379`
- MinIO API：`9000`
- MinIO Console：`9001`

说明：

- 镜像默认通过 `docker.m.daocloud.io` 拉取，可用 `IHC_IMAGE_REGISTRY=docker.io` 切回官方源。
- 开发环境下若 `DATABASE_URL` 不可达，后端支持自动回退到嵌入式 PostgreSQL，并可自动执行 migration/seed。

### 5. 初始化数据库

```bash
npm run db:migrate:backend
npm run db:seed:backend
```

### 6. 启动应用

```bash
npm run dev:user
npm run dev:admin
npm run dev:backend
```

默认访问地址：

- 用户端：`http://server.mctown.online:5173`
- 后台端：`http://server.mctown.online:5174`
- 后端 API：`http://server.mctown.online:8190/api/v1`
- Swagger：`http://server.mctown.online:8190/api/v1/docs`
- 健康检查：`http://server.mctown.online:8190/api/v1/system/health`

## 常用命令

### 前端开发

```bash
npm run dev:user
npm run dev:page -- --page home/dashboard
npm run dev:admin
npm run dev:admin:page -- --page dashboard/overview
```

### 构建与检查

```bash
npm run check
npm run build
```

按工作区执行：

```bash
npm run check:user
npm run check:admin
npm run check:backend

npm run build:user
npm run build:admin
npm run build:backend
```

### 后端数据库与 RAG

```bash
npm run db:generate:backend
npm run db:migrate:backend
npm run db:seed:backend
npm run db:build-rag:backend
npm run db:rebuild-rag:backend
npm run db:eval-rag:backend
```

### 后端测试

```bash
npm run test:backend
npm run test:backend:unit
npm run test:backend:integration
npm run test:backend:smoke:regression
```

### 页面脚手架

```bash
npm run create:page -- --group health --page health-data --title "健康数据" --owner "成员A"
npm run create:admin-page -- --group elder --page member-list --title "长者档案" --owner "后台组"
```

## 后端说明

后端当前已完成以下能力：

- 统一 API 前缀与通用响应封装：`/api/v1`
- 用户端、后台端、公开接口、系统接口、内部智能体接口的分层路由
- JWT 鉴权、RBAC、内部接口来源 IP 与共享密钥校验
- Prisma 数据模型、Redis/BullMQ 队列、MinIO 文件上传
- Hermes 多智能体运行时、RAG 检索、RAG 构建与评测、人工复核与审计日志

后端当前已挂载的主要模块：

- `system`
- `auth`
- `users`
- `family`
- `health-archive`
- `health-metrics`
- `health-lifestyle`
- `service-catalog`
- `orders`
- `payments`
- `reports`
- `files`
- `messaging`
- `community`
- `content`
- `agents`
- `admin`

## 联调账号

默认种子账号：

- 家属账号：`13900139000 / 123456`
- 长者账号：`13800138000 / 123456`
- 后台账号：`13600136000 / 123456`

## 文档索引

- [项目架构说明](./docs/architecture.md)
- [后端架构说明](./docs/backend-architecture.md)
- [后端开发文档](./docs/智诊康养后端开发文档.md)
- [后端 API 手册](./docs/backend-api-manual.md)
- [前端 Swagger 联调手册](./docs/frontend-api-integration-guide.md)
- [Hermes 多智能体实施文档](./docs/hermes-multi-agent-implementation.md)
- [IntelliHealthCare Agent 卡片](./docs/intellihealthcare-agent-cards.md)

## 开发建议

- 提交前至少执行一次 `npm run check`，后端改动建议补跑 `npm run test:backend`。
- 涉及后端模型、接口、RAG 或智能体能力的修改时，请同步更新 `docs/智诊康养后端开发文档.md` 与 `docs/backend-api-manual.md`。
- 新增页面优先使用脚手架命令，避免遗漏 `Page.vue`、`mock.ts` 与 `pages.manifest.json` 登记。
