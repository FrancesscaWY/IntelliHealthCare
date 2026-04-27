<script setup lang="ts">
import { computed, ref } from "vue";
import type { PageComponentProps } from "@ihc/page-core/types";
import heroIllustration from "@/assets/auth/medical-care-storyset.svg";
import {
  getCurrentAdmin,
  getPrivacyAgreement,
  loginWithPassword
} from "@/shared/api/auth";
import {
  saveAdminAuthSession
} from "@/shared/auth/session";
import { resolvePostLoginPageId } from "@/shared/auth/navigation";
import mock from "./mock";

type LoginRole = (typeof mock.roles)[number];
type LoginRoleKey = LoginRole["key"];

const props = defineProps<PageComponentProps>();
const phonePattern = /^1\d{10}$/;
const roleIconMarkup: Record<string, string> = {
  shield: `
    <path d="M24 10.8 34.8 15v8.1c0 7.1-4.4 11.5-10.8 14.1-6.4-2.6-10.8-7-10.8-14.1V15L24 10.8Z" />
    <path d="M19.4 24.4 22.4 27.4 28.8 21" fill="none" stroke="currentColor" stroke-width="2.5" />
  `,
  headset: `
    <path d="M14.6 23.8v-1.6c0-5.2 4.2-9.4 9.4-9.4s9.4 4.2 9.4 9.4v1.6" />
    <rect x="11.2" y="22.6" width="5.8" height="10.4" rx="2.4" />
    <rect x="31" y="22.6" width="5.8" height="10.4" rx="2.4" />
    <path d="M31 33.2c0 2.2-1.8 4-4 4h-4.2" fill="none" stroke="currentColor" stroke-width="2.5" />
  `,
  building: `
    <path d="M15 36.6V14.2h18v22.4" />
    <path d="M12 36.6h24" fill="none" stroke="currentColor" stroke-width="2.5" />
    <path d="M20 18.6h2.8M25.2 18.6H28M20 24.2h2.8M25.2 24.2H28" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" />
    <path d="M22 36.6v-6.5h4v6.5" fill="none" stroke="currentColor" stroke-width="2.5" />
  `
};

const defaultRole = mock.roles[0]!;
const account = ref(defaultRole.demoPhone || mock.phone);
const password = ref(defaultRole.demoPassword || mock.password);
const remember = ref(mock.remember);
const agreePolicy = ref(mock.agreePolicy);
const selectedRole = ref<LoginRoleKey>(defaultRole.key);
const submitting = ref(false);
const submitButtonText = computed(() => (submitting.value ? "登录中..." : "进入后台"));
const currentRole = computed(
  () => mock.roles.find((role) => role.key === selectedRole.value) ?? defaultRole
);
const showQuickEntries = computed(() => props.mode === "page");
const currentRoleDemo = computed(() => `${currentRole.value.demoPhone} / ${currentRole.value.demoPassword}`);

function getRoleIconMarkup(icon: string) {
  return roleIconMarkup[icon] ?? roleIconMarkup.shield;
}

function selectRole(roleKey: LoginRoleKey) {
  selectedRole.value = roleKey;
  const role = mock.roles.find((item) => item.key === roleKey) ?? defaultRole;
  account.value = role.demoPhone || "";
  password.value = role.demoPassword || "";
}

function createDeviceId() {
  const userAgent =
    typeof window === "undefined" ? "unknown" : window.navigator.userAgent;
  return `admin-web-${userAgent.slice(0, 24).replace(/\W+/g, "-") || "browser"}`;
}

function getErrorMessage(error: unknown) {
  if (!(error instanceof Error)) {
    return "登录失败，请稍后重试";
  }

  if (/invalid credentials|invalid phone or password/i.test(error.message)) {
    return `账号或密码错误，请确认当前角色使用 ${currentRoleDemo.value}`;
  }

  return error.message;
}

async function redirectAfterLogin() {
  void getCurrentAdmin().catch(() => undefined);
  props.navigation.reLaunch(resolvePostLoginPageId());
}

async function openPolicy() {
  try {
    const agreement = await getPrivacyAgreement();
    props.showToast(`${agreement.title} ${agreement.version}`);
  } catch (error) {
    props.showToast(getErrorMessage(error));
  }
}

