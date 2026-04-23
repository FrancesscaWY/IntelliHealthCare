# Hermes 多 Agent 框架需求与分类

## 1. 文档目标与边界

本文档只讨论 `Hermes` 多 Agent 框架本身的需求、分类和职责边界，不讨论具体业务流、页面交互或某条订单链路的落地细节。

目标只有三件事：

1. 明确在 IntelliHealthCare 中，什么才算一个 `Agent`，什么只是基础设施或工具。
2. 给出多 Agent 框架第一版必须满足的能力要求，避免实现过程中不断摇摆。
3. 以统一口径定义各类 Agent 的功能、输入输出和责任边界。

本文档基于当前仓库在 `2026-04-20` 的实际状态编写，和以下事实保持一致：

- 后端仍是 `NestJS` 模块化单体，`agents` 模块尚未实现运行时。
- Prisma 已预留 `AgentTask` 模型：`agentName`、`taskType`、`status`、`triggerSource`、`payload`、`result`。
- 当前环境变量只预留了 `AGENT_RAG_COLLECTION`、`AGENT_LLM_BASE_URL`、`AGENT_LLM_API_KEY`。

## 2. 先区分什么不是 Agent

如果边界不清，最后会把所有 AI 相关模块都叫成 Agent，导致职责混乱。

在当前项目里，下列对象不应直接定义成 Agent：

- `AgentTask`
  - 它是任务持久化与审计单元，不是智能体本身。
- `Hermes Orchestrator`
  - 它负责任务流转、重试、超时、路由和状态回写，是运行时，不是业务 Agent。
- `LLM Gateway`
  - 它只做模型供应商适配、鉴权、超时、重试和模型路由，不承载业务目标。
- `Tool`
  - 它是对业务能力的受控封装，例如读取档案、查询报告、检索服务目录。
- `RAG / Knowledge Base`
  - 它是上下文供给层，不负责业务判断。
- `Prompt Template`
  - 它是 Agent 的实现资产之一，但不等于 Agent。

对当前项目更合理的定义是：

> Agent 是一个围绕明确目标运行、具备固定输入输出契约、只允许使用受控工具、并能被审计和回放的任务执行角色。

## 3. 多 Agent 框架的需求分层

## 3.1 运行时与任务生命周期

多 Agent 框架第一版必须具备以下基础能力：

- 基于 `AgentTask` 的统一任务入口
- 明确的状态流转：`PENDING -> RUNNING -> SUCCEEDED | FAILED`
- 异步执行能力，优先通过 `BullMQ Worker` 驱动
- 超时、重试、取消、死信或失败回写机制
- `agentName` 与 `taskType` 的显式区分
  - `agentName` 表示由谁执行
  - `taskType` 表示任务意图，例如 `report-summary`、`service-recommendation`
- `triggerSource` 标记触发来源
  - 用户请求
  - 后台操作
  - 定时任务
  - 事件触发

这里的重点不是“让模型变聪明”，而是先把任务调度和状态闭环做实。

## 3.2 Agent 注册与声明式定义

每个 Agent 都必须注册成一份可声明、可校验的定义，而不是分散在 Prompt 和代码分支里。

建议至少具备以下定义字段：

```ts
type AgentDefinition = {
  name: string;
  category: "router" | "planner" | "reviewer" | "specialist";
  domain: string;
  riskLevel: "low" | "medium" | "high";
  triggerMode: "sync" | "async" | "event";
  description: string;
  inputSchema: object;
  outputSchema: object;
  allowedTools: string[];
  forbiddenActions: string[];
  timeoutMs: number;
  maxSteps: number;
  humanReviewRequired: boolean;
};
```

没有这份定义，后续会出现三个问题：

- 同一个 Agent 在不同任务里行为不一致
- Prompt 与工具权限绑定不清
- 审计时无法回答“这个 Agent 被允许做什么”

## 3.3 输入输出契约

每个 Agent 都必须有严格的输入输出边界。

必须要求：

- 输入采用结构化上下文，不依赖上游手工拼大段自然语言
- 输出必须走固定 `JSON schema`
- 输出中要区分：
  - 结论
  - 证据
  - 不确定项
  - 需人工确认项
- 任意一个 Agent 失败时，不允许把半结构化文本直接写回业务表

对 IntelliHealthCare 来说，结构化输出比“语言自然”更重要。

## 3.4 上下文与记忆分层

多 Agent 框架需要先把上下文分层，否则 Agent 职责会互相覆盖。

