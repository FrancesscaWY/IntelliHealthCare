<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import type { PageComponentProps } from "@ihc/page-core/types";
import { getMyCommunityActivities, type CommunityActivityRegistrationItem } from "@/shared/api/community";
import { selectedSeniorActivityId } from "@/pages/community/senior-activities/state";

type MyActivityTabKey = "ongoing" | "upcoming" | "ended";

const props = defineProps<PageComponentProps>();
const activeTab = ref<MyActivityTabKey>("ongoing");
const activities = ref<CommunityActivityRegistrationItem[]>([]);
const loading = ref(false);

const tabs: Array<{ key: MyActivityTabKey; label: string }> = [
  { key: "ongoing", label: "进行中" },
  { key: "upcoming", label: "未开始" },
  { key: "ended", label: "已结束" }
];

const visibleActivities = computed(() =>
  activities.value
    .filter((item) => resolveTabKey(item) === activeTab.value)
    .map((item) => ({
      id: item.registrationId,
      sourceActivityId: item.activity.activityId,
      title: item.activity.title,
      type: item.activity.category,
      typeKey: resolveTypeKey(item.activity.category),
      status: resolveStatusText(item),
      statusKey: resolveTabKey(item),
      time: `${formatDate(item.activity.startAt)}~${formatDate(item.activity.endAt)}`,
      location: item.activity.location,
      remark: item.cancellationReason || "已报名",
      image: item.activity.coverUrl || ""
    }))
);

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "请求失败，请稍后重试";
}

function resolveTabKey(item: CommunityActivityRegistrationItem): MyActivityTabKey {
  if (item.status === "CANCELLED" || item.activity.status === "ENDED") {
    return "ended";
  }

  if (item.activity.status === "ONGOING") {
    return "ongoing";
  }

  return "upcoming";
}

function resolveStatusText(item: CommunityActivityRegistrationItem) {
  if (item.status === "CANCELLED") {
    return "已取消";
  }

  if (item.activity.status === "ENDED") {
    return "已结束";
  }

  if (item.activity.status === "ONGOING") {
    return "进行中";
  }

  return "未开始";
}

