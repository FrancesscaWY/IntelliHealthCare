# 用户端 AI 服务功能文档

更新时间：2026-04-22

## 1. 文档目标

本文档面向用户端前端开发，说明当前 IntelliHealthCare 用户端应接入哪些 AI 服务、这些服务会出现在哪些页面、后端现状是什么、前端需要预留哪些接口与交互形态。

本文档的重点不是页面视觉，而是把下面三件事讲清楚：

- 多智能体对用户端到底提供哪些服务
- 这些服务分别落在哪些页面和跳转链路上
- 前端现在能直接联调什么，哪些能力需要先按规划预留接口位

## 2. 依据

当前仓库中 `apps/backend` 只保留了编译产物，没有 `src` 源码，因此本文档以以下文件为准：

- `apps/backend/dist/modules/agents/domain/framework-blueprint.js`
- `apps/backend/dist/modules/agents/domain/agent-registry.js`
- `apps/backend/dist/modules/agents/application/agent-orchestrator.service.js`
- `apps/backend/dist/modules/reports/*.js`
- `apps/backend/dist/modules/health-archive/*.js`
- `apps/backend/dist/modules/health-metrics/*.js`
- `apps/backend/dist/modules/service-catalog/*.js`
- `apps/backend/dist/modules/orders/*.js`
- `apps/user-web/src/app/pages.manifest.json`
- `apps/user-web/src/pages/home/**`
- `apps/user-web/src/pages/health/**`
- `apps/user-web/src/pages/healthdocs/**`
- `apps/user-web/src/pages/service/**`
- `apps/user-web/src/pages/orders/**`

## 3. 总体结论

### 3.1 用户端 AI 服务应按 5 类能力设计

1. 统一康养助手
2. 报告解读与后续建议
3. 服务推荐与预约预填
4. 健康总结与趋势解释
5. 风险提醒与回访建议

### 3.2 UI 层建议只有一个统一 AI 入口

后端蓝图明确要求：UI 层保留一个统一助手入口，但 API 层按能力拆分。也就是说，前端可以有一个统一“AI 助手/健康助手”入口，但底层不要把所有能力都混成一个无边界接口。

建议做法：

- 会话类能力走统一助手入口
- 页面内的结构化 AI 能力仍按页面场景拆成独立接口
- 页面跳转建议统一使用 `pageId`，与 `apps/user-web/src/app/pages.manifest.json` 保持一致

### 3.3 前端不要直连内部智能体接口

当前后端已有内部多智能体任务接口：

- `GET /internal/agents/definitions`
- `GET /internal/agents/blueprint`
- `POST /internal/agents/tasks`
- `GET /internal/agents/tasks`
- `GET /internal/agents/tasks/:taskId`
- `POST /internal/agents/tasks/:taskId/retry`

这些接口是后端内部编排与调试口，不应作为前端正式业务接口直接使用。前端应对接 `app/*` 业务接口，或者由后端新增用户侧 AI API 后再接入。

### 3.4 前端需要预留异步任务态

当前多智能体底座基于 `AgentTask + BullMQ` 异步执行，状态至少包含：

- `pending`
- `running`
- `succeeded`
- `failed`
- `retry-scheduled`

因此所有 AI 页面都应预留以下前端状态：

- 生成中
- 生成成功
- 生成失败
- 重试
- 需要人工复核

## 4. 能力总览

