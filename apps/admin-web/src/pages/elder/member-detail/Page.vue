<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import type { PageComponentProps } from "@ihc/page-core/types";
import {
  getMemberDetailById,
  memberDetailStorageKey,
  memberDetailTabs,
  type MemberDetailTabKey,
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

const medicationKeyword = ref("");
const medicationReminderOverrides = ref<Record<string, boolean>>({});

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

  const orderedRows = baseRows
    .map((row, index, rows) => ({
      ...row,
      order: rows.length - index,
    }))
    .sort((left, right) => right.order - left.order);

  const keyword = medicationKeyword.value.trim().toLowerCase();

  if (!keyword) {
    return orderedRows;
  }

  return orderedRows.filter((row) =>
    [row.period, row.name, row.frequency, row.time, row.dosage, row.source, row.creator].some((value) =>
      value.toLowerCase().includes(keyword),
    ),
  );
});

function resetMedicationKeyword() {
  medicationKeyword.value = "";
}

function toggleMedicationReminder(rowKey: string) {
  const current = medicationReminderOverrides.value[rowKey];
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
                <p>用户身份、顾问与最近跟进信息</p>
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
                <p>重点方案、居住方式与紧急联系人</p>
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
                  <input v-model="medicationKeyword" type="text" placeholder="??????" />
                </label>

                <button class="medication-icon-btn medication-icon-btn--brand" type="button" aria-label="??">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M11 5a6 6 0 1 0 0 12a6 6 0 0 0 0-12Zm8 14l-3.4-3.4" />
                  </svg>
                </button>

                <button class="medication-icon-btn" type="button" aria-label="??" @click="resetMedicationKeyword">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M8 7H4v4" />
                    <path d="M4 11a8 8 0 1 0 2.3-5.7L4 7" />
                  </svg>
                </button>

                <div class="medication-toolbar__actions">
                  <button class="action-btn action-btn--primary action-btn--toolbar" type="button" @click="createMedicationRecord">
                    ??
                  </button>
                  <button class="action-btn action-btn--ghost action-btn--toolbar" type="button" @click="openMedicationBatchActions">
                    ????
                  </button>
                </div>
              </div>

              <div class="medication-table-wrap">
                <table class="medication-table">
                  <thead>
                    <tr>
                      <th>??</th>
                      <th>??</th>
                      <th>????</th>
                      <th>????</th>
                      <th>????</th>
                      <th>??</th>
                      <th>????</th>
                      <th>????</th>
                      <th>???</th>
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
                          @click="toggleMedicationReminder(row.key)"
                        >
                          <span class="medication-switch__label">{{ row.reminderEnabled ? '??' : '??' }}</span>
                          <span class="medication-switch__dot"></span>
                        </button>
                      </td>
                      <td>{{ row.source }}</td>
                      <td>{{ row.creator }}</td>
                    </tr>

                    <tr v-if="medicationTableRows.length === 0">
                      <td colspan="9" class="medication-table__empty">???????????</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <footer class="medication-actions">
                <button class="action-btn action-btn--ghost" type="button" @click="goBack">??</button>
              </footer>
            </article>
          </template>

          <template v-else-if="activeTab === 'metrics'">
            <article class="panel-card">
              <header class="card-head">
                <div>
                  <h3>关键健康指标</h3>
                  <p>汇总设备同步与人工上报的核心数据</p>
                </div>
              </header>

              <div class="metric-grid">
                <article v-for="item in memberDetail.healthMetricCards" :key="item.label" class="metric-card">
                  <span>{{ item.label }}</span>
                  <strong>{{ item.value }}</strong>
                  <small>{{ item.unit }} · {{ item.helper }}</small>
                </article>
              </div>
            </article>

            <article class="panel-card">
              <header class="card-head">
                <div>
                  <h3>最近监测记录</h3>
                  <p>展示近期上传或采集到的有效数据</p>
                </div>
              </header>

              <div class="log-table">
                <article v-for="item in memberDetail.healthMetricLogs" :key="`${item.time}-${item.item}`" class="log-row">
                  <div class="log-row__title">
                    <strong>{{ item.item }}</strong>
                    <p>{{ item.time }}</p>
                  </div>

                  <div class="log-row__value">
                    <strong>{{ item.value }}</strong>
                    <span>{{ item.source }}</span>
                  </div>

                  <span class="tone-chip" :class="toneClass(item.tone)">{{ item.result }}</span>
                </article>
              </div>
            </article>
          </template>

          <template v-else-if="activeTab === 'device'">
            <article class="panel-card">
              <header class="card-head">
                <div>
                  <h3>绑定设备</h3>
                  <p>查看设备在线状态、位置与最近同步时间</p>
                </div>
              </header>

              <div class="device-grid">
                <article v-for="item in memberDetail.devices" :key="item.serial" class="device-card">
                  <div class="device-card__head">
                    <div>
                      <h4>{{ item.name }}</h4>
                      <p>{{ item.model }}</p>
                    </div>

                    <span class="tone-chip" :class="toneClass(item.tone)">{{ item.status }}</span>
                  </div>

                  <dl class="meta-list meta-list--device">
                    <div>
                      <dt>设备编号</dt>
                      <dd>{{ item.serial }}</dd>
                    </div>
                    <div>
                      <dt>位置</dt>
                      <dd>{{ item.location }}</dd>
                    </div>
                    <div>
                      <dt>最近同步</dt>
                      <dd>{{ item.lastSync }}</dd>
                    </div>
                  </dl>
                </article>
              </div>
            </article>
          </template>

          <template v-else-if="activeTab === 'report'">
            <article class="panel-card">
              <header class="card-head">
                <div>
                  <h3>报告信息</h3>
                  <p>评估报告、回访单与复诊建议统一归档</p>
                </div>
              </header>

              <div class="record-list">
                <article v-for="item in memberDetail.reports" :key="`${item.title}-${item.time}`" class="record-card">
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
            <article class="panel-card">
              <header class="card-head">
                <div>
                  <h3>订单信息</h3>
                  <p>围绕服务包、增购项目与执行状态进行管理</p>
                </div>
              </header>

              <div class="record-list">
                <article v-for="item in memberDetail.orders" :key="`${item.title}-${item.time}`" class="record-card">
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
            <article class="panel-card">
              <header class="card-head">
                <div>
                  <h3>资产概览</h3>
                  <p>包含套餐余量、积分与会员权益</p>
                </div>
              </header>

              <div class="metric-grid metric-grid--compact">
                <article v-for="item in memberDetail.assetMetrics" :key="item.label" class="metric-card">
                  <span>{{ item.label }}</span>
                  <strong>{{ item.value }}</strong>
                  <small>{{ item.helper }}</small>
                </article>
              </div>
            </article>

            <article class="panel-card">
              <header class="card-head">
                <div>
                  <h3>资产明细</h3>
                  <p>用于后台处理权益发放、到期提醒与核销</p>
                </div>
              </header>

              <div class="record-list">
                <article v-for="item in memberDetail.assetRecords" :key="item.title" class="record-card">
                  <div class="record-card__main">
                    <strong>{{ item.title }}</strong>
                    <p>{{ item.detail }}</p>
                  </div>

                  <div class="record-card__meta">
                    <span>{{ item.extra }}</span>
                  </div>

                  <span class="tone-chip" :class="toneClass(item.tone)">{{ item.status }}</span>
                </article>
              </div>
            </article>
          </template>

          <template v-else-if="activeTab === 'content'">
            <article class="panel-card">
              <header class="card-head">
                <div>
                  <h3>内容触达记录</h3>
                  <p>帮助运营查看课程、宣教与家属资料的消费情况</p>
                </div>
              </header>

              <div class="record-list">
                <article v-for="item in memberDetail.contents" :key="`${item.title}-${item.time}`" class="record-card">
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

          <template v-else-if="activeTab === 'service'">
            <article class="panel-card">
              <header class="card-head">
                <div>
                  <h3>服务记录</h3>
                  <p>展示近期回访、上门与预警闭环动作</p>
                </div>
              </header>

              <div class="timeline-list">
                <article v-for="item in memberDetail.serviceTimeline" :key="`${item.time}-${item.title}`" class="timeline-item">
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
          </template>
        </section>
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
  --brand-soft: #eaf6f0;
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
  background: var(--brand);
  color: #ffffff;
}

