<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import type { PageComponentProps } from "@ihc/page-core/types";
import { Alignment, Fit, Layout, Rive, StateMachineInputType, type StateMachineInput } from "@rive-app/canvas";
import assistantRiveUrl from "@/assets/home/sections/assistant.riv?url";
import { getAiEvaluationWaitMs } from "./evaluation";
import { prepareAiReportAnalysis, resolveAiReportId } from "@/shared/ai/runtime";
import { selectedAiReportId } from "@/shared/ai/state";
import mock from "./mock";

const props = defineProps<PageComponentProps>();

const STATE_MACHINE_NAME = "State Machine 1";
const BLINK_TRIGGER_NAME = "blinkTrigger";
const progress = ref(0);
const canvasRef = ref<HTMLCanvasElement | null>(null);
const progressStyle = computed(() => ({ width: `${progress.value}%` }));

let riveInstance: Rive | null = null;
let blinkTrigger: StateMachineInput | null = null;
let blinkTimer: ReturnType<typeof setTimeout> | null = null;
let finishTimer: ReturnType<typeof setTimeout> | null = null;
let progressFrame: number | null = null;
let resizeObserver: ResizeObserver | null = null;
let startTime = 0;
let destroyed = false;

function goBack() {
  if (!props.navigation.navigateBack()) {
    props.navigation.reLaunch("orders/checkup-report");
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
  clearTimeout(blinkTimer ?? undefined);
  blinkTimer = setTimeout(() => {
    triggerBlink();
    scheduleBlink();
  }, 2600 + Math.random() * 2200);
}

function resizeRive() {
  riveInstance?.resizeDrawingSurfaceToCanvas();
}

function updateProgress() {
  const waitMs = getAiEvaluationWaitMs();
  const elapsed = performance.now() - startTime;
  progress.value = Math.min(99, Math.round((elapsed / waitMs) * 100));
  progressFrame = requestAnimationFrame(updateProgress);
}

function goToAnalysis() {
  progress.value = 100;
  props.navigation.redirectTo("orders/checkup-ai-analysis");
}

onMounted(() => {
  const waitMs = getAiEvaluationWaitMs();
  startTime = performance.now();
  progressFrame = requestAnimationFrame(updateProgress);
  void Promise.allSettled([
    (async () => {
      const reportId = selectedAiReportId.value || (await resolveAiReportId());

      if (!reportId) {
        throw new Error("暂无可用于 AI 解读的体检报告");
      }

      await prepareAiReportAnalysis(reportId);
    })(),
    new Promise<void>((resolve) => {
      finishTimer = setTimeout(() => resolve(), waitMs);
    })
  ]).then((results) => {
    if (destroyed) {
      return;
    }

    if (results[0].status === "rejected") {
      props.showToast(results[0].reason instanceof Error ? results[0].reason.message : "AI 报告解读生成失败");
    }

    goToAnalysis();
  });

  if (canvasRef.value) {
    riveInstance = new Rive({
      canvas: canvasRef.value,
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
    resizeObserver.observe(canvasRef.value);
  }
});

onBeforeUnmount(() => {
  destroyed = true;
  if (progressFrame !== null) {
    cancelAnimationFrame(progressFrame);
  }
  clearTimeout(finishTimer ?? undefined);
  clearTimeout(blinkTimer ?? undefined);
  resizeObserver?.disconnect();
  resizeObserver = null;
  blinkTrigger = null;
  riveInstance?.cleanup();
  riveInstance = null;
});
</script>

<template>
  <section class="ai-waiting-page">
    <header class="page-nav">
      <button class="back-btn" type="button" aria-label="返回" @click="goBack">
        <span aria-hidden="true"></span>
      </button>
      <h1>{{ mock.title }}</h1>
    </header>

    <main class="waiting-body">
      <canvas ref="canvasRef" class="assistant-canvas" width="220" height="220" aria-label="豆沙包助手"></canvas>
      <p>{{ mock.loadingText }}</p>
      <div class="progress-box" role="progressbar" :aria-valuenow="progress" aria-valuemin="0" aria-valuemax="100">
        <span :style="progressStyle"></span>
      </div>
      <strong>{{ progress }}%</strong>
    </main>
  </section>
</template>

<style scoped>
.ai-waiting-page {
  position: relative;
  left: 50%;
  width: min(402px, 100vw);
  height: auto;
  min-height: var(--ihc-page-min-height);
  max-height: none;
  margin: -18px 0;
  overflow: hidden;
  background:
    radial-gradient(circle at 18% 10%, rgba(117, 214, 223, 0.22), transparent 28%),
    radial-gradient(circle at 82% 18%, rgba(123, 226, 142, 0.16), transparent 26%),
    #ffffff;
  color: #30343f;
  font-family: var(--ihc-font-family);
  transform: translateX(-50%);
  -webkit-font-smoothing: antialiased;
}

.page-nav {
  display: flex;
  align-items: center;
  height: 74px;
  padding: 0 29px;
}

.back-btn {
  display: grid;
  place-items: center;
  width: 30px;
  height: 44px;
  padding: 0;
  border: 0;
  background: transparent;
}

.back-btn span {
  width: 14px;
  height: 14px;
  border-bottom: 4px solid #333333;
  border-left: 4px solid #333333;
  transform: rotate(45deg);
}

.page-nav h1 {
  margin: 0 0 0 9px;
  color: #30343f;
  font-size: 24px;
  font-weight: 500;
  letter-spacing: 0.03em;
}

.waiting-body {
  display: grid;
  justify-items: center;
  align-content: center;
  height: calc(100% - 74px);
  padding: 0 40px 70px;
}

.assistant-canvas {
  display: block;
  width: 220px;
  height: 220px;
  filter: drop-shadow(0 16px 18px rgba(46, 90, 132, 0.16));
}

.waiting-body p {
  margin: 14px 0 24px;
  color: #1f2a44;
  font-size: 18px;
  font-weight: 900;
  text-align: center;
}

.progress-box {
  width: 100%;
  height: 12px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(117, 214, 223, 0.18);
}

.progress-box span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(100deg, #75d6df 0%, #7be28e 100%);
  transition: width 0.18s ease;
}

.waiting-body strong {
  margin-top: 12px;
  color: #2b9fa9;
  font-size: 14px;
  font-weight: 900;
}
</style>
