<script setup lang="ts">
import { ref } from "vue";
import type { PageComponentProps } from "@ihc/page-core/types";
import mock from "./mock";

const props = defineProps<PageComponentProps>();

const account = ref(mock.account);
const password = ref(mock.password);
const remember = ref(mock.remember);

function submitLogin() {
  props.navigation.reLaunch("dashboard/overview");
  props.showToast("已进入后台，当前为免校验演示登录");
}

function openPage(pageId: string, label: string) {
  props.navigation.reLaunch(pageId);
  props.showToast(`已进入${label}`);
}
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
        <input v-model="account" type="text" placeholder="可留空或输入任意账号" />
      </label>

      <label class="field">
        <span>密码</span>
        <input v-model="password" type="password" placeholder="可留空或输入任意密码" />
      </label>

      <label class="remember-line">
        <input v-model="remember" type="checkbox" />
        <span>记住当前登录信息</span>
      </label>

      <button class="login-btn" type="button" @click="submitLogin">直接进入后台</button>

      <footer class="login-card__foot">
        <span>单页调试入口</span>
        <div class="quick-links">
          <button
            v-for="item in mock.quickEntries"
            :key="item.pageId"
            type="button"
            class="quick-link"
            @click="openPage(item.pageId, item.label)"
          >
            {{ item.label }}
          </button>
        </div>
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

.quick-links {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 12px;
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
