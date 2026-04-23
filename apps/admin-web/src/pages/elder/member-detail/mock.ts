import memberListMock, { type MemberItem, type MemberTag, type MemberTagTone } from "../member-list/mock";
import homeCareOrderImage from "../../../../../user-web/src/assets/service/daily-clean/cleaning-card.png";
import rehabOrderImage from "../../../../../user-web/src/assets/service/home-care/img.png";
import examOrderImage from "../../../../../user-web/src/assets/service/home-care/img_2.png";
import circleBeachImage from "../../../../../user-web/src/assets/community/activities/beach-walk-activity.jpg";
import circleCherryImage from "../../../../../user-web/src/assets/community/activities/cherry-blossom-activity.jpg";
import circleCookImage from "../../../../../user-web/src/assets/community/activities/cook.png";
import circleCookTwoImage from "../../../../../user-web/src/assets/community/activities/cook2.png";
import circleCookThreeImage from "../../../../../user-web/src/assets/community/activities/cook3.png";
import circleSunsetImage from "../../../../../user-web/src/assets/community/activities/sunset.png";

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

export type MemberHealthDashboardKey =
  | "weight"
  | "steps"
  | "sleep"
  | "bloodSugar"
  | "bloodPressure"
  | "oxygen"
  | "heartRate";

export interface MemberHealthDashboardPoint {
  label: string;
  value: number;
}

export interface MemberHealthDashboardChart {
  title: string;
  unit?: string;
  color: string;
  points: MemberHealthDashboardPoint[];
  min?: number;
  max?: number;
  decimals?: number;
}

export interface MemberHealthDashboardRecord {
  id: string;
  time: string;
  value: string;
  source: string;
  creator: string;
}

