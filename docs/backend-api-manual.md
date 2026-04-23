# 智诊康养后端 API 手册

更新时间：`2026-04-22`

## 1. 文档说明

本文档基于当前后端控制器真实实现编写，覆盖 `apps/backend/src/modules/**/*controller.ts` 中已挂载的 HTTP 接口，共 `194` 个 API。文档目标是为前后端联调、测试验收、后台接入和内部智能体接入提供统一的 API 手册。

为便于后续接口扩展与 Swagger 对齐，API 分册已按 `系统层 / 用户端 / 后台端 / 内部治理层` 四级视角重新组织；新增后台模块时，建议优先归入“后台端”总册，再在其下新增模块分册。

本文档适用对象：

- 用户端开发
- 后台端开发
- 测试与联调人员
- 需要调用内部智能体接口的后端或运维同学

说明约定：

- 所有接口均默认带全局前缀 `/api/v1`。
- 表格中的“方法与路径”均写完整路径。
- “鉴权”统一使用 `无需鉴权`、`APP_TOKEN`、`ADMIN_TOKEN`、`ADMIN_TOKEN + 内部校验` 四种口径。
- “含义与使用方式”同时说明接口用途和典型调用场景。

---

## 2. 通用约定

### 2.1 Base URL

当前前端联调默认地址：

- API Base URL：`http://server.mctown.online:8190/api/v1`
- Swagger UI：`http://server.mctown.online:8190/api/v1/docs`
- OpenAPI JSON：`http://server.mctown.online:8190/api/v1/docs/json`

说明：

- 前端联调默认应使用可访问的 IP 或域名地址，不要默认写 `localhost`。
- `localhost` 只表示当前访问设备自身；当前端页面不与后端运行在同一台机器上时，会直接导致“无法连接后端接口”。
- 如需切换环境，可通过 `VITE_API_BASE_URL` 覆盖前端默认地址。

### 2.2 鉴权规则

| 类型 | 说明 |
| --- | --- |
| `APP_TOKEN` | 通过 `POST /api/v1/app/auth/login/password` 或其他用户端登录接口获取，适用于用户端业务接口 |
| `ADMIN_TOKEN` | 通过 `POST /api/v1/admin/auth/login/password` 获取，适用于后台接口 |
| `ADMIN_TOKEN + 内部校验` | 访问 `/api/v1/internal/agents/*` 时使用；除后台 token 外，还需满足来源 IP 白名单，且在配置共享密钥时传 `X-Internal-Token` |

Swagger 中 Bearer Token 的填写方式：

```text
Bearer <accessToken>
```

### 2.3 通用响应结构

成功响应：

```json
{
  "code": 0,
  "message": "ok",
  "requestId": "req_xxx",
  "data": {}
}
```

错误响应：

```json
{
  "code": 40001,
  "message": "error message",
  "requestId": "req_xxx",
  "data": null
}
```

### 2.4 常见业务错误码

| 业务码 | 含义 |
| --- | --- |
| `40001` | 请求参数错误 |
| `40003` | 未认证或 token 无效 |
| `40004` | 无权限访问 |
| `40400` | 资源不存在 |
| `40900` | 状态冲突 |
| `42200` | 语义校验失败 |
| `50000` | 服务内部错误 |

### 2.5 通用查询参数

当前多个分页接口复用同一分页 DTO，常见参数如下：

| 参数 | 含义 |
| --- | --- |
| `page` | 页码，默认从 `1` 开始 |
| `pageSize` | 每页条数 |
| `elderId` | 家属代长者查询时指定长者用户 ID |
| `status` | 状态筛选 |
| `keyword` | 搜索关键词 |

### 2.6 典型调用链

#### 2.6.1 用户登录链路

1. `POST /api/v1/app/auth/login/password`
2. 保存 `data.accessToken`
3. 带 `APP_TOKEN` 调用 `/api/v1/app/*`

#### 2.6.2 下单支付链路

1. `GET /api/v1/app/orders/booking/options`
2. `POST /api/v1/app/orders/preview`
3. `POST /api/v1/app/orders`
4. `POST /api/v1/app/payments`
5. `POST /api/v1/app/payments/:paymentId/confirm`

#### 2.6.3 文件上传链路

1. `POST /api/v1/app/files/presign`
2. 直接向 MinIO 上传文件
3. `POST /api/v1/app/files/complete`

#### 2.6.4 AI 助手链路

1. `POST /api/v1/app/ai/assistant/conversations`
2. `POST /api/v1/app/ai/assistant/conversations/:conversationId/messages`
3. 按需调用 `health-summary`、`service-recommendations`、`knowledge/search` 等能力接口

---

## 3. API 分册

### 3.1 系统层

系统层用于承载联调入口、系统健康检查、公开协议等基础接口。这一层接口优先保证“可发现、可自检、可直接访问”。

#### 3.1.1 系统检查模块（`system`）

模块归属：`apps/backend/src/modules/system`

| API 名称 | 方法与路径 | 鉴权 | 含义与使用方式 |
| --- | --- | --- | --- |
| 获取服务健康状态 | `GET /api/v1/system/health` | 无需鉴权 | 联调或部署后第一个检查接口，用于确认 PostgreSQL、Redis、MinIO 是否可用。 |
| 获取系统架构摘要 | `GET /api/v1/system/architecture` | 无需鉴权 | 返回后端架构模式、技术栈和 bounded contexts，适合排障与系统说明。 |

#### 3.1.2 公开协议模块（`auth` / public）

模块归属：`apps/backend/src/modules/auth`

| API 名称 | 方法与路径 | 鉴权 | 含义与使用方式 |
| --- | --- | --- | --- |
| 获取隐私协议 | `GET /api/v1/app/agreements/privacy` | 无需鉴权 | 登录页、隐私协议弹窗等页面直接调用，无需登录态。 |

### 3.2 用户端

用户端接口统一以 `/api/v1/app/*` 为主路径前缀；在 Swagger 中建议以 `用户端 / 模块名` 标签进行查看，以便和手册目录保持一致。

