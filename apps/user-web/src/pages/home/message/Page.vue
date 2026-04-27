<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { Component } from 'vue'
import type { PageComponentProps } from '@ihc/page-core/types'
import { Comment, Headset, Like, Mail, MedicalFiles, Message, Remind, SpeakerOne, Star, User } from '@icon-park/vue-next'
import {
  getMessageOverview,
  listConversations,
  listMessageNotices,
  markConversationAsRead,
  markNoticesAsRead,
  type ConversationSummary,
  type MessageOverview,
  type NoticeSummary,
} from '@/shared/api/messaging'
import mock from './mock'

const props = defineProps<PageComponentProps>()
const activeTab = ref<'notice' | 'chat'>('notice')
const overview = ref<MessageOverview | null>(null)
const notices = ref<NoticeSummary[]>([])
const conversations = ref<ConversationSummary[]>([])
const isLoading = ref(false)
const isMarkingAllRead = ref(false)

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

const iconMap: Record<string, Component> = {
  system: Remind,
  health: MedicalFiles,
  doctor: MedicalFiles,
  comment: Comment,
  user: User,
  like: Like,
  order: Star,
  assistant: SpeakerOne,
  service: Headset,
  mail: Mail,
  message: Message,
}

const tabs = computed(() => [
  {
    key: 'notice',
    label: overview.value?.unreadNoticeCount ? `通知 ${overview.value.unreadNoticeCount}` : '通知',
  },
  {
    key: 'chat',
    label: overview.value?.unreadConversationCount ? `聊天 ${overview.value.unreadConversationCount}` : '聊天',
  },
])

const messageList = computed(() => (activeTab.value === 'notice' ? notices.value : conversations.value))
const showEmptyState = computed(() => !isLoading.value && messageList.value.length === 0)

onMounted(() => {
  void loadMessageData()
})

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

async function loadMessageData() {
  isLoading.value = true

  try {
    const [overviewData, noticePage, conversationPage] = await Promise.all([
      getMessageOverview(),
      listMessageNotices({ page: 1, pageSize: 20 }),
      listConversations({ page: 1, pageSize: 20 }),
    ])

    overview.value = overviewData
    notices.value = noticePage.list
    conversations.value = conversationPage.list
  } catch (error) {
    console.error('load message data failed', error)
    props.showToast('消息加载失败')
  } finally {
    isLoading.value = false
  }
}

async function markAllRead() {
  if (activeTab.value !== 'notice' || isMarkingAllRead.value) {
    return
  }

  const unreadNoticeIds = notices.value.filter((item) => !item.isRead).map((item) => item.noticeId)
  if (!unreadNoticeIds.length) {
    props.showToast('暂无未读通知')
    return
  }

  isMarkingAllRead.value = true

  try {
    await markNoticesAsRead(unreadNoticeIds)
    notices.value = notices.value.map((item) => ({
      ...item,
      isRead: true,
      count: 0,
    }))

    if (overview.value) {
      overview.value = {
        ...overview.value,
        unreadNoticeCount: 0,
        latestNotices: overview.value.latestNotices.map((item) => ({
          ...item,
          isRead: true,
          count: 0,
        })),
      }
    }

    props.showToast('已全部标记为已读')
  } catch (error) {
    console.error('mark all notices as read failed', error)
    props.showToast('批量已读失败')
  } finally {
    isMarkingAllRead.value = false
  }
}

async function markSingleNoticeAsRead(noticeId: string) {
  const target = notices.value.find((item) => item.noticeId === noticeId)
  if (!target || target.isRead) {
    return
  }

  try {
    await markNoticesAsRead([noticeId])

    notices.value = notices.value.map((item) =>
      item.noticeId === noticeId
        ? {
            ...item,
            isRead: true,
            count: 0,
          }
        : item,
    )

    if (overview.value) {
      overview.value = {
        ...overview.value,
        unreadNoticeCount: Math.max(0, overview.value.unreadNoticeCount - 1),
        latestNotices: overview.value.latestNotices.map((item) =>
          item.noticeId === noticeId
            ? {
                ...item,
                isRead: true,
                count: 0,
              }
            : item,
        ),
      }
    }
  } catch (error) {
    console.error('mark single notice as read failed', error)
  }
}

