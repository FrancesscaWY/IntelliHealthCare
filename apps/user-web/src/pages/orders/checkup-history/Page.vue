<script setup lang="ts">
import type { PageComponentProps } from "@ihc/page-core/types";
import mock from "./mock";

const props = defineProps<PageComponentProps>();

function goBack() {
  if (!props.navigation.navigateBack()) {
    props.navigation.reLaunch("orders/checkup-report");
  }
}

function viewReport() {
  props.navigation.navigateTo("orders/checkup-report");
}

function viewAiEvaluation() {
  props.navigation.navigateTo("orders/checkup-ai-waiting");
}
</script>

<template>
  <section class="history-page">
    <header class="page-nav">
      <button class="back-btn" type="button" aria-label="返回" @click="goBack">
        <span aria-hidden="true"></span>
      </button>
      <h1>{{ mock.title }}</h1>
    </header>

    <main class="history-scroll">
      <article v-for="item in mock.reports" :key="item.id" class="history-card">
        <header>
          <div>
            <h2>{{ item.name }}</h2>
            <p>{{ item.center }} · {{ item.date }}</p>
          </div>
          <span>{{ item.status }}</span>
        </header>
        <p class="summary">{{ item.summary }}</p>
        <div class="history-actions">
          <button type="button" @click="viewReport">查看报告</button>
          <button type="button" @click="viewAiEvaluation">AI评估</button>
        </div>
      </article>
    </main>
  </section>
</template>

<style scoped>
.history-page {
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

.history-scroll {
  height: calc(100% - 74px);
  padding: 14px 18px 34px;
  overflow-y: auto;
  scrollbar-width: none;
}

.history-scroll::-webkit-scrollbar {
  display: none;
}

.history-card {
  padding: 18px;
  margin-bottom: 14px;
  border-radius: 18px;
  background: #f8fbfc;
  box-shadow: 0 14px 34px rgba(70, 110, 140, 0.08);
}

.history-card header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.history-card h2 {
  margin: 0;
  color: #1f2a44;
  font-size: 17px;
  font-weight: 900;
  line-height: 1.35;
}

.history-card header p,
.summary {
  margin: 8px 0 0;
  color: rgba(48, 52, 63, 0.6);
  font-size: 13px;
  font-weight: 800;
  line-height: 1.55;
}

.history-card header span {
  flex: 0 0 auto;
  color: #2b9fa9;
  font-size: 13px;
  font-weight: 900;
}

.history-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 16px;
}

.history-card button {
  width: 116px;
  height: 36px;
  border: 0;
  border-radius: 18px;
  background: #75d6df;
  color: #1f2a44;
  font-size: 14px;
  font-weight: 900;
}
</style>
