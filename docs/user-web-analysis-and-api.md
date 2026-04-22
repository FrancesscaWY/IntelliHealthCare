# 用户端 API 文档（业务全量版，含 AI 规划）

## 1. 文档目标

本文档基于当前用户端代码和《智诊康养项目说明书》重新整理，采用以下约束作为前提：

- 用户端所有占位页面、未实现页面、纯规划页面已经移除
- 当前 `apps/user-web/src/app/pages.manifest.json` 中的 82 个页面，统一视为“非 AI 场景下的完整业务页面范围”
- 不再保留“后续再补这些业务页”的任务定义
- 但仍保留 AI 相关页面与 AI 接口的后续规划

因此，本文档分成两部分：

1. 当前必须落地的非 AI 业务 API
2. 后续 AI 页面与 AI API 规划

## 2. 当前前端基线

### 2.1 页面基线

当前用户端共 82 个页面，全部为 `implemented`。

按业务域划分如下：

| 分组 | 页面数 |
| --- | ---: |
| `auth` | 4 |
| `community` | 5 |
| `content` | 5 |
| `diet-record` | 2 |
| `health` | 22 |
| `healthdocs` | 7 |
| `home` | 15 |
| `onboarding` | 1 |
| `orders` | 4 |
| `service` | 17 |

### 2.2 已移除的页面

以下页面不再属于当前用户端代码范围：

- `archive/health-records`
- `orders/order-management`
- `health/report-detail`

同时，用户端占位组件 `PagePlaceholder` 已移除，用户端运行时默认只承载真实页面组件。

### 2.3 当前业务范围

当前用户端默认已经覆盖以下非 AI 业务：

- 登录、忘记密码、重置密码、实名认证
- 首页、定位、搜索、消息、我的、设置、个人资料
- 健康档案、基础信息、病史、报告、报告上传、报告解读
- 健康数据、单指标详情、设备中心、设备详情、设备绑定、设备设置
- 用药信息、用药新增、用药编辑
- 健康膳食、食谱详情、饮食记录、历史数据
- 健康自测
- 家政护理、康复理疗、上门体检、养老机构等服务浏览
- 预约、订单确认、支付、支付结果、订单详情、改约、服务跟踪
- 订单列表、评估报告、服务记录、康复报告
- 健康资讯、健康讲堂、疾病宝典
- 生活圈、发帖、帖子详情、老年活动、活动详情
- 消息中心、医生咨询

### 2.4 当前不纳入“已落地业务”但需要保留规划的 AI 能力

- 智能康养助手
- AI 服务推荐
- AI 健康趋势解释
- AI 健康档案摘要
- AI 家属摘要
- AI 报告解读增强
- AI 风险提醒与回访建议

## 3. API 设计约定

### 3.1 Base URL

```text
/api/v1/app
```

### 3.2 鉴权

除登录、验证码、公开内容等开放接口外，其余接口统一要求：

```text
Authorization: Bearer <access_token>
```

### 3.3 通用响应结构

```json
{
  "code": 0,
  "message": "ok",
  "requestId": "req_20260420_xxx",
  "data": {}
}
```

### 3.4 分页结构

```json
{
  "list": [],
  "page": 1,
  "pageSize": 20,
  "total": 120,
  "hasMore": true
}
```

### 3.5 建议错误码

| code | 含义 |
| --- | --- |
| `0` | 成功 |
| `40001` | 参数错误 |
| `40003` | 未登录或令牌失效 |
| `40004` | 无权限 |
| `40400` | 资源不存在 |
| `40900` | 状态冲突 |
| `42200` | 业务校验失败 |
| `50000` | 服务端异常 |

## 4. 核心数据对象

### 4.1 用户对象

```json
{
  "userId": "u_1001",
  "name": "JOY",
  "phone": "13800138000",
  "avatar": "https://cdn.example.com/avatar.jpg",
  "gender": "female",
  "birthday": "1961-08-01",
  "realNameVerified": true
}
```

