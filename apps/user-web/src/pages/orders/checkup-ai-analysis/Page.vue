<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
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
const isConversationHistoryOpen = ref(false);
const quickActions = [
  { label: "报告解读", icon: Editor },
  { label: "商品智选", icon: Commodity },
  { label: "体检定制", icon: Stethoscope }
];

const reportState = aiReportAnalysisState;

type ReportKeywordTone = "brand" | "warning" | "muted";

interface ReportKeywordItem {
  text: string;
  tone: ReportKeywordTone;
}

function uniqueStrings(items: string[]) {
  return Array.from(new Set(items.filter((item) => item.trim().length > 0)));
}

function normalizeReportText(value: string) {
  return value
    .replace(/^[\s•·\-]+/u, "")
    .replace(/^[（(]?\d+[）).、]\s*/u, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeKeywordText(value: string) {
  return normalizeReportText(value)
    .replace(/^(内容评估|风险提醒|后续建议|后续跟进|建议|当前重点|体检结论|检查结论|结论|摘要|提示|需关注)[：:]\s*/u, "")
    .replace(/[。；;、，,]+$/u, "")
    .trim();
}

function splitKeywordCandidates(value: string) {
  const normalized = normalizeKeywordText(value);

  if (!normalized) {
    return [];
  }

  const segments = normalizeReportText(normalized)
    .split(/[；;、，,]/u)
    .map((item) => normalizeKeywordText(item))
    .filter(Boolean);
  const nextSegments = segments.length > 1 ? segments : [normalized];

  return nextSegments.filter((item) => item.length >= 2 && item.length <= 18);
}

function buildKeywordList(
  values: string[],
  limit = 4
) {
  const list: string[] = [];

  for (const value of values) {
    for (const item of splitKeywordCandidates(value)) {
      if (list.includes(item)) {
        continue;
      }

      list.push(item);

      if (list.length >= limit) {
        return list;
      }
    }
  }

  return list;
}

function ensureReportSentence(value: string) {
  const normalized = normalizeKeywordText(value);

  if (!normalized) {
    return "";
  }

  return /[。！？!?]$/u.test(normalized) ? normalized : `${normalized}。`;
}

function isDisplayEvaluationLine(value: string) {
  return !/^(检查机构|检查科室|医院|科室)[：:]/u.test(value.trim());
}

const reportTitle = computed(() => reportState.value?.reportTitle || "体检报告");
const riskSignals = computed(() => {
  const latestAlertSummary = reportState.value?.latestRiskAlert?.summary?.trim() || "";

  return (reportState.value?.riskSignals ?? []).filter(
    (item) => item.trim().length > 0 && item.trim() !== latestAlertSummary
  );
});
const evaluationSummary = computed(() => {
  const currentState = reportState.value;

  if (!currentState) {
    return "AI 正在整理本次体检报告，请稍候查看正式评估内容。";
  }

  return (
    currentState.evaluationSummary?.trim() ||
    ensureReportSentence(currentState.interpretation) ||
    "本次体检报告已完成智能评估，建议结合既往病史持续观察重点指标变化。"
  );
});
const evaluationPoints = computed(() => {
  const currentState = reportState.value;

  if (!currentState) {
    return [];
  }

  const fallbackItems = uniqueStrings([
    ...(currentState.highlights ?? []),
    ...((currentState.summaryLines ?? []).filter((item) => isDisplayEvaluationLine(item)))
  ]);
  const items = currentState.evaluationPoints?.length
    ? currentState.evaluationPoints
    : fallbackItems;

  return uniqueStrings(items.map((item) => ensureReportSentence(item)).filter(Boolean)).slice(0, 3);
});
const riskReminderItems = computed(() => {
  const currentState = reportState.value;
  const items = currentState?.riskReminderItems?.length
    ? currentState.riskReminderItems
    : riskSignals.value;

  if (items.length === 0) {
    return ["当前未识别到需要立即处置的高风险提示，建议继续保持规律监测。"];
  }

  return uniqueStrings(items.map((item) => ensureReportSentence(item)).filter(Boolean)).slice(0, 3);
});
const followUpItems = computed(() => {
  const currentState = reportState.value;
  const items = currentState?.followUpItems?.length
    ? currentState.followUpItems
    : currentState?.followUpSuggestions ?? [];

  if (items.length === 0) {
    return ["建议按既定周期复查重点指标，并在出现不适或指标波动时及时咨询医生。"];
  }

  return uniqueStrings(items.map((item) => ensureReportSentence(item)).filter(Boolean)).slice(0, 3);
});
const reportKeywordItems = computed<ReportKeywordItem[]>(() => {
  const currentState = reportState.value;

  if (!currentState) {
    return [];
  }

  const keywords = buildKeywordList([
    ...(currentState.keywords ?? []),
    ...(currentState.highlights ?? []),
    ...riskSignals.value,
    ...(currentState.followUpSuggestions ?? [])
  ]);

  return keywords.map((text) => {
    const tone: ReportKeywordTone = riskReminderItems.value.some((item) => item.includes(text))
      ? "warning"
      : currentState.keywords?.includes(text)
        ? "brand"
        : "muted";

    return {
      text,
      tone
    };
  });
});
const reportKeywordHint = computed(() =>
  reportKeywordItems.value.length > 0
    ? "保留 3-4 个重点关键词，便于快速查看本次报告结论。"
    : "AI 正在提炼本次评估关键词。"
);

let riveInstance: Rive | null = null;
let blinkTrigger: StateMachineInput | null = null;
let blinkTimer: ReturnType<typeof setTimeout> | null = null;
let resizeObserver: ResizeObserver | null = null;

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

    <main class="analysis-main">
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

          <div class="report-panels">
            <article class="report-panel">
              <div class="report-panel__header">
                <span class="report-panel__index">01</span>
                <div>
                  <h3>内容评估</h3>
                  <p>结合本次体检摘要与 AI 解读生成</p>
                </div>
              </div>

              <p class="report-panel__summary">{{ evaluationSummary }}</p>

              <div v-if="evaluationPoints.length" class="evaluation-list">
                <p v-for="item in evaluationPoints" :key="item">{{ item }}</p>
              </div>
            </article>

            <article class="report-panel report-panel--risk">
              <div class="report-panel__header">
                <span class="report-panel__index">02</span>
                <div>
                  <h3>风险提醒</h3>
                  <p>重点保留需要持续关注的风险信号</p>
                </div>
              </div>

              <ul class="risk-list">
                <li v-for="item in riskReminderItems" :key="item">
                  <span aria-hidden="true"></span>
                  <p>{{ item }}</p>
                </li>
              </ul>
            </article>

            <article class="report-panel report-panel--follow-up">
              <div class="report-panel__header">
                <span class="report-panel__index">03</span>
                <div>
                  <h3>后续建议</h3>
                  <p>建议按照轻重缓急逐项处理</p>
                </div>
              </div>

              <ol class="follow-up-list">
                <li v-for="item in followUpItems" :key="item">
                  <p>{{ item }}</p>
                </li>
              </ol>
            </article>
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
  padding: 0 14px 16px;
  box-sizing: border-box;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: none;
  scroll-padding-bottom: 20px;
}

.analysis-main::-webkit-scrollbar {
  display: none;
}

.assistant-hero {
  position: relative;
  display: grid;
  grid-template-columns: 132px minmax(0, 1fr) 40px;
  align-items: center;
  min-height: 112px;
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
  top: 10px;
  right: 0;
  z-index: 2;
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border-radius: 12px;
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
  width: 170px;
  height: 170px;
  margin: -12px 0 0 -18px;
  filter: drop-shadow(0 12px 18px rgba(50, 112, 167, 0.16));
}

.hi-badge {
  position: absolute;
  top: 42px;
  left: 96px;
  color: #95a6c0;
  font-size: 18px;
  font-weight: 600;
}

.welcome-bubble {
  grid-column: 2;
  align-self: center;
  min-height: 68px;
  margin: 14px 4px 0 0;
  padding: 12px 14px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.78);
  box-shadow: 0 14px 32px rgba(61, 103, 152, 0.08);
}

