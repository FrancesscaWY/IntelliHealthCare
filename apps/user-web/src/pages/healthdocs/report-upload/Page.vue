<script setup lang="ts">
import { reactive, ref } from "vue";
import type { PageComponentProps } from "@ihc/page-core/types";
import mock from "./mock";
import { useReportCenter } from "../report-center";

const props = defineProps<PageComponentProps>();
const { addUploadedReport } = useReportCenter();

const form = reactive({
  title: "",
  reportDate: "",
  file: null as File | null,
  fileName: "",
});

const showUploadSheet = ref(false);
const fileInputRef = ref<HTMLInputElement | null>(null);
const dateInputRef = ref<HTMLInputElement | null>(null);

function goBack() {
  if (!props.navigation.navigateBack()) {
    props.navigation.reLaunch("healthdocs/checkup-reports");
  }
}

function openReportDatePicker() {
  const input = dateInputRef.value;

  if (!input) {
    return;
  }

  if (typeof input.showPicker === "function") {
    input.showPicker();
    return;
  }

  input.focus();
  input.click();
}

function openUploadSheet() {
  showUploadSheet.value = true;
}

function closeUploadSheet() {
  showUploadSheet.value = false;
}

function pickAttachment() {
  closeUploadSheet();
  window.setTimeout(() => {
    fileInputRef.value?.click();
  }, 80);
}

function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement | null;
  const file = input?.files?.[0];

  if (!file) {
    return;
  }

  form.file = file;
  form.fileName = file.name;
  props.showToast("已选择附件");
  input.value = "";
}

function saveReport() {
  if (!form.title.trim()) {
    props.showToast("请输入报告名称");
    return;
  }

  if (!form.reportDate) {
    props.showToast("请选择报告日期");
    return;
  }

  if (!form.file) {
    props.showToast("请上传附件");
    return;
  }

  addUploadedReport(form.file, {
    title: form.title.trim(),
    reportDate: form.reportDate,
  });

  props.showToast("报告上传成功");
  window.setTimeout(() => {
    props.navigation.reLaunch("healthdocs/checkup-reports");
  }, 220);
}
</script>

<template>
  <section class="upload-page">
    <header class="page-nav">
      <button class="back-btn" type="button" aria-label="返回" @click="goBack">
        <span class="back-arrow" aria-hidden="true"></span>
      </button>
      <h1>{{ mock.title }}</h1>
    </header>

    <main class="page-scroll">
      <section class="form-card">
        <label class="form-row" for="reportTitle">
          <span class="field-label">报告名称<i>*</i></span>
          <input
            id="reportTitle"
            v-model="form.title"
            class="field-input"
            type="text"
            :placeholder="mock.placeholders.title"
          />
        </label>

        <button class="form-row form-row--action" type="button" @click="openReportDatePicker">
          <span class="field-label">报告日期</span>
          <span class="field-value" :class="{ 'field-value--empty': !form.reportDate }">
            {{ form.reportDate || mock.placeholders.date }}
          </span>
          <span class="field-icon field-icon--calendar" aria-hidden="true"></span>
        </button>

        <button class="form-row form-row--action" type="button" @click="openUploadSheet">
          <span class="field-label">上传报告<i>*</i></span>
          <span class="field-value" :class="{ 'field-value--empty': !form.fileName }">
            {{ form.fileName || mock.placeholders.file }}
          </span>
          <span class="arrow-icon" aria-hidden="true"></span>
        </button>
      </section>
    </main>

    <footer class="save-area">
      <button class="save-btn" type="button" @click="saveReport">{{ mock.saveText }}</button>
    </footer>

    <input
      ref="dateInputRef"
      v-model="form.reportDate"
      class="native-date-input"
      type="date"
      aria-label="选择报告日期"
    />

    <input
      ref="fileInputRef"
      class="native-file-input"
      type="file"
      accept=".pdf,.doc,.docx,image/*"
      @change="handleFileChange"
    />

    <div v-if="showUploadSheet" class="sheet-mask" @click.self="closeUploadSheet">
      <section class="upload-sheet">
        <button class="sheet-action" type="button" @click="pickAttachment">上传附件</button>
        <button class="sheet-cancel" type="button" @click="closeUploadSheet">取消</button>
      </section>
    </div>
  </section>
</template>

<style scoped>
.upload-page {
  position: relative;
  left: 50%;
  width: min(390px, 100vw);
  height: min(844px, calc(100vh - 36px));
  min-height: min(844px, calc(100vh - 36px));
  max-height: 844px;
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
.form-row--action,
.sheet-action,
.sheet-cancel {
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
  padding: 18px 24px 110px;
  overflow-y: auto;
  scrollbar-width: none;
}

.page-scroll::-webkit-scrollbar {
  display: none;
}

.form-card {
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.74);
  border-radius: 16px;
  background:
    linear-gradient(180deg, rgba(247, 249, 255, 0.92) 0%, rgba(255, 255, 255, 0.97) 52px, rgba(255, 255, 255, 0.97) 100%);
  box-shadow: 0 10px 24px rgba(72, 104, 148, 0.06);
}