function openPage(pageId: string, label: string) {
  if (props.mode !== "page") {
    props.showToast("请先完成登录后再进入后台");
    return;
  }

  props.showToast(`正在跳转到${label}`);
  props.navigation.reLaunch(pageId);
}

async function submitLogin() {
  if (submitting.value) {
    return;
  }

  try {
    if (!agreePolicy.value) {
      throw new Error("请先阅读并同意隐私政策");
    }

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
    await redirectAfterLogin();
    props.showToast("后台登录成功");
  } catch (error) {
    props.showToast(getErrorMessage(error));
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <section class="login-page">
    <div class="login-page__blur login-page__blur--left"></div>
    <div class="login-page__blur login-page__blur--right"></div>

    <section class="login-showcase">
      <div class="showcase-copy">
        <p class="showcase-kicker">IntelliHealthCare Admin</p>
        <h1>{{ mock.brandTitle }}</h1>
        <p class="showcase-summary">{{ mock.brandSummary }}</p>
      </div>

      <div class="showcase-panel">
        <div class="showcase-panel__meta">
          <span class="showcase-panel__eyebrow">当前登录角色</span>
          <strong>{{ currentRole.label }}</strong>
          <p>{{ currentRole.description }}</p>
        </div>

        <div class="showcase-illustration">
          <div class="illustration-frame">
            <img :src="heroIllustration" alt="智慧养老管理平台插画" draggable="false" />
          </div>
        </div>
      </div>
    </section>

    <section class="login-card">
      <div class="login-card__logo" aria-hidden="true">
        <span class="logo-mark">
          <svg viewBox="0 0 48 48" focusable="false" aria-hidden="true">
            <path
              d="M24 39.5 10.7 26.4c-3.3-3.3-5.3-6.4-5.3-10.7 0-5.7 4.5-10.2 10.1-10.2 3.4 0 6.1 1.6 8.5 4.8 2.4-3.2 5.1-4.8 8.5-4.8 5.6 0 10.1 4.5 10.1 10.2 0 4.3-2 7.4-5.3 10.7L24 39.5Z"
            />
            <path d="M24 14.6v10.5" fill="none" stroke="#ffffff" stroke-linecap="round" stroke-width="3.5" />
            <path d="M18.7 19.85h10.6" fill="none" stroke="#ffffff" stroke-linecap="round" stroke-width="3.5" />
          </svg>
        </span>
      </div>

      <header class="login-card__head">
        <h2>欢迎登录</h2>
        <p>{{ currentRole.description }}</p>
      </header>

      <div class="role-picker" aria-label="角色选择">
        <button
          v-for="role in mock.roles"
          :key="role.key"
          class="role-option"
          :class="{ 'role-option--active': role.key === selectedRole }"
          :aria-pressed="role.key === selectedRole"
          type="button"
          @click="selectRole(role.key)"
        >
          <span class="role-option__icon" aria-hidden="true">
            <svg viewBox="0 0 48 48" focusable="false">
              <g
                :fill="role.key === selectedRole ? 'currentColor' : 'none'"
                :stroke="role.key === selectedRole ? 'none' : 'currentColor'"
                stroke-width="2.5"
                stroke-linecap="round"
                stroke-linejoin="round"
                v-html="getRoleIconMarkup(role.icon)"
              ></g>
            </svg>
          </span>
          <span class="role-option__label">{{ role.label }}</span>
        </button>
      </div>

      <p class="login-card__tip">联调账号：{{ currentRoleDemo }}</p>

      <label class="field">
        <span>账号</span>
        <input
          v-model="account"
          type="text"
          placeholder="请输入后台手机号"
          :disabled="submitting"
          @keyup.enter="submitLogin"
        />
      </label>

      <label class="field">
        <span>密码</span>
        <input
          v-model="password"
          type="password"
          placeholder="请输入登录密码"
          :disabled="submitting"
          @keyup.enter="submitLogin"
        />
      </label>

      <label class="agreement-line">
        <input v-model="agreePolicy" type="checkbox" />
        <span>{{ mock.policyLabel }}</span>
        <button type="button" class="agreement-link" @click="openPolicy">{{ mock.policyName }}</button>
      </label>

      <button class="login-btn" type="button" :disabled="submitting" @click="submitLogin">
        {{ submitButtonText }}
      </button>

      <footer class="login-card__foot">
        <template v-if="showQuickEntries">
          <span>单页调试入口</span>
          <div class="quick-links">
            <button
              v-for="item in mock.quickEntries"
              :key="`${item.pageId}-${item.label}`"
              type="button"
              class="quick-link"
              @click="openPage(item.pageId, item.label)"
            >
              {{ item.label }}
            </button>
          </div>
        </template>
        <p v-else class="login-card__tip">请输入后台账号密码完成登录。</p>
        <p class="login-card__hint">{{ mock.forgotPasswordText }}</p>
      </footer>
    </section>

    <footer class="login-footer">
      <span>Copyright © IntelliHealthCare All Rights Reserved</span>
      <a href="https://storyset.com/medical" target="_blank" rel="noreferrer">Illustration by Storyset</a>
    </footer>
  </section>
</template>

<style scoped>
.login-page {
  --bg-start: #f5fbf8;
  --bg-end: #edf7f2;
  --text-primary: #1f2d3d;
  --text-secondary: #5e7186;
  --text-tertiary: #8fa1b3;
  --line-soft: rgba(158, 198, 180, 0.2);
  --card-border: rgba(210, 233, 223, 0.8);
  --card-shadow: 0 32px 70px rgba(57, 103, 82, 0.14);
  --primary: #59b886;
  --primary-soft: #effbf3;
  --surface-soft: #f7fcf9;
  position: relative;
  isolation: isolate;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(420px, 500px);
  align-items: center;
  justify-content: center;
  gap: clamp(28px, 4vw, 60px);
  width: 100%;
  min-width: 0;
  min-height: 100vh;
  min-height: 100svh;
  min-height: max(720px, 100svh);
  padding: 40px clamp(24px, 5vw, 72px) 68px;
  box-sizing: border-box;
  overflow-x: hidden;
  overflow-y: visible;
  background:
    radial-gradient(circle at top left, rgba(115, 192, 156, 0.18), transparent 30%),
    radial-gradient(circle at 30% 18%, rgba(208, 241, 224, 0.86), transparent 24%),
    radial-gradient(circle at right 18% bottom 20%, rgba(83, 173, 131, 0.14), transparent 24%),
    linear-gradient(180deg, var(--bg-start) 0%, var(--bg-end) 100%);
  color: var(--text-primary);
  font-family:
    "Noto Sans SC",
    "Source Han Sans SC",
    "PingFang SC",
    "Microsoft YaHei UI",
    sans-serif;
}

.login-page__blur {
  position: absolute;
  border-radius: 999px;
  filter: blur(20px);
  pointer-events: none;
}

.login-page__blur--left {
  top: 14%;
  left: 7%;
  width: 220px;
  height: 220px;
  background: rgba(103, 185, 146, 0.14);
}

.login-page__blur--right {
  right: 10%;
  bottom: 16%;
  width: 260px;
  height: 260px;
  background: rgba(117, 198, 153, 0.14);
}

.login-showcase,
.login-card,
.login-footer {
  position: relative;
  min-width: 0;
  z-index: 1;
}

.login-showcase {
  display: grid;
  align-content: center;
  justify-items: stretch;
  gap: 24px;
  width: 100%;
  align-self: center;
  padding-right: 0;
  min-height: 100%;
  text-align: left;
}

.showcase-copy {
  max-width: 100%;
}

.showcase-kicker {
  margin: 0;
  color: #5d8572;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.showcase-copy h1 {
  margin: 14px 0 0;
  color: #1c2b3a;
  font-size: clamp(34px, 3.2vw, 46px);
  font-weight: 600;
  line-height: 1.22;
  letter-spacing: 0.01em;
  text-wrap: balance;
}

.showcase-summary {
  margin: 16px 0 0;
  max-width: 460px;
  color: #698094;
  font-size: 15px;
  line-height: 1.8;
  text-wrap: pretty;
}

.showcase-panel {
  display: grid;
  gap: 18px;
  width: 100%;
  padding: 24px 24px 18px;
  border: 1px solid rgba(206, 228, 218, 0.9);
  border-radius: 30px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.78), rgba(240, 250, 244, 0.72));
  box-shadow: 0 24px 56px rgba(48, 93, 72, 0.1);
  backdrop-filter: blur(16px);
}

