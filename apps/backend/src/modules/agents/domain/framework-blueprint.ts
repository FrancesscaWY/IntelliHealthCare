export type ProductSurface = "user" | "admin" | "shared";
export type CapabilityStatus = "implemented" | "partial" | "planned";
export type CapabilityCategory =
  | "entry"
  | "health"
  | "service"
  | "risk"
  | "operations"
  | "governance";
export type AgentBlueprintRole =
  | "control"
  | "interaction"
  | "domain"
  | "governance";

export interface ProductCapabilityBlueprint {
  key: string;
  surface: ProductSurface;
  category: CapabilityCategory;
  title: string;
  description: string;
  entryMode: "ui" | "api" | "ui+api";
  sourceSignals: string[];
  status: CapabilityStatus;
}

export interface AgentBlueprint {
  key: string;
  name: string;
  role: AgentBlueprintRole;
  surface: ProductSurface;
  status: CapabilityStatus;
  supportsCapabilities: string[];
  roleSummary: string;
  tasks: string[];
  capabilities: string[];
  requiredTools: string[];
  triggerModes: string[];
  outputs: string[];
  collaboratesWith: string[];
}

export interface AgentCardSchemaFieldBlueprint {
  name: string;
  type: string;
  required: boolean;
  description: string;
}

export interface AgentCardTriggerBlueprint {
  modes: string[];
  sources: string[];
}

export interface AgentCardHumanFallbackBlueprint {
  when: string[];
  handoffTo: string[];
  action: string;
}

export interface AgentCardSlaBlueprint {
  serviceLevel: string;
  hardTimeoutMs: number;
  onTimeout: string;
}

export interface AgentCardBlueprint {
  key: string;
  name: string;
  goal: string;
  trigger: AgentCardTriggerBlueprint;
  inputSchema: AgentCardSchemaFieldBlueprint[];
  outputSchema: AgentCardSchemaFieldBlueprint[];
  allowedTools: string[];
  forbiddenActions: string[];
  humanFallback: AgentCardHumanFallbackBlueprint;
  sla: AgentCardSlaBlueprint;
}

export interface AgentWorkflowStep {
  order: number;
  agentKey: string;
  purpose: string;
}

export interface AgentWorkflowBlueprint {
  key: string;
  name: string;
  surface: ProductSurface;
  status: CapabilityStatus;
  trigger: string;
  deliveredCapabilities: string[];
  participatingAgents: string[];
  steps: AgentWorkflowStep[];
  outputChannels: string[];
}

export interface ArchitecturePrincipleBlueprint {
  key: string;
  title: string;
  description: string;
}

export interface GovernanceContextLayerBlueprint {
  name: string;
  description: string;
}

export interface GovernanceRiskTierBlueprint {
  level: "low" | "medium" | "high";
  examples: string[];
  requirements: string[];
}

export interface GovernanceBlueprint {
  contextLayers: GovernanceContextLayerBlueprint[];
  toolBoundaryRules: string[];
  riskTiers: GovernanceRiskTierBlueprint[];
  auditRequirements: string[];
}

export interface HermesRoleMappingBlueprint {
  blueprintRole: string;
  hermesRole: string;
  notes: string;
}

export interface HermesCurrentAlignmentBlueprint {
  current: string;
  target: string;
  action: string;
}

export interface HermesExampleScenarioBlueprint {
  key: string;
  name: string;
  trigger: string;
  executionChain: string[];
  notes: string[];
}

export interface ImplementationPhaseBlueprint {
  phase: string;
  goal: string;
  scope: string[];
}

export const PRODUCT_CAPABILITY_BLUEPRINTS: ProductCapabilityBlueprint[] = [
  {
    key: "unified-assistant-entry",
    surface: "user",
    category: "entry",
    title: "统一康养助手入口",
    description:
      "在 UI 层作为唯一 AI 入口，承接用户问询，并在后端调用健康理解、服务协同、风险提醒等能力。",
    entryMode: "ui+api",
    sourceSignals: [
      "docs/user-web-analysis-and-api.md:589",
      "apps/user-web/src/pages/home/doctor-chat",
      "apps/user-web/src/pages/home/message"
    ],
    status: "planned"
  },
  {
    key: "report-interpretation",
    surface: "user",
    category: "health",
    title: "报告解读与后续建议",
    description:
      "对体检、服务和康复报告做结构化解读，并输出关键结论、注意事项和后续建议。",
    entryMode: "api",
    sourceSignals: [
      "docs/user-web-analysis-and-api.md:593",
      "docs/user-web-analysis-and-api.md:646",
      "apps/user-web/src/pages/healthdocs/report-interpretation"
    ],
    status: "partial"
  },
  {
    key: "service-recommendation",
    surface: "user",
    category: "service",
    title: "服务推荐与预约预填",
    description:
      "根据自然语言需求、档案、地址和服务目录输出可解释推荐，并预填预约信息。",
    entryMode: "api",
    sourceSignals: [
      "docs/user-web-analysis-and-api.md:590",
      "docs/user-web-analysis-and-api.md:631",
      "apps/user-web/src/pages/service"
    ],
    status: "partial"
  },
  {
    key: "health-summary",
    surface: "user",
    category: "health",
    title: "健康摘要与趋势解释",
    description:
      "围绕当前用户或授权查看对象的健康数据、设备、自测、饮食和用药生成近期健康摘要与趋势解释。",
    entryMode: "api",
    sourceSignals: [
      "docs/user-web-analysis-and-api.md:591",
      "docs/user-web-analysis-and-api.md:634",
      "apps/user-web/src/pages/health",
      "apps/user-web/src/pages/diet-record"
    ],
    status: "planned"
  },
  {
    key: "risk-notification",
    surface: "user",
    category: "risk",
    title: "风险提醒与回访建议",
    description:
      "围绕异常指标、报告结论和长期风险标签，生成风险提醒、回访建议和消息触达。",
    entryMode: "api",
    sourceSignals: [
      "docs/user-web-analysis-and-api.md:594",
      "docs/user-web-analysis-and-api.md:653",
      "apps/backend/prisma/seed.ts:1458"
    ],
    status: "planned"
  },
  {
    key: "dispatch-suggestion",
    surface: "admin",
    category: "service",
    title: "后台派单与排班建议",
    description:
      "根据订单、服务类型、人员资质、区域与班次给出候选列表和推荐理由。",
    entryMode: "api",
    sourceSignals: [
      "docs/智诊康养后端开发文档.md:510",
      "apps/admin-web/src/pages/service/order-dispatch/mock.ts",
      "apps/backend/prisma/seed.ts:3116"
    ],
    status: "planned"
  },
  {
    key: "alert-triage",
    surface: "admin",
    category: "risk",
    title: "预警分诊与干预闭环",
    description:
      "对指标异常、报告风险和重点人群进行优先级排序，并给出处理人和 SOP 建议。",
    entryMode: "api",
    sourceSignals: [
      "docs/智诊康养后端开发文档.md:512",
      "apps/admin-web/src/pages/health/alert-center/mock.ts",
      "apps/backend/prisma/seed.ts:1450"
    ],
    status: "planned"
  },
  {
    key: "dashboard-copilot",
    surface: "admin",
    category: "operations",
    title: "后台运营总览 Copilot",
    description:
      "把风险、派单、设备、重点长者、内容和活动运营信号汇总成后台工作台摘要。",
    entryMode: "ui+api",
    sourceSignals: [
      "apps/admin-web/src/pages/dashboard/overview/mock.ts",
      "docs/member-development-manual.md"
    ],
    status: "planned"
  },
  {
    key: "device-diagnosis",
    surface: "admin",
    category: "operations",
    title: "设备异常诊断",
    description:
      "围绕定位设备、穿戴设备和房间传感器的离线、误报和同步问题输出排查建议。",
    entryMode: "api",
    sourceSignals: [
      "apps/admin-web/src/pages/device/device-monitor/mock.ts",
      "apps/admin-web/src/pages/dashboard/overview/mock.ts"
    ],
    status: "planned"
  },
  {
    key: "content-activity-copilot",
    surface: "admin",
    category: "operations",
    title: "内容与活动运营 Copilot",
    description:
      "辅助资讯、讲堂、活动运营做摘要、标签、排期和报名分析。",
    entryMode: "api",
    sourceSignals: [
      "apps/admin-web/src/pages/content/content-management/mock.ts",
      "apps/admin-web/src/pages/community/activity-management/mock.ts"
    ],
    status: "planned"
  }
];

