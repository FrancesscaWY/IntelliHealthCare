const customerAvatar =
  "https://images.pexels.com/photos/6129501/pexels-photo-6129501.jpeg?auto=compress&cs=tinysrgb&w=240";
const consultantAvatar =
  "https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=240";
const nurseAvatar =
  "https://images.pexels.com/photos/3760263/pexels-photo-3760263.jpeg?auto=compress&cs=tinysrgb&w=240";
const doctorAvatar =
  "https://images.pexels.com/photos/5327585/pexels-photo-5327585.jpeg?auto=compress&cs=tinysrgb&w=240";
const productImage =
  "https://images.pexels.com/photos/4239031/pexels-photo-4239031.jpeg?auto=compress&cs=tinysrgb&w=320";

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
      name: "刘小华",
      preview: "请问您要咨询什么问题呢？",
      time: "09:09",
      unread: 0,
      avatar: consultantAvatar,
    },
    {
      id: "c3",
      name: "赵丽珍",
      preview: "299元",
      time: "09:09",
      unread: 0,
      avatar: nurseAvatar,
    },
    {
      id: "c4",
      name: "王小倩",
      preview: "好的",
      time: "09:09",
      unread: 0,
      avatar: doctorAvatar,
    },
  ],
  messages: [
    {
      id: "m1",
      side: "left",
      text: "您好！",
      avatar: consultantAvatar,
    },
    {
      id: "m2",
      side: "right",
      text: "请问康复项目适合多大年龄的老人？",
      avatar: customerAvatar,
    },
    {
      id: "m3",
      side: "left",
      text: "60-80岁",
      avatar: consultantAvatar,
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
