<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import type { PageComponentProps } from "@ihc/page-core/types";
import { loadUserProfileState, saveUserProfileState } from "@/pages/home/profile/profile-store";
import { getCurrentUserProfile, updateUserProfile, type CurrentUserProfileResponse } from "@/shared/api/auth";
import mock from "./mock";

type EditableField = "nickname" | "gender" | "intro" | null;

const props = defineProps<PageComponentProps>();
const profileState = loadUserProfileState();
const profile = reactive({
  userId: "",
  avatarUrl: profileState.avatarUrl,
  nickname: profileState.nickname,
  gender: profileState.gender,
  intro: profileState.intro,
});
const saving = ref(false);
const activeField = ref<EditableField>(null);
const draftValue = ref("");

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "请求失败，请稍后重试";
}

function mapGenderFromApi(gender: string | null) {
  if (gender === "MALE") return "男";
  if (gender === "FEMALE") return "女";
  return "未知";
}

function mapGenderToApi(gender: string) {
  if (gender === "男") return "MALE" as const;
  if (gender === "女") return "FEMALE" as const;
  return "UNKNOWN" as const;
}

function applyProfile(response: CurrentUserProfileResponse) {
  profile.userId = response.userId;
  profile.avatarUrl = response.avatar || profile.avatarUrl;
  profile.nickname =
    response.nickname?.trim() && response.nickname !== "????"
      ? response.nickname
      : response.realName || profile.nickname;
  profile.gender = mapGenderFromApi(response.gender);
  profile.intro = loadUserProfileState().intro;

  saveUserProfileState({
    avatarUrl: profile.avatarUrl,
    nickname: profile.nickname,
    gender: profile.gender,
    intro: profile.intro,
  });
}

async function loadProfile() {
  try {
    applyProfile(await getCurrentUserProfile());
  } catch (error) {
    props.showToast(getErrorMessage(error));
  }
}

function goBack() {
  if (!props.navigation.navigateBack()) {
    props.navigation.reLaunch("home/MyJ/setting");
  }
}

function triggerAvatarUpload() {
  props.showToast("头像上传接口暂未提供");
}

function openField(key: EditableField) {
  if (!key) return;
  activeField.value = key;
  draftValue.value = key === "nickname" ? profile.nickname : key === "gender" ? profile.gender : profile.intro;
}

function closeField() {
  activeField.value = null;
  draftValue.value = "";
}

async function saveField() {
  if (!activeField.value || saving.value) {
    return;
  }

  if (activeField.value === "intro") {
    profile.intro = draftValue.value.trim();
    saveUserProfileState({ intro: profile.intro });
    closeField();
    props.showToast("简介已保存到本地缓存");
    return;
  }

  try {
    saving.value = true;

    if (activeField.value === "nickname") {
      const nickname = draftValue.value.trim();

      if (!nickname) {
        throw new Error("请输入昵称");
      }

      await updateUserProfile({ nickname });
      profile.nickname = nickname;
      saveUserProfileState({ nickname });
    }

    if (activeField.value === "gender") {
      await updateUserProfile({ gender: mapGenderToApi(draftValue.value) });
      profile.gender = draftValue.value;
      saveUserProfileState({ gender: draftValue.value });
    }

    closeField();
    props.showToast("个人资料已更新");
  } catch (error) {
    props.showToast(getErrorMessage(error));
  } finally {
    saving.value = false;
  }
}

onMounted(() => {
  void loadProfile();
});
</script>

<template>
  <section class="info-page">
    <header class="page-header">
      <button class="back-btn" type="button" aria-label="返回" @click="goBack">
        <span class="back-arrow" aria-hidden="true"></span>
      </button>
      <h1>{{ mock.title }}</h1>
    </header>

    <main class="page-content">
      <section class="panel">
        <button class="avatar-row" type="button" @click="triggerAvatarUpload">
          <span class="info-label">头像</span>
          <img class="avatar" :src="profile.avatarUrl" alt="头像" />
          <span class="row-arrow" aria-hidden="true"></span>
        </button>

        <button class="info-row" type="button" @click="openField('nickname')">
          <span class="info-label">昵称</span>
          <span class="info-value">{{ profile.nickname }}</span>
          <span class="row-arrow" aria-hidden="true"></span>
        </button>

        <div class="info-row info-row--plain">
          <span class="info-label">ID</span>
          <span class="info-value" :class="{ 'info-value--placeholder': !profile.userId }">
            {{ profile.userId || "加载中..." }}
          </span>
        </div>

        <button class="info-row" type="button" @click="openField('gender')">
          <span class="info-label">性别</span>
          <span class="info-value">{{ profile.gender }}</span>
          <span class="row-arrow" aria-hidden="true"></span>
        </button>

        <button class="info-row" type="button" @click="openField('intro')">
          <span class="info-label">简介</span>
          <span class="info-value" :class="{ 'info-value--placeholder': !profile.intro }">
            {{ profile.intro || "添加简介" }}
          </span>
          <span class="row-arrow" aria-hidden="true"></span>
        </button>
      </section>

      <p class="page-note">{{ mock.note }}</p>
    </main>

    <div v-if="activeField" class="editor-mask" @click="closeField">
      <section class="editor-panel" @click.stop>
        <header class="editor-header">
          <button type="button" @click="closeField">取消</button>
          <strong>{{ activeField === "nickname" ? "编辑昵称" : activeField === "gender" ? "选择性别" : "编辑简介" }}</strong>
          <button type="button" :disabled="saving" @click="saveField">保存</button>
        </header>

        <div v-if="activeField === 'gender'" class="gender-list">
          <button
            v-for="option in ['男', '女', '未知']"
            :key="option"
            type="button"
            class="gender-option"
            :class="{ 'gender-option--active': draftValue === option }"
            @click="draftValue = option"
          >
            {{ option }}
          </button>
        </div>

        <div v-else class="editor-body">
          <input
            v-if="activeField === 'nickname'"
            v-model="draftValue"
            class="editor-input"
            type="text"
            maxlength="20"
            placeholder="请输入昵称"
          />
          <textarea
            v-else
            v-model="draftValue"
            class="editor-textarea"
            maxlength="120"
            placeholder="请输入简介"
          ></textarea>
        </div>
      </section>
    </div>
  </section>
</template>

<style scoped>
.info-page {
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
.avatar-row,
.info-row,
.editor-header button,
.gender-option {
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

.editor-mask {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: flex-end;
  background: rgba(0, 0, 0, 0.28);
}

.editor-panel {
  width: 100%;
  border-radius: 18px 18px 0 0;
  background: #ffffff;
  overflow: hidden;
}

.editor-header {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr) 72px;
  align-items: center;
  height: 56px;
  padding: 0 12px;
  border-bottom: 1px solid #eef1f4;
}

.editor-header strong {
  text-align: center;
  font-size: 16px;
}

.editor-header button {
  font-size: 15px;
  color: #5f6672;
}

.editor-body {
  padding: 18px;
}

.editor-input,
.editor-textarea {
  width: 100%;
  border: 1px solid #dfe4ea;
  border-radius: 14px;
  outline: 0;
  font: inherit;
}

.editor-input {
  height: 48px;
  padding: 0 14px;
}

.editor-textarea {
  min-height: 132px;
  padding: 14px;
  resize: none;
}

.gender-list {
  display: grid;
  gap: 12px;
  padding: 18px;
}

.gender-option {
  height: 48px;
  border-radius: 14px;
  background: #f5f6f7;
  font-size: 15px;
  font-weight: 600;
}

.gender-option--active {
  background: #2f3d2f;
  color: #ffffff;
}
</style>
