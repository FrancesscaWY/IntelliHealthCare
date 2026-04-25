<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import type { PageComponentProps } from "@ihc/page-core/types";
import { Camera, Commodity, Editor, Headset, Stethoscope } from "@icon-park/vue-next";
import { Alignment, Fit, Layout, Rive, StateMachineInputType, type StateMachineInput } from "@rive-app/canvas";
import assistantRiveUrl from "@/assets/home/sections/assistant.riv?url";

const props = defineProps<PageComponentProps>();

interface ChatMessage {
  id: number;
  type: "text" | "image" | "voice";
  content: string;
  time: string;
  imageUrl?: string;
  audioUrl?: string;
}

const STATE_MACHINE_NAME = "State Machine 1";
const BLINK_TRIGGER_NAME = "blinkTrigger";
const questionList = [
  "HPV2价、4价、9价有什么区别？",
  "防癌体检怎么选？",
  "如何定制适合自己的体检套餐？",
  "体检前需要注意哪些？",
];

const quickActions = [
  { label: "报告解读", icon: Editor },
  { label: "商品智选", icon: Commodity },
  { label: "体检定制", icon: Stethoscope },
  { label: "在线客服", icon: Headset, pageId: "home/customer-service-chat" },
];
const draft = ref("");
const messages = ref<ChatMessage[]>([]);
const showImagePanel = ref(false);
const isRecording = ref(false);
const recordingSeconds = ref(0);
const canvasRef = ref<HTMLCanvasElement | null>(null);
const scrollRef = ref<HTMLElement | null>(null);
const albumInputRef = ref<HTMLInputElement | null>(null);
const cameraInputRef = ref<HTMLInputElement | null>(null);

let riveInstance: Rive | null = null;
let blinkTrigger: StateMachineInput | null = null;
let blinkTimer: ReturnType<typeof setTimeout> | null = null;
let resizeObserver: ResizeObserver | null = null;
let mediaRecorder: MediaRecorder | null = null;
let mediaStream: MediaStream | null = null;
let audioChunks: Blob[] = [];
let recordingTimer: number | null = null;
let recordingMimeType = "audio/webm";
const mediaObjectUrls = new Set<string>();

function goBack() {
  if (!props.navigation.navigateBack()) {
    props.navigation.reLaunch("home/dashboard");
  }
}

function getBlinkDelay() {
  return Math.round(3000 + Math.random() * 3000);
}

function clearBlinkTimer() {
  if (blinkTimer) {
    clearTimeout(blinkTimer);
    blinkTimer = null;
  }
}

function bindStateMachineInputs() {
  const inputs = riveInstance?.stateMachineInputs(STATE_MACHINE_NAME) ?? [];
  blinkTrigger = inputs.find((input) => input.name === BLINK_TRIGGER_NAME && input.type === StateMachineInputType.Trigger) ?? null;
}

function triggerBlink() {
  if (!blinkTrigger) {
    bindStateMachineInputs();
  }

  blinkTrigger?.fire();
}

function scheduleBlink() {
  clearBlinkTimer();
  blinkTimer = setTimeout(() => {
    triggerBlink();
    scheduleBlink();
  }, getBlinkDelay());
}

function resizeRive() {
  riveInstance?.resizeDrawingSurfaceToCanvas();
}

function scrollToBottom() {
  void nextTick(() => {
    if (scrollRef.value) {
      scrollRef.value.scrollTop = scrollRef.value.scrollHeight;
    }
  });
}

function getCurrentTime() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

function selectQuestion(question: string) {
  draft.value = question;
}

function changeQuestions() {
  props.showToast("已为你换一批问题");
}

function useQuickAction(action: { label: string; pageId?: string }) {
  if (action.pageId) {
    props.navigation.navigateTo(action.pageId);
    return;
  }

  props.showToast(`${action.label}功能待接入`);
}

function sendMessage() {
  const content = draft.value.trim();

  if (!content) {
    props.showToast("请输入你想咨询的问题");
    return;
  }

  messages.value.push({
    id: Date.now(),
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
        type: "voice",
        content: `语音 ${formatDuration(duration)}`,
        audioUrl,
        time: getCurrentTime(),
      });
      scrollToBottom();
    };

    showImagePanel.value = false;
    mediaRecorder.start();
    isRecording.value = true;
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

