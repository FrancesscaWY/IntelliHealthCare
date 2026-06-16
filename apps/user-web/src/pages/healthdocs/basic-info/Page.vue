<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import type { PageComponentProps } from "@ihc/page-core/types";
import {
  getArchiveBasicInfo,
  updateArchiveBasicInfo,
  type ArchiveBasicInfo,
  type ArchiveEmergencyContact
} from "@/shared/api/health-archive";
import mock from "./mock";

const props = defineProps<PageComponentProps>();

const formState = reactive<Record<string, string>>(
  Object.fromEntries(mock.groups.flat().map((item) => [item.key, ""])),
);
const showAvatarSheet = ref(false);
const isLoading = ref(false);
const isSaving = ref(false);
const emergencyContactState = ref<ArchiveEmergencyContact | null>(null);

function toText(value: unknown) {
  return value == null ? "" : String(value);
}

function mapGenderFromApi(gender: string | null | undefined) {
  if (gender === "MALE") {
    return "男";
  }

  if (gender === "FEMALE") {
    return "女";
  }

  return "";
}

function applyBasicInfo(data: ArchiveBasicInfo) {
  formState.avatar = toText(data.avatar);
  formState.name = toText(data.name);
  formState.idCard = toText(data.idCard);
  formState.gender = mapGenderFromApi(data.gender);
  formState.birthday = toText(data.birthday);
  formState.phone = toText(data.phone);
  formState.address = toText(data.address);
  formState.height = toText(data.height);
  formState.weight = toText(data.weight);
  formState.nativePlace = toText(data.nativePlace);
  formState.ethnicity = toText(data.ethnicity);
  formState.education = toText(data.education);
  formState.maritalStatus = toText(data.maritalStatus);
  formState.occupation = toText(data.occupation);
  formState.emergencyName = toText(data.emergencyContact?.name);
  formState.emergencyPhone = toText(data.emergencyContact?.phone);
  emergencyContactState.value = data.emergencyContact;
}

async function loadBasicInfo() {
  try {
    isLoading.value = true;
    const data = await getArchiveBasicInfo();
    applyBasicInfo(data);
  } catch (error) {
    props.showToast(error instanceof Error ? error.message : "基础信息加载失败");
  } finally {
    isLoading.value = false;
  }
}

function goBack() {
  if (!props.navigation.navigateBack()) {
    props.navigation.reLaunch("healthdocs/health-records");
  }
}

function parseOptionalNumber(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return undefined;
  }

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : NaN;
}

function buildEmergencyContact() {
  const emergencyName = formState.emergencyName.trim();
  const emergencyPhone = formState.emergencyPhone.trim();
  const nextEmergencyContact: Record<string, unknown> = {};

  if (typeof emergencyContactState.value?.relation === "string" && emergencyContactState.value.relation) {
    nextEmergencyContact.relation = emergencyContactState.value.relation;
  }
  if (emergencyName) {
    nextEmergencyContact.name = emergencyName;
  }
  if (emergencyPhone) {
    nextEmergencyContact.phone = emergencyPhone;
  }

  if (Object.keys(nextEmergencyContact).length > 0) {
    return nextEmergencyContact;
  }

  if (emergencyContactState.value && Object.keys(emergencyContactState.value).length > 0) {
    return {};
  }

  return undefined;
}

async function saveProfile() {
  if (isSaving.value) {
    return;
  }

  if (!formState.name.trim()) {
    props.showToast("请填写真实姓名");
    return;
  }

  if (!formState.birthday.trim()) {
    props.showToast("请选择出生日期");
    return;
  }

  if (!formState.phone.trim()) {
    props.showToast("请输入联系电话");
    return;
  }

  const height = parseOptionalNumber(formState.height);
  const weight = parseOptionalNumber(formState.weight);

  if (Number.isNaN(height)) {
    props.showToast("身高格式不正确");
    return;
  }

  if (Number.isNaN(weight)) {
    props.showToast("体重格式不正确");
    return;
  }

  try {
    isSaving.value = true;

    const saved = await updateArchiveBasicInfo({
      avatar: formState.avatar.trim() || undefined,
      name: formState.name.trim(),
      phone: formState.phone.trim(),
      birthday: formState.birthday.trim(),
      address: formState.address.trim() || undefined,
      height,
      weight,
      education: formState.education.trim() || undefined,
      occupation: formState.occupation.trim() || undefined,
      emergencyContact: buildEmergencyContact()
    });

    applyBasicInfo(saved);
    props.showToast("基础信息已保存");
  } catch (error) {
    props.showToast(error instanceof Error ? error.message : "基础信息保存失败");
  } finally {
    isSaving.value = false;
  }
}

