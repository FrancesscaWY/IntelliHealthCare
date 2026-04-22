# 前端 Swagger 联调 API 操作手册

更新时间：`2026-04-22`

适用对象：

- `apps/user-web` 前端开发同学
- `apps/admin-web` 前端开发同学
- 联调负责人、接口验收同学

本文档目标：

1. 帮前端同学直接通过 Swagger 页面完成接口查看、测试、联调。
2. 按“前端拿到文档后的实际操作顺序”说明怎么做，而不是只罗列接口地址。
3. 让不同操作系统环境的同学都能使用同一套联调流程，不依赖命令行工具。
4. 明确每个接口有什么用、在哪些页面用、在 Swagger 里怎么测、成功后重点看什么字段。

使用原则：

- 本手册统一以远端联调环境为准，不再使用本地联调入口。
- 本手册统一使用 Swagger 网页测试，不要求安装任何终端工具。
- 本手册重点讲“怎么做”，不展开解释实现原理。

---

## 1. 拿到这份手册后先做什么

### 1.1 联调入口

前端联调统一入口：

- Swagger 页面：`http://server.mctown.online:8190/api/v1/docs`
- OpenAPI JSON：`http://server.mctown.online:8190/api/v1/docs/json`
- API Base URL：`http://server.mctown.online:8190/api/v1`

截至 `2026-04-22`，以上地址可访问。

最推荐的使用顺序：

1. 先打开 Swagger 页面。
2. 先跑 `系统检查 -> GET /system/health`。
3. 再做登录，拿到用户端或后台端 token。
4. 再测试你负责页面对应的列表接口。
5. 然后测试详情接口、提交接口、上传接口。
6. 最后再回到前端页面接真实接口。

### 1.2 这份手册适合什么环境

本手册适用于：

- Windows
- macOS
- Linux

因为整个联调流程都在浏览器里完成，所以不同操作系统的差异很小。你只需要准备：

- 一个可访问联调环境的浏览器
- 推荐浏览器：Chrome、Edge、Safari、Firefox 的较新版本
- 一个可用的测试账号

你不需要额外准备：

- 本地后端启动环境
- 终端脚本
- JSON 格式化工具
- Shell 变量

### 1.3 先认识 Swagger 页面里最常用的 6 个位置

打开 `http://server.mctown.online:8190/api/v1/docs` 后，最常用的是这 6 个位置：

| 位置 | 你会看到什么 | 你在这里做什么 |
| --- | --- | --- |
| 顶部说明区 | 文档说明、测试账号、token 用法 | 先读一遍，确认联调顺序 |
| 右上角 `Authorize` | 鉴权弹窗 | 粘贴 `Bearer accessToken` |
| 模块标题行 | 如“用户认证”“健康档案”“订单与预约” | 找你负责页面所属模块 |
| 接口折叠项 | 如 `POST /app/auth/login/password` | 点开后查看参数、返回体 |
| `Try it out` 按钮 | 请求可编辑状态 | 开始填写参数并测试 |
| `Execute` 按钮 | 真正发请求 | 看状态码、返回数据、请求 URL |

### 1.4 当前联调测试账号

用户端：

| 账号类型 | 手机号 | 密码 | 适合先测哪些页面 |
| --- | --- | --- | --- |
| 家属账号 | `13900139000` | `123456` | 首页、我的、订单、服务、消息、档案代看 |
| 长者账号 | `13800138000` | `123456` | 健康数据、健康档案、报告、用药、饮食 |

后台端：

| 账号类型 | 手机号 | 密码 | 适合先测哪些页面 |
| --- | --- | --- | --- |
| 后台账号 | `13600136000` | `123456` | 后台首页、订单管理、工单、报告审核 |

### 1.5 `APP_TOKEN`、`ADMIN_TOKEN`、`Authorization` 到底是什么

这三个概念在前端联调里非常重要：

| 名称 | 含义 | 你从哪里得到 |
| --- | --- | --- |
| `APP_TOKEN` | 用户端登录成功后返回的 `data.accessToken` | `POST /app/auth/login/password` 或其他用户端登录接口 |
| `ADMIN_TOKEN` | 后台登录成功后返回的 `data.accessToken` | `POST /admin/auth/login/password` |
| `Authorization: Bearer xxx` | 登录态请求头 | 在 Swagger 的 `Authorize` 弹窗里填写 |

请直接记住这句话：

- `APP_TOKEN = 用户端登录接口返回的 data.accessToken`
- `ADMIN_TOKEN = 后台登录接口返回的 data.accessToken`

在 Swagger 里填写格式必须是：

```text
Bearer 你的accessToken
```

注意：

- `Bearer` 后面必须有一个空格。
- 不要把尖括号带进去。
- Swagger 当前只有一个全局 Bearer Token。
- 你测试用户端接口时填用户端 token。
- 你测试后台端接口时，需要把它替换成后台 token。

---

## 2. 第一次进入 Swagger 的标准操作流程

### 2.1 先确认联调环境是通的

操作步骤：

1. 打开 Swagger 页面。
2. 找到模块 `系统检查`。
3. 点开 `GET /system/health`。
4. 点击 `Try it out`。
5. 点击 `Execute`。

成功后你应该重点看：

- `code = 0`
- `message = "ok"`
- `data.status = "ok"`

如果这里都不通，不要继续测业务接口，先把报错截图和返回里的 `requestId` 发给后端。

### 2.2 获取用户端 `APP_TOKEN`

操作步骤：

1. 找到模块 `用户认证`。
2. 打开 `POST /app/auth/login/password`。
3. 点击 `Try it out`。
4. 使用下面的请求体：

```json
{
  "phone": "13900139000",
  "password": "123456",
  "agreePrivacy": true,
  "deviceId": "web-chrome-001"
}
```

5. 点击 `Execute`。
6. 在返回结果里找到 `data.accessToken`。
7. 复制这个值。

成功后重点看：

- `data.accessToken`
- `data.refreshToken`
- `data.user.userId`
- `data.user.roles`

### 2.3 获取后台端 `ADMIN_TOKEN`

操作步骤：

1. 找到模块 `后台认证`。
2. 打开 `POST /admin/auth/login/password`。
3. 点击 `Try it out`。
4. 使用下面的请求体：

```json
{
  "phone": "13600136000",
  "password": "123456",
  "agreePrivacy": true,
  "deviceId": "admin-edge-001"
}
```

5. 点击 `Execute`。
6. 在返回结果里复制 `data.accessToken`。

### 2.4 在 Swagger 里完成登录态授权

操作步骤：

1. 点击 Swagger 右上角 `Authorize`。
2. 在输入框里粘贴：

```text
Bearer 刚刚复制的 accessToken
```

3. 点击弹窗里的 `Authorize`。
4. 点击 `Close`。

判断是否成功：