onMounted(() => {
  const canvas = canvasRef.value;

  if (!canvas) {
    return;
  }

  riveInstance = new Rive({
    canvas,
    src: assistantRiveUrl,
    stateMachines: STATE_MACHINE_NAME,
    autoplay: true,
    layout: new Layout({
      fit: Fit.Contain,
      alignment: Alignment.Center,
    }),
    onLoad: () => {
      resizeRive();
      bindStateMachineInputs();
      scheduleBlink();
    },
  });

  resizeObserver = new ResizeObserver(resizeRive);
  resizeObserver.observe(canvas);
});

onBeforeUnmount(() => {
  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    mediaRecorder.stop();
  }
  stopTimer();
  stopAudioTracks();
  mediaObjectUrls.forEach((url) => URL.revokeObjectURL(url));
  mediaObjectUrls.clear();
  clearBlinkTimer();
  resizeObserver?.disconnect();
  resizeObserver = null;
  blinkTrigger = null;
  riveInstance?.cleanup();
  riveInstance = null;
});
</script>

<template>
  <section class="assistant-chat-page">
    <main ref="scrollRef" class="assistant-chat-main">
      <header class="assistant-hero">
        <button class="assistant-back" type="button" aria-label="返回" @click="goBack">
          <span aria-hidden="true"></span>
        </button>
        <canvas ref="canvasRef" class="assistant-avatar" width="180" height="140" aria-label="AI 小助手"></canvas>
        <span class="hi-badge">Hi</span>
        <div class="welcome-bubble">
          <strong>您好～我是豆沙包</strong>
          <strong>很高兴为您服务。</strong>
          <p>回复仅供参考，医学建议请询问专业医生</p>
        </div>
        <button class="more-btn" type="button" @click="props.showToast('更多功能待接入')">更多</button>
      </header>

      <section class="consult-section" aria-label="健康咨询">
        <div class="section-title">
          <span></span>
          <strong>健康咨询</strong>
          <span></span>
        </div>
        <div class="section">
        <p>
          您好！很高兴为您提供健康咨询服务。如果您在医疗健康方面有任何疑问或需求，欢迎随时与我对话。让我们携手开启健康之旅，守护您的健康每一天！
        </p>
        </div>
      </section>

      <section class="question-card">
        <h2>
          <span aria-hidden="true">?</span>
          猜你想问
        </h2>
        <div class="question-list">
          <button v-for="(item, index) in questionList" :key="item" type="button" @click="selectQuestion(item)">
            <em>{{ index + 1 }}</em>
            <strong>{{ item }}</strong>
            <i aria-hidden="true"></i>
          </button>
        </div>
        <button class="change-btn" type="button" @click="changeQuestions">
          <span aria-hidden="true"></span>
          换一换
        </button>
      </section>

      <section v-if="messages.length" class="chat-messages" aria-label="对话记录">
        <article v-for="message in messages" :key="message.id" class="chat-message">
          <div class="message-bubble" :class="`message-bubble--${message.type}`">
            <template v-if="message.type === 'image'">
              <img v-if="message.imageUrl" :src="message.imageUrl" :alt="message.content" />
              <span v-else>{{ message.content }}</span>
            </template>
            <template v-else-if="message.type === 'voice'">
              <span class="voice-message-icon" aria-hidden="true"></span>
              <strong>{{ message.content }}</strong>
              <audio v-if="message.audioUrl" :src="message.audioUrl" controls></audio>
            </template>
            <template v-else>
              {{ message.content }}
            </template>
          </div>
          <time>{{ message.time }}</time>
        </article>
      </section>
    </main>

    <footer class="chat-footer">
      <div v-if="showImagePanel" class="image-source-panel">
        <button type="button" @click="openAlbum">上传图片</button>
        <button type="button" @click="openCamera">拍照</button>
      </div>

      <div class="quick-actions">
        <button v-for="item in quickActions" :key="item.label" type="button" @click="useQuickAction(item)">
          <component :is="item.icon" theme="outline" size="16" fill="currentColor" aria-hidden="true" />
          {{ item.label }}
        </button>
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
        <input v-model="draft" type="text" placeholder="有任何健康、医学相关问题，请随时问我～" @keyup.enter="sendMessage" />
        <button class="send-btn" type="button" @click="sendMessage">发送</button>
      </div>
    </footer>

    <input ref="albumInputRef" class="media-input" type="file" accept="image/*" @change="handleImageSelected" />
    <input ref="cameraInputRef" class="media-input" type="file" accept="image/*" capture="environment" @change="handleImageSelected" />
  </section>