function handleAvatarUpload() {
  showAvatarSheet.value = true;
}

function closeAvatarSheet() {
  showAvatarSheet.value = false;
}

function takePhoto() {
  showAvatarSheet.value = false;
  props.showToast("拍照功能待接入");
}

function pickFromAlbum() {
  showAvatarSheet.value = false;
  props.showToast("相册选取功能待接入");
}

onMounted(() => {
  void loadBasicInfo();
});
</script>

<template>
  <section class="detail-page">
    <header class="page-nav">
      <button class="back-btn" type="button" aria-label="返回" @click="goBack">
        <span class="back-arrow" aria-hidden="true"></span>
      </button>
      <h1>{{ mock.title }}</h1>
    </header>

    <main class="page-scroll">
      <section v-for="(group, index) in mock.groups" :key="index" class="form-group">
        <article
          v-for="item in group"
          :key="item.key"
          class="form-row"
          :class="{ 'form-row--avatar': item.type === 'avatar', 'form-row--textarea': item.key === 'address' }"
        >
          <div class="form-label">
            <span class="form-label__text">{{ item.label }}</span>
            <em v-if="item.required">*</em>
          </div>

          <button
            v-if="item.type === 'avatar'"
            class="avatar-trigger"
            type="button"
            @click="handleAvatarUpload"
          >
            <span class="avatar-trigger__placeholder">
              {{ formState.avatar ? "已上传头像" : item.placeholder }}
            </span>
            <span class="field-icon field-icon--arrow" aria-hidden="true"></span>
          </button>

          <div
            v-else
            class="field-wrap"
            :class="{
              'field-wrap--date': item.type === 'date',
              'field-wrap--select': item.type === 'select',
              'field-wrap--empty': !formState[item.key],
            }"
            >
            <select
              v-if="item.type === 'select'"
              v-model="formState[item.key]"
              class="field-control field-control--select"
              :class="{ 'field-control--empty': !formState[item.key] }"
            >
              <option value="" disabled>{{ item.placeholder }}</option>
                <option v-for="option in item.options" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
            </select>

            <template v-else-if="item.type === 'date'">
              <span
                class="field-date-text"
                :class="{ 'field-date-text--empty': !formState[item.key] }"
              >
                {{ formState[item.key] || item.placeholder }}
              </span>
              <input
                v-model="formState[item.key]"
                class="field-native-date"
                type="date"
                aria-label="选择出生日期"
              />
            </template>

            <input
              v-else
              v-model="formState[item.key]"
              class="field-control"
              :class="{
                'field-control--number': item.type === 'number',
                'field-control--empty': !formState[item.key],
              }"
              :type="item.type === 'number' ? 'number' : item.type === 'tel' ? 'tel' : 'text'"
              :placeholder="item.placeholder"
            />
            <small v-if="item.suffix" class="field-suffix">{{ item.suffix }}</small>
            <span v-if="item.type === 'select'" class="field-icon field-icon--arrow" aria-hidden="true"></span>
            <span v-if="item.type === 'date'" class="field-icon field-icon--calendar" aria-hidden="true"></span>
          </div>
        </article>
      </section>
    </main>

    <footer class="save-area">
      <button class="save-btn" type="button" :disabled="isSaving || isLoading" @click="saveProfile">
        {{ isSaving ? "保存中..." : isLoading ? "加载中..." : "保存" }}
      </button>
    </footer>

    <div
      v-if="showAvatarSheet"
      class="sheet-mask"
      role="button"
      tabindex="0"
      aria-label="关闭上传头像弹层"
      @click="closeAvatarSheet"
      @keydown.enter="closeAvatarSheet"
    >
      <section class="avatar-sheet" @click.stop>
        <button class="avatar-sheet__action" type="button" @click="takePhoto">拍照</button>
        <button class="avatar-sheet__action avatar-sheet__action--secondary" type="button" @click="pickFromAlbum">
          相册选取
        </button>
      </section>
    </div>
  </section>
