<script setup lang="ts">
import { computed, onBeforeUnmount, reactive } from "vue";
import type { PageComponentProps } from "@ihc/page-core/types";
import { AuthVerificationBanner } from "@/shared/components";
import { sendSmsCode, verifyResetCode } from "@/shared/api/auth";
import {
  savePasswordResetVerificationState,
  setLastLoginPhone
} from "../session";
import mock from "./mock";

const props = defineProps<PageComponentProps>();
const phonePattern = /^1\d{10}$/;
let codeTimer = 0;

const state = reactive({
  phone: "",
  code: "",
  sendingCode: false,
  submitting: false,
  codeCountdown: 0,
  smsDebugCode: "",
  smsDebugPhone: ""
});

const canSubmit = computed(
  () => state.phone.trim().length > 0 && state.code.trim().length > 0 && !state.submitting
);
const sendCodeButtonText = computed(() => {
  if (state.sendingCode) {
    return "发送中...";
  }

  return state.codeCountdown > 0 ? `${state.codeCountdown}s 后重发` : "获取验证码";
});

function goBack() {
  if (!props.navigation.navigateBack()) {
    props.navigation.reLaunch("auth/login");
  }
}

function normalizePhone() {
  const normalizedPhone = state.phone.trim();

  if (!normalizedPhone) {
    throw new Error("请输入手机号码");
  }

  if (!phonePattern.test(normalizedPhone)) {
    throw new Error("请输入正确的 11 位手机号");
  }

  return normalizedPhone;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "请求失败，请稍后重试";
}

function startCodeCountdown() {
  state.codeCountdown = 60;
  window.clearInterval(codeTimer);
  codeTimer = window.setInterval(() => {
    if (state.codeCountdown <= 1) {
      window.clearInterval(codeTimer);
      state.codeCountdown = 0;
      return;
    }

    state.codeCountdown -= 1;
  }, 1000);
}

function handleCodeCopied() {
  props.showToast("验证码已复制");
}

function handleCodeCopyFailed() {
  props.showToast("复制失败，请手动输入验证码");
}

function dismissDebugCode() {
  state.smsDebugCode = "";
  state.smsDebugPhone = "";
}

async function getCode() {
  if (state.sendingCode || state.codeCountdown > 0) {
    return;
  }

  try {
    const phone = normalizePhone();
    state.sendingCode = true;

    const result = await sendSmsCode(phone, "password-reset");
    state.smsDebugCode = result.debugCode?.trim() || "";
    state.smsDebugPhone = state.smsDebugCode ? phone : "";
    startCodeCountdown();
    props.showToast(
      result.debugCode ? "验证码已发送，可在页面顶部直接复制" : "验证码已发送"
    );
  } catch (error) {
    props.showToast(getErrorMessage(error));
  } finally {
    state.sendingCode = false;
  }
}

async function submit() {
  if (state.submitting) {
    return;
  }

  try {
    const phone = normalizePhone();
    const code = state.code.trim();

    if (!code) {
      throw new Error("请输入验证码");
    }

    state.submitting = true;
    await verifyResetCode({
      phone,
      code
    });

    setLastLoginPhone(phone);
    savePasswordResetVerificationState({
      phone,
      code
    });
    props.showToast("验证成功，请设置新密码");
    window.setTimeout(() => {
      props.navigation.navigateTo("auth/reset-password");
    }, 220);
  } catch (error) {
    props.showToast(getErrorMessage(error));
  } finally {
    state.submitting = false;
  }
}

onBeforeUnmount(() => {
  window.clearInterval(codeTimer);
});
</script>

<template>
  <section class="forgot-page">
    <header class="forgot-nav">
      <button class="back-btn" type="button" aria-label="返回" @click="goBack">
        <span class="back-arrow" aria-hidden="true"></span>
      </button>
      <h1>{{ mock.title }}</h1>
    </header>

    <AuthVerificationBanner
      v-if="state.smsDebugCode"
      :code="state.smsDebugCode"
      :phone="state.smsDebugPhone"
      variant="floating"
      :auto-dismiss-seconds="10"
      @copied="handleCodeCopied"
      @copy-failed="handleCodeCopyFailed"
      @dismissed="dismissDebugCode"
    />

    <main class="forgot-content">
      <h2>{{ mock.heading }}</h2>
      <p class="forgot-subtitle">请先完成手机验证码校验，再进入新密码设置。</p>

      <form class="forgot-form" @submit.prevent="submit">
        <label class="forgot-field" for="forgotPhone">
          <span class="forgot-field__label">手机号</span>
          <input
            id="forgotPhone"
            v-model="state.phone"
            type="tel"
            maxlength="11"
            :disabled="state.submitting"
            :placeholder="mock.phonePlaceholder"
          />
        </label>

        <label class="forgot-field forgot-field--code" for="forgotCode">
          <span class="forgot-field__label">验证码</span>
          <input
            id="forgotCode"
            v-model="state.code"
            type="text"
            maxlength="6"
            :disabled="state.submitting"
            :placeholder="mock.codePlaceholder"
          />
          <button
            type="button"
            :disabled="state.sendingCode || state.codeCountdown > 0 || state.submitting"
            @click="getCode"
          >
            {{ sendCodeButtonText }}
          </button>
        </label>

        <button class="submit-btn" :class="{ 'submit-btn--active': canSubmit }" :disabled="state.submitting" type="submit">
          {{ state.submitting ? "验证中..." : "提交验证" }}
        </button>
      </form>
    </main>
  </section>
