# 非 AI 业务 API 联调测试文档（前端版）

本文档面向用户端前端开发同学，按“页面模块 -> 页面代码位置 -> 接口”组织，便于按页面逐步替换 mock。

更新时间：`2026-04-21`

## 1. 覆盖结论（基于 `docs/user-web-analysis-and-api.md`）

- 文档 `5.1 ~ 5.14` 的非 AI 业务接口已全部落地到后端模块。
- 唯一不属于“必须实现 REST API”的是 `5.13` 中的 WebSocket 建议项（`/ws/app`），当前仍为规划建议。

对应后端入口模块：

- 认证：`apps/backend/src/modules/auth`
- 用户/首页/搜索：`apps/backend/src/modules/users`
- 健康档案：`apps/backend/src/modules/health-archive`
- 健康数据/设备/用药：`apps/backend/src/modules/health-metrics`
- 健康膳食/饮食记录/自测：`apps/backend/src/modules/health-lifestyle`
- 服务目录：`apps/backend/src/modules/service-catalog`
- 订单/履约：`apps/backend/src/modules/orders`
- 支付：`apps/backend/src/modules/payments`
- 报告：`apps/backend/src/modules/reports`
- 内容：`apps/backend/src/modules/content`
- 社区活动：`apps/backend/src/modules/community`
- 消息会话：`apps/backend/src/modules/messaging`
- 文件上传：`apps/backend/src/modules/files`

## 2. 联调环境

- Base URL：`http://localhost:8190/api/v1`
- Swagger：`http://localhost:8190/api/v1/docs`
- 用户端账号：`13900139000 / 123456`
- 后台账号：`13600136000 / 123456`

## 3. 通用脚本（建议前端本地保留）

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
      if (typeof value === "string") console.log(value);
      else console.log(JSON.stringify(value, null, 2));
    });
  ' "$1"
}

APP_TOKEN=$(curl -s "$BASE_URL/app/auth/login/password" \
  -H "Content-Type: application/json" \
  -d '{"phone":"13900139000","password":"123456","agreePrivacy":true}' | json_get data.accessToken)