- 重新打开弹窗时，能看到已填入的 token。
- 再执行一个需要登录态的接口，不再返回 `401` 或 `403`。

### 2.5 怎么在 Swagger 里测试不同类型的接口

#### GET 接口

适合：

- 列表页
- 详情页
- 搜索页
- 查询状态页

操作方法：

1. 点开接口。
2. 点击 `Try it out`。
3. 如果有 `query` 参数，就在参数输入框里填值。
4. 如果有 `path` 参数，就把占位 ID 换成真实 ID。
5. 点击 `Execute`。

#### POST 接口

适合：

- 登录
- 新增
- 提交表单
- 下单
- 创建支付单

操作方法：

1. 点开接口。
2. 点击 `Try it out`。
3. 在 `Request body` 里按 JSON 格式填写数据。
4. 点击 `Execute`。

#### PUT 接口

适合：

- 修改资料
- 更新设置
- 编辑记录
- 改约

操作方法：

1. 先用详情接口拿当前数据。
2. 再点开对应的 `PUT` 接口。
3. 按页面真实提交结构填写请求体。
4. 点击 `Execute`。

#### DELETE 接口

适合：

- 删除记录
- 删除报告
- 删除用药

操作方法：

1. 先确认你拿到的是正确的 ID。
2. 再执行删除接口。
3. 删除成功后，回去再执行一次列表接口确认结果。

### 2.6 Swagger 页面里最值得前端看的 4 个区域

每次点击 `Execute` 后，请至少看这 4 个区域：

| 区域 | 重点看什么 | 作用 |
| --- | --- | --- |
| `Request URL` | 最终发起的完整请求地址 | 确认路径和参数是不是你预期的 |
| `Response body` | 业务返回 JSON | 对照字段做前端映射 |
| `Response headers` | `content-type` 等 | 排查跨域或返回格式问题 |
| 状态码区域 | `200`、`400`、`401`、`500` | 判断是参数问题、鉴权问题还是服务问题 |

---

## 3. 前端联调时统一遵守的规则

### 3.1 统一返回结构怎么读

所有业务接口优先按这个结构理解：

```json
{
  "code": 0,
  "message": "ok",
  "requestId": "req_xxxxx",
  "data": {}
}
```

前端最需要关心的是：

| 字段 | 含义 | 前端应该怎么用 |
| --- | --- | --- |
| `code` | 是否成功 | `0` 视为成功，非 `0` 走错误分支 |
| `message` | 文案说明 | 用于 toast、错误提示或日志 |
| `requestId` | 请求追踪号 | 联调报错时发给后端 |
| `data` | 真正业务数据 | 页面渲染主要读这里 |

### 3.2 常见 `data` 结构

| 场景 | 常见结构 | 前端怎么处理 |
| --- | --- | --- |
| 详情接口 | `data` 是对象 | 直接映射表单或详情页 |
| 列表接口 | `data.list` + 分页字段 | 用于列表渲染、分页、下拉加载 |
| 新增接口 | `data` 里返回新对象或新 ID | 用于跳详情、继续下一步流程 |
| 提交动作 | `data` 里返回状态或更新结果 | 用于按钮反馈和页面刷新 |
| 上传预处理 | `data` 里返回 `uploadUrl`、`objectKey`、`fileId` 等 | 用于继续执行上传链路 |

### 3.3 真实业务里常用 ID 怎么拿

很多接口参数不是手填，而是要先从上一步接口里取。

| 你要用的 ID | 应该先测哪个接口 | 从返回里看哪里 |
| --- | --- | --- |
| `serviceId` | 服务列表接口 | `data.list[].serviceId` |
| `addressId` | 地址列表接口 | `data.list[].addressId` |
| `orderId` | 订单列表接口 | `data.list[].orderId` |
| `paymentId` | 创建支付单接口 | `data.paymentId` |
| `reportId` | 报告列表接口 | `data.list[].reportId` |
| `recordId` | 指标记录列表接口 | `data.list[].recordId` |
| `deviceId` | 设备列表接口 | `data.list[].deviceId` 或 `data[].deviceId` |
| `medicationId` | 用药列表接口 | `data.list[].medicationId` 或 `data[].medicationId` |
| `conversationId` | 会话列表接口 | `data.list[].conversationId` |
| `workOrderId` | 工单列表接口 | `data.list[].workOrderId` |

结论：

- 看到路径里有 `:xxxId`，先不要硬填。
- 优先先查该业务对应的列表接口。

### 3.4 前端页面联调的推荐顺序

#### 列表页

推荐顺序：

1. 先跑列表接口。
2. 先看 `data.list` 是否有值。
3. 再看分页字段是否完整。
4. 确认列表项的主键字段名。
5. 再在前端接入。

#### 详情页

推荐顺序：

1. 先从列表接口拿到真实 ID。
2. 再跑详情接口。
3. 记录页面实际要用到的字段。
4. 再接页面。

#### 新增/编辑页

推荐顺序：

1. 先跑详情接口回显旧数据。
2. 再跑更新接口验证请求体结构。
3. 成功后重新跑详情接口看数据是否变化。

#### 下单/支付页

推荐顺序：

1. 先拿 `serviceId`。
2. 再拿 `addressId`。
3. 先跑预约选项。
4. 再跑订单预览。
5. 再创建订单。
6. 再创建支付单。
7. 最后跑支付确认和支付详情。

#### 上传页

推荐顺序：

1. 先跑 `presign`。
2. 再确认返回里的 `uploadUrl`、`objectKey`、`headers`。
3. 再跑 `complete`。
4. 最后用 `fileId` 查询文件信息。

### 3.5 常见错误和处理方式

| 现象 | 常见原因 | 先检查什么 |
| --- | --- | --- |
| `401 Unauthorized` | 没授权、token 失效、token 类型不对 | `Authorize` 里是不是 `Bearer 空格 + accessToken` |
| `403 Forbidden` | 角色不匹配 | 当前是不是拿用户端 token 去测后台接口，或反过来 |
| `400` / `422` | 参数缺失或格式不对 | 请求体字段名、日期格式、ID 是否真实存在 |
| `404` | 资源不存在 | `reportId`、`orderId`、`deviceId` 是否来自真实列表 |
| `500` | 后端内部错误 | 记录 `requestId`，发给后端排查 |
| 页面有值但前端显示空白 | 字段映射错了 | 是否把 `data.list` 当成顶层 `list`，或字段名写错 |

---

## 4. 用户端模块联调手册

以下内容按前端业务模块拆分。每个模块都按同一个逻辑说明：

1. 这个模块有什么用
2. 这些接口在哪些页面用
3. 先测哪些接口
4. 在 Swagger 里怎么测
5. 成功后重点看哪些字段

### 4.1 认证与实名

模块作用：

- 登录
- 找回密码
- 刷新登录态
- 获取当前用户信息
- 提交实名认证

主要页面：