.action-btn--ghost {
  border-color: #dbe3e8;
  background: #ffffff;
  color: #30464c;
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
  border-color: #9ed0ba;
  background: #ffffff;
  color: var(--brand);
  box-shadow: 0 1px 2px rgba(45, 139, 104, 0.08);
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
  padding: 22px 24px 24px;
}

.profile-section + .profile-section {
  margin-top: 30px;
}

.profile-section--secondary {
  padding-top: 26px;
  border-top: 1px solid #edf1f4;
}

.profile-section__head {
  margin-bottom: 18px;
}

.profile-section__head h3 {
  margin: 0;
  color: var(--text-strong);
  font-size: 28px;
  line-height: 1.2;
}

.profile-form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px 24px;
}

.profile-field {
  display: grid;
  grid-template-columns: 100px minmax(0, 1fr);
  align-items: center;
  gap: 14px;
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
  font-size: 15px;
  line-height: 1.6;
  text-align: right;
}

.profile-field__value,
.profile-field__plain {
  min-width: 0;
  color: #22313a;
  font-size: 16px;
  line-height: 1.7;
  word-break: break-word;
}

.profile-field__value {
  min-height: 58px;
  padding: 15px 18px;
  border: 1px solid #e1e7ec;
  border-radius: 14px;
  background: #f5f7f8;
  box-sizing: border-box;
}