建议分成 5 层：

1. 公共知识
   - 健康科普、服务规则、平台制度
2. 机构知识
   - 机构能力、覆盖区域、排班资源、履约规则
3. 用户私有知识
   - 档案、报告、指标、历史订单、家庭授权关系
4. 任务上下文
   - 当前请求、当前工单、当前报告、当前触发事件
5. 长期记忆
   - 稳定摘要、偏好、需持续跟踪的标签

约束原则：

- Agent 只能按需访问最小必要上下文
- 用户私有知识必须经过权限校验后才能进入上下文
- 长期记忆应是结构化摘要，不应直接存原始模型回复

## 3.5 工具层与权限控制

多 Agent 的核心不是 Prompt，而是“受控能力”。

工具层必须满足：

- Agent 不直接写 SQL
- Agent 不直接跨模块访问 Prisma
- Agent 只通过工具层读取业务数据或提交结果
- 工具参数、返回值、失败语义必须稳定
- 高风险 side effect 工具默认关闭或要求人工确认

建议把工具分成三类：

- `read-only tool`
  - 只读上下文获取，例如 `getHealthArchive`
- `retrieval tool`
  - 检索与知识命中，例如 `searchServiceCatalog`
- `write-back tool`
  - 只写受控结果，例如 `saveAgentResult`

当前阶段应该只开放少量 `read-only tool` 和受控的 `write-back tool`。

## 3.6 协作模式与自治边界

当前项目不适合上来就做“自由自治型多 Agent”。

第一版推荐只支持以下协作模式：

- `Router -> Specialist`
  - 默认模式，覆盖绝大多数请求
- `Planner -> Specialist -> Reviewer`
  - 只用于高价值、低频、必须复核的复杂任务
- `Event -> Specialist`
  - 用于报告上传、指标异常、订单状态变化等事件驱动任务

当前阶段明确不建议：

- 多个 Agent 自由来回对话
- Agent 自主创建新 Agent
- 无步数上限、无预算上限的开放式推理
- Agent 直接决定业务状态流转并落库

## 3.7 审计、评测与合规

只要进入生产，多 Agent 框架就必须具备治理闭环。

必须具备：

- Prompt 版本记录
- 模型版本记录
- 工具调用日志
- 输入摘要与输出摘要
- token、耗时、重试次数统计
- 固定评测样本集
- 高风险任务的人工兜底入口

医疗养老场景尤其要补充：

- 医疗建议边界说明
- 脱敏与权限边界
- 输出是否允许自动落库
- 谁可以查看 Agent trace
- 高风险输出是否必须二次确认

## 4. Agent 分类体系

建议按三条轴线同时分类，而不是只按业务名称分类。

## 4.1 按框架角色分类

### A. 控制类 Agent

负责路由、拆解、复核，不直接承担某个业务域的最终专业输出。

- `IntentRouterAgent`
- `PlannerAgent`
- `ReviewerAgent`

### B. 业务专家类 Agent

围绕单一业务目标工作，输入输出明确，是第一版框架的主力。

- `ArchiveSummaryAgent`
- `RecommendationAgent`
- `OrderCoordinationAgent`
- `DispatchSuggestionAgent`
- `ReportSummaryAgent`
- `RiskScreeningAgent`

## 4.2 按输出性质分类

- 摘要/抽取型
  - `ArchiveSummaryAgent`
  - `ReportSummaryAgent`
- 推荐/决策支持型
  - `RecommendationAgent`
  - `OrderCoordinationAgent`
  - `DispatchSuggestionAgent`
- 风险识别型
  - `RiskScreeningAgent`
- 路由/控制型
  - `IntentRouterAgent`
  - `PlannerAgent`
  - `ReviewerAgent`

## 4.3 按风险等级分类

| 风险等级 | Agent | 原因 |
| --- | --- | --- |
| 低 | `ReportSummaryAgent`、`ArchiveSummaryAgent` | 以摘要、结构化提炼为主，副作用最小 |
| 中 | `RecommendationAgent`、`OrderCoordinationAgent` | 会影响服务建议和流程判断，但仍应停留在建议层 |
| 高 | `DispatchSuggestionAgent`、`RiskScreeningAgent` | 会影响履约安排和风险预警，必须有人工复核与评测基线 |

## 5. Agent 职责清单

下面的定义是“框架级标准卡片”，用于约束实现，不代表这些 Agent 现在已经全部开发完成。