export const AGENT_BLUEPRINTS: AgentBlueprint[] = [
  {
    key: "task-orchestrator-agent",
    name: "TaskOrchestratorAgent",
    role: "control",
    surface: "shared",
    status: "partial",
    supportsCapabilities: [
      "unified-assistant-entry",
      "report-interpretation",
      "service-recommendation",
      "health-summary",
      "risk-notification",
      "dispatch-suggestion",
      "alert-triage",
      "dashboard-copilot",
      "device-diagnosis",
      "content-activity-copilot"
    ],
    roleSummary:
      "统一多智能体框架的控制面，负责识别任务类型、决定协作模式，并把任务交给合适的领域 Agent。",
    tasks: [
      "识别当前任务属于健康理解、服务协同、风险运营、设备运营还是内容运营",
      "决定是单 Agent 直出还是多 Agent 协作",
      "控制任务预算、步数、重试和回写路径"
    ],
    capabilities: ["任务路由", "协作编排", "执行策略控制"],
    requiredTools: ["task metadata", "conversation context", "policy rules"],
    triggerModes: ["sync", "async", "event"],
    outputs: ["execution plan", "target agent list", "workflow route"],
    collaboratesWith: [
      "assistant-conversation-agent",
      "health-management-agent",
      "care-coordination-agent",
      "risk-operations-agent",
      "device-operations-agent",
      "content-activity-ops-agent",
      "operations-copilot-agent",
      "safety-review-agent"
    ]
  },
  {
    key: "assistant-conversation-agent",
    name: "AssistantConversationAgent",
    role: "interaction",
    surface: "user",
    status: "planned",
    supportsCapabilities: ["unified-assistant-entry"],
    roleSummary:
      "作为用户侧唯一 AI 交互门面，承接会话、理解上下文，并把底层领域 Agent 的结果整合成自然语言回复。",
    tasks: [
      "接收用户文本/语音问询",
      "把健康摘要、报告解读、服务推荐和风险提醒整合成统一回复",
      "输出下一步动作建议，如跳转报告页、服务页或医生咨询"
    ],
    capabilities: ["对话管理", "多来源结果整合", "交互式问答"],
    requiredTools: ["conversation history", "response templates", "page registry"],
    triggerModes: ["sync"],
    outputs: ["assistant reply", "follow-up question", "navigation suggestion"],
    collaboratesWith: [
      "task-orchestrator-agent",
      "health-management-agent",
      "care-coordination-agent",
      "risk-operations-agent",
      "safety-review-agent"
    ]
  },
  {
    key: "health-management-agent",
    name: "HealthManagementAgent",
    role: "domain",
    surface: "shared",
    status: "partial",
    supportsCapabilities: [
      "report-interpretation",
      "health-summary"
    ],
    roleSummary:
      "统一负责档案、健康指标、报告、自测、饮食与用药等健康理解任务，是用户端健康智能和后台长者理解的核心领域 Agent。",
    tasks: [
      "生成健康档案摘要和长期风险基线",
      "解读报告和近期健康趋势",
      "为用户侧授权查看场景和后台输出重点长者健康摘要"
    ],
    capabilities: ["档案摘要", "健康趋势解释", "报告解读", "健康摘要"],
    requiredTools: [
      "getHealthArchive",
      "getLatestHealthMetrics",
      "getMetricHistory",
      "getReportContext",
      "getMedicationContext",
      "getDietContext",
      "getSelfTestContext"
    ],
    triggerModes: ["sync", "async", "event"],
    outputs: [
      "health summary",
      "report interpretation",
      "focus elder brief"
    ],
    collaboratesWith: [
      "assistant-conversation-agent",
      "risk-operations-agent",
      "operations-copilot-agent",
      "safety-review-agent"
    ]
  },
  {
    key: "care-coordination-agent",
    name: "CareCoordinationAgent",
    role: "domain",
    surface: "shared",
    status: "partial",
    supportsCapabilities: ["service-recommendation", "dispatch-suggestion"],
    roleSummary:
      "统一负责服务推荐、预约预填、订单供给匹配和后台派单建议，是服务协同领域的核心 Agent。",
    tasks: [
      "根据自然语言需求和档案推荐服务",
      "补全预约信息和订单草案",
      "为后台派单生成候选排序和理由"
    ],
    capabilities: ["服务推荐", "预约预填", "派单评分", "供给匹配"],
    requiredTools: [
      "searchServiceCatalog",
      "getHealthArchive",
      "getLatestHealthMetrics",
      "getAddressBook",
      "getOrderContext",
      "getStaffRoster",
      "getScheduleAvailability",
      "getInstitutionCoverage"
    ],
    triggerModes: ["sync", "async", "event"],
    outputs: [
      "service recommendations",
      "booking prefill",
      "dispatch suggestion",
      "candidate ranking"
    ],
    collaboratesWith: [
      "assistant-conversation-agent",
      "operations-copilot-agent",
      "safety-review-agent"
    ]
  },
  {
    key: "risk-operations-agent",
    name: "RiskOperationsAgent",
    role: "domain",
    surface: "shared",
    status: "planned",
    supportsCapabilities: ["risk-notification", "alert-triage"],
    roleSummary:
      "统一负责风险识别、预警分级、回访建议和后台预警分诊，是健康风险运营闭环的核心 Agent。",
    tasks: [
      "扫描异常指标、报告结论和长期风险标签",
      "输出风险等级、建议动作和回访建议",
      "为后台预警中心生成优先级队列和处理建议"
    ],
    capabilities: ["风险识别", "风险分级", "预警分诊", "回访建议"],
    requiredTools: [
      "getMetricHistory",
      "getHealthArchive",
      "getRecentReports",
      "getOpenAlerts",
      "getStaffRoster",
      "getInterventionPlaybook"
    ],
    triggerModes: ["event", "async", "schedule"],
    outputs: [
      "risk alert",
      "follow-up suggestion",
      "triage queue",
      "intervention draft"
    ],
    collaboratesWith: [
      "assistant-conversation-agent",
      "health-management-agent",
      "operations-copilot-agent",
      "safety-review-agent"
    ]
  },
  {
    key: "device-operations-agent",
    name: "DeviceOperationsAgent",
    role: "domain",
    surface: "admin",
    status: "planned",
    supportsCapabilities: ["device-diagnosis", "dashboard-copilot"],
    roleSummary:
      "负责设备在线率、离线、低电量、误报和同步异常诊断，并为后台提供巡检优先级。",
    tasks: [
      "识别离线和误报设备",
      "输出排查优先级和工单建议",
      "给后台首页提供设备稳定性摘要"
    ],
    capabilities: ["设备诊断", "巡检建议", "设备运营摘要"],
    requiredTools: [
      "getDeviceStatusBoard",
      "getRecentDeviceAlerts",
      "getInstitutionTopology"
    ],
    triggerModes: ["event", "async", "schedule"],
    outputs: ["device diagnosis", "inspection suggestion", "device ops brief"],
    collaboratesWith: ["operations-copilot-agent"]
  },
  {
    key: "content-activity-ops-agent",
    name: "ContentActivityOpsAgent",
    role: "domain",
    surface: "admin",
    status: "planned",
    supportsCapabilities: ["content-activity-copilot", "dashboard-copilot"],
    roleSummary:
      "负责资讯、讲堂和社区活动的摘要、标签、报名分析和运营建议。",
    tasks: [
      "给内容生成摘要和标签",
      "分析活动报名和互动表现",
      "给首页运营位和专题排期提供建议"
    ],
    capabilities: ["内容摘要", "活动分析", "运营建议"],
    requiredTools: [
      "getContentLibrary",
      "getActivityRegistry",
      "getContentInteractionStats"
    ],
    triggerModes: ["async", "schedule"],
    outputs: ["content brief", "campaign suggestion", "activity ops brief"],
    collaboratesWith: ["operations-copilot-agent"]
  },
  {
    key: "operations-copilot-agent",
    name: "OperationsCopilotAgent",
    role: "interaction",
    surface: "admin",
    status: "planned",
    supportsCapabilities: ["dashboard-copilot"],
    roleSummary:
      "作为后台工作台的统一智能聚合层，把健康、服务、风险、设备、内容等多个领域 Agent 的结果整合成可执行运营摘要。",
    tasks: [
      "汇总今日重点、重点长者和待处理任务",
      "生成后台首页摘要和优先级看板",
      "在长者、派单、预警、设备和内容模块之间建立统一运营视角"
    ],
    capabilities: ["跨域摘要", "重点任务聚合", "运营看板生成"],
    requiredTools: [
      "getDashboardMetrics",
      "getDispatchBoard",
      "getOpenAlerts",
      "getDeviceStatusBoard",
      "getContentOpsBoard",
      "getActivityOpsBoard"
    ],
    triggerModes: ["sync", "async", "schedule"],
    outputs: ["dashboard digest", "focus list", "ops task board"],
    collaboratesWith: [
      "health-management-agent",
      "care-coordination-agent",
      "risk-operations-agent",
      "device-operations-agent",
      "content-activity-ops-agent",
      "safety-review-agent"
    ]
  },
  {
    key: "safety-review-agent",
    name: "SafetyReviewAgent",
    role: "governance",
    surface: "shared",
    status: "planned",
    supportsCapabilities: [
      "report-interpretation",
      "health-summary",
      "risk-notification",
      "dispatch-suggestion",
      "alert-triage",
      "dashboard-copilot"
    ],
    roleSummary:
      "负责医疗边界、自动执行风险和高风险运营建议复核，决定是否强制人工确认。",
    tasks: [
      "识别需要人工确认的结论",
      "阻断越权医学建议或直接业务状态修改",
      "为高风险输出打上人工复核标记"
    ],
    capabilities: ["风险边界检查", "合规复核", "人工兜底判定"],
    requiredTools: ["policy rules", "prompt trace", "tool trace"],
    triggerModes: ["sync", "async"],
    outputs: ["review decision", "human-review requirement", "blocked action"],
    collaboratesWith: [
      "task-orchestrator-agent",
      "assistant-conversation-agent",
      "health-management-agent",
      "care-coordination-agent",
      "risk-operations-agent",
      "operations-copilot-agent"
    ]
  }
];