#### 3.2.1 用户认证模块（`auth`）

模块归属：`apps/backend/src/modules/auth`

| API 名称 | 方法与路径 | 鉴权 | 含义与使用方式 |
| --- | --- | --- | --- |
| 发送短信验证码 | `POST /api/v1/app/auth/sms/send` | 无需鉴权 | 输入 `phone`，可选 `purpose`，用于短信登录或重置密码前获取验证码。 |
| 用户端密码登录 | `POST /api/v1/app/auth/login/password` | 无需鉴权 | 输入 `phone` 和 `password` 获取 `APP_TOKEN`，是用户端联调首选登录入口。 |
| 用户端短信登录 | `POST /api/v1/app/auth/login/sms` | 无需鉴权 | 输入手机号和短信验证码完成登录，适合验证验证码登录流程。 |
| 用户端第三方登录 | `POST /api/v1/app/auth/login/third-party` | 无需鉴权 | 用于模拟微信等第三方登录，当前联调环境默认支持 `provider=wechat`。 |
| 校验重置密码验证码 | `POST /api/v1/app/auth/password/verify-code` | 无需鉴权 | 忘记密码场景先调用此接口确认验证码有效，再进入重置密码提交。 |
| 重置密码 | `POST /api/v1/app/auth/password/reset` | 无需鉴权 | 提交手机号、验证码和新密码，成功后用新密码重新登录。 |
| 刷新用户端 Token | `POST /api/v1/app/auth/token/refresh` | 无需鉴权 | 当用户端 access token 过期时，用 refresh token 换取新的登录态。 |
| 用户端退出登录 | `POST /api/v1/app/auth/logout` | `APP_TOKEN` | 清理当前登录态；联调时先在 Swagger 中填入用户 token。 |

#### 3.2.2 用户中心模块（`users`）

模块归属：`apps/backend/src/modules/users`

| API 名称 | 方法与路径 | 鉴权 | 含义与使用方式 |
| --- | --- | --- | --- |
| 获取当前登录用户 | `GET /api/v1/app/users/me` | `APP_TOKEN` | 获取当前登录用户基本信息，适合作为页面初始化身份校验接口。 |
| 获取个人主页信息 | `GET /api/v1/app/users/me/profile` | `APP_TOKEN` | 个人中心主页接口，用于展示昵称、头像、城市等信息。 |
| 获取账号与安全信息 | `GET /api/v1/app/users/me/security` | `APP_TOKEN` | 账号安全页使用，查看手机号、实名状态、安全概览。 |
| 获取设置详情 | `GET /api/v1/app/users/me/settings` | `APP_TOKEN` | 设置页进入时调用，用于回显通知、短信等配置。 |
| 更新消息设置 | `PUT /api/v1/app/users/me/settings/message` | `APP_TOKEN` | 提交消息通知相关开关，如系统通知、订单通知、健康提醒等。 |
| 获取积分概览与明细 | `GET /api/v1/app/users/me/points` | `APP_TOKEN` | 个人中心积分页接口，支持分页查看积分流水。 |
| 获取我的足迹 | `GET /api/v1/app/users/me/footprints` | `APP_TOKEN` | 浏览记录页接口，支持分页查询最近访问内容。 |
| 清空我的足迹 | `DELETE /api/v1/app/users/me/footprints` | `APP_TOKEN` | 用户主动清空足迹历史时调用。 |
| 获取我参加的活动 | `GET /api/v1/app/users/me/activities` | `APP_TOKEN` | 个人中心“我参加的活动”列表接口。 |
| 获取我的评价列表 | `GET /api/v1/app/users/me/reviews` | `APP_TOKEN` | 个人中心查看已提交订单评价时调用。 |
| 获取优惠券列表 | `GET /api/v1/app/users/me/coupons` | `APP_TOKEN` | 优惠券页接口，可按 `status` 查看未使用、已使用、已过期券。 |
| 更新个人资料 | `PUT /api/v1/app/users/me/profile` | `APP_TOKEN` | 保存昵称、头像、城市、性别、生日等个人资料。 |
| 提交实名认证资料 | `PUT /api/v1/app/users/me/real-name` | `APP_TOKEN` | 提交 `realName` 与 `idCard`，用于实名认证流程。 |

#### 3.2.3 首页模块（`users` / home）

模块归属：`apps/backend/src/modules/users`

| API 名称 | 方法与路径 | 鉴权 | 含义与使用方式 |
| --- | --- | --- | --- |
| 获取首页聚合数据 | `GET /api/v1/app/home/dashboard` | `APP_TOKEN` | 用户端首页核心聚合接口，返回多卡片首页数据。 |

#### 3.2.4 定位模块（`users` / location）

模块归属：`apps/backend/src/modules/users`

| API 名称 | 方法与路径 | 鉴权 | 含义与使用方式 |
| --- | --- | --- | --- |
| 获取当前定位城市 | `GET /api/v1/app/locations/current` | `APP_TOKEN` | 首页或服务页进入时调用，用于判断当前城市。 |
| 获取城市地区列表 | `GET /api/v1/app/locations/cities` | `APP_TOKEN` | 城市切换器使用，返回可选城市地区列表。 |

#### 3.2.5 搜索模块（`users` / search）

模块归属：`apps/backend/src/modules/users`

| API 名称 | 方法与路径 | 鉴权 | 含义与使用方式 |
| --- | --- | --- | --- |
| 获取热搜标签 | `GET /api/v1/app/search/hot-tags` | `APP_TOKEN` | 搜索页默认推荐词列表。 |
| 获取搜索历史 | `GET /api/v1/app/search/history` | `APP_TOKEN` | 搜索页回显用户最近搜索历史。 |
| 记录搜索历史 | `POST /api/v1/app/search/history` | `APP_TOKEN` | 用户触发搜索后写入一条历史记录。 |
| 清空搜索历史 | `DELETE /api/v1/app/search/history` | `APP_TOKEN` | 用户手动清空搜索记录时调用。 |
| 执行全局搜索 | `GET /api/v1/app/search/global` | `APP_TOKEN` | 输入 `keyword` 执行聚合搜索，支持分页。 |

