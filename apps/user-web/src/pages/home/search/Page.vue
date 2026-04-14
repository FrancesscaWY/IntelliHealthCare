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
</script>

<template>
  <section class="search-page">
    <header class="search-nav">
      <label class="search-input-wrap">
        <span class="search-icon" aria-hidden="true"></span>
        <input v-model="keyword" type="search" :placeholder="mock.placeholder" autofocus />
      </label>
      <button class="cancel-btn" type="button" @click="goBack">取消</button>
    </header>

    <main class="search-content">
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
  font-family: "HarmonyOS Sans SC", "MiSans", "Source Han Sans SC", "Noto Sans SC", "PingFang SC", "Microsoft YaHei UI", sans-serif;
  transform: translateX(-50%);
  -webkit-font-smoothing: antialiased;
}

.search-nav {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 54px;
  align-items: center;
  gap: 16px;
  height: 95px;
  padding: 17px 31px 0;
}

.search-input-wrap {
  display: flex;
  align-items: center;
  height: 59px;
  padding: 0 21px;
  border: 1px solid #eeeeee;
  border-radius: 12px;
  background: #ffffff;
  box-shadow: 0 10px 24px rgba(54, 67, 92, 0.03);
}

.search-icon {
  position: relative;
  flex: 0 0 24px;
  width: 24px;
  height: 24px;
  margin-right: 15px;
  border: 3px solid #c8c8c8;
  border-radius: 50%;
}

.search-icon::after {
  position: absolute;
  right: -8px;
  bottom: -5px;
  width: 11px;
  height: 3px;
  content: "";
  border-radius: 999px;
  background: #c8c8c8;
  transform: rotate(45deg);
}

.search-input-wrap input {
  flex: 1;
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: #30343f;
  font-size: 20px;
  font-weight: 400;
}

.search-input-wrap input::placeholder {
  color: #c3c5cb;
  opacity: 1;
}

.cancel-btn,
.history-header button,
.history-tags button {
  border: 0;
  background: transparent;
  color: inherit;
}

.cancel-btn {
  padding: 0;
  color: #6d7078;
  font-size: 18px;
  font-weight: 400;
  text-align: right;
}

.search-content {
  padding: 49px 34px 0;
}

.history-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.history-header h1 {
  margin: 0;
  color: #30343f;
  font-size: 20px;
  font-weight: 600;
  letter-spacing: 0.03em;
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
  gap: 19px 15px;
  margin-top: 25px;
}

.history-tags button {
  width: auto;
  min-width: 82px;
  height: 52px;
  padding: 0 18px;
  border: 1px solid #eeeeee;
  border-radius: 14px;
  background: #ffffff;
  color: #666a73;
  font-size: 19px;
  font-weight: 500;
  letter-spacing: 0.02em;
  white-space: nowrap;
  box-shadow: 0 8px 18px rgba(54, 67, 92, 0.025);
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
    min-width: 76px;
    padding-right: 14px;
    padding-left: 14px;
  }
}
</style>