export const AGENT_CARD_BLUEPRINTS: AgentCardBlueprint[] = [
  {
    key: "task-orchestrator-agent",
    name: "TaskOrchestratorAgent",
    goal:
      "把来自用户端、后台端和事件流的任务标准化，并决定由哪个领域 Agent 执行、是否需要协作以及是否进入人工复核。",
    trigger: {
      modes: ["sync", "async", "event"],
      sources: [
        "统一康养助手请求",
        "内部 API 创建 AgentTask",
        "报告上传、指标异常、后台页面刷新等系统事件",
        "失败重试或补偿任务"
      ]
    },
    inputSchema: [
      {
        name: "taskId",
        type: "string",
        required: true,
        description: "统一任务标识，用于审计、回放、重试和状态回写。"
      },
      {
        name: "taskType",
        type: "string",
        required: true,
        description:
          "任务类型，例如 report-interpretation、service-recommendation、alert-triage。"
      },
      {
        name: "triggerSource",
        type: "string",
        required: true,
        description: "触发来源，例如 assistant、internal-api、event、schedule。"
      },
      {
        name: "ownerId",
        type: "string",
        required: false,
        description: "任务所属用户、机构或运营对象标识。"
      },
      {
        name: "conversationContext",
        type: "ConversationContext",
        required: false,
        description: "会话摘要、上一轮提问和澄清结果。"
      },
      {
        name: "taskContext",
        type: "TaskContext",
        required: false,
        description: "当前报告、订单、预警、设备或活动的关键实体上下文。"
      },
      {
        name: "policySnapshot",
        type: "PolicyRuleRef[]",
        required: false,
        description: "当前权限、预算、规则和禁行动作快照。"
      }
    ],
    outputSchema: [
      {
        name: "executionPlan",
        type: "ExecutionPlan",
        required: true,
        description: "执行模式、预算、步数、重试和回写策略。"
      },
      {
        name: "targetAgentList",
        type: "string[]",
        required: true,
        description: "本次应调用的领域 Agent 列表。"
      },
      {
        name: "workflowRoute",
        type: "string",
        required: true,
        description: "单 Agent、串行协作或事件驱动路线。"
      },
      {
        name: "requiredContext",
        type: "string[]",
        required: false,
        description: "执行前仍需补齐的上下文字段。"
      },
      {
        name: "humanReviewHint",
        type: "string | null",
        required: false,
        description: "需要人工确认时的提示原因。"
      }
    ],
    allowedTools: [
      "task metadata",
      "conversation context",
      "policy rules",
      "agent registry"
    ],
    forbiddenActions: [
      "直接产出医学、派单或运营最终结论",
      "绕过业务模块直接写数据库",
      "未经规则校验直接自动执行高风险动作",
      "擅自创建未注册 Agent"
    ],
    humanFallback: {
      when: [
        "无法稳定判断任务归属域",
        "输入上下文缺失且无法自动补齐",
        "策略冲突或多条执行路线风险不可接受",
        "路由超时或重试后仍失败"
      ],
      handoffTo: ["人工分诊台", "后台运营工单池"],
      action: "记录路由失败原因，转人工分诊或确定性规则链路继续处理。"
    },
    sla: {
      serviceLevel:
        "sync 路由请求 p95 <= 3s；异步或事件任务入队后 30s 内完成首轮路由决策。",
      hardTimeoutMs: 10000,
      onTimeout: "停止编排，写回失败原因，并转人工分诊或规则兜底。"
    }
  },
  {
    key: "assistant-conversation-agent",
    name: "AssistantConversationAgent",
    goal:
      "作为用户侧统一康养助手的单一会话门面，承接问答、整理上下文并把下游 Agent 结果整合成自然语言回复。",
    trigger: {
      modes: ["sync"],
      sources: [
        "用户侧统一康养助手输入",
        "消息中心 AI 对话回流",
        "需要跟进追问或补充澄清的会话轮次"
      ]
    },
    inputSchema: [
      {
        name: "sessionId",
        type: "string",
        required: true,
        description: "会话标识。"
      },
      {
        name: "userMessage",
        type: "string",
        required: true,
        description: "用户当前轮输入。"
      },
      {
        name: "conversationHistory",
        type: "ConversationTurn[]",
        required: false,
        description: "最近几轮会话上下文。"
      },
      {
        name: "resolvedIntent",
        type: "ExecutionPlan | null",
        required: false,
        description: "来自 TaskOrchestratorAgent 的路由与执行结果。"
      },
      {
        name: "pageContext",
        type: "PageContext",
        required: false,
        description: "当前页面、可跳转页面和 UI 能力约束。"
      }
    ],
    outputSchema: [
      {
        name: "assistantReply",
        type: "string",
        required: true,
        description: "返回给用户的自然语言回复。"
      },
      {
        name: "followUpQuestion",
        type: "string | null",
        required: false,
        description: "需要进一步澄清时的补充提问。"
      },
      {
        name: "navigationSuggestion",
        type: "NavigationSuggestion | null",
        required: false,
        description: "建议跳转的报告页、服务页或消息页。"
      },
      {
        name: "pendingTaskHint",
        type: "string | null",
        required: false,
        description: "异步处理中时返回的提示。"
      }
    ],
    allowedTools: [
      "conversation history",
      "response templates",
      "page registry",
      "TaskOrchestratorAgent output"
    ],
    forbiddenActions: [
      "绕过控制层直接调用高风险领域 Agent",
      "伪造专业结论覆盖下游 Agent 输出",
      "未经授权暴露用户私有健康数据",
      "直接创建订单、派单或预警"
    ],
    humanFallback: {
      when: [
        "用户明确要求人工服务",
        "意图长期无法澄清",
        "SafetyReviewAgent 阻断当前输出",
        "会话超时或生成失败"
      ],
      handoffTo: ["人工客服", "医生咨询入口", "人工服务预约入口"],
      action: "返回安全兜底话术，并引导转接人工服务或稍后查看异步结果。"
    },
    sla: {
      serviceLevel:
        "用户会话首轮回复 p95 <= 8s；复杂任务可先返回处理中提示并异步回补。",
      hardTimeoutMs: 12000,
      onTimeout: "返回安全兜底回复，不等待高成本长链路继续阻塞前端。"
    }
  },
  {
    key: "health-management-agent",
    name: "HealthManagementAgent",
    goal:
      "统一承担档案摘要、报告解读、健康趋势解释和重点长者健康简报，形成可复用的健康理解主域输出。",
    trigger: {
      modes: ["sync", "async", "event"],
      sources: [
        "用户查看报告",
        "报告上传",
        "用户查看健康摘要",
        "后台查看重点长者",
        "风险任务补充健康背景"
      ]
    },
    inputSchema: [
      {
        name: "userId",
        type: "string",
        required: false,
        description: "用户标识。"
      },
      {
        name: "archiveId",
        type: "string",
        required: false,
        description: "健康档案标识。"
      },
      {
        name: "reportId",
        type: "string",
        required: false,
        description: "需要解读的报告标识。"
      },
      {
        name: "viewMode",
        type: "\"report-interpretation\" | \"health-summary\" | \"focus-elder-brief\"",
        required: true,
        description: "本次健康理解任务模式。"
      },
      {
        name: "authorizedScope",
        type: "string[]",
        required: true,
        description: "当前请求已通过权限校验后允许读取的数据范围。"
      },
      {
        name: "metricTypes",
        type: "string[]",
        required: false,
        description: "需要重点解释的指标类型。"
      }
    ],
    outputSchema: [
      {
        name: "healthSummary",
        type: "string",
        required: true,
        description: "用户或后台可读的健康摘要。"
      },
      {
        name: "keyFindings",
        type: "string[]",
        required: true,
        description: "关键发现与异常点。"
      },
      {
        name: "riskSignals",
        type: "string[]",
        required: false,
        description: "需要后续关注的风险信号。"
      },
      {
        name: "followUpSuggestions",
        type: "string[]",
        required: false,
        description: "后续观察、复查或沟通建议。"
      },
      {
        name: "uncertainties",
        type: "string[]",
        required: false,
        description: "证据不足或需要人工确认的不确定项。"
      },
      {
        name: "humanReviewRequired",
        type: "boolean",
        required: true,
        description: "是否需要进入人工复核。"
      }
    ],
    allowedTools: [
      "getHealthArchive",
      "getLatestHealthMetrics",
      "getMetricHistory",
      "getReportContext",
      "getMedicationContext",
      "getDietContext",
      "getSelfTestContext"
    ],
    forbiddenActions: [
      "直接给出医学诊断结论",
      "自动修改健康档案状态",
      "直接触发高风险处置动作",
      "绕过权限校验读取私有数据"
    ],
    humanFallback: {
      when: [
        "报告内容冲突或缺少关键页",
        "输出涉及高风险医学解释",
        "需要医生或健康管理师确认",
        "任务超时或结构化输出校验失败"
      ],
      handoffTo: ["健康管理师", "医生复核队列"],
      action: "保留可审计的中间摘要，转人工复核后再面向用户或后台展示。"
    },
    sla: {
      serviceLevel:
        "报告解读与健康摘要同步请求 p95 <= 8s；异步批处理单任务 30s 内完成。",
      hardTimeoutMs: 30000,
      onTimeout: "写回可用中间结果并要求人工复核，不继续阻塞调用链。"
    }
  },
  {
    key: "care-coordination-agent",
    name: "CareCoordinationAgent",
    goal:
      "统一承担服务推荐、预约预填、订单供需匹配和后台派单候选排序，形成服务协同主域输出。",
    trigger: {
      modes: ["sync", "async", "event"],
      sources: [
        "用户咨询或搜索服务",
        "用户预约前补全信息",
        "后台请求派单建议",
        "订单履约前的资源匹配任务"
      ]
    },
    inputSchema: [
      {
        name: "requestMode",
        type: "\"service-recommendation\" | \"booking-prefill\" | \"dispatch-suggestion\"",
        required: true,
        description: "服务协同任务模式。"
      },
      {
        name: "userId",
        type: "string",
        required: false,
        description: "用户标识。"
      },
      {
        name: "orderId",
        type: "string",
        required: false,
        description: "订单或工单标识。"
      },
      {
        name: "serviceRequest",
        type: "string",
        required: false,
        description: "用户自然语言需求或运营输入。"
      },
      {
        name: "resourceConstraints",
        type: "ResourceConstraint[]",
        required: false,
        description: "地域、时段、资质、机构覆盖等约束。"
      },
      {
        name: "healthContextRef",
        type: "string | null",
        required: false,
        description: "与服务适配相关的健康摘要引用。"
      }
    ],
    outputSchema: [
      {
        name: "recommendedServices",
        type: "RecommendationItem[]",
        required: false,
        description: "候选服务及推荐理由。"
      },
      {
        name: "bookingPrefill",
        type: "BookingDraft | null",
        required: false,
        description: "预约预填结果。"
      },
      {
        name: "dispatchCandidates",
        type: "DispatchCandidate[]",
        required: false,
        description: "候选机构、人员和时间段排序。"
      },
      {
        name: "rankingReasons",
        type: "string[]",
        required: false,
        description: "推荐或排序解释。"
      },
      {
        name: "missingInfo",
        type: "string[]",
        required: false,
        description: "仍需补齐的信息。"
      },
      {
        name: "humanReviewRequired",
        type: "boolean",
        required: true,
        description: "是否需要人工确认。"
      }
    ],
    allowedTools: [
      "searchServiceCatalog",
      "getHealthArchive",
      "getLatestHealthMetrics",
      "getAddressBook",
      "getOrderContext",
      "getStaffRoster",
      "getScheduleAvailability",
      "getInstitutionCoverage"
    ],
    forbiddenActions: [
      "直接创建订单或修改价格",
      "在第一版中自动派单",
      "绕过运营规则写入履约结果",
      "代替临床结论决定服务边界"
    ],
    humanFallback: {
      when: [
        "资源冲突无法自动排序",
        "派单建议命中高风险规则",
        "价格、资质或服务范围存在争议",
        "输出超时或证据不足"
      ],
      handoffTo: ["客服坐席", "调度员", "机构运营人员"],
      action: "退回到人工推荐或人工派单流程，并附上已计算的候选与冲突说明。"
    },
    sla: {
      serviceLevel:
        "用户侧服务推荐 p95 <= 8s；后台派单建议单任务 15s 内给出候选列表。",
      hardTimeoutMs: 30000,
      onTimeout: "回退为基础服务列表或人工派单队列，不自动推进履约。"
    }
  },
  {
    key: "risk-operations-agent",
    name: "RiskOperationsAgent",
    goal:
      "统一承担风险识别、风险分级、预警分诊和回访建议，形成从异常信号到人工干预的风险运营闭环。",
    trigger: {
      modes: ["event", "async", "schedule"],
      sources: [
        "指标异常",
        "报告结论异常",
        "夜间批处理巡检",
        "后台预警中心刷新",
        "用户侧风险提醒请求"
      ]
    },
    inputSchema: [
      {
        name: "eventId",
        type: "string",
        required: false,
        description: "触发风险任务的事件标识。"
      },
      {
        name: "userId",
        type: "string",
        required: false,
        description: "用户标识。"
      },
      {
        name: "metricHistoryWindow",
        type: "MetricRecord[]",
        required: false,
        description: "近期指标窗口。"
      },
      {
        name: "reportSummaryRef",
        type: "string | null",
        required: false,
        description: "相关报告摘要引用。"
      },
      {
        name: "openAlerts",
        type: "AlertContext[]",
        required: false,
        description: "当前尚未闭环的预警。"
      },
      {
        name: "interventionPlaybookVersion",
        type: "string",
        required: false,
        description: "使用的干预 SOP 版本。"
      }
    ],
    outputSchema: [
      {
        name: "riskLevel",
        type: "\"low\" | \"medium\" | \"high\"",
        required: true,
        description: "风险等级。"
      },
      {
        name: "riskSignals",
        type: "string[]",
        required: true,
        description: "命中的风险信号。"
      },
      {
        name: "evidence",
        type: "EvidenceItem[]",
        required: true,
        description: "支持风险判断的证据链。"
      },
      {
        name: "recommendedActions",
        type: "string[]",
        required: true,
        description: "建议的后续动作。"
      },
      {
        name: "triageQueueHint",
        type: "string | null",
        required: false,
        description: "预警中心分诊和优先级提示。"
      },
      {
        name: "humanEscalationRequired",
        type: "boolean",
        required: true,
        description: "是否必须人工介入。"
      }
    ],
    allowedTools: [
      "getMetricHistory",
      "getHealthArchive",
      "getRecentReports",
      "getOpenAlerts",
      "getStaffRoster",
      "getInterventionPlaybook"
    ],
    forbiddenActions: [
      "直接给出医疗诊断或急救决策",
      "未经人工确认直接触发高风险外呼或派单",
      "直接修改最终处置状态",
      "隐去证据链只输出结论"
    ],
    humanFallback: {
      when: [
        "风险等级为高",
        "建议动作涉及外呼、上门或紧急干预",
        "证据冲突或模型置信度不足",
        "超时或复核失败"
      ],
      handoffTo: ["预警中心人工分诊", "医护值班", "健康管理运营值班"],
      action: "转人工预警队列，保留证据链和候选动作，不允许自动执行高风险操作。"
    },
    sla: {
      serviceLevel:
        "事件驱动预警任务 30s 内完成单事件判断；批量巡检任务 120s 内完成单批次。",
      hardTimeoutMs: 120000,
      onTimeout: "标记为待人工分诊，不触发任何自动高风险动作。"
    }
  },
  {
    key: "device-operations-agent",
    name: "DeviceOperationsAgent",
    goal:
      "围绕设备离线、低电量、误报和同步异常输出诊断、巡检优先级和处理建议，服务后台设备运营。",
    trigger: {
      modes: ["event", "async", "schedule"],
      sources: [
        "设备离线告警",
        "低电量告警",
        "同步异常事件",
        "后台设备监控页刷新",
        "定时巡检任务"
      ]
    },
    inputSchema: [
      {
        name: "deviceId",
        type: "string",
        required: false,
        description: "设备标识。"
      },
      {
        name: "institutionId",
        type: "string",
        required: false,
        description: "设备所属机构。"
      },
      {
        name: "alertSnapshot",
        type: "DeviceAlert[]",
        required: false,
        description: "近期设备告警。"
      },
      {
        name: "statusBoardRef",
        type: "string",
        required: false,
        description: "设备状态看板快照引用。"
      },
      {
        name: "topologyScope",
        type: "TopologyScope | null",
        required: false,
        description: "设备所属机构、楼层、房间或区域拓扑。"
      }
    ],
    outputSchema: [
      {
        name: "deviceDiagnosis",
        type: "string",
        required: true,
        description: "异常原因判断。"
      },
      {
        name: "inspectionPriority",
        type: "\"low\" | \"medium\" | \"high\"",
        required: true,
        description: "巡检优先级。"
      },
      {
        name: "suggestedActions",
        type: "string[]",
        required: true,
        description: "建议排查动作。"
      },
      {
        name: "suggestedWorkOrder",
        type: "WorkOrderDraft | null",
        required: false,
        description: "建议创建的巡检或维修工单草案。"
      }
    ],
    allowedTools: [
      "getDeviceStatusBoard",
      "getRecentDeviceAlerts",
      "getInstitutionTopology"
    ],
    forbiddenActions: [
      "直接下发设备控制命令",
      "自动关闭真实告警",
      "绕过设备运维流程创建最终维修结果"
    ],
    humanFallback: {
      when: [
        "诊断需要现场确认",
        "同一机构出现批量异常",
        "建议动作会影响在线监测可用性",
        "超时或无法定位问题范围"
      ],
      handoffTo: ["设备运维人员", "机构设备管理员"],
      action: "生成巡检建议和问题清单，转人工巡检或电话排查。"
    },
    sla: {
      serviceLevel: "单设备异常诊断 20s 内完成；巡检批处理 60s 内完成单批次。",
      hardTimeoutMs: 60000,
      onTimeout: "保留已有告警，不自动消警，并转人工巡检。"
    }
  },
  {
    key: "content-activity-ops-agent",
    name: "ContentActivityOpsAgent",
    goal:
      "围绕资讯、讲堂和社区活动输出摘要、标签、互动分析和运营建议，支撑后台内容与活动运营。",
    trigger: {
      modes: ["async", "schedule"],
      sources: [
        "内容上新或编辑后分析",
        "活动报名与互动数据刷新",
        "后台内容运营请求",
        "定时运营复盘任务"
      ]
    },
    inputSchema: [
      {
        name: "contentId",
        type: "string",
        required: false,
        description: "内容标识。"
      },
      {
        name: "activityId",
        type: "string",
        required: false,
        description: "活动标识。"
      },
      {
        name: "analysisMode",
        type: "\"content-summary\" | \"activity-analysis\" | \"campaign-suggestion\"",
        required: true,
        description: "运营分析模式。"
      },
      {
        name: "interactionStatsRef",
        type: "string | null",
        required: false,
        description: "互动统计快照引用。"
      },
      {
        name: "scheduleWindow",
        type: "string | null",
        required: false,
        description: "排期建议覆盖的时间窗口。"
      }
    ],
    outputSchema: [
      {
        name: "contentBrief",
        type: "string",
        required: false,
        description: "内容摘要。"
      },
      {
        name: "tags",
        type: "string[]",
        required: false,
        description: "推荐标签。"
      },
      {
        name: "activityAnalysis",
        type: "string | null",
        required: false,
        description: "活动表现分析。"
      },
      {
        name: "campaignSuggestion",
        type: "string[]",
        required: false,
        description: "专题、排期和运营建议。"
      }
    ],
    allowedTools: [
      "getContentLibrary",
      "getActivityRegistry",
      "getContentInteractionStats"
    ],
    forbiddenActions: [
      "直接发布内容或活动",
      "直接修改正式运营排期",
      "绕过人工审核写入外部触达计划"
    ],
    humanFallback: {
      when: [
        "内容标签涉及敏感主题",
        "活动建议影响实际排期和预算",
        "样本不足导致分析不稳定",
        "超时或统计快照缺失"
      ],
      handoffTo: ["内容运营", "社区活动运营"],
      action: "仅保留摘要和候选建议，交由运营人工审核后执行。"
    },
    sla: {
      serviceLevel: "单次内容或活动分析 20s 内完成；定时运营摘要 60s 内完成单批次。",
      hardTimeoutMs: 60000,
      onTimeout: "回退为基础统计视图，不自动生成发布建议。"
    }
  },
  {
    key: "operations-copilot-agent",
    name: "OperationsCopilotAgent",
    goal:
      "把健康、服务、风险、设备、内容等多个领域 Agent 的结果整合成后台工作台可执行摘要和优先级看板。",
    trigger: {
      modes: ["sync", "async", "schedule"],
      sources: [
        "后台首页打开",
        "值班摘要请求",
        "运营晨报定时生成",
        "后台工作台刷新"
      ]
    },
    inputSchema: [
      {
        name: "dashboardScope",
        type: "string",
        required: true,
        description: "后台首页、长者工作台或专题工作台范围。"
      },
      {
        name: "healthBriefs",
        type: "DomainBrief[]",
        required: false,
        description: "来自 HealthManagementAgent 的摘要。"
      },
      {
        name: "careBriefs",
        type: "DomainBrief[]",
        required: false,
        description: "来自 CareCoordinationAgent 的摘要。"
      },
      {
        name: "riskBriefs",
        type: "DomainBrief[]",
        required: false,
        description: "来自 RiskOperationsAgent 的摘要。"
      },
      {
        name: "deviceBriefs",
        type: "DomainBrief[]",
        required: false,
        description: "来自 DeviceOperationsAgent 的摘要。"
      },
      {
        name: "contentBriefs",
        type: "DomainBrief[]",
        required: false,
        description: "来自 ContentActivityOpsAgent 的摘要。"
      }
    ],
    outputSchema: [
      {
        name: "dashboardDigest",
        type: "string",
        required: true,
        description: "后台首页摘要。"
      },
      {
        name: "focusList",
        type: "FocusItem[]",
        required: true,
        description: "今日重点对象和事项。"
      },
      {
        name: "opsTaskBoard",
        type: "TaskBoardSection[]",
        required: true,
        description: "按优先级组织的任务看板。"
      },
      {
        name: "humanReviewRequired",
        type: "boolean",
        required: true,
        description: "是否需要人工核定高风险建议。"
      }
    ],
    allowedTools: [
      "getDashboardMetrics",
      "getDispatchBoard",
      "getOpenAlerts",
      "getDeviceStatusBoard",
      "getContentOpsBoard",
      "getActivityOpsBoard"
    ],
    forbiddenActions: [
      "直接修改后台任务状态",
      "绕过领域 Agent 自行生成高风险专业结论",
      "自动关闭预警、派单或设备工单"
    ],
    humanFallback: {
      when: [
        "跨域数据缺失导致摘要不完整",
        "看板中存在高风险建议",
        "需要值班经理确认今日优先级",
        "聚合超时或部分域结果失败"
      ],
      handoffTo: ["后台值班经理", "模块运营负责人"],
      action: "展示最近一次成功快照和失败域说明，交由值班人员手动确认。"
    },
    sla: {
      serviceLevel: "后台首页同步摘要 p95 <= 10s；定时晨报和交班摘要 60s 内生成。",
      hardTimeoutMs: 60000,
      onTimeout: "回退为最近一次成功快照，并标记待人工确认。"
    }
  },
  {
    key: "safety-review-agent",
    name: "SafetyReviewAgent",
    goal:
      "作为统一安全复核门禁，检查高风险输出是否越过医学、合规和自动执行边界，并决定是否强制人工确认。",
    trigger: {
      modes: ["sync", "async"],
      sources: [
        "HealthManagementAgent 高风险输出",
        "CareCoordinationAgent 派单建议",
        "RiskOperationsAgent 风险处置建议",
        "OperationsCopilotAgent 高优先级运营建议"
      ]
    },
    inputSchema: [
      {
        name: "sourceAgent",
        type: "string",
        required: true,
        description: "上游 Agent 名称。"
      },
      {
        name: "sourceOutput",
        type: "Record<string, unknown>",
        required: true,
        description: "待复核的结构化输出。"
      },
      {
        name: "policySnapshot",
        type: "PolicyRuleRef[]",
        required: true,
        description: "当前合规规则、自动执行边界和人工审批要求。"
      },
      {
        name: "promptTraceRef",
        type: "string | null",
        required: false,
        description: "Prompt 版本和执行轨迹引用。"
      },
      {
        name: "toolTraceRef",
        type: "string | null",
        required: false,
        description: "工具调用轨迹引用。"
      },
      {
        name: "declaredRiskLevel",
        type: "\"low\" | \"medium\" | \"high\"",
        required: true,
        description: "上游声明的风险等级。"
      }
    ],
    outputSchema: [
      {
        name: "reviewDecision",
        type: "\"approved\" | \"needs-human-review\" | \"blocked\" | \"retry\"",
        required: true,
        description: "复核决定。"
      },
      {
        name: "riskFlags",
        type: "string[]",
        required: true,
        description: "命中的风险标签。"
      },
      {
        name: "humanReviewRequired",
        type: "boolean",
        required: true,
        description: "是否必须人工确认。"
      },
      {
        name: "blockedAction",
        type: "string | null",
        required: false,
        description: "被阻断的动作。"
      },
      {
        name: "reviewNotes",
        type: "string[]",
        required: false,
        description: "退回重跑或转人工的原因。"
      }
    ],
    allowedTools: ["policy rules", "prompt trace", "tool trace", "risk rule set"],
    forbiddenActions: [
      "直接替代上游 Agent 重做专业判断",
      "绕过人工审批放行高风险动作",
      "直接修改业务最终状态"
    ],
    humanFallback: {
      when: [
        "命中医学边界或高风险合规规则",
        "上游输出结构不完整但风险较高",
        "复核本身超时或证据不足",
        "策略规则冲突无法自动决策"
      ],
      handoffTo: ["人工审批队列", "医护复核", "运营审批负责人"],
      action: "默认阻断自动执行，仅保留审计记录并转人工审批。"
    },
    sla: {
      serviceLevel: "同步复核 p95 <= 5s；异步复核 15s 内产出门禁决策。",
      hardTimeoutMs: 15000,
      onTimeout: "默认转人工复核，不放行任何高风险自动动作。"
    }
  }
];

