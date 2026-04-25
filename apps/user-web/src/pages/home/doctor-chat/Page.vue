<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref } from "vue";
import type { PageComponentProps } from "@ihc/page-core/types";
import { AddPicture, MessageEmoji, Microphone, Phone } from "@icon-park/vue-next";
import { uploadAppFile } from "@/shared/api/files";
import mock from "./mock";

interface ChatMessage {
  id: number;
  from: "doctor" | "me";
  type: "text" | "image" | "voice";
  content: string;
  time: string;
  imageUrl?: string;
  audioUrl?: string;
}

const props = defineProps<PageComponentProps>();
const draft = ref("");
const messages = ref<ChatMessage[]>(mock.messages as ChatMessage[]);
const showEmojiPanel = ref(false);
const showImagePanel = ref(false);
const isRecording = ref(false);
const isUploadingImage = ref(false);
const recordingSeconds = ref(0);
const scrollRef = ref<HTMLElement | null>(null);
const albumInputRef = ref<HTMLInputElement | null>(null);
const cameraInputRef = ref<HTMLInputElement | null>(null);

let mediaRecorder: MediaRecorder | null = null;
let mediaStream: MediaStream | null = null;
let audioChunks: Blob[] = [];
let recordingTimer: number | null = null;
let recordingMimeType = "audio/webm";

const emojiOptions = ["😉", "🙏", "😊", "❤️", "👍", "🌶", "🤝", "☀️"];

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

function sendText() {
  const content = draft.value.trim();
  if (!content) {
    return;
  }

  messages.value.push({
    id: Date.now(),
    from: "me",
    type: "text",
    content,
    time: "现在"
  });
  draft.value = "";
  showEmojiPanel.value = false;
  scrollToBottom();
}

function appendEmoji(emoji: string) {
  draft.value += emoji;
}

function getCurrentTime() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

function openAlbum() {
  showImagePanel.value = false;
  albumInputRef.value?.click();
}

function openCamera() {
  showImagePanel.value = false;
  cameraInputRef.value?.click();
}

async function handleImageSelected(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];

  if (!file) {
    return;
  }

  isUploadingImage.value = true;

  try {
    const uploaded = await uploadAppFile("CHAT_IMAGE", file, {
      sourcePage: "home/doctor-chat"
    });

    messages.value.push({
      id: Date.now(),
      from: "me",
      type: "image",
      content: file.name || "咨询图片",
      imageUrl: uploaded.url,
      time: getCurrentTime()
    });
    props.showToast("图片已发送");
    scrollToBottom();
  } catch (error) {
    props.showToast(error instanceof Error ? error.message : "图片发送失败");
  } finally {
    isUploadingImage.value = false;
    input.value = "";
  }
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
      messages.value.push({
        id: Date.now(),
        from: "me",
        type: "voice",
        content: `语音 ${formatDuration(duration)}`,
        audioUrl,
        time: getCurrentTime()
      });
      scrollToBottom();
    };

    mediaRecorder.start();
    isRecording.value = true;
    startTimer();
  } catch {
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
});
</script>

<template>
  <section class="doctor-chat-page">
    <header class="chat-header">
      <button class="back-button" type="button" aria-label="返回" @click="goBack">‹</button>
      <div class="doctor-info">
        <img :src="mock.doctor.avatar" :alt="mock.doctor.name" />
        <div>
          <h1>{{ mock.doctor.name }}</h1>
          <span>{{ mock.doctor.title }} / {{ mock.doctor.status }}</span>
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

    <footer class="composer">
      <div v-if="showImagePanel" class="image-source-panel">
        <button type="button" @click="openAlbum">本地相册</button>
        <button type="button" @click="openCamera">实时拍照</button>
      </div>

      <div v-if="showEmojiPanel" class="emoji-panel">
        <button v-for="emoji in emojiOptions" :key="emoji" type="button" @click="appendEmoji(emoji)">
          {{ emoji }}
        </button>
      </div>

      <div class="tool-row">
        <button type="button" aria-label="发送图片" @click="showImagePanel = !showImagePanel">
          <AddPicture theme="outline" size="21" fill="currentColor" />
        </button>
        <button type="button" aria-label="选择表情" @click="showEmojiPanel = !showEmojiPanel">
          <MessageEmoji theme="outline" size="21" fill="currentColor" />
        </button>
        <button
          type="button"
          class="voice-button"
          :class="{ recording: isRecording }"
          :aria-label="isRecording ? '停止录音' : '开始录音'"
          @click="toggleVoiceRecording"
        >
          <Microphone theme="outline" size="21" fill="currentColor" />
          <span v-if="isRecording">{{ recordingSeconds }}s</span>
        </button>
      </div>

      <form class="input-row" @submit.prevent="sendText">
        <input v-model="draft" type="text" :placeholder="isUploadingImage ? '图片上传中...' : '咨询王医生...'" />
        <button type="submit">发送</button>
      </form>
    </footer>

    <input ref="albumInputRef" class="media-input" type="file" accept="image/*" @change="handleImageSelected" />
    <input ref="cameraInputRef" class="media-input" type="file" accept="image/*" capture="environment" @change="handleImageSelected" />
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
  font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif;
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
  min-width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border-radius: 12px;
  background: #f2f3ff;
  color: #6872f0;
}

.tool-row .voice-button {
  grid-auto-flow: column;
  gap: 4px;
  padding: 0 9px;
}

.tool-row .voice-button.recording {
  background: #ffe8ec;
  color: #f45d76;
}

.voice-button span {
  font-size: 11px;
  font-weight: 900;
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

.image-source-panel {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  padding: 8px;
  margin-bottom: 8px;
  border-radius: 14px;
  background: #f5f6f7;
}

.image-source-panel button {
  height: 34px;
  border-radius: 10px;
  background: #fff;
  color: #6872f0;
  font-size: 13px;
  font-weight: 900;
}

.emoji-panel button {
  height: 28px;
  border-radius: 8px;
  background: #fff;
  font-size: 16px;
}

.media-input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}
</style>