#### 3.2.6 家庭与地址模块（`family`）

模块归属：`apps/backend/src/modules/family`

| API 名称 | 方法与路径 | 鉴权 | 含义与使用方式 |
| --- | --- | --- | --- |
| 获取家属绑定关系 | `GET /api/v1/app/family/bindings` | `APP_TOKEN` | 查看当前用户与长者之间的绑定与关系标签。 |
| 获取地址列表 | `GET /api/v1/app/family/addresses` | `APP_TOKEN` | 下单或地址管理页先调用，拿到可用地址列表。 |
| 新增地址 | `POST /api/v1/app/family/addresses` | `APP_TOKEN` | 地址管理页新增地址，需提交收件人、手机号、省市区和详细地址。 |
| 更新地址 | `PUT /api/v1/app/family/addresses/:addressId` | `APP_TOKEN` | 编辑已有地址时调用，`addressId` 来自地址列表。 |

#### 3.2.7 健康档案模块（`health-archive`）

模块归属：`apps/backend/src/modules/health-archive`

说明：本模块多个接口支持 `elderId`，用于家属查看或维护长者档案。

| API 名称 | 方法与路径 | 鉴权 | 含义与使用方式 |
| --- | --- | --- | --- |
| 获取健康档案摘要 | `GET /api/v1/app/health/archive/summary` | `APP_TOKEN` | 健康档案首页先调用，用于查看档案总览、风险标签和最近提醒。 |
| 获取基础信息 | `GET /api/v1/app/health/archive/basic-info` | `APP_TOKEN` | 基础信息编辑页回填接口。 |
| 更新基础信息 | `PUT /api/v1/app/health/archive/basic-info` | `APP_TOKEN` | 保存姓名、生日、地址、身高体重、紧急联系人等档案字段。 |
| 获取病史与长期记忆 | `GET /api/v1/app/health/archive/medical-history` | `APP_TOKEN` | 病史页和照护偏好页进入时调用。 |
| 更新病史与长期记忆 | `PUT /api/v1/app/health/archive/medical-history` | `APP_TOKEN` | 保存 `medicalHistory`、`riskTags`、`longTermMemory` 等字段。 |

#### 3.2.8 健康数据与设备模块（`health-metrics`）

模块归属：`apps/backend/src/modules/health-metrics`

说明：

- `metricKey` 支持 `steps`、`heartRate`、`sleep`、`weight`、`bloodSugar`、`bloodPressure`、`oxygen`、`stress`
- 多数接口支持 `elderId`

##### 指标接口

| API 名称 | 方法与路径 | 鉴权 | 含义与使用方式 |
| --- | --- | --- | --- |
| 获取健康指标总览 | `GET /api/v1/app/health/metrics/overview` | `APP_TOKEN` | 健康数据首页首屏接口，返回评分、摘要卡片和设备概览。 |
| 获取单项指标趋势 | `GET /api/v1/app/health/metrics/:metricKey/trend` | `APP_TOKEN` | 单项指标详情页趋势图接口。 |
| 获取单项指标记录列表 | `GET /api/v1/app/health/metrics/:metricKey/records` | `APP_TOKEN` | 单项指标历史记录分页列表，后续编辑或删除要先拿到 `recordId`。 |
| 新增指标记录 | `POST /api/v1/app/health/metrics/:metricKey/records` | `APP_TOKEN` | 手工录入健康数据时调用，常用字段包括 `value`、`unit`、`measuredAt`。 |
| 更新指标记录 | `PUT /api/v1/app/health/metrics/:metricKey/records/:recordId` | `APP_TOKEN` | 编辑已有指标记录。 |
| 删除指标记录 | `DELETE /api/v1/app/health/metrics/:metricKey/records/:recordId` | `APP_TOKEN` | 删除某条指标历史记录。 |

##### 设备接口

| API 名称 | 方法与路径 | 鉴权 | 含义与使用方式 |
| --- | --- | --- | --- |
| 获取设备列表 | `GET /api/v1/app/health/devices` | `APP_TOKEN` | 设备中心首页接口。 |
| 获取设备详情 | `GET /api/v1/app/health/devices/:deviceId` | `APP_TOKEN` | 设备详情页回显设备状态、电量和设置摘要。 |
| 手动绑定设备 | `POST /api/v1/app/health/devices/bind` | `APP_TOKEN` | 输入 `serialNo` 和 `type` 绑定设备。 |
| 扫码绑定设备 | `POST /api/v1/app/health/devices/scan/bind` | `APP_TOKEN` | 扫码得到序列号后，按同样数据结构绑定设备。 |
| 解绑设备 | `DELETE /api/v1/app/health/devices/:deviceId` | `APP_TOKEN` | 设备详情页解除绑定。 |
| 更新设备设置 | `PUT /api/v1/app/health/devices/:deviceId/settings` | `APP_TOKEN` | 保存设备设置对象，如提醒开关、同步频率等。 |
| 更新设备密码 | `PUT /api/v1/app/health/devices/:deviceId/password` | `APP_TOKEN` | 保存设备密码。 |
| 更新心率预警设置 | `PUT /api/v1/app/health/devices/:deviceId/heart-rate-settings` | `APP_TOKEN` | 保存心率阈值与提醒开关。 |
| 获取设备测量记录 | `GET /api/v1/app/health/devices/:deviceId/measurements` | `APP_TOKEN` | 设备详情页查看设备上报的测量记录。 |

##### 用药接口

| API 名称 | 方法与路径 | 鉴权 | 含义与使用方式 |
| --- | --- | --- | --- |
| 获取今日用药提醒 | `GET /api/v1/app/health/medications/today` | `APP_TOKEN` | 用药首页先调用，查看今日应服药项目。 |
| 获取用药列表 | `GET /api/v1/app/health/medications` | `APP_TOKEN` | 用药计划列表页接口。 |
| 新增用药计划 | `POST /api/v1/app/health/medications` | `APP_TOKEN` | 新增药品名称、剂量、频次、开始日期等信息。 |
| 更新用药计划 | `PUT /api/v1/app/health/medications/:medicationId` | `APP_TOKEN` | 编辑用药计划。 |
| 删除用药计划 | `DELETE /api/v1/app/health/medications/:medicationId` | `APP_TOKEN` | 删除不再使用的用药计划。 |
| 记录服药 | `POST /api/v1/app/health/medications/:medicationId/take` | `APP_TOKEN` | 用户点击“已服药”后写入一条服药日志。 |