export const AGENT_WORKFLOW_BLUEPRINTS: AgentWorkflowBlueprint[] = [
  {
    key: "unified-user-assistant-workflow",
    name: "用户统一康养助手工作流",
    surface: "user",
    status: "planned",
    trigger: "用户从统一康养助手 UI 发起文字或语音问询",
    deliveredCapabilities: [
      "unified-assistant-entry",
      "report-interpretation",
      "service-recommendation",
      "health-summary",
      "risk-notification"
    ],
    participatingAgents: [
      "assistant-conversation-agent",
      "task-orchestrator-agent",
      "health-management-agent",
      "care-coordination-agent",
      "risk-operations-agent",
      "safety-review-agent"
    ],
    steps: [
      {
        order: 1,
        agentKey: "assistant-conversation-agent",
        purpose: "承接统一对话入口，并整理本轮会话上下文"
      },
      {
        order: 2,
        agentKey: "task-orchestrator-agent",
        purpose: "判断当前问题需要健康理解、服务协同、风险运营中的哪些领域能力"
      },
      {
        order: 3,
        agentKey: "health-management-agent",
        purpose: "当问题涉及报告、档案、健康趋势和健康摘要时输出健康结论"
      },
      {
        order: 4,
        agentKey: "care-coordination-agent",
        purpose: "当问题涉及服务选择、预约和订单供给匹配时输出推荐与预填信息"
      },
      {
        order: 5,
        agentKey: "risk-operations-agent",
        purpose: "当问题涉及风险提醒或是否需要回访时输出风险判断"
      },
      {
        order: 6,
        agentKey: "safety-review-agent",
        purpose: "对高风险医疗或运营建议进行合规复核"
      },
      {
        order: 7,
        agentKey: "assistant-conversation-agent",
        purpose: "把结果整合成统一回复，保证 UI 层仍是一个助手"
      }
    ],
    outputChannels: ["用户侧助手 UI", "消息回复", "跳转建议", "后续跟进问题"]
  },
  {
    key: "health-intelligence-workflow",
    name: "健康理解工作流",
    surface: "shared",
    status: "partial",
    trigger: "报告上传、查看报告、查看健康摘要或后台查看重点长者时触发",
    deliveredCapabilities: ["report-interpretation", "health-summary"],
    participatingAgents: [
      "task-orchestrator-agent",
      "health-management-agent",
      "risk-operations-agent",
      "safety-review-agent"
    ],
    steps: [
      {
        order: 1,
        agentKey: "task-orchestrator-agent",
        purpose: "决定当前是直出报告解读，还是需要联合风险运营一起处理"
      },
      {
        order: 2,
        agentKey: "health-management-agent",
        purpose: "输出报告解读、趋势解释、健康摘要或重点长者摘要"
      },
      {
        order: 3,
        agentKey: "risk-operations-agent",
        purpose: "当出现异常指标或高风险标签时补充风险等级和回访建议"
      },
      {
        order: 4,
        agentKey: "safety-review-agent",
        purpose: "对高风险结论要求人工确认"
      }
    ],
    outputChannels: ["报告详情页", "健康摘要 API", "后台长者摘要"]
  },
  {
    key: "care-coordination-workflow",
    name: "服务协同工作流",
    surface: "shared",
    status: "partial",
    trigger: "用户请求推荐服务、预约预填，或后台发起派单建议时触发",
    deliveredCapabilities: ["service-recommendation", "dispatch-suggestion"],
    participatingAgents: [
      "task-orchestrator-agent",
      "care-coordination-agent",
      "safety-review-agent"
    ],
    steps: [
      {
        order: 1,
        agentKey: "task-orchestrator-agent",
        purpose: "识别当前是用户侧推荐还是后台侧派单建议"
      },
      {
        order: 2,
        agentKey: "care-coordination-agent",
        purpose: "统一输出推荐服务、预约预填或派单候选排序"
      },
      {
        order: 3,
        agentKey: "safety-review-agent",
        purpose: "对高风险派单建议或越权自动执行进行拦截"
      }
    ],
    outputChannels: ["服务推荐 API", "预约预填 API", "后台派单建议"]
  },
  {
    key: "risk-operations-workflow",
    name: "风险运营工作流",
    surface: "shared",
    status: "planned",
    trigger: "指标异常、报告结论异常、夜间批处理或后台预警中心刷新时触发",
    deliveredCapabilities: ["risk-notification", "alert-triage"],
    participatingAgents: [
      "task-orchestrator-agent",
      "risk-operations-agent",
      "health-management-agent",
      "safety-review-agent"
    ],
    steps: [
      {
        order: 1,
        agentKey: "risk-operations-agent",
        purpose: "识别风险事件、计算风险等级并生成回访建议"
      },
      {
        order: 2,
        agentKey: "health-management-agent",
        purpose: "补充档案、报告和长期健康背景"
      },
      {
        order: 3,
        agentKey: "safety-review-agent",
        purpose: "对高风险医疗建议或自动推送进行审核"
      }
    ],
    outputChannels: ["用户风险提醒 API", "后台预警中心", "家属通知"]
  },
  {
    key: "admin-operations-copilot-workflow",
    name: "后台运营 Copilot 工作流",
    surface: "admin",
    status: "planned",
    trigger: "后台首页打开、定时生成晨报或运营人员进入工作台时触发",
    deliveredCapabilities: [
      "dashboard-copilot",
      "device-diagnosis",
      "content-activity-copilot"
    ],
    participatingAgents: [
      "operations-copilot-agent",
      "health-management-agent",
      "care-coordination-agent",
      "risk-operations-agent",
      "device-operations-agent",
      "content-activity-ops-agent",
      "safety-review-agent"
    ],
    steps: [
      {
        order: 1,
        agentKey: "health-management-agent",
        purpose: "输出重点长者和需要关注的健康摘要"
      },
      {
        order: 2,
        agentKey: "care-coordination-agent",
        purpose: "输出待派单、服务中和待回访的服务协同摘要"
      },
      {
        order: 3,
        agentKey: "risk-operations-agent",
        purpose: "输出预警优先级和干预闭环建议"
      },
      {
        order: 4,
        agentKey: "device-operations-agent",
        purpose: "输出设备异常与巡检重点"
      },
      {
        order: 5,
        agentKey: "content-activity-ops-agent",
        purpose: "输出内容和活动运营建议"
      },
      {
        order: 6,
        agentKey: "operations-copilot-agent",
        purpose: "把所有领域结果汇总成后台首页可执行摘要"
      },
      {
        order: 7,
        agentKey: "safety-review-agent",
        purpose: "对高风险建议打标人工处理"
      }
    ],
    outputChannels: ["后台首页", "长者管理页", "派单页", "预警中心", "设备监控页", "运营晨报"]
  }
];

