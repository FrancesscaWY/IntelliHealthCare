<script setup lang="ts">
import { computed, ref } from "vue";
import type { PageComponentProps } from "@ihc/page-core/types";
import mock from "./mock";

const props = defineProps<PageComponentProps>();

const selectedTag = ref(mock.tagOptions[0]);
const startDate = ref("2024-10-01");
const endDate = ref("2024-10-31");
const keyword = ref("");
const viewMode = ref<"grid" | "list">("grid");

const filteredUsers = computed(() =>
  mock.users.filter((user) => {
    const matchesTag =
      selectedTag.value === "全部标签" || user.tags.some((tag) => tag.label === selectedTag.value);
    const matchesKeyword =
      !keyword.value.trim() ||
      `${user.nickname}${user.id}${user.realName}${user.phone}`.includes(keyword.value.trim());
    const registeredDate = user.registeredAt.slice(0, 10);
    const matchesStart = !startDate.value || registeredDate >= startDate.value;
    const matchesEnd = !endDate.value || registeredDate <= endDate.value;
    return matchesTag && matchesKeyword && matchesStart && matchesEnd;
  }),
);

function submitSearch() {
  props.showToast(`已筛选 ${filteredUsers.value.length} 位用户`);
}

function resetFilters() {
  selectedTag.value = mock.tagOptions[0];
  startDate.value = "2024-10-01";
  endDate.value = "2024-10-31";
  keyword.value = "";
  props.showToast("筛选条件已重置");
}

function openAction(label: string, nickname?: string) {
  props.showToast(nickname ? `${label}：${nickname}` : `${label}功能为演示状态`);
}
</script>

<template>
  <section class="member-page">
    <article class="member-panel member-panel--filters">
      <header class="section-head">
        <span class="section-head__accent"></span>
        <h1>{{ mock.title }}</h1>
      </header>

      <div class="filters">
        <label class="field">
          <span class="field__label">用户标签</span>
          <div class="field__control field__control--select">
            <select v-model="selectedTag">
              <option v-for="option in mock.tagOptions" :key="option" :value="option">{{ option }}</option>
            </select>
            <svg viewBox="0 0 16 16" focusable="false" aria-hidden="true">
              <path d="m3 6 5 5 5-5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.7" />
            </svg>
          </div>
        </label>

        <label class="field field--date">
          <span class="field__label">注册日期</span>
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

    <article class="member-panel member-panel--list">
      <header class="records-head">
        <div class="records-head__view">
          <button
            class="view-toggle"
            :class="{ 'view-toggle--active': viewMode === 'grid' }"
            type="button"
            aria-label="网格视图"
            @click="viewMode = 'grid'"
          >
            <svg viewBox="0 0 18 18" focusable="false" aria-hidden="true">
              <rect x="2" y="2" width="5" height="5" rx="1" fill="currentColor" />
              <rect x="11" y="2" width="5" height="5" rx="1" fill="currentColor" />
              <rect x="2" y="11" width="5" height="5" rx="1" fill="currentColor" />
              <rect x="11" y="11" width="5" height="5" rx="1" fill="currentColor" />
            </svg>
          </button>
          <button
            class="view-toggle"
            :class="{ 'view-toggle--active': viewMode === 'list' }"
            type="button"
            aria-label="列表视图"
            @click="viewMode = 'list'"
          >
            <svg viewBox="0 0 18 18" focusable="false" aria-hidden="true">
              <circle cx="3.5" cy="4" r="1.2" fill="currentColor" />
              <circle cx="3.5" cy="9" r="1.2" fill="currentColor" />
              <circle cx="3.5" cy="14" r="1.2" fill="currentColor" />
              <path d="M7 4h8M7 9h8M7 14h8" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.8" />
            </svg>
          </button>
        </div>

        <div class="records-head__actions">
          <button class="toolbar-button toolbar-button--primary" type="button" @click="openAction('新增用户')">新增</button>
          <button class="toolbar-button" type="button" @click="openAction('批量操作')">批量操作</button>
        </div>
      </header>

      <div :class="['member-grid', { 'member-grid--list': viewMode === 'list' }]">
        <article v-for="user in filteredUsers" :key="user.id" class="member-card">
          <div class="member-card__head">
            <img :src="user.avatar" :alt="user.nickname" />
            <div class="member-card__identity">
              <h3>{{ user.nickname }}</h3>
              <p>ID:{{ user.id }}</p>
            </div>
            <button class="member-card__delete" type="button" aria-label="删除用户" @click="openAction('删除用户', user.nickname)">
              <svg viewBox="0 0 18 18" focusable="false" aria-hidden="true">
                <path d="M4.5 5.2h9M7 5.2V3.6h4v1.6M6.1 7.2v6M9 7.2v6M11.9 7.2v6M5.2 5.2l.5 9a1.4 1.4 0 0 0 1.4 1.3h3.8a1.4 1.4 0 0 0 1.4-1.3l.5-9" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" />
              </svg>
            </button>
          </div>

          <div class="member-card__tags">
            <span v-for="tag in user.tags" :key="tag.label" class="member-tag" :class="`member-tag--${tag.tone}`">
              {{ tag.label }}
            </span>
          </div>

          <dl class="member-card__meta">
            <div>
              <dt>真实姓名：</dt>
              <dd>{{ user.realName }}</dd>
            </div>
            <div>
              <dt>手机号码：</dt>
              <dd>{{ user.phone }}</dd>
            </div>
            <div>
              <dt>注册时间：</dt>
              <dd>{{ user.registeredAt }}</dd>
            </div>
          </dl>

          <footer class="member-card__foot">
            <button class="member-card__button member-card__button--primary" type="button" @click="openAction('用户详情', user.nickname)">
              用户详情
            </button>
            <button class="member-card__button" type="button" @click="openAction('添加标签', user.nickname)">添加标签</button>
          </footer>
        </article>
      </div>
    </article>
  </section>
