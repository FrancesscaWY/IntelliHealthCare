# IntelliHealthCare 统一多智能体框架蓝图

## 1. 文档定位

本文档用于定义 IntelliHealthCare 在用户端、后台端与内部事件流之上的统一多智能体框架蓝图，作为业务规划、后端实现、治理审计和后续 Hermes 运行时建设的共同基线。

本文档聚焦以下内容：

- 统一框架的定位、边界与设计原则
- 产品能力与 Agent 体系的稳定映射关系
- 标准协作工作流、治理规则与实施顺序
- Hermes 框架在本项目中的落位方式、实例考虑与分阶段规划

本文档不讨论以下内容：

- 单个页面的交互稿或文案细节
- 具体 API DTO、数据库字段和前端展示逻辑
- 某一条业务链路的实现细节替代方案

## 2. 总体定位

### 2.1 统一框架原则

IntelliHealthCare 只建设一套统一的多智能体框架。用户端、后台端和系统事件只是不同的任务入口、交互形态与 API 调用面，不再分别建设独立的 Agent 体系。

该原则带来四个直接约束：

- 用户端和后台端共享同一批领域 Agent
- UI 入口可以按场景收敛，底层能力边界必须按领域稳定划分
- API 可以按能力和页面诉求拆分，但不能把 Agent 边界绑定到单个页面
- 同一份治理规则、工具权限、审计与评测基线适用于全部入口

### 2.2 产品与框架的关系

在产品层，用户端可以保留统一的“康养助手”入口，后台端可以保留运营工作台、派单页、预警中心、设备监控等专业界面。

在框架层，上述入口统一落到以下能力域：

- 健康理解
- 服务协同
- 风险运营
- 设备运营
- 内容与活动运营
- 安全治理

因此，产品入口与 Agent 体系是一对多关系，而不是一一对应关系。

### 2.3 Hermes 的定位

在本项目中，`Hermes` 的定位应当是后端内部的受控多智能体运行时，而不是一个独立部署的开放式 AI 平台。

Hermes 负责：

- 统一任务接入与调度
- Agent 注册、路由、编排与执行控制
- 工具调用、模型调用、状态回写与审计
- 高风险输出的复核门禁与人工兜底

Hermes 不负责：

- 取代业务模块本身
- 直接绕过业务边界写数据库
- 实现无边界自治的开放式 Agent 系统

## 3. 架构原则

### 3.1 领域优先

Agent 必须围绕稳定业务领域定义，而不是围绕页面、按钮、接口路径或一次性活动需求定义。

### 3.2 受控协作优先

优先采用 `Router -> Specialist`、`Planner -> Specialist -> Reviewer`、`Event -> Specialist` 这类受控协作模式，不采用无限轮开放自治。

### 3.3 结构化契约优先

所有 Agent 都必须具备明确的输入输出结构、允许工具集合、风险等级和超时预算，避免“Prompt 驱动的一次性能力”失控扩张。

### 3.4 最小权限上下文

Agent 只能读取完成当前任务所必需的最小上下文。用户私有健康数据、家属授权关系和机构资源信息必须经过显式权限校验后才能进入上下文。

### 3.5 治理内建

Prompt 版本、模型版本、工具调用、任务状态、输出摘要、风险标记和人工确认状态必须进入可追踪审计链路，不能在上线后补治理。

### 3.6 业务执行与 Agent 建议分离

Agent 可以提供摘要、解释、推荐、排序、预警、复核与运营建议，但高风险业务状态变更仍由确定性应用服务、人工操作或明确审批流执行。

## 4. 统一框架总览

```text
User Web / Admin Web / Internal Events / Scheduled Jobs
  -> API / Domain Modules
  -> AgentTask
  -> BullMQ Worker
  -> Hermes Orchestrator
  -> TaskOrchestratorAgent
  -> Domain Agent(s)
  -> SafetyReviewAgent
  -> Result Store / Notification / Controlled Write-back

                    |-> Tool Layer
                    |-> RAG / Knowledge Layer
                    |-> LLM Gateway
```

框架分层如下：