export const ARCHITECTURE_PRINCIPLES: ArchitecturePrincipleBlueprint[] = [
  {
    key: "domain-first",
    title: "领域优先",
    description:
      "Agent 按稳定业务领域定义，不按页面、按钮或单个 API 路由碎片化拆分。"
  },
  {
    key: "controlled-collaboration",
    title: "受控协作优先",
    description:
      "优先采用 Router、Specialist、Reviewer 这类受控协作模式，而不是无限轮开放自治。"
  },
  {
    key: "structured-contract",
    title: "结构化契约优先",
    description:
      "所有 Agent 都必须具备明确的输入输出 Schema、允许工具集合、风险等级和预算约束。"
  },
  {
    key: "least-privilege-context",
    title: "最小权限上下文",
    description:
      "Agent 只能读取完成任务所必需的最小上下文，用户私有数据和机构资源都必须经过权限校验。"
  },
  {
    key: "governance-built-in",
    title: "治理内建",
    description:
      "Prompt、模型、工具调用、输出风险和人工确认状态都必须进入可追踪审计链路。"
  },
  {
    key: "advice-execution-separation",
    title: "建议与执行分离",
    description:
      "Agent 负责摘要、解释、推荐、排序和复核；高风险业务状态变更由确定性服务或人工流程执行。"
  }
];