.welcome-bubble strong {
  display: block;
  color: #25305a;
  font-size: 15px;
  font-weight: 700;
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
  margin-top: -10px;
  padding: 0 0 8px;
}

.section-title {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 10px;
  align-items: center;
  margin: 0 12px 10px;
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
  padding: 14px 14px 16px;
  border-radius: 24px;
  background:
    radial-gradient(circle at 14% 0%, rgba(117, 214, 223, 0.28), transparent 28%),
    radial-gradient(circle at 86% 4%, rgba(116, 132, 255, 0.12), transparent 30%),
    rgba(255, 255, 255, 0.68);
  box-shadow:
    0 18px 34px rgba(74, 103, 142, 0.08),
    inset 0 0 0 1px rgba(255, 255, 255, 0.74);
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
  line-height: 1.55;
}

.keyword-section {
  margin-bottom: 12px;
}

.keyword-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.keyword-pill {
  display: inline-flex;
  align-items: center;
  max-width: 100%;
  min-height: 32px;
  padding: 7px 13px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 8px 18px rgba(76, 108, 151, 0.06);
  color: #27939a;
  font-size: 12px;
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

.report-panels {
  display: grid;
  gap: 12px;
}

.report-panel {
  padding: 14px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.93);
  box-shadow: 0 12px 26px rgba(76, 108, 151, 0.08);
}

