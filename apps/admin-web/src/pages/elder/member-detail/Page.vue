<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import type { PageComponentProps } from "@ihc/page-core/types";
import {
  getMemberDetailById,
  memberDetailStorageKey,
  memberDetailTabs,
  type MemberAssetCouponItem,
  type MemberAssetGrowthItem,
  type MemberAssetPointItem,
  type MemberContentItem,
  type MemberDetailTabKey,
  type MemberHealthDashboardChart,
  type MemberHealthDashboardKey,
  type MemberHealthDashboardModule,
  type MemberHealthDashboardRecord,
  type MemberOrderItem,
  type MemberReportItem,
  type MemberServiceRecordItem,
  type MemberDetailTone,
} from "./mock";

const props = defineProps<PageComponentProps>();
const activeTab = ref<MemberDetailTabKey>("profile");
const selectedMemberId = ref(readSelectedMemberId());
const pageShellHiddenClass = "member-detail-shell-hidden";

const tabLabelMap: Record<MemberDetailTabKey, string> = {
  profile: "个人信息",
  health: "健康信息",
  medication: "用药信息",
  metrics: "健康数据",
  device: "设备信息",
  report: "报告信息",
  order: "订单信息",
  asset: "资产信息",
  content: "内容信息",
  service: "服务记录",
};

const detailTabs = memberDetailTabs.map((tab) => ({
  ...tab,
  label: tabLabelMap[tab.key] ?? tab.label,
}));

const memberDetail = computed(() => getMemberDetailById(selectedMemberId.value));

const archiveRows = computed(() => {
  const detail = memberDetail.value;

  if (!detail) {
    return [];
  }

  return [
    { label: "用户 ID", value: detail.member.id },
    { label: "档案编号", value: detail.archiveNo },
    { label: "服务顾问", value: detail.advisor },
    { label: "注册来源", value: detail.source },
    { label: "注册时间", value: detail.member.registeredAt },
    { label: "最近跟进", value: detail.operationTimeline[0]?.time ?? "暂无记录" },
  ];
});

const careRows = computed(() => {
  const detail = memberDetail.value;

  if (!detail) {
    return [];
  }

  return [
    { label: "重点方案", value: detail.carePlan },
    { label: "居住方式", value: detail.residenceType },
    { label: "生日", value: detail.birthday },
    { label: "血型", value: detail.bloodType },
    {
      label: "紧急联系人",
      value: `${detail.emergencyContact.name} / ${detail.emergencyContact.relation}`,
    },
    { label: "联系电话", value: detail.emergencyContact.phone },
  ];
});

const highlightMetrics = computed(() => memberDetail.value?.healthMetricCards.slice(0, 4) ?? []);

interface ProfileDisplayField {
  label: string;
  value: string;
  wide?: boolean;
  multiline?: boolean;
  plain?: boolean;
  avatar?: boolean;
}

const profileEthnicityPool = ["汉族", "汉族", "回族", "满族"] as const;
const profileOccupationPool = ["退休教师", "退休会计", "退休护士", "退休工程师"] as const;
const profileEmployerPool = ["徐汇区老年大学", "浦东社区服务中心", "静安区健康驿站", "黄浦区康养服务部"] as const;
const profileIntroPool = [
  "热爱下棋与阅读，日常生活规律，配合平台随访安排。",
  "喜欢晨练和园艺，近阶段保持稳定作息与饮食管理。",
  "平时关注养生资讯，愿意配合健康计划与日常提醒。",
  "作息较规律，家庭配合度较高，适合持续跟进服务。",
] as const;

function getProfileSeed(id: string) {
  return Number(id.slice(-2)) || 1;
}

function buildIdentityNumber(birthday: string, seed: number) {
  const compactBirthday = birthday.replace(/\D/g, "").padEnd(8, "0").slice(0, 8);
  const sequence = String(100 + seed).slice(-3);
  const checksum = seed % 2 === 0 ? "X" : String(seed % 10);
  return `310101${compactBirthday}${sequence}${checksum}`;
}

function resolveNativePlace(address: string) {
  const matched = address.match(/^(.+?市)/);
  return matched?.[1] ?? "上海市";
}

const profileBasicFields = computed<ProfileDisplayField[]>(() => {
  const detail = memberDetail.value;

  if (!detail) {
    return [];
  }

  const seed = getProfileSeed(detail.member.id);
  const intro = `我是${detail.member.nickname}，${profileIntroPool[seed % profileIntroPool.length]}`;

  return [
    { label: "昵称", value: detail.member.nickname },
    { label: "ID", value: detail.member.id },
    { label: "头像", value: detail.member.nickname.slice(0, 1), avatar: true },
    { label: "真实姓名", value: detail.member.realName },
    { label: "性别", value: detail.gender },
    { label: "出生日期", value: detail.birthday },
    { label: "手机号码", value: detail.member.phone },
    { label: "身份证号", value: buildIdentityNumber(detail.birthday, seed) },
    { label: "家庭住址", value: detail.address, wide: true },
    { label: "简介", value: intro, wide: true, multiline: true },
    { label: "身高", value: `${166 + (seed % 8)}cm` },
    { label: "体重", value: `${55 + (seed % 11)}kg` },
    { label: "民族", value: profileEthnicityPool[seed % profileEthnicityPool.length] },
    { label: "文化程度", value: detail.education },
    { label: "籍贯", value: resolveNativePlace(detail.address) },
    { label: "婚姻情况", value: detail.maritalStatus },
    { label: "职业", value: profileOccupationPool[seed % profileOccupationPool.length] },
    { label: "工作单位", value: profileEmployerPool[seed % profileEmployerPool.length], wide: true },
    { label: "紧急联系人", value: `${detail.emergencyContact.name}（${detail.emergencyContact.relation}）` },
    { label: "联系人电话", value: detail.emergencyContact.phone },
  ];
});

const profileOtherFields = computed<ProfileDisplayField[]>(() => {
  const detail = memberDetail.value;

  if (!detail) {
    return [];
  }

  return [
    { label: "状态", value: "启用", plain: true },
    { label: "登录密码", value: `ha1${detail.member.id.slice(-4)}` },
    { label: "备注", value: detail.note, wide: true, multiline: true },
  ];
});

function resolveHealthChronicDiseases(detail: NonNullable<typeof memberDetail.value>) {
  const diseaseKeywords = ["高血压", "糖尿病", "睡眠异常", "关节疼痛", "骨质疏松", "冠心病", "慢阻肺"];
  const labels = [...detail.member.tags.map((tag) => tag.label), ...detail.healthTags];
  const matches = labels.filter((label) => diseaseKeywords.some((keyword) => label.includes(keyword)));
  const unique = [...new Set(matches)];

  return unique.length > 0 ? unique.join("；") : "无";
}

const healthBodyFields = computed<ProfileDisplayField[]>(() => {
  const detail = memberDetail.value;

  if (!detail) {
    return [];
  }

  const seed = getProfileSeed(detail.member.id);

  return [
    { label: "身高", value: `${166 + (seed % 8)}cm` },
    { label: "体重", value: `${55 + (seed % 11)}kg` },
    { label: "血型", value: `${detail.bloodType}型` },
    { label: "RH阴性", value: seed % 6 === 0 ? "是" : "否" },
    { label: "慢性病", value: resolveHealthChronicDiseases(detail) },
  ];
});

const healthHabitFields = computed<ProfileDisplayField[]>(() => {
  const detail = memberDetail.value;

  if (!detail) {
    return [];
  }

  const seed = getProfileSeed(detail.member.id);
  const sleepPool = ["一般", "良好", "一般", "欠佳"] as const;
  const smokingPool = ["3次/日", "无", "偶尔", "已戒烟"] as const;
  const drinkingPool = ["3次/日", "无", "1次/周", "偶尔"] as const;
  const exercisePool = ["3次/日", "3次/周", "2次/周", "每日散步"] as const;
  const dietPool = ["偏咸", "清淡", "少油", "均衡"] as const;

  return [
    { label: "睡眠质量", value: sleepPool[seed % sleepPool.length] },
    { label: "吸烟频率", value: smokingPool[seed % smokingPool.length] },
    { label: "饮酒频率", value: drinkingPool[seed % drinkingPool.length] },
    { label: "运动频率", value: exercisePool[seed % exercisePool.length] },
    { label: "饮食偏好", value: dietPool[seed % dietPool.length] },
  ];
});

const healthHistoryFields = computed<ProfileDisplayField[]>(() => {
  const detail = memberDetail.value;

  if (!detail) {
    return [];
  }

  const seed = getProfileSeed(detail.member.id);
  const chronicDiseases = resolveHealthChronicDiseases(detail);
  const familyPool = ["无", "父系有高血压家族史", "母系有糖代谢异常史", "无"] as const;
  const allergyPool = ["无", "青霉素过敏", "海鲜轻度过敏", "无"] as const;
  const visitPool = ["无", "近一年社区门诊复诊记录完整", "曾接受康复训练随访", "无"] as const;

  return [
    { label: "既往病史", value: chronicDiseases === "无" ? "无" : `${chronicDiseases}，长期随访中。`, wide: true, multiline: true },
    { label: "家族遗传史", value: familyPool[seed % familyPool.length], wide: true, multiline: true },
    { label: "过敏史", value: allergyPool[seed % allergyPool.length], wide: true, multiline: true },
    { label: "就诊史", value: visitPool[seed % visitPool.length], wide: true, multiline: true },
  ];
});

interface MedicationTableRow {
  key: string;
  order: number;
  period: string;
  name: string;
  frequency: string;
  time: string;
  dosage: string;
  reminderEnabled: boolean;
  source: string;
  creator: string;
}

interface DeviceTableRow {
  key: string;
  order: number;
  name: string;
  code: string;
  version: string;
  status: string;
  tone: MemberDetailTone;
  address: string;
  boundAt: string;
}

const medicationKeyword = ref("");
const medicationReminderOverrides = ref<Record<string, boolean>>({});
const medicationPeriodOrder: Record<string, number> = {
  早餐: 1,
  午餐: 2,
  晚餐: 3,
  睡前: 4,
  日常: 5,
};

function buildMedicationSlots(schedule: string) {
  const slots: Array<{ period: string; time: string }> = [];
  const normalized = schedule.replace(/\s+/g, "");

  if (normalized.includes("三餐")) {
    slots.push(
      { period: "早餐", time: "7:30" },
      { period: "午餐", time: "12:30" },
      { period: "晚餐", time: "18:30" },
    );
  } else {
    if (normalized.includes("早餐") || normalized.includes("晨")) {
      slots.push({ period: "早餐", time: "7:30" });
    }

    if (normalized.includes("午餐")) {
      slots.push({ period: "午餐", time: "12:30" });
    }

    if (normalized.includes("晚餐")) {
      slots.push({ period: "晚餐", time: "18:30" });
    }

    if (normalized.includes("睡前")) {
      slots.push({ period: "睡前", time: "21:30" });
    }
  }

  if (slots.length === 0) {
    slots.push({ period: "日常", time: "8:00" });
  }

  return slots;
}

function normalizeMedicationDose(dosage: string) {
  const compact = dosage.replace(/\s+/g, "");
  const quantityMatch = compact.match(/\d+(?:\.\d+)?(?:mg|g|ml|片|粒)/i);

  return quantityMatch?.[0] ?? compact;
}

function parseMedicationTime(value: string) {
  const [hours, minutes] = value.split(":").map((part) => Number(part));

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return Number.MAX_SAFE_INTEGER;
  }

  return hours * 60 + minutes;
}

function buildPaginationPages(totalPages: number) {
  return Array.from({ length: totalPages }, (_, index) => index + 1);
}

const medicationTableRows = computed<MedicationTableRow[]>(() => {
  const detail = memberDetail.value;

  if (!detail) {
    return [];
  }

  const baseRows = detail.medications.flatMap((item, medicationIndex) =>
    buildMedicationSlots(item.schedule).map((slot, slotIndex) => {
      const key = `${medicationIndex}-${slotIndex}`;
      const enabled = medicationReminderOverrides.value[key] ?? item.tone !== "danger";

      return {
        key,
        order: 0,
        period: slot.period,
        name: item.name,
        frequency: "每天",
        time: slot.time,
        dosage: normalizeMedicationDose(item.dosage),
        reminderEnabled: enabled,
        source: "用户添加",
        creator: detail.member.realName,
      };
    }),
  );

  const keyword = medicationKeyword.value.trim().toLowerCase();
  const filteredRows = !keyword
    ? baseRows
    : baseRows.filter((row) =>
        [row.period, row.name, row.frequency, row.time, row.dosage, row.source, row.creator].some((value) =>
          value.toLowerCase().includes(keyword),
        ),
      );

  return filteredRows
    .slice()
    .sort(
      (left, right) =>
        parseMedicationTime(left.time) - parseMedicationTime(right.time) ||
        (medicationPeriodOrder[left.period] ?? 99) - (medicationPeriodOrder[right.period] ?? 99),
    )
    .map((row, index) => ({
      ...row,
      order: index + 1,
    }));
});

function resetMedicationKeyword() {
  medicationKeyword.value = "";
}

function toggleMedicationReminder(rowKey: string) {
  const current = medicationTableRows.value.find((row) => row.key === rowKey)?.reminderEnabled ?? false;
  medicationReminderOverrides.value = {
    ...medicationReminderOverrides.value,
    [rowKey]: !current,
  };
}

function createMedicationRecord() {
  props.showToast("已打开新增用药信息入口");
}

function openMedicationBatchActions() {
  props.showToast("已打开批量操作入口");
}

const deviceKeywordDraft = ref("");
const deviceKeyword = ref("");
const deviceCurrentPage = ref(1);
const deviceJumpPage = ref("1");
const devicePageSize = 10;

const deviceTableRows = computed<DeviceTableRow[]>(() => {
  const detail = memberDetail.value;

  if (!detail) {
    return [];
  }

  const keyword = deviceKeyword.value.trim().toLowerCase();
  const filteredRows = detail.devices
    .slice()
    .sort((left, right) => right.lastSync.localeCompare(left.lastSync))
    .filter((item) =>
      !keyword
        ? true
        : [item.name, item.serial, item.model, item.status, item.location, item.lastSync].some((value) =>
            value.toLowerCase().includes(keyword),
          ),
    );

  return filteredRows.map((item, index) => ({
    key: `${item.serial}-${index}`,
    order: filteredRows.length - index,
    name: item.name,
    code: item.serial,
    version: item.model,
    status: item.status,
    tone: item.tone,
    address: item.location,
    boundAt: item.lastSync,
  }));
});

const deviceTotalPages = computed(() => Math.max(Math.ceil(deviceTableRows.value.length / devicePageSize), 1));
const devicePagedRows = computed(() => {
  const start = (deviceCurrentPage.value - 1) * devicePageSize;
  return deviceTableRows.value.slice(start, start + devicePageSize);
});

watch(deviceKeyword, () => {
  deviceCurrentPage.value = 1;
  deviceJumpPage.value = "1";
});

watch(deviceTotalPages, (totalPages) => {
  if (deviceCurrentPage.value > totalPages) {
    deviceCurrentPage.value = totalPages;
  }
});

watch(deviceCurrentPage, (page) => {
  deviceJumpPage.value = `${page}`;
});

function searchDevices() {
  deviceKeyword.value = deviceKeywordDraft.value.trim();
}

function resetDeviceKeyword() {
  deviceKeywordDraft.value = "";
  deviceKeyword.value = "";
}

function setDevicePage(page: number) {
  const nextPage = Math.min(Math.max(page, 1), deviceTotalPages.value);
  deviceCurrentPage.value = nextPage;
}

function jumpToDevicePage() {
  const nextPage = Number(deviceJumpPage.value);

  if (!Number.isInteger(nextPage)) {
    deviceJumpPage.value = `${deviceCurrentPage.value}`;
    return;
  }

  setDevicePage(nextPage);
}

function deviceStatusClass(tone: MemberDetailTone) {
  return `device-status--${tone}`;
}

interface MetricChartModel {
  width: number;
  height: number;
  paddingLeft: number;
  paddingRight: number;
  paddingTop: number;
  paddingBottom: number;
  yLines: number[];
  yLabels: string[];
  points: Array<{ x: number; y: number; value: number; label: string }>;
  linePath: string;
  areaPath: string;
}

const metricRecordOverridesStorageKey = "admin:elder:metric-record-overrides";
const metricSettingsStorageKey = "admin:elder:metric-settings";
const metricDateRangesStorageKey = "admin:elder:metric-date-ranges";

interface MetricDateRange {
  startDate: string;
  endDate: string;
}

type MetricDateRangeOverrides = Record<string, Partial<Record<MemberHealthDashboardKey, MetricDateRange>>>;
type MetricRecordOverrides = Record<string, Partial<Record<MemberHealthDashboardKey, MemberHealthDashboardRecord[]>>>;

interface MetricsAlertSettings {
  bloodSugarBeforeMealLow: string;
  bloodSugarBeforeMealHigh: string;
  bloodSugarAfterMealLow: string;
  bloodSugarAfterMealHigh: string;
  bloodPressureSystolicHigh: string;
  bloodPressureSystolicLow: string;
  bloodPressureDiastolicHigh: string;
  bloodPressureDiastolicLow: string;
  oxygenLow: string;
  heartRateLow: string;
  heartRateHigh: string;
}

type MetricAlertSettingKey = keyof MetricsAlertSettings;
type MetricSettingsOverrides = Record<string, MetricsAlertSettings>;

interface MetricRecordForm {
  date: string;
  time: string;
  value: string;
}

interface MetricSettingFieldMeta {
  key: MetricAlertSettingKey;
  label: string;
  operator: "<" | ">";
  unit: string;
}

interface MetricSettingSectionMeta {
  title: string;
  description: string;
  fields: MetricSettingFieldMeta[];
}

const metricSettingSections: MetricSettingSectionMeta[] = [
  {
    title: "血糖设置",
    description: "维护餐前和餐后血糖阈值，便于后续按异常区间提醒。",
    fields: [
      { key: "bloodSugarBeforeMealLow", label: "餐前血糖偏低", operator: "<", unit: "mmol/L" },
      { key: "bloodSugarBeforeMealHigh", label: "餐前血糖偏高", operator: ">", unit: "mmol/L" },
      { key: "bloodSugarAfterMealLow", label: "餐后血糖偏低", operator: "<", unit: "mmol/L" },
      { key: "bloodSugarAfterMealHigh", label: "餐后血糖偏高", operator: ">", unit: "mmol/L" },
    ],
  },
  {
    title: "血压设置",
    description: "统一维护收缩压和舒张压阈值，异常值可直接用于预警。",
    fields: [
      { key: "bloodPressureSystolicHigh", label: "收缩压过高", operator: ">", unit: "mmHg" },
      { key: "bloodPressureSystolicLow", label: "收缩压过低", operator: "<", unit: "mmHg" },
      { key: "bloodPressureDiastolicHigh", label: "舒张压过高", operator: ">", unit: "mmHg" },
      { key: "bloodPressureDiastolicLow", label: "舒张压过低", operator: "<", unit: "mmHg" },
    ],
  },
  {
    title: "血氧饱和度设置",
    description: "当前只维护偏低阈值，适合与夜间低氧提醒一起使用。",
    fields: [{ key: "oxygenLow", label: "血氧偏低", operator: "<", unit: "%" }],
  },
  {
    title: "心率设置",
    description: "维护静息心率上下限，超出区间时可以快速定位异常波动。",
    fields: [
      { key: "heartRateLow", label: "心率偏低", operator: "<", unit: "次/分" },
      { key: "heartRateHigh", label: "心率偏高", operator: ">", unit: "次/分" },
    ],
  },
];

const metricInputMetaMap: Record<
  MemberHealthDashboardKey,
  { label: string; unit?: string; placeholder: string; inputMode: "decimal" | "numeric" | "text" }
> = {
  weight: { label: "体重", unit: "kg", placeholder: "请输入体重", inputMode: "decimal" },
  steps: { label: "步数", unit: "步", placeholder: "请输入步数", inputMode: "numeric" },
  sleep: { label: "睡眠时长", unit: "h", placeholder: "请输入睡眠时长", inputMode: "decimal" },
  bloodSugar: { label: "血糖", unit: "mmol/L", placeholder: "请输入血糖值", inputMode: "decimal" },
  bloodPressure: { label: "血压", placeholder: "例如 128/80", inputMode: "text" },
  oxygen: { label: "血氧", unit: "%", placeholder: "请输入血氧值", inputMode: "numeric" },
  heartRate: { label: "心率", unit: "bpm", placeholder: "请输入心率", inputMode: "numeric" },
};

function createDefaultMetricAlertSettings(): MetricsAlertSettings {
  return {
    bloodSugarBeforeMealLow: "3.9",
    bloodSugarBeforeMealHigh: "6.1",
    bloodSugarAfterMealLow: "4.4",
    bloodSugarAfterMealHigh: "7.8",
    bloodPressureSystolicHigh: "140",
    bloodPressureSystolicLow: "90",
    bloodPressureDiastolicHigh: "90",
    bloodPressureDiastolicLow: "60",
    oxygenLow: "95",
    heartRateLow: "60",
    heartRateHigh: "100",
  };
}

function cloneMetricAlertSettings(settings: MetricsAlertSettings): MetricsAlertSettings {
  return { ...settings };
}

function readSessionStorageJson<T>(storageKey: string, fallback: T): T {
  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const raw = window.sessionStorage.getItem(storageKey);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeSessionStorageJson(storageKey: string, value: unknown) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(storageKey, JSON.stringify(value));
}

function formatMetricDateTime(date: string, time: string) {
  return `${date} ${time}`;
}

function addDays(date: string, offset: number) {
  const nextDate = new Date(`${date}T00:00:00`);

  if (Number.isNaN(nextDate.getTime())) {
    return date;
  }

  nextDate.setDate(nextDate.getDate() + offset);
  return nextDate.toISOString().slice(0, 10);
}

function formatMetricPointLabel(date: string) {
  return `${date.slice(5, 7)}/${date.slice(8, 10)}`;
}

function sortMetricRecords(records: MemberHealthDashboardRecord[]) {
  return records
    .slice()
    .sort(
      (left, right) =>
        new Date(right.time.replace(" ", "T")).getTime() - new Date(left.time.replace(" ", "T")).getTime(),
    );
}

function isMetricDateInRange(date: string, range: MetricDateRange) {
  return (!range.startDate || date >= range.startDate) && (!range.endDate || date <= range.endDate);
}

function filterMetricRecordsByDate(records: MemberHealthDashboardRecord[], range: MetricDateRange) {
  return sortMetricRecords(records.filter((record) => isMetricDateInRange(record.time.slice(0, 10), range)));
}

function createMetricChartWithPoints(chart: MemberHealthDashboardChart, points: MemberHealthDashboardChart["points"]): MemberHealthDashboardChart {
  if (points.length === 0) {
    return {
      ...chart,
      points: [],
    };
  }

  const values = points.map((item) => item.value);
  return {
    ...chart,
    points,
    min: Math.min(chart.min ?? values[0], ...values),
    max: Math.max(chart.max ?? values[0], ...values),
  };
}

function filterMetricBaseChartPoints(module: MemberHealthDashboardModule, chart: MemberHealthDashboardChart, range: MetricDateRange) {
  return chart.points
    .map((point, index) => ({
      ...point,
      date: addDays(module.startDate, index),
    }))
    .filter((point) => isMetricDateInRange(point.date, range))
    .map(({ date, ...point }) => ({
      ...point,
      label: formatMetricPointLabel(date),
    }));
}

function parseMetricNumber(value: string) {
  const parsedValue = Number.parseFloat(value.replace(/[^\d.]/g, ""));
  return Number.isFinite(parsedValue) ? parsedValue : null;
}

function parseMetricBloodPressure(value: string) {
  const matched = value.match(/(\d+(?:\.\d+)?)\s*[\/／]\s*(\d+(?:\.\d+)?)/);

  if (!matched) {
    return null;
  }

  return [Number(matched[1]), Number(matched[2])] as const;
}

function parseMetricHour(dateTime: string) {
  const hour = Number.parseInt(dateTime.slice(11, 13), 10);
  return Number.isFinite(hour) ? hour : 0;
}

function getLatestMetricRecordsByDate(records: MemberHealthDashboardRecord[]) {
  const latestRecordMap = new Map<string, MemberHealthDashboardRecord>();

  for (const record of sortMetricRecords(records)) {
    const date = record.time.slice(0, 10);

    if (!latestRecordMap.has(date)) {
      latestRecordMap.set(date, record);
    }
  }

  return [...latestRecordMap.entries()]
    .sort(([leftDate], [rightDate]) => leftDate.localeCompare(rightDate))
    .map(([, record]) => record);
}

function resolveMetricChartValue(metricKey: MemberHealthDashboardKey, chartIndex: number, record: MemberHealthDashboardRecord) {
  switch (metricKey) {
    case "weight": {
      const numericValue = parseMetricNumber(record.value);
      if (numericValue === null) {
        return null;
      }

      return chartIndex === 0 ? numericValue : Number((numericValue / (1.66 * 1.66)).toFixed(1));
    }
    case "steps": {
      const numericValue = parseMetricNumber(record.value);
      if (numericValue === null) {
        return null;
      }

      return chartIndex === 0 ? numericValue : Math.round(numericValue / 120);
    }
    case "sleep": {
      const numericValue = parseMetricNumber(record.value);
      if (numericValue === null) {
        return null;
      }

      return chartIndex === 0 ? numericValue : Number((numericValue * 0.28).toFixed(1));
    }
    case "bloodSugar": {
      const numericValue = parseMetricNumber(record.value);
      if (numericValue === null) {
        return null;
      }

      const hour = parseMetricHour(record.time);
      if (chartIndex === 0) {
        return hour < 10 ? numericValue : null;
      }

      return hour >= 10 ? numericValue : null;
    }
    case "bloodPressure": {
      const pressureValue = parseMetricBloodPressure(record.value);
      if (!pressureValue) {
        return null;
      }

      return chartIndex === 0 ? pressureValue[0] : pressureValue[1];
    }
    case "oxygen": {
      const numericValue = parseMetricNumber(record.value);
      if (numericValue === null) {
        return null;
      }

      return chartIndex === 0 ? numericValue : (numericValue < 95 ? 1 : 0);
    }
    case "heartRate": {
      const numericValue = parseMetricNumber(record.value);
      if (numericValue === null) {
        return null;
      }

      return chartIndex === 0 ? numericValue : numericValue + 28;
    }
    default:
      return null;
  }
}