### 4.2 地址对象

```json
{
  "addressId": "addr_001",
  "receiverName": "王阿姨",
  "receiverPhone": "13800138000",
  "province": "上海市",
  "city": "上海市",
  "district": "浦东新区",
  "detailAddress": "丁香路168弄12号302",
  "isDefault": true
}
```

### 4.3 健康指标对象

```json
{
  "key": "bloodPressure",
  "label": "血压",
  "value": "128/82",
  "unit": "mmHg",
  "change": -3,
  "tone": "good"
}
```

### 4.4 设备对象

```json
{
  "deviceId": "watch-a001",
  "type": "watch",
  "name": "智能手表A001",
  "status": "online",
  "batteryText": "电量25%",
  "imageUrl": "https://cdn.example.com/watch.jpg"
}
```

### 4.5 订单对象

```json
{
  "orderId": "ord_001",
  "orderNo": "HC20260420001",
  "serviceCategory": "homeCare",
  "status": "awaiting_accept",
  "statusText": "待接单",
  "title": "家政护理 2 小时上门服务",
  "image": "https://cdn.example.com/service.jpg",
  "actualAmount": 148,
  "bookingDate": "2026-04-21",
  "bookingWeekday": "周三",
  "bookingTimeSlot": "09:00-11:00"
}
```

## 5. 当前业务 API

## 5.1 认证与账号

### 接口清单

| Method | Path | 描述 | 对应页面 |
| --- | --- | --- | --- |
| POST | `/auth/sms/send` | 发送验证码 | `auth/login`、`auth/forgot-password` |
| POST | `/auth/login/password` | 手机号密码登录 | `auth/login` |
| POST | `/auth/login/sms` | 手机号验证码登录 | `auth/login` |
| POST | `/auth/login/third-party` | 第三方登录 | `auth/login` |
| POST | `/auth/password/verify-code` | 校验验证码 | `auth/forgot-password` |
| POST | `/auth/password/reset` | 重置密码 | `auth/reset-password` |
| POST | `/auth/logout` | 退出登录 | `home/MyJ/setting` |
| POST | `/auth/token/refresh` | 刷新令牌 | 全局 |
| GET | `/agreements/privacy` | 获取隐私政策 | `auth/login` |
| GET | `/users/me` | 获取当前登录用户 | 多页面 |
| PUT | `/users/me/real-name` | 提交实名认证资料 | `auth/real-name` |

### 登录示例

`POST /auth/login/password`

```json
{
  "phone": "13800138000",
  "password": "123456",
  "agreePrivacy": true,
  "deviceId": "web-uuid"
}
```

## 5.2 首页、搜索、定位、个人中心与设置

### 接口清单

| Method | Path | 描述 | 对应页面 |
| --- | --- | --- | --- |
| GET | `/home/dashboard` | 首页聚合数据 | `home/dashboard` |
| GET | `/locations/current` | 当前定位城市 | 首页 |
| GET | `/locations/cities` | 城市/地区列表 | `home/location-select` |
| GET | `/search/hot-tags` | 热搜标签 | 首页、搜索页 |
| GET | `/search/history` | 搜索历史 | `home/search` |
| POST | `/search/history` | 记录搜索历史 | `home/search` |
| DELETE | `/search/history` | 清空搜索历史 | `home/search` |
| GET | `/search/global` | 搜索服务、内容、疾病、活动 | `home/search` |
| GET | `/users/me/profile` | 个人主页信息 | `home/profile`、`home/mine` |
| PUT | `/users/me/profile` | 更新个人资料 | `home/MyJ/profile-info` |
| GET | `/users/me/security` | 账号与安全信息 | `home/MyJ/account-security` |
| GET | `/users/me/settings` | 设置详情 | `home/MyJ/setting` |
| PUT | `/users/me/settings/message` | 消息设置 | `home/MyJ/message-settings` |
| GET | `/users/me/points` | 积分概览与明细 | `home/MyJ/integration` |
| GET | `/users/me/footprints` | 我的足迹 | `home/MyJ/myfoot` |
| DELETE | `/users/me/footprints` | 清空足迹 | `home/MyJ/myfoot` |
| GET | `/users/me/activities` | 我参加的活动 | `home/MyJ/myactivity` |
| GET | `/users/me/reviews` | 我的评价列表 | 我的页面 |
| GET | `/users/me/coupons` | 优惠券列表 | 我的页面 |

