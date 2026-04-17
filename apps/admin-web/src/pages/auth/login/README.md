# 登录页

- 页面 id：`auth/login`
- 页面目录：`apps/admin-web/src/pages/auth/login`
- 负责人：后台组
- 说明：作为后台整站运行默认入口，承接后台账号密码登录和后续权限接入。

开发约定：
- `npm run dev:admin` 默认进入该页。
- `npm run dev:admin:page -- --page auth/login` 可单页调试。
- 当前为静态登录骨架，后续接入真实认证接口时优先保留页面结构不动，只替换提交流程。
