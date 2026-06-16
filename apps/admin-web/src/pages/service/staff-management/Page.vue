<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import type { PageComponentProps } from "@ihc/page-core/types";
import { getAdminStaffs, updateAdminStaffStatus } from "@/shared/api/catalog";
import { handleAdminPageError } from "@/shared/api/error";
import { deriveDateRange, extractDatePart } from "@/shared/date-range";
import mockSeed from "./mock";

const props = defineProps<PageComponentProps>();
const mock = ref<typeof mockSeed>(mockSeed);

const selectedServiceType = ref(mockSeed.serviceTypeOptions[0]);
const selectedTag = ref(mockSeed.tagOptions[0]);
const joinStart = ref("");
const joinEnd = ref("");
const keyword = ref("");

const filteredRows = computed(() =>
  mock.value.rows.filter((row) => {
    const matchesServiceType =
      selectedServiceType.value === mock.value.serviceTypeOptions[0] || row.serviceType === selectedServiceType.value;
    const matchesTag = selectedTag.value === mock.value.tagOptions[0] || row.tag === selectedTag.value;
    const keywordValue = keyword.value.trim();
    const matchesKeyword =
      !keywordValue || `${row.name}${row.phone}${row.staffId}${row.district}`.includes(keywordValue);
    const joinDate = extractDatePart(row.joinTime);
    const matchesDate =
      (!joinStart.value || joinDate >= joinStart.value) && (!joinEnd.value || joinDate <= joinEnd.value);

    return matchesServiceType && matchesTag && matchesKeyword && matchesDate;
  }),
);

function syncJoinDateRange(nextRows = mock.value.rows, force = false) {
  if (!force && joinStart.value && joinEnd.value) {
    return;
  }

  const range = deriveDateRange(nextRows.map((row) => row.joinTime));
  joinStart.value = range.start;
  joinEnd.value = range.end;
}

async function syncPageData(options: { resetDateRange?: boolean } = {}) {
  try {
    mock.value = (await getAdminStaffs({
      page: 1,
      pageSize: 100,
      serviceType: selectedServiceType.value !== mock.value.serviceTypeOptions[0] ? selectedServiceType.value : undefined,
      tag: selectedTag.value !== mock.value.tagOptions[0] ? selectedTag.value : undefined,
    })) as typeof mockSeed;

    if (!mock.value.serviceTypeOptions.includes(selectedServiceType.value)) {
      selectedServiceType.value = mock.value.serviceTypeOptions[0];
    }

    if (!mock.value.tagOptions.includes(selectedTag.value)) {
      selectedTag.value = mock.value.tagOptions[0];
    }

    syncJoinDateRange(mock.value.rows, options.resetDateRange);
  } catch (error) {
    handleAdminPageError(error, {
      navigation: props.navigation,
      showToast: props.showToast,
      fallbackMessage: "服务人员列表加载失败，已回退到演示数据",
    });
  }
}

async function searchRows() {
  await syncPageData();
  props.showToast(`已筛选 ${filteredRows.value.length} 位服务人员`);
}

function resetFilters() {
  selectedServiceType.value = mock.value.serviceTypeOptions[0];
  selectedTag.value = mock.value.tagOptions[0];
  joinStart.value = "";
  joinEnd.value = "";
  keyword.value = "";
  void syncPageData({
    resetDateRange: true,
  });
  props.showToast("筛选条件已重置");
}

async function toggleEnabled(id: string) {
  const target = mock.value.rows.find((row) => row.id === id);

  if (!target) {
    return;
  }

  try {
    await updateAdminStaffStatus(id, {
      enabled: !target.enabled,
    });
    mock.value = {
      ...mock.value,
      rows: mock.value.rows.map((row) =>
        row.id === id
          ? {
              ...row,
              enabled: !row.enabled,
            }
          : row,
      ),
    };
  } catch (error) {
    handleAdminPageError(error, {
      navigation: props.navigation,
      showToast: props.showToast,
      fallbackMessage: "更新服务人员状态失败，请稍后重试",
    });
  }
}

onMounted(() => {
  void syncPageData({
    resetDateRange: true,
  });
});
</script>

