import memberListMock, { type MemberItem, type MemberTag, type MemberTagTone } from "../member-list/mock";

export const memberDetailStorageKey = "admin:elder:selected-member-id";
const deletedMemberIdsStorageKey = "admin:elder:deleted-member-ids";
const memberTagOverridesStorageKey = "admin:elder:member-tag-overrides";
const addedMembersStorageKey = "admin:elder:added-members";
const mockMemberIds = new Set(memberListMock.members.map((member) => member.id));
const tagToneSequence: MemberTagTone[] = ["mint", "peach", "lavender", "gold"];

export type MemberDetailTone = "brand" | "accent" | "danger" | "neutral";
export type MemberDetailTabKey =
  | "profile"
  | "health"
  | "medication"
  | "metrics"
  | "device"
  | "report"
  | "order"
  | "asset"
  | "content"
  | "service";

export interface MemberDetailTab {
  key: MemberDetailTabKey;
  label: string;
}

export interface MemberDetailField {
  label: string;
  value: string;
  wide?: boolean;
}

export interface MemberDetailSection {
  title: string;
  description: string;
  fields: MemberDetailField[];
}

export interface MemberSummaryMetric {
  label: string;
  value: string;
  helper: string;
  tone: MemberDetailTone;
}

export interface MemberMedication {
  name: string;
  dosage: string;
  schedule: string;
  adherence: string;
  note: string;
  tone: MemberDetailTone;
}

export interface MemberHealthMetric {
  label: string;
  value: string;
  unit: string;
  helper: string;
  tone: MemberDetailTone;
}

export interface MemberHealthLog {
  time: string;
  item: string;
  value: string;
  result: string;
  source: string;
  tone: MemberDetailTone;
}

export interface MemberDeviceItem {
  name: string;
  model: string;
  serial: string;
  location: string;
  lastSync: string;
  status: string;
  tone: MemberDetailTone;
}

export interface MemberListRow {
  title: string;
  detail: string;
  status: string;
  tone: MemberDetailTone;
  time?: string;
  extra?: string;
}

export interface MemberTimelineItem {
  time: string;
  title: string;
  description: string;
  operator: string;
  tone: MemberDetailTone;
}

export interface MemberDetailRecord {
  member: MemberItem;
  archiveNo: string;
  age: number;
  gender: string;
  birthday: string;
  bloodType: string;
  maritalStatus: string;
  education: string;
  residenceType: string;
  address: string;
  source: string;
  advisor: string;
  carePlan: string;
  note: string;
  emergencyContact: {
    name: string;
    relation: string;
    phone: string;
  };
  healthTags: string[];
  summaryMetrics: MemberSummaryMetric[];
  assetMetrics: MemberSummaryMetric[];
  profileSections: MemberDetailSection[];
  healthSections: MemberDetailSection[];
  medications: MemberMedication[];
  medicationTips: string[];
  healthMetricCards: MemberHealthMetric[];
  healthMetricLogs: MemberHealthLog[];
  devices: MemberDeviceItem[];
  reports: MemberListRow[];
  orders: MemberListRow[];
  assetRecords: MemberListRow[];
  contents: MemberListRow[];
  operationTimeline: MemberTimelineItem[];
  serviceTimeline: MemberTimelineItem[];
}

