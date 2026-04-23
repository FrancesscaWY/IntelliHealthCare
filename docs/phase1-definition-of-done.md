# Phase 1 完成定义（最小自动化测试基线）

更新时间：`2026-04-22`

## 1. 目标范围

Phase 1 仅覆盖以下三条 P0 主链路：

- 认证（`auth`）
- 服务目录（`service-catalog`）
- 订单主链路（`orders + payments`）

本阶段不追求“全量接口自动化”，目标是先建立稳定、可复用、可纳入 CI 的最小自动化基线。

## 2. 自动化基线入口

- 命令：`npm run test:backend:smoke:baseline`
- 脚本：`scripts/backend-smoke-baseline.mjs`
- 默认地址：`http://server.mctown.online:8190/api/v1`
- 默认测试账号：`13900139000 / 123456`

可覆盖环境变量：

- `BASE_URL`
- `APP_TEST_PHONE`
- `APP_TEST_PASSWORD`
- `SMOKE_TIMEOUT_MS`

## 3. 接口覆盖矩阵（Phase 1 必测）

### 3.1 认证链路（6）

- `GET /system/health`
- `GET /app/agreements/privacy`
- `POST /app/auth/login/password`
- `POST /app/auth/token/refresh`
- `GET /app/users/me`（未登录校验）
- `GET /app/users/me`（已登录校验）

### 3.2 服务目录链路（9）

- `GET /app/services/categories`
- `GET /app/services/home-care`
- `GET /app/services/home-care/{serviceId}`
- `GET /app/services/rehab-therapy`
- `GET /app/services/rehab-therapy/{serviceId}`
- `GET /app/services/home-exam`
- `GET /app/services/home-exam/{serviceId}`
- `GET /app/services/elderly-care`
- `GET /app/services/elderly-care/{serviceId}`

### 3.3 订单主链路（11）

- `GET /app/family/addresses`
- `GET /app/orders/booking/options`
- `POST /app/orders/preview`
- `POST /app/orders`
- `GET /app/orders`
- `GET /app/orders/{orderId}`
- `PUT /app/orders/{orderId}/schedule`
- `GET /app/payments/channels`
- `POST /app/payments`
- `POST /app/payments/{paymentId}/confirm`
- `POST /app/orders/{orderId}/cancel`

Phase 1 必测接口总数：`26`

## 4. Phase 1 验收标准（Definition of Done）

### 4.1 接口覆盖率

- 公式：`接口覆盖率 = 自动化已覆盖必测接口数 / 26`
- 通过标准：`>= 100%`（即 `26/26`）

### 4.2 联调通过率

- 公式：`联调通过率 = 联调通过用例数 / 联调总用例数`
- 统计口径：以 `docs/non-ai-api-test-manual.md` 的最小冒烟 + 本自动化脚本结果为准
- 通过标准：`>= 95%`

### 4.3 测试通过率

- 公式：`测试通过率 = 自动化通过用例数 / 自动化总用例数`
- 通过标准：`= 100%`（主分支发布门禁建议）

## 5. 当前基线执行记录

首次落地时请记录：

- 执行命令：`npm run test:backend:smoke:baseline`
- 执行日期：`2026-04-22`
- 自动化通过率：`100.00% (18/18)`
- 接口覆盖率：`100.00% (26/26)`
- 联调通过率：`100.00%`

说明：

- 接口覆盖率按第 3 节的 `26` 个 Phase 1 必测接口计算，已由自动化脚本覆盖。
- 联调通过率按“最小冒烟 8 条 + 自动化基线 18 条”统计，当前为 `26/26`。
