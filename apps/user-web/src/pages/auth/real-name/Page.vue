<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import type { PageComponentProps } from "@ihc/page-core/types";
import { getCurrentUser, submitRealName, updateUserProfile } from "@/shared/api/auth";
import { DEFAULT_AUTHENTICATED_PAGE_ID } from "@/shared/auth/navigation";
import mock from "./mock";
import { lastLoginPhone } from "../session";

const props = defineProps<PageComponentProps>();
const form = reactive({
  realName: "",
  idCard: "",
  gender: "",
  birthday: "",
  address: "",
  saving: false,
});
const activePicker = ref<"gender" | "birthday" | null>(null);
const birthdayDraft = ref(mock.birthdayDefault);
const profilePhone = ref("");
const displayPhone = computed(() => profilePhone.value || lastLoginPhone.value || mock.phone);

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "请求失败，请稍后重试";
}

function mapGenderFromApi(gender: string | null) {
  if (gender === "MALE") {
    return "男";
  }

  if (gender === "FEMALE") {
    return "女";
  }

  return "";
}

function mapGenderToApi(gender: string) {
  if (gender === "男") {
    return "MALE" as const;
  }

  if (gender === "女") {
    return "FEMALE" as const;
  }

  return "UNKNOWN" as const;
}

function goBack() {
  if (!props.navigation.navigateBack()) {
    props.navigation.reLaunch("auth/login");
  }
}

function skipRealName() {
  props.navigation.reLaunch(DEFAULT_AUTHENTICATED_PAGE_ID);
}

function openGenderPicker() {
  activePicker.value = "gender";
}

function openBirthdayPicker() {
  birthdayDraft.value = form.birthday || mock.birthdayDefault;
  activePicker.value = "birthday";
}

function closePicker() {
  activePicker.value = null;
}

function selectGender(gender: string) {
  form.gender = gender;
  closePicker();
}

function confirmBirthday() {
  form.birthday = birthdayDraft.value;
  closePicker();
}

async function saveProfile() {
  if (form.saving) {
    return;
  }

  if (!form.realName.trim()) {
    props.showToast("请填写真实姓名");
    return;
  }

  if (!form.idCard.trim()) {
    props.showToast("请填写身份证号");
    return;
  }

  if (!form.gender.trim()) {
    props.showToast("请选择性别");
    return;
  }

  if (!form.birthday.trim()) {
    props.showToast("请选择出生日期");
    return;
  }

  try {
    form.saving = true;
    await submitRealName({
      realName: form.realName.trim(),
      idCard: form.idCard.trim()
    });
    await updateUserProfile({
      gender: mapGenderToApi(form.gender),
      birthday: form.birthday
    });
    props.showToast("实名认证已提交");
    props.navigation.reLaunch(DEFAULT_AUTHENTICATED_PAGE_ID);
  } catch (error) {
    props.showToast(getErrorMessage(error));
  } finally {
    form.saving = false;
  }
}

onMounted(async () => {
  try {
    const currentUser = await getCurrentUser();
    profilePhone.value = currentUser.phone;
    form.gender = mapGenderFromApi(currentUser.gender);
    form.birthday = currentUser.birthday || "";

    if (currentUser.name && currentUser.name !== currentUser.phone) {
      form.realName = currentUser.name;
    }
  } catch (error) {
    props.showToast(getErrorMessage(error));
  }
});
</script>

