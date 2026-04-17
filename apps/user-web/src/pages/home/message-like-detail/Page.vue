<script setup lang="ts">
import type { PageComponentProps } from '@ihc/page-core/types'
import { Like, Share, Star } from '@icon-park/vue-next'
import mock from './mock'

const props = defineProps<PageComponentProps>()

function goBack() {
  if (!props.navigation.navigateBack()) {
    props.navigation.navigateTo('home/message')
  }
}

function openPost(postId: number) {
  if (typeof window !== 'undefined') {
    window.sessionStorage.setItem('circlePostId', String(postId))
  }

  props.navigation.navigateTo('community/post-detail')
}

function pending(label: string) {
  props.showToast(`${label}功能待接入`)
}
</script>

<template>
  <section class="message-detail-page"><header class="page-header">
      <button class="back-button" type="button" aria-label="返回" @click="goBack">‹</button>
      <h1>赞和收藏</h1>
      <span class="header-space"></span>
    </header>

    <main class="detail-scroll">
      <section class="summary-card">
        <span class="summary-icon">
          <Like theme="filled" size="25" fill="currentColor" />
        </span>
        <div>
          <h2>收到的喜欢</h2>
          <p>有人喜欢或收藏了你的生活圈内容。</p>
        </div>
      </section>

      <article v-for="item in mock.updates" :key="item.id" class="notice-card">
        <header class="notice-header">
          <img class="avatar" :src="item.avatar" :alt="item.author" />
          <div class="notice-user">
            <strong>{{ item.author }}</strong>
            <span>{{ item.action }} · {{ item.time }}</span>
          </div>
          <span class="event-icon" :class="{ starred: item.type === 'star' }">
            <Star v-if="item.type === 'star'" theme="filled" size="20" fill="currentColor" />
            <Like v-else theme="filled" size="20" fill="currentColor" />
          </span>
        </header>

        <button class="post-preview" type="button" @click="openPost(item.postId)">
          <img :src="item.postImage" :alt="item.postTitle" />
          <span>
            <strong>{{ item.postTitle }}</strong>
            <small>{{ item.postExcerpt }}</small>
          </span>
        </button>

        <footer class="notice-actions">
          <button type="button" @click="pending('查看互动')">
            <Like theme="outline" size="18" fill="currentColor" />
            查看互动
          </button>
          <button type="button" @click="pending('转发')">
            <Share theme="outline" size="18" fill="currentColor" />
            转发
          </button>
        </footer>
      </article>
    </main>
  </section>
</template>

<style scoped>
.message-detail-page {
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
  font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif;
}

button {
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
}

.page-header {
  height: 52px;
  display: grid;
  grid-template-columns: 44px 1fr 44px;
  align-items: center;
  padding: 0 20px;
  box-sizing: border-box;
}

.back-button {
  justify-self: start;
  width: 34px;
  height: 34px;
  color: #34383f;
  font-size: 34px;
  line-height: 28px;
}

.page-header h1 {
  margin: 0;
  color: #34383f;
  font-size: 21px;
  font-weight: 900;
  text-align: center;
  letter-spacing: 0;
}

.detail-scroll {
  height: calc(100% - 52px);
  padding: 14px 20px 28px;
  box-sizing: border-box;
  overflow-y: auto;
  scrollbar-width: none;
}

.detail-scroll::-webkit-scrollbar {
  display: none;
}

.summary-card,
.notice-card {
  border-radius: 18px;
  background: #fff;
  box-shadow: 0 10px 26px rgba(32, 42, 62, 0.05);
}

.summary-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  margin-bottom: 14px;
}

.summary-icon {
  width: 48px;
  height: 48px;
  display: grid;
  place-items: center;
  border-radius: 14px;
  background: linear-gradient(135deg, #eeeaff 0%, #d8dfff 100%);
  color: #7a6ff0;
}

.summary-card h2 {
  margin: 0 0 4px;
  color: #34383f;
  font-size: 18px;
  font-weight: 900;
}

.summary-card p,
.notice-user span,
.post-preview small {
  margin: 0;
  color: #a3a6ad;
  font-size: 12px;
  font-weight: 700;
}

.notice-card {
  padding: 16px;
  margin-bottom: 14px;
}

.notice-header {
  display: grid;
  grid-template-columns: 42px 1fr 36px;
  gap: 10px;
  align-items: center;
}

.avatar {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  object-fit: cover;
}

.notice-user {
  min-width: 0;
}

.notice-user strong {
  display: block;
  margin-bottom: 4px;
  overflow: hidden;
  color: #34383f;
  font-size: 15px;
  font-weight: 900;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.event-icon {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border-radius: 12px;
  background: #f0edff;
  color: #7a6ff0;
}

.event-icon.starred {
  background: #fff5d6;
  color: #f4bf25;
}

.post-preview {
  width: 100%;
  display: grid;
  grid-template-columns: 64px 1fr;
  gap: 12px;
  align-items: center;
  padding: 10px;
  margin-top: 14px;
  border-radius: 14px;
  background: #fbfbfc;
  text-align: left;
}

.post-preview img {
  width: 64px;
  height: 64px;
  border-radius: 10px;
  object-fit: cover;
}

.post-preview strong {
  display: block;
  margin-bottom: 7px;
  color: #34383f;
  font-size: 14px;
  font-weight: 900;
}

.post-preview small {
  display: block;
  line-height: 1.35;
}

.notice-actions {
  display: flex;
  justify-content: flex-end;
  gap: 18px;
  padding-top: 12px;
}

.notice-actions button {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: #7e828b;
  font-size: 12px;
  font-weight: 800;
}
</style>
