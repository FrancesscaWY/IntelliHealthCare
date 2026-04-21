# IntelliHealthCare Backend

`apps/backend` 是智诊康养项目的后端基础工程，采用 TypeScript 统一栈的模块化单体方案：

- `NestJS`：REST API、模块边界、鉴权守卫、Swagger
- `PostgreSQL + Prisma`：核心业务数据和种子数据
- `Redis + BullMQ`：异步任务和 Agent 任务队列
- `MinIO / S3-compatible`：对象存储配置层

系统只区分三类入口，不按用户角色拆多套后端：

- `app/*`：用户侧 API，老人和家属共用
- `admin/*`：后台运营/机构侧 API
- `internal/agents/*`：内部 Agent 任务入口

### 1.2 代码分层

```text
apps/backend/
  prisma/                     Prisma schema、migration、seed
  src/
    common/                   env 校验、统一响应、异常处理、鉴权、请求上下文
    infra/                    Prisma / Redis / MinIO 基础设施
    modules/
      system/                 健康检查、架构信息
      auth/                   用户侧/后台登录与 token 刷新
      users/                  用户资料、家庭绑定视图、首页、定位、搜索
      health-archive/         健康档案摘要、基础信息、病史
      health-metrics/         指标、设备、用药
      service-catalog/        服务目录
      orders/                 预约、订单、工单、评价、售后
      payments/               支付单与支付确认
      reports/                体检/服务/康复报告与后台审核
      admin/                  后台概览、长者详情、工单视图
      agents/                 Agent 任务入库、队列分发、受控工具、MVP 编排
      family/                 仅保留模块边界，未独立开放 API
      messaging/              仅保留模块边界，未独立开放 API
      community/              仅保留模块边界，未独立开放 API
      content/                仅保留模块边界，未独立开放 API
```

### 1.3 当前后端的三个能力层

#### A. 基础设施层

- 环境变量由 `zod` 校验
- 全局启用统一响应包装、异常过滤、参数校验
- Swagger 已开放在 `/api/v1/docs`
- 开发环境下如果本地 PostgreSQL 不可达，会自动回退到内嵌 PostgreSQL，并自动执行 migration/seed

注意：

- 只有 `PostgreSQL` 有开发态回退
- `Redis` 当前没有回退机制，BullMQ 和 Agent 运行时仍依赖 Redis 可用

#### B. 业务 API 层

当前已经形成一条最小业务闭环：

`认证 -> 用户与家庭 -> 健康档案/指标 -> 服务目录 -> 订单 -> 支付 -> 报告 -> 后台派单/审核`

#### C. Agent 协同层

当前 Agent 不是完整自治平台，而是受控 MVP：

- 任务先写入 `AgentTask`
- 通过 BullMQ 入队
- Worker 执行编排
- 结果、路由、工具调用、失败原因回写数据库

当前“多智能体”准确地说是：

`intent-router -> specialist agent`

也就是一个受控路由器加少量 Specialist，还不是文档蓝图里的完整 9 Agent 体系。

## 2. 当前开发进度

| 领域 | 状态 | 说明 |
| --- | --- | --- |
| 启动与基础设施 | 已完成 | `env` 校验、Swagger、统一响应、异常处理、请求上下文、Prisma/Redis/Storage 模块都已落地 |
| 数据层 | 已完成 | `schema.prisma`、migration、seed 已覆盖用户、档案、服务、订单、报告、AgentTask 等核心实体 |
| 认证与权限 | 已完成（MVP） | 用户侧/后台登录、刷新 token、JWT Guard、角色 Guard 已可用 |
| 用户侧基础 API | 已完成 | `users/home/locations/search/family addresses` 已可联调 |
| 健康档案 | 已完成 | 摘要、基础信息、病史读写已可联调 |
| 健康指标/设备/用药 | 已完成 | 指标概览、趋势、记录、设备绑定、用药管理已可联调 |
| 服务目录 | 已完成 | 分类、列表、详情已可联调 |
| 订单/支付/报告 | 已完成 | 预览、下单、支付确认、评价、售后、报告查询/审核已可联调 |
| 后台工作台 | 已完成（MVP） | 概览、长者详情、工单列表、派单、工单状态更新已可联调 |
| Agents | 已完成（MVP） | `intent-router`、`report-summary-agent`、`service-recommendation-agent` 已可运行 |
| family 模块 | 待完成 | 当前仅通过 `users` 模块暴露家庭绑定/地址视图，没有独立模块 API |
| messaging 模块 | 待完成 | 仅注册模块边界，尚未开放通知/会话 API |
| community 模块 | 待完成 | 仅注册模块边界，尚未开放生活圈/活动 API |
| content 模块 | 待完成 | 仅注册模块边界，尚未开放资讯/讲堂 API |
| 安全与生产化 | 待完成 | 短信、密码哈希、token 失效管理、上传链路、真实支付回调、Agent 鉴权治理仍是 MVP |

