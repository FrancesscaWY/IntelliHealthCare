<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref } from "vue";
import type { PageComponentProps } from "@ihc/page-core/types";
import { AddPicture, Camera, Headset, Microphone, Phone } from "@icon-park/vue-next";
import mock from "./mock";

interface ChatMessage {
  id: number;
  from: "service" | "me";
  type: "text" | "image" | "voice";
  content: string;
  time: string;
  imageUrl?: string;
  audioUrl?: string;
}

const props = defineProps<PageComponentProps>();
const draft = ref("");
const messages = ref<ChatMessage[]>(mock.messages as ChatMessage[]);
const showImagePanel = ref(false);
const isRecording = ref(false);
const recordingSeconds = ref(0);
const scrollRef = ref<HTMLElement | null>(null);
const albumInputRef = ref<HTMLInputElement | null>(null);
const cameraInputRef = ref<HTMLInputElement | null>(null);

let mediaRecorder: MediaRecorder | null = null;
let mediaStream: MediaStream | null = null;
let audioChunks: Blob[] = [];
let recordingTimer: number | null = null;
let recordingMimeType = "audio/webm";
const mediaObjectUrls = new Set<string>();

function goBack() {
  if (!props.navigation.navigateBack()) {
    props.navigation.reLaunch("home/message");
  }
}

function scrollToBottom() {
  void nextTick(() => {
    if (scrollRef.value) {
      scrollRef.value.scrollTop = scrollRef.value.scrollHeight;
    }
  });
}

function fillDraft(question: string) {
  draft.value = question;
}

function getCurrentTime() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

function sendText() {
  const content = draft.value.trim();

  if (!content) {
    props.showToast("请输入您想咨询的问题");
    return;
  }

  messages.value.push({
    id: Date.now(),
    from: "me",
    type: "text",
    content,
    time: getCurrentTime(),
  });
  draft.value = "";
  scrollToBottom();
}

function openAlbum() {
  showImagePanel.value = false;
  albumInputRef.value?.click();
}

function openCamera() {
  showImagePanel.value = false;
  cameraInputRef.value?.click();
}

function handleImageSelected(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];

  if (!file) {
    return;
  }

  const imageUrl = URL.createObjectURL(file);
  mediaObjectUrls.add(imageUrl);
  messages.value.push({
    id: Date.now(),
    from: "me",
    type: "image",
    content: file.name || "图片",
    imageUrl,
    time: getCurrentTime(),
  });
  input.value = "";
  scrollToBottom();
}

function formatDuration(seconds: number) {
  return `${Math.max(1, seconds)}"`;
}

function startTimer() {
  recordingSeconds.value = 0;
  recordingTimer = window.setInterval(() => {
    recordingSeconds.value += 1;
  }, 1000);
}

function stopTimer() {
  if (recordingTimer !== null) {
    window.clearInterval(recordingTimer);
    recordingTimer = null;
  }
}

function stopAudioTracks() {
  mediaStream?.getTracks().forEach((track) => track.stop());
  mediaStream = null;
}

async function startVoiceRecording() {
  if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
    props.showToast("当前浏览器不支持录音");
    return;
  }

  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioChunks = [];
    mediaRecorder = new MediaRecorder(mediaStream);
    recordingMimeType = mediaRecorder.mimeType || "audio/webm";

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunks.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      const duration = recordingSeconds.value;
      stopTimer();
      stopAudioTracks();
      isRecording.value = false;

      if (!audioChunks.length) {
        return;
      }

      const audioBlob = new Blob(audioChunks, { type: recordingMimeType });
      const audioUrl = URL.createObjectURL(audioBlob);
      mediaObjectUrls.add(audioUrl);
      messages.value.push({
        id: Date.now(),
        from: "me",
        type: "voice",
        content: `语音 ${formatDuration(duration)}`,
        audioUrl,
        time: getCurrentTime(),
      });
      scrollToBottom();
    };

    mediaRecorder.start();
    isRecording.value = true;
    showImagePanel.value = false;
    startTimer();
  } catch (error) {
    stopTimer();
    stopAudioTracks();
    isRecording.value = false;
    props.showToast("无法访问麦克风，请检查权限");
  }
}

