<script setup lang="ts">
import { computed, reactive } from "vue";
import type { PageComponentProps } from "@ihc/page-core/types";
import mock from "./mock";

const props = defineProps<PageComponentProps>();

const form = reactive({
  phone: "",
  code: "",
});

const canSubmit = computed(() => form.phone.trim().length > 0 && form.code.trim().length > 0);

function goBack() {
  if (!props.navigation.navigateBack()) {
    props.navigation.reLaunch("auth/login");
  }
}

function getCode() {
  if (!form.phone.trim()) {
    props.showToast("请输入手机号码");
    return;
  }

  props.showToast("验证码已发送");
}

function submit() {
  if (!form.phone.trim()) {
    props.showToast("请输入手机号码");
    return;
  }

  if (!form.code.trim()) {
    props.showToast("请输入验证码");
    return;
  }

  props.showToast("验证成功");
  window.setTimeout(() => {
    props.navigation.navigateTo("auth/reset-password");
  }, 280);
}
</script>

<template>
  <section class="forgot-page">
    <header class="forgot-nav">
      <button class="back-btn" type="button" aria-label="返回" @click="goBack">
        <span class="back-arrow" aria-hidden="true"></span>
      </button>
      <h1>{{ mock.title }}</h1>
    </header>

    <main class="forgot-content">
      <h2>{{ mock.heading }}</h2>

      <form class="forgot-form" @submit.prevent="submit">
        <label class="forgot-field" for="forgotPhone">
          <input id="forgotPhone" v-model="form.phone" type="tel" maxlength="11" :placeholder="mock.phonePlaceholder" />
        </label>

        <label class="forgot-field forgot-field--code" for="forgotCode">
          <input id="forgotCode" v-model="form.code" type="text" maxlength="6" :placeholder="mock.codePlaceholder" />
          <button type="button" @click="getCode">获取验证码</button>
        </label>

        <button class="submit-btn" :class="{ 'submit-btn--active': canSubmit }" type="submit">提交</button>
      </form>
    </main>
  </section>
</template>

<style scoped>
.forgot-page {
  position: relative;
  left: 50%;
  width: min(390px, 100vw);
  height: min(844px, calc(100vh - 36px));
  min-height: min(844px, calc(100vh - 36px));
  max-height: 844px;
  margin: -18px 0;
  transform: translateX(-50%);
  overflow: hidden;
  background: #ffffff;
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
  font-weight: 400;
  letter-spacing: 0.02em;
}

.forgot-content {
  padding: 0 26px;
}

.forgot-content h2 {
  margin: 70px 0 0;
  color: #333333;
  font-size: 25px;
  font-weight: 400;
  line-height: 1.25;
  text-align: center;
}

.forgot-form {
  margin-top: 71px;
}

.forgot-field {
  display: flex;
  align-items: center;
  height: 88px;
  border-bottom: 1px solid #eeeeee;
}

.forgot-field input {
  flex: 1;
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: #333333;
  font-size: 22px;
  font-weight: 400;
}

.forgot-field input::placeholder {
  color: #c2c4cb;
  opacity: 1;
}

.forgot-field--code button {
  flex: 0 0 auto;
  margin-left: 14px;
  padding: 0;
  border: 0;
  background: transparent;
  color: #6670f0;
  font-size: 22px;
  font-weight: 400;
}

.submit-btn {
  width: 100%;
  height: 66px;
  margin-top: 49px;
  border: 0;
  border-radius: 14px;
  background: #d9dcff;
  color: #ffffff;
  font-size: 25px;
  font-weight: 500;
  letter-spacing: 0.06em;
}

.submit-btn--active {
  background: #6670f0;
  box-shadow: 0 14px 28px rgba(102, 112, 240, 0.2);
}

@media (min-width: 561px) {
  .forgot-page {
    height: 844px;
    min-height: 844px;
  }
}

@media (max-width: 389px) {
  .forgot-content {
    padding-right: 22px;
    padding-left: 22px;
  }

  .forgot-content h2 {
    margin-top: 58px;
  }

  .forgot-form {
    margin-top: 58px;
  }

  .forgot-field input,
  .forgot-field--code button {
    font-size: 20px;
  }
}
</style>