const birthdayBaseYear = 1950;
const bloodTypes = ["A", "B", "O", "AB"] as const;
const maritalStatuses = ["已婚", "丧偶", "离异", "已婚"] as const;
const educationLevels = ["高中", "中专", "大专", "本科"] as const;
const residenceTypes = ["居家养老", "社区站点托养", "机构照护", "康复跟踪"] as const;
const sourcePool = ["线下门店登记", "家属转介绍", "慢病筛查转化", "社区活动报名"] as const;
const advisorPool = ["健康顾问 余晴", "护理师 周楠", "康复专员 林芷", "客服经理 赵航"] as const;
const carePlans = ["慢病稳定管理", "术后康复跟踪", "睡眠改善陪护", "重点高龄随访"] as const;
const addressPool = [
  "上海市浦东新区丹桂路 68 号 2 栋 502",
  "上海市静安区中兴路 136 号 5 栋 1201",
  "上海市徐汇区田林东路 88 号 6 栋 801",
  "上海市杨浦区国顺东路 211 弄 3 号 901",
] as const;
const notePool = [
  "家属对响应时效要求较高，建议优先安排上午时段回访。",
  "近期处于康复训练阶段，适合搭配饮食与运动提醒服务。",
  "夜间睡眠质量偏弱，建议减少晚间高刺激活动。",
  "最近三十天互动活跃，适合持续推送健康宣教内容。",
] as const;
const emergencyPool = [
  { name: "王丽", relation: "女儿", phone: "13866540031" },
  { name: "张晨", relation: "儿子", phone: "13711220816" },
  { name: "刘琴", relation: "配偶", phone: "13690031276" },
  { name: "陈雪", relation: "外甥女", phone: "13576008915" },
] as const;
const healthTagPool = [
  ["血压波动", "晨起偏高", "需复测"],
  ["睡眠浅", "夜间起夜", "需作息干预"],
  ["血糖餐后偏高", "饮食管理", "步数不足"],
  ["关节疼痛", "情绪波动", "需关怀跟进"],
] as const;
const medicationPool: readonly MemberMedication[][] = [
  [
    { name: "缬沙坦胶囊", dosage: "80mg / 次", schedule: "早餐后 1 次", adherence: "按时服用", note: "晨起测压后服用", tone: "brand" },
    { name: "阿司匹林肠溶片", dosage: "100mg / 次", schedule: "晚餐后 1 次", adherence: "需继续观察", note: "注意胃部不适反馈", tone: "accent" },
  ],
  [
    { name: "盐酸二甲双胍片", dosage: "500mg / 次", schedule: "早餐后、晚餐后", adherence: "按时服用", note: "建议同步记录餐后血糖", tone: "brand" },
    { name: "维生素 D3", dosage: "1 粒 / 次", schedule: "午餐后 1 次", adherence: "偶有遗漏", note: "已开启提醒推送", tone: "accent" },
  ],
  [
    { name: "氨氯地平片", dosage: "5mg / 次", schedule: "早晨 1 次", adherence: "按时服用", note: "最近血压较平稳", tone: "brand" },
    { name: "甲钴胺片", dosage: "0.5mg / 次", schedule: "三餐后", adherence: "需家属提醒", note: "建议结合周计划盒管理", tone: "neutral" },
  ],
  [
    { name: "褪黑素片", dosage: "2mg / 次", schedule: "睡前 30 分钟", adherence: "按时服用", note: "一周后复查睡眠评分", tone: "brand" },
    { name: "葡萄糖胺胶囊", dosage: "1 粒 / 次", schedule: "早餐后、晚餐后", adherence: "需继续观察", note: "运动日注意补水", tone: "accent" },
  ],
] as const;

export const memberDetailTabs: MemberDetailTab[] = [
  { key: "profile", label: "个人信息" },
  { key: "health", label: "健康信息" },
  { key: "medication", label: "用药信息" },
  { key: "metrics", label: "健康数据" },
  { key: "device", label: "设备信息" },
  { key: "report", label: "报告信息" },
  { key: "order", label: "订单信息" },
  { key: "asset", label: "资产信息" },
  { key: "content", label: "内容信息" },
  { key: "service", label: "服务记录" },
];

function createSummaryMetrics(index: number): MemberSummaryMetric[] {
  return [
    { label: "服务订单", value: `${6 + index}`, helper: "近 90 天累计", tone: "brand" },
    { label: "预警事件", value: `${1 + (index % 3)}`, helper: "待关注项", tone: index % 2 === 0 ? "accent" : "danger" },
    { label: "随访次数", value: `${8 + index * 2}`, helper: "本月已完成", tone: "neutral" },
    { label: "内容互动", value: `${16 + index * 3}`, helper: "7 日触达", tone: "brand" },
  ];
}

function createAssetMetrics(index: number): MemberSummaryMetric[] {
  return [
    { label: "套餐余额", value: `${12 + index} 次`, helper: "可用服务包", tone: "brand" },
    { label: "账户积分", value: `${860 + index * 45}`, helper: "可兑换权益", tone: "accent" },
    { label: "优惠券", value: `${2 + (index % 3)} 张`, helper: "未使用", tone: "neutral" },
  ];
}

