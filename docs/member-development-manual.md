# 成员开发手册

这份手册面向第一次进入 IntelliHealthCare 仓库的成员，帮助你快速理解当前代码结构、启动方式和页面开发流程。

## 1. 先知道这些

- 当前主开发端是网页端，不是小程序端
- 网页端基于 `Vue 3 + TypeScript + Vite`
- 历史小程序代码保留在 `legacy/miniprogram-user/`
- 页面协作以“页面目录”为最小单元

如果你只负责业务页面开发，日常主要会接触：

```text
apps/user-web/
packages/page-core/
docs/
```

## 2. 安装与启动

建议环境：

- `Node.js >= 20`
- `npm >= 10`

安装依赖：

```bash
npm install
```

启动整站预览：

```bash
npm run dev:user
```

启动单页预览：

```bash
npm run dev:page -- --page home/dashboard
```

建议在浏览器开发者工具中切换到移动端设备模式，并按 `390 x 844` 进行调试。

## 3. 常用命令速查

```bash
npm run dev:user
```

- 启动整站开发模式

```bash
npm run dev:page -- --page auth/login
```

- 启动某个页面的单页预览

```bash
npm run check
```

- 运行页面目录校验与 TypeScript 类型检查

```bash
npm run build
```

- 构建生产包

```bash
npm run create:page -- --group health --page blood-pressure --title "血压监测" --owner "成员A"
```

- 创建新页面脚手架并登记到清单

## 4. 仓库目录怎么理解

### 业务页面

```text
apps/user-web/src/pages/
```

所有业务页面都放在这里，按 `领域/页面` 组织。

### 应用壳与运行时装配

```text
apps/user-web/src/app/
```

这里负责：

- 页面清单
- 运行模式解析
- 动态页面加载
- 栈式导航
- Toast 队列

### 公共组件

```text
apps/user-web/src/components/
```

这里放 Vue 组件级别的公共能力，例如：

- 底部导航
- Toast 视图
- 占位页组件

### 共享运行时工具

```text
packages/page-core/src/
```

这里放跨页面可复用、但不强依赖具体页面 UI 的公共逻辑，例如：

- 页面类型定义
- 页面状态元数据
- 页面 id 规范化
- 初始页面解析

### 历史参考代码

```text
legacy/miniprogram-user/
```

这里只用于参考，不再作为主开发目录。

## 5. 页面目录规范

每个页面固定放在：

```text
apps/user-web/src/pages/<domain>/<page>/
  Page.vue
  mock.ts
  README.md
```

三个文件分别负责：

- `Page.vue`：页面组件实现
- `mock.ts`：本页调试数据
- `README.md`：页面职责、协作说明、特殊注意事项

## 6. 怎么找到自己负责的页面

先查看：

```text
apps/user-web/src/app/pages.manifest.json
```

你可以在这里找到：

- 页面 id
- 页面标题
- 页面分组
- 当前状态
- 页面目录
- 历史原型参考路径

如果页面已经在清单中登记，优先以清单为准，不要自己临时发明新的页面路径。

## 7. 页面开发推荐流程

### 场景 A：页面已经存在

1. 在 `pages.manifest.json` 中找到页面 id
2. 打开对应页面目录
3. 先运行：

```bash
npm run dev:page -- --page <page-id>
```

4. 优先补 `mock.ts`
5. 再完善 `Page.vue`
6. 完成后验证：

```bash
npm run check
npm run build
```

### 场景 B：页面还不存在

1. 先运行：

```bash
npm run create:page -- --group <group> --page <page> --title "<title>" --owner "<owner>"
```

2. 确认脚手架已经生成
3. 在 `mock.ts` 中补充调试数据
4. 在 `Page.vue` 中实现页面
5. 再执行 `npm run check`

## 8. 什么时候改页面内，什么时候改公共层

优先在页面内解决问题的情况：

- 当前逻辑只服务于一个页面
- 还没有第二个复用场景
- 只是局部样式和交互调整

优先提取到公共层的情况：

- 两个及以上页面已经在复用同一段逻辑
- 是页面导航、页面状态或清单处理相关逻辑
- 是通用 Vue 组件，不属于某一个业务页面

一般来说：

- 工具与类型进 `packages/page-core`
- 通用 Vue 组件进 `apps/user-web/src/components`

## 9. 提交前检查清单

提交前至少确认：

1. 页面可通过 `npm run dev:page -- --page <page-id>` 正常打开
2. 整站可通过 `npm run dev:user` 正常启动
3. `npm run check` 通过
4. 必要时 `npm run build` 通过
5. 页面仍正确登记在 `pages.manifest.json`
6. 没有顺手改动无关页面

## 10. 常见问题

### `npm install` 失败

优先检查用户级 `.npmrc` 是否配置了失效代理，例如：

```text
C:\Users\<用户名>\.npmrc
```

如果里面存在：

```ini
proxy=http://127.0.0.1:10809
https-proxy=http://127.0.0.1:10809
```

但本地代理程序没有启动，就会导致 `ECONNREFUSED`。

### `npm run dev:user` 在 Windows 报 `spawn EINVAL`

当前脚本已兼容 Windows，会通过 `cmd.exe /c npm ...` 启动子进程。若仍出错，优先确认：

- `npm` 本身是否可在当前终端执行
- `node` 和 `npm` 版本是否正常
- 本地是否有异常 shell 或代理注入

## 11. 推荐阅读顺序

如果你刚加入项目，建议按下面顺序阅读：

1. 本文档
2. [architecture.md](./architecture.md)
3. [codex-workflow.md](./codex-workflow.md)
