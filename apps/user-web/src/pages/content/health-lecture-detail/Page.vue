<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from "vue";
import type { PageComponentProps } from "@ihc/page-core/types";
import {
  favoriteHealthLecture,
  getHealthLectureDetail,
  likeHealthLecture,
  listHealthLectureComments,
  listHealthLectures,
  shareHealthLecture,
  type HealthLectureListItem
} from "@/shared/api/content";
import mock from "./mock";
import { getCurrentUserCommentProfile, type ContentComment } from "../comment-mock";
import { lectureDetailTarget, selectedLectureId } from "../health-lecture/state";
import {
  normalizeLectureCommentContent,
  resolveLectureCommentAvatar,
  resolveLectureImage,
  resolveLectureVideoUrl
} from "@/shared/utils/healthLectureMedia";

const props = defineProps<PageComponentProps>();

const videoRef = ref<HTMLVideoElement | null>(null);
const progressTrackRef = ref<HTMLElement | null>(null);
const commentsSectionRef = ref<HTMLElement | null>(null);
const commentInputRef = ref<HTMLInputElement | null>(null);

const title = ref(mock.title);
const publishText = ref(mock.publishText);
const summary = ref(mock.summary);
const tags = ref([...mock.tags]);
const heroImage = ref(mock.heroImage);
const videoUrl = ref(mock.videoUrl);
const liked = ref(false);
const starred = ref(false);
const showComposer = ref(false);
const showEmojiPanel = ref(false);
const replyTarget = ref("");
const likeCount = ref(mock.stats.likes);
const starCount = ref(mock.stats.stars);
const commentCount = ref(mock.stats.comments);
const commentDraft = ref("");
const comments = ref<ContentComment[]>([...mock.comments]);
const currentTime = ref(0);
const duration = ref(0);
const isPlaying = ref(false);
const recommendation = ref({ ...mock.recommendation });

const progressPercent = computed(() => {
  if (!duration.value) {
    return 0;
  }

  return Math.min(currentTime.value / duration.value, 1);
});

const emojiOptions = ["😀", "😉", "😊", "😄", "👍", "👏", "✨", "🌷"];

function formatTime(value: number) {
  const safeValue = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
  const minutes = String(Math.floor(safeValue / 60)).padStart(2, "0");
  const seconds = String(safeValue % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function formatPublishText(publishedAt?: string, viewsCount?: number | null, durationMinutes?: number | null) {
  const parts: string[] = [];

  if (publishedAt) {
    const publishedDate = new Date(publishedAt);
    if (!Number.isNaN(publishedDate.getTime())) {
      parts.push(`${publishedDate.getFullYear()}年${publishedDate.getMonth() + 1}月${publishedDate.getDate()}日发布`);
    }
  }

  if (typeof durationMinutes === "number" && durationMinutes > 0) {
    parts.push(`${durationMinutes}分钟`);
  }

  if (typeof viewsCount === "number") {
    parts.push(`${viewsCount}次播放`);
  }

  return parts.length > 0 ? parts.join(" · ") : mock.publishText;
}

function mapLectureCard(item: HealthLectureListItem) {
  const lectureId = item.lectureId || item.id;

  return {
    id: item.id || lectureId,
    title: item.title,
    imageUrl: resolveLectureImage(lectureId, item.title, item.imageUrl, item.coverUrl),
    likes: item.likesCount ?? item.stats?.likes ?? 0,
    stars: item.favoritesCount ?? item.stats?.stars ?? 0,
    comments: item.commentsCount ?? item.stats?.comments ?? 0,
    lectureId
  };
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
    avatarUrl: resolveLectureCommentAvatar(item.author || "匿名用户", item.avatarUrl),
    time: item.createdAt || "刚刚",
    city: item.city || "未知",
    content: normalizeLectureCommentContent(item.content),
    replyTo: item.replyTo,
    likes: item.likes ?? 0,
    liked: Boolean(item.liked),
    isMine: Boolean(item.isMine)
  }));
}