| AI 能力 | 用户侧状态 | 多智能体状态 | 主要页面 | 说明 |
| --- | --- | --- | --- | --- |
| 统一康养助手 | 未提供用户 API | `planned` | `home/message`、`home/doctor-chat`、`healthdocs/health-records`、`home/dashboard` | 蓝图明确存在，但消息模块还未落用户侧接口 |
| 报告解读与后续建议 | 已有基础业务 API，可联调 | `partial` | `healthdocs/checkup-reports`、`healthdocs/report-detail`、`healthdocs/report-interpretation`、`healthdocs/report-upload`、`health/report-detail` | 当前可拿到简版解读；多智能体富结构化输出已具备底座 |
| 服务推荐与预约预填 | 目录/下单接口已可联调，独立 AI 推荐 API 未提供 | `partial` | `service/home-care`、`service/rehab-therapy`、`service/home-exam`、`service/elderly-care`、`service/booking`、`service/order-confirm` | 当前有服务目录和订单预览，AI 推荐能力在内部底座已具备 |
| 健康总结与趋势解释 | 健康档案/指标接口已可联调，AI 总结 API 未提供 | `planned` | `health/health-data`、`healthdocs/health-records`、`health/data-*`、`health/device-center`、`health/medication-info`、`health/diet-plan`、`health/self-test` | 数据接口完整，AI 聚合解释还未暴露业务口 |
| 风险提醒与回访建议 | 可从摘要/概览接口取到基础提醒数据，AI 风险 API 未提供 | `planned` | `home/message`、`home/dashboard`、`health/health-data`、`health/device-center`、`orders/rehab-therapy` | 蓝图已定义，当前只有部分确定性提醒数据 |

## 5. 详细能力说明

### 5.1 统一康养助手

#### 功能定位

统一承接用户问询，把健康摘要、报告解读、服务推荐和风险提醒整合成一个会话式入口，并输出下一步页面跳转建议。

#### 关联页面

- `home/message`
- `home/doctor-chat`
- `healthdocs/health-records`
- `home/dashboard`

#### 页面落点

| 页面 | 入口形式 | 前端要承接的功能 |
| --- | --- | --- |
| `home/message` | 聊天 tab 中的“你的小助手”会话卡片 | 助手会话列表入口 |
| `home/doctor-chat` | 会话详情页 | 文本、图片、语音提问；回复卡片；跳转建议 |
| `healthdocs/health-records` | 右上角“档案助手”按钮 | 从健康档案页直接发起上下文问答 |
| `home/dashboard` | 建议新增快捷入口或悬浮入口 | 首页统一 AI 入口 |

#### 后端现状

- 蓝图中 `unified-assistant-entry` 为用户端核心能力，但状态为 `planned`
- `messaging` 模块当前只有空模块，未提供用户侧会话 API
- 蓝图要求 `AssistantConversationAgent` 作为唯一交互门面，但当前未在 `agent-registry` 中落地

#### 前端接口设计建议

前端应按“会话接口 + 异步回复 + 跳转建议”的模式设计，建议后端后续补充以下业务口：

- `POST /app/assistant/conversations`
- `GET /app/assistant/conversations`
- `GET /app/assistant/conversations/:conversationId/messages`
- `POST /app/assistant/conversations/:conversationId/messages`
- `GET /app/assistant/tasks/:taskId`

建议消息返回结构至少包含：

```json
{
  "conversationId": "conv_xxx",
  "messageId": "msg_xxx",
  "role": "assistant",
  "content": "最近血压波动偏高，建议先查看近7天趋势。",
  "cards": [
    {
      "type": "health-summary",
      "title": "近7天血压摘要",
      "summary": "晨起收缩压偏高 3 次"
    }
  ],
  "quickReplies": ["查看血压趋势", "看看体检报告", "推荐上门体检"],
  "navigationSuggestions": [
    {
      "pageId": "health/data-bloodpressure",
      "label": "查看血压趋势"
    }
  ],
  "requiresHumanReview": false
}
```

#### 前端注意事项

- 当前可以先复用 `home/doctor-chat` 的聊天容器，但名称应从“王医生”抽象成“AI 助手 + 人工医生升级”
- 会话页必须支持 `text`、`image`、`voice` 三类消息
- 会话页必须支持“跳转卡片”“快捷追问”“转人工/医生咨询”三类操作位

### 5.2 报告解读与后续建议

#### 功能定位

