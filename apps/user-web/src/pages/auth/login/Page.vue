<script setup lang="ts">
import { reactive } from "vue";
import type { PageComponentProps } from "@ihc/page-core/types";
import mock from "./mock";

const props = defineProps<PageComponentProps>();

const state = reactive({
  loginMode: "password" as "password" | "code",
  phone: "",
  password: "",
  code: "",
  agreed: true,
});

function goBack() {
  if (!props.navigation.navigateBack()) {
    props.navigation.reLaunch("onboarding/intro");
  }
}

function toggleMode() {
  state.loginMode = state.loginMode === "password" ? "code" : "password";
}

function sendCode() {
  if (!state.phone.trim()) {
    props.showToast("请先输入手机号");
    return;
  }

  props.showToast("验证码已发送");
}

function forgetPassword() {
  props.navigation.navigateTo("auth/forgot-password");
}

function submitForm() {
  if (!state.agreed) {
    props.showToast("请先同意隐私政策");
    return;
  }

  if (!state.phone.trim()) {
    props.showToast("请输入手机号");
    return;
  }

  if (state.loginMode === "password" && !state.password.trim()) {
    props.showToast("请输入密码");
    return;
  }

  if (state.loginMode === "code" && !state.code.trim()) {
    props.showToast("请输入验证码");
    return;
  }

  props.showToast("登录成功");
  window.setTimeout(() => {
    props.navigation.reLaunch("auth/real-name");
  }, 280);
}

function handleThirdPartyLogin(label: string) {
  props.showToast(`${label}登录成功`);
  window.setTimeout(() => {
    props.navigation.reLaunch("auth/real-name");
  }, 280);
}

function showPolicy() {
  props.showToast("隐私政策页面待补充");
}
</script>

<template>
  <section class="login-page">
    <header class="login-nav">
      <button class="back-btn" type="button" aria-label="返回" @click="goBack">
        <span class="back-arrow" aria-hidden="true"></span>
      </button>
    </header>

    <section class="brand-block">
      <div class="brand-logo" aria-hidden="true">
        <span class="brand-heart brand-heart--left"></span>
        <span class="brand-heart brand-heart--right"></span>
        <span class="brand-plus brand-plus--horizontal"></span>
        <span class="brand-plus brand-plus--vertical"></span>
      </div>
      <h1>{{ mock.brandName }}</h1>
    </section>

    <section class="login-heading">
      <h2>登录</h2>
      <p>{{ state.loginMode === "password" ? "请输入手机号及密码登录" : "请输入手机号及验证码登录" }}</p>
    </section>

    <form class="form-area" @submit.prevent="submitForm">
      <label class="input-box" for="phone">
        <span class="input-icon phone-icon" aria-hidden="true">
          <span class="phone-shell"></span>
          <span class="phone-dot"></span>
        </span>
        <span class="input-divider" aria-hidden="true"></span>
        <input id="phone" v-model="state.phone" class="login-input" type="tel" maxlength="11" placeholder="手机号码" />
      </label>

      <label v-if="state.loginMode === 'password'" class="input-box" for="password">
        <span class="input-icon lock-icon" aria-hidden="true">
          <span class="lock-body"></span>
          <span class="lock-ring"></span>
        </span>
        <span class="input-divider" aria-hidden="true"></span>
        <input id="password" v-model="state.password" class="login-input" type="password" placeholder="密码" />
      </label>

      <label v-else class="input-box" for="code">
        <span class="input-icon code-icon" aria-hidden="true">
          <span class="code-box"></span>
          <span class="code-dot"></span>
        </span>
        <span class="input-divider" aria-hidden="true"></span>
        <input id="code" v-model="state.code" class="login-input code-input" type="text" maxlength="6" placeholder="验证码" />
        <button class="code-action" type="button" @click="sendCode">获取验证码</button>
      </label>

      <div v-if="state.loginMode === 'password'" class="forget-row">
        <button class="forget-btn" type="button" @click="forgetPassword">忘记密码</button>
      </div>

      <button class="login-btn" type="submit">登录</button>

      <button class="mode-switch" type="button" @click="toggleMode">
        {{ state.loginMode === "password" ? "手机验证码登录" : "手机号密码登录" }}
      </button>
    </form>

    <section class="third-party-area" aria-label="第三方登录">
      <div class="third-party-title">
        <span></span>
        <p>或通过以下方式登录</p>
        <span></span>
      </div>

      <div class="third-party-list">
        <button
          v-for="item in mock.thirdPartyOptions"
          :key="item.key"
          class="third-party-item"
          :class="`third-party-item--${item.key}`"
          type="button"
          :aria-label="`${item.label}登录`"
          @click="handleThirdPartyLogin(item.label)"
        >
          <img :src="item.icon" :alt="item.label" draggable="false" />
        </button>
      </div>
    </section>

    <label class="agreement-row">
      <input v-model="state.agreed" type="checkbox" />
      <span class="agreement-box" :class="{ 'agreement-box--active': state.agreed }">
        <span v-if="state.agreed" class="agreement-tick" aria-hidden="true"></span>
      </span>
      <span class="agreement-text">
        我已阅读并同意
        <button type="button" class="policy-link" @click.stop="showPolicy">《隐私政策》</button>
      </span>
    </label>
  </section>
