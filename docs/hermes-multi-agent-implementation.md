# Hermes 多智能体框架实施路径

## 1. 目标与边界

本文档不是在定义一个通用 AI 平台，而是在当前 IntelliHealthCare 仓库内，为 `apps/backend/src/modules/agents` 规划一套可逐步落地的多智能体编排框架。

如果当前关注点是“多 Agent 框架本身需要什么能力、有哪些 Agent 类型、每个 Agent 的职责边界是什么”，应优先阅读 `docs/hermes-agent-framework-requirements.md`。本文更偏实施顺序与落地路径。

结合当前仓库现状：

- 后端已经采用 `NestJS + Prisma + Redis + BullMQ + MinIO`
- `AgentTask`、`AGENT_LLM_BASE_URL`、`AGENT_LLM_API_KEY` 已经预留
- `agents` 模块已挂入主应用，但尚未实现具体能力

因此，`Hermes` 在本项目中的推荐定位应当是：

- 一个挂在后端内部的 Agent orchestration runtime
- 负责 Agent 任务接入、路由、工具调用、队列调度、结果入库、状态回写
- 服务于业务闭环，而不是独立成一套“大而全”的 AI 中台

不建议当前阶段把 `Hermes` 设计成：

- 独立部署的通用多租户 Agent 平台
- 任意 Agent 自由对话、自主发现工具的开放式系统
- 先上复杂自治，再补审计、回滚、人工兜底

对医疗养老业务而言，先做“工作流编排型多智能体”比“自由自治型多智能体”更稳。

## 2. 在当前仓库中的落点

推荐把 `Hermes` 放在现有后端结构内，作为 `agents` 模块的实现层：

```text
API / Domain Modules
  -> AgentTask 持久化
  -> BullMQ 队列
  -> Hermes Orchestrator
  -> Specialist Agent
  -> Tool / RAG / LLM
  -> 结果入库 + 状态回写 + 事件通知
```

建议职责分工如下：

- `orders`、`reports`、`health-archive`、`health-metrics` 等业务模块负责业务触发
- `agents` 模块负责任务生命周期与编排
- `infra/queue` 负责异步执行
- `Prisma` 负责任务记录、结果快照、审计追踪
- `messaging` 或业务事件层负责结果通知

也就是说，Hermes 不应直接绕过业务模块写数据库，而应通过工具层或应用服务访问业务能力。

## 3. 建议实施顺序

## 3.1 Phase 0：先做单 Agent 主链路

不要一开始就同时上 5 到 7 个 Agent。先把下面这条主链路打通：

1. 业务模块创建 `AgentTask`
2. 投递 BullMQ 队列
3. Worker 拉起任务
4. 调用 LLM gateway
5. 调用受控工具或检索
6. 返回结构化结果
7. 回写 `AgentTask.result` 与业务表

首期先支持 1 到 2 个低风险场景：

- `report-summary`：报告摘要 / 报告解读增强
- `service-recommendation`：服务推荐解释

这样能先验证：

- LLM 调用链是否稳定
- JSON 结构输出是否可靠
- 任务重试、超时、失败回写是否完整
- 审计日志和人工兜底是否可用

## 3.2 Phase 1：实现 LLM backbone / gateway

多智能体能不能落地，首先取决于 LLM backbone 是否清晰。

在本项目里，`LLM backbone` 至少要明确下面几层：

- `provider`：走哪家模型服务，是否自建网关
- `planner model`：复杂路由、总结、决策使用的主模型
- `worker model`：简单抽取、分类、改写使用的轻量模型
- `embedding model`：RAG 检索向量模型
- `fallback model`：主模型超时或降级时的备选模型

首期建议不是“一个模型跑所有事情”，而是至少分成两档：

- 强模型：用于规划、复杂总结、跨来源归纳
- 轻模型：用于结构化抽取、简单回复、低成本执行

选型时必须确认这些能力：

- 是否稳定支持 `tool calling`
- 是否稳定支持 `JSON schema` 或严格结构化输出
- 上下文窗口是否足够承载报告、档案、服务规则
- 延迟和价格是否能支撑批量任务
- 是否支持私有化接入或网关转发

