# IntelliHealthCare Frontend Workspace

这个仓库不是一次性把所有页面写完，而是先把团队协作和 AI 协作的骨架固定下来。

## 目标

- 每个成员只维护自己的页面目录，互不干扰。
- 每个页面都能独立预览、独立验证。
- 用户端和后台端都能做整体验证。
- 使用 Codex 时，每个页面都遵守统一的输入输出接口。

## 目录

```text
apps/
  user-mobile/      用户端预览壳
  admin-console/    后台端预览壳
packages/
  page-core/        页面契约与共享类型
scripts/
  dev-page.mjs      按页面启动
  dev-all.mjs       同时启动双端
  create-page.mjs   生成标准页面目录
  codex-prompt.mjs  生成 Codex 提示词
docs/
  architecture.md
  codex-workflow.md
```

## 快速开始

```bash
npm install
npm run dev:user
```

单页预览：

```bash
npm run dev:page -- --app user-mobile --page health-data/overview
npm run dev:page -- --app admin-console --page elder-profile/list
```

双端联调：

```bash
npm run dev:all
```

创建新页面：

```bash
npm run create:page -- --app user-mobile --module service-order --page list --title "服务下单列表" --owner "张三"
```

生成给 Codex 的统一提示词：

```bash
npm run prompt:page -- --app user-mobile --page health-data/overview
```

## 页面约定

每个页面必须放在固定目录中：

```text
src/pages/<module>/<page>/
  page.spec.json
  page.mocks.ts
  page.tsx
```

- `page.spec.json`：页面身份、路由、原型引用、负责人、状态。
- `page.mocks.ts`：本页独立调试用 mock 场景。
- `page.tsx`：页面实现，默认导出 `definePageModule(...)`。

## 推荐协作方式

1. 先用 `create:page` 创建目录。
2. 成员只修改自己负责的页面目录。
3. 本地先跑 `dev:page` 验证单页。
4. 再跑 `dev:user` 或 `dev:admin` 验证集成效果。
5. 如果使用 Codex，先用 `prompt:page` 生成统一提示词。

详细说明见 [docs/architecture.md](./docs/architecture.md) 和 [docs/codex-workflow.md](./docs/codex-workflow.md)。

