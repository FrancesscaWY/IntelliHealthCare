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

const campaignSummary = computed(() => {
  const rows = pageData.value.rows;
  return [
    { label: "消息总数", value: String(rows.length).padStart(2, "0") },
    { label: "已发送", value: String(rows.filter((row) => row.status === "已发送").length).padStart(2, "0") },
    { label: "待发送", value: String(rows.filter((row) => row.status === "待发送").length).padStart(2, "0") },
    { label: "审批中", value: String(rows.filter((row) => row.status === "审批中").length).padStart(2, "0") },
  ];
});

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
    <article class="hero-card">
      <div class="hero-card__main">
        <div class="hero-card__copy">
          <h1>{{ pageData.title }}</h1>
          <p>统一管理消息发送节奏、审批状态和触达对象，让群发消息页与前面后台页面保持一致的轻盈运营视觉。</p>
        </div>

        <div class="hero-card__stats">
          <article v-for="item in campaignSummary" :key="item.label" class="hero-stat">
            <span>{{ item.label }}</span>
            <strong>{{ item.value }}</strong>
          </article>
        </div>
      </div>
    </article>

    <article class="panel panel--filters surface-card">
      <header class="panel-head">
        <div>
          <h2>筛选条件 <small>按状态和关键词快速检索消息</small></h2>
        </div>
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

    <article class="panel panel--table surface-card">
      <header class="toolbar">
        <div class="toolbar__copy">
          <h2>消息列表 <small>当前显示 {{ filteredRows.length }} 条</small></h2>
        </div>
        <div class="toolbar__actions">
          <button class="toolbar-button toolbar-button--primary" type="button" @click="openCreatePage">新增消息</button>
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
  width: 100%;
  min-width: 0;
  font-family: var(--admin-font-family);
  color: #253244;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.hero-card,
.surface-card {
  border: 1px solid rgba(224, 240, 238, 0.86);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 8px 24px rgba(66, 122, 116, 0.08);
}

.hero-card {
  overflow: hidden;
  padding: 20px 22px;
  background:
    radial-gradient(circle at top right, rgba(170, 235, 255, 0.3), transparent 24%),
    radial-gradient(circle at left top, rgba(102, 214, 174, 0.16), transparent 28%),
    linear-gradient(135deg, rgba(255, 255, 255, 0.99), rgba(245, 251, 248, 0.96));
}

.hero-card__main {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
}

.hero-card__copy h1 {
  margin: 0;
  color: #1f6f67;
  font-size: 28px;
  font-weight: 900;
  line-height: 1.15;
}

.hero-card__copy p {
  max-width: 720px;
  margin: 12px 0 0;
  color: #5d6876;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.65;
}

.hero-card__stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(96px, 1fr));
  gap: 12px;
  min-width: 452px;
}

.hero-stat {
  padding: 14px 16px;
  border: 1px solid rgba(214, 233, 227, 0.94);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.86);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.9);
}

.hero-stat span {
  display: block;
  color: #7b8793;
  font-size: 12px;
  font-weight: 800;
}

.hero-stat strong {
  display: block;
  margin-top: 10px;
  color: #263244;
  font-size: 28px;
  font-weight: 900;
  line-height: 1;
}

.panel--filters {
  padding: 20px 22px 22px;
}

.panel--table {
  padding: 20px 22px 22px;
}

.panel-head,
.toolbar__copy {
  display: flex;
  align-items: center;
  gap: 12px;
}

.panel-head {
  margin-bottom: 18px;
}

.panel-head h2,
.toolbar__copy h2 {
  margin: 0;
  color: #1f6f67;
  font-size: 18px;
  font-weight: 900;
  line-height: 1.2;
}

.panel-head small,
.toolbar__copy small {
  color: #557c77;
  font-size: 14px;
  font-weight: 900;
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
  border: 1px solid #dfeae6;
  border-radius: 14px;
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
  border-radius: 14px;
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
  gap: 16px;
  margin-bottom: 20px;
}

.toolbar__actions {
  display: flex;
  gap: 14px;
}

.toolbar-button {
  min-width: 108px;
  height: 48px;
  padding: 0 20px;
  border: 1px solid #dfe7e3;
  border-radius: 14px;
  background: #ffffff;
  color: #34404d;
  font-size: 13px;
  font-weight: 700;
}

.toolbar-button--primary {
  border-color: #41d1a7;
  background: linear-gradient(135deg, #41d1a7 0%, #35c59b 100%);
  color: #ffffff;
  box-shadow: 0 14px 28px rgba(60, 201, 159, 0.18);
}

.table-wrap {
  overflow: hidden;
  border: 1px solid #edf2ef;
  border-radius: 16px;
  background: #ffffff;
}

.table-head,
.table-row {
  display: grid;
  grid-template-columns: 1.05fr 0.95fr 0.72fr 2fr 0.75fr 0.75fr 0.72fr;
}

.table-head {
  min-height: 76px;
  background: linear-gradient(180deg, #f7fbf9, #fbfdfc);
  color: #2f3946;
  font-size: 13px;
  font-weight: 800;
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

.table-row:nth-child(even) {
  background: rgba(248, 251, 250, 0.72);
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
  font-weight: 800;
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
  font-weight: 800;
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
  font-weight: 800;
  white-space: nowrap;
}

.table-link--green {
  color: #42d1a6;
}

.table-link--red {
  color: #ff8b84;
}

@media (max-width: 1380px) {
  .hero-card__main {
    flex-direction: column;
  }

  .hero-card__stats {
    min-width: 0;
    width: 100%;
  }

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

  .hero-card__stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