#### 3.2.9 健康膳食与自测模块（`health-lifestyle`）

模块归属：`apps/backend/src/modules/health-lifestyle`

##### 膳食接口

| API 名称 | 方法与路径 | 鉴权 | 含义与使用方式 |
| --- | --- | --- | --- |
| 获取健康膳食首页 | `GET /api/v1/app/health/diet/plan` | `APP_TOKEN` | 膳食首页聚合数据接口。 |
| 获取食谱列表 | `GET /api/v1/app/health/diet/recipes` | `APP_TOKEN` | 食谱列表页，支持按 `mealType` 和分页过滤。 |
| 获取食谱详情 | `GET /api/v1/app/health/diet/recipes/:recipeId` | `APP_TOKEN` | 食谱详情页接口。 |
| 获取饮食记录日报 | `GET /api/v1/app/health/diet-records` | `APP_TOKEN` | 查询某天饮食记录日报。 |
| 新增饮食记录 | `POST /api/v1/app/health/diet-records` | `APP_TOKEN` | 提交餐次、食物列表、总热量等数据。 |
| 获取饮食历史统计 | `GET /api/v1/app/health/diet-records/history` | `APP_TOKEN` | 饮食历史统计页接口，支持分页。 |

##### 自测接口

| API 名称 | 方法与路径 | 鉴权 | 含义与使用方式 |
| --- | --- | --- | --- |
| 获取自测项目列表 | `GET /api/v1/app/health/self-tests` | `APP_TOKEN` | 自测项目入口列表。 |
| 获取自测历史 | `GET /api/v1/app/health/self-tests/history` | `APP_TOKEN` | 用户自测历史记录页接口。 |
| 获取自测详情与题目 | `GET /api/v1/app/health/self-tests/:testId` | `APP_TOKEN` | 进入某个自测时先调用，获取题目与说明。 |
| 提交自测结果 | `POST /api/v1/app/health/self-tests/:testId/submit` | `APP_TOKEN` | 提交答案并生成自测结论。 |

#### 3.2.10 服务目录模块（`service-catalog`）

模块归属：`apps/backend/src/modules/service-catalog`

| API 名称 | 方法与路径 | 鉴权 | 含义与使用方式 |
| --- | --- | --- | --- |
| 获取服务分类 | `GET /api/v1/app/services/categories` | `APP_TOKEN` | 服务首页入口分类接口。 |
| 获取家政护理列表 | `GET /api/v1/app/services/home-care` | `APP_TOKEN` | 家政护理服务分页列表。 |
| 获取家政护理详情 | `GET /api/v1/app/services/home-care/:serviceId` | `APP_TOKEN` | 家政护理详情页接口。 |
| 获取康复理疗列表 | `GET /api/v1/app/services/rehab-therapy` | `APP_TOKEN` | 康复理疗项目分页列表。 |
| 获取康复理疗详情 | `GET /api/v1/app/services/rehab-therapy/:serviceId` | `APP_TOKEN` | 康复理疗详情页接口。 |
| 获取上门体检列表 | `GET /api/v1/app/services/home-exam` | `APP_TOKEN` | 上门体检服务分页列表。 |
| 获取上门体检详情 | `GET /api/v1/app/services/home-exam/:serviceId` | `APP_TOKEN` | 上门体检详情页接口。 |
| 获取养老机构列表 | `GET /api/v1/app/services/elderly-care` | `APP_TOKEN` | 养老机构分页列表。 |
| 获取养老机构详情 | `GET /api/v1/app/services/elderly-care/:serviceId` | `APP_TOKEN` | 养老机构详情页接口。 |

#### 3.2.11 订单与预约模块（`orders` / app）

模块归属：`apps/backend/src/modules/orders`

| API 名称 | 方法与路径 | 鉴权 | 含义与使用方式 |
| --- | --- | --- | --- |
| 获取预约选项 | `GET /api/v1/app/orders/booking/options` | `APP_TOKEN` | 预约页进入时调用，返回可约日期、时间段、地址候选等信息。 |
| 预览订单 | `POST /api/v1/app/orders/preview` | `APP_TOKEN` | 订单确认前预估价格、摘要、优惠信息。 |
| 创建订单 | `POST /api/v1/app/orders` | `APP_TOKEN` | 提交服务预约，成功后获得 `orderId`。 |
| 获取订单列表 | `GET /api/v1/app/orders` | `APP_TOKEN` | 我的订单页接口，支持 `status` 过滤。 |
| 获取订单详情 | `GET /api/v1/app/orders/:orderId` | `APP_TOKEN` | 订单详情页接口。 |
| 修改预约时间 | `PUT /api/v1/app/orders/:orderId/schedule` | `APP_TOKEN` | 改约页保存接口。 |
| 取消订单 | `POST /api/v1/app/orders/:orderId/cancel` | `APP_TOKEN` | 订单详情页取消订单动作。 |
| 获取订单时间线 | `GET /api/v1/app/orders/:orderId/timeline` | `APP_TOKEN` | 服务跟踪页查看节点流转。 |
| 获取服务凭证 | `GET /api/v1/app/orders/:orderId/voucher` | `APP_TOKEN` | 查看服务凭证或服务码。 |
| 获取服务记录 | `GET /api/v1/app/orders/:orderId/service-records` | `APP_TOKEN` | 查看履约过程记录。 |
| 获取评估报告 | `GET /api/v1/app/orders/:orderId/assessment-report` | `APP_TOKEN` | 查看评估类报告。 |
| 获取康复报告 | `GET /api/v1/app/orders/:orderId/rehab-report` | `APP_TOKEN` | 查看康复类报告。 |
| 提交订单评价 | `POST /api/v1/app/orders/:orderId/reviews` | `APP_TOKEN` | 评价页提交评分、标签和评价内容。 |
| 获取订单评价 | `GET /api/v1/app/orders/:orderId/reviews` | `APP_TOKEN` | 订单详情页回显已有评价。 |
| 提交售后申请 | `POST /api/v1/app/orders/:orderId/after-sales` | `APP_TOKEN` | 订单售后申请入口。 |
| 获取售后记录 | `GET /api/v1/app/orders/:orderId/after-sales` | `APP_TOKEN` | 查看售后进度与历史记录。 |

