<script setup lang="ts">
import { computed, ref } from "vue";
import type { PageComponentProps } from "@ihc/page-core/types";
import mock, { type CommentManagementRow } from "./mock";
import { orderDetailStorageKey } from "../order-list/mock";

const props = defineProps<PageComponentProps>();

const defaultStartDate = "2026-04-01";
const defaultEndDate = "2026-04-30";

const rows = ref(mock.rows.map((row) => ({ ...row, gallery: [...row.gallery] })));
const selectedServiceType = ref(mock.serviceTypes[0]);
const selectedRating = ref(mock.ratingOptions[0]);
const selectedPinStatus = ref(mock.pinOptions[0]);
const startDate = ref(defaultStartDate);
const endDate = ref(defaultEndDate);
const keyword = ref("");
const batchMode = ref(false);
const selectedIds = ref<string[]>([]);
const detailDialogRow = ref<CommentManagementRow | null>(null);
const deleteDialogOpen = ref(false);
const deleteDialogMessage = ref("");
const pendingDeleteIds = ref<string[]>([]);

function matchesRatingFilter(row: CommentManagementRow) {
  if (selectedRating.value === "全部评分") {
    return true;
  }

  if (selectedRating.value === "2星及以下") {
    return row.rating <= 2;
  }

  const matchedScore = selectedRating.value.match(/\d+/);
  return matchedScore ? row.rating === Number(matchedScore[0]) : true;
}

const filteredRows = computed(() =>
  rows.value.filter((row) => {
    const reviewedDate = row.reviewedAt.slice(0, 10);
    const keywordValue = keyword.value.trim();
    const matchesKeyword =
      !keywordValue ||
      `${row.title}${row.productCode}${row.orderNo}${row.buyerName}${row.buyerPhone}`.includes(keywordValue);
    const matchesType = selectedServiceType.value === "全部类型" || row.serviceType === selectedServiceType.value;
    const matchesPin =
      selectedPinStatus.value === "全部" ||
      (selectedPinStatus.value === "已置顶" ? row.isPinned : !row.isPinned);
    const matchesStart = !startDate.value || reviewedDate >= startDate.value;
    const matchesEnd = !endDate.value || reviewedDate <= endDate.value;

    return matchesKeyword && matchesType && matchesPin && matchesStart && matchesEnd && matchesRatingFilter(row);
  }),
);

const selectedFilteredRows = computed(() => filteredRows.value.filter((row) => selectedIds.value.includes(row.id)));
const allFilteredChecked = computed(
  () => filteredRows.value.length > 0 && filteredRows.value.every((row) => selectedIds.value.includes(row.id)),
);
const selectionSummary = computed(() =>
  batchMode.value ? (selectedFilteredRows.value.length ? `已选 ${selectedFilteredRows.value.length} 条` : "请勾选评价") : "",
);

function searchRows() {
  props.showToast(`已筛选 ${filteredRows.value.length} 条评价`);
}

function resetFilters() {
  selectedServiceType.value = mock.serviceTypes[0];
  selectedRating.value = mock.ratingOptions[0];
  selectedPinStatus.value = mock.pinOptions[0];
  startDate.value = defaultStartDate;
  endDate.value = defaultEndDate;
  keyword.value = "";
  batchMode.value = false;
  selectedIds.value = [];
  props.showToast("筛选条件已重置");
}

function toggleRowSelection(id: string, checked: boolean) {
  const nextIds = new Set(selectedIds.value);

  if (checked) {
    nextIds.add(id);
  } else {
    nextIds.delete(id);
  }

  selectedIds.value = Array.from(nextIds);
}

function onToggleRow(id: string, event: Event) {
  toggleRowSelection(id, (event.target as HTMLInputElement).checked);
}

function toggleSelectAll(checked: boolean) {
  const nextIds = new Set(selectedIds.value);

  filteredRows.value.forEach((row) => {
    if (checked) {
      nextIds.add(row.id);
    } else {
      nextIds.delete(row.id);
    }
  });

  selectedIds.value = Array.from(nextIds);
}

function onToggleAll(event: Event) {
  toggleSelectAll((event.target as HTMLInputElement).checked);
}

