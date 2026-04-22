const avatars = [
  "https://images.pexels.com/photos/3760263/pexels-photo-3760263.jpeg?auto=compress&cs=tinysrgb&w=240",
  "https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=240",
  "https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=240",
  "https://images.pexels.com/photos/712513/pexels-photo-712513.jpeg?auto=compress&cs=tinysrgb&w=240",
];

const names = ["王小倩", "陈雅晴", "周梦琪", "刘晓芸", "李书婷", "黄若宁", "郑可欣", "吴静怡", "张思语", "赵雪琴"];
const districts = ["上海市徐汇区", "上海市浦东新区", "上海市闵行区", "上海市普陀区"];
const tags = ["金牌家政", "康复护理", "五星陪护", "产后护理"];
const serviceTypes = ["家政护工", "康复理疗", "上门体检"];

const mock = {
  title: "全部服务人员",
  serviceTypeOptions: ["请选择", ...serviceTypes],
  tagOptions: ["请选择", ...tags],
  rows: Array.from({ length: 10 }, (_, index) => ({
    id: `staff-${index + 1}`,
    avatar: avatars[index % avatars.length],
    name: names[index],
    phone: `1568900${String(4488 + index).padStart(4, "0")}`,
    staffId: `2024340${String(89 + index).padStart(3, "0")}`,
    serviceType: serviceTypes[index % serviceTypes.length],
    tag: tags[index % tags.length],
    district: districts[index % districts.length],
    joinMethod: index % 2 === 0 ? "服务端注册" : "平台录入",
    joinTime: `2024-10-${String(9 + (index % 10)).padStart(2, "0")} 10:09:09`,
    enabled: index % 3 !== 1,
  })),
};

export default mock;