#### 3.2.12 支付模块（`payments`）

模块归属：`apps/backend/src/modules/payments`

| API 名称 | 方法与路径 | 鉴权 | 含义与使用方式 |
| --- | --- | --- | --- |
| 获取支付渠道 | `GET /api/v1/app/payments/channels` | `APP_TOKEN` | 支付页先调用，加载可用支付方式。 |
| 创建支付单 | `POST /api/v1/app/payments` | `APP_TOKEN` | 输入 `orderId` 与支付渠道，生成 `paymentId`。 |
| 获取支付单详情 | `GET /api/v1/app/payments/:paymentId` | `APP_TOKEN` | 支付结果页或轮询支付状态时使用。 |
| 确认支付 | `POST /api/v1/app/payments/:paymentId/confirm` | `APP_TOKEN` | 联调环境模拟支付完成后的确认动作。 |

#### 3.2.13 体检报告模块（`reports` / app）

模块归属：`apps/backend/src/modules/reports`

| API 名称 | 方法与路径 | 鉴权 | 含义与使用方式 |
| --- | --- | --- | --- |
| 获取体检报告列表 | `GET /api/v1/app/health/reports/checkups` | `APP_TOKEN` | 体检报告列表页首接口，支持分页。 |
| 上传体检报告 | `POST /api/v1/app/health/reports/checkups` | `APP_TOKEN` | 报告上传页提交接口，通常与文件上传接口联动。 |
| 获取体检报告详情 | `GET /api/v1/app/health/reports/checkups/:reportId` | `APP_TOKEN` | 报告详情页接口。 |
| 删除体检报告 | `DELETE /api/v1/app/health/reports/checkups/:reportId` | `APP_TOKEN` | 删除已上传报告。 |
| 获取报告解读 | `GET /api/v1/app/health/reports/checkups/:reportId/interpretation` | `APP_TOKEN` | 非 AI 版解读接口，可与 AI 解读接口配合使用。 |

#### 3.2.14 文件上传模块（`files`）

模块归属：`apps/backend/src/modules/files`

| API 名称 | 方法与路径 | 鉴权 | 含义与使用方式 |
| --- | --- | --- | --- |
| 获取上传凭证 | `POST /api/v1/app/files/presign` | `APP_TOKEN` | 上传前先申请预签名 URL，需提交文件分类、文件名、类型和大小。 |
| 通知上传完成并落库 | `POST /api/v1/app/files/complete` | `APP_TOKEN` | 文件传到 MinIO 后调用，将对象信息写入业务库。 |
| 获取文件信息 | `GET /api/v1/app/files/:fileId` | `APP_TOKEN` | 根据 `fileId` 查询文件元数据与访问地址。 |

#### 3.2.15 消息与咨询模块（`messaging`）

模块归属：`apps/backend/src/modules/messaging`

| API 名称 | 方法与路径 | 鉴权 | 含义与使用方式 |
| --- | --- | --- | --- |
| 获取消息聚合概览 | `GET /api/v1/app/messages/overview` | `APP_TOKEN` | 消息中心首页概览接口。 |
| 获取通知列表 | `GET /api/v1/app/messages/notices` | `APP_TOKEN` | 按通知类型分页查询通知列表。 |
| 批量已读通知 | `POST /api/v1/app/messages/notices/read` | `APP_TOKEN` | 批量标记通知为已读，可提交 `noticeIds`。 |
| 获取会话列表 | `GET /api/v1/app/conversations` | `APP_TOKEN` | 获取当前用户参与的会话列表。 |
| 创建医生咨询会话 | `POST /api/v1/app/conversations/doctor` | `APP_TOKEN` | 发起医生咨询会话，可带 `doctorUserId` 和 `topic`。 |
| 获取会话消息列表 | `GET /api/v1/app/conversations/:conversationId/messages` | `APP_TOKEN` | 会话详情页获取历史消息，支持分页。 |
| 发送会话消息 | `POST /api/v1/app/conversations/:conversationId/messages` | `APP_TOKEN` | 在医生咨询或其他会话中发送文本、图片、音频消息。 |
| 会话已读 | `POST /api/v1/app/conversations/:conversationId/read` | `APP_TOKEN` | 打开会话后将当前会话标记为已读。 |

#### 3.2.16 健康内容模块（`content`）

模块归属：`apps/backend/src/modules/content`

##### 资讯接口

| API 名称 | 方法与路径 | 鉴权 | 含义与使用方式 |
| --- | --- | --- | --- |
| 获取健康资讯列表 | `GET /api/v1/app/content/news` | `APP_TOKEN` | 资讯列表页接口，支持按 `sort` 排序和分页。 |
| 获取资讯详情 | `GET /api/v1/app/content/news/:newsId` | `APP_TOKEN` | 资讯详情页接口。 |
| 点赞资讯 | `POST /api/v1/app/content/news/:newsId/like` | `APP_TOKEN` | 资讯详情页点赞按钮接口。 |
| 收藏资讯 | `POST /api/v1/app/content/news/:newsId/favorite` | `APP_TOKEN` | 资讯详情页收藏按钮接口。 |
| 记录资讯分享 | `POST /api/v1/app/content/news/:newsId/share` | `APP_TOKEN` | 用户点击分享动作时记录一条分享行为。 |
| 获取资讯评论列表 | `GET /api/v1/app/content/news/:newsId/comments` | `APP_TOKEN` | 资讯评论区分页列表接口。 |
| 发表评论资讯评论 | `POST /api/v1/app/content/news/:newsId/comments` | `APP_TOKEN` | 在资讯详情页提交评论或回复。 |

