# IntelliHealthCare

IntelliHealthCare 当前采用 Monorepo 结构，统一维护两个前端工作区：

- `apps/user-web`：面向长者与家属的 APP 端网页工作区
- `apps/admin-web`：面向运营、护理和机构管理团队的后台端网页工作区

两个工作区保持一致的技术栈与开发范式：

- `Vue 3`
- `TypeScript`
- `Vite`
- 页面清单驱动的整站/单页预览模式

## 环境要求

- `Node.js >= 20`
- `npm >= 10`

安装依赖：

```bash
npm install
```

## 运行与调试

APP 端整站预览：

```bash
npm run dev:user
```

APP 端单页预览：

```bash
npm run dev:page -- --page home/dashboard
```

后台端整站预览：

```bash
npm run dev:admin
```

默认进入后台登录页 `auth/login`。

后台端单页预览：

```bash
npm run dev:admin:page -- --page auth/login
```

## 常用命令

校验整个工作区：

```bash
npm run check
```

分别校验：

```bash
npm run check:user
npm run check:admin
```

构建全部前端：

```bash
npm run build
```

分别构建：

```bash
npm run build:user
npm run build:admin
```

创建新页面骨架：

```bash
npm run create:page -- --group health --page health-data --title "健康数据" --owner "成员A"
npm run create:admin-page -- --group elder --page member-list --title "长者档案" --owner "后台组"
```

生成页面开发提示：

```bash
npm run prompt:page -- --page health/health-data
npm run prompt:admin-page -- --page dashboard/overview
```

## 目录结构

```text
apps/
  user-web/                 APP 端网页工作区
  admin-web/                后台端网页工作区
packages/
  page-core/                页面类型与运行时工具
legacy/
  miniprogram-user/         APP 端历史小程序参考代码
scripts/
  *.mjs                     开发、构建、校验、脚手架脚本
docs/
  architecture.md
  member-development-manual.md
  admin-development-manual.md
  codex-workflow.md
```

## 页面目录约定

两个前端工作区都遵循同样的页面目录结构：

```text
apps/<app>/src/pages/<domain>/<page>/
  Page.vue
  mock.ts
  README.md
```

说明：

- `Page.vue`：页面结构、交互与局部状态
- `mock.ts`：单页调试数据
- `README.md`：页面职责、边界和协作说明

页面清单位于：

```text
apps/user-web/src/app/pages.manifest.json
apps/admin-web/src/app/pages.manifest.json
```

## 参考资料

- [架构说明](./docs/architecture.md)
- [成员开发手册](./docs/member-development-manual.md)
- [后台端开发手册](./docs/admin-development-manual.md)
- [Codex 协作说明](./docs/codex-workflow.md)
