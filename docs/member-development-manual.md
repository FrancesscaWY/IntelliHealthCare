# 成员开发手册

## 1. 你先要知道的事

- 当前主开发端是网页端，不是小程序端
- 已有小程序原型代码保留在 `legacy/miniprogram-user/`
- 日常开发只需要关心 `apps/user-web/`
- 每个人尽量只负责自己分到的页面目录

## 2. 日常开发最常用的命令

安装依赖后，最常用的是下面 4 个命令：

```bash
npm run dev:user
```

作用：

- 直接打开整站首页
- 适合看整体接入效果

```bash
npm run dev:page -- --page home/dashboard
```

作用：

- 只打开一个页面
- 适合专注做样式、交互和局部联调

```bash
npm run create:page -- --group health --page blood-pressure --title "血压监测" --owner "成员A"
```

作用：

- 自动创建新的页面目录和基础文件

```bash
npm run check
```

作用：

- 校验页面目录和 `pages.manifest.json` 是否一致

## 3. 项目目录怎么找

### 业务代码

```text
apps/user-web/src/pages/
```

这里是所有页面的主目录。

### 共享能力

```text
packages/page-core/src/
```

这里放可复用的公共运行时能力，例如：

- 底部导航
- toast 提示
- 页面占位渲染
- 页面 id 处理

### 旧原型参考

```text
legacy/miniprogram-user/
```

如果你要参考之前的小程序页面结构和视觉，可以来这里看，但不要继续在这里做新开发。

## 4. 页面目录规范

每个页面固定放在：

```text
apps/user-web/src/pages/<domain>/<page>/
  page.js
  mock.js
  README.md
```

三个文件分别负责：

- `page.js`：页面结构、事件、页面渲染逻辑
- `mock.js`：本页调试数据
- `README.md`：页面职责、边界、开发说明

## 5. 怎么找到自己要写的页面

先打开：

```text
apps/user-web/src/app/pages.manifest.json
```

这里是整站页面清单，能看到：

- 页面 id
- 页面标题
- 分组
- 当前状态
- 页面目录
- 是否已经有历史原型参考

如果你被分配的是“健康数据”，先找 `health/health-data`，再去对应目录开发。

## 6. 推荐开发流程

### 场景 A：页面已经存在

1. 在 `pages.manifest.json` 里找到页面 id
2. 打开对应页面目录
3. 先运行 `npm run dev:page -- --page <page-id>`
4. 在浏览器开发者工具里切到移动端设备模式，按 `390 x 844` 调试
5. 修改 `mock.js` 和 `page.js`
6. 完成后再用 `npm run dev:user` 看整站效果

### 场景 B：页面还不存在

1. 先运行 `npm run create:page ...`
2. 确认脚手架已经生成目录
3. 在 `mock.js` 中先补调试数据
4. 在 `page.js` 中实现页面
5. 运行 `npm run check`

## 7. 团队协作建议

- 不要跨目录顺手改别人的页面
- 如果必须改共享能力，优先改 `packages/page-core`
- 不要把页面私有逻辑直接塞进共享目录
- mock 数据优先放当前页面的 `mock.js`
- 真实接口没接好之前，先保证静态结构和本地交互稳定

## 8. 提交前检查清单

提交前至少确认这几件事：

1. 页面能通过 `npm run dev:page -- --page <page-id>` 正常打开
2. 整站入口 `npm run dev:user` 不受影响
3. `npm run check` 通过
4. 页面仍然在 `pages.manifest.json` 中正确登记
5. 没有误改别人的页面目录

## 9. 当前已经接入网页端的页面

目前能直接运行的页面有：

- `onboarding/intro`
- `auth/login`
- `home/dashboard`
- `community/circle`
- `community/publish`

其他功能模块已经有目录占位，可以继续往下补。

## 10. 如果要让 Codex 帮你写页面

推荐流程：

1. 先确认页面目录
2. 运行 `npm run prompt:page -- --page <page-id>`
3. 把生成的提示词交给 Codex
4. 完成后用单页和整站两种方式验证
