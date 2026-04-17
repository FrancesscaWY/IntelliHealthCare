<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Component } from 'vue'
import type { PageComponentProps } from '@ihc/page-core/types'
import { Comment, Like, Mail, MedicalFiles, Message, Remind, SpeakerOne, Star, User } from '@icon-park/vue-next'
import mock from './mock'

const props = defineProps<PageComponentProps>()
const activeTab = ref<'notice' | 'chat'>('notice')

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
  comment: Comment,
  user: User,
  like: Like,
  order: Star,
  assistant: SpeakerOne,
  mail: Mail,
  message: Message,
}

const messageList = computed(() => (activeTab.value === 'notice' ? mock.notices : mock.chats))

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

function markAllRead() {
  props.showToast('已全部标记为已读')
}

function openMessage(item: { icon: string; title: string }) {
  if (item.icon === 'comment') {
    props.navigation.navigateTo('home/message-comment-detail')
    return
  }

  if (item.icon === 'like') {
    props.navigation.navigateTo('home/message-like-detail')
    return
  }

  props.showToast(`${item.title}详情待接入`)
}
</script>

<template>
  <section class="message-page">
    <main class="message-scroll">
      <div class="status-bar">
        <span class="time">8:30</span>
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

      <header class="message-header">
        <h1>消息</h1>
        <button type="button" @click="markAllRead">全部已读</button>
      </header>

      <nav class="message-tabs" aria-label="消息分类">
        <button
          v-for="tab in mock.tabs"
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
                <stop offset="0%" stop-color="#6a74f1" />
                <stop offset="100%" stop-color="#ef6f8e" />
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

.message-scroll {
  height: 100%;
  padding: 0 22px 104px;
  box-sizing: border-box;
  overflow-y: auto;
  scrollbar-width: none;
}

.message-scroll::-webkit-scrollbar {
  display: none;
}

.message-header button,
.message-tab,
.message-card,
.tab-item {
  border: 0;
  background: transparent;
  color: inherit;
}

.status-bar {
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 8px 0;
  box-sizing: border-box;
}

.time {
  color: #2e3033;
  font-size: 18px;
  font-weight: 500;
}

.status-icons {
  display: flex;
  align-items: center;
  gap: 9px;
  color: #111;
}

.signal {
  width: 22px;
  height: 16px;
  display: flex;
  align-items: flex-end;
  gap: 3px;
}

.signal i {
  width: 4px;
  border-radius: 1px;
  background: #111;
}

.signal i:nth-child(1) {
  height: 5px;
}

.signal i:nth-child(2) {
  height: 8px;
}

.signal i:nth-child(3) {
  height: 12px;
}

.signal i:nth-child(4) {
  height: 16px;
}

.wifi {
  position: relative;
  width: 19px;
  height: 14px;
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
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  align-items: end;
  height: 74px;
  padding: 9px 12px 10px;
  background: rgba(255, 255, 255, 0.98);
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
  background: rgba(255, 255, 255, 0.98);
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
