<script setup lang="ts">
import { onMounted, ref, computed, watch } from "vue";
import type { PageComponentProps } from "@ihc/page-core/types";
import { getHealthMedications } from "@/shared/api/health";
import type { MedicationItem } from "@/shared/api/health";
import { setSelectedMedication } from "@/shared/health/medication-selection";
import mock from "./mock";

const props = defineProps<PageComponentProps>();
const isLoading = ref(true);
const loadError = ref<string | null>(null);
const medications = ref<MedicationItem[]>([]);

const overview = computed(() => {
  const total = medications.value.length;
  const takenCount = medications.value.filter((m) =>
    m.logs.some((log) => log.status === "TAKEN")
  ).length;
  const nextTime = medications.value
    .flatMap((m) => m.scheduleTimes)
    .sort()
    .find(() => true);

  return {
    total: `${total}次`,
    next: nextTime ?? "-",
    completed: `${takenCount}/${total}`,
  };
});

let lastStackLength = 0;

function goBack() {
  if (!props.navigation.navigateBack()) {
    props.navigation.reLaunch("home/dashboard");
  }
}

function addMedication() {
  props.navigation.navigateTo("health/medication-add");
}

function editMedication(medication: MedicationItem) {
  setSelectedMedication(medication);
  props.navigation.navigateTo("health/medication-edit");
}

function getDoseTone(dosage: string): string {
  const match = dosage.match(/(\d+)/);
  if (!match) return "green";
  const num = parseInt(match[1], 10);
  if (num >= 3) return "red";
  if (num >= 2) return "blue";
  return "green";
}

function getStatusLabel(logs: MedicationItem["logs"]): string {
  if (logs.some((log) => log.status === "TAKEN")) return "已服用";
  if (logs.some((log) => log.status === "SKIPPED")) return "已跳过";
  return "待服用";
}

async function loadMedications() {
  try {
    isLoading.value = true;
    loadError.value = null;
    const data = await getHealthMedications();
    medications.value = data ?? [];
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : "加载用药信息失败";
    // 回退到 mock 数据
    medications.value = mock.meals.flatMap((meal) =>
      meal.medicines.map((med) => ({
        medicationId: `${meal.key}-${med.name}`,
        name: med.name,
        dosage: med.dose,
        frequency: "每日",
        mealTiming: meal.title,
        route: null,
        indication: null,
        scheduleTimes: [med.time],
        startDate: "",
        endDate: null,
        active: true,
        logs: [],
      }))
    );
  } finally {
    isLoading.value = false;
  }
}

onMounted(() => {
  lastStackLength = props.navigation.getStack().length;
  loadMedications();
});

// 监听导航栈变化：当从其他页面返回此页面时重新加载数据
watch(
  () => props.navigation.getStack().length,
  (newLength) => {
    if (newLength < lastStackLength) {
      loadMedications();
    }
    lastStackLength = newLength;
  }
);
</script>

<template>
  <section class="medication-page">
    <header class="page-header">
      <button class="back-button" type="button" aria-label="返回" @click="goBack">‹</button>
      <h1>{{ mock.title }}</h1>
      <span></span>
    </header>

    <main class="medication-scroll">
      <template v-if="isLoading">
        <div class="loading-state">加载中...</div>
      </template>

      <template v-else-if="loadError && !medications.length">
        <div class="error-state">{{ loadError }}</div>
      </template>

      <template v-else>
        <section class="overview-card">
          <small>{{ mock.overview.eyebrow }}</small>
          <h2>{{ mock.overview.title }}</h2>
          <div class="overview-metrics">
            <article>
              <span>今日总计</span>
              <strong>{{ overview.total }}</strong>
            </article>
            <article>
              <span>下一次</span>
              <strong>{{ overview.next }}</strong>
            </article>
            <article>
              <span>已完成</span>
              <strong>{{ overview.completed }}</strong>
            </article>
          </div>
        </section>

        <article v-for="item in medications" :key="item.medicationId" class="medication-card">
          <header class="medication-header">
            <div class="medication-info">
              <h3>{{ item.name }}</h3>
              <p class="medication-meta">
                <span v-if="item.mealTiming">{{ item.mealTiming }}</span>
                <span v-if="item.dosage">{{ item.dosage }}</span>
                <span>{{ item.frequency }}</span>
              </p>
            </div>
            <span class="medication-status" :class="{ 'status-taken': getStatusLabel(item.logs) === '已服用' }">
              {{ getStatusLabel(item.logs) }}
            </span>
          </header>

          <section class="schedule-list">
            <button
              v-for="time in item.scheduleTimes"
              :key="time"
              class="schedule-chip"
              type="button"
              @click="editMedication(item)"
            >
              {{ time }}
            </button>
          </section>
        </article>

        <p v-if="!medications.length" class="no-more">暂无用药信息</p>
        <p v-else class="no-more">没有更多了</p>
      </template>
    </main>

    <footer class="add-area">
      <button class="add-btn" type="button" @click="addMedication">+ 添加用药信息</button>
    </footer>
  </section>
