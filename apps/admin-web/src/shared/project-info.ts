export const projectInfo = {
  name: "智诊康养—后台端",
  summary: "面向健康服务、护理调度与机构运营的后台管理工作台。",
  delivery: "后台工作区基于 Vue 3、TypeScript 与 Vite 构建。",
  homePageId: "auth/login",
  prototypeUrl: "https://www.axureshop.com/ys/2296569",
  featureHighlights: ["登录入口", "工作台", "用户管理", "订单管理", "健康预警", "数据分析", "系统设置"],
};

export const groupMeta: Record<string, { title: string; description: string }> = {
  auth: {
    title: "登录认证",
    description: "后台账号登录、角色切换与入口校验。",
  },
  dashboard: {
    title: "首页",
    description: "工作台总览、经营指标与核心数据看板。",
  },
  elder: {
    title: "用户管理",
    description: "用户档案、健康标签与预约服务信息。",
  },
  service: {
    title: "服务",
    description: "服务人员、工单执行、佣金与打赏等服务侧运营管理。",
  },
  health: {
    title: "健康管理",
    description: "标签分布、预警事件与慢病人群跟踪。",
  },
  device: {
    title: "设备中心",
    description: "设备在线、巡检任务与结算信息。",
  },
  content: {
    title: "内容运营",
    description: "活动运营、消息触达与专题配置。",
  },
  community: {
    title: "社区互动",
    description: "活动管理、动态内容与社区服务数据。",
  },
  staff: {
    title: "人员管理",
    description: "服务人员排班、绩效和审核流程。",
  },
  analytics: {
    title: "数据分析",
    description: "趋势、榜单与经营统计分析。",
  },
  system: {
    title: "系统设置",
    description: "账号权限、角色配置与消息规则。",
  },
};

export const pageMeta: Record<string, { title: string; summary: string; shortTitle?: string }> = {
  "analytics/data-board": {
    title: "用户概况",
    shortTitle: "数据分析",
    summary: "查看用户新增趋势、年龄结构和性别分布。",
  },
  "analytics/user-age": {
    title: "用户年龄分析",
    shortTitle: "数据分析",
    summary: "查看用户年龄段构成和占比统计。",
  },
  "analytics/user-gender": {
    title: "用户性别分析",
    shortTitle: "数据分析",
    summary: "查看用户性别构成和占比统计。",
  },
  "analytics/user-social": {
    title: "用户社交统计",
    shortTitle: "数据分析",
    summary: "查看用户社交行为、阅读量和互动指标。",
  },
  "analytics/trade-overview": {
    title: "交易概况",
    shortTitle: "数据分析",
    summary: "查看浏览、下单、支付和退款的交易转化表现。",
  },
  "analytics/product-analysis": {
    title: "产品分析",
    shortTitle: "数据分析",
    summary: "查看产品浏览、支付、收藏和分享表现。",
  },
  "analytics/service-workorder": {
    title: "工单分析",
    shortTitle: "数据分析",
    summary: "查看服务工单分布、人员执行和状态表现。",
  },
  "analytics/service-repurchase": {
    title: "复购分析",
    shortTitle: "数据分析",
    summary: "查看复购用户、购买次数和客单价表现。",
  },
  "analytics/service-performance": {
    title: "业绩统计",
    shortTitle: "数据分析",
    summary: "查看服务人员订单金额、佣金和收入统计。",
  },
  "analytics/service-review": {
    title: "评价统计",
    shortTitle: "数据分析",
    summary: "查看服务人员评价、满意度和参评量统计。",
  },
  "auth/login": {
    title: "登录页",
    summary: "角色选择登录与后台工作台入口。",
  },
  "content/mass-message": {
    title: "消息群发",
    summary: "管理群发消息的筛选、发送通道和操作记录。",
  },
  "content/mass-message-create": {
    title: "新增消息",
    summary: "配置群发消息名称、接收人、发送时间和消息内容。",
  },
  "dashboard/overview": {
    title: "首页",
    shortTitle: "工作台",
    summary: "首页工作台、统计卡、标签分布与趋势排行。",
  },
  "dashboard/booking-board": {
    title: "预约看板",
    shortTitle: "工作台",
    summary: "按时间轴查看预约安排、服务人员和服务状态。",
  },
  "dashboard/session": {
    title: "会话",
    shortTitle: "工作台",
    summary: "查看客服会话、聊天记录和客户订单资料。",
  },
  "dashboard/order-list": {
    title: "全部订单",
    shortTitle: "工作台",
    summary: "查看订单筛选、状态分组和订单操作信息。",
  },
  "dashboard/order-detail": {
    title: "订单详情",
    shortTitle: "工作台",
    summary: "按订单状态查看用户信息、预约信息、商品明细与处理动作。",
  },
  "dashboard/work-order": {
    title: "工单管理",
    shortTitle: "工作台",
    summary: "查看服务工单、派单时间和服务人员安排。",
  },
  "dashboard/review-management": {
    title: "审核管理",
    shortTitle: "工作台",
    summary: "查看审核状态、申请时间和审核处理信息。",
  },
  "dashboard/review-detail": {
    title: "审核详情",
    shortTitle: "工作台",
    summary: "查看服务人员审核资料、实名信息与审核处理动作。",
  },
  "dashboard/after-sale": {
    title: "售后管理",
    shortTitle: "工作台",
    summary: "查看退款金额、售后状态和售后处理信息。",
  },
  "dashboard/after-sale-detail": {
    title: "售后详情",
    shortTitle: "工作台",
    summary: "查看售后详情、退款申请信息与关联订单处理状态。",
  },
  "dashboard/comment-management": {
    title: "评价管理",
    shortTitle: "工作台",
    summary: "查看评价筛选、评分分布、显示状态与置顶处理信息。",
  },
  "device/device-monitor": {
    title: "设备监控",
    summary: "查看设备在线、巡检任务和结算信息。",
  },
  "elder/member-list": {
    title: "全部用户",
    summary: "查看用户列表、档案标签和服务信息。",
  },
  "elder/report-management": {
    title: "报告管理",
    summary: "管理体检报告、上传来源和关联工单信息。",
  },
  "health/alert-center": {
    title: "健康预警",
    summary: "查看健康标签、异常提醒和跟踪记录。",
  },
  "service/staff-management": {
    title: "服务人员管理",
    summary: "管理服务人员列表、标签、加入方式和启用状态。",
  },
  "service/review-management": {
    title: "审核管理",
    summary: "查看服务人员审核状态、申请时间和审核处理信息。",
  },
  "service/review-detail": {
    title: "审核详情",
    summary: "查看服务人员审核资料、实名信息与审核处理动作。",
  },
  "service/product-management": {
    title: "商品管理",
    summary: "合并家政护理、上门体检和康复理疗的商品管理列表页。",
  },
  "service/product-editor": {
    title: "新增商品信息",
    summary: "商品基础信息、参数设置与售卖信息编辑页。",
  },
  "staff/caregiver-roster": {
    title: "人员管理",
    summary: "管理服务人员、排班信息与绩效排行。",
  },
  "system/account-settings": {
    title: "账号设置",
    summary: "维护账号资料、角色权限与系统偏好。",
  },
  "system/reset-password": {
    title: "重置密码",
    summary: "修改旧密码并设置新的登录密码。",
  },
  "system/role-management": {
    title: "角色管理",
    summary: "查看角色列表、员工人数、启停状态与批量操作。",
  },
};

export const railGroupOrder = ["dashboard", "elder", "service", "health", "device", "analytics", "system"] as const;