function createProfileSections(member: MemberItem, index: number, archiveNo: string, detail: Omit<MemberDetailRecord, "profileSections" | "healthSections">): MemberDetailSection[] {
  return [
    {
      title: "基础档案",
      description: "展示用户注册信息与身份档案。",
      fields: [
        { label: "用户 ID", value: member.id },
        { label: "档案编号", value: archiveNo },
        { label: "真实姓名", value: member.realName },
        { label: "昵称", value: member.nickname },
        { label: "性别", value: detail.gender },
        { label: "年龄", value: `${detail.age} 岁` },
        { label: "出生日期", value: detail.birthday },
        { label: "血型", value: detail.bloodType },
        { label: "婚姻状态", value: detail.maritalStatus },
        { label: "学历", value: detail.education },
      ],
    },
    {
      title: "联系与服务",
      description: "包括居住方式、紧急联系人与服务归属。",
      fields: [
        { label: "手机号", value: member.phone },
        { label: "注册时间", value: member.registeredAt },
        { label: "注册来源", value: detail.source },
        { label: "服务顾问", value: detail.advisor },
        { label: "居住形态", value: detail.residenceType },
        { label: "重点方案", value: detail.carePlan },
        { label: "紧急联系人", value: `${detail.emergencyContact.name} / ${detail.emergencyContact.relation}`, wide: true },
        { label: "紧急联系电话", value: detail.emergencyContact.phone },
        { label: "联系地址", value: detail.address, wide: true },
        { label: "备注", value: detail.note, wide: true },
        { label: "用户标签", value: member.tags.map((tag) => tag.label).join(" / "), wide: true },
        { label: "最近一次活跃", value: `2026-04-${10 + index} 15:2${index}` },
      ],
    },
  ];
}

function createHealthSections(detail: Omit<MemberDetailRecord, "profileSections" | "healthSections">, index: number): MemberDetailSection[] {
  const chronicDescription = index % 2 === 0 ? "高血压、血糖管理" : "睡眠质量、关节疼痛";

  return [
    {
      title: "健康画像",
      description: "用于后台快速识别慢病与生活状态。",
      fields: [
        { label: "主要关注", value: chronicDescription },
        { label: "风险标签", value: detail.healthTags.join(" / "), wide: true },
        { label: "最近体检", value: `2026-04-${4 + index}` },
        { label: "BMI", value: `${22.1 + index * 0.4}` },
        { label: "行动能力", value: index % 3 === 0 ? "独立行走" : "需轻度辅助" },
        { label: "认知状态", value: index % 2 === 0 ? "清晰稳定" : "偶有遗忘" },
      ],
    },
    {
      title: "预警与随访",
      description: "反映当前干预进展与下一步计划。",
      fields: [
        { label: "风险等级", value: index % 2 === 0 ? "中风险" : "重点关注" },
        { label: "最近随访", value: `2026-04-${12 + index} 09:3${index}` },
        { label: "下次计划", value: `2026-04-${21 + index} 10:00` },
        { label: "干预负责人", value: detail.advisor },
        { label: "随访建议", value: detail.note, wide: true },
      ],
    },
  ];
}

function createHealthMetricCards(index: number): MemberHealthMetric[] {
  return [
    { label: "血压", value: `${126 + index}/${78 + index}`, unit: "mmHg", helper: "近 3 日均值", tone: "brand" },
    { label: "血糖", value: `${5.8 + index * 0.2}`, unit: "mmol/L", helper: "空腹监测", tone: index % 2 === 0 ? "accent" : "brand" },
    { label: "睡眠时长", value: `${6.4 + index * 0.2}`, unit: "h", helper: "昨夜统计", tone: "neutral" },
    { label: "日均步数", value: `${4200 + index * 380}`, unit: "步", helper: "近 7 日均值", tone: "brand" },
  ];
}

function createHealthMetricLogs(index: number): MemberHealthLog[] {
  return [
    { time: `2026-04-${16 + index} 08:15`, item: "晨起血压", value: `${128 + index}/${79 + index} mmHg`, result: "正常波动", source: "蓝牙血压计", tone: "brand" },
    { time: `2026-04-${16 + index} 12:40`, item: "餐后血糖", value: `${7.2 + index * 0.1} mmol/L`, result: index % 2 === 0 ? "轻度偏高" : "稳定", source: "家用血糖仪", tone: index % 2 === 0 ? "accent" : "brand" },
    { time: `2026-04-${17 + index} 07:30`, item: "昨夜睡眠", value: `${6.1 + index * 0.2} h`, result: "可继续观察", source: "睡眠监测带", tone: "neutral" },
    { time: `2026-04-${17 + index} 18:10`, item: "日间步数", value: `${4600 + index * 400} 步`, result: "活动达标", source: "腕带设备", tone: "brand" },
  ];
}

