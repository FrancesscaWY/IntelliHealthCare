<script setup lang="ts">
import { computed, ref } from "vue";
import type { PageComponentProps } from "@ihc/page-core/types";
import mock, { type FootprintRecord } from "./mock";

const props = defineProps<PageComponentProps>();
const records = ref<FootprintRecord[]>([...mock.records]);

const hasRecords = computed(() => records.value.length > 0);

function goBack() {
  if (!props.navigation.navigateBack()) {
    props.navigation.reLaunch("home/dashboard");
  }
}

function clearAll() {
  if (!records.value.length) {
    return;
  }

  records.value = [];
  props.showToast("已清除全部足迹");
}

function openRecord(record: FootprintRecord) {
  props.showToast(`查看：${record.title}`);
}
</script>

<template>
  <section class="myfoot-page">
    <header class="page-header">
      <button class="back-btn" type="button" aria-label="返回" @click="goBack">
        <span class="back-arrow" aria-hidden="true"></span>
      </button>
      <h1>{{ mock.title }}</h1>
      <button class="clear-btn" type="button" :disabled="!hasRecords" @click="clearAll">
        {{ mock.clearLabel }}
      </button>
    </header>

    <main class="page-content">
      <ul v-if="hasRecords" class="footprint-list">
        <li v-for="record in records" :key="record.id" class="footprint-item">
          <button class="footprint-card" type="button" @click="openRecord(record)">
            <img class="cover" :src="record.image" :alt="record.title" />

            <div class="card-body">
              <h2>{{ record.title }}</h2>

              <template v-if="record.type === 'service'">
                <p class="price">{{ record.price }}</p>
              </template>

              <template v-else>
                <p class="meta">时间：{{ record.time }}</p>
                <p class="meta">地点：{{ record.location }}</p>
                <p class="meta">费用：{{ record.fee }}</p>
              </template>
            </div>
          </button>
        </li>
      </ul>

      <section v-else class="empty-state">
        <p>{{ mock.emptyText }}</p>
      </section>

      <p v-if="hasRecords" class="end-text">{{ mock.endText }}</p>
    </main>
  </section>
</template>

<style scoped>
.myfoot-page {
  position: relative;
  left: 50%;
  width: min(390px, 100vw);
  min-height: min(844px, calc(100vh - 36px));
  margin: -18px 0;
  background: #ffffff;
  color: #2f3137;
  font-family: var(--ihc-font-family);
  transform: translateX(-50%);
  -webkit-font-smoothing: antialiased;
}

.page-header {
  display: grid;
  grid-template-columns: 30px minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  padding: 24px 16px 18px 14px;
}

.page-header h1 {
  margin: 0;
  font-size: 20px;
  font-weight: 500;
  color: #36383d;
}

.back-btn,
.clear-btn,
.footprint-card {
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
}

.back-btn {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
}

.back-arrow {
  width: 12px;
  height: 12px;
  border-bottom: 2px solid #333333;
  border-left: 2px solid #333333;
  transform: rotate(45deg);
}

.clear-btn {
  min-width: 72px;
  font-size: 15px;
  color: #4a4d55;
}

.clear-btn:disabled {
  color: #c7cad1;
}

.page-content {
  padding: 0 14px 32px;
}

.footprint-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.footprint-item {
  border-bottom: 1px solid #f0f0f0;
}

.footprint-card {
  display: grid;
  grid-template-columns: 96px minmax(0, 1fr);
  gap: 14px;
  width: 100%;
  padding: 14px 0 16px;
  text-align: left;
}

.cover {
  width: 96px;
  height: 96px;
  border-radius: 18px;
  object-fit: cover;
  background: linear-gradient(180deg, #f3f5f9 0%, #eceef3 100%);
}

.card-body {
  min-width: 0;
  padding-top: 4px;
}

.card-body h2 {
  margin: 0;
  color: #3a3d43;
  font-size: 16px;
  font-weight: 600;
  line-height: 1.5;
}

.price {
  margin: 12px 0 0;
  color: #ff655b;
  font-size: 20px;
  font-weight: 500;
  line-height: 1;
}

.meta {
  margin: 8px 0 0;
  color: #9a9da5;
  font-size: 14px;
  line-height: 1.35;
}

.meta + .meta {
  margin-top: 4px;
}

.empty-state {
  display: grid;
  place-items: center;
  min-height: 320px;
  color: #b8bcc5;
  font-size: 15px;
}

.end-text {
  margin: 34px 0 0;
  text-align: center;
  color: #cdced3;
  font-size: 15px;
  font-weight: 500;
}

@media (max-width: 389px) {
  .page-header {
    padding-right: 12px;
    padding-left: 12px;
  }

  .page-content {
    padding-right: 12px;
    padding-left: 12px;
  }

  .footprint-card {
    grid-template-columns: 88px minmax(0, 1fr);
    gap: 12px;
  }

  .cover {
    width: 88px;
    height: 88px;
  }
}
</style>

