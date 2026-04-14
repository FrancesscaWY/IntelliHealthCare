<script setup lang="ts">
import { reactive } from "vue";
import type { PageComponentProps } from "@ihc/page-core/types";
import mock from "./mock";

const props = defineProps<PageComponentProps>();

const form = reactive({
  password: "",
  confirmPassword: "",
});

function goBack() {
  if (!props.navigation.navigateBack()) {
    props.navigation.reLaunch("auth/forgot-password");
  }
}

function submit() {
  if (!form.password.trim()) {
    props.showToast("请输入新的密码");
    return;
  }

  if (!form.confirmPassword.trim()) {
    props.showToast("请再次输入密码");
    return;
  }

  if (form.password !== form.confirmPassword) {
    props.showToast("两次输入的密码不一致");
    return;
  }

  props.showToast("密码设置成功");
  window.setTimeout(() => {
    props.navigation.reLaunch("auth/login");
  }, 280);
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

      <form class="reset-form" @submit.prevent="submit">
        <label class="reset-field" for="newPassword">
          <input id="newPassword" v-model="form.password" type="password" :placeholder="mock.passwordPlaceholder" />
        </label>

        <label class="reset-field" for="confirmPassword">
          <input id="confirmPassword" v-model="form.confirmPassword" type="password" :placeholder="mock.confirmPlaceholder" />
        </label>

        <button class="submit-btn" type="submit">确定</button>
      </form>
    </main>
  </section>
</template>

<style scoped>
.reset-page {
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
  font-weight: 400;
  letter-spacing: 0.02em;
}

.reset-content {
  padding: 0 26px;
}

.reset-content h2 {
  margin: 70px 0 0;
  color: #333333;
  font-size: 25px;
  font-weight: 400;
  line-height: 1.25;
  text-align: center;
}

.reset-form {
  margin-top: 71px;
}

.reset-field {
  display: flex;
  align-items: center;
  height: 88px;
  border-bottom: 1px solid #eeeeee;
}

.reset-field input {
  flex: 1;
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: #333333;
  font-size: 22px;
  font-weight: 400;
}

.reset-field input::placeholder {
  color: #c2c4cb;
  opacity: 1;
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

@media (min-width: 561px) {
  .reset-page {
    height: 844px;
    min-height: 844px;
  }
}

@media (max-width: 389px) {
  .reset-content {
    padding-right: 22px;
    padding-left: 22px;
  }

  .reset-content h2 {
    margin-top: 58px;
  }

  .reset-form {
    margin-top: 58px;
  }

  .reset-field input {
    font-size: 20px;
  }
}
</style>
