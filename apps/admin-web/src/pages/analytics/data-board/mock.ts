const mock = {
  title: "数据月刊与半年分析",
  subtitle: "以更轻量的阅读密度查看长者健康、服务执行和机构运营重点。",
  periodOptions: [
    { key: "monthly", label: "月刊", caption: "近 30 天" },
    { key: "halfYear", label: "半年", caption: "近 6 个月" },
  ],
  periods: {
    monthly: {
      periodLabel: "2026 年 4 月",
      updatedAt: "2026-04-21 09:30",
      badges: ["复检完成率 91%", "重点长者 18 人", "干预闭环 96%"],
      metrics: [
        { label: "活跃长者", value: "286", delta: "+12", trend: "up", note: "环比新增建档" },
        { label: "服务执行率", value: "97.4%", delta: "+2.1%", trend: "up", note: "预约按时上门" },
        { label: "异常预警", value: "14", delta: "-3", trend: "down", note: "高风险待跟进" },
        { label: "满意度", value: "4.8", delta: "+0.2", trend: "up", note: "五星评价占比 82%" },
      ],
      trend: [
        { label: "第 1 周", value: 82, goal: 78 },
        { label: "第 2 周", value: 86, goal: 80 },
        { label: "第 3 周", value: 88, goal: 82 },
        { label: "第 4 周", value: 91, goal: 84 },
      ],
      categories: [
        { name: "慢病随访", value: 91, tone: "green" },
        { name: "康复护理", value: 78, tone: "teal" },
        { name: "上门检测", value: 65, tone: "amber" },
        { name: "营养指导", value: 54, tone: "red" },
      ],
      highlights: [
        { title: "高血压复测达标", value: "89%", detail: "较上月提升 6%", tone: "green" },
        { title: "跌倒风险干预", value: "12 例", detail: "已闭环 11 例", tone: "amber" },
        { title: "认知筛查提醒", value: "8 人", detail: "需家属确认计划", tone: "red" },
      ],
      institutions: [
        { name: "槟西康养中心", reportRate: "98%", onTime: "96%", satisfaction: "4.9" },
        { name: "海棠护理站", reportRate: "95%", onTime: "98%", satisfaction: "4.8" },
        { name: "静和日间照料点", reportRate: "93%", onTime: "95%", satisfaction: "4.7" },
      ],
      alerts: [
        { level: "高", title: "夜间血压波动", detail: "3 位长者连续 2 次超阈值", action: "今日复核" },
        { level: "中", title: "复检资料缺失", detail: "5 份检验单未上传", action: "48 小时内补齐" },
        { level: "低", title: "随访超期提醒", detail: "7 位长者待电话回访", action: "本周完成" },
      ],
      members: [
        { name: "王秀兰", tag: "高血压", score: "92", note: "建议保持晨晚监测" },
        { name: "李国福", tag: "术后康复", score: "84", note: "行走训练连续 9 天" },
        { name: "周月琴", tag: "糖尿病", score: "78", note: "午后血糖需复测" },
      ],
      notes: [
        "本月重点围绕慢病复检、夜间血压波动和上门检测及时率进行复盘。",
        "整体服务执行稳定，营养指导覆盖偏低，建议与家属沟通增加复访频次。",
      ],
    },
    halfYear: {
      periodLabel: "2025.11 - 2026.04",
      updatedAt: "2026-04-21 09:30",
      badges: ["半年新增建档 63 人", "高风险闭环 94%", "复购率 71%"],
      metrics: [
        { label: "服务总人次", value: "4,268", delta: "+18%", trend: "up", note: "较去年同期" },
        { label: "复检完成率", value: "93.1%", delta: "+7.4%", trend: "up", note: "重点慢病群体" },
        { label: "异常事件", value: "56", delta: "-11%", trend: "down", note: "高风险事件减少" },
        { label: "机构续约率", value: "88%", delta: "+5%", trend: "up", note: "社区合作稳步提升" },
      ],
      trend: [
        { label: "11 月", value: 72, goal: 70 },
        { label: "12 月", value: 75, goal: 72 },
        { label: "1 月", value: 79, goal: 74 },
        { label: "2 月", value: 84, goal: 76 },
        { label: "3 月", value: 87, goal: 78 },
        { label: "4 月", value: 91, goal: 80 },
      ],
      categories: [
        { name: "基础护理", value: 96, tone: "green" },
        { name: "健康筛查", value: 83, tone: "teal" },
        { name: "康复训练", value: 71, tone: "amber" },
        { name: "家庭照护指导", value: 63, tone: "red" },
      ],
      highlights: [
        { title: "复购服务渗透", value: "71%", detail: "康养套餐续购稳定", tone: "green" },
        { title: "重点长者管理", value: "46 人", detail: "季度平均响应 2.6 小时", tone: "amber" },
        { title: "家属满意回访", value: "96%", detail: "仍需补强报告解读", tone: "red" },
      ],
      institutions: [
        { name: "槟西康养中心", reportRate: "97%", onTime: "95%", satisfaction: "4.9" },
        { name: "海棠护理站", reportRate: "94%", onTime: "97%", satisfaction: "4.8" },
        { name: "静和日间照料点", reportRate: "92%", onTime: "94%", satisfaction: "4.7" },
      ],
      alerts: [
        { level: "高", title: "糖尿病复查波动", detail: "近半年 6 位长者出现阶段性反弹", action: "升级面访" },
        { level: "中", title: "康复计划中断", detail: "4 位术后长者连续 7 天缺记录", action: "联系护理师" },
        { level: "低", title: "家属培训待补课", detail: "11 户家庭未完成照护培训", action: "下月集中安排" },
      ],
      members: [
        { name: "陈玉梅", tag: "认知风险", score: "90", note: "建议 2 周一次家庭回访" },
        { name: "赵建华", tag: "慢阻肺", score: "86", note: "呼吸训练依从性提升" },
        { name: "孙桂芝", tag: "骨科康复", score: "81", note: "夜间疼痛记录需复核" },
      ],
      notes: [
        "近半年整体趋势持续走高，服务准时率和复检完成率已经进入稳定区间。",
        "家庭照护指导仍有扩容空间，建议把报告解读与家属培训合并为一体化服务包。",
      ],
    },
  },
} as const;

export default mock;