### 首页聚合返回建议

```json
{
  "city": "上海",
  "serviceEntries": [],
  "featureEntries": [],
  "healthReminder": {
    "type": "medication",
    "title": "用药提醒",
    "content": "06:30 卡托普利 2片"
  },
  "hotDiseases": [],
  "recommendedArticles": []
}
```

## 5.3 健康档案与基础信息

### 接口清单

| Method | Path | 描述 | 对应页面 |
| --- | --- | --- | --- |
| GET | `/health/archive/summary` | 健康档案总览 | `healthdocs/health-records` |
| GET | `/health/archive/basic-info` | 基础信息详情 | `healthdocs/basic-info` |
| PUT | `/health/archive/basic-info` | 更新基础信息 | `healthdocs/basic-info` |
| GET | `/health/archive/medical-history` | 病史与健康史 | `healthdocs/medical-history` |
| PUT | `/health/archive/medical-history` | 更新病史与健康史 | `healthdocs/medical-history` |

### 基础信息字段建议

```json
{
  "avatar": "https://cdn.example.com/avatar.jpg",
  "name": "JOY",
  "idCard": "310xxxxxxxxxxxxx",
  "gender": "female",
  "birthday": "1961-08-01",
  "phone": "13800138000",
  "address": "上海市浦东新区...",
  "height": 172,
  "weight": 55.5,
  "nativePlace": "上海",
  "ethnicity": "汉族",
  "education": "本科",
  "maritalStatus": "widowed",
  "occupation": "退休教师",
  "emergencyContact": {
    "name": "王女士",
    "phone": "13900139000",
    "relation": "女儿"
  }
}
```

## 5.4 体检报告与档案报告

### 接口清单

| Method | Path | 描述 | 对应页面 |
| --- | --- | --- | --- |
| GET | `/health/reports/checkups` | 体检报告列表 | `healthdocs/checkup-reports` |
| POST | `/health/reports/checkups` | 上传体检报告 | `healthdocs/report-upload` |
| GET | `/health/reports/checkups/{reportId}` | 体检报告详情 | `healthdocs/report-detail` |
| DELETE | `/health/reports/checkups/{reportId}` | 删除报告 | 报告列表、详情 |
| GET | `/health/reports/checkups/{reportId}/interpretation` | 报告解读 | `healthdocs/report-interpretation` |

### 上传建议采用两步式

| Method | Path | 描述 |
| --- | --- | --- |
| POST | `/files/presign` | 获取上传凭证 |
| POST | `/health/reports/checkups` | 保存报告业务记录 |

## 5.5 健康数据

### 接口清单

| Method | Path | 描述 | 对应页面 |
| --- | --- | --- | --- |
| GET | `/health/metrics/overview` | 健康数据总览 | `health/health-data` |
| GET | `/health/metrics/{metricKey}/trend` | 单指标趋势 | 各指标详情页 |
| GET | `/health/metrics/{metricKey}/records` | 单指标记录 | 各指标详情页 |
| POST | `/health/metrics/{metricKey}/records` | 新增指标记录 | `health/add-data` |
| PUT | `/health/metrics/{metricKey}/records/{recordId}` | 修改指标记录 | 指标页 |
| DELETE | `/health/metrics/{metricKey}/records/{recordId}` | 删除指标记录 | 指标页 |

### `metricKey` 建议枚举

