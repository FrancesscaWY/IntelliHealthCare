# IntelliHealthCare Backend

`apps/backend` 是智诊康养项目的后端工作区。当前采用 `NestJS + Prisma + PostgreSQL + Redis/BullMQ + MinIO` 的模块化单体方案，统一承接：

- 用户端 API：`/api/v1/app/*`
- 后台 API：`/api/v1/admin/*`
- 系统自检与架构信息：`/api/v1/system/*`
- 内部 Agent 运行时：`/api/v1/internal/agents/*`

本文档基于当前代码审计结果整理，审计时间为 `2026-04-21`。重点区分三件事：

- 整体设计：当前后端准备如何组织系统
- 已完成：代码里已经存在并可执行的能力
- 待完成：蓝图里有、但当前仓库还没真正落地的部分

## 整体设计

### 1. 技术栈

- `Node.js 20 + TypeScript`
- `NestJS`：REST API、Guard、Interceptor、Swagger
- `PostgreSQL + Prisma`：核心业务数据
- `Redis + BullMQ`：异步任务与 Agent 执行队列
- `MinIO / S3-compatible storage`：对象存储
- `JWT + RBAC`：用户端与后台端鉴权

### 2. 架构形态

当前后端采用 `模块化单体`，先稳定领域边界，再根据流量和耦合度拆分。

```text
User Web / Admin Web / Internal Jobs
  -> NestJS Controllers
  -> Domain Modules
  -> Prisma/PostgreSQL
  -> Redis/BullMQ
  -> MinIO

                         |-> Hermes Agents Runtime
                         |-> Tool Layer
                         |-> LLM Gateway
```

当前 API 面分为四层：

| API 面 | 前缀 | 说明 |
| --- | --- | --- |
| 用户端 | `/api/v1/app` | 老人/家属登录、档案、指标、服务、订单、支付、报告 |
| 后台端 | `/api/v1/admin` | 后台概览、长者详情、订单/工单、报告审核 |
| 系统面 | `/api/v1/system` | 健康检查、架构信息 |
| 内部协同面 | `/api/v1/internal/agents` | Agent 蓝图、定义、任务创建、任务查询、重试 |

### 3. 领域边界

当前工作区的领域规划如下：

- `auth`：登录、刷新令牌、JWT、后台角色范围校验
- `users`：个人信息、实名认证、首页聚合、定位、搜索、地址与家属关系入口
- `health-archive`：健康档案摘要、基础信息、病史与长期记忆
- `health-metrics`：健康指标、设备、用药、趋势
- `service-catalog`：服务目录与服务详情
- `orders`：预约、订单、工单、评价、售后
- `payments`：支付单创建与确认
- `reports`：体检/服务/康复报告与后台审核
- `admin`：后台总览、长者详情、工单列表
- `agents`：Hermes 受控多智能体运行时 MVP

`family`、`community`、`content`、`messaging` 这些域已经在 Prisma 模型里建了数据基础，但 Nest 模块层还没有完整展开。

## 开发进度审计

### 已完成

以下能力已经在当前代码中真实落地：

| 模块 | 状态 | 当前实现 |
| --- | --- | --- |
| 基础工程 | 已完成 | `NestJS` 启动、全局异常处理、统一响应包装、Swagger、环境变量校验 |
| 数据层 | 已完成 | `Prisma schema` 已覆盖用户、档案、设备、服务、订单、工单、报告、消息、内容、社区、AgentTask 等核心模型 |
| 开发自举 | 已完成 | 开发环境支持嵌入式 PostgreSQL fallback，并自动执行 migration/seed |
| 认证鉴权 | 已完成 | 用户端/后台端密码登录、短信验证码、刷新令牌、JWT Guard、角色 Guard |
| 用户与首页 | 已完成 | `me/profile`、实名认证、首页聚合、城市定位、热搜/历史搜索、全局搜索 |
| 家属与地址 | 已完成 | `app/family/bindings`、地址列表/新增/修改，能力暂由 `users` 模块承接 |
| 健康档案 | 已完成 | 档案摘要、基础信息查询/更新、病史与长期记忆查询/更新 |
| 健康指标 | 已完成 | 指标概览、趋势、记录 CRUD、设备绑定/详情/设置、用药管理 |
| 服务目录 | 已完成 | 服务分类、列表、详情 |
| 订单与工单 | 已完成 | 预约选项、订单预览、创建、列表、详情、改约、取消、时间线、服务记录、评价、售后、后台派单/工单状态更新 |
| 支付 | 已完成 | 支付渠道、支付单创建、支付确认、支付详情 |
| 报告 | 已完成 | 体检报告列表/新增/详情/删除、报告解读、后台审核 |
| 后台核心 | 已完成 | 概览统计、长者详情、工单列表、后台订单查询、后台报告审核 |
| Hermes MVP | 已完成 | `AgentTask` 入库、BullMQ 队列、任务状态流转、`intent-router`、`report-summary-agent`、`service-recommendation-agent` |
| Agent 工具层 | 已完成 | 报告、档案、健康指标、服务目录四类受控工具 |
| LLM 网关 | 已完成 | 支持 DeepSeek 官方直连与 OpenAI-compatible 接口；未配置外部 LLM 时自动降级为确定性输出 |

