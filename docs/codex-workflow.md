# Codex 协作规范

## 1. 推荐流程

1. 先确认目标页面在 `apps/user-web/src/pages/<domain>/<page>/`
2. 如果目录不存在，先运行 `npm run create:page ...`
3. 先补 `mock.js`，确保可以单页调试
4. 用 `npm run dev:page -- --page <page-id>` 做页面开发
5. 再用 `npm run dev:user` 看整站接入效果

## 2. 给 Codex 的最小上下文

至少提供以下信息：

- 页面 id，例如 `health/health-data`
- 页面目录
- `page.js` 位置
- `mock.js` 位置
- 是否允许改 `packages/page-core`
- 验证命令

## 3. 允许的修改范围

默认只允许修改：

- 当前页面目录
- 确有必要的 `packages/page-core`
- 文档中与该页面直接相关的说明

不要顺手重构整个项目。

## 4. 推荐命令

生成页面脚手架：

```bash
npm run create:page -- --group health --page blood-pressure --title "血压监测"
```

生成页面提示词：

```bash
npm run prompt:page -- --page health/health-data
```

## 5. 页面完成后的最低验证

- 单页预览通过
- 整站首页能正常打开
- mock 数据仍然可用
- 页面目录和 manifest 一致