function navigateWithStorage(pageId: string, storageKey: string, value: string) {
  if (typeof window !== "undefined") {
    window.sessionStorage.setItem(storageKey, value);
  }

  const previousStack = props.navigation.getStack();

  props.navigation.navigateTo(pageId);

  const nextStack = props.navigation.getStack();
  const activePageId = nextStack[nextStack.length - 1] || "";

  if (activePageId !== pageId) {
    props.navigation.reLaunch(pageId);
  }

  const finalStack = props.navigation.getStack();
  const resolvedPageId = finalStack[finalStack.length - 1] || "";

  if (resolvedPageId !== pageId) {
    props.showToast(`跳转失败，当前导航栈：${previousStack.join(" > ") || "空"}`);
  }
}

function toggleBatchMode() {
  batchMode.value = !batchMode.value;

  if (!batchMode.value) {
    selectedIds.value = [];
  }
}

function clearBatchSelection() {
  selectedIds.value = [];
}

function openOrderDetail(orderNo: string) {
  detailDialogRow.value = null;
  navigateWithStorage("dashboard/order-detail", orderDetailStorageKey, orderNo);
}

function openDetailDialog(row: CommentManagementRow) {
  detailDialogRow.value = row;
}

function closeDetailDialog() {
  detailDialogRow.value = null;
}

function togglePinned(row: CommentManagementRow) {
  row.isPinned = !row.isPinned;
  props.showToast(row.isPinned ? "评价已置顶" : "评价已取消置顶");
}

function toggleVisible(row: CommentManagementRow) {
  row.isVisible = !row.isVisible;
  props.showToast(row.isVisible ? "评价已显示" : "评价已隐藏");
}

function requestDeleteRows(targetRows: CommentManagementRow[]) {
  if (!targetRows.length) {
    props.showToast("当前没有可删除的评价");
    return;
  }

  detailDialogRow.value = null;
  pendingDeleteIds.value = Array.from(new Set(targetRows.map((row) => row.id)));
  deleteDialogMessage.value =
    pendingDeleteIds.value.length === 1
      ? "删除后该评价将不再展示，确定继续吗？"
      : `将删除 ${pendingDeleteIds.value.length} 条评价，删除后不可恢复，确定继续吗？`;
  deleteDialogOpen.value = true;
}

function closeDeleteDialog() {
  deleteDialogOpen.value = false;
  deleteDialogMessage.value = "";
  pendingDeleteIds.value = [];
}

function confirmDelete() {
  if (!pendingDeleteIds.value.length) {
    closeDeleteDialog();
    return;
  }

  const deleteIdSet = new Set(pendingDeleteIds.value);
  const deleteCount = deleteIdSet.size;

  rows.value = rows.value.filter((row) => !deleteIdSet.has(row.id));
  selectedIds.value = selectedIds.value.filter((id) => !deleteIdSet.has(id));

  closeDeleteDialog();
  props.showToast(deleteCount === 1 ? "评价已删除" : `已删除 ${deleteCount} 条评价`);
}

function applyBatchAction(action: "show" | "hide" | "pin" | "unpin" | "delete") {
  const targets = selectedFilteredRows.value;

  if (!targets.length) {
    props.showToast("请先勾选评价");
    return;
  }

  if (action === "delete") {
    requestDeleteRows(targets);
    return;
  }

  targets.forEach((row) => {
    if (action === "show") {
      row.isVisible = true;
    } else if (action === "hide") {
      row.isVisible = false;
    } else if (action === "pin") {
      row.isPinned = true;
    } else if (action === "unpin") {
      row.isPinned = false;
    }
  });

  const actionCopyMap = {
    show: "批量显示",
    hide: "批量隐藏",
    pin: "批量置顶",
    unpin: "批量取消置顶",
    delete: "批量删除",
  } as const;

  props.showToast(`${actionCopyMap[action]} ${targets.length} 条评价`);
}
</script>