### 部分完成

以下部分已经有基础，但不能视为完整交付：

- `admin`：当前只覆盖概览、长者详情、订单/工单、报告审核，还不是完整后台业务面。
- `family`：业务能力已经通过 `users` 模块提供，但独立 `FamilyModule` 还是空壳。
- `content` / `community`：Prisma 模型、seed 数据以及首页/搜索聚合里已经使用 `Article`、`Activity` 等数据，但独立控制器和服务尚未建设。
- `agents`：已经支持受控多 Agent 协作，但仍缺完整评测、人工复核工作台和更多业务写回工具；当前重点链路是健康理解补风险研判、风险任务补健康背景、后台 Copilot 多域汇总。
- `对象存储`：`StorageService` 已配置完成，但文件上传/下载/签名 URL 等业务 API 尚未落地。

### 待完成

当前最明确的待办如下：

- 补齐 `community`、`content`、`messaging`、独立 `family` 模块的控制器/服务/API。
- 补齐用户端文档里规划的更多业务接口，例如积分、消息中心、活动管理、内容互动、医生咨询等。
- 继续把 Hermes 从受控多 Agent 运行时补齐成完整生产体系，包括统一助手闭环、更多后台域 Agent 和写回工具。
- 补齐真正的高风险治理链路：人工复核、审核门禁、评测与审计策略。
- 进一步收紧 `/internal/agents/*` 的治理链路，例如补独立服务账号、审计字段与更细粒度的权限分层。
- 补齐对象存储文件接口、消息通知、WebSocket 会话、RAG 知识层。
- 建立自动化测试体系。当前 `package.json` 没有 `test` 脚本，仓库也没有成体系的后端单测/集成测试。

## 当前状态结论

如果只看后端工程成熟度，当前状态更接近：

- `P0 主业务 API 已有可联调版本`
- `后台核心闭环可演示`
- `Hermes 多智能体运行时已有 MVP`
- `统一多智能体蓝图已成文，但尚未完整落地`

不应把当前状态描述成：

- “用户端全量 82 页 API 已全部完成”
- “完整后台业务已完成”
- “8 个核心 Agent 已全部上线”
- “后端已具备生产级治理和自动化测试”

## 快速开始

### 1. 环境变量

```bash
cp apps/backend/.env.example apps/backend/.env
```

### 2. 安装依赖

```bash
npm install
```

### 3. 启动本地依赖

```bash
docker compose -f docker-compose.backend.yml up -d
```

默认依赖端口：

- PostgreSQL：`5432`
- Redis：`6379`
- MinIO API：`9000`
- MinIO Console：`9001`

### 4. 启动后端

```bash
npm run dev --workspace @ihc/backend
```

默认地址：

- API：`http://localhost:8190/api/v1`
- Swagger：`http://localhost:8190/api/v1/docs`
- 健康检查：`http://localhost:8190/api/v1/system/health`

远程部署默认绑定 `0.0.0.0:8190`。若服务器已放通 `8190-8200`，可直接通过 `http://<服务器IP>:8190/api/v1/docs` 访问；若要在本机浏览器里以 `http://localhost:8190/api/v1/docs` 访问，请使用 VS Code 端口转发或 SSH 隧道。

### 5. 数据库 fallback 说明

若开发机上 `localhost:5432` PostgreSQL 不可达，且 `.env` 中保留：

- `DATABASE_DEV_FALLBACK_ENABLED=true`
- `DATABASE_DEV_FALLBACK_AUTO_SEED=true`

后端会自动切到内嵌 PostgreSQL，并执行 migration/seed。

注意：

- 这个 fallback 只覆盖 PostgreSQL，不覆盖 Redis。
- Agent 任务和 BullMQ Worker 依赖 Redis，测试 Agent CLI 前请先确保 Redis 可用。

## 默认账号与样例资源

默认种子账号：

- 用户端家属账号：`13900139000 / 123456`
- 用户端长者账号：`13800138000 / 123456`
- 后台账号：`13600136000 / 123456`

常用样例 ID：

- 长者：`user_elder_joy`、`user_elder_zhou`
- 报告：`report_checkup_exam`
- 服务：`srv_rehab_stroke`、`srv_home_clean_2h`
- 订单：`order_rehab_assess`、`order_elderly_pending`