- 产品入口层：用户端页面、后台页面、内部 API、定时任务、事件触发
- 任务接入层：`AgentTask`、队列、状态流转、异步执行
- 编排控制层：`Hermes Orchestrator`、`TaskOrchestratorAgent`
- 领域执行层：健康、服务、风险、设备、内容等领域 Agent
- 治理层：`SafetyReviewAgent`、策略规则、人工兜底
- 能力供给层：工具层、RAG、模型网关、审计与评测

## 5. 产品能力蓝图

状态说明：

- `partial`：当前仓库已有 MVP 或已落地子能力
- `planned`：已纳入统一蓝图，但尚未完整可执行

### 5.1 用户端能力

| 能力 | 说明 | 主要承担 Agent | 状态 |
| --- | --- | --- | --- |
| 统一康养助手入口 | 用户侧唯一 AI 交互门面，承接问答、摘要、推荐与风险提醒 | `AssistantConversationAgent` + `TaskOrchestratorAgent` | `planned` |
| 报告解读与后续建议 | 对体检、服务和康复报告做结构化解读，并给出后续关注点 | `HealthManagementAgent` | `partial` |
| 服务推荐与预约预填 | 根据用户需求、健康状态和服务目录生成可解释推荐 | `CareCoordinationAgent` | `partial` |
| 健康摘要与趋势解释 | 围绕档案、指标、饮食、用药和自测形成近期健康摘要 | `HealthManagementAgent` | `planned` |
| 风险提醒与回访建议 | 围绕异常指标、报告结论和长期标签形成风险提示与回访建议 | `RiskOperationsAgent` | `planned` |

### 5.2 后台端能力

| 能力 | 说明 | 主要承担 Agent | 状态 |
| --- | --- | --- | --- |
| 后台派单与排班建议 | 根据订单、资质、区域和排班资源给出候选方案与理由 | `CareCoordinationAgent` | `planned` |
| 预警分诊与干预闭环 | 对风险事件进行优先级排序、处理建议和闭环跟踪 | `RiskOperationsAgent` | `planned` |
| 后台运营总览 Copilot | 汇总健康、服务、风险、设备、内容等信号形成工作台摘要 | `OperationsCopilotAgent` | `planned` |
| 设备异常诊断 | 对离线、低电量、误报和同步异常给出排查建议 | `DeviceOperationsAgent` | `planned` |
| 内容与活动运营 Copilot | 为资讯、讲堂、活动提供摘要、标签、报名分析和排期建议 | `ContentActivityOpsAgent` | `planned` |

## 6. Agent 体系蓝图

统一框架当前定义 `9` 个核心 Agent，按角色分为控制层、交互层、领域层和治理层。

### 6.1 控制层

#### `TaskOrchestratorAgent`

定位：统一控制面，负责将任务分发给合适的领域 Agent，并决定是否需要多 Agent 协作。

职责：

- 识别任务属于健康理解、服务协同、风险运营、设备运营还是内容运营
- 决定使用单 Agent 直出、串行协作还是事件驱动执行
- 控制预算、步数、超时、重试和输出回写策略

典型输出：

- `executionPlan`
- `targetAgentList`
- `workflowRoute`
- `humanReviewHint`

### 6.2 交互层

#### `AssistantConversationAgent`

定位：用户侧唯一 AI 会话门面，负责交互承接和结果整合，不承担深度领域推理主责。

职责：

- 承接统一康养助手会话
- 整理会话上下文并交由控制层编排
- 把健康摘要、报告解读、服务推荐和风险提醒整合成自然语言回复

适用入口：

- 用户侧统一助手
- 用户侧消息中心的 AI 对话回流

#### `OperationsCopilotAgent`

定位：后台工作台的统一智能聚合层，负责跨域摘要与运营任务整合。

职责：

- 汇总重点长者、待处理预警、待派单任务、设备异常和内容活动信号
- 形成“今日重点”“待办清单”“优先级看板”等后台摘要
- 为多个后台模块提供统一运营视角

适用入口：

- 后台首页
- 长者管理工作台
- 运营晨报与值班摘要

### 6.3 领域层

#### `HealthManagementAgent`