</template>

<style scoped>
.login-page {
  position: relative;
  left: 50%;
  width: min(390px, 100vw);
  height: min(844px, calc(100vh - 36px));
  min-height: min(844px, calc(100vh - 36px));
  max-height: 844px;
  margin: -18px 0;
  padding: 0 29px 0;
  transform: translateX(-50%);
  overflow: hidden;
  background: linear-gradient(180deg, #cfe6ff 0%, #eef3fb 44%, #f9f9fb 100%);
  color: #22273e;
}

.login-nav {
  display: flex;
  align-items: center;
  height: 55px;
}

.back-btn,
.forget-btn,
.mode-switch,
.code-action,
.policy-link,
.third-party-item {
  border: 0;
  background: transparent;
  color: inherit;
}

.back-btn {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  width: 35px;
  height: 35px;
  padding: 0;
}

.back-arrow {
  width: 13px;
  height: 13px;
  border-bottom: 2px solid #36415c;
  border-left: 2px solid #36415c;
  transform: rotate(45deg);
}

.brand-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 16px;
}

.brand-logo {
  position: relative;
  width: 48px;
  height: 48px;
  border-radius: 15px;
  background: linear-gradient(180deg, #7280ff 0%, #f07b82 100%);
  box-shadow: 0 18px 36px rgba(108, 117, 235, 0.16);
}

.brand-heart {
  position: absolute;
  top: 15px;
  width: 11px;
  height: 17px;
  background: #ffffff;
}

.brand-heart--left {
  left: 13px;
  border-radius: 11px 11px 0 11px;
  transform: rotate(-45deg);
}

.brand-heart--right {
  right: 13px;
  border-radius: 11px 11px 11px 0;
  transform: rotate(45deg);
}

.brand-plus {
  position: absolute;
  top: 50%;
  left: 50%;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.88);
  transform: translate(-50%, -50%);
}

.brand-plus--horizontal {
  width: 14px;
  height: 3px;
}

.brand-plus--vertical {
  width: 3px;
  height: 14px;
}

.brand-block h1 {
  margin: 9px 0 0;
  color: #1c243c;
  font-size: 18px;
  font-weight: 600;
  letter-spacing: 0.18em;
}

.login-heading {
  margin-top: 76px;
}

.login-heading h2 {
  margin: 0;
  color: #22273e;
  font-size: 40px;
  font-weight: 400;
  line-height: 1.15;
  letter-spacing: 0.1em;
}

.login-heading p {
  margin: 7px 0 0;
  color: #aeb5c0;
  font-size: 17px;
  font-weight: 300;
}

.form-area {
  margin-top: 38px;
}

.input-box {
  display: flex;
  align-items: center;
  height: 51px;
  margin-top: 16px;
  padding: 0 15px;
  border-radius: 13px;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 14px 34px rgba(176, 188, 214, 0.08);
}

.input-box:first-child {
  margin-top: 0;
}

.input-icon {
  position: relative;
  flex: 0 0 22px;
  width: 22px;
  height: 22px;
}

.phone-shell {
  position: absolute;
  top: 3px;
  left: 6px;
  width: 10px;
  height: 15px;
  border: 2px solid #c8c8c8;
  border-radius: 7px;
  transform: rotate(-52deg);
}

.phone-dot {
  position: absolute;
  right: 2px;
  bottom: 7px;
  width: 8px;
  height: 2px;
  border-radius: 999px;
  background: #c8c8c8;
  transform: rotate(30deg);
}