function createDerivedMetricChartPoints(
  module: MemberHealthDashboardModule,
  chartIndex: number,
  records: MemberHealthDashboardRecord[],
) {
  return getLatestMetricRecordsByDate(records)
    .map((record) => {
      const value = resolveMetricChartValue(module.key, chartIndex, record);

      if (value === null) {
        return null;
      }

      return {
        label: formatMetricPointLabel(record.time.slice(0, 10)),
        value,
      };
    })
    .filter((point): point is NonNullable<typeof point> => point !== null);
}

function buildMetricCharts(
  module: MemberHealthDashboardModule,
  records: MemberHealthDashboardRecord[],
  range: MetricDateRange,
  hasRecordOverride: boolean,
) {
  const filteredBaseCharts = module.charts.map((chart) =>
    createMetricChartWithPoints(chart, filterMetricBaseChartPoints(module, chart, range)),
  ) as MemberHealthDashboardModule["charts"];

  if (!hasRecordOverride) {
    return filteredBaseCharts;
  }

  return filteredBaseCharts.map((chart, chartIndex) => {
    const derivedPoints = createDerivedMetricChartPoints(module, chartIndex, records);
    return derivedPoints.length > 0 ? createMetricChartWithPoints(module.charts[chartIndex], derivedPoints) : chart;
  }) as MemberHealthDashboardModule["charts"];
}

const selectedMetricKey = ref<MemberHealthDashboardKey>("weight");
const metricSelectedRecordIds = ref<string[]>([]);
const metricBatchMode = ref(false);
const metricCurrentPage = ref(1);
const metricJumpPage = ref("1");
const metricPageSize = 10;
const metricsSettingsOpen = ref(false);
const metricRecordDialogOpen = ref(false);
const metricDeleteDialogOpen = ref(false);
const metricRecordDialogMode = ref<"create" | "edit">("create");
const editingMetricRecordId = ref("");
const metricDeleteMode = ref<"single" | "batch">("single");
const metricDeleteTargetIds = ref<string[]>([]);
const metricDeleteTargetTime = ref("");
const metricStartDateInput = ref<HTMLInputElement | null>(null);
const metricEndDateInput = ref<HTMLInputElement | null>(null);
const metricRecordForm = ref<MetricRecordForm>({ date: "", time: "", value: "" });
const metricSettingsDraft = ref<MetricsAlertSettings>(createDefaultMetricAlertSettings());
const metricRecordOverrides = ref<MetricRecordOverrides>(readSessionStorageJson(metricRecordOverridesStorageKey, {}));
const metricSettingsOverrides = ref<MetricSettingsOverrides>(readSessionStorageJson(metricSettingsStorageKey, {}));
const metricDateRangeOverrides = ref<MetricDateRangeOverrides>(readSessionStorageJson(metricDateRangesStorageKey, {}));

const currentMemberId = computed(() => memberDetail.value?.member.id ?? selectedMemberId.value);
const reportRecordOverridesStorageKey = "admin:elder:report-record-overrides";
type ReportRecordOverrides = Record<string, MemberReportItem[]>;

const reportTypeDraft = ref("all");
const reportKeywordDraft = ref("");
const reportTypeFilter = ref("all");
const reportKeyword = ref("");
const reportCurrentPage = ref(1);
const reportJumpPage = ref("1");
const reportPageSize = 10;
const reportBatchMode = ref(false);
const reportSelectedRecordIds = ref<string[]>([]);
const reportRecordOverrides = ref<ReportRecordOverrides>(readSessionStorageJson(reportRecordOverridesStorageKey, {}));

function sortReportRecords(records: MemberReportItem[]) {
  return records
    .slice()
    .sort((left, right) => right.uploadedAt.localeCompare(left.uploadedAt) || right.reportDate.localeCompare(left.reportDate));
}

function persistReportRecords(records: MemberReportItem[]) {
  const memberId = currentMemberId.value;

  if (!memberId) {
    return;
  }

  reportRecordOverrides.value = {
    ...reportRecordOverrides.value,
    [memberId]: sortReportRecords(records),
  };
  writeSessionStorageJson(reportRecordOverridesStorageKey, reportRecordOverrides.value);
}

function buildReportTimestamp(date = new Date()) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  const hours = `${date.getHours()}`.padStart(2, "0");
  const minutes = `${date.getMinutes()}`.padStart(2, "0");

  return {
    date: `${year}-${month}-${day}`,
    datetime: `${year}-${month}-${day} ${hours}:${minutes}`,
  };
}

const reportAllRecords = computed(() => {
  const detail = memberDetail.value;

  if (!detail) {
    return [];
  }

  return sortReportRecords(reportRecordOverrides.value[detail.member.id] ?? detail.reports);
});

const reportTypeOptions = computed(() => [...new Set(reportAllRecords.value.map((item) => item.type))]);
const filteredReportRecords = computed(() => {
  const keyword = reportKeyword.value.trim().toLowerCase();

  return reportAllRecords.value.filter((item) => {
    if (reportTypeFilter.value !== "all" && item.type !== reportTypeFilter.value) {
      return false;
    }

    if (!keyword) {
      return true;
    }

    return [item.uploadedAt, item.name, item.type, item.source, item.uploader, item.orderId, item.reportDate].some((value) =>
      value.toLowerCase().includes(keyword),
    );
  });
});
const reportTotalPages = computed(() => Math.max(Math.ceil(filteredReportRecords.value.length / reportPageSize), 1));
const reportPagedRecords = computed(() => {
  const start = (reportCurrentPage.value - 1) * reportPageSize;
  return filteredReportRecords.value.slice(start, start + reportPageSize);
});
const reportCurrentPageRecordIds = computed(() => reportPagedRecords.value.map((item) => item.id));
const areAllReportRowsSelected = computed(
  () =>
    reportCurrentPageRecordIds.value.length > 0 &&
    reportCurrentPageRecordIds.value.every((id) => reportSelectedRecordIds.value.includes(id)),
);
const reportBatchSelectionCount = computed(() => reportSelectedRecordIds.value.length);

watch(
  currentMemberId,
  () => {
    reportTypeDraft.value = "all";
    reportKeywordDraft.value = "";
    reportTypeFilter.value = "all";
    reportKeyword.value = "";
    reportCurrentPage.value = 1;
    reportJumpPage.value = "1";
    reportBatchMode.value = false;
    reportSelectedRecordIds.value = [];
  },
  { immediate: true },
);

watch([reportTypeFilter, reportKeyword], () => {
  reportCurrentPage.value = 1;
  reportJumpPage.value = "1";
  reportSelectedRecordIds.value = [];
});

watch(reportTotalPages, (totalPages) => {
  if (reportCurrentPage.value > totalPages) {
    reportCurrentPage.value = totalPages;
  }
});

watch(reportCurrentPage, (page) => {
  reportJumpPage.value = `${page}`;
});

function closeReportBatchMode() {
  reportBatchMode.value = false;
  reportSelectedRecordIds.value = [];
}

function searchReports() {
  reportTypeFilter.value = reportTypeDraft.value;
  reportKeyword.value = reportKeywordDraft.value.trim();
}

function resetReportFilters() {
  reportTypeDraft.value = "all";
  reportKeywordDraft.value = "";
  reportTypeFilter.value = "all";
  reportKeyword.value = "";
}

function setReportPage(page: number) {
  const nextPage = Math.min(Math.max(page, 1), reportTotalPages.value);
  reportCurrentPage.value = nextPage;
}

function jumpToReportPage() {
  const nextPage = Number(reportJumpPage.value);

  if (!Number.isInteger(nextPage)) {
    reportJumpPage.value = `${reportCurrentPage.value}`;
    return;
  }

  setReportPage(nextPage);
}

function openReportBatchActions() {
  reportBatchMode.value = !reportBatchMode.value;

  if (!reportBatchMode.value) {
    reportSelectedRecordIds.value = [];
  }
}

function toggleReportRecordSelection(recordId: string) {
  if (!reportBatchMode.value) {
    return;
  }

  reportSelectedRecordIds.value = reportSelectedRecordIds.value.includes(recordId)
    ? reportSelectedRecordIds.value.filter((item) => item !== recordId)
    : [...reportSelectedRecordIds.value, recordId];
}

function toggleReportRecordSelectionByEvent(recordId: string, event: Event) {
  event.preventDefault();
  event.stopPropagation();
  toggleReportRecordSelection(recordId);
}

function toggleAllReportRecords() {
  if (!reportBatchMode.value || !reportCurrentPageRecordIds.value.length) {
    return;
  }

  if (areAllReportRowsSelected.value) {
    reportSelectedRecordIds.value = reportSelectedRecordIds.value.filter((id) => !reportCurrentPageRecordIds.value.includes(id));
    return;
  }

  reportSelectedRecordIds.value = [...new Set([...reportSelectedRecordIds.value, ...reportCurrentPageRecordIds.value])];
}

function toggleAllReportRecordsByEvent(event: Event) {
  event.preventDefault();
  event.stopPropagation();
  toggleAllReportRecords();
}

function removeSelectedReports() {
  if (reportSelectedRecordIds.value.length === 0) {
    props.showToast("请先选择要批量操作的报告");
    return;
  }

  const removedIds = new Set(reportSelectedRecordIds.value);
  const nextRecords = reportAllRecords.value.filter((item) => !removedIds.has(item.id));
  persistReportRecords(nextRecords);
  props.showToast(`已批量删除 ${removedIds.size} 条报告记录`);
  closeReportBatchMode();
}

function uploadReportRecord() {
  const detail = memberDetail.value;

  if (!detail) {
    return;
  }

  const timestamp = buildReportTimestamp();
  const nextIndex = reportAllRecords.value.length + 1;
  const nextType = reportTypeDraft.value !== "all" ? reportTypeDraft.value : "体检报告";
  const nextRecord: MemberReportItem = {
    id: `report-${detail.member.id}-${Date.now()}`,
    uploadedAt: timestamp.datetime,
    name: `新上传报告 ${nextIndex}`,
    type: nextType,
    source: "后台上传",
    uploader: detail.member.realName,
    orderId: `GD${timestamp.date.replace(/-/g, "")}${String(nextIndex).padStart(4, "0")}`,
    reportDate: timestamp.date,
  };

  persistReportRecords([nextRecord, ...reportAllRecords.value]);
  reportCurrentPage.value = 1;
  props.showToast("已上传报告信息");
}

watch(activeTab, (tab) => {
  if (tab !== "report") {
    closeReportBatchMode();
  }
});

const orderServiceTypeDraft = ref("all");
const orderKeywordDraft = ref("");
const orderServiceTypeFilter = ref("all");
const orderKeyword = ref("");
const orderCurrentPage = ref(1);
const orderJumpPage = ref("1");
const orderPageSize = 10;

const orderAllRecords = computed(() => {
  const detail = memberDetail.value;

  if (!detail) {
    return [];
  }

  return detail.orders.slice().sort((left, right) => right.orderTime.localeCompare(left.orderTime));
});
const orderServiceTypeOptions = computed(() => [...new Set(orderAllRecords.value.map((item) => item.serviceType))]);
const filteredOrderRecords = computed(() => {
  const keyword = orderKeyword.value.trim().toLowerCase();

  return orderAllRecords.value.filter((item) => {
    if (orderServiceTypeFilter.value !== "all" && item.serviceType !== orderServiceTypeFilter.value) {
      return false;
    }

    if (!keyword) {
      return true;
    }

    return [
      item.orderTime,
      item.orderNo,
      item.serviceType,
      item.productName,
      item.productSummary,
      item.buyerName,
      item.buyerPhone,
      item.orderStatus,
      item.paymentMethod,
      item.price,
      item.payAmount,
    ].some((value) => value.toLowerCase().includes(keyword));
  });
});
const orderTotalPages = computed(() => Math.max(Math.ceil(filteredOrderRecords.value.length / orderPageSize), 1));
const orderPagedRecords = computed(() => {
  const start = (orderCurrentPage.value - 1) * orderPageSize;
  return filteredOrderRecords.value.slice(start, start + orderPageSize);
});

watch(
  currentMemberId,
  () => {
    orderServiceTypeDraft.value = "all";
    orderKeywordDraft.value = "";
    orderServiceTypeFilter.value = "all";
    orderKeyword.value = "";
    orderCurrentPage.value = 1;
    orderJumpPage.value = "1";
  },
  { immediate: true },
);

watch([orderServiceTypeFilter, orderKeyword], () => {
  orderCurrentPage.value = 1;
  orderJumpPage.value = "1";
});

watch(orderTotalPages, (totalPages) => {
  if (orderCurrentPage.value > totalPages) {
    orderCurrentPage.value = totalPages;
  }
});

watch(orderCurrentPage, (page) => {
  orderJumpPage.value = `${page}`;
});

function searchOrders() {
  orderServiceTypeFilter.value = orderServiceTypeDraft.value;
  orderKeyword.value = orderKeywordDraft.value.trim();
}

function resetOrderFilters() {
  orderServiceTypeDraft.value = "all";
  orderKeywordDraft.value = "";
  orderServiceTypeFilter.value = "all";
  orderKeyword.value = "";
}

function setOrderPage(page: number) {
  const nextPage = Math.min(Math.max(page, 1), orderTotalPages.value);
  orderCurrentPage.value = nextPage;
}

function jumpToOrderPage() {
  const nextPage = Number(orderJumpPage.value);

  if (!Number.isInteger(nextPage)) {
    orderJumpPage.value = `${orderCurrentPage.value}`;
    return;
  }

  setOrderPage(nextPage);
}

function orderStatusClass(tone: MemberDetailTone) {
  return `order-status--${tone}`;
}

function viewOrderDetail(item: MemberOrderItem) {
  props.showToast(`已打开订单 ${item.orderNo} 的详情页`);
}

function contactOrderUser(item: MemberOrderItem) {
  props.showToast(`已发起联系：${item.buyerName} ${item.buyerPhone}`);
}

function remarkOrder(item: MemberOrderItem) {
  props.showToast(`已打开订单 ${item.orderNo} 的备注入口`);
}

type AssetPanelKey = "coupon" | "points" | "growth";
type AssetPointRecordOverrides = Record<string, MemberAssetPointItem[]>;
type AssetGrowthRecordOverrides = Record<string, MemberAssetGrowthItem[]>;

const assetPanelTabs: Array<{ key: AssetPanelKey; label: string }> = [
  { key: "coupon", label: "优惠券" },
  { key: "points", label: "积分" },
  { key: "growth", label: "成长值" },
];
const assetPointRecordOverridesStorageKey = "admin:elder:asset-point-record-overrides";
const assetGrowthRecordOverridesStorageKey = "admin:elder:asset-growth-record-overrides";
const activeAssetPanel = ref<AssetPanelKey>("coupon");
const assetFilterDraft = ref("all");
const assetKeywordDraft = ref("");
const assetFilter = ref("all");
const assetKeyword = ref("");
const assetCurrentPage = ref(1);
const assetJumpPage = ref("1");
const assetPageSize = 10;
const assetPointRecordOverrides = ref<AssetPointRecordOverrides>(readSessionStorageJson(assetPointRecordOverridesStorageKey, {}));
const assetGrowthRecordOverrides = ref<AssetGrowthRecordOverrides>(readSessionStorageJson(assetGrowthRecordOverridesStorageKey, {}));

function sortAssetCouponRecords(records: MemberAssetCouponItem[]) {
  return records.slice().sort((left, right) => right.receivedAt.localeCompare(left.receivedAt));
}

function sortAssetPointRecords(records: MemberAssetPointItem[]) {
  return records.slice().sort((left, right) => right.time.localeCompare(left.time));
}

function sortAssetGrowthRecords(records: MemberAssetGrowthItem[]) {
  return records.slice().sort((left, right) => right.time.localeCompare(left.time));
}

function persistAssetPointRecords(records: MemberAssetPointItem[]) {
  const memberId = currentMemberId.value;

  if (!memberId) {
    return;
  }

  assetPointRecordOverrides.value = {
    ...assetPointRecordOverrides.value,
    [memberId]: sortAssetPointRecords(records),
  };
  writeSessionStorageJson(assetPointRecordOverridesStorageKey, assetPointRecordOverrides.value);
}

function persistAssetGrowthRecords(records: MemberAssetGrowthItem[]) {
  const memberId = currentMemberId.value;

  if (!memberId) {
    return;
  }

  assetGrowthRecordOverrides.value = {
    ...assetGrowthRecordOverrides.value,
    [memberId]: sortAssetGrowthRecords(records),
  };
  writeSessionStorageJson(assetGrowthRecordOverridesStorageKey, assetGrowthRecordOverrides.value);
}

const assetCouponAllRecords = computed(() => {
  const detail = memberDetail.value;

  if (!detail) {
    return [];
  }

  return sortAssetCouponRecords(detail.assetCoupons);
});
const assetPointAllRecords = computed(() => {
  const detail = memberDetail.value;

  if (!detail) {
    return [];
  }

  return sortAssetPointRecords(assetPointRecordOverrides.value[detail.member.id] ?? detail.assetPoints);
});
const assetGrowthAllRecords = computed(() => {
  const detail = memberDetail.value;

  if (!detail) {
    return [];
  }

  return sortAssetGrowthRecords(assetGrowthRecordOverrides.value[detail.member.id] ?? detail.assetGrowthRecords);
});
const assetFilterLabel = computed(() => (activeAssetPanel.value === "coupon" ? "状态" : "类型"));
const assetFilterOptions = computed(() => {
  const source =
    activeAssetPanel.value === "coupon"
      ? assetCouponAllRecords.value.map((item) => item.status)
      : activeAssetPanel.value === "points"
        ? assetPointAllRecords.value.map((item) => item.type)
        : assetGrowthAllRecords.value.map((item) => item.type);

  return [...new Set(source)];
});
const filteredAssetCoupons = computed(() => {
  const keyword = assetKeyword.value.trim().toLowerCase();

  return assetCouponAllRecords.value.filter((item) => {
    if (assetFilter.value !== "all" && item.status !== assetFilter.value) {
      return false;
    }

    if (!keyword) {
      return true;
    }

    return [item.name, item.status, item.amount, item.condition, item.scope, item.receivedAt, item.expiresAt].some((value) =>
      value.toLowerCase().includes(keyword),
    );
  });
});
const filteredAssetPoints = computed(() => {
  const keyword = assetKeyword.value.trim().toLowerCase();

  return assetPointAllRecords.value.filter((item) => {
    if (assetFilter.value !== "all" && item.type !== assetFilter.value) {
      return false;
    }

    if (!keyword) {
      return true;
    }

    return [item.type, item.amount, item.reason, item.remark, item.operator, item.time].some((value) =>
      value.toLowerCase().includes(keyword),
    );
  });
});
const filteredAssetGrowthRecords = computed(() => {
  const keyword = assetKeyword.value.trim().toLowerCase();

  return assetGrowthAllRecords.value.filter((item) => {
    if (assetFilter.value !== "all" && item.type !== assetFilter.value) {
      return false;
    }

    if (!keyword) {
      return true;
    }

    return [item.type, item.amount, item.reason, item.remark, item.operator, item.time].some((value) =>
      value.toLowerCase().includes(keyword),
    );
  });
});
const activeAssetRecordCount = computed(() => {
  if (activeAssetPanel.value === "coupon") {
    return filteredAssetCoupons.value.length;
  }

  if (activeAssetPanel.value === "points") {
    return filteredAssetPoints.value.length;
  }

  return filteredAssetGrowthRecords.value.length;
});
const assetTotalPages = computed(() => Math.max(Math.ceil(activeAssetRecordCount.value / assetPageSize), 1));
const assetPagedCoupons = computed(() => {
  const start = (assetCurrentPage.value - 1) * assetPageSize;
  return filteredAssetCoupons.value.slice(start, start + assetPageSize);
});
const assetPagedPoints = computed(() => {
  const start = (assetCurrentPage.value - 1) * assetPageSize;
  return filteredAssetPoints.value.slice(start, start + assetPageSize);
});
const assetPagedGrowthRecords = computed(() => {
  const start = (assetCurrentPage.value - 1) * assetPageSize;
  return filteredAssetGrowthRecords.value.slice(start, start + assetPageSize);
});
const assetActionButtonLabel = computed(() =>
  activeAssetPanel.value === "points" ? "赠送积分" : activeAssetPanel.value === "growth" ? "赠送成长值" : "",
);

watch(
  [currentMemberId, activeAssetPanel],
  () => {
    assetFilterDraft.value = "all";
    assetKeywordDraft.value = "";
    assetFilter.value = "all";
    assetKeyword.value = "";
    assetCurrentPage.value = 1;
    assetJumpPage.value = "1";
  },
  { immediate: true },
);

watch([assetFilter, assetKeyword], () => {
  assetCurrentPage.value = 1;
  assetJumpPage.value = "1";
});

watch(assetTotalPages, (totalPages) => {
  if (assetCurrentPage.value > totalPages) {
    assetCurrentPage.value = totalPages;
  }
});

watch(assetCurrentPage, (page) => {
  assetJumpPage.value = `${page}`;
});

function setActiveAssetPanel(panel: AssetPanelKey) {
  activeAssetPanel.value = panel;
}

function searchAssets() {
  assetFilter.value = assetFilterDraft.value;
  assetKeyword.value = assetKeywordDraft.value.trim();
}

function resetAssetFilters() {
  assetFilterDraft.value = "all";
  assetKeywordDraft.value = "";
  assetFilter.value = "all";
  assetKeyword.value = "";
}

function setAssetPage(page: number) {
  const nextPage = Math.min(Math.max(page, 1), assetTotalPages.value);
  assetCurrentPage.value = nextPage;
}

function jumpToAssetPage() {
  const nextPage = Number(assetJumpPage.value);

  if (!Number.isInteger(nextPage)) {
    assetJumpPage.value = `${assetCurrentPage.value}`;
    return;
  }

  setAssetPage(nextPage);
}

function assetStatusClass(tone: MemberDetailTone) {
  return `asset-status--${tone}`;
}

function assetAmountClass(tone: MemberDetailTone) {
  return `asset-amount--${tone}`;
}

function giftAssetBalance() {
  const detail = memberDetail.value;
  const memberId = currentMemberId.value;

  if (!detail || !memberId) {
    return;
  }

  const timestamp = buildReportTimestamp();

  if (activeAssetPanel.value === "points") {
    const nextRecord: MemberAssetPointItem = {
      id: `asset-point-${memberId}-${Date.now()}`,
      type: "赠送",
      amount: "+50",
      reason: "后台赠送积分",
      remark: "会员关怀补发",
      operator: "运营后台",
      time: timestamp.datetime,
      tone: "accent",
    };

    persistAssetPointRecords([nextRecord, ...assetPointAllRecords.value]);
    assetCurrentPage.value = 1;
    props.showToast(`已为 ${detail.member.nickname} 赠送积分`);
    return;
  }

  if (activeAssetPanel.value === "growth") {
    const nextRecord: MemberAssetGrowthItem = {
      id: `asset-growth-${memberId}-${Date.now()}`,
      type: "赠送",
      amount: "+80",
      reason: "后台赠送成长值",
      remark: "等级维护补发",
      operator: "运营后台",
      time: timestamp.datetime,
      tone: "accent",
    };

    persistAssetGrowthRecords([nextRecord, ...assetGrowthAllRecords.value]);
    assetCurrentPage.value = 1;
    props.showToast(`已为 ${detail.member.nickname} 赠送成长值`);
  }
}

const contentRecordOverridesStorageKey = "admin:elder:content-record-overrides";
type ContentRecordOverrides = Record<string, MemberContentItem[]>;

const contentKeywordDraft = ref("");
const contentKeyword = ref("");
const contentCurrentPage = ref(1);
const contentJumpPage = ref("1");
const contentPageSize = 10;
const contentBatchMode = ref(false);
const contentSelectedRecordIds = ref<string[]>([]);
const contentRecordOverrides = ref<ContentRecordOverrides>(readSessionStorageJson(contentRecordOverridesStorageKey, {}));

function sortContentRecords(records: MemberContentItem[]) {
  return records.slice().sort((left, right) => right.publishedAt.localeCompare(left.publishedAt));
}

function persistContentRecords(records: MemberContentItem[]) {
  const memberId = currentMemberId.value;

  if (!memberId) {
    return;
  }

  contentRecordOverrides.value = {
    ...contentRecordOverrides.value,
    [memberId]: sortContentRecords(records),
  };
  writeSessionStorageJson(contentRecordOverridesStorageKey, contentRecordOverrides.value);
}

const contentAllRecords = computed(() => {
  const detail = memberDetail.value;

  if (!detail) {
    return [];
  }

  return sortContentRecords(contentRecordOverrides.value[detail.member.id] ?? detail.contents);
});
const filteredContentRecords = computed(() => {
  const keyword = contentKeyword.value.trim().toLowerCase();

  if (!keyword) {
    return contentAllRecords.value;
  }

  return contentAllRecords.value.filter((item) =>
    [
      item.content,
      item.topic,
      `${item.likes}`,
      `${item.favorites}`,
      `${item.shares}`,
      `${item.comments}`,
      item.publishedAt,
      item.visible ? "显示" : "隐藏",
    ].some((value) => value.toLowerCase().includes(keyword)),
  );
});
const contentTotalPages = computed(() => Math.max(Math.ceil(filteredContentRecords.value.length / contentPageSize), 1));
const contentPagedRecords = computed(() => {
  const start = (contentCurrentPage.value - 1) * contentPageSize;
  return filteredContentRecords.value.slice(start, start + contentPageSize);
});
const contentCurrentPageRecordIds = computed(() => contentPagedRecords.value.map((item) => item.id));
const areAllContentRowsSelected = computed(
  () =>
    contentCurrentPageRecordIds.value.length > 0 &&
    contentCurrentPageRecordIds.value.every((id) => contentSelectedRecordIds.value.includes(id)),
);
const contentBatchSelectionCount = computed(() => contentSelectedRecordIds.value.length);

watch(
  currentMemberId,
  () => {
    contentKeywordDraft.value = "";
    contentKeyword.value = "";
    contentCurrentPage.value = 1;
    contentJumpPage.value = "1";
    contentBatchMode.value = false;
    contentSelectedRecordIds.value = [];
  },
  { immediate: true },
);

watch(contentKeyword, () => {
  contentCurrentPage.value = 1;
  contentJumpPage.value = "1";
  contentSelectedRecordIds.value = [];
});

watch(contentTotalPages, (totalPages) => {
  if (contentCurrentPage.value > totalPages) {
    contentCurrentPage.value = totalPages;
  }
});

watch(contentCurrentPage, (page) => {
  contentJumpPage.value = `${page}`;
});

watch(activeTab, (tab) => {
  if (tab !== "content") {
    closeContentBatchMode();
  }
});

function closeContentBatchMode() {
  contentBatchMode.value = false;
  contentSelectedRecordIds.value = [];
}

