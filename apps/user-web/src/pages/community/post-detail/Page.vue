<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import type { PageComponentProps } from "@ihc/page-core/types";
import { Like, Share, Star } from "@icon-park/vue-next";
import {
  createCommunityPostComment,
  favoriteCommunityPost,
  getCommunityPostComments,
  getCommunityPostDetail,
  likeCommunityPost,
  shareCommunityPost,
  type CommunityCommentItem,
  type CommunityPostItem
} from "@/shared/api/community";

const props = defineProps<PageComponentProps>();

const postId = ref(getSelectedPostId());
const post = ref<CommunityPostItem | null>(null);
const comments = ref<CommunityCommentItem[]>([]);
const commentDraft = ref("");
const loading = ref(false);
const submittingComment = ref(false);

const likeCount = computed(() => post.value?.likes ?? post.value?.likesCount ?? 0);
const favoriteCount = computed(() => post.value?.stars ?? post.value?.favoritesCount ?? 0);
const shareCount = computed(() => post.value?.shares ?? post.value?.sharesCount ?? 0);

function getSelectedPostId() {
  if (typeof window === "undefined") {
    return "";
  }

  return window.sessionStorage.getItem("circlePostId") || "";
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "请求失败，请稍后重试";
}

function formatPostTime(value?: string | null, createdAt?: string) {
  if (value) {
    return value;
  }

  if (!createdAt) {
    return "";
  }

  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) {
    return createdAt;
  }

  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

function formatCommentTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return `${date.getMonth() + 1}月${date.getDate()}日 ${`${date.getHours()}`.padStart(2, "0")}:${`${date.getMinutes()}`.padStart(2, "0")}`;
}

async function loadDetail() {
  if (!postId.value) {
    props.showToast("未找到帖子");
    return;
  }

  loading.value = true;

  try {
    const [detail, commentResponse] = await Promise.all([
      getCommunityPostDetail(postId.value),
      getCommunityPostComments(postId.value, { page: 1, pageSize: 50 })
    ]);

    post.value = detail;
    comments.value = commentResponse.list;
  } catch (error) {
    props.showToast(getErrorMessage(error));
  } finally {
    loading.value = false;
  }
}

function goBack() {
  if (!props.navigation.navigateBack()) {
    props.navigation.reLaunch("community/circle");
  }
}

function pending(label: string) {
  props.showToast(`${label}功能暂未接入`);
}

async function handleLike() {
  if (!post.value) {
    return;
  }

  const previousLiked = Boolean(post.value.liked);
  const previousCount = likeCount.value;
  const nextLiked = !previousLiked;
  post.value = {
    ...post.value,
    liked: nextLiked,
    likes: Math.max(0, previousCount + (nextLiked ? 1 : -1))
  };

  try {
    if (!previousLiked) {
      await likeCommunityPost(post.value.postId);
    }
  } catch (error) {
    post.value = {
      ...post.value,
      liked: previousLiked,
      likes: previousCount
    };
    props.showToast(getErrorMessage(error));
  }
}

async function handleFavorite() {
  if (!post.value) {
    return;
  }

  const previousFavorited = Boolean(post.value.favorited);
  const previousCount = favoriteCount.value;
  const nextFavorited = !previousFavorited;
  post.value = {
    ...post.value,
    favorited: nextFavorited,
    stars: Math.max(0, previousCount + (nextFavorited ? 1 : -1))
  };

  try {
    if (!previousFavorited) {
      await favoriteCommunityPost(post.value.postId);
    }
  } catch (error) {
    post.value = {
      ...post.value,
      favorited: previousFavorited,
      stars: previousCount
    };
    props.showToast(getErrorMessage(error));
  }
}

async function handleShare() {
  if (!post.value) {
    return;
  }

  const previousCount = shareCount.value;
  post.value = {
    ...post.value,
    shares: previousCount + 1
  };

  try {
    await shareCommunityPost(post.value.postId);
    props.showToast("已记录分享");
  } catch (error) {
    post.value = {
      ...post.value,
      shares: previousCount
    };
    props.showToast(getErrorMessage(error));
  }
}

async function submitComment() {
  if (!post.value || !commentDraft.value.trim()) {
    props.showToast("请输入评论内容");
    return;
  }

  submittingComment.value = true;

  try {
    await createCommunityPostComment(post.value.postId, {
      content: commentDraft.value.trim()
    });

    commentDraft.value = "";
    await loadDetail();
    props.showToast("评论已发布");
  } catch (error) {
    props.showToast(getErrorMessage(error));
  } finally {
    submittingComment.value = false;
  }
}

onMounted(() => {
  void loadDetail();
});
</script>

