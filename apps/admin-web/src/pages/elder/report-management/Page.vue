<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import type { PageComponentProps } from "@ihc/page-core/types";
import { getAdminReports, type AdminReportListItem } from "@/shared/api/reports";
import { clearAdminAuthSession } from "@/shared/auth/session";
import mock from "./mock";

const props = defineProps<PageComponentProps>();
const rows = ref(mock.rows);

const selectedType = ref(mock.reportTypes[0]);
const keyword = ref("");
const selectedIds = ref<string[]>([]);

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const year = date.getUTCFullYear();
  const month = `${date.getUTCMonth() + 1}`.padStart(2, "0");
  const day = `${date.getUTCDate()}`.padStart(2, "0");
  const hour = `${date.getUTCHours()}`.padStart(2, "0");
  const minute = `${date.getUTCMinutes()}`.padStart(2, "0");

  return `${year}-${month}-${day} ${hour}:${minute}`;
}

function adaptRow(item: AdminReportListItem) {
  return {
    id: item.reportId,
    uploadedAt: formatDateTime(item.createdAt),
    userName: item.elderName || item.elderPhone || "未命名用户",
    avatar: "/api/v1/assets/demo/avatars/avatar-1.jpg",
    reportName: item.title,
    reportType: item.typeText,
    source: item.source,
    uploader: item.uploader,
    ticketNo: item.orderNo || "-",
    reportDate: item.reportDate || "-"
  };
}

async function syncReportsFromApi() {
  try {
    const response = await getAdminReports({
      page: 1,
      pageSize: 100
    });
    const nextRows = response.list.map(adaptRow);

    if (nextRows.length > 0) {
      rows.value = nextRows;
    }
  } catch (error) {
    const status = typeof error === "object" && error !== null && "status" in error ? Number(error.status) : 0;

    if (status === 401 || status === 403) {
      clearAdminAuthSession();
      props.showToast(error instanceof Error ? error.message : "后台鉴权失败，请重新登录");
      props.navigation.reLaunch("auth/login");
      return;
    }

    props.showToast(error instanceof Error ? error.message : "报告列表加载失败，已回退到演示数据");
  }
}

onMounted(() => {
  void syncReportsFromApi();
});

const filteredRows = computed(() =>
  rows.value.filter((row) => {
    const matchesType = selectedType.value === "全部类型" || row.reportType === selectedType.value;
    const matchesKeyword =
      !keyword.value.trim() ||
      `${row.userName}${row.reportName}${row.ticketNo}${row.uploader}`.includes(keyword.value.trim());
    return matchesType && matchesKeyword;
  }),
);

const allChecked = computed({
  get() {
    return filteredRows.value.length > 0 && filteredRows.value.every((row) => selectedIds.value.includes(row.id));
  },
  set(checked: boolean) {
    selectedIds.value = checked ? filteredRows.value.map((row) => row.id) : [];
  },
});

function toggleRow(id: string, checked: boolean) {
  selectedIds.value = checked ? [...new Set([...selectedIds.value, id])] : selectedIds.value.filter((item) => item !== id);
}

function submitSearch() {
  props.showToast(`已筛选 ${filteredRows.value.length} 份报告`);
}

function resetFilters() {
  selectedType.value = mock.reportTypes[0];
  keyword.value = "";
  selectedIds.value = [];
  props.showToast("筛选条件已重置");
}

function openAction(label: string, value?: string) {
  props.showToast(value ? `${label}：${value}` : `${label}功能为演示状态`);
}
</script>

<template>
  <section class="report-page">
    <article class="report-panel report-panel--filters">
      <header class="section-head">
        <span class="section-head__accent"></span>
        <h1>{{ mock.title }}</h1>
      </header>

      <div class="filters">
        <label class="field">
          <span class="field__label">报告类型</span>
          <div class="field__control field__control--select">
            <select v-model="selectedType">
              <option v-for="option in mock.reportTypes" :key="option" :value="option">{{ option }}</option>
            </select>
            <svg viewBox="0 0 16 16" focusable="false" aria-hidden="true">
              <path d="m3 6 5 5 5-5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.7" />
            </svg>
          </div>
        </label>

        <label class="field field--keyword">
          <span class="field__label">关键字</span>
          <div class="field__control">
            <input v-model="keyword" type="text" placeholder="请输入关键字" @keydown.enter="submitSearch" />
          </div>
        </label>

        <div class="field field--actions">
          <span class="field__label field__label--hidden">操作</span>
          <div class="filter-actions">
            <button class="action-button action-button--primary" type="button" @click="submitSearch">
              <svg viewBox="0 0 20 20" focusable="false" aria-hidden="true">
                <circle cx="9" cy="9" r="5.6" fill="none" stroke="currentColor" stroke-width="1.8" />
                <path d="m13.3 13.3 4 4" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.8" />
              </svg>
            </button>
            <button class="action-button action-button--ghost" type="button" @click="resetFilters">
              <svg viewBox="0 0 20 20" focusable="false" aria-hidden="true">
                <path d="M4.7 8.6A6.2 6.2 0 1 1 6.2 14" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.8" />
                <path d="M4.4 3.8v5.1h5.1" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </article>

    <article class="report-panel report-panel--table">
      <header class="toolbar">
        <div></div>
        <div class="toolbar__actions">
          <button class="toolbar-button toolbar-button--primary" type="button" @click="openAction('上传报告')">上传</button>
          <button class="toolbar-button" type="button" @click="openAction('批量操作', `${selectedIds.length}项`)">批量操作</button>
        </div>
      </header>

      <div class="table-wrap">
        <table class="report-table">
          <thead>
            <tr>
              <th class="col-check">
                <input v-model="allChecked" type="checkbox" />
              </th>
              <th>上传时间</th>
              <th>所属用户</th>
              <th>报告名称</th>
              <th>报告类型</th>
              <th>报告来源</th>
              <th>上传人</th>
              <th>关联工单</th>
              <th>报告日期</th>
              <th>操作</th>
            </tr>
          </thead>

          <tbody>
            <tr v-for="row in filteredRows" :key="row.id">
              <td class="col-check">
                <input :checked="selectedIds.includes(row.id)" type="checkbox" @change="toggleRow(row.id, ($event.target as HTMLInputElement).checked)" />
              </td>
              <td>{{ row.uploadedAt }}</td>
              <td>
                <div class="user-cell">
                  <img :src="row.avatar" :alt="row.userName" />
                  <span>{{ row.userName }}</span>
                </div>
              </td>
              <td>{{ row.reportName }}</td>
              <td>{{ row.reportType }}</td>
              <td>{{ row.source }}</td>
              <td>{{ row.uploader }}</td>
              <td>{{ row.ticketNo }}</td>
              <td>{{ row.reportDate }}</td>
              <td>
                <div class="table-actions">
                  <button type="button" class="table-link table-link--green" @click="openAction('下载报告', row.reportName)">下载</button>
                  <button type="button" class="table-link table-link--red" @click="openAction('删除报告', row.reportName)">删除</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </article>
  </section>