</template>

<style scoped>
.member-page {
  display: grid;
  gap: 18px;
  font-family: "PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.member-panel {
  border-radius: 16px;
  background: #ffffff;
  box-shadow: 0 6px 20px rgba(59, 103, 82, 0.05);
}

.member-panel--filters {
  padding: 18px 20px;
}

.member-panel--list {
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
  grid-template-columns: 1fr 1.45fr 1.2fr auto;
  gap: 14px 16px;
  align-items: end;
}

.field {
  display: grid;
  gap: 8px;
}

.field--date {
  min-width: 0;
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

.field__control svg {
  flex: none;
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

.records-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.records-head__view,
.records-head__actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.view-toggle {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  padding: 0;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: #a2acb6;
}

.view-toggle svg {
  width: 18px;
  height: 18px;
}

.view-toggle--active {
  color: #39cf9d;
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

.member-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.member-grid--list {
  grid-template-columns: 1fr;
}

.member-card {
  display: grid;
  gap: 12px;
  border: 1px solid #edf2ef;
  border-radius: 16px;
  background: #ffffff;
  box-shadow: 0 4px 16px rgba(60, 86, 76, 0.04);
  overflow: hidden;
}

.member-card__head,
.member-card__tags,
.member-card__meta {
  padding: 0 18px;
}

.member-card__head {
  display: grid;
  grid-template-columns: 60px minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  padding-top: 18px;
}

.member-card__head img {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  object-fit: cover;
  filter: grayscale(1);
}

.member-card__identity {
  min-width: 0;
}

.member-card__identity h3 {
  margin: 0;
  color: #2f3946;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0.01em;
  white-space: nowrap;
}

.member-card__identity p {
  margin: 6px 0 0;
  color: #a6afb8;
  font-size: 12px;
  font-weight: 400;
  letter-spacing: 0.01em;
}

.member-card__delete {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 0;
  background: transparent;
  color: #aab2ba;
}

.member-card__delete svg {
  width: 16px;
  height: 16px;
}

.member-card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.member-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 72px;
  height: 28px;
  padding: 0 12px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 400;
  letter-spacing: 0.01em;
}

.member-tag--green {
  background: #e8fbf5;
  color: #30ca97;
}

.member-tag--red {
  background: #fff0ef;
  color: #ff7f78;
}

.member-tag--violet {
  background: #eff0ff;
  color: #6c75f5;
}

.member-card__meta {
  display: grid;
  gap: 8px;
  margin: 0;
}

.member-card__meta div {
  display: flex;
  align-items: baseline;
  gap: 2px;
  color: #9aa5b1;
  font-size: 12px;
  font-weight: 400;
  letter-spacing: 0.01em;
  line-height: 1.2;
}

.member-card__meta dt,
.member-card__meta dd {
  margin: 0;
}

.member-card__foot {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  padding: 14px 18px 18px;
  border-top: 1px solid #f0f3f1;
}

.member-card__button {
  height: 40px;
  border: 1px solid #dfe7e3;
  border-radius: 10px;
  background: #ffffff;
  color: #33404c;
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.01em;
}

.member-card__button--primary {
  border-color: #39cf9d;
  background: #39cf9d;
  color: #ffffff;
}

@media (max-width: 1480px) {
  .member-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 1220px) {
  .filters {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .member-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 860px) {
  .filters {
    grid-template-columns: 1fr;
  }

  .records-head {
    flex-direction: column;
    align-items: stretch;
  }

  .records-head__actions {
    justify-content: flex-end;
  }

  .member-grid {
    grid-template-columns: 1fr;
  }

}
</style>