async function markSingleConversationAsRead(conversationId: string) {
  const target = conversations.value.find((item) => item.conversationId === conversationId)
  if (!target || target.unreadCount <= 0) {
    return
  }

  try {
    await markConversationAsRead(conversationId)

    conversations.value = conversations.value.map((item) =>
      item.conversationId === conversationId
        ? {
            ...item,
            unreadCount: 0,
            count: 0,
          }
        : item,
    )

    if (overview.value) {
      overview.value = {
        ...overview.value,
        unreadConversationCount: Math.max(0, overview.value.unreadConversationCount - 1),
        latestConversations: overview.value.latestConversations.map((item) =>
          item.conversationId === conversationId
            ? {
                ...item,
                unreadCount: 0,
                count: 0,
              }
            : item,
        ),
      }
    }
  } catch (error) {
    console.error('mark single conversation as read failed', error)
  }
}

function openNoticeDetail(item: NoticeSummary) {
  if (item.type === 'COMMENT') {
    props.navigation.navigateTo('home/message-comment-detail')
    return
  }

  if (item.type === 'LIKE') {
    props.navigation.navigateTo('home/message-like-detail')
    return
  }

  props.showToast(`${item.title}详情待接入`)
}

function openConversationPage(item: ConversationSummary) {
  if (item.scene === 'DOCTOR') {
    props.navigation.navigateTo('home/doctor-chat')
    return
  }

  if (item.scene === 'CUSTOMER_SERVICE') {
    props.navigation.navigateTo('home/customer-service-chat')
    return
  }

  props.showToast(`会话场景 ${item.scene} 暂无已确认入口`)
}

async function openMessage(item: NoticeSummary | ConversationSummary) {
  if ('noticeId' in item) {
    await markSingleNoticeAsRead(item.noticeId)
    openNoticeDetail(item)
    return
  }

  await markSingleConversationAsRead(item.conversationId)
  openConversationPage(item)
}
</script>

<template>
  <section class="message-page">
    <main class="message-scroll">
      <header class="message-header">
        <h1>消息</h1>
        <button type="button" :disabled="activeTab !== 'notice' || isMarkingAllRead" @click="markAllRead">
          {{ isMarkingAllRead ? '处理中...' : '全部已读' }}
        </button>
      </header>

      <nav class="message-tabs" aria-label="消息分类">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          class="message-tab"
          :class="{ active: activeTab === tab.key }"
          type="button"
          @click="activeTab = tab.key as 'notice' | 'chat'"
        >
          {{ tab.label }}
        </button>
      </nav>

      <section class="message-list" aria-label="消息列表">
        <p v-if="isLoading && !messageList.length" class="message-state">消息加载中...</p>
        <p v-else-if="showEmptyState" class="message-state">暂无消息</p>
        <article
          v-for="item in messageList"
          :key="item.id"
          class="message-card"
          role="button"
          tabindex="0"
          @click="openMessage(item)"
          @keydown.enter="openMessage(item)"
        >
          <span class="message-icon" :class="`message-icon--${item.tone}`">
            <component :is="iconMap[item.icon]" theme="outline" size="25" fill="currentColor" />
          </span>
          <div class="message-copy">
            <h2>{{ item.title }}</h2>
            <p>{{ item.desc }}</p>
          </div>
          <div class="message-meta">
            <span v-if="item.count" class="unread-dot">{{ item.count }}</span>
            <time>{{ item.date }}</time>
          </div>
        </article>
      </section>
    </main>

    <nav class="home-tabbar" aria-label="底部导航">
      <button
        v-for="item in mock.navTabs"
        :key="item.key"
        class="tab-item"
        :class="[
          `tab-item--${item.key}`,
          { 'tab-item--active': item.key === 'message', 'tab-item--publish': item.key === 'publish' },
        ]"
        type="button"
        @click="openPage(item.pageId, item.label || '发布')"
      >
        <span v-if="item.key === 'publish'" class="tab-icon tab-icon--publish" aria-hidden="true"></span>
        <span v-else class="tab-image" :class="`tab-image--${item.key}`" aria-hidden="true">
          <svg class="tab-svg" viewBox="0 0 48 48" focusable="false">
            <defs>
              <linearGradient :id="getNavGradientId(item.key)" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#75d6df" />
                <stop offset="100%" stop-color="#7be28e" />
              </linearGradient>
            </defs>
            <g
              :fill="item.key === 'message' ? `url(#${getNavGradientId(item.key)})` : 'none'"
              :stroke="item.key === 'message' ? 'none' : 'currentColor'"
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
.message-page {
  position: relative;
  width: calc(100% + 36px);
  height: auto;
  min-height: var(--ihc-page-min-height);
  max-height: none;
  margin: -18px 0 -18px -18px;
  overflow: hidden;
  background:
    radial-gradient(circle at 12% 7%, rgba(117, 214, 223, 0.26), transparent 25%),
    radial-gradient(circle at 88% 0%, rgba(123, 226, 142, 0.2), transparent 24%),
    linear-gradient(180deg, #eef5ff 0%, #f7fbff 46%, #eef4fb 100%);
  color: #252939;
  font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif;
}

.message-scroll {
  min-height: var(--ihc-page-min-height);
  padding: 16px 22px calc(126px + env(safe-area-inset-bottom, 0px));
  box-sizing: border-box;
}

.message-header button,
.message-tab,
.message-card,
.tab-item {
  border: 0;
  background: transparent;
  color: inherit;
}

.message-state {
  margin: 0 0 12px;
  padding: 22px 14px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.8);
  color: #8f96a2;
  font-size: 14px;
  font-weight: 800;
  line-height: 1.6;
  text-align: center;
}

