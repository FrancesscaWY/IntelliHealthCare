# 架构说明

## 1. 项目概览

IntelliHealthCare 当前采用 Monorepo 结构，主应用已经迁移到 `Vue 3 + TypeScript + Vite`。仓库的目标不是一次性承载所有端，而是先把网页端作为统一开发入口，再保留历史小程序代码用于业务和视觉参考。

当前关键目录：

```text
apps/
  user-web/                 当前主应用
packages/
  page-core/                页面类型与运行时工具
legacy/
  miniprogram-user/         历史小程序原型代码
scripts/
  *.mjs                     开发、构建、脚手架、校验脚本
docs/
  *.md                      团队协作文档
```

## 2. 主应用入口

网页端应用入口位于：

```text
apps/user-web/index.html
apps/user-web/src/main.ts
apps/user-web/src/app/App.vue
```

启动链路如下：

1. `index.html` 挂载根节点 `#app`
2. `src/main.ts` 创建 Vue 应用并挂载 `App.vue`
3. `App.vue` 读取页面清单、解析运行模式、初始化导航与 Toast，并按当前页面动态加载对应的 `Page.vue`

这意味着整站和单页预览共用同一个 Vue 根应用，只是初始配置不同。

## 3. 页面装配流程

### 页面清单

整站页面来源于：

```text
apps/user-web/src/app/pages.manifest.json
```

每个页面条目都包含：

- 页面 id，例如 `auth/login`
- 页面标题、分组、状态、摘要
- 目录路径
- `Page.vue` 路径
- `mock.ts` 路径
- 历史原型参考路径

`pages.manifest.json` 是页面发现、路由映射、校验脚本和脚手架的统一数据源。

### 运行模式

`resolve-config.ts` 负责决定应用运行在以下哪种模式：

- `app`：整站模式
- `page`：单页模式

配置来源有两层：

1. URL 查询参数，例如 `?mode=page&page=auth/login`
2. 环境变量 `VITE_IHC_MODE`、`VITE_IHC_PAGE_ID`

### 页面动态加载

`page-registry.ts` 使用 `import.meta.glob("../pages/**/Page.vue")` 注册所有页面组件，并通过页面 id 拼出真实模块路径：

```text
../pages/<page-id>/Page.vue
```

这样做的好处是：

- 页面目录天然就是模块边界
- 无需手写一大张 import 映射表
- 新页面只要目录和清单正确，就能被运行时发现

### 导航状态

`usePageNavigation.ts` 提供一套轻量的栈式导航能力，暴露的接口与小程序常用导航习惯接近：

- `navigateTo`
- `redirectTo`
- `reLaunch`
- `navigateBack`
- `canGoBack`
- `getStack`

导航本质上是运行在内存中的页面栈，不依赖 Vue Router。这样做的原因是当前项目更偏向“移动端页面预览壳”，而不是传统网站级路由站点。

### Toast 与通用界面

`App.vue` 内部还会装配几类公共能力：

- `ToastViewport.vue`：全局 Toast 展示
- `useToastQueue.ts`：Toast 队列管理
- `PagePlaceholder.vue`：未完成页面或加载异常时的占位页
- `BottomTabBar.vue`：底部导航栏组件

## 4. 页面目录约定

每个页面固定放在：

```text
apps/user-web/src/pages/<domain>/<page>/
  Page.vue
  mock.ts
  README.md
```

职责划分如下：

- `Page.vue`：页面结构、状态和交互
- `mock.ts`：页面调试数据
- `README.md`：页面职责、边界和协作说明

当前页面组件统一接收 `PageComponentProps`，类型定义位于：

```text
packages/page-core/src/types.ts
```

也就是说，一个页面组件默认可以直接拿到：

- `pageEntry`
- `mode`
- `manifest`
- `navigation`
- `showToast`

因此页面内部通常不需要自己关心全局启动逻辑，只需要专注于当前页面业务。

## 5. packages/page-core 的职责

`packages/page-core` 目前承担的是“轻量运行时工具包”角色，而不是完整 UI 库。

当前主要包含：

- 页面类型定义
- 页面状态元数据
- `normalizePageId`
- `resolveInitialPage`
- 页面分组工具
- 底部导航数据

如果某段逻辑满足以下条件，优先放到 `packages/page-core`：

- 会被多个页面复用
- 与具体页面视觉实现无强耦合
- 更偏向页面元信息、导航、状态或工具函数

如果更偏向 Vue 界面组件，则优先放到：

```text
apps/user-web/src/components/
```

## 6. scripts 的职责

### 开发脚本

```bash
npm run dev:user
```

作用：

- 启动整站预览
- 内部会把运行模式注入到 Vite 子进程

```bash
npm run dev:page -- --page auth/login
```

作用：

- 启动单页预览
- 本质上仍然复用同一个 Vite 应用，只是传入不同入口配置

### 校验与构建

```bash
npm run check
```

会执行：

- `scripts/validate-workspace.mjs`
- `@ihc/user-web` 的 `vue-tsc --noEmit`

```bash
npm run build
```

会执行：

- 工作区结构校验
- `@ihc/user-web` 生产构建

### 页面脚手架

```bash
npm run create:page -- --group health --page blood-pressure --title "血压监测"
```

会自动：

- 创建页面目录
- 生成 `Page.vue`
- 生成 `mock.ts`
- 生成 `README.md`
- 把页面写入 `pages.manifest.json`

## 7. legacy 目录的定位

```text
legacy/miniprogram-user/
```

这个目录的用途不是继续开发，而是：

- 保留已有成果
- 提供业务字段、页面结构和交互参考
- 帮助网页端迁移时减少信息丢失

不要在 `legacy` 里追加新功能，也不要把旧代码直接复制进新页面而不做组件化整理。

## 8. 当前架构的设计取向

这套架构更适合：

- 小团队并行开发多个“页面型”功能
- 先用静态数据和本地交互完成页面
- 后续逐步接入 API 和抽离公共能力

它当前刻意没有引入的内容包括：

- Vue Router
- Pinia
- 复杂状态管理
- 服务端渲染

原因不是这些技术不能用，而是现阶段页面协作效率比框架完整度更重要。等页面数量和共享逻辑继续增长，再评估是否引入更重的路由或状态层。