当前仓库已存在：

- `AGENT_LLM_BASE_URL`
- `AGENT_LLM_API_KEY`

但要真正落地，通常还需要补充以下配置项：

- `AGENT_LLM_PROVIDER`
- `AGENT_LLM_MODEL`
- `AGENT_LLM_FALLBACK_MODEL`
- `AGENT_EMBEDDING_MODEL`
- `AGENT_LLM_TIMEOUT_MS`
- `AGENT_MAX_RETRIES`
- `AGENT_MAX_TOOL_STEPS`
- `AGENT_ENABLE_TRACING`

## 3.3 Phase 2：先定义工具层，再谈多 Agent 协作

Hermes 的核心不只是 Prompt，而是“受控工具 + 明确输入输出”。

建议优先沉淀这些工具接口：

- `getHealthArchive(userId)`
- `getLatestHealthMetrics(userId, metricTypes)`
- `searchServiceCatalog(query, region, constraints)`
- `getOrderContext(orderId)`
- `getReportContext(reportId)`
- `saveAgentResult(taskId, result)`
- `createFollowUpSuggestion(userId, suggestion)`

工具层原则：

- Agent 不直接写 SQL
- 工具接口必须做权限校验
- 工具返回结构必须稳定，不返回随意拼接文本
- 工具应尽量是幂等的、可审计的

如果工具层没定义清楚，多 Agent 最终会退化成“Prompt 里拼上下文”。

## 3.4 Phase 3：建设 RAG 与知识分层

当前仓库文档已经提出 5 类知识库，建议按这个方向继续细化：

- 服务目录知识
- 健康知识
- 平台规则知识
- 机构资源知识
- 用户个体档案知识

落地时需要明确：

- 每类知识的来源系统
- 更新频率
- 分块策略
- 元数据字段
- 权限边界
- 引用回传方式

对本项目尤其重要的是区分：

- 公共知识：健康百科、服务规则
- 机构知识：机构能力、排班资源、可服务区域
- 用户私有知识：档案、报告、设备指标、历史订单

用户私有知识必须带严格的身份与授权校验，不能和公共知识同样处理。

## 3.5 Phase 4：从“工作流编排”升级到“多 Agent 分工”

推荐的 Agent 角色不是同时全部启动，而是按风险和依赖逐步引入：

1. `RecommendationAgent`
2. `ReportSummaryAgent`
3. `ArchiveSummaryAgent`
4. `DispatchSuggestionAgent`
5. `RiskScreeningAgent`

推荐协作模式如下：

- `Router -> Specialist`：路由到某个专业 Agent，适合绝大多数场景
- `Planner -> Executor -> Reviewer`：适合高价值、低频任务
- `Event-driven Agent`：订单完成、报告上传、指标异常后自动触发

当前阶段不建议：

- 多个 Agent 自由会话、互相来回讨论
- 让 Agent 自主创建新 Agent
- 没有预算上限和步数上限的开放式推理

在医疗养老场景，流程受控比“看起来聪明”更重要。

## 3.6 Phase 5：补齐评测、审计与运维

Agent 上线前，必须把以下闭环补齐：

- 任务日志：谁触发、何时触发、输入摘要、输出摘要
- Prompt 版本：每次任务关联 prompt version
- 工具调用日志：调用了什么工具、参数是什么、结果是什么
- 成本统计：token、延迟、重试次数
- 风险分级：哪些输出必须人工确认后才能生效
- 离线评测集：固定样本回归测试

医疗养老场景还要明确：

- 是否允许模型直接给医学判断
- 哪些内容只能给“辅助建议”，不能给“诊断结论”
- 哪些 Agent 输出只能作为运营建议，不能自动执行

`RiskScreeningAgent` 和 `DispatchSuggestionAgent` 上线前，必须先有评测集和人工复核机制。

## 4. 推荐的模块结构

建议在 `apps/backend/src/modules/agents` 下逐步演进为：

