<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import type { PageComponentProps } from "@ihc/page-core/types";
import { getCurrentAdmin, loginWithPassword } from "@/shared/api/auth";
import {
  clearAdminAuthSession,
  hasAdminAuthSession,
  saveAdminAuthSession
} from "@/shared/auth/session";
import mock from "./mock";

const props = defineProps<PageComponentProps>();
const phonePattern = /^1\d{10}$/;

const account = ref(mock.account);
const password = ref(mock.password);
const remember = ref(mock.remember);
const submitting = ref(false);
const submitButtonText = computed(() => (submitting.value ? "登录中..." : "进入后台"));

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "请求失败，请稍后重试";
}

function createDeviceId() {
  const userAgent = typeof window === "undefined" ? "unknown" : window.navigator.userAgent;
  return `admin-web-${userAgent.slice(0, 24).replace(/\W+/g, "-") || "browser"}`;
}

async function redirectToDashboard() {
  await getCurrentAdmin();
  props.navigation.reLaunch("dashboard/overview");
}

async function submitLogin() {
  if (submitting.value) {
    return;
  }

  try {
    if (!phonePattern.test(account.value.trim())) {
      throw new Error("请输入正确的后台手机号");
    }

    if (!password.value.trim()) {
      throw new Error("请输入登录密码");
    }

    submitting.value = true;
    const session = await loginWithPassword({
      phone: account.value.trim(),
      password: password.value.trim(),
      agreePrivacy: true,
      deviceId: createDeviceId()
    });

    saveAdminAuthSession(session, {
      persist: remember.value
    });
    await redirectToDashboard();
    props.showToast("后台登录成功");
  } catch (error) {
    props.showToast(getErrorMessage(error));
  } finally {
    submitting.value = false;
  }
}

onMounted(async () => {
  if (!hasAdminAuthSession()) {
    return;
  }

  try {
    await redirectToDashboard();
  } catch {
    clearAdminAuthSession();
  }
});
</script>

<template>
  <section class="login-page">
    <div class="login-page__bg"></div>

    <section class="login-hero">
      <p class="login-hero__eyebrow">IntelliHealthCare Admin</p>
      <h1>{{ mock.welcome }}</h1>
      <p class="login-hero__summary">{{ mock.subtitle }}</p>

      <ul class="login-hero__notice">
        <li v-for="item in mock.notices" :key="item">{{ item }}</li>
      </ul>
    </section>

    <section class="login-card">
      <header class="login-card__head">
        <strong>{{ props.pageEntry.title }}</strong>
        <span>整站入口</span>
      </header>

      <label class="field">
        <span>账号</span>
        <input v-model="account" type="text" maxlength="11" placeholder="请输入后台手机号" :disabled="submitting" />
      </label>

      <label class="field">
        <span>密码</span>
        <input v-model="password" type="password" placeholder="请输入登录密码" :disabled="submitting" />
      </label>

      <label class="remember-line">
        <input v-model="remember" type="checkbox" />
        <span>记住当前登录信息</span>
      </label>

      <button class="login-btn" type="button" :disabled="submitting" @click="submitLogin">{{ submitButtonText }}</button>

      <footer class="login-card__foot">
        <span>联调账号</span>
        <p class="login-card__hint">后台账号：13600136000 / 123456</p>
        <p class="login-card__hint">勾选“记住当前登录信息”时，token 落到 `localStorage`；否则只放 `sessionStorage`。</p>
      </footer>
    </section>
  </section>
</template>