对体检报告、服务报告、康复报告做结构化解读，输出重点指标、风险信号、后续动作和是否需要人工复核。

#### 关联页面

- `healthdocs/health-records`
- `healthdocs/checkup-reports`
- `healthdocs/report-upload`
- `healthdocs/report-detail`
- `healthdocs/report-interpretation`
- `health/report-detail`
- `service/home-exam-detail`
- `orders/rehab-therapy`

#### 当前可直接联调的业务接口

| 接口 | 用途 |
| --- | --- |
| `GET /app/health/reports/checkups` | 体检报告列表 |
| `POST /app/health/reports/checkups` | 新建体检报告 |
| `GET /app/health/reports/checkups/:reportId` | 报告详情 |
| `DELETE /app/health/reports/checkups/:reportId` | 删除报告 |
| `GET /app/health/reports/checkups/:reportId/interpretation` | 获取简版报告解读 |
| `GET /app/orders/:orderId/assessment-report` | 获取服务评估报告 |
| `GET /app/orders/:orderId/rehab-report` | 获取康复报告 |

#### 当前后端返回能力

当前用户侧报告解读接口返回的是简版结构：

```json
{
  "reportId": "report_xxx",
  "interpretation": "报告已归档，建议重点关注异常指标、慢病随访建议和后续复查时间。",
  "followupSuggestions": [
    "如存在异常指标，请在 1-2 周内安排复查。",
    "将体检结论与既往慢病用药方案一并交由医生复核。",
    "若需要家属协助，可同步分享报告摘要与注意事项。"
  ]
}
```

#### 多智能体底座现状

内部已存在：

- `report-summary-agent`
- `task-orchestrator-agent` 蓝图
- `HealthManagementAgent` 蓝图
- 报告工具、档案工具、指标工具

内部结构化输出 Schema 已支持：

- `conclusion`
- `evidence`
- `uncertainties`
- `followUpActions`
- `requiresHumanReview`
- `reportHighlights`
- `riskSignals`

#### 前端页面设计建议

`healthdocs/report-interpretation` 页面不要只设计成一段纯文本，建议直接按富结构化布局设计：

- 结论摘要
- 报告重点
- 风险信号
- 证据来源
- 不确定项
- 后续建议
- 是否需人工复核提示

建议前端按下面的未来结构预留组件位：

```json
{
  "reportId": "report_xxx",
  "conclusion": "本次血脂存在异常，重点关注 LDL 和 HDL。",
  "reportHighlights": ["低密度脂蛋白偏高", "高密度脂蛋白偏低"],
  "riskSignals": ["高血脂风险", "心血管风险需持续观察"],
  "evidence": [
    {
      "source": "report",
      "summary": "血脂报告存在 2 项异常指标"
    }
  ],
  "uncertainties": ["缺少最近 30 天指标趋势，无法判断短期波动是否持续"],
  "followUpActions": ["2 周内复查血脂", "结合用药情况复核", "必要时预约上门体检"],
  "requiresHumanReview": true
}
```

#### 页面链路建议

- `healthdocs/report-upload` 上传成功后可直接触发“生成解读”
- `healthdocs/checkup-reports` 每条报告保留“查看报告”和“报告解读”双入口
- `healthdocs/report-detail` 底部保留固定“报告解读” CTA
- `orders/rehab-therapy` 中的“评估报告”按钮后续应跳转到 `health/report-detail` 或服务报告详情页

#### 依赖提醒

当前仓库里没有单独的对象存储上传 API 暴露给前端，`POST /app/health/reports/checkups` 也不是 `multipart/form-data`。如果前端要接真实上传，需要后端补充附件上传链路，或由 BFF 先完成文件上传再调用报告创建接口。

### 5.3 服务推荐与预约预填

#### 功能定位

根据自然语言需求、健康档案、近期指标、城市和服务目录，推荐合适服务，并预填预约信息。

#### 关联页面

