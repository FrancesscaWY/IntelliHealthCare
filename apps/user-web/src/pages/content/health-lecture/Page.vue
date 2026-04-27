<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import type { PageComponentProps } from "@ihc/page-core/types";
import {
  favoriteHealthLecture,
  likeHealthLecture,
  listHealthLectures,
  shareHealthLecture,
  type HealthLectureListItem
} from "@/shared/api/content";
import mock, { type LectureCard, type LectureTabKey } from "./mock";
import { lectureDetailTarget, selectedLectureId } from "./state";
import { resolveLectureImage } from "@/shared/utils/healthLectureMedia";

const props = defineProps<PageComponentProps>();
const activeTab = ref<LectureTabKey>("hot");
const cards = ref<LectureCard[]>([]);

function createFallbackCards(tabKey: LectureTabKey) {
  return mock.cards[tabKey].map((item) => ({ ...item }));
}

function mapLectureCard(item: HealthLectureListItem, index: number): LectureCard {
  const lectureId = item.lectureId || item.id || `lecture-${index + 1}`;

  return {
    id: item.id || lectureId,
    lectureId,
    title: item.title,
    imageUrl: resolveLectureImage(lectureId, item.title, item.imageUrl, item.coverUrl),
    likes: item.likesCount ?? item.stats?.likes ?? 0,
    stars: item.favoritesCount ?? item.stats?.stars ?? 0,
    comments: item.commentsCount ?? item.stats?.comments ?? 0,
    isLiked: false,
    isStarred: false
  };
}

async function loadCards() {
  try {
    const response = await listHealthLectures({
      page: 1,
      pageSize: 10,
      sort: activeTab.value === "latest" ? "LATEST" : "HOT"
    });

    cards.value = response.list.map(mapLectureCard);

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

function selectTab(tabKey: LectureTabKey) {
  activeTab.value = tabKey;
}

function openDetail(lectureId: string, target: "default" | "comments" = "default") {
  selectedLectureId.value = lectureId;
  lectureDetailTarget.value = target;
  props.navigation.navigateTo("content/health-lecture-detail");
}

async function handleShare(card: LectureCard) {
  if (card.lectureId.startsWith("mock-")) {
    props.showToast("分享功能待接入");
    return;
  }

  try {
    await shareHealthLecture(card.lectureId);
    props.showToast("分享记录已更新");
  } catch {
    props.showToast("分享失败，请稍后再试");
  }
}

async function handleLike(card: LectureCard) {
  if (card.isLiked) {
    props.showToast("已点赞");
    return;
  }

  if (card.lectureId.startsWith("mock-")) {
    card.isLiked = true;
    card.likes += 1;
    return;
  }

  try {
    await likeHealthLecture(card.lectureId);
    card.isLiked = true;
    card.likes += 1;
  } catch {
    props.showToast("点赞失败，请稍后再试");
  }
}

async function handleFavorite(card: LectureCard) {
  if (card.isStarred) {
    props.showToast("已收藏");
    return;
  }

  if (card.lectureId.startsWith("mock-")) {
    card.isStarred = true;
    card.stars += 1;
    return;
  }

  try {
    await favoriteHealthLecture(card.lectureId);
    card.isStarred = true;
    card.stars += 1;
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
  <section class="health-lecture-page">
    <header class="page-nav">
      <button class="back-btn" type="button" aria-label="返回" @click="goBack">
        <span class="back-arrow" aria-hidden="true"></span>
      </button>
      <h1>{{ mock.title }}</h1>
    </header>

    <main class="page-scroll">
      <section class="tab-bar" aria-label="讲堂分类">
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

      <section class="card-list" aria-label="讲堂内容">
        <article v-for="card in cards" :key="card.id" class="lecture-card">
          <h2>{{ card.title }}</h2>

          <button class="cover-btn" type="button" :aria-label="`播放${card.title}`" @click="openDetail(card.lectureId)">
            <img :src="card.imageUrl" :alt="card.title" draggable="false" />
            <span class="play-btn" aria-hidden="true">
              <span class="play-icon"></span>
            </span>
          </button>

          <footer class="card-actions">
            <button class="action-btn action-btn--share" type="button" aria-label="分享" @click.stop="handleShare(card)">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M14 3h7v7" />
                <path d="M10 14 21 3" />
                <path d="M21 14v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h6" />
              </svg>
            </button>

            <button class="action-btn" type="button" @click.stop="handleLike(card)">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 20.8 5.25 14.1C3.55 12.4 2.4 10.85 2.4 8.65 2.4 5.75 4.65 3.6 7.5 3.6c1.65 0 3.15.78 4.5 2.28 1.35-1.5 2.85-2.28 4.5-2.28 2.85 0 5.1 2.15 5.1 5.05 0 2.2-1.15 3.75-2.85 5.45L12 20.8Z" />
              </svg>
              <span>{{ card.likes }}</span>
            </button>

            <button class="action-btn" type="button" @click.stop="handleFavorite(card)">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="m12 3.15 2.68 5.43 5.99.87-4.33 4.22 1.02 5.96L12 16.82l-5.36 2.81 1.02-5.96-4.33-4.22 5.99-.87L12 3.15Z" />
              </svg>
              <span>{{ card.stars }}</span>
            </button>

            <button class="action-btn" type="button" @click.stop="openDetail(card.lectureId, 'comments')">
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
.health-lecture-page {
  position: relative;
  left: 50%;
  width: min(390px, 100vw);
  height: auto;
  min-height: var(--ihc-page-min-height);
  max-height: none;
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
.cover-btn,
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

.lecture-card {
  padding: 14px 16px 12px;
  border: 1px solid #e9e9e9;
  border-radius: 12px;
  background: #ffffff;
  box-shadow: 0 1px 6px rgba(34, 39, 50, 0.025);
}

.lecture-card h2 {
  margin: 0;
  color: #333333;
  font-size: 17px;
  font-weight: 600;
  line-height: 1.4;
}

.cover-btn {
  position: relative;
  display: block;
  width: 100%;
  margin-top: 10px;
  padding: 0;
}

.cover-btn img {
  display: block;
  width: 100%;
  aspect-ratio: 1.58;
  object-fit: cover;
  border-radius: 14px;
  user-select: none;
}

.play-btn {
  position: absolute;
  top: 50%;
  left: 50%;
  display: grid;
  place-items: center;
  width: 58px;
  height: 58px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 10px 22px rgba(0, 0, 0, 0.1);
  transform: translate(-50%, -50%);
}

.play-icon {
  width: 0;
  height: 0;
  margin-left: 4px;
  border-top: 8px solid transparent;
  border-bottom: 8px solid transparent;
  border-left: 13px solid #1f1f1f;
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
  .health-lecture-page {
    height: auto;
    min-height: var(--ihc-page-min-height);
  }
}

@media (max-width: 389px) {
  .page-scroll {
    padding-right: 14px;
    padding-left: 14px;
  }

  .lecture-card {
    padding-right: 14px;
    padding-left: 14px;
  }

  .card-actions {
    gap: 12px;
  }

  .action-btn {
    font-size: 14px;
  }
}
</style>

