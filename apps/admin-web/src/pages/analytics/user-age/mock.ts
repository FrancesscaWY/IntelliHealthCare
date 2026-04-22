const ageItems = [
  { label: "50岁以下", value: 100, color: "#6467df" },
  { label: "50-60岁", value: 240, color: "#41d1a7" },
  { label: "60-70岁", value: 120, color: "#2f80ed" },
  { label: "70-80岁", value: 200, color: "#ffd86a" },
  { label: "80岁以上", value: 340, color: "#ff6f67" },
] as const;

const total = ageItems.reduce((sum, item) => sum + item.value, 0);

const mock = {
  title: "用户年龄分析",
  filterLabel: "注册日期",
  rangeLabel: "请选择日期 ~ 请选择日期",
  sectionTitle: "用户年龄构成",
  chartTitle: "用户年龄构成",
  totalLabel: "用户总数",
  total,
  items: ageItems,
  columns: [
    { key: "index", label: "序号", align: "center" },
    { key: "label", label: "年龄段", align: "center" },
    { key: "value", label: "人次", align: "center" },
    { key: "ratio", label: "比例", align: "center" },
  ],
  rows: ageItems.map((item, index) => ({
    index: index + 1,
    label: item.label,
    value: item.value,
    ratio: `${((item.value / total) * 100).toFixed(1)}%`,
  })),
} as const;

export default mock;
