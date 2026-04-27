<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import type { PageComponentProps } from "@ihc/page-core/types";
import { Alignment, Fit, Layout, Rive, StateMachineInputType, type StateMachineInput } from "@rive-app/canvas";
import AddOne from "@icon-park/vue-next/es/icons/AddOne";
import Camera from "@icon-park/vue-next/es/icons/Camera";
import Commodity from "@icon-park/vue-next/es/icons/Commodity";
import Down from "@icon-park/vue-next/es/icons/Down";
import Editor from "@icon-park/vue-next/es/icons/Editor";
import History from "@icon-park/vue-next/es/icons/History";
import Microphone from "@icon-park/vue-next/es/icons/Microphone";
import Refresh from "@icon-park/vue-next/es/icons/Refresh";
import Stethoscope from "@icon-park/vue-next/es/icons/Stethoscope";
import Up from "@icon-park/vue-next/es/icons/Up";
import assistantRiveUrl from "@/assets/home/sections/assistant.riv?url";
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
import { ensureLocalRiveRuntime } from "@/shared/rive/runtime";

const props = defineProps<PageComponentProps>();

const STATE_MACHINE_NAME = "State Machine 1";
const BLINK_TRIGGER_NAME = "blinkTrigger";

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
const DEFAULT_ASSISTANT_WELCOME = "你好，我在。你可以直接和我聊报告、健康变化，或者服务怎么选。";
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
  { label: "服务智选", icon: Commodity },
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
const assistantCanvasRef = ref<HTMLCanvasElement | null>(null);
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
let assistantRive: Rive | null = null;
let assistantBlinkTrigger: StateMachineInput | null = null;
let assistantBlinkTimer: ReturnType<typeof setTimeout> | null = null;
let assistantResizeObserver: ResizeObserver | null = null;
const mediaObjectUrls = new Set<string>();

ensureLocalRiveRuntime();

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

  if (action === "服务智选") {
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

function resizeAssistantAvatar() {
  assistantRive?.resizeDrawingSurfaceToCanvas();
}

function bindAssistantStateMachineInputs() {
  const inputs = assistantRive?.stateMachineInputs(STATE_MACHINE_NAME) ?? [];
  assistantBlinkTrigger =
    inputs.find(
      (input) =>
        input.name === BLINK_TRIGGER_NAME && input.type === StateMachineInputType.Trigger
    ) ?? null;
}

function clearAssistantBlinkTimer() {
  if (assistantBlinkTimer) {
    clearTimeout(assistantBlinkTimer);
    assistantBlinkTimer = null;
  }
}

function scheduleAssistantBlink() {
  clearAssistantBlinkTimer();
  assistantBlinkTimer = setTimeout(() => {
    if (!assistantBlinkTrigger) {
      bindAssistantStateMachineInputs();
    }

    assistantBlinkTrigger?.fire();
    scheduleAssistantBlink();
  }, 2600 + Math.random() * 2200);
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

  if (!assistantCanvasRef.value) {
    return;
  }

  assistantRive = new Rive({
    canvas: assistantCanvasRef.value,
    src: assistantRiveUrl,
    stateMachines: STATE_MACHINE_NAME,
    autoplay: true,
    layout: new Layout({
      fit: Fit.Contain,
      alignment: Alignment.Center
    }),
    onLoad: () => {
      resizeAssistantAvatar();
      bindAssistantStateMachineInputs();
      scheduleAssistantBlink();
    }
  });

  assistantResizeObserver = new ResizeObserver(resizeAssistantAvatar);
  assistantResizeObserver.observe(assistantCanvasRef.value);
});

