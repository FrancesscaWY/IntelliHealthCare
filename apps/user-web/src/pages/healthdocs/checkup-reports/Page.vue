<script setup lang="ts">
import { onMounted, ref } from "vue";
import type { PageComponentProps } from "@ihc/page-core/types";
import mock from "./mock";
import { useReportCenter } from "../report-center";

const props = defineProps<PageComponentProps>();
const { reports, removeReport, selectReport, ensureReportsLoaded, isReportsLoading, reportsError } =
  useReportCenter();
const pendingDeleteId = ref("");
const isDeleting = ref(false);

onMounted(() => {
  void ensureReportsLoaded();
});

function goBack() {
  if (!props.navigation.navigateBack()) {
    props.navigation.reLaunch("healthdocs/health-records");
  }
}

function requestDelete(reportId: string) {
  pendingDeleteId.value = reportId;
}

function cancelDelete() {
  pendingDeleteId.value = "";
}

async function confirmDelete() {
  if (!pendingDeleteId.value) {
    return;
  }

  isDeleting.value = true;

  try {
    await removeReport(pendingDeleteId.value);
    pendingDeleteId.value = "";
    props.showToast("已删除报告");
  } catch (error) {
    props.showToast(error instanceof Error ? error.message : "删除失败");
  } finally {
    isDeleting.value = false;
  }
}

function interpretReport(reportId: string) {
  selectReport(reportId);
  props.navigation.navigateTo("healthdocs/report-interpretation");
}

function viewReport(reportId: string) {
  selectReport(reportId);
  props.navigation.navigateTo("healthdocs/report-detail");
}

function uploadReport() {
  props.navigation.navigateTo("healthdocs/report-upload");
}
</script>

<template>
  <section class="report-page">
    <header class="page-nav">
      <button class="back-btn" type="button" aria-label="返回" @click="goBack">
        <span class="back-arrow" aria-hidden="true"></span>
      </button>
      <h1>{{ mock.title }}</h1>
    </header>

    <main class="page-scroll">
      <p v-if="isReportsLoading" class="status-text">正在同步报告列表...</p>
      <p v-else-if="reportsError" class="status-text status-text--error">{{ reportsError }}</p>

      <article v-for="item in reports" :key="item.id" class="report-card">
        <header class="card-head">
          <span class="report-icon" aria-hidden="true">
            <svg viewBox="0 0 32 32" focusable="false">
              <rect x="7.5" y="6.5" width="17" height="19" rx="4"></rect>
              <path d="M12 12h8"></path>
              <path d="M12 16h8"></path>
              <path d="M16 10v12"></path>
            </svg>
          </span>

          <div class="card-title">
            <h2>{{ item.title }}</h2>
          </div>
        </header>

        <section class="card-info">
          <p><span>状态：</span>{{ item.statusText }}</p>
          <p><span>报告来源：</span>{{ item.source }}</p>
          <p><span>报告时间：</span>{{ item.reportTime }}</p>
          <p><span>上传时间：</span>{{ item.uploadTime }}</p>
        </section>

        <footer class="card-actions">
          <button class="action-btn action-btn--ghost" type="button" @click="requestDelete(item.id)">
            删除报告
          </button>
          <button class="action-btn action-btn--ghost" type="button" @click="interpretReport(item.id)">
            报告解读
          </button>
          <button class="action-btn action-btn--primary" type="button" @click="viewReport(item.id)">
            查看报告
          </button>
        </footer>
      </article>

      <p class="no-more">{{ reports.length ? mock.emptyText : "暂无体检报告" }}</p>
    </main>

    <footer class="upload-area">
      <button class="upload-btn" type="button" @click="uploadReport">{{ mock.uploadText }}</button>
    </footer>

    <div v-if="pendingDeleteId" class="dialog-mask" @click.self="cancelDelete">
      <section class="dialog-card">
        <h3>删除报告</h3>
        <p>确定删除这条体检报告吗？</p>
        <div class="dialog-actions">
          <button class="dialog-btn dialog-btn--ghost" type="button" @click="cancelDelete">取消</button>
          <button class="dialog-btn dialog-btn--primary" type="button" :disabled="isDeleting" @click="confirmDelete">
            {{ isDeleting ? "删除中..." : "确认删除" }}
          </button>
        </div>
      </section>
    </div>
  </section>
</template>

