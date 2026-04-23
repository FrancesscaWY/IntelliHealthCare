import { analyticsAvatars } from "../_shared/mock-data";

const mock = {
  title: "业绩统计",
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
    { key: "joinTime", label: "加入时间", align: "center" },
    { key: "workOrders", label: "服务工单数量", align: "center" },
    { key: "orders", label: "订单数量", align: "center" },
    { key: "customers", label: "服务客户数量", align: "center" },
    { key: "orderTotal", label: "订单总金额（元）", align: "center" },
    { key: "commissionTotal", label: "佣金总金额（元）", align: "center" },
    { key: "tipsTotal", label: "打赏金额（元）", align: "center" },
    { key: "incomeTotal", label: "总收入（元）", align: "center" },
  ],
  rows: Array.from({ length: 10 }, (_, index) => ({
    staffNo: "2024340089",
    staffInfo: {
      type: "avatar-name",
      avatar: analyticsAvatars[index % analyticsAvatars.length],
      primary: "王小倩",
    },
    joinTime: "2024-10-09 10:09:09",
    workOrders: 120,
    orders: 50,
    customers: 60,
    orderTotal: "50000.00",
    commissionTotal: "15000.00",
    tipsTotal: "600.00",
    incomeTotal: "15600.00",
  })),
} as const;

export default mock;
