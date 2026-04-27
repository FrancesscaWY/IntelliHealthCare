<script setup lang="ts">
import { computed, ref } from "vue";
import type { PageComponentProps } from "@ihc/page-core/types";
import mock, { type FootprintRecord } from "./mock";
import { selectedSeniorActivityId } from "@/pages/community/senior-activities/state";

const props = defineProps<PageComponentProps>();

const records = ref<FootprintRecord[]>([...mock.records]);
const sortMode = ref<"latest" | "earliest">("latest");

const hasRecords = computed(() => records.value.length > 0);
const sortLabel = computed(() => (sortMode.value === "latest" ? "最新优先" : "最早优先"));
const sortedRecords = computed(() =>
  [...records.value].sort((left, right) => {
    const leftTime = new Date(left.viewedAt).getTime();
    const rightTime = new Date(right.viewedAt).getTime();

    return sortMode.value === "latest" ? rightTime - leftTime : leftTime - rightTime;
  }),
);

function goBack() {
  props.navigation.reLaunch("home/mine");
}

function clearAll() {
  if (!records.value.length) {
    return;
  }

  records.value = [];
  props.showToast("已清除全部足迹");
}

function toggleSortMode() {
  sortMode.value = sortMode.value === "latest" ? "earliest" : "latest";
}

function openRecord(record: FootprintRecord) {
  if (record.type === "activity") {
    selectedSeniorActivityId.value = record.activityId;
  }

  props.navigation.navigateTo(record.pageId);
}

function getTimelineDate(record: FootprintRecord) {
  const viewedAt = new Date(record.viewedAt);
  const month = `${viewedAt.getMonth() + 1}`.padStart(2, "0");
  const day = `${viewedAt.getDate()}`.padStart(2, "0");

  return `${month}-${day}`;
}

function getRecordHint(record: FootprintRecord) {
  return sortMode.value === "latest" ? "最近浏览" : "较早记录";
}
</script>

<template>
  <section class="myfoot-page">
    <header class="hero-panel">
      <div class="hero-nav">
        <button class="back-btn" type="button" aria-label="返回我的页面" @click="goBack">
          <span class="back-arrow" aria-hidden="true"></span>
        </button>
        <div class="hero-copy">
          <h1>{{ mock.title }}</h1>
        </div>
      </div>
    </header>

    <main class="timeline-shell">
      <div class="timeline-header">
        <button class="clear-btn" type="button" :disabled="!hasRecords" @click="clearAll">
          {{ mock.clearLabel }}
        </button>
        <button class="sort-pill" type="button" @click="toggleSortMode">
          <span>{{ sortLabel }}</span>
          <i class="sort-arrow" :class="{ 'sort-arrow--reverse': sortMode === 'earliest' }" aria-hidden="true"></i>
        </button>
      </div>

      <section v-if="hasRecords" class="timeline-list">
        <article v-for="record in sortedRecords" :key="record.id" class="timeline-row">
          <div class="timeline-rail">
            <span class="timeline-dot"></span>
            <span class="timeline-time">{{ getTimelineDate(record) }}</span>
          </div>

          <button class="footprint-card" type="button" @click="openRecord(record)">
            <div class="card-body">
              <div class="card-image-wrap">
                <img class="cover" :src="record.image" :alt="record.title" />
              </div>

              <div class="card-copy">
                <h3>{{ record.title }}</h3>

                <template v-if="record.type === 'service'">
                  <p class="price">{{ record.price }}</p>
                </template>

                <template v-else>
                  <p class="meta">时间：{{ record.time }}</p>
                  <p class="meta">地点：{{ record.location }}</p>
                  <p class="meta">费用：{{ record.fee }}</p>
                </template>
              </div>
            </div>
          </button>
        </article>

        <p class="end-text">{{ mock.endText }}</p>
      </section>

      <section v-else class="empty-state">
        <div class="empty-blob"></div>
        <p>{{ mock.emptyText }}</p>
      </section>
    </main>
  </section>
</template>

<style scoped>
.myfoot-page {
  position: relative;
  left: 50%;
  width: min(390px, 100vw);
  min-height: var(--ihc-page-min-height);
  margin: -18px 0;
  background: #f5f6f7;
  color: #2b3128;
  font-family: "HarmonyOS Sans SC", "MiSans", var(--ihc-font-family);
  transform: translateX(-50%);
  -webkit-font-smoothing: antialiased;
}

.hero-panel {
  padding: 16px 16px 14px;
  color: #2f352b;
  background: #f5f6f7;
  border-bottom: 1px solid #eaedf1;
}

.hero-nav {
  display: grid;
  grid-template-columns: 32px minmax(0, 1fr);
  align-items: center;
  gap: 10px;
}

.back-btn,
.clear-btn,
.day-chip,
.sort-pill,
.footprint-card {
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
}

.back-btn {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: 16px;
  border: 1px solid #e7eadf;
  background: #ffffff;
}

