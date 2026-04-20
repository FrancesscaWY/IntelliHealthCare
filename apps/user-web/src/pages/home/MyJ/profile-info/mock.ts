import avatarImage from "@/assets/home/profile/avatar.jpg";

const mock = {
  title: "个人资料",
  note: "资料将在个人主页中展示",
  avatar: avatarImage,
  items: [
    { key: "nickname", label: "昵称", value: "笑看人生", editable: true },
    { key: "id", label: "ID", value: "1433560078" },
    { key: "gender", label: "性别", value: "男", editable: true },
    { key: "intro", label: "简介", value: "", editable: true, placeholder: "添加简介" },
  ],
};

export default mock;

