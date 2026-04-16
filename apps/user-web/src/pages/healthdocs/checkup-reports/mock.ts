const mock = {
  title: "体检报告",
  summary: [
    { label: "最近体检", value: "2026-04-10" },
    { label: "异常指标", value: "2项" },
    { label: "待复查", value: "1项" },
  ],
  reports: [
    {
      title: "年度体检",
      hospital: "上海市第一人民医院",
      time: "2026-04-10",
      tags: ["血常规", "肝功能", "心电图"],
      note: "建议继续控制血压并于 1 个月后复查空腹血糖。",
    },
    {
      title: "专项复查",
      hospital: "社区卫生服务中心",
      time: "2026-03-18",
      tags: ["血压", "血糖"],
      note: "晨起血压略高，建议保持规律服药和睡眠。",
    },
  ],
};

export default mock;