| 页面名称 | 路由 | 页面文件 |
| --- | --- | --- |
| 登录页 | `/auth/login` | `apps/user-web/src/pages/auth/login/Page.vue` |
| 忘记密码 | `/auth/forgot-password` | `apps/user-web/src/pages/auth/forgot-password/Page.vue` |
| 设置密码 | `/auth/reset-password` | `apps/user-web/src/pages/auth/reset-password/Page.vue` |
| 实名认证 | `/auth/real-name` | `apps/user-web/src/pages/auth/real-name/Page.vue` |

推荐先测接口：

1. `GET /app/agreements/privacy`
2. `POST /app/auth/login/password`
3. `GET /app/users/me`
4. `PUT /app/users/me/real-name`

Swagger 测试顺序：

| 接口 | 怎么测 | 成功后重点看 |
| --- | --- | --- |
| `GET /app/agreements/privacy` | 直接执行 | `data.title`、`data.version`、`data.content` |
| `POST /app/auth/login/password` | 用家属账号登录 | `data.accessToken`、`data.user.userId` |
| `GET /app/users/me` | 先完成 `Authorize` 再执行 | 当前登录用户的 `userId`、`roles`、`type` |
| `PUT /app/users/me/real-name` | 填姓名和身份证号后执行 | 实名状态、姓名字段是否更新 |

实名认证请求体示例：

```json
{
  "realName": "王兰",
  "idCard": "310101199001011234"
}
```

### 4.2 首页、搜索、我的、设置、家庭地址

模块作用：

- 首页聚合信息
- 城市选择
- 搜索
- 个人中心
- 设置
- 地址管理

主要页面：

| 页面名称 | 路由 | 页面文件 |
| --- | --- | --- |
| 首页 | `/home/dashboard` | `apps/user-web/src/pages/home/dashboard/Page.vue` |
| 选择地区 | `/home/location-select` | `apps/user-web/src/pages/home/location-select/Page.vue` |
| 搜索 | `/home/search` | `apps/user-web/src/pages/home/search/Page.vue` |
| 个人主页 | `/home/profile` | `apps/user-web/src/pages/home/profile/Page.vue` |
| 我的 | `/home/mine` | `apps/user-web/src/pages/home/mine/Page.vue` |
| 设置 | `/home/MyJ/setting` | `apps/user-web/src/pages/home/MyJ/setting/Page.vue` |
| 消息设置 | `/home/MyJ/message-settings` | `apps/user-web/src/pages/home/MyJ/message-settings/Page.vue` |
| 个人资料 | `/home/MyJ/profile-info` | `apps/user-web/src/pages/home/MyJ/profile-info/Page.vue` |
| 家庭地址相关页 | 服务预约链路中使用 | `apps/user-web/src/pages/service/booking/Page.vue` |

推荐先测接口：

1. `GET /app/home/dashboard`
2. `GET /app/search/hot-tags`
3. `GET /app/search/global`
4. `GET /app/users/me/profile`
5. `GET /app/family/addresses`
6. `POST /app/family/addresses`

地址新增请求体示例：

```json
{
  "label": "女儿家",
  "elderId": "user_elder_joy",
  "receiverName": "王兰",
  "receiverPhone": "13900139000",
  "province": "上海市",
  "city": "上海市",
  "district": "浦东新区",
  "detailAddress": "花木路 88 号 1002 室",
  "isDefault": true
}
```

成功后重点看：

- 首页：`data.serviceEntries`、`data.featureEntries`、`data.healthReminder`
- 搜索：`data.list`
- 个人资料：昵称、头像、城市等字段名
- 地址：`data.list[].addressId`

### 4.3 健康档案与报告

模块作用：

- 健康档案首页
- 基础信息
- 既往病史
- 体检报告列表、详情、上传、解读

主要页面：

| 页面名称 | 路由 | 页面文件 |
| --- | --- | --- |
| 健康档案 | `/healthdocs/health-records` | `apps/user-web/src/pages/healthdocs/health-records/Page.vue` |
| 基础信息 | `/healthdocs/basic-info` | `apps/user-web/src/pages/healthdocs/basic-info/Page.vue` |
| 既往病史 | `/healthdocs/medical-history` | `apps/user-web/src/pages/healthdocs/medical-history/Page.vue` |
| 体检报告 | `/healthdocs/checkup-reports` | `apps/user-web/src/pages/healthdocs/checkup-reports/Page.vue` |
| 上传报告 | `/healthdocs/report-upload` | `apps/user-web/src/pages/healthdocs/report-upload/Page.vue` |
| 报告详情 | `/healthdocs/report-detail` | `apps/user-web/src/pages/healthdocs/report-detail/Page.vue` |
| 报告解读 | `/healthdocs/report-interpretation` | `apps/user-web/src/pages/healthdocs/report-interpretation/Page.vue` |

推荐先测接口：

1. `GET /app/health/archive/summary`
2. `GET /app/health/archive/basic-info`
3. `PUT /app/health/archive/basic-info`
4. `GET /app/health/reports/checkups`
5. `POST /app/health/reports/checkups`
6. `GET /app/health/reports/checkups/{reportId}`
7. `GET /app/health/reports/checkups/{reportId}/interpretation`

基础信息更新请求体示例：

```json
{
  "name": "张秀兰",
  "phone": "13800138000",
  "birthday": "1953-08-12",
  "address": "上海市浦东新区花木路 88 号 1002 室",
  "height": 162,
  "weight": 58,
  "education": "高中",
  "occupation": "退休教师",
  "emergencyContact": {
    "name": "王兰",
    "phone": "13900139000",
    "relation": "女儿"
  }
}
```

上传报告请求体示例：

```json
{
  "elderId": "user_elder_joy",
  "title": "2026 年 4 月体检报告",
  "summary": {
    "conclusion": "血压偏高，建议继续复查",
    "highlights": ["收缩压偏高", "血糖正常"]
  },
  "attachment": {
    "fileId": "file_report_001",
    "fileName": "checkup-report.pdf"
  }
}
```

成功后重点看：

- 档案首页：`riskTags`、`recentAlerts`
- 基础信息：字段名是否和页面表单一致
- 报告列表：`data.list[].reportId`
- 报告详情：标题、摘要、附件字段
- 报告解读：解读正文、风险提示、建议列表

### 4.4 健康数据、设备、用药

模块作用：

- 健康数据总览
- 单项指标趋势和记录
- 设备绑定、详情、设置
- 用药计划和服药记录

主要页面：

