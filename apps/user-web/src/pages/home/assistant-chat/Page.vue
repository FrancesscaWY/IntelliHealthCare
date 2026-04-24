<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import type { PageComponentProps } from "@ihc/page-core/types";
import {
  AddOne,
  Camera,
  Commodity,
  Down,
  Editor,
  History,
  Refresh,
  Stethoscope,
  Up
} from "@icon-park/vue-next";
import AiConversationHistorySheet from "@/shared/ai/components/AiConversationHistorySheet.vue";
import type { AssistantConversationMessage } from "@/shared/api/ai";
import {
  createAssistantConversation,
  getAssistantConversation,
  listAssistantMessages,
  sendAssistantMessage
} from "@/shared/api/ai";
import { uploadUserFile } from "@/shared/api/files";
import {
  BrowserVoiceRecorder,
  speakText,
  stopSpeaking,
  type VoiceCaptureResult
} from "@/shared/ai/voice";
import {
  activeAssistantConversationId,
  aiReportAnalysisState,
  aiServiceRecommendationState,
  assistantConversationHistory,
  consumeAssistantEntryIntent,
  rememberAssistantConversation,
  selectedAiReportId,
  setActiveAssistantConversation
} from "@/shared/ai/state";

const props = defineProps<PageComponentProps>();

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  type: "text" | "image" | "voice";
  content: string;
  time: string;
  imageUrl?: string;
  audioUrl?: string;
  audioDurationSeconds?: number | null;
  transcript?: string | null;
}

const DEFAULT_ASSISTANT_TOPIC = "豆沙包健康咨询";
const DEFAULT_ASSISTANT_WELCOME = "您好，我是豆沙包。";
const questionGroups = [
  [
    "HPV2价、4价、9价有什么区别？",
    "防癌体检怎么选？",
    "如何定制适合自己的体检套餐？",
    "体检前需要注意哪些？"
  ],
  [
    "最近血压偏高，饮食上要注意什么？",
    "空腹血糖高一点，需要马上去医院吗？",
    "老年人上门康复服务怎么选？",
    "慢病随访体检前要准备哪些资料？"
  ]
] as const;

const quickActions = [
  { label: "报告解读", icon: Editor },
  { label: "商品智选", icon: Commodity },
  { label: "体检定制", icon: Stethoscope }
];
const initialEntryIntent = consumeAssistantEntryIntent();
function getLatestHistoryConversationId() {
  const latestEntry = Array.isArray(assistantConversationHistory.value)
    ? assistantConversationHistory.value[0]
    : null;

  return latestEntry?.conversationId || "";
}

const draft = ref("");
const messages = ref<ChatMessage[]>([]);
const showImagePanel = ref(false);
const isRecording = ref(false);
const recordingSeconds = ref(0);
const voiceEntryHint = ref("");
const currentConversationId = ref(
  activeAssistantConversationId.value || getLatestHistoryConversationId()
);
const currentConversationTopic = ref(DEFAULT_ASSISTANT_TOPIC);
const questionGroupIndex = ref(0);
const isQuestionCardCollapsed = ref(true);
const isConversationHistoryOpen = ref(false);
const isConversationLoading = ref(false);
const isSending = ref(false);
const scrollRef = ref<HTMLElement | null>(null);
const albumInputRef = ref<HTMLInputElement | null>(null);
const cameraInputRef = ref<HTMLInputElement | null>(null);
const questionList = computed(
  () => questionGroups[questionGroupIndex.value % questionGroups.length]
);
const latestAiServiceContext = computed(() => {
  const scenes = Object.values(aiServiceRecommendationState.value).filter(
    (item): item is NonNullable<
      (typeof aiServiceRecommendationState.value)[keyof typeof aiServiceRecommendationState.value]
    > => Boolean(item)
  );

  return (
    scenes.sort(
      (left, right) =>
        new Date(right.fetchedAt).getTime() - new Date(left.fetchedAt).getTime()
    )[0] ?? null
  );
});

let voiceRecorder: BrowserVoiceRecorder | null = null;
const mediaObjectUrls = new Set<string>();