<template>
  <section class="real-name-page">
    <header class="real-name-nav">
      <button class="back-btn" type="button" aria-label="返回" @click="goBack">
        <span class="back-arrow" aria-hidden="true"></span>
      </button>
      <h1>实名认证</h1>
      <button class="skip-btn" type="button" @click="skipRealName">跳过</button>
    </header>

    <section class="verify-hero">
      <div>
        <h2>实名认证</h2>
        <p>更加真实，更受欢迎</p>
      </div>
      <span class="verify-icon" aria-hidden="true">
        <svg viewBox="0 0 128 128" focusable="false">
          <defs>
            <linearGradient id="shieldBody" x1="22" y1="18" x2="106" y2="112" gradientUnits="userSpaceOnUse">
              <stop offset="0" stop-color="#e5ecff" />
              <stop offset="0.5" stop-color="#6f8dff" />
              <stop offset="1" stop-color="#8c6cf5" />
            </linearGradient>
            <linearGradient id="shieldFace" x1="33" y1="23" x2="98" y2="105" gradientUnits="userSpaceOnUse">
              <stop offset="0" stop-color="#f7fbff" stop-opacity="0.72" />
              <stop offset="0.52" stop-color="#7692ff" stop-opacity="0.72" />
              <stop offset="1" stop-color="#8a72fb" stop-opacity="0.78" />
            </linearGradient>
            <linearGradient id="shieldCheck" x1="43" y1="64" x2="87" y2="64" gradientUnits="userSpaceOnUse">
              <stop offset="0" stop-color="#ecfbff" />
              <stop offset="1" stop-color="#ffffff" />
            </linearGradient>
          </defs>
          <path class="shield-shadow" d="M64 8 108 26v31c0 29-17.5 49.3-44 61-26.5-11.7-44-32-44-61V26L64 8Z" />
          <path class="shield-body" d="M64 8 108 26v31c0 29-17.5 49.3-44 61-26.5-11.7-44-32-44-61V26L64 8Z" />
          <path class="shield-face" d="M64 20 97 34v24c0 21.8-12.8 37.8-33 48-20.2-10.2-33-26.2-33-48V34L64 20Z" />
          <path class="shield-split" d="M64 20v86c20.2-10.2 33-26.2 33-48V34L64 20Z" />
          <path class="shield-check" d="M43 64.5 57.4 78 87 49" />
        </svg>
      </span>
    </section>

    <section class="profile-form">
      <h2>请您使用有效身份证信息认证</h2>

      <label class="profile-row" for="realName">
        <span class="profile-label">真实姓名<em>*</em></span>
        <input id="realName" v-model="form.realName" class="profile-input" type="text" placeholder="请填写您的真实姓名" />
      </label>

      <label class="profile-row" for="idCard">
        <span class="profile-label">身份证号<em>*</em></span>
        <input id="idCard" v-model="form.idCard" class="profile-input" type="text" placeholder="请填写您的身份证号" />
      </label>

      <button class="profile-row profile-row--picker" type="button" @click="openGenderPicker">
        <span class="profile-label">性别<em>*</em></span>
        <span :class="form.gender ? 'profile-value' : 'profile-placeholder'">{{ form.gender || "请选择您的性别" }}</span>
        <span class="profile-arrow" aria-hidden="true"></span>
      </button>

      <button class="profile-row profile-row--picker" type="button" @click="openBirthdayPicker">
        <span class="profile-label">出生日期<em>*</em></span>
        <span :class="form.birthday ? 'profile-value' : 'profile-placeholder'">{{ form.birthday || "请选择您的出生日期" }}</span>
        <span class="profile-arrow" aria-hidden="true"></span>
      </button>

      <div class="profile-row">
        <span class="profile-label">联系电话<em>*</em></span>
        <span class="profile-value">{{ displayPhone }}</span>
      </div>

      <label class="profile-row" for="address">
        <span class="profile-label">家庭住址</span>
        <input id="address" v-model="form.address" class="profile-input" type="text" placeholder="请填写目前的家庭住址" />
      </label>

      <div class="card-actions">
        <button class="save-btn" type="button" :disabled="form.saving" @click="saveProfile">
          {{ form.saving ? "提交中..." : "立即认证" }}
        </button>
      </div>
    </section>

    <p class="real-name-note">
      <span aria-hidden="true">i</span>
      实名仅用于确认本人身份，不会对信息做任何采集与传播，请放心使用。
    </p>

    <div v-if="activePicker" class="picker-mask" @click="closePicker">
      <section class="picker-panel" @click.stop>
        <header class="picker-header">
          <button type="button" @click="closePicker">取消</button>
          <strong>{{ activePicker === "gender" ? "选择性别" : "选择出生日期" }}</strong>
          <button v-if="activePicker === 'birthday'" type="button" @click="confirmBirthday">确定</button>
          <span v-else></span>
        </header>

        <div v-if="activePicker === 'gender'" class="gender-picker">
          <button
            v-for="option in mock.genderOptions"
            :key="option"
            type="button"
            :class="{ 'gender-option--active': form.gender === option }"
            @click="selectGender(option)"
          >
            {{ option }}
          </button>
        </div>

        <div v-else class="birthday-picker">
          <input v-model="birthdayDraft" type="date" :min="mock.birthdayMin" :max="mock.birthdayMax" />
        </div>
      </section>
    </div>
  </section>