</template>

<style scoped>
.forgot-page {
  position: relative;
  left: 50%;
  width: min(390px, 100vw);
  height: auto;
  min-height: var(--ihc-page-min-height);
  max-height: none;
  margin: -18px 0;
  transform: translateX(-50%);
  overflow: hidden;
  background: linear-gradient(180deg, #d7ebff 0%, #f4f7ff 43%, #fbfbfd 100%);
  color: #303030;
}

.forgot-nav {
  display: flex;
  align-items: center;
  height: 70px;
  padding: 0 25px;
}

.back-btn {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  width: 27px;
  height: 40px;
  padding: 0;
  border: 0;
  background: transparent;
}

.back-arrow {
  width: 14px;
  height: 14px;
  border-bottom: 4px solid #333333;
  border-left: 4px solid #333333;
  transform: rotate(45deg);
}

.forgot-nav h1 {
  margin: 0 0 0 8px;
  color: #333333;
  font-size: 24px;
  font-weight: 500;
  letter-spacing: 0.02em;
}

.forgot-content {
  padding: 0 24px;
}

.forgot-content h2 {
  margin: 34px 0 0;
  color: #1f2842;
  font-size: 24px;
  font-weight: 500;
  line-height: 1.25;
  text-align: left;
}

.forgot-subtitle {
  margin: 12px 0 0;
  color: #7f8799;
  font-size: 15px;
  line-height: 1.65;
}

.forgot-form {
  margin-top: 30px;
  padding: 22px 18px 20px;
  border: 1px solid rgba(255, 255, 255, 0.68);
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.88);
  box-shadow: 0 24px 54px rgba(176, 188, 214, 0.16);
}

.forgot-field {
  display: flex;
  align-items: center;
  height: 84px;
  gap: 14px;
  border-bottom: 1px solid rgba(225, 229, 238, 0.86);
}

.forgot-field__label {
  flex: 0 0 68px;
  color: #6a738a;
  font-size: 15px;
  font-weight: 600;
}

.forgot-field input {
  flex: 1;
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: #24304a;
  font-size: 21px;
  font-weight: 400;
}

.forgot-field input::placeholder {
  color: #bbc2d0;
  opacity: 1;
}

.forgot-field--code button {
  flex: 0 0 auto;
  min-width: 104px;
  height: 42px;
  margin-left: 8px;
  padding: 0 14px;
  border: 0;
  border-radius: 999px;
  background: rgba(102, 112, 240, 0.12);
  color: #6670f0;
  font-size: 14px;
  font-weight: 700;
}

.forgot-field--code button:disabled,
.submit-btn:disabled {
  cursor: not-allowed;
  opacity: 0.7;
}

.submit-btn {
  width: 100%;
  height: 56px;
  margin-top: 26px;
  border: 0;
  border-radius: 16px;
  background: #d9dcff;
  color: #ffffff;
  font-size: 20px;
  font-weight: 500;
  letter-spacing: 0.06em;
}

.submit-btn--active {
  background: linear-gradient(135deg, #6670f0, #7480ff);
  box-shadow: 0 18px 32px rgba(102, 112, 240, 0.24);
}

@media (min-width: 561px) {
  .forgot-page {
    height: auto;
    min-height: var(--ihc-page-min-height);
  }
}

@media (max-width: 389px) {
  .forgot-content {
    padding-right: 20px;
    padding-left: 20px;
  }

  .forgot-content h2 {
    font-size: 22px;
  }

  .forgot-form {
    padding-right: 16px;
    padding-left: 16px;
  }

  .forgot-field {
    align-items: flex-start;
    flex-direction: column;
    height: auto;
    padding: 16px 0;
  }

  .forgot-field__label {
    flex-basis: auto;
  }

  .forgot-field input {
    width: 100%;
    font-size: 19px;
  }

  .forgot-field--code button {
    width: 100%;
    margin-top: 12px;
    margin-left: 0;
  }
}
</style>