function createDevices(member: MemberItem, index: number): MemberDeviceItem[] {
  return [
    {
      name: "智能腕带",
      model: `IHC-WATCH-${index + 1}`,
      serial: `WB-${member.id.slice(-6)}`,
      location: "佩戴中",
      lastSync: `2026-04-${18 + index} 09:2${index}`,
      status: "在线",
      tone: "brand",
    },
    {
      name: index % 2 === 0 ? "蓝牙血压计" : "睡眠监测带",
      model: index % 2 === 0 ? `BP-${index + 21}` : `SLP-${index + 21}`,
      serial: `DV-${member.id.slice(-4)}-${index + 3}`,
      location: "居家客厅",
      lastSync: `2026-04-${17 + index} 21:1${index}`,
      status: index % 2 === 0 ? "同步正常" : "待校准",
      tone: index % 2 === 0 ? "neutral" : "accent",
    },
  ];
}

function createReports(index: number): MemberListRow[] {
  return [
    {
      title: "季度健康评估报告",
      detail: "包含血压、血糖、睡眠综合分析",
      status: "已归档",
      tone: "brand",
      time: `2026-04-${9 + index}`,
      extra: "责任医生：张宁",
    },
    {
      title: "慢病复诊建议",
      detail: "线上问诊后自动生成干预建议",
      status: index % 2 === 0 ? "待确认" : "已确认",
      tone: index % 2 === 0 ? "accent" : "brand",
      time: `2026-04-${12 + index}`,
      extra: "来源：互联网医院",
    },
    {
      title: "月度服务回访单",
      detail: "记录家属满意度与执行反馈",
      status: "已回访",
      tone: "neutral",
      time: `2026-04-${15 + index}`,
      extra: "满意度：4.8 / 5",
    },
  ];
}

function createOrders(index: number): MemberListRow[] {
  return [
    {
      title: "居家随访服务包",
      detail: "每周 2 次电话随访 + 每月上门 1 次",
      status: "执行中",
      tone: "brand",
      time: `2026-04-${6 + index}`,
      extra: `订单金额：¥${1299 + index * 80}`,
    },
    {
      title: "慢病管理增购",
      detail: "血压、血糖数据自动汇总分析",
      status: index % 2 === 0 ? "待支付" : "已完成",
      tone: index % 2 === 0 ? "accent" : "neutral",
      time: `2026-04-${10 + index}`,
      extra: `渠道：${index % 2 === 0 ? "小程序" : "顾问代下单"}`,
    },
    {
      title: "康复训练课程",
      detail: "视频课程 + 打卡跟踪",
      status: "已开通",
      tone: "brand",
      time: `2026-04-${13 + index}`,
      extra: `有效期：30 天`,
    },
  ];
}

function createAssetRecords(index: number): MemberListRow[] {
  return [
    {
      title: "服务次数包",
      detail: "上门服务 / 电话关怀通用",
      status: "可用",
      tone: "brand",
      extra: `${12 + index} 次`,
    },
    {
      title: "会员成长积分",
      detail: "可兑换课程、检测服务",
      status: "累计中",
      tone: "accent",
      extra: `${860 + index * 45} 分`,
    },
    {
      title: "专属优惠券",
      detail: "用于慢病复诊与康复课程",
      status: index % 2 === 0 ? "即将到期" : "可使用",
      tone: index % 2 === 0 ? "danger" : "neutral",
      extra: `有效期至 2026-05-${8 + index}`,
    },
  ];
}

function createContents(index: number): MemberListRow[] {
  return [
    {
      title: "高血压饮食管理",
      detail: "专题课程 / 已推送",
      status: "已阅读",
      tone: "brand",
      time: `2026-04-${11 + index}`,
      extra: "完成度：88%",
    },
    {
      title: "睡眠改善训练营",
      detail: "7 日打卡内容",
      status: index % 2 === 0 ? "进行中" : "待开始",
      tone: index % 2 === 0 ? "accent" : "neutral",
      time: `2026-04-${14 + index}`,
      extra: "触达渠道：公众号",
    },
    {
      title: "家属沟通指南",
      detail: "家属协同照护资料包",
      status: "已收藏",
      tone: "brand",
      time: `2026-04-${16 + index}`,
      extra: "最近打开：昨天",
    },
  ];
}

