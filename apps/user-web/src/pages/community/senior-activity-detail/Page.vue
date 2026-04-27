<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from "vue";
import type { PageComponentProps } from "@ihc/page-core/types";
import {
  cancelCommunityActivity,
  createCommunityActivityComment,
  favoriteCommunityActivity,
  getCommunityActivityComments,
  getCommunityActivityDetail,
  likeCommunityActivity,
  registerCommunityActivity,
  shareCommunityActivity,
  type CommunityActivityDetail,
  type CommunityCommentItem
} from "@/shared/api/community";
import { selectedSeniorActivityId } from "../senior-activities/state";

const props = defineProps<PageComponentProps>();

const activity = ref<CommunityActivityDetail | null>(null);
const comments = ref<CommunityCommentItem[]>([]);
const commentsSectionRef = ref<HTMLElement | null>(null);
const commentInputRef = ref<HTMLInputElement | null>(null);
const showComposer = ref(false);
const showEmojiPanel = ref(false);
const replyTarget = ref<string>("");
const replyParentId = ref<string>("");
const commentDraft = ref("");
const loading = ref(false);
const submittingComment = ref(false);
const submittingRegister = ref(false);

const emojiOptions = ["😀", "😊", "👍", "👏", "🎉", "📷", "❤️", "🌸", "✨", "☀️", "🥳", "🙌"];

const likeCount = computed(() => activity.value?.stats?.likes ?? activity.value?.likesCount ?? 0);
const starCount = computed(() => activity.value?.stats?.stars ?? activity.value?.favoritesCount ?? 0);
const commentCount = computed(() => comments.value.length);

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "请求失败，请稍后重试";
}

function resolveTypeKey(category: string) {
  return category.includes("户外") ? "outdoor" : "culture";
}

function resolveStatusKey(status: string) {
  return status === "ONGOING" ? "ongoing" : "upcoming";
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

function formatDateText(value?: string | null) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return `${date.getFullYear()}.${`${date.getMonth() + 1}`.padStart(2, "0")}.${`${date.getDate()}`.padStart(2, "0")}`;
}

function formatCommentTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return `${date.getMonth() + 1}月${date.getDate()}日 ${`${date.getHours()}`.padStart(2, "0")}:${`${date.getMinutes()}`.padStart(2, "0")}`;
}

async function loadDetail() {
  if (!selectedSeniorActivityId.value) {
    props.showToast("未找到活动");
    return;
  }

  loading.value = true;

  try {
    const [detail, commentResponse] = await Promise.all([
      getCommunityActivityDetail(selectedSeniorActivityId.value),
      getCommunityActivityComments(selectedSeniorActivityId.value, { page: 1, pageSize: 50 })
    ]);

    activity.value = detail;
    comments.value = commentResponse.list;
  } catch (error) {
    props.showToast(getErrorMessage(error));
  } finally {
    loading.value = false;
  }
}

