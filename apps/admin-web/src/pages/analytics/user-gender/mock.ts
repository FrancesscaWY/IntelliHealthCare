const genderItems = [
  { label: "男", value: 540, color: "#41d1a7" },
  { label: "女", value: 460, color: "#ff6f67" },
] as const;

const total = genderItems.reduce((sum, item) => sum + item.value, 0);

const mock = {
  title: "用户性别分析",
  filterLabel: "注册日期",
  rangeLabel: "请选择日期 ~ 请选择日期",
  sectionTitle: "用户性别构成",
  chartTitle: "用户性别构成",
  totalLabel: "用户总数",
  total,
  items: genderItems,
  columns: [
    { key: "index", label: "序号", align: "center" },
    { key: "label", label: "性别", align: "center" },
    { key: "value", label: "人次", align: "center" },
    { key: "ratio", label: "比例", align: "center" },
  ],
  rows: genderItems.map((item, index) => ({
    index: index + 1,
    label: item.label,
    value: item.value,
    ratio: `${((item.value / total) * 100).toFixed(1)}%`,
  })),
} as const;

export default mock;