- `home/dashboard`
- `service/home-care`
- `service/rehab-therapy`
- `service/home-exam`
- `service/elderly-care`
- `service/home-care-detail`
- `service/rehab-therapy-detail`
- `service/home-exam-detail`
- `service/elderly-care-detail`
- `service/booking`
- `service/order-confirm`
- `service/order-edit`

#### 当前可直接联调的业务接口

| 接口 | 用途 |
| --- | --- |
| `GET /app/services/categories` | 服务分类 |
| `GET /app/services/:category` | 分类下服务列表 |
| `GET /app/services/:category/:serviceId` | 服务详情 |
| `GET /app/orders/booking/options?serviceId=...` | 预约页需要的老人、地址、时间段 |
| `POST /app/orders/preview` | 订单确认页预览与价格试算 |
| `POST /app/orders` | 创建订单 |
| `PUT /app/orders/:orderId/schedule` | 改约 |

#### 多智能体底座现状

内部已存在：

- `service-recommendation-agent`
- 服务目录工具 `searchServiceCatalog`
- 基于档案和最新指标的推荐逻辑

内部结构化输出 Schema 已支持：

- `conclusion`
- `recommendations[]`
- `matchingSignals[]`
- `evidence`
- `followUpActions`

#### 前端页面设计建议

服务页不要只展示静态“为您推荐”。建议前端将推荐卡片做成 AI 可解释卡片，至少包含：

- 推荐结论
- 匹配原因
- 推荐服务列表
- 推荐后下一步动作
- 一键带入预约页

建议后续新增用户侧 AI 推荐接口：

- `POST /app/services/recommendations`

建议请求结构：

```json
{
  "query": "最近血糖偏高，想约一个上门检查",
  "userId": "user_xxx",
  "elderId": "elder_xxx",
  "city": "上海",
  "limit": 3
}
```

建议返回结构：

```json
{
  "conclusion": "已根据当前需求筛选上门体检服务，优先建议基础慢病复查套餐。",
  "matchingSignals": ["血糖异常", "上海", "上门检查"],
  "recommendations": [
    {
      "serviceId": "svc_xxx",
      "title": "基础慢病复查套餐",
      "category": "HOME_EXAM",
      "price": 399,
      "regionScope": ["上海市浦东新区", "上海市静安区"],
      "reason": "服务覆盖上海，且适合慢病复查"
    }
  ],
  "followUpActions": ["确认服务地址", "确认预约时间", "下单前核对最近报告"],
  "bookingPrefill": {
    "serviceId": "svc_xxx",
    "elderId": "elder_xxx"
  }
}
```

#### 页面链路建议

- `home/dashboard` 可放“AI 为您推荐”入口卡片
- 各服务列表页可在顶部放“个性化推荐”模块
- 各服务详情页可放“为什么推荐我”说明块
- `service/booking` 和 `service/order-confirm` 需支持 AI 预填后的二次确认，不要默认直接提交

### 5.4 健康总结与趋势解释

#### 功能定位

围绕健康档案、健康指标、设备数据、用药、自测、膳食等信息，生成近期健康总结和趋势解释。

#### 关联页面

- `healthdocs/health-records`
- `health/health-data`
- `health/data-bloodpressure`
- `health/data-bloodglucose`
- `health/data-heartrate`
- `health/data-sleep`
- `health/data-steps`
- `health/data-weight`
- `health/data-spo2`
- `health/data-pressure`
- `health/device-center`
- `health/device-detail`
- `health/medication-info`
- `health/diet-plan`
- `health/diet-recipe-detail`
- `health/self-test`

#### 当前可直接联调的业务接口