</template>

<style scoped>
.real-name-page {
  position: relative;
  left: 50%;
  width: min(390px, 100vw);
  height: min(844px, calc(100vh - 36px));
  min-height: min(844px, calc(100vh - 36px));
  max-height: 844px;
  margin: -18px 0;
  transform: translateX(-50%);
  overflow: hidden;
  background:
    linear-gradient(180deg, #4f6ff5 0, #6287ff 118px, #83b8ff 248px, #f6f7fb 328px, #f6f7fb 100%);
  color: #333333;
  font-family: var(--ihc-font-family);
}

.real-name-nav {
  display: flex;
  align-items: center;
  height: 64px;
  padding: 0 28px;
  background: transparent;
}

.back-btn {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  width: 32px;
  height: 40px;
  padding: 0;
  border: 0;
  background: transparent;
}

.back-arrow {
  width: 13px;
  height: 13px;
  border-bottom: 3px solid #ffffff;
  border-left: 3px solid #ffffff;
  transform: rotate(45deg);
}

.real-name-nav h1 {
  display: none;
}

.skip-btn {
  margin-left: auto;
  padding: 0;
  border: 0;
  background: transparent;
  color: rgba(255, 255, 255, 0.88);
  font-size: 15px;
  line-height: 1;
}

.verify-hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 150px;
  align-items: start;
  min-height: 205px;
  padding: 18px 20px 0 31px;
  overflow: visible;
}

.verify-hero > div {
  transform: translateY(26px);
}

.verify-icon {
  position: relative;
  z-index: 2;
  display: grid;
  place-items: center;
  width: 168px;
  height: 168px;
  filter: drop-shadow(0 24px 24px rgba(40, 72, 164, 0.24));
  transform: translate(-18px, 0) rotate(-8deg);
}

.verify-icon svg {
  display: block;
  width: 168px;
  height: 168px;
}

.shield-shadow {
  fill: rgba(255, 255, 255, 0.38);
  transform: translate(5px, -4px);
}