function searchContents() {
  contentKeyword.value = contentKeywordDraft.value.trim();
}

function resetContentFilters() {
  contentKeywordDraft.value = "";
  contentKeyword.value = "";
}

function setContentPage(page: number) {
  const nextPage = Math.min(Math.max(page, 1), contentTotalPages.value);
  contentCurrentPage.value = nextPage;
}

function jumpToContentPage() {
  const nextPage = Number(contentJumpPage.value);

  if (!Number.isInteger(nextPage)) {
    contentJumpPage.value = `${contentCurrentPage.value}`;
    return;
  }

  setContentPage(nextPage);
}

function openContentBatchActions() {
  contentBatchMode.value = !contentBatchMode.value;

  if (!contentBatchMode.value) {
    contentSelectedRecordIds.value = [];
  }
}

function toggleContentRecordSelection(recordId: string) {
  if (!contentBatchMode.value) {
    return;
  }

  contentSelectedRecordIds.value = contentSelectedRecordIds.value.includes(recordId)
    ? contentSelectedRecordIds.value.filter((item) => item !== recordId)
    : [...contentSelectedRecordIds.value, recordId];
}

function toggleContentRecordSelectionByEvent(recordId: string, event: Event) {
  event.preventDefault();
  event.stopPropagation();
  toggleContentRecordSelection(recordId);
}

function toggleAllContentRecords() {
  if (!contentBatchMode.value || !contentCurrentPageRecordIds.value.length) {
    return;
  }

  if (areAllContentRowsSelected.value) {
    contentSelectedRecordIds.value = contentSelectedRecordIds.value.filter((id) => !contentCurrentPageRecordIds.value.includes(id));
    return;
  }

  contentSelectedRecordIds.value = [...new Set([...contentSelectedRecordIds.value, ...contentCurrentPageRecordIds.value])];
}

function toggleAllContentRecordsByEvent(event: Event) {
  event.preventDefault();
  event.stopPropagation();
  toggleAllContentRecords();
}

function removeSelectedContents() {
  if (contentSelectedRecordIds.value.length === 0) {
    props.showToast("请先选择要批量操作的帖子");
    return;
  }

  const removedIds = new Set(contentSelectedRecordIds.value);
  const nextRecords = contentAllRecords.value.filter((item) => !removedIds.has(item.id));
  persistContentRecords(nextRecords);
  props.showToast(`已批量删除 ${removedIds.size} 条帖子`);
  closeContentBatchMode();
}

function toggleContentVisibility(item: MemberContentItem) {
  const nextRecords = contentAllRecords.value.map((record) =>
    record.id === item.id ? { ...record, visible: !record.visible } : record,
  );
  persistContentRecords(nextRecords);
  props.showToast(`帖子已${item.visible ? "隐藏" : "显示"}`);
}

function deleteContentRecord(item: MemberContentItem) {
  const nextRecords = contentAllRecords.value.filter((record) => record.id !== item.id);
  persistContentRecords(nextRecords);
  contentSelectedRecordIds.value = contentSelectedRecordIds.value.filter((id) => id !== item.id);
  props.showToast("帖子已删除");
}

const serviceRecordOverridesStorageKey = "admin:elder:service-record-overrides";
type ServiceRecordOverrides = Record<string, MemberServiceRecordItem[]>;
const serviceTypeDraft = ref("all");
const serviceKeywordDraft = ref("");
const serviceTypeFilter = ref("all");
const serviceKeyword = ref("");
const serviceCurrentPage = ref(1);
const serviceJumpPage = ref("1");
const servicePageSize = 10;
const serviceBatchMode = ref(false);
const serviceSelectedRecordIds = ref<string[]>([]);
const serviceRecordOverrides = ref<ServiceRecordOverrides>(readSessionStorageJson(serviceRecordOverridesStorageKey, {}));
const serviceDetailDialogOpen = ref(false);
const serviceDetailTargetId = ref("");
const serviceRemarkDialogOpen = ref(false);
const serviceRemarkMode = ref<"single" | "batch">("single");
const serviceRemarkTargetId = ref("");
const serviceRemarkDraft = ref("");

function sortServiceRecords(records: MemberServiceRecordItem[]) {
  return records.slice().sort((left, right) => right.serviceTime.localeCompare(left.serviceTime));
}

function persistServiceRecords(records: MemberServiceRecordItem[]) {
  const memberId = currentMemberId.value;

  if (!memberId) {
    return;
  }

  serviceRecordOverrides.value = {
    ...serviceRecordOverrides.value,
    [memberId]: sortServiceRecords(records),
  };
  writeSessionStorageJson(serviceRecordOverridesStorageKey, serviceRecordOverrides.value);
}

const serviceAllRecords = computed(() => {
  const detail = memberDetail.value;

  if (!detail) {
    return [];
  }

  return sortServiceRecords(serviceRecordOverrides.value[detail.member.id] ?? detail.serviceRecords);
});
const serviceTypeOptions = computed(() => [...new Set(serviceAllRecords.value.map((item) => item.serviceType))]);
const activeServiceDetailRecord = computed(
  () => serviceAllRecords.value.find((item) => item.id === serviceDetailTargetId.value) ?? null,
);
const activeServiceRemarkRecord = computed(
  () => serviceAllRecords.value.find((item) => item.id === serviceRemarkTargetId.value) ?? null,
);
const serviceRemarkDialogTitle = computed(() => (serviceRemarkMode.value === "batch" ? "批量填写备注" : "填写备注"));
const serviceRemarkDialogSummary = computed(() => {
  if (serviceRemarkMode.value === "batch") {
    return `已选择 ${serviceSelectedRecordIds.value.length} 条服务记录，保存后将同步更新备注。`;
  }

  return activeServiceRemarkRecord.value ? `工单编号：${activeServiceRemarkRecord.value.orderNo}` : "";
});
const filteredServiceRecords = computed(() => {
  const keyword = serviceKeyword.value.trim().toLowerCase();

  return serviceAllRecords.value.filter((item) => {
    if (serviceTypeFilter.value !== "all" && item.serviceType !== serviceTypeFilter.value) {
      return false;
    }

    if (!keyword) {
      return true;
    }

    return [
      item.orderNo,
      item.serviceType,
      item.orderName,
      item.serviceItem,
      item.status,
      item.payAmount,
      item.staff,
      item.serviceTime,
      item.remark,
    ].some((value) => value.toLowerCase().includes(keyword));
  });
});
const serviceTotalPages = computed(() => Math.max(Math.ceil(filteredServiceRecords.value.length / servicePageSize), 1));
const servicePagedRecords = computed(() => {
  const start = (serviceCurrentPage.value - 1) * servicePageSize;
  return filteredServiceRecords.value.slice(start, start + servicePageSize);
});
const serviceCurrentPageRecordIds = computed(() => servicePagedRecords.value.map((item) => item.id));
const areAllServiceRowsSelected = computed(
  () =>
    serviceCurrentPageRecordIds.value.length > 0 &&
    serviceCurrentPageRecordIds.value.every((id) => serviceSelectedRecordIds.value.includes(id)),
);
const serviceBatchSelectionCount = computed(() => serviceSelectedRecordIds.value.length);

watch(
  currentMemberId,
  () => {
    serviceTypeDraft.value = "all";
    serviceKeywordDraft.value = "";
    serviceTypeFilter.value = "all";
    serviceKeyword.value = "";
    serviceCurrentPage.value = 1;
    serviceJumpPage.value = "1";
    serviceBatchMode.value = false;
    serviceSelectedRecordIds.value = [];
    closeServiceOrderDetailDialog();
    closeServiceRemarkDialog();
  },
  { immediate: true },
);

watch([serviceTypeFilter, serviceKeyword], () => {
  serviceCurrentPage.value = 1;
  serviceJumpPage.value = "1";
  serviceSelectedRecordIds.value = [];
});

watch(serviceTotalPages, (totalPages) => {
  if (serviceCurrentPage.value > totalPages) {
    serviceCurrentPage.value = totalPages;
  }
});

watch(serviceCurrentPage, (page) => {
  serviceJumpPage.value = `${page}`;
});

watch(activeTab, (tab) => {
  if (tab !== "service") {
    closeServiceBatchMode();
    closeServiceOrderDetailDialog();
    closeServiceRemarkDialog();
  }
});

function closeServiceBatchMode() {
  serviceBatchMode.value = false;
  serviceSelectedRecordIds.value = [];
}

function closeServiceOrderDetailDialog() {
  serviceDetailDialogOpen.value = false;
  serviceDetailTargetId.value = "";
}

function closeServiceRemarkDialog() {
  serviceRemarkDialogOpen.value = false;
  serviceRemarkMode.value = "single";
  serviceRemarkTargetId.value = "";
  serviceRemarkDraft.value = "";
}

function searchServices() {
  serviceTypeFilter.value = serviceTypeDraft.value;
  serviceKeyword.value = serviceKeywordDraft.value.trim();
}

function resetServiceFilters() {
  serviceTypeDraft.value = "all";
  serviceKeywordDraft.value = "";
  serviceTypeFilter.value = "all";
  serviceKeyword.value = "";
}

function setServicePage(page: number) {
  const nextPage = Math.min(Math.max(page, 1), serviceTotalPages.value);
  serviceCurrentPage.value = nextPage;
}

function jumpToServicePage() {
  const nextPage = Number(serviceJumpPage.value);

  if (!Number.isInteger(nextPage)) {
    serviceJumpPage.value = `${serviceCurrentPage.value}`;
    return;
  }

  setServicePage(nextPage);
}

function openServiceBatchActions() {
  serviceBatchMode.value = !serviceBatchMode.value;

  if (!serviceBatchMode.value) {
    serviceSelectedRecordIds.value = [];
  }
}

function toggleServiceRecordSelection(recordId: string) {
  if (!serviceBatchMode.value) {
    return;
  }

  serviceSelectedRecordIds.value = serviceSelectedRecordIds.value.includes(recordId)
    ? serviceSelectedRecordIds.value.filter((item) => item !== recordId)
    : [...serviceSelectedRecordIds.value, recordId];
}

function toggleServiceRecordSelectionByEvent(recordId: string, event: Event) {
  event.preventDefault();
  event.stopPropagation();
  toggleServiceRecordSelection(recordId);
}

function toggleAllServiceRecords() {
  if (!serviceBatchMode.value || !serviceCurrentPageRecordIds.value.length) {
    return;
  }

  if (areAllServiceRowsSelected.value) {
    serviceSelectedRecordIds.value = serviceSelectedRecordIds.value.filter((id) => !serviceCurrentPageRecordIds.value.includes(id));
    return;
  }

  serviceSelectedRecordIds.value = [...new Set([...serviceSelectedRecordIds.value, ...serviceCurrentPageRecordIds.value])];
}

function toggleAllServiceRecordsByEvent(event: Event) {
  event.preventDefault();
  event.stopPropagation();
  toggleAllServiceRecords();
}

function serviceStatusClass(tone: MemberDetailTone) {
  return `service-status--${tone}`;
}

function viewServiceOrderDetail(item: MemberServiceRecordItem) {
  serviceDetailTargetId.value = item.id;
  serviceDetailDialogOpen.value = true;
}

function remarkServiceRecord(item: MemberServiceRecordItem) {
  serviceRemarkMode.value = "single";
  serviceRemarkTargetId.value = item.id;
  serviceRemarkDraft.value = item.remark;
  serviceRemarkDialogOpen.value = true;
}

function remarkSelectedServiceRecords() {
  if (!serviceSelectedRecordIds.value.length) {
    props.showToast("请先选择要批量操作的服务记录");
    return;
  }

  serviceRemarkMode.value = "batch";
  serviceRemarkTargetId.value = "";
  serviceRemarkDraft.value = "";
  serviceRemarkDialogOpen.value = true;
}

function saveServiceRemark() {
  const remark = serviceRemarkDraft.value.trim();
  const isBatchRemark = serviceRemarkMode.value === "batch";

  if (!remark) {
    props.showToast("请输入备注内容");
    return;
  }

  const targetIds =
    isBatchRemark
      ? new Set(serviceSelectedRecordIds.value)
      : new Set(serviceRemarkTargetId.value ? [serviceRemarkTargetId.value] : []);

  if (!targetIds.size) {
    props.showToast("未找到可保存备注的服务记录");
    return;
  }

  const nextRecords = serviceAllRecords.value.map((item) => (targetIds.has(item.id) ? { ...item, remark } : item));
  persistServiceRecords(nextRecords);
  props.showToast(isBatchRemark ? `已更新 ${targetIds.size} 条服务记录备注` : "备注已保存");
  closeServiceRemarkDialog();

  if (isBatchRemark) {
    closeServiceBatchMode();
  }
}

const metricModules = computed(() => {
  const detail = memberDetail.value;

  if (!detail) {
    return [];
  }

  const memberId = detail.member.id;

  return detail.healthMetricModules.map((module) => {
    const allRecords = sortMetricRecords(metricRecordOverrides.value[memberId]?.[module.key] ?? module.records);
    const range = metricDateRangeOverrides.value[memberId]?.[module.key] ?? {
      startDate: module.startDate,
      endDate: module.endDate,
    };
    const filteredRecords = filterMetricRecordsByDate(allRecords, range);
    const charts = buildMetricCharts(module, filteredRecords, range, Boolean(metricRecordOverrides.value[memberId]?.[module.key]));

    return {
      ...module,
      startDate: range.startDate,
      endDate: range.endDate,
      charts,
      records: filteredRecords,
    };
  });
});
const selectedMetricModule = computed(() => metricModules.value.find((item) => item.key === selectedMetricKey.value) ?? metricModules.value[0] ?? null);
const activeMetricLabel = computed(() => selectedMetricModule.value?.label ?? "健康数据");
const metricRecords = computed(() => selectedMetricModule.value?.records ?? []);
const metricTotalPages = computed(() => Math.max(Math.ceil(metricRecords.value.length / metricPageSize), 1));
const metricPagedRecords = computed(() => {
  const start = (metricCurrentPage.value - 1) * metricPageSize;
  return metricRecords.value.slice(start, start + metricPageSize);
});
const metricCurrentPageRecordIds = computed(() => metricPagedRecords.value.map((item) => item.id));
const areAllMetricRowsSelected = computed(
  () =>
    metricCurrentPageRecordIds.value.length > 0 &&
    metricCurrentPageRecordIds.value.every((id) => metricSelectedRecordIds.value.includes(id)),
);
const metricBatchSelectionCount = computed(() => metricSelectedRecordIds.value.length);
const activeMetricInputMeta = computed(() => metricInputMetaMap[selectedMetricKey.value] ?? metricInputMetaMap.weight);
const metricRecordDialogTitle = computed(() =>
  metricRecordDialogMode.value === "create" ? `新增${activeMetricLabel.value}记录` : `编辑${activeMetricLabel.value}记录`,
);
const metricRecordDialogSummary = computed(() =>
  metricRecordDialogMode.value === "create"
    ? "补录测量时间和数值后，会立即写入当前成员的健康数据表。"
    : "保存后会覆盖当前记录，并同步刷新当前列表与趋势展示。",
);
const metricDeleteTargetCount = computed(() => metricDeleteTargetIds.value.length);
const metricDeleteDialogTitle = computed(() =>
  metricDeleteMode.value === "batch" ? `批量删除${activeMetricLabel.value}记录` : `删除${activeMetricLabel.value}记录`,
);
const metricDeleteDialogSummary = computed(() =>
  metricDeleteMode.value === "batch"
    ? `确定删除已选择的 ${metricDeleteTargetCount.value} 条${activeMetricLabel.value}记录吗？删除后不可恢复。`
    : `确定删除 ${metricDeleteTargetTime.value} 的${activeMetricLabel.value}记录吗？删除后不可恢复。`,
);
const metricRecordValueLabel = computed(() => activeMetricInputMeta.value.label);
const metricRecordValueUnit = computed(() => activeMetricInputMeta.value.unit ?? "");
const metricRecordValuePlaceholder = computed(() => activeMetricInputMeta.value.placeholder);
const metricRecordValueInputMode = computed(() => activeMetricInputMeta.value.inputMode);

watch(
  metricModules,
  (modules) => {
    if (modules.length === 0) {
      return;
    }

    if (!modules.some((item) => item.key === selectedMetricKey.value)) {
      selectedMetricKey.value = modules[0].key;
    }
  },
  { immediate: true },
);

watch(selectedMetricModule, () => {
  metricBatchMode.value = false;
  metricSelectedRecordIds.value = [];
  closeMetricDeleteDialog();
  metricCurrentPage.value = 1;
  metricJumpPage.value = "1";
});

watch(metricTotalPages, (totalPages) => {
  if (metricCurrentPage.value > totalPages) {
    metricCurrentPage.value = totalPages;
  }
});

watch(metricCurrentPage, (page) => {
  metricJumpPage.value = `${page}`;
});

watch(activeTab, (tab) => {
  if (tab !== "metrics") {
    metricsSettingsOpen.value = false;
    metricBatchMode.value = false;
    metricSelectedRecordIds.value = [];
    metricRecordDialogOpen.value = false;
    closeMetricDeleteDialog();
  }
});

function formatMetricAxisValue(value: number, decimals = 0) {
  return decimals > 0 ? value.toFixed(decimals) : `${Math.round(value)}`;
}

function createMetricChartModel(chart: MemberHealthDashboardChart, width = 1120, height = 256): MetricChartModel {
  const paddingLeft = 34;
  const paddingRight = 30;
  const paddingTop = 12;
  const paddingBottom = 34;
  const innerWidth = width - paddingLeft - paddingRight;
  const innerHeight = height - paddingTop - paddingBottom;
  const values = chart.points.length > 0 ? chart.points.map((item) => item.value) : [chart.min ?? 0, chart.max ?? 1];
  const decimals = chart.decimals ?? 0;
  const minValue = chart.min ?? Math.min(...values);
  const maxValue = chart.max ?? Math.max(...values);
  const normalizedMax = maxValue > minValue ? maxValue : minValue + 1;
  const range = normalizedMax - minValue;
  const points = chart.points.map((item, index) => {
    const x = paddingLeft + (index * innerWidth) / Math.max(chart.points.length - 1, 1);
    const y = paddingTop + (1 - (item.value - minValue) / range) * innerHeight;
    return { x, y, value: item.value, label: item.label };
  });
  const linePath = points.reduce((result, point, index) => {
    if (index === 0) {
      return `M ${point.x} ${point.y}`;
    }

    return `${result} L ${point.x} ${point.y}`;
  }, "");
  const areaPath = points.length
    ? `${linePath} L ${points[points.length - 1].x} ${height - paddingBottom} L ${points[0].x} ${height - paddingBottom} Z`
    : "";

  return {
    width,
    height,
    paddingLeft,
    paddingRight,
    paddingTop,
    paddingBottom,
    yLines: [0, 0.25, 0.5, 0.75, 1].map((ratio) => paddingTop + innerHeight * ratio),
    yLabels: [0, 1, 2, 3, 4].map((index) => formatMetricAxisValue(normalizedMax - (range / 4) * index, decimals)),
    points,
    linePath,
    areaPath,
  };
}

const renderedMetricCharts = computed(() =>
  (selectedMetricModule.value?.charts ?? []).map((chart) => ({
    ...chart,
    graph: createMetricChartModel(chart),
    labelColumns: Math.max(chart.points.length, 1),
  })),
);

function metricChartGradientId(metricKey: MemberHealthDashboardKey, chartIndex: number) {
  return `metric-gradient-${metricKey}-${chartIndex}`;
}

function setActiveMetric(key: MemberHealthDashboardKey) {
  selectedMetricKey.value = key;
  metricsSettingsOpen.value = false;
}

function toggleMetricRecordSelection(recordId: string) {
  if (!metricBatchMode.value) {
    return;
  }

  metricSelectedRecordIds.value = metricSelectedRecordIds.value.includes(recordId)
    ? metricSelectedRecordIds.value.filter((item) => item !== recordId)
    : [...metricSelectedRecordIds.value, recordId];
}

function toggleMetricRecordSelectionByEvent(recordId: string, event: Event) {
  event.preventDefault();
  event.stopPropagation();
  toggleMetricRecordSelection(recordId);
}

function toggleAllMetricRecords() {
  if (!metricBatchMode.value || !metricCurrentPageRecordIds.value.length) {
    return;
  }

  if (areAllMetricRowsSelected.value) {
    metricSelectedRecordIds.value = metricSelectedRecordIds.value.filter((id) => !metricCurrentPageRecordIds.value.includes(id));
    return;
  }

  metricSelectedRecordIds.value = [...new Set([...metricSelectedRecordIds.value, ...metricCurrentPageRecordIds.value])];
}

function toggleAllMetricRecordsByEvent(event: Event) {
  event.preventDefault();
  event.stopPropagation();
  toggleAllMetricRecords();
}

function setMetricPage(page: number) {
  const nextPage = Math.min(Math.max(page, 1), metricTotalPages.value);
  metricCurrentPage.value = nextPage;
}

function jumpToMetricPage() {
  const nextPage = Number(metricJumpPage.value);

  if (!Number.isInteger(nextPage)) {
    metricJumpPage.value = `${metricCurrentPage.value}`;
    return;
  }

  setMetricPage(nextPage);
}

function getBaseMetricModule(key: MemberHealthDashboardKey) {
  return memberDetail.value?.healthMetricModules.find((item) => item.key === key) ?? null;
}

function getMetricAllRecords(key: MemberHealthDashboardKey) {
  const memberId = currentMemberId.value;
  const baseModule = getBaseMetricModule(key);

  if (!memberId || !baseModule) {
    return [];
  }

  return sortMetricRecords(metricRecordOverrides.value[memberId]?.[key] ?? baseModule.records);
}

function persistMetricRecords(key: MemberHealthDashboardKey, records: MemberHealthDashboardRecord[]) {
  const memberId = currentMemberId.value;

  if (!memberId) {
    return;
  }

  metricRecordOverrides.value = {
    ...metricRecordOverrides.value,
    [memberId]: {
      ...(metricRecordOverrides.value[memberId] ?? {}),
      [key]: sortMetricRecords(records),
    },
  };
  writeSessionStorageJson(metricRecordOverridesStorageKey, metricRecordOverrides.value);
}

function persistMetricDateRange(key: MemberHealthDashboardKey, range: MetricDateRange) {
  const memberId = currentMemberId.value;

  if (!memberId) {
    return;
  }

  metricDateRangeOverrides.value = {
    ...metricDateRangeOverrides.value,
    [memberId]: {
      ...(metricDateRangeOverrides.value[memberId] ?? {}),
      [key]: range,
    },
  };
  writeSessionStorageJson(metricDateRangesStorageKey, metricDateRangeOverrides.value);
}

function removeMetricRecords(recordIds: string[]) {
  const module = selectedMetricModule.value;

  if (!module || recordIds.length === 0) {
    return 0;
  }

  const removedIdSet = new Set(recordIds);
  const currentRecords = getMetricAllRecords(module.key);
  const nextRecords = currentRecords.filter((item) => !removedIdSet.has(item.id));
  const removedCount = currentRecords.length - nextRecords.length;

  if (removedCount === 0) {
    return 0;
  }

  persistMetricRecords(module.key, nextRecords);
  metricSelectedRecordIds.value = metricSelectedRecordIds.value.filter((id) => !removedIdSet.has(id));
  return removedCount;
}

function getCurrentMetricSettings() {
  const memberId = currentMemberId.value;
  return cloneMetricAlertSettings(memberId ? metricSettingsOverrides.value[memberId] ?? createDefaultMetricAlertSettings() : createDefaultMetricAlertSettings());
}

function getMetricSettingFieldValue(key: MetricAlertSettingKey) {
  return metricSettingsDraft.value[key];
}

function onMetricSettingInput(key: MetricAlertSettingKey, event: Event) {
  const target = event.target as HTMLInputElement | null;
  metricSettingsDraft.value = {
    ...metricSettingsDraft.value,
    [key]: target?.value ?? "",
  };
}

function openMetricSettings() {
  closeMetricsBatchMode();
  closeMetricDeleteDialog();
  metricSettingsDraft.value = getCurrentMetricSettings();
  metricsSettingsOpen.value = true;
}

function openMetricDatePicker(bound: "start" | "end") {
  if (!selectedMetricModule.value) {
    return;
  }

  closeMetricsBatchMode();
  closeMetricDeleteDialog();
  const input = bound === "start" ? metricStartDateInput.value : metricEndDateInput.value;

  if (!input) {
    return;
  }

  if (typeof input.showPicker === "function") {
    input.showPicker();
    return;
  }

  input.focus();
  input.click();
}

function updateMetricDateRange(bound: "start" | "end", value: string) {
  const module = selectedMetricModule.value;

  if (!module || !value) {
    return;
  }

  let nextStartDate = bound === "start" ? value : module.startDate;
  let nextEndDate = bound === "end" ? value : module.endDate;

  if (nextStartDate > nextEndDate) {
    if (bound === "start") {
      nextEndDate = nextStartDate;
    } else {
      nextStartDate = nextEndDate;
    }
  }

  persistMetricDateRange(module.key, {
    startDate: nextStartDate,
    endDate: nextEndDate,
  });
}

function onMetricStartDateChange(event: Event) {
  const target = event.target as HTMLInputElement | null;
  updateMetricDateRange("start", target?.value ?? "");
}

function onMetricEndDateChange(event: Event) {
  const target = event.target as HTMLInputElement | null;
  updateMetricDateRange("end", target?.value ?? "");
}

function closeMetricSettings() {
  metricsSettingsOpen.value = false;
}

function saveMetricSettings() {
  const memberId = currentMemberId.value;

  if (!memberId) {
    return;
  }

  metricSettingsOverrides.value = {
    ...metricSettingsOverrides.value,
    [memberId]: cloneMetricAlertSettings(metricSettingsDraft.value),
  };
  writeSessionStorageJson(metricSettingsStorageKey, metricSettingsOverrides.value);
  props.showToast("健康数据预警阈值已保存");
}

function normalizeMetricRecordInputValue(metricKey: MemberHealthDashboardKey, value: string) {
  if (metricKey === "oxygen") {
    return value.replace(/%/g, "").trim();
  }

  return value.trim();
}

function buildDefaultMetricRecordForm(module: MemberHealthDashboardModule): MetricRecordForm {
  const latestRecord = getMetricAllRecords(module.key)[0];
  return {
    date: latestRecord?.time.slice(0, 10) ?? module.endDate,
    time: latestRecord?.time.slice(11, 16) ?? "08:00",
    value: "",
  };
}