## 后端测试 CLI

当前后端还没有自动化测试套件，推荐先用 CLI 做 smoke test。下面命令分为两部分：

- `API`：验证用户端/后台端 REST API
- `Agent`：验证 Hermes MVP，包括 `Multi-Agent` 和 `单Agent`

### 1. 先准备通用变量

以下命令默认在仓库根目录执行，且使用 `bash`。

```bash
BASE_URL=${BASE_URL:-http://localhost:8190/api/v1}

json_get() {
  node -e '
    let input = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => (input += chunk));
    process.stdin.on("end", () => {
      const path = process.argv[1].split(".");
      let value = JSON.parse(input);
      for (const key of path) value = value?.[key];
      if (typeof value === "string") {
        console.log(value);
      } else if (value === undefined || value === null) {
        console.log("");
      } else {
        console.log(JSON.stringify(value, null, 2));
      }
    });
  ' "$1"
}

app_login() {
  curl -s "$BASE_URL/app/auth/login/password" \
    -H "Content-Type: application/json" \
    -d '{"phone":"13900139000","password":"123456","agreePrivacy":true}'
}

admin_login() {
  curl -s "$BASE_URL/admin/auth/login/password" \
    -H "Content-Type: application/json" \
    -d '{"phone":"13600136000","password":"123456"}'
}

APP_TOKEN=$(app_login | json_get data.accessToken)
ADMIN_TOKEN=$(admin_login | json_get data.accessToken)

wait_task() {
  local task_id="$1"
  while true; do
    local status
    status=$(curl -s "$BASE_URL/internal/agents/tasks/$task_id" | json_get data.status)
    echo "task=$task_id status=$status"
    if [ "$status" = "SUCCEEDED" ] || [ "$status" = "FAILED" ]; then
      break
    fi
    sleep 1
  done
  curl -s "$BASE_URL/internal/agents/tasks/$task_id"
}
```

### 2. API Smoke Test

#### 2.1 系统面

```bash
curl -s "$BASE_URL/system/health"
curl -s "$BASE_URL/system/architecture"
```

#### 2.2 登录与当前用户

```bash
app_login

curl -s "$BASE_URL/app/users/me" \
  -H "Authorization: Bearer $APP_TOKEN"
```

#### 2.3 家属关系与健康档案

```bash
curl -s "$BASE_URL/app/family/bindings" \
  -H "Authorization: Bearer $APP_TOKEN"

curl -s "$BASE_URL/app/health/archive/summary" \
  -H "Authorization: Bearer $APP_TOKEN"

curl -s "$BASE_URL/app/health/archive/basic-info" \
  -H "Authorization: Bearer $APP_TOKEN"

curl -s "$BASE_URL/app/health/archive/medical-history" \
  -H "Authorization: Bearer $APP_TOKEN"
```

#### 2.4 健康指标、设备、用药

```bash
curl -s "$BASE_URL/app/health/metrics/overview" \
  -H "Authorization: Bearer $APP_TOKEN"

curl -s "$BASE_URL/app/health/metrics/bloodPressure/trend" \
  -H "Authorization: Bearer $APP_TOKEN"

curl -s "$BASE_URL/app/health/devices" \
  -H "Authorization: Bearer $APP_TOKEN"

curl -s "$BASE_URL/app/health/medications" \
  -H "Authorization: Bearer $APP_TOKEN"
```

#### 2.5 服务、订单、支付、报告

```bash
curl -s "$BASE_URL/app/services/categories" \
  -H "Authorization: Bearer $APP_TOKEN"

curl -s "$BASE_URL/app/services/rehab-therapy" \
  -H "Authorization: Bearer $APP_TOKEN"

curl -s "$BASE_URL/app/services/rehab-therapy/srv_rehab_stroke" \
  -H "Authorization: Bearer $APP_TOKEN"

curl -s "$BASE_URL/app/orders" \
  -H "Authorization: Bearer $APP_TOKEN"

curl -s "$BASE_URL/app/payments/channels" \
  -H "Authorization: Bearer $APP_TOKEN"

curl -s "$BASE_URL/app/health/reports/checkups" \
  -H "Authorization: Bearer $APP_TOKEN"

curl -s "$BASE_URL/app/health/reports/checkups/report_checkup_exam/interpretation" \
  -H "Authorization: Bearer $APP_TOKEN"
```

#### 2.6 首页、搜索、后台