.showcase-panel__meta {
  display: grid;
  gap: 8px;
}

.showcase-panel__eyebrow {
  color: #7a917f;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.showcase-panel__meta strong {
  color: #203242;
  font-size: 22px;
  font-weight: 600;
  line-height: 1.2;
}

.showcase-panel__meta p {
  margin: 0;
  max-width: 420px;
  color: #7a8f9f;
  font-size: 14px;
  line-height: 1.75;
  text-wrap: pretty;
}

.showcase-illustration {
  display: grid;
  place-items: center;
  width: 100%;
  min-height: 0;
  padding: 14px 14px 0;
  border-radius: 26px;
  overflow: hidden;
  background:
    radial-gradient(circle at top, rgba(224, 245, 232, 0.78), rgba(224, 245, 232, 0) 54%),
    linear-gradient(180deg, rgba(250, 253, 251, 0.96), rgba(229, 244, 236, 0.92));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.9),
    inset 0 -1px 0 rgba(162, 206, 182, 0.18);
}

.illustration-frame {
  position: relative;
  display: grid;
  place-items: center;
  width: 100%;
  aspect-ratio: 1.18 / 0.82;
  overflow: hidden;
}

.illustration-frame::before {
  content: "";
  position: absolute;
  inset: 14% 14% 10%;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(209, 239, 220, 0.68) 0%, rgba(209, 239, 220, 0.24) 50%, rgba(209, 239, 220, 0) 76%);
  filter: blur(14px);
  pointer-events: none;
}

