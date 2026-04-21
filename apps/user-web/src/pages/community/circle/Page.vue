<script setup lang="ts">
import { computed, ref } from 'vue'
import type { PageComponentProps } from '@ihc/page-core/types'
import { Like, Share, Star } from '@icon-park/vue-next'
import mock from './mock'

const props = defineProps<PageComponentProps>()
const likedPostIds = ref(new Set<number>())
const starredPostIds = ref(new Set<number>())

const navIconMarkup: Record<string, string> = {
  home: `
    <path d="M7.3 18.2 24 5.2l16.7 13v20a2.5 2.5 0 0 1-2.5 2.5h-8.9V29.2H18.7v11.5H9.8a2.5 2.5 0 0 1-2.5-2.5v-20Z" />
  `,
  circle: `
    <circle cx="24" cy="24" r="14.2" />
    <path d="m29.7 14.3-3.6 10.4-10.4 3.6 3.6-10.4 10.4-3.6Z" />
    <circle cx="24" cy="24" r="2.2" />
  `,
  message: `
    <path d="M38.3 22.2c0 7.1-6.15 12.75-14.3 12.75-1.8 0-3.55-.3-5.1-.85l-8.45 4.45 2.45-7.25c-2.05-2.3-3.2-5.4-3.2-9.1 0-7.1 6.15-12.75 14.3-12.75S38.3 15.1 38.3 22.2Z" />
  `,
  mine: `
    <circle cx="24" cy="16.7" r="7.3" />
    <path d="M10.2 39.2c1.45-7.3 6.05-11.2 13.8-11.2s12.35 3.9 13.8 11.2" />
  `,
}

const activeTab = ref('推荐')

const posts = computed(() => {
  if (activeTab.value === '关注') {
    return [mock.posts[1]]
  }

  if (activeTab.value === '最新') {
    return [...mock.posts].reverse()
  }

  return mock.posts
})

function pending(label: string) {
  props.showToast(`${label}功能待接入`)
}

function openPostDetail(postId: number) {
  if (typeof window !== 'undefined') {
    window.sessionStorage.setItem('circlePostId', String(postId))
  }

  props.navigation.navigateTo('community/post-detail')
}

function toggleLike(postId: number) {
  const next = new Set(likedPostIds.value)

  next.has(postId) ? next.delete(postId) : next.add(postId)
  likedPostIds.value = next
}

function toggleStar(postId: number) {
  const next = new Set(starredPostIds.value)

  next.has(postId) ? next.delete(postId) : next.add(postId)
  starredPostIds.value = next
}

function isLiked(postId: number) {
  return likedPostIds.value.has(postId)
}

function isStarred(postId: number) {
  return starredPostIds.value.has(postId)
}

function getNavIconMarkup(key: string) {
  return navIconMarkup[key] || navIconMarkup.home
}

function getNavGradientId(key: string) {
  return `tab-gradient-${key}`
}

function openPage(pageId: string, label?: string) {
  if (!pageId) {
    props.showToast(`${label || '该'}功能待接入`)
    return
  }

  props.navigation.navigateTo(pageId)
}
</script>