<template>
  <section class="comment-page">
    <article class="comment-panel comment-panel--filters">
      <header class="section-head">
        <span class="section-head__accent"></span>
        <h1>{{ mock.title }}</h1>
      </header>

      <div class="filters">
        <label class="field">
          <span class="field__label">服务类型</span>
          <div class="field__control field__control--select">
            <select v-model="selectedServiceType">
              <option v-for="item in mock.serviceTypes" :key="item" :value="item">{{ item }}</option>
            </select>
            <svg viewBox="0 0 16 16" focusable="false" aria-hidden="true">
              <path d="m3 6 5 5 5-5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.7" />
            </svg>
          </div>
        </label>

        <label class="field">
          <span class="field__label">评分</span>
          <div class="field__control field__control--select">
            <select v-model="selectedRating">
              <option v-for="item in mock.ratingOptions" :key="item" :value="item">{{ item }}</option>
            </select>
            <svg viewBox="0 0 16 16" focusable="false" aria-hidden="true">
              <path d="m3 6 5 5 5-5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.7" />
            </svg>
          </div>
        </label>

        <label class="field">
          <span class="field__label">置顶状态</span>
          <div class="field__control field__control--select">
            <select v-model="selectedPinStatus">
              <option v-for="item in mock.pinOptions" :key="item" :value="item">{{ item }}</option>
            </select>
            <svg viewBox="0 0 16 16" focusable="false" aria-hidden="true">
              <path d="m3 6 5 5 5-5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.7" />
            </svg>
          </div>
        </label>

        <label class="field field--date">
          <span class="field__label">评价日期</span>
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
          <span class="field__label">关键词</span>
          <div class="field__control">
            <input v-model="keyword" type="text" placeholder="请输入商品名称、编码、客户信息" @keydown.enter="searchRows" />
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

    <article class="comment-panel comment-panel--content">
      <header class="toolbar">
        <div class="toolbar__summary">
          <span>共{{ filteredRows.length }}条评价</span>
          <strong v-if="selectionSummary">{{ selectionSummary }}</strong>
        </div>

        <div class="toolbar__actions">
          <button v-if="batchMode && selectedIds.length" class="toolbar-button" type="button" @click="clearBatchSelection">清空勾选</button>
          <button class="toolbar-button" :class="{ 'toolbar-button--active': batchMode }" type="button" @click="toggleBatchMode">
            {{ batchMode ? "完成批量" : "批量管理" }}
          </button>
        </div>
      </header>

      <div v-if="batchMode" class="batch-action-row">
        <button class="batch-action-button" type="button" @click="applyBatchAction('show')">批量显示</button>
        <button class="batch-action-button" type="button" @click="applyBatchAction('hide')">批量隐藏</button>
        <button class="batch-action-button" type="button" @click="applyBatchAction('pin')">批量置顶</button>
        <button class="batch-action-button" type="button" @click="applyBatchAction('unpin')">批量取消置顶</button>
        <button class="batch-action-button batch-action-button--danger" type="button" @click="applyBatchAction('delete')">批量删除</button>
      </div>

      <div class="table-scroll">
        <div class="table-head" :class="{ 'table-head--batch': batchMode }">
          <span v-if="batchMode" class="col-check">
            <input :checked="allFilteredChecked" type="checkbox" @change="onToggleAll" />
          </span>
          <span>商品信息</span>
          <span>商品编码</span>
          <span>评分</span>
          <span>客户</span>
          <span>评价时间</span>
          <span>状态</span>
          <span>操作</span>
        </div>

        <div v-if="filteredRows.length" class="table-list">
          <article v-for="row in filteredRows" :key="row.id" class="table-row" :class="{ 'table-row--batch': batchMode }">
            <div v-if="batchMode" class="cell col-check">
              <input :checked="selectedIds.includes(row.id)" type="checkbox" @change="onToggleRow(row.id, $event)" />
            </div>

            <div class="cell cell--product">
              <img :src="row.image" :alt="row.title" />

              <div>
                <strong>{{ row.title }}</strong>

                <div class="product-meta">
                  <span class="meta-chip">{{ row.serviceType }}</span>
                  <span v-if="row.isPinned" class="meta-chip meta-chip--pin">已置顶</span>
                </div>

                <p>{{ row.reviewText }}</p>
              </div>
            </div>

            <div class="cell cell--code">{{ row.productCode }}</div>

            <div class="cell cell--rating">
              <div class="rating-stars">
                <span v-for="star in 5" :key="star" class="rating-star" :class="{ 'rating-star--active': star <= row.rating }">★</span>
              </div>
              <strong class="rating-score">{{ row.rating }}.0</strong>
            </div>

            <div class="cell cell--customer">
              <img :src="row.buyerAvatar" :alt="row.buyerName" />
              <div>
                <strong>{{ row.buyerName }}</strong>
                <span>{{ row.buyerPhone }}</span>
              </div>
            </div>

            <div class="cell cell--time">{{ row.reviewedAt }}</div>

            <div class="cell cell--status">
              <button
                class="status-switch"
                :class="{ 'status-switch--active': row.isVisible }"
                type="button"
                @click="toggleVisible(row)"
              >
                <span class="status-switch__thumb"></span>
                <span class="status-switch__label">{{ row.isVisible ? "显示" : "隐藏" }}</span>
              </button>
            </div>

            <div class="cell cell--action">
              <button type="button" class="action-link" @click="togglePinned(row)">
                {{ row.isPinned ? "取消置顶" : "置顶" }}
              </button>
              <button type="button" class="action-link" @click="openDetailDialog(row)">评价详情</button>
              <button type="button" class="action-link" @click="openOrderDetail(row.orderNo)">订单详情</button>
              <button type="button" class="action-link action-link--danger" @click="requestDeleteRows([row])">删除</button>
            </div>
          </article>
        </div>

        <div v-else class="empty-state">当前筛选条件下暂无评价内容</div>
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

    <div v-if="detailDialogRow" class="dialog-mask" @click.self="closeDetailDialog">
      <article class="dialog dialog--detail">
        <header class="dialog__header">
          <h2>评价详情</h2>
          <button class="dialog__close" type="button" @click="closeDetailDialog">×</button>
        </header>

        <div class="dialog__body">
          <section class="detail-top">
            <article class="detail-card detail-card--product">
              <img :src="detailDialogRow.image" :alt="detailDialogRow.title" />

              <div>
                <strong>{{ detailDialogRow.title }}</strong>
                <div class="detail-meta">
                  <span>订单编号：{{ detailDialogRow.orderNo }}</span>
                  <span>商品编码：{{ detailDialogRow.productCode }}</span>
                  <span>服务类型：{{ detailDialogRow.serviceType }}</span>
                </div>
              </div>
            </article>

            <article class="detail-card detail-card--summary">
              <div class="rating-stars">
                <span
                  v-for="star in 5"
                  :key="`detail-star-${star}`"
                  class="rating-star"
                  :class="{ 'rating-star--active': star <= detailDialogRow.rating }"
                >
                  ★
                </span>
              </div>
              <strong class="detail-score">{{ detailDialogRow.rating }}.0 分</strong>
              <div class="detail-tags">
                <span class="meta-chip">{{ detailDialogRow.isVisible ? "显示中" : "已隐藏" }}</span>
                <span v-if="detailDialogRow.isPinned" class="meta-chip meta-chip--pin">置顶评价</span>
              </div>
              <span class="detail-time">评价时间：{{ detailDialogRow.reviewedAt }}</span>
            </article>
          </section>

          <section class="detail-section-grid">
            <article class="detail-block">
              <h3>客户信息</h3>
              <div class="customer-detail">
                <img :src="detailDialogRow.buyerAvatar" :alt="detailDialogRow.buyerName" />
                <div>
                  <strong>{{ detailDialogRow.buyerName }}</strong>
                  <span>{{ detailDialogRow.buyerPhone }}</span>
                </div>
              </div>
            </article>

            <article class="detail-block">
              <h3>商家回复</h3>
              <p>{{ detailDialogRow.replyText || "暂未回复该评价" }}</p>
            </article>
          </section>

          <article class="detail-block">
            <h3>评价内容</h3>
            <p>{{ detailDialogRow.reviewText }}</p>
          </article>

          <article v-if="detailDialogRow.gallery.length" class="detail-block">
            <h3>评价图片</h3>
            <div class="gallery-grid">
              <img v-for="(image, index) in detailDialogRow.gallery" :key="`${detailDialogRow.id}-${index}`" :src="image" alt="评价图片" />
            </div>
          </article>
        </div>

        <footer class="dialog__footer">
          <button class="dialog-button dialog-button--ghost" type="button" @click="closeDetailDialog">关闭</button>
          <button class="dialog-button dialog-button--primary" type="button" @click="openOrderDetail(detailDialogRow.orderNo)">
            订单详情
          </button>
        </footer>
      </article>
    </div>

    <div v-if="deleteDialogOpen" class="dialog-mask" @click.self="closeDeleteDialog">
      <article class="dialog dialog--confirm">
        <header class="dialog__header">
          <h2>删除确认</h2>
          <button class="dialog__close" type="button" @click="closeDeleteDialog">×</button>
        </header>

        <div class="dialog__body dialog__body--compact">
          <p class="confirm-text">{{ deleteDialogMessage }}</p>
        </div>

        <footer class="dialog__footer">
          <button class="dialog-button dialog-button--ghost" type="button" @click="closeDeleteDialog">取消</button>
          <button class="dialog-button dialog-button--danger" type="button" @click="confirmDelete">确定删除</button>
        </footer>
      </article>
    </div>
  </section>