function goBack() {
  if (!props.navigation.navigateBack()) {
    props.navigation.reLaunch("home/dashboard");
  }
}

function scrollToBottom() {
  void nextTick(() => {
    const container = scrollRef.value;

    if (!container) {
      return;
    }

    const syncBottom = () => {
      container.scrollTop = container.scrollHeight;
    };

    syncBottom();
    setTimeout(syncBottom, 16);
    setTimeout(syncBottom, 48);
  });
}

function getCurrentTime() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

function formatMessageTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return getCurrentTime();
  }

  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "请求失败，请稍后重试";
}

function buildAssistantMetadata() {
  const metadata: Record<string, unknown> = {};
  const selectedReport =
    selectedAiReportId.value || aiReportAnalysisState.value?.reportId || "";
  const latestServiceContext = latestAiServiceContext.value;

  if (selectedReport) {
    metadata.selectedReportId = selectedReport;
  }

  if (aiReportAnalysisState.value?.reportTitle) {
    metadata.reportTitle = aiReportAnalysisState.value.reportTitle;
  }

  if (latestServiceContext?.scene) {
    metadata.aiScene = latestServiceContext.scene;
  }

  if (latestServiceContext?.category) {
    metadata.serviceCategory = latestServiceContext.category;
  }

  if (latestServiceContext?.recommendations.length) {
    metadata.recommendationIds = latestServiceContext.recommendations
      .slice(0, 3)
      .map((item) => item.serviceId);
  }

  return Object.keys(metadata).length > 0 ? metadata : undefined;
}

function syncConversationHistory(previewContent?: string, updatedAt?: string) {
  if (!currentConversationId.value) {
    return;
  }

  rememberAssistantConversation({
    conversationId: currentConversationId.value,
    topic: currentConversationTopic.value || DEFAULT_ASSISTANT_TOPIC,
    preview:
      previewContent ||
      messages.value[messages.value.length - 1]?.content ||
      DEFAULT_ASSISTANT_WELCOME,
    createdAt: updatedAt || new Date().toISOString(),
    updatedAt: updatedAt || new Date().toISOString()
  });
}

function mapRemoteMessage(item: AssistantConversationMessage) {
  return {
    id: item.messageId,
    role: item.role,
    type: item.type === "voice" ? "voice" : item.type === "image" ? "image" : "text",
    content: item.content,
    time: formatMessageTime(item.createdAt),
    audioUrl: item.audio?.url,
    audioDurationSeconds: item.audio?.durationSeconds ?? null,
    transcript: item.audio?.transcript ?? null
  } satisfies ChatMessage;
}

function replaceMessage(messageId: string, nextMessage: ChatMessage) {
  const targetIndex = messages.value.findIndex((item) => item.id === messageId);

  if (targetIndex >= 0) {
    messages.value.splice(targetIndex, 1, nextMessage);
    return;
  }

  messages.value.push(nextMessage);
}

function selectQuestion(question: string) {
  draft.value = question;
}

function changeQuestions() {
  questionGroupIndex.value = (questionGroupIndex.value + 1) % questionGroups.length;
  isQuestionCardCollapsed.value = false;
}

function toggleQuestionCard() {
  isQuestionCardCollapsed.value = !isQuestionCardCollapsed.value;
}

function useQuickAction(action: string) {
  if (action === "报告解读") {
    props.navigation.navigateTo("orders/checkup-ai-waiting");
    return;
  }

  if (action === "商品智选") {
    props.navigation.navigateTo("service/home-care-recommend-waiting");
    return;
  }

  if (action === "体检定制") {
    props.navigation.navigateTo("service/home-exam-recommend-waiting");
    return;
  }

  props.showToast(`${action}功能待接入`);
}

async function createConversation(topic?: string) {
  const conversation = await createAssistantConversation({
    topic: topic?.trim() || undefined
  });

  currentConversationId.value = conversation.conversationId;
  currentConversationTopic.value = conversation.topic || DEFAULT_ASSISTANT_TOPIC;
  setActiveAssistantConversation(conversation.conversationId);
  syncConversationHistory(DEFAULT_ASSISTANT_WELCOME, conversation.createdAt);
  await loadConversation(conversation.conversationId);
}

