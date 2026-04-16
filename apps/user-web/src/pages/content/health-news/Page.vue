<script setup lang="ts">
import { computed, ref } from "vue";
import type { PageComponentProps } from "@ihc/page-core/types";
import mock, { type HealthNewsTabKey } from "./mock";
import { healthNewsDetailTarget } from "./state";

const props = defineProps<PageComponentProps>();
const activeTab = ref<HealthNewsTabKey>("hot");

const cards = computed(() => mock.cards[activeTab.value]);

function goBack() {
  if (!props.navigation.navigateBack()) {
    props.navigation.reLaunch("home/dashboard");
  }
}

function selectTab(tabKey: HealthNewsTabKey) {
  activeTab.value = tabKey;
}

function openDetail() {
  healthNewsDetailTarget.value = "default";
  props.navigation.navigateTo("content/health-news-detail");
}

function openDetailComments() {
  healthNewsDetailTarget.value = "comments";
  props.navigation.navigateTo("content/health-news-detail");
}

function showPending(label: string) {
  props.showToast(`${label}功能待接入`);
}
</script>

<template>
  <section class="health-news-page">
    <header class="page-nav">
      <button class="back-btn" type="button" aria-label="返回" @click="goBack">
        <span class="back-arrow" aria-hidden="true"></span>
      </button>
      <h1>{{ mock.title }}</h1>
    </header>

    <main class="page-scroll">
      <section class="tab-bar" aria-label="资讯分类">
        <button
          v-for="tab in mock.tabs"
          :key="tab.key"
          class="tab-btn"
          :class="{ 'tab-btn--active': activeTab === tab.key }"
          type="button"
          @click="selectTab(tab.key)"
        >
          {{ tab.label }}
        </button>
      </section>

      <section class="card-list" aria-label="资讯列表">
        <article v-for="card in cards" :key="card.id" class="news-card">
          <button class="news-entry" type="button" :aria-label="`查看${card.title}`" @click="openDetail">
            <h2>{{ card.title }}</h2>

            <div class="news-layout" :class="{ 'news-layout--single': card.images.length === 1 }">
              <p>{{ card.summary }}</p>

              <div v-if="card.images.length > 1" class="news-gallery">
                <img v-for="(image, index) in card.images" :key="`${card.id}-${index}`" :src="image" :alt="card.title" draggable="false" />
              </div>

              <img v-else class="news-thumb" :src="card.images[0]" :alt="card.title" draggable="false" />
            </div>
          </button>

          <footer class="card-actions">
            <button class="action-btn action-btn--share" type="button" aria-label="分享" @click="showPending('分享')">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M14 3h7v7" />
                <path d="M10 14 21 3" />
                <path d="M21 14v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h6" />
              </svg>
            </button>

            <button class="action-btn" type="button" @click="showPending('点赞')">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 20.8 5.25 14.1C3.55 12.4 2.4 10.85 2.4 8.65 2.4 5.75 4.65 3.6 7.5 3.6c1.65 0 3.15.78 4.5 2.28 1.35-1.5 2.85-2.28 4.5-2.28 2.85 0 5.1 2.15 5.1 5.05 0 2.2-1.15 3.75-2.85 5.45L12 20.8Z" />
              </svg>
              <span>{{ card.likes }}</span>
            </button>

            <button class="action-btn" type="button" @click="showPending('收藏')">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="m12 3.15 2.68 5.43 5.99.87-4.33 4.22 1.02 5.96L12 16.82l-5.36 2.81 1.02-5.96-4.33-4.22 5.99-.87L12 3.15Z" />
              </svg>
              <span>{{ card.stars }}</span>
            </button>

            <button class="action-btn" type="button" @click="openDetailComments">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M20.3 11.3c0 4.1-3.55 7.35-8.25 7.35-1.05 0-2.05-.17-2.97-.5L4.2 20.7l1.42-4.18C4.45 15.2 3.8 13.4 3.8 11.3c0-4.1 3.55-7.35 8.25-7.35s8.25 3.25 8.25 7.35Z" />
              </svg>
              <span>{{ card.comments }}</span>
            </button>
          </footer>
        </article>
      </section>
    </main>
  </section>
