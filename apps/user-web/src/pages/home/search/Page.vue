<script setup lang="ts">
import { ref } from "vue";
import type { PageComponentProps } from "@ihc/page-core/types";
import mock from "./mock";

const props = defineProps<PageComponentProps>();
const keyword = ref("");

function goBack() {
  if (!props.navigation.navigateBack()) {
    props.navigation.reLaunch("home/dashboard");
  }
}

function clearHistory() {
  props.showToast("历史记录已清空");
}

function selectHistory(value: string) {
  keyword.value = value;
}

function submitSearch() {
  props.showToast(`${keyword.value || "搜索"}功能待接入`);
}
</script>

<template>
  <section class="search-page">
    <header class="search-nav">
      <button class="back-btn" type="button" aria-label="返回" @click="goBack">
        <span class="back-arrow" aria-hidden="true"></span>
      </button>
      <div class="search-input-wrap">
        <input v-model="keyword" type="search" :placeholder="mock.placeholder" autofocus />
        <button class="search-submit" type="button" @click="submitSearch">搜索</button>
      </div>
    </header>

    <main class="search-content">
      <section class="hot-section">
        <h1>{{ mock.hotTitle }}</h1>
        <div class="hot-list">
          <button v-for="(item, index) in mock.hotSearches" :key="item.keyword" type="button" @click="selectHistory(item.keyword)">
            <span class="hot-rank">{{ index + 1 }}</span>
            <strong>{{ item.keyword }}</strong>
            <em>{{ item.heat }}</em>
          </button>
        </div>
      </section>

      <section class="history-section">
        <header class="history-header">
          <h1>{{ mock.historyTitle }}</h1>
          <button type="button" aria-label="清空历史记录" @click="clearHistory">
            <svg class="trash-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M3 6h18" />
              <path d="M8 6V4h8v2" />
              <path d="M6 6l1 15h10l1-15" />
              <path d="M10 10v7" />
              <path d="M14 10v7" />
            </svg>
          </button>
        </header>

        <div class="history-tags">
          <button v-for="item in mock.histories" :key="item" type="button" @click="selectHistory(item)">
            {{ item }}
          </button>
        </div>
      </section>
    </main>
  </section>
</template>

<style scoped>
.search-page {
  position: relative;
  left: 50%;
  width: min(390px, 100vw);
  height: min(844px, calc(100vh - 36px));
  min-height: min(844px, calc(100vh - 36px));
  max-height: 844px;
  margin: -18px 0;
  overflow: hidden;
  background: #ffffff;
  color: #30343f;
  font-family: var(--ihc-font-family);
  transform: translateX(-50%);
  -webkit-font-smoothing: antialiased;
}

.search-nav {
  display: grid;
  grid-template-columns: 30px minmax(0, 1fr);
  align-items: center;
  gap: 10px;
  height: 78px;
  padding: 14px 18px 0;
}

.back-btn {
  display: grid;
  place-items: center;
  width: 30px;
  height: 44px;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
}

.back-arrow {
  width: 13px;
  height: 13px;
  border-bottom: 3px solid #333333;
  border-left: 3px solid #333333;
  transform: rotate(45deg);
}

.search-input-wrap {
  display: flex;
  align-items: center;
  height: 40px;
  padding: 3px 4px 3px 14px;
  border: 2px solid transparent;
  border-radius: 999px;
  background:
    linear-gradient(#ffffff, #ffffff) padding-box,
    linear-gradient(92deg, #8e72e8 0%, #69d5d1 48%, #68db87 100%) border-box;
  box-shadow: 0 13px 28px rgba(68, 144, 162, 0.08);
}

.search-input-wrap input {
  flex: 1;
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: #30343f;
  font-size: 14px;
  font-weight: 700;
}

.search-input-wrap input::placeholder {
  color: #c3c5cb;
  opacity: 1;
}

.search-submit {
  flex: 0 0 72px;
  height: 30px;
  border: 0;
  border-radius: 999px;
  background: linear-gradient(100deg, #75d6df 0%, #7be28e 100%);
  box-shadow: 0 8px 16px rgba(89, 200, 162, 0.18);
  color: #ffffff;
  font-size: 15px;
  font-weight: 900;
  letter-spacing: 0;
}

.history-header button,
.history-tags button,
.hot-list button {
  border: 0;
  background: transparent;
  color: inherit;
}

.search-content {
  padding: 28px 24px 0;
}

.hot-section {
  margin-bottom: 32px;
}

.hot-section h1,
.history-header h1 {
  margin: 0;
  color: #202534;
  font-size: 20px;
  font-weight: 900;
  letter-spacing: 0;
}

.hot-list {
  display: grid;
  gap: 10px;
  margin-top: 17px;
}

.hot-list button {
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  min-height: 48px;
  padding: 0 14px;
  border: 1px solid rgba(255, 255, 255, 0.72);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 12px 24px rgba(82, 105, 148, 0.06);
  color: #202534;
  text-align: left;
}

.hot-rank {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border-radius: 8px;
  background: rgba(117, 214, 223, 0.18);
  color: #202534;
  font-size: 13px;
  font-weight: 900;
}

.hot-list button:nth-child(-n + 3) .hot-rank {
  background: linear-gradient(100deg, #75d6df 0%, #7be28e 100%);
  color: #ffffff;
}

.hot-list strong {
  overflow: hidden;
  color: #202534;
  font-size: 15px;
  font-weight: 900;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hot-list em {
  color: #202534;
  font-size: 12px;
  font-style: normal;
  font-weight: 800;
}

.history-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.history-header button {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  padding: 0;
}

.trash-icon {
  display: block;
  width: 22px;
  height: 22px;
  fill: none;
  stroke: #8f8f8f;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.history-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 9px;
  margin-top: 20px;
}

.history-tags button {
  width: auto;
  min-width: 56px;
  min-height: 32px;
  padding: 0 12px;
  border: 1px solid #e6e8f6;
  border-radius: 8px;
  background: rgba(117, 214, 223, 0.1);
  color: #202534;
  font-size: 14px;
  font-weight: 800;
  letter-spacing: 0;
  white-space: nowrap;
  box-shadow: 0 6px 14px rgba(107, 126, 160, 0.055);
}

@media (min-width: 561px) {
  .search-page {
    height: 844px;
    min-height: 844px;
  }
}

@media (max-width: 389px) {
  .search-nav {
    padding-right: 27px;
    padding-left: 27px;
  }

  .search-content {
    padding-right: 30px;
    padding-left: 30px;
  }

  .history-tags button {
    min-width: 52px;
    padding-right: 10px;
    padding-left: 10px;
  }
}
</style>
