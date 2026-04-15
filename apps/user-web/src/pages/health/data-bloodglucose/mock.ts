const mock = {
  title: "血糖",
  summary: "查看近 7 天血糖趋势与每日明细",
  list: [
    { date: "2026-04-01", fasting: 5.3, postMealPeak: 7.2, bloodSugar: 6.3 },
    { date: "2026-04-02", fasting: 5.1, postMealPeak: 6.8, bloodSugar: 6.1 },
    { date: "2026-04-03", fasting: 5.0, postMealPeak: 6.5, bloodSugar: 5.8 },
    { date: "2026-04-04", fasting: 5.2, postMealPeak: 7.4, bloodSugar: 6.4 },
    { date: "2026-04-05", fasting: 5.4, postMealPeak: 7.6, bloodSugar: 6.6 },
    { date: "2026-04-06", fasting: 5.1, postMealPeak: 8.3, bloodSugar: 6.8 },
    { date: "2026-04-07", fasting: 5.0, postMealPeak: 7.2, bloodSugar: 6.3 },
  ],
  dailyTimeline: [
    {
      date: "2026-04-01",
      items: [
        { time: "06:00", value: 5.3 },
        { time: "08:00", value: 6.8 },
        { time: "12:00", value: 6.0 },
        { time: "15:00", value: 7.2 },
        { time: "18:00", value: 6.5 },
        { time: "21:00", value: 5.9 },
      ],
    },
    {
      date: "2026-04-02",
      items: [
        { time: "06:00", value: 5.1 },
        { time: "08:00", value: 6.5 },
        { time: "12:00", value: 5.9 },
        { time: "15:00", value: 6.8 },
        { time: "18:00", value: 6.2 },
        { time: "21:00", value: 5.8 },
      ],
    },
    {
      date: "2026-04-03",
      items: [
        { time: "06:00", value: 5.0 },
        { time: "08:00", value: 6.1 },
        { time: "12:00", value: 5.8 },
        { time: "15:00", value: 6.5 },
        { time: "18:00", value: 6.0 },
        { time: "21:00", value: 5.6 },
      ],
    },
    {
      date: "2026-04-04",
      items: [
        { time: "06:00", value: 5.2 },
        { time: "08:00", value: 6.9 },
        { time: "12:00", value: 6.2 },
        { time: "15:00", value: 7.4 },
        { time: "18:00", value: 6.8 },
        { time: "21:00", value: 6.0 },
      ],
    },
    {
      date: "2026-04-05",
      items: [
        { time: "06:00", value: 5.4 },
        { time: "08:00", value: 7.0 },
        { time: "12:00", value: 6.4 },
        { time: "15:00", value: 7.6 },
        { time: "18:00", value: 6.9 },
        { time: "21:00", value: 6.2 },
      ],
    },
    {
      date: "2026-04-06",
      items: [
        { time: "06:00", value: 5.1 },
        { time: "08:00", value: 7.4 },
        { time: "12:00", value: 6.7 },
        { time: "15:00", value: 8.3 },
        { time: "18:00", value: 7.1 },
        { time: "21:00", value: 6.4 },
      ],
    },
    {
      date: "2026-04-07",
      items: [
        { time: "06:00", value: 5.0 },
        { time: "08:00", value: 6.7 },
        { time: "12:00", value: 6.1 },
        { time: "15:00", value: 7.2 },
        { time: "18:00", value: 6.6 },
        { time: "21:00", value: 5.9 },
      ],
    },
  ],
  monthlyData: [
    { label: "第1周", min: 5.0, max: 7.2, avg: 6.1 },
    { label: "第2周", min: 4.9, max: 7.6, avg: 6.3 },
    { label: "第3周", min: 5.1, max: 8.3, avg: 6.8 },
    { label: "第4周", min: 4.8, max: 7.1, avg: 5.9 },
  ],
};

export default mock;
