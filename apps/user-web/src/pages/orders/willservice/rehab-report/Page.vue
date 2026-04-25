<script setup lang="ts">
import { computed, onMounted } from "vue";
import type { PageComponentProps } from "@ihc/page-core/types";
import { formatOrderTime, useOrderCenter } from "@/pages/service/order-center";

const props = defineProps<PageComponentProps>();
const { currentOrderRehabReport, ensureCurrentRehabReport } = useOrderCenter();

const progressText = computed(
  () => (currentOrderRehabReport.value?.summary?.progress as string | undefined) || ""
);
const planItems = computed(
  () => (currentOrderRehabReport.value?.summary?.plan as string[] | undefined) || []
);
const sessionCount = computed(
  () => Number(currentOrderRehabReport.value?.summary?.sessionCount || 0)
);

function goBack() {
  if (!props.navigation.navigateBack()) {
    props.navigation.reLaunch("orders/willservice/service-record");
  }
}

onMounted(() => {
  void ensureCurrentRehabReport();
});
</script>

<template>
  <section class="rehab-report-page">
    <header class="page-header">
      <button class="back-btn" type="button" aria-label="返回" @click="goBack">
        <span class="back-arrow" aria-hidden="true"></span>
      </button>
      <h1>康复报告</h1>
    </header>

    <main class="page-content">
      <section class="report-section">
        <h2>{{ currentOrderRehabReport?.title || "康复进展" }}</h2>
        <p>{{ progressText }}</p>
      </section>

      <section v-if="planItems.length" class="report-section">
        <h2>后续计划</h2>
        <p v-for="item in planItems" :key="item">{{ item }}</p>
      </section>

      <section class="report-section">
        <h2>疗程次数</h2>
        <p>{{ sessionCount }}</p>
      </section>

      <footer class="report-footer">
        <p><span>报告时间：</span>{{ formatOrderTime(currentOrderRehabReport?.publishedAt) }}</p>
      </footer>
    </main>
  </section>
</template>

<style scoped>
.rehab-report-page { position: relative; left: 50%; width: min(390px, 100vw); min-height: min(844px, calc(100vh - 36px)); margin: -18px 0; background: #ffffff; color: #27303a; font-family: var(--ihc-font-family); transform: translateX(-50%); -webkit-font-smoothing: antialiased; }
.page-header { display: grid; grid-template-columns: 28px minmax(0, 1fr); align-items: center; gap: 12px; height: 68px; padding: 0 16px; }
.back-btn { display: grid; place-items: center; width: 28px; height: 28px; padding: 0; border: 0; background: transparent; color: inherit; }
.back-arrow { width: 11px; height: 11px; border-bottom: 2px solid #343936; border-left: 2px solid #343936; transform: rotate(45deg); }
.page-header h1 { margin: 0; font-size: 18px; font-weight: 700; }
.page-content { padding: 8px 16px 32px; }
.report-section { margin-bottom: 34px; }
.report-section h2 { margin: 0 0 16px; color: #29313b; font-size: 19px; font-weight: 800; }
.report-section p,.report-footer p { margin: 0 0 8px; color: #4a5563; font-size: 16px; line-height: 1.9; }
.report-footer { padding-top: 10px; }
.report-footer span { color: #29313b; }
</style>
