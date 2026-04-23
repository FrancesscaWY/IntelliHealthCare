<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import type { PageComponentProps } from "@ihc/page-core/types";
import { getAdminWorkOrders, type AdminWorkOrderListItem } from "@/shared/api/work-orders";
import { clearAdminAuthSession } from "@/shared/auth/session";
import mock from "./mock";

const props = defineProps<PageComponentProps>();
const rows = ref(mock.rows);

const selectedType = ref(mock.serviceTypes[0]);
const assignStart = ref("2024-10-01");
const assignEnd = ref("2024-10-31");
const bookingStart = ref("2024-10-01");
const bookingEnd = ref("2024-10-31");
const keyword = ref("");
const activeStatus = ref(mock.statusTabs[0]);

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
  const second = `${date.getUTCSeconds()}`.padStart(2, "0");

  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

function formatMoney(value: number | null | undefined) {
  return Number(value || 0).toFixed(2);
}

function buildActions(status: string) {
  if (status === "待服务") {
    return [
      { label: "改单", tone: "green" as const },
      { label: "取消预约", tone: "red" as const },
      { label: "工单详情", tone: "green" as const },
      { label: "备注", tone: "green" as const }
    ];
  }

  if (status === "服务中") {
    return [
      { label: "工单详情", tone: "green" as const },
      { label: "备注", tone: "green" as const }
    ];
  }

  return [
    { label: "工单详情", tone: "green" as const },
    { label: "备注", tone: "green" as const }
  ];
}

function adaptRow(item: AdminWorkOrderListItem) {
  return {
    id: item.workOrderId,
    orderNo: item.orderNo,
    title: item.serviceTitle,
    cover:
      item.serviceCover ||
      "https://images.pexels.com/photos/7579831/pexels-photo-7579831.jpeg?auto=compress&cs=tinysrgb&w=320",
    project: `${item.serviceCategoryText}${item.serviceSummary ? `｜${item.serviceSummary}` : ""}`,
    amount: formatMoney(item.payableAmount),
    staff: item.assigneeName || "待分配",
    customerName: item.customerName,
    customerPhone: item.customerPhone,
    customerAvatar:
      item.customerAvatar ||
      "https://images.pexels.com/photos/6129501/pexels-photo-6129501.jpeg?auto=compress&cs=tinysrgb&w=240",
    assignTime: formatDateTime(item.createdAt),
    status: item.statusText,
    actions: buildActions(item.statusText)
  };
}

