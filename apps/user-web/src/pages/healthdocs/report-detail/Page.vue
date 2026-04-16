<script setup lang="ts">
import { ref } from "vue";
import type { PageComponentProps } from "@ihc/page-core/types";
import mock from "./mock";
import { useReportCenter } from "../report-center";

const props = defineProps<PageComponentProps>();
const { currentReport, removeCurrentReport } = useReportCenter();
const showDeleteDialog = ref(false);

function goBack() {
  if (!props.navigation.navigateBack()) {
    props.navigation.reLaunch("healthdocs/checkup-reports");
  }
}

function deleteReport() {
  showDeleteDialog.value = true;
}

function cancelDelete() {
  showDeleteDialog.value = false;
}

function confirmDelete() {
  if (!currentReport.value) {
    showDeleteDialog.value = false;
    return;
  }

  removeCurrentReport();
  showDeleteDialog.value = false;
  props.showToast("已删除报告");
  props.navigation.reLaunch("healthdocs/checkup-reports");
}

function downloadReport() {
  props.showToast("下载功能待接入");
}

function interpretReport() {
  props.navigation.navigateTo("healthdocs/report-interpretation");
}
</script>

<template>
  <section class="report-detail-page">
    <header class="page-nav">
      <button class="back-btn" type="button" aria-label="返回" @click="goBack">
        <span class="back-arrow" aria-hidden="true"></span>
      </button>
      <h1>{{ mock.title }}</h1>
    </header>

    <main class="page-scroll">
      <article v-if="currentReport" class="paper-sheet">
        <header class="paper-header">
          <h2>{{ currentReport.hospital }}</h2>
          <p>{{ currentReport.reportName }}</p>
        </header>

        <section class="paper-block patient-block">
          <div class="patient-row">
            <p v-for="item in currentReport.patient.slice(0, 3)" :key="item.label">
              <span>{{ item.label }}：</span>{{ item.value || "" }}
            </p>
          </div>
          <div class="patient-row">
            <p v-for="item in currentReport.patient.slice(3, 7)" :key="item.label">
              <span>{{ item.label }}：</span>{{ item.value || "" }}
            </p>
          </div>
          <div class="patient-row">
            <p v-for="item in currentReport.patient.slice(7, 10)" :key="item.label">
              <span>{{ item.label }}：</span>{{ item.value || "" }}
            </p>
          </div>
        </section>

        <section class="paper-block result-block">
          <div class="result-head">
            <span>检测指标</span>
            <span>结果</span>
            <span>单位</span>
            <span>参考值</span>
          </div>

          <div v-for="item in currentReport.metrics" :key="`${item.name}-${item.result}`" class="result-row">
            <span>{{ item.name }}</span>
            <span>{{ item.result }}</span>
            <span>{{ item.unit }}</span>
            <span>{{ item.reference }}</span>
          </div>
        </section>

        <section class="paper-footer">
          <div class="footer-line footer-line--doctor">
            <p v-for="item in currentReport.doctors" :key="item.label">
              <span>{{ item.label }}：</span>{{ item.value || "" }}
            </p>
          </div>
          <div class="footer-line">
            <p><span>报告时间：</span>{{ currentReport.reportTime }}</p>
          </div>
          <div class="footer-line">
            <p><span>审核时间：</span>{{ currentReport.reviewTime }}</p>
          </div>
          <div class="footer-divider"></div>
        </section>
      </article>

      <article v-else class="empty-card">
        <p>{{ mock.emptyText }}</p>
      </article>
    </main>

    <footer class="action-bar">
      <button class="bar-btn bar-btn--ghost" type="button" @click="deleteReport">删除报告</button>
      <button class="bar-btn bar-btn--ghost" type="button" @click="downloadReport">下载</button>
      <button class="bar-btn bar-btn--primary" type="button" @click="interpretReport">报告解读</button>
    </footer>

    <div v-if="showDeleteDialog" class="dialog-mask" @click.self="cancelDelete">
      <section class="dialog-card">
        <h3>删除报告</h3>
        <p>确定删除这条体检报告吗？</p>
        <div class="dialog-actions">
          <button class="dialog-btn dialog-btn--ghost" type="button" @click="cancelDelete">取消</button>
          <button class="dialog-btn dialog-btn--primary" type="button" @click="confirmDelete">确定删除</button>
        </div>
      </section>
    </div>
  </section>
</template>