<template>
  <section class="circle-page">
    <main class="circle-scroll">
      <nav class="feed-tabs" aria-label="生活圈栏目">
        <button
          v-for="item in mock.feedTabs"
          :key="item"
          class="feed-tab"
          :class="{ active: activeTab === item }"
          type="button"
          @click="activeTab = item"
        >
          {{ item }}
        </button>
      </nav>

      <section class="topic-grid" aria-label="热门话题">
        <button v-for="topic in mock.topics" :key="topic.id" class="topic-card" type="button" @click="pending(topic.title)">
          <img class="topic-image" :src="topic.image" :alt="topic.title" />
          <div class="topic-copy">
            <strong>{{ topic.title }}</strong>
            <div class="topic-meta">
              <span>HOT</span>
              <em>{{ topic.count }}</em>
            </div>
          </div>
        </button>
      </section>

      <div class="topic-dots" aria-hidden="true">
        <span></span>
        <span class="active"></span>
      </div>

      <section class="post-list" aria-label="动态列表">
        <article v-for="post in posts" :key="post.id" class="post-card" role="button" tabindex="0" @click="openPostDetail(post.id)">
          <header class="post-header">
            <img class="post-avatar" :src="post.avatar" :alt="post.author" />
            <div class="post-author">
              <div>
                <strong>{{ post.author }}</strong>
                <span>{{ post.badge }}</span>
              </div>
              <small>{{ post.time }}</small>
            </div>
            <button class="follow-button" type="button" @click.stop="pending('关注')">+ 关注</button>
            <button class="more-button" type="button" aria-label="更多" @click.stop="pending('更多')">···</button>
          </header>

          <div class="post-images" :class="{ 'post-images--double': post.images.length === 2 }">
            <img v-for="image in post.images" :key="image" :src="image" :alt="post.content" />
          </div>

          <p class="post-content">{{ post.content }}</p>

          <button class="tag-chip" type="button" @click.stop="pending(post.tag)">
            <span></span>
            {{ post.tag }}
          </button>

          <footer class="post-actions">
            <button class="post-action-button" :class="{ active: isStarred(post.id) }" type="button" @click.stop="toggleStar(post.id)">
              <Star :theme="isStarred(post.id) ? 'filled' : 'outline'" size="22" :fill="isStarred(post.id) ? '#f2c94c' : '#454952'" />
              {{ post.stars }}
            </button>
            <button class="post-action-button" :class="{ active: isLiked(post.id) }" type="button" @click.stop="toggleLike(post.id)">
              <Like :theme="isLiked(post.id) ? 'filled' : 'outline'" size="22" :fill="isLiked(post.id) ? '#f45d76' : '#454952'" />
              {{ post.likes }}
            </button>
            <button class="post-action-button" type="button" @click.stop="pending('转发')">
              <Share theme="outline" size="22" fill="#454952" />
              {{ post.shares }}
            </button>
          </footer>
        </article>
      </section>

      <section class="creator-section">
        <h2>达人推荐</h2>
        <div class="creator-list">
          <button v-for="creator in mock.creators" :key="creator.id" class="creator-card" type="button" @click="pending(creator.name)">
            <img :src="creator.avatar" :alt="creator.name" />
            <span>{{ creator.name }}</span>
          </button>
        </div>
      </section>
    </main>

    <nav class="home-tabbar" aria-label="底部导航">
      <button
        v-for="item in mock.tabs"
        :key="item.key"
        class="tab-item"
        :class="[
          `tab-item--${item.key}`,
          { 'tab-item--active': item.key === 'circle', 'tab-item--publish': item.key === 'publish' },
        ]"
        type="button"
        @click="openPage(item.pageId, item.label || '发布')"
      >
        <span v-if="item.key === 'publish'" class="tab-icon tab-icon--publish" aria-hidden="true"></span>
        <span v-else class="tab-image" :class="`tab-image--${item.key}`" aria-hidden="true">
          <svg class="tab-svg" viewBox="0 0 48 48" focusable="false">
            <defs>
              <linearGradient :id="getNavGradientId(item.key)" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#6a74f1" />
                <stop offset="100%" stop-color="#ef6f8e" />
              </linearGradient>
            </defs>
            <g
              :fill="item.key === 'circle' ? `url(#${getNavGradientId(item.key)})` : 'none'"
              :stroke="item.key === 'circle' ? 'none' : 'currentColor'"
              stroke-width="3.2"
              stroke-linecap="round"
              stroke-linejoin="round"
              v-html="getNavIconMarkup(item.key)"
            ></g>
          </svg>
        </span>
        <span v-if="item.label" class="tab-label">{{ item.label }}</span>
      </button>
    </nav>
  </section>
</template>

<style scoped>
.circle-page {
  position: relative;
  left: 50%;
  width: min(402px, 100vw);
  height: min(874px, calc(100vh - 36px));
  min-height: min(874px, calc(100vh - 36px));
  max-height: 874px;
  margin: -18px 0;
  transform: translateX(-50%);
  overflow: hidden;
  background: #fff;
  color: #24372e;
  font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif;
}

.circle-scroll {
  height: 100%;
  padding: 16px 18px 106px;
  box-sizing: border-box;
  overflow-y: auto;
  scrollbar-width: none;
}

.circle-scroll::-webkit-scrollbar {
  display: none;
}

.feed-tab,
.topic-card,
.follow-button,
.more-button,
.tag-chip,
.post-actions button,
.creator-card,
.tab-item {
  border: 0;
  background: transparent;
  color: inherit;
}

.feed-tabs {
  display: flex;
  align-items: center;
  gap: 22px;
  padding: 6px 0 18px;
}

.feed-tab {
  padding: 0;
  border: 0;
  background: transparent;
  color: #9fa2a8;
  font-size: 20px;
  font-weight: 800;
  letter-spacing: 0;
  cursor: pointer;
}

.feed-tab.active {
  color: #24372e;
  font-size: 24px;
}

.topic-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px 20px;
  margin-bottom: 10px;
}

.topic-card {
  min-width: 0;
  display: grid;
  grid-template-columns: 48px 1fr;
  gap: 9px;
  align-items: center;
  padding: 0;
  border: 0;
  background: transparent;
  text-align: left;
  cursor: pointer;
}

.topic-image {
  width: 48px;
  height: 48px;
  display: block;
  border-radius: 9px;
  object-fit: cover;
}

.topic-copy {
  min-width: 0;
}

