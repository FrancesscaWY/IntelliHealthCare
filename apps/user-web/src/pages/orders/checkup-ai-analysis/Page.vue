<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import type { PageComponentProps } from "@ihc/page-core/types";
import { Alignment, Fit, Layout, Rive, StateMachineInputType, type StateMachineInput } from "@rive-app/canvas";
import Camera from "@icon-park/vue-next/es/icons/Camera";
import Commodity from "@icon-park/vue-next/es/icons/Commodity";
import Editor from "@icon-park/vue-next/es/icons/Editor";
import Stethoscope from "@icon-park/vue-next/es/icons/Stethoscope";
import assistantRiveUrl from "@/assets/home/sections/assistant.riv?url";
import AiConversationHistorySheet from "@/shared/ai/components/AiConversationHistorySheet.vue";
import { prepareAiReportAnalysis, resolveAiReportId } from "@/shared/ai/runtime";
import {
  activeAssistantConversationId,
  aiReportAnalysisState,
  assistantConversationHistory,
  requestAssistantTextEntry,
  requestAssistantVoiceEntry,
  selectedAiReportId,
  setActiveAssistantConversation
} from "@/shared/ai/state";

const props = defineProps<PageComponentProps>();

const STATE_MACHINE_NAME = "State Machine 1";
const BLINK_TRIGGER_NAME = "blinkTrigger";
const canvasRef = ref<HTMLCanvasElement | null>(null);
const analysisScrollRef = ref<HTMLElement | null>(null);
const draft = ref("");
const typedText = ref("");
const isConversationHistoryOpen = ref(false);
const shouldStickToReportBottom = ref(true);
const quickActions = [
  { label: "报告解读", icon: Editor },
  { label: "服务智选", icon: Commodity },
  { label: "体检定制", icon: Stethoscope }
];

const reportState = aiReportAnalysisState;

type ReportKeywordTone = "brand" | "warning" | "muted";

interface ReportKeywordItem {
  text: string;
  tone: ReportKeywordTone;
}

function normalizeKeywordText(value: string) {
  return value
    .replace(/^(后续建议|建议|风险提醒|当前重点|体检结论|检查结论|结论|摘要|提示|需关注)[：:]\s*/u, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[。；;、，,]+$/u, "");
}

function splitKeywordCandidates(value: string) {
  const normalized = normalizeKeywordText(value);

  if (!normalized) {
    return [];
  }

  const segments = normalized
    .split(/[；;、，,]/u)
    .map((item) => normalizeKeywordText(item))
    .filter(Boolean);
  const nextSegments = segments.length > 1 ? segments : [normalized];

  return nextSegments.filter((item) => item.length >= 2 && item.length <= 22);
}

function appendKeywordItems(
  store: Map<string, ReportKeywordTone>,
  values: string[],
  tone: ReportKeywordTone,
  limit = 10
) {
  for (const value of values) {
    for (const item of splitKeywordCandidates(value)) {
      const currentTone = store.get(item);

      if (!currentTone || (currentTone !== "warning" && tone === "warning")) {
        store.set(item, tone);
      }

      if (store.size >= limit) {
        return;
      }
    }
  }
}

