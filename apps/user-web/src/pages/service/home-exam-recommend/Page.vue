<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import type { PageComponentProps } from "@ihc/page-core/types";
import { Alignment, Fit, Layout, Rive, StateMachineInputType, type StateMachineInput } from "@rive-app/canvas";
import { Camera, Commodity, Editor, Stethoscope } from "@icon-park/vue-next";
import assistantRiveUrl from "@/assets/home/sections/assistant.riv?url";
import AiConversationHistorySheet from "@/shared/ai/components/AiConversationHistorySheet.vue";
import { prepareAiServiceScene } from "@/shared/ai/runtime";
import {
  activeAssistantConversationId,
  assistantConversationHistory,
  getAiServiceRecommendationResult,
  requestAssistantTextEntry,
  requestAssistantVoiceEntry,
  setActiveAssistantConversation
} from "@/shared/ai/state";
import mock from "./mock";
import { setOrderFlowService } from "@/pages/service/order-flow";

const props = defineProps<PageComponentProps>();

interface ProjectCard {
  serviceId: string;
  title: string;
  reason: string;
  imageUrl: string;
  regionScope: string[];
  priceLabel?: string;
}

const STATE_MACHINE_NAME = "State Machine 1";
const BLINK_TRIGGER_NAME = "blinkTrigger";
const canvasRef = ref<HTMLCanvasElement | null>(null);
const draft = ref("");
const isConversationHistoryOpen = ref(false);
const serviceResult = getAiServiceRecommendationResult("home-exam");
const quickActions = [
  { label: "报告解读", icon: Editor },
  { label: "商品智选", icon: Commodity },
  { label: "体检定制", icon: Stethoscope }
];

const projectList = computed<ProjectCard[]>(() => {
  if (serviceResult.value?.recommendations.length) {
    return serviceResult.value.recommendations.map((item) => ({
      serviceId: item.serviceId,
      title: item.title,
      reason: item.reason,
      imageUrl: item.imageUrl,
      regionScope: item.regionScope,
      priceLabel: item.priceLabel
    }));
  }

  return mock.projects.map((item) => ({
    serviceId: item.id,
    title: item.name,
    reason: item.desc,
    imageUrl: item.image,
    regionScope: []
  }));
});

const pageIntro = computed(() => {
  return (
    serviceResult.value?.healthSummary?.summary ||
    serviceResult.value?.conclusion ||
    "已根据您的体检需求，为您筛选出更适合的上门体检项目。您可以先查看推荐理由，再选择需要预约的项目。"
  );
});

const summarySignals = computed(() => {
  return [
    ...(serviceResult.value?.matchingSignals ?? []),
    ...(serviceResult.value?.metricBrief?.keyFindings ?? [])
  ].slice(0, 6);
});

const bookingPrefill = computed(() => serviceResult.value?.bookingPrefill || null);
const knowledgeResults = computed(() => serviceResult.value?.knowledgeResults ?? []);

let riveInstance: Rive | null = null;
let blinkTrigger: StateMachineInput | null = null;
let blinkTimer: ReturnType<typeof setTimeout> | null = null;
let resizeObserver: ResizeObserver | null = null;

function goBack() {
  if (!props.navigation.navigateBack()) {
    props.navigation.reLaunch("service/home-exam");
  }
}

function buyProject(item: (typeof mock.projects)[number]) {
  setOrderFlowService({
    type: "exam",
    serviceId: "srv_exam_basic",
    title: item.name,
    price: 399,
    image: item.image,
    detailPageId: "service/home-exam-detail",
    listPageId: "service/home-exam",
    couponAmount: 20,
    addressId: "addr_joy_home",
    addressText: "上海市上海市浦东新区丁香路168弄12号302",
    contactName: "王秀琴",
    contactPhone: "13800138000"
  });
  props.navigation.navigateTo("service/booking");
}