function stopVoiceRecording() {
  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    mediaRecorder.stop();
    return;
  }

  stopTimer();
  stopAudioTracks();
  isRecording.value = false;
}

function toggleVoiceRecording() {
  if (isRecording.value) {
    stopVoiceRecording();
    return;
  }

  void startVoiceRecording();
}

onBeforeUnmount(() => {
  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    mediaRecorder.stop();
  }

  stopTimer();
  stopAudioTracks();
  mediaObjectUrls.forEach((url) => URL.revokeObjectURL(url));
  mediaObjectUrls.clear();
});
</script>

<template>
  <section class="service-chat-page">
    <header class="chat-header">
      <button class="back-button" type="button" aria-label="返回" @click="goBack">‹</button>
      <div class="service-info">
        <img :src="mock.service.avatar" :alt="mock.service.name" />
        <div>
          <h1>{{ mock.service.name }}</h1>
          <span>{{ mock.service.title }} · {{ mock.service.status }}</span>
        </div>
      </div>
      <button class="phone-button" type="button" aria-label="电话客服" @click="props.showToast('电话客服功能待接入')">
        <Phone theme="outline" size="22" fill="#2c4159" />
      </button>
    </header>

    <main ref="scrollRef" class="chat-scroll">
      <section class="service-summary">
        <div class="summary-badge">
          <Headset theme="outline" size="16" fill="currentColor" />
          人工客服
        </div>
        <strong>订单安排、报告服务可以在这里处理</strong>
        <p>如果您已经在和 AI 助手沟通，也可以继续在这里由人工客服跟进。</p>

        <div class="tip-grid">
          <article v-for="item in mock.serviceTips" :key="item.label" class="tip-card">
            <span>{{ item.label }}</span>
            <strong>{{ item.value }}</strong>
          </article>
        </div>
      </section>

      <section class="quick-card">
        <h2>常见咨询</h2>
        <div class="quick-list">
          <button v-for="question in mock.quickQuestions" :key="question" type="button" @click="fillDraft(question)">
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
        <img v-if="message.from === 'service'" class="bubble-avatar" :src="mock.service.avatar" :alt="mock.service.name" />
        <div class="bubble-wrap">
          <div class="bubble" :class="`bubble--${message.type}`">
            <template v-if="message.type === 'image'">
              <img v-if="message.imageUrl" class="chat-image" :src="message.imageUrl" :alt="message.content" />
              <template v-else>
                <AddPicture theme="outline" size="24" fill="currentColor" />
                <span>{{ message.content }}</span>
              </template>
            </template>
            <template v-else-if="message.type === 'voice'">
              <Microphone theme="outline" size="20" fill="currentColor" />
              <span>{{ message.content }}</span>
              <audio v-if="message.audioUrl" class="voice-player" :src="message.audioUrl" controls></audio>
            </template>
            <template v-else>
              {{ message.content }}
            </template>
          </div>
          <time>{{ message.time }}</time>
        </div>
      </article>
    </main>

    <footer class="chat-footer">
      <div v-if="showImagePanel" class="image-source-panel">
        <button type="button" @click="openAlbum">上传图片</button>
        <button type="button" @click="openCamera">拍照</button>
      </div>

      <div class="message-bar">
        <button
          class="voice-btn"
          :class="{ recording: isRecording }"
          type="button"
          :aria-label="isRecording ? '停止录音并发送' : '语音输入'"
          @click="toggleVoiceRecording"
        >
          <span aria-hidden="true"></span>
          <em v-if="isRecording">{{ recordingSeconds }}s</em>
        </button>
        <button
          class="camera-btn"
          :class="{ active: showImagePanel }"
          type="button"
          aria-label="拍照或上传图片"
          @click="showImagePanel = !showImagePanel"
        >
          <Camera theme="outline" size="23" fill="currentColor" aria-hidden="true" />
        </button>
        <input v-model="draft" type="text" placeholder="请输入您想咨询的订单或服务问题..." @keyup.enter="sendText" />
        <button class="send-btn" type="button" @click="sendText">发送</button>
      </div>
    </footer>

    <input ref="albumInputRef" class="media-input" type="file" accept="image/*" @change="handleImageSelected" />
    <input ref="cameraInputRef" class="media-input" type="file" accept="image/*" capture="environment" @change="handleImageSelected" />
  </section>
