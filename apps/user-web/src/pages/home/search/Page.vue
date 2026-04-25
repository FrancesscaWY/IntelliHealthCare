<script setup lang="ts">
import { onMounted, ref } from "vue";
import type { PageComponentProps } from "@ihc/page-core/types";
import {
  addSearchHistory,
  clearSearchHistory as clearSearchHistoryRequest,
  getGlobalSearch,
  getSearchHotTags,
  getSearchHistory,
  type GlobalSearchItem,
  type SearchHotTagItem
} from "@/shared/api/search";
import {
  clearGlobalSearchState,
  readGlobalSearchState,
  saveGlobalSearchState
} from "@/shared/search/session";
import mock from "./mock";

const props = defineProps<PageComponentProps>();
const keyword = ref("");
const isSearching = ref(false);
const isLoadingHistory = ref(false);
const isClearingHistory = ref(false);
const searched = ref(false);
const results = ref<GlobalSearchItem[]>([]);
const resultTotal = ref(0);
const histories = ref([...mock.histories]);
const hotSearches = ref(createHotSearches(mock.hotSearches));

function normalizeHistoryKeyword(value: string) {
  return value.trim().toLocaleLowerCase();
}

function formatHotScore(score: number) {
  if (!Number.isFinite(score) || score <= 0) {
    return "";
  }

  if (score >= 10000) {
    return `${(score / 10000).toFixed(1)}万`;
  }

  return String(score);
}

function createHotSearches(
  items: Array<{
    keyword: string;
    heat: string;
  }>
) {
  return items.map((item, index) => ({
    keyword: item.keyword,
    heat: item.heat,
    rank: index + 1
  }));
}

function mapHotSearches(items: SearchHotTagItem[]) {
  return items.map((item, index) => ({
    keyword: item.keyword,
    heat: formatHotScore(item.hotScore),
    rank: item.rank || index + 1
  }));
}

const targetTypeText: Record<GlobalSearchItem["targetType"], string> = {
  service: "服务",
  article: "资讯",
  disease: "疾病",
  activity: "活动"
};

function goBack() {
  if (!props.navigation.navigateBack()) {
    props.navigation.reLaunch("home/dashboard");
  }
}

async function loadSearchHistory() {
  try {
    isLoadingHistory.value = true;
    const items = await getSearchHistory();

    histories.value = items.map((item) => item.keyword);
  } catch (error) {
    props.showToast(getSearchErrorMessage(error));
  } finally {
    isLoadingHistory.value = false;
  }
}

async function loadHotTags() {
  try {
    const items = await getSearchHotTags();

    if (items.length) {
      hotSearches.value = mapHotSearches(items);
    }
  } catch {
    hotSearches.value = createHotSearches(mock.hotSearches);
  }
}

async function clearHistory() {
  if (isClearingHistory.value) {
    return;
  }

  try {
    isClearingHistory.value = true;
    await clearSearchHistoryRequest();
    histories.value = [];
    props.showToast("历史记录已清空");
  } catch (error) {
    props.showToast(getSearchErrorMessage(error));
  } finally {
    isClearingHistory.value = false;
  }
}

function selectHistory(value: string) {
  keyword.value = value;
}

function getSearchErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "搜索失败，请稍后重试";
}

function rememberHistory(keywordValue: string) {
  const normalizedKeyword = normalizeHistoryKeyword(keywordValue);

  histories.value = [
    keywordValue,
    ...histories.value.filter((item) => normalizeHistoryKeyword(item) !== normalizedKeyword)
  ].slice(0, 20);
}

function applySearchState(state: {
  keyword: string;
  list: GlobalSearchItem[];
  total: number;
}) {
  keyword.value = state.keyword;
  results.value = state.list;
  resultTotal.value = state.total;
  searched.value = true;
}

function openResult(item: GlobalSearchItem) {
  const pageIdByType: Record<GlobalSearchItem["targetType"], string> = {
    service: "service/home-care",
    article: "content/health-news-detail",
    disease: "content/disease-detail",
    activity: "community/senior-activity-detail"
  };
  const pageId = pageIdByType[item.targetType];

  if (!pageId) {
    props.showToast(`${item.title}详情待接入`);
    return;
  }

  props.navigation.navigateTo(pageId);
}