</template>

<style scoped>
.assistant-chat-page {
  position: relative;
  left: 50%;
  width: min(402px, 100vw);
  height: min(874px, calc(100vh - 36px));
  min-height: min(874px, calc(100vh - 36px));
  max-height: 874px;
  margin: -18px 0;
  overflow: hidden;
  background:
    radial-gradient(circle at 12% 7%, rgba(117, 214, 223, 0.26), transparent 25%),
    radial-gradient(circle at 88% 0%, rgba(123, 226, 142, 0.2), transparent 24%),
    linear-gradient(180deg, #eef5ff 0%, #f7fbff 46%, #eef4fb 100%);
  color: #1f2a44;
  font-family: var(--ihc-font-family);
  transform: translateX(-50%);
  -webkit-font-smoothing: antialiased;
}

.assistant-chat-main {
  height: calc(100% - 126px);
  padding: 8px 14px 0;
  overflow-y: auto;
  scrollbar-width: none;
}

.assistant-chat-main::-webkit-scrollbar {
  display: none;
}

.assistant-hero {
  position: relative;
  display: grid;
  grid-template-columns: 148px minmax(0, 1fr) 44px;
  align-items: start;
  min-height: 134px;
  padding-top: 8px;
}

.assistant-back,
.more-btn,
.question-list button,
.change-btn,
.quick-actions button,
.image-source-panel button,
.voice-btn,
.camera-btn,
.send-btn {
  border: 0;
  background: transparent;
  color: inherit;
  font-family: inherit;
}

.assistant-back {
  position: absolute;
  top: 10px;
  left: 0;
  z-index: 2;
  display: grid;
  place-items: center;
  width: 28px;
  height: 38px;
  padding: 0;
}

.assistant-back span {
  width: 12px;
  height: 12px;
  border-bottom: 3px solid rgba(31, 42, 68, 0.58);
  border-left: 3px solid rgba(31, 42, 68, 0.58);
  transform: rotate(45deg);
}

.assistant-avatar {
  grid-column: 1;
  display: block;
  width: 200px;
  height: 200px;
  margin: 2px 0 0 -20px;
  filter: drop-shadow(0 12px 18px rgba(50, 112, 167, 0.16));
}

.hi-badge {
  position: absolute;
  top: 50px;
  left: 110px;
  color: #95a6c0;
  font-size: 20px;
  font-weight: 900;
}

.welcome-bubble {
  grid-column: 2;
  min-height: 74px;
  margin: 24px 4px 0 0;
  padding: 12px 14px;
  border-radius: 17px;
  background: rgba(255, 255, 255, 0.78);
  box-shadow: 0 14px 32px rgba(61, 103, 152, 0.08);
}

.welcome-bubble strong {
  display: block;
  color: #25305a;
  font-size: 15px;
  font-weight: 900;
  line-height: 1.35;
}

.welcome-bubble p {
  margin: 8px 0 0;
  color: rgba(90, 102, 126, 0.58);
  font-size: 13px;
  font-weight: 800;
  line-height: 1.35;
}

.more-btn {
  grid-column: 3;
  justify-self: end;
  margin-top: 5px;
  padding: 0;
  color: #2d344b;
  font-size: 15px;
  font-weight: 900;
}

.section-title {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 10px;
  align-items: center;
  margin: 0 12px 5px;
}

.section-title span {
  height: 1px;
  background: rgba(84, 101, 134, 0.24);
}

.section-title strong {
  color: #1f2a44;
  font-size: 17px;
  font-weight: 900;
  letter-spacing: 0.08em;
}

.section p{
  font-size: 17px;
}

.consult-section {
  margin-top: -58px;
}

.consult-section p {
  margin: 0;
  padding: 0 0 0 2px;
  color: rgba(45, 55, 79, 0.68);
  font-size: 15px;
  font-weight: 800;
  line-height: 1.75;
  text-align: justify;
}

.question-card {
  position: relative;
  margin-top: 12px;
  padding: 14px 14px 54px;
  border-radius: 6px;
  background:
    radial-gradient(circle at 14% 0%, rgba(117, 214, 223, 0.28), transparent 28%),
    radial-gradient(circle at 86% 4%, rgba(190, 45, 234, 0.14), transparent 30%),
    rgba(255, 255, 255, 0.62);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.7);
}