| 页面名称 | 路由 | 页面文件 |
| --- | --- | --- |
| 健康数据 | `/health/health-data` | `apps/user-web/src/pages/health/health-data/Page.vue` |
| 添加数据 | `/health/add-data` | `apps/user-web/src/pages/health/add-data/Page.vue` |
| 单项指标页 | 如 `/health/data-bloodpressure` | `apps/user-web/src/pages/health/data-bloodpressure/Page.vue` 等 |
| 设备中心 | `/health/device-center` | `apps/user-web/src/pages/health/device-center/Page.vue` |
| 设备详情 | `/health/device-detail` | `apps/user-web/src/pages/health/device-detail/Page.vue` |
| 设备添加 | `/health/device-add` | `apps/user-web/src/pages/health/device-add/Page.vue` |
| 设备扫码绑定 | `/health/device-scan` | `apps/user-web/src/pages/health/device-scan/Page.vue` |
| 用药信息 | `/health/medication-info` | `apps/user-web/src/pages/health/medication-info/Page.vue` |
| 添加用药 | `/health/medication-add` | `apps/user-web/src/pages/health/medication-add/Page.vue` |
| 编辑用药 | `/health/medication-edit` | `apps/user-web/src/pages/health/medication-edit/Page.vue` |

推荐先测接口：

1. `GET /app/health/metrics/overview`
2. `GET /app/health/metrics/{metricKey}/trend`
3. `GET /app/health/metrics/{metricKey}/records`
4. `POST /app/health/metrics/{metricKey}/records`
5. `GET /app/health/devices`
6. `POST /app/health/devices/bind`
7. `GET /app/health/medications`
8. `POST /app/health/medications`

新增指标记录请求体示例：

```json
{
  "value": 78,
  "unit": "bpm",
  "note": "晨起测量",
  "measuredAt": "2026-04-22T07:50:00.000Z"
}
```

如果是血压这类复合指标，建议使用：

```json
{
  "payload": {
    "systolic": 146,
    "diastolic": 92
  },
  "unit": "mmHg",
  "note": "晨起空腹测量",
  "measuredAt": "2026-04-22T08:15:00.000Z"
}
```

绑定设备请求体示例：

```json
{
  "elderId": "user_elder_joy",
  "serialNo": "WATCH-A001",
  "type": "WATCH",
  "nickname": "母亲手表"
}
```

新增用药请求体示例：

```json
{
  "elderId": "user_elder_joy",
  "name": "氯沙坦",
  "dosage": "50mg",
  "frequency": "每日 2 次",
  "mealTiming": "饭后",
  "scheduleTimes": ["08:00", "20:00"],
  "startDate": "2026-04-22"
}
```

成功后重点看：

- 总览：`summaryCards`、`alerts`、`linkedDevices`
- 记录列表：`data.list[].recordId`
- 设备列表：`deviceId`
- 用药列表：`medicationId`

### 4.5 健康膳食、饮食记录、自测

模块作用：

- 膳食首页
- 食谱列表和详情
- 饮食记录
- 自测项目和结果

主要页面：

| 页面名称 | 路由 | 页面文件 |
| --- | --- | --- |
| 健康膳食 | `/health/diet-plan` | `apps/user-web/src/pages/health/diet-plan/Page.vue` |
| 食谱详情 | `/health/diet-recipe-detail` | `apps/user-web/src/pages/health/diet-recipe-detail/Page.vue` |
| 饮食记录 | `/diet-record` | `apps/user-web/src/pages/diet-record/Page.vue` |
| 添加饮食记录 | `/diet-record/add-record` | `apps/user-web/src/pages/diet-record/add-record/Page.vue` |
| 历史数据 | `/diet-record/history-data` | `apps/user-web/src/pages/diet-record/history-data/Page.vue` |
| 健康自测 | `/health/self-test` | `apps/user-web/src/pages/health/self-test/Page.vue` |

推荐先测接口：

1. `GET /app/health/diet/plan`
2. `GET /app/health/diet/recipes`
3. `GET /app/health/diet-records`
4. `POST /app/health/diet-records`
5. `GET /app/health/self-tests`
6. `GET /app/health/self-tests/{testId}`
7. `POST /app/health/self-tests/{testId}/submit`

成功后重点看：

- 膳食首页：推荐食谱、今日热量、最近记录
- 饮食记录：日期、餐别、食物明细
- 自测：题目结构、选项结构、结果字段

### 4.6 服务目录、预约、订单、支付

模块作用：

- 各类服务浏览
- 预约时间选择
- 下单
- 改约、取消、评价、售后
- 支付和支付结果

主要页面：

| 页面名称 | 路由 | 页面文件 |
| --- | --- | --- |
| 家政护理 | `/service/home-care` | `apps/user-web/src/pages/service/home-care/Page.vue` |
| 康复理疗 | `/service/rehab-therapy` | `apps/user-web/src/pages/service/rehab-therapy/Page.vue` |
| 上门体检 | `/service/home-exam` | `apps/user-web/src/pages/service/home-exam/Page.vue` |
| 养老机构 | `/service/elderly-care` | `apps/user-web/src/pages/service/elderly-care/Page.vue` |
| 预约服务 | `/service/booking` | `apps/user-web/src/pages/service/booking/Page.vue` |
| 订单确认 | `/service/order-confirm` | `apps/user-web/src/pages/service/order-confirm/Page.vue` |
| 支付订单 | `/service/payment` | `apps/user-web/src/pages/service/payment/Page.vue` |
| 支付结果 | `/service/payment-result` | `apps/user-web/src/pages/service/payment-result/Page.vue` |
| 订单详情 | `/service/order-detail` | `apps/user-web/src/pages/service/order-detail/Page.vue` |
| 修改订单信息 | `/service/order-edit` | `apps/user-web/src/pages/service/order-edit/Page.vue` |
| 服务跟踪 | `/service/service-track` | `apps/user-web/src/pages/service/service-track/Page.vue` |

推荐先测接口：

1. `GET /app/services/categories`
2. `GET /app/services/home-care`
3. `GET /app/orders/booking/options`
4. `POST /app/orders/preview`
5. `POST /app/orders`
6. `GET /app/orders`
7. `GET /app/payments/channels`
8. `POST /app/payments`
9. `POST /app/payments/{paymentId}/confirm`
10. `GET /app/payments/{paymentId}`

订单预览请求体示例：

```json
{
  "serviceId": "srv_rehab_stroke",
  "addressId": "addr_joy_daughter",
  "elderId": "user_elder_joy",
  "bookingDate": "2026-04-24",
  "bookingTimeSlot": "13:00-15:00",
  "remark": "需要电梯可达"
}
```

创建订单请求体示例：

```json
{
  "serviceId": "srv_rehab_stroke",
  "addressId": "addr_joy_daughter",
  "elderId": "user_elder_joy",
  "bookingDate": "2026-04-24",
  "bookingTimeSlot": "13:00-15:00",
  "contactName": "王兰",
  "contactPhone": "13900139000",
  "remark": "家属会在现场"
}
```

创建支付单请求体示例：

```json
{
  "orderId": "order_rehab_assess",
  "channel": "WECHAT"
}
```

成功后重点看：

