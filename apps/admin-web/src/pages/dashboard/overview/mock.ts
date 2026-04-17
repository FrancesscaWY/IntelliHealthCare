const mock = {
  greeting: "上午好，运营中心",
  dateText: "今日重点围绕长者风险、服务调度和设备稳定性推进。",
  stats: [
    { label: "在住长者", value: "286", delta: "+12 本周新增", tone: "brand" },
    { label: "待处理预警", value: "18", delta: "3 条高优先级", tone: "danger" },
    { label: "今日服务工单", value: "64", delta: "完成率 78%", tone: "accent" },
    { label: "设备在线率", value: "96.4%", delta: "较昨日 +1.8%", tone: "neutral" },
  ],
  quickLinks: [
    {
      title: "长者档案",
      description: "查看重点长者、入住状态和家属联系人。",
      pageId: "elder/member-list",
      actionLabel: "进入档案",
    },
    {
      title: "服务调度",
      description: "跟进派单进度、人员班次和异常订单。",
      pageId: "service/order-dispatch",
      actionLabel: "查看调度",
    },
    {
      title: "健康预警",
      description: "处理生命体征异常与重点人群干预闭环。",
      pageId: "health/alert-center",
      actionLabel: "进入预警",
    },
    {
      title: "设备监控",
      description: "定位设备、手环和传感器在线巡检。",
      pageId: "device/device-monitor",
      actionLabel: "查看设备",
    },
  ],
  alerts: [
    {
      level: "高",
      title: "3 名长者血压连续异常",
      detail: "2 楼东区 08:40-09:10 连续上报高值，待护士长复核。",
      owner: "护理站 A 组",
    },
    {
      level: "中",
      title: "夜间离床告警 7 次",
      detail: "房间 2-306 传感器频繁触发，需要核对设备灵敏度。",
      owner: "设备运维组",
    },
    {
      level: "中",
      title: "体检报告待解读 12 份",
      detail: "近 24 小时新增上传，待医生审核并同步家属。",
      owner: "健康管理组",
    },
  ],
  dispatchBoard: [
    { label: "待派单", value: "11", helper: "含 2 单加急" },
    { label: "服务中", value: "23", helper: "上门护理与康复训练" },
    { label: "待回访", value: "9", helper: "需确认满意度和异常复盘" },
  ],
  staffFocus: [
    { name: "李秀兰", role: "高级护理员", status: "满负荷", shift: "09:00 - 18:00" },
    { name: "周明", role: "康复治疗师", status: "待派单", shift: "10:00 - 19:00" },
    { name: "陈安", role: "签约医生", status: "巡诊中", shift: "08:30 - 17:30" },
  ],
  tasks: [
    "复核高血压重点长者 3 人的晨检记录。",
    "完成 2 台离床传感器离线排查。",
    "确认周末社区活动报名名单并通知家属。",
    "更新首页健康讲堂运营位与专题内容。",
  ],
};

export default mock;