- `steps`
- `heartRate`
- `sleep`
- `weight`
- `bloodSugar`
- `bloodPressure`
- `oxygen`
- `stress`

### 总览返回示例

```json
{
  "score": 82,
  "scoreLabel": "状态良好",
  "profileSummary": {
    "name": "JOY",
    "age": 65,
    "height": 172,
    "weight": 55.5,
    "deviceCount": 3
  },
  "summaryCards": [],
  "alerts": [],
  "linkedDevices": []
}
```

## 5.6 设备中心

### 接口清单

| Method | Path | 描述 | 对应页面 |
| --- | --- | --- | --- |
| GET | `/health/devices` | 设备列表 | `health/device-center` |
| GET | `/health/devices/{deviceId}` | 设备详情 | `health/device-detail` |
| POST | `/health/devices/bind` | 手动绑定设备 | `health/device-add` |
| POST | `/health/devices/scan/bind` | 扫码绑定设备 | `health/device-scan` |
| DELETE | `/health/devices/{deviceId}` | 解绑设备 | 设备详情 |
| PUT | `/health/devices/{deviceId}/settings` | 更新设备开关设置 | 设备详情 |
| PUT | `/health/devices/{deviceId}/password` | 设置设备密码 | `health/device-password` |
| PUT | `/health/devices/{deviceId}/heart-rate-settings` | 心率设置 | `health/heart-rate-settings` |
| GET | `/health/devices/{deviceId}/measurements` | 设备测量记录 | 设备详情 |

## 5.7 用药信息

### 接口清单

| Method | Path | 描述 | 对应页面 |
| --- | --- | --- | --- |
| GET | `/health/medications/today` | 今日用药总览 | `health/medication-info` |
| GET | `/health/medications` | 用药列表 | `health/medication-info` |
| POST | `/health/medications` | 新增用药记录 | `health/medication-add` |
| PUT | `/health/medications/{medicationId}` | 编辑用药记录 | `health/medication-edit` |
| DELETE | `/health/medications/{medicationId}` | 删除用药记录 | 用药页 |
| POST | `/health/medications/{medicationId}/take` | 确认已服药 | 用药页 |

## 5.8 健康膳食、饮食记录与自测

### 接口清单

| Method | Path | 描述 | 对应页面 |
| --- | --- | --- | --- |
| GET | `/health/diet/plan` | 健康膳食首页 | `health/diet-plan` |
| GET | `/health/diet/recipes` | 食谱列表 | `health/diet-plan` |
| GET | `/health/diet/recipes/{recipeId}` | 食谱详情 | `health/diet-recipe-detail` |
| GET | `/health/diet-records` | 饮食记录日报 | `diet-record` |
| POST | `/health/diet-records` | 新增饮食记录 | `diet-record/add-record` |
| GET | `/health/diet-records/history` | 历史统计 | `diet-record/history-data` |
| GET | `/health/self-tests` | 自测项目列表 | `health/self-test` |
| GET | `/health/self-tests/{testId}` | 自测试题 | `health/self-test` |
| POST | `/health/self-tests/{testId}/submit` | 提交自测结果 | `health/self-test` |
| GET | `/health/self-tests/history` | 自测历史 | `health/self-test` |

## 5.9 服务目录与服务详情

### 接口清单

| Method | Path | 描述 | 对应页面 |
| --- | --- | --- | --- |
| GET | `/services/categories` | 服务分类总览 | 首页 |
| GET | `/services/home-care` | 家政护理列表 | `service/home-care`、`service/daily-clean` |
| GET | `/services/home-care/{serviceId}` | 家政护理详情 | `service/home-care-detail` |
| GET | `/services/rehab-therapy` | 康复理疗列表 | `service/rehab-therapy` |
| GET | `/services/rehab-therapy/{serviceId}` | 康复理疗详情 | `service/rehab-therapy-detail` |
| GET | `/services/home-exam` | 上门体检列表 | `service/home-exam` |
| GET | `/services/home-exam/{serviceId}` | 上门体检详情 | `service/home-exam-detail` |
| GET | `/services/elderly-care` | 养老机构列表 | `service/elderly-care` |
| GET | `/services/elderly-care/{serviceId}` | 养老机构详情 | `service/elderly-care-detail` |

