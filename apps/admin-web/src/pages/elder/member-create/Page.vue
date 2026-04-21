<script setup lang="ts">
import { onBeforeUnmount, onMounted, reactive, ref } from "vue";
import type { PageComponentProps } from "@ihc/page-core/types";
import memberListMock, { type MemberItem } from "../member-list/mock";
import mock from "./mock";

const props = defineProps<PageComponentProps>();

const addedMembersStorageKey = "admin:elder:added-members";
const pageShellHiddenClass = "member-create-shell-hidden";
const mockMemberIds = new Set(memberListMock.members.map((member) => member.id));
const avatarPalette = [
  { accent: "#8b97a4", shadow: "#33404d" },
  { accent: "#9c9084", shadow: "#4f4338" },
  { accent: "#88a096", shadow: "#345147" },
  { accent: "#938bb0", shadow: "#443d63" },
];

const birthdayInput = ref<HTMLInputElement | null>(null);
const avatarInput = ref<HTMLInputElement | null>(null);
const avatarPreviewUrl = ref("");

const form = reactive({
  memberId: "",
  nickname: "",
  realName: "",
  phone: "",
  idCard: "",
  gender: "",
  birthday: "",
  homeAddress: "",
  introduction: "",
  height: "",
  weight: "",
  nativePlace: "",
  ethnicity: "",
  education: "",
  maritalStatus: "",
  jobTitle: "",
  company: "",
  emergencyContact: "",
  emergencyPhone: "",
  loginPassword: "",
  remark: "",
});

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function readAddedMembers() {
  if (typeof window === "undefined") {
    return [] as MemberItem[];
  }

  const rawValue = window.sessionStorage.getItem(addedMembersStorageKey);

  if (!rawValue) {
    return [] as MemberItem[];
  }

  try {
    const parsed = JSON.parse(rawValue);

    if (!Array.isArray(parsed)) {
      return [] as MemberItem[];
    }

    return parsed
      .filter((item): item is MemberItem => Boolean(item && typeof item === "object" && typeof item.id === "string"))
      .filter((item) => !mockMemberIds.has(item.id))
      .map((item) => ({
        ...item,
        nickname: String(item.nickname || "").trim(),
        realName: String(item.realName || "").trim(),
        phone: String(item.phone || "").trim(),
        registeredAt: String(item.registeredAt || "").trim(),
        avatarAccent: String(item.avatarAccent || avatarPalette[0].accent),
        avatarShadow: String(item.avatarShadow || avatarPalette[0].shadow),
        tags: Array.isArray(item.tags) ? item.tags.map((tag) => ({ ...tag })) : [],
      }));
  } catch {
    return [] as MemberItem[];
  }
}

function saveAddedMembers(sourceMembers: MemberItem[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(addedMembersStorageKey, JSON.stringify(sourceMembers));
}

function readAllMemberIds() {
  return new Set([...memberListMock.members, ...readAddedMembers()].map((member) => member.id));
}

function generateMemberId() {
  const existingIds = readAllMemberIds();
  let candidate = "";

  do {
    const now = new Date();
    const dateToken = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
    const suffix = `${Math.floor(Math.random() * 9000) + 1000}`;
    candidate = `${dateToken}${suffix}`;
  } while (existingIds.has(candidate));

  return candidate;
}

function buildRegisteredAt() {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

function createMemberAvatar(index: number) {
  return avatarPalette[index % avatarPalette.length];
}

function openBirthdayPicker() {
  const input = birthdayInput.value;

  if (!input) {
    return;
  }

  input.focus({ preventScroll: true });

  if (typeof input.showPicker === "function") {
    input.showPicker();
    return;
  }

  input.click();
}

function formatDateLabel(value: string) {
  if (!value) {
    return "请选择";
  }

  return value;
}

function chooseAvatar() {
  avatarInput.value?.click();
}

function revokeAvatarPreview() {
  if (avatarPreviewUrl.value.startsWith("blob:")) {
    URL.revokeObjectURL(avatarPreviewUrl.value);
  }

  avatarPreviewUrl.value = "";
}

function handleAvatarChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];

  if (!file) {
    return;
  }

  revokeAvatarPreview();
  avatarPreviewUrl.value = URL.createObjectURL(file);
}

function goBack() {
  if (!props.navigation.navigateBack()) {
    props.navigation.reLaunch("elder/member-list");
  }
}

