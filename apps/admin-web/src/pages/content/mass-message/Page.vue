<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import type { PageComponentProps } from "@ihc/page-core/types";
import {
  deleteAdminCampaign,
  getAdminCampaigns,
  withdrawAdminCampaign,
} from "@/shared/api/messaging";
import { handleAdminPageError } from "@/shared/api/error";
import mock from "./mock";

type CampaignRow = (typeof mock.rows)[number];

const props = defineProps<PageComponentProps>();
const pageData = ref<typeof mock>(mock);
const campaignStorageKey = "admin:content:selected-campaign-id";
const selectedStatus = ref<(typeof mock.statusOptions)[number]>(mock.statusOptions[0]);
const keyword = ref("");

const filteredRows = computed(() =>
  pageData.value.rows.filter((row) => {
    const matchesStatus = selectedStatus.value === pageData.value.statusOptions[0] || row.status === selectedStatus.value;
    const query = keyword.value.trim();
    const matchesKeyword = !query || `${row.title}${row.content}${row.receiver}${row.channel}`.includes(query);
    return matchesStatus && matchesKeyword;
  }),
);

function submitSearch() {
  props.showToast(`已筛选 ${filteredRows.value.length} 条消息`);
}

function resetFilters() {
  selectedStatus.value = pageData.value.statusOptions[0];
  keyword.value = "";
  props.showToast("筛选条件已重置");
}

function updateCampaignStorage(campaignId = "") {
  if (typeof window === "undefined") {
    return;
  }

  if (campaignId) {
    window.sessionStorage.setItem(campaignStorageKey, campaignId);
    return;
  }

  window.sessionStorage.removeItem(campaignStorageKey);
}

function openCreatePage() {
  updateCampaignStorage();
  props.navigation.navigateTo("content/mass-message-create");
}

function openEditPage(row: CampaignRow) {
  updateCampaignStorage(row.id);
  props.navigation.navigateTo("content/mass-message-create");
}

async function syncPageData() {
  try {
    pageData.value = (await getAdminCampaigns({
      page: 1,
      pageSize: 100,
    })) as typeof mock;
  } catch (error) {
    handleAdminPageError(error, {
      navigation: props.navigation,
      showToast: props.showToast,
      fallbackMessage: "消息群发列表加载失败，已回退到演示数据",
    });
  }
}

async function triggerAction(label: string, row?: CampaignRow) {
  if (!row) {
    props.showToast(`${label}功能为演示状态`);
    return;
  }

  if (label === "编辑") {
    openEditPage(row);
    return;
  }

  try {
    if (label === "删除") {
      await deleteAdminCampaign(row.id);
      pageData.value = {
        ...pageData.value,
        rows: pageData.value.rows.filter((item) => item.id !== row.id),
      };
      props.showToast(`已删除：${row.title}`);
      return;
    }

    if (label === "撤回") {
      await withdrawAdminCampaign(row.id);
      pageData.value = {
        ...pageData.value,
        rows: pageData.value.rows.map((item) =>
          item.id === row.id
            ? {
                ...item,
                status: "已撤回",
              }
            : item,
        ),
      };
      props.showToast(`已撤回：${row.title}`);
      return;
    }
  } catch (error) {
    handleAdminPageError(error, {
      navigation: props.navigation,
      showToast: props.showToast,
      fallbackMessage: `${label}失败，请稍后重试`,
    });
    return;
  }

  props.showToast(`${label}：${row.title}`);
}

function getStatusTone(status: string) {
  if (status === "已发送") {
    return "status-pill--sent";
  }

  if (status === "审批中") {
    return "status-pill--reviewing";
  }

  if (status === "已撤回") {
    return "status-pill--withdrawn";
  }

  return "status-pill--pending";
}

onMounted(() => {
  void syncPageData();
});
</script>