</template>

<style scoped>
.detail-page {
  position: relative;
  left: 50%;
  width: min(390px, 100vw);
  height: auto;
  min-height: var(--ihc-page-min-height);
  max-height: none;
  margin: -18px 0;
  overflow: hidden;
  background:
    radial-gradient(circle at 82% 8%, rgba(117, 214, 223, 0.18) 0, rgba(117, 214, 223, 0) 28%),
    linear-gradient(180deg, #f1f8ff 0%, #f7f9fb 42%, #f5f6f7 100%);
  color: #222733;
  font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif;
  transform: translateX(-50%);
  -webkit-font-smoothing: antialiased;
}

.page-nav {
  display: flex;
  align-items: center;
  height: 74px;
  padding: 0 29px;
}

.back-btn,
.save-btn,
.avatar-trigger {
  border: 0;
  background: transparent;
  color: inherit;
}

.back-btn {
  display: grid;
  place-items: center;
  width: 30px;
  height: 44px;
  padding: 0;
}

.back-arrow {
  width: 14px;
  height: 14px;
  border-bottom: 3px solid #252939;
  border-left: 3px solid #252939;
  transform: rotate(45deg);
}

.page-nav h1 {
  margin: 0 0 0 9px;
  color: #222733;
  font-size: 20px;
  font-weight: 900;
  letter-spacing: 0;
}

.page-scroll {
  height: calc(100% - 74px);
  padding: 20px 31px 104px;
  overflow-y: auto;
  scrollbar-width: none;
}

.page-scroll::-webkit-scrollbar {
  display: none;
}

.form-group {
  margin-top: 10px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.74);
  border-radius: 14px;
  background:
    linear-gradient(180deg, rgba(247, 249, 255, 0.92) 0%, rgba(255, 255, 255, 0.96) 54px, rgba(255, 255, 255, 0.96) 100%);
  box-shadow: 0 10px 24px rgba(72, 104, 148, 0.06);
}

.form-group:first-child {
  margin-top: 0;
}

.form-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 60px;
  padding: 0 20px;
  border-top: 1px solid #eeeeee;
}

.form-row:first-child {
  border-top: 0;
}

.form-row--avatar {
  min-height: 60px;
}

.form-row--textarea {
  align-items: center;
}

.form-label {
  display: flex;
  align-items: center;
  gap: 2px;
  flex: 0 0 108px;
  min-width: 108px;
}

.form-label__text {
  color: #8f95a2;
  font-size: 14px;
  font-weight: 800;
  line-height: 1.3;
  letter-spacing: 0;
  white-space: nowrap;
}

.form-label em {
  color: #ff6f6f;
  font-size: 16px;
  font-style: normal;
}

.avatar-trigger,
.field-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.avatar-trigger {
  justify-content: space-between;
  min-height: 60px;
  padding: 0;
  color: #b5b7bc;
  font-size: 14px;
  font-weight: 800;
  text-align: left;
}