</template>

<style scoped>
.medication-page {
  position: relative;
  left: 50%;
  width: min(402px, 100vw);
  height: auto;
  min-height: var(--ihc-page-min-height);
  max-height: none;
  margin: -18px 0;
  padding: 16px 18px 28px;
  box-sizing: border-box;
  overflow: hidden;
  background: #f5f6f7;
  color: #252939;
  font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif;
  transform: translateX(-50%);
  -webkit-font-smoothing: antialiased;
}

button {
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
}

.page-header {
  height: 52px;
  display: grid;
  grid-template-columns: 34px 1fr 34px;
  align-items: center;
}

.back-button {
  width: 32px;
  height: 38px;
  padding: 0;
  color: #252939;
  font-size: 38px;
  font-weight: 300;
  line-height: 30px;
}

.page-header h1 {
  margin: 0;
  overflow: hidden;
  color: #222733;
  font-size: 20px;
  font-weight: 900;
  letter-spacing: 0;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.medication-scroll {
  height: calc(100% - 52px);
  padding: 16px 0 104px;
  overflow-y: auto;
  scrollbar-width: none;
}

.medication-scroll::-webkit-scrollbar {
  display: none;
}

.loading-state,
.error-state {
  display: grid;
  place-items: center;
  min-height: 180px;
  border-radius: 15px;
  background: rgba(255, 255, 255, 0.86);
  color: #8f95a2;
  font-size: 14px;
  font-weight: 800;
}

.overview-card {
  padding: 22px;
  margin-bottom: 16px;
  border: 1px solid rgba(255, 255, 255, 0.68);
  border-radius: 15px;
  background: rgba(255, 255, 255, 0.86);
  box-shadow: 0 16px 34px rgba(82, 105, 148, 0.08);
}

.overview-card small {
  color: #66cfa7;
  font-size: 12px;
  font-weight: 900;
}

.overview-card h2 {
  margin: 10px 0 18px;
  color: #222733;
  font-size: 21px;
  font-weight: 900;
  line-height: 1.45;
}

.overview-metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.overview-metrics article {
  padding: 12px;
  border: 1px solid rgba(255, 255, 255, 0.72);
  border-radius: 15px;
  background: rgba(255, 255, 255, 0.74);
}

.overview-metrics span {
  display: block;
  color: #8f95a2;
  font-size: 12px;
  font-weight: 800;
}

.overview-metrics strong {
  display: block;
  margin-top: 8px;
  color: #222733;
  font-size: 18px;
  font-weight: 900;
}

.medication-card {
  margin-top: 14px;
  padding: 18px;
  border: 1px solid rgba(255, 255, 255, 0.68);
  border-radius: 15px;
  background: rgba(255, 255, 255, 0.86);
  box-shadow: 0 16px 34px rgba(82, 105, 148, 0.08);
}

.medication-card:first-child {
  margin-top: 0;
}

.medication-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.medication-info {
  min-width: 0;
}

.medication-info h3 {
  margin: 0;
  color: #222733;
  font-size: 18px;
  font-weight: 900;
  line-height: 1.35;
}

.medication-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 6px 0 0;
  color: #8f95a2;
  font-size: 13px;
  font-weight: 800;
}

.medication-meta span + span::before {
  content: "·";
  margin-right: 8px;
}

.medication-status {
  flex-shrink: 0;
  padding: 4px 12px;
  border-radius: 999px;
  background: #fff3e0;
  color: #e6a23c;
  font-size: 12px;
  font-weight: 900;
  white-space: nowrap;
}

.medication-status.status-taken {
  background: #e8f8f0;
  color: #39a980;
}

.schedule-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 14px;
}

.schedule-chip {
  min-width: 62px;
  height: 32px;
  padding: 0 14px;
  border: 1px solid #e1e1e1;
  border-radius: 7px;
  background: #f0f0f0;
  color: #606060;
  font-size: 15px;
  font-weight: 500;
  line-height: 32px;
  text-align: center;
}

.no-more {
  margin: 28px 0 0;
  color: #8f95a2;
  font-size: 12px;
  font-weight: 800;
  text-align: center;
}

.add-area {
  position: absolute;
  right: 54px;
  bottom: 28px;
  left: 54px;
}

.add-btn {
  width: 100%;
  height: 50px;
  border-radius: 999px;
  background: linear-gradient(100deg, #75d6df 0%, #7be28e 100%);
  box-shadow: 0 15px 25px rgba(89, 200, 162, 0.26);
  color: #ffffff;
  font-size: 16px;
  font-weight: 900;
}

@media (min-width: 561px) {
  .medication-page {
    height: auto;
    min-height: var(--ihc-page-min-height);
  }
}

@media (max-width: 389px) {
  .medication-scroll {
    padding-bottom: 110px;
  }

  .overview-metrics {
    grid-template-columns: 1fr;
  }
}
</style>
