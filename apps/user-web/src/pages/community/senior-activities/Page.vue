<script setup lang="ts">
import { onMounted, ref } from "vue";
import type { PageComponentProps } from "@ihc/page-core/types";
import { getCommunityActivities, type CommunityActivityItem } from "@/shared/api/community";
import { selectedSeniorActivityId } from "./state";

type TabKey = "hot" | "latest";

const props = defineProps<PageComponentProps>();
const activeTab = ref<TabKey>("hot");
const activities = ref<CommunityActivityItem[]>([]);
const loading = ref(false);

const tabs: ReadonlyArray<{ key: TabKey; label: string }> = [
  { key: "hot", label: "热门活动" },
  { key: "latest", label: "最新发布" }
];

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "请求失败，请稍后重试";
}

function resolveTypeKey(category: string) {
  return category.includes("户外") ? "outdoor" : "culture";
}

function resolveStatusText(status: string) {
  if (status === "ONGOING") {
    return "进行中";
  }

  if (status === "ENDED") {
    return "已结束";
  }

  if (status === "CANCELLED") {
    return "已取消";
  }

  return "未开始";
}

function resolveStatusKey(status: string) {
  if (status === "ONGOING") {
    return "ongoing";
  }

  return "upcoming";
}

function formatDateRange(item: CommunityActivityItem) {
  if (item.time) {
    return item.time;
  }

  const start = new Date(item.startAt);
  const end = new Date(item.endAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return `${item.startAt}~${item.endAt}`;
  }

  const format = (date: Date) => `${date.getFullYear()}.${`${date.getMonth() + 1}`.padStart(2, "0")}.${`${date.getDate()}`.padStart(2, "0")}`;
  return `${format(start)}~${format(end)}`;
}

async function loadActivities() {
  loading.value = true;

  try {
    const response = await getCommunityActivities({
      sort: activeTab.value,
      page: 1,
      pageSize: 20
    });
    activities.value = response.list;
  } catch (error) {
    props.showToast(getErrorMessage(error));
  } finally {
    loading.value = false;
  }
}

function goBack() {
  if (!props.navigation.navigateBack()) {
    props.navigation.reLaunch("home/dashboard");
  }
}

function selectTab(tab: TabKey) {
  activeTab.value = tab;
  void loadActivities();
}

function openActivity(activityId: string) {
  selectedSeniorActivityId.value = activityId;
  props.navigation.navigateTo("community/senior-activity-detail");
}

onMounted(() => {
  void loadActivities();
});
</script>

<template>
  <section class="senior-activities-page">
    <header class="activities-nav">
      <button class="back-btn" type="button" aria-label="返回" @click="goBack">
        <span class="back-arrow" aria-hidden="true"></span>
      </button>
      <h1>老年活动</h1>
    </header>

    <main class="activities-scroll">
      <section class="tab-bar" aria-label="活动列表排序">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          class="tab-btn"
          :class="{ 'tab-btn--active': activeTab === tab.key }"
          type="button"
          @click="selectTab(tab.key)"
        >
          {{ tab.label }}
        </button>
      </section>

      <p v-if="loading" class="state-text">活动加载中...</p>

      <section v-else class="activity-list">
        <article
          v-for="item in activities"
          :key="item.activityId"
          class="activity-card"
          role="button"
          tabindex="0"
          @click="openActivity(item.activityId)"
          @keydown.enter="openActivity(item.activityId)"
        >
          <div class="activity-cover-wrap">
            <img class="activity-cover" :src="item.coverUrl || item.image || ''" :alt="item.title" draggable="false" />
            <span class="status-badge" :class="`status-badge--${resolveStatusKey(item.status)}`">{{ resolveStatusText(item.status) }}</span>
          </div>

          <div class="activity-copy">
            <span class="type-tag" :class="`type-tag--${resolveTypeKey(item.category)}`">{{ item.category }}</span>
            <h2>{{ item.title }}</h2>
            <p>时间：{{ formatDateRange(item) }}</p>
            <p>地点：{{ item.location }}</p>
            <p>费用：{{ item.price || (item.fee ? `${item.fee}元` : "免费") }}</p>
          </div>
        </article>

        <p v-if="!activities.length" class="state-text">暂无活动内容</p>
      </section>
    </main>
  </section>
