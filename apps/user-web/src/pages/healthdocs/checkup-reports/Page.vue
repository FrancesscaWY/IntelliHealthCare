<script setup lang="ts">
import type { PageComponentProps } from "@ihc/page-core/types";
import mock from "./mock";

const props = defineProps<PageComponentProps>();

function goBack() {
  if (!props.navigation.navigateBack()) {
    props.navigation.reLaunch("healthdocs/health-records");
  }
}
</script>

<template>
  <section class="detail-page">
    <header class="page-nav">
      <button class="back-btn" type="button" aria-label="返回" @click="goBack">
        <span class="back-arrow" aria-hidden="true"></span>
      </button>
      <h1>{{ mock.title }}</h1>
    </header>

    <main class="page-scroll">
      <section class="summary-card">
        <article v-for="item in mock.summary" :key="item.label" class="summary-item">
          <span>{{ item.label }}</span>
          <strong>{{ item.value }}</strong>
        </article>
      </section>

      <section v-for="item in mock.reports" :key="`${item.title}-${item.time}`" class="report-card">
        <div class="report-head">
          <div>
            <h2>{{ item.title }}</h2>
            <p>{{ item.hospital }}</p>
          </div>
          <time>{{ item.time }}</time>
        </div>

        <div class="tag-list">
          <span v-for="tag in item.tags" :key="tag">{{ tag }}</span>
        </div>

        <p class="report-note">{{ item.note }}</p>
      </section>
    </main>
  </section>
</template>

<style scoped>
.detail-page {
  position: relative;
  left: 50%;
  width: min(390px, 100vw);
  height: min(844px, calc(100vh - 36px));
  min-height: min(844px, calc(100vh - 36px));
  max-height: 844px;
  margin: -18px 0;
  overflow: hidden;
  background:
    radial-gradient(circle at 82% 8%, rgba(102, 112, 240, 0.13) 0, rgba(102, 112, 240, 0) 28%),
    linear-gradient(180deg, #f1f8ff 0%, #f7f9fb 42%, #f5f6f7 100%);
  color: #30343f;
  font-family: "HarmonyOS Sans SC", "MiSans", "Source Han Sans SC", "Noto Sans SC", "PingFang SC", "Microsoft YaHei UI", sans-serif;
  transform: translateX(-50%);
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

.back-arrow {
  width: 14px;
  height: 14px;
  border-bottom: 4px solid #333333;
  border-left: 4px solid #333333;
  transform: rotate(45deg);
}

.page-nav h1 {
  margin: 0 0 0 9px;
  font-size: 24px;
  font-weight: 500;
}

.page-scroll {
  display: grid;
  gap: 16px;
  height: calc(100% - 74px);
  padding: 24px 31px 32px;
  overflow-y: auto;
  scrollbar-width: none;
}

.page-scroll::-webkit-scrollbar {
  display: none;
}

.summary-card,
.report-card {
  padding: 18px;
  border: 1px solid rgba(255, 255, 255, 0.74);
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 15px 34px rgba(72, 104, 148, 0.075);
}

.summary-card {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.summary-item {
  display: grid;
  gap: 8px;
  padding: 14px 10px;
  border-radius: 18px;
  background: linear-gradient(180deg, #ffffff 0%, #f7f9fd 100%);
  text-align: center;
}

.summary-item span {
  color: #9aa2b1;
  font-size: 13px;
}

.summary-item strong {
  color: #30343f;
  font-size: 22px;
  font-weight: 700;
}

.report-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
}

.report-head h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}

.report-head p,
.report-head time {
  margin: 8px 0 0;
  color: #8e8f94;
  font-size: 14px;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 14px;
}

.tag-list span {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  background: #f3f6fb;
  color: #7f8998;
  font-size: 12px;
  font-weight: 500;
}

.report-note {
  margin: 14px 0 0;
  color: #5d6678;
  font-size: 14px;
  line-height: 1.6;
}

@media (min-width: 561px) {
  .detail-page {
    height: 844px;
    min-height: 844px;
  }
}

@media (max-width: 389px) {
  .summary-card {
    grid-template-columns: 1fr;
  }
}
</style>