.profile-field--multiline .profile-field__value {
  min-height: 122px;
}

.profile-field__plain {
  padding: 0;
  font-weight: 700;
}

.profile-avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 74px;
  height: 74px;
  border-radius: 50%;
  background:
    radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.28), transparent 48%),
    linear-gradient(135deg, var(--profile-avatar-accent), var(--profile-avatar-shadow));
  color: #ffffff;
  font-size: 28px;
  font-weight: 800;
  letter-spacing: 0.04em;
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.14),
    0 10px 18px rgba(15, 23, 42, 0.08);
}

.profile-actions {
  display: flex;
  gap: 12px;
  margin-top: 30px;
  padding-top: 22px;
  border-top: 1px solid #edf1f4;
}

.panel-card--medication {
  padding: 18px 18px 22px;
}

.medication-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 18px;
}

.medication-search {
  flex: 1 1 auto;
}

.medication-search input {
  width: 100%;
  height: 58px;
  padding: 0 20px;
  border: 1px solid #e1e7ec;
  border-radius: 12px;
  background: #ffffff;
  color: #22313a;
  font: inherit;
  font-size: 16px;
  outline: none;
  box-sizing: border-box;
}

.medication-search input::placeholder {
  color: #a0aab2;
}

.medication-search input:focus {
  border-color: #9ed0ba;
  box-shadow: 0 0 0 3px rgba(45, 139, 104, 0.08);
}

.medication-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 58px;
  height: 58px;
  border: 1px solid #dbe3e8;
  border-radius: 12px;
  background: #ffffff;
  color: #42535a;
  transition:
    background 160ms ease,
    border-color 160ms ease,
    color 160ms ease,
    box-shadow 160ms ease;
}

.medication-icon-btn svg {
  width: 24px;
  height: 24px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.9;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.medication-icon-btn--brand {
  border-color: #41d2aa;
  background: #41d2aa;
  color: #ffffff;
}

.medication-toolbar__actions {
  display: flex;
  gap: 12px;
  margin-left: auto;
}

.action-btn--toolbar {
  min-width: 98px;
  height: 58px;
  padding: 0 24px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 700;
}

.medication-table-wrap {
  overflow-x: auto;
  border: 1px solid #edf1f4;
  border-radius: 14px;
  background: #ffffff;
}

.medication-table {
  width: 100%;
  min-width: 1080px;
  border-collapse: collapse;
}

.medication-table thead th {
  height: 78px;
  padding: 0 18px;
  background: #f7f8f9;
  color: #2a343b;
  font-size: 15px;
  font-weight: 700;
  text-align: left;
  white-space: nowrap;
}

.medication-table tbody td {
  padding: 0 18px;
  height: 80px;
  border-top: 1px solid #edf1f4;
  color: #34444c;
  font-size: 15px;
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
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  width: 94px;
  height: 36px;
  padding: 0 4px 0 14px;
  border: 0;
  border-radius: 999px;
  background: #d8e1e6;
  color: #ffffff;
  transition: background 160ms ease;
}

.medication-switch--active {
  background: #41d2aa;
}

.medication-switch__label {
  font-size: 14px;
  font-weight: 700;
}

.medication-switch__dot {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #ffffff;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.12);
}

.medication-actions {
  display: flex;
  gap: 12px;
  margin-top: 22px;
  padding-top: 18px;
  border-top: 1px solid #edf1f4;
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
  .detail-tabbar__item:hover {
    border-color: #bfdbcf;
    color: var(--brand);
  }

  .detail-tabbar__item:hover {
    background: #ffffff;
  }

  .medication-icon-btn:hover {
    border-color: #bfdbcf;
    color: var(--brand);
    box-shadow: 0 4px 12px rgba(15, 23, 42, 0.06);
  }

  .medication-icon-btn--brand:hover {
    border-color: #34c39a;
    background: #34c39a;
    color: #ffffff;
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
    font-size: 24px;
  }

  .medication-toolbar,
  .medication-toolbar__actions {
    flex-wrap: wrap;
  }

  .medication-toolbar__actions {
    margin-left: 0;
  }

  .medication-search {
    flex-basis: 100%;
  }

  .profile-form-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .profile-field,
  .profile-field--wide {
    grid-template-columns: 1fr;
    grid-column: auto;
    gap: 8px;
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

  .metric-card--hero {
    min-height: 116px;
    border-radius: 18px;
  }

  .info-item--wide {
    grid-column: auto;
  }
}
</style>