function resolveTypeKey(category: string) {
  return category.includes("户外") ? "outdoor" : "culture";
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}.${month}.${day}`;
}

async function loadActivities() {
  loading.value = true;

  try {
    const response = await getMyCommunityActivities({ page: 1, pageSize: 20 });
    activities.value = response.list;
  } catch (error) {
    props.showToast(getErrorMessage(error));
  } finally {
    loading.value = false;
  }
}

function goBack() {
  if (!props.navigation.navigateBack()) {
    props.navigation.reLaunch("home/mine");
  }
}

function selectTab(tab: MyActivityTabKey) {
  activeTab.value = tab;
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
  <section class="myactivity-page">
    <header class="page-header">
      <button class="back-btn" type="button" aria-label="返回我的页面" @click="goBack">
        <span class="back-arrow" aria-hidden="true"></span>
      </button>
      <h1>我参加的活动</h1>
    </header>

    <main class="page-content">
      <nav class="tab-bar" aria-label="活动状态筛选">
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
      </nav>

      <p v-if="loading" class="state-text">活动加载中...</p>

      <section v-else-if="visibleActivities.length" class="activity-list">
        <article
          v-for="item in visibleActivities"
          :key="item.id"
          class="activity-card"
          role="button"
          tabindex="0"
          @click="openActivity(item.sourceActivityId)"
          @keydown.enter="openActivity(item.sourceActivityId)"
        >
          <div class="activity-cover-wrap">
            <img class="activity-cover" :src="item.image" :alt="item.title" draggable="false" />
            <span class="status-badge" :class="`status-badge--${item.statusKey}`">{{ item.status }}</span>
          </div>

          <div class="activity-copy">
            <span class="type-tag" :class="`type-tag--${item.typeKey}`">{{ item.type }}</span>
            <h2>{{ item.title }}</h2>
            <p>时间：{{ item.time }}</p>
            <p>地点：{{ item.location }}</p>
            <p>说明：{{ item.remark }}</p>
          </div>
        </article>

        <p class="end-text">没有更多了</p>
      </section>

      <section v-else class="empty-state">
        <p>暂无活动记录</p>
      </section>
    </main>
  </section>
</template>

<style scoped>
.myactivity-page {
  position: relative;
  left: 50%;
  width: min(390px, 100vw);
  min-height: min(844px, calc(100vh - 36px));
  margin: -18px 0;
  background: #ffffff;
  color: #2f342d;
  font-family: "HarmonyOS Sans SC", "MiSans", var(--ihc-font-family);
  transform: translateX(-50%);
  -webkit-font-smoothing: antialiased;
}

.page-header {
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr);
  align-items: center;
  gap: 12px;
  height: 68px;
  padding: 0 18px;
}

.back-btn,
.tab-btn {
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
}

.back-btn {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
}

.back-arrow {
  width: 11px;
  height: 11px;
  border-bottom: 2px solid #33383a;
  border-left: 2px solid #33383a;
  transform: rotate(45deg);
}

.page-header h1 {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
}

.page-content {
  padding: 0 16px 24px;
}

.tab-bar {
  display: flex;
  gap: 34px;
  border-bottom: 1px solid #eceff3;
}

.tab-btn {
  position: relative;
  padding: 14px 0 16px;
  color: #c2c6cd;
  font-size: 16px;
  font-weight: 600;
}

.tab-btn--active {
  color: #2f342d;
}

.tab-btn--active::after {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  height: 4px;
  content: "";
  border-radius: 999px;
  background: #22272f;
}

.activity-list {
  padding-top: 18px;
}

.activity-card {
  display: grid;
  grid-template-columns: 152px minmax(0, 1fr);
  gap: 18px;
  align-items: start;
  padding: 8px 0 28px;
  border-bottom: 1px solid #eceef3;
  background: transparent;
}

.activity-card:first-child {
  padding-top: 0;
}

.activity-cover-wrap {
  position: relative;
  width: 152px;
  height: 152px;
  overflow: hidden;
  border-radius: 18px;
}

.activity-cover {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  background: #f2f4f7;
}

.status-badge {
  position: absolute;
  top: 0;
  left: 0;
  padding: 8px 16px;
  border-radius: 0 0 14px 0;
  color: #ffffff;
  font-size: 11px;
  font-weight: 700;
}

.status-badge--ongoing {
  background: linear-gradient(90deg, #24d8d0 0%, #18d8f1 100%);
}

.status-badge--upcoming {
  background: linear-gradient(90deg, #ff9a74 0%, #ffd06f 100%);
}

.status-badge--ended {
  background: linear-gradient(90deg, #9ea8b4 0%, #c1c7d0 100%);
}

.activity-copy {
  min-width: 0;
  padding-top: 22px;
}

.type-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 74px;
  height: 30px;
  padding: 0 10px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 600;
}

.type-tag--culture {
  background: #e9fbf6;
  color: #37d4b4;
}

.type-tag--outdoor {
  background: #eef5ff;
  color: #6a8cef;
}

.activity-copy h2 {
  margin: 14px 0 12px;
  color: #3a3d42;
  font-size: 16px;
  font-weight: 700;
  line-height: 1.5;
}

.activity-copy p {
  margin: 4px 0 0;
  color: #a1a7b0;
  font-size: 13px;
  line-height: 1.45;
}

.empty-state,
.state-text {
  display: grid;
  place-items: center;
  min-height: 320px;
  color: #b9bec6;
  font-size: 15px;
}

.end-text {
  margin: 28px 0 0;
  text-align: center;
  color: #d0d4db;
  font-size: 14px;
  font-weight: 600;
}
</style>