</template>

<style scoped>
.comment-page {
  display: grid;
  gap: 18px;
  font-family: "PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.comment-panel {
  border-radius: 16px;
  background: #ffffff;
  box-shadow: 0 6px 20px rgba(59, 103, 82, 0.05);
}

.comment-panel--filters {
  padding: 18px 20px;
}

.comment-panel--content {
  padding: 18px;
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
  grid-template-columns: minmax(150px, 0.9fr) minmax(150px, 0.9fr) minmax(150px, 0.9fr) minmax(280px, 1.25fr) minmax(220px, 1fr) auto;
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

.field--keyword .field__control input,
.field--keyword .field__control input::placeholder {
  font-size: 12px;
}

.field__control--select select {
  appearance: none;
  cursor: pointer;
  padding-right: 18px;
}

.field__control svg {
  width: 16px;
  height: 16px;
  color: #c2c8ce;
  pointer-events: none;
}

.field__control--select svg {
  position: absolute;
  right: 12px;
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
  cursor: pointer;
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

.action-button--ghost {
  background: #ffffff;
  color: #4b5560;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 2px 6px 10px;
}

.toolbar__summary {
  display: flex;
  align-items: center;
  gap: 12px;
  color: #7d8792;
  font-size: 12px;
  letter-spacing: 0.01em;
}

.toolbar__summary strong {
  color: #39cf9d;
  font-weight: 500;
}

.toolbar__actions {
  display: flex;
  align-items: center;
  gap: 10px;
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
  cursor: pointer;
}

.toolbar-button--active {
  border-color: #39cf9d;
  background: #39cf9d;
  color: #ffffff;
}

.batch-action-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  padding: 0 6px 14px;
}

.batch-action-button {
  min-width: 88px;
  height: 32px;
  padding: 0 12px;
  border: 1px solid #dfe7e3;
  border-radius: 8px;
  background: #ffffff;
  color: #34404d;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.01em;
  cursor: pointer;
}

.batch-action-button--danger {
  color: #df645c;
  border-color: #f1d3d1;
}

.table-scroll {
  overflow-x: auto;
}

.table-head,
.table-row {
  min-width: 1160px;
  display: grid;
  grid-template-columns: minmax(320px, 2.45fr) minmax(120px, 0.88fr) minmax(120px, 0.8fr) minmax(160px, 1.1fr) minmax(150px, 0.98fr) minmax(90px, 0.74fr) minmax(180px, 0.96fr);
  align-items: center;
}

.table-head--batch,
.table-row--batch {
  grid-template-columns:
    56px
    minmax(320px, 2.45fr)
    minmax(120px, 0.88fr)
    minmax(120px, 0.8fr)
    minmax(160px, 1.1fr)
    minmax(150px, 0.98fr)
    minmax(90px, 0.74fr)
    minmax(180px, 0.96fr);
}

.table-head {
  padding: 18px 0;
  border: 1px solid #eef2ef;
  background: #fafafa;
  color: #2f3946;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.01em;
}

.table-head > span {
  display: flex;
  align-items: center;
  min-width: 0;
  padding: 0 14px;
  line-height: 1.45;
}

.table-list {
  border: 1px solid #eef2ef;
  border-top: 0;
}

.table-row {
  border-top: 1px solid #eef2ef;
  background: #ffffff;
}

.table-row:first-child {
  border-top: 0;
}

.cell {
  min-width: 0;
  padding: 16px 14px;
  color: #2f3946;
  font-size: 12px;
  font-weight: 400;
  letter-spacing: 0.01em;
  line-height: 1.45;
}

.col-check {
  display: flex;
  align-items: center;
  justify-content: center;
}

.col-check input {
  width: 18px;
  height: 18px;
  accent-color: #39cf9d;
  cursor: pointer;
}

.cell--product {
  display: grid;
  grid-template-columns: 92px minmax(0, 1fr);
  gap: 14px;
  align-items: center;
}

.cell--product img {
  width: 92px;
  height: 68px;
  flex: none;
  border-radius: 10px;
  object-fit: cover;
}

.cell--product strong {
  display: block;
  margin-bottom: 8px;
  color: #303b47;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.55;
}

.product-meta {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}

.meta-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 3px 10px;
  border-radius: 999px;
  background: #edf8f3;
  color: #39cf9d;
  font-size: 11px;
  line-height: 1;
}

