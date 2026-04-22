# Hermes Agents Runtime

`apps/backend/src/modules/agents` 是 IntelliHealthCare 当前的受控多智能体运行时宿主。它的目标不是做开放自治平台，而是在后端内部逐步落地统一多智能体框架、领域 Agent 编排和治理链路。

这里需要始终区分两层：

- 运行时现状：当前仍是 MVP，可执行 Agent 只有少量低风险场景
- 目标蓝图：已经收敛为“统一多智能体框架 + 共享领域 Agent + 用户端单助手 UI + Hermes 受控运行时”的正式方案

## 模块定位

Hermes 在本项目中的推荐定位是：

- 后端内部的 Agent orchestration runtime
- 负责任务接入、队列调度、路由、工具调用、状态回写与审计
- 为用户端、后台端和事件驱动任务提供统一执行底座

Hermes 不应被理解成：

- 独立部署的开放式 AI 平台
- 可无边界自治的自由多 Agent 系统
- 绕过业务模块直接写数据库的执行引擎

## 当前运行时能力

- 统一任务入口：`AgentTask` 入库后通过 `BullMQ` 异步执行
- 任务状态流转：`PENDING -> RUNNING -> SUCCEEDED | FAILED`
- 声明式注册：当前已注册 `9` 个核心 Agent，并兼容 `intent-router`、`report-summary-agent`、`service-recommendation-agent` 旧别名
- 受控工具层：报告、档案、健康指标、服务目录、RAG 检索
- `LLM Gateway`：支持 `DeepSeek 官方直连 / OpenRouter / openai-compatible` 网关，内置主模型、轻量模型、结构化输出和 tool-calling 接口
- `Embedding Gateway`：统一承接向量模型调用，未配置时回退到确定性占位向量，供后续检索链路继续兜底
- `Agent Orchestrator`：默认入口已从“只路由到单 Specialist”升级为受控多 Agent 分工，支持健康理解补风险研判、风险任务补健康背景、后台 Copilot 汇总多域摘要
- 多 Agent trace：`AgentTask.result.trace.coordination.steps` 会记录每一步 handoff 的 Agent、任务类型、输出摘要、模型信息和该步工具调用
- 审计结果：路由、工具调用、模型信息、失败原因全部写回 `AgentTask.result`

当前可执行任务：

- `task-orchestration`
- `assistant-conversation`
- `report-summary`
- `report-interpretation`
- `health-summary`
- `focus-elder-brief`
- `service-recommendation`
- `booking-prefill`
- `dispatch-suggestion`
- `risk-screening`
- `alert-triage`
- `risk-reminder`
- `device-diagnosis`
- `device-inspection`
- `content-summary`
- `activity-analysis`
- `campaign-suggestion`
- `dashboard-digest`
- `shift-summary`
- `morning-brief`
- `safety-review`

默认入口 Agent 为 `TaskOrchestratorAgent`，仍兼容 `intent-router` 旧入口，并按 `taskType` 进入以下受控协作链路：

- 健康理解：`TaskOrchestratorAgent -> HealthManagementAgent -> RiskOperationsAgent(按需) -> SafetyReviewAgent`
- 风险运营：`TaskOrchestratorAgent -> RiskOperationsAgent -> HealthManagementAgent(补背景) -> SafetyReviewAgent`
- 后台 Copilot：按 `domainRequests` 先收集 `health / care / risk / device / content` 域简报，再进入 `OperationsCopilotAgent -> SafetyReviewAgent`
- 直接 Specialist 调用仍保持兼容，不强制附加多 Agent handoff

## 当前实现与目标蓝图的映射

当前运行时不是独立原型，而是统一蓝图的第一阶段承接层。

