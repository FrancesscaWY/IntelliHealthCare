# 页面目录约定

每个页面以 `apps/user-web/src/pages/<domain>/<page>/` 为最小开发单元。

已实现页面：

- `Page.vue`：页面结构、状态和交互逻辑
- `mock.ts`：单页调试数据

规划中页面：

- `README.md`：记录页面职责与后续开发入口

推荐协作方式：

- 每位成员只负责自己页面目录
- 先补 `mock.ts` 再写交互
- 公共能力优先抽到 `packages/page-core`
