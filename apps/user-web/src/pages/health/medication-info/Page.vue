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
    <header class="medication-nav">
      <button class="back-btn" type="button" aria-label="返回" @click="goBack">
        <span class="back-arrow" aria-hidden="true"></span>
      </button>
      <h1>{{ mock.title }}</h1>
    </header>

    <main class="medication-scroll">
      <article v-for="meal in mock.meals" :key="meal.key" class="meal-card">
        <header class="meal-header">
          <span class="meal-icon" aria-hidden="true">
            <svg viewBox="0 0 32 32" focusable="false">
              <g v-html="getMealIconMarkup(meal.key)"></g>
            </svg>
          </span>
          <h2>{{ meal.title }}</h2>
          <p>{{ meal.timeRange }}</p>
        </header>

        <section class="medicine-list">
          <button v-for="item in meal.medicines" :key="`${meal.key}-${item.name}-${item.time}`" class="medicine-row" type="button" @click="editMedication">
            <span class="medicine-name">
              <span aria-hidden="true"></span>
              {{ item.name }}
            </span>
            <span class="medicine-dose" :class="`medicine-dose--${item.tone}`">{{ item.dose }}</span>
            <span class="medicine-time">{{ item.time }}</span>
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
  font-family: var(--ihc-font-family);
  transform: translateX(-50%);
  -webkit-font-smoothing: antialiased;
}

.medication-nav {
  display: flex;
  align-items: center;
  height: 74px;
  padding: 0 29px;
}

.back-btn,
.add-btn {
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

.medication-nav h1 {
  margin: 0 0 0 9px;
  color: #30343f;
  font-size: 24px;
  font-weight: 500;
  letter-spacing: 0.03em;
}

.medication-scroll {
  height: calc(100% - 74px);
  padding: 20px 31px 104px;
  overflow-y: auto;
  scrollbar-width: none;
}

.medication-scroll::-webkit-scrollbar {
  display: none;
}

.meal-card {
  overflow: hidden;
  margin-top: 10px;
  border: 1px solid rgba(255, 255, 255, 0.74);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 10px 24px rgba(72, 104, 148, 0.06);
}

.meal-card:first-child {
  margin-top: 0;
}

.meal-header {
  display: grid;
  grid-template-columns: 32px auto minmax(0, 1fr);
  gap: 8px;
  height: 47px;
  padding: 0 20px;
  background: linear-gradient(90deg, rgba(247, 249, 255, 0.9) 0%, rgba(255, 255, 255, 0) 100%);
}

.meal-icon {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border: 1px solid rgba(255, 255, 255, 0.84);
  border-radius: 50%;
  background: linear-gradient(180deg, #ffffff 0%, #f4f8ff 100%);
  box-shadow: 0 8px 18px rgba(54, 67, 92, 0.06);
  transform: translateY(4px);
}

.meal-icon svg {
  display: block;
  width: 19px;
  height: 19px;
  fill: none;
  stroke: #30343f;
  stroke-width: 2.15;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.meal-header h2 {
  margin: 12px 0 0;
  color: #30343f;
  font-size: 17px;
  font-weight: 600;
  letter-spacing: 0.03em;
  white-space: nowrap;
}

.meal-header p {
  margin: 14px 0 0;
  color: #b7b7bb;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
}

.medicine-list {
  padding: 0 20px 4px;
}

.medicine-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 48px 42px;
  align-items: center;
  width: 100%;
  height: 37px;
  padding: 0;
  border-top: 1px solid #eeeeee;
  border-right: 0;
  border-bottom: 0;
  border-left: 0;
  background: transparent;
  text-align: left;
}

.medicine-name {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #30343f;
  font-size: 15px;
  font-weight: 500;
}

.medicine-name span {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #c8d1df;
}

.medicine-dose {
  justify-self: end;
  min-width: 46px;
  height: 22px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  line-height: 22px;
  text-align: center;
}

.medicine-dose--green {
  background: #d7f5eb;
  color: #31c79b;
}

.medicine-dose--red {
  background: #fff0f0;
  color: #f06969;
}

.medicine-dose--blue {
  background: #f0f0ff;
  color: #6872f0;
}

.medicine-time {
  justify-self: end;
  color: #8e8f94;
  font-size: 14px;
  font-weight: 400;
}

.no-more {
  margin: 49px 0 0;
  color: #c9c9c9;
  font-size: 17px;
  font-weight: 500;
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
  height: 54px;
  border-radius: 11px;
  background: #6670f0;
  box-shadow: 0 14px 28px rgba(102, 112, 240, 0.18);
  color: #ffffff;
  font-size: 19px;
  font-weight: 500;
  letter-spacing: 0.04em;
}

@media (min-width: 561px) {
  .medication-page {
    height: 844px;
    min-height: 844px;
  }
}

@media (max-width: 389px) {
  .medication-scroll {
    padding-right: 26px;
    padding-left: 26px;
  }

  .meal-header {
    padding-right: 26px;
    padding-left: 26px;
  }

  .medicine-list {
    padding-right: 26px;
    padding-left: 26px;
  }
}
</style>
