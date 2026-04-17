<script setup lang="ts">
import { nextTick, ref } from 'vue'
import type { PageComponentProps } from '@ihc/page-core/types'
import { AddPicture, MessageEmoji, Microphone, Phone } from '@icon-park/vue-next'
import mock from './mock'

const props = defineProps<PageComponentProps>()
const draft = ref('')
const messages = ref([...mock.messages])
const showEmojiPanel = ref(false)
const scrollRef = ref<HTMLElement | null>(null)

const emojiOptions = ['😊', '👍', '🙏', '❤️', '👌', '🌿', '💪', '☀️']

function goBack() {
  if (!props.navigation.navigateBack()) {
    props.navigation.reLaunch('home/message')
  }
}

function scrollToBottom() {
  void nextTick(() => {
    if (scrollRef.value) {
      scrollRef.value.scrollTop = scrollRef.value.scrollHeight
    }
  })
}

function sendText() {
  const content = draft.value.trim()
  if (!content) {
    return
  }

  messages.value.push({
    id: Date.now(),
    from: 'me',
    type: 'text',
    content,
    time: '现在',
  })
  draft.value = ''
  showEmojiPanel.value = false
  scrollToBottom()
}

function appendEmoji(emoji: string) {
  draft.value += emoji
}

function sendImage() {
  messages.value.push({
    id: Date.now(),
    from: 'me',
    type: 'image',
    content: '已发送图片',
    time: '现在',
  })
  props.showToast('图片已添加到对话')
  scrollToBottom()
}

function sendVoice() {
  messages.value.push({
    id: Date.now(),
    from: 'me',
    type: 'voice',
    content: '语音 12"',
    time: '现在',
  })
  props.showToast('语音已发送')
  scrollToBottom()
}
</script>

<template>
  <section class="doctor-chat-page">
    <header class="chat-header">
      <button class="back-button" type="button" aria-label="返回" @click="goBack">‹</button>
      <div class="doctor-info">
        <img :src="mock.doctor.avatar" :alt="mock.doctor.name" />
        <div>
          <h1>{{ mock.doctor.name }}</h1>
          <span>{{ mock.doctor.title }} · {{ mock.doctor.status }}</span>
        </div>
      </div>
      <button class="phone-button" type="button" aria-label="电话咨询" @click="props.showToast('电话咨询功能待接入')">
        <Phone theme="outline" size="22" fill="#34383f" />
      </button>
    </header>

    <main ref="scrollRef" class="chat-scroll">
      <section class="quick-card">
        <h2>常问问题</h2>
        <div class="quick-list">
          <button v-for="question in mock.quickQuestions" :key="question" type="button" @click="draft = question">
            {{ question }}
          </button>
        </div>
      </section>

      <article
        v-for="message in messages"
        :key="message.id"
        class="message-row"
        :class="{ mine: message.from === 'me' }"
      >
        <img v-if="message.from === 'doctor'" class="bubble-avatar" :src="mock.doctor.avatar" :alt="mock.doctor.name" />
        <div class="bubble-wrap">
          <div class="bubble" :class="`bubble--${message.type}`">
            <template v-if="message.type === 'image'">
              <AddPicture theme="outline" size="24" fill="currentColor" />
              <span>{{ message.content }}</span>
            </template>
            <template v-else-if="message.type === 'voice'">
              <Microphone theme="outline" size="20" fill="currentColor" />
              <span>{{ message.content }}</span>
            </template>
            <template v-else>
              {{ message.content }}
            </template>
          </div>
          <time>{{ message.time }}</time>
        </div>
      </article>
    </main>

    <footer class="composer">
      <div v-if="showEmojiPanel" class="emoji-panel">
        <button v-for="emoji in emojiOptions" :key="emoji" type="button" @click="appendEmoji(emoji)">
          {{ emoji }}
        </button>
      </div>

      <div class="tool-row">
        <button type="button" aria-label="发送图片" @click="sendImage">
          <AddPicture theme="outline" size="21" fill="currentColor" />
        </button>
        <button type="button" aria-label="选择表情" @click="showEmojiPanel = !showEmojiPanel">
          <MessageEmoji theme="outline" size="21" fill="currentColor" />
        </button>
        <button type="button" aria-label="发送语音" @click="sendVoice">
          <Microphone theme="outline" size="21" fill="currentColor" />
        </button>
      </div>

      <form class="input-row" @submit.prevent="sendText">
        <input v-model="draft" type="text" placeholder="咨询王医生..." />
        <button type="submit">发送</button>
      </form>
    </footer>
  </section>
