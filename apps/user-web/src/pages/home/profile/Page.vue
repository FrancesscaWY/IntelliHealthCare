<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import type { PageComponentProps } from "@ihc/page-core/types";
import { Back, Comment, Like, Male, More, Share, Star } from "@icon-park/vue-next";
import coverImage from "@/assets/home/profile/cover.jpg";
import { loadPublishedProfilePost, type ProfilePost } from "./published-post";
import { loadUserProfileState, syncUserProfileStateFromApi } from "./profile-store";
import mock from "./mock";

type InteractiveProfilePost = ProfilePost & {
  isLiked: boolean;
  isFavorited: boolean;
};

const props = defineProps<PageComponentProps>();
const isFollowing = ref(false);
const profileState = ref(loadUserProfileState());
const region = ref(mock.profile.region);
const stats = ref(mock.profile.stats);
const profileMotto = computed(() => profileState.value.intro.trim() || "这个人很懒，还没有填写简介");
const publishedPost = loadPublishedProfilePost();
const initialPosts: ProfilePost[] = publishedPost ? [publishedPost, ...mock.posts] : mock.posts;
const posts = ref<InteractiveProfilePost[]>(
  initialPosts.map((post) => ({
    ...post,
    isLiked: false,
    isFavorited: false,
  })),
);

const profileStats = computed(() =>
  stats.value.map((item, index) => {
    if (index !== 0) {
      return item;
    }

    return {
      ...item,
      value: String(Number(item.value) + (isFollowing.value ? 1 : 0)),
    };
  }),
);

const feedCount = computed(() => mock.feedCount + (publishedPost ? 1 : 0));
const profileAvatar = computed(() => profileState.value.avatarUrl);
const profileName = computed(() => profileState.value.nickname || mock.profile.name);

onMounted(() => {
  void syncUserProfileStateFromApi()
    .then((state) => {
      profileState.value = state;
    })
    .catch(() => {});
});

function showPendingMessage(label: string) {
  props.showToast(`${label}功能待接入`);
}

function handleBack() {
  props.navigation.reLaunch("home/mine");
}

function toggleFollow() {
  isFollowing.value = !isFollowing.value;
  props.showToast(isFollowing.value ? "已关注" : "已取消关注");
}

function toggleLike(postId: string) {
  const targetPost = posts.value.find((post) => post.id === postId);

  if (!targetPost) {
    return;
  }

  targetPost.isLiked = !targetPost.isLiked;
  targetPost.likes += targetPost.isLiked ? 1 : -1;
}

function toggleFavorite(postId: string) {
  const targetPost = posts.value.find((post) => post.id === postId);

  if (!targetPost) {
    return;
  }

  targetPost.isFavorited = !targetPost.isFavorited;
  targetPost.favorites += targetPost.isFavorited ? 1 : -1;
}

function imageStyle(src: string, position = "center") {
  return {
    backgroundImage: `url(${src})`,
    backgroundPosition: position,
  };
}
</script>