function useQuickAction(label: string) {
  if (label === "报告解读") {
    props.navigation.navigateTo("orders/checkup-ai-waiting");
    return;
  }

  if (label === "商品智选") {
    props.navigation.navigateTo("home/assistant-chat");
    return;
  }

  if (label === "体检定制") {
    props.navigation.navigateTo("service/home-care-recommend-waiting");
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

onMounted(() => {
  if (!serviceResult.value) {
    void prepareAiServiceScene("home-exam").catch((error) => {
      props.showToast(error instanceof Error ? error.message : "AI 推荐加载失败");
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
  resizeObserver?.disconnect();
  resizeObserver = null;
  blinkTrigger = null;
  riveInstance?.cleanup();
  riveInstance = null;
});
</script>

<template>
  <section class="recommend-page">
    <main class="recommend-main">
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
          <strong>这是我为您推荐的项目</strong>
          <p>推荐仅供参考，您可以根据实际需求继续调整</p>
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

      <section class="project-section" aria-label="项目推荐">
        <div class="section-title">
          <span></span>
          <strong>项目推荐</strong>
          <span></span>
        </div>

        <div class="section">
          <p>{{ pageIntro }}</p>
        </div>

        <div v-if="summarySignals.length" class="signal-section">
          <span v-for="signal in summarySignals" :key="signal">{{ signal }}</span>
        </div>

        <section class="project-card">
          <article v-for="item in projectList" :key="item.serviceId" class="project-item">
            <img :src="item.imageUrl" :alt="item.title" />
            <div class="project-info">
              <h2>{{ item.title }}</h2>
              <p>{{ item.reason }}</p>
              <small v-if="item.priceLabel">参考价：{{ item.priceLabel }}</small>
              <small v-if="item.regionScope.length">服务区域：{{ item.regionScope.join(" / ") }}</small>
              <button type="button" @click="buyProject">立即预约</button>
            </div>
          </article>
        </section>

        <section v-if="bookingPrefill || knowledgeResults.length" class="insight-card">
          <article v-if="bookingPrefill" class="insight-block">
            <strong>预约草稿</strong>
            <p>{{ bookingPrefill.title || "已生成预约建议" }}</p>
            <span v-if="bookingPrefill.suggestedSlots.length">
              建议时段：{{ bookingPrefill.suggestedSlots.join("、") }}
            </span>
            <span v-if="bookingPrefill.missingFields.length">
              仍需补充：{{ bookingPrefill.missingFields.join("、") }}
            </span>
          </article>

          <article v-if="knowledgeResults.length" class="insight-block">
            <strong>体检提示</strong>
            <p v-for="item in knowledgeResults" :key="item.citation.chunkId">
              {{ item.document.title }}
            </p>
          </article>
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
        <input v-model="draft" type="text" placeholder="有任何体检需求，请随时问我～" @keyup.enter="sendMessage" />
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
.recommend-page {
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

.recommend-main {
  height: calc(100% - 126px);
  padding: 8px 14px 0;
  box-sizing: border-box;
  overflow-y: auto;
  scrollbar-width: none;
}

.recommend-main::-webkit-scrollbar {
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
.project-item button,
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

.project-section {
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

.section p {
  margin: 0 0 12px;
  padding: 0 0 0 2px;
  color: rgba(45, 55, 79, 0.68);
  font-size: 17px;
  font-weight: 800;
  line-height: 1.75;
  text-align: justify;
}

.signal-section {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 14px;
}

.signal-section span {
  padding: 7px 12px;
  border-radius: 999px;
  background: rgba(117, 214, 223, 0.16);
  color: #2f89a6;
  font-size: 12px;
  font-weight: 900;
}

.project-card,
.insight-card {
  display: grid;
  gap: 10px;
  padding: 14px;
  border-radius: 6px;
  background:
    radial-gradient(circle at 14% 0%, rgba(117, 214, 223, 0.28), transparent 28%),
    radial-gradient(circle at 86% 4%, rgba(190, 45, 234, 0.14), transparent 30%),
    rgba(255, 255, 255, 0.62);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.7);
}

.insight-card {
  margin-top: 16px;
}

.project-item,
.insight-block {
  display: grid;
  gap: 12px;
  padding: 10px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 10px 18px rgba(76, 108, 151, 0.08);
}

.project-item {
  grid-template-columns: 86px minmax(0, 1fr);
  min-height: 112px;
}

.project-item img {
  width: 86px;
  height: 92px;
  border-radius: 10px;
  object-fit: cover;
}

.project-info {
  min-width: 0;
  display: grid;
  align-content: start;
}

.project-info h2,
.insight-block strong {
  margin: 0;
  color: #25305a;
  font-size: 15px;
  font-weight: 900;
  line-height: 1.35;
}

.project-info p,
.insight-block p {
  margin: 6px 0 0;
  color: rgba(63, 75, 99, 0.68);
  font-size: 12px;
  font-weight: 800;
  line-height: 1.55;
}

.project-info small,
.insight-block span {
  display: block;
  margin-top: 8px;
  color: rgba(48, 52, 63, 0.56);
  font-size: 12px;
  font-weight: 800;
  line-height: 1.5;
}

.project-item button {
  justify-self: end;
  align-self: end;
  height: 30px;
  padding: 0 14px;
  border-radius: 999px;
  background: #75d6df;
  color: #1f2a44;
  font-size: 13px;
  font-weight: 900;
  box-shadow: 0 8px 16px rgba(78, 169, 171, 0.16);
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
