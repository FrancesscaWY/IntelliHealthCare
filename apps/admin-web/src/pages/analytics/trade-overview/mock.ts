const mock = {
  title: "交易概况",
  filterLabel: "选择日期",
  rangeLabel: "请选择日期 ~ 请选择日期",
  overviewRows: [
    [
      { label: "浏览量", value: "2300" },
      { label: "访客量", value: "2300" },
    ],
    [
      { label: "下单人数", value: "300" },
      { label: "下单笔数", value: "300" },
      { label: "下单金额（元）", value: "10040.00" },
    ],
    [
      { label: "支付人数", value: "100" },
      { label: "支付订单数", value: "130" },
      { label: "支付金额（元）", value: "10000.00" },
      { label: "客单价（元）", value: "1000.00" },
    ],
    [
      { label: "退款订单数", value: "1" },
      { label: "退款金额（元）", value: "200.00" },
      { label: "退款率", value: "0.50%" },
    ],
  ],
  funnel: [
    { label: "访客", width: "100%", color: "rgba(65, 209, 167, 0.98)" },
    { label: "下单", width: "72%", color: "rgba(65, 209, 167, 0.72)" },
    { label: "支付", width: "44%", color: "rgba(65, 209, 167, 0.42)" },
    { label: "退款", width: "24%", color: "rgba(65, 209, 167, 0.2)" },
  ],
  lineChart: {
    title: "成交趋势",
    legend: "订单金额",
    labels: ["03-01", "03-02", "03-03", "03-04", "03-05", "03-06", "03-07"],
    values: [2820, 2310, 2460, 1460, 2690, 2390, 2890],
    highlightIndex: 3,
  },
  barChart: {
    title: "订单金额分布",
    legend: "订单数量",
    labels: ["100以下", "100-500", "500-1000", "1000-1500", "1500-2000", "2000-2500", "2500-3000", "3000以上"],
    values: [800, 1060, 2410, 3410, 2410, 2140, 1300, 520],
    highlightIndex: 3,
  },
} as const;

export default mock;