</template>

<style scoped>
.report-page {
  display: grid;
  gap: 18px;
  font-family: "PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.report-panel {
  border-radius: 16px;
  background: #ffffff;
  box-shadow: 0 6px 20px rgba(59, 103, 82, 0.05);
}

.report-panel--filters {
  padding: 18px 20px;
}

.report-panel--table {
  padding: 16px 18px 18px;
}

.section-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 18px;
}

.section-head__accent {
  width: 6px;
  height: 22px;
  border-radius: 999px;
  background: #10c89a;
}

.section-head h1 {
  margin: 0;
  color: #2f3946;
  font-size: 15px;
  font-weight: 500;
  letter-spacing: 0.01em;
}

.filters {
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr) auto;
  gap: 16px;
  align-items: end;
}

.field {
  display: grid;
  gap: 8px;
}

.field__label {
  color: #8f9aa6;
  font-size: 12px;
  font-weight: 400;
  letter-spacing: 0.01em;
}

.field__label--hidden {
  opacity: 0;
  pointer-events: none;
}

.field__control {
  position: relative;
  display: flex;
  align-items: center;
  min-height: 42px;
  padding: 0 12px;
  border: 1px solid #e9efec;
  border-radius: 10px;
  background: #ffffff;
}

.field__control input,
.field__control select {
  width: 100%;
  border: 0;
  background: transparent;
  color: #44515d;
  font-size: 13px;
  font-weight: 400;
  letter-spacing: 0.01em;
  outline: none;
}

.field__control input::placeholder {
  color: #c1c8cf;
}

.field__control--select select {
  appearance: none;
  padding-right: 18px;
}

.field__control--select svg {
  position: absolute;
  right: 12px;
  width: 16px;
  height: 16px;
  color: #c2c8ce;
}

.filter-actions {
  display: flex;
  gap: 10px;
}

.action-button {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  padding: 0;
  border: 1px solid #dfe7e3;
  border-radius: 10px;
  background: #ffffff;
  color: #4b5560;
}

.action-button svg {
  width: 18px;
  height: 18px;
}

.action-button--primary {
  border-color: #39cf9d;
  background: #39cf9d;
  color: #ffffff;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.toolbar__actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.toolbar-button {
  min-width: 92px;
  height: 40px;
  padding: 0 16px;
  border: 1px solid #dfe7e3;
  border-radius: 10px;
  background: #ffffff;
  color: #34404d;
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.01em;
}

.toolbar-button--primary {
  border-color: #39cf9d;
  background: #39cf9d;
  color: #ffffff;
}

.table-wrap {
  overflow: auto;
  border: 1px solid #edf2ef;
  border-radius: 12px;
}

.report-table {
  width: 100%;
  min-width: 1240px;
  border-collapse: collapse;
}

.report-table th,
.report-table td {
  padding: 14px 14px;
  border-bottom: 1px solid #f0f3f1;
  color: #55606c;
  font-size: 13px;
  font-weight: 400;
  letter-spacing: 0.01em;
  text-align: left;
  white-space: nowrap;
}

.report-table thead th {
  background: #fafafa;
  color: #2f3946;
  font-size: 13px;
  font-weight: 500;
}

.col-check {
  width: 44px;
  min-width: 44px;
  text-align: center;
}

.report-table input[type="checkbox"] {
  width: 18px;
  height: 18px;
  accent-color: #39cf9d;
}

.user-cell {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

.user-cell img {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  object-fit: cover;
  filter: grayscale(1);
}

.table-actions {
  display: inline-flex;
  align-items: center;
  gap: 18px;
}

.table-link {
  padding: 0;
  border: 0;
  background: transparent;
  font-size: 13px;
  font-weight: 400;
  letter-spacing: 0.01em;
}

.table-link--green {
  color: #39cf9d;
}

.table-link--red {
  color: #ff8c86;
}

@media (max-width: 1180px) {
  .filters {
    grid-template-columns: 1fr;
  }

  .toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .toolbar__actions {
    justify-content: flex-end;
  }
}
</style>
