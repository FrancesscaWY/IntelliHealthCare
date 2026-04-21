# 成员开发手册

这份手册面向首次进入 IntelliHealthCare 仓库的成员，帮助你快速理解当前代码结构、启动方式和页面协作流程。

## 1. 先知道这些

- 当前主要开发对象是网页工作区，不是小程序
- 仓库同时维护用户端与后台端两个前端应用
- 两个应用都基于 `Vue 3 + TypeScript + Vite`
- 页面目录是最小协作单元
- 老人和家属共用同一套用户端工作区，不单独拆成两个系统

你日常最常接触的目录通常是：

```text
apps/
packages/page-core/
docs/
scripts/
```

## 2. 安装与启动

安装依赖：

```bash
npm install
```

用户端整站：

```bash
npm run dev:user
```

用户端单页：

```bash
npm run dev:page -- --page home/dashboard
```

后台端整站：

```bash
npm run dev:admin
```

后台端单页：

```bash
npm run dev:admin:page -- --page dashboard/overview
```

## 3. 常用命令速查

```bash
npm run check
```

- 校验两个工作区的页面目录和 TypeScript 类型

```bash
npm run build
```

- 构建两个工作区

```bash
npm run check:user
npm run check:admin
```

- 分别校验某个工作区

```bash
npm run create:page -- --group health --page health-data --title "健康数据"
npm run create:admin-page -- --group elder --page member-list --title "长者档案"
```

- 创建页面脚手架并登记到对应清单
- 如页面需要额外交接说明，可追加 `--with-readme`

## 4. 仓库目录怎么理解

### 页面工作区

```text
apps/user-web/
apps/admin-web/
```

其中：

- `user-web` 面向长者与家属，是统一用户侧入口
- `admin-web` 面向后台运营与机构管理

### 运行时与页面清单

```text
apps/<app>/src/app/
```

负责：

- 页面清单
- 运行模式解析
- 页面动态加载
- 根应用壳
- Toast 和导航能力

### 公共运行时工具

```text
packages/page-core/src/
```

负责：

- 页面类型定义
- 页面状态元数据
- 页面分组工具
- 初始页面解析

## 5. 页面目录规范

每个页面固定放在：

```text
apps/<app>/src/pages/<domain>/<page>/
  Page.vue
  mock.ts
  README.md   # 可选
```

职责划分：

- `Page.vue`：页面结构、交互、局部状态
- `mock.ts`：本页调试数据
- `pages.manifest.json`：页面标题、摘要、负责人和运行入口的主数据源
- `README.md`：可选补充文档，用于记录额外协作说明

## 6. 怎么找到自己负责的页面

先查看页面清单：

```text
apps/user-web/src/app/pages.manifest.json
apps/admin-web/src/app/pages.manifest.json
```

你可以在里面找到：

- 页面 id
- 页面标题
- 页面分组
- 当前状态
- 页面目录
- 页面组件路径

## 7. 推荐开发流程

### 场景 A：页面已经存在

1. 在 `pages.manifest.json` 里找到页面 id
2. 进入对应页面目录
3. 先运行单页调试命令
4. 优先补齐 `mock.ts`
5. 再完善 `Page.vue`
6. 完成后执行 `npm run check`

### 场景 B：页面还不存在

1. 先执行页面脚手架命令
2. 确认目录和清单已生成
3. 在 `mock.ts` 中补充调试数据
4. 在 `Page.vue` 中实现页面
5. 再执行 `npm run check`

## 8. 什么时候改页面内，什么时候提到公共层

优先留在页面目录内的情况：

- 逻辑只服务当前页面
- 暂时没有第二个复用场景
- 只是局部样式和交互调整

优先提取到公共层的情况：

- 两个及以上页面开始复用
- 属于页面元信息、导航、状态处理
- 是跨工作区都可能复用的工具函数

一般规则：

- 工具和类型放 `packages/page-core`
- 应用内通用组件放 `apps/<app>/src/components`

## 9. 提交前检查

至少确认：

1. 对应页面可以通过单页模式打开
2. 对应工作区能正常整站启动
3. `npm run check` 通过
4. 必要时 `npm run build` 通过
5. 页面正确登记在 `pages.manifest.json`

## 10. 推荐阅读顺序

1. 本文档
2. [architecture.md](./architecture.md)
3. [admin-development-manual.md](./admin-development-manual.md)
4. [codex-workflow.md](./codex-workflow.md)
