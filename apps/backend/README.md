# IntelliHealthCare Backend

`apps/backend` 是智诊康养项目的后端基础工程，采用 TypeScript 统一栈的模块化单体方案：

- `NestJS`：承接 REST API、鉴权、模块边界与后续 WebSocket 扩展
- `PostgreSQL + Prisma`：承接健康档案、订单、报告、会话、RBAC 等核心业务数据
- `Redis + BullMQ`：承接消息、异步任务、风控扫描、Agent 编排队列
- `MinIO`：承接报告、图片、语音等对象存储

## 快速开始

1. 复制环境变量模板

```bash
cp apps/backend/.env.example apps/backend/.env
```

2. 启动本地依赖

```bash
docker compose -f docker-compose.backend.yml up -d
```

3. 安装依赖并生成 Prisma Client

```bash
npm install
```

4. 启动后端

```bash
npm run dev --workspace @ihc/backend
```

默认地址：

- API：`http://localhost:3000/api/v1`
- Swagger：`http://localhost:3000/api/v1/docs`
- 健康检查：`http://localhost:3000/api/v1/system/health`

## 目录说明

```text
apps/backend/
  prisma/                 Prisma 数据模型
  src/
    common/               环境变量、响应包装、异常处理、中间件
    infra/                Prisma / Redis / MinIO 等基础设施封装
    modules/              认证、档案、订单、报告、Agent 等业务模块
```

## 当前阶段目标

当前仓库先搭建后端基础环境与领域边界，优先保证：

- 技术栈与前端 Monorepo 保持一致的 TypeScript 体系
- 模块划分能覆盖老人端、家属端、后台端与 Agent 协同层
- 后续可平滑接入 JWT、RBAC、WebSocket、队列任务和 RAG/LLM 能力
