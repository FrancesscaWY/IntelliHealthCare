# IntelliHealthCare

IntelliHealthCare 当前采用全栈 Monorepo 结构，统一维护三个应用工作区：

- `apps/user-web`：面向长者与家属的 APP 端网页工作区
- `apps/admin-web`：面向运营、护理和机构管理团队的后台端网页工作区
- `apps/backend`：面向用户端、后台端和后续 Agent 能力的统一后端服务

前后端目前的工程基线如下：

- 前端：`Vue 3` + `TypeScript` + `Vite`
- 后端：`NestJS` + `TypeScript` + `Prisma`
- 仓库维度统一使用 `npm workspaces`

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

后端开发：

```bash
npm run dev:backend
```

## 常用命令

校验整个工作区（用户端、后台端、后端）：

```bash
npm run check
```

分别校验：

```bash
npm run check:user
npm run check:admin
npm run check:backend
```

构建整个工作区（用户端、后台端、后端）：

```bash
npm run build
```

分别构建：

```bash
npm run build:user
npm run build:admin
npm run build:backend
```

创建新页面骨架：

```bash
npm run create:page -- --group health --page health-data --title "健康数据" --owner "成员A"
npm run create:admin-page -- --group elder --page member-list --title "长者档案" --owner "后台组"
```

如页面需要单独交接说明，可追加 `--with-readme` 生成目录内 `README.md`。

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
  backend/                  统一后端服务
packages/
  page-core/                页面类型与运行时工具
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
  README.md   # 可选，仅在需要补充上下文时保留
```

说明：

- `Page.vue`：页面结构、交互与局部状态
- `mock.ts`：单页调试数据
- `pages.manifest.json`：页面标题、摘要、负责人和运行入口的主数据源
- `README.md`：可选补充文档，用于记录额外交接、依赖或迁移说明

页面清单位于：

```text
apps/user-web/src/app/pages.manifest.json
apps/admin-web/src/app/pages.manifest.json
```

## 参考资料

- [架构说明](./docs/architecture.md)
- [后端架构说明](./docs/backend-architecture.md)
- [Hermes 多智能体框架实施路径](./docs/hermes-multi-agent-implementation.md)
- [成员开发手册](./docs/member-development-manual.md)
- [后台端开发手册](./docs/admin-development-manual.md)
- [页面协作说明](./docs/page-collaboration.md)
- [Codex 协作说明](./docs/codex-workflow.md)