function openMetricRecordDialog(mode: "create" | "edit", record?: MemberHealthDashboardRecord) {
  const module = selectedMetricModule.value;

  if (!module) {
    return;
  }

  closeMetricsBatchMode();
  closeMetricDeleteDialog();
  metricRecordDialogMode.value = mode;
  editingMetricRecordId.value = record?.id ?? "";
  metricRecordForm.value =
    mode === "edit" && record
      ? {
          date: record.time.slice(0, 10),
          time: record.time.slice(11, 16),
          value: normalizeMetricRecordInputValue(module.key, record.value),
        }
      : buildDefaultMetricRecordForm(module);
  metricRecordDialogOpen.value = true;
}

function closeMetricRecordDialog() {
  metricRecordDialogOpen.value = false;
  editingMetricRecordId.value = "";
}

function createMetricRecord() {
  openMetricRecordDialog("create");
}

function editMetricRecord(record: MemberHealthDashboardRecord) {
  openMetricRecordDialog("edit", record);
}

function normalizeMetricRecordValue(metricKey: MemberHealthDashboardKey, value: string) {
  switch (metricKey) {
    case "bloodPressure": {
      const pressureValue = parseMetricBloodPressure(value.trim());
      return pressureValue ? `${pressureValue[0]}/${pressureValue[1]}` : value.trim();
    }
    case "oxygen": {
      const numericValue = parseMetricNumber(value);
      return numericValue === null ? value.trim() : `${Math.round(numericValue)}%`;
    }
    case "steps":
    case "heartRate": {
      const numericValue = parseMetricNumber(value);
      return numericValue === null ? value.trim() : `${Math.round(numericValue)}`;
    }
    case "weight":
    case "sleep":
    case "bloodSugar": {
      const numericValue = parseMetricNumber(value);
      return numericValue === null ? value.trim() : numericValue.toFixed(1);
    }
    default:
      return value.trim();
  }
}

function isMetricRecordValueValid(metricKey: MemberHealthDashboardKey, value: string) {
  if (metricKey === "bloodPressure") {
    return Boolean(parseMetricBloodPressure(value));
  }

  return parseMetricNumber(value) !== null;
}

function saveMetricRecord() {
  const module = selectedMetricModule.value;
  const memberId = currentMemberId.value;

  if (!module || !memberId) {
    return;
  }

  if (!metricRecordForm.value.date || !metricRecordForm.value.time) {
    props.showToast("请补全测量日期和时间");
    return;
  }

  if (!metricRecordForm.value.value.trim()) {
    props.showToast(`请输入${metricRecordValueLabel.value}`);
    return;
  }

  if (!isMetricRecordValueValid(module.key, metricRecordForm.value.value)) {
    props.showToast(module.key === "bloodPressure" ? "请输入正确的血压格式，例如 128/80" : `请输入正确的${metricRecordValueLabel.value}`);
    return;
  }

  const allRecords = getMetricAllRecords(module.key);
  const existedRecord = allRecords.find((item) => item.id === editingMetricRecordId.value);
  const nextRecord: MemberHealthDashboardRecord = {
    id: existedRecord?.id ?? `${module.key}-${memberId}-${Date.now()}`,
    time: formatMetricDateTime(metricRecordForm.value.date, metricRecordForm.value.time),
    value: normalizeMetricRecordValue(module.key, metricRecordForm.value.value),
    source: existedRecord?.source ?? "手动添加",
    creator: existedRecord?.creator ?? memberDetail.value?.member.realName ?? "管理员",
  };
  const nextRecords =
    metricRecordDialogMode.value === "create"
      ? sortMetricRecords([nextRecord, ...allRecords])
      : sortMetricRecords(allRecords.map((item) => (item.id === editingMetricRecordId.value ? nextRecord : item)));
  persistMetricRecords(module.key, nextRecords);
  metricRecordDialogOpen.value = false;
  editingMetricRecordId.value = "";
  props.showToast(metricRecordDialogMode.value === "create" ? `${activeMetricLabel.value}记录已新增` : `${activeMetricLabel.value}记录已更新`);
}

function openMetricDeleteDialog(record: MemberHealthDashboardRecord) {
  closeMetricsBatchMode();
  metricDeleteMode.value = "single";
  metricDeleteTargetIds.value = [record.id];
  metricDeleteTargetTime.value = record.time;
  metricDeleteDialogOpen.value = true;
}

function openMetricBatchDeleteDialog() {
  if (metricSelectedRecordIds.value.length === 0) {
    props.showToast("请先选择要批量操作的记录");
    return;
  }

  metricDeleteMode.value = "batch";
  metricDeleteTargetIds.value = [...metricSelectedRecordIds.value];
  metricDeleteTargetTime.value = "";
  metricDeleteDialogOpen.value = true;
}

function closeMetricDeleteDialog() {
  metricDeleteDialogOpen.value = false;
  metricDeleteMode.value = "single";
  metricDeleteTargetIds.value = [];
  metricDeleteTargetTime.value = "";
}

function confirmMetricDelete() {
  const removedCount = removeMetricRecords([...metricDeleteTargetIds.value]);

  if (removedCount === 0) {
    closeMetricDeleteDialog();
    props.showToast("未找到可删除的记录");
    return;
  }

  const isBatchDelete = metricDeleteMode.value === "batch";
  closeMetricDeleteDialog();

  if (isBatchDelete) {
    closeMetricsBatchMode();
    props.showToast(`已批量删除 ${removedCount} 条${activeMetricLabel.value}记录`);
    return;
  }

  props.showToast(`${activeMetricLabel.value}记录已删除`);
}

function deleteMetricRecord(record: MemberHealthDashboardRecord) {
  openMetricDeleteDialog(record);
}

function closeMetricsBatchMode() {
  metricBatchMode.value = false;
  metricSelectedRecordIds.value = [];
}

function openMetricsBatchActions() {
  metricBatchMode.value = !metricBatchMode.value;

  if (!metricBatchMode.value) {
    metricSelectedRecordIds.value = [];
    return;
  }
}

function removeSelectedMetricRecords() {
  openMetricBatchDeleteDialog();
}

function readSelectedMemberId() {
  if (typeof window === "undefined") {
    return "";
  }

  return window.sessionStorage.getItem(memberDetailStorageKey) ?? "";
}

function goBack() {
  if (!props.navigation.navigateBack()) {
    props.navigation.reLaunch("elder/member-list");
  }
}

function setActiveTab(tab: MemberDetailTabKey) {
  activeTab.value = tab;
}

function toneClass(tone: MemberDetailTone) {
  return `tone-chip--${tone}`;
}

function editProfile() {
  const nickname = memberDetail.value?.member.nickname ?? "当前用户";
  props.showToast(`已打开 ${nickname} 的档案编辑入口`);
}

function createServiceOrder() {
  const nickname = memberDetail.value?.member.nickname ?? "当前用户";
  props.showToast(`已为 ${nickname} 预留新建服务单入口`);
}

onMounted(() => {
  selectedMemberId.value = readSelectedMemberId();
  document.body.classList.add(pageShellHiddenClass);
});

onBeforeUnmount(() => {
  document.body.classList.remove(pageShellHiddenClass);
});
</script>

