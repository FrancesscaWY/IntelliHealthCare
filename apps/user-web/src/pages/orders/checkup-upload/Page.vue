<script setup lang="ts">
import type { PageComponentProps } from "@ihc/page-core/types";
import mock from "./mock";

const props = defineProps<PageComponentProps>();

function goBack() {
  if (!props.navigation.navigateBack()) {
    props.navigation.reLaunch("orders/checkup-report");
  }
}

function chooseMethod(title: string) {
  props.showToast(`${title}功能待接入`);
}

function autofill() {
  props.showToast("已一键填入演示报告信息");
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
        <p>可上传、扫描照片或提交文档，后续可接入识别服务自动解析报告内容。</p>

        <button v-for="item in mock.uploadMethods" :key="item.key" class="method-button" type="button" @click="chooseMethod(item.title)">
          <strong>{{ item.title }}</strong>
          <span>{{ item.desc }}</span>
          <i aria-hidden="true"></i>
        </button>

        <button class="autofill-button" type="button" @click="autofill">一键填入</button>
      </section>
    </main>
  </section>
</template>

<style scoped>
.upload-page {
  position: relative;
  left: 50%;
  width: min(402px, 100vw);
  height: min(874px, calc(100vh - 36px));
  min-height: min(874px, calc(100vh - 36px));
  max-height: 874px;
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
</style>
