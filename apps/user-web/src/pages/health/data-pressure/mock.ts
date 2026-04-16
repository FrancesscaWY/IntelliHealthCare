const mock = {
  title: "压力",
  summary: "查看每日压力变化趋势",
  list: [
    { date: "2026-04-01", stress: 46 },
    { date: "2026-04-02", stress: 47 },
    { date: "2026-04-03", stress: 48 },
    { date: "2026-04-04", stress: 47 },
    { date: "2026-04-05", stress: 49 },
    { date: "2026-04-06", stress: 48 },
    { date: "2026-04-07", stress: 47, time: "23:59" },
  ],
  dailyTimeline: [
    {
      date: "2026-04-01",
      items: [
        { time: "00:00", value: 45 },
        { time: "06:00", value: 46 },
        { time: "12:00", value: 47 },
        { time: "18:00", value: 46 },
        { time: "24:00", value: 47 },
      ],
    },
    {
      date: "2026-04-02",
      items: [
        { time: "00:00", value: 46 },
        { time: "06:00", value: 47 },
        { time: "12:00", value: 47 },
        { time: "18:00", value: 46 },
        { time: "24:00", value: 47 },
      ],
    },
    {
      date: "2026-04-03",
      items: [
        { time: "00:00", value: 46 },
        { time: "06:00", value: 48 },
        { time: "12:00", value: 48 },
        { time: "18:00", value: 47 },
        { time: "24:00", value: 48 },
      ],
    },
    {
      date: "2026-04-04",
      items: [
        { time: "00:00", value: 46 },
        { time: "06:00", value: 47 },
        { time: "12:00", value: 48 },
        { time: "18:00", value: 47 },
        { time: "24:00", value: 47 },
      ],
    },
    {
      date: "2026-04-05",
      items: [
        { time: "00:00", value: 47 },
        { time: "06:00", value: 48 },
        { time: "12:00", value: 49 },
        { time: "18:00", value: 48 },
        { time: "24:00", value: 49 },
      ],
    },
    {
      date: "2026-04-06",
      items: [
        { time: "00:00", value: 46 },
        { time: "06:00", value: 48 },
        { time: "12:00", value: 49 },
        { time: "18:00", value: 47 },
        { time: "24:00", value: 48 },
      ],
    },
    {
      date: "2026-04-07",
      items: [
        { time: "00:00", value: 46 },
        { time: "06:00", value: 47 },
        { time: "12:00", value: 47 },
        { time: "18:00", value: 48 },
        { time: "24:00", value: 48 },
      ],
    },
  ],
  monthlyData: [
    { label: "第1周", min: 46, max: 48, avg: 47 },
    { label: "第2周", min: 45, max: 49, avg: 47 },
    { label: "第3周", min: 46, max: 49, avg: 48 },
    { label: "第4周", min: 45, max: 48, avg: 47 },
  ],
};

export default mock;
