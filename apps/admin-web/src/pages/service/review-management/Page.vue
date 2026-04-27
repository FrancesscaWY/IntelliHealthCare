<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import type { PageComponentProps } from "@ihc/page-core/types";
import { getAdminStaffApplications } from "@/shared/api/catalog";
import { handleAdminPageError } from "@/shared/api/error";
import { deriveDateRange, extractDatePart } from "@/shared/date-range";
import mockSeed from "./mock";

const props = defineProps<PageComponentProps>();
const mock = ref<typeof mockSeed>(mockSeed);
const reviewDetailStorageKey = "admin:service:selected-application-id";

const selectedStatus = ref(mockSeed.statuses[0]);
const selectedServiceType = ref(mockSeed.serviceTypes[0]);
const applyStart = ref("");
const applyEnd = ref("");
const reviewStart = ref("");
const reviewEnd = ref("");
const keyword = ref("");

const filteredRows = computed(() =>
  mock.value.rows.filter((row) => {
    const matchesStatus = selectedStatus.value === mock.value.statuses[0] || row.status === selectedStatus.value;
    const matchesType = selectedServiceType.value === mock.value.serviceTypes[0] || row.serviceType === selectedServiceType.value;
    const keywordValue = keyword.value.trim();
    const matchesKeyword =
      !keywordValue || `${row.name}${row.staffId}${row.phone}${row.reviewer}`.includes(keywordValue);
    const applyDate = extractDatePart(row.applyTime);
    const reviewDate = row.reviewTime === "-" ? "" : extractDatePart(row.reviewTime);
    const matchesApplyDate =
      (!applyStart.value || applyDate >= applyStart.value) && (!applyEnd.value || applyDate <= applyEnd.value);
    const matchesReviewDate =
      !reviewDate ||
      ((!reviewStart.value || reviewDate >= reviewStart.value) && (!reviewEnd.value || reviewDate <= reviewEnd.value));

    return matchesStatus && matchesType && matchesKeyword && matchesApplyDate && matchesReviewDate;
  }),
);

function syncDateRanges(nextRows = mock.value.rows, force = false) {
  if (force || !applyStart.value || !applyEnd.value) {
    const range = deriveDateRange(nextRows.map((row) => row.applyTime));
    applyStart.value = range.start;
    applyEnd.value = range.end;
  }

  if (force || !reviewStart.value || !reviewEnd.value) {
    const reviewDates = nextRows
      .map((row) => (row.reviewTime === "-" ? "" : row.reviewTime))
      .filter((value) => Boolean(extractDatePart(value)));

    if (reviewDates.length > 0) {
      const range = deriveDateRange(reviewDates);
      reviewStart.value = range.start;
      reviewEnd.value = range.end;
      return;
    }

    reviewStart.value = "";
    reviewEnd.value = "";
  }
}

function mapStatusLabelToCode(status: string) {
  if (status === "待审核") {
    return "PENDING";
  }

  if (status === "已通过") {
    return "APPROVED";
  }

  if (status === "已驳回") {
    return "REJECTED";
  }

  return undefined;
}

async function syncPageData(options: { resetDateRanges?: boolean } = {}) {
  try {
    mock.value = (await getAdminStaffApplications({
      page: 1,
      pageSize: 100,
      status: mapStatusLabelToCode(selectedStatus.value),
      serviceType: selectedServiceType.value !== mock.value.serviceTypes[0] ? selectedServiceType.value : undefined,
    })) as typeof mockSeed;
    syncDateRanges(mock.value.rows, options.resetDateRanges);
  } catch (error) {
    handleAdminPageError(error, {
      navigation: props.navigation,
      showToast: props.showToast,
      fallbackMessage: "审核管理列表加载失败，已回退到演示数据",
    });
  }
}

async function searchRows() {
  await syncPageData();
  props.showToast(`已筛选 ${filteredRows.value.length} 条审核记录`);
}

function resetFilters() {
  selectedStatus.value = mock.value.statuses[0];
  selectedServiceType.value = mock.value.serviceTypes[0];
  applyStart.value = "";
  applyEnd.value = "";
  reviewStart.value = "";
  reviewEnd.value = "";
  keyword.value = "";
  void syncPageData({
    resetDateRanges: true,
  });
  props.showToast("筛选条件已重置");
}

function triggerAction(label: string, id?: string) {
  props.showToast(id ? `${label}：${id}` : `${label}功能为演示状态`);
}

function openReviewDetail(applicationId: string) {
  if (typeof window !== "undefined") {
    window.sessionStorage.setItem(reviewDetailStorageKey, applicationId);
  }

  props.navigation.navigateTo("service/review-detail");
}

onMounted(() => {
  void syncPageData({
    resetDateRanges: true,
  });
});
</script>

