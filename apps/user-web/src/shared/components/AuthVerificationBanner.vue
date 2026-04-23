<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";

const props = withDefaults(
  defineProps<{
    code: string;
    phone?: string;
    title?: string;
    hint?: string;
    variant?: "inline" | "floating";
    autoDismissSeconds?: number;
  }>(),
  {
    phone: "",
    title: "验证码",
    hint: "",
    variant: "inline",
    autoDismissSeconds: 0
  }
);

const emit = defineEmits<{
  copied: [];
  copyFailed: [];
  dismissed: [];
}>();

const copied = ref(false);
const isVisible = ref(Boolean(props.code));
const dismissCountdown = ref(0);
let copiedTimer = 0;
let dismissTimer = 0;

const maskedPhone = computed(() => {
  if (!props.phone || props.phone.length !== 11) {
    return "";
  }

  return `${props.phone.slice(0, 3)}****${props.phone.slice(-4)}`;
});

function resetCopiedState() {
  window.clearTimeout(copiedTimer);
  copied.value = false;
}

function clearDismissTimer() {
  window.clearInterval(dismissTimer);
  dismissCountdown.value = 0;
}

function dismissBanner() {
  clearDismissTimer();
  isVisible.value = false;
  emit("dismissed");
}

function startDismissCountdown() {
  clearDismissTimer();

  if (props.autoDismissSeconds <= 0) {
    return;
  }

  dismissCountdown.value = props.autoDismissSeconds;
  dismissTimer = window.setInterval(() => {
    if (dismissCountdown.value <= 1) {
      dismissBanner();
      return;
    }

    dismissCountdown.value -= 1;
  }, 1000);
}

function fallbackCopy(text: string) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  textarea.style.pointerEvents = "none";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();

  const succeeded = document.execCommand("copy");
  document.body.removeChild(textarea);

  if (!succeeded) {
    throw new Error("copy failed");
  }
}

async function copyCode() {
  if (!props.code) {
    return;
  }

  try {
    if (navigator.clipboard?.writeText && window.isSecureContext) {
      await navigator.clipboard.writeText(props.code);
    } else {
      fallbackCopy(props.code);
    }

    copied.value = true;
    emit("copied");
    window.clearTimeout(copiedTimer);
    copiedTimer = window.setTimeout(() => {
      copied.value = false;
    }, 1800);
  } catch {
    emit("copyFailed");
  }
}

watch(
  () => props.code,
  (code) => {
    isVisible.value = Boolean(code);
    resetCopiedState();

    if (!code) {
      clearDismissTimer();
      return;
    }

    startDismissCountdown();
  },
  {
    immediate: true
  }
);

onBeforeUnmount(() => {
  resetCopiedState();
  clearDismissTimer();
});
</script>

<template>
  <aside
    v-if="isVisible"
    class="verification-banner"
    :class="{
      'verification-banner--floating': variant === 'floating'
    }"
    role="status"
    aria-live="polite"
  >
    <div class="verification-banner__header">
      <span class="verification-banner__label">{{ title }}</span>
      <div class="verification-banner__meta">
        <span
          v-if="dismissCountdown > 0"
          class="verification-banner__countdown"
        >{{ dismissCountdown }}s</span>
        <span v-if="maskedPhone" class="verification-banner__phone">已发送至 {{ maskedPhone }}</span>
      </div>
    </div>

    <div class="verification-banner__content">
      <strong class="verification-banner__code">{{ code }}</strong>
      <button class="verification-banner__copy" type="button" @click="copyCode">
        {{ copied ? "已复制" : "复制验证码" }}
      </button>
    </div>

    <p v-if="hint" class="verification-banner__hint">{{ hint }}</p>
  </aside>
</template>

<style scoped>
.verification-banner {
  margin-top: 10px;
  padding: 14px 16px 15px;
  border: 1px solid rgba(102, 112, 240, 0.14);
  border-radius: 18px;
  background:
    radial-gradient(circle at top right, rgba(102, 112, 240, 0.16), transparent 42%),
    linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(246, 248, 255, 0.96));
  box-shadow: 0 18px 40px rgba(105, 116, 188, 0.14);
}

.verification-banner--floating {
  position: absolute;
  top: 78px;
  right: 20px;
  left: 20px;
  z-index: 24;
  margin-top: 0;
  border-color: rgba(102, 112, 240, 0.2);
  box-shadow: 0 18px 42px rgba(92, 104, 180, 0.24);
  backdrop-filter: blur(18px);
}

.verification-banner__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.verification-banner__label,
.verification-banner__countdown,
.verification-banner__phone {
  color: #59637e;
  font-size: 12px;
  letter-spacing: 0.08em;
}

.verification-banner__label {
  display: inline-flex;
  align-items: center;
  padding: 5px 9px;
  border-radius: 999px;
  background: rgba(102, 112, 240, 0.1);
  color: #6270f4;
  font-weight: 700;
}

.verification-banner__meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.verification-banner__countdown {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 34px;
  padding: 4px 8px;
  border-radius: 999px;
  background: rgba(32, 40, 64, 0.08);
  color: #44506d;
  font-weight: 700;
}

.verification-banner__phone {
  text-align: right;
}

.verification-banner__content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 12px;
}

.verification-banner__code {
  color: #202840;
  font-size: 28px;
  font-weight: 700;
  letter-spacing: 0.22em;
}

.verification-banner__copy {
  flex: 0 0 auto;
  min-width: 96px;
  padding: 10px 14px;
  border: 0;
  border-radius: 12px;
  background: linear-gradient(135deg, #6670f0, #7f88ff);
  box-shadow: 0 12px 24px rgba(102, 112, 240, 0.2);
  color: #ffffff;
  font-size: 13px;
  font-weight: 600;
}

.verification-banner__hint {
  margin: 10px 0 0;
  color: #7b859d;
  font-size: 12px;
  line-height: 1.5;
}

@media (max-width: 389px) {
  .verification-banner {
    padding-right: 14px;
    padding-left: 14px;
  }

  .verification-banner--floating {
    right: 14px;
    left: 14px;
  }

  .verification-banner__header {
    align-items: flex-start;
    flex-direction: column;
  }

  .verification-banner__meta {
    width: 100%;
    justify-content: space-between;
  }

  .verification-banner__content {
    align-items: flex-start;
    flex-direction: column;
  }

  .verification-banner__code {
    font-size: 24px;
  }

  .verification-banner__copy {
    width: 100%;
  }
}
</style>