</template>

<style scoped>
.senior-activities-page {
  position: relative;
  left: 50%;
  width: min(390px, 100vw);
  height: min(844px, calc(100vh - 36px));
  min-height: min(844px, calc(100vh - 36px));
  max-height: 844px;
  margin: -18px 0;
  overflow: hidden;
  background: linear-gradient(180deg, #f7f8fc 0%, #f8f9fd 100%);
  color: #343944;
  font-family: var(--ihc-font-family);
  transform: translateX(-50%);
  -webkit-font-smoothing: antialiased;
}

.activities-nav {
  display: flex;
  align-items: center;
  height: 58px;
  padding: 0 18px;
}

.back-btn {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 0;
  background: transparent;
}

.back-arrow {
  width: 11px;
  height: 11px;
  border-bottom: 2px solid #2d3139;
  border-left: 2px solid #2d3139;
  transform: rotate(45deg);
}

.activities-nav h1 {
  margin: 0 0 0 10px;
  font-size: 16px;
  font-weight: 400;
  color: #31353e;
}

.activities-scroll {
  height: calc(100% - 58px);
  padding: 6px 16px 24px;
  overflow-y: auto;
  scrollbar-width: none;
}

.activities-scroll::-webkit-scrollbar {
  display: none;
}

.tab-bar {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
  padding: 3px;
  border-radius: 13px;
  background: rgba(233, 235, 241, 0.96);
}

.tab-btn {
  height: 34px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: #92897e;
  font-size: 13px;
  font-weight: 400;
}

.tab-btn--active {
  background: #ffffff;
  color: #6570f0;
  box-shadow: 0 6px 16px rgba(139, 147, 190, 0.12);
}

.activity-list {
  margin-top: 18px;
}

.activity-card {
  display: grid;
  grid-template-columns: 156px minmax(0, 1fr);
  gap: 18px;
  align-items: start;
  padding: 8px 0 22px;
  border-bottom: 1px solid #eceef3;
  background: transparent;
}

.activity-card:first-child {
  padding-top: 0;
}

.activity-cover-wrap {
  position: relative;
  width: 156px;
  height: 156px;
  overflow: hidden;
  border-radius: 18px;
}

.activity-cover {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.status-badge {
  position: absolute;
  top: 0;
  left: 0;
  padding: 7px 16px;
  border-radius: 0 0 14px 0;
  color: #ffffff;
  font-size: 11px;
  font-weight: 400;
}

.status-badge--upcoming {
  background: linear-gradient(90deg, #ff8c73 0%, #ffd16d 100%);
}

.status-badge--ongoing {
  background: linear-gradient(90deg, #42d39d 0%, #19d7ec 100%);
}

.activity-copy {
  min-width: 0;
  padding-top: 10px;
}

.type-tag {
  display: inline-flex;
  align-items: center;
  height: 28px;
  padding: 0 12px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 400;
}

.type-tag--culture {
  background: rgba(110, 239, 211, 0.16);
  color: #3bc7a4;
}

.type-tag--outdoor {
  background: rgba(116, 120, 240, 0.12);
  color: #6976f7;
}

.activity-copy h2 {
  margin: 12px 0 14px;
  color: #353944;
  font-size: 17px;
  font-weight: 400;
  line-height: 1.38;
}

.activity-copy p {
  margin: 6px 0 0;
  color: #a0a4ad;
  font-size: 12px;
  font-weight: 400;
  line-height: 1.45;
}

.state-text {
  margin: 0;
  padding: 28px 0;
  color: #a0a4ad;
  font-size: 13px;
  text-align: center;
}

@media (min-width: 561px) {
  .senior-activities-page {
    height: 844px;
    min-height: 844px;
  }
}

@media (max-width: 389px) {
  .activities-scroll {
    padding-right: 14px;
    padding-left: 14px;
  }

  .activity-card {
    grid-template-columns: 138px minmax(0, 1fr);
    gap: 14px;
  }

  .activity-cover-wrap {
    width: 138px;
    height: 138px;
  }

  .activity-copy h2 {
    font-size: 16px;
  }
}
</style>