</template>

<style scoped>
.doctor-chat-page {
  position: relative;
  left: 50%;
  width: min(402px, 100vw);
  height: min(874px, calc(100vh - 36px));
  min-height: min(874px, calc(100vh - 36px));
  max-height: 874px;
  margin: -18px 0;
  padding-top: 16px;
  box-sizing: border-box;
  transform: translateX(-50%);
  overflow: hidden;
  background: #f5f6f7;
  color: #252939;
  font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif;
}

button,
input {
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
}

.chat-header {
  height: 58px;
  display: grid;
  grid-template-columns: 34px 1fr 36px;
  gap: 10px;
  align-items: center;
  padding: 0 18px;
  box-sizing: border-box;
  background: #f5f6f7;
}

.back-button {
  width: 32px;
  height: 38px;
  padding: 0;
  color: #34383f;
  font-size: 38px;
  font-weight: 300;
  line-height: 30px;
}

.doctor-info {
  min-width: 0;
  display: grid;
  grid-template-columns: 40px 1fr;
  gap: 10px;
  align-items: center;
}

.doctor-info img {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
}

.doctor-info h1 {
  margin: 0 0 4px;
  color: #252939;
  font-size: 17px;
  font-weight: 900;
}

.doctor-info span {
  display: block;
  overflow: hidden;
  color: #8d929b;
  font-size: 11px;
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.phone-button {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
}

.chat-scroll {
  height: calc(100% - 188px);
  padding: 12px 18px 18px;
  box-sizing: border-box;
  overflow-y: auto;
  scrollbar-width: none;
}

.chat-scroll::-webkit-scrollbar {
  display: none;
}

.quick-card {
  padding: 14px;
  margin-bottom: 16px;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 10px 28px rgba(31, 40, 58, 0.04);
}

.quick-card h2 {
  margin: 0 0 10px;
  color: #34383f;
  font-size: 15px;
  font-weight: 900;
}

.quick-list {
  display: grid;
  gap: 8px;
}

.quick-list button {
  min-height: 34px;
  padding: 0 12px;
  border-radius: 12px;
  background: #f3f4ff;
  color: #6872f0;
  font-size: 12px;
  font-weight: 900;
  text-align: left;
}

.message-row {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr);
  gap: 9px;
  align-items: end;
  margin-bottom: 14px;
}

.message-row.mine {
  grid-template-columns: minmax(0, 1fr);
  justify-items: end;
}

.bubble-avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  object-fit: cover;
}

.bubble-wrap {
  display: grid;
  gap: 5px;
  justify-items: start;
}

.mine .bubble-wrap {
  justify-items: end;
}

.bubble {
  max-width: 252px;
  padding: 11px 13px;
  border-radius: 16px 16px 16px 6px;
  background: #fff;
  color: #34383f;
  font-size: 14px;
  font-weight: 800;
  line-height: 1.55;
  box-shadow: 0 8px 22px rgba(31, 40, 58, 0.045);
}

.mine .bubble {
  border-radius: 16px 16px 6px 16px;
  background: #6872f0;
  color: #fff;
}

.bubble--image,
.bubble--voice {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.bubble-wrap time {
  color: #a5a9b2;
  font-size: 10px;
  font-weight: 800;
}

.composer {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 20;
  padding: 10px 18px 18px;
  border-top: 1px solid #eceef3;
  background: #fff;
  box-shadow: 0 -10px 24px rgba(31, 40, 58, 0.05);
}

.tool-row {
  display: flex;
  gap: 12px;
  margin-bottom: 9px;
}

.tool-row button {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border-radius: 12px;
  background: #f2f3ff;
  color: #6872f0;
}

.input-row {
  display: grid;
  grid-template-columns: 1fr 64px;
  gap: 10px;
  align-items: center;
}

.input-row input {
  height: 40px;
  padding: 0 14px;
  border-radius: 14px;
  background: #f5f6f7;
  color: #34383f;
  font-size: 14px;
  font-weight: 800;
  outline: none;
}

.input-row button {
  height: 40px;
  border-radius: 14px;
  background: #6872f0;
  color: #fff;
  font-size: 14px;
  font-weight: 900;
}

.emoji-panel {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 5px;
  padding: 8px;
  margin-bottom: 8px;
  border-radius: 14px;
  background: #f5f6f7;
}

.emoji-panel button {
  height: 28px;
  border-radius: 8px;
  background: #fff;
  font-size: 16px;
}
</style>
