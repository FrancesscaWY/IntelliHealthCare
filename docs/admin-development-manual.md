# 后台端开发手册

这份文档用于说明后台端 `apps/admin-web` 的页面结构、运行入口和首批信息架构。

## 1. 应用定位

后台端面向：

- 机构运营
- 护理与医生团队
- 健康管理与预警处理
- 内容与活动运营
- 系统管理员

当前采用与 APP 端一致的开发模式：

- 同样的技术栈
- 同样的页面目录约定
- 同样的整站/单页预览机制
- 同样的脚手架和校验入口

## 2. 运行入口

整站预览：

```bash
npm run dev:admin
```

默认进入后台登录页 `auth/login`。

单页预览：

```bash
npm run dev:admin:page -- --page auth/login
```

推荐单页调试的页面示例：

```bash
npm run dev:admin:page -- --page elder/member-list
npm run dev:admin:page -- --page dashboard/order-list
npm run dev:admin:page -- --page health/alert-center
```

## 3. 当前页面清单

已搭建的首批后台页面：

- `auth/login`：登录页
- `dashboard/overview`：后台首页
- `elder/member-list`：长者档案
- `dashboard/order-list`：全部订单
- `health/alert-center`：健康预警
- `device/device-monitor`：设备监控
- `content/content-management`：内容管理
- `community/activity-management`：活动管理
- `staff/caregiver-roster`：人员排班
- `analytics/data-board`：数据看板
- `system/account-settings`：账号设置

对应页面清单位于：

```text
apps/admin-web/src/app/pages.manifest.json
```

## 4. 页面目录规范

每个后台页面固定放在：

```text
apps/admin-web/src/pages/<domain>/<page>/
  Page.vue
  mock.ts
  README.md
```

约定和 APP 端一致：

- `Page.vue` 只关注当前页面实现
- `mock.ts` 提供单页预览数据
- `README.md` 记录页面职责和协作说明

## 5. 当前后台信息架构

本次首批结构参考了 AxureShop 的“智慧养老后台管理系统高保真原型模版 v1.3”，并结合现有 APP 端业务域做了对齐整理。

当前拆分出的业务域：

- `dashboard`：运营总览
- `elder`：长者管理
- `service`：服务调度
- `health`：健康监测与预警
- `device`：设备中心
- `content`：内容运营
- `community`：活动运营
- `staff`：人员与排班
- `analytics`：数据分析
- `system`：系统配置

这是一版初步开发结构，后续可以继续细化为列表页、详情页、审核页和配置页。

## 6. 新增后台页面

新增后台页时，统一使用：

```bash
npm run create:admin-page -- --group <group> --page <page> --title "<title>" --owner "<owner>"
```

示例：

```bash
npm run create:admin-page -- --group elder --page profile-detail --title "长者详情" --owner "后台组"
```

## 7. 联调前建议

在开始接接口前，先确保：

1. 单页预览可独立打开
2. `mock.ts` 数据字段已经稳定
3. 页面布局已经在桌面端与窄屏下完成基本适配
4. `npm run check:admin` 通过
5. 必要时 `npm run build:admin` 通过
