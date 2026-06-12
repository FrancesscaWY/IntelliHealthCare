# 成员协作开发手册

本文档是 IntelliHealthCare 当前唯一的成员协作开发主手册，基于仓库在 `2026-04-21` 的实际结构、脚本和页面清单整理。

以下文档的协作开发内容已统一并入本文：

- `docs/page-collaboration.md`
- `docs/codex-workflow.md`
- `docs/admin-development-manual.md`
- 原 `docs/member-development-manual.md`

本文档的目标只有四个：

1. 给新成员一个统一入口，快速理解当前仓库的协作方式
2. 明确页面开发、脚手架、清单、验证和交付的统一约束
3. 给 Codex 协作提供稳定边界和最小上下文模板
4. 避免“脚手架、页面清单、文档、命令说明”长期不一致

## 1. 当前协作基线

当前仓库的协作约束如下：

- 当前主要开发对象是网页工作区，不是小程序
- 仓库同时维护用户端、后台端和后端三个工作区
- 前后端统一使用 `TypeScript`
- 前端页面目录是最小协作单元
- 老人和家属共用同一套用户端工作区，不单独拆成两个前端应用
- 页面主数据源是 `pages.manifest.json`，不是页面目录下的 `README.md`

当前页面清单状态：

- 用户端 `apps/user-web/src/app/pages.manifest.json`：`82` 个页面，全部为 `implemented`
- 后台端 `apps/admin-web/src/app/pages.manifest.json`：`2` 个页面，当前为 `auth/login` 和 `dashboard/overview`

## 2. 仓库怎么分工

你日常最常接触的目录通常是：

```text
apps/
packages/page-core/
docs/
scripts/
```

主要职责如下：

### 2.1 用户端工作区

```text
apps/user-web/
```

定位：

- 面向长者与家属的统一用户侧入口
- 使用移动端页面壳承载业务页面
- 单页调试和整站调试共用同一套运行时

### 2.2 后台端工作区

```text
apps/admin-web/
```

定位：

- 面向运营、护理、医生和机构管理人员
- 使用桌面端工作台壳承载页面
- 当前已正式登记页面较少，未登记原型目录不会进入运行时加载

### 2.3 后端工作区

```text
apps/backend/
```

定位：

- 提供统一业务 API
- 承接数据库、Redis、BullMQ、对象存储和 Hermes Agent 运行时
- 参与根级 `check` 和 `build`

### 2.4 前端公共运行时

```text
packages/page-core/src/
```

负责：

- 页面类型定义
- 页面状态元数据
- 页面分组和页面 id 工具
- 初始页面解析

## 3. 安装、启动与常用命令

安装依赖：

```bash
npm install
```

### 3.1 整站开发

用户端：

```bash
npm run dev:user
``` 

后台端：

```bash
npm run dev:admin
```

后端：

```bash
npm run dev:backend
```

### 3.2 单页开发

用户端单页：

```bash
npm run dev:page -- --page home/dashboard
```

后台端单页：

```bash
npm run dev:admin:page -- --page dashboard/overview
```

### 3.3 校验与构建

全仓校验：

```bash
npm run check
```

说明：

- 当前 `check` 会同时校验用户端、后台端和 backend

分工作区校验：

```bash
npm run check:user
npm run check:admin
npm run check:backend
```

全仓构建：

```bash
npm run build
```

说明：

- 当前 `build` 会同时构建用户端、后台端和 backend

分工作区构建：

```bash
npm run build:user
npm run build:admin
npm run build:backend
```

### 3.4 页面脚手架与 Codex Prompt

用户端新页面：

```bash
npm run create:page -- --group health --page health-data --title "健康数据" --owner "成员A"
```

后台端新页面：

```bash
npm run create:admin-page -- --group elder --page member-list --title "长者档案" --owner "后台组"
```

如需要额外目录说明，再显式追加：

```bash
--with-readme
```

生成 Codex 提示：

```bash
npm run prompt:page -- --page health/health-data
npm run prompt:admin-page -- --page dashboard/overview
```

## 4. 页面清单与目录契约

页面元信息的唯一主数据源是：

```text
apps/user-web/src/app/pages.manifest.json
apps/admin-web/src/app/pages.manifest.json
```

页面目录最小契约如下：

```text
apps/<app>/src/pages/<domain>/<page>/
  Page.vue
  mock.ts
  README.md   # 可选
```

职责划分：

- `Page.vue`：页面结构、交互和局部状态
- `mock.ts`：单页调试数据
- `README.md`：只在需要额外交接说明时保留
- `pages.manifest.json`：标题、摘要、负责人、状态和加载入口的主数据源

当前约束：

- 已实现页面必须具备 `Page.vue` 和 `mock.ts`
- 页面是否可运行，以 `pages.manifest.json` 是否登记为准
- 如果只是页面标题、负责人、摘要变更，应优先改 manifest，而不是在目录内补 README

## 5. 什么时候保留页面 README

以下情况建议保留页面或分组目录下的 `README.md`：

- 该目录需要解释一组子页面之间的关系
- 页面存在特殊运行入口、迁移说明或联调注意事项
- 需要补充 manifest 摘要无法承载的长说明

以下情况不建议保留：

- 只记录页面标题
- 只记录负责人
- 只记录一句摘要

