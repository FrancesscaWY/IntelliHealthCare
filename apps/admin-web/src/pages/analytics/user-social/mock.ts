import { analyticsAvatars } from "../_shared/mock-data";

const mock = {
  title: "用户社交统计",
  filters: [
    [
      { type: "date-range", label: "注册日期", startPlaceholder: "请选择日期", endPlaceholder: "请选择日期", span: 10 },
      { type: "keyword", placeholder: "请输入关键字", span: 10 },
      { type: "actions", actions: ["search", "reset"], span: 4 },
    ],
  ],
  bulkActionLabel: "批量操作",
  columns: [
    { key: "profile", label: "头像/姓名" },
    { key: "id", label: "ID", align: "center" },
    { key: "realName", label: "真实姓名", align: "center" },
    { key: "phone", label: "手机号码", align: "center" },
    { key: "posts", label: "动态数量", align: "center" },
    { key: "reads", label: "阅读量", align: "center" },
    { key: "follow", label: "关注", align: "center" },
    { key: "fans", label: "粉丝", align: "center" },
    { key: "likes", label: "点赞", align: "center" },
    { key: "favorites", label: "收藏", align: "center" },
    { key: "comments", label: "评论", align: "center" },
    { key: "shares", label: "转发", align: "center" },
  ],
  rows: Array.from({ length: 10 }, (_, index) => ({
    profile: {
      type: "avatar-name",
      avatar: analyticsAvatars[index % analyticsAvatars.length],
      primary: "笑看人生",
    },
    id: "2024340089",
    realName: "王强",
    phone: "15678909900",
    posts: 200,
    reads: 54000,
    follow: 23,
    fans: 240,
    likes: 3000,
    favorites: 600,
    comments: 100,
    shares: 356,
  })),
} as const;

export default mock;