async function syncWorkOrdersFromApi() {
  try {
    const response = await getAdminWorkOrders({
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

    props.showToast(error instanceof Error ? error.message : "工单列表加载失败，已回退到演示数据");
  }
}

onMounted(() => {
  void syncWorkOrdersFromApi();
});

const filteredRows = computed(() =>
  rows.value.filter((row) => {
    const matchesType = selectedType.value === "全部类型" || row.project.includes(selectedType.value) || row.title.includes(selectedType.value);
    const matchesKeyword =
      !keyword.value.trim() || `${row.id}${row.orderNo}${row.title}${row.customerName}${row.customerPhone}`.includes(keyword.value.trim());
    const matchesStatus = row.status === activeStatus.value;
    return matchesType && matchesKeyword && matchesStatus;
  }),
);

function searchRows() {
  props.showToast(`已筛选 ${filteredRows.value.length} 条工单`);
}

function resetFilters() {
  selectedType.value = mock.serviceTypes[0];
  assignStart.value = "2024-10-01";
  assignEnd.value = "2024-10-31";
  bookingStart.value = "2024-10-01";
  bookingEnd.value = "2024-10-31";
  keyword.value = "";
  activeStatus.value = mock.statusTabs[0];
  props.showToast("筛选条件已重置");
}

function triggerAction(label: string, id?: string) {
  props.showToast(id ? `${label}：${id}` : `${label}功能为演示状态`);
}
</script>

<template>
  <section class="work-order-page">
    <article class="work-order-panel work-order-panel--filters">
      <header class="section-head">
        <span class="section-head__accent"></span>
        <h1>{{ mock.title }}</h1>
      </header>

      <div class="filters">
        <label class="field">
          <span class="field__label">服务类型</span>
          <div class="field__control field__control--select">
            <select v-model="selectedType">
              <option v-for="item in mock.serviceTypes" :key="item" :value="item">{{ item }}</option>
            </select>
            <svg viewBox="0 0 16 16" focusable="false" aria-hidden="true">
              <path d="m3 6 5 5 5-5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.7" />
            </svg>
          </div>
        </label>

        <label class="field field--date">
          <span class="field__label">派单日期</span>
          <div class="field__range">
            <div class="field__control">
              <input v-model="assignStart" type="date" />
            </div>
            <span class="field__split">~</span>
            <div class="field__control">
              <input v-model="assignEnd" type="date" />
              <svg viewBox="0 0 18 18" focusable="false" aria-hidden="true">
                <rect x="2.5" y="3.5" width="13" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="1.6" />
                <path d="M5.5 2.5v3M12.5 2.5v3M2.5 7.5h13" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.6" />
              </svg>
            </div>
          </div>
        </label>

        <label class="field field--date">
          <span class="field__label">预约日期</span>
          <div class="field__range">
            <div class="field__control">
              <input v-model="bookingStart" type="date" />
            </div>
            <span class="field__split">~</span>
            <div class="field__control">
              <input v-model="bookingEnd" type="date" />
              <svg viewBox="0 0 18 18" focusable="false" aria-hidden="true">
                <rect x="2.5" y="3.5" width="13" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="1.6" />
                <path d="M5.5 2.5v3M12.5 2.5v3M2.5 7.5h13" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.6" />
              </svg>
            </div>
          </div>
        </label>

        <label class="field field--keyword">
          <span class="field__label">关键字</span>
          <div class="field__control">
            <input v-model="keyword" type="text" placeholder="请输入关键字" @keydown.enter="searchRows" />
          </div>
        </label>

        <div class="field field--actions">
          <span class="field__label field__label--hidden">操作</span>
          <div class="filter-actions">
            <button class="action-button action-button--primary" type="button" @click="searchRows">
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

    <article class="work-order-panel work-order-panel--content">
      <header class="status-bar">
        <div class="status-tabs">
          <button
            v-for="item in mock.statusTabs"
            :key="item"
            class="status-tabs__item"
            :class="{ 'status-tabs__item--active': activeStatus === item }"
            type="button"
            @click="activeStatus = item"
          >
            {{ item }}
          </button>
        </div>

        <button class="toolbar-button" type="button" @click="triggerAction('批量操作')">批量操作</button>
      </header>

      <div class="table-head">
        <span>工单编号</span>
        <span>订单信息</span>
        <span>服务项目</span>
        <span>实付款（元）</span>
        <span>服务人员</span>
        <span>服务客户</span>
        <span>派单时间</span>
        <span>操作</span>
      </div>

      <div class="table-list">
        <article v-for="row in filteredRows" :key="row.id" class="table-row">
          <div class="cell cell--id">{{ row.id }}</div>
          <div class="cell cell--order">
            <img :src="row.cover" :alt="row.title" />
            <div>
              <strong>{{ row.title }}</strong>
              <span>{{ row.orderNo }}</span>
            </div>
          </div>
          <div class="cell">{{ row.project }}</div>
          <div class="cell">{{ row.amount }}</div>
          <div class="cell">{{ row.staff }}</div>
          <div class="cell cell--customer">
            <img :src="row.customerAvatar" :alt="row.customerName" />
            <div>
              <strong>{{ row.customerName }}</strong>
              <span>{{ row.customerPhone }}</span>
            </div>
          </div>
          <div class="cell">{{ row.assignTime }}</div>
          <div class="cell cell--actions">
            <button
              v-for="action in row.actions"
              :key="action.label"
              type="button"
              class="action-link"
              :class="`action-link--${action.tone}`"
              @click="triggerAction(action.label, row.id)"
            >
              {{ action.label }}
            </button>
          </div>
        </article>
      </div>

      <footer class="pagination">
        <span>共100条</span>
        <button type="button" class="pagination__ghost">每页10条</button>
        <button type="button" class="pagination__ghost">&lt;&lt;</button>
        <button type="button" class="pagination__ghost">&lt;</button>
        <button type="button" class="pagination__active">1</button>
        <button type="button" class="pagination__ghost">2</button>
        <button type="button" class="pagination__ghost">3</button>
        <button type="button" class="pagination__ghost">4</button>
        <button type="button" class="pagination__ghost">5</button>
        <button type="button" class="pagination__ghost">6</button>
        <button type="button" class="pagination__ghost">...</button>
        <button type="button" class="pagination__ghost">100</button>
        <button type="button" class="pagination__ghost">&gt;</button>
        <button type="button" class="pagination__ghost">&gt;&gt;</button>
        <span>前往第</span>
        <input type="text" value="1" />
        <span>页</span>
      </footer>
    </article>
  </section>
</template>

<style scoped>
.work-order-page {
  display: grid;
  gap: 14px;
  font-family: "PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.work-order-panel {
  border-radius: 16px;
  background: #ffffff;
  box-shadow: 0 6px 20px rgba(59, 103, 82, 0.05);
}

.work-order-panel--filters {
  padding: 14px 16px;
}

.work-order-panel--content {
  padding: 14px 14px 16px;
}

.section-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
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
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 0.01em;
}

.filters {
  display: grid;
  grid-template-columns: 0.9fr 1.1fr 1.1fr 1fr auto;
  gap: 12px 14px;
  align-items: end;
}

.field {
  display: grid;
  gap: 6px;
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
  min-height: 38px;
  padding: 0 10px;
  border: 1px solid #e9efec;
  border-radius: 8px;
  background: #ffffff;
}

.field__control input,
.field__control select {
  width: 100%;
  border: 0;
  background: transparent;
  color: #44515d;
  font-size: 12px;
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

.field__control svg {
  width: 16px;
  height: 16px;
  color: #c2c8ce;
}

.field__control--select svg {
  position: absolute;
  right: 12px;
}

.field__range {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  gap: 8px;
  align-items: center;
}

.field__split {
  color: #bcc5cc;
  font-size: 13px;
}

.filter-actions {
  display: flex;
  gap: 8px;
}

.action-button {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  padding: 0;
  border: 1px solid #dfe7e3;
  border-radius: 8px;
  background: #ffffff;
  color: #4b5560;
}

.action-button svg {
  width: 16px;
  height: 16px;
}

.action-button--primary {
  border-color: #39cf9d;
  background: #39cf9d;
  color: #ffffff;
}

.status-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 2px 6px 0;
}

.status-tabs {
  display: flex;
  gap: 24px;
}

.status-tabs__item {
  padding: 10px 0 12px;
  border: 0;
  border-bottom: 3px solid transparent;
  background: transparent;
  color: #2f3946;
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 0.01em;
}

.status-tabs__item--active {
  color: #39cf9d;
  border-bottom-color: #39cf9d;
}

.toolbar-button {
  min-width: 92px;
  height: 36px;
  padding: 0 14px;
  border: 1px solid #dfe7e3;
  border-radius: 8px;
  background: #ffffff;
  color: #34404d;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.01em;
}

.table-head {
  display: grid;
  grid-template-columns: 1.02fr 2fr 1.08fr 0.9fr 1.08fr 1.24fr 1.28fr 1.1fr;
  margin-top: 10px;
  padding: 16px 14px;
  border: 1px solid #eef2ef;
  background: #fafafa;
  color: #2f3946;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.01em;
}

.table-list {
  border: 1px solid #eef2ef;
  border-top: 0;
}

.table-row {
  display: grid;
  grid-template-columns: 1.02fr 2fr 1.08fr 0.9fr 1.08fr 1.24fr 1.28fr 1.1fr;
  border-top: 1px solid #eef2ef;
  background: #ffffff;
}

.table-row:first-child {
  border-top: 0;
}

.cell {
  display: flex;
  align-items: center;
  min-width: 0;
  padding: 12px 14px;
  color: #2f3946;
  font-size: 12px;
  font-weight: 400;
  letter-spacing: 0.01em;
  line-height: 1.45;
}

.cell--order,
.cell--customer {
  gap: 10px;
}

.cell--order img {
  width: 84px;
  height: 62px;
  border-radius: 8px;
  object-fit: cover;
}

.cell--order strong,
.cell--customer strong {
  display: block;
  color: #303b47;
  font-size: 12px;
  font-weight: 500;
  line-height: 1.4;
}

.cell--order span,
.cell--customer span {
  display: block;
  margin-top: 6px;
  color: #2f3946;
  font-size: 12px;
  font-weight: 400;
}

.cell--customer img {
  width: 46px;
  height: 46px;
  border-radius: 50%;
  object-fit: cover;
}

.cell--actions {
  flex-wrap: wrap;
  align-content: center;
  gap: 8px 14px;
}

.action-link {
  padding: 0;
  border: 0;
  background: transparent;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.01em;
}

.action-link--green {
  color: #39cf9d;
}

.action-link--red {
  color: #ff847c;
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding: 18px 4px 2px;
  color: #8f9aa5;
  font-size: 12px;
  font-weight: 400;
}

.pagination__ghost,
.pagination__active,
.pagination input {
  height: 36px;
  min-width: 36px;
  padding: 0 10px;
  border: 1px solid #eef2ef;
  border-radius: 6px;
  background: #ffffff;
  color: #55616d;
  font-size: 12px;
  font-weight: 500;
}

.pagination__active {
  border-color: #39cf9d;
  background: #39cf9d;
  color: #ffffff;
}

.pagination input {
  width: 44px;
  text-align: center;
  outline: none;
}

@media (max-width: 1500px) {
  .filters {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .status-bar {
    flex-direction: column;
    align-items: stretch;
  }

  .table-head,
  .table-row {
    grid-template-columns: 0.9fr 1.8fr 0.9fr 0.8fr 0.9fr 1.1fr 1.1fr 1fr;
  }
}
</style>