export const GOVERNANCE_BLUEPRINT: GovernanceBlueprint = {
  contextLayers: [
    {
      name: "公共知识",
      description: "健康科普、平台规则、服务制度等公共上下文。"
    },
    {
      name: "机构知识",
      description: "机构能力、覆盖区域、排班资源和履约规则。"
    },
    {
      name: "用户私有知识",
      description: "档案、报告、指标、历史订单与家属授权关系。"
    },
    {
      name: "任务上下文",
      description: "当前请求、当前报告、当前订单或当前事件。"
    },
    {
      name: "长期记忆",
      description: "结构化稳定摘要、偏好标签和持续跟踪项。"
    }
  ],
  toolBoundaryRules: [
    "Agent 不直接写 SQL。",
    "Agent 不直接跨模块访问 Prisma。",
    "工具输入输出必须稳定且可审计。",
    "高风险副作用工具默认关闭，或必须经过 SafetyReviewAgent 和人工确认。"
  ],
  riskTiers: [
    {
      level: "low",
      examples: [
        "HealthManagementAgent 的摘要类输出",
        "ContentActivityOpsAgent"
      ],
      requirements: ["结构化校验", "审计留痕"]
    },
    {
      level: "medium",
      examples: [
        "CareCoordinationAgent 的推荐类输出",
        "OperationsCopilotAgent"
      ],
      requirements: ["结构化校验", "规则复核"]
    },
    {
      level: "high",
      examples: [
        "RiskOperationsAgent",
        "后台派单建议",
        "任何涉及自动执行的输出"
      ],
      requirements: [
        "SafetyReviewAgent",
        "人工确认",
        "固定评测集"
      ]
    }
  ],
  auditRequirements: [
    "记录任务触发来源、任务状态、输入摘要和输出摘要。",
    "记录 Prompt 版本与模型版本。",
    "记录工具调用轨迹、失败原因和重试次数。",
    "记录 token、耗时、超时和降级情况。",
    "记录风险标签、复核决定和人工确认状态。"
  ]
};