async function submitSearch(nextKeyword = keyword.value) {
  const normalizedKeyword = nextKeyword.trim();

  if (!normalizedKeyword) {
    props.showToast("请输入搜索关键词");
    return;
  }

  try {
    isSearching.value = true;
    keyword.value = normalizedKeyword;

    const result = await getGlobalSearch(normalizedKeyword, 1, 10);
    saveGlobalSearchState({
      keyword: normalizedKeyword,
      list: result.list,
      page: result.page,
      pageSize: result.pageSize,
      total: result.total,
      hasMore: result.hasMore
    });
    applySearchState({
      keyword: normalizedKeyword,
      list: result.list,
      total: result.total
    });

    try {
      const historyItem = await addSearchHistory(normalizedKeyword);
      rememberHistory(historyItem.keyword);
    } catch {
      // 搜索结果优先展示，历史记录失败不阻断主流程。
    }
  } catch (error) {
    props.showToast(getSearchErrorMessage(error));
  } finally {
    isSearching.value = false;
  }
}

onMounted(() => {
  void loadHotTags();
  void loadSearchHistory();

  const savedState = readGlobalSearchState();

  if (!savedState) {
    return;
  }

  applySearchState({
    keyword: savedState.keyword,
    list: savedState.list,
    total: savedState.total
  });
  clearGlobalSearchState();
});
</script>

<template>
  <section class="search-page">
    <header class="search-nav">
      <button class="back-btn" type="button" aria-label="返回" @click="goBack">
        <span class="back-arrow" aria-hidden="true"></span>
      </button>
      <div class="search-input-wrap">
        <input v-model="keyword" type="search" :placeholder="mock.placeholder" autofocus @keydown.enter="submitSearch()" />
        <button class="search-submit" type="button" @click="submitSearch()">
          {{ isSearching ? "搜索中" : "搜索" }}
        </button>
      </div>
    </header>

    <main class="search-content">
      <section v-if="searched" class="result-section">
        <header class="result-header">
          <h1>搜索结果</h1>
          <span>{{ resultTotal }}条</span>
        </header>

        <div v-if="results.length" class="result-list">
          <button v-for="item in results" :key="`${item.targetType}-${item.targetId}`" type="button" @click="openResult(item)">
            <span class="result-type">{{ targetTypeText[item.targetType] }}</span>
            <strong>{{ item.title }}</strong>
            <p>{{ item.summary || "暂无结果摘要" }}</p>
          </button>
        </div>

        <div v-else class="result-empty">未找到与“{{ keyword }}”相关的结果</div>
      </section>

      <section class="hot-section">
        <h1>{{ mock.hotTitle }}</h1>
        <div class="hot-list">
          <button
            v-for="item in hotSearches"
            :key="item.keyword"
            type="button"
            @click="submitSearch(item.keyword)"
          >
            <span class="hot-rank">{{ item.rank }}</span>
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

        <div v-if="histories.length" class="history-tags">
          <button v-for="item in histories" :key="item" type="button" @click="selectHistory(item)">
            {{ item }}
          </button>
        </div>

        <div v-else class="history-empty">
          {{ isLoadingHistory ? "正在加载搜索历史" : "暂无搜索历史" }}
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
.hot-list button,
.result-list button {
  border: 0;
  background: transparent;
  color: inherit;
}

.search-content {
  padding: 28px 24px 0;
}

.result-section {
  margin-bottom: 28px;
}

.result-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.result-header h1 {
  margin: 0;
  color: #202534;
  font-size: 20px;
  font-weight: 900;
  letter-spacing: 0;
}

.result-header span {
  color: #8f96a3;
  font-size: 13px;
  font-weight: 800;
}

.result-list {
  display: grid;
  gap: 12px;
  margin-top: 18px;
}

.result-list button {
  display: grid;
  gap: 8px;
  padding: 16px 14px;
  border: 1px solid rgba(255, 255, 255, 0.72);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 12px 24px rgba(82, 105, 148, 0.06);
  color: #202534;
  text-align: left;
}

.result-type {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: fit-content;
  min-width: 44px;
  height: 24px;
  padding: 0 10px;
  border-radius: 999px;
  background: rgba(117, 214, 223, 0.16);
  color: #4f6d77;
  font-size: 12px;
  font-weight: 900;
}

.result-list strong {
  color: #202534;
  font-size: 15px;
  font-weight: 900;
  line-height: 1.45;
}

.result-list p {
  margin: 0;
  color: #828b99;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.6;
}

.result-empty {
  margin-top: 18px;
  padding: 18px 14px;
  border: 1px solid #e6e8f6;
  border-radius: 12px;
  background: rgba(117, 214, 223, 0.08);
  color: #6c7482;
  font-size: 14px;
  font-weight: 700;
  text-align: center;
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

.history-empty {
  margin-top: 20px;
  padding: 18px 14px;
  border: 1px solid #e6e8f6;
  border-radius: 12px;
  background: rgba(117, 214, 223, 0.08);
  color: #6c7482;
  font-size: 14px;
  font-weight: 700;
  text-align: center;
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
