<script setup lang="ts">
import { computed, ref } from "vue";
import type { PageComponentProps } from "@ihc/page-core/types";
import BottomTabBar from "@/components/BottomTabBar.vue";
import mock from "./mock";

const props = defineProps<PageComponentProps>();
const activeFeedTab = ref<"hot" | "follow">("hot");
const currentPosts = computed(() => mock.posts[activeFeedTab.value]);

function showPendingMessage(label: string) {
  props.showToast(`${label}功能待接入`);
}

function openActivity(title: string) {
  props.showToast(`${title} 详情待接入`);
}
</script>

<template>
  <section class="circle-page">
    <article class="circle-header">
      <div>
        <p class="page-eyebrow">Community</p>
        <h1>生活圈</h1>
        <p>看看社区活动、热门动态和邻里分享，和更多长者保持连接。</p>
      </div>
      <button class="circle-headset" type="button" @click="showPendingMessage('客服')">客服</button>
    </article>

    <section class="circle-banners">
      <div class="circle-banner-list">
        <article v-for="item in mock.banners" :key="item.key" class="circle-banner">
          <p class="page-eyebrow">{{ item.subtitle }}</p>
          <strong>{{ item.title }}</strong>
        </article>
      </div>
    </section>

    <section class="circle-section">
      <div class="circle-header">
        <div>
          <p class="page-eyebrow">Activities</p>
          <h2>热门活动</h2>
        </div>
        <button class="command-chip" type="button" @click="props.navigation.navigateTo('community/senior-activities')">更多活动</button>
      </div>
      <div class="circle-activity-list">
        <button v-for="item in mock.activities" :key="item.title" class="circle-activity" type="button" @click="openActivity(item.title)">
          <strong>{{ item.title }}</strong>
          <span>{{ item.count }}</span>
        </button>
      </div>
    </section>

    <section class="circle-tabs">
      <button type="button" :class="{ 'is-active': activeFeedTab === 'hot' }" @click="activeFeedTab = 'hot'">热门</button>
      <button type="button" :class="{ 'is-active': activeFeedTab === 'follow' }" @click="activeFeedTab = 'follow'">关注</button>
    </section>

    <section class="circle-section">
      <div class="circle-post-list">
        <article v-for="post in currentPosts" :key="`${post.author}-${post.date}`" class="circle-post">
          <div class="circle-post__meta">
            <strong>{{ post.author }}</strong>
            <span>{{ post.date }}</span>
          </div>
          <p>{{ post.content }}</p>
          <div class="circle-post__actions">
            <button type="button" @click="showPendingMessage('点赞')">点赞 {{ post.likes }}</button>
            <button type="button" @click="showPendingMessage('评论')">评论 {{ post.comments }}</button>
            <button type="button" @click="showPendingMessage('分享')">分享</button>
          </div>
        </article>
      </div>
    </section>

    <BottomTabBar active-key="circle" @navigate="props.navigation.reLaunch" @pending="props.showToast" />
  </section>
</template>

<style scoped>
.circle-page {
  display: grid;
  gap: 18px;
}

.circle-header,
.circle-banners,
.circle-section,
.circle-tabs {
  padding: 18px;
  border-radius: 26px;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 18px 42px rgba(34, 67, 118, 0.1);
}

.circle-header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
}

.circle-header h1,
.circle-section h2 {
  margin: 6px 0 0;
}

.circle-header p,
.circle-section p {
  margin: 0;
  color: #607089;
}

.circle-headset {
  width: 48px;
  height: 48px;
  border: 0;
  border-radius: 18px;
  background: rgba(36, 87, 245, 0.08);
  color: #2457f5;
  font-weight: 800;
}

.circle-banner-list,
.circle-activity-list,
.circle-post-list {
  display: grid;
  gap: 12px;
}

.circle-banner {
  padding: 18px;
  border-radius: 22px;
  background: linear-gradient(135deg, rgba(36, 87, 245, 0.16), rgba(255, 123, 97, 0.16));
}

.circle-banner strong,
.circle-activity strong,
.circle-post strong {
  display: block;
}

.circle-activity {
  padding: 16px;
  border-radius: 20px;
  border: 0;
  text-align: left;
  background: #f8fbff;
}

.circle-tabs {
  display: flex;
  gap: 12px;
}

.circle-tabs button {
  flex: 1;
  padding: 12px 14px;
  border-radius: 999px;
  border: 0;
  background: #edf3ff;
  color: #5c6f91;
  font-weight: 700;
}

.circle-tabs button.is-active {
  background: linear-gradient(135deg, #2457f5, #4f84ff);
  color: #fff;
}

.circle-post {
  padding: 16px;
  border-radius: 20px;
  background: #f9fbff;
}

.circle-post__meta {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
  color: #667790;
  font-size: 13px;
}

.circle-post__actions {
  display: flex;
  gap: 10px;
  margin-top: 12px;
  flex-wrap: wrap;
}

.circle-post__actions button {
  border: 0;
  border-radius: 999px;
  padding: 8px 12px;
  background: rgba(36, 87, 245, 0.08);
  color: #2457f5;
}
</style>
