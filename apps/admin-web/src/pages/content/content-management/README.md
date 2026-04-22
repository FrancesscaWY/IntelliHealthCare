# 内容管理

- 页面 id：`content/content-management`
- 页面目录：`apps/admin-web/src/pages/content/content-management`
- 负责人：后台组

开发约定：
- 在 `Page.vue` 中编写页面结构和交互。
- 在 `mock.ts` 中维护单页调试数据。
- 如果需要复用能力，优先抽到 `packages/page-core`。
