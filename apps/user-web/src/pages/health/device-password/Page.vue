<script setup lang="ts">
import { computed, ref } from "vue";
import type { PageComponentProps } from "@ihc/page-core/types";
import { updateDevicePassword } from "@/shared/api/health";
import { selectedDeviceId } from "../device-center/state";

const props = defineProps<PageComponentProps>();
const password = ref("");
const isSaving = ref(false);

const isSaveDisabled = computed(() => password.value.length !== 6 || isSaving.value);

function goBack() {
  if (!props.navigation.navigateBack()) {
    props.navigation.reLaunch("health/device-detail");
  }
}

function onPasswordInput(event: Event) {
  const target = event.target as HTMLInputElement;
  password.value = target.value.replace(/\D/g, "").slice(0, 6);
}

async function savePassword() {
  if (isSaveDisabled.value) {
    return;
  }

  const deviceId = selectedDeviceId.value;
  if (!deviceId) {
    props.showToast("设备信息缺失");
    return;
  }

  try {
    isSaving.value = true;
    await updateDevicePassword(deviceId, password.value);
    props.showToast("密码已保存");
    goBack();
  } catch (error) {
    const message = error instanceof Error ? error.message : "保存失败，请稍后重试";
    props.showToast(message);
  } finally {
    isSaving.value = false;
  }
}
</script>

<template>
  <section class="device-password-page">
    <header class="password-nav">
      <button class="back-btn" type="button" aria-label="返回" @click="goBack">
        <span class="back-arrow" aria-hidden="true"></span>
      </button>
      <h1>设置密码</h1>
    </header>

    <main class="password-content">
      <h2>设置6位锁屏密码</h2>

      <label class="password-field">
        <span class="sr-only">请输入密码</span>
        <input
          :value="password"
          type="password"
          inputmode="numeric"
          maxlength="6"
          autocomplete="one-time-code"
          placeholder="请输入密码"
          @input="onPasswordInput"
        />
      </label>

      <button class="save-btn" type="button" :disabled="isSaveDisabled" @click="savePassword">
        {{ isSaving ? "保存中..." : "保存" }}
      </button>
    </main>
  </section>
</template>

<style scoped>
.device-password-page {
  position: relative;
  left: 50%;
  width: min(390px, 100vw);
  height: min(844px, calc(100vh - 36px));
  min-height: min(844px, calc(100vh - 36px));
  max-height: 844px;
  margin: -18px 0;
  overflow: hidden;
  background: #ffffff;
  color: #3a3f48;
  font-family: var(--ihc-font-family);
  transform: translateX(-50%);
  -webkit-font-smoothing: antialiased;
}

.password-nav {
  display: flex;
  align-items: center;
  height: 58px;
  padding: 0 18px 0 16px;
}

.back-btn,
.save-btn {
  border: 0;
}

.back-btn {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  padding: 0;
  background: transparent;
  color: inherit;
}

.back-arrow {
  width: 11px;
  height: 11px;
  border-bottom: 2px solid #2f333a;
  border-left: 2px solid #2f333a;
  transform: rotate(45deg);
}

.password-nav h1 {
  margin: 0 0 0 10px;
  font-size: 16px;
  font-weight: 400;
  color: #353942;
}

.password-content {
  display: flex;
  flex-direction: column;
  height: calc(100% - 58px);
  padding: 78px 16px 24px;
}

.password-content h2 {
  margin: 0;
  text-align: center;
  font-size: 17px;
  font-weight: 400;
  color: #4a4f58;
}

.password-field {
  display: block;
  margin-top: 86px;
  border-bottom: 1px solid #ececef;
}

.password-field input {
  width: 100%;
  height: 52px;
  padding: 0 8px;
  border: 0;
  outline: none;
  background: transparent;
  color: #383d46;
  font-size: 15px;
  font-weight: 400;
}

.password-field input::placeholder {
  color: #d1d3d8;
}

.save-btn {
  margin-top: 102px;
  height: 52px;
  border-radius: 18px;
  background: #cfd3ff;
  color: #ffffff;
  font-size: 15px;
  font-weight: 400;
}

.save-btn:disabled {
  cursor: default;
  opacity: 1;
}

.save-btn:not(:disabled) {
  background: linear-gradient(180deg, #aeb7ff 0%, #9ea9ff 100%);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

@media (min-width: 561px) {
  .device-password-page {
    height: 844px;
    min-height: 844px;
  }
}

@media (max-width: 389px) {
  .password-content {
    padding-top: 70px;
    padding-right: 14px;
    padding-left: 14px;
  }

  .password-field {
    margin-top: 74px;
  }

  .save-btn {
    margin-top: 90px;
  }
}
</style>