```bash
curl -s "$BASE_URL/app/home/dashboard" \
  -H "Authorization: Bearer $APP_TOKEN"

curl -s "$BASE_URL/app/search/global?keyword=%E5%BA%B7%E5%A4%8D&page=1&pageSize=5" \
  -H "Authorization: Bearer $APP_TOKEN"

admin_login

curl -s "$BASE_URL/admin/dashboard/overview" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

curl -s "$BASE_URL/admin/orders?page=1&pageSize=5" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

curl -s "$BASE_URL/admin/reports?page=1&pageSize=5" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### 3. Agent CLI

注意：

- `/internal/agents/*` 现在要求后台 `JWT`，且调用方来源 IP 需要命中 `INTERNAL_API_ALLOWED_CIDRS`。
- 如果配置了 `INTERNAL_API_SHARED_SECRET`，还需要额外携带 `X-Internal-Token` 请求头。
- 如果部署在 Nginx / LB 后面，需要显式开启 `INTERNAL_API_TRUST_PROXY_HEADERS=true`，并确保代理会覆盖转发头。
- Agent 任务依赖 Redis 和 BullMQ Worker。

#### 3.1 先看当前蓝图和真实注册定义

```bash
curl -s "$BASE_URL/internal/agents/definitions"
curl -s "$BASE_URL/internal/agents/blueprint"
```

#### 3.2 Multi-Agent 测试

当前代码里的 “Multi-Agent” 不是完整多 Specialist 自治链，而是 `intent-router -> specialist` 的受控路由模式。

##### 路由到报告摘要 Specialist

```bash
ROUTED_REPORT_TASK_ID=$(
  curl -s "$BASE_URL/internal/agents/tasks" \
    -H "Content-Type: application/json" \
    -d '{
      "agentName": "intent-router",
      "taskType": "report-summary",
      "ownerId": "user_elder_zhou",
      "triggerSource": "readme-cli",
      "payload": {
        "reportId": "report_checkup_exam",
        "userId": "user_elder_zhou",
        "includeArchive": true,
        "includeLatestMetrics": true
      }
    }' | json_get data.task.id
)

wait_task "$ROUTED_REPORT_TASK_ID"
```

##### 路由到服务推荐 Specialist

```bash
ROUTED_SERVICE_TASK_ID=$(
  curl -s "$BASE_URL/internal/agents/tasks" \
    -H "Content-Type: application/json" \
    -d '{
      "agentName": "intent-router",
      "taskType": "service-recommendation",
      "ownerId": "user_elder_joy",
      "triggerSource": "readme-cli",
      "payload": {
        "userId": "user_elder_joy",
        "query": "最近想做脑卒中术后康复训练",
        "category": "REHAB_THERAPY",
        "city": "上海市",
        "limit": 3
      }
    }' | json_get data.task.id
)

wait_task "$ROUTED_SERVICE_TASK_ID"
```

Multi-Agent 验证要点：

- `data.result.trace.route.requestedAgent` 应为 `intent-router`
- `data.result.trace.route.resolvedAgent` 应为 `report-summary-agent` 或 `service-recommendation-agent`
- `data.result.trace.toolCalls` 应能看到受控工具调用

#### 3.3 单Agent 测试

单Agent 测试即直接点名 Specialist，不经过 `intent-router`。

##### 直接调用 `report-summary-agent`

```bash
DIRECT_REPORT_TASK_ID=$(
  curl -s "$BASE_URL/internal/agents/tasks" \
    -H "Content-Type: application/json" \
    -d '{
      "agentName": "report-summary-agent",
      "taskType": "report-summary",
      "ownerId": "user_elder_zhou",
      "triggerSource": "readme-cli",
      "payload": {
        "reportId": "report_checkup_exam",
        "userId": "user_elder_zhou",
        "includeArchive": true,
        "includeLatestMetrics": true
      }
    }' | json_get data.task.id
)

wait_task "$DIRECT_REPORT_TASK_ID"
```

##### 直接调用 `service-recommendation-agent`

```bash
DIRECT_SERVICE_TASK_ID=$(
  curl -s "$BASE_URL/internal/agents/tasks" \
    -H "Content-Type: application/json" \
    -d '{
      "agentName": "service-recommendation-agent",
      "taskType": "service-recommendation",
      "ownerId": "user_elder_joy",
      "triggerSource": "readme-cli",
      "payload": {
        "userId": "user_elder_joy",
        "query": "想预约居家康复理疗服务",
        "category": "REHAB_THERAPY",
        "city": "上海市",
        "limit": 3
      }
    }' | json_get data.task.id
)

wait_task "$DIRECT_SERVICE_TASK_ID"
```

#### 3.4 查看最近任务与重试

```bash
curl -s "$BASE_URL/internal/agents/tasks?limit=10"

curl -s -X POST "$BASE_URL/internal/agents/tasks/$DIRECT_REPORT_TASK_ID/retry"
```

## 参考文档

- `docs/backend-architecture.md`
- `docs/intellihealthcare-multi-agent-blueprint.md`
- `docs/user-web-analysis-and-api.md`
- `apps/backend/src/modules/agents/README.md`