</template>

<style scoped>
.service-chat-page {
  position: relative;
  left: 50%;
  width: min(402px, 100vw);
  height: auto;
  min-height: var(--ihc-page-min-height);
  max-height: none;
  margin: -18px 0;
  padding-top: 14px;
  box-sizing: border-box;
  transform: translateX(-50%);
  overflow: hidden;
  background:
    radial-gradient(circle at 12% 7%, rgba(117, 214, 223, 0.26), transparent 25%),
    radial-gradient(circle at 88% 0%, rgba(123, 226, 142, 0.2), transparent 24%),
    linear-gradient(180deg, #eef5ff 0%, #f7fbff 46%, #eef4fb 100%);
  color: #252939;
  font-family: var(--ihc-font-family);
  -webkit-font-smoothing: antialiased;
}

button,
input {
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
}

.chat-header {
  display: grid;
  grid-template-columns: 34px 1fr 36px;
  gap: 10px;
  align-items: center;
  padding: 0 18px;
  box-sizing: border-box;
}

.back-button {
  width: 32px;
  height: 38px;
  padding: 0;
  color: #2c4159;
  font-size: 38px;
  font-weight: 300;
  line-height: 30px;
}

.service-info {
  min-width: 0;
  display: grid;
  grid-template-columns: 42px 1fr;
  gap: 10px;
  align-items: center;
  padding: 10px 12px;
  border-radius: 18px;
}

.service-info img {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  object-fit: cover;
}

.service-info h1 {
  margin: 0 0 4px;
  color: #25305a;
  font-size: 17px;
  font-weight: 900;
}

.service-info span {
  display: block;
  overflow: hidden;
  color: rgba(78, 91, 117, 0.72);
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
  height: calc(100% - 182px);
  padding: 14px 18px 18px;
  box-sizing: border-box;
  overflow-y: auto;
  scrollbar-width: none;
}

.chat-scroll::-webkit-scrollbar {
  display: none;
}

.service-summary {
  margin-bottom: 16px;
  padding: 16px;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.7);
  box-shadow: 0 16px 34px rgba(61, 103, 152, 0.08);
}

.summary-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  padding: 0 12px;
  border-radius: 999px;
  background: rgba(117, 214, 223, 0.18);
  color: #1b8f9a;
  font-size: 12px;
  font-weight: 900;
}

.summary-badge :deep(.i-icon) {
  display: block;
}

.service-summary > strong {
  display: block;
  margin-top: 12px;
  color: #25305a;
  font-size: 18px;
  font-weight: 900;
  line-height: 1.45;
}

.service-summary > p {
  margin: 8px 0 0;
  color: rgba(78, 91, 117, 0.72);
  font-size: 13px;
  font-weight: 800;
  line-height: 1.65;
}

.tip-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-top: 14px;
}

.tip-card {
  min-width: 0;
  padding: 12px 10px;
  border-radius: 16px;
  background: rgba(247, 252, 255, 0.9);
  box-shadow: inset 0 0 0 1px rgba(117, 214, 223, 0.12);
}

.tip-card span {
  display: block;
  color: rgba(78, 91, 117, 0.68);
  font-size: 11px;
  font-weight: 800;
}

.tip-card strong {
  display: block;
  margin-top: 6px;
  color: #25305a;
  font-size: 13px;
  font-weight: 900;
  line-height: 1.45;
}

.quick-card {
  margin-bottom: 16px;
  padding: 14px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.82);
  box-shadow: 0 12px 24px rgba(31, 40, 58, 0.05);
}

