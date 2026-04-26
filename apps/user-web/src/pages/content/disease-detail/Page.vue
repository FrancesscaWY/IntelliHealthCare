<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import type { PageComponentProps } from "@ihc/page-core/types";
import { getDiseaseDetail } from "@/shared/api/content";
import mock from "./mock";
import { selectedDiseaseId } from "../disease-guide/state";

const props = defineProps<PageComponentProps>();

const diseaseName = ref(mock.diseaseName);
const summary = ref(mock.summary);
const tags = ref([...mock.tags]);
const quickFacts = ref([...mock.quickFacts]);
const sections = ref([...mock.sections]);
const departmentName = ref("");
const publishText = ref("");

const heroEyebrow = computed(() => departmentName.value || "疾病百科");

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日更新`;
}

function applyFallbackData() {
  diseaseName.value = mock.diseaseName;
  summary.value = mock.summary;
  tags.value = [...mock.tags];
  quickFacts.value = [...mock.quickFacts];
  sections.value = [...mock.sections];
  departmentName.value = mock.tags[0] || "";
  publishText.value = "";
}

async function loadDiseaseDetail() {
  const diseaseId = selectedDiseaseId.value.trim();

  if (!diseaseId) {
    applyFallbackData();
    return;
  }

  try {
    const detail = await getDiseaseDetail(diseaseId);

    diseaseName.value = detail.diseaseName || detail.title || mock.diseaseName;
    summary.value = detail.summary || mock.summary;
    tags.value = detail.tags?.length ? [...detail.tags] : [...mock.tags];
    quickFacts.value = detail.quickFacts?.length ? [...detail.quickFacts] : [...mock.quickFacts];
    sections.value = detail.sections?.length ? [...detail.sections] : [...mock.sections];
    departmentName.value = detail.department?.name || "";
    publishText.value = formatDate(detail.publishedAt);
  } catch {
    applyFallbackData();
    props.showToast("疾病详情加载失败，已显示本地示例");
  }
}

function goBack() {
  if (!props.navigation.navigateBack()) {
    props.navigation.reLaunch("content/disease-guide");
  }
}

function showUnavailableAction(label: string) {
  props.showToast(`${label}接口暂未提供`);
}

onMounted(() => {
  applyFallbackData();
  void loadDiseaseDetail();
});
</script>

<template>
  <section class="disease-detail-page">
    <header class="detail-nav">
      <button class="back-btn" type="button" aria-label="返回" @click="goBack">
        <span class="back-arrow" aria-hidden="true"></span>
      </button>
      <h1>{{ mock.navTitle }}</h1>
      <div class="detail-actions">
        <button type="button" aria-label="收藏" @click="showUnavailableAction('收藏')">
          <svg class="detail-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="m12 3.15 2.68 5.43 5.99.87-4.33 4.22 1.02 5.96L12 16.82l-5.36 2.81 1.02-5.96-4.33-4.22 5.99-.87L12 3.15Z" />
          </svg>
        </button>
        <button type="button" aria-label="分享" @click="showUnavailableAction('分享')">
          <svg class="detail-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M7 17 17 7" />
            <path d="M9 7h8v8" />
            <path d="M19 14v5H5V5h5" />
          </svg>
        </button>
      </div>
    </header>

    <main class="detail-scroll">
      <section class="disease-hero">
        <div>
          <span class="hero-eyebrow">{{ heroEyebrow }}</span>
          <h2>{{ diseaseName }}</h2>
          <p>{{ summary }}</p>
          <small v-if="publishText" class="publish-text">{{ publishText }}</small>
        </div>
        <span class="hero-mark" aria-hidden="true">
          <span></span>
        </span>
      </section>

      <div class="tag-row" aria-label="疾病标签">
        <span v-for="tag in tags" :key="tag">{{ tag }}</span>
      </div>

      <section class="quick-card" aria-label="疾病概览">
        <div v-for="item in quickFacts" :key="item.label">
          <span>{{ item.label }}</span>
          <strong>{{ item.value }}</strong>
        </div>
      </section>

      <article class="detail-content">
        <section v-for="section in sections" :key="section.title" class="detail-section">
          <h3>
            <span aria-hidden="true"></span>
            {{ section.title }}
          </h3>
          <p>{{ section.content }}</p>
        </section>
      </article>
    </main>
  </section>
</template>

<style scoped>
.disease-detail-page {
  position: relative;
  left: 50%;
  width: min(390px, 100vw);
  height: min(844px, calc(100vh - 36px));
  min-height: min(844px, calc(100vh - 36px));
  max-height: 844px;
  margin: -18px 0;
  overflow: hidden;
  background:
    radial-gradient(circle at 78% 11%, rgba(107, 224, 190, 0.2) 0, rgba(107, 224, 190, 0) 30%),
    linear-gradient(180deg, #eef8ff 0%, #f7fbfd 38%, #f5f7fa 100%);
  color: #333333;
  font-family: var(--ihc-font-family);
  transform: translateX(-50%);
  -webkit-font-smoothing: antialiased;
}

.detail-nav {
  display: grid;
  grid-template-columns: 32px 1fr auto;
  align-items: center;
  height: 73px;
  padding: 0 28px;
  background: rgba(255, 255, 255, 0.78);
  backdrop-filter: blur(12px);
}

.back-btn,
.detail-actions button {
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

.detail-nav h1 {
  margin: 0 0 0 10px;
  color: #30343d;
  font-size: 23px;
  font-weight: 500;
  letter-spacing: 0.04em;
}

.detail-actions {
  display: flex;
  align-items: center;
  gap: 23px;
}

.detail-actions button {
  display: grid;
  place-items: center;
  width: 30px;
  height: 38px;
  padding: 0;
}

.detail-icon {
  display: block;
  width: 25px;
  height: 25px;
  fill: none;
  stroke: #333333;
  stroke-width: 2.1;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.detail-scroll {
  height: calc(100% - 73px);
  padding: 22px 28px 46px;
  overflow-y: auto;
  scrollbar-width: none;
}

.detail-scroll::-webkit-scrollbar {
  display: none;
}

.disease-hero {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 74px;
  gap: 16px;
  min-height: 151px;
  padding: 23px 22px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.72);
  border-radius: 22px;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(236, 246, 255, 0.92) 52%, rgba(228, 255, 247, 0.86) 100%);
  box-shadow: 0 18px 42px rgba(72, 104, 148, 0.11);
}

.disease-hero::before {
  position: absolute;
  right: -32px;
  bottom: -36px;
  width: 128px;
  height: 128px;
  content: "";
  border-radius: 50%;
  background: rgba(102, 112, 240, 0.08);
}

.hero-eyebrow {
  display: inline-flex;
  align-items: center;
  height: 25px;
  padding: 0 12px;
  border-radius: 999px;
  background: rgba(102, 112, 240, 0.1);
  color: #6670f0;
  font-size: 13px;
  font-weight: 500;
}

.disease-hero h2 {
  margin: 0;
  color: #273242;
  font-size: 28px;
  font-weight: 600;
  line-height: 1.25;
  letter-spacing: 0.03em;
}

.disease-hero .hero-eyebrow + h2 {
  margin-top: 14px;
}

.disease-hero p {
  margin: 12px 0 0;
  color: #6f7b8c;
  font-size: 15px;
  line-height: 1.65;
}

.publish-text {
  display: block;
  margin-top: 12px;
  color: #8e97a5;
  font-size: 12px;
}

.hero-mark {
  position: relative;
  z-index: 1;
  align-self: center;
  display: grid;
  place-items: center;
  width: 70px;
  height: 70px;
  border-radius: 22px;
  background: linear-gradient(135deg, #6872f0 0%, #61d7bd 100%);
  box-shadow: 0 16px 24px rgba(102, 112, 240, 0.18);
}

.hero-mark::before,
.hero-mark::after,
.hero-mark span {
  position: absolute;
  content: "";
  border-radius: 999px;
  background: #ffffff;
}

.hero-mark::before {
  width: 34px;
  height: 6px;
}

.hero-mark::after {
  width: 6px;
  height: 34px;
}

.hero-mark span {
  right: 13px;
  bottom: 14px;
  width: 12px;
  height: 12px;
  opacity: 0.85;
}

.tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 16px;
}

.tag-row span {
  height: 28px;
  padding: 0 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.78);
  box-shadow: 0 8px 20px rgba(72, 104, 148, 0.055);
  color: #6670f0;
  font-size: 13px;
  line-height: 28px;
}

.quick-card {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1px;
  margin-top: 15px;
  overflow: hidden;
  border-radius: 18px;
  background: rgba(225, 230, 238, 0.7);
  box-shadow: 0 14px 32px rgba(72, 104, 148, 0.075);
}

.quick-card div {
  min-height: 70px;
  padding: 13px 8px;
  background: rgba(255, 255, 255, 0.88);
  text-align: center;
}

.quick-card span {
  display: block;
  color: #9aa3b1;
  font-size: 12px;
}

.quick-card strong {
  display: block;
  margin-top: 8px;
  color: #2f3848;
  font-size: 15px;
  font-weight: 600;
  white-space: nowrap;
}

.detail-content {
  display: grid;
  gap: 16px;
  margin-top: 18px;
}

.detail-section {
  padding: 22px 21px 24px;
  border: 1px solid rgba(255, 255, 255, 0.72);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 14px 34px rgba(72, 104, 148, 0.075);
}

.detail-section h3 {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0;
  color: #273242;
  font-size: 22px;
  font-weight: 600;
  letter-spacing: 0.04em;
}

.detail-section h3 span {
  width: 6px;
  height: 22px;
  border-radius: 999px;
  background: linear-gradient(180deg, #6872f0 0%, #58d7bb 100%);
}

.detail-section p {
  margin: 19px 0 0;
  color: #4c5564;
  font-size: 18px;
  font-weight: 400;
  line-height: 1.95;
  letter-spacing: 0.03em;
  text-align: justify;
}

@media (min-width: 561px) {
  .disease-detail-page {
    height: 844px;
    min-height: 844px;
  }
}

@media (max-width: 389px) {
  .detail-scroll {
    padding-right: 24px;
    padding-left: 24px;
  }

  .detail-section p {
    font-size: 17px;
  }
}
</style>
