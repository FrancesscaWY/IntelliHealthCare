import { analyticsProductImages } from "../_shared/mock-data";

const mock = {
  title: "产品分析",
  filters: [
    [
      { type: "select", label: "产品类别", placeholder: "请选择", span: 8 },
      { type: "number-range", label: "价格", startPlaceholder: "最低价格", endPlaceholder: "最高价格", span: 12 },
    ],
    [
      { type: "date-range", label: "选择日期", startPlaceholder: "请选择日期", endPlaceholder: "请选择日期", span: 10 },
      { type: "keyword", placeholder: "请输入关键字", span: 10 },
      { type: "actions", actions: ["search", "reset"], span: 4 },
    ],
  ],
  bulkActionLabel: "批量操作",
  tableMinWidth: 1520,
  columns: [
    { key: "info", label: "产品信息", width: "320px" },
    { key: "category", label: "产品\n类别", align: "center", width: "120px" },
    { key: "browse", label: "浏览\n量", align: "center", width: "108px" },
    { key: "visitors", label: "访客\n量", align: "center", width: "108px" },
    { key: "favorites", label: "收藏\n量", align: "center", width: "108px" },
    { key: "shares", label: "分享\n次数", align: "center", width: "108px" },
    { key: "payUsers", label: "支付\n人数", align: "center", width: "108px" },
    { key: "payOrders", label: "支付\n订单数", align: "center", width: "124px" },
    { key: "amount", label: "订单金额\n（元）", align: "center", width: "132px" },
    { key: "conversion", label: "访问支付\n转化率", align: "center", width: "132px" },
  ],
  rows: Array.from({ length: 8 }, (_, index) => ({
    info: {
      type: "image-text",
      image: analyticsProductImages[index % analyticsProductImages.length],
      primary: "脑中风术后康复理疗套餐",
      secondary: "323009000",
    },
    category: "康复理疗",
    browse: 2000,
    visitors: 1900,
    favorites: 600,
    shares: 800,
    payUsers: 190,
    payOrders: 200,
    amount: "20000.00",
    conversion: "10.0%",
  })),
} as const;

export default mock;