.meta-chip--pin {
  background: #fff3de;
  color: #d58f1b;
}

.cell--product p {
  margin: 0;
  color: #7d8792;
  line-height: 1.5;
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.cell--code {
  color: #45515d;
  font-weight: 500;
}

.cell--rating {
  display: grid;
  gap: 6px;
}

.rating-stars {
  display: flex;
  gap: 3px;
}

.rating-star {
  color: #d5dde4;
  font-size: 14px;
  line-height: 1;
}

.rating-star--active {
  color: #f4b620;
}

.rating-score {
  color: #2f3946;
  font-size: 12px;
  font-weight: 500;
}

.cell--customer {
  display: flex;
  align-items: center;
  gap: 10px;
}

.cell--customer img,
.customer-detail img {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
}

.cell--customer strong,
.customer-detail strong {
  display: block;
  color: #303b47;
  font-size: 12px;
  font-weight: 500;
  margin-bottom: 4px;
}

.cell--customer span,
.customer-detail span {
  color: #7e8a96;
  font-size: 12px;
}

.cell--time {
  color: #53606c;
  line-height: 1.5;
}

.status-switch {
  position: relative;
  display: inline-flex;
  align-items: center;
  width: 72px;
  height: 28px;
  padding: 0 8px;
  border: 1px solid #dfe7e3;
  border-radius: 14px;
  background: #f3f5f6;
  color: #9aa3ad;
  cursor: pointer;
  transition: background-color 0.2s ease, border-color 0.2s ease;
}

.status-switch__thumb {
  position: absolute;
  left: 3px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #ffffff;
  box-shadow: 0 2px 6px rgba(47, 57, 70, 0.16);
  transition: transform 0.2s ease;
}

.status-switch__label {
  position: relative;
  z-index: 1;
  width: 100%;
  padding-left: 24px;
  padding-right: 2px;
  color: inherit;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.01em;
  text-align: right;
  transition: color 0.2s ease, padding 0.2s ease, text-align 0.2s ease;
}

.status-switch--active {
  border-color: #39cf9d;
  background: rgba(57, 207, 157, 0.1);
  color: #39cf9d;
}

.status-switch--active .status-switch__thumb {
  transform: translateX(46px);
}

.status-switch--active .status-switch__label {
  padding-left: 2px;
  padding-right: 24px;
  text-align: left;
}

.cell--action {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
}

.action-link {
  border: 0;
  padding: 0;
  background: transparent;
  color: #39cf9d;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.01em;
  cursor: pointer;
}

.action-link--danger {
  color: #d85b57;
}

.empty-state {
  min-height: 220px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #9ba8b5;
  font-size: 14px;
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding: 28px 8px 4px;
  color: #8f9aa5;
  font-size: 12px;
  font-weight: 400;
  flex-wrap: wrap;
}

.pagination__ghost,
.pagination__active,
.pagination input {
  height: 42px;
  min-width: 42px;
  padding: 0 14px;
  border-radius: 8px;
  border: 1px solid #eef2ef;
  background: #ffffff;
  color: #55616d;
  font-size: 13px;
  font-weight: 500;
}

.pagination input {
  width: 52px;
  text-align: center;
  outline: none;
}

.pagination__active {
  border-color: #39cf9d;
  background: #39cf9d;
  color: #ffffff;
}

.dialog-mask {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(12, 21, 28, 0.42);
}

.dialog {
  width: min(860px, 100%);
  border-radius: 16px;
  background: #ffffff;
  box-shadow: 0 30px 80px rgba(10, 26, 20, 0.24);
  overflow: hidden;
}

.dialog--confirm {
  width: min(420px, 100%);
}

.dialog__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 22px;
  border-bottom: 1px solid #eef3ef;
}

