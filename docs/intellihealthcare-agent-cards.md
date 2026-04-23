# IntelliHealthCare Agent 卡片

本文档基于当前统一蓝图整理 IntelliHealthCare 现有设计中的全部核心 Agent 卡片。

约束说明：

- 当前设计共有 `9` 个核心 Agent，而不是 `8` 个。
- 本文档描述的是统一蓝图，不等同于“已全部实现”。
- `SLA / timeout` 目前属于设计期推荐预算，用于实现约束、治理和评测基线，不表示当前运行时已经全部落地。

## 1. TaskOrchestratorAgent

- `name`: `TaskOrchestratorAgent`
- `goal`: 把来自用户端、后台端和事件流的任务标准化，并决定由哪个领域 Agent 执行、是否需要协作以及是否进入人工复核。
- `trigger`:
  - 统一康养助手请求
  - 内部 API 创建 `AgentTask`
  - 报告上传、指标异常、后台页面刷新等系统事件
  - 失败重试或补偿任务
- `input schema`:

```ts
type TaskOrchestratorInput = {
  taskId: string;
  taskType: string;
  triggerSource: "assistant" | "internal-api" | "event" | "schedule";
  ownerId?: string;
  conversationContext?: ConversationContext;
  taskContext?: TaskContext;
  policySnapshot?: PolicyRuleRef[];
};
```

- `output schema`:

```ts
type TaskOrchestratorOutput = {
  executionPlan: ExecutionPlan;
  targetAgentList: string[];
  workflowRoute: "single-agent" | "serial" | "event-driven";
  requiredContext?: string[];
  humanReviewHint?: string | null;
};
```

- `allowed tools`: `task metadata`、`conversation context`、`policy rules`、`agent registry`
- `forbidden actions`:
  - 直接产出医学、派单或运营最终结论
  - 绕过业务模块直接写数据库
  - 未经规则校验直接自动执行高风险动作
  - 擅自创建未注册 Agent
- `human fallback`: 路由不稳定、关键上下文缺失、策略冲突或超时后，转人工分诊台或后台运营工单池，并保留失败原因与建议路线。
- `SLA / timeout`: `sync` 路由请求 `p95 <= 3s`；异步或事件任务入队后 `30s` 内完成首轮路由；硬超时 `10s`。

## 2. AssistantConversationAgent

- `name`: `AssistantConversationAgent`
- `goal`: 作为用户侧统一康养助手的单一会话门面，承接问答、整理上下文并把下游 Agent 结果整合成自然语言回复。
- `trigger`:
  - 用户侧统一康养助手输入
  - 消息中心 AI 对话回流
  - 需要继续追问或补充澄清的会话轮次
- `input schema`:

```ts
type AssistantConversationInput = {
  sessionId: string;
  userMessage: string;
  conversationHistory?: ConversationTurn[];
  resolvedIntent?: ExecutionPlan | null;
  pageContext?: PageContext;
};
```

- `output schema`:

```ts
type AssistantConversationOutput = {
  assistantReply: string;
  followUpQuestion?: string | null;
  navigationSuggestion?: NavigationSuggestion | null;
  pendingTaskHint?: string | null;
};
```

- `allowed tools`: `conversation history`、`response templates`、`page registry`、`TaskOrchestratorAgent output`
- `forbidden actions`:
  - 绕过控制层直接调用高风险领域 Agent
  - 伪造专业结论覆盖下游 Agent 输出
  - 未经授权暴露用户私有健康数据
  - 直接创建订单、派单或预警
- `human fallback`: 用户明确要人工服务、意图无法澄清、`SafetyReviewAgent` 阻断输出或会话超时后，转人工客服、医生咨询入口或人工服务预约入口。
- `SLA / timeout`: 用户会话首轮回复 `p95 <= 8s`；复杂任务允许先返回处理中提示；硬超时 `12s`。

## 3. HealthManagementAgent

- `name`: `HealthManagementAgent`
- `goal`: 统一承担档案摘要、报告解读、健康趋势解释和重点长者健康简报，形成可复用的健康理解主域输出。
- `trigger`:
  - 用户查看报告
  - 报告上传
  - 用户查看健康摘要
  - 后台查看重点长者
  - 风险任务需要补充健康背景
- `input schema`:

```ts
type HealthManagementInput = {
  userId?: string;
  archiveId?: string;
  reportId?: string;
  viewMode: "report-interpretation" | "health-summary" | "focus-elder-brief";
  authorizedScope: string[];
  metricTypes?: string[];
};
```

- `output schema`:

```ts
type HealthManagementOutput = {
  healthSummary: string;
  keyFindings: string[];
  riskSignals?: string[];
  followUpSuggestions?: string[];
  uncertainties?: string[];
  humanReviewRequired: boolean;
};
```

- `allowed tools`: `getHealthArchive`、`getLatestHealthMetrics`、`getMetricHistory`、`getReportContext`、`getMedicationContext`、`getDietContext`、`getSelfTestContext`
- `forbidden actions`:
  - 直接给出医学诊断结论
  - 自动修改健康档案状态
  - 直接触发高风险处置动作
  - 绕过权限校验读取私有数据
