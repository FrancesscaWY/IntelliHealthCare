# IntelliHealthCare

IntelliHealthCare（智诊康养）是一个面向长者、家属与机构运营团队的智慧健康养老平台。项目采用全栈 Monorepo 组织方式，在同一仓库内统一管理用户端网页、管理后台、后端服务以及共享运行时工具，便于跨端协同开发、接口联调和文档沉淀。

## 项目概述

- 用户端：面向长者与家属的统一移动端网页应用，支持健康数据、服务预约、内容浏览、社区互动等场景。老人和家属共享同一套用户端系统，不单独拆分为两个独立产品，差异通过账号关系、授权范围与页面内容呈现。
- 后台端：面向运营、护理、医生与机构管理人员的管理后台，承接运营配置、成员管理、服务调度与数据看板等能力。
- 后端：基于模块化单体架构提供统一业务 API，并接入数据库、缓存、对象存储、异步任务和多智能体能力。
- 协作方式：仓库使用 `npm workspaces` 管理多应用、多包与共享脚本，前后端统一采用 TypeScript 技术栈。

## 技术栈

| 层级 | 技术方案 |
| --- | --- |
| 前端 | Vue 3、TypeScript、Vite |
| 后端 | NestJS、TypeScript |
| 数据访问 | Prisma、PostgreSQL |
| 基础设施 | Redis、BullMQ、MinIO |
| 仓库管理 | npm workspaces |

## 仓库结构

```text
.
├── apps/
│   ├── user-web/                  用户端网页工作区
│   ├── admin-web/                 后台端网页工作区
│   └── backend/                   统一后端服务
├── packages/
│   └── page-core/                 前端共享页面运行时与类型定义
├── scripts/                       开发、构建、校验、脚手架脚本
├── docs/                          架构与协作文档
├── docker-compose.backend.yml     本地后端依赖服务编排
└── package.json                   根工作区配置
```

## 环境要求

- Node.js `>= 20`
- npm `>= 10`
- Docker 与 Docker Compose（用于启动 PostgreSQL、Redis、MinIO）

## 快速开始

### 1. 安装依赖

```bash
npm install
```

说明：根目录安装依赖后，会自动执行后端 `postinstall` 脚本生成 Prisma Client。

### 2. 配置后端环境变量

```bash
cp apps/backend/.env.example apps/backend/.env
```

### 3. 启动本地基础设施

```bash
docker compose -f docker-compose.backend.yml up -d
```

如果当前网络到 Docker Hub 不稳定，项目默认会从 `docker.m.daocloud.io` 拉取基础镜像。
如需显式切回官方仓库：

```bash
IHC_IMAGE_REGISTRY=docker.io docker compose -f docker-compose.backend.yml up -d
```

默认启动的依赖服务如下：

- PostgreSQL：`localhost:5432`
- Redis：`localhost:6379`
- MinIO API：`localhost:9000`
- MinIO Console：`localhost:9001`

### 4. 初始化数据库

```bash
npm run db:migrate:backend
```

如需导入演示数据，可继续执行：

```bash
npm run db:seed:backend
```

### 5. 启动开发环境

```bash
npm run dev:user
npm run dev:admin
npm run dev:backend
```

默认访问地址：

- 用户端：`http://127.0.0.1:5173`
- 后台端：`http://127.0.0.1:5174`
- 后端 API：`http://localhost:3000/api/v1`
- Swagger：`http://localhost:3000/api/v1/docs`
- 健康检查：`http://localhost:3000/api/v1/system/health`

## 常用命令

### 前端预览

```bash
# 用户端整站预览
npm run dev:user

# 用户端单页预览
npm run dev:page -- --page home/dashboard

# 后台端整站预览
npm run dev:admin

# 后台端单页预览
npm run dev:admin:page -- --page dashboard/overview
```

### 构建与校验

```bash
# 全仓校验
npm run check

# 分应用校验
npm run check:user
npm run check:admin
npm run check:backend

# 全仓构建
npm run build

# 分应用构建
npm run build:user
npm run build:admin
npm run build:backend
```

### 后端数据库相关

```bash
npm run db:generate:backend
npm run db:migrate:backend
npm run db:seed:backend
```

### 页面脚手架与协作提示

```bash
# 创建用户端页面
npm run create:page -- --group health --page health-data --title "健康数据" --owner "成员A"

# 创建后台端页面
npm run create:admin-page -- --group elder --page member-list --title "长者档案" --owner "后台组"

# 生成用户端页面开发提示
npm run prompt:page -- --page health/health-data

# 生成后台端页面开发提示
npm run prompt:admin-page -- --page dashboard/overview
```

## 核心能力边界

### 前端

- 用户端与后台端均支持整站模式和单页模式预览。
- 用户端统一承接老人和家属两类角色，仅在权限和内容呈现上区分，不单独维护多套前端实现。
- 页面以目录为最小协作单元，便于并行开发、评审和交接。
- 共享运行时能力由 `packages/page-core` 提供，包括页面类型、导航辅助与页面元数据处理。

### 后端

后端当前以 NestJS 模块化单体承载核心业务域，已纳入以下模块边界：

- 系统、认证与权限
- 用户、家庭、健康档案、健康指标
- 服务目录、订单、支付、报告
- 消息、社区内容、管理后台
- Agents 多智能体能力

基础设施层统一封装 Prisma、Redis/BullMQ 与 MinIO，为后续接口扩展、异步任务处理和智能体编排提供支撑。

## 页面目录约定

两个前端工作区遵循相同的页面组织方式：

```text
apps/<app>/src/pages/<domain>/<page>/
  Page.vue
  mock.ts
  README.md   # 可选
```

约定说明：

- `Page.vue`：页面主体结构、交互逻辑与局部状态。
- `mock.ts`：页面独立预览所需的模拟数据。
- `README.md`：可选补充说明，用于记录上下文、交接事项或特殊依赖。
- `pages.manifest.json`：页面注册、标题、负责人、摘要与加载入口的主数据源。

## 文档索引

- [项目架构说明](./docs/architecture.md)
- [后端架构说明](./docs/backend-architecture.md)
- [后端工作区说明](./apps/backend/README.md)
- [成员开发手册](./docs/member-development-manual.md)
- [后台端开发手册](./docs/admin-development-manual.md)
- [页面协作说明](./docs/page-collaboration.md)
- [Codex 协作说明](./docs/codex-workflow.md)
- [Hermes 多智能体实施文档](./docs/hermes-multi-agent-implementation.md)

## 开发建议

- 提交前至少执行一次 `npm run check`，确保前端页面清单、类型检查和后端编译通过。
- 新增页面时优先使用脚手架命令，避免遗漏 `Page.vue`、`mock.ts` 或清单登记。
- 涉及后端环境、数据模型或基础设施变更时，请同步更新对应文档与示例配置。
