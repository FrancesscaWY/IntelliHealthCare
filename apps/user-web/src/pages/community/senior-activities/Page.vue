<script setup lang="ts">
import { computed, ref } from "vue";
import type { PageComponentProps } from "@ihc/page-core/types";
import mock from "./mock";
import { selectedSeniorActivityId } from "./state";

type TabKey = "hot" | "latest";

const props = defineProps<PageComponentProps>();
const activeTab = ref<TabKey>("hot");
const tabs = mock.tabs as ReadonlyArray<{ key: TabKey; label: string }>;

const visibleActivities = computed(() => mock.activities[activeTab.value]);

function goBack() {
  if (!props.navigation.navigateBack()) {
    props.navigation.reLaunch("home/dashboard");
  }
}

function selectTab(tab: TabKey) {
  activeTab.value = tab;
}

function openActivity(activityId: string) {
  selectedSeniorActivityId.value = activityId;
  props.navigation.navigateTo("community/senior-activity-detail");
}
</script>

<template>
  <section class="senior-activities-page">
    <header class="activities-nav">
      <button class="back-btn" type="button" aria-label="返回" @click="goBack">
        <span class="back-arrow" aria-hidden="true"></span>
      </button>
      <h1>{{ mock.title }}</h1>
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

      <section class="activity-list">
        <article
          v-for="item in visibleActivities"
          :key="item.id"
          class="activity-card"
          role="button"
          tabindex="0"
          @click="openActivity(item.id)"
          @keydown.enter="openActivity(item.id)"
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
            <p>费用：{{ item.price }}</p>
          </div>
        </article>
      </section>
    </main>
  </section>
</template>

<style scoped>
.senior-activities-page {
  position: relative;
  left: 50%;
  width: min(390px, 100vw);
  height: auto;
  min-height: var(--ihc-page-min-height);
  max-height: none;
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

@media (min-width: 561px) {
  .senior-activities-page {
    height: auto;
    min-height: var(--ihc-page-min-height);
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