function goBack() {
  if (!props.navigation.navigateBack()) {
    props.navigation.reLaunch("community/senior-activities");
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
  replyParentId.value = "";
  commentInputRef.value?.focus();
}

function openComposer() {
  showComposer.value = true;
  showEmojiPanel.value = false;
  replyTarget.value = "";
  replyParentId.value = "";
  void nextTick(() => {
    commentInputRef.value?.focus();
  });
}

async function replyToComment(comment: CommunityCommentItem) {
  scrollToComments();
  replyTarget.value = comment.author || comment.user?.name || "";
  replyParentId.value = comment.commentId;
  showComposer.value = true;
  showEmojiPanel.value = false;
  await nextTick();
  commentInputRef.value?.focus();
}

function closeComposer() {
  showComposer.value = false;
  showEmojiPanel.value = false;
  replyTarget.value = "";
  replyParentId.value = "";
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

async function handleLike() {
  if (!activity.value) {
    return;
  }

  const previousLiked = Boolean(activity.value.liked);
  const previousCount = likeCount.value;
  const nextLiked = !previousLiked;
  activity.value = {
    ...activity.value,
    liked: nextLiked,
    stats: {
      ...activity.value.stats,
      likes: Math.max(0, previousCount + (nextLiked ? 1 : -1))
    }
  };

  try {
    if (!previousLiked) {
      await likeCommunityActivity(activity.value.activityId);
    }
  } catch (error) {
    activity.value = {
      ...activity.value,
      liked: previousLiked,
      stats: {
        ...activity.value.stats,
        likes: previousCount
      }
    };
    props.showToast(getErrorMessage(error));
  }
}

async function handleFavorite() {
  if (!activity.value) {
    return;
  }

  const previousFavorited = Boolean(activity.value.favorited);
  const previousCount = starCount.value;
  const nextFavorited = !previousFavorited;
  activity.value = {
    ...activity.value,
    favorited: nextFavorited,
    stats: {
      ...activity.value.stats,
      stars: Math.max(0, previousCount + (nextFavorited ? 1 : -1))
    }
  };

  try {
    if (!previousFavorited) {
      await favoriteCommunityActivity(activity.value.activityId);
    }
  } catch (error) {
    activity.value = {
      ...activity.value,
      favorited: previousFavorited,
      stats: {
        ...activity.value.stats,
        stars: previousCount
      }
    };
    props.showToast(getErrorMessage(error));
  }
}

async function handleShare() {
  if (!activity.value) {
    return;
  }

  try {
    await shareCommunityActivity(activity.value.activityId);
    props.showToast("已记录分享");
  } catch (error) {
    props.showToast(getErrorMessage(error));
  }
}

async function submitComment() {
  if (!activity.value || !commentDraft.value.trim()) {
    props.showToast("请输入评论内容");
    return;
  }

  submittingComment.value = true;

  try {
    await createCommunityActivityComment(activity.value.activityId, {
      parentId: replyParentId.value || undefined,
      content: commentDraft.value.trim()
    });

    commentDraft.value = "";
    closeComposer();
    await loadDetail();
    props.showToast("评论已发布");
  } catch (error) {
    props.showToast(getErrorMessage(error));
  } finally {
    submittingComment.value = false;
  }
}

async function toggleRegister() {
  if (!activity.value) {
    return;
  }

  submittingRegister.value = true;

  try {
    if (activity.value.registered) {
      await cancelCommunityActivity(activity.value.activityId, {
        reason: "用户主动取消报名"
      });
      props.showToast("已取消报名");
    } else {
      await registerCommunityActivity(activity.value.activityId, {
        remark: "用户端报名"
      });
      props.showToast("报名成功");
    }

    await loadDetail();
  } catch (error) {
    props.showToast(getErrorMessage(error));
  } finally {
    submittingRegister.value = false;
  }
}

onMounted(() => {
  void loadDetail();
});
</script>

<template>
  <section class="senior-activity-detail-page">
    <main class="detail-scroll">
      <header class="detail-nav">
        <button class="nav-btn nav-btn--back" type="button" aria-label="返回" @click="goBack">
          <span class="back-arrow" aria-hidden="true"></span>
        </button>
        <h1>活动详情</h1>
        <button class="nav-btn" type="button" aria-label="分享" @click="handleShare">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M14 3h7v7" />
            <path d="M10 14 21 3" />
            <path d="M21 14v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h6" />
          </svg>
        </button>
      </header>

      <p v-if="loading" class="state-text">活动加载中...</p>

      <template v-else-if="activity">
        <section class="summary-card">
          <div class="summary-cover-wrap">
            <img class="summary-cover" :src="activity.coverUrl || activity.image || ''" :alt="activity.title" draggable="false" />
            <span class="status-badge" :class="`status-badge--${resolveStatusKey(activity.status)}`">{{ resolveStatusText(activity.status) }}</span>
          </div>

          <div class="summary-copy">
            <h2>{{ activity.title }}</h2>
            <span class="type-tag" :class="`type-tag--${resolveTypeKey(activity.category)}`">{{ activity.category }}</span>
            <p class="publish-date">发布时间：{{ activity.publishDate || formatDateText(activity.startAt) }}</p>
            <button class="register-btn" type="button" :disabled="submittingRegister" @click="toggleRegister">
              {{ submittingRegister ? "处理中" : activity.registered ? "取消报名" : "我要报名" }}
            </button>
          </div>
        </section>

        <section class="info-list">
          <div class="info-row">
            <span>活动时间</span>
            <strong>{{ activity.time || `${formatDateText(activity.startAt)}~${formatDateText(activity.endAt)}` }}</strong>
          </div>
          <div class="info-row">
            <span>活动地点</span>
            <strong>{{ activity.location }}</strong>
          </div>
          <div class="info-row">
            <span>报名截止日期</span>
            <strong>{{ activity.signupDeadlineText || formatDateText(activity.signupDeadline) }}</strong>
          </div>
        </section>

        <article class="detail-body">
          <img class="detail-image" :src="activity.coverUrl || activity.image || ''" :alt="activity.title" draggable="false" />

          <section
            v-for="section in activity.sections || activity.detailContent?.sections || []"
            :key="`${section.title || ''}-${section.paragraphs[0] || ''}`"
            class="detail-section"
          >
            <h3 v-if="section.title">{{ section.title }}</h3>
            <p v-for="paragraph in section.paragraphs" :key="paragraph">{{ paragraph }}</p>
          </section>
        </article>

        <section ref="commentsSectionRef" class="comments-section">
          <header class="comments-header">
            <h3>全部 {{ commentCount }} 条评论</h3>
          </header>

          <article v-for="item in comments" :key="item.commentId" class="comment-item" @click="replyToComment(item)">
            <img class="comment-avatar" :src="item.avatarUrl || item.user?.avatar || ''" :alt="item.author || item.user?.name || '评论头像'" draggable="false" />

            <div class="comment-main">
              <header class="comment-top">
                <div class="comment-user">
                  <strong>{{ item.author || item.user?.name }}</strong>
                  <div class="comment-meta">
                    <span>{{ formatCommentTime(item.createdAt) }}</span>
                    <span>{{ item.city || "上海市" }}</span>
                  </div>
                </div>

                <div class="comment-actions">
                  <button class="comment-bubble" type="button" aria-label="回复评论" @click.stop="replyToComment(item)">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M20.3 11.3c0 4.1-3.55 7.35-8.25 7.35-1.05 0-2.05-.17-2.97-.5L4.2 20.7l1.42-4.18C4.45 15.2 3.8 13.4 3.8 11.3c0-4.1 3.55-7.35 8.25-7.35s8.25 3.25 8.25 7.35Z" />
                    </svg>
                  </button>

                  <button class="comment-like" :class="{ 'comment-like--active': item.liked }" type="button">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M12 20.8 5.25 14.1C3.55 12.4 2.4 10.85 2.4 8.65 2.4 5.75 4.65 3.6 7.5 3.6c1.65 0 3.15.78 4.5 2.28 1.35-1.5 2.85-2.28 4.5-2.28 2.85 0 5.1 2.15 5.1 5.05 0 2.2-1.15 3.75-2.85 5.45L12 20.8Z" />
                    </svg>
                    <span>{{ item.likes || 0 }}</span>
                  </button>
                </div>
              </header>

              <p class="comment-content">
                <span v-if="item.parentId && replyTarget" class="comment-reply-target">回复 {{ replyTarget }}：</span>
                {{ item.content }}
              </p>
            </div>
          </article>

          <p v-if="!comments.length" class="state-text state-text--compact">暂无评论</p>
        </section>
      </template>

      <p v-else class="state-text">未找到活动内容</p>
    </main>

    <footer class="bottom-bar">
      <button class="comment-trigger" type="button" @click="openComposer">
        <span class="comment-trigger-icon" aria-hidden="true"></span>
        <span>发布评论...</span>
      </button>

      <div class="bottom-actions">
        <button
          class="bottom-action"
          :class="{ 'bottom-action--active': activity?.liked }"
          type="button"
          @click="handleLike"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 20.8 5.25 14.1C3.55 12.4 2.4 10.85 2.4 8.65 2.4 5.75 4.65 3.6 7.5 3.6c1.65 0 3.15.78 4.5 2.28 1.35-1.5 2.85-2.28 4.5-2.28 2.85 0 5.1 2.15 5.1 5.05 0 2.2-1.15 3.75-2.85 5.45L12 20.8Z" />
          </svg>
          <span>{{ likeCount }}</span>
        </button>

        <button
          class="bottom-action"
          :class="{ 'bottom-action--active': activity?.favorited }"
          type="button"
          @click="handleFavorite"
        >
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
        <button class="composer-send" type="submit">{{ submittingComment ? "发送中" : "发送" }}</button>
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
.senior-activity-detail-page {
  position: relative;
  left: 50%;
  width: min(390px, 100vw);
  height: min(844px, calc(100vh - 36px));
  min-height: min(844px, calc(100vh - 36px));
  max-height: 844px;
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
  grid-template-columns: 36px 1fr 36px;
  align-items: center;
  gap: 10px;
  padding: 18px 18px 14px;
}

.nav-btn,
.comment-trigger,
.comment-bubble,
.comment-like,
.bottom-action,
.register-btn,
.emoji-toggle,
.composer-send,
.emoji-btn {
  border: 0;
  background: transparent;
}

.nav-btn {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  padding: 0;
  color: #353a44;
}

.nav-btn svg {
  width: 22px;
  height: 22px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.9;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.nav-btn--back {
  justify-self: start;
}

.back-arrow {
  width: 12px;
  height: 12px;
  border-bottom: 2.5px solid #2f333a;
  border-left: 2.5px solid #2f333a;
  transform: rotate(45deg);
}

.detail-nav h1 {
  margin: 0;
  color: #323742;
  font-size: 17px;
  font-weight: 400;
}

.summary-card {
  display: grid;
  grid-template-columns: 150px minmax(0, 1fr);
  gap: 18px;
  padding: 2px 18px 0;
}

.summary-cover-wrap {
  position: relative;
  width: 150px;
  height: 150px;
  overflow: hidden;
  border-radius: 18px;
}

.summary-cover {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.status-badge {
  position: absolute;
  top: 0;
  left: 0;
  padding: 8px 16px;
  border-radius: 0 0 14px 0;
  color: #ffffff;
  font-size: 11px;
  font-weight: 400;
}

.status-badge--ongoing {
  background: linear-gradient(90deg, #42d39d 0%, #19d7ec 100%);
}

.status-badge--upcoming {
  background: linear-gradient(90deg, #ff8c73 0%, #ffd16d 100%);
}

.summary-copy h2 {
  margin: 0;
  color: #373b44;
  font-size: 17px;
  font-weight: 400;
  line-height: 1.3;
}

.type-tag {
  display: inline-flex;
  align-items: center;
  height: 28px;
  margin-top: 14px;
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

.publish-date {
  margin: 14px 0 0;
  color: #c0c3ca;
  font-size: 12px;
  font-weight: 400;
}

.register-btn {
  width: 122px;
  height: 44px;
  margin-top: 22px;
  padding: 0 14px;
  border-radius: 18px;
  background: linear-gradient(180deg, #7280f6 0%, #6570f0 100%);
  color: #ffffff;
  font-size: 14px;
  font-weight: 400;
}

.register-btn:disabled {
  opacity: 0.7;
}

.info-list {
  margin: 28px 18px 0;
  border-top: 1px solid #eceef3;
  border-bottom: 1px solid #eceef3;
}

.info-row {
  display: grid;
  grid-template-columns: 104px 1fr;
  align-items: center;
  min-height: 74px;
  border-top: 1px solid #eceef3;
}

.info-row:first-child {
  border-top: 0;
}

.info-row span {
  color: #9b9fa7;
  font-size: 12px;
  font-weight: 400;
}

.info-row strong {
  color: #4c5057;
  font-size: 14px;
  font-weight: 400;
}

.detail-body {
  padding: 20px 18px 0;
}

.detail-image {
  display: block;
  width: 100%;
  height: 220px;
  border-radius: 22px;
  object-fit: cover;
}

.detail-section {
  margin-top: 24px;
}

.detail-section h3 {
  margin: 0 0 12px;
  color: #373b43;
  font-size: 15px;
  font-weight: 500;
}

.detail-section p {
  margin: 0 0 10px;
  color: #50545c;
  font-size: 14px;
  font-weight: 400;
  line-height: 1.85;
}

.comments-section {
  margin-top: 18px;
  padding: 0 18px;
}

.comments-header h3 {
  margin: 0 0 14px;
  color: #343944;
  font-size: 15px;
  font-weight: 500;
}

.comment-item {
  display: flex;
  gap: 12px;
  padding: 16px 0;
  border-bottom: 1px solid #f1f2f5;
}

.comment-avatar {
  flex: 0 0 42px;
  width: 42px;
  height: 42px;
  border-radius: 50%;
  object-fit: cover;
  background: #f2f4f7;
}

.comment-main {
  flex: 1;
  min-width: 0;
}

.comment-top {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.comment-user strong {
  display: block;
  color: #3c4048;
  font-size: 14px;
  font-weight: 500;
}

.comment-meta {
  display: flex;
  gap: 8px;
  margin-top: 4px;
  color: #a1a5ad;
  font-size: 11px;
  font-weight: 400;
}

.comment-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.comment-bubble,
.comment-like {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 0;
  color: #a7abb4;
}

.comment-bubble svg,
.comment-like svg,
.bottom-action svg {
  width: 18px;
  height: 18px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.9;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.comment-like--active {
  color: #6570f0;
}

.comment-content {
  margin: 12px 0 0;
  color: #4c515a;
  font-size: 13px;
  font-weight: 400;
  line-height: 1.75;
}

.comment-reply-target {
  color: #6570f0;
}

.bottom-bar {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 14px;
  align-items: center;
  padding: 12px 16px 14px;
  background: rgba(255, 255, 255, 0.98);
  border-top: 1px solid #f1f2f5;
}

.comment-trigger {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 42px;
  padding: 0 16px;
  border-radius: 14px;
  background: #f4f5f8;
  color: #b0b4bb;
  font-size: 13px;
  font-weight: 400;
}

.comment-trigger-icon {
  width: 14px;
  height: 14px;
  border: 2px solid currentColor;
  border-radius: 50%;
}

.bottom-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.bottom-action {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 0;
  color: #333842;
  font-size: 12px;
  font-weight: 400;
}

.bottom-action--active {
  color: #6570f0;
}


.composer-mask {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.18);
}

.composer-panel {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  padding: 14px 16px 18px;
  background: #ffffff;
}

.composer-form {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 34px auto;
  gap: 10px;
  align-items: center;
}

.composer-input {
  height: 42px;
  padding: 0 14px;
  border: 0;
  border-radius: 14px;
  outline: none;
  background: #f4f5f8;
  color: #343944;
  font-size: 13px;
}

.emoji-toggle {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  padding: 0;
  color: #8b919c;
}

.emoji-toggle svg {
  width: 22px;
  height: 22px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.composer-send {
  min-width: 52px;
  height: 34px;
  padding: 0 14px;
  border-radius: 999px;
  background: #6570f0;
  color: #ffffff;
  font-size: 12px;
  font-weight: 400;
}

.emoji-panel {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 10px;
  margin-top: 14px;
}

.emoji-btn {
  height: 36px;
  border-radius: 12px;
  background: #f4f5f8;
  font-size: 18px;
}

.state-text {
  margin: 0;
  padding: 24px 18px;
  color: #a1a5ad;
  font-size: 13px;
  text-align: center;
}

.state-text--compact {
  padding: 12px 0 0;
}

@media (min-width: 561px) {
  .senior-activity-detail-page {
    height: 844px;
    min-height: 844px;
  }
}

@media (max-width: 389px) {
  .detail-nav,
  .summary-card,
  .detail-body,
  .comments-section {
    padding-right: 16px;
    padding-left: 16px;
  }

  .summary-card {
    grid-template-columns: 138px minmax(0, 1fr);
    gap: 14px;
  }

  .summary-cover-wrap {
    width: 138px;
    height: 138px;
  }

  .register-btn {
    width: 118px;
  }
}
</style>
