<script setup lang="ts">
import { reactive, ref } from "vue";
import type { PageComponentProps } from "@ihc/page-core/types";
import mock from "./mock";

const props = defineProps<PageComponentProps>();

const form = reactive({
  realName: "",
  idCard: "",
  gender: "",
  birthday: "",
  address: "",
});
const activePicker = ref<"gender" | "birthday" | null>(null);
const birthdayDraft = ref(mock.birthdayDefault);

function goBack() {
  if (!props.navigation.navigateBack()) {
    props.navigation.reLaunch("auth/login");
  }
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

function saveProfile() {
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

  props.showToast("保存成功");
  window.setTimeout(() => {
    props.navigation.reLaunch("home/dashboard");
  }, 280);
}
</script>

<template>
  <section class="real-name-page">
    <header class="real-name-nav">
      <button class="back-btn" type="button" aria-label="返回" @click="goBack">
        <span class="back-arrow" aria-hidden="true"></span>
      </button>
      <h1>实名认证</h1>
    </header>

    <section class="profile-form">
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
        <span class="profile-value">{{ mock.phone }}</span>
      </div>

      <label class="profile-row" for="address">
        <span class="profile-label">家庭住址</span>
        <input id="address" v-model="form.address" class="profile-input" type="text" placeholder="请填写目前的家庭住址" />
      </label>
    </section>

    <div class="real-name-fill" aria-hidden="true"></div>

    <footer class="save-area">
      <button class="save-btn" type="button" @click="saveProfile">保存</button>
    </footer>

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
  padding-bottom: 112px;
  transform: translateX(-50%);
  overflow: hidden;
  background: #f5f6f7;
  color: #333333;
}

.real-name-nav {
  display: flex;
  align-items: center;
  height: 70px;
  padding: 0 19px;
  background: #ffffff;
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
  border-bottom: 3px solid #3b3b3b;
  border-left: 3px solid #3b3b3b;
  transform: rotate(45deg);
}

.real-name-nav h1 {
  margin: 0 0 0 2px;
  color: #333333;
  font-size: 24px;
  font-weight: 400;
  letter-spacing: 0.02em;
}

.profile-form {
  background: #ffffff;
}

.profile-row {
  position: relative;
  display: grid;
  grid-template-columns: 139px minmax(0, 1fr) 20px;
  align-items: center;
  width: 100%;
  height: 65px;
  padding: 0 18px 0 22px;
  border: 0;
  border-top: 1px solid #f0f0f0;
  background: #ffffff;
  text-align: left;
}

.profile-row:first-child {
  border-top: 0;
}

.profile-label {
  color: #9a9a9a;
  font-size: 20px;
  font-weight: 400;
  letter-spacing: 0.03em;
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
  font-size: 20px;
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
  color: #b6b6b6;
  opacity: 1;
}

.profile-arrow {
  justify-self: end;
  width: 10px;
  height: 10px;
  border-top: 3px solid #d2d2d2;
  border-right: 3px solid #d2d2d2;
  transform: rotate(45deg);
}

.real-name-fill {
  height: 524px;
  background: #f5f6f7;
}

.save-area {
  position: absolute;
  right: 18px;
  bottom: 29px;
  left: 18px;
}

.save-btn {
  width: 100%;
  height: 66px;
  border: 0;
  border-radius: 16px;
  background: #6670f0;
  box-shadow: 0 14px 28px rgba(102, 112, 240, 0.18);
  color: #ffffff;
  font-size: 23px;
  font-weight: 500;
  letter-spacing: 0.04em;
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
  .profile-row {
    grid-template-columns: 118px minmax(0, 1fr) 18px;
    padding-right: 16px;
    padding-left: 18px;
  }

  .profile-label,
  .profile-input,
  .profile-placeholder,
  .profile-value {
    font-size: 18px;
  }
}
</style>