.avatar-trigger__placeholder {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.field-wrap {
  position: relative;
  min-height: 60px;
  padding: 0;
}

.field-control {
  width: 100%;
  min-width: 0;
  padding: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: #222733;
  font-size: 14px;
  font-weight: 800;
  line-height: 1.5;
}

.field-control::placeholder {
  color: #9a9da6;
  font-weight: 500;
  opacity: 1;
}

.field-control--empty {
  color: #9a9da6;
  font-weight: 500;
}

.field-control--select {
  appearance: none;
  -webkit-appearance: none;
  padding-right: 18px;
  background: transparent;
}

.field-control--number::-webkit-outer-spin-button,
.field-control--number::-webkit-inner-spin-button {
  margin: 0;
  -webkit-appearance: none;
}

.field-suffix {
  flex: 0 0 auto;
  color: #b4bac5;
  font-size: 14px;
  font-weight: 800;
}

.field-wrap--date {
  justify-content: space-between;
  gap: 8px;
  padding-right: 8px;
}

.field-date-text {
  min-width: 0;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  padding-right: 6px;
  color: #222733;
  font-size: 14px;
  font-weight: 800;
  line-height: 1.5;
  white-space: nowrap;
}

.field-date-text--empty {
  color: #9a9da6;
}

.field-native-date {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
  border: 0;
}

.field-native-date::-webkit-calendar-picker-indicator {
  width: 100%;
  height: 100%;
  margin: 0;
  cursor: pointer;
}

.field-icon {
  flex: 0 0 auto;
}

.field-icon--arrow {
  width: 9px;
  height: 9px;
  margin-right: 2px;
  border-top: 2px solid #c7c7c7;
  border-right: 2px solid #c7c7c7;
  transform: rotate(45deg);
}

.field-icon--calendar {
  position: relative;
  margin-left: auto;
  width: 18px;
  height: 18px;
  border: 2px solid #c7c7c7;
  border-radius: 5px;
  pointer-events: none;
}

.field-icon--calendar::before,
.field-icon--calendar::after {
  position: absolute;
  top: 4px;
  width: 2px;
  height: 4px;
  content: "";
  border-radius: 999px;
  background: #c7c7c7;
}

.field-icon--calendar::before {
  left: 4px;
}

.field-icon--calendar::after {
  right: 4px;
}

.field-icon--calendar {
  background:
    linear-gradient(180deg, transparent 0 5px, #c7c7c7 5px 6px, transparent 6px),
    radial-gradient(circle at 5px 11px, #c7c7c7 0 1px, transparent 1.1px),
    radial-gradient(circle at 11px 11px, #c7c7c7 0 1px, transparent 1.1px);
}

.save-area {
  position: absolute;
  right: 54px;
  bottom: 28px;
  left: 54px;
}

.save-btn {
  width: 100%;
  height: 54px;
  border-radius: 11px;
  background: linear-gradient(100deg, #75d6df 0%, #7be28e 100%);
  box-shadow: 0 14px 28px rgba(89, 200, 162, 0.22);
  color: #ffffff;
  font-size: 16px;
  font-weight: 900;
  letter-spacing: 0;
}

.save-btn:disabled {
  opacity: 0.78;
}

.sheet-mask {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: flex-end;
  background: rgba(31, 40, 58, 0.18);
  backdrop-filter: blur(2px);
}

.avatar-sheet {
  width: 100%;
  padding: 16px 20px 24px;
  border-radius: 24px 24px 0 0;
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 -10px 30px rgba(63, 83, 117, 0.12);
}

.avatar-sheet__action {
  width: 100%;
  height: 52px;
  border: 0;
  border-radius: 12px;
  background: linear-gradient(100deg, #75d6df 0%, #7be28e 100%);
  box-shadow: 0 12px 24px rgba(89, 200, 162, 0.22);
  color: #ffffff;
  font-size: 16px;
  font-weight: 900;
}

.avatar-sheet__action + .avatar-sheet__action {
  margin-top: 12px;
}

.avatar-sheet__action--secondary {
  background: #ffffff;
  box-shadow:
    inset 0 0 0 1px #e7ebf3,
    0 8px 18px rgba(112, 130, 170, 0.08);
  color: #5b6474;
}

@media (min-width: 561px) {
  .detail-page {
    height: auto;
    min-height: var(--ihc-page-min-height);
  }
}

@media (max-width: 389px) {
  .page-scroll {
    padding-right: 26px;
    padding-left: 26px;
  }

  .form-label {
    flex-basis: 104px;
    min-width: 104px;
  }

  .form-label__text,
  .field-control,
  .avatar-trigger,
  .field-date-text,
  .field-suffix {
    font-size: 14px;
  }
}
</style>
