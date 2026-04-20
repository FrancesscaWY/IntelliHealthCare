<script setup lang="ts">
import { computed, ref } from "vue";
import type { PageComponentProps } from "@ihc/page-core/types";
import heroIllustration from "@/assets/auth/medical-care-storyset.svg";
import mock from "./mock";

type LoginRole = (typeof mock.roles)[number];

const props = defineProps<PageComponentProps>();

const defaultRole = mock.roles[0]!;
const phone = ref(mock.phone);
const password = ref(mock.password);
const agreePolicy = ref(mock.agreePolicy);
const selectedRole = ref<LoginRole["key"]>(defaultRole.key);

const currentRole = computed<LoginRole>(
  () => mock.roles.find((item) => item.key === selectedRole.value) ?? defaultRole,
);

const roleIconMarkup: Record<string, string> = {
  shield: `
    <path d="M24 5 35 9.3v9.9c0 7.8-4.1 12.9-11 17.4-6.9-4.5-11-9.6-11-17.4V9.3L24 5Z" />
    <path d="M24 12.5v16.8" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" />
    <path d="M17.5 21h13" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" />
  `,
  headset: `
    <path d="M13 22.5v-2c0-6.1 4.9-11 11-11s11 4.9 11 11v2" />
    <rect x="10.5" y="21.2" width="5.8" height="10.4" rx="2.9" />
    <rect x="31.7" y="21.2" width="5.8" height="10.4" rx="2.9" />
    <path d="M31.7 33.3c0 3.3-2.7 6-6 6h-3.1" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" />
  `,
  building: `
    <path d="M13.5 9.5h15v27h-15z" />
    <path d="M28.5 14h7v22.5h-7z" opacity=".72" />
    <rect x="17.3" y="13.8" width="3.6" height="3.6" rx=".7" fill="#ffffff" />
    <rect x="17.3" y="20.6" width="3.6" height="3.6" rx=".7" fill="#ffffff" />
    <rect x="17.3" y="27.4" width="3.6" height="3.6" rx=".7" fill="#ffffff" />
    <rect x="23.1" y="13.8" width="3.6" height="3.6" rx=".7" fill="#ffffff" opacity=".88" />
    <rect x="23.1" y="20.6" width="3.6" height="3.6" rx=".7" fill="#ffffff" opacity=".88" />
    <rect x="23.1" y="27.4" width="3.6" height="3.6" rx=".7" fill="#ffffff" opacity=".88" />
  `,
};

function getRoleIconMarkup(icon: string) {
  return roleIconMarkup[icon] || roleIconMarkup.shield;
}

function selectRole(roleKey: LoginRole["key"]) {
  selectedRole.value = roleKey;
}

function openPolicy() {
  props.showToast("隐私政策页面暂未接入，当前为演示登录。");
}

function submitLogin() {
  if (!agreePolicy.value) {
    props.showToast("请先阅读并同意用户隐私政策。");
    return;
  }

  props.navigation.reLaunch("dashboard/overview");
  props.showToast(`已使用${currentRole.value.label}身份进入后台演示系统`);
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
      </div>

      <div class="showcase-illustration">
        <div class="illustration-frame">
          <img :src="heroIllustration" alt="智慧养老管理平台插画" draggable="false" />
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

      <label class="field">
        <span class="field__label">手机号</span>
        <input v-model="phone" type="text" autocomplete="username" placeholder="请输入手机号" />
      </label>

      <label class="field">
        <span class="field__label">密码</span>
        <input v-model="password" type="password" autocomplete="current-password" placeholder="请输入密码" />
      </label>

      <label class="agreement-line">
        <input v-model="agreePolicy" type="checkbox" />
        <span>{{ mock.policyLabel }}</span>
        <button type="button" class="agreement-link" @click="openPolicy">{{ mock.policyName }}</button>
      </label>

      <button class="login-btn" type="button" @click="submitLogin">登录</button>

      <p class="login-card__hint">{{ mock.forgotPasswordText }}</p>
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
  --primary: #2f9b6e;
  --primary-soft: #eaf7f0;
  --surface-soft: #f7fcf9;
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(420px, 520px);
  align-items: center;
  min-height: 100vh;
  padding: 40px 56px 68px;
  overflow: hidden;
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
  z-index: 1;
}

.login-showcase {
  display: grid;
  align-content: center;
  justify-items: center;
  gap: 26px;
  padding-right: 0;
  min-height: 100%;
  text-align: center;
}

.showcase-copy {
  max-width: 500px;
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
  font-size: 34px;
  font-weight: 600;
  line-height: 1.35;
  letter-spacing: 0.01em;
}

.showcase-illustration {
  display: grid;
  place-items: center;
  width: min(100%, 520px);
  min-height: 320px;
}

.illustration-frame {
  position: relative;
  display: grid;
  place-items: center;
  width: min(100%, 500px);
  aspect-ratio: 1 / 0.92;
}

.illustration-frame::before {
  content: "";
  position: absolute;
  inset: 12% 10% 8%;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(214, 241, 225, 0.72) 0%, rgba(214, 241, 225, 0.28) 48%, rgba(214, 241, 225, 0) 74%);
  filter: blur(10px);
  pointer-events: none;
}

.showcase-illustration img {
  position: relative;
  z-index: 1;
  width: min(100%, 470px);
  height: auto;
  object-fit: contain;
  user-select: none;
  filter: drop-shadow(0 18px 28px rgba(51, 102, 76, 0.1));
}

.login-card {
  width: min(100%, 520px);
  padding: 40px 42px 32px;
  border: 1px solid var(--card-border);
  border-radius: 26px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.92), rgba(247, 252, 249, 0.84));
  box-shadow: var(--card-shadow);
  backdrop-filter: blur(14px);
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
  background: linear-gradient(180deg, #58bb84 0%, #2f9b6e 100%);
  color: #ffffff;
  box-shadow: 0 14px 28px rgba(47, 155, 110, 0.2);
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
  font-weight: 600;
  letter-spacing: 0.06em;
  box-shadow: 0 14px 28px rgba(47, 155, 110, 0.18);
}

.login-card__hint {
  margin: 18px 0 0;
  color: #96a6b6;
  font-size: 12px;
  line-height: 1.6;
  text-align: center;
}

.login-footer {
  position: absolute;
  right: 56px;
  bottom: 22px;
  left: 56px;
  display: flex;
  justify-content: center;
  gap: 16px;
  color: #a5b2bf;
  font-size: 12px;
}

.login-footer a {
  color: #7f94ac;
  text-decoration: none;
}

@media (max-width: 1200px) {
  .login-page {
    grid-template-columns: minmax(0, 1fr) minmax(380px, 480px);
    padding-right: 36px;
    padding-left: 36px;
  }

  .showcase-copy h1 {
    font-size: 30px;
  }
}

@media (max-width: 960px) {
  .login-page {
    grid-template-columns: 1fr;
    gap: 20px;
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

  .showcase-illustration {
    min-height: auto;
    place-items: center;
  }

  .illustration-frame {
    width: min(100%, 360px);
  }

  .showcase-illustration img {
    width: min(100%, 340px);
  }

  .login-card {
    width: 100%;
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