<template>
  <section class="profile-page">
    <header class="profile-cover" :style="imageStyle(coverImage, 'center 38%')">
      <div class="profile-cover__overlay"></div>

      <div class="profile-cover__topbar">
        <button class="cover-icon-button" type="button" aria-label="返回" @click="handleBack">
          <Back theme="outline" size="22" fill="#ffffff" />
        </button>
        <button class="cover-icon-button" type="button" aria-label="更多" @click="showPendingMessage('更多')">
          <More theme="outline" size="22" fill="#ffffff" />
        </button>
      </div>

      <div class="profile-card">
        <div class="profile-card__head">
          <img class="profile-avatar" :src="profileAvatar" :alt="`${profileName}头像`" draggable="false" />
          <div class="profile-meta">
            <div class="profile-name-row">
              <h1>{{ profileName }}</h1>
              <span class="profile-gender" aria-label="男">
                <Male theme="filled" size="14" fill="#57d6b6" />
              </span>
            </div>
            <p class="profile-region">{{ region }}</p>
          </div>
        </div>

        <p class="profile-motto">{{ profileMotto }}</p>

        <div class="profile-actions">
          <div class="profile-stats">
            <div v-for="item in profileStats" :key="item.label" class="profile-stat">
              <strong>{{ item.value }}</strong>
              <span>{{ item.label }}</span>
            </div>
          </div>

          <div class="profile-cta">
            <button class="outline-button" type="button" aria-label="私信" @click="showPendingMessage('私信')">
              <Comment theme="outline" size="20" fill="#ffffff" />
            </button>
            <button class="follow-button" :class="{ 'follow-button--active': isFollowing }" type="button" @click="toggleFollow">
              {{ isFollowing ? "已关注" : "+ 关注" }}
            </button>
          </div>
        </div>
      </div>
    </header>

    <section class="feed-panel">
      <div class="feed-heading">
        <h2>动态 {{ feedCount }}</h2>
      </div>

      <article v-for="post in posts" :key="post.id" class="feed-item">
        <div class="feed-item__meta">
          <img class="feed-item__avatar" :src="profileAvatar" :alt="`${profileName}头像`" draggable="false" />
          <div>
            <strong>{{ profileName }}</strong>
            <span>{{ post.date }}</span>
          </div>
        </div>

        <p v-if="post.title" class="feed-item__title">{{ post.title }}</p>
        <p class="feed-item__content">{{ post.content }}</p>

        <div v-if="post.gallery.length" class="feed-gallery">
          <div
            class="feed-gallery__main"
            :style="imageStyle(post.gallery[0].src, post.gallery[0].position || 'center')"
          ></div>
          <div class="feed-gallery__side">
            <div
              v-for="item in post.gallery.slice(1)"
              :key="item.src"
              class="feed-gallery__thumb"
              :style="imageStyle(item.src, item.position || 'center')"
            ></div>
          </div>
        </div>

        <div class="feed-item__actions">
          <button type="button" aria-label="分享" @click="showPendingMessage('分享')">
            <Share theme="outline" size="22" fill="#31343a" />
          </button>
          <button type="button" :class="{ 'feed-action-button--active-like': post.isLiked }" @click="toggleLike(post.id)">
            <Like :theme="post.isLiked ? 'filled' : 'outline'" size="22" :fill="post.isLiked ? '#f05b72' : '#31343a'" />
            <span>{{ post.likes }}</span>
          </button>
          <button
            type="button"
            :class="{ 'feed-action-button--active-star': post.isFavorited }"
            @click="toggleFavorite(post.id)"
          >
            <Star
              :theme="post.isFavorited ? 'filled' : 'outline'"
              size="22"
              :fill="post.isFavorited ? '#f2a93b' : '#31343a'"
            />
            <span>{{ post.favorites }}</span>
          </button>
          <button type="button" @click="showPendingMessage('评论')">
            <Comment theme="outline" size="22" fill="#31343a" />
            <span>{{ post.comments }}</span>
          </button>
        </div>
      </article>
    </section>
  </section>
</template>

<style scoped>
.profile-page {
  display: grid;
  gap: 10px;
  margin: -18px;
  padding-bottom: 18px;
  background: linear-gradient(180deg, #ece6dc 0%, #f7f4ef 30%, #faf9f7 100%);
  color: #332a22;
}

.profile-cover {
  position: relative;
  min-height: 396px;
  padding: 16px 16px 0;
  overflow: hidden;
  background-color: #9d754e;
  background-repeat: no-repeat;
  background-size: cover;
}

.profile-cover__overlay {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(180deg, rgba(70, 48, 22, 0.14), rgba(172, 113, 45, 0.28) 48%, rgba(185, 121, 47, 0.7) 100%),
    linear-gradient(90deg, rgba(76, 46, 17, 0.15), transparent 45%);
}

.profile-cover__topbar,
.profile-card {
  position: relative;
  z-index: 1;
}

.profile-cover__topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.cover-icon-button {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 0;
  background: transparent;
}

.profile-card {
  margin-top: 46px;
  color: #fff;
}

.profile-card__head {
  display: flex;
  align-items: center;
  gap: 14px;
}

.profile-avatar {
  width: 92px;
  height: 92px;
  border: 3px solid rgba(255, 255, 255, 0.92);
  border-radius: 50%;
  object-fit: cover;
  object-position: center;
  box-shadow: 0 12px 24px rgba(41, 23, 7, 0.18);
  filter: grayscale(1);
}

.profile-meta {
  min-width: 0;
}

.profile-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.profile-name-row h1 {
  margin: 0;
  font-size: 23px;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.profile-gender {
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  border-radius: 7px;
  background: rgba(255, 255, 255, 0.92);
}

.profile-region {
  margin: 8px 0 0;
  font-size: 13px;
  font-weight: 400;
  color: rgba(255, 255, 255, 0.82);
}

.profile-motto {
  width: min(100%, 326px);
  margin: 22px 0 0;
  font-size: 13px;
  line-height: 1.75;
  font-weight: 500;
}

.profile-actions {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 14px;
  margin-top: 20px;
  padding-bottom: 30px;
}

.profile-stats {
  display: flex;
  gap: 28px;
}

.profile-stat {
  display: grid;
  gap: 6px;
  min-width: 52px;
}

.profile-stat strong {
  font-size: 18px;
  font-weight: 600;
  line-height: 1;
}

.profile-stat span {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.88);
}

.profile-cta {
  display: flex;
  align-items: center;
  gap: 10px;
}

.outline-button,
.follow-button,
.feed-item__actions button {
  font: inherit;
}

.outline-button {
  display: grid;
  place-items: center;
  width: 52px;
  height: 40px;
  border: 1.5px solid rgba(255, 255, 255, 0.88);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.05);
  color: #fff;
}