.shield-body {
  fill: url(#shieldBody);
  stroke: rgba(255, 255, 255, 0.72);
  stroke-width: 7;
}

.shield-face {
  fill: url(#shieldFace);
}

.shield-split {
  fill: rgba(68, 82, 223, 0.16);
}

.shield-check {
  fill: none;
  stroke: url(#shieldCheck);
  stroke-width: 12;
  stroke-linecap: round;
  stroke-linejoin: round;
  filter: drop-shadow(0 5px 5px rgba(65, 86, 188, 0.28));
}

.verify-hero h2 {
  margin: 0;
  color: #ffffff;
  font-size: 25px;
  font-weight: 400;
  letter-spacing: 0.04em;
  line-height: 1.2;
}

.verify-hero p {
  margin: 11px 0 0;
  color: rgba(255, 255, 255, 0.76);
  font-size: 15px;
  letter-spacing: 0.04em;
}

.profile-form {
  position: relative;
  z-index: 3;
  margin: -46px 28px 0;
  overflow: hidden;
  padding: 25px 19px 21px;
  border-radius: 12px;
  background: #ffffff;
  box-shadow: 0 16px 34px rgba(66, 86, 124, 0.08);
}

.profile-form h2 {
  margin: 0 0 20px;
  color: #1f2530;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.profile-row {
  position: relative;
  display: grid;
  grid-template-columns: 80px minmax(0, 1fr) 14px;
  align-items: center;
  width: 100%;
  min-height: 45px;
  margin-top: 12px;
  padding: 0 16px 0 18px;
  border: 0;
  border-radius: 999px;
  background: #f8f9fb;
  text-align: left;
}

.profile-row:first-child {
  margin-top: 0;
}

.profile-label {
  color: #5f6672;
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 0;
  white-space: nowrap;
}

.profile-label em {
  color: #f26161;
  font-style: normal;
}

.profile-input,
.profile-placeholder,
.profile-value {
  min-width: 0;
  color: #333333;
  font-size: 15px;
  font-weight: 400;
}

.profile-input {
  width: 100%;
  border: 0;
  outline: 0;
  background: transparent;
}

.profile-input::placeholder,
.profile-placeholder {
  color: #b4bac4;
  opacity: 1;
}

.profile-arrow {
  justify-self: end;
  width: 8px;
  height: 8px;
  border-top: 2px solid #cbd0d8;
  border-right: 2px solid #cbd0d8;
  transform: rotate(45deg);
}

.card-actions {
  margin-top: 18px;
}

.save-btn {
  width: 100%;
  height: 50px;
  border: 0;
  border-radius: 999px;
  background: linear-gradient(90deg, #9b73ff 0%, #5269f8 100%);
  box-shadow: 0 14px 30px rgba(93, 105, 248, 0.22);
  color: #ffffff;
  font-size: 17px;
  font-weight: 500;
  letter-spacing: 0.08em;
}

.save-btn:disabled {
  opacity: 0.7;
}

.real-name-note {
  display: flex;
  gap: 9px;
  margin: 16px 28px 0;
  padding: 15px 18px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.82);
  color: #969da8;
  font-size: 13px;
  line-height: 1.55;
}

.real-name-note span {
  display: grid;
  flex: 0 0 17px;
  place-items: center;
  width: 17px;
  height: 17px;
  margin-top: 1px;
  border-radius: 50%;
  background: #d8dce4;
  color: #ffffff;
  font-size: 12px;
  font-weight: 700;
}

.picker-mask {
  position: absolute;
  inset: 0;
  z-index: 10;
  display: flex;
  align-items: flex-end;
  background: rgba(0, 0, 0, 0.32);
}

.picker-panel {
  width: 100%;
  overflow: hidden;
  border-radius: 13px 13px 0 0;
  background: #ffffff;
}

.picker-header {
  display: grid;
  grid-template-columns: 74px 1fr 74px;
  align-items: center;
  height: 56px;
  border-bottom: 1px solid #eeeeee;
}

.picker-header button,
.picker-header span {
  border: 0;
  background: transparent;
  color: #6670f0;
  font-size: 18px;
}

.picker-header strong {
  color: #333333;
  font-size: 18px;
  font-weight: 500;
  text-align: center;
}

.gender-picker {
  padding: 8px 0 22px;  
}

.gender-picker button {
  width: 100%;
  height: 58px;
  border: 0;
  border-bottom: 1px solid #f0f0f0;
  background: #ffffff;
  color: #333333;
  font-size: 20px;
}

.gender-picker button:last-child {
  border-bottom: 0;
}

.gender-option--active {
  color: #6670f0 !important;
  font-weight: 600;
}

.birthday-picker {
  display: grid;
  place-items: center;
  padding: 34px 24px 42px;
}

.birthday-picker input {
  width: 100%;
  height: 54px;
  padding: 0 16px;
  border: 1px solid #eeeeee;
  border-radius: 10px;
  outline: 0;
  background: #ffffff;
  color: #333333;
  font-size: 20px;
  text-align: center;
}

@media (min-width: 561px) {
  .real-name-page {
    height: 844px;
    min-height: 844px;
  }
}

@media (max-width: 389px) {
  .profile-form {
    margin-right: 14px;
    margin-left: 14px;
  }

  .real-name-note {
    margin-right: 14px;
    margin-left: 14px;
  }

  .profile-row {
    grid-template-columns: 88px minmax(0, 1fr) 16px;
    padding-right: 13px;
    padding-left: 15px;
  }

  .profile-label {
    font-size: 14px;
  }

  .profile-input,
  .profile-placeholder,
  .profile-value {
    font-size: 15px;
  }
}
</style>
