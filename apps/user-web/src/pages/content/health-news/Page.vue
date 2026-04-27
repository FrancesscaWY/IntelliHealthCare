<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import type { PageComponentProps } from "@ihc/page-core/types";
import { favoriteHealthNews, likeHealthNews, listHealthNews, shareHealthNews } from "@/shared/api/content";
import fallbackNewsImage from "@/assets/content/health-lecture-hot.jpg";
import { normalizeNewsImages } from "@/shared/utils/healthNewsMedia";
import mock, { type HealthNewsTabKey } from "./mock";
import { healthNewsDetailTarget, selectedHealthNewsId } from "./state";

const props = defineProps<PageComponentProps>();
const activeTab = ref<HealthNewsTabKey>("hot");

type NewsCardViewModel = {
  id: string;
  newsId: string;
  title: string;
  summary: string;
  images: string[];
  likes: number;
  stars: number;
  comments: number;
  isLiked: boolean;
  isStarred: boolean;
};

const cards = ref<NewsCardViewModel[]>([]);

function createFallbackCards(tabKey: HealthNewsTabKey): NewsCardViewModel[] {
  return mock.cards[tabKey].map((item) => ({
    id: item.id,
    newsId: `mock-${item.id}`,
    title: item.title,
    summary: item.summary,
    images: item.images,
    likes: item.likes,
    stars: item.stars,
    comments: item.comments,
    isLiked: false,
    isStarred: false
  }));
}

async function loadCards() {
  try {
    const response = await listHealthNews({
      page: 1,
      pageSize: 10,
      sort: activeTab.value === "latest" ? "LATEST" : "HOT"
    });

    cards.value = response.list.map((item, index) => ({
      id: item.id || item.newsId || `news-${index + 1}`,
      newsId: item.newsId || item.id || `news-${index + 1}`,
      title: item.title,
      summary: item.summary || "暂无资讯摘要",
      images: normalizeNewsImages(item.newsId || item.id || `news-${index + 1}`, item.title, item.images || [], item.coverUrl),
      likes: item.likesCount ?? 0,
      stars: item.favoritesCount ?? 0,
      comments: item.commentsCount ?? 0,
      isLiked: false,
      isStarred: false
    }));

    if (cards.value.length === 0) {
      cards.value = createFallbackCards(activeTab.value);
    }
  } catch {
    cards.value = createFallbackCards(activeTab.value);
  }
}

function goBack() {
  if (!props.navigation.navigateBack()) {
    props.navigation.reLaunch("home/dashboard");
  }
}

function selectTab(tabKey: HealthNewsTabKey) {
  activeTab.value = tabKey;
}

function openDetail(newsId: string, target: "default" | "comments" = "default") {
  selectedHealthNewsId.value = newsId;
  healthNewsDetailTarget.value = target;
  props.navigation.navigateTo("content/health-news-detail");
}

function applyFallbackImage(event: Event) {
  const target = event.target as HTMLImageElement | null;

  if (!target || target.dataset.fallbackApplied === "true") {
    return;
  }

  target.dataset.fallbackApplied = "true";
  target.src = fallbackNewsImage;
}

async function handleShare(cardId: string) {
  const target = cards.value.find((item) => item.id === cardId);

  if (!target) {
    return;
  }

  if (target.newsId.startsWith("mock-")) {
    props.showToast("分享功能待接入");
    return;
  }

  try {
    await shareHealthNews(target.newsId);
    props.showToast("分享记录已更新");
  } catch {
    props.showToast("分享失败，请稍后再试");
  }
}

async function handleLike(cardId: string) {
  const target = cards.value.find((item) => item.id === cardId);

  if (!target) {
    return;
  }

  if (target.isLiked) {
    props.showToast("已点赞");
    return;
  }

  if (target.newsId.startsWith("mock-")) {
    target.isLiked = true;
    target.likes += 1;
    return;
  }

  try {
    await likeHealthNews(target.newsId);
    target.isLiked = true;
    target.likes += 1;
  } catch {
    props.showToast("点赞失败，请稍后再试");
  }
}