async function loadConversation(conversationId: string) {
  isConversationLoading.value = true;

  try {
    const [conversation, pageData] = await Promise.all([
      getAssistantConversation(conversationId),
      listAssistantMessages(conversationId, {
        page: 1,
        pageSize: 100
      })
    ]);

    currentConversationId.value = conversation.conversationId;
    currentConversationTopic.value = conversation.topic || DEFAULT_ASSISTANT_TOPIC;
    messages.value = pageData.list.map(mapRemoteMessage);
    setActiveAssistantConversation(conversation.conversationId);
    syncConversationHistory(
      pageData.list[pageData.list.length - 1]?.content,
      conversation.lastMessageAt || conversation.updatedAt || conversation.createdAt
    );
    isConversationHistoryOpen.value = false;
    scrollToBottom();
  } finally {
    isConversationLoading.value = false;
  }
}

async function ensureConversation() {
  const preferredConversationId =
    currentConversationId.value ||
    activeAssistantConversationId.value ||
    getLatestHistoryConversationId() ||
    "";

  if (preferredConversationId) {
    try {
      await loadConversation(preferredConversationId);
      return;
    } catch {
      currentConversationId.value = "";
    }
  }

  await createConversation();
}

async function createNewConversation() {
  isConversationHistoryOpen.value = false;
  messages.value = [];
  currentConversationId.value = "";
  await createConversation(`健康咨询 ${new Date().toLocaleDateString("zh-CN")}`);
}

async function selectConversation(conversationId: string) {
  try {
    await loadConversation(conversationId);
  } catch (error) {
    props.showToast(getErrorMessage(error));
  }
}

async function ensureConversationReady(seedText = "") {
  if (currentConversationId.value) {
    return currentConversationId.value;
  }

  await createConversation(seedText.slice(0, 12) || undefined);
  return currentConversationId.value;
}

async function sendTextMessage(content: string, options: { speakReply?: boolean } = {}) {
  const normalizedContent = content.trim();

  if (!normalizedContent || isSending.value) {
    props.showToast("请输入你想咨询的问题");
    return;
  }

  try {
    await ensureConversationReady(normalizedContent);
  } catch (error) {
    props.showToast(getErrorMessage(error));
    return;
  }

  const optimisticMessage: ChatMessage = {
    id: `local-${Date.now()}`,
    role: "user",
    type: "text",
    content: normalizedContent,
    time: getCurrentTime()
  };

  messages.value.push(optimisticMessage);
  draft.value = "";
  voiceEntryHint.value = "";
  scrollToBottom();
  isSending.value = true;

  try {
    const response = await sendAssistantMessage(currentConversationId.value, {
      contentType: "TEXT",
      content: normalizedContent,
      pageId: props.pageEntry.id,
      route: props.pageEntry.route,
      metadata: buildAssistantMetadata()
    });

    replaceMessage(optimisticMessage.id, mapRemoteMessage(response.userMessage));
    messages.value.push(mapRemoteMessage(response.reply));
    syncConversationHistory(response.reply.content, response.reply.createdAt);
    scrollToBottom();

    if (options.speakReply) {
      speakText(response.reply.content);
    }
  } catch (error) {
    messages.value = messages.value.filter((item) => item.id !== optimisticMessage.id);
    draft.value = normalizedContent;
    props.showToast(getErrorMessage(error));
  } finally {
    isSending.value = false;
  }
}

async function sendMessage() {
  await sendTextMessage(draft.value);
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
    id: `image-${Date.now()}`,
    role: "user",
    type: "image",
    content: file.name || "图片",
    imageUrl,
    time: getCurrentTime()
  });
  input.value = "";
  scrollToBottom();
}

function formatDuration(seconds: number) {
  return `${Math.max(1, seconds)}"`;
}

function buildVoiceMessageLabel(capture: VoiceCaptureResult) {
  return capture.transcript.trim() || `语音 ${formatDuration(capture.durationSeconds)}`;
}

