const mock = {
  title: "用药信息",
  overview: {
    eyebrow: "今日用药",
    title: "按时服药，守护血压稳定",
    total: "7次",
    next: "06:30",
    completed: "2/7",
  },
  meals: [
    {
      key: "breakfast",
      title: "早餐",
      timeRange: "5:00~9:00AM",
      medicines: [
        { name: "卡托普利", dose: "1片", tone: "green", time: "06:30" },
        { name: "氯沙坦", dose: "2片", tone: "red", time: "07:30" },
      ],
    },
    {
      key: "lunch",
      title: "午餐",
      timeRange: "12:00~14:00PM",
      medicines: [
        { name: "卡托普利", dose: "1片", tone: "green", time: "06:30" },
        { name: "氯沙坦", dose: "2片", tone: "red", time: "07:30" },
        { name: "氨氯地平", dose: "1片", tone: "green", time: "06:30" },
      ],
    },
    {
      key: "dinner",
      title: "晚餐",
      timeRange: "17:00~20:00PM",
      medicines: [
        { name: "美托洛尔", dose: "3片", tone: "blue", time: "06:30" },
        { name: "氯沙坦", dose: "2片", tone: "red", time: "07:30" },
      ],
    },
  ],
};

export default mock;
