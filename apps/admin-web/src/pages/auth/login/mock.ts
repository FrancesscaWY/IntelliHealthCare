const mock = {
  title: "登录页",
  summary: "后台管理端账号密码登录与工作台进入入口。",
  welcome: "欢迎进入智诊康养后台",
  subtitle: "本页已接入后台真实认证接口，登录成功后会写入后台专用 token 并进入工作台。",
  account: "13600136000",
  password: "123456",
  remember: true,
  notices: [
    "后台登录调用 POST /admin/auth/login/password，返回 accessToken 与 refreshToken。",
    "勾选记住登录信息时，后台 token 会保存在 localStorage；否则只保存在 sessionStorage。",
    "后台页面请求受保护接口时，统一从后台专用 session 读取 Authorization: Bearer <token>。",
  ],
};

export default mock;