function resetForm() {
  form.memberId = generateMemberId();
  form.nickname = "";
  form.realName = "";
  form.phone = "";
  form.idCard = "";
  form.gender = "";
  form.birthday = "";
  form.homeAddress = "";
  form.introduction = "";
  form.height = "";
  form.weight = "";
  form.nativePlace = "";
  form.ethnicity = "";
  form.education = "";
  form.maritalStatus = "";
  form.jobTitle = "";
  form.company = "";
  form.emergencyContact = "";
  form.emergencyPhone = "";
  form.loginPassword = "";
  form.remark = "";
  revokeAvatarPreview();
}

function saveMember() {
  const nickname = form.nickname.trim();
  const realName = form.realName.trim();
  const phone = form.phone.trim();
  const idCard = form.idCard.trim();
  const loginPassword = form.loginPassword.trim();

  if (!nickname || !realName || !phone || !idCard || !form.gender || !form.birthday || !loginPassword) {
    props.showToast("请完整填写带 * 的必填信息");
    return;
  }

  if (!/^1\d{10}$/.test(phone)) {
    props.showToast("请输入有效的 11 位手机号");
    return;
  }

  if (!/^\d{17}[\dXx]$/.test(idCard)) {
    props.showToast("请输入有效的身份证号");
    return;
  }

  if (loginPassword.length < 6) {
    props.showToast("登录密码至少需要 6 位");
    return;
  }

  const currentAddedMembers = readAddedMembers();
  const memberId = readAllMemberIds().has(form.memberId) ? generateMemberId() : form.memberId;
  const avatar = createMemberAvatar(currentAddedMembers.length + memberListMock.members.length);

  const newMember: MemberItem = {
    id: memberId,
    nickname,
    realName,
    phone,
    registeredAt: buildRegisteredAt(),
    tags: [],
    avatarAccent: avatar.accent,
    avatarShadow: avatar.shadow,
  };

  saveAddedMembers([newMember, ...currentAddedMembers]);
  props.showToast(`${nickname} 已新增到用户列表`);
  props.navigation.reLaunch("elder/member-list");
}

onMounted(() => {
  resetForm();
  document.body.classList.add(pageShellHiddenClass);
});

onBeforeUnmount(() => {
  document.body.classList.remove(pageShellHiddenClass);
  revokeAvatarPreview();
});
</script>