function goBack() {
  if (!props.navigation.navigateBack()) {
    props.navigation.reLaunch("content/health-lecture");
  }
}

function openDetail(lectureId: string) {
  selectedLectureId.value = lectureId;
  lectureDetailTarget.value = "default";
  props.navigation.redirectTo("content/health-lecture-detail");
}

function applyFallbackImage(event: Event) {
  const target = event.target as HTMLImageElement | null;

  if (!target || target.dataset.fallbackApplied === "true") {
    return;
  }

  target.dataset.fallbackApplied = "true";
  target.src = mock.heroImage;
}

function applyFallbackAvatar(event: Event) {
  const target = event.target as HTMLImageElement | null;
  const currentUserCommentProfile = getCurrentUserCommentProfile();

  if (!target || target.dataset.fallbackApplied === "true") {
    return;
  }

  target.dataset.fallbackApplied = "true";
  target.src = currentUserCommentProfile.avatarUrl;
}

async function loadRecommendation(currentLectureId: string) {
  try {
    const response = await listHealthLectures({
      page: 1,
      pageSize: 3,
      sort: "LATEST"
    });
    const nextLecture = response.list.find((item) => (item.lectureId || item.id) !== currentLectureId);

    if (!nextLecture) {
      recommendation.value = { ...mock.recommendation };
      return;
    }

    recommendation.value = mapLectureCard(nextLecture);
  } catch {
    recommendation.value = { ...mock.recommendation };
  }
}

async function loadDetail() {
  const lectureId = selectedLectureId.value.trim();

  if (!lectureId) {
    return;
  }

  try {
    const detail = await getHealthLectureDetail(lectureId);

    title.value = detail.title;
    publishText.value = formatPublishText(detail.publishedAt, detail.viewsCount, detail.durationMinutes);
    summary.value = detail.summary || mock.summary;
    tags.value = [
      ...(detail.speakerName ? [`#${detail.speakerName}`] : []),
      ...(detail.speakerTitle ? [`#${detail.speakerTitle}`] : [])
    ].slice(0, 2);
    if (tags.value.length === 0) {
      tags.value = [...mock.tags];
    }
    heroImage.value = resolveLectureImage(detail.lectureId || detail.id || lectureId, detail.title, detail.heroImage, detail.coverUrl, detail.imageUrl, detail.gallery?.[0]?.url);
    videoUrl.value = resolveLectureVideoUrl(detail.videoUrl);
    liked.value = false;
    starred.value = false;
    likeCount.value = detail.likesCount ?? detail.stats?.likes ?? 0;
    starCount.value = detail.favoritesCount ?? detail.stats?.stars ?? 0;
    commentCount.value = detail.commentsCount ?? detail.stats?.comments ?? 0;
    comments.value = mapComments(detail.comments || []);
    await loadRecommendation(detail.lectureId || detail.id || lectureId);
  } catch {
    props.showToast("讲堂详情加载失败，已显示本地示例");
    await loadRecommendation(lectureId);
  }
}

async function loadComments() {
  const lectureId = selectedLectureId.value.trim();

  if (!lectureId) {
    return;
  }

  try {
    const response = await listHealthLectureComments(lectureId, {
      page: 1,
      pageSize: 50
    });

    comments.value = mapComments(response.list);
    commentCount.value = response.total;
  } catch {
    props.showToast("评论加载失败，已显示本地示例");
  }
}

async function enterFullscreen() {
  const video = videoRef.value;

  if (!video) {
    return;
  }

  const fullscreenVideo = video as HTMLVideoElement & {
    webkitEnterFullscreen?: () => void;
  };

  if (document.fullscreenElement) {
    return;
  }

  if (typeof video.requestFullscreen === "function") {
    await video.requestFullscreen();
    return;
  }

  if (typeof fullscreenVideo.webkitEnterFullscreen === "function") {
    fullscreenVideo.webkitEnterFullscreen();
  }
}

async function playVideo() {
  const video = videoRef.value;

  if (!video) {
    return;
  }

  try {
    await video.play();
    await enterFullscreen();
  } catch {
    props.showToast("视频播放失败，请稍后重试");
  }
}

