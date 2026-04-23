import { analyticsAvatars } from "../_shared/mock-data";

const mock = {
  title: "工单分析",
  filters: [
    [
      { type: "date-range", label: "预约日期", startPlaceholder: "请选择日期", endPlaceholder: "请选择日期", span: 10 },
      { type: "keyword", placeholder: "请输入关键字", span: 10 },
      { type: "actions", actions: ["search", "reset"], span: 4 },
    ],
  ],
  bulkActionLabel: "批量操作",
  columns: [
    { key: "workOrderNo", label: "工单编号", align: "center" },
    { key: "staffInfo", label: "服务人员信息" },
    { key: "customerInfo", label: "客户信息" },
    { key: "serviceType", label: "服务类型", align: "center" },
    { key: "scheduleTime", label: "预约时间", align: "center" },
    { key: "duration", label: "服务时长", align: "center" },
    { key: "status", label: "工单状态", align: "center" },
    { key: "rating", label: "评分", align: "center" },
  ],
  rows: Array.from({ length: 10 }, (_, index) => ({
    workOrderNo: `GD2026042${String(index + 1).padStart(3, "0")}`,
    staffInfo: {
      type: "avatar-name",
      avatar: analyticsAvatars[index % analyticsAvatars.length],
      primary: "王小倩",
      secondary: "工号 2024340089",
    },
    customerInfo: {
      type: "avatar-name",
      avatar: analyticsAvatars[(index + 1) % analyticsAvatars.length],
      primary: "笑看人生",
      secondary: "15678909900",
    },
    serviceType: "家政护工",
    scheduleTime: "2026-04-22 09:00:00",
    duration: "2小时",
    status: "已完成",
    rating: "4.9",
  })),
} as const;

export default mock;