async function sendVoiceCapture(capture: VoiceCaptureResult) {
  if (isSending.value) {
    props.showToast("请等待上一条消息发送完成");
    return;
  }

  try {
    await ensureConversationReady(capture.transcript || "语音咨询");
  } catch (error) {
    props.showToast(getErrorMessage(error));
    return;
  }

  const optimisticMessage: ChatMessage = {
    id: `voice-${Date.now()}`,
    role: "user",
    type: "voice",
    content: buildVoiceMessageLabel(capture),
    audioUrl: capture.objectUrl,
    audioDurationSeconds: capture.durationSeconds,
    transcript: capture.transcript || null,
    time: getCurrentTime()
  };

  messages.value.push(optimisticMessage);
  scrollToBottom();
  isSending.value = true;

  if (!capture.transcript.trim()) {
    props.showToast("这条语音没有识别到明确文本，豆沙包会先收到录音文件。");
  }

  try {
    const uploadedAudio = await uploadUserFile({
      category: "CHAT_AUDIO",
      file: capture.file,
      metadata: {
        durationSeconds: capture.durationSeconds,
        transcript: capture.transcript || null,
        sourcePageId: props.pageEntry.id
      }
    });

    const response = await sendAssistantMessage(currentConversationId.value, {
      contentType: "AUDIO",
      fileId: uploadedAudio.fileId,
      mimeType: uploadedAudio.mimeType,
      durationSeconds: capture.durationSeconds,
      transcript: capture.transcript || undefined,
      pageId: props.pageEntry.id,
      route: props.pageEntry.route,
      metadata: buildAssistantMetadata()
    });

    replaceMessage(optimisticMessage.id, mapRemoteMessage(response.userMessage));
    messages.value.push(mapRemoteMessage(response.reply));
    syncConversationHistory(response.reply.content, response.reply.createdAt);
    scrollToBottom();
    speakText(response.reply.content);
  } catch (error) {
    messages.value = messages.value.filter((item) => item.id !== optimisticMessage.id);
    props.showToast(getErrorMessage(error));
  } finally {
    isSending.value = false;
  }
}

async function startVoiceRecording() {
  if (isSending.value) {
    props.showToast("请等待当前消息发送完成");
    return;
  }

  if (!BrowserVoiceRecorder.isRecordingSupported()) {
    props.showToast("当前浏览器不支持录音");
    return;
  }

  try {
    voiceRecorder = new BrowserVoiceRecorder({
      onTick: (seconds) => {
        recordingSeconds.value = seconds;
      },
      onRecognitionError: (message) => {
        props.showToast(message);
      }
    });
    showImagePanel.value = false;
    voiceEntryHint.value = "";
    await voiceRecorder.start();
    isRecording.value = true;

    if (!BrowserVoiceRecorder.isSpeechRecognitionSupported()) {
      props.showToast("当前浏览器不支持语音转写，将先发送录音文件");
    }
  } catch {
    voiceRecorder?.dispose();
    voiceRecorder = null;
    isRecording.value = false;
    recordingSeconds.value = 0;
    props.showToast("无法访问麦克风，请检查权限");
  }
}

async function stopVoiceRecording() {
  if (!voiceRecorder) {
    isRecording.value = false;
    recordingSeconds.value = 0;
    return;
  }

  isRecording.value = false;
  const recorder = voiceRecorder;
  voiceRecorder = null;

  const capture = await recorder.stop();
  recordingSeconds.value = 0;

  if (!capture) {
    return;
  }

  mediaObjectUrls.add(capture.objectUrl);
  await sendVoiceCapture(capture);
}

function toggleVoiceRecording() {
  if (isRecording.value) {
    void stopVoiceRecording();
    return;
  }

  void startVoiceRecording();
}

onMounted(() => {
  void (async () => {
    await ensureConversation();

    if (initialEntryIntent?.mode === "text" && initialEntryIntent.draft?.trim()) {
      await sendTextMessage(initialEntryIntent.draft.trim());
      return;
    }

    if (initialEntryIntent?.mode === "voice") {
      voiceEntryHint.value = "已切换到语音咨询，请点击左下角麦克风开始说话。";
    }
  })().catch((error) => {
    props.showToast(getErrorMessage(error));
  });
});

