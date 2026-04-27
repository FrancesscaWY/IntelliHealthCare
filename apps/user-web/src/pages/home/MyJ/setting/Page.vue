<script setup lang="ts">
import type { PageComponentProps } from "@ihc/page-core/types";
import { logout as logoutRequest } from "@/shared/api/auth";
import { clearUserAuthSession } from "@/shared/auth/session";
import mock, { type SettingItem } from "./mock";

const props = defineProps<PageComponentProps>();

function goBack() {
  props.navigation.reLaunch("home/mine");
}

function openSetting(item: SettingItem) {
  if (item.key === "cache") {
    props.showToast("缓存已清除");
    return;
  }

  if (!item.pageId) {
    props.showToast(`${item.label}功能待接入`);
    return;
  }

  props.navigation.navigateTo(item.pageId);
}

async function logout() {
  try {
    await logoutRequest();
  } catch {
    // 即使后端退出接口失败，也要清理本地登录态。
  } finally {
    clearUserAuthSession();
    props.showToast("已退出账号");
    props.navigation.reLaunch("auth/login");
  }
}
</script>

<template>
  <section class="setting-page">
    <header class="setting-hero">
      <div class="hero-nav">
        <button class="back-btn" type="button" aria-label="返回我的页面" @click="goBack">
          <span class="back-arrow" aria-hidden="true"></span>
        </button>
        <h1>{{ mock.title }}</h1>
      </div>
    </header>

    <main class="setting-content">
      <section v-for="group in mock.groups" :key="group.id" class="setting-group">
        <button
          v-for="item in group.items"
          :key="item.key"
          class="setting-row"
          type="button"
          @click="openSetting(item)"
        >
          <span>{{ item.label }}</span>
          <span class="row-arrow" aria-hidden="true"></span>
        </button>
      </section>
    </main>

    <footer class="setting-footer">
      <button class="logout-btn" type="button" @click="logout">{{ mock.logoutLabel }}</button>
    </footer>
  </section>
</template>

<style scoped>
.setting-page {
  position: relative;
  left: 50%;
  width: min(390px, 100vw);
  min-height: var(--ihc-page-min-height);
  margin: -18px 0;
  background: #f5f6f7;
  color: #253126;
  font-family: "HarmonyOS Sans SC", "MiSans", var(--ihc-font-family);
  transform: translateX(-50%);
  -webkit-font-smoothing: antialiased;
}

.setting-hero {
  position: relative;
  min-height: 0;
  padding: 14px 16px;
  overflow: hidden;
  border-radius: 0 0 28px 28px;
  background: linear-gradient(180deg, #eef1f3 0%, #e7ebef 100%);
  color: #2e342f;
}

.hero-nav {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: 36px minmax(0, 1fr);
  align-items: center;
  gap: 12px;
  margin-top: 0;
}

.back-btn,
.setting-row,
.logout-btn {
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
}

.back-btn {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: 18px;
  border: 1px solid #d8dde3;
  background: rgba(255, 255, 255, 0.88);
}

.back-arrow {
  width: 11px;
  height: 11px;
  border-bottom: 2px solid #4c5447;
  border-left: 2px solid #4c5447;
  transform: rotate(45deg);
}

.hero-nav h1 {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  letter-spacing: 0;
}

.setting-content {
  display: grid;
  gap: 16px;
  padding: 22px 14px 128px;
}

.setting-group {
  overflow: hidden;
  border-radius: 22px;
  background: #ffffff;
  box-shadow:
    0 10px 24px rgba(65, 78, 98, 0.05),
    inset 0 0 0 1px #eceff3;
}

.setting-row {
  width: 100%;
  height: 74px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 18px;
  align-items: center;
  gap: 12px;
  padding: 0 26px;
  border-bottom: 1px solid #eef1f4;
  color: #2f352f;
  text-align: left;
  font-size: 15px;
  font-weight: 600;
}

.setting-row:last-child {
  border-bottom: 0;
}

.row-arrow {
  width: 10px;
  height: 10px;
  justify-self: end;
  border-top: 2px solid #d0d5db;
  border-right: 2px solid #d0d5db;
  transform: rotate(45deg);
}

.setting-footer {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  padding: 16px 14px 18px;
  background: linear-gradient(180deg, rgba(245, 246, 247, 0) 0%, #f5f6f7 34%);
}

.logout-btn {
  width: 100%;
  height: 54px;
  border-radius: 18px;
  background: #3a483f;
  color: #ffffff;
  font-size: 17px;
  font-weight: 700;
  box-shadow: 0 14px 22px rgba(58, 72, 63, 0.22);
}
</style>
