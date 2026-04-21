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
      "docs/admin-development-manual.md:52"
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
      "识别当前任务属于健康理解、服务协同、风险运营还是内容运营",
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
      "alert-triage"
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
    outputChannels: ["用户侧助手 UI", "消息回复", "跳转建议"]
  },
  {
    key: "health-intelligence-workflow",
    name: "健康理解工作流",
    surface: "shared",
    status: "partial",
    trigger: "报告上传、查看报告或查看健康摘要时触发",
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
    outputChannels: ["后台首页", "长者管理页", "派单页", "预警中心", "设备监控页"]
  }
];

export const INTELLIHEALTHCARE_MULTI_AGENT_BLUEPRINT = {
  positioning: {
    principle:
      "系统只有一套多智能体框架；用户端和后台端只是不同入口与 API 面，底层共享同一批领域 Agent 和治理规则。",
    uiStrategy:
      "用户端在 UI 层保留一个统一康养助手，承接助手问答、报告解读、服务推荐和健康摘要；API 层仍按能力拆分，便于前端页面和后台系统独立调用。"
  },
  generatedFrom: {
    docs: [
      "docs/user-web-analysis-and-api.md",
      "docs/admin-development-manual.md",
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
  productCapabilities: PRODUCT_CAPABILITY_BLUEPRINTS,
  agents: AGENT_BLUEPRINTS,
  workflows: AGENT_WORKFLOW_BLUEPRINTS
};