<template>
  <section class="member-detail-page">
    <template v-if="memberDetail">
      <div class="detail-back-row">
        <button class="back-btn" type="button" @click="goBack">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M15 6l-6 6 6 6" />
          </svg>
          杩斿洖鍒楄〃
        </button>
      </div>

      <!--
      <section class="detail-toolbar">
        <div class="detail-toolbar__left">
          <button class="back-btn" type="button" @click="goBack">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M15 6l-6 6 6 6" />
            </svg>
            返回列表
          </button>

          <div class="detail-toolbar__heading">
            <span class="detail-toolbar__eyebrow">用户详情</span>
            <h1>{{ memberDetail.member.realName }}</h1>
            <p>{{ memberDetail.member.nickname }} · 档案编号 {{ memberDetail.archiveNo }}</p>
          </div>
        </div>

        <div class="detail-toolbar__actions">
          <button class="action-btn action-btn--ghost" type="button" @click="createServiceOrder">新建服务单</button>
          <button class="action-btn action-btn--primary" type="button" @click="editProfile">编辑档案</button>
        </div>
      </section>

      <section
        class="overview-panel"
        :style="{ '--avatar-shadow': memberDetail.member.avatarShadow, '--avatar-accent': memberDetail.member.avatarAccent }"
      >
        <div class="overview-panel__identity">
          <div class="overview-avatar">{{ memberDetail.member.nickname.slice(0, 1) }}</div>

          <div class="overview-summary">
            <div class="overview-summary__top">
              <div>
                <h2>{{ memberDetail.member.nickname }}</h2>
                <p>{{ memberDetail.gender }} · {{ memberDetail.age }} 岁 · {{ memberDetail.member.phone }}</p>
              </div>
            </div>

            <p class="overview-summary__address">{{ memberDetail.address }}</p>
            <p class="overview-summary__note">{{ memberDetail.note }}</p>

            <div class="overview-summary__tags">
              <span v-for="tag in memberDetail.member.tags" :key="tag.label" class="tag-pill" :class="`tag-pill--${tag.tone}`">
                {{ tag.label }}
              </span>
            </div>
          </div>
        </div>

        <div class="overview-metrics">
          <article v-for="item in memberDetail.summaryMetrics" :key="item.label" class="metric-card metric-card--hero">
            <span>{{ item.label }}</span>
            <div class="metric-card__value">
              <strong>{{ item.value }}</strong>
            </div>
            <small>{{ item.helper }}</small>
          </article>
        </div>
      </section>

      -->
      <nav class="detail-tabbar" aria-label="用户详情分栏">
        <button
          v-for="tab in detailTabs"
          :key="tab.key"
          class="detail-tabbar__item"
          :class="{ 'detail-tabbar__item--active': activeTab === tab.key }"
          type="button"
          @click="setActiveTab(tab.key)"
        >
          {{ tab.label }}
        </button>
      </nav>

      <section class="detail-layout">
        <aside class="detail-sidebar">
          <article class="side-card">
            <header class="card-head">
              <div>
                <h3>档案概览</h3>
              </div>
            </header>

            <dl class="meta-list">
              <div v-for="item in archiveRows" :key="item.label">
                <dt>{{ item.label }}</dt>
                <dd>{{ item.value }}</dd>
              </div>
            </dl>
          </article>

          <article class="side-card">
            <header class="card-head">
              <div>
                <h3>关怀信息</h3>
              </div>
            </header>

            <dl class="meta-list">
              <div v-for="item in careRows" :key="item.label">
                <dt>{{ item.label }}</dt>
                <dd>{{ item.value }}</dd>
              </div>
            </dl>

            <div class="side-card__tags">
              <span v-for="tag in memberDetail.healthTags" :key="tag" class="status-chip status-chip--accent">
                {{ tag }}
              </span>
            </div>
          </article>

          <article class="side-card">
            <header class="card-head">
              <div>
                <h3>操作记录</h3>
                <p>后台侧最近动作轨迹</p>
              </div>
            </header>

            <div class="timeline-list timeline-list--aside">
              <article v-for="item in memberDetail.operationTimeline" :key="`${item.time}-${item.title}`" class="timeline-item">
                <div class="timeline-item__time">
                  <span class="timeline-item__dot" :class="toneClass(item.tone)"></span>
                  <span>{{ item.time }}</span>
                </div>

                <div class="timeline-item__body">
                  <strong>{{ item.title }}</strong>
                  <p>{{ item.description }}</p>
                  <small>{{ item.operator }}</small>
                </div>
              </article>
            </div>
          </article>
        </aside>

        <section class="detail-main">
          <template v-if="activeTab === 'profile'">
            <article class="panel-card panel-card--profile">
              <section class="profile-section">
                <header class="profile-section__head">
                  <h3>基础信息</h3>
                </header>

                <div class="profile-form-grid">
                  <article
                    v-for="field in profileBasicFields"
                    :key="field.label"
                    class="profile-field"
                    :class="{
                      'profile-field--wide': field.wide,
                      'profile-field--multiline': field.multiline,
                      'profile-field--plain': field.plain,
                      'profile-field--avatar': field.avatar,
                    }"
                  >
                    <span class="profile-field__label">{{ field.label }}</span>

                    <div
                      v-if="field.avatar"
                      class="profile-avatar"
                      :style="{
                        '--profile-avatar-shadow': memberDetail.member.avatarShadow,
                        '--profile-avatar-accent': memberDetail.member.avatarAccent,
                      }"
                    >
                      {{ field.value }}
                    </div>
                    <div v-else-if="field.plain" class="profile-field__plain">{{ field.value }}</div>
                    <div v-else class="profile-field__value">{{ field.value }}</div>
                  </article>
                </div>
              </section>

              <section class="profile-section profile-section--secondary">
                <header class="profile-section__head">
                  <h3>其它信息</h3>
                </header>

                <div class="profile-form-grid">
                  <article
                    v-for="field in profileOtherFields"
                    :key="field.label"
                    class="profile-field"
                    :class="{
                      'profile-field--wide': field.wide,
                      'profile-field--multiline': field.multiline,
                      'profile-field--plain': field.plain,
                    }"
                  >
                    <span class="profile-field__label">{{ field.label }}</span>
                    <div v-if="field.plain" class="profile-field__plain">{{ field.value }}</div>
                    <div v-else class="profile-field__value">{{ field.value }}</div>
                  </article>
                </div>
              </section>

              <footer class="profile-actions">
                <button class="action-btn action-btn--primary" type="button" @click="editProfile">编辑</button>
                <button class="action-btn action-btn--ghost" type="button" @click="goBack">返回</button>
              </footer>
            </article>
          </template>

          <template v-else-if="activeTab === 'health'">
            <article class="panel-card panel-card--profile">
              <section class="profile-section">
                <header class="profile-section__head">
                  <h3>身体数据</h3>
                </header>

                <div class="profile-form-grid">
                  <article
                    v-for="field in healthBodyFields"
                    :key="field.label"
                    class="profile-field"
                    :class="{
                      'profile-field--wide': field.wide,
                      'profile-field--multiline': field.multiline,
                    }"
                  >
                    <span class="profile-field__label">{{ field.label }}</span>
                    <div class="profile-field__value">{{ field.value }}</div>
                  </article>
                </div>
              </section>

              <section class="profile-section">
                <header class="profile-section__head">
                  <h3>生活习惯</h3>
                </header>

                <div class="profile-form-grid">
                  <article
                    v-for="field in healthHabitFields"
                    :key="field.label"
                    class="profile-field"
                    :class="{
                      'profile-field--wide': field.wide,
                      'profile-field--multiline': field.multiline,
                    }"
                  >
                    <span class="profile-field__label">{{ field.label }}</span>
                    <div class="profile-field__value">{{ field.value }}</div>
                  </article>
                </div>
              </section>

              <section class="profile-section">
                <header class="profile-section__head">
                  <h3>健康史</h3>
                </header>

                <div class="profile-form-grid">
                  <article
                    v-for="field in healthHistoryFields"
                    :key="field.label"
                    class="profile-field"
                    :class="{
                      'profile-field--wide': field.wide,
                      'profile-field--multiline': field.multiline,
                    }"
                  >
                    <span class="profile-field__label">{{ field.label }}</span>
                    <div class="profile-field__value">{{ field.value }}</div>
                  </article>
                </div>
              </section>

              <footer class="profile-actions">
                <button class="action-btn action-btn--primary" type="button" @click="editProfile">编辑</button>
                <button class="action-btn action-btn--ghost" type="button" @click="goBack">返回</button>
              </footer>
            </article>
          </template>

          <template v-else-if="activeTab === 'medication'">
            <article class="panel-card panel-card--medication">
              <div class="medication-toolbar">
                <label class="medication-search">
                  <input v-model="medicationKeyword" type="text" placeholder="搜索药品名称" />
                </label>

                <button class="medication-icon-btn medication-icon-btn--brand" type="button" aria-label="搜索">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M11 5a6 6 0 1 0 0 12a6 6 0 0 0 0-12Zm8 14l-3.4-3.4" />
                  </svg>
                </button>

                <button class="medication-icon-btn" type="button" aria-label="重置" @click="resetMedicationKeyword">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M8 7H4v4" />
                    <path d="M4 11a8 8 0 1 0 2.3-5.7L4 7" />
                  </svg>
                </button>

                <div class="medication-toolbar__actions">
                  <button class="action-btn action-btn--primary action-btn--toolbar" type="button" @click="createMedicationRecord">
                    新增
                  </button>
                  <button class="action-btn action-btn--ghost action-btn--toolbar" type="button" @click="openMedicationBatchActions">
                    批量操作
                  </button>
                </div>
              </div>

              <div class="medication-table-wrap">
                <table class="medication-table">
                  <colgroup>
                    <col class="medication-table__col medication-table__col--order" />
                    <col class="medication-table__col medication-table__col--period" />
                    <col class="medication-table__col medication-table__col--name" />
                    <col class="medication-table__col medication-table__col--frequency" />
                    <col class="medication-table__col medication-table__col--time" />
                    <col class="medication-table__col medication-table__col--dosage" />
                    <col class="medication-table__col medication-table__col--status" />
                    <col class="medication-table__col medication-table__col--source" />
                    <col class="medication-table__col medication-table__col--creator" />
                  </colgroup>
                  <thead>
                    <tr>
                      <th>序号</th>
                      <th>时段</th>
                      <th>药品名称</th>
                      <th>服用频率</th>
                      <th>提醒时间</th>
                      <th>剂量</th>
                      <th>提醒状态</th>
                      <th>来源渠道</th>
                      <th>创建人</th>
                    </tr>
                  </thead>

                  <tbody>
                    <tr v-for="row in medicationTableRows" :key="row.key">
                      <td>{{ row.order }}</td>
                      <td>{{ row.period }}</td>
                      <td>{{ row.name }}</td>
                      <td>{{ row.frequency }}</td>
                      <td>{{ row.time }}</td>
                      <td>{{ row.dosage }}</td>
                      <td>
                        <button
                          class="medication-switch"
                          :class="{ 'medication-switch--active': row.reminderEnabled }"
                          type="button"
                          :aria-label="row.reminderEnabled ? '开启提醒' : '关闭提醒'"
                          @click="toggleMedicationReminder(row.key)"
                        >
                          <span class="medication-switch__label">{{ row.reminderEnabled ? '开' : '关' }}</span>
                          <span class="medication-switch__dot"></span>
                        </button>
                      </td>
                      <td>{{ row.source }}</td>
                      <td>{{ row.creator }}</td>
                    </tr>

                    <tr v-if="medicationTableRows.length === 0">
                      <td colspan="9" class="medication-table__empty">暂无符合条件的用药记录</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <footer class="medication-actions">
                <button class="action-btn action-btn--ghost" type="button" @click="goBack">返回</button>
              </footer>
            </article>
          </template>

          <template v-else-if="activeTab === 'metrics'">
            <article v-if="selectedMetricModule && metricsSettingsOpen" class="panel-card panel-card--metrics panel-card--metrics-settings">
              <div class="metrics-settings-grid">
                <section v-for="section in metricSettingSections" :key="section.title" class="metrics-settings-card">
                  <div class="metrics-settings-card__head">
                    <h4>{{ section.title }}</h4>
                    <p>{{ section.description }}</p>
                  </div>

                  <div class="metrics-settings-list">
                    <label v-for="field in section.fields" :key="field.key" class="metrics-settings-field">
                      <span class="metrics-settings-field__label">{{ field.label }}</span>
                      <div class="metrics-settings-field__control">
                        <span class="metrics-settings-field__operator">{{ field.operator }}</span>
                        <input :value="getMetricSettingFieldValue(field.key)" type="text" inputmode="decimal" @input="onMetricSettingInput(field.key, $event)" />
                        <span class="metrics-settings-field__unit">{{ field.unit }}</span>
                      </div>
                    </label>
                  </div>
                </section>
              </div>

              <footer class="metrics-actions">
                <button class="action-btn action-btn--ghost" type="button" @click="closeMetricSettings">返回</button>
                <button class="action-btn action-btn--primary" type="button" @click="saveMetricSettings">保存设置</button>
              </footer>
            </article>

            <article v-else-if="selectedMetricModule" class="panel-card panel-card--metrics">
              <div class="metrics-topbar">
                <div class="metrics-tabs" role="tablist" aria-label="健康数据指标切换">
                  <button
                    v-for="item in metricModules"
                    :key="item.key"
                    class="metrics-tab"
                    :class="{ 'metrics-tab--active': item.key === selectedMetricKey }"
                    type="button"
                    @click="setActiveMetric(item.key)"
                  >
                    {{ item.label }}
                  </button>
                </div>

                <button class="metrics-settings-btn" type="button" aria-label="健康数据设置" @click="openMetricSettings">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 3.8l6.6 3.8v8.8L12 20.2 5.4 16.4V7.6L12 3.8Z" />
                    <path d="M12 9a3 3 0 1 1 0 6a3 3 0 0 1 0-6Z" />
                  </svg>
                </button>
              </div>

              <div class="metrics-range-row">
                <div class="metrics-date-range">
                  <div class="metrics-date-field">
                    <span class="metrics-date-field__label">从</span>
                    <button class="metrics-date-chip" type="button" aria-label="选择开始日期" @click="openMetricDatePicker('start')">
                      <span class="metrics-date-chip__main">
                        <svg class="metrics-date-chip__icon" viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M7 2v3M17 2v3M4 8h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z" />
                          <path d="M8 12h8M8 16h5" />
                        </svg>
                        <span class="metrics-date-chip__value">{{ selectedMetricModule.startDate }}</span>
                      </span>
                      <svg class="metrics-date-chip__caret" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M7 10l5 5 5-5" />
                      </svg>
                    </button>
                    <input
                      ref="metricStartDateInput"
                      class="metrics-date-chip__native"
                      type="date"
                      :value="selectedMetricModule.startDate"
                      @change="onMetricStartDateChange"
                    />
                  </div>

                  <div class="metrics-date-field">
                    <span class="metrics-date-field__label">至</span>
                    <button class="metrics-date-chip" type="button" aria-label="选择结束日期" @click="openMetricDatePicker('end')">
                      <span class="metrics-date-chip__main">
                        <svg class="metrics-date-chip__icon" viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M7 2v3M17 2v3M4 8h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z" />
                          <path d="M8 12h8M8 16h5" />
                        </svg>
                        <span class="metrics-date-chip__value">{{ selectedMetricModule.endDate }}</span>
                      </span>
                      <svg class="metrics-date-chip__caret" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M7 10l5 5 5-5" />
                      </svg>
                    </button>
                    <input
                      ref="metricEndDateInput"
                      class="metrics-date-chip__native"
                      type="date"
                      :value="selectedMetricModule.endDate"
                      @change="onMetricEndDateChange"
                    />
                  </div>
                </div>
              </div>

              <div class="metrics-chart-stack">
                <section v-for="(chart, chartIndex) in renderedMetricCharts" :key="`${selectedMetricModule.key}-${chart.title}`" class="metrics-chart-card">
                  <div class="metrics-chart-card__head">
                    <h3>
                      {{ chart.title }}
                      <small v-if="chart.unit">{{ chart.unit }}</small>
                    </h3>
                  </div>

                  <div class="metrics-chart-card__plot">
                    <svg class="metrics-trend-chart" :viewBox="`0 0 ${chart.graph.width} ${chart.graph.height}`" preserveAspectRatio="none">
                      <defs>
                        <linearGradient :id="metricChartGradientId(selectedMetricModule.key, chartIndex)" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" :stop-color="chart.color" stop-opacity="0.36" />
                          <stop offset="100%" :stop-color="chart.color" stop-opacity="0.04" />
                        </linearGradient>
                      </defs>
                      <g class="metrics-chart-grid">
                        <line
                          v-for="(lineY, lineIndex) in chart.graph.yLines"
                          :key="`${chart.title}-grid-${lineIndex}`"
                          :x1="chart.graph.paddingLeft"
                          :y1="lineY"
                          :x2="chart.graph.width - chart.graph.paddingRight"
                          :y2="lineY"
                        />
                      </g>
                      <path :d="chart.graph.areaPath" :fill="`url(#${metricChartGradientId(selectedMetricModule.key, chartIndex)})`" />
                      <path :d="chart.graph.linePath" fill="none" :stroke="chart.color" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
                      <circle
                        v-for="(point, pointIndex) in chart.graph.points"
                        :key="`${chart.title}-point-${pointIndex}`"
                        :cx="point.x"
                        :cy="point.y"
                        r="6"
                        fill="#ffffff"
                        :stroke="chart.color"
                        stroke-width="4"
                      />
                    </svg>

                    <div class="metrics-chart-card__axis">
                      <span v-for="(label, labelIndex) in chart.graph.yLabels" :key="`${chart.title}-axis-${labelIndex}`">{{ label }}</span>
                    </div>
                  </div>

                  <div v-if="chart.points.length > 0" class="metrics-chart-card__labels" :style="{ gridTemplateColumns: `repeat(${chart.labelColumns}, minmax(0, 1fr))` }">
                    <span v-for="point in chart.points" :key="`${chart.title}-${point.label}`">{{ point.label }}</span>
                  </div>
                  <p v-else class="metrics-chart-card__empty">当前日期范围暂无趋势数据</p>
                </section>
              </div>

              <section class="metrics-record-section">
                <div class="metrics-record-section__head">
                  <div>
                    <h3>数据记录</h3>
                  </div>

                  <div class="metrics-record-section__actions">
                    <button class="action-btn action-btn--primary" type="button" @click="createMetricRecord">
                      新增
                    </button>
                    <button class="action-btn action-btn--ghost" type="button" @click="openMetricsBatchActions">
                      {{ metricBatchMode ? "退出批量" : "批量操作" }}
                    </button>
                  </div>
                </div>

                <section v-if="metricBatchMode" class="metrics-batch-bar">
                  <div class="metrics-batch-bar__summary">
                    <strong>已选择 {{ metricBatchSelectionCount }} 条记录</strong>
                  </div>

                  <div class="metrics-batch-bar__actions">
                    <button class="action-btn action-btn--ghost" type="button" @click="toggleAllMetricRecords">
                      {{ areAllMetricRowsSelected ? "取消全选" : "全选当前页" }}
                    </button>
                    <button class="action-btn action-btn--danger" type="button" @click="removeSelectedMetricRecords">
                      批量删除
                    </button>
                    <button class="action-btn action-btn--ghost" type="button" @click="closeMetricsBatchMode">
                      取消
                    </button>
                  </div>
                </section>

                <div class="metrics-table-wrap">
                  <table class="metrics-table">
                    <thead>
                      <tr>
                        <th v-if="metricBatchMode" class="metrics-table__checkbox-cell">
                          <label class="metrics-checkbox" @click="toggleAllMetricRecordsByEvent($event)">
                            <input type="checkbox" :checked="areAllMetricRowsSelected" />
                            <span aria-hidden="true"></span>
                          </label>
                        </th>
                        <th>测量时间</th>
                        <th>{{ selectedMetricModule.valueLabel }}</th>
                        <th>数据源</th>
                        <th>添加人</th>
                        <th>操作</th>
                      </tr>
                    </thead>

                    <tbody>
                      <tr v-for="item in metricPagedRecords" :key="item.id">
                        <td v-if="metricBatchMode" class="metrics-table__checkbox-cell">
                          <label class="metrics-checkbox" @click="toggleMetricRecordSelectionByEvent(item.id, $event)">
                            <input type="checkbox" :checked="metricSelectedRecordIds.includes(item.id)" />
                            <span aria-hidden="true"></span>
                          </label>
                        </td>
                        <td>{{ item.time }}</td>
                        <td>{{ item.value }}</td>
                        <td>{{ item.source }}</td>
                        <td>{{ item.creator }}</td>
                        <td>
                          <div class="metrics-table__actions">
                            <button class="metrics-table__link metrics-table__link--edit" type="button" @click="editMetricRecord(item)">编辑</button>
                            <button class="metrics-table__link metrics-table__link--delete" type="button" @click="deleteMetricRecord(item)">删除</button>
                          </div>
                        </td>
                      </tr>

                      <tr v-if="metricPagedRecords.length === 0">
                        <td :colspan="metricBatchMode ? 6 : 5" class="metrics-table__empty">暂无健康数据记录</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div class="metrics-pagination">
                  <div class="metrics-pagination__meta">
                    <span>共{{ metricRecords.length }}条</span>
                    <button class="metrics-pagination__size" type="button">每页{{ metricPageSize }}条</button>
                  </div>

                  <div class="metrics-pagination__controls">
                    <button class="metrics-pagination__btn" type="button" :disabled="metricCurrentPage === 1" @click="setMetricPage(metricCurrentPage - 1)">
                      &lt;
                    </button>
                    <button
                      v-for="page in buildPaginationPages(metricTotalPages)"
                      :key="`metric-page-${page}`"
                      class="metrics-pagination__btn"
                      :class="{ 'metrics-pagination__btn--active': page === metricCurrentPage }"
                      type="button"
                      @click="setMetricPage(page)"
                    >
                      {{ page }}
                    </button>
                    <button class="metrics-pagination__btn" type="button" :disabled="metricCurrentPage === metricTotalPages" @click="setMetricPage(metricCurrentPage + 1)">
                      &gt;
                    </button>
                  </div>

                  <label class="metrics-pagination__jump">
                    <span>前往第</span>
                    <input
                      v-model="metricJumpPage"
                      type="text"
                      inputmode="numeric"
                      @keydown.enter.prevent="jumpToMetricPage"
                      @blur="jumpToMetricPage"
                    />
                    <span>页</span>
                  </label>
                </div>
              </section>

              <footer class="metrics-actions">
                <button class="action-btn action-btn--ghost" type="button" @click="goBack">返回</button>
              </footer>
            </article>
          </template>

          <template v-else-if="activeTab === 'device'">
            <article class="panel-card panel-card--device">
              <div class="device-toolbar">
                <div class="device-search">
                  <input
                    v-model="deviceKeywordDraft"
                    type="text"
                    placeholder="请输入关键字"
                    @keydown.enter.prevent="searchDevices"
                  />
                </div>

                <button class="medication-icon-btn medication-icon-btn--brand" type="button" aria-label="搜索设备" @click="searchDevices">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M11 5a6 6 0 1 0 0 12a6 6 0 0 0 0-12Zm8 14l-3.4-3.4" />
                  </svg>
                </button>

                <button class="medication-icon-btn" type="button" aria-label="重置设备搜索" @click="resetDeviceKeyword">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M8 7H4v4" />
                    <path d="M4 11a8 8 0 1 0 2.3-5.7L4 7" />
                  </svg>
                </button>
              </div>

              <div class="device-table-wrap">
                <table class="device-table">
                  <colgroup>
                    <col class="device-table__col device-table__col--order" />
                    <col class="device-table__col device-table__col--name" />
                    <col class="device-table__col device-table__col--image" />
                    <col class="device-table__col device-table__col--code" />
                    <col class="device-table__col device-table__col--version" />
                    <col class="device-table__col device-table__col--status" />
                    <col class="device-table__col device-table__col--address" />
                    <col class="device-table__col device-table__col--time" />
                  </colgroup>

                  <thead>
                    <tr>
                      <th class="device-table__cell--center">序号</th>
                      <th>设备名称</th>
                      <th class="device-table__cell--center">图片</th>
                      <th>设备编码</th>
                      <th class="device-table__cell--center">版本</th>
                      <th class="device-table__cell--center device-table__status-cell">状态</th>
                      <th>地址</th>
                      <th class="device-table__cell--center">绑定时间</th>
                    </tr>
                  </thead>

                  <tbody>
                    <tr v-for="item in devicePagedRows" :key="item.key">
                      <td class="device-table__cell--center">{{ item.order }}</td>
                      <td>{{ item.name }}</td>
                      <td class="device-table__image-cell device-table__cell--center">
                        <div class="device-table__image">
                          <span class="device-preview">
                            <span class="device-preview__screen"></span>
                          </span>
                        </div>
                      </td>
                      <td>{{ item.code }}</td>
                      <td class="device-table__cell--center">{{ item.version }}</td>
                      <td class="device-table__cell--center device-table__status-cell">
                        <span class="device-status" :class="deviceStatusClass(item.tone)">{{ item.status }}</span>
                      </td>
                      <td class="device-table__address-cell">{{ item.address }}</td>
                      <td class="device-table__cell--center">{{ item.boundAt }}</td>
                    </tr>

                    <tr v-if="devicePagedRows.length === 0">
                      <td colspan="8" class="device-table__empty">暂无符合条件的设备信息</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div class="metrics-pagination device-pagination">
                <div class="metrics-pagination__meta">
                  <span>共{{ deviceTableRows.length }}条</span>
                  <button class="metrics-pagination__size" type="button">每页{{ devicePageSize }}条</button>
                </div>

                <div class="metrics-pagination__controls">
                  <button class="metrics-pagination__btn" type="button" :disabled="deviceCurrentPage === 1" @click="setDevicePage(deviceCurrentPage - 1)">
                    &lt;
                  </button>
                  <button
                    v-for="page in buildPaginationPages(deviceTotalPages)"
                    :key="`device-page-${page}`"
                    class="metrics-pagination__btn"
                    :class="{ 'metrics-pagination__btn--active': page === deviceCurrentPage }"
                    type="button"
                    @click="setDevicePage(page)"
                  >
                    {{ page }}
                  </button>
                  <button class="metrics-pagination__btn" type="button" :disabled="deviceCurrentPage === deviceTotalPages" @click="setDevicePage(deviceCurrentPage + 1)">
                    &gt;
                  </button>
                </div>

                <label class="metrics-pagination__jump">
                  <span>前往第</span>
                  <input
                    v-model="deviceJumpPage"
                    type="text"
                    inputmode="numeric"
                    @keydown.enter.prevent="jumpToDevicePage"
                    @blur="jumpToDevicePage"
                  />
                  <span>页</span>
                </label>
              </div>

              <footer class="device-actions">
                <button class="action-btn action-btn--ghost" type="button" @click="goBack">返回</button>
              </footer>
            </article>
          </template>

          <template v-else-if="activeTab === 'report'">
            <article class="panel-card panel-card--report">
              <div class="report-toolbar">
                <label class="report-filter">
                  <span>报告类型</span>
                  <div class="report-select">
                    <select v-model="reportTypeDraft">
                      <option value="all">请选择</option>
                      <option v-for="item in reportTypeOptions" :key="item" :value="item">{{ item }}</option>
                    </select>
                  </div>
                </label>

                <label class="report-search">
                  <input
                    v-model="reportKeywordDraft"
                    type="text"
                    placeholder="请输入关键字"
                    @keydown.enter.prevent="searchReports"
                  />
                </label>

                <button class="medication-icon-btn medication-icon-btn--brand" type="button" aria-label="搜索报告" @click="searchReports">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M11 5a6 6 0 1 0 0 12a6 6 0 0 0 0-12Zm8 14l-3.4-3.4" />
                  </svg>
                </button>

                <button class="medication-icon-btn" type="button" aria-label="重置报告筛选" @click="resetReportFilters">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M8 7H4v4" />
                    <path d="M4 11a8 8 0 1 0 2.3-5.7L4 7" />
                  </svg>
                </button>

                <div class="report-toolbar__actions">
                  <button class="action-btn action-btn--primary action-btn--toolbar" type="button" @click="uploadReportRecord">
                    上传
                  </button>
                  <button class="action-btn action-btn--ghost action-btn--toolbar" type="button" @click="openReportBatchActions">
                    {{ reportBatchMode ? "退出批量" : "批量操作" }}
                  </button>
                </div>
              </div>

              <section v-if="reportBatchMode" class="metrics-batch-bar">
                <div class="metrics-batch-bar__summary">
                  <strong>已选择 {{ reportBatchSelectionCount }} 条报告</strong>
                </div>

                <div class="metrics-batch-bar__actions">
                  <button class="action-btn action-btn--ghost" type="button" @click="toggleAllReportRecords">
                    {{ areAllReportRowsSelected ? "取消全选" : "全选当前页" }}
                  </button>
                  <button class="action-btn action-btn--danger" type="button" @click="removeSelectedReports">
                    批量删除
                  </button>
                  <button class="action-btn action-btn--ghost" type="button" @click="closeReportBatchMode">
                    取消
                  </button>
                </div>
              </section>

              <div class="metrics-table-wrap">
                <table class="metrics-table report-table">
                  <colgroup>
                    <col v-if="reportBatchMode" class="report-table__col report-table__col--check" />
                    <col class="report-table__col report-table__col--uploaded-at" />
                    <col class="report-table__col report-table__col--name" />
                    <col class="report-table__col report-table__col--type" />
                    <col class="report-table__col report-table__col--source" />
                    <col class="report-table__col report-table__col--uploader" />
                    <col class="report-table__col report-table__col--order" />
                    <col class="report-table__col report-table__col--date" />
                  </colgroup>
                  <thead>
                    <tr>
                      <th v-if="reportBatchMode" class="metrics-table__checkbox-cell">
                        <label class="metrics-checkbox" @click="toggleAllReportRecordsByEvent($event)">
                          <input type="checkbox" :checked="areAllReportRowsSelected" />
                          <span aria-hidden="true"></span>
                        </label>
                      </th>
                      <th>上传时间</th>
                      <th>报告名称</th>
                      <th>报告类型</th>
                      <th>报告来源</th>
                      <th>上传人</th>
                      <th>关联工单</th>
                      <th>报告日期</th>
                    </tr>
                  </thead>

                  <tbody>
                    <tr v-for="item in reportPagedRecords" :key="item.id">
                      <td v-if="reportBatchMode" class="metrics-table__checkbox-cell">
                        <label class="metrics-checkbox" @click="toggleReportRecordSelectionByEvent(item.id, $event)">
                          <input type="checkbox" :checked="reportSelectedRecordIds.includes(item.id)" />
                          <span aria-hidden="true"></span>
                        </label>
                      </td>
                      <td>{{ item.uploadedAt }}</td>
                      <td class="report-table__name-cell">{{ item.name }}</td>
                      <td>{{ item.type }}</td>
                      <td>{{ item.source }}</td>
                      <td>{{ item.uploader }}</td>
                      <td>{{ item.orderId }}</td>
                      <td>{{ item.reportDate }}</td>
                    </tr>

                    <tr v-if="reportPagedRecords.length === 0">
                      <td :colspan="reportBatchMode ? 8 : 7" class="metrics-table__empty">暂无报告记录</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div class="metrics-pagination">
                <div class="metrics-pagination__meta">
                  <span>共{{ filteredReportRecords.length }}条</span>
                  <button class="metrics-pagination__size" type="button">每页{{ reportPageSize }}条</button>
                </div>

                <div class="metrics-pagination__controls">
                  <button class="metrics-pagination__btn" type="button" :disabled="reportCurrentPage === 1" @click="setReportPage(reportCurrentPage - 1)">
                    &lt;
                  </button>
                  <button
                    v-for="page in buildPaginationPages(reportTotalPages)"
                    :key="`report-page-${page}`"
                    class="metrics-pagination__btn"
                    :class="{ 'metrics-pagination__btn--active': page === reportCurrentPage }"
                    type="button"
                    @click="setReportPage(page)"
                  >
                    {{ page }}
                  </button>
                  <button
                    class="metrics-pagination__btn"
                    type="button"
                    :disabled="reportCurrentPage === reportTotalPages"
                    @click="setReportPage(reportCurrentPage + 1)"
                  >
                    &gt;
                  </button>
                </div>

                <label class="metrics-pagination__jump">
                  <span>前往第</span>
                  <input
                    v-model="reportJumpPage"
                    type="text"
                    inputmode="numeric"
                    @keydown.enter.prevent="jumpToReportPage"
                    @blur="jumpToReportPage"
                  />
                  <span>页</span>
                </label>
              </div>

              <footer class="metrics-actions">
                <button class="action-btn action-btn--ghost" type="button" @click="goBack">返回</button>
              </footer>
            </article>

            <article v-if="false" class="panel-card">
              <header class="card-head">
                <div>
                  <h3>报告信息</h3>
                  <p>评估报告、回访单与复诊建议统一归档</p>
                </div>
              </header>

              <div class="record-list">
                <article v-for="item in ((memberDetail?.reports ?? []) as any[])" :key="`${item.title}-${item.time}`" class="record-card">
                  <div class="record-card__main">
                    <strong>{{ item.title }}</strong>
                    <p>{{ item.detail }}</p>
                  </div>

                  <div class="record-card__meta">
                    <span>{{ item.time }}</span>
                    <span>{{ item.extra }}</span>
                  </div>

                  <span class="tone-chip" :class="toneClass(item.tone)">{{ item.status }}</span>
                </article>
              </div>
            </article>
          </template>

          <template v-else-if="activeTab === 'order'">
            <article class="panel-card panel-card--order">
              <div class="report-toolbar order-toolbar">
                <label class="report-filter">
                  <span>服务类型</span>
                  <div class="report-select">
                    <select v-model="orderServiceTypeDraft">
                      <option value="all">请选择</option>
                      <option v-for="item in orderServiceTypeOptions" :key="item" :value="item">{{ item }}</option>
                    </select>
                  </div>
                </label>

                <label class="report-search">
                  <input
                    v-model="orderKeywordDraft"
                    type="text"
                    placeholder="请输入关键字"
                    @keydown.enter.prevent="searchOrders"
                  />
                </label>

                <button class="medication-icon-btn medication-icon-btn--brand" type="button" aria-label="搜索订单" @click="searchOrders">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M11 5a6 6 0 1 0 0 12a6 6 0 0 0 0-12Zm8 14l-3.4-3.4" />
                  </svg>
                </button>

                <button class="medication-icon-btn" type="button" aria-label="重置订单筛选" @click="resetOrderFilters">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M8 7H4v4" />
                    <path d="M4 11a8 8 0 1 0 2.3-5.7L4 7" />
                  </svg>
                </button>
              </div>

              <div class="order-board-wrap">
                <div class="order-board">
                  <header class="order-board__head">
                    <div>商品信息</div>
                    <div>价格（元）</div>
                    <div>买家</div>
                    <div>订单状态</div>
                    <div>支付方式</div>
                    <div>操作</div>
                  </header>

                  <div class="order-list">
                    <article v-for="item in orderPagedRecords" :key="item.id" class="order-card">
                      <div class="order-card__meta">
                        <span>下单时间：{{ item.orderTime }}</span>
                        <span>订单编号：{{ item.orderNo }}</span>
                        <strong>实付款：¥{{ item.payAmount }}</strong>
                      </div>

                      <div class="order-card__row">
                        <div class="order-cell order-cell--product">
                          <div class="order-product">
                            <div class="order-product__thumb">
                              <img :src="item.image" :alt="item.productName" />
                            </div>
                            <div class="order-product__content">
                              <strong>{{ item.productName }}</strong>
                              <span>{{ item.productSummary }}</span>
                            </div>
                          </div>
                        </div>

                        <div class="order-cell order-cell--price">¥{{ item.price }}</div>

                        <div class="order-cell">
                          <div class="order-buyer">
                            <span class="order-buyer__avatar">{{ item.buyerName.slice(0, 1) }}</span>
                            <div class="order-buyer__content">
                              <strong>{{ item.buyerName }}</strong>
                              <span>{{ item.buyerPhone }}</span>
                            </div>
                          </div>
                        </div>

                        <div class="order-cell">
                          <span class="order-status" :class="orderStatusClass(item.tone)">{{ item.orderStatus }}</span>
                        </div>

                        <div class="order-cell">{{ item.paymentMethod }}</div>

                        <div class="order-cell order-cell--actions">
                          <button class="order-link" type="button" @click="viewOrderDetail(item)">订单详情</button>
                          <div class="order-link-row">
                            <button class="order-link" type="button" @click="contactOrderUser(item)">联系用户</button>
                            <button class="order-link" type="button" @click="remarkOrder(item)">备注</button>
                          </div>
                        </div>
                      </div>
                    </article>

                    <div v-if="orderPagedRecords.length === 0" class="order-empty">暂无订单记录</div>
                  </div>
                </div>
              </div>

              <div class="metrics-pagination">
                <div class="metrics-pagination__meta">
                  <span>共{{ filteredOrderRecords.length }}条</span>
                  <button class="metrics-pagination__size" type="button">每页{{ orderPageSize }}条</button>
                </div>

                <div class="metrics-pagination__controls">
                  <button class="metrics-pagination__btn" type="button" :disabled="orderCurrentPage === 1" @click="setOrderPage(orderCurrentPage - 1)">
                    &lt;
                  </button>
                  <button
                    v-for="page in buildPaginationPages(orderTotalPages)"
                    :key="`order-page-${page}`"
                    class="metrics-pagination__btn"
                    :class="{ 'metrics-pagination__btn--active': page === orderCurrentPage }"
                    type="button"
                    @click="setOrderPage(page)"
                  >
                    {{ page }}
                  </button>
                  <button class="metrics-pagination__btn" type="button" :disabled="orderCurrentPage === orderTotalPages" @click="setOrderPage(orderCurrentPage + 1)">
                    &gt;
                  </button>
                </div>

                <label class="metrics-pagination__jump">
                  <span>前往第</span>
                  <input
                    v-model="orderJumpPage"
                    type="text"
                    inputmode="numeric"
                    @keydown.enter.prevent="jumpToOrderPage"
                    @blur="jumpToOrderPage"
                  />
                  <span>页</span>
                </label>
              </div>

              <footer class="metrics-actions">
                <button class="action-btn action-btn--ghost" type="button" @click="goBack">返回</button>
              </footer>
            </article>

            <article v-if="false" class="panel-card">
              <header class="card-head">
                <div>
                  <h3>订单信息</h3>
                  <p>围绕服务包、增购项目与执行状态进行管理</p>
                </div>
              </header>

              <div class="record-list">
                <article v-for="item in ((memberDetail?.orders ?? []) as any[])" :key="`${item.title}-${item.time}`" class="record-card">
                  <div class="record-card__main">
                    <strong>{{ item.title }}</strong>
                    <p>{{ item.detail }}</p>
                  </div>

                  <div class="record-card__meta">
                    <span>{{ item.time }}</span>
                    <span>{{ item.extra }}</span>
                  </div>

                  <span class="tone-chip" :class="toneClass(item.tone)">{{ item.status }}</span>
                </article>
              </div>
            </article>
          </template>

          <template v-else-if="activeTab === 'asset'">
            <article class="panel-card panel-card--asset">
              <nav class="asset-tabs" aria-label="资产类型切换">
                <button
                  v-for="item in assetPanelTabs"
                  :key="item.key"
                  class="asset-tabs__item"
                  :class="{ 'asset-tabs__item--active': activeAssetPanel === item.key }"
                  type="button"
                  @click="setActiveAssetPanel(item.key)"
                >
                  {{ item.label }}
                </button>
              </nav>

              <div class="report-toolbar asset-toolbar">
                <label class="report-filter">
                  <span>{{ assetFilterLabel }}</span>
                  <div class="report-select">
                    <select v-model="assetFilterDraft">
                      <option value="all">请选择</option>
                      <option v-for="item in assetFilterOptions" :key="item" :value="item">{{ item }}</option>
                    </select>
                  </div>
                </label>

                <label class="report-search">
                  <input
                    v-model="assetKeywordDraft"
                    type="text"
                    placeholder="请输入关键词"
                    @keydown.enter.prevent="searchAssets"
                  />
                </label>

                <button class="medication-icon-btn medication-icon-btn--brand" type="button" aria-label="搜索资产" @click="searchAssets">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M11 5a6 6 0 1 0 0 12a6 6 0 0 0 0-12Zm8 14l-3.4-3.4" />
                  </svg>
                </button>

                <button class="medication-icon-btn" type="button" aria-label="重置资产筛选" @click="resetAssetFilters">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M8 7H4v4" />
                    <path d="M4 11a8 8 0 1 0 2.3-5.7L4 7" />
                  </svg>
                </button>

                <div v-if="assetActionButtonLabel" class="report-toolbar__actions">
                  <button class="action-btn action-btn--primary action-btn--toolbar" type="button" @click="giftAssetBalance">
                    {{ assetActionButtonLabel }}
                  </button>
                </div>
              </div>

              <div class="metrics-table-wrap asset-table-wrap">
                <table v-if="activeAssetPanel === 'coupon'" class="metrics-table asset-table asset-table--coupon">
                  <colgroup>
                    <col class="asset-table__col asset-table__col--coupon-name" />
                    <col class="asset-table__col asset-table__col--coupon-status" />
                    <col class="asset-table__col asset-table__col--coupon-content" />
                    <col class="asset-table__col asset-table__col--coupon-scope" />
                    <col class="asset-table__col asset-table__col--coupon-time" />
                    <col class="asset-table__col asset-table__col--coupon-time" />
                  </colgroup>
                  <thead>
                    <tr>
                      <th>优惠券名称</th>
                      <th>状态</th>
                      <th>内容</th>
                      <th>适用范围</th>
                      <th>领取时间</th>
                      <th>到期时间</th>
                    </tr>
                  </thead>

                  <tbody>
                    <tr v-for="item in assetPagedCoupons" :key="item.id">
                      <td class="asset-table__name-cell">{{ item.name }}</td>
                      <td>
                        <span class="asset-status" :class="assetStatusClass(item.tone)">{{ item.status }}</span>
                      </td>
                      <td class="asset-table__content-cell">
                        <strong>{{ item.amount }}</strong>
                        <span>{{ item.condition }}</span>
                      </td>
                      <td>{{ item.scope }}</td>
                      <td>{{ item.receivedAt }}</td>
                      <td>{{ item.expiresAt }}</td>
                    </tr>

                    <tr v-if="assetPagedCoupons.length === 0">
                      <td colspan="6" class="metrics-table__empty">暂无优惠券记录</td>
                    </tr>
                  </tbody>
                </table>

                <table v-else-if="activeAssetPanel === 'points'" class="metrics-table asset-table asset-table--flow">
                  <colgroup>
                    <col class="asset-table__col asset-table__col--flow-type" />
                    <col class="asset-table__col asset-table__col--flow-amount" />
                    <col class="asset-table__col asset-table__col--flow-reason" />
                    <col class="asset-table__col asset-table__col--flow-remark" />
                    <col class="asset-table__col asset-table__col--flow-operator" />
                    <col class="asset-table__col asset-table__col--flow-time" />
                  </colgroup>
                  <thead>
                    <tr>
                      <th>类型</th>
                      <th>积分数量</th>
                      <th>操作原因</th>
                      <th>备注</th>
                      <th>操作人</th>
                      <th>积分时间</th>
                    </tr>
                  </thead>

                  <tbody>
                    <tr v-for="item in assetPagedPoints" :key="item.id">
                      <td>
                        <span class="asset-status" :class="assetStatusClass(item.tone)">{{ item.type }}</span>
                      </td>
                      <td>
                        <span class="asset-amount" :class="assetAmountClass(item.tone)">{{ item.amount }}</span>
                      </td>
                      <td>{{ item.reason }}</td>
                      <td class="asset-table__remark-cell">{{ item.remark }}</td>
                      <td>{{ item.operator }}</td>
                      <td>{{ item.time }}</td>
                    </tr>

                    <tr v-if="assetPagedPoints.length === 0">
                      <td colspan="6" class="metrics-table__empty">暂无积分记录</td>
                    </tr>
                  </tbody>
                </table>

                <table v-else class="metrics-table asset-table asset-table--flow">
                  <colgroup>
                    <col class="asset-table__col asset-table__col--flow-type" />
                    <col class="asset-table__col asset-table__col--flow-amount" />
                    <col class="asset-table__col asset-table__col--flow-reason" />
                    <col class="asset-table__col asset-table__col--flow-remark" />
                    <col class="asset-table__col asset-table__col--flow-operator" />
                    <col class="asset-table__col asset-table__col--flow-time" />
                  </colgroup>
                  <thead>
                    <tr>
                      <th>类型</th>
                      <th>成长值数量</th>
                      <th>操作原因</th>
                      <th>备注</th>
                      <th>操作人</th>
                      <th>操作时间</th>
                    </tr>
                  </thead>

                  <tbody>
                    <tr v-for="item in assetPagedGrowthRecords" :key="item.id">
                      <td>
                        <span class="asset-status" :class="assetStatusClass(item.tone)">{{ item.type }}</span>
                      </td>
                      <td>
                        <span class="asset-amount" :class="assetAmountClass(item.tone)">{{ item.amount }}</span>
                      </td>
                      <td>{{ item.reason }}</td>
                      <td class="asset-table__remark-cell">{{ item.remark }}</td>
                      <td>{{ item.operator }}</td>
                      <td>{{ item.time }}</td>
                    </tr>

                    <tr v-if="assetPagedGrowthRecords.length === 0">
                      <td colspan="6" class="metrics-table__empty">暂无成长值记录</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div class="metrics-pagination">
                <div class="metrics-pagination__meta">
                  <span>共{{ activeAssetRecordCount }}条</span>
                  <button class="metrics-pagination__size" type="button">每页{{ assetPageSize }}条</button>
                </div>

                <div class="metrics-pagination__controls">
                  <button class="metrics-pagination__btn" type="button" :disabled="assetCurrentPage === 1" @click="setAssetPage(assetCurrentPage - 1)">
                    &lt;
                  </button>
                  <button
                    v-for="page in buildPaginationPages(assetTotalPages)"
                    :key="`asset-page-${page}`"
                    class="metrics-pagination__btn"
                    :class="{ 'metrics-pagination__btn--active': page === assetCurrentPage }"
                    type="button"
                    @click="setAssetPage(page)"
                  >
                    {{ page }}
                  </button>
                  <button class="metrics-pagination__btn" type="button" :disabled="assetCurrentPage === assetTotalPages" @click="setAssetPage(assetCurrentPage + 1)">
                    &gt;
                  </button>
                </div>

                <label class="metrics-pagination__jump">
                  <span>前往第</span>
                  <input
                    v-model="assetJumpPage"
                    type="text"
                    inputmode="numeric"
                    @keydown.enter.prevent="jumpToAssetPage"
                    @blur="jumpToAssetPage"
                  />
                  <span>页</span>
                </label>
              </div>

              <footer class="metrics-actions">
                <button class="action-btn action-btn--ghost" type="button" @click="goBack">返回</button>
              </footer>
            </article>
          </template>

          <template v-else-if="activeTab === 'content'">
            <article class="panel-card panel-card--content">
              <div class="report-toolbar content-toolbar">
                <label class="report-search">
                  <input
                    v-model="contentKeywordDraft"
                    type="text"
                    placeholder="请输入关键词"
                    @keydown.enter.prevent="searchContents"
                  />
                </label>

                <button class="medication-icon-btn medication-icon-btn--brand" type="button" aria-label="搜索内容" @click="searchContents">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M11 5a6 6 0 1 0 0 12a6 6 0 0 0 0-12Zm8 14l-3.4-3.4" />
                  </svg>
                </button>

                <button class="medication-icon-btn" type="button" aria-label="重置内容筛选" @click="resetContentFilters">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M8 7H4v4" />
                    <path d="M4 11a8 8 0 1 0 2.3-5.7L4 7" />
                  </svg>
                </button>

                <div class="report-toolbar__actions">
                  <button class="action-btn action-btn--ghost action-btn--toolbar" type="button" @click="openContentBatchActions">
                    {{ contentBatchMode ? "退出批量" : "批量操作" }}
                  </button>
                </div>
              </div>

              <section v-if="contentBatchMode" class="metrics-batch-bar">
                <div class="metrics-batch-bar__summary">
                  <strong>已选择 {{ contentBatchSelectionCount }} 条帖子</strong>
                </div>

                <div class="metrics-batch-bar__actions">
                  <button class="action-btn action-btn--ghost" type="button" @click="toggleAllContentRecords">
                    {{ areAllContentRowsSelected ? "取消全选" : "全选当前页" }}
                  </button>
                  <button class="action-btn action-btn--danger" type="button" @click="removeSelectedContents">
                    批量删除
                  </button>
                  <button class="action-btn action-btn--ghost" type="button" @click="closeContentBatchMode">
                    取消
                  </button>
                </div>
              </section>

              <div class="metrics-table-wrap">
                <table class="metrics-table content-table">
                  <colgroup>
                    <col v-if="contentBatchMode" class="content-table__col content-table__col--check" />
                    <col class="content-table__col content-table__col--content" />
                    <col class="content-table__col content-table__col--topic" />
                    <col class="content-table__col content-table__col--metric" />
                    <col class="content-table__col content-table__col--metric" />
                    <col class="content-table__col content-table__col--metric" />
                    <col class="content-table__col content-table__col--metric" />
                    <col class="content-table__col content-table__col--time" />
                    <col class="content-table__col content-table__col--status" />
                    <col class="content-table__col content-table__col--action" />
                  </colgroup>
                  <thead>
                    <tr>
                      <th v-if="contentBatchMode" class="metrics-table__checkbox-cell">
                        <label class="metrics-checkbox" @click="toggleAllContentRecordsByEvent($event)">
                          <input type="checkbox" :checked="areAllContentRowsSelected" />
                          <span aria-hidden="true"></span>
                        </label>
                      </th>
                      <th>内容</th>
                      <th>话题</th>
                      <th>点赞</th>
                      <th>收藏</th>
                      <th>分享</th>
                      <th>评论</th>
                      <th>发布时间</th>
                      <th>状态</th>
                      <th>操作</th>
                    </tr>
                  </thead>

                  <tbody>
                    <tr v-for="item in contentPagedRecords" :key="item.id">
                      <td v-if="contentBatchMode" class="metrics-table__checkbox-cell">
                        <label class="metrics-checkbox" @click="toggleContentRecordSelectionByEvent(item.id, $event)">
                          <input type="checkbox" :checked="contentSelectedRecordIds.includes(item.id)" />
                          <span aria-hidden="true"></span>
                        </label>
                      </td>
                      <td class="content-table__content-cell">
                        <div class="content-preview">
                          <img :src="item.image" :alt="item.content" />
                          <p>{{ item.content }}</p>
                        </div>
                      </td>
                      <td>{{ item.topic }}</td>
                      <td>{{ item.likes }}</td>
                      <td>{{ item.favorites }}</td>
                      <td>{{ item.shares }}</td>
                      <td class="content-table__metric--accent">{{ item.comments }}</td>
                      <td>{{ item.publishedAt }}</td>
                      <td>
                        <button
                          class="content-visibility"
                          :class="{ 'content-visibility--hidden': !item.visible }"
                          type="button"
                          :aria-label="item.visible ? '显示帖子' : '隐藏帖子'"
                          @click="toggleContentVisibility(item)"
                        >
                          <span class="content-visibility__label">{{ item.visible ? "显" : "隐" }}</span>
                          <span class="content-visibility__dot" aria-hidden="true"></span>
                        </button>
                      </td>
                      <td>
                        <button class="content-action content-action--delete" type="button" @click="deleteContentRecord(item)">删除</button>
                      </td>
                    </tr>

                    <tr v-if="contentPagedRecords.length === 0">
                      <td :colspan="contentBatchMode ? 10 : 9" class="metrics-table__empty">暂无帖子记录</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div class="metrics-pagination">
                <div class="metrics-pagination__meta">
                  <span>共{{ filteredContentRecords.length }}条</span>
                  <button class="metrics-pagination__size" type="button">每页{{ contentPageSize }}条</button>
                </div>

                <div class="metrics-pagination__controls">
                  <button class="metrics-pagination__btn" type="button" :disabled="contentCurrentPage === 1" @click="setContentPage(contentCurrentPage - 1)">
                    &lt;
                  </button>
                  <button
                    v-for="page in buildPaginationPages(contentTotalPages)"
                    :key="`content-page-${page}`"
                    class="metrics-pagination__btn"
                    :class="{ 'metrics-pagination__btn--active': page === contentCurrentPage }"
                    type="button"
                    @click="setContentPage(page)"
                  >
                    {{ page }}
                  </button>
                  <button class="metrics-pagination__btn" type="button" :disabled="contentCurrentPage === contentTotalPages" @click="setContentPage(contentCurrentPage + 1)">
                    &gt;
                  </button>
                </div>

                <label class="metrics-pagination__jump">
                  <span>前往第</span>
                  <input
                    v-model="contentJumpPage"
                    type="text"
                    inputmode="numeric"
                    @keydown.enter.prevent="jumpToContentPage"
                    @blur="jumpToContentPage"
                  />
                  <span>页</span>
                </label>
              </div>

              <footer class="metrics-actions">
                <button class="action-btn action-btn--ghost" type="button" @click="goBack">返回</button>
              </footer>
            </article>
          </template>

          <template v-else-if="activeTab === 'service'">
            <article class="panel-card panel-card--service">
              <div class="report-toolbar service-toolbar">
                <label class="report-filter">
                  <span>服务类型</span>
                  <div class="report-select">
                    <select v-model="serviceTypeDraft">
                      <option value="all">请选择</option>
                      <option v-for="item in serviceTypeOptions" :key="item" :value="item">{{ item }}</option>
                    </select>
                  </div>
                </label>

                <label class="report-search">
                  <input
                    v-model="serviceKeywordDraft"
                    type="text"
                    placeholder="请输入关键字"
                    @keydown.enter.prevent="searchServices"
                  />
                </label>

                <button class="medication-icon-btn medication-icon-btn--brand" type="button" aria-label="搜索服务记录" @click="searchServices">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M11 5a6 6 0 1 0 0 12a6 6 0 0 0 0-12Zm8 14l-3.4-3.4" />
                  </svg>
                </button>

                <button class="medication-icon-btn" type="button" aria-label="重置服务记录筛选" @click="resetServiceFilters">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M8 7H4v4" />
                    <path d="M4 11a8 8 0 1 0 2.3-5.7L4 7" />
                  </svg>
                </button>

                <div class="report-toolbar__actions">
                  <button class="action-btn action-btn--ghost action-btn--toolbar" type="button" @click="openServiceBatchActions">
                    {{ serviceBatchMode ? "退出批量" : "批量操作" }}
                  </button>
                </div>
              </div>

              <section v-if="serviceBatchMode" class="metrics-batch-bar">
                <div class="metrics-batch-bar__summary">
                  <strong>已选择 {{ serviceBatchSelectionCount }} 条服务记录</strong>
                </div>

                <div class="metrics-batch-bar__actions">
                  <button class="action-btn action-btn--ghost" type="button" @click="toggleAllServiceRecords">
                    {{ areAllServiceRowsSelected ? "取消全选" : "全选当前页" }}
                  </button>
                  <button class="action-btn action-btn--primary" type="button" @click="remarkSelectedServiceRecords">
                    批量备注
                  </button>
                  <button class="action-btn action-btn--ghost" type="button" @click="closeServiceBatchMode">
                    取消
                  </button>
                </div>
              </section>

              <div class="metrics-table-wrap service-table-wrap">
                <table class="metrics-table service-table">
                  <colgroup>
                    <col v-if="serviceBatchMode" class="service-table__col service-table__col--check" />
                    <col class="service-table__col service-table__col--order-no" />
                    <col class="service-table__col service-table__col--order-info" />
                    <col class="service-table__col service-table__col--service-item" />
                    <col class="service-table__col service-table__col--status" />
                    <col class="service-table__col service-table__col--amount" />
                    <col class="service-table__col service-table__col--staff" />
                    <col class="service-table__col service-table__col--time" />
                    <col class="service-table__col service-table__col--action" />
                  </colgroup>
                  <thead>
                    <tr>
                      <th v-if="serviceBatchMode" class="metrics-table__checkbox-cell">
                        <label class="metrics-checkbox" @click="toggleAllServiceRecordsByEvent($event)">
                          <input type="checkbox" :checked="areAllServiceRowsSelected" />
                          <span aria-hidden="true"></span>
                        </label>
                      </th>
                      <th>工单编号</th>
                      <th>订单信息</th>
                      <th>服务项目</th>
                      <th>状态</th>
                      <th>实付款（元）</th>
                      <th>服务人员</th>
                      <th>服务时间</th>
                      <th>操作</th>
                    </tr>
                  </thead>

                  <tbody>
                    <tr v-for="item in servicePagedRecords" :key="item.id">
                      <td v-if="serviceBatchMode" class="metrics-table__checkbox-cell">
                        <label class="metrics-checkbox" @click="toggleServiceRecordSelectionByEvent(item.id, $event)">
                          <input type="checkbox" :checked="serviceSelectedRecordIds.includes(item.id)" />
                          <span aria-hidden="true"></span>
                        </label>
                      </td>
                      <td class="service-table__order-no-cell">{{ item.orderNo }}</td>
                      <td class="service-table__order-cell">
                        <div class="service-record-order">
                          <div class="service-record-order__thumb">
                            <img :src="item.image" :alt="item.orderName" />
                          </div>
                          <div class="service-record-order__content">
                            <strong>{{ item.orderName }}</strong>
                            <span>￥{{ item.price }}</span>
                          </div>
                        </div>
                      </td>
                      <td class="service-table__service-item-cell">{{ item.serviceItem }}</td>
                      <td class="service-table__status-cell">
                        <span class="service-status" :class="serviceStatusClass(item.tone)">{{ item.status }}</span>
                      </td>
                      <td class="service-record__amount">{{ item.payAmount }}</td>
                      <td class="service-table__staff-cell">{{ item.staff }}</td>
                      <td class="service-table__time-cell">{{ item.serviceTime }}</td>
                      <td class="service-table__action-cell">
                        <div class="service-record__actions">
                          <button class="service-record__action" type="button" @click="viewServiceOrderDetail(item)">订单详情</button>
                          <button class="service-record__action" type="button" @click="remarkServiceRecord(item)">备注</button>
                        </div>
                      </td>
                    </tr>

                    <tr v-if="servicePagedRecords.length === 0">
                      <td :colspan="serviceBatchMode ? 9 : 8" class="metrics-table__empty">暂无服务记录</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div class="metrics-pagination">
                <div class="metrics-pagination__meta">
                  <span>共{{ filteredServiceRecords.length }}条</span>
                  <button class="metrics-pagination__size" type="button">每页{{ servicePageSize }}条</button>
                </div>

                <div class="metrics-pagination__controls">
                  <button class="metrics-pagination__btn" type="button" :disabled="serviceCurrentPage === 1" @click="setServicePage(serviceCurrentPage - 1)">
                    &lt;
                  </button>
                  <button
                    v-for="page in buildPaginationPages(serviceTotalPages)"
                    :key="`service-page-${page}`"
                    class="metrics-pagination__btn"
                    :class="{ 'metrics-pagination__btn--active': page === serviceCurrentPage }"
                    type="button"
                    @click="setServicePage(page)"
                  >
                    {{ page }}
                  </button>
                  <button class="metrics-pagination__btn" type="button" :disabled="serviceCurrentPage === serviceTotalPages" @click="setServicePage(serviceCurrentPage + 1)">
                    &gt;
                  </button>
                </div>

                <label class="metrics-pagination__jump">
                  <span>前往第</span>
                  <input
                    v-model="serviceJumpPage"
                    type="text"
                    inputmode="numeric"
                    @keydown.enter.prevent="jumpToServicePage"
                    @blur="jumpToServicePage"
                  />
                  <span>页</span>
                </label>
              </div>

              <footer class="metrics-actions">
                <button class="action-btn action-btn--ghost" type="button" @click="goBack">返回</button>
              </footer>
            </article>
          </template>
        </section>
      </section>

      <section
        v-if="serviceDetailDialogOpen && activeServiceDetailRecord && memberDetail"
        class="dialog-mask"
        @click.self="closeServiceOrderDetailDialog"
      >
        <article class="dialog-panel dialog-panel--service-detail">
          <header class="dialog-panel__header">
            <div>
              <h3>订单详情</h3>
              <p class="dialog-panel__summary">工单编号：{{ activeServiceDetailRecord.orderNo }}</p>
            </div>

            <button class="dialog-panel__close" type="button" aria-label="关闭订单详情弹窗" @click="closeServiceOrderDetailDialog">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 6l12 12M18 6l-12 12" />
              </svg>
            </button>
          </header>

          <section class="service-dialog-card service-dialog-card--product">
            <div class="service-dialog-status">
              <span class="service-status" :class="serviceStatusClass(activeServiceDetailRecord.tone)">{{ activeServiceDetailRecord.status }}</span>
              <strong>{{ activeServiceDetailRecord.serviceType }}</strong>
            </div>

            <div class="service-dialog-product">
              <div class="service-dialog-product__thumb">
                <img :src="activeServiceDetailRecord.image" :alt="activeServiceDetailRecord.orderName" />
              </div>

              <div class="service-dialog-product__content">
                <h4>{{ activeServiceDetailRecord.orderName }}</h4>
                <p>{{ activeServiceDetailRecord.productSummary }}</p>
                <span>{{ activeServiceDetailRecord.serviceItem }}</span>
              </div>
            </div>

            <div class="service-dialog-price">
              <div class="service-dialog-price__row">
                <span>商品总价</span>
                <strong>￥{{ activeServiceDetailRecord.price }}</strong>
              </div>
              <div class="service-dialog-price__row">
                <span>优惠券</span>
                <strong class="service-dialog-price__discount">-￥{{ activeServiceDetailRecord.couponAmount }}</strong>
              </div>
              <div class="service-dialog-price__row service-dialog-price__row--highlight">
                <span>实付款</span>
                <strong>￥{{ activeServiceDetailRecord.payAmount }}</strong>
              </div>
            </div>
          </section>

          <section class="service-dialog-card">
            <h4 class="service-dialog-card__title">预约信息</h4>
            <dl class="meta-list service-dialog-meta">
              <div>
                <dt>服务地址</dt>
                <dd>{{ memberDetail.address }}</dd>
              </div>
              <div>
                <dt>预约时间</dt>
                <dd>{{ activeServiceDetailRecord.serviceTime }}</dd>
              </div>
              <div>
                <dt>联系人</dt>
                <dd>{{ memberDetail.member.realName }}</dd>
              </div>
              <div>
                <dt>联系电话</dt>
                <dd>{{ memberDetail.member.phone }}</dd>
              </div>
              <div>
                <dt>服务人员</dt>
                <dd>{{ activeServiceDetailRecord.staff }}</dd>
              </div>
            </dl>
          </section>

          <section class="service-dialog-card">
            <h4 class="service-dialog-card__title">订单信息</h4>
            <dl class="meta-list service-dialog-meta">
              <div>
                <dt>工单编号</dt>
                <dd>{{ activeServiceDetailRecord.orderNo }}</dd>
              </div>
              <div>
                <dt>服务项目</dt>
                <dd>{{ activeServiceDetailRecord.serviceItem }}</dd>
              </div>
              <div>
                <dt>创建时间</dt>
                <dd>{{ activeServiceDetailRecord.createdAt }}</dd>
              </div>
              <div>
                <dt>支付时间</dt>
                <dd>{{ activeServiceDetailRecord.paidAt }}</dd>
              </div>
              <div>
                <dt>服务码</dt>
                <dd>{{ activeServiceDetailRecord.serviceCode }}</dd>
              </div>
              <div>
                <dt>当前备注</dt>
                <dd>{{ activeServiceDetailRecord.remark }}</dd>
              </div>
            </dl>

            <p class="service-dialog__hint">{{ activeServiceDetailRecord.serviceCodeHint }}</p>
          </section>

          <footer class="dialog-panel__footer">
            <button class="action-btn action-btn--primary" type="button" @click="closeServiceOrderDetailDialog">关闭</button>
          </footer>
        </article>
      </section>

      <section v-if="serviceRemarkDialogOpen" class="dialog-mask" @click.self="closeServiceRemarkDialog">
        <article class="dialog-panel dialog-panel--service-remark">
          <header class="dialog-panel__header">
            <div>
              <h3>{{ serviceRemarkDialogTitle }}</h3>
              <p class="dialog-panel__summary">{{ serviceRemarkDialogSummary }}</p>
            </div>

            <button class="dialog-panel__close" type="button" aria-label="关闭备注弹窗" @click="closeServiceRemarkDialog">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 6l12 12M18 6l-12 12" />
              </svg>
            </button>
          </header>

          <div class="dialog-grid">
            <label class="dialog-field dialog-field--wide">
              <span>备注内容 *</span>
              <textarea
                v-model="serviceRemarkDraft"
                rows="5"
                maxlength="200"
                placeholder="请输入备注内容，例如服务注意事项、家属沟通结果、上门情况等"
              ></textarea>
            </label>
            <p class="service-remark-count">{{ serviceRemarkDraft.trim().length }}/200</p>
          </div>

          <footer class="dialog-panel__footer">
            <button class="action-btn action-btn--ghost" type="button" @click="closeServiceRemarkDialog">取消</button>
            <button class="action-btn action-btn--primary" type="button" @click="saveServiceRemark">保存</button>
          </footer>
        </article>
      </section>

      <section v-if="metricRecordDialogOpen" class="dialog-mask" @click.self="closeMetricRecordDialog">
        <article class="dialog-panel dialog-panel--metric">
          <header class="dialog-panel__header">
            <div>
              <h3>{{ metricRecordDialogTitle }}</h3>
            </div>

            <button class="dialog-panel__close" type="button" aria-label="关闭健康数据弹层" @click="closeMetricRecordDialog">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 6l12 12M18 6l-12 12" />
              </svg>
            </button>
          </header>

          <div class="dialog-grid dialog-grid--metric">
            <label class="dialog-field">
              <span>测量日期 *</span>
              <input v-model="metricRecordForm.date" type="date" />
            </label>

            <label class="dialog-field">
              <span>测量时间 *</span>
              <input v-model="metricRecordForm.time" type="time" />
            </label>

            <label class="dialog-field dialog-field--wide">
              <span>{{ metricRecordValueLabel }} *</span>
              <div class="metric-form-unit">
                <input
                  v-model="metricRecordForm.value"
                  class="metric-form-unit__input"
                  type="text"
                  :inputmode="metricRecordValueInputMode"
                  :placeholder="metricRecordValuePlaceholder"
                />
                <span v-if="metricRecordValueUnit" class="metric-form-unit__suffix">{{ metricRecordValueUnit }}</span>
              </div>
            </label>
          </div>

          <footer class="dialog-panel__footer">
            <button class="action-btn action-btn--ghost" type="button" @click="closeMetricRecordDialog">取消</button>
            <button class="action-btn action-btn--primary" type="button" @click="saveMetricRecord">确定</button>
          </footer>
        </article>
      </section>

      <section v-if="metricDeleteDialogOpen" class="dialog-mask" @click.self="closeMetricDeleteDialog">
        <article class="dialog-panel dialog-panel--compact">
          <header class="dialog-panel__header">
            <div>
              <h3>{{ metricDeleteDialogTitle }}</h3>
              <p class="dialog-panel__summary">{{ metricDeleteDialogSummary }}</p>
            </div>

            <button class="dialog-panel__close" type="button" aria-label="关闭删除确认弹层" @click="closeMetricDeleteDialog">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 6l12 12M18 6l-12 12" />
              </svg>
            </button>
          </header>

          <footer class="dialog-panel__footer">
            <button class="action-btn action-btn--ghost" type="button" @click="closeMetricDeleteDialog">取消</button>
            <button class="action-btn action-btn--danger" type="button" @click="confirmMetricDelete">删除</button>
          </footer>
        </article>
      </section>
    </template>

    <section v-else class="empty-panel">
      <strong>未找到用户档案</strong>
      <p>当前会话中没有可展示的用户信息，请返回用户列表重新进入。</p>
      <button class="action-btn action-btn--primary" type="button" @click="goBack">返回用户列表</button>
    </section>
  </section>
