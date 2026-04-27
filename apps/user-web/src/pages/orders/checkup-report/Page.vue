<script setup lang="ts">
import { computed, onMounted } from "vue";
import type { PageComponentProps } from "@ihc/page-core/types";
import mock from "./mock";
import { useReportCenter } from "@/pages/healthdocs/report-center";

const props = defineProps<PageComponentProps>();
const { currentReport, ensureReportsLoaded, ensureCurrentReportReady, isCurrentReportLoading } =
  useReportCenter();

const reportMetrics = computed(() =>
  (currentReport.value?.metrics || []).map((item) => {
    const reference = item.reference || "--";
    const result = item.result || "--";
    const status =
      reference !== "--" && result !== "--" && result !== reference ? "关注" : "正常";

    return {
      item: item.name,
      result,
      unit: item.unit || "",
      reference,
      status
    };
  })
);

onMounted(async () => {
  await ensureReportsLoaded();
  await ensureCurrentReportReady();
});

function goBack() {
  if (!props.navigation.navigateBack()) {
    props.navigation.reLaunch("orders/rehab-therapy");
  }
}

function openHistory() {
  props.navigation.navigateTo("orders/checkup-history");
}

function openUpload() {
  props.navigation.navigateTo("orders/checkup-upload");
}

function openAiEvaluation() {
  props.navigation.navigateTo("orders/checkup-ai-waiting");
}
</script>

<template>
  <section class="checkup-report-page">
    <header class="page-nav">
      <button class="back-btn" type="button" aria-label="返回" @click="goBack">
        <span aria-hidden="true"></span>
      </button>
      <h1>{{ mock.title }}</h1>
    </header>

    <main class="report-scroll">
      <section class="report-actions">
        <button type="button" @click="openHistory">查看历史报告</button>
        <button type="button" @click="openUpload">添加报告</button>
        <button type="button" @click="openAiEvaluation">AI评估</button>
      </section>

      <article v-if="isCurrentReportLoading && !currentReport" class="empty-card">
        <p>正在加载报告...</p>
      </article>

      <article v-else-if="currentReport" class="report-paper">
        <header class="paper-header">
          <h2>{{ currentReport.hospital }}</h2>
          <p>{{ currentReport.reportName }}</p>
        </header>

        <section class="patient-grid">
          <p v-for="item in currentReport.patient.slice(0, 6)" :key="item.label">
            <span>{{ item.label }}</span>
            <strong>{{ item.value }}</strong>
          </p>
        </section>

        <section class="metric-table">
          <div class="table-head">
            <span>项目</span>
            <span>结果</span>
            <span>参考值</span>
            <span>状态</span>
          </div>
          <div v-for="item in reportMetrics" :key="`${item.item}-${item.result}`" class="table-row">
            <span>{{ item.item }}</span>
            <strong>{{ item.result }}<small>{{ item.unit }}</small></strong>
            <span>{{ item.reference }}</span>
            <em :class="{ warn: item.status !== '正常' }">{{ item.status }}</em>
          </div>
        </section>

        <section class="conclusion-card">
          <h3>体检结论</h3>
          <p>{{ currentReport.conclusion }}</p>
        </section>

        <footer class="paper-footer">
          <p v-for="item in currentReport.doctors" :key="item.label">
            <span>{{ item.label }}</span>
            <strong>{{ item.value }}</strong>
          </p>
        </footer>
      </article>

      <article v-else class="empty-card">
        <p>暂无体检报告</p>
      </article>
    </main>
  </section>
</template>

<style scoped>
.checkup-report-page {
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

.report-scroll {
  height: calc(100% - 74px);
  padding: 14px 16px 34px;
  overflow-y: auto;
  scrollbar-width: none;
}

.report-scroll::-webkit-scrollbar {
  display: none;
}

.empty-card {
  display: grid;
  place-items: center;
  min-height: 220px;
  border-radius: 18px;
  background: #f8fbfc;
  box-shadow: 0 14px 34px rgba(70, 110, 140, 0.08);
}

.empty-card p {
  margin: 0;
  color: rgba(48, 52, 63, 0.62);
  font-size: 15px;
  font-weight: 800;
}

.report-paper {
  min-height: calc(100% - 10px);
  padding: 24px 16px 28px;
  border-radius: 18px;
  background: #f8fbfc;
  box-shadow: 0 14px 34px rgba(70, 110, 140, 0.08);
}

.report-actions {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 14px;
}

.report-actions button {
  min-height: 38px;
  padding: 0 8px;
  border: 0;
  border-radius: 12px;
  background: #75d6df;
  box-shadow: 0 10px 20px rgba(117, 214, 223, 0.18);
  color: #1f2a44;
  font-size: 15px;
  font-weight: 900;
  white-space: nowrap;
}

.paper-header {
  padding-bottom: 18px;
  border-bottom: 1px solid rgba(120, 146, 166, 0.18);
  text-align: center;
}

.paper-header h2 {
  margin: 0;
  color: #1f2a44;
  font-size: 21px;
  font-weight: 900;
}

.paper-header p {
  margin: 8px 0 0;
  color: rgba(48, 52, 63, 0.62);
  font-size: 15px;
  font-weight: 900;
}

.patient-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-top: 18px;
}

.patient-grid p,
.paper-footer p {
  min-width: 0;
  margin: 0;
  padding: 10px;
  border-radius: 12px;
  background: #ffffff;
}

.patient-grid span,
.paper-footer span {
  display: block;
  color: rgba(48, 52, 63, 0.5);
  font-size: 12px;
  font-weight: 900;
}

.patient-grid strong,
.paper-footer strong {
  display: block;
  margin-top: 5px;
  color: #30343f;
  font-size: 15px;
  font-weight: 900;
}

.metric-table {
  margin-top: 18px;
  overflow: hidden;
  border-radius: 14px;
  background: #ffffff;
}

.table-head,
.table-row {
  display: grid;
  grid-template-columns: 1.05fr 0.95fr 1fr 0.6fr;
  gap: 8px;
  align-items: center;
  padding: 11px 10px;
}

.table-head {
  background: rgba(117, 214, 223, 0.14);
  color: #2b9fa9;
  font-size: 12px;
  font-weight: 900;
}

.table-row {
  border-top: 1px solid rgba(120, 146, 166, 0.12);
  color: #30343f;
  font-size: 12px;
  font-weight: 800;
}

.table-row strong {
  color: #2d90f0;
  font-size: 13px;
  font-weight: 900;
}

.table-row small {
  display: block;
  margin-top: 2px;
  color: rgba(48, 52, 63, 0.48);
  font-size: 10px;
}

.table-row em {
  color: #28a86c;
  font-style: normal;
  font-weight: 900;
}

.table-row em.warn {
  color: #2d90f0;
}

.conclusion-card {
  margin-top: 18px;
  padding: 16px;
  border-radius: 14px;
  background: #ffffff;
}

.conclusion-card h3 {
  margin: 0 0 8px;
  color: #1f2a44;
  font-size: 17px;
  font-weight: 900;
}

.conclusion-card p {
  margin: 0;
  color: rgba(48, 52, 63, 0.68);
  font-size: 14px;
  font-weight: 800;
  line-height: 1.7;
}

.paper-footer {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-top: 18px;
}
</style>
