<script setup lang="ts">
import type { PageComponentProps } from "@ihc/page-core/types";
import mock from "./mock";

const props = defineProps<PageComponentProps>();

function goBack() {
  if (!props.navigation.navigateBack()) {
    props.navigation.reLaunch("orders/willservice/service-record");
  }
}
</script>

<template>
  <section class="rehab-report-page">
    <header class="page-header">
      <button class="back-btn" type="button" aria-label="返回" @click="goBack">
        <span class="back-arrow" aria-hidden="true"></span>
      </button>
      <h1>{{ mock.title }}</h1>
    </header>

    <main class="page-content">
      <section class="report-section">
        <h2>一、患者基本信息</h2>
        <div class="info-list">
          <p v-for="item in mock.patientInfo" :key="item.label">
            <span>{{ item.label }}：</span>{{ item.value }}
          </p>
        </div>
      </section>

      <section v-for="section in mock.sections" :key="section.title" class="report-section">
        <h2>{{ section.title }}</h2>

        <template v-if="section.paragraphs">
          <p v-for="paragraph in section.paragraphs" :key="paragraph">{{ paragraph }}</p>
        </template>

        <template v-if="section.bullets">
          <div v-for="bullet in section.bullets" :key="bullet.title" class="report-bullet">
            <strong>• {{ bullet.title }}</strong>
            <p v-for="item in bullet.items" :key="item">{{ item }}</p>
          </div>
        </template>
      </section>

      <footer class="report-footer">
        <p v-for="item in mock.footer" :key="item.label"><span>{{ item.label }}：</span>{{ item.value }}</p>
      </footer>
    </main>
  </section>
</template>

<style scoped>
.rehab-report-page {
  position: relative;
  left: 50%;
  width: min(390px, 100vw);
  min-height: min(844px, calc(100vh - 36px));
  margin: -18px 0;
  background: #ffffff;
  color: #27303a;
  font-family: var(--ihc-font-family);
  transform: translateX(-50%);
  -webkit-font-smoothing: antialiased;
}

.page-header {
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr);
  align-items: center;
  gap: 12px;
  height: 68px;
  padding: 0 16px;
}

.back-btn {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
}

.back-arrow {
  width: 11px;
  height: 11px;
  border-bottom: 2px solid #343936;
  border-left: 2px solid #343936;
  transform: rotate(45deg);
}

.page-header h1 {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
}

.page-content {
  padding: 8px 16px 32px;
}

.report-section {
  margin-bottom: 34px;
}

.report-section h2 {
  margin: 0 0 16px;
  color: #29313b;
  font-size: 19px;
  font-weight: 800;
}

.info-list p,
.report-section p,
.report-footer p,
.report-bullet strong {
  color: #4a5563;
  font-size: 16px;
  line-height: 1.9;
}

.info-list p,
.report-section p,
.report-footer p {
  margin: 0 0 8px;
}

.info-list span,
.report-footer span {
  color: #29313b;
}

.report-bullet {
  margin-bottom: 12px;
}

.report-bullet strong {
  display: block;
  margin-bottom: 4px;
  color: #29313b;
  font-size: 17px;
  font-weight: 700;
}

.report-footer {
  padding-top: 10px;
}
</style>
