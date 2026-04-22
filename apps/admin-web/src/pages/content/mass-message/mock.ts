const statusOptions = ["全部状态", "待发送", "已发送", "审批中", "已撤回"] as const;

const rows = [
  {
    id: "msg-1",
    sendTime: "2026-04-20 09:20",
    title: "春季健康服务上新提醒",
    status: "已发送",
    content: "春季护理、上门理疗与康复评估服务已开放预约，点击查看详情。",
    receiver: "全部用户",
    channel: "系统消息",
  },
  {
    id: "msg-2",
    sendTime: "2026-04-20 14:35",
    title: "会员福利领取通知",
    status: "待发送",
    content: "本周会员权益已更新，请前往个人中心领取专属优惠券。",
    receiver: "部分用户",
    channel: "短信",
  },
  {
    id: "msg-3",
    sendTime: "2026-04-19 10:10",
    title: "服务工单进度提醒",
    status: "审批中",
    content: "您近期预约的上门服务已进入派单流程，请留意接单信息。",
    receiver: "全部用户",
    channel: "会话消息",
  },
  {
    id: "msg-4",
    sendTime: "2026-04-19 16:40",
    title: "康复课程复购优惠通知",
    status: "已撤回",
    content: "康复理疗课程复购活动已开启，复购可享受专属折扣。",
    receiver: "部分用户",
    channel: "系统消息",
  },
  {
    id: "msg-5",
    sendTime: "2026-04-18 11:25",
    title: "体检套餐预约提醒",
    status: "已发送",
    content: "近期体检套餐预约较多，请尽快选择日期并完成预约。",
    receiver: "全部用户",
    channel: "系统消息",
  },
  {
    id: "msg-6",
    sendTime: "2026-04-18 17:15",
    title: "积分到账通知",
    status: "待发送",
    content: "您的服务积分已更新，可在积分商城兑换健康服务商品。",
    receiver: "部分用户",
    channel: "短信",
  },
];

const mock = {
  title: "消息群发",
  statusOptions,
  rows,
};

export default mock;
