const mock = {
  pendingPaymentSteps: [
    { id: 1, time: "04-16 14:11", title: "订单已提交", active: true },
    { id: 2, time: "待支付", title: "等待支付", desc: "支付完成后将进入排单流程" },
  ],
  awaitingAcceptSteps: [
    { id: 1, time: "04-16 11:08", title: "订单已提交", active: true },
    { id: 2, time: "04-16 11:15", title: "支付成功", active: true },
    { id: 3, time: "排单中", title: "等待接单", desc: "平台正在匹配护理人员" },
  ],
  awaitingServiceSteps: [
    { id: 1, time: "04-15 19:40", title: "订单已提交", active: true },
    { id: 2, time: "04-15 19:46", title: "支付成功", active: true },
    { id: 3, time: "04-15 20:10", title: "已接单", desc: "护理人员已确认服务时间", active: true },
    { id: 4, time: "待上门", title: "等待服务", desc: "请提前准备服务券码" },
  ],
  completedSteps: [
    { id: 1, time: "04-13 17:05", title: "订单已提交", active: true },
    { id: 2, time: "04-13 17:10", title: "支付成功", active: true },
    { id: 3, time: "04-14 09:28", title: "已上门", active: true },
    { id: 4, time: "04-14 11:32", title: "服务完成", desc: "欢迎继续评价本次服务", active: true },
  ],
};

export default mock;