</template>

<style scoped>
.member-detail-page {
  --panel-bg: #ffffff;
  --panel-border: #dbe3e8;
  --text-strong: #1f2937;
  --text-soft: #6b7280;
  --brand: #2d8b68;
  --brand-soft: #edf8f3;
  --brand-fill: #41d2aa;
  --brand-fill-top: #48d4ad;
  --brand-fill-hover: #34c39a;
  --brand-border: #9ed0ba;
  --brand-ring: rgba(45, 139, 104, 0.08);
  --brand-shadow: rgba(51, 195, 154, 0.14);
  --radius-lg: 16px;
  display: grid;
  gap: 12px;
  padding: 0;
  background: transparent;
}

.detail-toolbar,
.overview-panel,
.detail-tabbar,
.side-card,
.panel-card,
.empty-panel {
  border: 1px solid var(--panel-border);
  border-radius: var(--radius-lg);
  background: var(--panel-bg);
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
}

.detail-toolbar,
.side-card,
.panel-card {
  padding: 16px 18px;
}

.detail-back-row {
  display: none;
}

.detail-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}

.detail-toolbar__left,
.detail-toolbar__actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.detail-toolbar__left {
  min-width: 0;
}

.detail-toolbar__heading {
  min-width: 0;
}

.detail-toolbar__eyebrow {
  display: inline-flex;
  align-items: center;
  min-height: 22px;
  padding: 0 10px;
  border-radius: 999px;
  background: #f4f6f8;
  color: #6f7b80;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.detail-toolbar__heading h1 {
  margin: 8px 0 4px;
  color: var(--text-strong);
  font-size: 22px;
  line-height: 1.2;
}

.detail-toolbar__heading p {
  margin: 0;
  color: #8a95a3;
  font-size: 12px;
  line-height: 1.6;
}

.back-btn,
.action-btn,
.detail-tabbar__item {
  border: 1px solid transparent;
  font: inherit;
  transition:
    background 160ms ease,
    border-color 160ms ease,
    color 160ms ease,
    box-shadow 160ms ease;
}

.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 38px;
  padding: 0 14px;
  border-color: #dbe3e8;
  border-radius: 999px;
  background: #ffffff;
  color: #30464c;
  font-size: 12px;
  font-weight: 700;
}

.detail-back-row .back-btn {
  font-size: 0;
}

.detail-back-row .back-btn::after {
  content: "返回列表";
  font-size: 12px;
  font-weight: 700;
}

.back-btn svg {
  width: 14px;
  height: 14px;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.9;
}

.action-btn {
  min-width: 88px;
  height: 36px;
  padding: 0 15px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
}

.action-btn--primary {
  border-color: var(--brand-fill);
  background: var(--brand-fill);
  color: #ffffff;
}

.action-btn--ghost {
  border-color: #dbe3e8;
  background: #ffffff;
  color: #30464c;
}

.action-btn--danger {
  background: #d8574f;
  color: #ffffff;
}

.overview-panel {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(520px, 0.96fr);
  gap: 16px;
  align-items: start;
  padding: 14px 18px;
}

.overview-panel__identity {
  display: flex;
  gap: 14px;
  min-width: 0;
}

.overview-avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 60px;
  height: 60px;
  border-radius: 18px;
  background: var(--avatar-shadow);
  color: rgba(255, 255, 255, 0.92);
  font-size: 22px;
  font-weight: 700;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.08);
}

.overview-summary {
  min-width: 0;
}

.overview-summary__top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.overview-summary__tags,
.side-card__tags,
.panel-card__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.overview-summary h2 {
  margin: 0;
  color: var(--text-strong);
  font-size: 20px;
  line-height: 1.2;
}

.overview-summary p {
  margin: 6px 0 0;
  color: #6f7d88;
  font-size: 13px;
  line-height: 1.6;
}

.overview-summary__address {
  margin-top: 12px;
}

.overview-summary__note {
  margin-top: 8px;
}

.overview-summary__tags {
  margin-top: 16px;
}

.overview-metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  align-content: start;
  align-self: center;
  justify-self: end;
  width: 100%;
  max-width: 632px;
}

.detail-tabbar {
  display: flex;
  gap: 8px;
  padding: 10px;
  overflow-x: auto;
}