<style scoped>
.login-page {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(360px, 460px);
  align-items: center;
  min-height: 100vh;
  padding: 48px;
  overflow: hidden;
  background:
    radial-gradient(circle at top left, rgba(31, 122, 90, 0.18), transparent 28%),
    radial-gradient(circle at right 18%, rgba(224, 138, 58, 0.18), transparent 22%),
    linear-gradient(135deg, #eef5ef 0%, #f7faf7 48%, #edf5ef 100%);
}

.login-page__bg {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(120deg, rgba(19, 50, 42, 0.95), rgba(24, 58, 48, 0.78) 42%, transparent 42%),
    radial-gradient(circle at 22% 34%, rgba(255, 255, 255, 0.16), transparent 18%);
}

.login-hero,
.login-card {
  position: relative;
  z-index: 1;
}

.login-hero {
  max-width: 560px;
  padding-right: 36px;
  color: #fff;
}

.login-hero__eyebrow {
  margin: 0;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.login-hero h1 {
  margin: 18px 0 12px;
  font-size: 52px;
  line-height: 1.1;
}

.login-hero__summary {
  margin: 0;
  max-width: 520px;
  color: rgba(255, 255, 255, 0.82);
  font-size: 17px;
  line-height: 1.8;
}

.login-hero__notice {
  display: grid;
  gap: 12px;
  margin: 28px 0 0;
  padding-left: 18px;
  color: rgba(255, 255, 255, 0.78);
  line-height: 1.7;
}

.login-card {
  padding: 28px;
  border: 1px solid rgba(255, 255, 255, 0.52);
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 32px 64px rgba(20, 48, 40, 0.12);
  backdrop-filter: blur(12px);
}

.login-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 22px;
}

.login-card__head strong {
  font-size: 24px;
}

.login-card__head span {
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(31, 122, 90, 0.08);
  color: var(--admin-brand);
  font-size: 12px;
  font-weight: 700;
}

.field {
  display: grid;
  gap: 8px;
  margin-bottom: 16px;
}

.field span {
  color: var(--admin-text);
  font-size: 14px;
  font-weight: 700;
}

.field input {
  width: 100%;
  height: 52px;
  padding: 0 16px;
  border: 1px solid rgba(22, 53, 45, 0.12);
  border-radius: 16px;
  background: rgba(247, 250, 248, 0.96);
  color: var(--admin-text);
  font-size: 15px;
  outline: none;
}

.field input:focus {
  border-color: rgba(31, 122, 90, 0.38);
  box-shadow: 0 0 0 4px rgba(31, 122, 90, 0.08);
}

.remember-line {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin: 4px 0 18px;
  color: var(--admin-muted);
  font-size: 14px;
}

.login-btn {
  width: 100%;
  height: 52px;
  border: 0;
  border-radius: 16px;
  background: linear-gradient(135deg, #1f7a5a, #215d49);
  color: #fff;
  font-size: 16px;
  font-weight: 700;
}

.login-btn:disabled {
  opacity: 0.72;
}

.login-card__foot {
  margin-top: 20px;
  padding-top: 18px;
  border-top: 1px solid rgba(22, 53, 45, 0.08);
}

.login-card__foot span {
  display: block;
  color: var(--admin-muted);
  font-size: 13px;
}

.login-card__hint {
  margin: 12px 0 0;
  color: var(--admin-text);
  font-size: 13px;
  line-height: 1.7;
}

.quick-link {
  padding: 10px 12px;
  border: 1px solid rgba(31, 122, 90, 0.12);
  border-radius: 999px;
  background: rgba(31, 122, 90, 0.06);
  color: var(--admin-brand);
  font-size: 13px;
  font-weight: 700;
}

@media (max-width: 980px) {
  .login-page {
    grid-template-columns: 1fr;
    gap: 28px;
    padding: 28px 20px;
  }

  .login-page__bg {
    background:
      linear-gradient(180deg, rgba(19, 50, 42, 0.92), rgba(24, 58, 48, 0.62) 42%, transparent 42%),
      radial-gradient(circle at 22% 24%, rgba(255, 255, 255, 0.14), transparent 18%);
  }

  .login-hero {
    max-width: none;
    padding-right: 0;
  }

  .login-hero h1 {
    font-size: 38px;
  }
}
</style>