## 5.10 预约、订单、支付、履约与报告

这是当前用户端最核心的一组接口。

### 接口清单

| Method | Path | 描述 | 对应页面 |
| --- | --- | --- | --- |
| GET | `/orders/booking/options` | 获取地址、日期、可预约时段 | `service/booking` |
| POST | `/orders/preview` | 订单预览、价格试算 | `service/order-confirm` |
| POST | `/orders` | 创建订单 | `service/order-confirm` |
| GET | `/orders` | 订单列表 | `orders/rehab-therapy`、`service/home-care-orders` |
| GET | `/orders/{orderId}` | 订单详情 | `service/order-detail` |
| PUT | `/orders/{orderId}/schedule` | 改约 | `service/order-edit` |
| POST | `/orders/{orderId}/cancel` | 取消订单 | 订单页 |
| GET | `/orders/{orderId}/timeline` | 服务进度 | `service/service-track` |
| GET | `/orders/{orderId}/voucher` | 服务券码 | 家政订单、支付成功页 |
| GET | `/orders/{orderId}/service-records` | 服务记录 | `orders/willservice/service-record` |
| GET | `/orders/{orderId}/assessment-report` | 评估报告 | `orders/willservice/assessment-report` |
| GET | `/orders/{orderId}/rehab-report` | 康复报告 | `orders/willservice/rehab-report` |
| POST | `/orders/{orderId}/reviews` | 提交评价 | 订单页 |
| GET | `/orders/{orderId}/reviews` | 获取评价详情 | 订单页 |
| POST | `/orders/{orderId}/after-sales` | 发起退款/投诉/售后 | 订单页 |
| GET | `/orders/{orderId}/after-sales` | 售后记录 | 订单页 |

### 订单创建示例

`POST /orders`

```json
{
  "serviceId": "srv_hc_001",
  "serviceCategory": "homeCare",
  "addressId": "addr_001",
  "bookingDate": "2026-04-21",
  "bookingTimeSlot": "09:00-11:00",
  "contactName": "王阿姨",
  "contactPhone": "13800138000",
  "remark": "家中有老人，请提前电话联系",
  "couponId": "cp_001"
}
```

### 支付接口

| Method | Path | 描述 | 对应页面 |
| --- | --- | --- | --- |
| GET | `/payments/channels` | 支付方式列表 | `service/payment` |
| POST | `/payments` | 创建支付单 | `service/payment` |
| GET | `/payments/{paymentId}` | 查询支付状态 | 支付轮询 |
| POST | `/payments/{paymentId}/confirm` | 支付确认 | 支付结果 |

## 5.11 健康内容

### 接口清单

| Method | Path | 描述 | 对应页面 |
| --- | --- | --- | --- |
| GET | `/content/news` | 健康资讯列表 | `content/health-news` |
| GET | `/content/news/{newsId}` | 资讯详情 | `content/health-news-detail` |
| POST | `/content/news/{newsId}/like` | 点赞资讯 | 资讯页 |
| POST | `/content/news/{newsId}/favorite` | 收藏资讯 | 资讯页 |
| POST | `/content/news/{newsId}/share` | 记录分享 | 资讯页 |
| GET | `/content/lectures` | 健康讲堂列表 | `content/health-lecture` |
| GET | `/content/lectures/{lectureId}` | 讲堂详情 | `content/health-lecture-detail` |
| POST | `/content/lectures/{lectureId}/like` | 点赞讲堂 | 讲堂页 |
| POST | `/content/lectures/{lectureId}/favorite` | 收藏讲堂 | 讲堂页 |
| GET | `/content/diseases/departments` | 疾病科室分类 | `content/disease-guide` |
| GET | `/content/diseases` | 疾病列表 | `content/disease-guide` |
| GET | `/content/diseases/{diseaseId}` | 疾病详情 | `content/disease-detail` |

