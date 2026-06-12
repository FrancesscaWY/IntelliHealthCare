<script setup lang="ts">
import { onMounted, reactive } from "vue";
import type { PageComponentProps } from "@ihc/page-core/types";
import { loadUserProfileState, syncUserProfileStateFromApi } from "@/pages/home/profile/profile-store";
import mock from "./mock";

const props = defineProps<PageComponentProps>();
const profile = reactive(loadUserProfileState());

onMounted(async () => {
  Object.assign(profile, loadUserProfileState());

  try {
    Object.assign(profile, await syncUserProfileStateFromApi());
  } catch {
    props.showToast("个人资料加载失败，已显示本地缓存");
  }
});

function goBack() {
  if (!props.navigation.navigateBack()) {
    props.navigation.reLaunch("home/MyJ/setting");
  }
}

function triggerAvatarUpload() {
  props.showToast("当前后端未提供头像写回接口，页面资料已改为以后端信息为准");
}

function openField(label: string) {
  props.showToast(`${label}暂不支持写回后端，当前展示以后端资料为准`);
}
</script>

<template>
  <section class="info-page">
    <header class="page-header">
      <button class="back-btn" type="button" aria-label="返回设置页" @click="goBack">
        <span class="back-arrow" aria-hidden="true"></span>
      </button>
      <h1>{{ mock.title }}</h1>
    </header>

    <main class="page-content">
      <section class="panel">
        <button class="avatar-row" type="button" @click="triggerAvatarUpload">
          <span class="info-label">头像</span>
          <img class="avatar" :src="profile.avatarUrl" alt="个人头像" />
          <span class="row-arrow" aria-hidden="true"></span>
        </button>

        <button
          v-for="item in mock.items"
          :key="item.key"
          class="info-row"
          type="button"
          :class="{ 'info-row--plain': !item.editable }"
          @click="item.editable ? openField(item.label) : undefined"
        >
          <span class="info-label">{{ item.label }}</span>
          <span class="info-value" :class="{ 'info-value--placeholder': !item.value }">
            {{
              item.key === "nickname"
                ? profile.nickname
                : item.key === "gender"
                  ? profile.gender
                  : item.key === "intro"
                    ? profile.intro
                    : item.value || item.placeholder
            }}
          </span>
          <span v-if="item.editable" class="row-arrow" aria-hidden="true"></span>
        </button>
      </section>

      <p class="page-note">{{ mock.note }}</p>
    </main>
  </section>
</template>

<style scoped>
.info-page {
  position: relative;
  left: 50%;
  width: min(390px, 100vw);
  min-height: var(--ihc-page-min-height);
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
.avatar-row,
.info-row {
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
  padding: 0 18px 24px;
}

.panel {
  overflow: hidden;
  border-radius: 20px;
  background: #ffffff;
  box-shadow: inset 0 0 0 1px #eceff3;
}

.avatar-row,
.info-row {
  width: 100%;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto 16px;
  align-items: center;
  gap: 14px;
  padding: 0 18px;
  text-align: left;
}

.avatar-row {
  min-height: 92px;
}

.avatar {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  object-fit: cover;
  display: block;
}

.info-row {
  min-height: 84px;
  border-top: 1px solid #eef1f4;
}

.info-row--plain {
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 14px;
}

.info-label {
  color: #3d423d;
  font-size: 16px;
  font-weight: 500;
}

.info-value {
  color: #3d423d;
  font-size: 16px;
  font-weight: 500;
}

.info-value--placeholder {
  color: #b7bdc7;
}

.row-arrow {
  width: 10px;
  height: 10px;
  border-top: 2px solid #d0d5db;
  border-right: 2px solid #d0d5db;
  transform: rotate(45deg);
}

.page-note {
  margin: 18px 2px 0;
  color: #c0c5cc;
  font-size: 13px;
}
</style>
