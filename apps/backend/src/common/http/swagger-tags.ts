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
  AdminAuth: "后台端 / 后台认证与账号",
  AdminAnalytics: "后台端 / 后台运营分析",
  AdminElders: "后台端 / 后台长者档案",
  AdminReports: "后台端 / 后台报告审核",
  AdminOrders: "后台端 / 后台订单履约",
  AdminAfterSales: "后台端 / 后台售后与评价",
  AdminCatalogStaff: "后台端 / 后台商品与服务人员",
  AdminSystem: "后台端 / 后台机构与权限",
  AdminMessaging: "后台端 / 后台消息与会话",
  AdminFiles: "后台端 / 后台文件上传",
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
    description: "后台登录、后台 token、当前账号、个人资料、改密与头像设置。"
  },
  {
    name: SwaggerTags.AdminAnalytics,
    description: "后台运营看板、用户构成、交易转化、商品分析和履约分析。"
  },
  {
    name: SwaggerTags.AdminElders,
    description: "后台长者列表、建档、标签维护、详情总览及分 tab 子资源。"
  },
  {
    name: SwaggerTags.AdminOrders,
    description: "后台总览、预约看板、订单履约、工单详情、改价、关单与派单。"
  },
  {
    name: SwaggerTags.AdminAfterSales,
    description: "后台售后审核、退款流转、评价管理、显示隐藏、置顶与删除。"
  },
  {
    name: SwaggerTags.AdminCatalogStaff,
    description: "后台商品管理、服务人员管理与服务人员入驻审核。"
  },
  {
    name: SwaggerTags.AdminSystem,
    description: "后台机构管理、后台账号、角色定义、启停与批量状态变更。"
  },
  {
    name: SwaggerTags.AdminMessaging,
    description: "后台群发消息、客户会话、消息明细、发送消息与结束会话。"
  },
  {
    name: SwaggerTags.AdminFiles,
    description: "后台头像、证件、机构图、商品图等统一文件上传支撑。"
  },
  {
    name: SwaggerTags.AdminReports,
    description: "后台报告列表、详情、上传、删除、审核与下载元数据。"
  },
  {
    name: SwaggerTags.InternalAgents,
    description: "内部 Agent 任务、人工复核、审计日志、RAG 检索与评测。"
  }
] as const;
