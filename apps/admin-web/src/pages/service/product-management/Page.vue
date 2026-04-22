<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { PageComponentProps } from "@ihc/page-core/types";
import mock from "./mock";

type LineKey = (typeof mock.lineOptions)[number]["key"];
type ProductRow = {
  id: string;
  title: string;
  code: string;
  price: string;
  status: string;
  image: string;
  updater: string;
  updatedAt: string;
  category?: string;
  tags?: string[];
};

const props = defineProps<PageComponentProps>();

const selectedLine = ref<LineKey>(mock.lineOptions[0].key);
const selectedStatus = ref(mock.statusOptions[0]);
const selectedCategory = ref<string>(mock.lineConfigs.housekeeping.categoryOptions[0]);
const minPrice = ref("");
const maxPrice = ref("");
const startDate = ref("");
const endDate = ref("");
const keyword = ref("");

const currentConfig = computed(() => mock.lineConfigs[selectedLine.value]);
const showCategoryFilter = computed(() => currentConfig.value.categoryOptions.length > 0);
const categoryColumnLabel = computed(() => currentConfig.value.categoryLabel);

watch(
  selectedLine,
  (line) => {
    selectedCategory.value = mock.lineConfigs[line].categoryOptions[0] || "";
    selectedStatus.value = mock.statusOptions[0];
    minPrice.value = "";
    maxPrice.value = "";
    startDate.value = "";
    endDate.value = "";
    keyword.value = "";
  },
  { immediate: true },
);

const filteredRows = computed(() => {
  return (currentConfig.value.rows as readonly ProductRow[]).filter((row) => {
    const matchesStatus = selectedStatus.value === mock.statusOptions[0] || row.status === selectedStatus.value;
    const matchesCategory =
      !showCategoryFilter.value ||
      selectedCategory.value === currentConfig.value.categoryOptions[0] ||
      row.category === selectedCategory.value;
    const matchesKeyword =
      !keyword.value.trim() ||
      `${row.title}${row.code}${row.updater}${row.category || ""}${(row.tags || []).join("")}`.includes(keyword.value.trim());
    const price = Number(row.price);
    const matchesMin = !minPrice.value || price >= Number(minPrice.value);
    const matchesMax = !maxPrice.value || price <= Number(maxPrice.value);
    const updatedDate = row.updatedAt.slice(0, 10);
    const matchesDate = (!startDate.value || updatedDate >= startDate.value) && (!endDate.value || updatedDate <= endDate.value);

    return matchesStatus && matchesCategory && matchesKeyword && matchesMin && matchesMax && matchesDate;
  });
});

function searchRows() {
  props.showToast(`已筛选 ${filteredRows.value.length} 条商品`);
}

function resetFilters() {
  selectedStatus.value = mock.statusOptions[0];
  selectedCategory.value = currentConfig.value.categoryOptions[0] || "";
  minPrice.value = "";
  maxPrice.value = "";
  startDate.value = "";
  endDate.value = "";
  keyword.value = "";
  props.showToast("筛选条件已重置");
}

function triggerAction(label: string, title?: string) {
  props.showToast(title ? `${label}：${title}` : `${label}功能为演示状态`);
}
</script>

