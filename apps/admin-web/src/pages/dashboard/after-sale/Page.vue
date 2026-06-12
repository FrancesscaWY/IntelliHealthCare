<script setup lang="ts">
import { computed, onActivated, onMounted, ref } from "vue";
import type { PageComponentProps } from "@ihc/page-core/types";
import { getAdminAfterSales } from "@/shared/api/dashboard";
import { handleAdminPageError } from "@/shared/api/error";
import mockSeed, { replaceAfterSaleRows, type AfterSaleRow } from "./mock";
import { afterSaleDetailStorageKey } from "../after-sale-detail/mock";
import { orderDetailStorageKey } from "../order-list/mock";

const props = defineProps<PageComponentProps>();
const mock = ref<typeof mockSeed>(mockSeed);

const minRefund = ref("");
const maxRefund = ref("");
const startDate = ref("2023-03-01");
const endDate = ref("2023-03-31");
const keyword = ref("");
const activeStatus = ref("全部");
const filteredRows = computed(() =>
  mock.value.rows.filter((row) => {
    const matchesStatus = activeStatus.value === "全部" || row.status === activeStatus.value;
    const matchesKeyword =
      !keyword.value.trim() || `${row.orderNo}${row.afterSaleNo}${row.title}`.includes(keyword.value.trim());
    const matchesMin = !minRefund.value || Number(row.refundAmount) >= Number(minRefund.value);
    const matchesMax = !maxRefund.value || Number(row.refundAmount) <= Number(maxRefund.value);
    const appliedDate = row.appliedAt.slice(0, 10);
    const matchesDate = (!startDate.value || appliedDate >= startDate.value) && (!endDate.value || appliedDate <= endDate.value);
    return matchesStatus && matchesKeyword && matchesMin && matchesMax && matchesDate;
  }),
);

async function syncPageData() {
  try {
    const response = (await getAdminAfterSales({
      page: 1,
      pageSize: 100,
      status: activeStatus.value !== "全部" ? activeStatus.value : undefined,
      keyword: keyword.value.trim() || undefined,
    })) as typeof mockSeed;
    mock.value = response;
    replaceAfterSaleRows(response.rows);
  } catch (error) {
    handleAdminPageError(error, {
      navigation: props.navigation,
      showToast: props.showToast,
      fallbackMessage: "售后管理列表加载失败，已回退到演示数据",
    });
  }
}

async function searchRows() {
  await syncPageData();
  props.showToast(`已筛选 ${filteredRows.value.length} 条售后记录`);
}

function resetFilters() {
  minRefund.value = "";
  maxRefund.value = "";
  startDate.value = "2023-03-01";
  endDate.value = "2023-03-31";
  keyword.value = "";
  activeStatus.value = "全部";
  void syncPageData();
  props.showToast("筛选条件已重置");
}

function navigateWithStorage(pageId: string, storageKey: string, value: string) {
  if (typeof window !== "undefined") {
    window.sessionStorage.setItem(storageKey, value);
  }

  props.navigation.navigateTo(pageId);

  const nextStack = props.navigation.getStack();
  const activePageId = nextStack[nextStack.length - 1] || "";

  if (activePageId !== pageId) {
    props.navigation.reLaunch(pageId);
  }
}

function triggerAction(label: string, row?: AfterSaleRow) {
  if (!row) {
    props.showToast(`${label}功能为演示状态`);
    return;
  }

  if (label === "售后详情") {
    navigateWithStorage("dashboard/after-sale-detail", afterSaleDetailStorageKey, row.afterSaleNo);
    return;
  }

  if (label === "订单详情") {
    navigateWithStorage("dashboard/order-detail", orderDetailStorageKey, row.orderId || row.orderNo);
    return;
  }

  props.showToast(`${label}：${row.afterSaleNo}`);
}

onMounted(() => {
  void syncPageData();
});

onActivated(() => {
  void syncPageData();
});
</script>