## 3. 已完成内容

### 3.1 已落地的 API 面

#### 系统与运维

- `GET /api/v1/system/health`
- `GET /api/v1/system/architecture`

#### 用户侧认证

- `POST /api/v1/app/auth/sms/send`
- `POST /api/v1/app/auth/login/password`
- `POST /api/v1/app/auth/login/sms`
- `POST /api/v1/app/auth/login/third-party`
- `POST /api/v1/app/auth/password/verify-code`
- `POST /api/v1/app/auth/password/reset`
- `POST /api/v1/app/auth/token/refresh`
- `POST /api/v1/app/auth/logout`

#### 用户、首页、定位、搜索、家庭地址

- `GET /api/v1/app/users/me`
- `GET /api/v1/app/users/me/profile`
- `PUT /api/v1/app/users/me/profile`
- `PUT /api/v1/app/users/me/real-name`
- `GET /api/v1/app/home/dashboard`
- `GET /api/v1/app/locations/current`
- `GET /api/v1/app/locations/cities`
- `GET /api/v1/app/search/hot-tags`
- `GET /api/v1/app/search/history`
- `POST /api/v1/app/search/history`
- `DELETE /api/v1/app/search/history`
- `GET /api/v1/app/search/global`
- `GET /api/v1/app/family/bindings`
- `GET /api/v1/app/family/addresses`
- `POST /api/v1/app/family/addresses`
- `PUT /api/v1/app/family/addresses/:addressId`

#### 健康档案与健康数据

- `GET /api/v1/app/health/archive/summary`
- `GET /api/v1/app/health/archive/basic-info`
- `PUT /api/v1/app/health/archive/basic-info`
- `GET /api/v1/app/health/archive/medical-history`
- `PUT /api/v1/app/health/archive/medical-history`
- `GET /api/v1/app/health/metrics/overview`
- `GET /api/v1/app/health/metrics/:metricKey/trend`
- `GET /api/v1/app/health/metrics/:metricKey/records`
- `POST /api/v1/app/health/metrics/:metricKey/records`
- `PUT /api/v1/app/health/metrics/:metricKey/records/:recordId`
- `DELETE /api/v1/app/health/metrics/:metricKey/records/:recordId`
- `GET /api/v1/app/health/devices`
- `GET /api/v1/app/health/devices/:deviceId`
- `POST /api/v1/app/health/devices/bind`
- `POST /api/v1/app/health/devices/scan/bind`
- `DELETE /api/v1/app/health/devices/:deviceId`
- `PUT /api/v1/app/health/devices/:deviceId/settings`
- `PUT /api/v1/app/health/devices/:deviceId/password`
- `PUT /api/v1/app/health/devices/:deviceId/heart-rate-settings`
- `GET /api/v1/app/health/devices/:deviceId/measurements`
- `GET /api/v1/app/health/medications/today`
- `GET /api/v1/app/health/medications`
- `POST /api/v1/app/health/medications`
- `PUT /api/v1/app/health/medications/:medicationId`
- `DELETE /api/v1/app/health/medications/:medicationId`
- `POST /api/v1/app/health/medications/:medicationId/take`

#### 服务、订单、支付、报告