.topic-copy strong {
  display: block;
  margin-bottom: 4px;
  overflow: hidden;
  color: #24372e;
  font-size: 13px;
  font-weight: 900;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.topic-meta {
  display: flex;
  align-items: center;
  gap: 5px;
}

.topic-meta span {
  height: 12px;
  display: inline-flex;
  align-items: center;
  padding: 0 5px;
  border-radius: 3px;
  background: #fff4c7;
  color: #b67800;
  font-size: 8px;
  font-weight: 900;
  font-style: italic;
  line-height: 12px;
}

.topic-meta em {
  overflow: hidden;
  color: #b3b5bb;
  font-size: 10px;
  font-style: normal;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.topic-dots {
  display: flex;
  justify-content: center;
  gap: 4px;
  margin: 4px 0 16px;
}

.topic-dots span {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: #cfddd6;
}

.topic-dots span.active {
  width: 10px;
  border-radius: 8px;
  background: #15955d;
}

.post-list {
  display: grid;
  gap: 14px;
}

.post-card,
.creator-section {
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 8px 20px rgba(21, 149, 93, 0.055);
}

.post-card {
  padding: 16px;
}

.post-header {
  display: grid;
  grid-template-columns: 36px 1fr auto 24px;
  gap: 9px;
  align-items: center;
  margin-bottom: 13px;
}

.post-avatar {
  width: 36px;
  height: 36px;
  display: block;
  border-radius: 50%;
  object-fit: cover;
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
  color: #24372e;
  font-size: 14px;
  font-weight: 900;
}

.post-author span {
  height: 13px;
  display: inline-flex;
  align-items: center;
  padding: 0 4px;
  border-radius: 3px;
  background: #e5f7ee;
  color: #116f49;
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
  border: 1px solid #116f49;
  border-radius: 14px;
  background: transparent;
  color: #116f49;
  font-size: 12px;
  font-weight: 900;
  cursor: pointer;
}

.more-button {
  padding: 0;
  border: 0;
  background: transparent;
  color: #c4c6cc;
  font-size: 18px;
  font-weight: 900;
  cursor: pointer;
}

.post-images {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
}

.post-images--double {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.post-images img {
  width: 100%;
  aspect-ratio: 1 / 1;
  display: block;
  border-radius: 7px;
  object-fit: cover;
}

.post-content {
  margin: 12px 0 10px;
  color: #24372e;
  font-size: 15px;
  font-weight: 700;
  line-height: 1.55;
}

.tag-chip {
  height: 25px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 0 10px;
  border: 0;
  border-radius: 13px;
  background: #edf8f2;
  color: #176b48;
  font-size: 12px;
  font-weight: 800;
}

.tag-chip span {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #8bd7ba;
}

.post-actions {
  display: flex;
  justify-content: flex-end;
  gap: 24px;
  margin-top: 13px;
}

.post-actions button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0;
  border: 0;
  background: transparent;
  color: #454952;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
}

.post-action-button.active {
  color: #f45d76;
}

.post-action-button:first-child.active {
  color: #f2c94c;
}

.creator-section {
  margin-top: 14px;
  padding: 16px 12px 14px;
}

.creator-section h2 {
  margin: 0 0 13px;
  color: #111;
  font-size: 16px;
  font-weight: 900;
}

.creator-list {
  display: flex;
  gap: 16px;
  overflow-x: auto;
  scrollbar-width: none;
}

.creator-list::-webkit-scrollbar {
  display: none;
}

.creator-card {
  width: 58px;
  flex: 0 0 58px;
  display: grid;
  justify-items: center;
  gap: 8px;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
}

.creator-card img {
  width: 54px;
  height: 54px;
  display: block;
  border: 2px solid #f2c94c;
  border-radius: 50%;
  object-fit: cover;
}

.creator-card span {
  width: 100%;
  overflow: hidden;
  color: #34383f;
  font-size: 11px;
  font-weight: 800;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.home-tabbar {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 100;
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  align-items: end;
  height: 74px;
  padding: 9px 12px 10px;
  background: #fff;
  box-shadow: 0 -7px 18px rgba(40, 58, 90, 0.04);
}

.home-tabbar::before {
  position: absolute;
  top: -29px;
  left: 50%;
  z-index: 0;
  width: 58px;
  height: 58px;
  content: "";
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 -10px 24px rgba(102, 112, 240, 0.08);
  transform: translateX(-50%);
}

.tab-item {
  position: relative;
  z-index: 1;
  display: grid;
  justify-items: center;
  gap: 0;
  padding: 0;
  color: #24372e;
  font-size: 12px;
  transform: translateY(-6px);
}

.tab-item--active {
  color: #6872f0;
}

.tab-image {
  display: grid;
  place-items: center;
  width: 40px;
  height: 32px;
}

.tab-svg {
  display: block;
  width: 30px;
  height: 30px;
  filter: drop-shadow(0 5px 7px rgba(37, 41, 57, 0.08));
}

.tab-label {
  margin-top: 2px;
}

.tab-item--publish {
  align-self: start;
  z-index: 2;
  transform: none;
}

.tab-icon--publish {
  position: relative;
  display: block;
  width: 42px;
  height: 42px;
  margin-top: -29px;
  border-radius: 50%;
  background: linear-gradient(135deg, #6872f0 0%, #ed6d88 100%);
  box-shadow: 0 15px 25px rgba(102, 112, 240, 0.26);
}

.tab-icon--publish::before,
.tab-icon--publish::after {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 20px;
  height: 2px;
  content: "";
  border-radius: 999px;
  background: #ffffff;
  transform: translate(-50%, -50%);
}

.tab-icon--publish::after {
  transform: translate(-50%, -50%) rotate(90deg);
}
</style>