- 服务列表：`serviceId`
- 订单预览：价格结构、地址结构、服务摘要
- 订单创建：`orderId`
- 支付创建：`paymentId`
- 支付结果：支付状态、支付渠道、支付金额

### 4.7 健康内容、社区与活动

模块作用：

- 健康资讯
- 健康讲堂
- 疾病宝典
- 生活圈帖子
- 老年活动

主要页面：

| 页面名称 | 路由 | 页面文件 |
| --- | --- | --- |
| 健康资讯 | `/content/health-news` | `apps/user-web/src/pages/content/health-news/Page.vue` |
| 健康讲堂 | `/content/health-lecture` | `apps/user-web/src/pages/content/health-lecture/Page.vue` |
| 疾病宝典 | `/content/disease-guide` | `apps/user-web/src/pages/content/disease-guide/Page.vue` |
| 生活圈 | `/community/circle` | `apps/user-web/src/pages/community/circle/Page.vue` |
| 发布动态 | `/community/publish` | `apps/user-web/src/pages/community/publish/Page.vue` |
| 帖子详情 | `/community/post-detail` | `apps/user-web/src/pages/community/post-detail/Page.vue` |
| 老年活动 | `/community/senior-activities` | `apps/user-web/src/pages/community/senior-activities/Page.vue` |
| 活动详情 | `/community/senior-activity-detail` | `apps/user-web/src/pages/community/senior-activity-detail/Page.vue` |

推荐先测接口：

1. `GET /app/content/news`
2. `GET /app/content/lectures`
3. `GET /app/content/diseases/departments`
4. `GET /app/community/topics`
5. `GET /app/community/posts`
6. `POST /app/community/posts`
7. `GET /app/community/activities`
8. `POST /app/community/activities/{activityId}/register`

成功后重点看：

- 内容列表：封面、标题、摘要、统计字段
- 帖子流：作者信息、图片、点赞收藏状态
- 活动列表：活动 ID、报名状态、活动时间

### 4.8 消息、医生咨询、文件上传、AI 增强

模块作用：

- 消息中心
- 医生咨询会话
- 文件上传
- AI 助手和 AI 增强能力

主要页面：

| 页面名称 | 路由 | 页面文件 |
| --- | --- | --- |
| 消息 | `/home/message` | `apps/user-web/src/pages/home/message/Page.vue` |
| 医生咨询 | `/home/doctor-chat` | `apps/user-web/src/pages/home/doctor-chat/Page.vue` |
| 报告上传 | `/healthdocs/report-upload` | `apps/user-web/src/pages/healthdocs/report-upload/Page.vue` |
| 发布动态 | `/community/publish` | `apps/user-web/src/pages/community/publish/Page.vue` |
| 个人资料 | `/home/MyJ/profile-info` | `apps/user-web/src/pages/home/MyJ/profile-info/Page.vue` |
| AI 报告解读增强 | `/healthdocs/report-interpretation` | `apps/user-web/src/pages/healthdocs/report-interpretation/Page.vue` |

推荐先测接口：

1. `GET /app/messages/overview`
2. `GET /app/conversations`
3. `POST /app/conversations/doctor`
4. `GET /app/conversations/{conversationId}/messages`
5. `POST /app/files/presign`
6. `POST /app/files/complete`
7. `GET /app/files/{fileId}`
8. `GET /app/ai/reports/{reportId}/interpretation`
9. `GET /app/ai/risk-alerts`

上传预处理请求体示例：

```json
{
  "category": "REPORT",
  "fileName": "checkup-report.pdf",
  "mimeType": "application/pdf",
  "size": 102400
}
```

通知上传完成请求体示例：

```json
{
  "category": "REPORT",
  "fileName": "checkup-report.pdf",
  "objectKey": "app/report/2026-04-22/7f8e9d1c.pdf",
  "mimeType": "application/pdf",
  "size": 102400,
  "metadata": {
    "source": "report-upload-page"
  }
}
```

成功后重点看：

- 消息概览：未读数、最新消息
- 会话列表：`conversationId`
- 文件上传：`uploadUrl`、`objectKey`、`fileId`
- AI 解读：`interpretation`、`riskSignals`、`followUpSuggestions`

---

## 5. 后台端联调手册

### 5.1 后台联调前必须知道的事

后台联调和用户端最大的不同只有两点：

1. 登录接口不同，必须使用 `POST /admin/auth/login/password`
2. `Authorize` 里必须换成后台 token，不能继续用用户端 token

### 5.2 后台常用页面

| 页面名称 | 路由 | 页面文件 |
| --- | --- | --- |
| 登录页 | `/auth/login` | `apps/admin-web/src/pages/auth/login/Page.vue` |
| 后台首页 | `/dashboard/overview` | `apps/admin-web/src/pages/dashboard/overview/Page.vue` |

### 5.3 推荐后台联调顺序

1. `POST /admin/auth/login/password`
2. `GET /admin/auth/me`
3. `GET /admin/dashboard/overview`
4. `GET /admin/work-orders`
5. `GET /admin/orders`
6. `GET /admin/orders/{orderId}`
7. `POST /admin/orders/{orderId}/dispatch`
8. `PUT /admin/work-orders/{workOrderId}/status`
9. `GET /admin/reports`
10. `PUT /admin/reports/{reportId}/review`

### 5.4 后台重点接口怎么测

| 接口 | 页面里做什么 | Swagger 里怎么测 | 成功后看什么 |
| --- | --- | --- | --- |
| `GET /admin/dashboard/overview` | 后台首页统计卡片 | 授权后台 token 后直接执行 | 总览卡片、待办项 |
| `GET /admin/work-orders` | 工单列表 | 先执行列表拿 `workOrderId` | `data.list[].workOrderId` |
| `GET /admin/orders` | 订单管理列表 | 先执行列表拿 `orderId` | `data.list[].orderId` |
| `POST /admin/orders/{orderId}/dispatch` | 派单 | 用真实 `orderId` 提交机构/员工/排班信息 | 派单结果、更新后的状态 |
| `PUT /admin/work-orders/{workOrderId}/status` | 工单流转 | 用真实 `workOrderId` 更新状态 | 新状态是否生效 |
| `GET /admin/reports` | 报告审核列表 | 可带 `status` 筛选 | `data.list[].reportId` |
| `PUT /admin/reports/{reportId}/review` | 审核报告 | 用真实 `reportId` 提交审核状态 | 审核结果 |

后台派单请求体示例：

```json
{
  "institutionId": "org_shanghai_001",
  "assigneeStaffId": "staff_caregiver_001",
  "scheduleId": "schedule_20260424_pm",
  "dispatchNote": "优先安排熟悉康复护理的治疗师"
}
```

后台更新工单状态请求体示例：

```json
{
  "status": "IN_PROGRESS"
}
```

后台审核报告请求体示例：

```json
{
  "status": "APPROVED"
}
```

---