## 5.1 IntentRouterAgent

别名：需求理解 Agent

- 目标
  - 把原始请求转换成可执行的任务意图，并决定应交给哪个 Specialist Agent。
- 核心职责
  - 识别请求场景、意图和优先级
  - 判断当前信息是否足够执行
  - 生成标准化任务摘要和路由结果
  - 对超出能力边界的请求直接拒答或转人工
- 典型输入
  - 原始用户请求
  - 会话上下文
  - 当前实体 ID，例如 `orderId`、`reportId`、`userId`
- 典型输出
  - `targetAgent`
  - `taskType`
  - `normalizedIntent`
  - `requiredContext`
  - `needClarification`
  - `confidence`
- 允许使用的能力
  - 轻量上下文读取
  - 会话摘要
  - 意图分类模型
- 不负责
  - 产出最终专业结论
  - 直接创建订单、派单或风险告警
  - 代替 Specialist Agent 做复杂业务推理

## 5.2 PlannerAgent

定位：可选控制 Agent，不是第一版必选项。

- 目标
  - 把复杂任务拆成多个可执行子任务，并安排执行顺序。
- 核心职责
  - 任务拆解
  - 依赖排序
  - 明确每一步需要的上下文和 Specialist Agent
- 典型输出
  - `plan`
  - `subtasks`
  - `handoffTargets`
- 不负责
  - 直接产出最终业务结论
  - 绕过规则擅自新增 Agent 类型

只有在单个 Specialist Agent 无法稳定处理复杂任务时，才应引入它。

## 5.3 ReviewerAgent

定位：复核 Agent，用于中高风险任务的质量门禁。

- 目标
  - 检查上游 Agent 输出是否满足结构、证据和安全约束。
- 核心职责
  - 检查 JSON 结构是否合法
  - 检查是否缺少证据、引用或关键字段
  - 标记高风险结论和需人工复核项
  - 决定“通过、退回重跑、转人工”
- 典型输出
  - `reviewStatus`
  - `issues`
  - `riskFlags`
  - `humanReviewRequired`
- 不负责
  - 替代原 Agent 重做整个任务
  - 直接修改业务数据

## 5.4 ArchiveSummaryAgent

别名：健康档案 Agent

- 目标
  - 把档案、报告、指标和历史事实整理成稳定的健康摘要与长期记忆。
- 核心职责
  - 归并多来源健康信息
  - 提炼长期稳定事实、风险标签和缺失字段
  - 维护适合下游复用的结构化摘要
- 典型输入
  - `HealthArchive`
  - 最新指标
  - 相关报告摘要
  - 历史随访记录
- 典型输出
  - `profileSummary`
  - `riskTags`
  - `missingFields`
  - `memoryPatch`
- 允许使用的工具
  - `getHealthArchive`
  - `getLatestHealthMetrics`
  - `getReportContext`
  - `saveAgentResult`
- 不负责
  - 医学诊断
  - 服务推荐
  - 自动触发高风险处置

## 5.5 RecommendationAgent

别名：服务推荐 Agent

- 目标
  - 基于用户需求、健康状态和服务规则，给出服务候选与推荐理由。
- 核心职责
  - 对齐需求和服务目录
  - 识别适用条件与排除条件
  - 生成可解释的推荐理由
  - 提示仍需补充的信息
- 典型输入
  - 标准化需求
  - 健康摘要
  - 服务目录
  - 地域与资源约束
- 典型输出
  - `recommendedServices`
  - `recommendationReasons`
  - `exclusionReasons`
  - `followUpQuestions`
- 允许使用的工具
  - `getHealthArchive`
  - `searchServiceCatalog`
  - `getLatestHealthMetrics`
- 不负责
  - 直接下单
  - 修改价格或套餐
  - 代替临床结论

## 5.6 OrderCoordinationAgent

别名：订单调度 Agent

- 目标
  - 判断订单进入履约前还缺什么信息、下一步该如何推进。
- 核心职责
  - 检查订单是否具备履约前提
  - 识别缺失字段、冲突信息和优先级
  - 给出后续处理建议和操作清单
- 典型输入
  - 订单上下文
  - 服务要求
  - 地址与联系人快照
  - 健康摘要
- 典型输出
  - `readinessStatus`
  - `missingRequirements`
  - `nextActionSuggestions`
  - `coordinationNotes`
- 允许使用的工具
  - `getOrderContext`
  - `getHealthArchive`
  - `searchServiceCatalog`
  - `saveAgentResult`
