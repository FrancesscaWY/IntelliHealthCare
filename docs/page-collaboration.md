# 页面协作说明

页面元信息的主数据源已经统一收敛到两个清单文件：

- `apps/user-web/src/app/pages.manifest.json`
- `apps/admin-web/src/app/pages.manifest.json`

这两个文件负责维护页面标题、摘要、负责人、状态、目录路径和运行入口。整理后，页面目录只保留运行必需文件，目录内 `README.md` 改为按需存在。

## 最小页面目录

```text
apps/<app>/src/pages/<domain>/<page>/
  Page.vue
  mock.ts
  README.md   # 可选
```

- `Page.vue`：当前页面的结构、交互和局部状态
- `mock.ts`：单页调试数据
- `README.md`：仅在需要补充额外交接信息时保留

## 什么时候保留 README

以下情况建议保留页面或分组目录下的 `README.md`：

- 该目录需要解释一组子页面的关系
- 页面存在特殊运行入口、迁移说明或联调注意事项
- 需要补充 manifest 摘要无法承载的长说明

如果只是记录页面标题、负责人和一句摘要，应直接写入 `pages.manifest.json`，不要重复维护目录内 README。

## 新页面脚手架

默认脚手架现在只生成运行所需文件：

```bash
npm run create:page -- --group health --page health-data --title "健康数据"
npm run create:admin-page -- --group elder --page member-list --title "长者档案"
```

如确实需要额外目录说明，再显式追加：

```bash
npm run create:page -- --group health --page health-data --title "健康数据" --with-readme
```

## 校验规则

- 已实现页面必须包含 `Page.vue` 和 `mock.ts`
- 未实现页面至少需要 `Page.vue`、`README.md` 或 manifest 中的有效 `summary`
- 页面是否可运行，以 `pages.manifest.json` 是否登记为准
