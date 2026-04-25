import serviceAvatar from "@/assets/content/avatar-liu.jpg";

const mock = {
  service: {
    name: "在线客服",
    title: "康养服务顾问",
    status: "平均1分钟内回复",
    avatar: serviceAvatar,
  },
  serviceTips: [
    { label: "服务时间", value: "08:00 - 22:00" },
    { label: "常见咨询", value: "订单 / 报告 / 到家服务" },
    { label: "当前状态", value: "人工在线" },
  ],
  quickQuestions: [
    "怎么预约上门体检？",
    "订单付款后多久安排服务？",
    "报告怎么看，能帮忙转医生吗？",
    "家政护理服务包含哪些内容？",
  ],
  messages: [
    {
      id: 1,
      from: "service",
      type: "text",
      content: "您好，这里是 IntelliHealthCare 在线客服。请问您需要咨询订单、服务安排，还是报告相关问题？",
      time: "09:18",
    },
    {
      id: 2,
      from: "me",
      type: "text",
      content: "我想确认一下上门体检预约之后多久会联系我。",
      time: "09:19",
    },
    {
      id: 3,
      from: "service",
      type: "text",
      content: "通常支付成功后 5 到 15 分钟内会有专员联系您确认时间与地址，高峰期会稍有延迟。",
      time: "09:20",
    },
  ],
};

export default mock;
