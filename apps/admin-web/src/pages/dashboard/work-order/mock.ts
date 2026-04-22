const coverImage =
  "https://images.pexels.com/photos/7579831/pexels-photo-7579831.jpeg?auto=compress&cs=tinysrgb&w=320";
const customerAvatar =
  "https://images.pexels.com/photos/6129501/pexels-photo-6129501.jpeg?auto=compress&cs=tinysrgb&w=240";

const mock = {
  title: "工单管理",
  serviceTypes: ["全部类型", "家政护工", "康复理疗", "上门体检"],
  statusTabs: ["待服务", "服务中", "已完成", "已取消"],
  rows: Array.from({ length: 10 }, (_, index) => ({
    id: `GD2024100901${index + 3}`,
    orderNo: "2400126670",
    title: "脑中风术后康复理疗套餐",
    cover: coverImage,
    project: "肌力增强训练",
    amount: "300.00",
    staff: "王小倩；王伟",
    customerName: "笑看人生",
    customerPhone: "19288664488",
    customerAvatar,
    assignTime: "2024-10-09 10:09:09",
    status: "待服务",
    actions: [
      { label: "改单", tone: "green" },
      { label: "取消预约", tone: "red" },
      { label: "工单详情", tone: "green" },
      { label: "备注", tone: "green" },
    ],
  })),
};

export default mock;
