<script setup lang="ts">
import { computed, onMounted, reactive } from "vue";
import type { PageComponentProps } from "@ihc/page-core/types";
import { resetPassword } from "@/shared/api/auth";
import mock from "./mock";
import {
  clearPasswordResetVerificationState,
  getPasswordResetVerificationState,
  setLastLoginPhone
} from "../session";

const props = defineProps<PageComponentProps>();
const verification = getPasswordResetVerificationState();

const state = reactive({
  password: "",
  confirmPassword: "",
  submitting: false,
  verifiedPhone: verification?.phone || ""
});

function goBack() {
  if (!props.navigation.navigateBack()) {
    props.navigation.reLaunch("auth/forgot-password");
  }
}

const maskedPhone = computed(() => {
  if (state.verifiedPhone.length !== 11) {
    return "";
  }

  return `${state.verifiedPhone.slice(0, 3)}****${state.verifiedPhone.slice(-4)}`;
});

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "请求失败，请稍后重试";
}

onMounted(() => {
  if (state.verifiedPhone) {
    return;
  }

  props.showToast("请先完成验证码验证");
  window.setTimeout(() => {
    props.navigation.reLaunch("auth/forgot-password");
  }, 220);
});

async function submit() {
  if (state.submitting) {
    return;
  }

  try {
    if (!state.password.trim()) {
      throw new Error("请输入新的密码");
    }

    if (!state.confirmPassword.trim()) {
      throw new Error("请再次输入密码");
    }

    if (state.password.trim().length < 6) {
      throw new Error("密码长度至少为 6 位");
    }

    if (state.password !== state.confirmPassword) {
      throw new Error("两次输入的密码不一致");
    }

    const latestVerification = getPasswordResetVerificationState();

    if (!latestVerification) {
      throw new Error("验证码已失效，请重新验证");
    }

    state.submitting = true;
    await resetPassword({
      phone: latestVerification.phone,
      code: latestVerification.code,
      newPassword: state.password.trim()
    });
    clearPasswordResetVerificationState();
    setLastLoginPhone(latestVerification.phone);
    props.showToast("密码设置成功");
    window.setTimeout(() => {
      props.navigation.reLaunch("auth/login");
    }, 280);
  } catch (error) {
    props.showToast(getErrorMessage(error));
  } finally {
    state.submitting = false;
  }
}
</script>

<template>
  <section class="reset-page">
    <header class="reset-nav">
      <button class="back-btn" type="button" aria-label="返回" @click="goBack">
        <span class="back-arrow" aria-hidden="true"></span>
      </button>
      <h1>{{ mock.title }}</h1>
    </header>

    <main class="reset-content">
      <h2>{{ mock.heading }}</h2>
      <p class="reset-subtitle">
        <template v-if="maskedPhone">已完成 {{ maskedPhone }} 验证，请设置新的登录密码。</template>
        <template v-else>请先完成手机验证码验证，再设置新的登录密码。</template>
      </p>

      <form class="reset-form" @submit.prevent="submit">
        <label class="reset-field" for="newPassword">
          <span class="reset-field__label">新密码</span>
          <input
            id="newPassword"
            v-model="state.password"
            type="password"
            :disabled="state.submitting"
            :placeholder="mock.passwordPlaceholder"
          />
        </label>

        <label class="reset-field" for="confirmPassword">
          <span class="reset-field__label">确认密码</span>
          <input
            id="confirmPassword"
            v-model="state.confirmPassword"
            type="password"
            :disabled="state.submitting"
            :placeholder="mock.confirmPlaceholder"
          />
        </label>

        <button class="submit-btn" :disabled="state.submitting" type="submit">
          {{ state.submitting ? "提交中..." : "确定" }}
        </button>
      </form>
    </main>
  </section>
</template>

<style scoped>
.reset-page {
  position: relative;
  left: 50%;
  width: min(390px, 100vw);
  height: auto;
  min-height: var(--ihc-page-min-height);
  max-height: none;
  margin: -18px 0;
  transform: translateX(-50%);
  overflow: hidden;
  background: linear-gradient(180deg, #d8ebff 0%, #f4f7ff 43%, #fbfbfd 100%);
  color: #303030;
}

.reset-nav {
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

.reset-nav h1 {
  margin: 0 0 0 8px;
  color: #333333;
  font-size: 24px;
  font-weight: 500;
  letter-spacing: 0.02em;
}

.reset-content {
  padding: 0 24px;
}

.reset-content h2 {
  margin: 58px 0 0;
  color: #1f2842;
  font-size: 32px;
  font-weight: 600;
  line-height: 1.25;
  text-align: left;
}

.reset-subtitle {
  margin: 12px 0 0;
  color: #7f8799;
  font-size: 15px;
  line-height: 1.65;
}

.reset-form {
  margin-top: 30px;
  padding: 22px 18px 20px;
  border: 1px solid rgba(255, 255, 255, 0.68);
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.88);
  box-shadow: 0 24px 54px rgba(176, 188, 214, 0.16);
}

.reset-field {
  display: flex;
  align-items: center;
  height: 84px;
  gap: 14px;
  border-bottom: 1px solid rgba(225, 229, 238, 0.86);
}

.reset-field__label {
  flex: 0 0 78px;
  color: #6a738a;
  font-size: 15px;
  font-weight: 600;
}

.reset-field input {
  flex: 1;
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: #24304a;
  font-size: 21px;
  font-weight: 400;
}

.reset-field input::placeholder {
  color: #bbc2d0;
  opacity: 1;
}

.submit-btn {
  width: 100%;
  height: 56px;
  margin-top: 26px;
  border: 0;
  border-radius: 16px;
  background: linear-gradient(135deg, #6670f0, #7480ff);
  box-shadow: 0 18px 32px rgba(102, 112, 240, 0.24);
  color: #ffffff;
  font-size: 20px;
  font-weight: 500;
  letter-spacing: 0.06em;
}

.submit-btn:disabled {
  cursor: not-allowed;
  opacity: 0.7;
}

@media (min-width: 561px) {
  .reset-page {
    height: auto;
    min-height: var(--ihc-page-min-height);
  }
}

@media (max-width: 389px) {
  .reset-content {
    padding-right: 20px;
    padding-left: 20px;
  }

  .reset-content h2 {
    font-size: 28px;
  }

  .reset-form {
    padding-right: 16px;
    padding-left: 16px;
  }

  .reset-field {
    align-items: flex-start;
    flex-direction: column;
    height: auto;
    padding: 16px 0;
  }

  .reset-field__label {
    flex-basis: auto;
  }

  .reset-field input {
    width: 100%;
    font-size: 19px;
  }
}
</style>