onBeforeUnmount(() => {
  voiceRecorder?.dispose();
  voiceRecorder = null;
  stopSpeaking();
  mediaObjectUrls.forEach((url) => URL.revokeObjectURL(url));
  mediaObjectUrls.clear();
});

watch(
  () => messages.value.length,
  () => {
    scrollToBottom();
  },
  { flush: "post" }
);
</script>

<template>
  <section class="assistant-chat-page">
    <header class="assistant-topbar">
      <div class="assistant-topbar__main">
        <button class="assistant-back" type="button" aria-label="返回" @click="goBack">
          <span aria-hidden="true"></span>
        </button>
        <div class="assistant-brand">
          <div class="assistant-avatar" aria-hidden="true">
            <span class="assistant-avatar__core"></span>
          </div>
          <div class="assistant-copy">
            <strong>您好，我是豆沙包</strong>
            <p>健康问题、报告疑问、服务选择，都可以直接问我~</p>
            <p v-if="voiceEntryHint" class="voice-entry-hint">{{ voiceEntryHint }}</p>
          </div>
        </div>
      </div>
      <div class="assistant-header-actions">
        <button class="header-icon-btn" type="button" aria-label="创建新对话" @click="createNewConversation">
          <AddOne theme="outline" size="18" fill="currentColor" aria-hidden="true" />
        </button>
        <button class="header-icon-btn" type="button" aria-label="查看历史对话记录" @click="isConversationHistoryOpen = true">
          <History theme="outline" size="18" fill="currentColor" aria-hidden="true" />
        </button>
      </div>
    </header>

    <section class="question-card" :class="{ 'question-card--collapsed': isQuestionCardCollapsed }">
      <div class="question-card__header">
        <h2>
          <span aria-hidden="true">?</span>
          猜你想问
        </h2>
        <div class="question-toolbar">
          <button class="question-tool-btn" type="button" aria-label="刷新推荐问题" @click="changeQuestions">
            <Refresh theme="outline" size="16" fill="currentColor" aria-hidden="true" />
          </button>
          <button
            class="question-tool-btn"
            type="button"
            :aria-label="isQuestionCardCollapsed ? '展开推荐问题' : '收起推荐问题'"
            @click="toggleQuestionCard"
          >
            <component
              :is="isQuestionCardCollapsed ? Down : Up"
              theme="outline"
              size="16"
              fill="currentColor"
              aria-hidden="true"
            />
          </button>
        </div>
      </div>
      <transition name="question-fold">
        <div v-if="!isQuestionCardCollapsed" class="question-list">
          <button v-for="(item, index) in questionList" :key="item" type="button" @click="selectQuestion(item)">
            <em>{{ index + 1 }}</em>
            <strong>{{ item }}</strong>
            <i aria-hidden="true"></i>
          </button>
        </div>
      </transition>
      <p v-if="isQuestionCardCollapsed" class="question-card__collapsed-hint">
        推荐问题已收起，点击右上角可再次展开。
      </p>
    </section>

    <main ref="scrollRef" class="assistant-chat-main">

      <section v-if="messages.length" class="chat-messages" aria-label="对话记录">
        <article
          v-for="message in messages"
          :key="message.id"
          class="chat-message"
          :class="`chat-message--${message.role}`"
        >
          <div class="message-bubble" :class="[`message-bubble--${message.type}`, `message-bubble--${message.role}`]">
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
        <button v-for="item in quickActions" :key="item.label" type="button" @click="useQuickAction(item.label)">
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
        <button class="send-btn" :disabled="isSending" type="button" @click="sendMessage">
          {{ isSending ? "发送中" : "发送" }}
        </button>
      </div>
    </footer>

    <input ref="albumInputRef" class="media-input" type="file" accept="image/*" @change="handleImageSelected" />
    <input ref="cameraInputRef" class="media-input" type="file" accept="image/*" capture="environment" @change="handleImageSelected" />
    <AiConversationHistorySheet
      :open="isConversationHistoryOpen"
      :entries="assistantConversationHistory"
      :active-conversation-id="currentConversationId"
      :loading="isConversationLoading"
      @close="isConversationHistoryOpen = false"
      @create="createNewConversation"
      @select="selectConversation"
    />
  </section>