onBeforeUnmount(() => {
  voiceRecorder?.dispose();
  voiceRecorder = null;
  clearAssistantBlinkTimer();
  assistantResizeObserver?.disconnect();
  assistantResizeObserver = null;
  assistantBlinkTrigger = null;
  assistantRive?.cleanup();
  assistantRive = null;
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

watch(
  isSending,
  (sending) => {
    if (sending) {
      scrollToBottom();
    }
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
            <div class="assistant-avatar__fallback">豆</div>
            <canvas ref="assistantCanvasRef" class="assistant-avatar__canvas" width="66" height="66"></canvas>
          </div>
          <div class="assistant-copy">
            <strong>豆沙包在线</strong>
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
        <article v-if="isSending" class="chat-message chat-message--assistant chat-message--thinking" aria-live="polite">
          <p class="assistant-thinking">
            <span>思考中</span>
            <i aria-hidden="true"></i>
            <i aria-hidden="true"></i>
            <i aria-hidden="true"></i>
            <i aria-hidden="true"></i>
          </p>
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
          <Microphone v-if="!isRecording" theme="outline" size="22" fill="currentColor" aria-hidden="true" />
          <span v-else class="recording-stop" aria-hidden="true"></span>
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
        <input v-model="draft" type="text" placeholder="直接说说你的情况，报告、健康、服务都可以" @keyup.enter="sendMessage" />
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
  --ihc-accent: var(--brand);
  --ihc-accent-deep: var(--brand-dark);
  --ihc-text-primary: #24372e;
  --ihc-text-secondary: rgba(56, 92, 79, 0.78);
  --ihc-text-tertiary: rgba(81, 114, 103, 0.58);
  --ihc-border-soft: rgba(203, 224, 218, 0.9);
  --ihc-shadow-soft: 0 6px 18px rgba(53, 161, 152, 0.06);
  --ihc-shadow-float: 0 12px 24px rgba(53, 161, 152, 0.1);
  --assistant-font-family:
    "HarmonyOS Sans SC",
    "MiSans",
    "PingFang SC",
    "Noto Sans SC",
    "Source Han Sans SC",
    "Microsoft YaHei UI",
    "Microsoft YaHei",
    system-ui,
    sans-serif;
  position: relative;
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr) auto;
  box-sizing: border-box;
  justify-self: stretch;
  width: calc(100% + 36px);
  max-width: none;
  height: var(--ihc-viewport-height);
  min-height: var(--ihc-viewport-height);
  max-height: var(--ihc-viewport-height);
  margin: -18px 0 -18px -18px;
  overflow: hidden;
  background: linear-gradient(180deg, #edf8f5 0%, #f6fbf9 44%, #eef7f4 100%);
  color: var(--ihc-text-primary);
  font-family: var(--assistant-font-family);
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

.assistant-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 14px;
  background: rgba(247, 252, 250, 0.94);
  border-bottom: 1px solid rgba(203, 224, 218, 0.8);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
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
  font-family: var(--assistant-font-family);
}

.assistant-topbar__main {
  display: flex;
  align-items: center;
  min-width: 0;
  gap: 10px;
  flex: 1;
}

.assistant-back {
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  width: 32px;
  height: 32px;
  padding: 0;
  border-radius: 8px;
  color: rgba(51, 91, 78, 0.92);
  background: transparent;
  box-shadow: none;
}

.assistant-back span {
  width: 10px;
  height: 10px;
  border-bottom: 2.5px solid rgba(36, 55, 46, 0.62);
  border-left: 2.5px solid rgba(36, 55, 46, 0.62);
  transform: rotate(45deg);
}

.assistant-header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 0 0 auto;
}

.header-icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border-radius: 8px;
  color: rgba(51, 91, 78, 0.92);
  background: transparent;
  box-shadow: none;
}

.assistant-brand {
  display: flex;
  align-items: center;
  min-width: 0;
  gap: 10px;
}

.assistant-avatar {
  position: relative;
  flex: 0 0 auto;
  width: 66px;
  height: 66px;
  margin: 0;
  border-radius: 10px;
  background: transparent;
  box-shadow: none;
  overflow: hidden;
}

.assistant-avatar__fallback {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  border-radius: 0;
  background: transparent;
  color: rgba(51, 91, 78, 0.34);
  font-size: 15px;
  font-weight: 700;
  line-height: 1;
  box-shadow: none;
}

.assistant-avatar__canvas {
  position: relative;
  z-index: 1;
  display: block;
  width: 66px;
  height: 66px;
  transform: scale(1.16);
}

.assistant-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-self: center;
  min-height: 66px;
  padding-top: 0;
}

.assistant-copy strong {
  display: block;
  margin: 0;
  color: var(--ihc-text-primary);
  font-size: 17px;
  font-weight: 700;
  line-height: 1.25;
  text-wrap: pretty;
}

.assistant-copy p {
  margin: 0;
  color: rgba(76, 104, 94, 0.48);
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
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.94);
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
  border-radius: 8px;
  background: rgba(236, 248, 245, 0.94);
  color: rgba(26, 174, 186, 0.9);
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
  border: 1px solid rgba(193, 227, 220, 0.92);
  border-radius: 8px;
  background: #fbfffe;
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
  color: #355043;
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
  border-top: 2px solid rgba(56, 92, 79, 0.28);
  border-right: 2px solid rgba(56, 92, 79, 0.28);
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
  padding: 8px 14px 16px;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: none;
}

.assistant-chat-main::-webkit-scrollbar {
  display: none;
}

.chat-messages {
  display: grid;
  gap: 13px;
  padding: 4px 0 12px;
}

.chat-message {
  display: grid;
  justify-items: end;
  gap: 5px;
}

.chat-message--assistant {
  justify-items: start;
}

.chat-message--thinking {
  margin-top: -3px;
}

.assistant-thinking {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  margin: 0;
  padding: 0 2px;
  color: rgba(102, 116, 110, 0.42);
  font-size: 11px;
  font-weight: 500;
  line-height: 1.4;
}

.assistant-thinking i {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: currentColor;
  opacity: 0.34;
  animation: assistant-thinking-dot 1.15s ease-in-out infinite;
}

.assistant-thinking i:nth-of-type(2) {
  animation-delay: 0.16s;
}

.assistant-thinking i:nth-of-type(3) {
  animation-delay: 0.32s;
}

.assistant-thinking i:nth-of-type(4) {
  animation-delay: 0.48s;
}

