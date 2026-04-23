export const SwaggerTags = {
  SystemHealth: "系统层 / 系统检查",
  SystemPublicAgreement: "系统层 / 公开协议",
  AppAuth: "用户端 / 用户认证",
  AppUsers: "用户端 / 用户中心",
  AppHome: "用户端 / 首页",
  AppLocation: "用户端 / 定位",
  AppSearch: "用户端 / 搜索",
  AppFamily: "用户端 / 家庭与地址",
  AppHealthArchive: "用户端 / 健康档案",
  AppHealthMetrics: "用户端 / 健康数据与设备",
  AppHealthLifestyle: "用户端 / 健康膳食与自测",
  AppServiceCatalog: "用户端 / 服务目录",
  AppOrders: "用户端 / 订单与预约",
  AppPayments: "用户端 / 支付",
  AppReports: "用户端 / 体检报告",
  AppFiles: "用户端 / 文件上传",
  AppMessaging: "用户端 / 消息与咨询",
  AppContent: "用户端 / 健康内容",
  AppCommunity: "用户端 / 社区与活动",
  AppAi: "用户端 / AI 助手",
  AdminAuth: "后台端 / 后台认证",
  AdminWorkbench: "后台端 / 后台工作台",
  AdminOrders: "后台端 / 后台订单调度",
  AdminReports: "后台端 / 后台报告审核",
  InternalAgents: "内部治理层 / 智能体与 RAG"
} as const;

export const SwaggerTagDefinitions = [
  {
    name: SwaggerTags.SystemHealth,
    description: "系统状态、自检结果与架构摘要。"
  },
  {
    name: SwaggerTags.SystemPublicAgreement,
    description: "登录前可访问的公开协议与说明接口。"
  },
  {
    name: SwaggerTags.AppAuth,
    description: "用户端登录、短信验证码、密码重置与 token 刷新。"
  },
  {
    name: SwaggerTags.AppUsers,
    description: "个人中心、积分、足迹、优惠券、设置与实名认证。"
  },
  {
    name: SwaggerTags.AppHome,
    description: "用户端首页聚合数据。"
  },
  {
    name: SwaggerTags.AppLocation,
    description: "用户端当前城市与地区列表。"
  },
  {
    name: SwaggerTags.AppSearch,
    description: "热搜、搜索历史与全局搜索。"
  },
  {
    name: SwaggerTags.AppFamily,
    description: "家庭绑定关系与地址管理。"
  },
  {
    name: SwaggerTags.AppHealthArchive,
    description: "健康档案摘要、基础信息、病史与长期记忆。"
  },
  {
    name: SwaggerTags.AppHealthMetrics,
    description: "健康指标、设备管理与用药。"
  },
  {
    name: SwaggerTags.AppHealthLifestyle,
    description: "膳食计划、饮食记录与自测。"
  },
  {
    name: SwaggerTags.AppServiceCatalog,
    description: "服务分类、列表与详情。"
  },
  {
    name: SwaggerTags.AppOrders,
    description: "预约、订单、评价、售后与服务记录。"
  },
  {
    name: SwaggerTags.AppPayments,
    description: "支付渠道、支付单创建与确认。"
  },
  {
    name: SwaggerTags.AppReports,
    description: "体检报告列表、上传、详情与解读。"
  },
  {
    name: SwaggerTags.AppFiles,
    description: "文件预签名上传、上传完成确认与文件信息。"
  },
  {
    name: SwaggerTags.AppMessaging,
    description: "通知、会话、医生咨询与消息中心。"
  },
  {
    name: SwaggerTags.AppContent,
    description: "资讯、讲堂与疾病知识。"
  },
  {
    name: SwaggerTags.AppCommunity,
    description: "社区帖子、评论、活动与互动行为。"
  },
  {
    name: SwaggerTags.AppAi,
    description: "用户端 AI 助手、服务推荐、健康摘要、知识检索。"
  },
  {
    name: SwaggerTags.AdminAuth,
    description: "后台登录、后台 token 刷新与当前后台用户信息。"
  },
  {
    name: SwaggerTags.AdminWorkbench,
    description: "后台工作台概览、长者详情与工单列表。"
  },
  {
    name: SwaggerTags.AdminOrders,
    description: "后台订单查询、派单与工单状态流转。"
  },
  {
    name: SwaggerTags.AdminReports,
    description: "后台报告列表与审核。"
  },
  {
    name: SwaggerTags.InternalAgents,
    description: "内部 Agent 任务、人工复核、审计日志、RAG 检索与评测。"
  }
] as const;
