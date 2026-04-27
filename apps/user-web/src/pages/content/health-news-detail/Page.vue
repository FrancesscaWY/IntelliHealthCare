<script setup lang="ts">
import { nextTick, onMounted, ref } from "vue";
import type { PageComponentProps } from "@ihc/page-core/types";
import {
  createHealthNewsComment,
  favoriteHealthNews,
  getHealthNewsDetail,
  likeHealthNews,
  listHealthNewsComments,
  shareHealthNews
} from "@/shared/api/content";
import fallbackNewsImage from "@/assets/content/health-lecture-hot.jpg";
import avatarLiu from "@/assets/content/avatar-liu.jpg?inline";
import { resolveCommentAvatar, resolveNewsHeroImage } from "@/shared/utils/healthNewsMedia";
import mock from "./mock";
import { getCurrentUserCommentProfile, type ContentComment } from "../comment-mock";
import { healthNewsDetailTarget, selectedHealthNewsId } from "../health-news/state";

const props = defineProps<PageComponentProps>();

const commentsSectionRef = ref<HTMLElement | null>(null);
const commentInputRef = ref<HTMLInputElement | null>(null);

const articleTitle = ref(mock.title);
const publishDate = ref(mock.publishDate);
const heroImage = ref(mock.heroImage);
const paragraphs = ref([...mock.paragraphs]);
const liked = ref(false);
const starred = ref(false);
const likeCount = ref(mock.stats.likes);
const starCount = ref(mock.stats.stars);
const commentCount = ref(mock.stats.comments);
const comments = ref<ContentComment[]>([...mock.comments]);
const showComposer = ref(false);
const showEmojiPanel = ref(false);
const replyTarget = ref("");
const replyCommentId = ref("");
const commentDraft = ref("");