## 5.12 社区动态与老年活动

### 接口清单

| Method | Path | 描述 | 对应页面 |
| --- | --- | --- | --- |
| GET | `/community/topics` | 热门话题列表 | `community/circle` |
| GET | `/community/posts` | 帖子流 | `community/circle` |
| POST | `/community/posts` | 发布帖子 | `community/publish` |
| GET | `/community/posts/{postId}` | 帖子详情 | `community/post-detail` |
| PUT | `/community/posts/{postId}` | 编辑帖子 | 发帖页 |
| DELETE | `/community/posts/{postId}` | 删除帖子 | 帖子页 |
| POST | `/community/posts/{postId}/like` | 点赞帖子 | 生活圈、帖子详情 |
| POST | `/community/posts/{postId}/favorite` | 收藏帖子 | 生活圈、帖子详情 |
| GET | `/community/posts/{postId}/comments` | 评论列表 | 帖子详情 |
| POST | `/community/posts/{postId}/comments` | 发表评论 | 帖子详情 |
| POST | `/community/posts/{postId}/share` | 记录分享 | 帖子详情 |
| GET | `/community/activities` | 老年活动列表 | `community/senior-activities` |
| GET | `/community/activities/{activityId}` | 活动详情 | `community/senior-activity-detail` |
| POST | `/community/activities/{activityId}/register` | 活动报名 | 活动详情 |
| POST | `/community/activities/{activityId}/cancel` | 取消报名 | 活动详情、我的活动 |
| GET | `/community/activities/my` | 我参加的活动 | `home/MyJ/myactivity` |

## 5.13 消息与医生咨询

当前这部分只按非 AI 会话处理，医生咨询属于普通 IM/咨询会话。

### 接口清单

| Method | Path | 描述 | 对应页面 |
| --- | --- | --- | --- |
| GET | `/messages/overview` | 消息首页聚合 | `home/message` |
| GET | `/messages/notices` | 通知列表 | `home/message` |
| POST | `/messages/notices/read` | 批量已读通知 | 消息中心 |
| GET | `/conversations` | 会话列表 | `home/message` |
| POST | `/conversations/doctor` | 创建医生咨询会话 | 消息页 |
| GET | `/conversations/{conversationId}/messages` | 会话消息列表 | `home/doctor-chat` |
| POST | `/conversations/{conversationId}/messages` | 发送文本/图片/语音消息 | `home/doctor-chat` |
| POST | `/conversations/{conversationId}/read` | 会话已读 | 会话页 |

### 建议 WebSocket

```text
GET /ws/app?token=<access_token>
```

事件建议：

- `conversation.message.created`
- `conversation.message.read`
- `conversation.updated`
- `notice.created`

## 5.14 文件上传

### 接口清单

| Method | Path | 描述 |
| --- | --- | --- |
| POST | `/files/presign` | 获取上传凭证 |
| POST | `/files/complete` | 通知上传完成 |
| GET | `/files/{fileId}` | 获取文件信息 |

### 适用场景

- 报告上传
- 社区发帖图片
- 医生咨询图片
- 医生咨询语音
- 头像上传

## 6. AI 待实现页面规划

当前代码已经覆盖完整非 AI 业务，但项目文档中的 AI 层能力仍需独立规划。建议新增而非改造现有业务页的 AI 页面如下：

| 建议页面 ID | 页面名称 | 主要作用 |
| --- | --- | --- |
| `ai/assistant/chat` | 智能康养助手 | 统一 AI 入口，支持文字/语音问询 |
| `ai/assistant/recommendation` | 服务推荐结果 | 展示 AI 根据描述生成的服务推荐卡片 |
| `ai/health/summary` | AI 健康摘要 | 汇总近期健康数据、趋势与注意事项 |
| `ai/family/summary` | 家属摘要 | 为家属生成老人近期健康与服务摘要 |
| `ai/report/interpretation` | AI 报告深度解读 | 对体检/服务报告做增强解释 |
| `ai/risk/alerts` | 风险提醒 | 展示 AI 识别出的风险事件和回访建议 |