<template>
  <section class="post-detail-page">
    <header class="page-header">
      <button class="back-button" type="button" aria-label="返回" @click="goBack">‹</button>
      <h1>帖子详情</h1>
      <button class="share-button" type="button" aria-label="分享" @click="handleShare">
        <Share theme="outline" size="22" fill="#34383f" />
      </button>
    </header>

    <main class="detail-scroll">
      <p v-if="loading" class="state-text">帖子加载中...</p>

      <template v-else-if="post">
        <article class="detail-card">
          <header class="post-header">
            <img class="post-avatar" :src="post.author?.avatar || post.avatar || ''" :alt="post.author?.name || post.authorName || '用户头像'" />
            <div class="post-author">
              <div>
                <strong>{{ post.author?.name || post.authorName }}</strong>
                <span v-if="post.badge || post.tagLabel">{{ post.badge || post.tagLabel }}</span>
              </div>
              <small>{{ formatPostTime(post.time, post.createdAt) }}</small>
            </div>
            <button class="follow-button" type="button" @click="pending('关注')">+ 关注</button>
          </header>

          <p class="detail-content">{{ post.content }}</p>

          <div v-if="post.images.length" class="detail-images" :class="{ 'detail-images--double': post.images.length === 2 }">
            <img v-for="image in post.images" :key="image" :src="image" :alt="post.content" />
          </div>

          <button v-if="post.tag || post.topic?.title" class="tag-chip" type="button" @click="pending('话题')">
            <span></span>
            {{ post.tag || post.topic?.title }}
          </button>

          <footer class="detail-actions">
            <button
              class="detail-action"
              :class="{ starred: post.favorited }"
              type="button"
              @click="handleFavorite"
            >
              <Star :theme="post.favorited ? 'filled' : 'outline'" size="22" :fill="post.favorited ? '#f4bf25' : '#454952'" />
              {{ favoriteCount }}
            </button>
            <button
              class="detail-action"
              :class="{ active: post.liked }"
              type="button"
              @click="handleLike"
            >
              <Like :theme="post.liked ? 'filled' : 'outline'" size="22" :fill="post.liked ? '#7a6ff0' : '#454952'" />
              {{ likeCount }}
            </button>
            <button class="detail-action" type="button" @click="handleShare">
              <Share theme="outline" size="22" fill="#454952" />
              {{ shareCount }}
            </button>
          </footer>
        </article>

        <section class="comment-section">
          <div class="comment-heading">
            <h2>评论区</h2>
            <span>{{ comments.length }}条评论</span>
          </div>

          <article v-for="comment in comments" :key="comment.commentId" class="comment-card">
            <img class="comment-avatar" :src="comment.avatarUrl || comment.user?.avatar || ''" :alt="comment.author || comment.user?.name || '评论头像'" />
            <div class="comment-body">
              <div class="comment-top">
                <strong>{{ comment.author || comment.user?.name }}</strong>
                <small>{{ formatCommentTime(comment.createdAt) }}</small>
              </div>
              <p>{{ comment.content }}</p>
              <div class="comment-meta">
                <span>{{ comment.city || "上海市" }}</span>
                <span>点赞 {{ comment.likes || 0 }}</span>
              </div>
            </div>
          </article>

          <p v-if="!comments.length" class="state-text state-text--compact">暂无评论</p>
        </section>
      </template>

      <p v-else class="state-text">未找到帖子内容</p>
    </main>

    <div class="comment-bar">
      <input v-model="commentDraft" class="comment-input" type="text" placeholder="说点什么吧..." />
      <button class="send-button" type="button" :disabled="submittingComment" @click="submitComment">
        {{ submittingComment ? "发送中" : "发送" }}
      </button>
    </div>
  </section>
</template>

<style scoped>
.post-detail-page {
  position: relative;
  left: 50%;
  width: min(402px, 100vw);
  height: min(874px, calc(100vh - 36px));
  min-height: min(874px, calc(100vh - 36px));
  max-height: 874px;
  margin: -18px 0;
  transform: translateX(-50%);
  padding-top: 16px;
  box-sizing: border-box;
  overflow: hidden;
  background: #f5f6f7;
  color: #252939;
  font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif;
}

.page-header {
  height: 52px;
  display: grid;
  grid-template-columns: 40px 1fr 40px;
  align-items: center;
  padding: 0 18px;
  box-sizing: border-box;
  background: #f5f6f7;
}

.back-button,
.share-button,
.follow-button,
.tag-chip,
.detail-action,
.comment-input,
.send-button {
  border: 0;
  background: transparent;
  color: inherit;
}

.back-button {
  width: 32px;
  height: 40px;
  padding: 0;
  color: #34383f;
  font-size: 40px;
  line-height: 32px;
}