<template>
  <section class="mass-message-page">
    <article class="panel panel--filters">
      <header class="section-head">
        <span class="section-head__accent"></span>
        <h1>{{ pageData.title }}</h1>
      </header>

      <div class="filters">
        <label class="field">
          <span class="field__label">状态</span>
          <div class="field__control field__control--select">
            <select v-model="selectedStatus">
              <option v-for="item in pageData.statusOptions" :key="item" :value="item">{{ item }}</option>
            </select>
            <svg viewBox="0 0 16 16" focusable="false" aria-hidden="true">
              <path d="m3 6 5 5 5-5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.7" />
            </svg>
          </div>
        </label>

        <label class="field field--keyword">
          <span class="field__label field__label--hidden">关键词</span>
          <div class="field__control">
            <input v-model="keyword" type="text" placeholder="请输入关键词" @keydown.enter="submitSearch" />
          </div>
        </label>

        <div class="field field--actions">
          <span class="field__label field__label--hidden">操作</span>
          <div class="filter-actions">
            <button class="icon-button icon-button--primary" type="button" @click="submitSearch">
              <svg viewBox="0 0 20 20" focusable="false" aria-hidden="true">
                <circle cx="9" cy="9" r="5.6" fill="none" stroke="currentColor" stroke-width="1.8" />
                <path d="m13.3 13.3 4 4" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.8" />
              </svg>
            </button>
            <button class="icon-button" type="button" @click="resetFilters">
              <svg viewBox="0 0 20 20" focusable="false" aria-hidden="true">
                <path d="M4.7 8.6A6.2 6.2 0 1 1 6.2 14" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.8" />
                <path d="M4.4 3.8v5.1h5.1" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </article>

    <article class="panel panel--table">
      <header class="toolbar">
        <div></div>
        <div class="toolbar__actions">
          <button class="toolbar-button toolbar-button--primary" type="button" @click="openCreatePage">新增</button>
          <button class="toolbar-button" type="button" @click="triggerAction('批量操作')">批量操作</button>
        </div>
      </header>

      <div class="table-wrap">
        <div class="table-head">
          <span>发送时间</span>
          <span>消息标题</span>
          <span>状态</span>
          <span>消息内容</span>
          <span>接收人</span>
          <span>发送方式</span>
          <span>操作</span>
        </div>

        <div class="table-list">
          <article v-for="row in filteredRows" :key="row.id" class="table-row">
            <div class="cell">{{ row.sendTime }}</div>
            <div class="cell cell--title">{{ row.title }}</div>
            <div class="cell">
              <span class="status-pill" :class="getStatusTone(row.status)">
                <i></i>{{ row.status }}
              </span>
            </div>
            <div class="cell cell--content">{{ row.content }}</div>
            <div class="cell">{{ row.receiver }}</div>
            <div class="cell">{{ row.channel }}</div>
            <div class="cell cell--actions">
              <button type="button" class="table-link table-link--green" @click="triggerAction('编辑', row)">编辑</button>
              <button v-if="row.status === '已发送'" type="button" class="table-link table-link--green" @click="triggerAction('撤回', row)">撤回</button>
              <button type="button" class="table-link table-link--red" @click="triggerAction('删除', row)">删除</button>
            </div>
          </article>
        </div>
      </div>
    </article>
  </section>
</template>

<style scoped>
.mass-message-page {
  display: grid;
  gap: 18px;
  font-family: var(--admin-font-family);
  color: #2f3946;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.panel {
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 8px 24px rgba(59, 103, 82, 0.05);
}

.panel--filters {
  padding: 24px 28px 28px;
}

.panel--table {
  padding: 24px 28px 22px;
}

.section-head {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 28px;
}