.showcase-illustration img {
  position: relative;
  z-index: 1;
  width: 114%;
  max-width: none;
  height: 100%;
  object-fit: cover;
  object-position: center 22%;
  user-select: none;
  mix-blend-mode: multiply;
  transform: translateX(-1.5%) scale(1.03);
  filter: drop-shadow(0 18px 28px rgba(51, 102, 76, 0.12));
}

.login-card {
  width: 100%;
  max-width: 500px;
  padding: 40px 42px 32px;
  border: 1px solid var(--card-border);
  border-radius: 26px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.92), rgba(247, 252, 249, 0.84));
  box-shadow: var(--card-shadow);
  backdrop-filter: blur(14px);
  justify-self: end;
  align-self: center;
}

.login-card__logo {
  display: grid;
  justify-items: center;
}

.logo-mark {
  display: grid;
  place-items: center;
  width: 56px;
  height: 56px;
  border-radius: 18px;
  background: linear-gradient(180deg, #a7e8bf 0%, #59b886 100%);
  color: #ffffff;
  box-shadow: 0 14px 28px rgba(89, 184, 134, 0.22);
}

.logo-mark svg {
  width: 30px;
  height: 30px;
  fill: currentColor;
}

.login-card__head {
  margin-top: 20px;
  text-align: center;
}

.login-card__head h2 {
  margin: 0;
  color: #223245;
  font-size: 22px;
  font-weight: 600;
  letter-spacing: 0.03em;
}

.login-card__head p {
  margin: 10px auto 0;
  max-width: 320px;
  color: var(--text-tertiary);
  font-size: 13px;
  line-height: 1.75;
}

.role-picker {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-top: 24px;
}

.role-option {
  display: grid;
  justify-items: center;
  gap: 8px;
  padding: 13px 10px 12px;
  border: 1px solid rgba(186, 216, 198, 0.82);
  border-radius: 16px;
  background: var(--surface-soft);
  color: #698097;
  transition:
    border-color 160ms ease,
    background 160ms ease,
    color 160ms ease,
    box-shadow 160ms ease,
    transform 160ms ease;
}

.role-option:hover {
  transform: translateY(-1px);
  border-color: rgba(77, 158, 118, 0.5);
}

.role-option--active {
  border-color: rgba(47, 155, 110, 0.42);
  background: linear-gradient(180deg, #f1fbf5 0%, #ffffff 100%);
  color: var(--primary);
  box-shadow: 0 10px 22px rgba(47, 155, 110, 0.1);
}

.role-option__icon {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.8);
}

.role-option__icon svg {
  width: 20px;
  height: 20px;
}

.role-option__label {
  font-size: 12px;
  font-weight: 600;
  line-height: 1.4;
  text-align: center;
}

.field {
  display: block;
  margin-top: 18px;
}

.field__label {
  display: inline-block;
  margin-bottom: 8px;
  color: #65788d;
  font-size: 13px;
  line-height: 1.3;
}

.field input {
  width: 100%;
  height: 54px;
  padding: 0 16px;
  border: 1px solid transparent;
  border-radius: 14px;
  background: #f4faf6;
  color: var(--text-primary);
  font-size: 15px;
  line-height: 1;
  outline: none;
  transition:
    border-color 160ms ease,
    background 160ms ease,
    box-shadow 160ms ease;
}

.field input::placeholder {
  color: #a9b8c8;
}

.field input:focus {
  border-color: rgba(47, 155, 110, 0.38);
  background: #ffffff;
  box-shadow: 0 0 0 4px rgba(47, 155, 110, 0.1);
}

.field input:disabled {
  cursor: not-allowed;
  opacity: 0.72;
}

.agreement-line {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 18px;
  color: #7f91a4;
  font-size: 13px;
  line-height: 1.5;
}

.agreement-line input {
  width: 16px;
  height: 16px;
  margin: 0;
  accent-color: var(--primary);
}

.agreement-link {
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--primary);
  font-size: 13px;
  line-height: 1.5;
}