<template>
  <section class="review-page">
    <article class="review-panel review-panel--filters">
      <header class="section-head">
        <span class="section-head__accent"></span>
        <h1>{{ mock.title }}</h1>
      </header>

      <div class="filters">
        <label class="field">
          <span class="field__label">状态</span>
          <div class="field__control field__control--select">
            <select v-model="selectedStatus">
              <option v-for="item in mock.statuses" :key="item" :value="item">{{ item }}</option>
            </select>
            <svg viewBox="0 0 16 16" focusable="false" aria-hidden="true">
              <path d="m3 6 5 5 5-5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.7" />
            </svg>
          </div>
        </label>

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

        <label class="field field--date">
          <span class="field__label">申请日期</span>
          <div class="field__range">
            <div class="field__control">
              <input v-model="applyStart" type="date" />
            </div>
            <span class="field__split">~</span>
            <div class="field__control">
              <input v-model="applyEnd" type="date" />
              <svg viewBox="0 0 18 18" focusable="false" aria-hidden="true">
                <rect x="2.5" y="3.5" width="13" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="1.6" />
                <path d="M5.5 2.5v3M12.5 2.5v3M2.5 7.5h13" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.6" />
              </svg>
            </div>
          </div>
        </label>

        <label class="field field--date">
          <span class="field__label">审核日期</span>
          <div class="field__range">
            <div class="field__control">
              <input v-model="reviewStart" type="date" />
            </div>
            <span class="field__split">~</span>
            <div class="field__control">
              <input v-model="reviewEnd" type="date" />
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
            <input v-model="keyword" type="text" placeholder="请输入姓名、编号、手机号" @keydown.enter="searchRows" />
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

    <article class="review-panel review-panel--content">
      <header class="toolbar">
        <div></div>
        <button class="toolbar-button" type="button" @click="triggerAction('批量操作')">批量操作</button>
      </header>

      <div class="table-head">
        <span class="col-check"><input type="checkbox" /></span>
        <span>头像/姓名</span>
        <span>服务人员ID</span>
        <span>服务类型</span>
        <span>审核状态</span>
        <span>手机号码</span>
        <span>审核人</span>
        <span>申请时间</span>
        <span>审核时间</span>
        <span>操作</span>
      </div>

      <div class="table-list">
        <article v-for="row in filteredRows" :key="row.id" class="table-row">
          <div class="cell col-check"><input type="checkbox" /></div>
          <div class="cell cell--person">
            <img :src="row.avatar" :alt="row.name" />
            <strong>{{ row.name }}</strong>
          </div>
          <div class="cell">{{ row.staffId }}</div>
          <div class="cell">{{ row.serviceType }}</div>
          <div class="cell cell--status">
            <span class="status-dot"></span>
            <span>{{ row.status }}</span>
          </div>
          <div class="cell">{{ row.phone }}</div>
          <div class="cell">{{ row.reviewer }}</div>
          <div class="cell">{{ row.applyTime }}</div>
          <div class="cell">{{ row.reviewTime }}</div>
          <div class="cell cell--action">
            <button type="button" class="action-link" @click="openReviewDetail(row.id)">审核</button>
          </div>
        </article>
      </div>
    </article>
  </section>
</template>

<style scoped>
.review-page {
  display: grid;
  gap: 14px;
  font-family: "PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.review-panel {
  border-radius: 16px;
  background: #ffffff;
  box-shadow: 0 6px 20px rgba(59, 103, 82, 0.05);
}

.review-panel--filters {
  padding: 14px 16px;
}

.review-panel--content {
  padding: 14px;
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
  grid-template-columns: 0.9fr 0.9fr 1.25fr 1.25fr 1fr auto;
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

.toolbar {
  display: flex;
  justify-content: flex-end;
  padding: 2px 6px 10px;
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
  grid-template-columns: 60px 1.18fr 1fr 0.9fr 0.96fr 1.02fr 0.94fr 1.18fr 1.02fr 0.64fr;
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
  grid-template-columns: 60px 1.18fr 1fr 0.9fr 0.96fr 1.02fr 0.94fr 1.18fr 1.02fr 0.64fr;
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

.col-check {
  justify-content: center;
}

.col-check input {
  width: 18px;
  height: 18px;
  accent-color: #39cf9d;
}

.cell--person {
  gap: 10px;
}

.cell--person img {
  width: 46px;
  height: 46px;
  border-radius: 50%;
  object-fit: cover;
}

.cell--person strong {
  color: #303b47;
  font-size: 12px;
  font-weight: 500;
}

.cell--status {
  gap: 8px;
  color: #39cf9d;
  font-weight: 500;
}

.status-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #39cf9d;
}

.cell--action {
  justify-content: center;
}

.action-link {
  padding: 0;
  border: 0;
  background: transparent;
  color: #39cf9d;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.01em;
}

@media (max-width: 1600px) {
  .filters {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
</style>