| 当前实现 | 目标蓝图归属 | 说明 |
| --- | --- | --- |
| `intent-router` | `TaskOrchestratorAgent` | 当前控制层入口，后续升级为统一路由与编排面 |
| `report-summary-agent` | `HealthManagementAgent` | 当前已落地的健康理解子能力 |
| `service-recommendation-agent` | `CareCoordinationAgent` | 当前已落地的服务协同子能力 |
| `AgentOrchestratorService` | `Hermes Orchestrator` | 当前调度、状态和执行控制宿主 |
| `agent-task.processor.ts` | 队列执行层 | 当前异步执行入口 |

## 统一蓝图摘要

统一多智能体蓝图当前定义 `9` 个核心 Agent：

- 控制层：`TaskOrchestratorAgent`
- 交互层：`AssistantConversationAgent`、`OperationsCopilotAgent`
- 领域层：`HealthManagementAgent`、`CareCoordinationAgent`、`RiskOperationsAgent`、`DeviceOperationsAgent`、`ContentActivityOpsAgent`
- 治理层：`SafetyReviewAgent`

统一蓝图的核心约束如下：

- 只有一套多智能体框架，用户端、后台端和系统事件共享同一批领域 Agent
- Agent 按稳定业务领域划分，不按页面和路由碎片化拆分
- 优先采用受控协作，不做无限轮开放自治
- 高风险输出必须走复核和人工兜底

统一蓝图中的标准工作流包括：

- 用户统一康养助手工作流
- 健康理解工作流
- 服务协同工作流
- 风险运营工作流
- 后台运营 Copilot 工作流

完整 Agent 卡片见 [intellihealthcare-agent-cards.md](/home/wy/IntelliHealthCare/docs/intellihealthcare-agent-cards.md)。

蓝图数据源位于 [framework-blueprint.ts](/home/wy/IntelliHealthCare/apps/backend/src/modules/agents/domain/framework-blueprint.ts)，并通过内部接口对外提供，其中 `blueprint.agentCards` 会返回当前统一蓝图下的全部 Agent 卡片。

## 内部接口

- `GET /api/v1/internal/agents/blueprint`
- `GET /api/v1/internal/agents/definitions`
- `POST /api/v1/internal/agents/tasks`
- `GET /api/v1/internal/agents/tasks`
- `GET /api/v1/internal/agents/tasks/:taskId`
- `POST /api/v1/internal/agents/tasks/:taskId/retry`
- `GET /api/v1/internal/agents/rag/knowledge-bases`
- `POST /api/v1/internal/agents/rag/search`

## App 层 AI 接口

用户端 AI 路由统一挂载在 `app` 作用域下：

- `POST /api/v1/app/ai/assistant/conversations`
- `GET /api/v1/app/ai/assistant/conversations/:conversationId`
- `GET /api/v1/app/ai/assistant/conversations/:conversationId/messages`
- `POST /api/v1/app/ai/assistant/conversations/:conversationId/messages`
- `POST /api/v1/app/ai/service-recommendations`
- `POST /api/v1/app/ai/order-prefill`
- `GET /api/v1/app/ai/health-summary`
- `GET /api/v1/app/ai/health-metric-explanations`
- `GET /api/v1/app/ai/reports/:reportId/interpretation`
- `GET /api/v1/app/ai/reports/:reportId/followup-suggestions`
- `GET /api/v1/app/ai/risk-alerts`
- `GET /api/v1/app/ai/risk-alerts/:alertId`
- `GET /api/v1/app/ai/knowledge/search`

内部接口访问控制：

- 必须携带后台 `JWT`（`admin` scope）
- 调用来源 IP 需要命中 `INTERNAL_API_ALLOWED_CIDRS`
- 如果配置了 `INTERNAL_API_SHARED_SECRET`，还需要额外携带 `X-Internal-Token`
- 如果部署在反向代理后面，需要开启 `INTERNAL_API_TRUST_PROXY_HEADERS=true`，并确保代理会覆盖转发头

接口语义：

- `blueprint` 返回统一多智能体蓝图，包括定位、原则、能力、Agent、工作流、治理规则、Hermes 规划和实施路线图
- `definitions` 返回当前代码里真正已注册、可执行的 Agent 定义

