const avatars = [
  "/api/v1/assets/demo/staff/staff-1.png",
  "/api/v1/assets/demo/staff/staff-2.png",
  "/api/v1/assets/demo/staff/staff-3.png",
  "/api/v1/assets/demo/avatars/avatar-4.jpg",
];

const names = ["王晓倩", "李雅宁", "张婉晴", "刘梦琪", "周晓兰", "陈思敏", "黄静怡", "赵小芸", "吴雪琴", "郑依琳"];
const serviceTypes = ["家政护工", "康复理疗", "上门体检"];

const mock = {
  title: "审核管理",
  statuses: ["全部状态", "待审核", "已通过", "已驳回"],
  serviceTypes: ["全部类型", ...serviceTypes],
  rows: Array.from({ length: 10 }, (_, index) => ({
    id: `review-${index + 1}`,
    name: names[index],
    avatar: avatars[index % avatars.length],
    staffId: `20243400${89 + index}`,
    serviceType: serviceTypes[index % serviceTypes.length],
    status: "待审核",
    phone: `15678909${String(900 + index).slice(-3)}`,
    reviewer: "李明昊",
    applyTime: `2024-10-${String(9 + (index % 10)).padStart(2, "0")} 10:09:09`,
    reviewTime: "-",
  })),
};

export default mock;