##### 讲堂接口

| API 名称 | 方法与路径 | 鉴权 | 含义与使用方式 |
| --- | --- | --- | --- |
| 获取健康讲堂列表 | `GET /api/v1/app/content/lectures` | `APP_TOKEN` | 健康讲堂列表页接口。 |
| 获取讲堂详情 | `GET /api/v1/app/content/lectures/:lectureId` | `APP_TOKEN` | 讲堂详情页接口。 |
| 点赞讲堂 | `POST /api/v1/app/content/lectures/:lectureId/like` | `APP_TOKEN` | 讲堂详情页点赞接口。 |
| 收藏讲堂 | `POST /api/v1/app/content/lectures/:lectureId/favorite` | `APP_TOKEN` | 讲堂详情页收藏接口。 |
| 记录讲堂分享 | `POST /api/v1/app/content/lectures/:lectureId/share` | `APP_TOKEN` | 记录讲堂分享动作。 |
| 获取讲堂评论列表 | `GET /api/v1/app/content/lectures/:lectureId/comments` | `APP_TOKEN` | 讲堂评论列表接口。 |
| 发表评论讲堂评论 | `POST /api/v1/app/content/lectures/:lectureId/comments` | `APP_TOKEN` | 讲堂详情页提交评论。 |

##### 疾病知识接口

| API 名称 | 方法与路径 | 鉴权 | 含义与使用方式 |
| --- | --- | --- | --- |
| 获取疾病科室分类 | `GET /api/v1/app/content/diseases/departments` | `APP_TOKEN` | 疾病知识入口先调用，用于显示科室分类。 |
| 获取疾病列表 | `GET /api/v1/app/content/diseases` | `APP_TOKEN` | 疾病知识列表页接口，支持 `departmentId` 和分页。 |
| 获取疾病详情 | `GET /api/v1/app/content/diseases/:diseaseId` | `APP_TOKEN` | 疾病详情页接口。 |

#### 3.2.17 社区与活动模块（`community`）

模块归属：`apps/backend/src/modules/community`

##### 社区帖子接口

| API 名称 | 方法与路径 | 鉴权 | 含义与使用方式 |
| --- | --- | --- | --- |
| 获取热门话题列表 | `GET /api/v1/app/community/topics` | `APP_TOKEN` | 社区首页热门话题列表。 |
| 获取帖子流 | `GET /api/v1/app/community/posts` | `APP_TOKEN` | 社区帖子流接口，支持 `topicId`、`feedType`、分页。 |
| 发布帖子 | `POST /api/v1/app/community/posts` | `APP_TOKEN` | 发布帖子，可提交内容、图片、标签。 |
| 获取帖子详情 | `GET /api/v1/app/community/posts/:postId` | `APP_TOKEN` | 帖子详情页接口。 |
| 编辑帖子 | `PUT /api/v1/app/community/posts/:postId` | `APP_TOKEN` | 作者编辑帖子内容、图片或标签时调用。 |
| 删除帖子 | `DELETE /api/v1/app/community/posts/:postId` | `APP_TOKEN` | 删除帖子。 |
| 点赞帖子 | `POST /api/v1/app/community/posts/:postId/like` | `APP_TOKEN` | 帖子点赞动作。 |
| 收藏帖子 | `POST /api/v1/app/community/posts/:postId/favorite` | `APP_TOKEN` | 帖子收藏动作。 |
| 记录帖子分享 | `POST /api/v1/app/community/posts/:postId/share` | `APP_TOKEN` | 帖子分享动作记录接口。 |
| 获取评论列表 | `GET /api/v1/app/community/posts/:postId/comments` | `APP_TOKEN` | 帖子评论区分页列表。 |
| 发表评论 | `POST /api/v1/app/community/posts/:postId/comments` | `APP_TOKEN` | 帖子详情页发表评论或回复。 |

##### 活动接口

| API 名称 | 方法与路径 | 鉴权 | 含义与使用方式 |
| --- | --- | --- | --- |
| 获取活动列表 | `GET /api/v1/app/community/activities` | `APP_TOKEN` | 活动列表页接口，支持 `status`、`sort` 和分页。 |
| 获取我参加的活动 | `GET /api/v1/app/community/activities/my` | `APP_TOKEN` | 查看当前用户已报名活动。 |
| 获取活动详情 | `GET /api/v1/app/community/activities/:activityId` | `APP_TOKEN` | 活动详情页接口。 |
| 点赞活动 | `POST /api/v1/app/community/activities/:activityId/like` | `APP_TOKEN` | 活动点赞动作。 |
| 收藏活动 | `POST /api/v1/app/community/activities/:activityId/favorite` | `APP_TOKEN` | 活动收藏动作。 |
| 记录活动分享 | `POST /api/v1/app/community/activities/:activityId/share` | `APP_TOKEN` | 活动分享行为记录。 |
| 获取活动评论列表 | `GET /api/v1/app/community/activities/:activityId/comments` | `APP_TOKEN` | 活动评论区分页列表。 |
| 发表评论活动评论 | `POST /api/v1/app/community/activities/:activityId/comments` | `APP_TOKEN` | 活动详情页提交评论。 |
| 活动报名 | `POST /api/v1/app/community/activities/:activityId/register` | `APP_TOKEN` | 活动报名动作接口，可附带备注。 |
| 取消活动报名 | `POST /api/v1/app/community/activities/:activityId/cancel` | `APP_TOKEN` | 活动报名后取消时调用。 |

#### 3.2.18 AI 助手模块（`agents` / app）

模块归属：`apps/backend/src/modules/agents`

说明：

- 本节接口统一挂在 `/api/v1/app/ai`
- 返回结果除了业务数据，还可能包含 AI trace、citation、taskId 等辅助字段

##### 助手会话接口