<style scoped>
.report-detail-page {
  position: relative;
  left: 50%;
  width: min(390px, 100vw);
  height: min(844px, calc(100vh - 36px));
  min-height: min(844px, calc(100vh - 36px));
  max-height: 844px;
  margin: -18px 0;
  overflow: hidden;
  background:
    radial-gradient(circle at 82% 8%, rgba(102, 112, 240, 0.11) 0, rgba(102, 112, 240, 0) 28%),
    linear-gradient(180deg, #f4f7fb 0%, #f7f8fa 100%);
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

.back-btn,
.bar-btn {
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

.page-scroll {
  height: calc(100% - 74px);
  padding: 10px 14px 112px;
  overflow-y: auto;
  scrollbar-width: none;
}

.page-scroll::-webkit-scrollbar {
  display: none;
}

.paper-sheet {
  min-height: 100%;
  padding: 22px 18px 26px;
  border-radius: 16px;
  background: #ffffff;
  box-shadow: 0 8px 24px rgba(72, 104, 148, 0.05);
}

.paper-header {
  padding: 8px 0 18px;
  text-align: center;
}

.paper-header h2 {
  margin: 0;
  color: #2f3135;
  font-size: 20px;
  font-weight: 700;
  letter-spacing: 0.01em;
}

.paper-header p {
  margin: 6px 0 0;
  color: #3d4148;
  font-size: 18px;
  font-weight: 600;
}

.paper-block {
  border-top: 3px solid #4a4a4a;
}

.patient-block {
  padding: 14px 0 16px;
}

.patient-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 18px;
  margin-top: 10px;
}

.patient-row:first-child {
  margin-top: 0;
}

.patient-row p,
.footer-line p {
  margin: 0;
  color: #404348;
  font-size: 12px;
  font-weight: 500;
  line-height: 1.55;
}

.patient-row span,
.footer-line span {
  color: #3b3f46;
  font-weight: 600;
}

.result-block {
  padding-top: 10px;
}

.result-head,
.result-row {
  display: grid;
  grid-template-columns: minmax(0, 1.85fr) minmax(0, 0.78fr) minmax(0, 0.95fr) minmax(0, 0.95fr);
  gap: 10px;
  align-items: center;
}

.result-head {
  min-height: 38px;
  border-bottom: 3px solid #4a4a4a;
  color: #3d4148;
  font-size: 12px;
  font-weight: 700;
}

.result-row {
  min-height: 44px;
  color: #404348;
  font-size: 12px;
  font-weight: 500;
}

.paper-footer {
  padding-top: 160px;
}

.footer-line {
  margin-top: 10px;
}

.footer-line:first-child {
  margin-top: 0;
}

.footer-line--doctor {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 18px;
}

.footer-divider {
  margin-top: 14px;
  border-top: 3px solid #4a4a4a;
}

.empty-card {
  display: grid;
  place-items: center;
  min-height: 180px;
  border: 1px solid rgba(255, 255, 255, 0.74);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 10px 24px rgba(72, 104, 148, 0.06);
}

.empty-card p {
  margin: 0;
  color: #9aa1aa;
  font-size: 16px;
  font-weight: 500;
}

.action-bar {
  position: absolute;
  right: 20px;
  bottom: 16px;
  left: 20px;
  display: grid;
  grid-template-columns: 1.1fr 0.9fr 1.2fr;
  gap: 10px;
}

.bar-btn {
  height: 48px;
  border-radius: 16px;
  font-size: 15px;
  font-weight: 500;
}

.bar-btn--ghost {
  border: 1px solid #e9ebf1;
  background: #ffffff;
  box-shadow: 0 4px 10px rgba(72, 104, 148, 0.03);
  color: #565b66;
}

.bar-btn--primary {
  background: #6670f0;
  box-shadow: 0 12px 22px rgba(102, 112, 240, 0.18);
  color: #ffffff;
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
  color: #30343f;
  font-size: 18px;
  font-weight: 700;
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
  background: #6670f0;
  color: #ffffff;
}

@media (min-width: 561px) {
  .report-detail-page {
    height: 844px;
    min-height: 844px;
  }
}

@media (max-width: 389px) {
  .page-scroll {
    padding-right: 10px;
    padding-left: 10px;
  }

  .paper-sheet {
    padding-right: 14px;
    padding-left: 14px;
  }

  .patient-row,
  .footer-line--doctor {
    gap: 6px 12px;
  }

  .result-head,
  .result-row {
    gap: 8px;
  }

  .action-bar {
    right: 16px;
    left: 16px;
    gap: 8px;
  }
}
</style>