.detail-tabbar__item {
  flex: 0 0 auto;
  min-width: 94px;
  height: 38px;
  padding: 0 14px;
  border-color: #e1e7ec;
  border-radius: 999px;
  background: #f4f6f8;
  color: #4b5563;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
}

.detail-tabbar__item--active {
  border-color: var(--brand-border);
  background: #ffffff;
  color: var(--brand);
  box-shadow: 0 1px 2px var(--brand-ring);
}

.detail-layout {
  display: grid;
  grid-template-columns: 300px minmax(0, 1fr);
  gap: 12px;
  align-items: start;
}

.detail-sidebar,
.detail-main {
  display: grid;
  gap: 12px;
  min-width: 0;
}

.card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.card-head h3 {
  margin: 0;
  color: var(--text-strong);
  font-size: 16px;
}

.card-head p {
  margin: 6px 0 0;
  color: #8a95a3;
  font-size: 12px;
  line-height: 1.6;
}

.panel-card--profile {
  padding: 18px 18px 22px;
}

.profile-section + .profile-section {
  margin-top: 20px;
}

.profile-section--secondary {
  padding-top: 18px;
  border-top: 1px solid #edf1f4;
}

.profile-section__head {
  margin-bottom: 12px;
}

.profile-section__head h3 {
  margin: 0;
  color: var(--text-strong);
  font-size: 16px;
  line-height: 1.4;
}

.profile-form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px 16px;
}

.profile-field {
  display: grid;
  grid-template-columns: 88px minmax(0, 1fr);
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.profile-field--wide {
  grid-column: 1 / -1;
}

.profile-field--multiline {
  align-items: start;
}

.profile-field__label {
  color: #8a95a3;
  font-size: 14px;
  line-height: 1.5;
  text-align: right;
}

.profile-field__value,
.profile-field__plain {
  min-width: 0;
  color: #22313a;
  font-size: 14px;
  line-height: 1.6;
  word-break: break-word;
}

.profile-field__value {
  min-height: 46px;
  padding: 10px 14px;
  border: 1px solid #e1e7ec;
  border-radius: 12px;
  background: #f5f7f8;
  box-sizing: border-box;
}

.profile-field--multiline .profile-field__value {
  min-height: 88px;
}

.profile-field__plain {
  padding: 0;
  font-weight: 700;
}

.profile-avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background:
    radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.28), transparent 48%),
    linear-gradient(135deg, var(--profile-avatar-accent), var(--profile-avatar-shadow));
  color: #ffffff;
  font-size: 24px;
  font-weight: 800;
  letter-spacing: 0.04em;
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.14),
    0 10px 18px rgba(15, 23, 42, 0.08);
}

.profile-actions {
  display: flex;
  gap: 12px;
  margin-top: 22px;
  padding-top: 18px;
  border-top: 1px solid #edf1f4;
}

.panel-card--medication {
  padding: 18px 18px 22px;
}

.medication-toolbar,
.device-toolbar,
.report-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}

.medication-search,
.device-search,
.report-search {
  flex: 1 1 auto;
}

.medication-search input,
.device-search input,
.report-search input {
  width: 100%;
  height: 40px;
  padding: 0 18px;
  border: 1px solid #d6dee4;
  border-radius: 999px;
  background: #ffffff;
  color: #22313a;
  font: inherit;
  font-size: 13px;
  outline: none;
  box-sizing: border-box;
}

.medication-search input::placeholder,
.device-search input::placeholder,
.report-search input::placeholder {
  color: #a0aab2;
}

.medication-search input:focus,
.device-search input:focus,
.report-search input:focus {
  border-color: var(--brand-border);
  box-shadow: 0 0 0 3px rgba(45, 139, 104, 0.06);
}

.medication-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 40px;
  border: 1px solid #d6dee4;
  border-radius: 999px;
  background: #ffffff;
  color: #42535a;
  transition:
    background 160ms ease,
    border-color 160ms ease,
    color 160ms ease,
    box-shadow 160ms ease;
}