function togglePlay() {
  const video = videoRef.value;

  if (!video) {
    return;
  }

  if (video.paused) {
    void playVideo();
    return;
  }

  video.pause();
}

function onLoadedMetadata() {
  if (!videoRef.value) {
    return;
  }

  duration.value = videoRef.value.duration;
}

function onTimeUpdate() {
  if (!videoRef.value) {
    return;
  }

  currentTime.value = videoRef.value.currentTime;
}

function onPlay() {
  isPlaying.value = true;
}

function onPause() {
  isPlaying.value = false;
}

function onEnded() {
  isPlaying.value = false;
  currentTime.value = 0;
}

function seekVideo(event: MouseEvent) {
  if (!videoRef.value || !progressTrackRef.value || !duration.value) {
    return;
  }

  const rect = progressTrackRef.value.getBoundingClientRect();
  const ratio = Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1);
  videoRef.value.currentTime = duration.value * ratio;
}

async function toggleLike() {
  const lectureId = selectedLectureId.value.trim();

  if (!lectureId) {
    return;
  }

  if (liked.value) {
    props.showToast("已点赞");
    return;
  }

  try {
    await likeHealthLecture(lectureId);
    liked.value = true;
    likeCount.value += 1;
  } catch {
    props.showToast("点赞失败，请稍后再试");
  }
}

async function toggleStar() {
  const lectureId = selectedLectureId.value.trim();

  if (!lectureId) {
    return;
  }

  if (starred.value) {
    props.showToast("已收藏");
    return;
  }

  try {
    await favoriteHealthLecture(lectureId);
    starred.value = true;
    starCount.value += 1;
  } catch {
    props.showToast("收藏失败，请稍后再试");
  }
}

