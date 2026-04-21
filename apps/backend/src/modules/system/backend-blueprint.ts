export const BACKEND_STACK = {
  runtime: "Node.js 20 + TypeScript",
  framework: "NestJS modular monolith",
  api: "REST API + Swagger/OpenAPI + WebSocket-ready event layer",
  database: "PostgreSQL + Prisma ORM",
  cacheAndQueue: "Redis + BullMQ",
  storage: "MinIO / S3-compatible object storage",
  aiLayer: "LLM gateway + RAG knowledge bases + Agent orchestration",
  auth: "JWT + RBAC + audit-friendly soft delete"
} as const;

export const BACKEND_BOUNDED_CONTEXTS = [
  {
    key: "auth",
    priority: "P0",
    responsibilities: ["老人/家属登录", "后台角色登录", "JWT 会话", "RBAC 权限控制"]
  },
  {
    key: "users",
    priority: "P0",
    responsibilities: ["个人资料", "实名认证", "紧急联系人", "后台账号与机构账号"]
  },
  {
    key: "family",
    priority: "P0",
    responsibilities: ["家属绑定", "家庭成员", "服务地址", "授权范围"]
  },
  {
    key: "health-archive",
    priority: "P0",
    responsibilities: ["基础档案", "病史标签", "长期记忆", "健康摘要"]
  },
  {
    key: "health-metrics",
    priority: "P0",
    responsibilities: ["设备指标", "趋势解释", "异常提醒", "用药与膳食衔接"]
  },
  {
    key: "service-catalog",
    priority: "P0",
    responsibilities: ["家政护理", "康复理疗", "上门体检", "服务规则与知识库"]
  },
  {
    key: "orders",
    priority: "P0",
    responsibilities: ["预约下单", "订单状态流转", "工单派发", "售后入口"]
  },
  {
    key: "payments",
    priority: "P1",
    responsibilities: ["支付单", "支付状态同步", "退款对账入口"]
  },
  {
    key: "reports",
    priority: "P0",
    responsibilities: ["体检报告", "服务报告", "报告解读", "档案回填"]
  },
  {
    key: "messaging",
    priority: "P1",
    responsibilities: ["通知消息", "医生咨询", "客服会话", "助手会话"]
  },
  {
    key: "community",
    priority: "P1",
    responsibilities: ["生活圈", "活动报名", "内容审核联动"]
  },
  {
    key: "content",
    priority: "P1",
    responsibilities: ["健康资讯", "讲堂", "疾病知识库", "推荐素材"]
  },
  {
    key: "agents",
    priority: "P1",
    responsibilities: ["需求理解", "服务推荐", "订单调度", "报告生成", "风险识别"]
  },
  {
    key: "admin",
    priority: "P1",
    responsibilities: ["后台工作台", "运营分析", "机构协同", "配置中心"]
  }
] as const;