.report-panel--risk {
  background: linear-gradient(180deg, rgba(247, 251, 255, 0.97) 0%, rgba(240, 246, 255, 0.95) 100%);
}

.report-panel--follow-up {
  background: linear-gradient(180deg, rgba(248, 252, 251, 0.97) 0%, rgba(242, 249, 247, 0.95) 100%);
}

.report-panel__header {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 12px;
  align-items: start;
  margin-bottom: 10px;
}

.report-panel__index {
  display: inline-grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 999px;
  background: rgba(117, 214, 223, 0.18);
  color: #2c8f98;
  font-size: 13px;
  font-weight: 700;
}

.report-panel__header h3 {
  margin: 0;
  color: #25305a;
  font-size: 16px;
  font-weight: 700;
}

.report-panel__header p {
  margin: 4px 0 0;
  color: rgba(86, 98, 124, 0.66);
  font-size: 12px;
  line-height: 1.5;
}

.report-panel__summary {
  margin: 0;
  color: rgba(43, 54, 80, 0.86);
  font-size: 14px;
  font-weight: 500;
  line-height: 1.82;
  text-align: justify;
  text-wrap: pretty;
}

.evaluation-list {
  display: grid;
  gap: 8px;
  margin-top: 12px;
}

.evaluation-list p {
  margin: 0;
  padding: 10px 12px;
  border-radius: 14px;
  background: rgba(245, 249, 255, 0.96);
  color: rgba(58, 70, 96, 0.84);
  font-size: 13px;
  line-height: 1.72;
  text-wrap: pretty;
}

.risk-list,
.follow-up-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.risk-list {
  display: grid;
  gap: 8px;
}

.risk-list li {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 10px;
  align-items: start;
  padding: 10px 12px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.82);
}

.risk-list span {
  width: 8px;
  height: 8px;
  margin-top: 7px;
  border-radius: 50%;
  background: #5b7be6;
}

.risk-list p,
.follow-up-list p {
  margin: 0;
  color: rgba(58, 70, 96, 0.84);
  font-size: 13px;
  line-height: 1.72;
  text-wrap: pretty;
}

.follow-up-list {
  display: grid;
  gap: 8px;
  counter-reset: follow-up;
}

.follow-up-list li {
  display: grid;
  grid-template-columns: 32px minmax(0, 1fr);
  gap: 10px;
  align-items: start;
  padding: 11px 12px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.84);
}

.follow-up-list li::before {
  counter-increment: follow-up;
  content: counter(follow-up, decimal-leading-zero);
  display: inline-grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: 12px;
  background: rgba(123, 226, 142, 0.18);
  color: #2c9660;
  font-size: 12px;
  font-weight: 700;
}

.chat-footer {
  position: relative;
  z-index: 1;
  padding: 8px 16px calc(14px + env(safe-area-inset-bottom, 0px));
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
