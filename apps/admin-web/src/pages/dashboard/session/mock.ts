const customerAvatar = "/api/v1/assets/demo/avatars/avatar-1.jpg";
const productImage = "/api/v1/assets/demo/services/service-cleaning.jpg";

const mock = {
  title: "会话",
  currentSessionName: "笑看人生",
  conversations: [
    {
      id: "c1",
      name: "笑看人生",
      preview: "您好",
      time: "09:09",
      unread: 3,
      avatar: customerAvatar,
      active: true,
    },
    {
      id: "c2",
      name: "王秀珍",
      preview: "血压偏高先别急，我帮您看一下记录",
      time: "09:22",
      unread: 0,
      avatar: customerAvatar,
    },
  ],
  messages: [
    {
      id: "m1",
      side: "left",
      text: "您好，我想咨询康复项目适合多大年龄的老人？",
      avatar: customerAvatar,
    },
    {
      id: "m2",
      side: "right",
      text: "您好，康复训练主要适合 60-85 岁有术后恢复、肌力下降或行动能力维护需求的长者。",
      avatar: "",
    },
    {
      id: "m3",
      side: "left",
      text: "老人有高血压，可以预约吗？",
      avatar: customerAvatar,
    },
    {
      id: "m4",
      side: "right",
      text: "可以预约。服务前会先确认近期血压、用药和不适症状，必要时建议先做上门评估。",
      avatar: "",
    },
  ],
  customer: {
    name: "笑看人生",
    avatar: customerAvatar,
    tags: [
      { label: "高血压", tone: "green" },
      { label: "糖尿病", tone: "red" },
      { label: "多次购买", tone: "violet" },
    ],
    orderCount: 2,
    amount: "1004.00",
  },
  orders: [
    {
      id: "o1",
      status: "已完成",
      title: "日常清洁 2小时1人急速清洁全程质保",
      image: productImage,
      time: "2022-12-09 14:12:07",
      amount: "300.00元",
    },
    {
      id: "o2",
      status: "已完成",
      title: "日常清洁 2小时1人急速清洁全程质保",
      image: productImage,
      time: "2022-12-09 14:12:07",
      amount: "300.00元",
    },
  ],
  goods: Array.from({ length: 6 }, (_, index) => ({
    id: `g${index + 1}`,
    title: "日常清洁 2小时1人急速清洁全程质保",
    image: productImage,
    price: "599.00",
  })),
};

export default mock;
