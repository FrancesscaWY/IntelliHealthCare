const mock = {
  title: "用户概况",
  subtitle: "围绕新增、活跃与结构分布查看近阶段用户变化。",
  rangeOptions: [
    { key: "weekly", label: "近 7 天", caption: "每日趋势" },
    { key: "monthly", label: "近 30 天", caption: "阶段趋势" },
  ],
  periods: {
    weekly: {
      rangeLabel: "2026-04-16 ~ 2026-04-22",
      updatedAt: "2026-04-22 09:30",
      summary: [
        { label: "新增用户", value: "21,486", delta: "+8.2%", tone: "green" },
        { label: "活跃用户", value: "18,362", delta: "+5.4%", tone: "green" },
        { label: "交易转化", value: "67.8%", delta: "+1.9%", tone: "teal" },
        { label: "复购用户", value: "3,426", delta: "-0.6%", tone: "amber" },
      ],
      trend: {
        labels: ["04-16", "04-17", "04-18", "04-19", "04-20", "04-21", "04-22"],
        values: [3380, 2860, 3025, 1520, 3240, 2955, 3476],
        highlightIndex: 3,
        seriesName: "新增用户数量",
      },
      ageDistribution: {
        title: "用户年龄构成",
        total: 1000,
        items: [
          { label: "50岁以下", value: 100, color: "#6467df" },
          { label: "50-60岁", value: 240, color: "#41d1a7" },
          { label: "60-70岁", value: 120, color: "#2f80ed" },
          { label: "70-80岁", value: 200, color: "#ffc43a" },
          { label: "80岁以上", value: 340, color: "#ff6f67" },
        ],
      },
      genderDistribution: {
        title: "用户性别构成",
        total: 1000,
        items: [
          { label: "男", value: 540, color: "#41d1a7" },
          { label: "女", value: 460, color: "#ffd86a" },
        ],
      },
    },
    monthly: {
      rangeLabel: "2026-03-24 ~ 2026-04-22",
      updatedAt: "2026-04-22 09:30",
      summary: [
        { label: "新增用户", value: "82,304", delta: "+12.4%", tone: "green" },
        { label: "活跃用户", value: "69,420", delta: "+7.1%", tone: "green" },
        { label: "交易转化", value: "65.3%", delta: "+2.8%", tone: "teal" },
        { label: "复购用户", value: "13,765", delta: "+3.2%", tone: "green" },
      ],
      trend: {
        labels: ["第1周", "第2周", "第3周", "第4周", "第5周", "第6周", "第7周"],
        values: [12340, 13220, 12580, 10860, 14520, 13840, 15260],
        highlightIndex: 3,
        seriesName: "周新增用户数量",
      },
      ageDistribution: {
        title: "用户年龄构成",
        total: 1000,
        items: [
          { label: "50岁以下", value: 120, color: "#6467df" },
          { label: "50-60岁", value: 260, color: "#41d1a7" },
          { label: "60-70岁", value: 140, color: "#2f80ed" },
          { label: "70-80岁", value: 210, color: "#ffc43a" },
          { label: "80岁以上", value: 270, color: "#ff6f67" },
        ],
      },
      genderDistribution: {
        title: "用户性别构成",
        total: 1000,
        items: [
          { label: "男", value: 512, color: "#41d1a7" },
          { label: "女", value: 488, color: "#ffd86a" },
        ],
      },
    },
  },
} as const;

export default mock;