定位：健康理解主域 Agent，是报告解读、健康摘要和重点长者理解的统一承担者。

负责：

- 健康档案摘要
- 健康趋势解释
- 报告解读
- 用户与家属可读的健康摘要
- 后台重点长者健康简报

典型工具：

- `getHealthArchive`
- `getLatestHealthMetrics`
- `getMetricHistory`
- `getReportContext`
- `getMedicationContext`
- `getDietContext`
- `getSelfTestContext`

不负责：

- 医学诊断结论
- 自动修改健康档案状态
- 直接触发高风险处置动作

#### `CareCoordinationAgent`

定位：服务协同主域 Agent，统一承担用户侧服务推荐与后台侧派单建议。

负责：

- 服务推荐
- 预约预填
- 订单供给匹配
- 候选服务人员与机构排序
- 派单建议解释

典型工具：

- `searchServiceCatalog`
- `getHealthArchive`
- `getLatestHealthMetrics`
- `getAddressBook`
- `getOrderContext`
- `getStaffRoster`
- `getScheduleAvailability`
- `getInstitutionCoverage`

不负责：

- 直接创建订单或修改价格
- 在第一版中自动派单
- 绕过运营规则写入履约结果

#### `RiskOperationsAgent`

定位：风险运营主域 Agent，统一承担风险识别、风险分级、预警分诊与回访建议。

负责：

- 异常指标、异常报告与长期风险标签识别
- 风险等级判断
- 回访建议与干预草案
- 后台预警中心优先级排序

典型工具：

- `getMetricHistory`
- `getHealthArchive`
- `getRecentReports`
- `getOpenAlerts`
- `getStaffRoster`
- `getInterventionPlaybook`

不负责：

- 医学诊断或急救决策
- 未经人工确认直接触发高风险外呼或派单
- 直接落库改变最终处置状态

#### `DeviceOperationsAgent`

定位：设备运营主域 Agent，服务后台设备稳定性分析和巡检建议。

负责：

- 设备离线、低电量、误报、同步异常诊断
- 巡检优先级建议
- 设备稳定性摘要

典型工具：

- `getDeviceStatusBoard`
- `getRecentDeviceAlerts`
- `getInstitutionTopology`

#### `ContentActivityOpsAgent`

定位：内容与活动运营主域 Agent，服务后台内容运营和社区活动运营。

负责：

- 内容摘要与标签生成
- 活动报名、互动与转化分析
- 排期、专题与运营位建议

典型工具：

- `getContentLibrary`
- `getActivityRegistry`
- `getContentInteractionStats`

### 6.4 治理层

#### `SafetyReviewAgent`

定位：统一安全复核与人工兜底门禁。

职责：

- 检查是否越过医学建议边界
- 识别高风险输出和需人工确认项
- 阻断未授权自动执行
- 给任务结果附加复核决定与风险标签

典型输出：

- `reviewDecision`
- `riskFlags`
- `humanReviewRequired`
- `blockedAction`

## 7. 标准协作工作流

### 7.1 用户统一康养助手工作流

目标：用一个用户侧 AI 门面承接多类能力，而不是为每类能力独立建设前端入口。

标准链路：

```text
AssistantConversationAgent
  -> TaskOrchestratorAgent
  -> HealthManagementAgent / CareCoordinationAgent / RiskOperationsAgent
  -> SafetyReviewAgent
  -> AssistantConversationAgent
```

输出通道：

- 用户侧助手 UI
- 会话回复
- 页面跳转建议
- 后续跟进问题

### 7.2 健康理解工作流

目标：统一承接报告解读、健康摘要、趋势解释和重点长者理解。

标准链路：

```text
TaskOrchestratorAgent
  -> HealthManagementAgent
  -> RiskOperationsAgent（按需）
  -> SafetyReviewAgent
```

触发来源：

- 用户查看报告
- 报告上传
- 用户查看健康摘要
- 后台查看重点长者

### 7.3 服务协同工作流

目标：统一承接用户侧服务推荐、预约预填和后台派单建议。

标准链路：

```text
TaskOrchestratorAgent
  -> CareCoordinationAgent
  -> SafetyReviewAgent
```