.message-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 13px 0 14px;
}

.message-header h1 {
  margin: 0;
  color: #34383f;
  font-size: 28px;
  font-weight: 900;
  letter-spacing: 0;
}

.message-header button {
  padding: 0;
  color: #34383f;
  font-size: 15px;
  font-weight: 800;
}

.message-tabs {
  display: flex;
  gap: 36px;
  margin-bottom: 17px;
}

.message-tab {
  position: relative;
  padding: 0 0 8px;
  color: #b7bac1;
  font-size: 18px;
  font-weight: 900;
}

.message-tab.active {
  color: #34383f;
}

.message-tab.active::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: 0;
  width: 26px;
  height: 4px;
  border-radius: 4px;
  background: #34383f;
  transform: translateX(-50%);
}

.message-list {
  display: grid;
  gap: 12px;
}

.message-card {
  position: relative;
  min-height: 88px;
  display: grid;
  grid-template-columns: 58px 1fr auto;
  gap: 14px;
  align-items: center;
  padding: 15px 16px;
  box-sizing: border-box;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 8px 22px rgba(31, 40, 58, 0.04);
  cursor: pointer;
  text-align: left;
}

.message-icon {
  width: 52px;
  height: 52px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  color: #34383f;
}

.message-icon--purple {
  background: linear-gradient(135deg, #d96ae8 0%, #b068ef 100%);
  color: #fff;
}

.message-icon--green {
  background: linear-gradient(135deg, #8de5c6 0%, #68d0b0 100%);
  color: #fff;
}

.message-icon--pink {
  background: linear-gradient(135deg, #ffd5e3 0%, #f5a9c5 100%);
}

.message-icon--yellow {
  background: linear-gradient(135deg, #fff4bd 0%, #f6df72 100%);
}

.message-icon--violet {
  background: linear-gradient(135deg, #f0eaff 0%, #d8ccff 100%);
}

.message-icon--mint {
  background: linear-gradient(135deg, #e8ffe9 0%, #c2f3c5 100%);
}

.message-copy {
  min-width: 0;
}

.message-copy h2 {
  margin: 0 0 6px;
  overflow: hidden;
  color: #34383f;
  font-size: 18px;
  font-weight: 900;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.message-copy p {
  margin: 0;
  overflow: hidden;
  color: #a4a7ae;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.45;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.message-meta {
  align-self: stretch;
  display: grid;
  justify-items: end;
  align-content: center;
  gap: 10px;
}

.unread-dot {
  min-width: 18px;
  height: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 5px;
  border-radius: 999px;
  background: #f96f71;
  color: #fff;
  font-size: 12px;
  font-weight: 900;
}

.message-meta time {
  color: #9b9ea6;
  font-size: 12px;
  font-weight: 700;
}

.home-tabbar {
  position: fixed;
  left: 50%;
  bottom: 0;
  z-index: 100;
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  align-items: end;
  width: min(402px, 100vw);
  height: calc(74px + env(safe-area-inset-bottom, 0px));
  padding: 9px 12px calc(10px + env(safe-area-inset-bottom, 0px));
  box-sizing: border-box;
  background: #fff;
  box-shadow: 0 -7px 18px rgba(40, 58, 90, 0.04);
  transform: translateX(-50%);
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
  color: #252939;
  font-size: 12px;
  transform: translateY(-6px);
}

.tab-item--active {
  color: #66cfa7;
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
  background: linear-gradient(100deg, #75d6df 0%, #7be28e 100%);
  box-shadow: 0 15px 25px rgba(89, 200, 162, 0.26);
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
