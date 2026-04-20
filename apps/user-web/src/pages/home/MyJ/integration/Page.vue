<script setup lang="ts">
import { computed, ref } from "vue";
import type { PageComponentProps } from "@ihc/page-core/types";
import mock, { type IntegrationTabKey } from "./mock";

const props = defineProps<PageComponentProps>();
const activeTab = ref<IntegrationTabKey>("income");

const visibleRecords = computed(() => mock.records.filter((record) => record.type === activeTab.value));

function goBack() {
  props.navigation.reLaunch("home/mine");
}

function selectTab(tab: IntegrationTabKey) {
  activeTab.value = tab;
}
</script>

<template>
  <section class="integration-page">
    <header class="hero-panel">
      <div class="hero-nav">
        <button class="back-btn" type="button" aria-label="返回我的页面" @click="goBack">
          <span class="back-arrow" aria-hidden="true"></span>
        </button>
        <div class="hero-copy">
          <h1>{{ mock.title }}</h1>
        </div>
      </div>
    </header>

    <main class="integration-shell">
      <section class="points-card">
        <div class="points-main">
          <span class="points-label">当前积分</span>
          <strong>{{ mock.currentPoints }}</strong>
        </div>
      </section>

      <section class="detail-card">
        <header class="detail-header">
          <h2>{{ mock.detailTitle }}</h2>
          <div class="tab-row" aria-label="积分明细筛选">
            <button
              v-for="tab in mock.tabs"
              :key="tab.key"
              class="tab-btn"
              :class="{ 'tab-btn--active': activeTab === tab.key }"
              type="button"
              @click="selectTab(tab.key)"
            >
              {{ tab.label }}
            </button>
          </div>
        </header>

        <div class="record-list">
          <article v-for="record in visibleRecords" :key="record.id" class="record-row">
            <div class="record-copy">
              <h3>{{ record.title }}</h3>
              <p>{{ record.time }}</p>
            </div>
            <strong class="record-amount" :class="{ 'record-amount--expense': record.type === 'expense' }">
              {{ record.amount }}
            </strong>
          </article>
        </div>
      </section>
    </main>
  </section>
</template>

<style scoped>
.integration-page {
  position: relative;
  left: 50%;
  width: min(390px, 100vw);
  min-height: min(844px, calc(100vh - 36px));
  margin: -18px 0;
  background: #f5f6f7;
  color: #2b3128;
  font-family: "HarmonyOS Sans SC", "MiSans", var(--ihc-font-family);
  transform: translateX(-50%);
  -webkit-font-smoothing: antialiased;
}

.hero-panel {
  padding: 16px 16px 14px;
  color: #2f352b;
  background: #f5f6f7;
  border-bottom: 1px solid #eaedf1;
}

.hero-nav {
  display: grid;
  grid-template-columns: 32px minmax(0, 1fr);
  align-items: center;
  gap: 10px;
}

.back-btn,
.tab-btn {
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
}

.back-btn {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: 16px;
  border: 1px solid #e7eadf;
  background: #ffffff;
}

.back-arrow {
  width: 10px;
  height: 10px;
  border-bottom: 2px solid #4c5447;
  border-left: 2px solid #4c5447;
  transform: rotate(45deg);
}

.hero-copy h1 {
  margin: 0;
  font-size: 19px;
  font-weight: 700;
  letter-spacing: 0;
}

.integration-shell {
  display: grid;
  gap: 14px;
  padding: 14px;
}

.points-card,
.detail-card {
  background: #ffffff;
  border: 1px solid #eceff3;
  border-radius: 20px;
}

.points-card {
  position: relative;
  overflow: hidden;
  padding: 18px 20px;
  box-shadow: 0 8px 20px rgba(64, 77, 97, 0.05);
}

.points-card::after {
  position: absolute;
  top: -18px;
  right: -12px;
  width: 92px;
  height: 92px;
  content: "";
  border-radius: 50%;
  background: radial-gradient(circle, rgba(224, 228, 235, 0.7) 0%, rgba(224, 228, 235, 0) 72%);
  pointer-events: none;
}

.points-main {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 18px;
  flex-wrap: nowrap;
  white-space: nowrap;
}

.points-label {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  min-width: 100px;
  height: 34px;
  padding: 0 16px;
  border-radius: 999px;
  background: #2f3d2f;
  color: #ffffff;
  font-size: 15px;
  font-weight: 700;
}

.points-main strong {
  flex: 0 0 auto;
  color: #30362f;
  font-size: 32px;
  line-height: 1;
  font-weight: 700;
  letter-spacing: -0.03em;
}

.detail-card {
  overflow: hidden;
  box-shadow: 0 8px 20px rgba(64, 77, 97, 0.035);
}

.detail-header {
  padding: 18px 18px 0;
}

.detail-header h2 {
  margin: 0;
  color: #343934;
  font-size: 18px;
  font-weight: 700;
}

.tab-row {
  display: flex;
  gap: 28px;
  margin-top: 18px;
  border-bottom: 1px solid #eef1f4;
}

.tab-btn {
  position: relative;
  padding: 0 0 14px;
  color: #b7bdb0;
  font-size: 15px;
  font-weight: 600;
}

.tab-btn--active {
  color: #2f352b;
}

.tab-btn--active::after {
  position: absolute;
  right: 0;
  bottom: -1px;
  left: 0;
  height: 2px;
  content: "";
  border-radius: 999px;
  background: #2f352b;
}

.record-list {
  padding: 0 18px;
}

.record-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  padding: 22px 0;
  border-bottom: 1px solid #f0f2f4;
}

.record-row:last-child {
  border-bottom: 0;
}

.record-copy h3 {
  margin: 0;
  color: #3a3f3a;
  font-size: 16px;
  font-weight: 600;
}

.record-copy p {
  margin: 8px 0 0;
  color: #c1c6bb;
  font-size: 13px;
  line-height: 1.4;
}

.record-amount {
  color: #323833;
  font-size: 16px;
  font-weight: 700;
}

.record-amount--expense {
  color: #8d9487;
}
</style>
