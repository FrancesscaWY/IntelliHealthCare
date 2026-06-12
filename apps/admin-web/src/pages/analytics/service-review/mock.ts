import { analyticsAvatars } from "../_shared/mock-data";

const mock = {
  title: "评价统计",
  filters: [
    [
      { type: "date-range", label: "加入日期", startPlaceholder: "请选择日期", endPlaceholder: "请选择日期", span: 10 },
      { type: "keyword", placeholder: "请输入关键字", span: 10 },
      { type: "actions", actions: ["search", "reset"], span: 4 },
    ],
  ],
  bulkActionLabel: "批量操作",
  columns: [
    { key: "staffNo", label: "服务人员编号", align: "center" },
    { key: "staffInfo", label: "服务人员信息" },
    { key: "serviceType", label: "服务类型", align: "center" },
    { key: "phone", label: "手机号码", align: "center" },
    { key: "customers", label: "服务客户量", align: "center" },
    { key: "workOrders", label: "服务工单量", align: "center" },
    { key: "reviews", label: "参评量", align: "center" },
    { key: "satisfied", label: "满意数量", align: "center" },
    { key: "unsatisfied", label: "不满意数量", align: "center" },
    { key: "satisfaction", label: "满意率", align: "center" },
  ],
  rows: Array.from({ length: 10 }, (_, index) => ({
    staffNo: "2024340089",
    staffInfo: {
      type: "avatar-name",
      avatar: analyticsAvatars[index % analyticsAvatars.length],
      primary: "王小倩",
    },
    serviceType: "家政护工",
    phone: "15678909900",
    customers: 362,
    workOrders: 400,
    reviews: 360,
    satisfied: 240,
    unsatisfied: 120,
    satisfaction: "66.7%",
  })),
} as const;

export default mock;