<template>
  <section class="staff-page">
    <article class="staff-panel staff-panel--filters">
      <header class="section-head">
        <span class="section-head__accent"></span>
        <h1>{{ mock.title }}</h1>
      </header>

      <div class="filters">
        <label class="field">
          <span class="field__label">服务类型</span>
          <div class="field__control field__control--select">
            <select v-model="selectedServiceType">
              <option v-for="item in mock.serviceTypeOptions" :key="item" :value="item">{{ item }}</option>
            </select>
            <svg viewBox="0 0 16 16" focusable="false" aria-hidden="true">
              <path d="m3 6 5 5 5-5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.7" />
            </svg>
          </div>
        </label>

        <label class="field">
          <span class="field__label">标签</span>
          <div class="field__control field__control--select">
            <select v-model="selectedTag">
              <option v-for="item in mock.tagOptions" :key="item" :value="item">{{ item }}</option>
            </select>
            <svg viewBox="0 0 16 16" focusable="false" aria-hidden="true">
              <path d="m3 6 5 5 5-5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.7" />
            </svg>
          </div>
        </label>

        <label class="field field--date">
          <span class="field__label">加入日期</span>
          <div class="field__range">
            <div class="field__control">
              <input v-model="joinStart" type="date" />
            </div>
            <span class="field__split">~</span>
            <div class="field__control">
              <input v-model="joinEnd" type="date" />
              <svg viewBox="0 0 18 18" focusable="false" aria-hidden="true">
                <rect x="2.5" y="3.5" width="13" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="1.6" />
                <path d="M5.5 2.5v3M12.5 2.5v3M2.5 7.5h13" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.6" />
              </svg>
            </div>
          </div>
        </label>

        <label class="field field--keyword">
          <span class="field__label field__label--hidden">关键词</span>
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

    <article class="staff-panel staff-panel--table">
      <div class="table-wrap">
        <div class="table-head">
          <span class="col-check"><input type="checkbox" /></span>
          <span>服务人员信息</span>
          <span>服务人员ID</span>
          <span>服务类型</span>
          <span>标签</span>
          <span>负责区域</span>
          <span>加入方式</span>
          <span>加入时间</span>
          <span>状态</span>
        </div>

        <div class="table-list">
          <article v-for="row in filteredRows" :key="row.id" class="table-row">
            <div class="cell col-check"><input type="checkbox" /></div>
            <div class="cell cell--person">
              <img :src="row.avatar" :alt="row.name" />
              <div>
                <strong>{{ row.name }}</strong>
                <span>{{ row.phone }}</span>
              </div>
            </div>
            <div class="cell">{{ row.staffId }}</div>
            <div class="cell">{{ row.serviceType }}</div>
            <div class="cell">
              <span class="tag-chip">{{ row.tag }}</span>
            </div>
            <div class="cell">{{ row.district }}</div>
            <div class="cell">{{ row.joinMethod }}</div>
            <div class="cell">{{ row.joinTime }}</div>
            <div class="cell cell--status">
              <button
                type="button"
                class="status-switch"
                :class="{ 'status-switch--active': row.enabled }"
                @click="toggleEnabled(row.id)"
              >
                <span>{{ row.enabled ? "启用" : "停用" }}</span>
                <i></i>
              </button>
            </div>
          </article>
        </div>
      </div>
    </article>
  </section>
</template>

<style scoped>
.staff-page {
  display: grid;
  gap: 14px;
  font-family: "PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.staff-panel {
  border-radius: 16px;
  background: #ffffff;
  box-shadow: 0 6px 20px rgba(59, 103, 82, 0.05);
}

.staff-panel--filters {
  padding: 14px 16px;
}

.staff-panel--table {
  padding: 12px 14px 14px;
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
  background: #43d1a6;
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
  grid-template-columns: 0.96fr 0.96fr 1.4fr;
  gap: 12px 16px;
  align-items: end;
}

.field {
  display: grid;
  gap: 6px;
}

.field--keyword {
  grid-column: 1 / span 2;
}

.field--actions {
  justify-self: start;
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

.table-wrap {
  overflow: hidden;
  border: 1px solid #eef2ef;
  border-radius: 12px;
  background: #ffffff;
}

.table-head,
.table-row {
  display: grid;
  grid-template-columns: 50px 1.45fr 0.9fr 0.9fr 0.86fr 1fr 0.86fr 1.16fr 0.78fr;
}

.table-head {
  background: #fafafa;
  color: #2f3946;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.01em;
}

.table-list {
  display: grid;
}

.table-row {
  border-top: 1px solid #eef2ef;
}

.cell {
  display: flex;
  align-items: center;
  min-width: 0;
  padding: 16px 14px;
  color: #2f3946;
  font-size: 12px;
  font-weight: 400;
  line-height: 1.45;
  letter-spacing: 0.01em;
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
  gap: 12px;
}

.cell--person img {
  width: 54px;
  height: 54px;
  border-radius: 50%;
  object-fit: cover;
}

.cell--person strong {
  display: block;
  color: #2f3946;
  font-size: 12px;
  font-weight: 500;
}

.cell--person span {
  display: block;
  margin-top: 4px;
  color: #2f3946;
  font-size: 12px;
  font-weight: 400;
}

.tag-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 34px;
  padding: 0 16px;
  border-radius: 10px;
  background: #f0efff;
  color: #7880ff;
  font-size: 12px;
  font-weight: 400;
}

.cell--status {
  justify-content: center;
}

.status-switch {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: flex-start;
  width: 78px;
  height: 32px;
  padding: 0 10px;
  border: 0;
  border-radius: 999px;
  background: #e7edf0;
  color: #90a0ab;
  font-size: 12px;
  font-weight: 500;
  transition: background-color 0.2s ease;
}

.status-switch i {
  position: absolute;
  right: 4px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #ffffff;
  box-shadow: 0 2px 6px rgba(38, 55, 66, 0.12);
  transition:
    right 0.2s ease,
    left 0.2s ease;
}

.status-switch--active {
  background: #44d1a6;
  color: #ffffff;
}

.status-switch--active i {
  right: auto;
  left: 50px;
}

@media (max-width: 1580px) {
  .table-head,
  .table-row {
    grid-template-columns: 50px 1.34fr 0.9fr 0.8fr 0.8fr 0.9fr 0.82fr 1.08fr 0.74fr;
  }
}

@media (max-width: 1320px) {
  .filters {
    grid-template-columns: 1fr 1fr;
  }

  .field--keyword {
    grid-column: auto;
  }
}

@media (max-width: 980px) {
  .filters {
    grid-template-columns: 1fr;
  }
}
</style>