## 6. 建议直接执行的联调测试用例

下面这些不是自动化脚本，而是建议每位前端同学在 Swagger 里至少手动走一遍的联调用例。

### 6.1 用户端最小联调用例

| 步骤 | Swagger 接口 | 预期结果 |
| --- | --- | --- |
| 1 | `GET /system/health` | `code = 0` |
| 2 | `POST /app/auth/login/password` | 拿到 `APP_TOKEN` |
| 3 | `GET /app/users/me` | 能看到当前登录用户 |
| 4 | `GET /app/home/dashboard` | 首页聚合数据正常返回 |
| 5 | `GET /app/family/addresses` | 地址列表正常返回 |
| 6 | `GET /app/orders` | 订单列表正常返回 |

### 6.2 服务下单与支付链路用例

| 步骤 | Swagger 接口 | 预期结果 |
| --- | --- | --- |
| 1 | `GET /app/services/home-care` 或其他服务列表 | 拿到 `serviceId` |
| 2 | `GET /app/family/addresses` | 拿到 `addressId` |
| 3 | `GET /app/orders/booking/options` | 可约日期和时段返回正常 |
| 4 | `POST /app/orders/preview` | 价格和服务摘要正常 |
| 5 | `POST /app/orders` | 拿到 `orderId` |
| 6 | `POST /app/payments` | 拿到 `paymentId` |
| 7 | `POST /app/payments/{paymentId}/confirm` | 支付状态更新成功 |
| 8 | `GET /app/payments/{paymentId}` | 支付结果页数据正常 |

### 6.3 报告上传链路用例

| 步骤 | Swagger 接口 | 预期结果 |
| --- | --- | --- |
| 1 | `POST /app/files/presign` | 拿到 `uploadUrl`、`objectKey` |
| 2 | `POST /app/files/complete` | 拿到 `fileId` 或文件对象 |
| 3 | `POST /app/health/reports/checkups` | 报告创建成功 |
| 4 | `GET /app/health/reports/checkups` | 新报告出现在列表里 |
| 5 | `GET /app/health/reports/checkups/{reportId}` | 报告详情正常返回 |

### 6.4 后台最小联调用例

| 步骤 | Swagger 接口 | 预期结果 |
| --- | --- | --- |
| 1 | `POST /admin/auth/login/password` | 拿到 `ADMIN_TOKEN` |
| 2 | `GET /admin/auth/me` | 当前后台用户正常返回 |
| 3 | `GET /admin/dashboard/overview` | 后台首页正常返回 |
| 4 | `GET /admin/orders` | 后台订单列表正常返回 |
| 5 | `GET /admin/work-orders` | 工单列表正常返回 |
| 6 | `GET /admin/reports` | 报告列表正常返回 |

---

## 7. 前端页面速查表

说明：

- 当你已经知道页面文件，但不知道它是哪一页时，直接来这里查。
- 本节统一给出页面名称、路由和页面文件路径。
- 如果正文里看到某个接口，不确定对应哪个页面，也可以反查这里。

### 7.1 用户端页面速查表

#### 认证

| 页面名称 | 页面 ID | 路由 | 页面用途 | 页面文件 |
| --- | --- | --- | --- | --- |
| 登录页 | `auth/login` | `/auth/login` | 手机号密码、验证码、第三方登录入口 | `apps/user-web/src/pages/auth/login/Page.vue` |
| 忘记密码 | `auth/forgot-password` | `/auth/forgot-password` | 验证手机号和验证码 | `apps/user-web/src/pages/auth/forgot-password/Page.vue` |
| 设置密码 | `auth/reset-password` | `/auth/reset-password` | 验证成功后设置新密码 | `apps/user-web/src/pages/auth/reset-password/Page.vue` |
| 实名认证 | `auth/real-name` | `/auth/real-name` | 提交姓名、身份证号等实名信息 | `apps/user-web/src/pages/auth/real-name/Page.vue` |

#### 首页、我的、消息

| 页面名称 | 页面 ID | 路由 | 页面用途 | 页面文件 |
| --- | --- | --- | --- | --- |
| 首页 | `home/dashboard` | `/home/dashboard` | 首页主入口、服务入口、健康提醒、推荐内容 | `apps/user-web/src/pages/home/dashboard/Page.vue` |
| 选择地区 | `home/location-select` | `/home/location-select` | 城市与地区选择 | `apps/user-web/src/pages/home/location-select/Page.vue` |
| 搜索 | `home/search` | `/home/search` | 热搜、历史记录、全局搜索结果 | `apps/user-web/src/pages/home/search/Page.vue` |
| 个人主页 | `home/profile` | `/home/profile` | 用户资料、关注、动态列表 | `apps/user-web/src/pages/home/profile/Page.vue` |
| 我的 | `home/mine` | `/home/mine` | 我的主页、订单、常用入口 | `apps/user-web/src/pages/home/mine/Page.vue` |
| 我的足迹 | `home/MyJ/myfoot` | `/home/MyJ/myfoot` | 浏览记录列表与清空操作 | `apps/user-web/src/pages/home/MyJ/myfoot/Page.vue` |
| 我的积分 | `home/MyJ/integration` | `/home/MyJ/integration` | 积分总览与积分明细 | `apps/user-web/src/pages/home/MyJ/integration/Page.vue` |
| 设置 | `home/MyJ/setting` | `/home/MyJ/setting` | 设置入口页 | `apps/user-web/src/pages/home/MyJ/setting/Page.vue` |
| 个人资料 | `home/MyJ/profile-info` | `/home/MyJ/profile-info` | 头像、昵称、城市等资料编辑 | `apps/user-web/src/pages/home/MyJ/profile-info/Page.vue` |
| 账号与安全 | `home/MyJ/account-security` | `/home/MyJ/account-security` | 手机号、密码、账号安全信息 | `apps/user-web/src/pages/home/MyJ/account-security/Page.vue` |
| 消息设置 | `home/MyJ/message-settings` | `/home/MyJ/message-settings` | 分类通知开关设置 | `apps/user-web/src/pages/home/MyJ/message-settings/Page.vue` |
| 我参加的活动 | `home/MyJ/myactivity` | `/home/MyJ/myactivity` | 我的活动列表 | `apps/user-web/src/pages/home/MyJ/myactivity/Page.vue` |
| 消息 | `home/message` | `/home/message` | 消息中心首页 | `apps/user-web/src/pages/home/message/Page.vue` |
| 医生咨询 | `home/doctor-chat` | `/home/doctor-chat` | 医生咨询聊天会话 | `apps/user-web/src/pages/home/doctor-chat/Page.vue` |
| 评论回复 | `home/message-comment-detail` | `/home/message-comment-detail` | 评论/回复消息详情 | `apps/user-web/src/pages/home/message-comment-detail/Page.vue` |
| 赞和收藏 | `home/message-like-detail` | `/home/message-like-detail` | 点赞/收藏消息详情 | `apps/user-web/src/pages/home/message-like-detail/Page.vue` |