- `GET /api/v1/app/services/categories`
- `GET /api/v1/app/services/:category`
- `GET /api/v1/app/services/:category/:serviceId`
- `GET /api/v1/app/orders/booking/options`
- `POST /api/v1/app/orders/preview`
- `POST /api/v1/app/orders`
- `GET /api/v1/app/orders`
- `GET /api/v1/app/orders/:orderId`
- `PUT /api/v1/app/orders/:orderId/schedule`
- `POST /api/v1/app/orders/:orderId/cancel`
- `GET /api/v1/app/orders/:orderId/timeline`
- `GET /api/v1/app/orders/:orderId/voucher`
- `GET /api/v1/app/orders/:orderId/service-records`
- `GET /api/v1/app/orders/:orderId/assessment-report`
- `GET /api/v1/app/orders/:orderId/rehab-report`
- `POST /api/v1/app/orders/:orderId/reviews`
- `GET /api/v1/app/orders/:orderId/reviews`
- `POST /api/v1/app/orders/:orderId/after-sales`
- `GET /api/v1/app/orders/:orderId/after-sales`
- `GET /api/v1/app/payments/channels`
- `POST /api/v1/app/payments`
- `GET /api/v1/app/payments/:paymentId`
- `POST /api/v1/app/payments/:paymentId/confirm`
- `GET /api/v1/app/health/reports/checkups`
- `POST /api/v1/app/health/reports/checkups`
- `GET /api/v1/app/health/reports/checkups/:reportId`
- `DELETE /api/v1/app/health/reports/checkups/:reportId`
- `GET /api/v1/app/health/reports/checkups/:reportId/interpretation`

#### 后台 API

- `POST /api/v1/admin/auth/login/password`
- `POST /api/v1/admin/auth/token/refresh`
- `GET /api/v1/admin/auth/me`
- `GET /api/v1/admin/dashboard/overview`
- `GET /api/v1/admin/elders/:elderId`
- `GET /api/v1/admin/work-orders`
- `GET /api/v1/admin/orders`
- `GET /api/v1/admin/orders/:orderId`
- `POST /api/v1/admin/orders/:orderId/dispatch`
- `PUT /api/v1/admin/work-orders/:workOrderId/status`
- `GET /api/v1/admin/reports`
- `PUT /api/v1/admin/reports/:reportId/review`

#### Internal Agents API

- `GET /api/v1/internal/agents/definitions`
- `GET /api/v1/internal/agents/blueprint`
- `POST /api/v1/internal/agents/tasks`
- `GET /api/v1/internal/agents/tasks`
- `GET /api/v1/internal/agents/tasks/:taskId`
- `POST /api/v1/internal/agents/tasks/:taskId/retry`

### 3.2 当前 Agent 实现现状

已注册并可执行的 Agent 只有 3 个：

- `intent-router`
- `report-summary-agent`
- `service-recommendation-agent`

当前支持的任务类型：

- `report-summary`
- `report_interpretation`
- `service-recommendation`
- `service_recommendation`

说明：

- `intent-router` 负责按 `taskType` 路由
- 单 Agent 测试时可以直接调用 Specialist
- `/internal/agents/blueprint` 返回的是目标蓝图，不等于当前已实现集合
- 当前已实现集合应以 `/internal/agents/definitions` 为准

## 4. 待完成内容

### 4.1 业务域待补齐

- `family`：需要从 `users` 模块里拆出更完整的家庭关系、授权范围、家庭视图 API
- `messaging`：通知中心、医生咨询、客服会话、助手会话尚未开放
- `community`：生活圈、活动报名、互动行为尚未开放
- `content`：资讯、讲堂、疾病知识等尚未开放独立 API

### 4.2 平台能力待补齐

- 文件上传与 MinIO 真实落盘链路
- 短信服务与真实验证码
- 密码哈希与更完整的 token 失效管理
- 更细粒度的后台 RBAC / 数据权限
- WebSocket / 推送 / 通知投递链路
- 真实支付回调、退款流、对账流

### 4.3 Agent 待演进

当前 Agent 仍停留在 MVP 阶段，距离统一多智能体蓝图还有明显差距：

- 还没有 `AssistantConversationAgent`
- 还没有 `HealthManagementAgent / CareCoordinationAgent / RiskOperationsAgent`
- 还没有 `OperationsCopilotAgent / SafetyReviewAgent`
- 还没有真正的跨 Agent 规划、审核、治理链路
- 当前更像“路由器 + 两个 Specialist”，不是完整多 Agent 工作流

