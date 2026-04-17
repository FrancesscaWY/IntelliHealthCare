export const projectInfo = {
  name: "智诊康养后台",
  summary: "面向养老机构、服务运营和健康管理团队的后台管理工作区。",
  delivery: "与 APP 端保持一致，采用 Vue 3 + TypeScript + Vite 的页面工作区模式。",
  homePageId: "auth/login",
  prototypeUrl: "https://www.axureshop.com/ys/2296569",
  featureHighlights: ["登录入口", "长者档案", "服务调度", "健康预警", "设备巡检", "内容运营", "系统设置"],
};

export const groupMeta: Record<string, { title: string; description: string }> = {
  auth: {
    title: "登录认证",
    description: "后台管理端账号密码登录与工作台进入入口。",
  },
  dashboard: {
    title: "运营总览",
    description: "首页概览、关键指标、风险提醒与待办汇总。",
  },
  elder: {
    title: "长者管理",
    description: "长者档案、入住状态、家属联系人与服务画像。",
  },
  service: {
    title: "服务调度",
    description: "上门服务、护理排班、订单流转与异常处理。",
  },
  health: {
    title: "健康监测",
    description: "生命体征、预警事件、报告跟踪与干预闭环。",
  },
  device: {
    title: "设备中心",
    description: "设备在线率、告警处理、定位轨迹与巡检任务。",
  },
  content: {
    title: "内容运营",
    description: "资讯、讲堂、栏目与首页运营位管理。",
  },
  community: {
    title: "社区活动",
    description: "活动发布、报名统计、审核与互动数据。",
  },
  staff: {
    title: "人员与机构",
    description: "护理员、医生、服务团队和机构资源视图。",
  },
  analytics: {
    title: "数据分析",
    description: "业务看板、服务质量、健康趋势与经营分析。",
  },
  system: {
    title: "系统设置",
    description: "账号权限、角色菜单、通知规则与基础配置。",
  },
};