function createOperationTimeline(index: number): MemberTimelineItem[] {
  return [
    {
      time: `2026-04-${15 + index} 09:30`,
      title: "更新用户标签",
      description: "根据近一周健康数据，新增慢病跟踪标签。",
      operator: "系统管理员",
      tone: "brand",
    },
    {
      time: `2026-04-${14 + index} 16:10`,
      title: "同步设备数据",
      description: "智能腕带与蓝牙设备完成数据汇总。",
      operator: "设备网关",
      tone: "neutral",
    },
    {
      time: `2026-04-${12 + index} 11:20`,
      title: "调整服务计划",
      description: "将每周回访频率由 1 次提升至 2 次。",
      operator: "健康顾问",
      tone: "accent",
    },
  ];
}

function createServiceTimeline(index: number): MemberTimelineItem[] {
  return [
    {
      time: `2026-04-${18 + index} 08:40`,
      title: "晨间回访",
      description: "确认昨夜睡眠与晨起血压情况，建议继续观察。",
      operator: "护理师 周楠",
      tone: "brand",
    },
    {
      time: `2026-04-${16 + index} 14:20`,
      title: "家属沟通",
      description: "向家属同步近期预警与干预建议，已确认后续安排。",
      operator: "健康顾问 余晴",
      tone: "neutral",
    },
    {
      time: `2026-04-${13 + index} 10:00`,
      title: "上门随访",
      description: "评估步态、用药记录与居家环境安全性。",
      operator: "康复专员 林芷",
      tone: "accent",
    },
    {
      time: `2026-04-${10 + index} 19:10`,
      title: "预警闭环",
      description: "处理一次餐后血糖偏高提醒，已完成复测确认。",
      operator: "值班医生 张宁",
      tone: "brand",
    },
  ];
}

function buildMemberDetail(member: MemberItem, index: number): MemberDetailRecord {
  const archiveNo = `A-${member.id.slice(-6)}-${index + 1}`;
  const age = 66 + index * 2;
  const gender = index % 2 === 0 ? "男" : "女";
  const birthday = `${birthdayBaseYear + index}-${`${(index % 9) + 1}`.padStart(2, "0")}-${`${10 + index}`.padStart(2, "0")}`;
  const bloodType = bloodTypes[index % bloodTypes.length];
  const maritalStatus = maritalStatuses[index % maritalStatuses.length];
  const education = educationLevels[index % educationLevels.length];
  const residenceType = residenceTypes[index % residenceTypes.length];
  const address = addressPool[index % addressPool.length];
  const source = sourcePool[index % sourcePool.length];
  const advisor = advisorPool[index % advisorPool.length];
  const carePlan = carePlans[index % carePlans.length];
  const note = notePool[index % notePool.length];
  const emergencyContact = emergencyPool[index % emergencyPool.length];
  const healthTags = [...member.tags.map((tag) => tag.label), ...healthTagPool[index % healthTagPool.length]];
  const summaryMetrics = createSummaryMetrics(index);
  const assetMetrics = createAssetMetrics(index);
  const medications = medicationPool[index % medicationPool.length].map((item) => ({ ...item }));
  const medicationTips = [
    "重点观察晨起或餐后数据波动，异常时同步联系顾问。",
    "建议使用周计划药盒，减少遗漏。",
    "家属端已开启提醒推送，可协同确认执行情况。",
  ];
  const healthMetricCards = createHealthMetricCards(index);
  const healthMetricLogs = createHealthMetricLogs(index);
  const devices = createDevices(member, index);
  const reports = createReports(index);
  const orders = createOrders(index);
  const assetRecords = createAssetRecords(index);
  const contents = createContents(index);
  const operationTimeline = createOperationTimeline(index);
  const serviceTimeline = createServiceTimeline(index);

  const detailBase = {
    member,
    archiveNo,
    age,
    gender,
    birthday,
    bloodType,
    maritalStatus,
    education,
    residenceType,
    address,
    source,
    advisor,
    carePlan,
    note,
    emergencyContact,
    healthTags,
    summaryMetrics,
    assetMetrics,
    medications,
    medicationTips,
    healthMetricCards,
    healthMetricLogs,
    devices,
    reports,
    orders,
    assetRecords,
    contents,
    operationTimeline,
    serviceTimeline,
  };

  return {
    ...detailBase,
    profileSections: createProfileSections(member, index, archiveNo, detailBase),
    healthSections: createHealthSections(detailBase, index),
  };
}