## 7. AI API 规划

AI API 不应混入当前普通业务接口域，建议单独放在 `/ai` 下。

## 7.1 智能助手会话

| Method | Path | 描述 |
| --- | --- | --- |
| POST | `/ai/assistant/conversations` | 创建智能助手会话 |
| GET | `/ai/assistant/conversations/{conversationId}` | 获取会话详情 |
| GET | `/ai/assistant/conversations/{conversationId}/messages` | 获取会话消息 |
| POST | `/ai/assistant/conversations/{conversationId}/messages` | 发送消息并获得 AI 回复 |

### 返回建议

```json
{
  "conversationId": "ai_conv_001",
  "reply": {
    "messageId": "msg_ai_001",
    "type": "text",
    "content": "根据您的描述，建议优先了解康复理疗或上门评估服务。请问希望预约哪天？"
  },
  "intent": {
    "intentType": "service_recommendation",
    "serviceCategory": "rehabTherapy",
    "confidence": 0.92
  }
}
```

## 7.2 AI 服务推荐

| Method | Path | 描述 |
| --- | --- | --- |
| POST | `/ai/service-recommendations` | 根据自然语言和档案推荐服务 |
| POST | `/ai/order-prefill` | 根据会话结果补全预约信息 |

## 7.3 AI 健康摘要与趋势解释

| Method | Path | 描述 |
| --- | --- | --- |
| GET | `/ai/health-summary` | 生成个人健康摘要 |
| GET | `/ai/health-metric-explanations` | 获取健康指标趋势解释 |
| GET | `/ai/family-summary` | 获取家属摘要 |

## 7.4 AI 报告解读

| Method | Path | 描述 |
| --- | --- | --- |
| GET | `/ai/reports/{reportId}/interpretation` | 生成 AI 报告解读 |
| GET | `/ai/reports/{reportId}/followup-suggestions` | 生成后续建议 |

## 7.5 AI 风险提醒

| Method | Path | 描述 |
| --- | --- | --- |
| GET | `/ai/risk-alerts` | 获取用户风险提醒列表 |
| GET | `/ai/risk-alerts/{alertId}` | 获取风险详情 |

### 风险对象示例

```json
{
  "alertId": "risk_001",
  "type": "health_metric_abnormal",
  "level": "medium",
  "title": "近 7 天血压持续偏高",
  "summary": "建议关注睡眠、饮食和用药情况",
  "relatedMetric": "bloodPressure",
  "createdAt": "2026-04-20 09:20:00"
}
```

## 8. 联调优先级建议

### P0

- 认证与账号
- 首页聚合
- 健康档案
- 健康数据
- 设备中心
- 用药信息
- 服务目录
- 预约、订单、支付、进度、报告

### P1

- 健康内容
- 社区动态与活动
- 消息与医生咨询
- 饮食记录与自测

### P2

- 智能康养助手
- AI 服务推荐
- AI 健康摘要
- AI 家属摘要
- AI 报告解读
- AI 风险提醒

## 9. 最终结论

当前用户端的定义已经发生变化：

- 非 AI 业务页面不再视为“待实现”
- 当前 82 个页面已经构成完整的普通业务前端范围
- 后续新增工作主要分成两类：

1. 将现有页面从 `mock/localStorage/sessionStorage` 迁移到真实后端 API
2. 在现有业务闭环之上新增 AI 页面与 AI 服务能力

因此，后端建设也应按两条线并行：

- 业务 API 线：先支撑现有 82 页
- AI API 线：作为后续增量规划，独立设计、独立落地