| 接口 | 用途 |
| --- | --- |
| `GET /app/health/archive/summary` | 健康档案摘要 |
| `GET /app/health/archive/basic-info` | 基础档案 |
| `GET /app/health/archive/medical-history` | 病史与风险标签 |
| `GET /app/health/metrics/overview` | 指标概览、评分、告警、设备摘要 |
| `GET /app/health/metrics/:metricKey/trend` | 指标趋势点位 |
| `GET /app/health/metrics/:metricKey/records` | 指标记录列表 |
| `GET /app/health/devices` | 设备列表 |
| `GET /app/health/devices/:deviceId` | 设备详情 |
| `GET /app/health/devices/:deviceId/measurements` | 设备采集记录 |
| `GET /app/health/medications/today` | 今日用药 |
| `GET /app/health/medications` | 用药列表 |

#### 后端现状判断

- 数据接口层已经足够支撑前端做确定性健康页
- 蓝图中 `health-summary` 是明确的用户能力
- 但 `agent-registry` 里还没有面向用户的独立健康总结任务类型
- 说明该能力属于“数据准备较完整，但 AI 聚合接口尚未暴露”的阶段

#### 前端页面设计建议

`health/health-data` 页面应预留一个 AI 概览区，建议展示：

- 健康结论
- 最近 7 天或 30 天趋势亮点
- 异常指标列表
- 与用药/膳食/自测结果的关联解释
- 下一步动作

建议后续新增接口：

- `GET /app/health/summary`

建议返回结构：

```json
{
  "score": 78,
  "scoreLabel": "需要关注",
  "conclusion": "近 7 天血压和空腹血糖波动偏高，建议优先复核晨起数据。",
  "trendHighlights": [
    "晨起收缩压连续 3 天高于 140",
    "空腹血糖较上周均值升高 0.8 mmol/L"
  ],
  "riskSignals": ["高血压管理压力", "糖代谢异常风险"],
  "followUpActions": ["继续记录 7 天血压", "查看最近体检报告", "必要时预约上门体检"],
  "navigationSuggestions": [
    {
      "pageId": "health/data-bloodpressure",
      "label": "查看血压趋势"
    },
    {
      "pageId": "healthdocs/checkup-reports",
      "label": "查看最近报告"
    }
  ],
  "requiresHumanReview": false
}
```

#### 子能力说明

| 子能力 | 页面 | 状态 | 说明 |
| --- | --- | --- | --- |
| 指标趋势解释 | `health/health-data`、`health/data-*` | 可按现有数据接口先做确定性页面 | 后续接 AI 文案和趋势解释 |
| 设备异常解释 | `health/device-center`、`health/device-detail` | 可拿设备与测量数据 | AI 诊断仍是后台优先，用户端先做提醒说明 |
| 用药上下文解释 | `health/medication-info` | 数据接口可联调 | 后续接“为何提醒/漏服风险”解释 |
| 膳食建议 | `health/diet-plan`、`health/diet-recipe-detail` | 规划中 | 蓝图提到 diet context，但当前后端未暴露独立接口 |
| 自测结果解释 | `health/self-test` | 规划中 | 当前页面本地计算风险，后续可接统一风险总结 |

### 5.5 风险提醒与回访建议

#### 功能定位

围绕异常指标、风险标签、报告结论和长期风险，生成风险提醒、消息触达和回访建议。

#### 关联页面

- `home/message`
- `home/dashboard`
- `health/health-data`
- `health/device-center`
- `healthdocs/health-records`
- `orders/rehab-therapy`

#### 当前可直接利用的数据接口

| 接口 | 可提供的当前数据 |
| --- | --- |
| `GET /app/health/archive/summary` | `riskTags`、`recentAlerts` |
| `GET /app/health/metrics/overview` | `alerts`、`summaryCards.abnormal` |
| `GET /app/health/devices` | 设备状态、更新时间 |

#### 多智能体现状

- 蓝图中 `risk-notification` 为用户端能力，状态 `planned`
- `risk-operations-agent` 为 `planned`
- `safety-review-agent` 负责高风险场景人工复核

#### 前端页面设计建议

风险提醒不应只是一条“系统通知”，建议直接支持以下字段：

- 风险等级
- 风险标题
- 风险原因
- 建议动作
- 推荐跳转页
- 是否需要人工联系

