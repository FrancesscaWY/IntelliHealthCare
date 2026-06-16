<script setup lang="ts">
import { ref } from "vue";
import type { PageComponentProps } from "@ihc/page-core/types";
import { useReportCenter } from "@/pages/healthdocs/report-center";
import mock from "./mock";

const props = defineProps<PageComponentProps>();
const { addUploadedReport, isUploadingReport } = useReportCenter();
const albumInputRef = ref<HTMLInputElement | null>(null);
const cameraInputRef = ref<HTMLInputElement | null>(null);
const documentInputRef = ref<HTMLInputElement | null>(null);

function goBack() {
  if (!props.navigation.navigateBack()) {
    props.navigation.reLaunch("orders/checkup-report");
  }
}

function chooseMethod(key: string) {
  if (key === "upload") {
    albumInputRef.value?.click();
    return;
  }

  if (key === "scan") {
    cameraInputRef.value?.click();
    return;
  }

  documentInputRef.value?.click();
}

async function submitFile(file: File | null | undefined) {
  if (!file) {
    return;
  }

  try {
    await addUploadedReport(file, {
      title: file.name.replace(/\.[^.]+$/, ""),
      reportDate: new Date().toISOString().slice(0, 10)
    });
    props.showToast("报告已加入健康档案");
    window.setTimeout(() => {
      props.navigation.reLaunch("orders/checkup-report");
    }, 250);
  } catch (error) {
    props.showToast(error instanceof Error ? error.message : "报告上传失败");
  }
}

async function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement | null;
  const file = input?.files?.[0];
  await submitFile(file);

  if (input) {
    input.value = "";
  }
}

function autofill() {
  props.navigation.navigateTo("healthdocs/report-upload");
}
</script>

<template>
  <section class="upload-page">
    <header class="page-nav">
      <button class="back-btn" type="button" aria-label="返回" @click="goBack">
        <span aria-hidden="true"></span>
      </button>
      <h1>{{ mock.title }}</h1>
    </header>

    <main class="upload-scroll">
      <section class="upload-card">
        <h2>选择添加方式</h2>
        <p>可上传、扫描照片或提交文档，选中的文件会直接走真实文件上传接口并同步到报告中心。</p>

        <button
          v-for="item in mock.uploadMethods"
          :key="item.key"
          class="method-button"
          type="button"
          :disabled="isUploadingReport"
          @click="chooseMethod(item.key)"
        >
          <strong>{{ item.title }}</strong>
          <span>{{ item.desc }}</span>
          <i aria-hidden="true"></i>
        </button>

        <button class="autofill-button" type="button" :disabled="isUploadingReport" @click="autofill">
          {{ isUploadingReport ? "上传中..." : "进入完整填写页" }}
        </button>
      </section>
    </main>

    <input ref="albumInputRef" class="hidden-input" type="file" accept="image/*" @change="handleFileChange" />
    <input ref="cameraInputRef" class="hidden-input" type="file" accept="image/*" capture="environment" @change="handleFileChange" />
    <input ref="documentInputRef" class="hidden-input" type="file" accept=".pdf,.doc,.docx,image/*" @change="handleFileChange" />
  </section>
</template>

<style scoped>
.upload-page {
  position: relative;
  left: 50%;
  width: min(402px, 100vw);
  height: auto;
  min-height: var(--ihc-page-min-height);
  max-height: none;
  margin: -18px 0;
  overflow: hidden;
  background: #ffffff;
  color: #30343f;
  font-family: var(--ihc-font-family);
  transform: translateX(-50%);
  -webkit-font-smoothing: antialiased;
}

.page-nav {
  display: flex;
  align-items: center;
  height: 74px;
  padding: 0 29px;
}

.back-btn {
  display: grid;
  place-items: center;
  width: 30px;
  height: 44px;
  padding: 0;
  border: 0;
  background: transparent;
}

.back-btn span {
  width: 14px;
  height: 14px;
  border-bottom: 4px solid #333333;
  border-left: 4px solid #333333;
  transform: rotate(45deg);
}

.page-nav h1 {
  margin: 0 0 0 9px;
  color: #30343f;
  font-size: 24px;
  font-weight: 500;
  letter-spacing: 0.03em;
}

.upload-scroll {
  height: calc(100% - 74px);
  padding: 16px 18px 34px;
  overflow-y: auto;
}

.upload-card {
  padding: 22px 18px;
  border-radius: 18px;
  background: #f8fbfc;
  box-shadow: 0 14px 34px rgba(70, 110, 140, 0.08);
}

.upload-card h2 {
  margin: 0;
  color: #1f2a44;
  font-size: 21px;
  font-weight: 900;
}

.upload-card p {
  margin: 10px 0 18px;
  color: rgba(48, 52, 63, 0.62);
  font-size: 14px;
  font-weight: 800;
  line-height: 1.65;
}

.method-button {
  position: relative;
  display: grid;
  gap: 5px;
  width: 100%;
  min-height: 70px;
  margin-bottom: 12px;
  padding: 13px 42px 13px 14px;
  border: 0;
  border-radius: 14px;
  background: #ffffff;
  color: #30343f;
  text-align: left;
}

.method-button strong {
  font-size: 16px;
  font-weight: 900;
}

.method-button span {
  color: rgba(48, 52, 63, 0.52);
  font-size: 13px;
  font-weight: 800;
}

.method-button i {
  position: absolute;
  top: 50%;
  right: 16px;
  width: 9px;
  height: 9px;
  border-top: 2px solid rgba(48, 52, 63, 0.28);
  border-right: 2px solid rgba(48, 52, 63, 0.28);
  transform: translateY(-50%) rotate(45deg);
}

.autofill-button {
  width: 100%;
  height: 48px;
  margin-top: 8px;
  border: 0;
  border-radius: 14px;
  background: #75d6df;
  box-shadow: 0 12px 22px rgba(117, 214, 223, 0.2);
  color: #1f2a44;
  font-size: 17px;
  font-weight: 900;
}

.method-button:disabled,
.autofill-button:disabled {
  opacity: 0.7;
}

.hidden-input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}
</style>