const reportParagraphs = computed(() => {
  const paragraphs = [
    reportState.value?.interpretation || "",
    ...(reportState.value?.summaryLines ?? []),
    ...((reportState.value?.followUpSuggestions ?? []).map(
      (item, index) => `建议 ${index + 1}：${item}`
    ))
  ]
    .map((item) => item.trim())
    .filter(Boolean);

  return Array.from(new Set(paragraphs));
});
const typedParagraphs = computed(() => typedText.value.split("\n\n").filter(Boolean));
const reportTitle = computed(() => reportState.value?.reportTitle || "体检报告");
const reportNarrative = computed(() => reportParagraphs.value.join("\n\n"));
const riskSignals = computed(() => {
  const latestAlertSummary = reportState.value?.latestRiskAlert?.summary?.trim() || "";

  return (reportState.value?.riskSignals ?? []).filter(
    (item) => item.trim().length > 0 && item.trim() !== latestAlertSummary
  );
});
const reportKeywordItems = computed<ReportKeywordItem[]>(() => {
  const currentState = reportState.value;
  const store = new Map<string, ReportKeywordTone>();

  if (!currentState) {
    return [];
  }

  appendKeywordItems(store, currentState.highlights ?? [], "brand");
  appendKeywordItems(store, riskSignals.value, "warning");

  if (currentState.latestRiskAlert?.title) {
    appendKeywordItems(store, [currentState.latestRiskAlert.title], "warning");
  }

  if (store.size < 8) {
    appendKeywordItems(store, (currentState.summaryLines ?? []).slice(0, 2), "muted");
  }

  if (store.size < 8) {
    appendKeywordItems(store, currentState.followUpSuggestions ?? [], "muted");
  }

  return Array.from(store.entries())
    .slice(0, 10)
    .map(([text, tone]) => ({
      text,
      tone
    }));
});
const reportKeywordHint = computed(() =>
  reportKeywordItems.value.length > 0
    ? "关键词来自本次 AI 评估结果，可快速查看当前重点。"
    : "AI 正在提炼本次评估关键词。"
);

let riveInstance: Rive | null = null;
let blinkTrigger: StateMachineInput | null = null;
let blinkTimer: ReturnType<typeof setTimeout> | null = null;
let typingTimer: ReturnType<typeof setTimeout> | null = null;
let resizeObserver: ResizeObserver | null = null;
let typingIndex = 0;

function goBack() {
  if (!props.navigation.navigateBack()) {
    props.navigation.reLaunch("orders/checkup-report");
  }
}

function useQuickAction(label: string) {
  if (label === "报告解读") {
    const reportId = reportState.value?.reportId || selectedAiReportId.value;

    if (!reportId) {
      props.showToast("暂无可解读报告");
      return;
    }

    void prepareAiReportAnalysis(reportId).catch((error) => {
      props.showToast(error instanceof Error ? error.message : "AI 报告解读刷新失败");
    });
    return;
  }

  if (label === "服务智选") {
    props.navigation.navigateTo("service/home-care-recommend-waiting");
    return;
  }

  if (label === "体检定制") {
    props.navigation.navigateTo("service/home-exam-recommend-waiting");
  }
}

function sendMessage() {
  const text = draft.value.trim();

  if (!text) {
    props.showToast("请输入内容");
    return;
  }

  requestAssistantTextEntry(text, props.pageEntry.id);
  draft.value = "";
  props.navigation.navigateTo("home/assistant-chat");
}

function openVoiceAssistant() {
  requestAssistantVoiceEntry(props.pageEntry.id);
  props.navigation.navigateTo("home/assistant-chat");
}

function openConversationFromHistory(conversationId: string) {
  setActiveAssistantConversation(conversationId);
  isConversationHistoryOpen.value = false;
  props.navigation.navigateTo("home/assistant-chat");
}

function createConversationFromHistory() {
  setActiveAssistantConversation("");
  isConversationHistoryOpen.value = false;
  props.navigation.navigateTo("home/assistant-chat");
}

function nextTypingSize(text: string) {
  const current = text[typingIndex] ?? "";

  if (current === "\n") {
    return text[typingIndex + 1] === "\n" ? 2 : 1;
  }

  const nextChar = text[typingIndex + 1] ?? "";
  if (/^[\u4e00-\u9fa5A-Za-z0-9]$/.test(current) && /^[\u4e00-\u9fa5A-Za-z0-9]$/.test(nextChar)) {
    return Math.random() > 0.5 ? 2 : 1;
  }

  return 1;
}

function typeNextChunk() {
  const source = reportNarrative.value;

  if (typingIndex >= source.length) {
    return;
  }

  const size = nextTypingSize(source);
  typedText.value += source.slice(typingIndex, typingIndex + size);
  typingIndex += size;
  typingTimer = setTimeout(typeNextChunk, 34 + Math.random() * 42);
}

