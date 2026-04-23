const mock = {
  title: "登录页",
  summary: "智慧养老后台管理系统登录页，支持角色选择、协议确认和后台入口演示。",
  brandTitle: "智慧养老后台管理系统",
  brandSummary: "聚合健康档案、服务协同与运营数据，用更轻量的后台界面支撑养老服务管理。",
  phone: "",
  password: "",
  remember: true,
  agreePolicy: false,
  policyLabel: "我已阅读并同意",
  policyName: "《用户隐私政策》",
  forgotPasswordText: "忘记密码请联系管理员处理",
  quickEntries: [
    {
      label: "工作台",
      pageId: "dashboard/overview"
    },
    {
      label: "订单调度",
      pageId: "service/order-dispatch"
    },
    {
      label: "账号设置",
      pageId: "system/account-settings"
    }
  ],
  roles: [
    {
      key: "platform-admin",
      label: "平台管理员",
      description: "负责平台全局配置、权限分配与运营总览。",
      icon: "shield"
    },
    {
      key: "customer-service",
      label: "客服人员",
      description: "处理咨询工单、服务回访与消息协同。",
      icon: "headset"
    },
    {
      key: "institution-manager",
      label: "机构主管",
      description: "管理机构成员、排班任务与健康服务执行。",
      icon: "building"
    }
  ]
};

export default mock;