</template>

<style scoped>
.assistant-chat-page {
  --ihc-accent: #5b97da;
  --ihc-accent-deep: #2f6ea9;
  --ihc-text-primary: #22314d;
  --ihc-text-secondary: rgba(53, 68, 96, 0.74);
  --ihc-text-tertiary: rgba(75, 91, 120, 0.56);
  --ihc-border-soft: rgba(212, 223, 237, 0.96);
  --ihc-shadow-soft: 0 8px 20px rgba(78, 102, 142, 0.08);
  --ihc-shadow-float: 0 12px 28px rgba(78, 102, 142, 0.1);
  position: relative;
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr) auto;
  box-sizing: border-box;
  justify-self: center;
  width: min(402px, calc(100vw - 12px));
  height: min(874px, calc(100vh - 36px));
  min-height: min(874px, calc(100vh - 36px));
  max-height: 874px;
  margin: -18px auto 0;
  overflow: hidden;
  background: linear-gradient(180deg, #f5f8fc 0%, #eef3f9 100%);
  color: var(--ihc-text-primary);
  font-family: var(--ihc-font-family);
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

.assistant-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 12px 14px 8px;
  background: #f5f8fc;
  border-bottom: 1px solid rgba(213, 223, 236, 0.84);
}

.assistant-back,
.header-icon-btn,
.question-tool-btn,
.question-list button,
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

.assistant-topbar__main {
  display: flex;
  align-items: center;
  min-width: 0;
  gap: 6px;
  flex: 1;
}

.assistant-back {
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  width: 30px;
  height: 30px;
  padding: 0;
  border-radius: 50%;
  color: rgba(62, 80, 112, 0.92);
  background: #ffffff;
  box-shadow: 0 3px 10px rgba(79, 102, 140, 0.07);
}

.assistant-back span {
  width: 10px;
  height: 10px;
  border-bottom: 2.5px solid rgba(34, 49, 77, 0.6);
  border-left: 2.5px solid rgba(34, 49, 77, 0.6);
  transform: rotate(45deg);
}

.assistant-header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 0 0 auto;
}

.header-icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  padding: 0;
  color: rgba(62, 80, 112, 0.92);
  background: transparent;
  box-shadow: none;
}

.assistant-brand {
  display: flex;
  align-items: flex-start;
  min-width: 0;
  gap: 8px;
}

.assistant-avatar {
  position: relative;
  flex: 0 0 auto;
  width: 56px;
  height: 56px;
  margin: 2px 0 0;
  border-radius: 18px;
  background:
    radial-gradient(circle at 28% 28%, rgba(255, 255, 255, 0.98) 0 12%, transparent 13%),
    radial-gradient(circle at 70% 76%, rgba(255, 255, 255, 0.26) 0 18%, transparent 19%),
    linear-gradient(145deg, #77d7d8 0%, #8bb9f5 54%, #91dfb0 100%);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.72),
    0 10px 24px rgba(82, 131, 179, 0.14);
  overflow: hidden;
}

.assistant-avatar::before,
.assistant-avatar::after {
  position: absolute;
  content: "";
  border-radius: 999px;
}

.assistant-avatar::before {
  inset: 8px;
  background: linear-gradient(160deg, rgba(255, 255, 255, 0.24), rgba(255, 255, 255, 0.06));
}

.assistant-avatar::after {
  right: 8px;
  bottom: 9px;
  width: 12px;
  height: 12px;
  background: rgba(255, 255, 255, 0.3);
}

.assistant-avatar__core {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background:
    radial-gradient(circle at 35% 35%, #ffffff 0 20%, rgba(255, 255, 255, 0.48) 21%, transparent 50%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.86), rgba(255, 255, 255, 0.34));
  box-shadow:
    0 0 0 8px rgba(255, 255, 255, 0.15),
    0 0 0 16px rgba(255, 255, 255, 0.08);
  transform: translate(-50%, -50%);
  animation: assistant-avatar-float 3.2s ease-in-out infinite;
}

.assistant-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  min-height: 64px;
  padding-top: 8px;
}

.assistant-copy strong {
  display: block;
  margin: 0 0 2px;
  color: var(--ihc-text-primary);
  font-size: 16px;
  font-weight: 500;
  line-height: 1.2;
  text-wrap: pretty;
}

.assistant-copy p {
  margin: 0;
  color: rgba(75, 91, 120, 0.48);
  font-size: 10px;
  font-weight: 500;
  line-height: 1.3;
  text-wrap: pretty;
}

.voice-entry-hint {
  margin-top: 4px;
  padding: 0;
  background: transparent;
  color: var(--ihc-accent-deep);
  font-size: 10px;
  font-weight: 500;
  line-height: 1.3;
}

.question-card {
  position: relative;
  margin: 8px 14px 0;
  padding: 10px 12px 9px;
  border: 1px solid var(--ihc-border-soft);
  border-radius: 16px;
  background: #ffffff;
  box-shadow: var(--ihc-shadow-soft);
}

.question-card--collapsed {
  padding-bottom: 8px;
}

.question-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 8px;
}