#### 健康档案与报告

| 页面名称 | 页面 ID | 路由 | 页面用途 | 页面文件 |
| --- | --- | --- | --- | --- |
| 健康档案 | `healthdocs/health-records` | `/healthdocs/health-records` | 健康档案总览页 | `apps/user-web/src/pages/healthdocs/health-records/Page.vue` |
| 基础信息 | `healthdocs/basic-info` | `/healthdocs/basic-info` | 基础资料、紧急联系人、过敏信息 | `apps/user-web/src/pages/healthdocs/basic-info/Page.vue` |
| 既往病史 | `healthdocs/medical-history` | `/healthdocs/medical-history` | 慢病史、手术史、长期用药 | `apps/user-web/src/pages/healthdocs/medical-history/Page.vue` |
| 体检报告 | `healthdocs/checkup-reports` | `/healthdocs/checkup-reports` | 报告列表页 | `apps/user-web/src/pages/healthdocs/checkup-reports/Page.vue` |
| 上传报告 | `healthdocs/report-upload` | `/healthdocs/report-upload` | 报告上传与附件提交流程 | `apps/user-web/src/pages/healthdocs/report-upload/Page.vue` |
| 报告详情 | `healthdocs/report-detail` | `/healthdocs/report-detail` | 单份报告详情 | `apps/user-web/src/pages/healthdocs/report-detail/Page.vue` |
| 报告解读 | `healthdocs/report-interpretation` | `/healthdocs/report-interpretation` | 报告说明、风险提示、建议 | `apps/user-web/src/pages/healthdocs/report-interpretation/Page.vue` |

#### 健康数据、设备、用药

| 页面名称 | 页面 ID | 路由 | 页面用途 | 页面文件 |
| --- | --- | --- | --- | --- |
| 健康数据 | `health/health-data` | `/health/health-data` | 血压、血糖、睡眠等指标总览 | `apps/user-web/src/pages/health/health-data/Page.vue` |
| 添加数据 | `health/add-data` | `/health/add-data` | 手动新增健康数据记录 | `apps/user-web/src/pages/health/add-data/Page.vue` |
| 步数详情 | `health/data-steps` | `/health/data-steps` | 步数趋势与明细 | `apps/user-web/src/pages/health/data-steps/Page.vue` |
| 睡眠 | `health/data-sleep` | `/health/data-sleep` | 睡眠趋势与睡眠结构 | `apps/user-web/src/pages/health/data-sleep/Page.vue` |
| 体重 | `health/data-weight` | `/health/data-weight` | 体重与 BMI 趋势 | `apps/user-web/src/pages/health/data-weight/Page.vue` |
| 血糖 | `health/data-bloodglucose` | `/health/data-bloodglucose` | 血糖趋势、餐前餐后变化 | `apps/user-web/src/pages/health/data-bloodglucose/Page.vue` |
| 血压 | `health/data-bloodpressure` | `/health/data-bloodpressure` | 血压趋势与波动 | `apps/user-web/src/pages/health/data-bloodpressure/Page.vue` |
| 心率详情 | `health/data-heartrate` | `/health/data-heartrate` | 心率详情与时段分布 | `apps/user-web/src/pages/health/data-heartrate/Page.vue` |
| 血氧 | `health/data-spo2` | `/health/data-spo2` | 血氧趋势与区间统计 | `apps/user-web/src/pages/health/data-spo2/Page.vue` |
| 压力 | `health/data-pressure` | `/health/data-pressure` | 压力指数趋势 | `apps/user-web/src/pages/health/data-pressure/Page.vue` |
| 设备中心 | `health/device-center` | `/health/device-center` | 已绑定设备列表与状态 | `apps/user-web/src/pages/health/device-center/Page.vue` |
| 设备详情 | `health/device-detail` | `/health/device-detail` | 单个设备信息、设置、快捷操作 | `apps/user-web/src/pages/health/device-detail/Page.vue` |
| 设备添加 | `health/device-add` | `/health/device-add` | 手动绑定设备 | `apps/user-web/src/pages/health/device-add/Page.vue` |
| 设备扫码绑定 | `health/device-scan` | `/health/device-scan` | 扫码绑定设备 | `apps/user-web/src/pages/health/device-scan/Page.vue` |
| 设备密码 | `health/device-password` | `/health/device-password` | 设备密码设置页 | `apps/user-web/src/pages/health/device-password/Page.vue` |
| 心率设置 | `health/heart-rate-settings` | `/health/heart-rate-settings` | 设备心率阈值设置 | `apps/user-web/src/pages/health/heart-rate-settings/Page.vue` |
| 用药信息 | `health/medication-info` | `/health/medication-info` | 当日与历史用药提醒 | `apps/user-web/src/pages/health/medication-info/Page.vue` |
| 添加用药信息 | `health/medication-add` | `/health/medication-add` | 新增用药计划 | `apps/user-web/src/pages/health/medication-add/Page.vue` |
| 编辑用药提醒 | `health/medication-edit` | `/health/medication-edit` | 编辑用药计划 | `apps/user-web/src/pages/health/medication-edit/Page.vue` |

#### 饮食记录与自测

| 页面名称 | 页面 ID | 路由 | 页面用途 | 页面文件 |
| --- | --- | --- | --- | --- |
| 健康膳食 | `health/diet-plan` | `/health/diet-plan` | 膳食首页、推荐食谱 | `apps/user-web/src/pages/health/diet-plan/Page.vue` |
| 食谱详情 | `health/diet-recipe-detail` | `/health/diet-recipe-detail` | 单个食谱详情 | `apps/user-web/src/pages/health/diet-recipe-detail/Page.vue` |
| 饮食记录 | `diet-record` | `/diet-record` | 当日饮食记录页 | `apps/user-web/src/pages/diet-record/Page.vue` |
| 添加饮食记录 | `diet-record/add-record` | `/diet-record/add-record` | 新增饮食记录 | `apps/user-web/src/pages/diet-record/add-record/Page.vue` |
| 历史数据 | `diet-record/history-data` | `/diet-record/history-data` | 饮食历史统计 | `apps/user-web/src/pages/diet-record/history-data/Page.vue` |
| 健康自测 | `health/self-test` | `/health/self-test` | 自测项目、答题、结果页 | `apps/user-web/src/pages/health/self-test/Page.vue` |

#### 服务、订单、支付

