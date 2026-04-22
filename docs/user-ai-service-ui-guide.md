# 统一“康养助手”前端说明

## 一、功能说明

`康养助手` 是用户端统一的、全局的 AI 能力。

- 全局存在：登录后的核心业务页面都应可触达 `康养助手`
- 统一名称：前端只设计一个 `康养助手`
- 局部挂载：在不同页面中，以解读区、推荐区、提醒区、辅助条等形式承接不同能力

### 1. 对话聊天 / 问题答疑

支持：

- 语音提问
- 文字提问
- 上传附件后提问

解决的问题：

- 日常健康咨询
- 报告相关追问
- 服务选择相关追问
- 风险提醒后的进一步问答

### 2. 报告解读与后续建议

解决的问题：

- 报告怎么看
- 哪些指标需要重点关注
- 当前结论是什么
- 后续建议做什么

### 3. 服务推荐与预约辅助

解决的问题：

- 当前适合什么服务
- 为什么推荐该服务
- 预约时可以辅助带出哪些信息/用户语音输入，系统自动填写
- 下单前需要补充确认什么

### 4. 健康总结与趋势解释

解决的问题：

- 最近整体健康状态如何
- 健康数据的变化趋势如何理解
- 哪些指标值得关注
- 下一步建议是什么

### 5. 风险提醒与回访建议

解决的问题：

- 当前是否存在重点风险
- 风险产生的原因是什么
- 是否需要继续跟进
- 是否需要回访、复查或联系人工服务

## 二、前端设计

### 1. 全局设计要求

前端必须按“一个全局助手 + 多个页面承接”的方式设计。

- 不拆成多个独立 AI 产品
- 不在不同页面换不同助手名称
- 聊天、报告解读、服务推荐、健康总结、风险提醒都属于同一个 `康养助手`

建议全局覆盖的页面分组：

- `home/*`
- `healthdocs/*`
- `health/*`
- `service/*`
- `orders/*`

不作为本次重点范围的页面：

- `auth/*`
- `onboarding/*`

### 2. 需要重点设计的页面

#### 2.1 全局入口 / 主入口页面

| 页面 id | 页面作用 | 康养助手承接方式 |
| --- | --- | --- |
| `home/dashboard` | 首页主入口 | 全局入口卡 / 快捷入口 |
| `home/message` | 消息聚合页 | 会话入口 + 风险提醒入口 |
| `home/doctor-chat` | 会话详情页 | 康养助手主会话页 |
| `healthdocs/health-records` | 健康档案总览 | 档案场景下的助手入口 |

设计要点：

- `home/dashboard`：承担主入口，负责把用户引到会话、服务、健康摘要等能力
- `home/message`：承担“消息入口”和“提醒入口”
- `home/doctor-chat`：作为统一会话页，不再理解成单独医生产品页
- `healthdocs/health-records`：是健康档案场景下的重要入口页

#### 2.2 报告解读与后续建议相关页面

| 页面 id | 页面作用 | 康养助手承接方式 |
| --- | --- | --- |
| `healthdocs/checkup-reports` | 体检报告列表 | 报告解读入口 |
| `healthdocs/report-upload` | 上传体检报告 | 上传后进入解读链路 |
| `healthdocs/report-detail` | 报告详情 | 报告解读 CTA |
| `healthdocs/report-interpretation` | 报告解读结果页 | 解读结果主承接页 |
| `health/report-detail` | 健康报告详情 | 后续统一承接体检 / 服务 / 设备报告解读 |
| `orders/rehab-therapy` | 订单列表 / 评估报告入口 | 服务报告 / 康复报告入口 |
| `service/home-exam-detail` | 上门体检服务详情 | 与报告解读强相关的服务详情页 |

设计要点：

- `healthdocs/checkup-reports`：每条报告都要有明确的“报告解读”入口
- `healthdocs/report-detail`：页面内必须有明显的解读入口
- `healthdocs/report-interpretation`：作为报告类 AI 的核心展示页
- `health/report-detail`：后续用于统一承接体检报告、服务报告、设备报告

#### 2.3 服务推荐与预约辅助相关页面

| 页面 id | 页面作用 | 康养助手承接方式 |
| --- | --- | --- |
| `home/dashboard` | 首页服务分发 | 推荐服务入口 |
| `service/home-care` | 家政护理列表 | AI 推荐区 |
| `service/home-care-detail` | 家政护理详情 | 推荐理由 / 下单建议 |
| `service/home-exam` | 上门体检列表 | AI 推荐区 |
| `service/home-exam-detail` | 上门体检详情 | 推荐理由 / 购买前建议 |
| `service/rehab-therapy` | 康复理疗列表 | AI 推荐区 |
| `service/rehab-therapy-detail` | 康复理疗详情 | 推荐理由 / 适用场景说明 |
| `service/elderly-care` | 养老机构列表 | AI 推荐区 |
| `service/elderly-care-detail` | 养老机构详情 | 推荐理由 / 入住前建议 |
| `service/booking` | 预约信息页 | 预约辅助 / 预填提示 |
| `service/order-confirm` | 订单确认页 | 下单前辅助确认 |
| `service/order-edit` | 修改预约信息 | 改约辅助提示 |
| `service/order-detail` | 订单详情 | 后续建议 / 服务建议 |
| `service/service-track` | 服务跟踪 | 服务过程中的辅助提示 |