export const HERMES_ROLE_MAPPINGS: HermesRoleMappingBlueprint[] = [
  {
    blueprintRole: "TaskOrchestratorAgent",
    hermesRole: "router",
    notes: "复杂任务可以扩展为 planner，但首期以受控路由为主。"
  },
  {
    blueprintRole: "SafetyReviewAgent",
    hermesRole: "reviewer",
    notes: "负责结构、风险、合规和人工复核判定。"
  },
  {
    blueprintRole: "HealthManagementAgent 等领域 Agent",
    hermesRole: "specialist",
    notes: "负责单一稳定业务领域的专业输出。"
  },
  {
    blueprintRole: "AssistantConversationAgent",
    hermesRole: "interaction wrapper",
    notes: "初期可由应用服务和 Hermes 任务组合实现，后续再升级为完整 Agent。"
  },
  {
    blueprintRole: "OperationsCopilotAgent",
    hermesRole: "aggregation wrapper",
    notes: "可先作为后台聚合服务，后续再升级为 Hermes 执行角色。"
  }
];

export const HERMES_CURRENT_ALIGNMENT: HermesCurrentAlignmentBlueprint[] = [
  {
    current: "intent-router",
    target: "TaskOrchestratorAgent",
    action: "升级为统一控制层入口。"
  },
  {
    current: "report-summary-agent",
    target: "HealthManagementAgent",
    action: "并入健康理解主域。"
  },
  {
    current: "service-recommendation-agent",
    target: "CareCoordinationAgent",
    action: "并入服务协同主域。"
  },
  {
    current: "AgentOrchestratorService",
    target: "Hermes Orchestrator",
    action: "继续承载调度、状态与回写控制。"
  },
  {
    current: "agent-task.processor.ts",
    target: "BullMQ worker runtime",
    action: "继续作为异步执行入口。"
  }
];

