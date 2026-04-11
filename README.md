# IntelliHealthCare

IntelliHealthCare 是一个面向老年用户与家属的康养服务网页端项目，当前主应用已迁移到 `Vue 3 + TypeScript + Vite`，并保留小程序原型代码作为业务与视觉参考。

## 项目状态

- 当前主应用：`apps/user-web`
- 技术栈：`Vue 3`、`TypeScript`、`Vite`

当前已接入页面：

- `onboarding/intro`
- `auth/login`
- `home/dashboard`
- `community/circle`
- `community/publish`

## 快速开始

建议环境：

- `Node.js >= 20`
- `npm >= 10`

安装依赖并启动整站：

```bash
npm install
npm run dev:user
```

默认会启动网页端调试服务，建议在浏览器开发者工具中切换到移动端设备模式，按 `390 x 844` 进行预览。

只调试单个页面：

```bash
npm run dev:page -- --page auth/login
```

## 常用命令

```bash
npm run dev:user
```

- 启动整站预览

```bash
npm run dev:page -- --page home/dashboard
```

- 启动单页预览

```bash
npm run check
```

- 校验页面目录约定并执行 TypeScript 类型检查

```bash
npm run build
```

- 构建生产包，输出到 `dist/user-web`

```bash
npm run create:page -- --group health --page blood-pressure --title "血压监测" --owner "成员A"
```

- 创建新页面脚手架

```bash
npm run prompt:page -- --page health/health-data
```

- 生成适合交给 Codex 的页面开发提示词

## 目录结构

```text
apps/
  user-web/                 Vue 3 + TypeScript 网页应用
packages/
  page-core/                页面类型、状态元数据、运行时工具
legacy/
  miniprogram-user/         历史小程序原型代码
scripts/
  dev-user.mjs              整站开发入口
  dev-page.mjs              单页开发入口
  create-page.mjs           页面脚手架
  build-user-web.mjs        构建脚本
  validate-workspace.mjs    工作区校验脚本
docs/
  architecture.md
  codex-workflow.md
  member-development-manual.md
```

## 页面开发约定

每个页面固定放在：

```text
apps/user-web/src/pages/<domain>/<page>/
  Page.vue
  mock.ts
  README.md
```

约定说明：

- `Page.vue`：页面结构、状态与交互
- `mock.ts`：单页调试数据
- `README.md`：页面职责、边界与协作说明

页面总清单位于：

```text
apps/user-web/src/app/pages.manifest.json
```

## 构建与校验

本项目已经接入：

- `vue-tsc` 类型检查
- `Vite` 生产构建
- 页面目录与清单校验

推荐提交前至少执行：

```bash
npm run check
npm run build
```

## npm install 失败排查

如果你在本机执行 `npm install` 失败，优先检查是否配置了失效的本地代理。

例如用户级配置文件：

```text
C:\Users\<你的用户名>\.npmrc
```

如果里面存在类似配置，而本地代理并没有启动，就会导致 `ECONNREFUSED`：

```ini
proxy=http://127.0.0.1:10809
https-proxy=http://127.0.0.1:10809
registry=https://registry.npmmirror.com
```

可执行：

```bash
npm config delete proxy
npm config delete https-proxy
npm config set registry https://registry.npmmirror.com
```

然后重新安装：

```bash
npm install
```

## 协作文档

开始开发前建议先阅读：

- [docs/architecture.md](./docs/architecture.md)
- [docs/member-development-manual.md](./docs/member-development-manual.md)
- [docs/codex-workflow.md](./docs/codex-workflow.md)