.question-card h2 {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  color: var(--ihc-accent-deep);
  font-size: 15px;
  font-weight: 700;
}

.question-card h2 span {
  display: grid;
  place-items: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--ihc-accent);
  color: #ffffff;
  font-size: 11px;
  font-style: normal;
}

.question-toolbar {
  display: flex;
  align-items: center;
  gap: 6px;
}

.question-tool-btn {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border-radius: 50%;
  background: #f8fbff;
  color: rgba(76, 102, 138, 0.9);
  box-shadow: none;
}

.question-list {
  display: grid;
  gap: 6px;
}

.question-list button {
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr) 18px;
  align-items: center;
  min-height: 38px;
  padding: 0 12px;
  border: 1px solid rgba(221, 229, 241, 0.92);
  border-radius: 12px;
  background: #fbfdff;
  box-shadow: none;
  text-align: left;
}

.question-list em {
  color: var(--ihc-accent);
  font-size: 12px;
  font-style: normal;
  font-weight: 700;
}

.question-list strong {
  display: -webkit-box;
  overflow: hidden;
  color: #3a4860;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.2;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  text-wrap: pretty;
}

.question-list i {
  width: 7px;
  height: 7px;
  border-top: 2px solid rgba(64, 80, 111, 0.28);
  border-right: 2px solid rgba(64, 80, 111, 0.28);
  transform: rotate(45deg);
}

.question-card__collapsed-hint {
  margin: 0;
  color: var(--ihc-text-tertiary);
  font-size: 11px;
  font-weight: 500;
  line-height: 1.2;
}

.assistant-chat-main {
  min-height: 0;
  padding: 8px 14px 12px;
  overflow-y: auto;
  scrollbar-width: none;
}

.assistant-chat-main::-webkit-scrollbar {
  display: none;
}

.chat-messages {
  display: grid;
  gap: 12px;
  padding: 2px 0 12px;
}

.chat-message {
  display: grid;
  justify-items: end;
  gap: 5px;
}

.chat-message--assistant {
  justify-items: start;
}