.form-row {
  position: relative;
  display: grid;
  grid-template-columns: 94px minmax(0, 1fr) 18px;
  align-items: center;
  width: 100%;
  min-height: 58px;
  padding: 0 18px;
  border-top: 1px solid #eef1f6;
  color: #8f95a2;
  text-align: left;
}

.form-row:first-child {
  border-top: 0;
}

.field-label {
  color: #8f95a2;
  font-size: 14px;
  font-weight: 800;
  line-height: 1.4;
  white-space: nowrap;
}

.field-label i {
  margin-left: 2px;
  color: #ff6f6f;
  font-style: normal;
}

.field-input,
.field-value {
  min-width: 0;
  color: #222733;
  font-size: 14px;
  font-weight: 800;
}

.field-input {
  grid-column: 2 / 4;
  width: 100%;
  padding: 0;
  border: 0;
  outline: 0;
  background: transparent;
}

.field-input::placeholder {
  color: #b7bcc6;
  opacity: 1;
}

.field-value {
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.45;
  white-space: nowrap;
}

.field-value--empty {
  color: #b7bcc6;
}

.form-row--action {
  overflow: hidden;
}

.arrow-icon {
  justify-self: end;
  width: 8px;
  height: 8px;
  border-top: 2px solid #c7cbd3;
  border-right: 2px solid #c7cbd3;
  transform: rotate(45deg);
}

.field-icon {
  justify-self: end;
}

.field-icon--calendar {
  position: relative;
  width: 16px;
  height: 16px;
  border: 2px solid #c7cbd3;
  border-radius: 5px;
}

.field-icon--calendar::before,
.field-icon--calendar::after {
  position: absolute;
  top: 3px;
  width: 2px;
  height: 4px;
  content: "";
  border-radius: 999px;
  background: #c7cbd3;
}

.field-icon--calendar::before {
  left: 3px;
}

.field-icon--calendar::after {
  right: 3px;
}

.field-icon--calendar {
  background:
    linear-gradient(180deg, transparent 0 4px, #c7cbd3 4px 5px, transparent 5px),
    radial-gradient(circle at 5px 10px, #c7cbd3 0 1px, transparent 1.1px),
    radial-gradient(circle at 10px 10px, #c7cbd3 0 1px, transparent 1.1px);
}

.native-date-input,
.native-file-input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}

.save-area {
  position: absolute;
  right: 28px;
  bottom: 18px;
  left: 28px;
}

.save-btn {
  width: 100%;
  height: 56px;
  border-radius: 16px;
  background: linear-gradient(100deg, #75d6df 0%, #7be28e 100%);
  box-shadow: 0 14px 28px rgba(89, 200, 162, 0.22);
  color: #ffffff;
  font-size: 16px;
  font-weight: 900;
  letter-spacing: 0;
}

.sheet-mask {
  position: absolute;
  inset: 0;
  z-index: 10;
  display: flex;
  align-items: flex-end;
  background: rgba(31, 40, 58, 0.18);
  backdrop-filter: blur(2px);
}

.upload-sheet {
  width: 100%;
  padding: 16px 20px 24px;
  border-radius: 24px 24px 0 0;
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 -10px 30px rgba(63, 83, 117, 0.12);
}

.sheet-action,
.sheet-cancel {
  display: block;
  width: 100%;
  height: 52px;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 900;
}

.sheet-action {
  background: linear-gradient(100deg, #75d6df 0%, #7be28e 100%);
  box-shadow: 0 12px 24px rgba(89, 200, 162, 0.22);
  color: #ffffff;
}

.sheet-cancel {
  margin-top: 12px;
  background: #ffffff;
  box-shadow:
    inset 0 0 0 1px #e7ebf3,
    0 8px 18px rgba(112, 130, 170, 0.08);
  color: #5b6474;
}

@media (min-width: 561px) {
  .upload-page {
    height: 844px;
    min-height: 844px;
  }
}

@media (max-width: 389px) {
  .page-scroll {
    padding-right: 20px;
    padding-left: 20px;
  }

  .form-row {
    grid-template-columns: 88px minmax(0, 1fr) 16px;
    padding-right: 16px;
    padding-left: 16px;
  }

  .field-label,
  .field-input,
  .field-value {
    font-size: 14px;
  }

  .save-area {
    right: 20px;
    left: 20px;
  }
}
</style>