| 页面名称 | 页面 ID | 路由 | 页面用途 | 页面文件 |
| --- | --- | --- | --- | --- |
| 家政护理 | `service/home-care` | `/service/home-care` | 家政护理服务列表 | `apps/user-web/src/pages/service/home-care/Page.vue` |
| 家政护理详情 | `service/home-care-detail` | `/service/home-care-detail` | 家政护理服务详情 | `apps/user-web/src/pages/service/home-care-detail/Page.vue` |
| 日常清洁 | `service/daily-clean` | `/service/daily-clean` | 日常清洁服务列表 | `apps/user-web/src/pages/service/daily-clean/Page.vue` |
| 康复理疗 | `service/rehab-therapy` | `/service/rehab-therapy` | 康复理疗服务列表 | `apps/user-web/src/pages/service/rehab-therapy/Page.vue` |
| 康复理疗项目详情 | `service/rehab-therapy-detail` | `/service/rehab-therapy-detail` | 康复理疗服务详情 | `apps/user-web/src/pages/service/rehab-therapy-detail/Page.vue` |
| 上门体检 | `service/home-exam` | `/service/home-exam` | 上门体检服务列表 | `apps/user-web/src/pages/service/home-exam/Page.vue` |
| 上门体检项目详情 | `service/home-exam-detail` | `/service/home-exam-detail` | 上门体检服务详情 | `apps/user-web/src/pages/service/home-exam-detail/Page.vue` |
| 养老机构 | `service/elderly-care` | `/service/elderly-care` | 养老机构列表 | `apps/user-web/src/pages/service/elderly-care/Page.vue` |
| 养老机构详情 | `service/elderly-care-detail` | `/service/elderly-care-detail` | 养老机构详情 | `apps/user-web/src/pages/service/elderly-care-detail/Page.vue` |
| 预约服务 | `service/booking` | `/service/booking` | 选择地址、日期、时段 | `apps/user-web/src/pages/service/booking/Page.vue` |
| 订单确认 | `service/order-confirm` | `/service/order-confirm` | 提交订单前确认信息 | `apps/user-web/src/pages/service/order-confirm/Page.vue` |
| 支付订单 | `service/payment` | `/service/payment` | 选择支付方式并发起支付 | `apps/user-web/src/pages/service/payment/Page.vue` |
| 支付结果 | `service/payment-result` | `/service/payment-result` | 支付成功/失败结果页 | `apps/user-web/src/pages/service/payment-result/Page.vue` |
| 订单详情 | `service/order-detail` | `/service/order-detail` | 订单详情页 | `apps/user-web/src/pages/service/order-detail/Page.vue` |
| 修改订单信息 | `service/order-edit` | `/service/order-edit` | 改约页 | `apps/user-web/src/pages/service/order-edit/Page.vue` |
| 服务跟踪 | `service/service-track` | `/service/service-track` | 服务状态时间线 | `apps/user-web/src/pages/service/service-track/Page.vue` |
| 家政护理订单 | `service/home-care-orders` | `/service/home-care-orders` | 订单列表与状态筛选 | `apps/user-web/src/pages/service/home-care-orders/Page.vue` |
| 我的订单 | `orders/rehab-therapy` | `/orders/rehab-therapy` | 我的订单总列表 | `apps/user-web/src/pages/orders/rehab-therapy/Page.vue` |
| 服务记录 | `orders/willservice/service-record` | `/orders/willservice/service-record` | 服务记录页 | `apps/user-web/src/pages/orders/willservice/service-record/Page.vue` |
| 评估报告 | `orders/willservice/assessment-report` | `/orders/willservice/assessment-report` | 评估报告页 | `apps/user-web/src/pages/orders/willservice/assessment-report/Page.vue` |
| 康复报告 | `orders/willservice/rehab-report` | `/orders/willservice/rehab-report` | 康复报告页 | `apps/user-web/src/pages/orders/willservice/rehab-report/Page.vue` |

#### 内容与社区

| 页面名称 | 页面 ID | 路由 | 页面用途 | 页面文件 |
| --- | --- | --- | --- | --- |
| 健康资讯 | `content/health-news` | `/content/health-news` | 资讯列表页 | `apps/user-web/src/pages/content/health-news/Page.vue` |
| 健康资讯详情 | `content/health-news-detail` | `/content/health-news-detail` | 单篇资讯详情 | `apps/user-web/src/pages/content/health-news-detail/Page.vue` |
| 健康讲堂 | `content/health-lecture` | `/content/health-lecture` | 讲堂列表页 | `apps/user-web/src/pages/content/health-lecture/Page.vue` |
| 健康讲堂详情 | `content/health-lecture-detail` | `/content/health-lecture-detail` | 单个讲堂详情 | `apps/user-web/src/pages/content/health-lecture-detail/Page.vue` |
| 疾病宝典 | `content/disease-guide` | `/content/disease-guide` | 疾病列表与科室分类 | `apps/user-web/src/pages/content/disease-guide/Page.vue` |
| 疾病详情 | `content/disease-detail` | `/content/disease-detail` | 疾病详情页 | `apps/user-web/src/pages/content/disease-detail/Page.vue` |
| 生活圈 | `community/circle` | `/community/circle` | 帖子流、话题流 | `apps/user-web/src/pages/community/circle/Page.vue` |
| 发布动态 | `community/publish` | `/community/publish` | 发布帖子 | `apps/user-web/src/pages/community/publish/Page.vue` |
| 帖子详情 | `community/post-detail` | `/community/post-detail` | 单篇帖子详情 | `apps/user-web/src/pages/community/post-detail/Page.vue` |
| 老年活动 | `community/senior-activities` | `/community/senior-activities` | 活动列表 | `apps/user-web/src/pages/community/senior-activities/Page.vue` |
| 活动详情 | `community/senior-activity-detail` | `/community/senior-activity-detail` | 单个活动详情、报名、评论 | `apps/user-web/src/pages/community/senior-activity-detail/Page.vue` |

### 7.2 后台端页面速查表

| 页面名称 | 页面 ID | 路由 | 页面用途 | 页面文件 |
| --- | --- | --- | --- | --- |
| 登录页 | `auth/login` | `/auth/login` | 后台登录入口 | `apps/admin-web/src/pages/auth/login/Page.vue` |
| 后台首页 | `dashboard/overview` | `/dashboard/overview` | 后台总览、统计卡片 | `apps/admin-web/src/pages/dashboard/overview/Page.vue` |

---

## 8. 最后给前端同学的使用建议

如果你只负责一个页面，最短路径是：

1. 先在第 `7` 节找到页面名称、路由和文件。
2. 再回到第 `4` 节或第 `5` 节找到对应业务模块。
3. 按本文给出的推荐顺序先把 Swagger 跑通。
4. 记录页面真正需要的字段名。
5. 再回到前端页面接真实接口。

如果你是联调负责人，建议要求每位前端同学在提测前至少提供：

- 已测试的 Swagger 接口列表
- 成功返回截图
- 失败场景截图
- 出错时的 `requestId`
- 页面和接口映射说明

如果页面联调时发现“前端字段需求”和 Swagger 返回不一致，优先以 Swagger 当前实际返回和对应 controller 定义为准，再和后端确认差异。
