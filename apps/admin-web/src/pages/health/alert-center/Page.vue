<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import type { PageComponentProps } from "@ihc/page-core/types";
import {
  getAdminHealthAlertDetail,
  getAdminHealthAlerts,
  type AdminHealthAlertDetail,
  type AdminHealthAlertListItem
} from "@/shared/api/health-alerts";
import { handleAdminPageError } from "@/shared/api/error";
import mock from "./mock";

const props = defineProps<PageComponentProps>();

const fallbackAlerts: AdminHealthAlertListItem[] = [
  {
    alertId: "demo-alert-bp",
    level: "HIGH",
    levelText: "高风险",
    status: "OPEN",
    statusText: "待回访",
    sourceType: "metric",
    title: "连续血压偏高",
    summary: "近 3 次血压记录高于个人基线，建议优先电话回访并确认用药。",
    relatedMetric: "血压",
    ownerId: "user_elder_joy",
    ownerName: "王强",
    ownerPhone: "13800138001",
    ownerAvatar: "/api/v1/assets/demo/avatars/avatar-1.jpg",
    followUpSuggestion: "客服今日内回访，确认头晕、胸闷、服药和复测计划。",
    triggeredAt: "2026-04-27 09:20",
    handledAt: null
  },
  {
    alertId: "demo-alert-glucose",
    level: "MEDIUM",
    levelText: "中风险",
    status: "ACKNOWLEDGED",
    statusText: "处理中",
    sourceType: "report",
    title: "空腹血糖波动",
    summary: "体检报告与家庭记录均提示血糖波动，需结合饮食与活动情况复核。",
    relatedMetric: "血糖",
    ownerId: "user_elder_ming",
    ownerName: "陈明",
    ownerPhone: "13900139001",
    ownerAvatar: "/api/v1/assets/demo/avatars/avatar-4.jpg",
    followUpSuggestion: "建议营养师复核近 7 天饮食，必要时推荐上门体检。",
    triggeredAt: "2026-04-27 08:36",
    handledAt: null
  }
];

const levelFilters = [
  { label: "全部等级", value: "" },
  { label: "紧急风险", value: "CRITICAL" },
  { label: "高风险", value: "HIGH" },
  { label: "中风险", value: "MEDIUM" },
  { label: "低风险", value: "LOW" }
];
const statusFilters = [
  { label: "全部状态", value: "" },
  { label: "待回访", value: "OPEN" },
  { label: "处理中", value: "ACKNOWLEDGED" },
  { label: "已关闭", value: "RESOLVED" }
];

const title = ref(mock.title);
const summary = ref(mock.summary);
const rows = ref<AdminHealthAlertListItem[]>(fallbackAlerts);
const selectedLevel = ref("");
const selectedStatus = ref("");
const keyword = ref("");
const detailOpen = ref(false);
const activeDetail = ref<AdminHealthAlertDetail | null>(null);

const filteredRows = computed(() => {
  const normalizedKeyword = keyword.value.trim().toLowerCase();

  return rows.value.filter((item) => {
    const matchesLevel = !selectedLevel.value || item.level === selectedLevel.value;
    const matchesStatus = !selectedStatus.value || item.status === selectedStatus.value;
    const matchesKeyword =
      !normalizedKeyword ||
      [item.title, item.summary, item.ownerName, item.ownerPhone, item.relatedMetric]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(normalizedKeyword));

    return matchesLevel && matchesStatus && matchesKeyword;
  });
});

const summaryCards = computed(() => {
  const source = filteredRows.value;
  return [
    { label: "待回访", value: source.filter((item) => item.status === "OPEN").length, tone: "rose" },
    { label: "处理中", value: source.filter((item) => item.status === "ACKNOWLEDGED").length, tone: "amber" },
    { label: "高风险", value: source.filter((item) => ["CRITICAL", "HIGH"].includes(item.level)).length, tone: "red" },
    { label: "已关闭", value: source.filter((item) => ["RESOLVED", "CLOSED"].includes(item.status)).length, tone: "green" }
  ];
});

function buildFallbackDetail(item: AdminHealthAlertListItem): AdminHealthAlertDetail {
  return {
    ...item,
    suggestion: {
      summary: item.followUpSuggestion
    },
    riskSignals: [item.summary],
    followUpSuggestions: [
      item.followUpSuggestion,
      "同步记录回访结果，必要时转入医生复核或服务推荐。"
    ],
    archiveTags: item.relatedMetric ? [item.relatedMetric, item.levelText] : [item.levelText],
    metricValue: null,
    handlerName: item.status === "OPEN" ? null : "客服小组"
  };
}

async function syncAlerts() {
  try {
    const response = await getAdminHealthAlerts({
      page: 1,
      pageSize: 100,
      level: selectedLevel.value || undefined,
      status: selectedStatus.value || undefined,
      keyword: keyword.value.trim() || undefined
    });

    title.value = response.title || mock.title;
    summary.value = response.summary || mock.summary;
    rows.value = response.list.length > 0 ? response.list : fallbackAlerts;
  } catch (error) {
    const handled = handleAdminPageError(error, {
      navigation: props.navigation,
      showToast: props.showToast,
      fallbackMessage: "健康告警加载失败，已回退到演示数据"
    });

    if (!handled) {
      rows.value = fallbackAlerts;
    }
  }
}