| API 名称 | 方法与路径 | 鉴权 | 含义与使用方式 |
| --- | --- | --- | --- |
| 创建智能助手会话 | `POST /api/v1/app/ai/assistant/conversations` | `APP_TOKEN` | 进入智能助手前先创建会话，可选传入 `topic` 和欢迎语。 |
| 获取智能助手会话详情 | `GET /api/v1/app/ai/assistant/conversations/:conversationId` | `APP_TOKEN` | 查询会话元信息。 |
| 获取智能助手会话消息 | `GET /api/v1/app/ai/assistant/conversations/:conversationId/messages` | `APP_TOKEN` | 获取 AI 会话历史消息，支持分页。 |
| 发送智能助手消息并获取 AI 回复 | `POST /api/v1/app/ai/assistant/conversations/:conversationId/messages` | `APP_TOKEN` | 用户输入消息后调用，接口会返回 AI 回复与对应 `taskId`。 |

##### AI 业务能力接口

| API 名称 | 方法与路径 | 鉴权 | 含义与使用方式 |
| --- | --- | --- | --- |
| 生成 AI 服务推荐 | `POST /api/v1/app/ai/service-recommendations` | `APP_TOKEN` | 根据自然语言需求、档案和服务上下文生成推荐服务列表。 |
| 生成 AI 预约预填草稿 | `POST /api/v1/app/ai/order-prefill` | `APP_TOKEN` | 生成预约预填建议，用于下单前填充联系人、时间等信息。 |
| 生成 AI 健康摘要 | `GET /api/v1/app/ai/health-summary` | `APP_TOKEN` | 结合档案、指标、报告等生成健康摘要。 |
| 生成 AI 指标趋势解释 | `GET /api/v1/app/ai/health-metric-explanations` | `APP_TOKEN` | 对健康指标趋势做自然语言解释。 |
| 生成 AI 报告解读 | `GET /api/v1/app/ai/reports/:reportId/interpretation` | `APP_TOKEN` | 对指定报告做 AI 解读。 |
| 生成 AI 报告后续建议 | `GET /api/v1/app/ai/reports/:reportId/followup-suggestions` | `APP_TOKEN` | 基于报告输出后续建议与关注点。 |
| 获取 AI 风险提醒列表 | `GET /api/v1/app/ai/risk-alerts` | `APP_TOKEN` | 查看 AI 生成的风险提醒列表。 |
| 获取 AI 风险提醒详情 | `GET /api/v1/app/ai/risk-alerts/:alertId` | `APP_TOKEN` | 查看单条风险提醒详情。 |
| 检索 AI 知识库上下文 | `GET /api/v1/app/ai/knowledge/search` | `APP_TOKEN` | 面向用户端的知识检索接口，默认检索公共知识，`includePrivate=true` 时可联查授权私有知识。 |

### 3.3 后台端

后台端接口统一以 `/api/v1/admin/*` 为主路径前缀。后续新增运营、审核、配置、机构管理等能力时，建议继续在本总册下扩展新模块，保持后台 API 设计口径一致。

#### 3.3.1 后台认证模块（`auth` / admin）

模块归属：`apps/backend/src/modules/auth`

| API 名称 | 方法与路径 | 鉴权 | 含义与使用方式 |
| --- | --- | --- | --- |
| 后台密码登录 | `POST /api/v1/admin/auth/login/password` | 无需鉴权 | 输入后台手机号和密码获取 `ADMIN_TOKEN`。 |
| 刷新后台 Token | `POST /api/v1/admin/auth/token/refresh` | 无需鉴权 | 用后台 refresh token 换取新的后台 access token。 |
| 获取当前后台登录用户 | `GET /api/v1/admin/auth/me` | `ADMIN_TOKEN` | 检查后台 token 是否有效，并查看当前后台角色信息。 |

#### 3.3.2 后台工作台模块（`admin`）

模块归属：`apps/backend/src/modules/admin`

适用角色：`PLATFORM_ADMIN`、`ORG_MANAGER`、`DOCTOR`、`CAREGIVER`、`THERAPIST`、`CUSTOMER_SERVICE`

| API 名称 | 方法与路径 | 鉴权 | 含义与使用方式 |
| --- | --- | --- | --- |
| 获取后台总览数据 | `GET /api/v1/admin/dashboard/overview` | `ADMIN_TOKEN` | 后台首页首接口，加载统计卡片、待办事项和运营概览。 |
| 获取长者详情 | `GET /api/v1/admin/elders/:elderId` | `ADMIN_TOKEN` | 后台长者详情页接口。 |
| 获取工单列表 | `GET /api/v1/admin/work-orders` | `ADMIN_TOKEN` | 后台工单列表页接口，支持分页。 |

#### 3.3.3 后台订单调度模块（`orders` / admin）

模块归属：`apps/backend/src/modules/orders`

适用角色：`PLATFORM_ADMIN`、`ORG_MANAGER`、`DOCTOR`、`CAREGIVER`、`THERAPIST`、`CUSTOMER_SERVICE`

| API 名称 | 方法与路径 | 鉴权 | 含义与使用方式 |
| --- | --- | --- | --- |
| 后台获取订单列表 | `GET /api/v1/admin/orders` | `ADMIN_TOKEN` | 后台订单管理页接口，可按状态筛选。 |
| 后台获取订单详情 | `GET /api/v1/admin/orders/:orderId` | `ADMIN_TOKEN` | 后台订单详情页接口。 |
| 后台派单 | `POST /api/v1/admin/orders/:orderId/dispatch` | `ADMIN_TOKEN` | 分派机构、人员或排班。 |
| 更新工单状态 | `PUT /api/v1/admin/work-orders/:workOrderId/status` | `ADMIN_TOKEN` | 后台工单执行状态流转接口。 |

#### 3.3.4 后台报告审核模块（`reports` / admin）

模块归属：`apps/backend/src/modules/reports`

适用角色：`PLATFORM_ADMIN`、`ORG_MANAGER`、`DOCTOR`

