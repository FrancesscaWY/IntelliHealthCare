<script setup lang="ts">
import type { PageComponentProps } from "@ihc/page-core/types";
import mock from "./mock";

const props = defineProps<PageComponentProps>();

function goBack() {
  if (!props.navigation.navigateBack()) {
    props.navigation.reLaunch("home/MyJ/setting");
  }
}

function showPending(label: string) {
  props.showToast(`${label}功能待接入`);
}
</script>

<template>
  <section class="security-page">
    <header class="page-header">
      <button class="back-btn" type="button" aria-label="返回设置页" @click="goBack">
        <span class="back-arrow" aria-hidden="true"></span>
      </button>
      <h1>{{ mock.title }}</h1>
    </header>

    <main class="page-content">
      <section class="panel">
        <button class="basic-row" type="button" @click="showPending('手机号')">
          <span class="row-label">手机号码</span>
          <span class="row-value">{{ mock.phone }}</span>
          <span class="row-arrow" aria-hidden="true"></span>
        </button>
        <button class="basic-row" type="button" @click="showPending('登录密码')">
          <span class="row-label">登录密码</span>
          <span class="row-value">{{ mock.passwordLabel }}</span>
          <span class="row-arrow" aria-hidden="true"></span>
        </button>
      </section>

      <section class="social-section">
        <p class="section-label">{{ mock.socialTitle }}</p>
        <section class="panel">
          <button
            v-for="item in mock.socials"
            :key="item.key"
            class="social-row"
            type="button"
            @click="showPending(item.label)"
          >
            <span class="social-left">
              <span class="icon-wrap">
                <img :src="item.icon" :alt="item.label" />
              </span>
              <span class="row-label">{{ item.label }}</span>
            </span>
            <span class="row-value row-value--muted">{{ item.status }}</span>
            <span class="row-arrow" aria-hidden="true"></span>
          </button>
        </section>
      </section>
    </main>
  </section>
</template>

<style scoped>
.security-page {
  position: relative;
  left: 50%;
  width: min(390px, 100vw);
  min-height: min(844px, calc(100vh - 36px));
  margin: -18px 0;
  background: #f5f6f7;
  color: #2c322d;
  font-family: "HarmonyOS Sans SC", "MiSans", var(--ihc-font-family);
  transform: translateX(-50%);
  -webkit-font-smoothing: antialiased;
}

.page-header {
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr);
  align-items: center;
  gap: 10px;
  height: 70px;
  padding: 0 18px;
}

.back-btn,
.basic-row,
.social-row {
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
}

.back-btn {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
}

.back-arrow {
  width: 11px;
  height: 11px;
  border-bottom: 2px solid #343936;
  border-left: 2px solid #343936;
  transform: rotate(45deg);
}

.page-header h1 {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
}

.page-content {
  display: grid;
  gap: 18px;
  padding: 0 18px 24px;
}

.panel {
  overflow: hidden;
  border-radius: 20px;
  background: #ffffff;
  box-shadow: inset 0 0 0 1px #eceff3;
}

.basic-row,
.social-row {
  width: 100%;
  min-height: 84px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto 16px;
  align-items: center;
  gap: 14px;
  padding: 0 18px;
  border-top: 1px solid #eef1f4;
  text-align: left;
}

.basic-row:first-child,
.social-row:first-child {
  border-top: 0;
}

.row-label {
  color: #3d423d;
  font-size: 16px;
  font-weight: 500;
}

.row-value {
  color: #3d423d;
  font-size: 16px;
  font-weight: 500;
}

.row-value--muted {
  color: #b6bbc3;
}

.row-arrow {
  width: 10px;
  height: 10px;
  border-top: 2px solid #d0d5db;
  border-right: 2px solid #d0d5db;
  transform: rotate(45deg);
}

.section-label {
  margin: 0 0 10px;
  color: #b0b6bf;
  font-size: 14px;
}

.social-left {
  display: flex;
  align-items: center;
  gap: 14px;
}

.icon-wrap {
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: #ffffff;
  box-shadow: inset 0 0 0 1px #e1e5ea;
}

.icon-wrap img {
  width: 22px;
  height: 22px;
  object-fit: contain;
}
</style>

