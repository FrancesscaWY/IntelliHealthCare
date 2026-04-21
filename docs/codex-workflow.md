# Codex 协作规范

本文档说明如何在当前 IntelliHealthCare 架构下，让 Codex 高效、稳定地参与页面开发和局部重构。

## 1. 适用范围

当前仓库中，Codex 主要服务于以下任务：

- 新建页面骨架
- 完成某个页面的静态结构与本地交互
- 提取公共组件
- 调整页面清单与脚手架
- 修复构建、类型检查或脚本问题

默认情况下，Codex 的工作边界应当尽量收敛在：

- 当前页面目录
- 直接相关的公共组件
- `packages/page-core`
- 与任务相关的文档

## 2. 推荐使用流程

### 场景 A：页面已经存在

1. 先确认页面 id，例如 `auth/login`
2. 打开对应目录 `apps/user-web/src/pages/<domain>/<page>/`
3. 运行单页预览：

```bash
npm run dev:page -- --page auth/login
```

4. 让 Codex 在当前页面目录中完成改动
5. 完成后再跑：

```bash
npm run check
npm run build
```

### 场景 B：页面尚未创建

1. 先创建页面脚手架：

```bash
npm run create:page -- --group health --page blood-pressure --title "血压监测" --owner "成员A"
```

2. 确认脚手架生成：

- `Page.vue`
- `mock.ts`
- 页面清单条目
- 可选的 `README.md`（仅在使用 `--with-readme` 时生成）

3. 再让 Codex 基于该目录继续实现页面

## 3. 给 Codex 的最小上下文

如果你希望 Codex 高效完成任务，至少给出以下信息：

- 页面 id，例如 `health/health-data`
- 目标文件或目录
- 是否允许修改 `packages/page-core`
- 是否允许修改 `apps/user-web/src/components`
- 期望验证命令

推荐补充的信息：

- 参考原型来源
- 是否优先复用现有组件
- 是否只做静态稿，还是要做本地交互

## 4. 当前页面开发契约

Codex 在新增或修改页面时，应遵守当前目录契约：

```text
apps/user-web/src/pages/<domain>/<page>/
  Page.vue
  mock.ts
  README.md   # 可选
```

约束如下：

- `Page.vue` 负责页面结构、状态和交互
- `mock.ts` 负责本页调试数据
- `pages.manifest.json` 是页面摘要、负责人和运行入口的主数据源
- 页面组件应兼容 `PageComponentProps`
- 页面应支持 `npm run dev:page -- --page <page-id>` 单独调试

## 5. 允许修改的公共区域

当确有必要时，Codex 可以修改：

```text
packages/page-core/src/
apps/user-web/src/components/
apps/user-web/src/app/
scripts/
```

但前提是：

- 改动与当前任务直接相关
- 能解释清楚为什么页面内无法自洽解决
- 不要借任务名义顺手大面积重构无关区域

## 6. 推荐验证方式

Codex 完成改动后，至少应验证：

```bash
npm run check
```

必要时继续验证：

```bash
npm run build
```

如果是页面类任务，建议额外验证：

```bash
npm run dev:page -- --page <page-id>
npm run dev:user
```

## 7. 什么时候适合让 Codex 改文档

以下情况建议同步更新文档：

- 页面目录约定发生变化
- 开发脚本和构建脚本行为变化
- 共享模块职责变化
- 团队协作方式发生变化

尤其是在当前仓库这种“脚手架 + 页面清单 + 文档”强关联的结构里，代码和文档不一致会很快造成误导。

## 8. 推荐提示词模板

你可以直接使用下面这种输入方式：

```text
请在 IntelliHealthCare 中完成页面 auth/login。
只修改 apps/user-web/src/pages/auth/login，必要时允许修改 packages/page-core。
页面需要兼容单页调试，不接真实 API，先完成静态结构和本地交互。
完成后请执行 npm run check，并说明验证结果。
```

如果页面已在清单中登记，也可以先运行：

```bash
npm run prompt:page -- --page auth/login
```

把生成内容直接交给 Codex。

## 9. 不推荐的使用方式

以下方式通常会让结果变差：

- 只说“帮我改一下页面”，不给页面 id
- 不说明是否允许改共享模块
- 已经指定单页任务，却让 Codex 顺手重构整个项目
- 页面尚未建目录，却不先创建脚手架
- 不做最基本的 `check/build` 验证

## 10. 一句话原则

Codex 在这个项目中最适合做的事，不是替代团队思考，而是基于清晰边界把页面和公共能力快速落地，并保持代码、脚手架和文档始终一致。