.back-arrow {
  width: 10px;
  height: 10px;
  border-bottom: 2px solid #4c5447;
  border-left: 2px solid #4c5447;
  transform: rotate(45deg);
}

.hero-copy h1 {
  margin: 0;
  font-size: 19px;
  font-weight: 700;
  letter-spacing: 0;
}

.clear-btn {
  min-width: 64px;
  height: 30px;
  padding: 0 10px;
  border-radius: 15px;
  background: #ffffff;
  color: #8a9188;
  font-size: 12px;
  font-weight: 600;
  box-shadow: inset 0 0 0 1px #ebeef1;
}

.clear-btn:disabled {
  opacity: 0.45;
}

.timeline-shell {
  min-height: calc(100% - 78px);
  background: #f5f6f7;
  padding: 14px 14px 30px;
}

.timeline-header {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  margin-bottom: 14px;
  padding: 0 2px;
}

.sort-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 30px;
  padding: 0 12px;
  border-radius: 999px;
  background: #ffffff;
  color: #8a9188;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
  box-shadow: inset 0 0 0 1px #ebeef1;
}

.sort-arrow {
  width: 8px;
  height: 8px;
  border-right: 2px solid currentColor;
  border-bottom: 2px solid currentColor;
  transform: rotate(45deg);
  transition: transform 0.18s ease;
}

.sort-arrow--reverse {
  transform: rotate(-135deg);
}

.timeline-list {
  position: relative;
}

.timeline-list::before {
  position: absolute;
  top: 4px;
  bottom: 78px;
  left: 16px;
  width: 2px;
  content: "";
  background: repeating-linear-gradient(
    to bottom,
    rgba(177, 185, 162, 0.86) 0 6px,
    rgba(177, 185, 162, 0) 6px 12px
  );
}

.timeline-row {
  position: relative;
  display: grid;
  grid-template-columns: 54px minmax(0, 1fr);
  gap: 10px;
  align-items: start;
  margin-bottom: 16px;
}

.timeline-rail {
  position: relative;
  padding-top: 8px;
}

.timeline-dot {
  position: absolute;
  top: 10px;
  left: 9px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #d3d8df;
  box-shadow: 0 0 0 4px #f5f6f7;
}

.timeline-time {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 50px;
  height: 24px;
  margin-top: 44px;
  border-radius: 999px;
  background: #2f3d2f;
  color: #ffffff;
  font-size: 11px;
  font-weight: 700;
}

.footprint-card {
  width: 100%;
  padding: 10px;
  border-radius: 24px;
  background: #ffffff;
  box-shadow:
    0 8px 20px rgba(64, 77, 97, 0.05),
    inset 0 0 0 1px #eceff3;
  text-align: left;
}

.card-body {
  display: grid;
  grid-template-columns: 88px minmax(0, 1fr);
  gap: 12px;
  align-items: center;
}

.card-image-wrap {
  position: relative;
}

.card-image-wrap::before {
  position: absolute;
  inset: -4px;
  content: "";
  border-radius: 22px;
  background: linear-gradient(180deg, rgba(236, 239, 243, 0.9), rgba(236, 239, 243, 0));
}

.cover {
  position: relative;
  z-index: 1;
  display: block;
  width: 88px;
  height: 88px;
  border-radius: 18px;
  object-fit: cover;
  box-shadow: 0 8px 18px rgba(76, 89, 109, 0.08);
}

.card-copy {
  min-width: 0;
}

.price,
.meta {
  color: #8f9881;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.45;
}

.card-copy h3 {
  margin: 0;
  color: #2f352b;
  font-size: 16px;
  font-weight: 800;
  line-height: 1.45;
}

.price {
  margin: 10px 0 0;
}

.meta {
  margin: 8px 0 0;
}

.empty-state {
  display: grid;
  justify-items: center;
  gap: 14px;
  min-height: 340px;
  padding-top: 70px;
  color: #a7b28f;
}

.empty-blob {
  width: 92px;
  height: 92px;
  border-radius: 34px;
  background:
    radial-gradient(circle at 36% 30%, rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0) 34%),
    linear-gradient(145deg, #d6ec99, #a0cf27);
  box-shadow: 0 20px 40px rgba(110, 140, 29, 0.16);
}

.end-text {
  margin: 30px 0 0;
  text-align: center;
  color: #bcc2af;
  font-size: 14px;
  font-weight: 700;
}

@media (max-width: 389px) {
  .hero-nav {
    grid-template-columns: 38px minmax(0, 1fr);
  }

  .clear-btn {
    grid-column: 1 / -1;
    justify-self: end;
    margin-top: -2px;
  }

  .timeline-row {
    grid-template-columns: 46px minmax(0, 1fr);
    gap: 8px;
  }

  .timeline-list::before {
    left: 12px;
  }

  .timeline-dot {
    left: 5px;
  }

  .timeline-time {
    min-width: 42px;
    font-size: 11px;
  }

  .card-body {
    grid-template-columns: 78px minmax(0, 1fr);
  }

  .cover {
    width: 78px;
    height: 78px;
  }
}
</style>