.agreement-link:hover {
  text-decoration: underline;
}

.login-btn {
  width: 100%;
  height: 54px;
  margin-top: 22px;
  border: 0;
  border-radius: 14px;
  background: linear-gradient(135deg, #59b886 0%, #2f9b6e 100%);
  color: #ffffff;
  font-size: 16px;
  font-weight: 700;
}

.login-btn:disabled {
  cursor: not-allowed;
  opacity: 0.72;
}

.login-card__foot {
  margin-top: 20px;
  padding-top: 18px;
  border-top: 1px solid rgba(22, 53, 45, 0.08);
}

.login-card__hint {
  margin: 18px 0 0;
  color: #96a6b6;
  font-size: 12px;
  line-height: 1.6;
  text-align: center;
}

.login-footer {
  display: flex;
  grid-column: 1 / -1;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-top: 8px;
  color: #8ea1b2;
  font-size: 12px;
  line-height: 1.6;
  flex-wrap: wrap;
}

.quick-links {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 12px;
}

.login-footer a {
  color: #7f94ac;
  text-decoration: none;
}

@media (max-width: 1200px) {
  .login-page {
    grid-template-columns: minmax(0, 1fr) minmax(380px, 472px);
    gap: 32px;
    padding-right: 36px;
    padding-left: 36px;
  }

  .showcase-copy h1 {
    font-size: 30px;
  }

  .showcase-panel {
    max-width: 100%;
  }
}

@media (max-width: 960px) {
  .login-page {
    grid-template-columns: 1fr;
    gap: 20px;
    align-content: start;
    padding: 24px 16px 70px;
  }

  .login-showcase {
    gap: 18px;
    padding-right: 0;
    justify-items: center;
    text-align: center;
  }

  .showcase-copy {
    max-width: 100%;
  }

  .showcase-copy h1 {
    font-size: 28px;
  }

  .showcase-summary {
    max-width: 100%;
  }

  .showcase-panel {
    width: 100%;
    max-width: 100%;
    padding: 18px 18px 14px;
    text-align: left;
  }

  .showcase-illustration {
    place-items: center;
    padding: 10px 10px 0;
  }

  .illustration-frame {
    width: 100%;
    aspect-ratio: 1 / 0.84;
  }

  .showcase-illustration img {
    width: 110%;
    object-position: center 20%;
  }

  .login-card {
    width: 100%;
    justify-self: stretch;
    padding: 28px 18px 24px;
  }

  .role-picker {
    grid-template-columns: 1fr;
  }

  .login-footer {
    right: 16px;
    left: 16px;
    flex-direction: column;
    align-items: center;
    gap: 6px;
  }
}
</style>