设计要点：

- 服务列表页：承接“推荐什么服务”
- 服务详情页：承接“为什么推荐”
- 预约与确认页：承接“辅助预填”和“下单前提示”
- 订单与服务跟踪页：承接“服务后的建议”和“跟进提醒”

#### 2.4 健康总结与趋势解释相关页面

| 页面 id | 页面作用 | 康养助手承接方式 |
| --- | --- | --- |
| `healthdocs/health-records` | 健康档案总览 | 健康摘要入口 |
| `healthdocs/basic-info` | 基础信息 | 全局入口即可 |
| `healthdocs/medical-history` | 既往病史 | 全局入口即可 |
| `health/health-data` | 健康数据总览 | 健康总结主承接页 |
| `health/data-bloodpressure` | 血压详情 | 趋势解释 |
| `health/data-bloodglucose` | 血糖详情 | 趋势解释 |
| `health/data-heartrate` | 心率详情 | 趋势解释 |
| `health/data-sleep` | 睡眠详情 | 趋势解释 |
| `health/data-steps` | 步数详情 | 趋势解释 |
| `health/data-weight` | 体重详情 | 趋势解释 |
| `health/data-spo2` | 血氧详情 | 趋势解释 |
| `health/data-pressure` | 压力详情 | 趋势解释 |
| `health/device-center` | 设备中心 | 设备状态解释 / 风险补充 |
| `health/device-detail` | 设备详情 | 设备数据解释 |
| `health/medication-info` | 用药信息 | 用药相关摘要 / 提醒说明 |
| `health/diet-plan` | 健康膳食 | 饮食建议入口 |
| `health/diet-recipe-detail` | 食谱详情 | 饮食建议辅助说明 |
| `health/self-test` | 健康自测 | 测评结果解释 |

设计要点：

- `health/health-data` 是健康总结能力的主页面
- 各指标详情页承接“趋势解释”
- `health/device-center`、`health/medication-info`、`health/diet-plan` 属于健康总结的补充页面
- `health/self-test` 承接“结果解释”和“下一步建议”

#### 2.5 风险提醒与回访建议相关页面

| 页面 id | 页面作用 | 康养助手承接方式 |
| --- | --- | --- |
| `home/dashboard` | 首页提醒 | 风险摘要卡 |
| `home/message` | 消息聚合 | 风险提醒消息入口 |
| `healthdocs/health-records` | 健康档案总览 | 档案层风险提示 |
| `health/health-data` | 健康数据总览 | 风险提醒主承接页之一 |
| `health/device-center` | 设备中心 | 设备异常 / 风险提醒 |
| `service/service-track` | 服务跟踪 | 回访建议 / 跟进提醒 |
| `service/order-detail` | 订单详情 | 服务后续建议 |
| `orders/rehab-therapy` | 订单列表 | 评估后风险 / 回访入口 |

设计要点：

- 首页和消息页负责“提醒进入”
- 健康数据页和设备页负责“风险解释”
- 订单页和服务跟踪页负责“后续跟进”

### 3. 前端设计边界

前端需要明确：

- 设计的是一个统一 `康养助手`
- 不是设计 5 个独立 AI 模块产品
- 页面里的局部 AI 区块，只表达该页面最相关的那一类能力

例如：

- 报告页重点是“报告解读”
- 服务页重点是“服务推荐”
- 健康页重点是“健康总结与趋势解释”
- 消息页重点是“对话入口”和“风险提醒”

不要在每个页面同时展开全部 5 类能力。

## 三、API返回实例

以下为前端设计阶段建议使用的返回实例，目的是让前端明确页面需要承接什么数据结构。不是最终联调接口定义。

### 1. 对话聊天 / 问题答疑

适用页面：

- `home/doctor-chat`
- `home/message`

返回实例：

```json
{
  "conversationId": "conv_001",
  "messageId": "msg_102",
  "assistantName": "康养助手",
  "messageType": "answer",
  "inputType": "text",
  "content": "最近血压波动偏高，建议先查看近7天的血压趋势，并结合最近的体检报告一起看。",
  "attachments": [],
  "quickReplies": [
    "查看血压趋势",
    "查看最近报告",
    "我需要预约什么服务"
  ],
  "relatedCards": [
    {
      "cardType": "health-summary",
      "title": "近7天血压摘要",
      "summary": "晨起收缩压偏高 3 次"
    }
  ],
  "navigationTargets": [
    {
      "pageId": "health/data-bloodpressure",
      "label": "查看血压趋势"
    },
    {
      "pageId": "healthdocs/checkup-reports",
      "label": "查看最近报告"
    }
  ],
  "needHumanService": false
}
```

### 2. 报告解读与后续建议

适用页面：

