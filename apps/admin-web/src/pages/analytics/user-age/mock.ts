const ageItems = [
  { label: "50岁以下", value: 100, color: "#78d6d3", highlightColor: "#b8f4ed" },
  { label: "50-60岁", value: 240, color: "#80c9f5", highlightColor: "#c7e8ff" },
  { label: "60-70岁", value: 120, color: "#82d8ae", highlightColor: "#c4f3d6" },
  { label: "70-80岁", value: 200, color: "#ff9caf", highlightColor: "#ffd1dc" },
  { label: "80岁以上", value: 340, color: "#bba3ee", highlightColor: "#ded1ff" },
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
  chartHeight: 280,
  chartRadius: ["48%", "72%"],
  chartCenter: ["50%", "44%"],
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
