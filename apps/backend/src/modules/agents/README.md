# Hermes Agents MVP

当前 `apps/backend/src/modules/agents` 已落地一版受控型多智能体运行时，目标是先打通文档里定义的最小闭环，而不是做开放自治平台。

当前需要区分两层：

- 运行时现状：仍是 MVP，可执行 Agent 只有少量场景
- 目标蓝图：已经升级为“统一多智能体框架 + 共享领域 Agent + 用户端单助手 UI”的设计

## 当前能力

- 统一任务入口：`AgentTask` 入库后通过 BullMQ 异步执行
- 任务状态流转：`PENDING -> RUNNING -> SUCCEEDED | FAILED`
- 声明式注册：`IntentRouter`、`ReportSummaryAgent`、`ServiceRecommendationAgent`
- 受控工具层：报告、档案、健康指标、服务目录
- LLM Gateway：支持 `openai-compatible` 网关，未配置时自动降级到确定性输出
- 审计结果：路由、工具调用、模型信息、失败原因全部写回 `AgentTask.result`

## 已支持任务

- `report-summary`
- `report_interpretation`
- `service-recommendation`
- `service_recommendation`

默认入口 Agent 为 `intent-router`，会按 `taskType` 路由到对应 Specialist。

## 内部接口

- `GET /api/v1/internal/agents/blueprint`
- `GET /api/v1/internal/agents/definitions`
- `POST /api/v1/internal/agents/tasks`
- `GET /api/v1/internal/agents/tasks`
- `GET /api/v1/internal/agents/tasks/:taskId`
- `POST /api/v1/internal/agents/tasks/:taskId/retry`

其中：

- `blueprint` 返回基于项目文档、用户端页面和后台端页面整理出的统一多智能体蓝图
- `definitions` 返回当前代码里真正已注册、可执行的 Agent 定义

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
- `AGENT_LLM_FALLBACK_MODEL`
- `AGENT_LLM_TIMEOUT_MS`
- `AGENT_MAX_RETRIES`
- `AGENT_MAX_TOOL_STEPS`
- `AGENT_ENABLE_TRACING`
- `AGENT_WORKER_CONCURRENCY`

若未配置 `AGENT_LLM_BASE_URL` 或 `AGENT_LLM_API_KEY`，MVP 仍可运行，但会使用确定性降级输出。