<template>
  <section class="product-page">
    <article class="product-panel product-panel--filters">
      <header class="section-head">
        <span class="section-head__accent"></span>
        <div class="section-head__content">
          <h1>{{ mock.title }}</h1>
          <div class="line-tabs">
            <button
              v-for="item in mock.lineOptions"
              :key="item.key"
              class="line-tabs__item"
              :class="{ 'line-tabs__item--active': selectedLine === item.key }"
              type="button"
              @click="selectedLine = item.key"
            >
              {{ item.label }}
            </button>
          </div>
        </div>
      </header>

      <div class="filters">
        <label v-if="showCategoryFilter" class="field">
          <span class="field__label">{{ categoryColumnLabel }}</span>
          <div class="field__control field__control--select">
            <select v-model="selectedCategory">
              <option v-for="item in currentConfig.categoryOptions" :key="item" :value="item">{{ item }}</option>
            </select>
            <svg viewBox="0 0 16 16" focusable="false" aria-hidden="true">
              <path d="m3 6 5 5 5-5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.7" />
            </svg>
          </div>
        </label>

        <label class="field">
          <span class="field__label">状态</span>
          <div class="field__control field__control--select">
            <select v-model="selectedStatus">
              <option v-for="item in mock.statusOptions" :key="item" :value="item">{{ item }}</option>
            </select>
            <svg viewBox="0 0 16 16" focusable="false" aria-hidden="true">
              <path d="m3 6 5 5 5-5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.7" />
            </svg>
          </div>
        </label>

        <label class="field field--price">
          <span class="field__label">价格</span>
          <div class="price-range">
            <div class="field__control">
              <input v-model="minPrice" type="text" placeholder="最低价格" />
            </div>
            <span class="price-range__split">-</span>
            <div class="field__control">
              <input v-model="maxPrice" type="text" placeholder="最高价格" />
            </div>
          </div>
        </label>

        <label class="field field--date">
          <span class="field__label">选择日期</span>
          <div class="date-range">
            <div class="field__control">
              <input v-model="startDate" type="date" />
            </div>
            <span class="date-range__split">~</span>
            <div class="field__control field__control--date">
              <input v-model="endDate" type="date" />
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
            <button class="icon-button icon-button--primary" type="button" @click="searchRows">
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

    <article class="product-panel product-panel--table">
      <header class="toolbar">
        <div></div>
        <div class="toolbar__actions">
          <button class="toolbar-button toolbar-button--primary" type="button" @click="triggerAction('新增商品')">新增</button>
          <button class="toolbar-button" type="button" @click="triggerAction('批量操作')">批量操作</button>
        </div>
      </header>

      <div class="table-wrap">
        <div class="table-scroll">
          <div class="table-head">
          <span>商品信息</span>
          <span>商品编码</span>
          <span>{{ categoryColumnLabel }}</span>
          <span>价格（元）</span>
          <span>状态</span>
          <span>最后更新人</span>
          <span>最后更新时间</span>
          <span>操作</span>
        </div>

          <div class="table-list">
          <article v-for="row in filteredRows" :key="row.id" class="table-row">
            <div class="cell cell--product">
              <img :src="row.image" :alt="row.title" />
              <strong>{{ row.title }}</strong>
            </div>
            <div class="cell">{{ row.code }}</div>
            <div class="cell">
              <div v-if="row.tags?.length" class="tag-stack">
                <span v-for="tag in row.tags" :key="tag" class="tag-chip">{{ tag }}</span>
              </div>
              <span v-else>{{ row.category }}</span>
            </div>
            <div class="cell">{{ row.price }}</div>
            <div class="cell">
              <span class="status-pill" :class="{ 'status-pill--online': row.status === '已上架' }">
                <i></i>{{ row.status }}
              </span>
            </div>
            <div class="cell">{{ row.updater }}</div>
            <div class="cell">{{ row.updatedAt }}</div>
            <div class="cell cell--actions">
              <button type="button" class="table-link table-link--green" @click="triggerAction('复制', row.title)">复制</button>
              <button type="button" class="table-link table-link--green" @click="triggerAction('编辑', row.title)">编辑</button>
              <button type="button" class="table-link table-link--green" @click="triggerAction(row.status === '已上架' ? '下架' : '上架', row.title)">
                {{ row.status === "已上架" ? "下架" : "上架" }}
              </button>
              <button type="button" class="table-link table-link--red" @click="triggerAction('删除', row.title)">删除</button>
            </div>
          </article>
          </div>
        </div>
      </div>
    </article>
  </section>
</template>

<style scoped>
.product-page {
  display: grid;
  gap: 18px;
  font-family: var(--admin-font-family);
  color: #2f3946;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.product-panel {
  border-radius: 16px;
  background: #ffffff;
  box-shadow: 0 6px 20px rgba(59, 103, 82, 0.05);
}

.product-panel--filters {
  padding: 18px 20px 20px;
}

.product-panel--table {
  padding: 18px 20px 20px;
}

.section-head {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 22px;
}

.section-head__accent {
  width: 6px;
  height: 28px;
  border-radius: 999px;
  background: #43d1a6;
}

.section-head__content {
  display: grid;
  gap: 16px;
}