export const HERMES_EXAMPLE_SCENARIOS: HermesExampleScenarioBlueprint[] = [
  {
    key: "report-interpretation",
    name: "Hermes 实例：报告解读",
    trigger: "报告上传、报告查看或报告摘要 API 请求。",
    executionChain: [
      "reports module / assistant API",
      "AgentTask(taskType=report-interpretation)",
      "Hermes Orchestrator",
      "TaskOrchestratorAgent",
      "HealthManagementAgent",
      "SafetyReviewAgent（高风险时）",
      "saveAgentResult / report interpretation API"
    ],
    notes: [
      "报告理解与页面渲染必须分离。",
      "医学诊断结论不能由 Agent 直接给出。",
      "高风险表达必须经 SafetyReviewAgent 打标或转人工。"
    ]
  },
  {
    key: "service-recommendation-and-dispatch",
    name: "Hermes 实例：服务推荐与派单建议共域",
    trigger: "用户请求服务推荐、预约预填，或后台请求派单建议。",
    executionChain: [
      "assistant API / dispatch API",
      "AgentTask(taskType=service-recommendation | dispatch-suggestion)",
      "Hermes Orchestrator",
      "TaskOrchestratorAgent",
      "CareCoordinationAgent",
      "SafetyReviewAgent",
      "recommendation response / candidate ranking"
    ],
    notes: [
      "服务目录、覆盖范围、人员资质和排班约束共享同一套解释逻辑。",
      "推荐与派单共享同一份供需匹配能力。",
      "高风险 side effect 只能通过受控写回工具和人工确认流落地。"
    ]
  }
];

export const IMPLEMENTATION_ROADMAP: ImplementationPhaseBlueprint[] = [
  {
    phase: "Phase 1",
    goal: "巩固运行时底座",
    scope: [
      "完整的 AgentTask 状态流转。",
      "队列执行、超时、重试和失败回写。",
      "LLM Gateway 与结构化输出能力。",
      "agent-registry 和 Agent 定义卡片。",
      "首批工具层契约。"
    ]
  },
  {
    phase: "Phase 2",
    goal: "统一健康理解与服务协同主域",
    scope: [
      "intent-router 向 TaskOrchestratorAgent 演进。",
      "report-summary-agent 并入 HealthManagementAgent。",
      "service-recommendation-agent 并入 CareCoordinationAgent。",
      "维持现有 API 兼容，同时统一底层执行口径。"
    ]
  },
  {
    phase: "Phase 3",
    goal: "补齐用户端统一助手与治理门禁",
    scope: [
      "引入 AssistantConversationAgent。",
      "打通报告解读、健康摘要、服务推荐和风险提醒的统一会话入口。",
      "引入 SafetyReviewAgent。",
      "建立人工确认和拒答机制。"
    ]
  },
  {
    phase: "Phase 4",
    goal: "补齐风险运营与后台运营 Copilot",
    scope: [
      "引入 RiskOperationsAgent。",
      "引入 OperationsCopilotAgent。",
      "按需引入 DeviceOperationsAgent 和 ContentActivityOpsAgent。",
      "建立后台首页、预警中心和派单页的统一摘要能力。"
    ]
  },
  {
    phase: "Phase 5",
    goal: "评测、追踪与规模化运营",
    scope: [
      "固定评测集、打分器和回归流程。",
      "Prompt 版本化、模型版本化和工具调用追踪。",
      "成本、延迟、失败率与人工复核通过率监控。",
      "分级放量与灰度开关。"
    ]
  }
];

export const INTELLIHEALTHCARE_MULTI_AGENT_BLUEPRINT = {
  documentPositioning: {
    purpose:
      "定义 IntelliHealthCare 在用户端、后台端和事件流之上的统一多智能体框架蓝图，作为业务规划、后端实现、治理审计和 Hermes 运行时建设的共同基线。",
    focus: [
      "统一框架定位、边界与设计原则",
      "产品能力与 Agent 体系映射",
      "标准协作工作流、治理规则与实施顺序",
      "Hermes 运行时落位、实例考虑与分阶段规划"
    ],
    nonGoals: [
      "单个页面交互稿或文案细节",
      "具体 API DTO、数据库字段和前端展示逻辑",
      "某一条业务链路的实现细节替代方案"
    ]
  },
  positioning: {
    principle:
      "系统只有一套多智能体框架；用户端和后台端只是不同入口与 API 面，底层共享同一批领域 Agent 和治理规则。",
    uiStrategy:
      "用户端在 UI 层保留一个统一康养助手，承接助手问答、报告解读、服务推荐和健康摘要；API 层仍按能力拆分，便于前端页面和后台系统独立调用。",
    hermesPositioning:
      "Hermes 是后端内部的受控多智能体运行时，负责任务接入、路由、编排、工具调用、状态回写和审计，而不是独立部署的开放式 AI 平台。"
  },
  architecturePrinciples: ARCHITECTURE_PRINCIPLES,
  generatedFrom: {
    docs: [
      "docs/intellihealthcare-multi-agent-blueprint.md",
      "docs/hermes-agent-framework-requirements.md",
      "docs/hermes-multi-agent-implementation.md",
      "docs/member-development-manual.md",
      "docs/user-web-analysis-and-api.md",
      "docs/backend-architecture.md",
      "docs/智诊康养后端开发文档.md"
    ],
    appSurfaces: [
      "apps/user-web/src/app/pages.manifest.json",
      "apps/admin-web/src/pages/**",
      "apps/backend/prisma/seed.ts"
    ]
  },
  summary: {
    userCapabilities: PRODUCT_CAPABILITY_BLUEPRINTS.filter(
      (item) => item.surface === "user"
    ).length,
    adminCapabilities: PRODUCT_CAPABILITY_BLUEPRINTS.filter(
      (item) => item.surface === "admin"
    ).length,
    agentCount: AGENT_BLUEPRINTS.length,
    workflowCount: AGENT_WORKFLOW_BLUEPRINTS.length,
    implementedAgents: AGENT_BLUEPRINTS.filter(
      (item) => item.status === "implemented"
    ).length,
    partialAgents: AGENT_BLUEPRINTS.filter(
      (item) => item.status === "partial"
    ).length,
    plannedAgents: AGENT_BLUEPRINTS.filter(
      (item) => item.status === "planned"
    ).length
  },
  governance: GOVERNANCE_BLUEPRINT,
  hermes: {
    responsibilities: [
      "统一任务接入与调度。",
      "Agent 注册、路由、编排与执行控制。",
      "工具调用、模型调用、状态回写与审计。",
      "高风险输出的复核门禁与人工兜底。"
    ],
    nonGoals: [
      "取代业务模块本身。",
      "直接绕过业务边界写数据库。",
      "实现无边界自治的开放式 Agent 系统。"
    ],
    roleMappings: HERMES_ROLE_MAPPINGS,
    currentAlignment: HERMES_CURRENT_ALIGNMENT,
    exampleScenarios: HERMES_EXAMPLE_SCENARIOS
  },
  roadmap: IMPLEMENTATION_ROADMAP,
  productCapabilities: PRODUCT_CAPABILITY_BLUEPRINTS,
  agents: AGENT_BLUEPRINTS,
  agentCards: AGENT_CARD_BLUEPRINTS,
  workflows: AGENT_WORKFLOW_BLUEPRINTS
};
