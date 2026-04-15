const mock = {
  title: "血压",
  summary: "查看每日收缩压与舒张压变化趋势",
  list: [
    { date: "2026-04-01", systolic: 118, diastolic: 76 },
    { date: "2026-04-02", systolic: 122, diastolic: 79 },
    { date: "2026-04-03", systolic: 126, diastolic: 81 },
    { date: "2026-04-04", systolic: 124, diastolic: 78 },
    { date: "2026-04-05", systolic: 129, diastolic: 82 },
    { date: "2026-04-06", systolic: 136, diastolic: 86 },
    { date: "2026-04-07", systolic: 120, diastolic: 80, time: "23:59" },
  ],
  dailyTimeline: [
    {
      date: "2026-04-01",
      items: [
        { time: "00:00", systolic: 116, diastolic: 75 },
        { time: "02:00", systolic: 121, diastolic: 78 },
        { time: "04:00", systolic: 124, diastolic: 79 },
        { time: "06:00", systolic: 119, diastolic: 77 },
        { time: "08:00", systolic: 118, diastolic: 76 },
      ],
    },
    {
      date: "2026-04-02",
      items: [
        { time: "00:00", systolic: 117, diastolic: 76 },
        { time: "02:00", systolic: 125, diastolic: 80 },
        { time: "04:00", systolic: 123, diastolic: 78 },
        { time: "06:00", systolic: 121, diastolic: 79 },
        { time: "08:00", systolic: 122, diastolic: 79 },
      ],
    },
    {
      date: "2026-04-03",
      items: [
        { time: "00:00", systolic: 120, diastolic: 78 },
        { time: "02:00", systolic: 128, diastolic: 82 },
        { time: "04:00", systolic: 131, diastolic: 84 },
        { time: "06:00", systolic: 126, diastolic: 81 },
        { time: "08:00", systolic: 124, diastolic: 80 },
      ],
    },
    {
      date: "2026-04-04",
      items: [
        { time: "00:00", systolic: 118, diastolic: 76 },
        { time: "02:00", systolic: 126, diastolic: 80 },
        { time: "04:00", systolic: 128, diastolic: 82 },
        { time: "06:00", systolic: 125, diastolic: 79 },
        { time: "08:00", systolic: 124, diastolic: 78 },
      ],
    },
    {
      date: "2026-04-05",
      items: [
        { time: "00:00", systolic: 121, diastolic: 79 },
        { time: "02:00", systolic: 133, diastolic: 84 },
        { time: "04:00", systolic: 136, diastolic: 86 },
        { time: "06:00", systolic: 130, diastolic: 82 },
        { time: "08:00", systolic: 129, diastolic: 82 },
      ],
    },
    {
      date: "2026-04-06",
      items: [
        { time: "00:00", systolic: 122, diastolic: 80 },
        { time: "02:00", systolic: 138, diastolic: 87 },
        { time: "04:00", systolic: 143, diastolic: 89 },
        { time: "06:00", systolic: 136, diastolic: 86 },
        { time: "08:00", systolic: 132, diastolic: 84 },
      ],
    },
    {
      date: "2026-04-07",
      items: [
        { time: "00:00", systolic: 114, diastolic: 74 },
        { time: "01:30", systolic: 126, diastolic: 81 },
        { time: "03:00", systolic: 133, diastolic: 85 },
        { time: "04:30", systolic: 148, diastolic: 93 },
        { time: "06:00", systolic: 140, diastolic: 88 },
        { time: "07:30", systolic: 143, diastolic: 89 },
        { time: "09:00", systolic: 126, diastolic: 81 },
        { time: "10:30", systolic: 120, diastolic: 80 },
      ],
    },
  ],
  monthlyData: [
    { label: "第1周", systolic: 121, diastolic: 78, maxSystolic: 129, minDiastolic: 74 },
    { label: "第2周", systolic: 126, diastolic: 80, maxSystolic: 134, minDiastolic: 76 },
    { label: "第3周", systolic: 132, diastolic: 84, maxSystolic: 143, minDiastolic: 79 },
    { label: "第4周", systolic: 120, diastolic: 77, maxSystolic: 128, minDiastolic: 73 },
  ],
};

export default mock;
