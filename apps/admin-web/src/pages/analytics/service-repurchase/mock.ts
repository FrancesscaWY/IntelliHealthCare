import { analyticsAvatars } from "../_shared/mock-data";

const mock = {
  title: "复购分析",
  filters: [
    [
      { type: "number-range", label: "购买次数", startPlaceholder: "最低次数", endPlaceholder: "最高次数", span: 12 },
      { type: "keyword", placeholder: "请输入关键字", span: 8 },
      { type: "actions", actions: ["search", "reset"], span: 4 },
    ],
  ],
  bulkActionLabel: "批量操作",
  columns: [
    { key: "profile", label: "头像/昵称" },
    { key: "id", label: "ID", align: "center" },
    { key: "phone", label: "手机号码", align: "center" },
    { key: "purchaseCount", label: "购买次数", align: "center" },
    { key: "productCount", label: "购买商品数量", align: "center" },
    { key: "amount", label: "支付金额（元）", align: "center" },
    { key: "unitPrice", label: "次单价（元）", align: "center" },
  ],
  rows: Array.from({ length: 10 }, (_, index) => ({
    profile: {
      type: "avatar-name",
      avatar: analyticsAvatars[index % analyticsAvatars.length],
      primary: "笑看人生",
    },
    id: "2021340001",
    phone: "15678909900",
    purchaseCount: 10,
    productCount: 15,
    amount: "4560.00",
    unitPrice: "456.00",
  })),
  pagination: {
    total: 100,
    pageSize: 10,
    current: 1,
    pages: [1, 2, 3, 4, 5, 6, "...", 100],
  },
} as const;

export default mock;
