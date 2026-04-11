# IntelliHealthCare

智诊康养网页端项目。当前仓库已经提供两种直接可用的开发运行方式：

- `npm run dev:user`：直接打开整站首页体验
- `npm run dev:page -- --page <page-id>`：直接打开某个子页面

## 启动命令

```bash
npm run dev:user
```

默认进入整站首页 `home/dashboard`，可以在页面内继续跳转到已接入的子页面。
建议在浏览器开发者工具中使用移动端设备模式调试，目标分辨率为 `390 x 844`。

```bash
npm run dev:page -- --page auth/login
```

只运行一个子页面，适合开发和调试局部功能。

```bash
npm run check
npm run build
```

分别用于结构校验和输出静态预览文件。

## 目录概览

```text
apps/
  user-web/                 当前网页端应用
packages/
  page-core/                共享运行时和通用 UI 能力
legacy/
  miniprogram-user/         保留的小程序原型代码
scripts/
  dev-user.mjs              整站入口
  dev-page.mjs              单页入口
  create-page.mjs           页面脚手架
  codex-prompt.mjs          页面开发提示词
docs/
  architecture.md
  codex-workflow.md
  member-development-manual.md
```

## 页面目录规范

每个页面固定放在：

```text
apps/user-web/src/pages/<domain>/<page>/
  page.js
  mock.js
  README.md
```

## 已保留的页面

目前已经接入网页端运行的页面：

- `onboarding/intro`
- `auth/login`
- `home/dashboard`
- `community/circle`
- `community/publish`

## 团队开发手册

成员开发请优先看：

- [docs/member-development-manual.md](./docs/member-development-manual.md)