function restartTyping() {
  clearTimeout(typingTimer ?? undefined);
  typedText.value = "";
  typingIndex = 0;
  shouldStickToReportBottom.value = true;

  void nextTick(() => {
    const container = analysisScrollRef.value;

    if (!container) {
      return;
    }

    container.scrollTop = 0;
  });

  if (!reportNarrative.value) {
    return;
  }

  typingTimer = setTimeout(typeNextChunk, 180);
}

function updateReportScrollStickiness() {
  const container = analysisScrollRef.value;

  if (!container) {
    return;
  }

  shouldStickToReportBottom.value =
    container.scrollTop + container.clientHeight >= container.scrollHeight - 56;
}

function scrollReportToBottom(force = false) {
  void nextTick(() => {
    const container = analysisScrollRef.value;

    if (!container) {
      return;
    }

    if (!force && !shouldStickToReportBottom.value) {
      return;
    }

    container.scrollTop = container.scrollHeight;
  });
}

function handleReportScroll() {
  updateReportScrollStickiness();
}

function bindStateMachineInputs() {
  const inputs = riveInstance?.stateMachineInputs(STATE_MACHINE_NAME) ?? [];
  blinkTrigger =
    inputs.find(
      (input) =>
        input.name === BLINK_TRIGGER_NAME && input.type === StateMachineInputType.Trigger
    ) ?? null;
}

function triggerBlink() {
  if (!blinkTrigger) {
    bindStateMachineInputs();
  }

  blinkTrigger?.fire();
}

function scheduleBlink() {
  clearTimeout(blinkTimer ?? undefined);
  blinkTimer = setTimeout(() => {
    triggerBlink();
    scheduleBlink();
  }, 2600 + Math.random() * 2200);
}

function resizeRive() {
  riveInstance?.resizeDrawingSurfaceToCanvas();
}

async function refreshReportAnalysis(showErrorToast = true) {
  const reportId =
    selectedAiReportId.value || reportState.value?.reportId || (await resolveAiReportId());

  if (!reportId) {
    throw new Error("暂无可用于 AI 解读的体检报告");
  }

  try {
    await prepareAiReportAnalysis(reportId);
  } catch (error) {
    if (showErrorToast) {
      throw error;
    }
  }
}

watch(reportNarrative, restartTyping, { immediate: true });
watch(
  () => typedText.value.length,
  () => {
    scrollReportToBottom();
  }
);

onMounted(() => {
  void refreshReportAnalysis(!reportState.value).catch((error) => {
    if (reportState.value) {
      return;
    }

    props.showToast(error instanceof Error ? error.message : "AI 报告解读加载失败");
  });

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
      alignment: Alignment.Center
    }),
    onLoad: () => {
      resizeRive();
      bindStateMachineInputs();
      scheduleBlink();
    }
  });

  resizeObserver = new ResizeObserver(resizeRive);
  resizeObserver.observe(canvas);
});

onBeforeUnmount(() => {
  clearTimeout(blinkTimer ?? undefined);
  clearTimeout(typingTimer ?? undefined);
  resizeObserver?.disconnect();
  resizeObserver = null;
  blinkTrigger = null;
  riveInstance?.cleanup();
  riveInstance = null;
});
</script>