.dialog__header h2 {
  margin: 0;
  color: #22303d;
  font-size: 18px;
  font-weight: 600;
}

.dialog__close {
  width: 32px;
  height: 32px;
  border: 1px solid #e3ebe6;
  border-radius: 50%;
  background: #ffffff;
  color: #647380;
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
}

.dialog__body {
  max-height: min(72vh, 760px);
  overflow: auto;
  padding: 22px;
  display: grid;
  gap: 16px;
}

.dialog__body--compact {
  max-height: none;
}

.detail-top,
.detail-section-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(260px, 0.95fr);
  gap: 16px;
}

.detail-card,
.detail-block {
  border: 1px solid #eef2ef;
  border-radius: 12px;
  background: #ffffff;
  padding: 18px;
}

.detail-card--product {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

.detail-card--product img {
  width: 96px;
  height: 96px;
  border-radius: 18px;
  object-fit: cover;
}

.detail-card--product strong {
  display: block;
  margin-bottom: 10px;
  color: #22313e;
  font-size: 16px;
  line-height: 1.5;
}

.detail-meta {
  display: grid;
  gap: 8px;
  color: #64727f;
  font-size: 13px;
}

.detail-card--summary {
  display: grid;
  gap: 10px;
  align-content: start;
}

.detail-score {
  color: #23333f;
  font-size: 22px;
  font-weight: 700;
}

.detail-tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.detail-time {
  color: #758391;
  font-size: 12px;
}

.detail-block h3 {
  margin: 0 0 12px;
  color: #22303d;
  font-size: 15px;
  font-weight: 600;
}

.detail-block p {
  margin: 0;
  color: #53616d;
  font-size: 14px;
  line-height: 1.75;
}

.customer-detail {
  display: flex;
  align-items: center;
  gap: 12px;
}

.gallery-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
}