.message-bubble {
  max-width: min(78%, 312px);
  padding: 10px 13px;
  border: 1px solid rgba(104, 212, 140, 0.42);
  border-radius: 10px;
  background: #6fdc91;
  color: #ffffff;
  font-family:
    "Songti SC",
    "SimSun",
    "STSong",
    "Noto Serif CJK SC",
    serif;
  font-size: 14px;
  font-weight: 650;
  line-height: 1.62;
  box-shadow: 0 5px 14px rgba(53, 161, 152, 0.1);
  text-wrap: pretty;
  overflow-wrap: anywhere;
}

.message-bubble--assistant {
  border-color: rgba(202, 224, 218, 0.88);
  background: rgba(255, 255, 255, 0.96);
  color: #31483e;
  font-weight: 600;
  box-shadow: 0 3px 10px rgba(53, 161, 152, 0.045);
}

.message-bubble--image {
  padding: 7px;
  background: #ffffff;
}

.message-bubble--image img {
  display: block;
  width: 184px;
  max-height: 190px;
  border-radius: 8px;
  object-fit: cover;
}

.message-bubble--voice {
  display: grid;
  grid-template-columns: 22px minmax(0, 1fr);
  gap: 8px;
  align-items: center;
  min-width: 198px;
  border-color: rgba(202, 224, 218, 0.88);
  background: rgba(255, 255, 255, 0.96);
  color: #31483e;
}

.voice-message-icon {
  position: relative;
  width: 22px;
  height: 22px;
  border: 2px solid var(--brand);
  border-radius: 50%;
}

.voice-message-icon::before,
.voice-message-icon::after {
  position: absolute;
  top: 5px;
  width: 2px;
  height: 8px;
  border-radius: 999px;
  background: var(--brand);
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
  color: rgba(83, 108, 98, 0.42);
  font-size: 11px;
  font-weight: 600;
}

.chat-footer {
  position: sticky;
  bottom: 0;
  z-index: 6;
  padding: 10px 14px calc(12px + env(safe-area-inset-bottom, 0px));
  background: rgba(244, 251, 248, 0.98);
  border-top: 1px solid rgba(203, 224, 218, 0.82);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

.image-source-panel {
  position: absolute;
  right: 92px;
  bottom: calc(88px + env(safe-area-inset-bottom, 0px));
  z-index: 2;
  display: grid;
  gap: 8px;
  width: 112px;
  padding: 12px;
  border: 1px solid rgba(193, 227, 220, 0.92);
  border-radius: 8px;
  background: #ffffff;
  box-shadow: var(--ihc-shadow-float);
}

.image-source-panel button {
  height: 34px;
  border-radius: 6px;
  background: #f4fbf9;
  color: #355043;
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
  border: 1px solid rgba(193, 227, 220, 0.92);
  border-radius: 8px;
  background: #ffffff;
  box-shadow: none;
  color: #355043;
  font-size: 12px;
  font-weight: 700;
}

.message-bar {
  display: grid;
  grid-template-columns: 34px 34px minmax(0, 1fr) 64px;
  align-items: center;
  gap: 8px;
  min-height: 48px;
  padding: 5px 6px;
  border: 1px solid rgba(179, 212, 204, 0.98);
  border-radius: 0;
  background: #ffffff;
  box-shadow: 0 6px 16px rgba(53, 161, 152, 0.07);
}

.voice-btn {
  position: relative;
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  padding: 0;
  border-radius: 0;
  color: #4c6a5f;
}

.voice-btn.recording {
  color: #c74646;
}

.voice-btn em {
  position: absolute;
  top: -14px;
  left: 50%;
  color: var(--brand);
  font-size: 10px;
  font-style: normal;
  font-weight: 900;
  transform: translateX(-50%);
}

.recording-stop {
  display: block;
  width: 15px;
  height: 15px;
  background: currentColor;
}

.camera-btn {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  padding: 0;
  border-radius: 0;
  color: #4c6a5f;
}

.camera-btn.active {
  color: var(--brand);
}

.quick-actions :deep(.i-icon),
.camera-btn :deep(.i-icon),
.voice-btn :deep(.i-icon),
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
  color: #294036;
  font-size: 13px;
  font-weight: 500;
}

.message-bar input::placeholder {
  color: rgba(87, 111, 101, 0.42);
  opacity: 1;
}

.send-btn {
  height: 36px;
  border-radius: 0;
  background: var(--brand);
  color: #ffffff;
  font-size: 13px;
  font-weight: 700;
  box-shadow: none;
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

@keyframes assistant-thinking-dot {
  0%,
  100% {
    opacity: 0.28;
    transform: translateY(0);
  }

  45% {
    opacity: 0.86;
    transform: translateY(-2px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .assistant-back,
  .header-icon-btn,
  .question-tool-btn,
  .question-list button,
  .quick-actions button,
  .image-source-panel button,
  .voice-btn,
  .camera-btn,
  .send-btn,
  .assistant-thinking i,
  .question-fold-enter-active,
  .question-fold-leave-active {
    transition: none;
    animation: none;
  }
}
</style>