<template>
  <section class="after-sale-page">
    <article class="after-sale-panel after-sale-panel--filters">
      <header class="section-head">
        <span class="section-head__accent"></span>
        <h1>{{ mock.title }}</h1>
      </header>

      <div class="filters">
        <div class="field field--price">
          <span class="field__label">退款金额</span>
          <div class="field__range">
            <div class="field__control">
              <input v-model="minRefund" type="text" placeholder="最低价格" />
            </div>
            <span class="field__split">-</span>
            <div class="field__control">
              <input v-model="maxRefund" type="text" placeholder="最高价格" />
            </div>
          </div>
        </div>

        <label class="field field--date">
          <span class="field__label">申请日期</span>
          <div class="field__range">
            <div class="field__control">
              <input v-model="startDate" type="date" />
            </div>
            <span class="field__split">~</span>
            <div class="field__control">
              <input v-model="endDate" type="date" />
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

    <article class="after-sale-panel after-sale-panel--content">
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
      </header>

      <div class="table-head">
        <span>商品信息</span>
        <span>实付款（元）</span>
        <span>申请退款金额（元）</span>
        <span>售后状态</span>
        <span>售后申请时间</span>
        <span>操作</span>
      </div>

      <div class="card-list">
        <article v-for="row in filteredRows" :key="`${row.orderNo}-${row.status}`" class="after-card">
          <header class="after-card__meta">
            <span>订单编号: {{ row.orderNo }}</span>
            <span>售后编号: {{ row.afterSaleNo }}</span>
          </header>

          <div class="after-card__body">
            <div class="after-card__product">
              <img :src="row.image" :alt="row.title" />
              <strong>{{ row.title }}</strong>
            </div>
            <div class="after-card__amount">¥{{ row.paidAmount }}</div>
            <div class="after-card__amount">¥{{ row.refundAmount }}</div>
            <div class="after-card__status">{{ row.status }}</div>
            <div class="after-card__time">{{ row.appliedAt }}</div>
            <div class="after-card__actions">
              <button type="button" class="action-link" @click="triggerAction('售后详情', row)">售后详情</button>
              <button type="button" class="action-link" @click="triggerAction('订单详情', row)">订单详情</button>
            </div>
          </div>
        </article>
      </div>

      <footer class="pagination">
        <span>共{{ filteredRows.length }}条</span>
        <button type="button" class="pagination__ghost">每页10条</button>
        <button type="button" class="pagination__ghost">&lt;&lt;</button>
        <button type="button" class="pagination__ghost">&lt;</button>
        <button type="button" class="pagination__active">1</button>
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
.after-sale-page {
  display: grid;
  gap: 18px;
  font-family: "PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.after-sale-panel {
  border-radius: 16px;
  background: #ffffff;
  box-shadow: 0 6px 20px rgba(59, 103, 82, 0.05);
}

.after-sale-panel--filters {
  padding: 18px 20px;
}

.after-sale-panel--content {
  padding: 18px 18px 20px;
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
  grid-template-columns: 1.1fr 1.1fr 1fr auto;
  gap: 16px 18px;
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

.field__control input {
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

.field__control svg {
  width: 16px;
  height: 16px;
  color: #c2c8ce;
}

.field__range {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  gap: 10px;
  align-items: center;
}

.field__split {
  color: #bcc5cc;
  font-size: 13px;
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

.status-bar {
  padding: 6px 10px 0;
}

.status-tabs {
  display: flex;
  gap: 32px;
}

.status-tabs__item {
  padding: 12px 0 16px;
  border: 0;
  border-bottom: 4px solid transparent;
  background: transparent;
  color: #2f3946;
  font-size: 15px;
  font-weight: 500;
  letter-spacing: 0.01em;
}

.status-tabs__item--active {
  color: #39cf9d;
  border-bottom-color: #39cf9d;
}

.table-head {
  display: grid;
  grid-template-columns: 2fr 0.8fr 1fr 1fr 1.2fr 0.9fr;
  margin-top: 14px;
  padding: 22px 18px;
  border: 1px solid #eef2ef;
  background: #fafafa;
  color: #2f3946;
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.01em;
}

.card-list {
  display: grid;
  gap: 18px;
  margin-top: 16px;
}

.after-card {
  border: 1px solid #eef2ef;
  background: #ffffff;
}

.after-card__meta {
  display: flex;
  gap: 38px;
  padding: 16px 18px;
  border-bottom: 1px solid #eef2ef;
  color: #a2aab3;
  font-size: 12px;
  font-weight: 400;
  letter-spacing: 0.01em;
}

.after-card__body {
  display: grid;
  grid-template-columns: 2fr 0.8fr 1fr 1fr 1.2fr 0.9fr;
}

.after-card__body > div {
  min-width: 0;
  padding: 18px;
  border-right: 1px solid #eef2ef;
}

.after-card__body > div:last-child {
  border-right: 0;
}

.after-card__product {
  display: grid;
  grid-template-columns: 104px minmax(0, 1fr);
  gap: 16px;
  align-items: center;
}

.after-card__product img {
  width: 104px;
  height: 78px;
  border-radius: 10px;
  object-fit: cover;
}

.after-card__product strong {
  color: #303b47;
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.01em;
  line-height: 1.55;
}

.after-card__amount,
.after-card__status,
.after-card__time {
  display: flex;
  align-items: center;
  color: #2f3946;
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.01em;
}

.after-card__actions {
  display: flex;
  align-items: center;
  gap: 22px;
}

.action-link {
  padding: 0;
  border: 0;
  background: transparent;
  color: #39cf9d;
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.01em;
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  padding: 28px 8px 4px;
  color: #8f9aa5;
  font-size: 12px;
  font-weight: 400;
}

.pagination__ghost,
.pagination__active,
.pagination input {
  height: 42px;
  min-width: 42px;
  padding: 0 14px;
  border: 1px solid #eef2ef;
  border-radius: 8px;
  background: #ffffff;
  color: #55616d;
  font-size: 13px;
  font-weight: 500;
}

.pagination__active {
  border-color: #39cf9d;
  background: #39cf9d;
  color: #ffffff;
}

.pagination input {
  width: 52px;
  text-align: center;
  outline: none;
}
</style>
