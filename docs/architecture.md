# 架构说明

## 1. 为什么先搭网页端应用骨架

智诊康养后续要封装成 App 和小程序，但当前团队协作最需要的是：

- 有一个统一的网页端开发入口
- 有一个可以只盯单页面的调试入口
- 页面目录和职责足够清晰，不会互相踩文件
- 现有原型代码不丢，后续还能回看

所以现在采用：

- `apps/user-web` 作为当前主开发应用
- `legacy/miniprogram-user` 保留已有小程序页面实现
- `packages/page-core` 作为当前共享运行时

## 2. 页面目录即最小协作单元

每个页面固定放在：

```text
apps/user-web/src/pages/<domain>/<page>/
```

建议文件：

1. `page.js`：页面结构与交互
2. `mock.js`：单页调试数据
3. `README.md`：业务职责、边界、协作说明

这样每个成员拿到一个页面后，第一眼就知道代码该写在哪里。

## 3. 两种开发测试方案

### 整站入口

命令：

```bash
npm run dev:user
```

特点：

- 直接进入整站首页
- 适合看整体页面接入效果
- 可以通过页面内交互继续跳转

### 单页面调试

命令：

```bash
npm run dev:page -- --page home/dashboard
```

特点：

- 只渲染一个页面
- 适合专注做样式、表单、局部交互
- 开发人员无需关注整站导航

## 4. 已实现与待实现页面

当前已接入网页端的页面：

- `onboarding/intro`
- `auth/login`
- `home/dashboard`
- `community/circle`
- `community/publish`

其他业务模块已建立清晰目录占位，例如：

- `service/home-care`
- `health/health-data`
- `content/health-news`
- `archive/health-records`
- `orders/order-management`

## 5. 共享能力放哪里

当前可复用能力放在 `packages/page-core`：

- 页面状态徽标
- 底部导航渲染
- 单页样式注入
- toast 提示
- 页面 id 规范化

如果后续出现真正复用的业务组件，也继续先放这里，再考虑拆得更细。

## 6. 现有小程序代码怎么处理

原来的主页、登录页、生活圈等代码已经整体挪到：

```text
legacy/miniprogram-user/
```

作用：

- 保留已有成果
- 作为网页端重构时的业务与视觉参考
- 避免旧代码和新骨架继续缠在一起