.medication-icon-btn svg {
  width: 18px;
  height: 18px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.9;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.medication-icon-btn--brand {
  border-color: var(--brand-fill);
  background: var(--brand-fill);
  color: #ffffff;
}

.medication-toolbar__actions {
  display: flex;
  gap: 12px;
  margin-left: auto;
}

.action-btn--toolbar {
  min-width: 88px;
  height: 40px;
  padding: 0 18px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
}

.panel-card--report {
  padding: 18px 18px 22px;
}

.report-filter {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: #6b7785;
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
}

.report-select {
  position: relative;
  min-width: 214px;
}

.report-select::after {
  content: "";
  position: absolute;
  top: 50%;
  right: 20px;
  width: 8px;
  height: 8px;
  border-right: 2px solid #b8c0c7;
  border-bottom: 2px solid #b8c0c7;
  transform: translateY(-65%) rotate(45deg);
  pointer-events: none;
}

.report-select select {
  appearance: none;
  width: 100%;
  height: 40px;
  padding: 0 38px 0 18px;
  border: 1px solid #d6dee4;
  border-radius: 999px;
  background: #ffffff;
  color: #22313a;
  font: inherit;
  font-size: 13px;
  outline: none;
  box-sizing: border-box;
}

.report-select select:focus {
  border-color: var(--brand-border);
  box-shadow: 0 0 0 3px rgba(45, 139, 104, 0.06);
}

.report-toolbar__actions {
  display: flex;
  gap: 12px;
  margin-left: auto;
}

.report-table {
  min-width: 1120px;
  table-layout: fixed;
}

.report-table__col--check {
  width: 64px;
}

.report-table__col--uploaded-at {
  width: 17%;
}

.report-table__col--name {
  width: 16%;
}

.report-table__col--type {
  width: 12%;
}

.report-table__col--source {
  width: 12%;
}

.report-table__col--uploader {
  width: 9%;
}

.report-table__col--order {
  width: 18%;
}

.report-table__col--date {
  width: 12%;
}

.report-table th,
.report-table td {
  overflow: hidden;
  text-overflow: ellipsis;
}

.report-table__name-cell {
  color: var(--text-strong);
  font-weight: 400;
}

.panel-card--asset {
  padding: 18px 18px 22px;
}

.asset-tabs {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px;
  margin-bottom: 18px;
  border-radius: 14px;
  background: linear-gradient(180deg, #f3f5f6 0%, #eceff1 100%);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.88);
}

.asset-tabs__item {
  min-width: 92px;
  height: 38px;
  padding: 0 16px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: #556472;
  font-size: 13px;
  font-weight: 700;
  transition:
    background 160ms ease,
    color 160ms ease,
    box-shadow 160ms ease;
}

.asset-tabs__item--active {
  background: #ffffff;
  color: #33c39a;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.05);
}

.asset-toolbar {
  margin-bottom: 18px;
}

.asset-table {
  table-layout: fixed;
}

.asset-table--coupon {
  min-width: 980px;
}

.asset-table--coupon tbody td {
  height: 84px;
}

.asset-table--flow {
  min-width: 920px;
}

.asset-table__col--coupon-name {
  width: 18%;
}

.asset-table__col--coupon-status {
  width: 10%;
}

.asset-table__col--coupon-content {
  width: 14%;
}

.asset-table__col--coupon-scope {
  width: 12%;
}

.asset-table__col--coupon-time {
  width: 23%;
}

.asset-table__col--flow-type {
  width: 14%;
}

.asset-table__col--flow-amount {
  width: 12%;
}

.asset-table__col--flow-reason {
  width: 22%;
}

.asset-table__col--flow-remark {
  width: 16%;
}

.asset-table__col--flow-operator {
  width: 12%;
}

.asset-table__col--flow-time {
  width: 24%;
}

.asset-table th,
.asset-table td {
  overflow: hidden;
  text-overflow: ellipsis;
}

.asset-table__name-cell {
  color: var(--text-strong);
  font-weight: 400;
}

.asset-table__content-cell {
  white-space: normal !important;
}

.asset-table__content-cell strong {
  display: block;
  color: var(--text-strong);
  font-size: 14px;
  font-weight: 400;
  line-height: 1.45;
}

.asset-table__content-cell span {
  display: block;
  margin-top: 6px;
  color: #56626e;
  font-size: 13px;
  line-height: 1.45;
}

.asset-table__remark-cell {
  color: #8b97a3;
}

.asset-status {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  font-weight: 400;
  white-space: nowrap;
}

.asset-status::before {
  content: "";
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: currentColor;
  flex: 0 0 auto;
}

.asset-status--brand {
  color: #33c39a;
}

.asset-status--accent {
  color: #d9822b;
}

.asset-status--neutral {
  color: #778391;
}

.asset-status--danger {
  color: #d8574f;
}

.asset-amount {
  font-size: 14px;
  font-weight: 400;
  white-space: nowrap;
}

.asset-amount--brand {
  color: var(--brand);
}

.asset-amount--accent {
  color: #33c39a;
}

.asset-amount--neutral {
  color: #4b5866;
}

.asset-amount--danger {
  color: #d8574f;
}

.panel-card--order {
  padding: 18px 18px 22px;
}

.order-board-wrap {
  overflow-x: auto;
  padding-bottom: 6px;
}

.order-board {
  --order-columns:
    minmax(224px, 1.7fr)
    minmax(90px, 0.58fr)
    minmax(148px, 0.9fr)
    minmax(88px, 0.52fr)
    minmax(88px, 0.48fr)
    minmax(104px, 0.62fr);
  width: 100%;
  min-width: 760px;
}

.order-board__head,
.order-card__row {
  display: grid;
  grid-template-columns: var(--order-columns);
}

.order-board__head {
  overflow: hidden;
  border: 1px solid #edf1f4;
  border-radius: 14px 14px 0 0;
  background: #f7f8f9;
}

.order-board__head > div {
  padding: 16px 10px;
  color: #1f2d34;
  font-size: 12px;
  font-weight: 700;
  text-align: center;
  white-space: nowrap;
}

.order-board__head > div:last-child {
  text-align: right;
}

.order-list {
  display: grid;
  gap: 12px;
  margin-top: 12px;
}

.order-card {
  overflow: hidden;
  border: 1px solid #edf1f4;
  border-radius: 14px;
  background: #ffffff;
}

.order-card__meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 18px;
  row-gap: 8px;
  padding: 12px 14px;
  border-bottom: 1px solid #edf1f4;
  background: #fbfcfd;
  color: #8b97a3;
  font-size: 12px;
  white-space: nowrap;
}

.order-card__meta strong {
  margin-left: auto;
  color: #7d8792;
  font-size: 13px;
  font-weight: 700;
}

.order-card__row {
  align-items: stretch;
}

.order-cell {
  display: flex;
  align-items: center;
  min-width: 0;
  padding: 12px 10px;
  color: #22313a;
  font-size: 13px;
}

.order-cell + .order-cell {
  border-left: 1px solid #edf1f4;
}

.order-cell--product {
  align-items: stretch;
}

.order-product {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.order-product__thumb {
  overflow: hidden;
  flex: 0 0 auto;
  width: 84px;
  height: 60px;
  border-radius: 12px;
  border: 1px solid #edf1f4;
  background: #f5f7f8;
}

.order-product__thumb img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
}

.order-product__content {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.order-product__content strong {
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  color: var(--text-strong);
  font-size: 13px;
  line-height: 1.4;
}

.order-product__content span {
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 1;
  color: #8b97a3;
  font-size: 11px;
  line-height: 1.4;
}

.order-cell--price {
  color: #2b3942;
  font-size: 15px;
  font-weight: 700;
}

.order-buyer {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.order-buyer__avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background:
    radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.26), transparent 40%),
    linear-gradient(135deg, #a8b0b8, #6b7785);
  color: #ffffff;
  font-size: 16px;
  font-weight: 800;
}

.order-buyer__content {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.order-buyer__content strong {
  color: var(--text-strong);
  overflow: hidden;
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.order-buyer__content span {
  color: #56626e;
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.order-status {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 72px;
  min-height: 30px;
  padding: 0 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
}

.order-status--brand {
  background: var(--brand-soft);
  color: var(--brand);
}

.order-status--accent {
  background: #fff5e8;
  color: #d9822b;
}

.order-status--neutral {
  background: #f1f4f6;
  color: #6b7785;
}

.order-status--danger {
  background: #fff0ef;
  color: #d8574f;
}

.order-cell--actions {
  align-items: center;
  justify-content: flex-end;
}

.order-link-row {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.order-cell--actions {
  display: grid;
  justify-items: end;
  gap: 8px;
}

.order-link {
  border: 0;
  background: transparent;
  color: #33c39a;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}

.order-empty {
  padding: 48px 20px;
  border: 1px solid #edf1f4;
  border-radius: 14px;
  background: #ffffff;
  color: #9aa5af;
  font-size: 14px;
  text-align: center;
}

.panel-card--content {
  padding: 18px 18px 22px;
}

.content-toolbar {
  margin-bottom: 14px;
}

.content-table {
  min-width: 980px;
  table-layout: fixed;
}

.content-table__col--check {
  width: 48px;
}

.content-table__col--content {
  width: 236px;
}

.content-table__col--topic {
  width: 72px;
}

.content-table__col--metric {
  width: 60px;
}

.content-table__col--time {
  width: 144px;
}

.content-table__col--status {
  width: 104px;
}

.content-table__col--action {
  width: 64px;
}

.content-table th,
.content-table td {
  overflow: hidden;
  text-overflow: ellipsis;
}

.content-table tbody td {
  height: 88px;
  padding: 10px 8px;
  color: #52606d;
  font-size: 13px;
  font-weight: 300;
  vertical-align: middle;
}

.content-table__content-cell {
  white-space: normal !important;
}

.content-preview {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.content-preview img {
  display: block;
  flex: 0 0 auto;
  width: 96px;
  height: 64px;
  border: 1px solid #edf1f4;
  border-radius: 12px;
  background: #f4f7f8;
  object-fit: cover;
  object-position: center;
}

.content-preview p {
  display: -webkit-box;
  overflow: hidden;
  margin: 0;
  min-width: 0;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  color: #52606d;
  font-size: 13px;
  font-weight: 300;
  line-height: 1.55;
}

.content-table__metric--accent {
  color: var(--brand);
  font-weight: 400;
}

.content-visibility {
  position: relative;
  display: inline-flex;
  align-items: center;
  width: 50px;
  height: 26px;
  padding: 0 6px;
  overflow: hidden;
  border: 1px solid rgba(51, 195, 154, 0.18);
  border-radius: 999px;
  background: linear-gradient(180deg, var(--brand-fill-top) 0%, #33c39a 100%);
  box-shadow:
    0 6px 14px var(--brand-shadow),
    inset 0 1px 0 rgba(255, 255, 255, 0.18);
  color: #ffffff;
  cursor: pointer;
  transition:
    background 160ms ease,
    border-color 160ms ease,
    box-shadow 160ms ease,
    color 160ms ease,
    transform 140ms ease;
}

.content-visibility--hidden {
  border-color: #dde4e9;
  background: linear-gradient(180deg, #f6f8fb 0%, #eef2f6 100%);
  box-shadow: none;
  color: #7b8794;
}

.content-visibility__label {
  position: relative;
  z-index: 1;
  width: 100%;
  font-size: 9px;
  font-weight: 500;
  line-height: 1;
  text-align: left;
  transform: translateX(-2px);
  transition:
    color 180ms ease,
    transform 220ms cubic-bezier(0.22, 1, 0.36, 1);
}

.content-visibility__dot {
  position: absolute;
  top: 50%;
  left: 4px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #ffffff;
  box-shadow:
    0 3px 8px rgba(15, 23, 42, 0.14),
    0 0 0 1px rgba(255, 255, 255, 0.5);
  transform: translate(24px, -50%);
  transition:
    transform 240ms cubic-bezier(0.22, 1, 0.36, 1),
    background 180ms ease,
    box-shadow 180ms ease;
}

.content-visibility--hidden .content-visibility__dot {
  background: #ffffff;
  box-shadow: 0 2px 6px rgba(148, 163, 184, 0.2);
  transform: translate(0, -50%);
}

.content-visibility--hidden .content-visibility__label {
  text-align: right;
  transform: translateX(2px);
}

.content-visibility:active {
  transform: scale(0.97);
}

.content-action {
  border: 0;
  background: transparent;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
}

.content-action--delete {
  color: #ff6f66;
}

.panel-card--service {
  padding: 18px 18px 22px;
}

.service-toolbar {
  margin-bottom: 14px;
}

.service-table {
  min-width: 840px;
  table-layout: fixed;
}

.service-table__col--check {
  width: 36px;
}

.service-table__col--order-no {
  width: 78px;
}

.service-table__col--order-info {
  width: 208px;
}

.service-table__col--service-item {
  width: 84px;
}

.service-table__col--status {
  width: 68px;
}

.service-table__col--amount {
  width: 72px;
}

.service-table__col--staff {
  width: 90px;
}

.service-table__col--time {
  width: 112px;
}

.service-table__col--action {
  width: 78px;
}

.service-table th,
.service-table td {
  overflow: hidden;
  text-overflow: ellipsis;
}

.service-table tbody td {
  height: auto;
  padding: 8px 5px;
  color: #52606d;
  font-size: 12px;
  font-weight: 300;
  line-height: 1.45;
  vertical-align: middle;
}

.service-table thead th {
  padding: 0 6px;
  font-size: 11px;
  line-height: 1.35;
  white-space: normal;
}

.service-table__order-cell {
  white-space: normal !important;
}

.service-table__order-no-cell {
  font-size: 10px;
  line-height: 1.3;
  white-space: normal !important;
  word-break: break-all;
  overflow-wrap: anywhere;
  text-overflow: clip !important;
}

.service-table__service-item-cell,
.service-table__status-cell,
.service-table__action-cell {
  text-overflow: clip !important;
}

.service-table__service-item-cell,
.service-table__staff-cell,
.service-table__time-cell {
  white-space: normal !important;
}

.service-table__status-cell,
.service-table__action-cell {
  overflow: visible !important;
}

.service-record-order {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.service-record-order__thumb {
  overflow: hidden;
  flex: 0 0 auto;
  width: 72px;
  height: 48px;
  border: 1px solid #edf1f4;
  border-radius: 8px;
  background: #f5f7f8;
}

.service-record-order__thumb img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
}

.service-record-order__content {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.service-record-order__content strong {
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  color: var(--text-strong);
  font-size: 11px;
  font-weight: 400;
  line-height: 1.35;
}

.service-record-order__content span {
  color: #56626e;
  font-size: 10px;
  font-weight: 300;
}

.service-status {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 56px;
  min-height: 26px;
  padding: 0 6px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 400;
  white-space: nowrap;
}

.service-status--brand {
  background: var(--brand-soft);
  color: var(--brand);
}

.service-status--accent {
  background: #fff5e8;
  color: #d9822b;
}

.service-status--neutral {
  background: #f1f4f6;
  color: #6b7785;
}

.service-status--danger {
  background: #fff0ef;
  color: #d8574f;
}

.service-record__amount {
  color: #2b3942;
  font-size: 12px;
  font-weight: 400;
}

.service-record__actions {
  display: grid;
  justify-items: start;
  gap: 4px;
  white-space: normal;
}

.service-record__action {
  border: 0;
  background: transparent;
  color: #33c39a;
  padding: 0;
  font-size: 11px;
  font-weight: 500;
  line-height: 1.35;
}

.medication-table-wrap {
  overflow-x: auto;
  border: 1px solid #edf1f4;
  border-radius: 14px;
  background: #ffffff;
}

.medication-table {
  width: 100%;
  min-width: 900px;
  table-layout: fixed;
  border-collapse: collapse;
}

.medication-table__col--order {
  width: 64px;
}

.medication-table__col--period {
  width: 86px;
}

.medication-table__col--name {
  width: 168px;
}

.medication-table__col--frequency {
  width: 98px;
}

.medication-table__col--time {
  width: 92px;
}

.medication-table__col--dosage {
  width: 86px;
}

.medication-table__col--status {
  width: 122px;
}

.medication-table__col--source {
  width: 102px;
}

.medication-table__col--creator {
  width: 92px;
}

.medication-table thead th {
  height: 64px;
  padding: 0 12px;
  background: #f7f8f9;
  color: #2a343b;
  overflow: hidden;
  font-size: 14px;
  font-weight: 700;
  text-align: left;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.medication-table tbody td {
  height: 68px;
  padding: 0 12px;
  border-top: 1px solid #edf1f4;
  color: #34444c;
  overflow: hidden;
  font-size: 14px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.medication-table tbody tr:hover {
  background: #fbfcfc;
}

.medication-table__empty {
  text-align: center;
  color: #92a0a8;
}

.medication-switch {
  position: relative;
  display: inline-flex;
  align-items: center;
  width: 50px;
  height: 26px;
  padding: 0 6px;
  overflow: hidden;
  border: 1px solid #dce4eb;
  border-radius: 999px;
  background: linear-gradient(180deg, #f6f8fb 0%, #eef2f6 100%);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.82);
  color: #7b8794;
  cursor: pointer;
  transition:
    background 160ms ease,
    border-color 160ms ease,
    box-shadow 160ms ease,
    color 160ms ease,
    transform 140ms ease;
}

.medication-switch--active {
  border-color: rgba(51, 195, 154, 0.18);
  background: linear-gradient(180deg, var(--brand-fill-top) 0%, #33c39a 100%);
  box-shadow:
    0 6px 14px var(--brand-shadow),
    inset 0 1px 0 rgba(255, 255, 255, 0.18);
  color: #ffffff;
}

.medication-switch__label {
  position: relative;
  z-index: 1;
  width: 100%;
  font-size: 9px;
  font-weight: 500;
  line-height: 1;
  text-align: right;
  transform: translateX(2px);
  transition:
    color 180ms ease,
    transform 220ms cubic-bezier(0.22, 1, 0.36, 1);
}

.medication-switch__dot {
  position: absolute;
  top: 50%;
  left: 4px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #ffffff;
  box-shadow:
    0 3px 8px rgba(148, 163, 184, 0.2),
    0 0 0 1px rgba(255, 255, 255, 0.5);
  transform: translate(0, -50%);
  transition:
    transform 240ms cubic-bezier(0.22, 1, 0.36, 1),
    box-shadow 180ms ease;
}

.medication-switch--active .medication-switch__label {
  text-align: left;
  transform: translateX(-2px);
}

.medication-switch--active .medication-switch__dot {
  box-shadow:
    0 3px 8px rgba(15, 23, 42, 0.14),
    0 0 0 1px rgba(255, 255, 255, 0.5);
  transform: translate(24px, -50%);
}

.medication-switch:active {
  transform: scale(0.97);
}

.medication-actions {
  display: flex;
  gap: 12px;
  margin-top: 22px;
  padding-top: 18px;
  border-top: 1px solid #edf1f4;
}

.panel-card--device {
  padding: 18px 18px 22px;
}

.device-table-wrap {
  overflow-x: auto;
  border: 1px solid #edf1f4;
  border-radius: 14px;
  background: #ffffff;
}

.device-table {
  width: 100%;
  min-width: 920px;
  table-layout: fixed;
  border-collapse: collapse;
}

.device-table__col--order {
  width: 6%;
}

.device-table__col--name {
  width: 13%;
}

.device-table__col--image {
  width: 6%;
}

.device-table__col--code {
  width: 15%;
}

.device-table__col--version {
  width: 9%;
}

.device-table__col--status {
  width: 11%;
}

.device-table__col--address {
  width: 22%;
}

.device-table__col--time {
  width: 18%;
}

.device-table thead th {
  height: 58px;
  padding: 0 12px;
  background: #f7f8f9;
  color: #1f2d34;
  overflow: hidden;
  font-size: 13px;
  font-weight: 700;
  text-align: left;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.device-table tbody td {
  height: 76px;
  padding: 0 12px;
  border-top: 1px solid #edf1f4;
  color: #22313a;
  font-weight: 400;
  overflow: hidden;
  font-size: 13px;
  text-overflow: ellipsis;
  vertical-align: middle;
  white-space: nowrap;
}

.device-table__image-cell {
  padding-left: 4px !important;
  padding-right: 4px !important;
}

.device-table__cell--center {
  text-align: center !important;
}

.device-table__status-cell {
  overflow: visible !important;
  text-overflow: clip !important;
  white-space: nowrap !important;
}

.device-table__image {
  display: flex;
  align-items: center;
  justify-content: center;
}

.device-preview {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 38px;
  border-radius: 9px;
  background: linear-gradient(180deg, #2d343c, #11161b);
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.06),
    0 4px 8px rgba(15, 23, 42, 0.1);
}

.device-preview::before,
.device-preview::after {
  content: "";
  position: absolute;
  left: 50%;
  width: 11px;
  height: 9px;
  border-radius: 6px;
  background: linear-gradient(180deg, #383f47, #171b20);
  transform: translateX(-50%);
}

.device-preview::before {
  top: -7px;
}

.device-preview::after {
  bottom: -7px;
}

.device-preview__screen {
  position: relative;
  width: 20px;
  height: 28px;
  border-radius: 6px;
  background:
    radial-gradient(circle at 50% 28%, rgba(255, 211, 140, 0.92), transparent 28%),
    radial-gradient(circle at 40% 58%, rgba(255, 131, 59, 0.5), transparent 34%),
    linear-gradient(180deg, #181e24, #050608);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.05);
}

.device-preview__screen::before {
  content: "";
  position: absolute;
  inset: 5px;
  border-radius: 999px;
  border: 1px solid rgba(255, 171, 83, 0.42);
  opacity: 0.9;
}

.device-status {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 64px;
  min-height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 400;
  white-space: nowrap;
}

.device-status--brand {
  background: var(--brand-soft);
  color: var(--brand);
}

.device-status--accent {
  background: #fff5e8;
  color: #d9822b;
}

.device-status--neutral {
  background: #f1f4f6;
  color: #6b7785;
}

.device-status--danger {
  background: #fff0ef;
  color: #d8574f;
}

.device-table__address-cell {
  white-space: normal !important;
  line-height: 1.5;
  word-break: break-word;
}

.device-table__empty {
  color: #9aa5af;
  text-align: center;
}

.device-pagination {
  margin-top: 18px;
}

.device-actions {
  display: flex;
  gap: 12px;
  margin-top: 26px;
  padding-top: 18px;
  border-top: 1px solid #edf1f4;
}

.panel-card--metrics {
  padding: 18px 18px 22px;
}

.panel-card--metrics-settings {
  gap: 0;
}

.metrics-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.metrics-settings-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.metrics-settings-card {
  padding: 18px;
  border: 1px solid #e9eef2;
  border-radius: 16px;
  background: #fbfcfd;
}

.metrics-settings-card__head h4 {
  margin: 0;
  color: var(--text-strong);
  font-size: 16px;
  line-height: 1.4;
}

.metrics-settings-card__head p {
  margin: 8px 0 0;
  color: #8a95a3;
  font-size: 12px;
  line-height: 1.7;
}

.metrics-settings-list {
  display: grid;
  gap: 12px;
  margin-top: 16px;
}

.metrics-settings-field {
  display: grid;
  gap: 8px;
}

.metrics-settings-field__label {
  color: #52606d;
  font-size: 13px;
  font-weight: 700;
}

.metrics-settings-field__control {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  min-height: 44px;
  padding: 0 12px;
  border: 1px solid #e1e7ec;
  border-radius: 12px;
  background: #ffffff;
}

.metrics-settings-field__control:focus-within {
  border-color: rgba(31, 122, 90, 0.3);
  box-shadow: 0 0 0 4px var(--brand-ring);
}

.metrics-settings-field__control input {
  width: 100%;
  height: 42px;
  padding: 0;
  border: 0;
  background: transparent;
  color: #22313a;
  font: inherit;
  font-size: 13px;
  outline: none;
}

.metrics-settings-field__operator,
.metrics-settings-field__unit {
  color: #95a0aa;
  font-size: 13px;
  font-weight: 700;
}

.metrics-tabs {
  display: flex;
  flex: 1 1 auto;
  gap: 4px;
  padding: 4px;
  overflow-x: auto;
  border-radius: 14px;
  background: #f2f4f6;
}

.metrics-tab {
  flex: 0 0 auto;
  min-width: 84px;
  height: 36px;
  padding: 0 14px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: #52606d;
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
}

.metrics-tab--active {
  background: #ffffff;
  color: #33c39a;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.05);
}

.metrics-settings-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: 52px;
  height: 52px;
  border: 1px solid #e4eaef;
  border-radius: 12px;
  background: #ffffff;
  color: #8a95a3;
}

.metrics-settings-btn svg,
.metrics-date-chip__icon,
.metrics-date-chip__caret {
  width: 24px;
  height: 24px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.metrics-range-row {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  margin-top: 18px;
}

.metrics-date-range {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  min-width: 0;
}

.metrics-date-field {
  position: relative;
  display: grid;
  gap: 6px;
  min-width: 0;
}

.metrics-date-field__label {
  padding-left: 4px;
  color: #1e3447;
  font-size: 12px;
  font-weight: 500;
  line-height: 1.2;
}

.metrics-date-chip {
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-width: 228px;
  height: 44px;
  padding: 0 14px;
  border: 1px solid #edf1f4;
  border-radius: 16px;
  background: #ffffff;
  color: #42535a;
  box-shadow: 0 4px 10px rgba(15, 23, 42, 0.025);
  transition:
    border-color 160ms ease,
    box-shadow 160ms ease,
    color 160ms ease,
    transform 160ms ease;
}

.metrics-date-chip__main {
  display: inline-flex;
  align-items: center;
  min-width: 0;
  gap: 7px;
}

.metrics-date-chip__icon {
  display: inline-flex;
  flex: 0 0 auto;
  width: 18px;
  height: 18px;
  color: #4a5b56;
}

.metrics-date-chip__value {
  min-width: 0;
  color: #556771;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.3;
  white-space: nowrap;
}

.metrics-date-chip__caret {
  flex: 0 0 auto;
  width: 14px;
  height: 14px;
  color: #58655f;
}

.metrics-date-chip__native {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  border: 0;
  margin: 0;
  opacity: 0;
  pointer-events: none;
}

.metrics-chart-stack {
  display: grid;
  gap: 22px;
  margin-top: 24px;
}

.metrics-chart-card {
  padding: 0;
}

.metrics-chart-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 18px;
}

.metrics-chart-card__head h3 {
  margin: 0;
  color: var(--text-strong);
  font-size: 16px;
  line-height: 1.4;
}

.metrics-chart-card__head small {
  margin-left: 4px;
  color: #7f8a90;
  font-size: 14px;
  font-weight: 500;
}

.metrics-chart-card__plot {
  position: relative;
  padding-right: 20px;
  padding-left: 42px;
}

.metrics-trend-chart {
  display: block;
  width: 100%;
  height: 292px;
}

.metrics-chart-grid line {
  stroke: #eef2f6;
  stroke-width: 1;
  stroke-dasharray: 4 4;
}

.metrics-chart-card__axis {
  position: absolute;
  inset: 10px auto 34px 0;
  display: grid;
  align-content: space-between;
  width: 34px;
  color: #c0c8d0;
  font-size: 12px;
  line-height: 1;
}

.metrics-chart-card__labels {
  display: grid;
  gap: 8px;
  padding: 8px 20px 0 42px;
  color: #c0c8d0;
  font-size: 12px;
}

.metrics-chart-card__labels span {
  text-align: center;
  white-space: nowrap;
}

.metrics-chart-card__empty {
  margin: 8px 0 0;
  padding-left: 42px;
  color: #b2bcc5;
  font-size: 12px;
}

.metrics-record-section {
  margin-top: 28px;
}

.metrics-batch-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 14px;
  padding: 14px 16px;
  border: 1px solid #dbe3e8;
  border-radius: 16px;
  background: #ffffff;
}

.metrics-batch-bar__summary {
  color: var(--text-strong);
  font-size: 14px;
}

.metrics-batch-bar__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.metrics-record-section__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 14px;
}

.metrics-record-section__head h3 {
  margin: 0;
  color: var(--text-strong);
  font-size: 16px;
}

.metrics-record-section__actions {
  display: flex;
  gap: 12px;
}

.metrics-table-wrap {
  overflow-x: auto;
  border: 1px solid #edf1f4;
  background: #ffffff;
}

.metrics-table {
  width: 100%;
  min-width: 860px;
  border-collapse: collapse;
}

.metrics-table thead th {
  height: 62px;
  padding: 0 12px;
  background: #f7f8f9;
  color: #1f2d34;
  font-size: 13px;
  font-weight: 700;
  text-align: left;
  white-space: nowrap;
}

.metrics-table tbody td {
  height: 62px;
  padding: 0 12px;
  border-top: 1px solid #edf1f4;
  color: #22313a;
  font-size: 13px;
  font-weight: 400;
  white-space: nowrap;
}

.metrics-table__checkbox-cell {
  width: 64px;
  padding-left: 14px !important;
}

.metrics-table__actions {
  display: inline-flex;
  align-items: center;
  gap: 14px;
}

.metrics-table__link {
  border: 0;
  background: transparent;
  font-size: 13px;
  font-weight: 400;
}

.metrics-table__link--edit {
  color: #33c39a;
}

.metrics-table__link--delete {
  color: #ff6f66;
}

.metrics-table__empty {
  color: #9aa5af;
  text-align: center;
}

.metrics-checkbox {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  cursor: pointer;
}

.metrics-checkbox input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.metrics-checkbox span {
  display: inline-flex;
  width: 20px;
  height: 20px;
  border: 2px solid #c2c8ce;
  border-radius: 3px;
  background: #ffffff;
  transition: all 160ms ease;
}

.metrics-checkbox input:checked + span {
  border-color: #33c39a;
  background:
    linear-gradient(135deg, rgba(51, 195, 154, 0.1), rgba(51, 195, 154, 0.1)),
    #ffffff;
  box-shadow: inset 0 0 0 5px #ffffff;
}

.metrics-pagination {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 16px;
  margin-top: 14px;
}

.metrics-pagination__meta {
  display: inline-flex;
  align-items: center;
  gap: 14px;
  color: #596673;
  font-size: 13px;
}

.metrics-pagination__size {
  border: 0;
  background: transparent;
  color: inherit;
  font-size: inherit;
}

.metrics-pagination__controls {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}

.metrics-pagination__btn {
  min-width: 34px;
  height: 34px;
  padding: 0 10px;
  border: 1px solid #dbe3e8;
  border-radius: 8px;
  background: #ffffff;
  color: #596673;
  font-size: 12px;
  font-weight: 600;
  transition:
    border-color 160ms ease,
    background 160ms ease,
    color 160ms ease,
    box-shadow 160ms ease;
}

.metrics-pagination__btn:disabled {
  color: #c5ccd3;
  background: #ffffff;
  border-color: #e6ebef;
}

.metrics-pagination__btn--active {
  border-color: var(--brand-fill);
  background: var(--brand-fill);
  color: #ffffff;
}

.metrics-pagination__jump {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #596673;
  font-size: 12px;
  white-space: nowrap;
}

.metrics-pagination__jump input {
  width: 54px;
  height: 34px;
  padding: 0 8px;
  border: 1px solid #e1e7ec;
  border-radius: 999px;
  background: #ffffff;
  color: #22313a;
  font: inherit;
  text-align: center;
  outline: none;
}

.metrics-pagination__jump input:focus {
  border-color: var(--brand-border);
  box-shadow: 0 0 0 3px rgba(45, 139, 104, 0.06);
}

.metrics-actions {
  display: flex;
  gap: 12px;
  margin-top: 26px;
  padding-top: 18px;
  border-top: 1px solid #edf1f4;
}

.dialog-mask {
  position: fixed;
  inset: 0;
  z-index: 48;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(15, 23, 42, 0.32);
  backdrop-filter: blur(8px);
}

.dialog-panel {
  width: min(560px, 100%);
  max-height: calc(100vh - 48px);
  overflow: auto;
  padding: 20px;
  border: 1px solid var(--panel-border);
  border-radius: 22px;
  background: #ffffff;
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.18);
}

.dialog-panel--compact {
  width: min(460px, 100%);
}

.dialog-panel__header,
.dialog-panel__footer {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.dialog-panel__eyebrow {
  margin: 0 0 6px;
  color: var(--brand);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.dialog-panel__header h3 {
  margin: 0;
  color: var(--text-strong);
  font-size: 18px;
  line-height: 1.4;
}

.dialog-panel__summary {
  margin: 8px 0 0;
  color: var(--text-soft);
  font-size: 12.5px;
  line-height: 1.7;
}

.dialog-panel__close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: 34px;
  height: 34px;
  border: 1px solid #dbe3e8;
  border-radius: 999px;
  background: #fff;
  color: #7b8794;
}

.dialog-panel__close svg {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.8;
}

.dialog-grid {
  display: grid;
  gap: 12px;
  margin-top: 18px;
}

.dialog-grid--metric {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.dialog-field {
  display: grid;
  gap: 6px;
}

.dialog-field--wide {
  grid-column: 1 / -1;
}

.dialog-field span {
  color: #687782;
  font-size: 12px;
  font-weight: 700;
}

.dialog-field input {
  width: 100%;
  height: 42px;
  padding: 0 12px;
  border: 1px solid #dbe3e8;
  border-radius: 12px;
  background: #f9fbfc;
  color: #30464c;
  font: inherit;
  font-size: 13px;
  outline: none;
}

.dialog-field textarea {
  width: 100%;
  min-height: 128px;
  padding: 12px;
  border: 1px solid #dbe3e8;
  border-radius: 12px;
  background: #f9fbfc;
  color: #30464c;
  font: inherit;
  font-size: 13px;
  line-height: 1.6;
  resize: vertical;
  outline: none;
  box-sizing: border-box;
}

.dialog-field input:focus,
.dialog-field textarea:focus,
.metric-form-unit:focus-within {
  border-color: rgba(31, 122, 90, 0.3);
  box-shadow: 0 0 0 4px var(--brand-ring);
}

.metric-form-unit {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  min-height: 42px;
  border: 1px solid #dbe3e8;
  border-radius: 12px;
  background: #f9fbfc;
  overflow: hidden;
}

.metric-form-unit__input {
  height: 42px;
  padding: 0 12px;
  border: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
}

.metric-form-unit__suffix {
  padding-right: 12px;
  color: #9aa7b3;
  font-size: 12px;
  font-weight: 600;
}

.dialog-panel__footer {
  justify-content: flex-end;
  margin-top: 22px;
}

.dialog-panel--service-detail {
  width: min(760px, 100%);
}

.dialog-panel--service-remark {
  width: min(520px, 100%);
}

.service-dialog-card {
  margin-top: 18px;
  padding: 18px;
  border: 1px solid #e9eef2;
  border-radius: 18px;
  background: #fbfcfd;
}

.service-dialog-card__title {
  margin: 0 0 14px;
  color: var(--text-strong);
  font-size: 16px;
  line-height: 1.4;
}

.service-dialog-status {
  display: flex;
  align-items: center;
  gap: 10px;
}

.service-dialog-status strong {
  color: var(--text-strong);
  font-size: 14px;
  font-weight: 600;
}

.service-dialog-product {
  display: grid;
  grid-template-columns: 120px minmax(0, 1fr);
  gap: 16px;
  align-items: center;
  margin-top: 16px;
}

.service-dialog-product__thumb {
  overflow: hidden;
  width: 120px;
  height: 88px;
  border-radius: 16px;
  border: 1px solid #edf1f4;
  background: #f5f7f8;
}

.service-dialog-product__thumb img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
}

.service-dialog-product__content {
  min-width: 0;
}

.service-dialog-product__content h4 {
  margin: 0;
  color: var(--text-strong);
  font-size: 18px;
  line-height: 1.45;
}

.service-dialog-product__content p {
  margin: 10px 0 0;
  color: #63727d;
  font-size: 13px;
  line-height: 1.7;
}

.service-dialog-product__content span {
  display: inline-flex;
  align-items: center;
  margin-top: 12px;
  padding: 0 10px;
  min-height: 30px;
  border-radius: 999px;
  background: var(--brand-soft);
  color: var(--brand);
  font-size: 12px;
  font-weight: 600;
}

.service-dialog-price {
  display: grid;
  gap: 12px;
  margin-top: 18px;
}

.service-dialog-price__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: #7f8a90;
  font-size: 14px;
}

.service-dialog-price__row strong {
  color: var(--text-strong);
  font-size: 15px;
}

.service-dialog-price__discount {
  color: #e26a61 !important;
}

.service-dialog-price__row--highlight {
  padding-top: 12px;
  border-top: 1px solid #edf1f4;
}

.service-dialog-price__row--highlight strong {
  color: var(--brand);
  font-size: 18px;
}

.service-dialog-meta dd {
  color: var(--text-strong);
  font-size: 13px;
  line-height: 1.6;
}

.service-dialog__hint {
  margin: 16px 0 0;
  padding: 12px 14px;
  border-radius: 14px;
  background: #f3f7f8;
  color: #63727d;
  font-size: 12px;
  line-height: 1.7;
}

.service-remark-count {
  margin: -4px 0 0;
  color: #93a0aa;
  font-size: 12px;
  text-align: right;
}

.meta-list {
  display: grid;
  gap: 10px;
  margin: 0;
}

.meta-list div {
  display: grid;
  gap: 4px;
  padding-bottom: 10px;
  border-bottom: 1px solid #eef2f5;
}

.meta-list div:last-child {
  padding-bottom: 0;
  border-bottom: 0;
}

.meta-list dt,
.meta-list dd {
  margin: 0;
}

.meta-list dt,
.metric-card span,
.info-item span,
.record-card__meta span,
.log-row__title p,
.log-row__value span,
.timeline-item__time,
.device-card__head p {
  color: #7f8a90;
  font-size: 12px;
}

.meta-list dd,
.info-item strong,
.metric-card strong,
.record-card__main strong,
.log-row__title strong,
.log-row__value strong,
.timeline-item__body strong,
.device-card__head h4 {
  color: var(--text-strong);
}

.meta-list dd {
  font-size: 13px;
  line-height: 1.6;
  word-break: break-word;
}

.side-card__tags {
  margin-top: 14px;
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.metric-grid--compact {
  margin-top: 14px;
}

.metric-card {
  display: grid;
  gap: 6px;
  padding: 14px;
  border: 1px solid #e9eef2;
  border-radius: 14px;
  background: #f8fafb;
}

.metric-card strong {
  font-size: 24px;
  line-height: 1.1;
}

.metric-card small {
  color: #8a95a3;
  font-size: 12px;
}

.metric-card--hero {
  align-items: center;
  justify-items: center;
  gap: 8px;
  min-height: 118px;
  padding: 16px 12px 14px;
  border-color: #e3e8e6;
  border-radius: 20px;
  background: #f2f3f2;
  box-shadow: none;
  text-align: center;
}

.metric-card--hero::before {
  display: none;
}

.metric-card--hero span {
  color: #1f2d34;
  font-size: 14px;
  font-weight: 700;
  line-height: 1.25;
}

.metric-card__value {
  display: inline-flex;
  align-items: baseline;
  justify-content: center;
  gap: 0;
}

.metric-card--hero strong {
  color: #21343b;
  font-size: 32px;
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1;
}

.metric-card--hero small {
  display: block;
  max-width: 100%;
  color: #79868e;
  font-size: 11px;
  font-weight: 600;
  line-height: 1.3;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.info-item {
  display: grid;
  gap: 8px;
  padding: 14px;
  border: 1px solid #e9eef2;
  border-radius: 14px;
  background: #f8fafb;
}

.info-item--wide {
  grid-column: span 2;
}

.info-item strong {
  font-size: 14px;
  line-height: 1.7;
}

.record-list,
.tips-list,
.log-table,
.timeline-list,
.device-grid {
  display: grid;
  gap: 12px;
}

.record-card,
.tip-card,
.log-row,
.device-card,
.timeline-item__body {
  border: 1px solid #e9eef2;
  border-radius: 14px;
  background: #f8fafb;
}

.record-card,
.log-row {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(220px, 0.9fr) auto;
  gap: 14px;
  align-items: center;
  padding: 14px;
}

.record-card__main p,
.timeline-item__body p,
.empty-panel p,
.tip-card {
  color: #6f7d88;
  font-size: 13px;
  line-height: 1.7;
}

.record-card__main p {
  margin: 6px 0 0;
}

.record-card__meta {
  display: grid;
  gap: 6px;
}

.tips-list {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.tip-card {
  padding: 14px;
}

.log-row__title p,
.log-row__value span {
  margin: 6px 0 0;
}

.device-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.device-card {
  padding: 16px;
}

.device-card__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.device-card__head h4 {
  margin: 0;
  font-size: 15px;
}

.device-card__head p {
  margin: 6px 0 0;
}

.meta-list--device div {
  padding-bottom: 0;
  border-bottom: 0;
}

.timeline-item {
  display: grid;
  grid-template-columns: 120px minmax(0, 1fr);
  gap: 12px;
  align-items: start;
}

.timeline-item__time {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 28px;
  padding-top: 6px;
}

.timeline-item__dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: #c6d2da;
}

.timeline-item__body {
  padding: 14px;
}

.timeline-item__body p {
  margin: 6px 0 0;
}

.timeline-item__body small {
  display: inline-block;
  margin-top: 8px;
  color: #93a0aa;
  font-size: 12px;
}

.timeline-list--aside .timeline-item {
  grid-template-columns: 1fr;
  gap: 8px;
}

.tag-pill,
.status-chip,
.tone-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
}

.tag-pill--mint {
  background: rgba(70, 208, 168, 0.12);
  color: #24946c;
}

.tag-pill--peach {
  background: rgba(255, 114, 86, 0.12);
  color: #d66549;
}

.tag-pill--lavender {
  background: rgba(98, 120, 255, 0.12);
  color: #5f6cf0;
}

.tag-pill--gold {
  background: rgba(255, 201, 84, 0.18);
  color: #9a6d16;
}

.status-chip--brand,
.tone-chip--brand {
  background: rgba(45, 139, 104, 0.1);
  color: var(--brand);
}

.status-chip--neutral,
.tone-chip--neutral {
  background: rgba(31, 41, 55, 0.08);
  color: #475569;
}

.status-chip--accent,
.tone-chip--accent {
  background: rgba(230, 148, 53, 0.14);
  color: #b96e1d;
}

.status-chip--soft {
  background: #f4f6f8;
  color: #55626e;
}

.tone-chip--danger {
  background: rgba(216, 87, 79, 0.12);
  color: #d8574f;
}

.empty-panel {
  display: grid;
  justify-items: center;
  gap: 10px;
  padding: 48px 24px;
  text-align: center;
}

.empty-panel strong {
  color: var(--text-strong);
  font-size: 18px;
}

:global(body.member-detail-shell-hidden .admin-topbar),
:global(body.member-detail-shell-hidden .workspace-metrics) {
  display: none;
}

:global(body.member-detail-shell-hidden .admin-main) {
  gap: 0;
}

:global(body.member-detail-shell-hidden .admin-content) {
  padding-top: 0;
}

@media (hover: hover) {
  .back-btn:hover,
  .action-btn--ghost:hover,
  .detail-tabbar__item:hover,
  .dialog-panel__close:hover,
  .asset-tabs__item:hover {
    border-color: #bfdbcf;
    color: var(--brand);
  }

  .detail-tabbar__item:hover {
    background: #ffffff;
  }

  .asset-tabs__item:hover {
    background: rgba(255, 255, 255, 0.72);
    box-shadow: 0 4px 12px rgba(15, 23, 42, 0.06);
  }

  .medication-icon-btn:hover {
    border-color: #bfdbcf;
    color: var(--brand);
    box-shadow: 0 4px 12px rgba(15, 23, 42, 0.06);
  }

  .medication-icon-btn--brand:hover {
    border-color: var(--brand-fill-hover);
    background: var(--brand-fill-hover);
    color: #ffffff;
  }

  .metrics-tab:hover,
  .metrics-table__link:hover,
  .metrics-pagination__size:hover,
  .order-link:hover {
    color: var(--brand);
  }

  .metrics-pagination__btn:hover:not(:disabled):not(.metrics-pagination__btn--active) {
    border-color: #bfdbcf;
    color: var(--brand);
    box-shadow: 0 4px 10px rgba(15, 23, 42, 0.06);
  }

  .metrics-settings-btn:hover,
  .metrics-date-chip:hover {
    border-color: #bfdbcf;
    color: var(--brand);
    box-shadow: 0 10px 22px rgba(45, 139, 104, 0.08);
  }

  .metric-card--hero:hover {
    border-color: #d6dedb;
    background: #ecefed;
  }
}

@media (max-width: 1260px) {
  .overview-panel,
  .detail-layout {
    grid-template-columns: 1fr;
  }

  .overview-metrics {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    justify-self: stretch;
    max-width: none;
  }

  .metric-grid,
  .device-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .metrics-settings-grid {
    grid-template-columns: 1fr;
  }

  .metrics-range-row {
    justify-content: stretch;
  }

  .metrics-date-range {
    width: 100%;
    justify-content: flex-end;
  }

  .report-toolbar {
    flex-wrap: wrap;
  }

  .report-toolbar__actions {
    margin-left: 0;
  }

  .order-card__meta {
    gap: 18px;
  }
}

@media (max-width: 920px) {
  .detail-toolbar,
  .detail-toolbar__left,
  .detail-toolbar__actions,
  .overview-panel__identity,
  .overview-summary__top,
  .record-card,
  .log-row,
  .timeline-item {
    grid-template-columns: 1fr;
    flex-direction: column;
  }

  .detail-toolbar,
  .detail-toolbar__left,
  .detail-toolbar__actions,
  .overview-panel__identity,
  .overview-summary__top {
    align-items: stretch;
  }

  .detail-toolbar__actions,
  .action-btn,
  .back-btn {
    width: 100%;
  }

  .detail-tabbar {
    padding: 8px;
  }

  .detail-tabbar__item {
    min-width: 86px;
  }

  .panel-card--profile {
    padding: 18px;
  }

  .profile-section__head h3 {
    font-size: 16px;
  }

  .medication-toolbar,
  .device-toolbar,
  .report-toolbar,
  .order-toolbar,
  .medication-toolbar__actions,
  .report-toolbar__actions {
    flex-wrap: wrap;
  }

  .medication-toolbar__actions,
  .report-toolbar__actions {
    margin-left: 0;
  }

  .medication-search,
  .device-search,
  .report-search,
  .report-filter {
    flex-basis: 100%;
  }

  .report-filter {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }

  .asset-tabs {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    width: 100%;
  }

  .asset-tabs__item {
    min-width: 0;
    padding: 0 12px;
  }

  .report-select {
    min-width: 0;
  }

  .order-card__meta {
    padding: 16px 18px;
  }

  .order-card__meta strong {
    margin-left: 0;
    width: 100%;
  }

  .order-link-row {
    gap: 12px;
  }

  .metrics-topbar,
  .metrics-range-row,
  .metrics-batch-bar,
  .metrics-record-section__head,
  .metrics-pagination {
    flex-direction: column;
    align-items: stretch;
  }

  .metrics-settings-btn {
    width: 100%;
    height: 52px;
  }

  .metrics-tabs {
    width: 100%;
  }

  .metrics-record-section__actions,
  .metrics-batch-bar__actions,
  .metrics-actions,
  .device-actions,
  .report-toolbar__actions {
    flex-direction: column;
  }

  .metrics-date-range {
    flex-direction: column;
    align-items: stretch;
  }

  .metrics-date-field,
  .metrics-date-chip {
    width: 100%;
  }

  .metrics-date-chip {
    min-width: 0;
  }

  .dialog-grid--metric,
  .metrics-settings-list {
    grid-template-columns: 1fr;
  }

  .dialog-field--wide {
    grid-column: auto;
  }

  .dialog-panel__footer {
    flex-direction: column;
    align-items: stretch;
  }

  .dialog-panel--service-detail,
  .dialog-panel--service-remark {
    width: 100%;
    padding: 18px;
  }

  .service-dialog-product {
    grid-template-columns: 1fr;
  }

  .service-dialog-product__thumb {
    width: 100%;
    max-width: 240px;
    height: 160px;
  }

  .service-dialog-status {
    flex-wrap: wrap;
  }

  .metrics-pagination__meta,
  .metrics-pagination__controls,
  .metrics-pagination__jump {
    justify-content: center;
  }

  .metrics-pagination__jump input {
    width: 100%;
  }

  .profile-form-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .profile-field,
  .profile-field--wide {
    grid-template-columns: 1fr;
    grid-column: auto;
    gap: 6px;
  }

  .profile-field__label {
    text-align: left;
  }

  .profile-actions {
    flex-direction: column;
  }

  .medication-actions {
    flex-direction: column;
  }

  .overview-metrics,
  .metric-grid,
  .info-grid,
  .tips-list,
  .device-grid {
    grid-template-columns: 1fr;
  }

  .metrics-chart-card__plot {
    padding-right: 12px;
    padding-left: 34px;
  }

  .metrics-chart-card__labels {
    padding-right: 12px;
    padding-left: 34px;
  }

  .metrics-chart-card__empty {
    padding-left: 34px;
  }

  .metric-card--hero {
    min-height: 116px;
    border-radius: 18px;
  }

  .info-item--wide {
    grid-column: auto;
  }
}
</style>
