const mock = {
  title: "血氧",
  summary: "查看每日血氧变化趋势",
  list: [
    { date: "2026-04-01", oxygen: 96 },
    { date: "2026-04-02", oxygen: 97 },
    { date: "2026-04-03", oxygen: 98 },
    { date: "2026-04-04", oxygen: 97 },
    { date: "2026-04-05", oxygen: 99 },
    { date: "2026-04-06", oxygen: 98 },
    { date: "2026-04-07", oxygen: 98, time: "23:59" },
  ],
  dailyTimeline: [
    {
      date: "2026-04-01",
      items: [
        { time: "00:00", value: 95 },
        { time: "06:00", value: 96 },
        { time: "12:00", value: 97 },
        { time: "18:00", value: 96 },
        { time: "24:00", value: 97 },
      ],
    },
    {
      date: "2026-04-02",
      items: [
        { time: "00:00", value: 96 },
        { time: "06:00", value: 97 },
        { time: "12:00", value: 97 },
        { time: "18:00", value: 96 },
        { time: "24:00", value: 97 },
      ],
    },
    {
      date: "2026-04-03",
      items: [
        { time: "00:00", value: 97 },
        { time: "06:00", value: 98 },
        { time: "12:00", value: 98 },
        { time: "18:00", value: 97 },
        { time: "24:00", value: 98 },
      ],
    },
    {
      date: "2026-04-04",
      items: [
        { time: "00:00", value: 96 },
        { time: "06:00", value: 97 },
        { time: "12:00", value: 98 },
        { time: "18:00", value: 97 },
        { time: "24:00", value: 97 },
      ],
    },
    {
      date: "2026-04-05",
      items: [
        { time: "00:00", value: 97 },
        { time: "06:00", value: 98 },
        { time: "12:00", value: 99 },
        { time: "18:00", value: 98 },
        { time: "24:00", value: 99 },
      ],
    },
    {
      date: "2026-04-06",
      items: [
        { time: "00:00", value: 96 },
        { time: "06:00", value: 98 },
        { time: "12:00", value: 99 },
        { time: "18:00", value: 97 },
        { time: "24:00", value: 98 },
      ],
    },
    {
      date: "2026-04-07",
      items: [
        { time: "00:00", value: 95 },
        { time: "06:00", value: 97 },
        { time: "12:00", value: 97 },
        { time: "18:00", value: 99 },
        { time: "24:00", value: 99 },
      ],
    },
  ],
  monthlyData: [
    { label: "第1周", min: 95, max: 98, avg: 97 },
    { label: "第2周", min: 96, max: 99, avg: 98 },
    { label: "第3周", min: 95, max: 99, avg: 97 },
    { label: "第4周", min: 96, max: 98, avg: 97 },
  ],
};

export default mock;