| API 名称 | 方法与路径 | 鉴权 | 含义与使用方式 |
| --- | --- | --- | --- |
| 后台获取报告列表 | `GET /api/v1/admin/reports` | `ADMIN_TOKEN` | 后台报告管理页接口，支持按审核状态查询。 |
| 后台审核报告 | `PUT /api/v1/admin/reports/:reportId/review` | `ADMIN_TOKEN` | 后台审核操作接口，更新报告审核状态。 |

### 3.4 内部治理层

内部治理层接口面向后台管理链路、内部服务调用和运维排障，统一以 `/api/v1/internal/*` 为主路径前缀，不直接暴露给普通前端页面。

#### 3.4.1 内部智能体与 RAG 管理模块（`agents` / internal）

模块归属：`apps/backend/src/modules/agents`

适用范围：后台管理链路、内部服务调用、运维排障、质量治理。  
鉴权要求：`ADMIN_TOKEN + 内部校验`

| API 名称 | 方法与路径 | 鉴权 | 含义与使用方式 |
| --- | --- | --- | --- |
| 获取已注册 Agent 定义 | `GET /api/v1/internal/agents/definitions` | `ADMIN_TOKEN + 内部校验` | 返回代码里已注册、当前可执行的 Agent 定义。 |
| 获取统一多智能体蓝图 | `GET /api/v1/internal/agents/blueprint` | `ADMIN_TOKEN + 内部校验` | 返回多智能体蓝图、角色、工作流和治理规则。 |
| 创建 Agent 任务 | `POST /api/v1/internal/agents/tasks` | `ADMIN_TOKEN + 内部校验` | 提交一条内部 Agent 任务，创建后会自动入队执行。 |
| 查询 Agent 任务列表 | `GET /api/v1/internal/agents/tasks` | `ADMIN_TOKEN + 内部校验` | 按条件查询 Agent 任务列表。 |
| 获取 Agent 任务详情 | `GET /api/v1/internal/agents/tasks/:taskId` | `ADMIN_TOKEN + 内部校验` | 查看单条任务的状态、输出、trace、错误等信息。 |
| 重试 Agent 任务 | `POST /api/v1/internal/agents/tasks/:taskId/retry` | `ADMIN_TOKEN + 内部校验` | 对失败或需要重跑的任务重新入队。 |
| 查询人工复核队列 | `GET /api/v1/internal/agents/reviews` | `ADMIN_TOKEN + 内部校验` | 查看待处理或已处理的人工复核工单。 |
| 获取人工复核详情 | `GET /api/v1/internal/agents/reviews/:reviewId` | `ADMIN_TOKEN + 内部校验` | 查看某条复核工单详情及关联任务信息。 |
| 提交人工复核决策 | `POST /api/v1/internal/agents/reviews/:reviewId/decision` | `ADMIN_TOKEN + 内部校验` | 审核人员提交 `approved`、`blocked`、`rejected` 等决策。 |
| 查询智能体审计日志 | `GET /api/v1/internal/agents/audit-logs` | `ADMIN_TOKEN + 内部校验` | 查询 Agent 审计日志，便于追责和排查。 |
| 查询 RAG 知识库列表 | `GET /api/v1/internal/agents/rag/knowledge-bases` | `ADMIN_TOKEN + 内部校验` | 查看知识库类型、可见性、数据量和最近 ingestion 运行情况。 |
| 执行 RAG 检索 | `POST /api/v1/internal/agents/rag/search` | `ADMIN_TOKEN + 内部校验` | 按知识类型、可见性、ownerUserId、institutionId 执行内部检索。 |
| 查询 RAG 评测结果 | `GET /api/v1/internal/agents/rag/evals` | `ADMIN_TOKEN + 内部校验` | 查看评测运行列表，可按状态过滤。 |
| 获取 RAG 评测详情 | `GET /api/v1/internal/agents/rag/evals/:runId` | `ADMIN_TOKEN + 内部校验` | 查看某次评测的 summary 与 case 结果。 |

---

## 4. 附录：接口范围速查

### 4.1 分层与作用域速查

| 一级分册 | 覆盖模块 | 典型路径前缀 |
| --- | --- | --- |
| 系统层 | 系统检查、公开协议 | `/system/*`、`/app/agreements/*` |
| 用户端 | 用户认证、用户中心、首页、定位、搜索、家庭与地址、健康档案、健康数据与设备、健康膳食与自测、服务目录、订单与预约、支付、体检报告、文件上传、消息与咨询、健康内容、社区与活动、AI 助手 | `/app/*` |
| 后台端 | 后台认证、后台工作台、后台订单调度、后台报告审核 | `/admin/*` |
| 内部治理层 | 智能体定义、任务管理、人工复核、审计日志、RAG 检索、RAG 评测 | `/internal/agents/*` |

### 4.2 Swagger 对齐说明

1. Swagger 标签已按 `系统层 / 模块`、`用户端 / 模块`、`后台端 / 模块`、`内部治理层 / 模块` 的格式重排，便于与本手册目录一一对照。
2. 现有 Swagger UI 可以稳定支持“分层标签 + 固定排序 + 页面宽度优化 + 展开内容限高 + 一键复制当前接口地址”，适合联调和调试。
3. Swagger UI 原生不支持真正的多级树状导航；如果后续需要更强的目录分组能力，应考虑额外接入 ReDoc 或自定义 Swagger UI plugin。

### 4.3 推荐阅读顺序

1. 用户端联调先阅读：用户认证、用户中心、健康档案、健康数据与设备、服务目录、订单与预约、支付、AI 助手。
2. 后台联调先阅读：后台认证、后台工作台、后台订单调度、后台报告审核。
3. 智能体治理和 RAG 联调先阅读：AI 助手模块、内部智能体与 RAG 管理模块。

### 4.4 补充说明

- 更详细的后端实现与多智能体/RAG 设计，请继续阅读 [智诊康养后端开发文档](./智诊康养后端开发文档.md)。
- 面向 Swagger 页面操作的联调说明，请参考 [前端 Swagger 联调 API 操作手册](./frontend-api-integration-guide.md)。