.question-card h2 {
  display: flex;
  align-items: center;
  gap: 7px;
  margin: 0 0 12px;
  color: #4f92d5;
  font-size: 19px;
  font-weight: 900;
  font-style: italic;
}

.question-card h2 span {
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #65aeea;
  color: #ffffff;
  font-size: 15px;
  font-style: normal;
}

.question-list {
  display: grid;
  gap: 8px;
}

.question-list button {
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr) 18px;
  align-items: center;
  min-height: 40px;
  padding: 0 12px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 10px 18px rgba(76, 108, 151, 0.08);
  text-align: left;
}

.question-list em {
  color: #3a8ed5;
  font-size: 15px;
  font-style: normal;
  font-weight: 900;
}

.question-list strong {
  overflow: hidden;
  color: #3f4b63;
  font-size: 14px;
  font-weight: 900;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.question-list i {
  width: 7px;
  height: 7px;
  border-top: 2px solid rgba(64, 80, 111, 0.22);
  border-right: 2px solid rgba(64, 80, 111, 0.22);
  transform: rotate(45deg);
}

.change-btn {
  position: absolute;
  right: 18px;
  bottom: 15px;
  display: flex;
  align-items: center;
  gap: 7px;
  height: 34px;
  padding: 0 16px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.88);
  color: #64718b;
  font-size: 13px;
  font-weight: 900;
  box-shadow: 0 10px 18px rgba(76, 108, 151, 0.08);
}

.change-btn span,
.voice-btn span {
  position: relative;
  display: inline-block;
}

.change-btn span {
  width: 13px;
  height: 13px;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: 50%;
}

.chat-footer {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  padding: 0 16px 14px;
}

.chat-messages {
  display: grid;
  gap: 12px;
  margin: 14px 0 20px;
}

.chat-message {
  display: grid;
  justify-items: end;
  gap: 5px;
}

.message-bubble {
  max-width: 270px;
  padding: 11px 13px;
  border-radius: 16px 16px 6px 16px;
  background: linear-gradient(100deg, #75d6df 0%, #7be28e 100%);
  color: #ffffff;
  font-size: 14px;
  font-weight: 900;
  line-height: 1.55;
  box-shadow: 0 10px 22px rgba(78, 169, 171, 0.16);
}

.message-bubble--image {
  padding: 6px;
  background: rgba(255, 255, 255, 0.9);
}

.message-bubble--image img {
  display: block;
  width: 184px;
  max-height: 190px;
  border-radius: 13px;
  object-fit: cover;
}

.message-bubble--voice {
  display: grid;
  grid-template-columns: 22px minmax(0, 1fr);
  gap: 8px;
  align-items: center;
  min-width: 198px;
  background: rgba(255, 255, 255, 0.92);
  color: #364055;
}

.voice-message-icon {
  position: relative;
  width: 22px;
  height: 22px;
  border: 2px solid #75a7f7;
  border-radius: 50%;
}

.voice-message-icon::before,
.voice-message-icon::after {
  position: absolute;
  top: 5px;
  width: 2px;
  height: 8px;
  border-radius: 999px;
  background: #75a7f7;
  content: "";
}

.voice-message-icon::before {
  left: 7px;
}

.voice-message-icon::after {
  left: 12px;
}

.message-bubble--voice audio {
  grid-column: 1 / -1;
  width: 100%;
  height: 30px;
}

.chat-message time {
  color: rgba(90, 102, 126, 0.58);
  font-size: 10px;
  font-weight: 800;
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

.quick-actions {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin-bottom: 12px;
}

.quick-actions button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  height: 34px;
  border-radius: 5px;
  background: rgba(255, 255, 255, 0.8);
  box-shadow: 0 8px 18px rgba(52, 87, 126, 0.06);
  color: #364055;
  font-size: 12px;
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

.quick-actions :deep(.i-icon),
.camera-btn :deep(.i-icon) {
  display: block;
  flex: 0 0 auto;
}

.message-bar input {
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: #2d344b;
  font-size: 13px;
  font-weight: 800;
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
