<script setup lang="ts">
import { computed, ref } from "vue";
import type { PageComponentProps } from "@ihc/page-core/types";
import { Comment, Like, Share, Star } from "@icon-park/vue-next";
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
      <button class="back-btn" type="button" aria-label="返回" @click="goBack">‹</button>
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
              <Share theme="outline" size="22" fill="#454952" />
            </button>

            <button class="action-btn" type="button" @click="showPending('点赞')">
              <Like theme="outline" size="22" fill="#454952" />
              <span>{{ card.likes }}</span>
            </button>

            <button class="action-btn" type="button" @click="showPending('收藏')">
              <Star theme="outline" size="22" fill="#454952" />
              <span>{{ card.stars }}</span>
            </button>

            <button class="action-btn" type="button" @click="openDetailComments">
              <Comment theme="outline" size="22" fill="#454952" />
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
  width: min(402px, 100vw);
  height: min(874px, calc(100vh - 36px));
  min-height: min(874px, calc(100vh - 36px));
  max-height: 874px;
  margin: -18px 0;
  overflow: hidden;
  background: #f5f6f7;
  color: #252939;
  font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif;
  transform: translateX(-50%);
}

.page-nav {
  display: flex;
  align-items: center;
  height: 64px;
  padding: 0 18px;
}

.page-scroll {
  height: calc(100% - 64px);
  padding: 0 18px 24px;
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
  font: inherit;
}

.back-btn {
  width: 32px;
  height: 38px;
  padding: 0;
  color: #34383f;
  font-size: 38px;
  font-weight: 300;
  line-height: 30px;
}

.page-nav h1 {
  margin: 0 0 0 8px;
  color: #252939;
  font-size: 24px;
  font-weight: 900;
  letter-spacing: 0;
}

.tab-bar {
  display: flex;
  align-items: center;
  gap: 22px;
  padding: 2px 0 18px;
}

.tab-btn {
  height: auto;
  padding: 0;
  color: #9fa2a8;
  font-size: 20px;
  font-weight: 800;
  cursor: pointer;
}

.tab-btn--active {
  color: #252939;
  font-size: 24px;
  font-weight: 900;
}

.card-list {
  display: grid;
  gap: 14px;
}

.news-card {
  padding: 16px;
  border: 0;
  border-radius: 14px;
  background: #ffffff;
  box-shadow: 0 6px 18px rgba(31, 40, 58, 0.04);
}

.news-card h2 {
  margin: 0;
  color: #252939;
  font-size: 17px;
  font-weight: 900;
  line-height: 1.42;
}

.news-entry {
  display: block;
  width: 100%;
  padding: 0;
  text-align: left;
}

.news-layout {
  margin-top: 11px;
}

.news-layout p {
  margin: 0;
  color: #8f939b;
  font-size: 14px;
  font-weight: 700;
  line-height: 1.72;
}

.news-gallery {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
  margin-top: 11px;
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
  border-radius: 7px;
}

.news-layout--single {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 102px;
  align-items: start;
  gap: 12px;
}

.news-thumb {
  aspect-ratio: 1;
  border-radius: 7px;
}

.card-actions {
  display: grid;
  grid-template-columns: 1fr auto auto auto;
  align-items: center;
  gap: 22px;
  margin-top: 13px;
}

.action-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0;
  color: #454952;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
}

.action-btn--share {
  justify-self: start;
}

@media (min-width: 561px) {
  .health-news-page {
    height: 874px;
    min-height: 874px;
  }
}

@media (max-width: 389px) {
  .page-scroll {
    padding-right: 16px;
    padding-left: 16px;
  }

  .news-card {
    padding-right: 14px;
    padding-left: 14px;
  }

  .news-gallery {
    gap: 6px;
  }

  .news-layout--single {
    grid-template-columns: minmax(0, 1fr) 92px;
    gap: 10px;
  }

  .card-actions {
    gap: 16px;
  }

  .action-btn {
    font-size: 12px;
  }
}
</style>