触发来源：

- 用户搜索或咨询服务
- 用户预约前补全信息
- 后台派单或排班建议请求

### 7.4 风险运营工作流

目标：围绕异常事件形成预警识别、分级、补充背景和回访建议的闭环。

标准链路：

```text
TaskOrchestratorAgent
  -> RiskOperationsAgent
  -> HealthManagementAgent（补充背景）
  -> SafetyReviewAgent
```

触发来源：

- 指标异常
- 报告结论异常
- 夜间批处理
- 后台预警中心刷新

### 7.5 后台运营 Copilot 工作流

目标：把多个领域结果聚合成后台工作台的可执行运营摘要。

标准链路：

```text
HealthManagementAgent
+ CareCoordinationAgent
+ RiskOperationsAgent
+ DeviceOperationsAgent
+ ContentActivityOpsAgent
  -> OperationsCopilotAgent
  -> SafetyReviewAgent
```

输出通道：

- 后台首页
- 预警中心
- 派单页
- 设备监控页
- 运营晨报

## 8. Agent 契约与治理标准

### 8.1 Agent 定义卡片

每个 Agent 都必须以声明式定义注册，至少包含以下字段：

```ts
type AgentDefinition = {
  name: string;
  category: "router" | "planner" | "reviewer" | "specialist";
  domain: string;
  riskLevel: "low" | "medium" | "high";
  triggerMode: "sync" | "async" | "event" | "schedule";
  description: string;
  inputSchema: object;
  outputSchema: object;
  allowedTools: string[];
  forbiddenActions: string[];
  timeoutMs: number;
  maxSteps: number;
  humanReviewRequired: boolean;
  humanFallback: {
    handoffTo: string[];
    when: string[];
    action: string;
  };
  sla: {
    serviceLevel: string;
    hardTimeoutMs: number;
    onTimeout: string;
  };
};
```

定义卡片是治理基线，不允许仅通过 Prompt 文案隐式定义 Agent 能力。

现有设计中的 `9` 个核心 Agent 卡片，见 `docs/intellihealthcare-agent-cards.md`。

### 8.2 上下文分层

统一框架采用五层上下文模型：

1. 公共知识：健康科普、平台规则、服务制度
2. 机构知识：机构能力、覆盖区域、排班资源、履约规则
3. 用户私有知识：档案、报告、指标、历史订单、家属授权关系
4. 任务上下文：当前请求、当前报告、当前订单、当前事件
5. 长期记忆：稳定摘要、偏好标签、持续跟踪项

约束：

- 用户私有知识进入上下文前必须经过权限校验
- 长期记忆必须是结构化摘要，不保留原始长文本回复作为长期状态
- Agent 只能访问完成任务所需的最小必要层

### 8.3 工具层边界

工具层分为三类：

- `read-only tool`：读取业务上下文
- `retrieval tool`：检索知识、目录和规则
- `write-back tool`：受控写回结果或创建待审核记录

统一约束：

- Agent 不直接写 SQL
- Agent 不直接跨模块访问 Prisma
- 工具输入输出必须稳定且可审计
- 高风险副作用工具默认关闭，或必须经过 `SafetyReviewAgent` 和人工确认

### 8.4 风险分级与复核

建议按输出风险进行三档治理：

| 风险等级 | 典型 Agent | 治理要求 |
| --- | --- | --- |
| 低 | `HealthManagementAgent` 的摘要类输出、`ContentActivityOpsAgent` | 结构化校验 + 审计留痕 |
| 中 | `CareCoordinationAgent` 的推荐类输出、`OperationsCopilotAgent` | 结构化校验 + 规则复核 |
| 高 | `RiskOperationsAgent`、后台派单建议、任何涉及自动执行的输出 | `SafetyReviewAgent` + 人工确认 + 固定评测集 |

### 8.5 审计与评测

统一框架必须记录以下信息：

- 任务触发来源、任务状态、输入摘要、输出摘要
- Prompt 版本与模型版本
- 工具调用轨迹、失败原因、重试次数
- Token、耗时、超时和降级情况
- 风险标签、复核决定、人工确认状态