<style scoped>
.report-page {
  position: relative;
  left: 50%;
  width: min(390px, 100vw);
  height: auto;
  min-height: var(--ihc-page-min-height);
  max-height: none;
  margin: -18px 0;
  overflow: hidden;
  background:
    radial-gradient(circle at 82% 8%, rgba(117, 214, 223, 0.18) 0, rgba(117, 214, 223, 0) 28%),
    linear-gradient(180deg, #f1f8ff 0%, #f7f9fb 42%, #f5f6f7 100%);
  color: #222733;
  font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif;
  transform: translateX(-50%);
  -webkit-font-smoothing: antialiased;
}

.page-nav {
  display: flex;
  align-items: center;
  height: 74px;
  padding: 0 29px;
}

.back-btn,
.action-btn,
.upload-btn {
  border: 0;
  background: transparent;
  color: inherit;
}

.back-btn {
  display: grid;
  place-items: center;
  width: 30px;
  height: 44px;
  padding: 0;
}

.back-arrow {
  width: 14px;
  height: 14px;
  border-bottom: 3px solid #252939;
  border-left: 3px solid #252939;
  transform: rotate(45deg);
}

.page-nav h1 {
  margin: 0 0 0 9px;
  color: #222733;
  font-size: 20px;
  font-weight: 900;
  letter-spacing: 0;
}

.page-scroll {
  height: calc(100% - 74px);
  padding: 16px 24px 110px;
  overflow-y: auto;
  scrollbar-width: none;
}

.page-scroll::-webkit-scrollbar {
  display: none;
}

.status-text {
  margin: 0 0 12px;
  color: #8f95a2;
  font-size: 13px;
  font-weight: 600;
}

.status-text--error {
  color: #d56c6c;
}

.report-card {
  margin-top: 14px;
  padding: 16px 16px 14px;
  border: 1px solid rgba(255, 255, 255, 0.74);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 10px 24px rgba(72, 104, 148, 0.06);
}

.report-card:first-child {
  margin-top: 0;
}

.card-head {
  display: flex;
  align-items: center;
  gap: 12px;
}

.report-icon {
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  width: 42px;
  height: 42px;
  border: 1px solid rgba(232, 236, 244, 0.95);
  border-radius: 50%;
  background: linear-gradient(180deg, #ffffff 0%, #f7f9fd 100%);
  box-shadow: 0 8px 18px rgba(54, 67, 92, 0.05);
}

.report-icon svg {
  width: 19px;
  height: 19px;
  fill: none;
  stroke: #45484f;
  stroke-width: 2.1;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.card-title {
  min-width: 0;
}

.card-title h2 {
  margin: 0;
  color: #222733;
  font-size: 17px;
  font-weight: 600;
  letter-spacing: 0;
}

.card-info {
  display: grid;
  gap: 6px;
  margin-top: 14px;
}

.card-info p {
  margin: 0;
  color: #8f95a2;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.4;
}

.card-info span {
  color: #8e8f94;
}

.card-actions {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-top: 18px;
}

.action-btn {
  height: 40px;
  border-radius: 14px;
  font-size: 14px;
  font-weight: 500;
}

.action-btn--ghost {
  border: 1px solid #e9ebf1;
  background: #ffffff;
  box-shadow: 0 4px 10px rgba(72, 104, 148, 0.03);
  color: #565b66;
}

.action-btn--primary {
  background: linear-gradient(100deg, #75d6df 0%, #7be28e 100%);
  box-shadow: 0 12px 22px rgba(89, 200, 162, 0.22);
  color: #ffffff;
}

.no-more {
  margin: 28px 0 0;
  color: #8f95a2;
  font-size: 16px;
  font-weight: 500;
  text-align: center;
}

.upload-area {
  position: absolute;
  right: 24px;
  bottom: 18px;
  left: 24px;
}

.upload-btn {
  width: 100%;
  height: 60px;
  border-radius: 16px;
  background: linear-gradient(100deg, #75d6df 0%, #7be28e 100%);
  box-shadow: 0 14px 28px rgba(89, 200, 162, 0.22);
  color: #ffffff;
  font-size: 16px;
  font-weight: 900;
  letter-spacing: 0;
}

.dialog-mask {
  position: absolute;
  inset: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(21, 28, 41, 0.2);
}

.dialog-card {
  width: 100%;
  max-width: 300px;
  padding: 22px 18px 18px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 18px 34px rgba(63, 83, 117, 0.14);
  text-align: center;
}

.dialog-card h3 {
  margin: 0;
  color: #222733;
  font-size: 16px;
  font-weight: 900;
}

.dialog-card p {
  margin: 10px 0 0;
  color: #707784;
  font-size: 14px;
  font-weight: 500;
  line-height: 1.55;
}

.dialog-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-top: 18px;
}

.dialog-btn {
  height: 42px;
  border: 0;
  border-radius: 14px;
  font-size: 14px;
  font-weight: 500;
}

.dialog-btn--ghost {
  background: #f3f5f9;
  color: #666d79;
}

.dialog-btn--primary {
  background: linear-gradient(100deg, #75d6df 0%, #7be28e 100%);
  color: #ffffff;
}

.dialog-btn:disabled {
  opacity: 0.7;
}

@media (min-width: 561px) {
  .report-page {
    height: auto;
    min-height: var(--ihc-page-min-height);
  }
}

@media (max-width: 389px) {
  .page-scroll {
    padding-right: 20px;
    padding-left: 20px;
  }

  .upload-area {
    right: 20px;
    left: 20px;
  }

  .card-actions {
    gap: 8px;
  }

  .action-btn {
    font-size: 14px;
  }
}
</style>