.lock-body {
  position: absolute;
  top: 11px;
  left: 3px;
  width: 16px;
  height: 11px;
  border: 2px solid #c8c8c8;
  border-radius: 3px;
}

.lock-ring {
  position: absolute;
  top: 1px;
  left: 6px;
  width: 10px;
  height: 12px;
  border: 2px solid #c8c8c8;
  border-bottom: 0;
  border-radius: 12px 12px 0 0;
}

.code-box {
  position: absolute;
  top: 4px;
  left: 2px;
  width: 18px;
  height: 14px;
  border: 2px solid #c8c8c8;
  border-radius: 5px;
}

.code-dot {
  position: absolute;
  top: 14px;
  left: 7px;
  width: 8px;
  height: 2px;
  border-radius: 999px;
  background: #c8c8c8;
}

.input-divider {
  width: 1px;
  height: 18px;
  margin: 0 20px 0 11px;
  background: #ececec;
}

.login-input {
  flex: 1;
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: #262c42;
  font-size: 18px;
  font-weight: 400;
}

.login-input::placeholder {
  color: #c7c7c7;
  opacity: 1;
}

.code-input {
  flex: 0 0 112px;
}

.code-action {
  margin-left: auto;
  padding: 0;
  color: #6670f0;
  font-size: 14px;
}

.forget-row {
  display: flex;
  justify-content: flex-end;
  margin-top: 22px;
}

.forget-btn {
  padding: 0;
  color: #9fa5b3;
  font-size: 16px;
}

.login-btn {
  width: 100%;
  height: 49px;
  margin-top: 18px;
  border: 0;
  border-radius: 13px;
  background: linear-gradient(90deg, #6c76f0 0%, #6570f0 100%);
  box-shadow: 0 18px 36px rgba(102, 112, 240, 0.2);
  color: #ffffff;
  font-size: 22px;
  font-weight: 600;
  letter-spacing: 0.08em;
}

.mode-switch {
  display: block;
  margin: 22px auto 0;
  padding: 0;
  color: #6670f0;
  font-size: 19px;
}

.third-party-area {
  margin-top: 76px;
}

.third-party-title {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 19px;
}

.third-party-title span {
  width: 52px;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(231, 233, 238, 0.9));
}

.third-party-title span:last-child {
  background: linear-gradient(90deg, rgba(231, 233, 238, 0.9), transparent);
}

.third-party-title p {
  margin: 0;
  color: #c5c8d0;
  font-size: 16px;
}

.third-party-list {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 22px;
  padding: 0 34px;
}

.third-party-item {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 37px;
  height: 37px;
  padding: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 10px 24px rgba(176, 188, 214, 0.14);
  overflow: hidden;
}

.third-party-item img {
  display: block;
  width: 24px;
  height: 24px;
  object-fit: contain;
  mix-blend-mode: multiply;
  user-select: none;
}

.third-party-item--alipay img {
  width: 56px;
  height: 56px;
  transform: translateY(6px);
}

.agreement-row {
  position: absolute;
  right: 27px;
  bottom: 10px;
  left: 27px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #c4c9d3;
}

.agreement-row input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}

.agreement-box {
  position: relative;
  flex: 0 0 18px;
  width: 18px;
  height: 18px;
  border: 1px solid #cfd4df;
  border-radius: 4px;
  background: #ffffff;
}

.agreement-box--active {
  border-color: #6872f0;
  background: #6872f0;
}

.agreement-tick {
  position: absolute;
  top: 3px;
  left: 6px;
  width: 5px;
  height: 10px;
  border-right: 2px solid #ffffff;
  border-bottom: 2px solid #ffffff;
  transform: rotate(40deg);
}

.agreement-text {
  margin-left: 9px;
  font-size: 16px;
}

.policy-link {
  padding: 0;
  color: #22273e;
  font-size: inherit;
}

@media (min-width: 561px) {
  .login-page {
    height: 844px;
    min-height: 844px;
  }
}

@media (max-width: 389px) {
  .login-page {
    padding-right: 24px;
    padding-left: 24px;
  }

  .login-heading {
    margin-top: 102px;
  }

  .third-party-area {
    margin-top: 90px;
  }

  .third-party-list {
    padding: 0 40px;
  }
}
</style>