上线前必须建立离线评测集，至少覆盖：

- 正常样本
- 缺失字段样本
- 冲突信息样本
- 高风险样本
- 应拒答样本

## 9. Hermes 框架实例考虑与落位规划

### 9.1 Hermes 与蓝图的映射关系

统一蓝图中的角色，与 Hermes 运行时中的执行角色关系如下：

| 蓝图角色 | Hermes 角色 | 说明 |
| --- | --- | --- |
| `TaskOrchestratorAgent` | `router`，复杂任务可扩展为 `planner` | 控制路由、拆解和预算管理 |
| `SafetyReviewAgent` | `reviewer` | 负责结构、风险、合规和人工复核判定 |
| `HealthManagementAgent` 等领域 Agent | `specialist` | 负责单一稳定业务领域的专业输出 |
| `AssistantConversationAgent` | 交互包装层，初期可由应用服务 + Hermes 任务组合实现 | 负责会话承接与结果整合 |
| `OperationsCopilotAgent` | 聚合包装层，可先作为应用服务，后续再升级为 Hermes 执行角色 | 负责后台工作台结果聚合 |

规划原则：

- Hermes 内核优先承载 `router / reviewer / specialist`
- 交互型 Agent 可按业务复杂度逐步从应用服务升级为 Hermes Agent
- 不要为了“全部 Agent 化”而把确定性模板拼装逻辑强行放进模型执行链路

### 9.2 Hermes 在仓库中的推荐落位

Hermes 推荐落位于 `apps/backend/src/modules/agents`，与当前后端模块化结构对齐：

```text
apps/backend/src/modules/agents/
  application/
    agent-orchestrator.service.ts
    agent-dispatch.service.ts
    agent-task.service.ts
  controllers/
    agents.controller.ts
  domain/
    agent-registry.ts
    agent-types.ts
    framework-blueprint.ts
  gateways/
    llm.gateway.ts
    embedding.gateway.ts
  tools/
  workers/
    agent-task.processor.ts
  evals/
```

对应关系：

- `AgentTask`：统一任务单元、状态机和审计载体
- `BullMQ Worker`：异步执行载体
- `AgentOrchestratorService`：Hermes Orchestrator 的主要宿主
- `agent-registry`：声明式 Agent 注册中心
- `llm.gateway`：模型供应商、超时、降级与结构化输出适配
- `tools/*`：对业务能力的受控暴露

### 9.3 当前代码与统一蓝图的对齐关系

当前仓库中已存在的 MVP 能力，可作为 Hermes 演进基线：

| 当前能力 | 蓝图归属 | 规划动作 |
| --- | --- | --- |
| `intent-router` | `TaskOrchestratorAgent` | 升级为统一控制层入口 |
| `report-summary-agent` | `HealthManagementAgent` | 并入健康理解主域 |
| `service-recommendation-agent` | `CareCoordinationAgent` | 并入服务协同主域 |
| `AgentOrchestratorService` | `Hermes Orchestrator` | 继续承载调度、状态与回写控制 |
| `agent-task.processor.ts` | 队列执行层 | 继续作为异步执行入口 |

该规划意味着当前实现不是孤立原型，而是统一蓝图的第一阶段承接层。

### 9.4 Hermes 实例 A：报告解读

目标：把报告上传、报告查看和报告摘要 API 统一收敛到同一健康理解链路。

推荐执行链路：

```text
reports module / assistant API
  -> AgentTask(taskType=report-interpretation)
  -> Hermes Orchestrator
  -> TaskOrchestratorAgent
  -> HealthManagementAgent
  -> SafetyReviewAgent（高风险时）
  -> saveAgentResult / report interpretation API
```

推荐工具：

- `getReportContext`
- `getHealthArchive`
- `getLatestHealthMetrics`

推荐输出结构：

- `reportSummary`
- `keyFindings`
- `abnormalItems`
- `followUpSuggestions`
- `uncertainties`
- `humanReviewRequired`

设计考虑：

- 报告理解与页面渲染必须分离
- 医学诊断结论不能由 Agent 直接给出
- 高风险表达必须经 `SafetyReviewAgent` 打标或转人工