- 不负责
  - 直接变更订单状态
  - 直接分配机构或服务人员
  - 绕过运营规则强行推进工单

## 5.7 DispatchSuggestionAgent

别名：智能派单 Agent

- 目标
  - 在明确规则前提下，为工单提供机构、人员、时间段的候选建议。
- 核心职责
  - 匹配服务能力、地域覆盖、资源可用性
  - 评估候选方案的适配度与冲突项
  - 给出排序后的候选列表和解释
- 典型输入
  - 订单/工单上下文
  - 服务约束
  - 机构与人员资源
  - 排班与覆盖信息
- 典型输出
  - `dispatchCandidates`
  - `rankingReasons`
  - `conflictFlags`
  - `manualReviewReason`
- 允许使用的工具
  - `getOrderContext`
  - `getDispatchResourceContext`
  - `getInstitutionCapabilityContext`
  - `saveAgentResult`
- 不负责
  - 在第一版中自动派单
  - 直接写入排班结果
  - 无视人工规则做最终履约决策

这是高风险 Agent，必须默认带人工复核。

## 5.8 ReportSummaryAgent

别名：报告生成 Agent，但建议在实现上拆成“报告摘要 Agent + 报告渲染服务”。

- 目标
  - 从体检、服务、评估等报告中提炼结构化摘要和可解释说明。
- 核心职责
  - 抽取关键指标、异常项、趋势和建议关注点
  - 生成统一格式的结构化摘要
  - 为后续前端展示和人工复核提供可解释文本
- 典型输入
  - 原始报告内容
  - 报告类型
  - 既往摘要或基线信息
- 典型输出
  - `reportSummary`
  - `keyFindings`
  - `abnormalItems`
  - `followUpSuggestions`
- 允许使用的工具
  - `getReportContext`
  - `getHealthArchive`
  - `saveAgentResult`
- 不负责
  - 直接输出医学诊断结论
  - 代替医生签署正式报告
  - 负责最终 PDF/页面渲染

这里要特别区分：

- `ReportSummaryAgent` 负责理解与结构化提炼
- 报告模板拼装、文件生成、页面渲染应由普通应用服务负责

## 5.9 RiskScreeningAgent

别名：风险识别 Agent

- 目标
  - 从指标、报告、档案和事件中识别需要关注的风险信号。
- 核心职责
  - 聚合异常信号
  - 识别风险等级和触发原因
  - 给出处置建议和人工介入建议
  - 明确证据链和不确定项
- 典型输入
  - 最新健康指标
  - 报告摘要
  - 健康档案基线
  - 最近事件或随访记录
- 典型输出
  - `riskLevel`
  - `riskSignals`
  - `evidence`
  - `recommendedActions`
  - `humanEscalationRequired`
- 允许使用的工具
  - `getLatestHealthMetrics`
  - `getHealthArchive`
  - `getReportContext`
  - `saveAgentResult`
- 不负责
  - 给出医疗诊断
  - 自动执行应急动作
  - 在没有人工确认时直接触发高风险外呼或派单

这是全框架中风险最高的业务 Agent 之一。

## 6. 当前项目推荐的第一版 Agent 组合

如果只从框架角度出发，不考虑具体业务流，第一版建议按下面方式控制复杂度：

- 必备运行时角色
  - `Hermes Orchestrator`
  - `Agent Registry`
  - `LLM Gateway`
  - `Tool Layer`
  - `AgentTask Worker`
- 第一批真实启用的 Agent
  - `ReportSummaryAgent`
  - `RecommendationAgent`
  - `ArchiveSummaryAgent`
- 第二批再启用的 Agent
  - `OrderCoordinationAgent`
  - `DispatchSuggestionAgent`
  - `RiskScreeningAgent`
- 可选控制 Agent
  - `IntentRouterAgent`
  - `ReviewerAgent`
  - `PlannerAgent`

控制原则：

- 能用规则路由的地方，先不要急着上 Router Agent
- 能由普通程序做的确定性逻辑，不要伪装成 Agent
- 高风险 Agent 必须晚于低风险 Agent 上线

## 7. 一句话结论

在 IntelliHealthCare 中，多 Agent 框架不应理解成“很多模型一起聊天”，而应理解成：

一个以 `AgentTask` 为任务单元、以受控工具为能力边界、以结构化输入输出为契约、以 Specialist Agent 为主力角色、并由审计与人工复核兜底的受控执行框架。