- `healthdocs/report-interpretation`
- `healthdocs/report-detail`
- `healthdocs/checkup-reports`
- `health/report-detail`

返回实例：

```json
{
  "reportId": "report_001",
  "reportTitle": "血脂四项检查报告",
  "assistantName": "康养助手",
  "conclusion": "本次血脂结果存在异常，当前重点关注低密度脂蛋白偏高和高密度脂蛋白偏低。",
  "highlights": [
    "低密度脂蛋白偏高",
    "高密度脂蛋白偏低"
  ],
  "riskSignals": [
    "心血管风险需持续关注"
  ],
  "explanations": [
    {
      "title": "低密度脂蛋白",
      "content": "该指标偏高，提示脂代谢管理压力增加。"
    },
    {
      "title": "高密度脂蛋白",
      "content": "该指标偏低，提示保护作用减弱。"
    }
  ],
  "followUpSuggestions": [
    "2周内继续观察饮食和运动变化",
    "下次复查时重点关注血脂指标",
    "如有需要可预约上门体检或咨询医生"
  ],
  "navigationTargets": [
    {
      "pageId": "service/home-exam",
      "label": "查看上门体检"
    }
  ],
  "requiresManualReview": false
}
```

### 3. 服务推荐与预约辅助

适用页面：

- `service/home-care`
- `service/home-exam`
- `service/rehab-therapy`
- `service/elderly-care`
- `service/booking`
- `service/order-confirm`

返回实例：

```json
{
  "assistantName": "康养助手",
  "conclusion": "根据当前健康情况，优先建议基础慢病复查类上门体检服务。",
  "recommendations": [
    {
      "serviceId": "svc_001",
      "title": "老年人基础体检套餐",
      "category": "HOME_EXAM",
      "price": 399,
      "reason": "适合近期需要关注血糖和血压变化的用户",
      "tags": [
        "适合慢病复查",
        "可上门",
        "报告可解读"
      ],
      "pageId": "service/home-exam-detail"
    },
    {
      "serviceId": "svc_002",
      "title": "康复跟进评估服务",
      "category": "REHAB_THERAPY",
      "price": 699,
      "reason": "适合需要持续观察恢复情况的用户",
      "tags": [
        "适合康复观察"
      ],
      "pageId": "service/rehab-therapy-detail"
    }
  ],
  "bookingAssist": {
    "elderId": "elder_001",
    "addressId": "addr_002",
    "suggestedDate": "2026-04-25",
    "suggestedTimeSlot": "09:00-11:00"
  },
  "confirmTips": [
    "下单前确认上门地址",
    "确认体检时间是否方便老人配合"
  ]
}
```

### 4. 健康总结与趋势解释

适用页面：

- `health/health-data`
- `health/data-*`
- `health/device-center`
- `health/medication-info`
- `health/self-test`

返回实例：

```json
{
  "assistantName": "康养助手",
  "summaryTitle": "近7天健康摘要",
  "conclusion": "最近7天整体状态需要关注，血压和空腹血糖波动较明显。",
  "healthScore": 78,
  "healthScoreLabel": "需要关注",
  "trendHighlights": [
    "晨起收缩压连续3天偏高",
    "空腹血糖较上周平均值上升"
  ],
  "keyMetrics": [
    {
      "metricKey": "bloodPressure",
      "label": "血压",
      "summary": "近期波动偏大"
    },
    {
      "metricKey": "bloodSugar",
      "label": "血糖",
      "summary": "近期有上升趋势"
    }
  ],
  "followUpSuggestions": [
    "继续记录7天血压变化",
    "查看最近体检报告",
    "必要时预约慢病复查服务"
  ],
  "navigationTargets": [
    {
      "pageId": "health/data-bloodpressure",
      "label": "查看血压详情"
    },
    {
      "pageId": "healthdocs/checkup-reports",
      "label": "查看最近报告"
    }
  ]
}
```

### 5. 风险提醒与回访建议

适用页面：

- `home/dashboard`
- `home/message`
- `health/health-data`
- `service/service-track`
- `service/order-detail`

返回实例：

```json
{
  "assistantName": "康养助手",
  "notifications": [
    {
      "riskId": "risk_001",
      "level": "high",
      "title": "连续血压偏高",
      "summary": "近3次晨起血压均高于建议范围，建议尽快继续观察并复核。",
      "reason": "最近连续多次测量结果偏高",
      "followUpSuggestions": [
        "今天继续测量1次",
        "查看最近报告",
        "必要时咨询医生"
      ],
      "pageId": "health/data-bloodpressure",
      "pageLabel": "查看血压详情",
      "needCallback": true
    },
    {
      "riskId": "risk_002",
      "level": "medium",
      "title": "服务完成后建议回访",
      "summary": "本次服务结束后建议继续观察恢复情况。",
      "reason": "近期服务涉及持续恢复观察",
      "followUpSuggestions": [
        "查看服务跟踪",
        "必要时预约复评"
      ],
      "pageId": "service/service-track",
      "pageLabel": "查看服务跟踪",
      "needCallback": false
    }
  ]
}
```