这些内容应直接写进 `pages.manifest.json`。

## 6. 推荐协作开发流程

### 6.1 场景 A：页面已经存在

1. 在对应 `pages.manifest.json` 里确认页面 `id`
2. 打开页面目录
3. 先运行单页调试命令
4. 优先补齐或修正 `mock.ts`
5. 再实现或调整 `Page.vue`
6. 完成后至少执行对应工作区的 `check`

建议命令：

```bash
npm run dev:page -- --page <page-id>
npm run check:user
```

后台页对应为：

```bash
npm run dev:admin:page -- --page <page-id>
npm run check:admin
```

### 6.2 场景 B：页面还不存在

1. 先执行脚手架命令
2. 确认页面目录和 manifest 条目已生成
3. 在 `mock.ts` 中补充可独立预览的数据
4. 在 `Page.vue` 中实现页面结构和本地交互
5. 如有特殊交接事项，再决定是否保留 `README.md`
6. 完成后执行对应工作区的 `check`

## 7. 页面内与公共层的边界

优先留在页面目录内的情况：

- 逻辑只服务当前页面
- 暂时没有第二个复用场景
- 只是局部样式和交互调整

优先提取到公共层的情况：

- 两个及以上页面开始复用
- 属于页面元信息、导航、状态处理
- 是跨工作区可能复用的工具函数

一般规则：

- 页面运行时工具和类型放 `packages/page-core`
- 应用内通用组件放 `apps/<app>/src/components`
- 不要借页面任务顺手大面积重构无关公共层

## 8. Codex 协作规则

Codex 在当前仓库最适合承担的任务包括：

- 新建页面骨架
- 完成页面静态结构和本地交互
- 提取直接相关的公共组件
- 调整页面清单与脚手架
- 修复构建、类型检查或脚本问题

默认边界应尽量收敛在：

- 当前页面目录
- 直接相关的公共组件
- `packages/page-core`
- 与当前任务相关的文档

### 8.1 给 Codex 的最小上下文

至少提供：

- 页面 id，例如 `health/health-data`
- 目标目录或文件
- 是否允许修改 `packages/page-core`
- 是否允许修改 `apps/<app>/src/components`
- 期望执行的验证命令

推荐补充：

- 参考原型来源
- 是否优先复用现有组件
- 是否只做静态稿，还是需要本地交互

### 8.2 Codex 允许修改的公共区域

确有必要时，可允许修改：

```text
packages/page-core/src/
apps/user-web/src/components/
apps/admin-web/src/components/
apps/<app>/src/app/
scripts/
```

前提是：

- 改动与当前任务直接相关
- 能解释为什么页面目录内无法自洽解决
- 不借任务名义顺手重构无关区域

### 8.3 推荐提示词模板

用户端页面示例：

```text
请在 IntelliHealthCare 中完成页面 health/health-data。
只修改 apps/user-web/src/pages/health/health-data，必要时允许修改 packages/page-core。
页面需要兼容单页调试，不接真实 API，先完成静态结构和本地交互。
完成后请执行 npm run check:user，并说明验证结果。
```

后台端页面示例：

```text
请在 IntelliHealthCare 中完成后台页面 dashboard/overview。
只修改 apps/admin-web/src/pages/dashboard/overview，必要时允许修改 packages/page-core。
页面需要兼容 npm run dev:admin:page -- --page dashboard/overview 的单页调试。
完成后请执行 npm run check:admin，并说明验证结果。
```

### 8.4 不推荐的使用方式

- 只说“帮我改一下页面”，不给页面 id
- 不说明是否允许改共享模块
- 已指定单页任务，却让 Codex 顺手重构整个项目
- 页面尚未建目录，却不先创建脚手架
- 不做最基本的 `check` 或 `build` 验证

## 9. 联调、提交与交付前检查

页面类任务至少确认：

1. 对应页面可通过单页模式打开
2. 对应工作区能正常整站启动
3. 对应工作区 `check` 通过
4. 必要时对应工作区 `build` 通过
5. 页面已正确登记在 `pages.manifest.json`

如果改动涉及根级脚本、共享运行时或 backend，再补充：

1. `npm run check`
2. 必要时 `npm run build`
3. 对应文档同步更新

## 10. 文档维护原则

以下情况必须同步更新本文档或关联文档：

- 页面目录约定变化
- 页面脚手架行为变化
- `pages.manifest.json` 职责变化
- 根脚本或单页调试命令变化
- Codex 协作边界变化
- 团队协作方式变化

原因很直接：当前仓库是“脚手架 + 页面清单 + 运行时 + 文档”强耦合结构，文档落后会很快误导后续开发。

## 11. 延伸阅读

建议阅读顺序：

1. 本文档
2. [项目架构文档.md](./项目架构文档.md)
3. [backend-architecture.md](./backend-architecture.md)
4. [user-web-analysis-and-api.md](./user-web-analysis-and-api.md)
5. [intellihealthcare-multi-agent-blueprint.md](./intellihealthcare-multi-agent-blueprint.md)

## 12. 一句话原则

当前仓库最重要的协作原则不是“多写文档”，而是始终保持页面目录、页面清单、脚手架命令、运行时行为和协作文档使用同一套口径。
