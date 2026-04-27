<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import type { PageComponentProps } from "@ihc/page-core/types";
import { Alignment, Fit, Layout, Rive, StateMachineInputType, type StateMachineInput } from "@rive-app/canvas";
import { Camera, Commodity, Editor, Stethoscope } from "@icon-park/vue-next";
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
const draft = ref("");
const typedText = ref("");
const isConversationHistoryOpen = ref(false);
const quickActions = [
  { label: "报告解读", icon: Editor },
  { label: "商品智选", icon: Commodity },
  { label: "体检定制", icon: Stethoscope }
];

const reportState = aiReportAnalysisState;
const typedParagraphs = computed(() => typedText.value.split("\n\n").filter(Boolean));
const reportTitle = computed(() => reportState.value?.reportTitle || "体检报告");
const reportHighlights = computed(() => reportState.value?.highlights.slice(0, 4) ?? []);
const reportNarrative = computed(() => {
  const paragraphs = [
    reportState.value?.interpretation || "",
    ...(reportState.value?.summaryLines ?? []),
    ...(reportState.value?.followUpSuggestions.length
      ? [`后续建议：${reportState.value.followUpSuggestions.join("；")}`]
      : [])
  ].filter(Boolean);

  return paragraphs.join("\n\n");
});

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

  if (label === "商品智选") {
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

  if (!reportNarrative.value) {
    return;
  }

  typingTimer = setTimeout(typeNextChunk, 180);
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

watch(reportNarrative, restartTyping, { immediate: true });

onMounted(() => {
  if (!reportState.value) {
    void (async () => {
      const reportId = selectedAiReportId.value || (await resolveAiReportId());

      if (!reportId) {
        throw new Error("暂无可用于 AI 解读的体检报告");
      }

      await prepareAiReportAnalysis(reportId);
    })().catch((error) => {
      props.showToast(error instanceof Error ? error.message : "AI 报告解读加载失败");
    });
  }

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
    <main class="analysis-main">
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
          <strong>您好！我是豆沙包</strong>
          <strong>正在为您解读报告。</strong>
          <p>分析仅供参考，医学建议请询问专业医生</p>
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

      <section class="report-section" aria-label="报告分析">
        <div class="section-title">
          <span></span>
          <strong>报告分析</strong>
          <span></span>
        </div>

        <section class="report-card">
          <h2>{{ reportTitle }}</h2>
          <div class="metric-grid">
            <span
              v-for="item in reportHighlights.length ? reportHighlights : ['AI 正在提取报告重点']"
              :key="item"
              :class="{ warning: item.includes('高') || item.includes('风险') || item.includes('异常') }"
            >
              {{ item }}
            </span>
          </div>
          <div class="analysis-text">
            <p v-for="paragraph in typedParagraphs" :key="paragraph">{{ paragraph }}</p>
            <i v-if="typedText.length < reportNarrative.length" aria-hidden="true"></i>
          </div>
        </section>

        <section v-if="reportState?.riskSignals.length || reportState?.latestRiskAlert" class="risk-card">
          <strong>风险提醒</strong>
          <p v-for="signal in reportState?.riskSignals ?? []" :key="signal">{{ signal }}</p>
          <div v-if="reportState?.latestRiskAlert" class="risk-card__detail">
            <span>{{ reportState.latestRiskAlert.title }}</span>
            <p>{{ reportState.latestRiskAlert.summary }}</p>
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
  width: min(402px, 100vw);
  height: auto;
  min-height: var(--ihc-page-min-height);
  max-height: none;
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

.analysis-main {
  height: calc(100% - 126px);
  padding: 8px 14px 0;
  box-sizing: border-box;
  overflow-y: auto;
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
  padding-top: 8px;
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

.report-section {
  margin-top: -28px;
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
  font-weight: 900;
  letter-spacing: 0.08em;
}

.report-card,
.risk-card {
  padding: 14px;
  border-radius: 6px;
  background:
    radial-gradient(circle at 14% 0%, rgba(117, 214, 223, 0.28), transparent 28%),
    radial-gradient(circle at 86% 4%, rgba(190, 45, 234, 0.14), transparent 30%),
    rgba(255, 255, 255, 0.62);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.7);
}

.risk-card {
  margin-top: 16px;
}

.report-card h2,
.risk-card strong {
  margin: 0 0 12px;
  color: #25305a;
  font-size: 18px;
  font-weight: 900;
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  margin-bottom: 13px;
}

.metric-grid span {
  min-height: 32px;
  display: grid;
  place-items: center;
  padding: 0 10px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.88);
  color: #2b9fa9;
  font-size: 13px;
  font-weight: 900;
  text-align: center;
}

.metric-grid .warning {
  color: #006dff;
}

.analysis-text,
.risk-card__detail {
  min-height: 160px;
  padding: 14px 13px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 10px 18px rgba(76, 108, 151, 0.08);
}

.risk-card__detail {
  min-height: 0;
  margin-top: 12px;
}

.analysis-text p,
.risk-card p {
  margin: 0 0 12px;
  color: rgba(45, 55, 79, 0.78);
  font-size: 14px;
  font-weight: 800;
  line-height: 1.72;
  text-align: justify;
}

.risk-card p:last-of-type,
.analysis-text p:last-of-type {
  margin-bottom: 0;
}

.risk-card__detail span {
  display: block;
  color: #25305a;
  font-size: 14px;
  font-weight: 900;
}

.risk-card__detail p {
  margin-top: 8px;
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
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  padding: 0 16px 14px;
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
</style>