## RAG 检索接入

当前检索服务已正式接入 `agents` 模块，入口分三层：

- App 层：`GET /api/v1/app/ai/knowledge/search`
- 内部管理层：`GET /api/v1/internal/agents/rag/knowledge-bases`、`POST /api/v1/internal/agents/rag/search`
- Agent 工具层：`searchKnowledgeBase`

当前边界约束如下：

- App 层默认只检索 `PUBLIC` 知识；显式传入 `includePrivate=true` 后，才会在家属绑定/本人权限校验通过时联查 `USER_PRIVATE`
- App 层不开放 `INSTITUTION_RESOURCE`，避免把机构侧资源知识直接暴露给用户端
- 内部检索支持按 `knowledgeTypes / visibilityScopes / ownerUserId / institutionId` 过滤，并继续受后台 `JWT + 来源 IP + 可选共享密钥` 约束
- `HealthManagementAgent` 和 `CareCoordinationAgent` 已接入 `searchKnowledgeBase`，会把检索结果压缩进 prompt，并在输出 evidence 中附带 citation

当前检索策略是首版可用实现：

- 候选召回：`RagChunk.title/content contains`
- 排序：词法分 + query embedding 与 chunk embedding 的余弦相似度重排
- DeepSeek 官方直连模式下，query embedding 继续走确定性兜底向量；后续如接入独立 embedding 网关，可直接替换，不需要改 API 契约

创建任务示例：

```json
{
  "agentName": "intent-router",
  "taskType": "report-summary",
  "ownerId": "user_elder_zhou",
  "triggerSource": "internal-api",
  "payload": {
    "reportId": "report_checkup_exam",
    "userId": "user_elder_zhou"
  }
}
```

## 环境变量

- `AGENT_LLM_PROVIDER`
- `AGENT_LLM_BASE_URL`
- `AGENT_LLM_API_KEY`
- `AGENT_LLM_MODEL`
- `AGENT_LLM_LIGHT_MODEL`
- `AGENT_LLM_FALLBACK_MODEL`
- `AGENT_EMBEDDING_MODEL`
- `AGENT_EMBEDDING_FALLBACK_MODEL`
- `AGENT_LLM_TIMEOUT_MS`
- `AGENT_EMBEDDING_TIMEOUT_MS`
- `AGENT_LLM_MAX_CONTEXT_TOKENS`
- `AGENT_TASK_BUDGET_USD`
- `AGENT_STRICT_JSON_OUTPUT`
- `AGENT_REQUIRE_TOOL_CALLING`
- `AGENT_OPENROUTER_ALLOW_FALLBACKS`
- `AGENT_OPENROUTER_ZDR`
- `AGENT_MAX_RETRIES`
- `AGENT_MAX_TOOL_STEPS`
- `AGENT_ENABLE_TRACING`
- `AGENT_WORKER_CONCURRENCY`

默认 backbone 已对齐当前方案：

- provider：`DeepSeek`
- 主模型：`deepseek-chat`
- 轻量 / 降级模型：`deepseek-chat`
- embedding：当前直连模式下继续走确定性向量兜底；如需真实 embedding，请单独接入兼容网关

DeepSeek 官方直连模式下，网关会自动把 `deepseek/deepseek-chat` 归一化为 `deepseek-chat`，并将严格 `JSON Schema` 请求降级为 `json_object` 兼容模式，最终仍由服务端 `zod` schema 做结构校验。

如果不希望把 Key 写入项目内 `.env`，可以直接通过系统环境变量提供 `DEEPSEEK_API_KEY`；当 `AGENT_LLM_API_KEY` 为空时，后端会自动回退读取该变量。

若未配置 `AGENT_LLM_API_KEY`，运行时仍可启动，但 `LLM Gateway` 会回退到确定性结构化输出，`Embedding Gateway` 会回退到确定性占位向量；真正的检索链路仍应继续降级到词法检索或人工兜底。
