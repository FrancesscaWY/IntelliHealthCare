<script setup lang="ts">
import { computed, onMounted } from "vue";
import type { PageComponentProps } from "@ihc/page-core/types";
import { formatOrderTime, useOrderCenter } from "@/pages/service/order-center";

const props = defineProps<PageComponentProps>();
const { currentOrderAssessmentReport, ensureCurrentAssessmentReport } = useOrderCenter();

const findings = computed(() => (currentOrderAssessmentReport.value?.summary?.findings as string[] | undefined) || []);
const recommendations = computed(() => (currentOrderAssessmentReport.value?.summary?.recommendations as string[] | undefined) || []);
const diagnosisSummary = computed(
  () => (currentOrderAssessmentReport.value?.summary?.diagnosisSummary as string | undefined) || ""
);

function goBack() {
  if (!props.navigation.navigateBack()) {
    props.navigation.reLaunch("orders/rehab-therapy");
  }
}

onMounted(() => {
  void ensureCurrentAssessmentReport();
});
</script>

<template>
  <section class="assessment-page">
    <header class="page-header">
      <button class="back-btn" type="button" aria-label="返回" @click="goBack">
        <span class="back-arrow" aria-hidden="true"></span>
      </button>
      <h1>评估报告</h1>
    </header>

    <main class="page-content">
      <section class="report-section">
        <h2>{{ currentOrderAssessmentReport?.title || "评估摘要" }}</h2>
        <p>{{ diagnosisSummary }}</p>
      </section>

      <section v-if="findings.length" class="report-section">
        <h2>评估发现</h2>
        <p v-for="item in findings" :key="item">{{ item }}</p>
      </section>

      <section v-if="recommendations.length" class="report-section">
        <h2>康复建议</h2>
        <p v-for="item in recommendations" :key="item">{{ item }}</p>
      </section>

      <section class="report-section">
        <h2>出具时间</h2>
        <p>{{ formatOrderTime(currentOrderAssessmentReport?.publishedAt || currentOrderAssessmentReport?.reviewedAt) }}</p>
      </section>
    </main>
  </section>
</template>

<style scoped>
.assessment-page { position: relative; left: 50%; width: min(390px, 100vw); min-height: min(844px, calc(100vh - 36px)); margin: -18px 0; background: #ffffff; color: #27303a; font-family: var(--ihc-font-family); transform: translateX(-50%); -webkit-font-smoothing: antialiased; }
.page-header { display: grid; grid-template-columns: 28px minmax(0, 1fr); align-items: center; gap: 12px; height: 68px; padding: 0 16px; }
.back-btn { display: grid; place-items: center; width: 28px; height: 28px; padding: 0; border: 0; background: transparent; color: inherit; }
.back-arrow { width: 11px; height: 11px; border-bottom: 2px solid #343936; border-left: 2px solid #343936; transform: rotate(45deg); }
.page-header h1 { margin: 0; font-size: 18px; font-weight: 700; }
.page-content { padding: 8px 12px 28px; }
.report-section { margin-bottom: 34px; }
.report-section h2 { margin: 0 0 16px; color: #29313b; font-size: 19px; font-weight: 800; }
.report-section p { margin: 0 0 8px; color: #4a5563; font-size: 16px; line-height: 1.9; }
</style>