async function openDetail(row: AdminHealthAlertListItem) {
  try {
    activeDetail.value = await getAdminHealthAlertDetail(row.alertId);
  } catch {
    activeDetail.value = buildFallbackDetail(row);
  }

  detailOpen.value = true;
}

function closeDetail() {
  detailOpen.value = false;
  activeDetail.value = null;
}

function resetFilters() {
  selectedLevel.value = "";
  selectedStatus.value = "";
  keyword.value = "";
  void syncAlerts();
}

function submitSearch() {
  void syncAlerts();
}

function markFollowed(row: AdminHealthAlertListItem) {
  props.showToast(`已记录 ${row.ownerName} 的回访处理动作`);
}

onMounted(() => {
  void syncAlerts();
});
</script>

<template>
  <section class="alert-page">
    <article class="hero-panel">
      <div>
        <p class="eyebrow">AI 风险/回访</p>
        <h1>{{ title }}</h1>
        <p>{{ summary }}</p>
      </div>
      <div class="hero-stats">
        <article v-for="item in summaryCards" :key="item.label" :class="`stat-card stat-card--${item.tone}`">
          <span>{{ item.label }}</span>
          <strong>{{ item.value }}</strong>
        </article>
      </div>
    </article>

    <article class="filter-panel">
      <label>
        <span>风险等级</span>
        <select v-model="selectedLevel" @change="submitSearch">
          <option v-for="option in levelFilters" :key="option.value" :value="option.value">{{ option.label }}</option>
        </select>
      </label>
      <label>
        <span>处理状态</span>
        <select v-model="selectedStatus" @change="submitSearch">
          <option v-for="option in statusFilters" :key="option.value" :value="option.value">{{ option.label }}</option>
        </select>
      </label>
      <label class="keyword-field">
        <span>关键字</span>
        <input v-model="keyword" type="text" placeholder="姓名、手机号、指标" @keydown.enter="submitSearch" />
      </label>
      <div class="filter-actions">
        <button type="button" class="primary-button" @click="submitSearch">查询</button>
        <button type="button" class="ghost-button" @click="resetFilters">重置</button>
      </div>
    </article>

    <article class="table-panel">
      <table>
        <thead>
          <tr>
            <th>风险等级</th>
            <th>提醒内容</th>
            <th>长者</th>
            <th>异常指标</th>
            <th>回访建议</th>
            <th>状态</th>
            <th>触发时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in filteredRows" :key="row.alertId">
            <td><span class="level-pill" :class="`level-pill--${row.level.toLowerCase()}`">{{ row.levelText }}</span></td>
            <td>
              <strong>{{ row.title }}</strong>
              <p>{{ row.summary }}</p>
            </td>
            <td>
              <div class="owner-cell">
                <img :src="row.ownerAvatar || '/api/v1/assets/demo/avatars/avatar-1.jpg'" :alt="row.ownerName" />
                <div>
                  <strong>{{ row.ownerName }}</strong>
                  <span>{{ row.ownerPhone }}</span>
                </div>
              </div>
            </td>
            <td>{{ row.relatedMetric || "综合风险" }}</td>
            <td class="suggestion-cell">{{ row.followUpSuggestion }}</td>
            <td><span class="status-pill">{{ row.statusText }}</span></td>
            <td>{{ row.triggeredAt || "-" }}</td>
            <td>
              <div class="row-actions">
                <button type="button" @click="openDetail(row)">详情</button>
                <button type="button" @click="markFollowed(row)">回访</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </article>

    <section v-if="detailOpen && activeDetail" class="dialog-mask" @click.self="closeDetail">
      <article class="detail-dialog">
        <header>
          <div>
            <p class="eyebrow">告警详情</p>
            <h2>{{ activeDetail.title }}</h2>
          </div>
          <button type="button" aria-label="关闭" @click="closeDetail">×</button>
        </header>
        <div class="detail-grid">
          <article>
            <span>长者</span>
            <strong>{{ activeDetail.ownerName }}</strong>
            <p>{{ activeDetail.ownerPhone }}</p>
          </article>
          <article>
            <span>风险等级</span>
            <strong>{{ activeDetail.levelText }}</strong>
            <p>{{ activeDetail.statusText }}</p>
          </article>
          <article>
            <span>异常指标</span>
            <strong>{{ activeDetail.relatedMetric || "综合风险" }}</strong>
            <p>{{ activeDetail.metricValue ?? "待复测" }}</p>
          </article>
        </div>
        <section class="detail-block">
          <h3>风险信号</h3>
          <ul>
            <li v-for="item in activeDetail.riskSignals" :key="item">{{ item }}</li>
          </ul>
        </section>
        <section class="detail-block">
          <h3>AI 回访建议</h3>
          <ul>
            <li v-for="item in activeDetail.followUpSuggestions" :key="item">{{ item }}</li>
          </ul>
        </section>
      </article>
    </section>
  </section>
</template>

