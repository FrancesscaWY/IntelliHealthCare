<script setup lang="ts">
import { onMounted, ref } from "vue";
import type { PageComponentProps } from "@ihc/page-core/types";
import { listCheckupReports, type CheckupReportCard } from "@/shared/api/reports";
import { setSelectedAiReportId } from "@/shared/ai/state";

const props = defineProps<PageComponentProps>();
const reports = ref<CheckupReportCard[]>([]);
const isLoading = ref(false);

function goBack() {
  if (!props.navigation.navigateBack()) {
    props.navigation.reLaunch("orders/checkup-report");
  }
}

function formatDateLabel(value: string | null) {
  if (!value) {
    return "待同步";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatStatusLabel(status: string) {
  if (status === "PUBLISHED") {
    return "已出具";
  }

  if (status === "PENDING_REVIEW") {
    return "待审核";
  }

  return status;
}

async function loadReports() {
  isLoading.value = true;

  try {
    const response = await listCheckupReports({
      page: 1,
      pageSize: 20
    });
    reports.value = response.list;
  } catch (error) {
    props.showToast(error instanceof Error ? error.message : "报告列表加载失败");
  } finally {
    isLoading.value = false;
  }
}

function viewReport(reportId: string) {
  setSelectedAiReportId(reportId);
  props.navigation.navigateTo("orders/checkup-report");
}

function viewAiEvaluation(reportId: string) {
  setSelectedAiReportId(reportId);
  props.navigation.navigateTo("orders/checkup-ai-waiting");
}

onMounted(() => {
  void loadReports();
});
</script>

<template>
  <section class="history-page">
    <header class="page-nav">
      <button class="back-btn" type="button" aria-label="返回" @click="goBack">
        <span aria-hidden="true"></span>
      </button>
      <h1>历史报告</h1>
    </header>

    <main class="history-scroll">
      <article v-if="isLoading" class="empty-card">
        <strong>报告加载中</strong>
        <p>正在同步最新体检报告，请稍候。</p>
      </article>

      <article v-else-if="reports.length === 0" class="empty-card">
        <strong>暂无历史报告</strong>
        <p>完成体检并生成报告后，这里会展示可供 AI 解读的报告列表。</p>
      </article>

      <article v-for="item in reports" :key="item.reportId" class="history-card">
        <header>
          <div>
            <h2>{{ item.title }}</h2>
            <p>体检中心 · {{ formatDateLabel(item.publishedAt || item.createdAt) }}</p>
          </div>
          <span>{{ formatStatusLabel(item.status) }}</span>
        </header>
        <p class="summary">报告编号：{{ item.reportId }}，点击 AI 评估可查看智能解读、风险信号与后续建议。</p>
        <div class="history-actions">
          <button type="button" @click="viewReport(item.reportId)">查看报告</button>
          <button type="button" @click="viewAiEvaluation(item.reportId)">AI评估</button>
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

.history-card,
.empty-card {
  padding: 18px;
  margin-bottom: 14px;
  border-radius: 18px;
  background: #f8fbfc;
  box-shadow: 0 14px 34px rgba(70, 110, 140, 0.08);
}

.empty-card {
  display: grid;
  gap: 8px;
}

.empty-card strong {
  color: #1f2a44;
  font-size: 17px;
  font-weight: 900;
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
.summary,
.empty-card p {
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