async function shareLecture() {
  const lectureId = selectedLectureId.value.trim();

  if (!lectureId) {
    return;
  }

  try {
    await shareHealthLecture(lectureId);
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
  commentInputRef.value?.focus();
}

function openComposer() {
  showComposer.value = true;
  showEmojiPanel.value = false;
  replyTarget.value = "";
  void nextTick(() => {
    commentInputRef.value?.focus();
  });
}

async function replyToComment(author: string) {
  scrollToComments();
  replyTarget.value = author;
  showComposer.value = true;
  showEmojiPanel.value = false;
  await nextTick();
  commentInputRef.value?.focus();
}

function closeComposer() {
  showComposer.value = false;
  showEmojiPanel.value = false;
  replyTarget.value = "";
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

function submitComment() {
  const content = commentDraft.value.trim();
  const currentUserCommentProfile = getCurrentUserCommentProfile();

  if (!content) {
    props.showToast("请输入评论内容");
    return;
  }

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
  commentCount.value += 1;
  closeComposer();
  props.showToast("评论已暂存");
}

onMounted(async () => {
  await loadDetail();
  await loadComments();

  if (lectureDetailTarget.value !== "comments") {
    return;
  }

  await nextTick();
  scrollToComments();
  lectureDetailTarget.value = "default";
});
</script>

<template>
  <section class="lecture-detail-page">
    <main class="detail-scroll">
      <section class="hero-panel">
        <video
          ref="videoRef"
          class="hero-video"
          :poster="heroImage"
          :src="videoUrl"
          preload="metadata"
          playsinline
          webkit-playsinline
          @click="togglePlay"
          @loadedmetadata="onLoadedMetadata"
          @timeupdate="onTimeUpdate"
          @play="onPlay"
          @pause="onPause"
          @ended="onEnded"
        ></video>

        <header class="hero-actions">
          <button class="icon-btn icon-btn--back" type="button" aria-label="返回" @click="goBack">
            <span class="back-arrow" aria-hidden="true"></span>
          </button>

          <div class="hero-actions-right">
            <button class="icon-btn" type="button" aria-label="音频">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 13a8 8 0 0 1 16 0" />
                <path d="M4.5 13.5v4a2 2 0 0 0 2 2H8v-8H6.5a2 2 0 0 0-2 2Z" />
                <path d="M19.5 13.5v4a2 2 0 0 1-2 2H16v-8h1.5a2 2 0 0 1 2 2Z" />
              </svg>
            </button>
            <button class="icon-btn" type="button" aria-label="收藏" @click="toggleStar">
              <svg :class="{ 'icon-active': starred }" viewBox="0 0 24 24" aria-hidden="true">
                <path d="m12 3.15 2.68 5.43 5.99.87-4.33 4.22 1.02 5.96L12 16.82l-5.36 2.81 1.02-5.96-4.33-4.22 5.99-.87L12 3.15Z" />
              </svg>
            </button>
            <button class="icon-btn" type="button" aria-label="分享" @click="shareLecture">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M14 3h7v7" />
                <path d="M10 14 21 3" />
                <path d="M21 14v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h6" />
              </svg>
            </button>
          </div>
        </header>

        <button v-if="!isPlaying" class="hero-play" type="button" :aria-label="`播放${title}`" @click="playVideo">
          <span class="hero-play-icon"></span>
        </button>

        <div class="hero-progress">
          <button class="progress-play" type="button" :aria-label="isPlaying ? '暂停' : '播放'" @click="togglePlay">
            <span v-if="!isPlaying" class="progress-play-icon"></span>
            <span v-else class="progress-pause-icon">
              <i></i>
              <i></i>
            </span>
          </button>
          <span class="time-text">{{ formatTime(currentTime) }}</span>
          <button ref="progressTrackRef" class="progress-track" type="button" aria-label="调整进度" @click="seekVideo">
            <span class="progress-fill" :style="{ width: `${progressPercent * 100}%` }"></span>
            <span class="progress-thumb" :style="{ left: `${progressPercent * 100}%` }"></span>
          </button>
          <span class="time-text">{{ formatTime(duration) }}</span>
        </div>
      </section>

      <section class="info-card">
        <h1>{{ title }}</h1>
        <p class="publish-text">{{ publishText }}</p>
        <p class="summary-text">{{ summary }}</p>

        <div class="tag-row">
          <span v-for="tag in tags" :key="tag">{{ tag }}</span>
        </div>
      </section>

      <section class="recommend-section">
        <h2>{{ mock.recommendationTitle }}</h2>

        <article class="recommend-card">
          <h3>{{ recommendation.title }}</h3>

          <button class="recommend-cover" type="button" :aria-label="`播放${recommendation.title}`" @click="openDetail(recommendation.lectureId)">
            <img :src="recommendation.imageUrl" :alt="recommendation.title" draggable="false" @error="applyFallbackImage" />
            <span class="recommend-play" aria-hidden="true">
              <span class="recommend-play-icon"></span>
            </span>
          </button>
        </article>
      </section>

      <section ref="commentsSectionRef" class="comments-section">
        <header class="comments-header">
          <h2>全部 {{ commentCount }} 条评论</h2>
        </header>

        <article v-for="item in comments" :key="item.id" class="comment-item" @click="replyToComment(item.author)">
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
                <button class="comment-bubble" type="button" aria-label="回复评论" @click.stop="replyToComment(item.author)">
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
        <button class="bottom-action" :class="{ 'bottom-action--active': liked }" type="button" @click="toggleLike">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 20.8 5.25 14.1C3.55 12.4 2.4 10.85 2.4 8.65 2.4 5.75 4.65 3.6 7.5 3.6c1.65 0 3.15.78 4.5 2.28 1.35-1.5 2.85-2.28 4.5-2.28 2.85 0 5.1 2.15 5.1 5.05 0 2.2-1.15 3.75-2.85 5.45L12 20.8Z" />
          </svg>
          <span>{{ likeCount }}</span>
        </button>

        <button class="bottom-action" :class="{ 'bottom-action--active': starred }" type="button" @click="toggleStar">
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
.lecture-detail-page {
  position: relative;
  left: 50%;
  width: min(390px, 100vw);
  height: min(844px, calc(100vh - 36px));
  min-height: min(844px, calc(100vh - 36px));
  max-height: 844px;
  margin: -18px 0;
  overflow: hidden;
  background: #f2f2f2;
  color: #333333;
  font-family: var(--ihc-font-family);
  transform: translateX(-50%);
  -webkit-font-smoothing: antialiased;
}

.detail-scroll {
  height: calc(100% - 76px);
  overflow-y: auto;
  padding-bottom: 18px;
  scrollbar-width: none;
}

.detail-scroll::-webkit-scrollbar {
  display: none;
}

.hero-panel {
  position: relative;
  height: 398px;
  overflow: hidden;
  background: #d9d9d9;
}

.hero-video {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  background: #d9d9d9;
}

.hero-panel::after {
  position: absolute;
  inset: 0;
  content: "";
  background: linear-gradient(180deg, rgba(0, 0, 0, 0.08) 0%, rgba(0, 0, 0, 0.02) 28%, rgba(0, 0, 0, 0.12) 100%);
  pointer-events: none;
}

.hero-actions,
.hero-progress,
.hero-play {
  position: absolute;
  z-index: 1;
}

.hero-actions {
  top: 20px;
  right: 18px;
  left: 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.hero-actions-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.icon-btn,
.hero-play,
.progress-play,
.comment-trigger,
.bottom-action,
.recommend-cover,
.progress-track,
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

.icon-btn {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  padding: 0;
  color: #ffffff;
}

.icon-btn svg {
  width: 24px;
  height: 24px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.icon-active {
  fill: currentColor;
}

.icon-btn--back {
  width: 30px;
  height: 30px;
}

.back-arrow {
  width: 12px;
  height: 12px;
  border-bottom: 3px solid #ffffff;
  border-left: 3px solid #ffffff;
  transform: rotate(45deg);
}

.hero-play {
  top: 118px;
  left: 50%;
  display: grid;
  place-items: center;
  width: 74px;
  height: 74px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 16px 26px rgba(0, 0, 0, 0.08);
  transform: translateX(-50%);
}

.hero-play-icon {
  width: 0;
  height: 0;
  margin-left: 6px;
  border-top: 13px solid transparent;
  border-bottom: 13px solid transparent;
  border-left: 18px solid #7f7f7f;
}

.hero-progress {
  right: 22px;
  bottom: 36px;
  left: 22px;
  display: grid;
  grid-template-columns: 18px auto 1fr auto;
  align-items: center;
  gap: 8px;
  color: #ffffff;
}

.progress-play {
  position: relative;
  width: 16px;
  height: 16px;
  padding: 0;
}

.progress-play-icon {
  display: block;
  width: 0;
  height: 0;
  border-top: 8px solid transparent;
  border-bottom: 8px solid transparent;
  border-left: 12px solid #ffffff;
}

.progress-pause-icon {
  display: flex;
  gap: 3px;
}

.progress-pause-icon i {
  display: block;
  width: 4px;
  height: 14px;
  border-radius: 999px;
  background: #ffffff;
}

.time-text {
  font-size: 13px;
  font-weight: 500;
}

.progress-track {
  position: relative;
  height: 8px;
  padding: 0;
}

.progress-track::before {
  position: absolute;
  top: 50%;
  right: 0;
  left: 0;
  height: 4px;
  content: "";
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.96);
  transform: translateY(-50%);
}

.progress-fill {
  position: absolute;
  top: 50%;
  left: 0;
  height: 4px;
  border-radius: 999px;
  background: #6e72ff;
  transform: translateY(-50%);
}

.progress-thumb {
  position: absolute;
  top: 50%;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #6e72ff;
  transform: translate(-50%, -50%);
}

.info-card,
.recommend-section,
.comments-section {
  background: #ffffff;
}

.info-card {
  padding: 22px 24px 24px;
}

.info-card h1 {
  margin: 0;
  color: #333333;
  font-size: 23px;
  font-weight: 700;
  line-height: 1.4;
}

.publish-text {
  margin: 8px 0 0;
  color: #999999;
  font-size: 13px;
}

.summary-text {
  margin: 16px 0 0;
  color: #8d8d8d;
  font-size: 15px;
  line-height: 1.9;
}

.tag-row {
  display: flex;
  gap: 12px;
  margin-top: 16px;
}

.tag-row span {
  height: 38px;
  padding: 0 18px;
  border-radius: 999px;
  background: #f1efff;
  color: #6670f0;
  font-size: 14px;
  line-height: 38px;
}

.recommend-section {
  margin-top: 12px;
  padding: 26px 24px 0;
}

.recommend-section h2 {
  margin: 0;
  color: #333333;
  font-size: 22px;
  font-weight: 700;
}

.comments-header h2,
.comments-header h3 {
  margin: 0;
  color: #8f949d;
  font-size: 14px;
  font-weight: 500;
}

.recommend-card {
  margin-top: 18px;
  padding: 20px 20px 24px;
  border: 1px solid #ececec;
  border-radius: 16px;
  background: #ffffff;
}

.recommend-card h3 {
  margin: 0;
  color: #333333;
  font-size: 19px;
  font-weight: 700;
  line-height: 1.4;
}

.recommend-cover {
  position: relative;
  display: block;
  width: 100%;
  margin-top: 14px;
}

.recommend-cover img {
  display: block;
  width: 100%;
  aspect-ratio: 1.46;
  object-fit: cover;
  border-radius: 18px;
}

.recommend-play {
  position: absolute;
  top: 50%;
  left: 50%;
  display: grid;
  place-items: center;
  width: 66px;
  height: 66px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.94);
  transform: translate(-50%, -50%);
}

.recommend-play-icon {
  width: 0;
  height: 0;
  margin-left: 5px;
  border-top: 11px solid transparent;
  border-bottom: 11px solid transparent;
  border-left: 16px solid #6f4d37;
}

.comments-section {
  margin-top: 12px;
  padding: 8px 20px 6px;
}

.comment-item {
  display: flex;
  gap: 14px;
  padding: 18px 0 12px;
}

.comment-avatar {
  display: block;
  flex: 0 0 auto;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
  background: #eceff3;
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
  color: #6670f0;
}

.comment-like--active svg {
  fill: currentColor;
}

.comment-content {
  margin: 10px 0 0;
  color: #4d5159;
  font-size: 16px;
  line-height: 1.85;
}

.comment-reply-target {
  color: #6670f0;
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
  color: #2f3138;
  font-size: 15px;
}

.bottom-action--active {
  color: #6670f0;
}

.bottom-action--active svg {
  fill: currentColor;
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
  color: #9a9a9a;
}

.emoji-toggle {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 10px;
  color: #8b9098;
}

.emoji-toggle svg {
  width: 24px;
  height: 24px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.composer-send {
  height: 38px;
  padding: 0 16px;
  border-radius: 10px;
  background: linear-gradient(135deg, #7280f6 0%, #5d67e8 100%);
  color: #ffffff;
  font-size: 14px;
  font-weight: 600;
}

.emoji-panel {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 10px;
  margin-top: 12px;
  padding: 10px 4px 0;
}

.emoji-btn {
  display: grid;
  place-items: center;
  height: 40px;
  border-radius: 10px;
  background: #f6f6f7;
  font-size: 22px;
}

@media (min-width: 561px) {
  .lecture-detail-page {
    height: 844px;
    min-height: 844px;
  }
}

@media (max-width: 389px) {
  .hero-panel {
    height: 372px;
  }

  .info-card,
  .recommend-section,
  .comments-section {
    padding-right: 20px;
    padding-left: 20px;
  }

  .recommend-card {
    padding-right: 16px;
    padding-left: 16px;
  }

  .comments-section {
    padding-right: 14px;
    padding-left: 14px;
  }

  .bottom-bar {
    padding-right: 14px;
    padding-left: 14px;
  }

  .bottom-actions {
    gap: 12px;
  }

  .emoji-panel {
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 8px;
  }
}
</style>