建议后续新增接口：

- `GET /app/health/risk-notifications`

建议返回结构：

```json
{
  "items": [
    {
      "notificationId": "risk_xxx",
      "level": "high",
      "title": "连续血压偏高",
      "summary": "近 3 次晨起血压均偏高，建议尽快复核。",
      "evidence": ["近 3 次收缩压 >= 140", "存在高血压病史标签"],
      "followUpActions": ["今天继续测量 1 次", "查看最近报告", "联系医生或家属"],
      "jumpTarget": {
        "pageId": "health/data-bloodpressure",
        "label": "查看血压详情"
      },
      "requiresHumanReview": false,
      "manualContactRequired": true
    }
  ]
}
```

#### 前端注意事项

- `home/message` 的“健康提醒”卡片后续应从统一风险提醒接口驱动
- `home/dashboard` 的“提醒”卡片应支持点击进入风险详情或对应趋势页
- 高风险提醒要预留“联系医生/联系客服/通知家属”按钮位

## 6. 页面映射清单

| 页面 id | AI 服务 | 入口/展示位置 | 说明 |
| --- | --- | --- | --- |
| `home/dashboard` | 统一助手、服务推荐、风险提醒、健康总结摘要 | 首页快捷入口、提醒卡片、推荐卡片 | 用户端 AI 总入口页之一 |
| `home/message` | 统一助手、风险提醒 | 聊天 tab、通知 tab | 会话列表与风险消息聚合页 |
| `home/doctor-chat` | 统一助手会话、医生升级 | 聊天详情页 | 现有页面可复用为 AI 会话容器 |
| `healthdocs/health-records` | 档案助手、健康总结 | 右上角助手按钮、总览卡片 | 健康档案场景的 AI 主入口 |
| `healthdocs/checkup-reports` | 报告解读 | 报告卡片 CTA | “报告解读”按钮已存在 |
| `healthdocs/report-upload` | 上传后自动生成报告解读 | 保存成功后触发 | 建议增加“上传并生成解读”链路 |
| `healthdocs/report-detail` | 报告解读与后续建议 | 底部固定 CTA | 详情页主触发点 |
| `healthdocs/report-interpretation` | 报告解读结果展示 | 页面主体 | 不要只做文本，需支持结构化输出 |
| `health/report-detail` | 统一健康报告详情 | 页面主体 | 未来承接体检/设备/服务报告统一入口 |
| `health/health-data` | 健康总结、趋势解释、风险提醒 | 顶部摘要区、异常区 | 用户健康智能页核心落点 |
| `health/data-*` | 单指标趋势解释 | 页面主体 | 接收 AI 对单指标的解释 |
| `health/device-center` | 设备异常解释、风险提醒 | 设备列表、告警区 | 当前先接设备/测量数据接口 |
| `health/medication-info` | 用药上下文解释、回访建议 | 概览卡片、药品行 | 后续可接漏服风险说明 |
| `health/diet-plan` | 膳食建议、食谱推荐 | 顶部摘要区、推荐区 | 当前先按规划预留 |
| `health/self-test` | 测评结果解释、风险建议 | 结果页 | 当前为本地算法，后续接统一 AI 风险说明 |
| `service/home-care` | AI 推荐服务 | 推荐模块 | 当前“为您推荐”应升级为可解释推荐 |
| `service/rehab-therapy` | AI 推荐服务 | 列表页推荐区 | 适合接康复类推荐 |
| `service/home-exam` | AI 推荐服务、报告相关闭环 | 套餐推荐区 | 页面 README 已包含“报告解读”规划 |
| `service/elderly-care` | AI 推荐服务 | 列表推荐区 | 接机构匹配类推荐 |
| `service/*-detail` | 为什么推荐我、适用性说明 | 详情头部或购买区上方 | 推荐理由、风险说明、下一步动作 |
| `service/booking` | 预约预填 | 地址、老人、时间默认值 | 来自 AI 推荐或订单预览 |
| `service/order-confirm` | 预填确认、健康摘要提示 | 价格区或预约信息区 | 应支持展示 AI 预填来源 |
| `service/order-edit` | 改约建议 | 时间选择区 | 可接基于风险/履约的建议 |
| `service/order-detail` | 服务后续建议 | 订单状态区 | 可承接报告入口、复购建议、回访提醒 |
| `service/service-track` | 风险跟进提示 | 时间线节点 | 服务进行中的异常或建议动作 |
| `orders/rehab-therapy` | 评估报告入口、回访建议 | 订单 action 区 | 当前“评估报告”按钮应接真实报告页 |