async function handleFavorite(cardId: string) {
  const target = cards.value.find((item) => item.id === cardId);

  if (!target) {
    return;
  }

  if (target.isStarred) {
    props.showToast("已收藏");
    return;
  }

  if (target.newsId.startsWith("mock-")) {
    target.isStarred = true;
    target.stars += 1;
    return;
  }

  try {
    await favoriteHealthNews(target.newsId);
    target.isStarred = true;
    target.stars += 1;
  } catch {
    props.showToast("收藏失败，请稍后再试");
  }
}

onMounted(() => {
  void loadCards();
});

watch(activeTab, () => {
  void loadCards();
});
</script>

<template>
  <section class="health-news-page">
    <header class="page-nav">
      <button class="back-btn" type="button" aria-label="杩斿洖" @click="goBack">
        <span class="back-arrow" aria-hidden="true"></span>
      </button>
      <h1>{{ mock.title }}</h1>
    </header>

    <main class="page-scroll">
      <section class="tab-bar" aria-label="璧勮鍒嗙被">
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

      <section class="card-list" aria-label="璧勮鍒楄〃">
        <article v-for="card in cards" :key="card.id" class="news-card">
          <button class="news-entry" type="button" :aria-label="`鏌ョ湅${card.title}`" @click="openDetail(card.newsId)">
            <h2>{{ card.title }}</h2>

            <div class="news-layout" :class="{ 'news-layout--single': card.images.length <= 1 }">
              <p>{{ card.summary }}</p>

              <div v-if="card.images.length > 1" class="news-gallery">
                <img
                  v-for="(image, index) in card.images"
                  :key="`${card.id}-${index}`"
                  :src="image"
                  :alt="card.title"
                  draggable="false"
                  @error="applyFallbackImage"
                />
              </div>

              <img
                v-else-if="card.images[0]"
                class="news-thumb"
                :src="card.images[0]"
                :alt="card.title"
                draggable="false"
                @error="applyFallbackImage"
              />
            </div>
          </button>

          <footer class="card-actions">
            <button class="action-btn action-btn--share" type="button" aria-label="鍒嗕韩" @click.stop="handleShare(card.id)">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M14 3h7v7" />
                <path d="M10 14 21 3" />
                <path d="M21 14v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h6" />
              </svg>
            </button>

            <button class="action-btn action-btn--like" :class="{ 'action-btn--liked': card.isLiked }" type="button" @click.stop="handleLike(card.id)">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 20.8 5.25 14.1C3.55 12.4 2.4 10.85 2.4 8.65 2.4 5.75 4.65 3.6 7.5 3.6c1.65 0 3.15.78 4.5 2.28 1.35-1.5 2.85-2.28 4.5-2.28 2.85 0 5.1 2.15 5.1 5.05 0 2.2-1.15 3.75-2.85 5.45L12 20.8Z" />
              </svg>
              <span>{{ card.likes }}</span>
            </button>

            <button class="action-btn action-btn--favorite" :class="{ 'action-btn--favorited': card.isStarred }" type="button" @click.stop="handleFavorite(card.id)">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="m12 3.15 2.68 5.43 5.99.87-4.33 4.22 1.02 5.96L12 16.82l-5.36 2.81 1.02-5.96-4.33-4.22 5.99-.87L12 3.15Z" />
              </svg>
              <span>{{ card.stars }}</span>
            </button>

            <button class="action-btn action-btn--comment" type="button" @click.stop="openDetail(card.newsId, 'comments')">
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
  width: min(402px, 100vw);
  height: auto;
  min-height: var(--ihc-page-min-height);
  max-height: none;
  margin: -18px 0;
  overflow: hidden;
  background: #f5f6f7;
  color: #252939;
  font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif;
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
  display: grid;
  place-items: center;
  width: 32px;
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
  cursor: pointer;
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
  gap: 16px;
  margin-top: 14px;
}

.action-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0;
  color: #7b8795;
  font-size: 13px;
  font-weight: 700;
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

.action-btn--liked {
  color: #ef7b72;
}

.action-btn--favorited {
  color: #e3b341;
}

.action-btn--liked svg,
.action-btn--favorited svg {
  fill: currentColor;
}
</style>