## 5. 快速开始

1. 复制环境变量模板

```bash
cp apps/backend/.env.example apps/backend/.env
```

2. 安装依赖

```bash
npm install
```

3. 启动基础依赖

```bash
docker compose -f docker-compose.backend.yml up -d
```

说明：

- 当前 `docker-compose.backend.yml` 默认使用 `docker.m.daocloud.io` 作为镜像前缀，避免 Docker Hub 在部分网络环境下拉取超时
- 如需切回官方仓库，可显式覆盖：

```bash
IHC_IMAGE_REGISTRY=docker.io docker compose -f docker-compose.backend.yml up -d
```

4. 启动后端

```bash
npm run dev:backend
```

默认地址：

- API：`http://localhost:3000/api/v1`
- Swagger：`http://localhost:3000/api/v1/docs`
- 健康检查：`http://localhost:3000/api/v1/system/health`

默认种子账号：

- 用户侧家属：`13900139000 / 123456`
- 用户侧长者：`13800138001 / 123456`
- 后台：`13600136000 / 123456`

## 6. 后端测试 CLI

以下命令以本地 `3000` 端口为例，默认使用 seed 中已经存在的数据。

### 6.1 先准备环境变量

```bash
export BASE_URL=http://localhost:3000/api/v1

export APP_TOKEN=$(
  curl -s -X POST "$BASE_URL/app/auth/login/password" \
    -H "Content-Type: application/json" \
    -d '{"phone":"13900139000","password":"123456"}' \
  | node -e 'let s="";process.stdin.on("data",d=>s+=d);process.stdin.on("end",()=>console.log(JSON.parse(s).data.accessToken));'
)

export ADMIN_TOKEN=$(
  curl -s -X POST "$BASE_URL/admin/auth/login/password" \
    -H "Content-Type: application/json" \
    -d '{"phone":"13600136000","password":"123456"}' \
  | node -e 'let s="";process.stdin.on("data",d=>s+=d);process.stdin.on("end",()=>console.log(JSON.parse(s).data.accessToken));'
)
```

### 6.2 API 测试 CLI

#### 系统与登录

```bash
curl -s "$BASE_URL/system/health"
curl -s "$BASE_URL/system/architecture"
curl -s "$BASE_URL/app/users/me" -H "Authorization: Bearer $APP_TOKEN"
curl -s "$BASE_URL/admin/auth/me" -H "Authorization: Bearer $ADMIN_TOKEN"
```

#### 健康档案、指标、服务目录

```bash
curl -s "$BASE_URL/app/health/archive/summary" \
  -H "Authorization: Bearer $APP_TOKEN"

curl -s "$BASE_URL/app/health/metrics/overview" \
  -H "Authorization: Bearer $APP_TOKEN"

curl -s "$BASE_URL/app/services/categories" \
  -H "Authorization: Bearer $APP_TOKEN"

curl -s "$BASE_URL/app/services/home-care" \
  -H "Authorization: Bearer $APP_TOKEN"
```

#### 订单、支付、后台派单

```bash
export ORDER_ID=$(
  curl -s -X POST "$BASE_URL/app/orders" \
    -H "Authorization: Bearer $APP_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "serviceId": "srv_home_clean_2h",
      "addressId": "addr_joy_home",
      "elderId": "user_elder_joy",
      "bookingDate": "2026-04-22",
      "bookingTimeSlot": "09:00-11:00",
      "remark": "README CLI smoke test"
    }' \
  | node -e 'let s="";process.stdin.on("data",d=>s+=d);process.stdin.on("end",()=>console.log(JSON.parse(s).data.orderId));'
)

export PAYMENT_ID=$(
  curl -s -X POST "$BASE_URL/app/payments" \
    -H "Authorization: Bearer $APP_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"orderId\":\"$ORDER_ID\",\"channel\":\"WECHAT\"}" \
  | node -e 'let s="";process.stdin.on("data",d=>s+=d);process.stdin.on("end",()=>console.log(JSON.parse(s).data.paymentId));'
)

curl -s -X POST "$BASE_URL/app/payments/$PAYMENT_ID/confirm" \
  -H "Authorization: Bearer $APP_TOKEN"

curl -s -X POST "$BASE_URL/admin/orders/$ORDER_ID/dispatch" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "institutionId": "inst_qingsong",
    "assigneeStaffId": "staff_lixiulan",
    "scheduleId": "schedule_nurse_20260418",
    "dispatchNote": "README CLI dispatch test"
  }'
```