- `human fallback`: 报告内容冲突、输出涉及高风险医学解释、需要医生或健康管理师确认、或结构化输出校验失败时，进入健康管理师或医生复核队列。
- `SLA / timeout`: 报告解读与健康摘要同步请求 `p95 <= 8s`；异步批处理单任务 `30s` 内完成；硬超时 `30s`。

## 4. CareCoordinationAgent

- `name`: `CareCoordinationAgent`
- `goal`: 统一承担服务推荐、预约预填、订单供需匹配和后台派单候选排序，形成服务协同主域输出。
- `trigger`:
  - 用户咨询或搜索服务
  - 用户预约前补全信息
  - 后台请求派单建议
  - 订单履约前的资源匹配任务
- `input schema`:

```ts
type CareCoordinationInput = {
  requestMode:
    | "service-recommendation"
    | "booking-prefill"
    | "dispatch-suggestion";
  userId?: string;
  orderId?: string;
  serviceRequest?: string;
  resourceConstraints?: ResourceConstraint[];
  healthContextRef?: string | null;
};
```

- `output schema`:

```ts
type CareCoordinationOutput = {
  recommendedServices?: RecommendationItem[];
  bookingPrefill?: BookingDraft | null;
  dispatchCandidates?: DispatchCandidate[];
  rankingReasons?: string[];
  missingInfo?: string[];
  humanReviewRequired: boolean;
};
```

- `allowed tools`: `searchServiceCatalog`、`getHealthArchive`、`getLatestHealthMetrics`、`getAddressBook`、`getOrderContext`、`getStaffRoster`、`getScheduleAvailability`、`getInstitutionCoverage`
- `forbidden actions`:
  - 直接创建订单或修改价格
  - 在第一版中自动派单
  - 绕过运营规则写入履约结果
  - 代替临床结论决定服务边界
- `human fallback`: 资源冲突、派单命中高风险规则、价格或资质存在争议、或输出超时后，退回到人工推荐、人工派单或机构运营审核流程。
- `SLA / timeout`: 用户侧服务推荐 `p95 <= 8s`；后台派单建议单任务 `15s` 内给出候选列表；硬超时 `30s`。

## 5. RiskOperationsAgent

- `name`: `RiskOperationsAgent`
- `goal`: 统一承担风险识别、风险分级、预警分诊和回访建议，形成从异常信号到人工干预的风险运营闭环。
- `trigger`:
  - 指标异常
  - 报告结论异常
  - 夜间批处理巡检
  - 后台预警中心刷新
  - 用户侧风险提醒请求
- `input schema`:

```ts
type RiskOperationsInput = {
  eventId?: string;
  userId?: string;
  metricHistoryWindow?: MetricRecord[];
  reportSummaryRef?: string | null;
  openAlerts?: AlertContext[];
  interventionPlaybookVersion?: string;
};
```

- `output schema`:

```ts
type RiskOperationsOutput = {
  riskLevel: "low" | "medium" | "high";
  riskSignals: string[];
  evidence: EvidenceItem[];
  recommendedActions: string[];
  triageQueueHint?: string | null;
  humanEscalationRequired: boolean;
};
```

- `allowed tools`: `getMetricHistory`、`getHealthArchive`、`getRecentReports`、`getOpenAlerts`、`getStaffRoster`、`getInterventionPlaybook`
- `forbidden actions`:
  - 直接给出医疗诊断或急救决策
  - 未经人工确认直接触发高风险外呼或派单
  - 直接修改最终处置状态
  - 隐去证据链只输出结论
- `human fallback`: 风险等级为高、涉及外呼或上门、证据冲突、模型置信度不足或超时后，进入预警中心人工分诊、医护值班或健康管理运营值班队列。
- `SLA / timeout`: 事件驱动预警任务 `30s` 内完成单事件判断；批量巡检任务 `120s` 内完成单批次；硬超时 `120s`。

## 6. DeviceOperationsAgent

- `name`: `DeviceOperationsAgent`
- `goal`: 围绕设备离线、低电量、误报和同步异常输出诊断、巡检优先级和处理建议，服务后台设备运营。
- `trigger`:
  - 设备离线告警
  - 低电量告警
  - 同步异常事件
  - 后台设备监控页刷新
  - 定时巡检任务
- `input schema`:

```ts
type DeviceOperationsInput = {
  deviceId?: string;
  institutionId?: string;
  alertSnapshot?: DeviceAlert[];
  statusBoardRef?: string;
  topologyScope?: TopologyScope | null;
};
```

- `output schema`:

```ts
type DeviceOperationsOutput = {
  deviceDiagnosis: string;
  inspectionPriority: "low" | "medium" | "high";
  suggestedActions: string[];
  suggestedWorkOrder?: WorkOrderDraft | null;
};
```

- `allowed tools`: `getDeviceStatusBoard`、`getRecentDeviceAlerts`、`getInstitutionTopology`
- `forbidden actions`:
  - 直接下发设备控制命令
  - 自动关闭真实告警
  - 绕过设备运维流程创建最终维修结果