export interface MemberHealthDashboardModule {
  key: MemberHealthDashboardKey;
  label: string;
  startDate: string;
  endDate: string;
  valueLabel: string;
  charts: [MemberHealthDashboardChart, MemberHealthDashboardChart];
  records: MemberHealthDashboardRecord[];
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

export interface MemberReportItem {
  id: string;
  uploadedAt: string;
  name: string;
  type: string;
  source: string;
  uploader: string;
  orderId: string;
  reportDate: string;
}

export interface MemberOrderItem {
  id: string;
  orderTime: string;
  orderNo: string;
  serviceType: string;
  image: string;
  productName: string;
  productSummary: string;
  price: string;
  payAmount: string;
  buyerName: string;
  buyerPhone: string;
  orderStatus: string;
  paymentMethod: string;
  tone: MemberDetailTone;
}

export interface MemberAssetCouponItem {
  id: string;
  name: string;
  status: string;
  amount: string;
  condition: string;
  scope: string;
  receivedAt: string;
  expiresAt: string;
  tone: MemberDetailTone;
}

export interface MemberAssetPointItem {
  id: string;
  type: string;
  amount: string;
  reason: string;
  remark: string;
  operator: string;
  time: string;
  tone: MemberDetailTone;
}

export interface MemberAssetGrowthItem {
  id: string;
  type: string;
  amount: string;
  reason: string;
  remark: string;
  operator: string;
  time: string;
  tone: MemberDetailTone;
}

export interface MemberContentItem {
  id: string;
  content: string;
  topic: string;
  image: string;
  likes: number;
  favorites: number;
  shares: number;
  comments: number;
  publishedAt: string;
  visible: boolean;
}

export interface MemberServiceRecordItem {
  id: string;
  orderNo: string;
  serviceType: string;
  image: string;
  orderName: string;
  productSummary: string;
  serviceItem: string;
  price: string;
  couponAmount: string;
  payAmount: string;
  status: string;
  tone: MemberDetailTone;
  staff: string;
  serviceTime: string;
  createdAt: string;
  paidAt: string;
  serviceCode: string;
  serviceCodeHint: string;
  remark: string;
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
  healthMetricModules: MemberHealthDashboardModule[];
  devices: MemberDeviceItem[];
  reports: MemberReportItem[];
  orders: MemberOrderItem[];
  assetCoupons: MemberAssetCouponItem[];
  assetPoints: MemberAssetPointItem[];
  assetGrowthRecords: MemberAssetGrowthItem[];
  assetRecords: MemberListRow[];
  contents: MemberContentItem[];
  serviceRecords: MemberServiceRecordItem[];
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
    { name: "维生素B1片", dosage: "1 片 / 次", schedule: "午餐后 1 次", adherence: "按时服用", note: "建议饭后服用减少胃部刺激", tone: "neutral" },
  ],
  [
    { name: "盐酸二甲双胍片", dosage: "500mg / 次", schedule: "早餐后、晚餐后", adherence: "按时服用", note: "建议同步记录餐后血糖", tone: "brand" },
    { name: "维生素 D3", dosage: "1 粒 / 次", schedule: "午餐后 1 次", adherence: "偶有遗漏", note: "已开启提醒推送", tone: "accent" },
    { name: "阿卡波糖片", dosage: "50mg / 次", schedule: "午餐后 1 次", adherence: "按时服用", note: "建议随主食同服", tone: "neutral" },
  ],
  [
    { name: "氨氯地平片", dosage: "5mg / 次", schedule: "早晨 1 次", adherence: "按时服用", note: "最近血压较平稳", tone: "brand" },
    { name: "甲钴胺片", dosage: "0.5mg / 次", schedule: "三餐后", adherence: "需家属提醒", note: "建议结合周计划盒管理", tone: "neutral" },
  ],
  [
    { name: "褪黑素片", dosage: "2mg / 次", schedule: "睡前 30 分钟", adherence: "按时服用", note: "一周后复查睡眠评分", tone: "brand" },
    { name: "葡萄糖胺胶囊", dosage: "1 粒 / 次", schedule: "早餐后、晚餐后", adherence: "需继续观察", note: "运动日注意补水", tone: "accent" },
    { name: "钙维生素D片", dosage: "1 片 / 次", schedule: "午餐后 1 次", adherence: "按时服用", note: "建议随餐服用", tone: "neutral" },
    { name: "维生素B族片", dosage: "1 片 / 次", schedule: "早餐后 1 次", adherence: "按时服用", note: "早餐后服用更稳妥", tone: "brand" },
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

function createHealthMetricModules(member: MemberItem, index: number): MemberHealthDashboardModule[] {
  const dateLabels = ["04/01", "04/02", "04/03", "04/04", "04/05", "04/06", "04/07"];
  const startDate = "2026-04-01";
  const endDate = "2026-04-07";

  return [
    {
      key: "weight",
      label: "体重",
      startDate,
      endDate,
      valueLabel: "体重（kg）",
      charts: [
        {
          title: "体重趋势",
          unit: "kg",
          color: "#44cfab",
          points: [
            { label: dateLabels[0], value: 52.4 + index * 0.2 },
            { label: dateLabels[1], value: 57.6 + index * 0.2 },
            { label: dateLabels[2], value: 54.2 + index * 0.2 },
            { label: dateLabels[3], value: 54.1 + index * 0.2 },
            { label: dateLabels[4], value: 52.5 + index * 0.2 },
            { label: dateLabels[5], value: 57.4 + index * 0.2 },
            { label: dateLabels[6], value: 57.5 + index * 0.2 },
          ],
          min: 40,
          max: 65,
          decimals: 0,
        },
        {
          title: "BMI趋势",
          color: "#f8cf59",
          points: [
            { label: dateLabels[0], value: 19.7 + index * 0.03 },
            { label: dateLabels[1], value: 19.7 + index * 0.03 },
            { label: dateLabels[2], value: 19.2 + index * 0.03 },
            { label: dateLabels[3], value: 19.4 + index * 0.03 },
            { label: dateLabels[4], value: 19.4 + index * 0.03 },
            { label: dateLabels[5], value: 19.8 + index * 0.03 },
            { label: dateLabels[6], value: 19.2 + index * 0.03 },
          ],
          min: 18,
          max: 20.5,
          decimals: 1,
        },
      ],
      records: [
        { id: `weight-${member.id}-1`, time: "2026-04-07 09:18", value: `${(57.5 + index * 0.2).toFixed(1)}`, source: "手动添加", creator: member.realName },
        { id: `weight-${member.id}-2`, time: "2026-04-06 08:56", value: `${(57.4 + index * 0.2).toFixed(1)}`, source: "蓝牙体脂秤", creator: member.realName },
        { id: `weight-${member.id}-3`, time: "2026-04-05 09:10", value: `${(52.5 + index * 0.2).toFixed(1)}`, source: "手动添加", creator: member.realName },
        { id: `weight-${member.id}-4`, time: "2026-04-04 08:42", value: `${(54.1 + index * 0.2).toFixed(1)}`, source: "蓝牙体脂秤", creator: member.realName },
        { id: `weight-${member.id}-5`, time: "2026-04-03 09:05", value: `${(54.2 + index * 0.2).toFixed(1)}`, source: "手动添加", creator: member.realName },
        { id: `weight-${member.id}-6`, time: "2026-04-02 08:38", value: `${(57.6 + index * 0.2).toFixed(1)}`, source: "蓝牙体脂秤", creator: member.realName },
        { id: `weight-${member.id}-7`, time: "2026-04-01 08:50", value: `${(52.4 + index * 0.2).toFixed(1)}`, source: "手动添加", creator: member.realName },
      ],
    },
    {
      key: "steps",
      label: "步数",
      startDate,
      endDate,
      valueLabel: "步数（步）",
      charts: [
        {
          title: "步数趋势",
          unit: "步",
          color: "#ff8d66",
          points: [
            { label: dateLabels[0], value: 4200 + index * 120 },
            { label: dateLabels[1], value: 6100 + index * 140 },
            { label: dateLabels[2], value: 5300 + index * 130 },
            { label: dateLabels[3], value: 4800 + index * 110 },
            { label: dateLabels[4], value: 6600 + index * 160 },
            { label: dateLabels[5], value: 5900 + index * 150 },
            { label: dateLabels[6], value: 6300 + index * 170 },
          ],
          min: 3000,
          max: 8000,
          decimals: 0,
        },
        {
          title: "活动时长趋势",
          unit: "分钟",
          color: "#6f8cff",
          points: [
            { label: dateLabels[0], value: 38 + index },
            { label: dateLabels[1], value: 56 + index },
            { label: dateLabels[2], value: 45 + index },
            { label: dateLabels[3], value: 42 + index },
            { label: dateLabels[4], value: 61 + index },
            { label: dateLabels[5], value: 53 + index },
            { label: dateLabels[6], value: 58 + index },
          ],
          min: 20,
          max: 80,
          decimals: 0,
        },
      ],
      records: [
        { id: `steps-${member.id}-1`, time: "2026-04-07 20:30", value: `${6300 + index * 170}`, source: "腕带设备", creator: member.realName },
        { id: `steps-${member.id}-2`, time: "2026-04-06 20:30", value: `${5900 + index * 150}`, source: "腕带设备", creator: member.realName },
        { id: `steps-${member.id}-3`, time: "2026-04-05 20:30", value: `${6600 + index * 160}`, source: "腕带设备", creator: member.realName },
        { id: `steps-${member.id}-4`, time: "2026-04-04 20:30", value: `${4800 + index * 110}`, source: "腕带设备", creator: member.realName },
        { id: `steps-${member.id}-5`, time: "2026-04-03 20:30", value: `${5300 + index * 130}`, source: "腕带设备", creator: member.realName },
        { id: `steps-${member.id}-6`, time: "2026-04-02 20:30", value: `${6100 + index * 140}`, source: "腕带设备", creator: member.realName },
        { id: `steps-${member.id}-7`, time: "2026-04-01 20:30", value: `${4200 + index * 120}`, source: "腕带设备", creator: member.realName },
      ],
    },
    {
      key: "sleep",
      label: "睡眠",
      startDate,
      endDate,
      valueLabel: "睡眠时长（h）",
      charts: [
        {
          title: "睡眠时长趋势",
          unit: "h",
          color: "#8b7cf8",
          points: [
            { label: dateLabels[0], value: 6.2 + index * 0.05 },
            { label: dateLabels[1], value: 6.8 + index * 0.05 },
            { label: dateLabels[2], value: 5.9 + index * 0.05 },
            { label: dateLabels[3], value: 6.4 + index * 0.05 },
            { label: dateLabels[4], value: 6.1 + index * 0.05 },
            { label: dateLabels[5], value: 7.0 + index * 0.05 },
            { label: dateLabels[6], value: 6.5 + index * 0.05 },
          ],
          min: 4,
          max: 8,
          decimals: 1,
        },
        {
          title: "深睡时长趋势",
          unit: "h",
          color: "#5db6ff",
          points: [
            { label: dateLabels[0], value: 1.6 + index * 0.03 },
            { label: dateLabels[1], value: 1.9 + index * 0.03 },
            { label: dateLabels[2], value: 1.4 + index * 0.03 },
            { label: dateLabels[3], value: 1.7 + index * 0.03 },
            { label: dateLabels[4], value: 1.5 + index * 0.03 },
            { label: dateLabels[5], value: 2.1 + index * 0.03 },
            { label: dateLabels[6], value: 1.8 + index * 0.03 },
          ],
          min: 1,
          max: 2.5,
          decimals: 1,
        },
      ],
      records: [
        { id: `sleep-${member.id}-1`, time: "2026-04-07 07:05", value: `${(6.5 + index * 0.05).toFixed(1)}`, source: "睡眠监测带", creator: member.realName },
        { id: `sleep-${member.id}-2`, time: "2026-04-06 07:08", value: `${(7.0 + index * 0.05).toFixed(1)}`, source: "睡眠监测带", creator: member.realName },
        { id: `sleep-${member.id}-3`, time: "2026-04-05 07:02", value: `${(6.1 + index * 0.05).toFixed(1)}`, source: "睡眠监测带", creator: member.realName },
        { id: `sleep-${member.id}-4`, time: "2026-04-04 07:10", value: `${(6.4 + index * 0.05).toFixed(1)}`, source: "睡眠监测带", creator: member.realName },
        { id: `sleep-${member.id}-5`, time: "2026-04-03 07:12", value: `${(5.9 + index * 0.05).toFixed(1)}`, source: "睡眠监测带", creator: member.realName },
        { id: `sleep-${member.id}-6`, time: "2026-04-02 07:03", value: `${(6.8 + index * 0.05).toFixed(1)}`, source: "睡眠监测带", creator: member.realName },
        { id: `sleep-${member.id}-7`, time: "2026-04-01 07:01", value: `${(6.2 + index * 0.05).toFixed(1)}`, source: "睡眠监测带", creator: member.realName },
      ],
    },
    {
      key: "bloodSugar",
      label: "血糖",
      startDate,
      endDate,
      valueLabel: "血糖（mmol/L）",
      charts: [
        {
          title: "空腹血糖趋势",
          unit: "mmol/L",
          color: "#f29a5f",
          points: [
            { label: dateLabels[0], value: 5.6 + index * 0.08 },
            { label: dateLabels[1], value: 5.9 + index * 0.08 },
            { label: dateLabels[2], value: 5.8 + index * 0.08 },
            { label: dateLabels[3], value: 5.7 + index * 0.08 },
            { label: dateLabels[4], value: 6.0 + index * 0.08 },
            { label: dateLabels[5], value: 5.8 + index * 0.08 },
            { label: dateLabels[6], value: 5.7 + index * 0.08 },
          ],
          min: 4.5,
          max: 7,
          decimals: 1,
        },
        {
          title: "餐后血糖趋势",
          unit: "mmol/L",
          color: "#ffbe55",
          points: [
            { label: dateLabels[0], value: 7.2 + index * 0.08 },
            { label: dateLabels[1], value: 7.8 + index * 0.08 },
            { label: dateLabels[2], value: 7.5 + index * 0.08 },
            { label: dateLabels[3], value: 7.4 + index * 0.08 },
            { label: dateLabels[4], value: 7.9 + index * 0.08 },
            { label: dateLabels[5], value: 7.3 + index * 0.08 },
            { label: dateLabels[6], value: 7.4 + index * 0.08 },
          ],
          min: 6,
          max: 9,
          decimals: 1,
        },
      ],
      records: [
        { id: `sugar-${member.id}-1`, time: "2026-04-07 12:25", value: `${(7.4 + index * 0.08).toFixed(1)}`, source: "家用血糖仪", creator: member.realName },
        { id: `sugar-${member.id}-2`, time: "2026-04-06 12:28", value: `${(7.3 + index * 0.08).toFixed(1)}`, source: "家用血糖仪", creator: member.realName },
        { id: `sugar-${member.id}-3`, time: "2026-04-05 12:17", value: `${(7.9 + index * 0.08).toFixed(1)}`, source: "家用血糖仪", creator: member.realName },
        { id: `sugar-${member.id}-4`, time: "2026-04-04 12:20", value: `${(7.4 + index * 0.08).toFixed(1)}`, source: "家用血糖仪", creator: member.realName },
        { id: `sugar-${member.id}-5`, time: "2026-04-03 12:12", value: `${(7.5 + index * 0.08).toFixed(1)}`, source: "家用血糖仪", creator: member.realName },
        { id: `sugar-${member.id}-6`, time: "2026-04-02 12:10", value: `${(7.8 + index * 0.08).toFixed(1)}`, source: "家用血糖仪", creator: member.realName },
        { id: `sugar-${member.id}-7`, time: "2026-04-01 12:05", value: `${(7.2 + index * 0.08).toFixed(1)}`, source: "家用血糖仪", creator: member.realName },
      ],
    },
    {
      key: "bloodPressure",
      label: "血压",
      startDate,
      endDate,
      valueLabel: "血压（mmHg）",
      charts: [
        {
          title: "收缩压趋势",
          unit: "mmHg",
          color: "#6f8cff",
          points: [
            { label: dateLabels[0], value: 126 + index },
            { label: dateLabels[1], value: 131 + index },
            { label: dateLabels[2], value: 128 + index },
            { label: dateLabels[3], value: 127 + index },
            { label: dateLabels[4], value: 130 + index },
            { label: dateLabels[5], value: 129 + index },
            { label: dateLabels[6], value: 128 + index },
          ],
          min: 110,
          max: 145,
          decimals: 0,
        },
        {
          title: "舒张压趋势",
          unit: "mmHg",
          color: "#8fd5ff",
          points: [
            { label: dateLabels[0], value: 78 + index },
            { label: dateLabels[1], value: 82 + index },
            { label: dateLabels[2], value: 80 + index },
            { label: dateLabels[3], value: 79 + index },
            { label: dateLabels[4], value: 83 + index },
            { label: dateLabels[5], value: 81 + index },
            { label: dateLabels[6], value: 80 + index },
          ],
          min: 70,
          max: 95,
          decimals: 0,
        },
      ],
      records: [
        { id: `pressure-${member.id}-1`, time: "2026-04-07 08:12", value: `${128 + index}/${80 + index}`, source: "蓝牙血压计", creator: member.realName },
        { id: `pressure-${member.id}-2`, time: "2026-04-06 08:09", value: `${129 + index}/${81 + index}`, source: "蓝牙血压计", creator: member.realName },
        { id: `pressure-${member.id}-3`, time: "2026-04-05 08:14", value: `${130 + index}/${83 + index}`, source: "蓝牙血压计", creator: member.realName },
        { id: `pressure-${member.id}-4`, time: "2026-04-04 08:06", value: `${127 + index}/${79 + index}`, source: "蓝牙血压计", creator: member.realName },
        { id: `pressure-${member.id}-5`, time: "2026-04-03 08:11", value: `${128 + index}/${80 + index}`, source: "蓝牙血压计", creator: member.realName },
        { id: `pressure-${member.id}-6`, time: "2026-04-02 08:08", value: `${131 + index}/${82 + index}`, source: "蓝牙血压计", creator: member.realName },
        { id: `pressure-${member.id}-7`, time: "2026-04-01 08:10", value: `${126 + index}/${78 + index}`, source: "蓝牙血压计", creator: member.realName },
      ],
    },
    {
      key: "oxygen",
      label: "血氧饱和度",
      startDate,
      endDate,
      valueLabel: "血氧（%）",
      charts: [
        {
          title: "血氧饱和度趋势",
          unit: "%",
          color: "#49c7d6",
          points: [
            { label: dateLabels[0], value: 97 + index * 0.1 },
            { label: dateLabels[1], value: 98 + index * 0.1 },
            { label: dateLabels[2], value: 97 + index * 0.1 },
            { label: dateLabels[3], value: 96 + index * 0.1 },
            { label: dateLabels[4], value: 97 + index * 0.1 },
            { label: dateLabels[5], value: 98 + index * 0.1 },
            { label: dateLabels[6], value: 97 + index * 0.1 },
          ],
          min: 92,
          max: 100,
          decimals: 0,
        },
        {
          title: "夜间低氧次数",
          unit: "次",
          color: "#7bd4f0",
          points: [
            { label: dateLabels[0], value: 2 + (index % 2) },
            { label: dateLabels[1], value: 1 + (index % 2) },
            { label: dateLabels[2], value: 2 + (index % 2) },
            { label: dateLabels[3], value: 3 + (index % 2) },
            { label: dateLabels[4], value: 2 + (index % 2) },
            { label: dateLabels[5], value: 1 + (index % 2) },
            { label: dateLabels[6], value: 2 + (index % 2) },
          ],
          min: 0,
          max: 6,
          decimals: 0,
        },
      ],
      records: [
        { id: `oxygen-${member.id}-1`, time: "2026-04-07 22:08", value: `${(97 + index * 0.1).toFixed(0)}%`, source: "指夹血氧仪", creator: member.realName },
        { id: `oxygen-${member.id}-2`, time: "2026-04-06 22:02", value: `${(98 + index * 0.1).toFixed(0)}%`, source: "指夹血氧仪", creator: member.realName },
        { id: `oxygen-${member.id}-3`, time: "2026-04-05 22:11", value: `${(97 + index * 0.1).toFixed(0)}%`, source: "指夹血氧仪", creator: member.realName },
        { id: `oxygen-${member.id}-4`, time: "2026-04-04 22:05", value: `${(96 + index * 0.1).toFixed(0)}%`, source: "指夹血氧仪", creator: member.realName },
        { id: `oxygen-${member.id}-5`, time: "2026-04-03 22:10", value: `${(97 + index * 0.1).toFixed(0)}%`, source: "指夹血氧仪", creator: member.realName },
        { id: `oxygen-${member.id}-6`, time: "2026-04-02 22:04", value: `${(98 + index * 0.1).toFixed(0)}%`, source: "指夹血氧仪", creator: member.realName },
        { id: `oxygen-${member.id}-7`, time: "2026-04-01 22:07", value: `${(97 + index * 0.1).toFixed(0)}%`, source: "指夹血氧仪", creator: member.realName },
      ],
    },
    {
      key: "heartRate",
      label: "心率",
      startDate,
      endDate,
      valueLabel: "心率（bpm）",
      charts: [
        {
          title: "静息心率趋势",
          unit: "bpm",
          color: "#ff7a7a",
          points: [
            { label: dateLabels[0], value: 74 + index },
            { label: dateLabels[1], value: 76 + index },
            { label: dateLabels[2], value: 72 + index },
            { label: dateLabels[3], value: 75 + index },
            { label: dateLabels[4], value: 73 + index },
            { label: dateLabels[5], value: 77 + index },
            { label: dateLabels[6], value: 74 + index },
          ],
          min: 60,
          max: 90,
          decimals: 0,
        },
        {
          title: "运动峰值心率",
          unit: "bpm",
          color: "#ffa765",
          points: [
            { label: dateLabels[0], value: 102 + index },
            { label: dateLabels[1], value: 108 + index },
            { label: dateLabels[2], value: 105 + index },
            { label: dateLabels[3], value: 104 + index },
            { label: dateLabels[4], value: 110 + index },
            { label: dateLabels[5], value: 107 + index },
            { label: dateLabels[6], value: 109 + index },
          ],
          min: 90,
          max: 125,
          decimals: 0,
        },
      ],
      records: [
        { id: `heart-${member.id}-1`, time: "2026-04-07 09:36", value: `${74 + index}`, source: "腕带设备", creator: member.realName },
        { id: `heart-${member.id}-2`, time: "2026-04-06 09:32", value: `${77 + index}`, source: "腕带设备", creator: member.realName },
        { id: `heart-${member.id}-3`, time: "2026-04-05 09:20", value: `${73 + index}`, source: "腕带设备", creator: member.realName },
        { id: `heart-${member.id}-4`, time: "2026-04-04 09:24", value: `${75 + index}`, source: "腕带设备", creator: member.realName },
        { id: `heart-${member.id}-5`, time: "2026-04-03 09:18", value: `${72 + index}`, source: "腕带设备", creator: member.realName },
        { id: `heart-${member.id}-6`, time: "2026-04-02 09:26", value: `${76 + index}`, source: "腕带设备", creator: member.realName },
        { id: `heart-${member.id}-7`, time: "2026-04-01 09:22", value: `${74 + index}`, source: "腕带设备", creator: member.realName },
      ],
    },
  ];
}

function createDevices(member: MemberItem, index: number): MemberDeviceItem[] {
  const statusPool: Array<{ status: string; tone: MemberDetailTone }> = [
    { status: "已连接", tone: "brand" },
    { status: "已连接", tone: "brand" },
    { status: "同步中", tone: "accent" },
    { status: "已连接", tone: "brand" },
    { status: "待校准", tone: "accent" },
    { status: "已连接", tone: "brand" },
    { status: "离线", tone: "neutral" },
  ];

  return Array.from({ length: 7 }, (_, deviceIndex) => {
    const suffix = String(deviceIndex + 1).padStart(3, "0");
    const resolvedStatus = statusPool[deviceIndex % statusPool.length];
    const bindDay = 9 + deviceIndex;
    const bindHour = 10 + (deviceIndex % 4);
    const bindMinute = `${deviceIndex}${deviceIndex}`;

    return {
      name: `智能手表A${suffix}`,
      model: `v1.10.${String(3 + ((deviceIndex + index) % 4)).padStart(2, "0")}`,
      serial: `Ch.watch.a${suffix}`,
      location: addressPool[(index + deviceIndex) % addressPool.length],
      lastSync: `2024-10-${String(bindDay).padStart(2, "0")} ${String(bindHour).padStart(2, "0")}:${bindMinute}:09`,
      status: resolvedStatus.status,
      tone: resolvedStatus.tone,
    };
  });
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

function createReportRecords(index: number): MemberReportItem[] {
  const reportNames = [
    "常规血脂检查",
    "空腹血糖复查",
    "骨密度评估",
    "睡眠质量评估",
    "康复训练阶段报告",
    "慢病随访总结",
  ] as const;
  const reportTypes = ["体检报告", "检验报告", "评估报告", "康复报告"] as const;
  const reportSources = ["后台上传", "医生上传", "护士上传", "设备同步"] as const;
  const uploaders = ["李明明", "张婷婷", "周雨晴", "王晨"] as const;

  return Array.from({ length: 12 }, (_, reportIndex) => {
    const day = 24 - reportIndex;
    const hour = 10 + (reportIndex % 6);
    const minute = `${(reportIndex * 7) % 6}${(reportIndex * 3) % 10}`;
    const type = reportTypes[(index + reportIndex) % reportTypes.length];
    const source = reportSources[(index + reportIndex) % reportSources.length];
    const uploader = uploaders[(index + reportIndex) % uploaders.length];
    const reportDate = `2026-04-${String(Math.max(day - 1, 1)).padStart(2, "0")}`;

    return {
      id: `report-${index + 1}-${reportIndex + 1}`,
      uploadedAt: `2026-04-${String(day).padStart(2, "0")} ${String(hour).padStart(2, "0")}:${minute}`,
      name: reportNames[(index + reportIndex) % reportNames.length],
      type,
      source,
      uploader,
      orderId: `GD202604210${String(index * 20 + reportIndex + 13).padStart(4, "0")}`,
      reportDate,
    };
  });
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

const memberServiceCatalog = [
  {
    serviceType: "家政护理",
    image: homeCareOrderImage,
    productName: "家政护理 2 小时上门服务",
    productSummary: "参考客户端家政护理项目，覆盖日常整理、深度保洁与长者卧室整理。",
    price: 168,
    serviceItems: ["日常整理", "深度保洁护理", "长者卧室整理护理", "居家陪护整理"],
    staffPool: ["周丽；陈阿姨", "王小倩；李阿姨", "赵阿姨；刘芳"],
  },
  {
    serviceType: "康复理疗",
    image: rehabOrderImage,
    productName: "脑中风术后康复理疗套餐",
    productSummary: "参考客户端康复理疗项目，包含上门评估、制定康复计划与阶段训练。",
    price: 1990,
    serviceItems: ["上门评估", "制定康复计划", "肌力增强训练", "平衡训练"],
    staffPool: ["周明远；林安琪", "林安琪；陈嘉宁", "周明远；陈嘉宁"],
  },
  {
    serviceType: "上门体检",
    image: examOrderImage,
    productName: "老年人 基础套餐一",
    productSummary: "参考客户端上门体检套餐，支持上门采样、基础体征检测与报告解读。",
    price: 399,
    serviceItems: ["基础体征检测", "上门采样", "重点指标解读", "健康评估"],
    staffPool: ["赵医生；林护士", "林护士；陈医生", "赵医生；陈医生"],
  },
] as const;

function createOrderRecords(member: MemberItem, index: number): MemberOrderItem[] {
  const paymentMethods = ["支付宝", "微信支付"] as const;
  const statusPool: Array<{ label: string; tone: MemberDetailTone }> = [
    { label: "已关闭", tone: "neutral" },
    { label: "待服务", tone: "accent" },
    { label: "已完成", tone: "brand" },
    { label: "待支付", tone: "danger" },
  ];

  return Array.from({ length: 12 }, (_, orderIndex) => {
    const service = memberServiceCatalog[(index + orderIndex) % memberServiceCatalog.length];
    const status = statusPool[(index + orderIndex) % statusPool.length];
    const amount = service.price;
    const day = 9 + orderIndex;
    const minutes = `${(orderIndex + 1) % 6}${(orderIndex * 2 + 3) % 10}`;

    return {
      id: `order-${member.id}-${orderIndex + 1}`,
      orderTime: `2026-04-${String(day).padStart(2, "0")} 14:1${orderIndex}:${minutes}`,
      orderNo: `24001266${String(index * 10 + orderIndex + 70).padStart(2, "0")}`,
      serviceType: service.serviceType,
      image: service.image,
      productName: service.productName,
      productSummary: service.productSummary,
      price: `${amount.toFixed(2)}`,
      payAmount: `${amount.toFixed(2)}`,
      buyerName: member.nickname,
      buyerPhone: member.phone,
      orderStatus: status.label,
      paymentMethod: paymentMethods[(index + orderIndex) % paymentMethods.length],
      tone: status.tone,
    };
  });
}

function createServiceRecords(member: MemberItem, index: number): MemberServiceRecordItem[] {
  const statusPool: Array<{ label: string; tone: MemberDetailTone }> = [
    { label: "已完成", tone: "brand" },
    { label: "待服务", tone: "accent" },
    { label: "服务中", tone: "neutral" },
    { label: "已取消", tone: "danger" },
  ];
  const remarkPool = [
    "家属已确认上门时间",
    "服务后回访待补充",
    "已同步护理师执行记录",
    "用户反馈良好，建议持续跟进",
  ] as const;

  return Array.from({ length: 12 }, (_, serviceIndex) => {
    const service = memberServiceCatalog[(index + serviceIndex) % memberServiceCatalog.length];
    const status = statusPool[(index + serviceIndex) % statusPool.length];
    const day = 9 + serviceIndex;
    const hour = 9 + (serviceIndex % 6);
    const minute = `${(serviceIndex + 1) % 6}${(serviceIndex * 2 + 3) % 10}`;
    const couponAmount =
      service.serviceType === "康复理疗"
        ? 100 + (serviceIndex % 3) * 20
        : service.serviceType === "家政护理"
          ? 20 + (serviceIndex % 3) * 10
          : 20 + (serviceIndex % 3) * 5;
    const payAmount = Math.max(service.price - couponAmount, 0);
    const createdDay = Math.max(day - 1, 1);
    const createdHour = Math.max(hour - 1, 8);
    const paidMinute = `${(serviceIndex + 2) % 6}${(serviceIndex * 3 + 5) % 10}`;
    const serviceCode = `${String(7000 + index * 30 + serviceIndex * 7).padStart(4, "0")} ${String(4100 + serviceIndex * 13 + index).padStart(4, "0")} ${String(2600 + serviceIndex * 9 + index * 2).padStart(4, "0")}`;
    const serviceCodeHint =
      status.label === "已完成"
        ? "服务已完成，可继续查看服务记录或申请售后。"
        : status.label === "已取消"
          ? "当前工单已取消，如需继续服务可重新预约。"
          : "服务开始前向护理或医护人员出示此服务码。";

    return {
      id: `service-record-${member.id}-${serviceIndex + 1}`,
      orderNo: `GD202604${String(day).padStart(2, "0")}${String(index * 10 + serviceIndex + 13).padStart(4, "0")}`,
      serviceType: service.serviceType,
      image: service.image,
      orderName: service.productName,
      productSummary: service.productSummary,
      serviceItem: service.serviceItems[(index + serviceIndex) % service.serviceItems.length],
      price: `${service.price.toFixed(2)}`,
      couponAmount: `${couponAmount.toFixed(2)}`,
      payAmount: `${payAmount.toFixed(2)}`,
      status: status.label,
      tone: status.tone,
      staff: service.staffPool[(index + serviceIndex) % service.staffPool.length],
      serviceTime: `2026-04-${String(day).padStart(2, "0")} ${String(hour).padStart(2, "0")}:${minute}:09`,
      createdAt: `2026-04-${String(createdDay).padStart(2, "0")} ${String(createdHour).padStart(2, "0")}:${minute}:18`,
      paidAt: `2026-04-${String(createdDay).padStart(2, "0")} ${String(createdHour).padStart(2, "0")}:${paidMinute}:36`,
      serviceCode,
      serviceCodeHint,
      remark: remarkPool[(index + serviceIndex) % remarkPool.length],
    };
  });
}

function formatAssetDateTime(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  const hours = `${date.getHours()}`.padStart(2, "0");
  const minutes = `${date.getMinutes()}`.padStart(2, "0");
  const seconds = `${date.getSeconds()}`.padStart(2, "0");

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function createAssetCoupons(index: number): MemberAssetCouponItem[] {
  const statusPool: Array<{ label: string; tone: MemberDetailTone }> = [
    { label: "未使用", tone: "brand" },
    { label: "已使用", tone: "neutral" },
    { label: "已过期", tone: "danger" },
  ];
  const couponCatalog = [
    { name: "新客专享优惠券", amount: "¥20", condition: "满200元可用", scope: "全部商品" },
    { name: "康复理疗专享券", amount: "¥80", condition: "满999元可用", scope: "康复理疗" },
    { name: "上门体检抵扣券", amount: "¥50", condition: "满399元可用", scope: "上门体检" },
    { name: "家政护理满减券", amount: "¥30", condition: "满299元可用", scope: "家政护理" },
  ] as const;

  return Array.from({ length: 12 }, (_, couponIndex) => {
    const coupon = couponCatalog[(index + couponIndex) % couponCatalog.length];
    const status = statusPool[(index + couponIndex) % statusPool.length];
    const receivedAt = new Date(2026, 3, 24 - couponIndex, 10 + (couponIndex % 6), 9, 9);
    const expiresAt = new Date(receivedAt);

    expiresAt.setDate(expiresAt.getDate() + 36 + (couponIndex % 3) * 7);

    return {
      id: `asset-coupon-${index + 1}-${couponIndex + 1}`,
      name: coupon.name,
      status: status.label,
      amount: coupon.amount,
      condition: coupon.condition,
      scope: coupon.scope,
      receivedAt: formatAssetDateTime(receivedAt),
      expiresAt: formatAssetDateTime(expiresAt),
      tone: status.tone,
    };
  });
}

function createAssetPoints(member: MemberItem, index: number): MemberAssetPointItem[] {
  const pointCatalog = [
    { type: "收入", amount: "+100", reason: "订单完成积分", remark: "-", operator: "系统", tone: "brand" as MemberDetailTone },
    { type: "收入", amount: "+30", reason: "每日签到奖励", remark: "连续签到第7天", operator: "系统", tone: "brand" as MemberDetailTone },
    { type: "支出", amount: "-80", reason: "兑换上门体检券", remark: "自动扣减", operator: "系统", tone: "neutral" as MemberDetailTone },
    { type: "赠送", amount: "+50", reason: "活动补发积分", remark: "会员关怀赠送", operator: "运营后台", tone: "accent" as MemberDetailTone },
  ] as const;

  return Array.from({ length: 12 }, (_, pointIndex) => {
    const point = pointCatalog[(index + pointIndex) % pointCatalog.length];
    const time = new Date(2026, 3, 22 - pointIndex, 9 + (pointIndex % 5), 18, 9);

    return {
      id: `asset-point-${member.id}-${pointIndex + 1}`,
      type: point.type,
      amount: point.amount,
      reason: point.reason,
      remark: point.remark,
      operator: point.operator,
      time: formatAssetDateTime(time),
      tone: point.tone,
    };
  });
}

function createAssetGrowthRecords(member: MemberItem, index: number): MemberAssetGrowthItem[] {
  const growthCatalog = [
    { type: "收入", amount: "+100", reason: "登录", remark: "-", operator: "系统", tone: "brand" as MemberDetailTone },
    { type: "收入", amount: "+120", reason: "完善健康档案", remark: "首次完善资料", operator: "系统", tone: "brand" as MemberDetailTone },
    { type: "收入", amount: "+180", reason: "订单完成成长值", remark: "服务已结算", operator: "系统", tone: "brand" as MemberDetailTone },
    { type: "赠送", amount: "+90", reason: "后台赠送成长值", remark: "会员等级维护", operator: "运营后台", tone: "accent" as MemberDetailTone },
  ] as const;

  return Array.from({ length: 12 }, (_, growthIndex) => {
    const growth = growthCatalog[(index + growthIndex) % growthCatalog.length];
    const time = new Date(2026, 3, 20 - growthIndex, 11 + (growthIndex % 4), 9, 9);

    return {
      id: `asset-growth-${member.id}-${growthIndex + 1}`,
      type: growth.type,
      amount: growth.amount,
      reason: growth.reason,
      remark: growth.remark,
      operator: growth.operator,
      time: formatAssetDateTime(time),
      tone: growth.tone,
    };
  });
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

function createContentRecords(member: MemberItem, index: number): MemberContentItem[] {
  const postCatalog = [
    {
      topic: "美食",
      image: circleCookImage,
      content: "分享一下喜欢做又简单的菜，今天晚饭刚好有阳光照进厨房。",
      likes: 1010,
      favorites: 88,
      shares: 32,
      comments: 201,
    },
    {
      topic: "落日",
      image: circleSunsetImage,
      content: "散步时遇到很漂亮的天空，落日把云染成橘色，心情也慢慢安静下来。",
      likes: 520,
      favorites: 42,
      shares: 18,
      comments: 96,
    },
    {
      topic: "风景",
      image: circleBeachImage,
      content: "今天沿着河边慢慢走，路边的树影和风都刚刚好，随手拍了几张很喜欢。",
      likes: 430,
      favorites: 36,
      shares: 21,
      comments: 74,
    },
    {
      topic: "美食",
      image: circleCookTwoImage,
      content: "家常菜不用复杂，青菜、豆腐和一点酱汁就能很香，适合晚饭轻轻松松吃。",
      likes: 688,
      favorites: 59,
      shares: 27,
      comments: 128,
    },
    {
      topic: "摄影",
      image: circleCherryImage,
      content: "参加摄影大赛的第一组照片，想把清晨的光、路边的花和安静的街角都留下来。",
      likes: 904,
      favorites: 82,
      shares: 44,
      comments: 156,
    },
    {
      topic: "美食",
      image: circleCookThreeImage,
      content: "把今天的午饭拍下来留个纪念，简单的家常味道最容易让人觉得踏实。",
      likes: 356,
      favorites: 28,
      shares: 15,
      comments: 63,
    },
  ] as const;

  return Array.from({ length: 12 }, (_, contentIndex) => {
    const post = postCatalog[(index + contentIndex) % postCatalog.length];
    const publishDay = 24 - contentIndex;
    const publishHour = 9 + (contentIndex % 7);
    const publishMinute = `${(contentIndex + 1) % 6}${(contentIndex * 3 + 2) % 10}`;

    return {
      id: `content-${member.id}-${contentIndex + 1}`,
      content: post.content,
      topic: post.topic,
      image: post.image,
      likes: post.likes + index * 11 + contentIndex * 6,
      favorites: post.favorites + index * 3 + contentIndex,
      shares: post.shares + (contentIndex % 4),
      comments: post.comments + (index % 3) * 2 + (contentIndex % 5),
      publishedAt: `2026-04-${String(Math.max(publishDay, 1)).padStart(2, "0")} ${String(publishHour).padStart(2, "0")}:${publishMinute}:09`,
      visible: (index + contentIndex) % 5 !== 0,
    };
  });
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
  const healthMetricModules = createHealthMetricModules(member, index);
  const devices = createDevices(member, index);
  const reports = createReportRecords(index);
  const orders = createOrderRecords(member, index);
  const assetCoupons = createAssetCoupons(index);
  const assetPoints = createAssetPoints(member, index);
  const assetGrowthRecords = createAssetGrowthRecords(member, index);
  const assetRecords = createAssetRecords(index);
  const contents = createContentRecords(member, index);
  const serviceRecords = createServiceRecords(member, index);
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
    healthMetricModules,
    devices,
    reports,
    orders,
    assetCoupons,
    assetPoints,
    assetGrowthRecords,
    assetRecords,
    contents,
    serviceRecords,
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