#### 报告创建与解读

```bash
export CHECKUP_REPORT_ID=$(
  curl -s -X POST "$BASE_URL/app/health/reports/checkups" \
    -H "Authorization: Bearer $APP_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "elderId": "user_elder_joy",
      "title": "README CLI 体检报告",
      "summary": {
        "conclusion": "血压略高，建议持续监测。",
        "highlights": ["收缩压波动偏大", "近期睡眠一般"],
        "advice": ["继续晨晚监测", "如持续升高请复诊"]
      }
    }' \
  | node -e 'let s="";process.stdin.on("data",d=>s+=d);process.stdin.on("end",()=>console.log(JSON.parse(s).data.reportId));'
)

curl -s "$BASE_URL/app/health/reports/checkups/$CHECKUP_REPORT_ID/interpretation" \
  -H "Authorization: Bearer $APP_TOKEN"

curl -s -X PUT "$BASE_URL/admin/reports/$CHECKUP_REPORT_ID/review" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"PUBLISHED"}'
```

### 6.3 Agent 测试 CLI

说明：

- 当前内部 Agent 接口默认不走 JWT Guard
- 当前“多智能体”测试，实际是 `intent-router -> specialist`
- 当前“单 Agent”测试，实际是直接命中 Specialist

#### A. 单 Agent 直连

直接调用 `report-summary-agent`：

```bash
export SINGLE_AGENT_TASK_ID=$(
  curl -s -X POST "$BASE_URL/internal/agents/tasks" \
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
    }' \
  | node -e 'let s="";process.stdin.on("data",d=>s+=d);process.stdin.on("end",()=>console.log(JSON.parse(s).data.task.id));'
)

curl -s "$BASE_URL/internal/agents/tasks/$SINGLE_AGENT_TASK_ID"
```

直接调用 `service-recommendation-agent`：

```bash
curl -s -X POST "$BASE_URL/internal/agents/tasks" \
  -H "Content-Type: application/json" \
  -d '{
    "agentName": "service-recommendation-agent",
    "taskType": "service-recommendation",
    "ownerId": "user_elder_joy",
    "triggerSource": "readme-cli",
    "payload": {
      "userId": "user_elder_joy",
      "city": "上海市",
      "category": "REHAB_THERAPY",
      "query": "脑卒中 康复",
      "limit": 3
    }
  }'
```

#### B. 当前多智能体入口

通过 `intent-router` 走受控协作链路：

```bash
export MULTI_AGENT_TASK_ID=$(
  curl -s -X POST "$BASE_URL/internal/agents/tasks" \
    -H "Content-Type: application/json" \
    -d '{
      "agentName": "intent-router",
      "taskType": "service-recommendation",
      "ownerId": "user_elder_joy",
      "triggerSource": "readme-cli",
      "payload": {
        "userId": "user_elder_joy",
        "city": "上海市",
        "query": "上门康复",
        "limit": 3
      }
    }' \
  | node -e 'let s="";process.stdin.on("data",d=>s+=d);process.stdin.on("end",()=>console.log(JSON.parse(s).data.task.id));'
)

curl -s "$BASE_URL/internal/agents/tasks/$MULTI_AGENT_TASK_ID"
curl -s "$BASE_URL/internal/agents/definitions"
curl -s "$BASE_URL/internal/agents/blueprint"
```

#### C. 查询与重试

```bash
curl -s "$BASE_URL/internal/agents/tasks?limit=10"

curl -s -X POST "$BASE_URL/internal/agents/tasks/$MULTI_AGENT_TASK_ID/retry"
```

## 7. 补充说明

- 当前运行时定义请以 `/internal/agents/definitions` 为准，不要只看蓝图文档
- 当前 README 标注的“已完成”指的是“本地可启动、带种子数据、接口可联调”，不等于生产级完成
- 如果要看 Agent 模块更细的说明，继续查看 `apps/backend/src/modules/agents/README.md`