.quick-card h2 {
  margin: 0 0 10px;
  color: #25305a;
  font-size: 15px;
  font-weight: 900;
}

.quick-list {
  display: grid;
  gap: 8px;
}

.quick-list button {
  min-height: 36px;
  padding: 0 12px;
  border-radius: 12px;
  background: #f2fbff;
  color: #2d6f94;
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
  box-shadow: 0 8px 18px rgba(58, 100, 142, 0.16);
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
  background: rgba(255, 255, 255, 0.92);
  color: #2d344b;
  font-size: 14px;
  font-weight: 800;
  line-height: 1.55;
  box-shadow: 0 10px 22px rgba(31, 40, 58, 0.05);
}

.mine .bubble {
  border-radius: 16px 16px 6px 16px;
  background: linear-gradient(100deg, #75d6df 0%, #7be28e 100%);
  color: #ffffff;
}

.bubble--image,
.bubble--voice {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.bubble--image {
  padding: 6px;
}

.chat-image {
  width: 170px;
  max-height: 180px;
  display: block;
  border-radius: 12px;
  object-fit: cover;
}

.bubble--voice {
  flex-wrap: wrap;
  min-width: 170px;
}

.voice-player {
  width: 100%;
  height: 32px;
  margin-top: 4px;
}

.bubble-wrap time {
  color: rgba(90, 102, 126, 0.6);
  font-size: 10px;
  font-weight: 800;
}

.chat-footer {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  padding: 0 16px 14px;
}

.image-source-panel {
  position: absolute;
  right: 90px;
  bottom: 72px;
  z-index: 2;
  display: grid;
  gap: 8px;
  width: 104px;
  padding: 10px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 16px 36px rgba(61, 103, 152, 0.16);
}

.image-source-panel button {
  height: 32px;
  border-radius: 10px;
  background: #f2fbff;
  color: #364055;
  font-size: 13px;
  font-weight: 900;
}

.message-bar {
  display: grid;
  grid-template-columns: 36px 36px minmax(0, 1fr) 67px;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 4px 5px 4px 6px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 10px 28px rgba(61, 103, 152, 0.1);
}

.voice-btn {
  position: relative;
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  padding: 0;
}

.voice-btn.recording {
  color: #ffffff;
}

.voice-btn.recording span {
  border-color: #75d6df;
  background: #75d6df;
}

.voice-btn.recording span::before,
.voice-btn.recording span::after {
  background: #ffffff;
}

.voice-btn em {
  position: absolute;
  top: -14px;
  left: 50%;
  color: #2d90f0;
  font-size: 10px;
  font-style: normal;
  font-weight: 900;
  transform: translateX(-50%);
}

.voice-btn span {
  position: relative;
  display: inline-block;
  width: 24px;
  height: 24px;
  border: 2px solid #596575;
  border-radius: 50%;
}

.voice-btn span::before,
.voice-btn span::after {
  position: absolute;
  top: 6px;
  width: 2px;
  height: 8px;
  border-radius: 999px;
  background: #596575;
  content: "";
}

.voice-btn span::before {
  left: 8px;
}

.voice-btn span::after {
  left: 13px;
}

.camera-btn {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  padding: 0;
  color: #596575;
}

.camera-btn.active {
  color: #2d90f0;
}

.camera-btn :deep(.i-icon) {
  display: block;
  flex: 0 0 auto;
}

.message-bar input {
  min-width: 0;
  border: 0;
  background: transparent;
  color: #2d344b;
  font-size: 13px;
  font-weight: 800;
  outline: 0;
}

.message-bar input::placeholder {
  color: rgba(92, 104, 126, 0.42);
  opacity: 1;
}

.send-btn {
  height: 36px;
  border-radius: 999px;
  background: linear-gradient(100deg, #75d6df 0%, #7be28e 100%);
  color: #ffffff;
  font-size: 15px;
  font-weight: 900;
}

.media-input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}
</style>