### 9.5 Hermes 实例 B：服务推荐与派单建议共域规划

目标：用一个服务协同主域同时支撑用户端服务推荐和后台端派单建议，避免重复理解服务目录与资源约束。

用户侧执行链路：

```text
assistant API / service recommendation API
  -> AgentTask(taskType=service-recommendation)
  -> Hermes Orchestrator
  -> TaskOrchestratorAgent
  -> CareCoordinationAgent
  -> SafetyReviewAgent（按风险）
  -> recommendation response
```

后台侧执行链路：

```text
dispatch API / admin action
  -> AgentTask(taskType=dispatch-suggestion)
  -> Hermes Orchestrator
  -> TaskOrchestratorAgent
  -> CareCoordinationAgent
  -> SafetyReviewAgent
  -> candidate ranking / manual review queue
```

共域收益：

- 服务目录、覆盖范围、人员资质和排班约束只需维护一套解释逻辑
- 推荐与派单共享同一份供需匹配能力
- 后续可以在同一评测集内验证推荐解释与候选排序质量

### 9.6 Hermes 第一阶段实施准则

Hermes 落地时应遵守以下准则：

- 先做受控工作流，不做自由自治
- 先做低风险 Specialist，再做高风险 Reviewer 与风险运营
- 先明确工具契约和输出 Schema，再扩 Agent 数量
- 交互包装层可以先由应用服务承担，不要求首期全部 Hermes 化
- 高风险 side effect 只能通过受控写回工具和人工确认流落地

## 10. 分阶段实施规划

### Phase 1：巩固运行时底座

目标：把 Hermes 的任务接入、执行、模型网关和工具层做稳。

范围：

- 完整的 `AgentTask` 状态流转
- 队列执行、超时、重试、失败回写
- `LLM Gateway` 与结构化输出能力
- `agent-registry` 和 Agent 定义卡片
- 首批工具层契约

### Phase 2：统一健康理解与服务协同主域

目标：把当前已存在 MVP 收敛成统一蓝图中的主域 Agent。

范围：

- `intent-router` 向 `TaskOrchestratorAgent` 演进
- `report-summary-agent` 并入 `HealthManagementAgent`
- `service-recommendation-agent` 并入 `CareCoordinationAgent`
- 维持现有 API 兼容，同时统一底层执行口径

### Phase 3：补齐用户端统一助手与治理门禁

目标：把用户端从分散能力调用升级为统一对话门面，并建立高风险复核。

范围：

- 引入 `AssistantConversationAgent`
- 打通报告解读、健康摘要、服务推荐和风险提醒的统一会话入口
- 引入 `SafetyReviewAgent`
- 建立人工确认和拒答机制

### Phase 4：补齐风险运营与后台运营 Copilot

目标：扩展到后台关键工作流，形成真正的跨域协作体系。

范围：

- 引入 `RiskOperationsAgent`
- 引入 `OperationsCopilotAgent`
- 按需引入 `DeviceOperationsAgent`、`ContentActivityOpsAgent`
- 建立后台首页、预警中心、派单页的统一摘要能力

### Phase 5：评测、追踪与规模化运营

目标：让统一框架具备可持续迭代和生产治理能力。

范围：

- 固定评测集、打分器和回归流程
- Prompt 版本化、模型版本化、工具调用追踪
- 成本、延迟、失败率与人工复核通过率监控
- 分级放量与灰度开关

## 11. 结论

IntelliHealthCare 的多智能体建设方向，不是为每个页面或接口各自拼接一个 Agent，而是在统一业务框架下沉淀一套稳定的领域 Agent、受控的 Hermes 运行时和可审计的治理机制。

这份蓝图的核心约束是：

- 一套框架，覆盖用户端、后台端与事件驱动入口
- 一套领域 Agent，承接稳定业务能力
- 一套 Hermes 运行时，承接任务编排、模型调用、工具访问与状态回写
- 一套治理规则，保证结构化输出、风险复核和人工兜底

后续无论继续演进自研运行时，还是在现有 `agents` 模块中逐步完整实现 Hermes，本蓝图都应作为统一基线使用。
