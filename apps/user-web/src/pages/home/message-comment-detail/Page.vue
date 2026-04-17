<script setup lang="ts">
import type { PageComponentProps } from '@ihc/page-core/types'
import { Comment, Like, Share } from '@icon-park/vue-next'
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
      <h1>评论&回复</h1>
      <span class="header-space"></span>
    </header>

    <main class="detail-scroll">
      <section class="summary-card">
        <span class="summary-icon">
          <Comment theme="outline" size="26" fill="currentColor" />
        </span>
        <div>
          <h2>新的互动</h2>
          <p>生活圈里的评论和回复都收在这里。</p>
        </div>
      </section>

      <article v-for="item in mock.updates" :key="item.id" class="notice-card">
        <header class="notice-header">
          <img class="avatar" :src="item.avatar" :alt="item.author" />
          <div class="notice-user">
            <strong>{{ item.author }}</strong>
            <span>{{ item.action }} · {{ item.time }}</span>
          </div>
          <button class="plain-action" type="button" @click="pending('回复')">回复</button>
        </header>

        <p class="notice-content">{{ item.content }}</p>

        <div class="quote-box">
          <span>你的内容</span>
          <p>{{ item.reply }}</p>
        </div>

        <button class="post-preview" type="button" @click="openPost(item.postId)">
          <img :src="item.postImage" :alt="item.postTitle" />
          <span>
            <strong>{{ item.postTitle }}</strong>
            <small>{{ item.postExcerpt }}</small>
          </span>
        </button>

        <footer class="notice-actions">
          <button type="button" @click="pending('点赞')">
            <Like theme="outline" size="18" fill="currentColor" />
            点赞
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
  background: linear-gradient(135deg, #ffd9e8 0%, #e9dcff 100%);
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
  grid-template-columns: 42px 1fr auto;
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

.plain-action {
  padding: 6px 12px;
  border-radius: 999px;
  background: #f1f2ff;
  color: #6b6ff0;
  font-size: 12px;
  font-weight: 900;
}

.notice-content {
  margin: 14px 0 10px;
  color: #34383f;
  font-size: 15px;
  font-weight: 800;
  line-height: 1.55;
}

.quote-box {
  padding: 12px;
  border-radius: 12px;
  background: #f6f7f9;
}

.quote-box span {
  display: block;
  margin-bottom: 5px;
  color: #9da1aa;
  font-size: 12px;
  font-weight: 900;
}

.quote-box p {
  margin: 0;
  color: #5f636d;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.45;
}

.post-preview {
  width: 100%;
  display: grid;
  grid-template-columns: 58px 1fr;
  gap: 10px;
  align-items: center;
  padding: 10px;
  margin-top: 12px;
  border-radius: 14px;
  background: #fbfbfc;
  text-align: left;
}

.post-preview img {
  width: 58px;
  height: 58px;
  border-radius: 10px;
  object-fit: cover;
}

.post-preview strong {
  display: block;
  margin-bottom: 6px;
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