## 7. 前端统一接口与组件建议

### 7.1 统一 AI 结果协议

不管是报告解读、健康总结还是服务推荐，建议前端统一适配下面这组字段：

```json
{
  "capability": "report-interpretation",
  "status": "succeeded",
  "generatedAt": "2026-04-22T08:00:00Z",
  "conclusion": "......",
  "evidence": [],
  "riskSignals": [],
  "followUpActions": [],
  "navigationSuggestions": [],
  "requiresHumanReview": false
}
```

建议所有 AI 页统一支持：

- `conclusion`
- `evidence`
- `riskSignals`
- `followUpActions`
- `navigationSuggestions`
- `requiresHumanReview`

### 7.2 统一任务状态协议

对于异步 AI 场景，建议用户侧 API 统一返回：

```json
{
  "taskId": "task_xxx",
  "status": "pending",
  "queued": true
}
```

随后前端轮询：

- `GET /app/assistant/tasks/:taskId`
- 或对应能力域下的 `GET /app/health/tasks/:taskId`
- 或直接由能力接口返回最终结果

### 7.3 建议抽象的前端公共组件

- `AiSummaryCard`
- `AiEvidenceList`
- `AiRiskSignals`
- `AiActionList`
- `AiNavigationSuggestions`
- `AiTaskStateBar`
- `AiHumanReviewNotice`

这样报告解读、健康总结、服务推荐和风险提醒可以共用一套渲染协议。

## 8. 当前可直接对接的后端域

| 路由前缀 | 当前用途 | 是否适合前端直连 |
| --- | --- | --- |
| `/app/health/reports/checkups` | 体检报告列表、详情、创建、删除、简版解读 | 是 |
| `/app/health/archive` | 档案摘要、基础信息、病史 | 是 |
| `/app/health` | 指标、设备、用药 | 是 |
| `/app/services` | 服务分类、列表、详情 | 是 |
| `/app/orders` | 预约选项、订单预览、创建、改约、报告入口 | 是 |
| `/internal/agents` | 内部多智能体编排与任务状态 | 否 |

## 9. 给前端的落地建议

1. 短期联调优先级：先接 `报告解读`、`健康档案/指标数据`、`服务目录/订单预览` 三类已有业务 API。
2. 页面预留优先级：`home/message`、`home/doctor-chat`、`healthdocs/report-interpretation`、`health/health-data`、`service/*` 列表和详情页都应预留 AI 卡片位。
3. 协议预留优先级：统一保留 `conclusion`、`riskSignals`、`followUpActions`、`navigationSuggestions`、`requiresHumanReview` 五类字段。
4. 状态预留优先级：所有 AI 页面都要做异步生成、失败重试、人工复核提示。
5. 跳转协议：AI 给前端的跳转建议统一使用 `pageId`，不要直接写死 URL。

## 10. 一句话结论

当前用户端最应该按 AI 方式设计的页面，不是只有 `report-interpretation`，而是整条“消息会话 -> 报告 -> 健康数据 -> 服务推荐 -> 订单确认”的链路；后端多智能体底座已经把报告解读和服务推荐的核心能力准备好了，前端现在需要做的是把页面入口、结构化卡片和异步任务态先设计统一。