</template>

<style scoped>
.health-news-page {
  position: relative;
  left: 50%;
  width: min(390px, 100vw);
  height: min(844px, calc(100vh - 36px));
  min-height: min(844px, calc(100vh - 36px));
  max-height: 844px;
  margin: -18px 0;
  overflow: hidden;
  background: #f5f5f5;
  color: #333333;
  font-family: var(--ihc-font-family);
  transform: translateX(-50%);
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

.page-nav {
  display: flex;
  align-items: center;
  height: 66px;
  padding: 0 16px 0 18px;
}

.page-scroll {
  height: calc(100% - 66px);
  padding: 2px 16px 22px;
  overflow-y: auto;
  scrollbar-width: none;
}

.page-scroll::-webkit-scrollbar {
  display: none;
}

.back-btn,
.tab-btn,
.news-entry,
.action-btn {
  border: 0;
  background: transparent;
  color: inherit;
}

.back-btn {
  display: grid;
  place-items: center;
  width: 28px;
  height: 38px;
  padding: 0;
}

.back-arrow {
  width: 12px;
  height: 12px;
  border-bottom: 2px solid #2f3138;
  border-left: 2px solid #2f3138;
  transform: rotate(45deg);
}

.page-nav h1 {
  margin: 0 0 0 10px;
  color: #30343d;
  font-size: 20px;
  font-weight: 500;
}

.tab-bar {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  padding: 5px;
  border-radius: 12px;
  background: #eeeeee;
}

.tab-btn {
  height: 36px;
  border-radius: 10px;
  color: #8d8d8d;
  font-size: 15px;
  font-weight: 400;
}

.tab-btn--active {
  background: #ffffff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  color: #6872f0;
  font-weight: 500;
}

.card-list {
  display: grid;
  gap: 12px;
  margin-top: 12px;
}

.news-card {
  padding: 14px 16px 12px;
  border: 1px solid #e9e9e9;
  border-radius: 12px;
  background: #ffffff;
  box-shadow: 0 1px 6px rgba(34, 39, 50, 0.025);
}

.news-card h2 {
  margin: 0;
  color: #333333;
  font-size: 17px;
  font-weight: 600;
  line-height: 1.4;
}

.news-entry {
  display: block;
  width: 100%;
  padding: 0;
  text-align: left;
}

.news-layout {
  margin-top: 10px;
}

.news-layout p {
  margin: 0;
  color: #9a9a9a;
  font-size: 14px;
  line-height: 1.8;
}

.news-gallery {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-top: 10px;
}

.news-gallery img,
.news-thumb {
  display: block;
  width: 100%;
  object-fit: cover;
  user-select: none;
}

.news-gallery img {
  aspect-ratio: 1;
  border-radius: 16px;
}

.news-layout--single {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 102px;
  align-items: start;
  gap: 12px;
}

.news-thumb {
  aspect-ratio: 1;
  border-radius: 18px;
}

.card-actions {
  display: grid;
  grid-template-columns: 1fr auto auto auto;
  align-items: center;
  gap: 16px;
  margin-top: 10px;
}

.action-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0;
  color: #383b43;
  font-size: 15px;
  font-weight: 400;
}

.action-btn--share {
  justify-self: start;
}

.action-btn svg {
  width: 22px;
  height: 22px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.9;
  stroke-linecap: round;
  stroke-linejoin: round;
}

@media (min-width: 561px) {
  .health-news-page {
    height: 844px;
    min-height: 844px;
  }
}

@media (max-width: 389px) {
  .page-scroll {
    padding-right: 14px;
    padding-left: 14px;
  }

  .news-card {
    padding-right: 14px;
    padding-left: 14px;
  }

  .news-gallery {
    gap: 10px;
  }

  .news-layout--single {
    grid-template-columns: minmax(0, 1fr) 92px;
    gap: 10px;
  }

  .card-actions {
    gap: 12px;
  }

  .action-btn {
    font-size: 14px;
  }
}
</style>