<template>
  <section class="member-create-page">
    <section class="form-panel">
      <header class="panel-header">
        <div class="panel-header__title">
          <h1>{{ mock.title }}</h1>
        </div>

        <button class="back-btn" type="button" @click="goBack">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M15 6l-6 6 6 6" />
          </svg>
          返回
        </button>
      </header>

      <section class="form-section">
        <header class="section-head">
          <h2>{{ mock.basicSectionTitle }}</h2>
        </header>

        <div class="form-grid">
          <label class="form-item">
            <span class="form-item__label">昵称<span class="form-item__required">*</span></span>
            <div class="field__control">
              <input v-model="form.nickname" type="text" maxlength="12" placeholder="请输入" />
            </div>
          </label>

          <label class="form-item">
            <span class="form-item__label">ID</span>
            <div class="field__control field__control--readonly">
              <input v-model="form.memberId" type="text" readonly />
            </div>
          </label>

          <label class="form-item">
            <span class="form-item__label">手机号码<span class="form-item__required">*</span></span>
            <div class="field__control">
              <input v-model="form.phone" type="text" maxlength="11" placeholder="请输入" />
            </div>
          </label>

          <div class="form-item form-item--avatar">
            <span class="form-item__label">头像</span>

            <div class="avatar-uploader">
              <button class="avatar-uploader__preview" type="button" @click="chooseAvatar">
                <img v-if="avatarPreviewUrl" :src="avatarPreviewUrl" alt="头像预览" />
                <svg v-else viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z" />
                  <path d="M4.5 19.5a7.5 7.5 0 0 1 15 0" />
                </svg>
              </button>

              <button class="avatar-uploader__trigger" type="button" @click="chooseAvatar">+ 点击上传</button>
              <input ref="avatarInput" class="avatar-uploader__input" type="file" accept="image/*" @change="handleAvatarChange" />
            </div>
          </div>

          <label class="form-item">
            <span class="form-item__label">真实姓名<span class="form-item__required">*</span></span>
            <div class="field__control">
              <input v-model="form.realName" type="text" maxlength="16" placeholder="请输入" />
            </div>
          </label>

          <label class="form-item">
            <span class="form-item__label">身份证号<span class="form-item__required">*</span></span>
            <div class="field__control">
              <input v-model="form.idCard" type="text" maxlength="18" placeholder="请输入" />
            </div>
          </label>

          <label class="form-item">
            <span class="form-item__label">性别<span class="form-item__required">*</span></span>
            <div class="field__control field__control--select">
              <select v-model="form.gender">
                <option value="" disabled>请选择</option>
                <option v-for="item in mock.genderOptions" :key="item.value" :value="item.value">{{ item.label }}</option>
              </select>
              <span class="field__icon">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M7 10l5 5 5-5" />
                </svg>
              </span>
            </div>
          </label>

          <div class="form-item">
            <span class="form-item__label">出生日期<span class="form-item__required">*</span></span>

            <div class="date-field">
              <button class="field__control field__control--date" type="button" @click="openBirthdayPicker">
                <span class="date-field__value" :class="{ 'date-field__value--placeholder': !form.birthday }">
                  {{ formatDateLabel(form.birthday) }}
                </span>

                <span class="field__icon field__icon--interactive">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M7 3v3M17 3v3M4 8h16M6 5h12a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z" />
                    <path d="M8 12h3M8 16h6" />
                  </svg>
                </span>
              </button>

              <input ref="birthdayInput" v-model="form.birthday" class="date-field__input" type="date" aria-label="出生日期" />
            </div>
          </div>

          <label class="form-item form-item--span-2">
            <span class="form-item__label">家庭住址</span>
            <div class="field__control">
              <input v-model="form.homeAddress" type="text" maxlength="60" placeholder="请输入" />
            </div>
          </label>

          <label class="form-item form-item--span-2">
            <span class="form-item__label">简介</span>
            <div class="field__control field__control--textarea">
              <textarea v-model="form.introduction" rows="4" maxlength="180" placeholder="请输入"></textarea>
            </div>
          </label>

          <label class="form-item">
            <span class="form-item__label">身高</span>
            <div class="field__control field__control--unit">
              <input v-model="form.height" type="text" maxlength="4" placeholder="请输入" />
              <span class="field__suffix">cm</span>
            </div>
          </label>

          <label class="form-item">
            <span class="form-item__label">体重</span>
            <div class="field__control field__control--unit">
              <input v-model="form.weight" type="text" maxlength="5" placeholder="请输入" />
              <span class="field__suffix">kg</span>
            </div>
          </label>

          <label class="form-item">
            <span class="form-item__label">籍贯</span>
            <div class="field__control">
              <input v-model="form.nativePlace" type="text" maxlength="20" placeholder="请输入" />
            </div>
          </label>

          <label class="form-item">
            <span class="form-item__label">民族</span>
            <div class="field__control field__control--select">
              <select v-model="form.ethnicity">
                <option value="" disabled>请选择</option>
                <option v-for="item in mock.ethnicityOptions" :key="item.value" :value="item.value">{{ item.label }}</option>
              </select>
              <span class="field__icon">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M7 10l5 5 5-5" />
                </svg>
              </span>
            </div>
          </label>

          <label class="form-item">
            <span class="form-item__label">文化程度</span>
            <div class="field__control field__control--select">
              <select v-model="form.education">
                <option value="" disabled>请选择</option>
                <option v-for="item in mock.educationOptions" :key="item.value" :value="item.value">{{ item.label }}</option>
              </select>
              <span class="field__icon">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M7 10l5 5 5-5" />
                </svg>
              </span>
            </div>
          </label>

          <label class="form-item">
            <span class="form-item__label">婚姻情况</span>
            <div class="field__control field__control--select">
              <select v-model="form.maritalStatus">
                <option value="" disabled>请选择</option>
                <option v-for="item in mock.maritalOptions" :key="item.value" :value="item.value">{{ item.label }}</option>
              </select>
              <span class="field__icon">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M7 10l5 5 5-5" />
                </svg>
              </span>
            </div>
          </label>

          <label class="form-item">
            <span class="form-item__label">职业</span>
            <div class="field__control">
              <input v-model="form.jobTitle" type="text" maxlength="20" placeholder="请输入" />
            </div>
          </label>

          <label class="form-item form-item--span-2">
            <span class="form-item__label">工作单位</span>
            <div class="field__control">
              <input v-model="form.company" type="text" maxlength="30" placeholder="请输入" />
            </div>
          </label>

          <label class="form-item">
            <span class="form-item__label">紧急联系人</span>
            <div class="field__control">
              <input v-model="form.emergencyContact" type="text" maxlength="16" placeholder="请输入" />
            </div>
          </label>

          <label class="form-item">
            <span class="form-item__label">联系人电话</span>
            <div class="field__control">
              <input v-model="form.emergencyPhone" type="text" maxlength="11" placeholder="请输入" />
            </div>
          </label>
        </div>
      </section>

      <section class="form-section form-section--other">
        <header class="section-head">
          <h2>{{ mock.otherSectionTitle }}</h2>
        </header>

        <div class="form-grid form-grid--other">
          <label class="form-item">
            <span class="form-item__label">登录密码<span class="form-item__required">*</span></span>
            <div class="field__control">
              <input v-model="form.loginPassword" type="password" maxlength="20" placeholder="请输入" />
            </div>
          </label>

          <label class="form-item form-item--span-2">
            <span class="form-item__label">备注</span>
            <div class="field__control field__control--textarea">
              <textarea v-model="form.remark" rows="4" maxlength="180" placeholder="请输入"></textarea>
            </div>
          </label>
        </div>
      </section>
    </section>

    <footer class="footer-bar">
      <button class="action-btn action-btn--primary" type="button" @click="saveMember">保存</button>
      <button class="action-btn action-btn--ghost" type="button" @click="goBack">返回</button>
    </footer>
  </section>