.section-head h1 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.line-tabs {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.line-tabs__item {
  height: 34px;
  padding: 0 16px;
  border: 1px solid #dfe7e3;
  border-radius: 999px;
  background: #ffffff;
  color: #62707c;
  font-size: 13px;
  font-weight: 500;
}

.line-tabs__item--active {
  border-color: #39cf9d;
  background: #ecfbf5;
  color: #29b787;
}

.filters {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 18px 22px;
  align-items: end;
}

.field {
  display: grid;
  gap: 8px;
}

.field--price {
  grid-column: span 2;
}

.field--date {
  grid-column: span 2;
}

.field--keyword {
  grid-column: span 1;
}

.field--actions {
  justify-self: start;
}

.field__label {
  color: #8f9aa6;
  font-size: 12px;
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
  padding: 0 14px;
  border: 1px solid #e7eeea;
  border-radius: 8px;
  background: #ffffff;
}

.field__control input,
.field__control select {
  width: 100%;
  border: 0;
  background: transparent;
  color: #44515d;
  font-size: 13px;
  outline: none;
}

.field__control input::placeholder {
  color: #c1c8cf;
}

.field__control--select select {
  appearance: none;
  padding-right: 24px;
}

.field__control--select svg,
.field__control--date svg {
  position: absolute;
  right: 14px;
  width: 16px;
  height: 16px;
  color: #c2c8ce;
}

.price-range,
.date-range {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  gap: 12px;
  align-items: center;
}

.price-range__split,
.date-range__split {
  color: #aeb7bf;
  font-size: 14px;
}

.filter-actions {
  display: flex;
  gap: 12px;
}

.icon-button {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  border: 1px solid #dfe7e3;
  border-radius: 8px;
  background: #ffffff;
  color: #3f4b58;
}

.icon-button svg {
  width: 18px;
  height: 18px;
}

.icon-button--primary {
  border-color: #39cf9d;
  background: #39cf9d;
  color: #ffffff;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 18px;
}

.toolbar__actions {
  display: flex;
  gap: 14px;
}

.toolbar-button {
  min-width: 92px;
  height: 40px;
  padding: 0 18px;
  border: 1px solid #dfe7e3;
  border-radius: 8px;
  background: #ffffff;
  color: #32404d;
  font-size: 13px;
  font-weight: 500;
}

.toolbar-button--primary {
  border-color: #39cf9d;
  background: #39cf9d;
  color: #ffffff;
}

.table-wrap {
  overflow: hidden;
  border: 1px solid #edf2ef;
  border-radius: 10px;
}

.table-scroll {
  overflow-x: auto;
  overflow-y: hidden;
}

.table-head,
.table-row {
  display: grid;
  grid-template-columns: 360px 150px 160px 118px 118px 140px 180px 220px;
  min-width: 1446px;
}

.table-head {
  align-items: stretch;
  min-height: 68px;
  background: #fafafa;
  color: #2f3946;
  font-size: 13px;
  font-weight: 600;
}

.table-head > span {
  display: flex;
  align-items: center;
  padding: 0 16px;
  line-height: 1.45;
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
  padding: 18px 16px;
  color: #2f3946;
  font-size: 13px;
  line-height: 1.5;
}

.cell--product {
  gap: 14px;
  min-width: max-content;
}

.cell--product img {
  width: 110px;
  height: 72px;
  border-radius: 14px;
  object-fit: cover;
  flex: none;
}

.cell--product strong {
  display: block;
  flex: none;
  color: #30404d;
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
}

.tag-stack {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tag-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: fit-content;
  min-width: 78px;
  height: 28px;
  padding: 0 10px;
  border-radius: 8px;
  background: #eefaf5;
  color: #58caa3;
  font-size: 12px;
}

.tag-stack .tag-chip:last-child {
  background: #fff8e8;
  color: #f2b84f;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #6c7884;
}

.status-pill i {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: currentColor;
}

.status-pill--online {
  color: #45d0a6;
}

.cell--actions {
  display: flex;
  flex-wrap: nowrap;
  gap: 8px 18px;
  align-content: center;
  min-width: max-content;
}

.table-link {
  flex: none;
  padding: 0;
  border: 0;
  background: transparent;
  font-size: 13px;
}

.table-link--green {
  color: #39cf9d;
}

.table-link--red {
  color: #ff8c86;
}

@media (max-width: 1540px) {
  .table-head,
  .table-row {
    grid-template-columns: 360px 150px 160px 118px 118px 140px 180px 220px;
  }
}

@media (max-width: 1260px) {
  .filters {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .field--price,
  .field--date {
    grid-column: span 2;
  }
}

@media (max-width: 920px) {
  .filters {
    grid-template-columns: 1fr;
  }

  .field--price,
  .field--date,
  .field--keyword {
    grid-column: span 1;
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