.message-bubble {
  max-width: 270px;
  padding: 11px 13px;
  border-radius: 20px 20px 8px 20px;
  background: linear-gradient(110deg, #73d1ce 0%, #84d8a9 100%);
  color: #ffffff;
  font-size: 14px;
  font-weight: 700;
  line-height: 1.45;
  box-shadow: 0 8px 16px rgba(92, 173, 167, 0.14);
  text-wrap: pretty;
}

.message-bubble--assistant {
  border: 1px solid rgba(221, 229, 241, 0.92);
  border-radius: 20px 20px 20px 8px;
  background: #ffffff;
  color: #364055;
  box-shadow: 0 8px 16px rgba(77, 104, 142, 0.06);
}

.message-bubble--image {
  padding: 7px;
  background: #ffffff;
}

.message-bubble--image img {
  display: block;
  width: 184px;
  max-height: 190px;
  border-radius: 14px;
  object-fit: cover;
}

.message-bubble--voice {
  display: grid;
  grid-template-columns: 22px minmax(0, 1fr);
  gap: 8px;
  align-items: center;
  min-width: 198px;
  background: #ffffff;
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
  color: rgba(90, 102, 126, 0.5);
  font-size: 10px;
  font-weight: 800;
}

.chat-footer {
  position: relative;
  padding: 10px 14px 14px;
  background: #f5f8fc;
  border-top: 1px solid rgba(213, 223, 236, 0.84);
}

.image-source-panel {
  position: absolute;
  right: 92px;
  bottom: 88px;
  z-index: 2;
  display: grid;
  gap: 8px;
  width: 112px;
  padding: 12px;
  border: 1px solid rgba(221, 229, 241, 0.92);
  border-radius: 18px;
  background: #ffffff;
  box-shadow: var(--ihc-shadow-float);
}

.image-source-panel button {
  height: 34px;
  border-radius: 12px;
  background: #f6f9fd;
  color: #364055;
  font-size: 13px;
  font-weight: 900;
}

.quick-actions {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 10px;
}

.quick-actions button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 34px;
  border: 1px solid rgba(221, 229, 241, 0.92);
  border-radius: 14px;
  background: #ffffff;
  box-shadow: none;
  color: #364055;
  font-size: 12px;
  font-weight: 700;
}

.message-bar {
  display: grid;
  grid-template-columns: 38px 38px minmax(0, 1fr) 70px;
  align-items: center;
  gap: 6px;
  min-height: 48px;
  padding: 5px 5px 5px 7px;
  border: 1px solid rgba(221, 229, 241, 0.96);
  border-radius: 24px;
  background: #ffffff;
  box-shadow: 0 8px 20px rgba(78, 102, 142, 0.08);
}

.voice-btn {
  position: relative;
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  padding: 0;
  border-radius: 50%;
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
  width: 34px;
  height: 34px;
  padding: 0;
  border-radius: 50%;
  color: #596575;
}

.camera-btn.active {
  color: #2d90f0;
}

.quick-actions :deep(.i-icon),
.camera-btn :deep(.i-icon),
.question-tool-btn :deep(.i-icon),
.header-icon-btn :deep(.i-icon) {
  display: block;
  flex: 0 0 auto;
}

.message-bar input {
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: #2d344b;
  font-size: 12px;
  font-weight: 600;
}

.message-bar input::placeholder {
  color: rgba(92, 104, 126, 0.42);
  opacity: 1;
}

.send-btn {
  height: 36px;
  border-radius: 999px;
  background: linear-gradient(110deg, #74d5d6 0%, #83d8a4 100%);
  color: #ffffff;
  font-size: 13px;
  font-weight: 700;
  box-shadow: 0 8px 16px rgba(84, 176, 171, 0.16);
}

.send-btn:disabled {
  opacity: 0.72;
}

.assistant-back,
.header-icon-btn,
.question-tool-btn,
.question-list button,
.quick-actions button,
.image-source-panel button,
.voice-btn,
.camera-btn,
.send-btn {
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease,
    background-color 0.18s ease,
    color 0.18s ease,
    opacity 0.18s ease;
}

.assistant-back:active,
.header-icon-btn:active,
.question-tool-btn:active,
.question-list button:active,
.quick-actions button:active,
.image-source-panel button:active,
.voice-btn:active,
.camera-btn:active,
.send-btn:active {
  transform: scale(0.97);
}

.question-fold-enter-active,
.question-fold-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
  transform-origin: top center;
}

.question-fold-enter-from,
.question-fold-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

.media-input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}

@media (prefers-reduced-motion: reduce) {
  .assistant-avatar__core,
  .assistant-back,
  .header-icon-btn,
  .question-tool-btn,
  .question-list button,
  .quick-actions button,
  .image-source-panel button,
  .voice-btn,
  .camera-btn,
  .send-btn,
  .question-fold-enter-active,
  .question-fold-leave-active {
    transition: none;
    animation: none;
  }
}

@keyframes assistant-avatar-float {
  0%,
  100% {
    transform: translate(-50%, -50%);
  }

  50% {
    transform: translate(-50%, calc(-50% - 2px));
  }
}
</style>