const emojiOptions = ["😀", "😉", "😊", "😄", "👍", "👏", "✨", "🌷"];

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "发布时间未知";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return `发布时间：${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}

function applyFallbackImage(event: Event) {
  const target = event.target as HTMLImageElement | null;

  if (!target || target.dataset.fallbackApplied === "true") {
    return;
  }

  target.dataset.fallbackApplied = "true";
  target.src = fallbackNewsImage;
}

function applyFallbackAvatar(event: Event) {
  const target = event.target as HTMLImageElement | null;

  if (!target || target.dataset.fallbackApplied === "true") {
    return;
  }

  target.dataset.fallbackApplied = "true";
  target.src = avatarLiu;
}

function mapComments(items: Array<{
  id: string;
  author: string;
  avatarUrl: string | null;
  createdAt: string;
  city: string | null;
  content: string;
  replyTo?: string;
  likes: number;
  liked: boolean;
  isMine: boolean;
}>): ContentComment[] {
  return items.map((item) => ({
    id: item.id,
    author: item.author || "匿名用户",
    avatarUrl: resolveCommentAvatar(item.author || "匿名用户", item.avatarUrl),
    time: item.createdAt || "刚刚",
    city: item.city || "未知",
    content: item.content,
    replyTo: item.replyTo,
    likes: item.likes ?? 0,
    liked: Boolean(item.liked),
    isMine: Boolean(item.isMine)
  }));
}

async function loadArticle() {
  const newsId = selectedHealthNewsId.value.trim();

  if (!newsId || newsId.startsWith("mock-")) {
    return;
  }

  try {
    const detail = await getHealthNewsDetail(newsId);

    articleTitle.value = detail.title;
    publishDate.value = formatDate(detail.publishedAt);
    heroImage.value = resolveNewsHeroImage(detail.newsId || detail.id || newsId, detail.title, detail.heroImage, detail.coverUrl) || mock.heroImage;
    paragraphs.value = detail.paragraphs?.length ? detail.paragraphs : detail.summary ? [detail.summary] : [...mock.paragraphs];
    liked.value = false;
    starred.value = false;
    likeCount.value = detail.likesCount ?? 0;
    starCount.value = detail.favoritesCount ?? 0;
    commentCount.value = detail.commentsCount ?? 0;
  } catch {
    props.showToast("资讯详情加载失败，已显示本地示例");
  }
}

async function loadComments() {
  const newsId = selectedHealthNewsId.value.trim();

  if (!newsId || newsId.startsWith("mock-")) {
    return;
  }

  try {
    const response = await listHealthNewsComments(newsId, {
      page: 1,
      pageSize: 50
    });

    comments.value = mapComments(response.list);
    commentCount.value = response.total;
  } catch {
    props.showToast("评论加载失败，已显示本地示例");
  }
}

function goBack() {
  if (!props.navigation.navigateBack()) {
    props.navigation.reLaunch("content/health-news");
  }
}

async function toggleLike() {
  const newsId = selectedHealthNewsId.value.trim();

  if (!newsId || newsId.startsWith("mock-")) {
    liked.value = !liked.value;
    likeCount.value += liked.value ? 1 : -1;
    return;
  }

  if (liked.value) {
    props.showToast("已点赞");
    return;
  }

  try {
    await likeHealthNews(newsId);
    liked.value = true;
    likeCount.value += 1;
  } catch {
    props.showToast("点赞失败，请稍后再试");
  }
}

async function toggleStar() {
  const newsId = selectedHealthNewsId.value.trim();

  if (!newsId || newsId.startsWith("mock-")) {
    starred.value = !starred.value;
    starCount.value += starred.value ? 1 : -1;
    return;
  }

  if (starred.value) {
    props.showToast("已收藏");
    return;
  }

  try {
    await favoriteHealthNews(newsId);
    starred.value = true;
    starCount.value += 1;
  } catch {
    props.showToast("收藏失败，请稍后再试");
  }
}

async function shareArticle() {
  const newsId = selectedHealthNewsId.value.trim();

  if (!newsId || newsId.startsWith("mock-")) {
    props.showToast("分享功能待接入");
    return;
  }

  try {
    await shareHealthNews(newsId);
    props.showToast("分享记录已更新");
  } catch {
    props.showToast("分享失败，请稍后再试");
  }
}

function scrollToComments() {
  commentsSectionRef.value?.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function focusCommentInput() {
  scrollToComments();
  await nextTick();
  showComposer.value = true;
  replyTarget.value = "";
  replyCommentId.value = "";
  commentInputRef.value?.focus();
}

function openComposer() {
  showComposer.value = true;
  showEmojiPanel.value = false;
  replyTarget.value = "";
  replyCommentId.value = "";
  void nextTick(() => {
    commentInputRef.value?.focus();
  });
}

async function replyToComment(item: ContentComment) {
  scrollToComments();
  replyTarget.value = item.author;
  replyCommentId.value = item.id;
  showComposer.value = true;
  showEmojiPanel.value = false;
  await nextTick();
  commentInputRef.value?.focus();
}

function closeComposer() {
  showComposer.value = false;
  showEmojiPanel.value = false;
  replyTarget.value = "";
  replyCommentId.value = "";
}

function toggleEmojiPanel() {
  showEmojiPanel.value = !showEmojiPanel.value;
  if (!showEmojiPanel.value) {
    void nextTick(() => {
      commentInputRef.value?.focus();
    });
  }
}

function appendEmoji(emoji: string) {
  commentDraft.value += emoji;
}

function toggleCommentLike(commentId: string) {
  const target = comments.value.find((item) => item.id === commentId);

  if (!target) {
    return;
  }

  target.liked = !target.liked;
  target.likes += target.liked ? 1 : -1;
}

function deleteComment(commentId: string) {
  const index = comments.value.findIndex((item) => item.id === commentId && item.isMine);

  if (index < 0) {
    return;
  }

  comments.value.splice(index, 1);
  commentCount.value = Math.max(0, commentCount.value - 1);
  props.showToast("评论已删除");
}

async function submitComment() {
  const content = commentDraft.value.trim();

  if (!content) {
    props.showToast("请输入评论内容");
    return;
  }

  const newsId = selectedHealthNewsId.value.trim();

  if (!newsId || newsId.startsWith("mock-")) {
    const currentUserCommentProfile = getCurrentUserCommentProfile();

    comments.value.unshift({
      id: `comment-${Date.now()}`,
      author: currentUserCommentProfile.author,
      avatarUrl: currentUserCommentProfile.avatarUrl,
      time: "刚刚",
      city: currentUserCommentProfile.city,
      content,
      replyTo: replyTarget.value || undefined,
      likes: 0,
      liked: false,
      isMine: true
    });
    commentDraft.value = "";
    commentCount.value = comments.value.length;
    closeComposer();
    props.showToast("评论已发布");
    return;
  }

  try {
    await createHealthNewsComment(newsId, {
      parentId: replyCommentId.value || undefined,
      content
    });
    commentDraft.value = "";
    closeComposer();
    await loadArticle();
    await loadComments();
    props.showToast("评论已发布");
  } catch {
    props.showToast("评论发布失败，请稍后再试");
  }
}

onMounted(async () => {
  await loadArticle();
  await loadComments();

  if (healthNewsDetailTarget.value !== "comments") {
    return;
  }

  await nextTick();
  scrollToComments();
  healthNewsDetailTarget.value = "default";
});
</script>

<template>
  <section class="health-news-detail-page">
    <main class="detail-scroll">
      <header class="detail-nav">
        <button class="nav-btn nav-btn--back" type="button" aria-label="返回" @click="goBack">
          <span class="back-arrow" aria-hidden="true"></span>
        </button>
        <h1>{{ mock.navTitle }}</h1>
        <button class="nav-btn" type="button" aria-label="分享" @click="shareArticle">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M14 3h7v7" />
            <path d="M10 14 21 3" />
            <path d="M21 14v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h6" />
          </svg>
        </button>
      </header>

      <article class="article-card">
        <h2>{{ articleTitle }}</h2>
        <p class="publish-date">{{ publishDate }}</p>
        <img class="hero-image" :src="heroImage" :alt="articleTitle" draggable="false" @error="applyFallbackImage" />
        <p v-for="(paragraph, index) in paragraphs" :key="index" class="article-paragraph">{{ paragraph }}</p>
      </article>

      <section ref="commentsSectionRef" class="comments-section">
        <header class="comments-header">
          <h3>全部 {{ commentCount }} 条评论</h3>
        </header>

        <article v-for="item in comments" :key="item.id" class="comment-item" @click="replyToComment(item)">
        <img class="comment-avatar" :src="item.avatarUrl" :alt="item.author" draggable="false" @error="applyFallbackAvatar" />

          <div class="comment-main">
            <header class="comment-top">
              <div class="comment-user">
                <strong>{{ item.author }}</strong>
                <div class="comment-meta">
                  <span>{{ item.time }}</span>
                  <span>{{ item.city }}</span>
                </div>
              </div>

              <div class="comment-actions">
                <button class="comment-bubble" type="button" aria-label="回复评论" @click.stop="replyToComment(item)">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M20.3 11.3c0 4.1-3.55 7.35-8.25 7.35-1.05 0-2.05-.17-2.97-.5L4.2 20.7l1.42-4.18C4.45 15.2 3.8 13.4 3.8 11.3c0-4.1 3.55-7.35 8.25-7.35s8.25 3.25 8.25 7.35Z" />
                  </svg>
                </button>

                <button class="comment-like" :class="{ 'comment-like--active': item.liked }" type="button" @click.stop="toggleCommentLike(item.id)">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 20.8 5.25 14.1C3.55 12.4 2.4 10.85 2.4 8.65 2.4 5.75 4.65 3.6 7.5 3.6c1.65 0 3.15.78 4.5 2.28 1.35-1.5 2.85-2.28 4.5-2.28 2.85 0 5.1 2.15 5.1 5.05 0 2.2-1.15 3.75-2.85 5.45L12 20.8Z" />
                  </svg>
                  <span>{{ item.likes }}</span>
                </button>
              </div>
            </header>

            <p class="comment-content">
              <span v-if="item.replyTo" class="comment-reply-target">回复 {{ item.replyTo }}：</span>
              {{ item.content }}
            </p>

            <footer class="comment-bottom">
              <button v-if="item.isMine" class="comment-delete" type="button" aria-label="删除评论" @click.stop="deleteComment(item.id)">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M4 7h16" />
                  <path d="M9 7V5.7c0-.75.6-1.35 1.35-1.35h3.3c.75 0 1.35.6 1.35 1.35V7" />
                  <path d="M7.2 7l.9 11.1c.08.9.82 1.58 1.72 1.58h4.4c.9 0 1.64-.68 1.72-1.58L16.8 7" />
                  <path d="M10 10.2v6.1" />
                  <path d="M14 10.2v6.1" />
                </svg>
              </button>
            </footer>
          </div>
        </article>
      </section>
    </main>

    <footer class="bottom-bar">
      <button class="comment-trigger" type="button" @click="openComposer">
        <span class="comment-trigger-icon" aria-hidden="true"></span>
        <span>发布评论...</span>
      </button>

      <div class="bottom-actions">
        <button class="bottom-action bottom-action--like" :class="{ 'bottom-action--active-like': liked }" type="button" @click="toggleLike">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 20.8 5.25 14.1C3.55 12.4 2.4 10.85 2.4 8.65 2.4 5.75 4.65 3.6 7.5 3.6c1.65 0 3.15.78 4.5 2.28 1.35-1.5 2.85-2.28 4.5-2.28 2.85 0 5.1 2.15 5.1 5.05 0 2.2-1.15 3.75-2.85 5.45L12 20.8Z" />
          </svg>
          <span>{{ likeCount }}</span>
        </button>

        <button class="bottom-action bottom-action--favorite" :class="{ 'bottom-action--active-favorite': starred }" type="button" @click="toggleStar">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m12 3.15 2.68 5.43 5.99.87-4.33 4.22 1.02 5.96L12 16.82l-5.36 2.81 1.02-5.96-4.33-4.22 5.99-.87L12 3.15Z" />
          </svg>
          <span>{{ starCount }}</span>
        </button>

        <button class="bottom-action" type="button" @click="focusCommentInput">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M20.3 11.3c0 4.1-3.55 7.35-8.25 7.35-1.05 0-2.05-.17-2.97-.5L4.2 20.7l1.42-4.18C4.45 15.2 3.8 13.4 3.8 11.3c0-4.1 3.55-7.35 8.25-7.35s8.25 3.25 8.25 7.35Z" />
          </svg>
          <span>{{ commentCount }}</span>
        </button>
      </div>
    </footer>

    <div v-if="showComposer" class="composer-mask" @click="closeComposer"></div>

    <section v-if="showComposer" class="composer-panel">
      <form class="composer-form" @submit.prevent="submitComment">
        <input
          ref="commentInputRef"
          v-model="commentDraft"
          class="composer-input"
          type="text"
          :placeholder="replyTarget ? `回复 ${replyTarget}` : '评论'"
        />
        <button class="emoji-toggle" type="button" aria-label="选择表情" @click="toggleEmojiPanel">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <circle cx="8.5" cy="10" r="1" fill="currentColor" stroke="none" />
            <circle cx="15.5" cy="10" r="1" fill="currentColor" stroke="none" />
            <path d="M8 14.5c1 .9 2.3 1.4 4 1.4s3-.5 4-1.4" />
          </svg>
        </button>
        <button class="composer-send" type="submit">发送</button>
      </form>

      <div v-if="showEmojiPanel" class="emoji-panel">
        <button v-for="emoji in emojiOptions" :key="emoji" class="emoji-btn" type="button" @click="appendEmoji(emoji)">
          {{ emoji }}
        </button>
      </div>
    </section>
  </section>
</template>

<style scoped>
.health-news-detail-page {
  position: relative;
  left: 50%;
  width: min(390px, 100vw);
  height: auto;
  min-height: var(--ihc-page-min-height);
  max-height: none;
  margin: -18px 0;
  overflow: hidden;
  background: #ffffff;
  color: #333333;
  font-family: var(--ihc-font-family);
  transform: translateX(-50%);
  -webkit-font-smoothing: antialiased;
}

.detail-scroll {
  height: calc(100% - 76px);
  overflow-y: auto;
  padding: 0 0 18px;
  scrollbar-width: none;
}

.detail-scroll::-webkit-scrollbar {
  display: none;
}

.detail-nav {
  display: grid;
  grid-template-columns: 28px 1fr 28px;
  align-items: center;
  gap: 10px;
  padding: 18px 20px 8px;
}

.detail-nav h1 {
  margin: 0;
  color: #30343d;
  font-size: 20px;
  font-weight: 500;
}

.nav-btn,
.bottom-action,
.comment-trigger,
.emoji-toggle,
.composer-send,
.emoji-btn,
.comment-bubble,
.comment-like,
.comment-delete {
  border: 0;
  background: transparent;
  color: inherit;
}

.nav-btn {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  padding: 0;
}

.nav-btn svg {
  width: 22px;
  height: 22px;
  fill: none;
  stroke: #2f3138;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.back-arrow {
  width: 12px;
  height: 12px;
  border-bottom: 2px solid #2f3138;
  border-left: 2px solid #2f3138;
  transform: rotate(45deg);
}

.article-card {
  padding: 20px;
}

.article-card h2 {
  margin: 0;
  color: #30343d;
  font-size: 24px;
  font-weight: 700;
  line-height: 1.45;
}

.publish-date {
  margin: 10px 0 0;
  color: #9fa7b2;
  font-size: 14px;
  font-weight: 600;
}

.hero-image {
  display: block;
  width: 100%;
  margin-top: 20px;
  aspect-ratio: 1.54;
  object-fit: cover;
  border-radius: 18px;
}

.article-paragraph {
  margin: 22px 0 0;
  color: #4d5159;
  font-size: 15px;
  line-height: 2;
}

.comments-section {
  padding: 8px 20px 6px;
}

.comments-header h3 {
  margin: 0;
  color: #8f949d;
  font-size: 14px;
  font-weight: 500;
}

.comment-item {
  display: flex;
  gap: 14px;
  padding: 18px 0 12px;
}

.comment-avatar {
  flex: 0 0 auto;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
}

.comment-main {
  flex: 1;
  min-width: 0;
}

.comment-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.comment-user strong {
  display: block;
  color: #3a3e46;
  font-size: 16px;
  font-weight: 500;
}

.comment-meta {
  display: flex;
  gap: 8px;
  margin-top: 4px;
  color: #c0c2c7;
  font-size: 12px;
}

.comment-actions {
  display: flex;
  align-items: center;
  gap: 14px;
  color: #c8c9ce;
}

.comment-bubble,
.comment-like {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0;
  color: inherit;
  font-size: 12px;
}

.comment-bubble svg,
.comment-like svg,
.comment-delete svg,
.bottom-action svg {
  width: 20px;
  height: 20px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.9;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.comment-like--active {
  color: #e3b341;
}

.comment-like--active svg,
.bottom-action--active-like svg,
.bottom-action--active-favorite svg {
  fill: currentColor;
}

.comment-content {
  margin: 10px 0 0;
  color: #4d5159;
  font-size: 16px;
  line-height: 1.85;
}

.comment-reply-target {
  color: #e3b341;
}

.comment-bottom {
  display: flex;
  justify-content: flex-end;
  margin-top: 8px;
}

.comment-delete {
  display: inline-grid;
  place-items: center;
  width: 24px;
  height: 24px;
  padding: 0;
  color: #b2b5bc;
}

.bottom-bar {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  display: flex;
  align-items: center;
  gap: 14px;
  height: 76px;
  padding: 10px 18px 12px;
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 -6px 18px rgba(0, 0, 0, 0.04);
}

.comment-trigger {
  flex: 1;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  height: 46px;
  padding: 0 14px 0 16px;
  border-radius: 16px;
  background: #f6f6f7;
  color: #9a9a9a;
  font-size: 14px;
}

.comment-trigger-icon {
  width: 16px;
  height: 16px;
  border: 2px solid #c4c7ce;
  border-radius: 50%;
}

.bottom-actions {
  display: flex;
  align-items: center;
  gap: 14px;
}

.bottom-action {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0;
  color: #7b8795;
  font-size: 15px;
}

.bottom-action--active-like {
  color: #ef7b72;
}

.bottom-action--active-favorite {
  color: #e3b341;
}

.composer-mask {
  position: absolute;
  inset: 0;
  z-index: 3;
  background: rgba(0, 0, 0, 0.18);
}

.composer-panel {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 4;
  padding: 10px 14px 16px;
  background: #ffffff;
  box-shadow: 0 -10px 28px rgba(0, 0, 0, 0.08);
}

.composer-form {
  display: grid;
  grid-template-columns: 1fr auto auto;
  align-items: center;
  gap: 8px;
  padding: 6px;
  border: 1px solid #ececef;
  border-radius: 12px;
  background: #ffffff;
}

.composer-input {
  min-width: 0;
  height: 38px;
  padding: 0 10px;
  border: 0;
  outline: 0;
  background: transparent;
  color: #2f3138;
  font-size: 15px;
}

.composer-input::placeholder {
  color: #a8abb2;
}

.emoji-toggle,
.composer-send {
  display: inline-grid;
  place-items: center;
  height: 38px;
  padding: 0 10px;
  border-radius: 10px;
}

.emoji-toggle {
  color: #8d929b;
}

.emoji-toggle svg {
  width: 22px;
  height: 22px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.9;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.composer-send {
  min-width: 56px;
  background: #f2d27a;
  color: #6e5312;
  font-size: 14px;
  font-weight: 600;
}

.emoji-panel {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  margin-top: 10px;
  padding: 4px 2px 0;
}

.emoji-btn {
  height: 40px;
  border-radius: 12px;
  background: #f5f7f8;
  font-size: 20px;
}
</style>

