<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { Alignment, Fit, Layout, Rive, StateMachineInputType, type StateMachineInput } from "@rive-app/canvas";
import assistantRiveUrl from "@/assets/home/sections/assistant.riv?url";

const emit = defineEmits<{
  open: [];
}>();

const STATE_MACHINE_NAME = "State Machine 1";
const LOOK_ANIMATION_NAME = "look";
const BLINK_TRIGGER_NAME = "blinkTrigger";
const MIN_BLINK_DELAY = 5000;
const MAX_BLINK_DELAY = 8000;
const DEBUG_RIVE = import.meta.env.DEV;

const canvasRef = ref<HTMLCanvasElement | null>(null);
const assistantRef = ref<HTMLButtonElement | null>(null);
const assistantPosition = ref({ x: 0, y: 0 });
const hasAssistantPosition = ref(false);
const isDragging = ref(false);

let riveInstance: Rive | null = null;
let blinkTrigger: StateMachineInput | null = null;
let blinkTimer: ReturnType<typeof setTimeout> | null = null;
let resizeObserver: ResizeObserver | null = null;
let dragPointerId: number | null = null;
let dragStartX = 0;
let dragStartY = 0;
let dragOriginX = 0;
let dragOriginY = 0;
let didDrag = false;

const assistantStyle = computed(() => {
  if (!hasAssistantPosition.value) {
    return {};
  }

  return {
    left: `${assistantPosition.value.x}px`,
    top: `${assistantPosition.value.y}px`,
    right: "auto",
    transform: "none",
  };
});

function getRandomBlinkDelay() {
  return Math.round(MIN_BLINK_DELAY + Math.random() * (MAX_BLINK_DELAY - MIN_BLINK_DELAY));
}

function clearBlinkTimer() {
  if (blinkTimer) {
    clearTimeout(blinkTimer);
    blinkTimer = null;
  }
}

function bindStateMachineInputs() {
  const inputs = riveInstance?.stateMachineInputs(STATE_MACHINE_NAME) ?? [];
  blinkTrigger =
      inputs.find((input) => input.name === BLINK_TRIGGER_NAME) ?? null;

  if (DEBUG_RIVE && !blinkTrigger) {
    console.warn("[FloatingAssistant] 未找到 blinkTrigger，请检查 Rive 文件内 State Machine 的 input 名称和类型。", {
      stateMachines: riveInstance?.stateMachineNames ?? [],
      inputs: inputs.map((input) => ({ name: input.name, type: input.type })),
    });
  }
}

function playLook() {
  riveInstance?.play(STATE_MACHINE_NAME);
}

function triggerBlink() {
  if (!blinkTrigger) {
    bindStateMachineInputs();
  }

  if (blinkTrigger) {
    blinkTrigger.fire();
    return true;
  }

  if (DEBUG_RIVE) {
    console.warn(`[FloatingAssistant] ${BLINK_TRIGGER_NAME} 未触发，可能是 input 不存在或不是 Trigger 类型。`);
  }

  return false;
}

function scheduleBlink() {
  clearBlinkTimer();
  blinkTimer = setTimeout(() => {
    triggerBlink();
    scheduleBlink();
  }, getRandomBlinkDelay());
}

function openAssistant() {
  triggerBlink();
  emit("open");
}

function resizeRive() {
  riveInstance?.resizeDrawingSurfaceToCanvas();
}

function syncInitialPosition() {
  const assistant = assistantRef.value;

  if (!assistant || hasAssistantPosition.value) {
    return;
  }

  const rect = assistant.getBoundingClientRect();
  assistantPosition.value = {
    x: rect.left,
    y: rect.top,
  };
  hasAssistantPosition.value = true;
}

function handlePointerDown(event: PointerEvent) {
  const assistant = assistantRef.value;

  if (!assistant) {
    return;
  }

  syncInitialPosition();
  isDragging.value = true;
  didDrag = false;
  dragPointerId = event.pointerId;
  dragStartX = event.clientX;
  dragStartY = event.clientY;
  dragOriginX = assistantPosition.value.x;
  dragOriginY = assistantPosition.value.y;
  assistant.setPointerCapture(event.pointerId);
}

function handlePointerMove(event: PointerEvent) {
  if (!isDragging.value || event.pointerId !== dragPointerId) {
    return;
  }

  const deltaX = event.clientX - dragStartX;
  const deltaY = event.clientY - dragStartY;

  if (Math.hypot(deltaX, deltaY) > 4) {
    didDrag = true;
  }

  assistantPosition.value = {
    x: dragOriginX + deltaX,
    y: dragOriginY + deltaY,
  };
}

function handlePointerUp(event: PointerEvent) {
  if (event.pointerId !== dragPointerId) {
    return;
  }

  assistantRef.value?.releasePointerCapture(event.pointerId);
  isDragging.value = false;
  dragPointerId = null;
}

function handleAssistantClick(event: MouseEvent) {
  if (didDrag) {
    event.preventDefault();
    event.stopPropagation();
    didDrag = false;
    return;
  }

  openAssistant();
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

      if (DEBUG_RIVE) {
        console.info("[FloatingAssistant] Rive 已加载。", {
          look: LOOK_ANIMATION_NAME,
          stateMachines: riveInstance?.stateMachineNames ?? [],
          blinkReady: Boolean(blinkTrigger),
        });
      }
    },
  });

  resizeObserver = new ResizeObserver(resizeRive);
  resizeObserver.observe(canvas);
  syncInitialPosition();
});

onBeforeUnmount(() => {
  clearBlinkTimer();
  resizeObserver?.disconnect();
  resizeObserver = null;
  blinkTrigger = null;
  riveInstance?.cleanup();
  riveInstance = null;
});

defineExpose({
  triggerBlink,
  openAssistant,
});
</script>

<template>
  <button
    ref="assistantRef"
    class="floating-assistant"
    :class="{ 'floating-assistant--dragging': isDragging }"
    :style="assistantStyle"
    type="button"
    aria-label="AI 助手"
    @click="handleAssistantClick"
    @pointerdown="handlePointerDown"
    @pointermove="handlePointerMove"
    @pointerup="handlePointerUp"
    @pointercancel="handlePointerUp"
  >
    <canvas ref="canvasRef" class="floating-assistant__canvas" width="132" height="132"></canvas>
  </button>
</template>

<style scoped>
.floating-assistant {
  position: fixed;
  top: 70%;
  right: -50px;
  z-index: 15;
  display: grid;
  place-items: center;
  width: 200px;
  height: 200px;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
  transform: translateY(-70%);
  touch-action: none;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}

.floating-assistant--dragging {
  cursor: grabbing;
}

.floating-assistant__canvas {
  display: block;
  width: 200px;
  height: 200px;
  filter: drop-shadow(8px 13px 20px rgba(41, 41, 51, 0.6));
  pointer-events: none;
}
</style>