<style scoped>
.alert-page {
  display: grid;
  gap: 16px;
  color: #253244;
  font-family: "PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif;
}

.hero-panel,
.filter-panel,
.table-panel,
.detail-dialog {
  border: 1px solid #e4efeb;
  border-radius: 10px;
  background: #fff;
  box-shadow: 0 8px 24px rgba(66, 122, 116, 0.08);
}

.hero-panel {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 18px;
  align-items: center;
  padding: 20px;
}

.eyebrow {
  margin: 0 0 8px;
  color: #19a981;
  font-size: 12px;
  font-weight: 800;
}

.hero-panel h1,
.detail-dialog h2 {
  margin: 0;
  color: #24313f;
  font-size: 22px;
  font-weight: 900;
}

.hero-panel p {
  margin: 10px 0 0;
  color: #657184;
  font-size: 13px;
}

.hero-stats {
  display: grid;
  grid-template-columns: repeat(4, 96px);
  gap: 10px;
}

.stat-card {
  display: grid;
  gap: 6px;
  padding: 12px;
  border-radius: 8px;
  background: #f7fbfa;
}

.stat-card span {
  color: #667383;
  font-size: 12px;
  font-weight: 800;
}

.stat-card strong {
  color: var(--tone);
  font-size: 24px;
  font-weight: 900;
}

.stat-card--rose,
.stat-card--red {
  --tone: #f05d77;
}

.stat-card--amber {
  --tone: #e7a32d;
}

.stat-card--green {
  --tone: #20a67d;
}

.filter-panel {
  display: grid;
  grid-template-columns: 180px 180px minmax(220px, 1fr) auto;
  gap: 14px;
  align-items: end;
  padding: 16px;
}

.filter-panel label {
  display: grid;
  gap: 7px;
}

.filter-panel span {
  color: #8b96a3;
  font-size: 12px;
}

.filter-panel select,
.filter-panel input {
  height: 40px;
  padding: 0 12px;
  border: 1px solid #dce8e4;
  border-radius: 8px;
  background: #fff;
  color: #34404d;
  outline: none;
}

.filter-actions,
.row-actions {
  display: flex;
  gap: 8px;
}

.primary-button,
.ghost-button,
.row-actions button {
  height: 40px;
  padding: 0 14px;
  border: 1px solid #d8e6e2;
  border-radius: 8px;
  background: #fff;
  color: #34404d;
  font-weight: 700;
}

.primary-button {
  border-color: #20c596;
  background: #20c596;
  color: #fff;
}

.table-panel {
  overflow: auto;
}

table {
  width: 100%;
  min-width: 1120px;
  border-collapse: collapse;
}

th,
td {
  padding: 14px 16px;
  border-bottom: 1px solid #eef4f1;
  color: #53606e;
  font-size: 13px;
  text-align: left;
  vertical-align: top;
}

th {
  background: #f8fbfa;
  color: #263244;
  font-weight: 900;
}

td strong {
  display: block;
  margin-bottom: 5px;
  color: #253244;
}

td p {
  margin: 0;
  max-width: 280px;
  color: #6a7583;
  line-height: 1.45;
}

.owner-cell {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

.owner-cell img {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  object-fit: cover;
}

.owner-cell span {
  color: #8a96a3;
  font-size: 12px;
}

.level-pill,
.status-pill {
  display: inline-flex;
  align-items: center;
  height: 26px;
  padding: 0 10px;
  border-radius: 999px;
  background: #eef8f4;
  color: #1e9b78;
  font-size: 12px;
  font-weight: 900;
  white-space: nowrap;
}

.level-pill--critical,
.level-pill--high {
  background: #fff0f2;
  color: #e6536f;
}

.level-pill--medium {
  background: #fff7e8;
  color: #cc871d;
}

.suggestion-cell {
  max-width: 280px;
  line-height: 1.45;
  white-space: normal;
}

.dialog-mask {
  position: fixed;
  inset: 0;
  z-index: 40;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgba(15, 23, 42, 0.42);
}

.detail-dialog {
  width: min(760px, 100%);
  padding: 20px;
}

.detail-dialog header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
}

.detail-dialog header button {
  width: 36px;
  height: 36px;
  border: 0;
  border-radius: 50%;
  background: #eef5f2;
  color: #53606e;
  font-size: 24px;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-top: 18px;
}

.detail-grid article {
  padding: 14px;
  border-radius: 8px;
  background: #f7fbfa;
}

.detail-grid span,
.detail-block h3 {
  color: #83909d;
  font-size: 12px;
  font-weight: 800;
}

.detail-grid strong {
  display: block;
  margin-top: 8px;
  color: #24313f;
  font-size: 18px;
}

.detail-grid p {
  margin: 6px 0 0;
  color: #667383;
}

.detail-block {
  margin-top: 18px;
}

.detail-block h3 {
  margin: 0 0 10px;
}

.detail-block ul {
  display: grid;
  gap: 8px;
  margin: 0;
  padding-left: 18px;
  color: #4e5b68;
  line-height: 1.55;
}

@media (max-width: 980px) {
  .hero-panel,
  .filter-panel,
  .detail-grid {
    grid-template-columns: 1fr;
  }

  .hero-stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
