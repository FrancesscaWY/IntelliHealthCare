# 后台首页

- 页面 id：`dashboard/overview`
- 页面目录：`apps/admin-web/src/pages/dashboard/overview`
- 负责人：后台组
- 说明：承接后台整站的首屏入口，展示运营总览、风险提醒、服务调度和当班团队焦点。

开发约定：
- 整站模式下作为后台默认首页。
- 单页模式下通过 `npm run dev:admin:page -- --page dashboard/overview` 调试。
- 运营数据先维护在 `mock.ts`，后续再替换为真实接口。
