<script setup lang="ts">
import type { PageComponentProps } from "@ihc/page-core/types";
import mock from "./mock";

const props = defineProps<PageComponentProps>();

function goBack() {
  if (!props.navigation.navigateBack()) {
    props.navigation.reLaunch("orders/checkup-report");
  }
}
</script>

<template>
  <section class="analysis-page">
    <header class="page-nav">
      <button class="back-btn" type="button" aria-label="返回" @click="goBack">
        <span aria-hidden="true"></span>
      </button>
      <h1>{{ mock.title }}</h1>
    </header>

    <main class="analysis-body">
      <section class="placeholder-card">
        <h2>报告分析生成中</h2>
        <p>这里先作为 AI 评估结果页入口，后续接入大模型后再完善分析内容。</p>
      </section>
    </main>
  </section>
</template>

<style scoped>
.analysis-page {
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

.analysis-body {
  padding: 18px;
}

.placeholder-card {
  padding: 24px 20px;
  border-radius: 18px;
  background: #f8fbfc;
  box-shadow: 0 14px 34px rgba(70, 110, 140, 0.08);
}

.placeholder-card h2 {
  margin: 0 0 10px;
  color: #1f2a44;
  font-size: 21px;
  font-weight: 900;
}

.placeholder-card p {
  margin: 0;
  color: rgba(48, 52, 63, 0.62);
  font-size: 14px;
  font-weight: 800;
  line-height: 1.7;
}
</style>