.section-head__accent {
  width: 8px;
  height: 30px;
  border-radius: 999px;
  background: linear-gradient(180deg, #49d3ae 0%, #32c69d 100%);
}

.section-head h1 {
  margin: 0;
  color: #2f3946;
  font-size: 15px;
  font-weight: 600;
}

.filters {
  display: grid;
  grid-template-columns: 340px minmax(0, 1fr) auto;
  gap: 18px 22px;
  align-items: end;
}

.field {
  display: grid;
  gap: 10px;
}

.field--keyword {
  min-width: 0;
}

.field--actions {
  justify-self: start;
}

.field__label {
  color: #8f9aa6;
  font-size: 12px;
  line-height: 1.4;
}

.field__label--hidden {
  opacity: 0;
  pointer-events: none;
}

.field__control {
  position: relative;
  display: flex;
  align-items: center;
  min-height: 56px;
  padding: 0 18px;
  border: 1px solid #e2ebe7;
  border-radius: 12px;
  background: #ffffff;
}

.field__control input,
.field__control select {
  width: 100%;
  border: 0;
  background: transparent;
  color: #3f4c59;
  font-size: 13px;
  outline: none;
}

.field__control input::placeholder {
  color: #c2cad2;
}

.field__control--select select {
  appearance: none;
  padding-right: 24px;
}

.field__control--select svg {
  position: absolute;
  right: 18px;
  width: 16px;
  height: 16px;
  color: #c2c8ce;
}

.filter-actions {
  display: flex;
  gap: 12px;
}

.icon-button {
  display: grid;
  place-items: center;
  width: 56px;
  height: 56px;
  border: 1px solid #dfe7e3;
  border-radius: 12px;
  background: #ffffff;
  color: #46515d;
}

.icon-button svg {
  width: 22px;
  height: 22px;
}

.icon-button--primary {
  border-color: #41d1a7;
  background: linear-gradient(135deg, #41d1a7 0%, #35c59b 100%);
  color: #ffffff;
  box-shadow: 0 14px 28px rgba(60, 201, 159, 0.18);
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.toolbar__actions {
  display: flex;
  gap: 14px;
}

.toolbar-button {
  min-width: 96px;
  height: 56px;
  padding: 0 20px;
  border: 1px solid #dfe7e3;
  border-radius: 12px;
  background: #ffffff;
  color: #34404d;
  font-size: 13px;
  font-weight: 500;
}

.toolbar-button--primary {
  border-color: #41d1a7;
  background: linear-gradient(135deg, #41d1a7 0%, #35c59b 100%);
  color: #ffffff;
}

.table-wrap {
  overflow: hidden;
  border: 1px solid #edf2ef;
  border-radius: 16px;
}

.table-head,
.table-row {
  display: grid;
  grid-template-columns: 1.05fr 0.95fr 0.72fr 2fr 0.75fr 0.75fr 0.72fr;
}

.table-head {
  min-height: 76px;
  background: #fafcfa;
  color: #2f3946;
  font-size: 13px;
  font-weight: 600;
}

.table-head > span {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 14px;
  text-align: center;
}

.table-list {
  display: grid;
}

.table-row {
  border-top: 1px solid #edf2ef;
}

.cell {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
  padding: 16px 14px;
  color: #3d4954;
  font-size: 12px;
  line-height: 1.5;
  text-align: center;
}

.cell--title {
  color: #42505c;
  font-size: 13px;
  font-weight: 500;
}

.cell--content {
  color: #4e5b67;
  font-size: 12px;
  line-height: 1.55;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}

.status-pill i {
  width: 11px;
  height: 11px;
  border-radius: 50%;
  background: currentColor;
}

.status-pill--pending {
  color: #43d0a6;
}

.status-pill--sent {
  color: #40a0ff;
}

.status-pill--reviewing {
  color: #ffbe55;
}

.status-pill--withdrawn {
  color: #ff8b84;
}

.cell--actions {
  gap: 18px;
}

.table-link {
  padding: 0;
  border: 0;
  background: transparent;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
}

.table-link--green {
  color: #42d1a6;
}

.table-link--red {
  color: #ff8b84;
}

@media (max-width: 1380px) {
  .filters {
    grid-template-columns: 280px minmax(0, 1fr) auto;
  }

  .table-wrap {
    overflow-x: auto;
  }

  .table-head,
  .table-row {
    min-width: 1120px;
  }
}

@media (max-width: 980px) {
  .panel--filters,
  .panel--table {
    padding: 18px;
  }

  .filters {
    grid-template-columns: 1fr;
  }

  .field--actions {
    justify-self: stretch;
  }

  .toolbar {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }

  .toolbar__actions {
    justify-content: flex-end;
  }
}
</style>
