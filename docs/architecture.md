# 架构说明

## 1. 项目概览

IntelliHealthCare 当前使用全栈 Monorepo 统一管理前后端工作区。

核心目标：

- 用户端、后台端与后端在同一仓库内演进
- 前后端统一使用 TypeScript 体系，降低协作切换成本
- 整站预览与单页预览使用同一套启动机制
- 前端页面开发以“页面目录”作为最小协作单元
- 后端以 `NestJS` 模块化单体承接统一业务 API

关键目录：

```text
apps/
  user-web/                 用户端网页工作区
  admin-web/                后台端网页工作区
  backend/                  统一后端服务
packages/
  page-core/                页面类型与运行时工具
scripts/
  *.mjs                     开发、构建、校验、脚手架脚本
docs/
  *.md                      协作文档
```

## 2. 三应用结构

### 用户端

```text
apps/user-web/
```

定位：

- 面向长者与家属的统一业务页面工作区
- 老人和家属共用同一套用户端系统，不单独拆分为两个前端应用
- 保留移动端页面壳与轻量导航模型

### 后台端

```text
apps/admin-web/
```

定位：

- 面向运营、护理、医生和机构管理人员的后台工作区
- 使用桌面端工作台壳承载页面
- 页面结构参考后台原型与当前仓库页面协作规范

### 后端

```text
apps/backend/
```

定位：

- 面向用户端和后台端提供统一业务 API
- 采用 `NestJS` 模块化单体组织业务域
- 承接 PostgreSQL、Redis、MinIO 和后续 Agent 运行时接入

补充说明：

- 本文档重点描述 Monorepo 结构以及两个前端工作区的页面装配机制
- 后端模块边界和基础设施设计以 [backend-architecture.md](./backend-architecture.md) 为准

## 3. 主应用入口

两个前端工作区都遵循同样的启动链路：

```text
apps/<app>/index.html
apps/<app>/src/main.ts
apps/<app>/src/app/App.vue
```

启动流程：

1. `index.html` 提供根节点 `#app`
2. `src/main.ts` 创建 Vue 应用并挂载 `App.vue`
3. `App.vue` 读取页面清单、解析运行模式、初始化导航和 Toast，并动态加载 `Page.vue`

也就是说，整站模式和单页模式并不是两套应用，而是同一套根应用的不同初始化配置。

## 4. 页面装配机制

### 页面清单

页面统一登记在：

```text
apps/user-web/src/app/pages.manifest.json
apps/admin-web/src/app/pages.manifest.json
```

每个页面条目至少包含：

- `id`
- `title`
- `group`
- `route`
- `owner`
- `status`
- `summary`
- `folderPath`
- `modulePath`
- `mockPath`

页面清单是页面发现、校验、脚手架和预览入口的统一数据源。

### 运行模式

`resolve-config.ts` 负责识别运行模式：

- `app`：整站模式
- `page`：单页模式

配置来源有两层：

1. URL 参数，例如 `?mode=page&page=dashboard/overview`
2. 环境变量 `VITE_IHC_MODE`、`VITE_IHC_PAGE_ID`

### 页面动态加载

`page-registry.ts` 使用：

```ts
import.meta.glob("../pages/**/Page.vue")
```

通过页面 id 拼接出真实模块路径：

```text
../pages/<page-id>/Page.vue
```

这样可以保证：

- 新页面只要目录和清单正确，就能被运行时发现
- 不需要维护手写 import 映射表
- 页面目录天然就是模块边界

## 5. 导航与页面接口

轻量导航能力由 `usePageNavigation.ts` 提供，接口与小程序常见导航习惯接近：

- `navigateTo`
- `redirectTo`
- `reLaunch`
- `navigateBack`
- `canGoBack`
- `getStack`

页面组件统一接收 `PageComponentProps`，类型位于：

```text
packages/page-core/src/types.ts
```

默认可直接获得：

- `pageEntry`
- `mode`
- `manifest`
- `navigation`
- `showToast`

## 6. scripts 的职责

脚本层当前分为两类：

- 前端页面工作区脚本：支持 `user` 和 `admin` 两种应用目标
- 根工作区脚本：统一聚合 `user-web`、`admin-web`、`backend`

### 开发入口

```bash
npm run dev:user
npm run dev:page -- --page home/dashboard
npm run dev:admin
npm run dev:admin:page -- --page dashboard/overview
```

### 校验与构建

```bash
npm run check
npm run build
```

根命令默认覆盖整个仓库；也可以分别执行：

```bash
npm run check:user
npm run check:admin
npm run check:backend
npm run build:user
npm run build:admin
npm run build:backend
```

### 页面脚手架

```bash
npm run create:page -- --group health --page health-data --title "健康数据"
npm run create:admin-page -- --group elder --page member-list --title "长者档案"
```

脚手架会自动：

- 创建页面目录
- 生成 `Page.vue`
- 生成 `mock.ts`
- 在需要时通过 `--with-readme` 生成 `README.md`
- 写入对应应用的 `pages.manifest.json`

## 7. packages/page-core 的职责

`packages/page-core` 承担轻量运行时工具包角色，而不是完整 UI 库。

当前主要包含：

- 页面类型定义
- 页面状态元数据
- `normalizePageId`
- `resolveInitialPage`
- 页面分组工具
- 用户端底部导航数据

如果逻辑满足以下条件，优先放到 `packages/page-core`：

- 会被多个页面或多个工作区复用
- 与具体页面 UI 无强耦合
- 更偏向页面元信息、导航和工具函数

## 8. 设计取向

当前架构适合：

- 小团队并行开发多张页面
- 先完成静态结构和本地交互
- 后续逐步替换为真实 API

目前刻意没有引入：

- Vue Router
- Pinia
- 复杂全局状态层
- 服务端渲染

原因是当前阶段更强调页面协作效率和原型落地速度。
