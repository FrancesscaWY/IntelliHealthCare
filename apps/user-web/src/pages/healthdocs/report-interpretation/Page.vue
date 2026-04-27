<script setup lang="ts">
import { onMounted } from "vue";
import type { PageComponentProps } from "@ihc/page-core/types";
import mock from "./mock";
import { useReportCenter } from "../report-center";

const props = defineProps<PageComponentProps>();
const { currentReport, ensureCurrentReportReady, isCurrentReportLoading } = useReportCenter();

onMounted(() => {
  void ensureCurrentReportReady();
});

function goBack() {
  if (!props.navigation.navigateBack()) {
    props.navigation.reLaunch("healthdocs/report-detail");
  }
}
</script>

<template>
  <section class="interpret-page">
    <header class="page-nav">
      <button class="back-btn" type="button" aria-label="返回" @click="goBack">
        <span class="back-arrow" aria-hidden="true"></span>
      </button>
      <h1>{{ mock.title }}</h1>
    </header>

    <main class="page-scroll">
      <article v-if="isCurrentReportLoading && !currentReport" class="empty-card">
        <p>正在生成报告解读...</p>
      </article>

      <article v-else-if="currentReport" class="paper-card">
        <header class="paper-header">
          <h2>{{ currentReport.interpretationHeading }}</h2>
        </header>

        <section class="meta-block">
          <p><span>解读来源：</span>{{ currentReport.interpretationDoctor }}</p>
          <p><span>解读时间：</span>{{ currentReport.interpretationTime }}</p>
        </section>

        <section class="section-block">
          <h3>重点说明</h3>
          <article
            v-for="item in currentReport.interpretationNotes"
            :key="item.title"
            class="note-item"
          >
            <h4>{{ item.title }}</h4>
            <p>{{ item.content }}</p>
          </article>
        </section>

        <section class="section-block section-block--suggestion">
          <h3>建议</h3>
          <p>{{ currentReport.interpretationSuggestion }}</p>
        </section>
      </article>

      <article v-else class="empty-card">
        <p>{{ mock.emptyText }}</p>
      </article>
    </main>
  </section>
</template>

<style scoped>
.interpret-page {
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

.back-btn {
  display: grid;
  place-items: center;
  width: 30px;
  height: 44px;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
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
  padding: 18px 20px 24px;
  overflow-y: auto;
  scrollbar-width: none;
}

.page-scroll::-webkit-scrollbar {
  display: none;
}

.paper-card {
  padding: 18px 0 24px;
  border: 1px solid rgba(255, 255, 255, 0.74);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 10px 24px rgba(72, 104, 148, 0.06);
}

.paper-header {
  padding: 14px 22px 18px;
  border-bottom: 3px solid #4a4a4a;
  text-align: center;
}

.paper-header h2 {
  margin: 0;
  color: #222733;
  font-size: 18px;
  font-weight: 900;
  letter-spacing: 0;
}

.meta-block,
.section-block {
  padding: 14px 22px 0;
}

.meta-block {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 18px;
  padding-bottom: 14px;
  border-bottom: 3px solid #4a4a4a;
}

.meta-block p,
.section-block p {
  margin: 0;
  color: #404348;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.75;
}

.meta-block span {
  font-weight: 700;
}

.section-block h3 {
  margin: 0 0 10px;
  color: #222733;
  font-size: 16px;
  font-weight: 900;
}

.note-item + .note-item {
  margin-top: 12px;
}

.note-item h4 {
  margin: 0;
  color: #222733;
  font-size: 16px;
  font-weight: 700;
  line-height: 1.6;
}

.note-item p {
  margin-top: 2px;
}

.section-block--suggestion {
  margin-top: 16px;
  padding-top: 18px;
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
  color: #8f95a2;
  font-size: 16px;
  font-weight: 500;
}

@media (min-width: 561px) {
  .interpret-page {
    height: auto;
    min-height: var(--ihc-page-min-height);
  }
}

@media (max-width: 389px) {
  .page-scroll {
    padding-right: 16px;
    padding-left: 16px;
  }

  .paper-header,
  .meta-block,
  .section-block {
    padding-right: 16px;
    padding-left: 16px;
  }

  .section-block h3 {
    font-size: 17px;
  }

  .note-item h4 {
    font-size: 15px;
  }
}
</style>
