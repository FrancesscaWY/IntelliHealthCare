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
    props.navigation.reLaunch("home/dashboard");
  }, 280);
}

function handleThirdPartyLogin(label: string) {
  props.showToast(`${label} 登录成功`);
  window.setTimeout(() => {
    props.navigation.reLaunch("home/dashboard");
  }, 280);
}
</script>

<template>
  <section class="login-page">
    <article class="login-brand">
      <div class="login-brand__logo">智</div>
      <h1>智养康护</h1>
      <p>请选择常用登录方式，快速进入家属与老年用户康养服务中心。</p>
    </article>

    <article class="login-panel">
      <div class="login-panel__top">
        <div>
          <p class="page-eyebrow">Authentication</p>
          <h2>{{ state.loginMode === "password" ? "手机号密码登录" : "手机号验证码登录" }}</h2>
          <p>{{ state.loginMode === "password" ? "请输入手机号和密码" : "请输入手机号和验证码" }}</p>
        </div>
        <button class="login-switch" type="button" @click="toggleMode">
          {{ state.loginMode === "password" ? "切换验证码" : "切换密码" }}
        </button>
      </div>

      <form class="login-form" @submit.prevent="submitForm">
        <div class="login-input-group">
          <label for="phone">手机号</label>
          <input id="phone" v-model="state.phone" class="login-input" type="tel" maxlength="11" placeholder="请输入手机号" />
        </div>

        <div v-if="state.loginMode === 'password'" class="login-input-group">
          <label for="password">密码</label>
          <input id="password" v-model="state.password" class="login-input" type="password" placeholder="请输入密码" />
        </div>

        <div v-else class="login-input-group">
          <label for="code">验证码</label>
          <div class="login-input-row">
            <input id="code" v-model="state.code" class="login-input" type="text" maxlength="6" placeholder="请输入验证码" />
            <button class="login-code-button" type="button" @click="sendCode">获取验证码</button>
          </div>
        </div>

        <label class="login-agreement">
          <input v-model="state.agreed" type="checkbox" />
          <span>我已阅读并同意《隐私政策》</span>
        </label>

        <button class="login-submit" type="submit">登录</button>
      </form>
    </article>

    <article class="login-footer">
      <p>支持第三方快捷登录，后续可以继续补充真实授权流程。</p>
      <div class="login-third-party">
        <button
          v-for="item in mock.thirdPartyOptions"
          :key="item.key"
          type="button"
          @click="handleThirdPartyLogin(item.label)"
        >
          {{ item.short }}
        </button>
      </div>
    </article>
  </section>
</template>

<style scoped>
.login-page {
  display: grid;
  gap: 18px;
}

.login-brand,
.login-panel,
.login-footer {
  padding: 20px;
  border-radius: 26px;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 18px 42px rgba(34, 67, 118, 0.1);
}

.login-brand {
  background: linear-gradient(145deg, rgba(36, 87, 245, 0.12), rgba(255, 123, 97, 0.12)), #ffffff;
}

.login-brand__logo {
  width: 64px;
  height: 64px;
  display: grid;
  place-items: center;
  border-radius: 22px;
  background: linear-gradient(135deg, #2457f5, #7aa7ff);
  color: #fff;
  font-size: 28px;
  font-weight: 800;
}

.login-brand h1 {
  margin: 16px 0 8px;
  font-size: 30px;
}

.login-brand p,
.login-panel p,
.login-footer p {
  margin: 0;
  color: #607089;
  line-height: 1.6;
}

.login-panel__top {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
  margin-bottom: 18px;
}

.login-switch {
  border: 0;
  background: rgba(36, 87, 245, 0.08);
  color: #2457f5;
  padding: 8px 12px;
  border-radius: 999px;
  font-weight: 700;
}

.login-form {
  display: grid;
  gap: 14px;
}

.login-input-group {
  display: grid;
  gap: 8px;
}

.login-input-group label {
  color: #42536e;
  font-size: 13px;
  font-weight: 700;
}

.login-input-row {
  display: flex;
  gap: 10px;
}

.login-input,
.login-code-button,
.login-submit {
  width: 100%;
  border-radius: 18px;
  border: 1px solid rgba(35, 82, 173, 0.12);
}

.login-input {
  padding: 14px 16px;
  background: #f7faff;
}

.login-code-button {
  width: auto;
  padding: 0 16px;
  background: rgba(36, 87, 245, 0.08);
  color: #2457f5;
  font-weight: 700;
}

.login-agreement {
  display: flex;
  gap: 10px;
  align-items: center;
  color: #607089;
  font-size: 13px;
}

.login-submit {
  padding: 14px 16px;
  border: 0;
  background: linear-gradient(135deg, #2457f5, #4f84ff);
  color: #fff;
  font-weight: 800;
}

.login-third-party {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 14px;
}

.login-third-party button {
  width: 52px;
  height: 52px;
  border: 0;
  border-radius: 50%;
  background: linear-gradient(180deg, #f0f5ff 0%, #e5ecff 100%);
  color: #2742a5;
  font-weight: 800;
}
</style>
