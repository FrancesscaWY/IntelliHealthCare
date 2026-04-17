const mock = {
  title: "登录页",
  summary: "后台管理端账号密码登录与工作台进入入口。",
  welcome: "欢迎进入智诊康养后台",
  subtitle: "当前为演示登录模式，不限制账号和密码，点击即可直接进入后台。",
  account: "",
  password: "",
  remember: true,
  notices: [
    "当前登录不校验账号密码，输入任意内容或直接点击登录都可进入后台。",
    "默认整站入口进入登录页，适合演示和后续接入真实认证流程。",
    "如需调试具体页面，仍可通过单页命令直接进入目标后台页面。",
  ],
  quickEntries: [
    { label: "后台首页", pageId: "dashboard/overview" },
    { label: "服务调度", pageId: "service/order-dispatch" },
    { label: "健康预警", pageId: "health/alert-center" },
  ],
};

export default mock;