.page-header h1 {
  margin: 0;
  color: #252939;
  font-size: 18px;
  font-weight: 900;
  text-align: center;
}

.share-button {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  padding: 0;
}

.detail-scroll {
  height: calc(100% - 52px);
  padding: 0 18px 86px;
  box-sizing: border-box;
  overflow-y: auto;
  scrollbar-width: none;
}

.detail-scroll::-webkit-scrollbar {
  display: none;
}

.detail-card,
.comment-section {
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 6px 18px rgba(31, 40, 58, 0.04);
}

.detail-card {
  padding: 16px;
}

.post-header {
  display: grid;
  grid-template-columns: 38px 1fr auto;
  gap: 10px;
  align-items: center;
  margin-bottom: 14px;
}

.post-avatar {
  width: 38px;
  height: 38px;
  display: block;
  border-radius: 50%;
  object-fit: cover;
  background: #f2f4f7;
}

.post-author {
  min-width: 0;
}

.post-author div {
  display: flex;
  align-items: center;
  gap: 5px;
}

.post-author strong {
  color: #252939;
  font-size: 15px;
  font-weight: 900;
}

.post-author span {
  height: 13px;
  display: inline-flex;
  align-items: center;
  padding: 0 4px;
  border-radius: 3px;
  background: #263241;
  color: #d9f3ff;
  font-size: 8px;
  font-weight: 900;
}

.post-author small {
  color: #b2b4ba;
  font-size: 11px;
  font-weight: 700;
}

.follow-button {
  width: 58px;
  height: 28px;
  border-radius: 14px;
  background: #111;
  color: #fff;
  font-size: 12px;
  font-weight: 900;
}

.detail-content {
  margin: 0 0 14px;
  color: #252939;
  font-size: 17px;
  font-weight: 800;
  line-height: 1.7;
}

.detail-images {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 7px;
}

.detail-images--double {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.detail-images img {
  width: 100%;
  aspect-ratio: 1 / 1;
  display: block;
  border-radius: 8px;
  object-fit: cover;
}

.tag-chip {
  height: 25px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-top: 12px;
  padding: 0 10px;
  border-radius: 13px;
  background: #f1f2f4;
  color: #5d626b;
  font-size: 12px;
  font-weight: 800;
}

.tag-chip span {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #555b63;
}

.detail-actions {
  display: flex;
  justify-content: flex-end;
  gap: 24px;
  margin-top: 16px;
}

.detail-action {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0;
  color: #454952;
  font-size: 12px;
  font-weight: 800;
}

.detail-action.active {
  color: #7a6ff0;
}

.detail-action.starred {
  color: #f4bf25;
}


.comment-section {
  margin-top: 14px;
  padding: 16px;
}

.comment-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.comment-heading h2 {
  margin: 0;
  color: #252939;
  font-size: 18px;
  font-weight: 900;
}

.comment-heading span {
  color: #9fa2a8;
  font-size: 12px;
  font-weight: 800;
}

.comment-card {
  display: grid;
  grid-template-columns: 36px 1fr;
  gap: 10px;
  padding: 14px 0;
  border-top: 1px solid #f0f1f3;
}

.comment-avatar {
  width: 36px;
  height: 36px;
  display: block;
  border-radius: 50%;
  object-fit: cover;
  background: #f2f4f7;
}

.comment-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.comment-top strong {
  color: #252939;
  font-size: 14px;
  font-weight: 900;
}

.comment-top small {
  color: #b2b4ba;
  font-size: 11px;
  font-weight: 700;
}

.comment-body p {
  margin: 6px 0 8px;
  color: #454952;
  font-size: 14px;
  font-weight: 700;
  line-height: 1.6;
}

.comment-meta {
  display: flex;
  gap: 10px;
  color: #9b9ea6;
  font-size: 12px;
  font-weight: 700;
}

.comment-bar {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  display: grid;
  grid-template-columns: 1fr 72px;
  gap: 10px;
  padding: 12px 18px 18px;
  box-sizing: border-box;
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 -7px 18px rgba(40, 58, 90, 0.04);
}

.comment-input {
  height: 38px;
  padding: 0 14px;
  border-radius: 19px;
  background: #f1f2f4;
  color: #252939;
  font-size: 14px;
  font-weight: 700;
  outline: none;
}

.comment-input::placeholder {
  color: #a0a3aa;
}

.send-button {
  height: 38px;
  border-radius: 19px;
  background: #6872f0;
  color: #fff;
  font-size: 14px;
  font-weight: 900;
}

.send-button:disabled {
  opacity: 0.7;
}

.state-text {
  margin: 0;
  padding: 24px 0;
  color: #9fa2a8;
  font-size: 13px;
  text-align: center;
}

.state-text--compact {
  padding-bottom: 0;
}
</style>
