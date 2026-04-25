const mock = {
  title: "健康档案",
  profile: {
    name: "张爱渝",
    subtitle: "个人健康档案总览",
    updatedAt: "2026-04-15 09:30",
    completion: "92%",
    metrics: [
      { key: "age", label: "年龄", value: "65" },
      { key: "height", label: "身高", value: "172cm" },
      { key: "weight", label: "体重", value: "55.5kg" }
    ]
  },
  sections: [
    {
      key: "basic",
      title: "基础信息",
      desc: "个人资料、联系人和过敏信息",
      meta: "已完善",
      pageId: "healthdocs/basic-info"
    },
    {
      key: "health",
      title: "健康信息",
      desc: "既往病史、慢病记录和风险提示",
      meta: "持续更新",
      pageId: "healthdocs/medical-history"
    },
    {
      key: "medication",
      title: "用药信息",
      desc: "日常用药提醒与服药安排",
      meta: "3 项记录",
      pageId: "health/medication-info"
    },
    {
      key: "data",
      title: "健康数据",
      desc: "血压、血糖、睡眠等趋势数据",
      meta: "8 项指标",
      pageId: "health/health-data"
    },
    {
      key: "report",
      title: "体检报告",
      desc: "最近体检结果和医生建议",
      meta: "0 份报告",
      pageId: "healthdocs/checkup-reports"
    }
  ]
};

export default mock;