.gallery-grid img {
  width: 100%;
  height: 140px;
  border-radius: 16px;
  object-fit: cover;
}

.confirm-text {
  color: #41515f;
  font-size: 14px;
  line-height: 1.8;
}

.dialog__footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 18px 22px 22px;
  border-top: 1px solid #eef3ef;
}

.dialog-button {
  min-width: 96px;
  height: 36px;
  padding: 0 16px;
  border-radius: 8px;
  border: 1px solid #dfe7e3;
  background: #ffffff;
  color: #34404d;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.01em;
  cursor: pointer;
}

.dialog-button--ghost {
  background: #ffffff;
  color: #52616d;
}

.dialog-button--primary {
  border-color: #39cf9d;
  background: #39cf9d;
  color: #ffffff;
}

.dialog-button--danger {
  border-color: #e85f5b;
  background: #e85f5b;
  color: #ffffff;
}

@media (max-width: 1360px) {
  .filters {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 960px) {
  .comment-panel--filters,
  .comment-panel--content {
    padding: 16px;
  }

  .filters,
  .detail-top,
  .detail-section-grid {
    grid-template-columns: 1fr;
  }

  .toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .toolbar__summary {
    justify-content: space-between;
  }

  .toolbar__actions,
  .batch-action-row {
    flex-wrap: wrap;
  }

  .dialog-mask {
    padding: 12px;
  }
}
</style>