</template>

<style scoped>
.member-create-page {
  --panel-bg: #ffffff;
  --panel-border: #dbe3e8;
  --text-strong: #1f2937;
  --text-soft: #6b7280;
  --brand: #2d8b68;
  --brand-deep: #25785a;
  --brand-soft: #eaf6f0;
  display: grid;
  gap: 12px;
  padding: 0;
  background: transparent;
}

.form-panel,
.footer-bar {
  border: 1px solid var(--panel-border);
  border-radius: 16px;
  background: var(--panel-bg);
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
}

.form-panel {
  padding: 18px 20px 22px;
}

.panel-header,
.panel-header__title,
.footer-bar {
  display: flex;
  align-items: center;
}

.panel-header {
  justify-content: space-between;
  gap: 14px;
  padding-bottom: 18px;
  border-bottom: 1px solid #eef2f5;
}

.panel-header__title {
  gap: 12px;
}

.panel-header h1 {
  margin: 0;
  color: var(--text-strong);
  font-size: 18px;
  font-weight: 700;
}

.back-btn,
.action-btn,
.avatar-uploader__preview,
.avatar-uploader__trigger {
  border: 1px solid transparent;
  font: inherit;
  transition:
    background 160ms ease,
    border-color 160ms ease,
    color 160ms ease,
    box-shadow 160ms ease;
}

.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 36px;
  padding: 0 14px;
  border-color: #dbe3e8;
  border-radius: 999px;
  background: #ffffff;
  color: #30464c;
  font-size: 12px;
  font-weight: 700;
}

.back-btn svg,
.field__icon svg,
.avatar-uploader__preview svg {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.8;
}

.form-section {
  padding-top: 26px;
}

.form-section--other {
  margin-top: 8px;
  padding-top: 28px;
  border-top: 1px solid #eef2f5;
}

.section-head {
  margin-bottom: 22px;
}

.section-head h2 {
  margin: 0;
  color: var(--text-strong);
  font-size: 17px;
  font-weight: 700;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 20px 26px;
}

.form-grid--other {
  grid-template-columns: minmax(260px, 380px) minmax(0, 1fr);
}

.form-item {
  display: grid;
  gap: 8px;
  min-width: 0;
}

.form-item--span-2 {
  grid-column: span 2;
}

.form-item__label {
  color: #6f7b86;
  font-size: 12px;
  font-weight: 600;
}

.form-item__required {
  margin-left: 2px;
  color: #f87171;
}

.field__control {
  position: relative;
  display: flex;
  align-items: center;
  min-height: 42px;
  border: 1px solid #dbe3e8;
  border-radius: 10px;
  background: #ffffff;
  overflow: hidden;
}

