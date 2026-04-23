<script setup lang="ts">
import type { PageComponentProps } from "@ihc/page-core/types";
import mock from "./mock";

const props = defineProps<PageComponentProps>();

const mealIconMarkup: Record<string, string> = {
  breakfast: `
    <path d="M9 10h14v6a7 7 0 0 1-7 7 7 7 0 0 1-7-7v-6Z" />
    <path d="M23 12h3.3a3 3 0 0 1 0 6H23" />
    <path d="M7 26h18" />
  `,
  lunch: `
    <path d="M7 13h18v2a9 9 0 0 1-9 9 9 9 0 0 1-9-9v-2Z" />
    <path d="M9 26h14" />
    <path d="M10 7v3" />
    <path d="M16 6v4" />
    <path d="M22 7v3" />
  `,
  dinner: `
    <path d="M9 6v20" />
    <path d="M5 6v7a4 4 0 0 0 8 0V6" />
    <path d="M21 6v20" />
    <path d="M21 6c4 2.6 4 8.4 0 11" />
  `,
};

function goBack() {
  if (!props.navigation.navigateBack()) {
    props.navigation.reLaunch("home/dashboard");
  }
}

function getMealIconMarkup(key: string) {
  return mealIconMarkup[key] || mealIconMarkup.breakfast;
}

function addMedication() {
  props.navigation.navigateTo("health/medication-add");
}

function editMedication() {
  props.navigation.navigateTo("health/medication-edit");
}
</script>

<template>
  <section class="medication-page">
    <header class="page-header">
      <button class="back-button" type="button" aria-label="返回" @click="goBack">‹</button>
      <h1>{{ mock.title }}</h1>
      <span></span>
    </header>

    <main class="medication-scroll">
      <section class="overview-card">
        <small>{{ mock.overview.eyebrow }}</small>
        <h2>{{ mock.overview.title }}</h2>
        <div class="overview-metrics">
          <article>
            <span>今日总计</span>
            <strong>{{ mock.overview.total }}</strong>
          </article>
          <article>
            <span>下一次</span>
            <strong>{{ mock.overview.next }}</strong>
          </article>
          <article>
            <span>已完成</span>
            <strong>{{ mock.overview.completed }}</strong>
          </article>
        </div>
      </section>

      <article v-for="meal in mock.meals" :key="meal.key" class="meal-card">
        <header class="meal-header">
          <span class="meal-icon" aria-hidden="true">
            <svg viewBox="0 0 32 32" focusable="false">
              <g v-html="getMealIconMarkup(meal.key)"></g>
            </svg>
          </span>
          <div class="meal-copy">
            <small>{{ meal.timeRange }}</small>
            <h2>{{ meal.title }}</h2>
          </div>
        </header>

        <section class="medicine-list">
          <button
            v-for="item in meal.medicines"
            :key="`${meal.key}-${item.name}-${item.time}`"
            class="medicine-row"
            type="button"
            @click="editMedication"
          >
            <span class="medicine-name">
              <i aria-hidden="true"></i>
              <span>
                <strong>{{ item.name }}</strong>
                <small>{{ item.time }}</small>
              </span>
            </span>
            <span class="medicine-dose" :class="`medicine-dose--${item.tone}`">{{ item.dose }}</span>
          </button>
        </section>
      </article>

      <p class="no-more">没有更多了</p>
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
  height: min(874px, calc(100vh - 36px));
  min-height: min(874px, calc(100vh - 36px));
  max-height: 874px;
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

.meal-card {
  margin-top: 14px;
  padding: 18px;
  border: 1px solid rgba(255, 255, 255, 0.68);
  border-radius: 15px;
  background: rgba(255, 255, 255, 0.86);
  box-shadow: 0 16px 34px rgba(82, 105, 148, 0.08);
}

.meal-card:first-child {
  margin-top: 0;
}

.meal-header {
  display: grid;
  grid-template-columns: 72px 1fr;
  gap: 14px;
  align-items: center;
}

.meal-icon {
  display: grid;
  place-items: center;
  width: 72px;
  height: 72px;
  border-radius: 15px;
  background: rgba(105, 213, 209, 0.12);
}

.meal-icon svg {
  display: block;
  width: 30px;
  height: 30px;
  fill: none;
  stroke: #48bfa3;
  stroke-width: 2.15;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.meal-copy {
  min-width: 0;
}

.meal-copy small {
  color: #66cfa7;
  font-size: 12px;
  font-weight: 900;
}

.meal-copy h2 {
  margin: 6px 0 0;
  color: #222733;
  font-size: 20px;
  font-weight: 900;
  line-height: 1.35;
}

.medicine-list {
  display: grid;
  gap: 10px;
  margin-top: 18px;
}

.medicine-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  width: 100%;
  min-height: 68px;
  padding: 0 16px;
  border: 1px solid rgba(255, 255, 255, 0.72);
  border-radius: 15px;
  background: rgba(255, 255, 255, 0.74);
  text-align: left;
}

.medicine-name {
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr);
  align-items: center;
  gap: 10px;
}

.medicine-name i {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: linear-gradient(100deg, #75d6df 0%, #7be28e 100%);
}

.medicine-name span {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.medicine-name strong {
  overflow: hidden;
  color: #222733;
  font-size: 16px;
  font-weight: 900;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.medicine-name small {
  color: #8f95a2;
  font-size: 12px;
  font-weight: 800;
}

.medicine-dose {
  min-width: 52px;
  height: 26px;
  padding: 0 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 900;
  line-height: 26px;
  text-align: center;
}

.medicine-dose--green {
  background: rgba(102, 207, 167, 0.14);
  color: #39a980;
}

.medicine-dose--red {
  background: #fff0f0;
  color: #f06969;
}

.medicine-dose--blue {
  background: rgba(105, 213, 209, 0.14);
  color: #48bfa3;
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
    height: 874px;
    min-height: 874px;
  }
}

@media (max-width: 389px) {
  .medication-scroll {
    padding-bottom: 110px;
  }

  .overview-metrics {
    grid-template-columns: 1fr;
  }

  .meal-header {
    grid-template-columns: 62px 1fr;
  }

  .meal-icon {
    width: 62px;
    height: 62px;
  }
}
</style>