- `human fallback`: 需要现场确认、同一机构出现批量异常、建议动作会影响在线监测可用性、或超时后，转设备运维人员或机构设备管理员巡检。
- `SLA / timeout`: 单设备异常诊断 `20s` 内完成；巡检批处理 `60s` 内完成单批次；硬超时 `60s`。

## 7. ContentActivityOpsAgent

- `name`: `ContentActivityOpsAgent`
- `goal`: 围绕资讯、讲堂和社区活动输出摘要、标签、互动分析和运营建议，支撑后台内容与活动运营。
- `trigger`:
  - 内容上新或编辑后分析
  - 活动报名与互动数据刷新
  - 后台内容运营请求
  - 定时运营复盘任务
- `input schema`:

```ts
type ContentActivityOpsInput = {
  contentId?: string;
  activityId?: string;
  analysisMode:
    | "content-summary"
    | "activity-analysis"
    | "campaign-suggestion";
  interactionStatsRef?: string | null;
  scheduleWindow?: string | null;
};
```

- `output schema`:

```ts
type ContentActivityOpsOutput = {
  contentBrief?: string;
  tags?: string[];
  activityAnalysis?: string | null;
  campaignSuggestion?: string[];
};
```

- `allowed tools`: `getContentLibrary`、`getActivityRegistry`、`getContentInteractionStats`
- `forbidden actions`:
  - 直接发布内容或活动
  - 直接修改正式运营排期
  - 绕过人工审核写入外部触达计划
- `human fallback`: 标签涉及敏感主题、建议影响实际排期和预算、样本不足或超时后，交由内容运营或社区活动运营人工审核。
- `SLA / timeout`: 单次内容或活动分析 `20s` 内完成；定时运营摘要 `60s` 内完成单批次；硬超时 `60s`。

## 8. OperationsCopilotAgent

- `name`: `OperationsCopilotAgent`
- `goal`: 把健康、服务、风险、设备、内容等多个领域 Agent 的结果整合成后台工作台可执行摘要和优先级看板。
- `trigger`:
  - 后台首页打开
  - 值班摘要请求
  - 运营晨报定时生成
  - 后台工作台刷新
- `input schema`:

```ts
type OperationsCopilotInput = {
  dashboardScope: string;
  healthBriefs?: DomainBrief[];
  careBriefs?: DomainBrief[];
  riskBriefs?: DomainBrief[];
  deviceBriefs?: DomainBrief[];
  contentBriefs?: DomainBrief[];
};
```

- `output schema`:

```ts
type OperationsCopilotOutput = {
  dashboardDigest: string;
  focusList: FocusItem[];
  opsTaskBoard: TaskBoardSection[];
  humanReviewRequired: boolean;
};
```

- `allowed tools`: `getDashboardMetrics`、`getDispatchBoard`、`getOpenAlerts`、`getDeviceStatusBoard`、`getContentOpsBoard`、`getActivityOpsBoard`
- `forbidden actions`:
  - 直接修改后台任务状态
  - 绕过领域 Agent 自行生成高风险专业结论
  - 自动关闭预警、派单或设备工单
- `human fallback`: 跨域数据缺失、高风险建议需要值班经理确认、聚合超时或部分领域失败时，展示最近一次成功快照并转后台值班经理或模块负责人确认。
- `SLA / timeout`: 后台首页同步摘要 `p95 <= 10s`；定时晨报和交班摘要 `60s` 内生成；硬超时 `60s`。

## 9. SafetyReviewAgent

- `name`: `SafetyReviewAgent`
- `goal`: 作为统一安全复核门禁，检查高风险输出是否越过医学、合规和自动执行边界，并决定是否强制人工确认。
- `trigger`:
  - `HealthManagementAgent` 高风险输出
  - `CareCoordinationAgent` 派单建议
  - `RiskOperationsAgent` 风险处置建议
  - `OperationsCopilotAgent` 高优先级运营建议
- `input schema`:

```ts
type SafetyReviewInput = {
  sourceAgent: string;
  sourceOutput: Record<string, unknown>;
  policySnapshot: PolicyRuleRef[];
  promptTraceRef?: string | null;
  toolTraceRef?: string | null;
  declaredRiskLevel: "low" | "medium" | "high";
};
```

- `output schema`:

```ts
type SafetyReviewOutput = {
  reviewDecision: "approved" | "needs-human-review" | "blocked" | "retry";
  riskFlags: string[];
  humanReviewRequired: boolean;
  blockedAction?: string | null;
  reviewNotes?: string[];
};
```

- `allowed tools`: `policy rules`、`prompt trace`、`tool trace`、`risk rule set`
- `forbidden actions`:
  - 直接替代上游 Agent 重做专业判断
  - 绕过人工审批放行高风险动作
  - 直接修改业务最终状态
- `human fallback`: 命中医学边界或高风险合规规则、上游输出结构不完整但风险高、复核超时或策略冲突时，默认进入人工审批队列、医护复核或运营审批负责人处理。
- `SLA / timeout`: 同步复核 `p95 <= 5s`；异步复核 `15s` 内产出门禁决策；硬超时 `15s`。