```

## 4. 分模块联调清单（含页面位置）

### 4.1 认证与账号

前端页面位置：

- `apps/user-web/src/pages/auth/login/Page.vue`
- `apps/user-web/src/pages/auth/forgot-password/Page.vue`
- `apps/user-web/src/pages/auth/reset-password/Page.vue`
- `apps/user-web/src/pages/auth/real-name/Page.vue`

核心接口：

- `POST /app/auth/sms/send`
- `POST /app/auth/login/password`
- `POST /app/auth/login/sms`
- `POST /app/auth/login/third-party`
- `POST /app/auth/password/verify-code`
- `POST /app/auth/password/reset`
- `POST /app/auth/token/refresh`
- `POST /app/auth/logout`
- `GET /app/agreements/privacy`
- `GET /app/users/me`
- `PUT /app/users/me/real-name`

### 4.2 首页、搜索、定位、我的与设置

前端页面位置：

- `apps/user-web/src/pages/home/dashboard/Page.vue`
- `apps/user-web/src/pages/home/search/Page.vue`
- `apps/user-web/src/pages/home/location-select/Page.vue`
- `apps/user-web/src/pages/home/profile/Page.vue`
- `apps/user-web/src/pages/home/mine/Page.vue`
- `apps/user-web/src/pages/home/MyJ/account-security/Page.vue`
- `apps/user-web/src/pages/home/MyJ/message-settings/Page.vue`
- `apps/user-web/src/pages/home/MyJ/profile-info/Page.vue`
- `apps/user-web/src/pages/home/MyJ/myfoot/Page.vue`
- `apps/user-web/src/pages/home/MyJ/myactivity/Page.vue`
- `apps/user-web/src/pages/home/MyJ/integration/Page.vue`
- `apps/user-web/src/pages/home/MyJ/setting/Page.vue`

核心接口：

- `GET /app/home/dashboard`
- `GET /app/locations/current`
- `GET /app/locations/cities`
- `GET /app/search/hot-tags`
- `GET /app/search/history`
- `POST /app/search/history`
- `DELETE /app/search/history`
- `GET /app/search/global`
- `GET /app/users/me/profile`
- `PUT /app/users/me/profile`
- `GET /app/users/me/security`
- `GET /app/users/me/settings`
- `PUT /app/users/me/settings/message`
- `GET /app/users/me/points`
- `GET /app/users/me/footprints`
- `DELETE /app/users/me/footprints`
- `GET /app/users/me/activities`
- `GET /app/users/me/reviews`
- `GET /app/users/me/coupons`

### 4.3 健康档案与报告

前端页面位置：

- `apps/user-web/src/pages/healthdocs/health-records/Page.vue`
- `apps/user-web/src/pages/healthdocs/basic-info/Page.vue`
- `apps/user-web/src/pages/healthdocs/medical-history/Page.vue`
- `apps/user-web/src/pages/healthdocs/checkup-reports/Page.vue`
- `apps/user-web/src/pages/healthdocs/report-upload/Page.vue`
- `apps/user-web/src/pages/healthdocs/report-detail/Page.vue`
- `apps/user-web/src/pages/healthdocs/report-interpretation/Page.vue`

核心接口：

- `GET /app/health/archive/summary`
- `GET /app/health/archive/basic-info`
- `PUT /app/health/archive/basic-info`
- `GET /app/health/archive/medical-history`
- `PUT /app/health/archive/medical-history`
- `GET /app/health/reports/checkups`
- `POST /app/health/reports/checkups`
- `GET /app/health/reports/checkups/{reportId}`
- `DELETE /app/health/reports/checkups/{reportId}`
- `GET /app/health/reports/checkups/{reportId}/interpretation`

### 4.4 健康数据、设备、用药

前端页面位置：

- `apps/user-web/src/pages/health/health-data/Page.vue`
- `apps/user-web/src/pages/health/add-data/Page.vue`
- `apps/user-web/src/pages/health/device-center/Page.vue`
- `apps/user-web/src/pages/health/device-detail/Page.vue`
- `apps/user-web/src/pages/health/device-add/Page.vue`
- `apps/user-web/src/pages/health/device-scan/Page.vue`
- `apps/user-web/src/pages/health/device-password/Page.vue`
- `apps/user-web/src/pages/health/heart-rate-settings/Page.vue`
- `apps/user-web/src/pages/health/medication-info/Page.vue`
- `apps/user-web/src/pages/health/medication-add/Page.vue`
- `apps/user-web/src/pages/health/medication-edit/Page.vue`

核心接口：

- `GET /app/health/metrics/overview`
- `GET /app/health/metrics/{metricKey}/trend`
- `GET /app/health/metrics/{metricKey}/records`
- `POST /app/health/metrics/{metricKey}/records`
- `PUT /app/health/metrics/{metricKey}/records/{recordId}`
- `DELETE /app/health/metrics/{metricKey}/records/{recordId}`
- `GET /app/health/devices`
- `GET /app/health/devices/{deviceId}`
- `POST /app/health/devices/bind`
- `POST /app/health/devices/scan/bind`
- `DELETE /app/health/devices/{deviceId}`
- `PUT /app/health/devices/{deviceId}/settings`
- `PUT /app/health/devices/{deviceId}/password`
- `PUT /app/health/devices/{deviceId}/heart-rate-settings`
- `GET /app/health/devices/{deviceId}/measurements`
- `GET /app/health/medications/today`
- `GET /app/health/medications`
- `POST /app/health/medications`
- `PUT /app/health/medications/{medicationId}`
- `DELETE /app/health/medications/{medicationId}`
- `POST /app/health/medications/{medicationId}/take`

### 4.5 健康膳食、饮食记录、自测

前端页面位置：

- `apps/user-web/src/pages/health/diet-plan/Page.vue`
- `apps/user-web/src/pages/health/diet-recipe-detail/Page.vue`
- `apps/user-web/src/pages/diet-record/Page.vue`
- `apps/user-web/src/pages/diet-record/add-record/Page.vue`
- `apps/user-web/src/pages/diet-record/history-data/Page.vue`
- `apps/user-web/src/pages/health/self-test/Page.vue`

核心接口：

- `GET /app/health/diet/plan`
- `GET /app/health/diet/recipes`
- `GET /app/health/diet/recipes/{recipeId}`
- `GET /app/health/diet-records`
- `POST /app/health/diet-records`
- `GET /app/health/diet-records/history`
- `GET /app/health/self-tests`
- `GET /app/health/self-tests/{testId}`
- `POST /app/health/self-tests/{testId}/submit`
- `GET /app/health/self-tests/history`

### 4.6 服务目录、预约、订单、支付

前端页面位置：

- `apps/user-web/src/pages/service/home-care/Page.vue`
- `apps/user-web/src/pages/service/rehab-therapy/Page.vue`
- `apps/user-web/src/pages/service/home-exam/Page.vue`
- `apps/user-web/src/pages/service/elderly-care/Page.vue`
- `apps/user-web/src/pages/service/booking/Page.vue`
- `apps/user-web/src/pages/service/order-confirm/Page.vue`
- `apps/user-web/src/pages/service/order-detail/Page.vue`
- `apps/user-web/src/pages/service/order-edit/Page.vue`
- `apps/user-web/src/pages/service/service-track/Page.vue`
- `apps/user-web/src/pages/service/home-care-orders/Page.vue`
- `apps/user-web/src/pages/orders/rehab-therapy/Page.vue`
- `apps/user-web/src/pages/orders/willservice/service-record/Page.vue`
- `apps/user-web/src/pages/orders/willservice/assessment-report/Page.vue`
- `apps/user-web/src/pages/orders/willservice/rehab-report/Page.vue`
- `apps/user-web/src/pages/service/payment/Page.vue`
- `apps/user-web/src/pages/service/payment-result/Page.vue`

核心接口：

- `GET /app/services/categories`
- `GET /app/services/home-care`
- `GET /app/services/home-care/{serviceId}`
- `GET /app/services/rehab-therapy`
- `GET /app/services/rehab-therapy/{serviceId}`
- `GET /app/services/home-exam`
- `GET /app/services/home-exam/{serviceId}`
- `GET /app/services/elderly-care`
- `GET /app/services/elderly-care/{serviceId}`
- `GET /app/orders/booking/options`
- `POST /app/orders/preview`
- `POST /app/orders`
- `GET /app/orders`
- `GET /app/orders/{orderId}`
- `PUT /app/orders/{orderId}/schedule`
- `POST /app/orders/{orderId}/cancel`
- `GET /app/orders/{orderId}/timeline`
- `GET /app/orders/{orderId}/voucher`
- `GET /app/orders/{orderId}/service-records`
- `GET /app/orders/{orderId}/assessment-report`
- `GET /app/orders/{orderId}/rehab-report`
- `POST /app/orders/{orderId}/reviews`
- `GET /app/orders/{orderId}/reviews`
- `POST /app/orders/{orderId}/after-sales`
- `GET /app/orders/{orderId}/after-sales`
- `GET /app/payments/channels`
- `POST /app/payments`
- `GET /app/payments/{paymentId}`
- `POST /app/payments/{paymentId}/confirm`

### 4.7 健康内容

前端页面位置：

- `apps/user-web/src/pages/content/health-news/Page.vue`
- `apps/user-web/src/pages/content/health-news-detail/Page.vue`
- `apps/user-web/src/pages/content/health-lecture/Page.vue`
- `apps/user-web/src/pages/content/health-lecture-detail/Page.vue`
- `apps/user-web/src/pages/content/disease-guide/Page.vue`
- `apps/user-web/src/pages/content/disease-detail/Page.vue`

核心接口：

- `GET /app/content/news`
- `GET /app/content/news/{newsId}`
- `POST /app/content/news/{newsId}/like`
- `POST /app/content/news/{newsId}/favorite`
- `POST /app/content/news/{newsId}/share`
- `GET /app/content/lectures`
- `GET /app/content/lectures/{lectureId}`
- `POST /app/content/lectures/{lectureId}/like`
- `POST /app/content/lectures/{lectureId}/favorite`
- `GET /app/content/diseases/departments`
- `GET /app/content/diseases`
- `GET /app/content/diseases/{diseaseId}`

### 4.8 社区与活动

前端页面位置：

- `apps/user-web/src/pages/community/circle/Page.vue`
- `apps/user-web/src/pages/community/publish/Page.vue`
- `apps/user-web/src/pages/community/post-detail/Page.vue`
- `apps/user-web/src/pages/community/senior-activities/Page.vue`
- `apps/user-web/src/pages/community/senior-activity-detail/Page.vue`
- `apps/user-web/src/pages/home/MyJ/myactivity/Page.vue`

核心接口：

- `GET /app/community/topics`
- `GET /app/community/posts`
- `POST /app/community/posts`
- `GET /app/community/posts/{postId}`
- `PUT /app/community/posts/{postId}`
- `DELETE /app/community/posts/{postId}`
- `POST /app/community/posts/{postId}/like`
- `POST /app/community/posts/{postId}/favorite`
- `GET /app/community/posts/{postId}/comments`
- `POST /app/community/posts/{postId}/comments`
- `POST /app/community/posts/{postId}/share`
- `GET /app/community/activities`
- `GET /app/community/activities/{activityId}`
- `POST /app/community/activities/{activityId}/register`
- `POST /app/community/activities/{activityId}/cancel`
- `GET /app/community/activities/my`

### 4.9 消息与医生咨询

前端页面位置：

- `apps/user-web/src/pages/home/message/Page.vue`
- `apps/user-web/src/pages/home/doctor-chat/Page.vue`
- `apps/user-web/src/pages/home/message-like-detail/Page.vue`
- `apps/user-web/src/pages/home/message-comment-detail/Page.vue`

核心接口：

- `GET /app/messages/overview`
- `GET /app/messages/notices`
- `POST /app/messages/notices/read`
- `GET /app/conversations`
- `POST /app/conversations/doctor`
- `GET /app/conversations/{conversationId}/messages`
- `POST /app/conversations/{conversationId}/messages`
- `POST /app/conversations/{conversationId}/read`

### 4.10 文件上传

前端页面位置：

- `apps/user-web/src/pages/healthdocs/report-upload/Page.vue`
- `apps/user-web/src/pages/community/publish/Page.vue`
- `apps/user-web/src/pages/home/MyJ/profile-info/Page.vue`
- `apps/user-web/src/pages/home/doctor-chat/Page.vue`

核心接口：

- `POST /app/files/presign`
- `POST /app/files/complete`
- `GET /app/files/{fileId}`

## 5. 最小冒烟用例（前端联调第一天建议）

```bash
curl -s "$BASE_URL/app/home/dashboard" -H "Authorization: Bearer $APP_TOKEN"
curl -s "$BASE_URL/app/health/archive/summary" -H "Authorization: Bearer $APP_TOKEN"
curl -s "$BASE_URL/app/health/metrics/overview" -H "Authorization: Bearer $APP_TOKEN"
curl -s "$BASE_URL/app/services/categories" -H "Authorization: Bearer $APP_TOKEN"
curl -s "$BASE_URL/app/orders?page=1&pageSize=10" -H "Authorization: Bearer $APP_TOKEN"
curl -s "$BASE_URL/app/content/news?page=1&pageSize=10" -H "Authorization: Bearer $APP_TOKEN"
curl -s "$BASE_URL/app/community/posts?page=1&pageSize=10" -H "Authorization: Bearer $APP_TOKEN"
curl -s "$BASE_URL/app/messages/overview" -H "Authorization: Bearer $APP_TOKEN"
```

## 6. 联调断言

- 响应包装固定为：`code/message/requestId/data`
- 成功：`code = 0`
- 未登录或 token 失效：`code = 40003`
- 无权限：`code = 40004`
- 参数不合法：`code = 40001` 或 `42200`

## 7. 常见问题

- 返回空列表：先执行 `npm run db:seed:backend`
- 404：先确认路径是否带 `/app` 前缀
- 401/40003：先确认 token 是否过期，是否传 `Bearer <token>`
- 页面与接口不一致：以本文档“页面代码位置”对应段落优先排查