<template>
  <section class="analysis-page">
    <header class="assistant-hero">
      <button class="assistant-back" type="button" aria-label="返回" @click="goBack">
        <span aria-hidden="true"></span>
      </button>
      <canvas
        ref="canvasRef"
        class="assistant-avatar"
        width="180"
        height="140"
        aria-label="AI 小助手"
      ></canvas>
      <span class="hi-badge">Hi</span>
      <div class="welcome-bubble">
        <strong>豆沙包已为您整理好评估报告啦！</strong>
        <!-- <strong>内容会随生成继续向下展开</strong> -->
        <!-- <p>顶部形象和底部输入区保持固定，您也可以随时上滑回看前文</p> -->
      </div>
      <button
        class="history-btn"
        type="button"
        aria-label="查看历史对话记录"
        @click="isConversationHistoryOpen = true"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 7v5l3 2"></path>
          <path d="M4.5 12a7.5 7.5 0 1 0 2.1-5.22"></path>
          <path d="M4.5 4.5v4h4"></path>
        </svg>
      </button>
    </header>

    <main ref="analysisScrollRef" class="analysis-main" @scroll="handleReportScroll">
      <section class="report-section" aria-label="报告分析">
        <div class="section-title">
          <span></span>
          <strong>AI 评估报告</strong>
          <span></span>
        </div>

        <section class="report-card">
          <div class="report-card__header">
            <span class="report-card__label">评估摘要</span>
            <h2>{{ reportTitle }}</h2>
            <p class="report-card__hint">{{ reportKeywordHint }}</p>
          </div>

          <div v-if="reportKeywordItems.length" class="keyword-section">
            <div class="keyword-cloud" aria-label="报告关键词">
              <span
                v-for="item in reportKeywordItems"
                :key="item.text"
                class="keyword-pill"
                :class="`keyword-pill--${item.tone}`"
              >
                {{ item.text }}
              </span>
            </div>
          </div>

          <div class="analysis-text">
            <p v-for="paragraph in typedParagraphs" :key="paragraph">{{ paragraph }}</p>
            <i v-if="typedText.length < reportNarrative.length" aria-hidden="true"></i>
          </div>
        </section>
      </section>
    </main>

    <footer class="chat-footer">
      <div class="quick-actions">
        <button v-for="item in quickActions" :key="item.label" type="button" @click="useQuickAction(item.label)">
          <component :is="item.icon" theme="outline" size="16" fill="currentColor" aria-hidden="true" />
          {{ item.label }}
        </button>
      </div>

      <div class="message-bar">
        <button class="voice-btn" type="button" aria-label="语音输入" @click="openVoiceAssistant">
          <span aria-hidden="true"></span>
        </button>
        <button class="camera-btn" type="button" aria-label="拍照或上传图片" @click="props.showToast('图片功能待接入')">
          <Camera theme="outline" size="23" fill="currentColor" aria-hidden="true" />
        </button>
        <input v-model="draft" type="text" placeholder="有任何报告问题，请随时问我～" @keyup.enter="sendMessage" />
        <button class="send-btn" type="button" @click="sendMessage">发送</button>
      </div>
    </footer>

    <AiConversationHistorySheet
      :open="isConversationHistoryOpen"
      :entries="assistantConversationHistory"
      :active-conversation-id="activeAssistantConversationId"
      @close="isConversationHistoryOpen = false"
      @create="createConversationFromHistory"
      @select="openConversationFromHistory"
    />
  </section>
</template>