function readDeletedMemberIds() {
  if (typeof window === "undefined") {
    return [] as string[];
  }

  const rawValue = window.sessionStorage.getItem(deletedMemberIdsStorageKey);

  if (!rawValue) {
    return [] as string[];
  }

  try {
    const parsed = JSON.parse(rawValue);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [] as string[];
  }
}

function readMemberTagOverrides() {
  if (typeof window === "undefined") {
    return {} as Record<string, string[]>;
  }

  const rawValue = window.sessionStorage.getItem(memberTagOverridesStorageKey);

  if (!rawValue) {
    return {} as Record<string, string[]>;
  }

  try {
    const parsed = JSON.parse(rawValue);

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {} as Record<string, string[]>;
    }

    return Object.fromEntries(
      Object.entries(parsed).map(([memberId, labels]) => [
        memberId,
        Array.isArray(labels)
          ? labels.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean)
          : [],
      ]),
    ) as Record<string, string[]>;
  } catch {
    return {} as Record<string, string[]>;
  }
}

function resolveTagTone(label: string, currentTags: MemberTag[] = []) {
  const currentMatch = currentTags.find((tag) => tag.label === label);

  if (currentMatch) {
    return currentMatch.tone;
  }

  const existingTag = memberListMock.members.flatMap((member) => member.tags).find((tag) => tag.label === label);

  if (existingTag) {
    return existingTag.tone;
  }

  const hash = Array.from(label).reduce((total, char) => total + char.charCodeAt(0), 0);
  return tagToneSequence[hash % tagToneSequence.length];
}

function buildMemberTags(labels: string[], currentTags: MemberTag[] = []) {
  return Array.from(new Set(labels.map((label) => label.trim()).filter(Boolean))).map((label) => ({
    label,
    tone: resolveTagTone(label, currentTags),
  }));
}

function resolveMemberTags(member: MemberItem, overrideLabels?: string[]) {
  if (!overrideLabels?.length) {
    return member.tags.map((tag) => ({ ...tag }));
  }

  return buildMemberTags(overrideLabels, member.tags);
}

function readAddedMembers() {
  if (typeof window === "undefined") {
    return [] as MemberItem[];
  }

  const rawValue = window.sessionStorage.getItem(addedMembersStorageKey);

  if (!rawValue) {
    return [] as MemberItem[];
  }

  try {
    const parsed = JSON.parse(rawValue);

    if (!Array.isArray(parsed)) {
      return [] as MemberItem[];
    }

    return parsed
      .filter((item): item is MemberItem => Boolean(item && typeof item === "object" && typeof item.id === "string"))
      .filter((item) => !mockMemberIds.has(item.id))
      .map((item) => ({
        ...item,
        nickname: String(item.nickname || "").trim(),
        realName: String(item.realName || "").trim(),
        phone: String(item.phone || "").trim(),
        registeredAt: String(item.registeredAt || "").trim(),
        avatarAccent: String(item.avatarAccent || "#8b97a4"),
        avatarShadow: String(item.avatarShadow || "#33404d"),
        tags: Array.isArray(item.tags)
          ? item.tags
              .filter((tag): tag is MemberTag => Boolean(tag && typeof tag === "object" && typeof tag.label === "string"))
              .map((tag) => ({
                label: tag.label.trim(),
                tone: resolveTagTone(tag.label.trim()),
              }))
              .filter((tag) => tag.label)
          : [],
      }));
  } catch {
    return [] as MemberItem[];
  }
}

export function getMemberDetailRecords() {
  const deletedIds = new Set(readDeletedMemberIds());
  const tagOverrides = readMemberTagOverrides();
  const currentMembers = [...readAddedMembers(), ...memberListMock.members]
    .filter((member) => !deletedIds.has(member.id))
    .map((member) => ({
      ...member,
      tags: resolveMemberTags(member, tagOverrides[member.id]),
    }));

  return currentMembers.map((member, index) => buildMemberDetail(member, index));
}

export const memberDetailRecords: MemberDetailRecord[] = getMemberDetailRecords();

export function getMemberDetailById(id?: string | null) {
  const records = getMemberDetailRecords();

  if (records.length === 0) {
    return null;
  }

  if (!id) {
    return records[0];
  }

  return records.find((record) => record.member.id === id) ?? records[0];
}