```text
apps/backend/src/modules/agents/
  agents.module.ts
  controllers/
    agents.controller.ts
  dto/
    create-agent-task.dto.ts
  application/
    agent-orchestrator.service.ts
    agent-dispatch.service.ts
    agent-task.service.ts
  domain/
    agent-registry.ts
    agent-types.ts
  gateways/
    llm.gateway.ts
    embedding.gateway.ts
  tools/
    health-archive.tool.ts
    health-metrics.tool.ts
    service-catalog.tool.ts
    orders.tool.ts
    reports.tool.ts
  prompts/
    recommendation/
    report-summary/
    dispatch/
    risk/
  workers/
    agent-task.processor.ts
  evals/
    fixtures/
    scorers/
```

推荐边界：

- `gateways` 只处理模型协议与供应商适配
- `tools` 只处理受控能力暴露
- `application` 负责任务编排与状态流转
- `workers` 负责异步执行
- `prompts` 与 `evals` 要版本化

## 5. 你需要提前准备的说明材料

如果要让 Hermes 进入实施阶段，至少要准备以下几类说明。

## 5.1 LLM backbone 说明

这是最基础的一页纸，至少说明：

- 使用哪个 provider
- 主模型、轻量模型、embedding 模型分别是什么
- 是否要求 `tool calling`
- 是否要求严格 JSON 输出
- 最大上下文长度要求
- 单次任务预算上限
- 是否要求私有网关或内网转发
- 失败时如何降级

如果这页纸没有定，多智能体实现会一直摇摆。

## 5.2 Agent 卡片

每个 Agent 都应有一张卡片，至少包含：

- `name`
- `goal`
- `trigger`
- `input schema`
- `output schema`
- `allowed tools`
- `forbidden actions`
- `human fallback`
- `SLA / timeout`

建议先写最少 3 张卡片：

- `RecommendationAgent`
- `ReportSummaryAgent`
- `DispatchSuggestionAgent`

## 5.3 工具说明

每个工具要说明：

- 工具名称
- 调用方 Agent
- 输入参数
- 返回结构
- 权限要求
- 幂等性要求
- 失败语义

如果工具说明缺失，后续会出现：

- Prompt 绑死业务字段
- Agent 与业务模块强耦合
- 不同 Agent 重复拼装上下文

## 5.4 RAG / 知识说明

至少要说明：

- 知识来源
- 更新时间
- 文档格式
- 清洗规则
- chunk 策略
- metadata 字段
- 引用回传格式
- 权限边界

尤其需要提前界定哪些内容可进公共知识库，哪些只能走用户私有上下文。

## 5.5 评测说明

每个 Agent 都要准备一批固定样本，至少覆盖：

- 正常样本
- 缺失字段样本
- 冲突信息样本
- 高风险样本
- 应拒答样本

评测指标至少包括：

- 结构化输出正确率
- 工具选择正确率
- 引用命中率
- 幻觉率
- 人工复核通过率

## 5.6 合规与运营说明

需要提前讲清楚：

- 是否涉及医疗建议边界
- 是否需要脱敏
- 是否保留原始 prompt / response
- 保留多久
- 谁可以查看 Agent trace
- 哪类输出允许自动落库
- 哪类输出只能进入待审核状态

## 6. 当前项目的推荐落地顺序

结合当前 IntelliHealthCare 仓库，我建议按下面顺序推进：

1. 先补 `agents` 模块骨架、LLM gateway、队列 worker、任务状态流转
2. 首先上线 `ReportSummaryAgent`
3. 第二个上线 `RecommendationAgent`
4. 等工具层和评测稳定后，再做 `DispatchSuggestionAgent`
5. 最后再考虑 `RiskScreeningAgent`

原因很直接：

- 报告摘要和推荐解释更容易约束输出
- 派单建议和风险识别的业务风险更高
- 高风险 Agent 必须建立人工复核和评测基线后再开放

## 7. 一句话结论

对当前仓库来说，Hermes 最合理的实现路径不是“先搭多智能体平台”，而是：

先做 `LLM gateway + AgentTask + Queue Worker + Tool Layer + 1~2 个低风险 Specialist Agent`，等结构化输出、评测、审计和人工兜底稳定后，再扩成真正的多智能体协作系统。