<style scoped>
.analysis-page {
  position: relative;
  left: 50%;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  width: min(402px, 100vw);
  height: var(--ihc-page-min-height);
  min-height: var(--ihc-page-min-height);
  margin: -18px 0;
  overflow: hidden;
  background:
    radial-gradient(circle at 12% 7%, rgba(117, 214, 223, 0.26), transparent 25%),
    radial-gradient(circle at 88% 0%, rgba(123, 226, 142, 0.2), transparent 24%),
    linear-gradient(180deg, #eef5ff 0%, #f7fbff 46%, #eef4fb 100%);
  color: #1f2a44;
  font-family:
    "PingFang SC",
    "Hiragino Sans GB",
    "Noto Sans SC",
    "Microsoft YaHei UI",
    "Microsoft YaHei",
    sans-serif;
  transform: translateX(-50%);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.analysis-main {
  min-height: 0;
  padding: 0 14px 18px;
  box-sizing: border-box;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: none;
}

.analysis-main::-webkit-scrollbar {
  display: none;
}

.assistant-hero {
  position: relative;
  display: grid;
  grid-template-columns: 148px minmax(0, 1fr) 44px;
  align-items: start;
  min-height: 134px;
  padding: 8px 14px 0;
}

.assistant-back,
.history-btn,
.quick-actions button,
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

.history-btn {
  position: absolute;
  top: 12px;
  right: 0;
  z-index: 2;
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  padding: 0;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.74);
  box-shadow: 0 10px 24px rgba(65, 96, 136, 0.12);
}

.history-btn svg {
  width: 18px;
  height: 18px;
  fill: none;
  stroke: rgba(31, 42, 68, 0.78);
  stroke-width: 1.9;
  stroke-linecap: round;
  stroke-linejoin: round;
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
  font-weight: 600;
}

.welcome-bubble {
  grid-column: 2;
  min-height: 74px;
  margin: 24px 4px 0 0;
  padding: 12px 14px;
  border-radius: 17px;
  background: rgba(255, 255, 255, 0.78);
  box-shadow: 0 14px 32px rgba(61, 103, 152, 0.08);
  font-family: "PingFang SC", "Microsoft YaHei", "Noto Sans SC", "Source Han Sans SC", sans-serif;
  font-weight: 400;
}

.welcome-bubble strong {
  display: block;
  color: #25305a;
  font-size: 15px;
  font-weight: 400;
  line-height: 1.35;
}

.welcome-bubble p {
  margin: 8px 0 0;
  color: rgba(90, 102, 126, 0.58);
  font-size: 13px;
  font-weight: 400;
  line-height: 1.55;
}

.report-section {
  padding: 4px 0 6px;
}

.section-title {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 10px;
  align-items: center;
  margin: 0 12px 12px;
}

.section-title span {
  height: 1px;
  background: rgba(84, 101, 134, 0.24);
}

.section-title strong {
  color: #1f2a44;
  font-size: 17px;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.report-card {
  padding: 14px;
  border-radius: 24px;
  background:
    radial-gradient(circle at 14% 0%, rgba(117, 214, 223, 0.28), transparent 28%),
    radial-gradient(circle at 86% 4%, rgba(190, 45, 234, 0.14), transparent 30%),
    rgba(255, 255, 255, 0.62);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.7);
}

.report-card__header {
  margin-bottom: 14px;
}

.report-card__label {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 0 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.86);
  color: #4f6b8d;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.04em;
}

.report-card h2 {
  margin: 10px 0 0;
  color: #25305a;
  font-size: 18px;
  font-weight: 700;
}

.report-card__hint {
  margin: 8px 0 0;
  color: rgba(86, 98, 124, 0.66);
  font-size: 13px;
  line-height: 1.6;
}

.keyword-section {
  margin-bottom: 14px;
}

.keyword-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.keyword-pill {
  display: inline-flex;
  align-items: center;
  max-width: 100%;
  min-height: 34px;
  padding: 8px 14px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 8px 18px rgba(76, 108, 151, 0.06);
  color: #27939a;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.35;
  text-wrap: pretty;
}

.keyword-pill--warning {
  background: rgba(234, 242, 255, 0.94);
  color: #4568da;
}

.keyword-pill--muted {
  background: rgba(246, 248, 252, 0.95);
  color: #5f6a83;
}

.analysis-text {
  min-height: 0;
  padding: 18px 16px 22px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 10px 18px rgba(76, 108, 151, 0.08);
}

.analysis-text p {
  margin: 0 0 14px;
  color: rgba(45, 55, 79, 0.8);
  font-size: 14px;
  font-weight: 500;
  line-height: 1.82;
  text-align: justify;
  text-wrap: pretty;
}

.analysis-text p:last-of-type {
  margin-bottom: 0;
}

.analysis-text i {
  display: inline-block;
  width: 7px;
  height: 17px;
  margin-left: 2px;
  border-radius: 999px;
  background: #75d6df;
  vertical-align: -3px;
  animation: blink-cursor 0.82s steps(2, start) infinite;
}

@keyframes blink-cursor {
  50% {
    opacity: 0;
  }
}

.chat-footer {
  position: relative;
  z-index: 1;
  padding: 10px 16px 14px;
  background:
    linear-gradient(180deg, rgba(238, 245, 255, 0) 0%, rgba(238, 245, 255, 0.88) 26px, rgba(238, 245, 255, 0.98) 100%);
  backdrop-filter: blur(10px);
}

.quick-actions {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
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
  font-size: 13px;
  font-weight: 600;
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

.voice-btn span {
  position: relative;
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
  font-weight: 400;
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
  font-weight: 600;
}
</style>