.field__control:focus-within {
  border-color: rgba(45, 139, 104, 0.3);
  box-shadow:
    0 0 0 4px rgba(45, 139, 104, 0.08),
    0 1px 2px rgba(15, 23, 42, 0.04);
}

.field__control input,
.field__control select,
.field__control textarea {
  width: 100%;
  min-width: 0;
  border: 0;
  background: transparent;
  color: #30464c;
  font: inherit;
  font-size: 13px;
  outline: none;
}

.field__control input,
.field__control select {
  height: 40px;
  padding: 0 12px;
}

.field__control textarea {
  min-height: 112px;
  padding: 12px;
  resize: vertical;
}

.field__control input::placeholder,
.field__control textarea::placeholder {
  color: #a0acb6;
}

.field__control--readonly {
  background: #f3f5f7;
}

.field__control--readonly input {
  color: #4b5563;
}

.field__control--select select {
  appearance: none;
  padding-right: 38px;
  color: #2f4741;
}

.field__control--select select:invalid {
  color: #a0acb6;
}

.field__control--textarea {
  align-items: stretch;
}

.field__control--unit {
  padding-right: 52px;
}

.field__suffix,
.field__icon {
  position: absolute;
  right: 12px;
  color: #9aa7b3;
  pointer-events: none;
}

.field__suffix {
  font-size: 12px;
  font-weight: 600;
}

.field__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.field__icon--interactive {
  color: #b0b8c0;
}

.date-field {
  position: relative;
}

.field__control--date {
  justify-content: space-between;
  width: 100%;
  height: 42px;
  padding: 0 12px;
  cursor: pointer;
}

.date-field__value {
  color: #2f4741;
  font-size: 13px;
  font-weight: 600;
}

.date-field__value--placeholder {
  color: #a0acb6;
}

.date-field__input {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  border: 0;
  background: transparent;
  opacity: 0;
  pointer-events: none;
}

.form-item--avatar {
  align-content: start;
}

.avatar-uploader {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 42px;
}

.avatar-uploader__preview {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 60px;
  height: 60px;
  border: 1px solid #dbe3e8;
  border-radius: 12px;
  background: #f8fafb;
  color: #c1c7ce;
  overflow: hidden;
}

.avatar-uploader__preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-uploader__trigger {
  height: 36px;
  padding: 0 14px;
  border-color: #d6ece3;
  border-radius: 999px;
  background: #f5fbf8;
  color: var(--brand);
  font-size: 12px;
  font-weight: 600;
}

.avatar-uploader__input {
  display: none;
}

.footer-bar {
  gap: 12px;
  padding: 18px 20px;
  justify-content: flex-start;
}

.action-btn {
  min-width: 96px;
  height: 40px;
  padding: 0 18px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 700;
}

.action-btn--primary {
  background: var(--brand);
  color: #ffffff;
}

.action-btn--ghost {
  border-color: #dbe3e8;
  background: #ffffff;
  color: #25384c;
}

:global(body.member-create-shell-hidden .admin-topbar),
:global(body.member-create-shell-hidden .workspace-metrics) {
  display: none;
}

:global(body.member-create-shell-hidden .admin-main) {
  gap: 0;
}

:global(body.member-create-shell-hidden .admin-content) {
  padding-top: 0;
}

@media (hover: hover) {
  .back-btn:hover,
  .action-btn--ghost:hover {
    border-color: #bfdbcf;
    color: var(--brand);
  }

  .action-btn--primary:hover {
    background: var(--brand-deep);
  }

  .avatar-uploader__preview:hover {
    border-color: #bfdbcf;
  }

  .avatar-uploader__trigger:hover {
    border-color: #bfdbcf;
    background: #eef8f3;
    color: var(--brand);
  }
}

@media (max-width: 1180px) {
  .form-grid,
  .form-grid--other {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 860px) {
  .form-panel,
  .footer-bar {
    padding: 16px;
  }

  .panel-header,
  .footer-bar {
    flex-direction: column;
    align-items: stretch;
  }

  .form-grid,
  .form-grid--other {
    grid-template-columns: 1fr;
  }

  .form-item--span-2 {
    grid-column: auto;
  }

  .back-btn,
  .action-btn {
    width: 100%;
  }

  .avatar-uploader {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
