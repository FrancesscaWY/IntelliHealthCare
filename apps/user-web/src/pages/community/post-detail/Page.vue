<script setup lang="ts">
import { computed, ref } from 'vue'
import type { PageComponentProps } from '@ihc/page-core/types'
import { Like, Share, Star } from '@icon-park/vue-next'
import mock from './mock'

const props = defineProps<PageComponentProps>()
const liked = ref(false)
const starred = ref(false)

const selectedPostId = ref(getSelectedPostId())

const post = computed(() => mock.posts.find((item) => item.id === selectedPostId.value) || mock.posts[0])
const comments = computed(() => mock.comments[post.value.id] || [])

function getSelectedPostId() {
  if (typeof window === 'undefined') {
    return mock.posts[0]?.id ?? 1
  }

  const storedId = Number(window.sessionStorage.getItem('circlePostId'))
  return Number.isFinite(storedId) && storedId > 0 ? storedId : mock.posts[0]?.id ?? 1
}

function goBack() {
  if (!props.navigation.navigateBack()) {
    props.navigation.reLaunch('community/circle')
  }
}

function pending(label: string) {
  props.showToast(`${label}功能待接入`)
}
</script>

<template>
  <section class="post-detail-page">
    <div class="status-bar">
      <span class="time">11:39</span>
      <div class="status-icons">
        <span class="signal">
          <i></i>
          <i></i>
          <i></i>
          <i></i>
        </span>
        <span class="wifi"></span>
        <span class="battery"></span>
      </div>
    </div>

    <header class="page-header">
      <button class="back-button" type="button" aria-label="返回" @click="goBack">‹</button>
      <h1>帖子详情</h1>
      <button class="share-button" type="button" aria-label="转发" @click="pending('转发')">
        <Share theme="outline" size="22" fill="#34383f" />
      </button>
    </header>

    <main class="detail-scroll">
      <article class="detail-card">
        <header class="post-header">
          <img class="post-avatar" :src="post.avatar" :alt="post.author" />
          <div class="post-author">
            <div>
              <strong>{{ post.author }}</strong>
              <span>{{ post.badge }}</span>
            </div>
            <small>{{ post.time }}</small>
          </div>
          <button class="follow-button" type="button" @click="pending('关注')">+ 关注</button>
        </header>

        <p class="detail-content">{{ post.content }}</p>

        <div class="detail-images" :class="{ 'detail-images--double': post.images.length === 2 }">
          <img v-for="image in post.images" :key="image" :src="image" :alt="post.content" />
        </div>

        <button class="tag-chip" type="button" @click="pending(post.tag)">
          <span></span>
          {{ post.tag }}
        </button>

        <footer class="detail-actions">
          <button class="detail-action" :class="{ active: starred, starred }" type="button" @click="starred = !starred">
            <Star :theme="starred ? 'filled' : 'outline'" size="22" :fill="starred ? '#f4bf25' : '#454952'" />
            {{ post.stars + (starred ? 1 : 0) }}
          </button>
          <button class="detail-action" :class="{ active: liked }" type="button" @click="liked = !liked">
            <Like :theme="liked ? 'filled' : 'outline'" size="22" :fill="liked ? '#7a6ff0' : '#454952'" />
            {{ post.likes + (liked ? 1 : 0) }}
          </button>
          <button class="detail-action" type="button" @click="pending('转发')">
            <Share theme="outline" size="22" fill="#454952" />
            {{ post.shares }}
          </button>
        </footer>
      </article>

      <section class="comment-section">
        <div class="comment-heading">
          <h2>评论区</h2>
          <span>{{ comments.length }}条评论</span>
        </div>

        <article v-for="comment in comments" :key="comment.id" class="comment-card">
          <img class="comment-avatar" :src="comment.avatar" :alt="comment.author" />
          <div class="comment-body">
            <div class="comment-top">
              <strong>{{ comment.author }}</strong>
              <small>{{ comment.time }}</small>
            </div>
            <p>{{ comment.content }}</p>
            <button type="button" @click="pending('评论点赞')">
              <Like theme="outline" size="16" fill="#9b9ea6" />
              {{ comment.likes }}
            </button>
          </div>
        </article>
      </section>
    </main>

    <div class="comment-bar">
      <button class="comment-input" type="button" @click="pending('发表评论')">说点什么吧...</button>
      <button class="send-button" type="button" @click="pending('发送评论')">发送</button>
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
  overflow: hidden;
  background: #f5f6f7;
  color: #252939;
  font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif;
}

.status-bar {
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 28px 0;
  box-sizing: border-box;
}

.time {
  color: #191b20;
  font-size: 16px;
  font-weight: 700;
}

.status-icons {
  display: flex;
  align-items: center;
  gap: 7px;
}

.signal {
  width: 18px;
  height: 13px;
  display: flex;
  align-items: flex-end;
  gap: 2px;
}

.signal i {
  width: 3px;
  border-radius: 1px;
  background: #111;
}

.signal i:nth-child(1) {
  height: 4px;
}

.signal i:nth-child(2) {
  height: 7px;
}

.signal i:nth-child(3) {
  height: 10px;
}

.signal i:nth-child(4) {
  height: 13px;
}

.wifi {
  position: relative;
  width: 18px;
  height: 13px;
  overflow: hidden;
}

.wifi::before,
.wifi::after {
  content: '';
  position: absolute;
  left: 50%;
  border: 3px solid #111;
  border-color: #111 transparent transparent;
  border-radius: 50%;
  transform: translateX(-50%);
}

.wifi::before {
  top: 0;
  width: 22px;
  height: 22px;
}

.wifi::after {
  top: 7px;
  width: 10px;
  height: 10px;
}

.battery {
  position: relative;
  width: 22px;
  height: 12px;
  border: 2px solid #111;
  border-radius: 3px;
  box-sizing: border-box;
}

.battery::before {
  content: '';
  position: absolute;
  top: 2px;
  right: -5px;
  width: 3px;
  height: 6px;
  border-radius: 0 2px 2px 0;
  background: #111;
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
.comment-card button,
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
  height: calc(100% - 100px);
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

.comment-card button {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 0;
  color: #9b9ea6;
  font-size: 12px;
  font-weight: 800;
}

.comment-bar {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  display: grid;
  grid-template-columns: 1fr 58px;
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
  color: #a0a3aa;
  font-size: 14px;
  font-weight: 700;
  text-align: left;
}

.send-button {
  height: 38px;
  border-radius: 19px;
  background: #6872f0;
  color: #fff;
  font-size: 14px;
  font-weight: 900;
}
</style>