.follow-button {
  min-width: 92px;
  height: 40px;
  padding: 0 18px;
  border: 0;
  border-radius: 999px;
  background: linear-gradient(135deg, #6876ff, #5a6ef8 58%, #4f67f4);
  color: #fff;
  font-size: 14px;
  font-weight: 700;
  box-shadow: 0 12px 24px rgba(78, 98, 255, 0.24);
}

.follow-button--active {
  background: rgba(255, 255, 255, 0.14);
  box-shadow: inset 0 0 0 1.5px rgba(255, 255, 255, 0.88);
}

.feed-panel {
  margin-top: -18px;
  padding: 20px 18px 8px;
  border-radius: 28px 28px 0 0;
  background: #f8f8f7;
}

.feed-heading {
  padding: 8px 8px 6px;
}

.feed-heading h2 {
  margin: 0;
  color: #c1c5cc;
  font-size: 14px;
  font-weight: 600;
}

.feed-item {
  padding: 14px 8px 18px;
  border-bottom: 1px solid rgba(40, 51, 68, 0.08);
}

.feed-item:last-of-type {
  border-bottom: 0;
}

.feed-item__meta {
  display: flex;
  align-items: center;
  gap: 10px;
}

.feed-item__avatar {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  object-fit: cover;
  object-position: center;
  filter: grayscale(1);
}

.feed-item__meta strong {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #2d2d31;
}

.feed-item__meta span {
  display: block;
  margin-top: 3px;
  font-size: 12px;
  color: #b4b8be;
}

.feed-item__title {
  margin: 14px 0 0;
  color: #2c2f34;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.6;
}

.feed-item__content {
  margin: 10px 0 0;
  color: #4d4f55;
  font-size: 13px;
  line-height: 1.9;
}

.feed-gallery {
  display: grid;
  grid-template-columns: minmax(0, 1.8fr) minmax(0, 0.95fr);
  gap: 10px;
  margin-top: 14px;
}

.feed-gallery__main,
.feed-gallery__thumb {
  overflow: hidden;
  border-radius: 18px;
  background-color: #ece5d8;
  background-repeat: no-repeat;
  background-size: cover;
}

.feed-gallery__main {
  min-height: 178px;
}

.feed-gallery__side {
  display: grid;
  gap: 10px;
}

.feed-gallery__thumb {
  min-height: 84px;
}

.feed-item__actions {
  display: grid;
  grid-template-columns: 1fr auto auto auto;
  align-items: center;
  gap: 14px;
  margin-top: 14px;
}

.feed-item__actions button {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 0;
  border: 0;
  background: transparent;
  color: #31343a;
  font-size: 13px;
  font-weight: 500;
}

.feed-item__actions button:first-child {
  justify-self: start;
}

.feed-action-button--active-like {
  color: #f05b72;
}

.feed-action-button--active-star {
  color: #d8972a;
}
</style>
