export default {
  title: "步数详情",
  summary: "展示每日步数统计、趋势和明细。",
  sections: [],
  nextSteps: [
    "接入真实步数 API",
    "添加周/月切换视图",
    "支持导出步数报告"
  ],
  list: [
    { date: '2026-04-01', steps: 4780, distance: 4.2, sleep: 7, weight: 65, heartRate: 75, bloodSugar: 5.6, bloodPressure: '120/80', oxygen: 98, stress: 40 },
    { date: '2026-04-02', steps: 440, distance: 3.2, sleep: 6, weight: 65.2, heartRate: 72, bloodSugar: 5.8, bloodPressure: '125/82', oxygen: 97, stress: 50 },
    { date: '2026-04-03', steps: 5200, distance: 4.6, sleep: 8, weight: 64.8, heartRate: 80, bloodSugar: 6.1, bloodPressure: '130/85', oxygen: 96, stress: 60 },
    { date: '2026-04-04', steps: 6100, distance: 5.1, sleep: 7.5, weight: 64.9, heartRate: 74, bloodSugar: 6.0, bloodPressure: '122/81', oxygen: 97, stress: 45 },
    { date: '2026-04-05', steps: 6900, distance: 5.7, sleep: 7, weight: 64.7, heartRate: 72, bloodSugar: 5.9, bloodPressure: '124/82', oxygen: 97, stress: 43 },
    { date: '2026-04-06', steps: 7300, distance: 6.0, sleep: 6.5, weight: 64.6, heartRate: 73, bloodSugar: 5.8, bloodPressure: '123/80', oxygen: 98, stress: 42 },
    { date: '2026-04-07', steps: 8100, distance: 6.5, sleep: 7.2, weight: 64.4, heartRate: 71, bloodSugar: 5.7, bloodPressure: '121/79', oxygen: 98, stress: 40 }
  ],
  dailyTimeline: [
    {
      date: '2026-04-07',
      items: [
        { time: '08:00', steps: 600 },
        { time: '10:00', steps: 900 },
        { time: '12:00', steps: 1100 },
        { time: '14:00', steps: 1300 },
        { time: '16:00', steps: 1500 },
        { time: '18:00', steps: 1700 },
        { time: '20:00', steps: 1000 }
      ]
    }
  ],
  monthlyData: [
    { week: '03/10-03/16', steps: 37800 },
    { week: '03/17-03/23', steps: 40200 },
    { week: '03/24-03/30', steps: 39050 },
    { week: '03/31-04/06', steps: 45220 },
    { week: '04/07-04/13', steps: 46800 }
  ]
};