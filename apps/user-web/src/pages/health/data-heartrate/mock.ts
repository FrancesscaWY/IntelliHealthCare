const mock = {
  title: "心率详情",
  summary: "查看近7天心率变化趋势与每日区间。",
  sections: [],
  nextSteps: [
    "接入真实心率 API",
    "补充运动时段心率分析",
    "支持导出心率报告",
  ],
  list: [
    { date: "2026-04-01", lowHeartRate: 62, heartRate: 72, highHeartRate: 88 },
    { date: "2026-04-02", lowHeartRate: 64, heartRate: 74, highHeartRate: 91 },
    { date: "2026-04-03", lowHeartRate: 61, heartRate: 71, highHeartRate: 86 },
    { date: "2026-04-04", lowHeartRate: 66, heartRate: 77, highHeartRate: 95 },
    { date: "2026-04-05", lowHeartRate: 63, heartRate: 73, highHeartRate: 89 },
    { date: "2026-04-06", lowHeartRate: 68, heartRate: 79, highHeartRate: 98 },
    { date: "2026-04-07", lowHeartRate: 65, heartRate: 76, highHeartRate: 92 },
  ],
  dailyTimeline: [
    {
      date: "2026-04-07",
      items: [
        { time: "00:00", lowHeartRate: 63, heartRate: 69, highHeartRate: 75 },
        { time: "03:00", lowHeartRate: 60, heartRate: 66, highHeartRate: 72 },
        { time: "06:00", lowHeartRate: 64, heartRate: 71, highHeartRate: 82 },
        { time: "09:00", lowHeartRate: 70, heartRate: 78, highHeartRate: 92 },
        { time: "12:00", lowHeartRate: 72, heartRate: 81, highHeartRate: 96 },
        { time: "15:00", lowHeartRate: 69, heartRate: 77, highHeartRate: 90 },
        { time: "18:00", lowHeartRate: 67, heartRate: 75, highHeartRate: 88 },
        { time: "21:00", lowHeartRate: 64, heartRate: 72, highHeartRate: 84 },
      ],
    },
  ],
  monthlyData: [
    { week: "第1周", lowHeartRate: 61, heartRate: 72, highHeartRate: 89 },
    { week: "第2周", lowHeartRate: 63, heartRate: 74, highHeartRate: 92 },
    { week: "第3周", lowHeartRate: 62, heartRate: 73, highHeartRate: 90 },
    { week: "第4周", lowHeartRate: 64, heartRate: 76, highHeartRate: 95 },
  ],
};

export default mock;
