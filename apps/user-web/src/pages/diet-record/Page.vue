<script setup lang="ts">
import { computed, onActivated, onMounted, ref } from "vue";
import type { PageComponentProps } from "@ihc/page-core/types";
import { type DietFoodThumb, type DietMealKey, type DietRecordDay } from "./mock";
import { getDietRecordDays } from "./state";

const props = defineProps<PageComponentProps>();

const ACTIVE_DAY_KEY = "ihc:diet-record:active-day";
const DRAFT_KEY = "ihc:diet-record:add-draft";
const RETURN_PATH_KEY = "ihc:diet-record:return-path";

function readStoredActiveDayId() {
  if (typeof window === "undefined") {
    return "";
  }

  return window.sessionStorage.getItem(ACTIVE_DAY_KEY) || "";
}

function clearStoredActiveDayId() {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(ACTIVE_DAY_KEY);
}

const days = ref<DietRecordDay[]>(getDietRecordDays());
const activeDayId = ref(readStoredActiveDayId() || days.value[0]?.id || "");
const activeMealFilter = ref<"all" | DietMealKey>("all");
const showDatePicker = ref(false);

const filterOptions: Array<{ key: "all" | DietMealKey; label: string }> = [
  { key: "all", label: "全部" },
  { key: "breakfast", label: "早餐" },
  { key: "lunch", label: "午餐" },
  { key: "snack", label: "加餐" },
  { key: "dinner", label: "晚餐" },
];

const mealIconMarkup: Record<DietMealKey, string> = {
  breakfast: `
    <path d="M7 8h8v6.5A4.5 4.5 0 0 1 10.5 19 4.5 4.5 0 0 1 6 14.5V9a1 1 0 0 1 1-1Z" />
    <path d="M15 10h1.8a2.2 2.2 0 0 1 0 4.4H15" fill="none" />
    <path d="M5 21h12" />
  `,
  lunch: `
    <path d="M5 10.5h14v1.2a7 7 0 0 1-7 7 7 7 0 0 1-7-7v-1.2Z" />
    <path d="M7 20h10" />
    <path d="M9 7.2v1.8" />
    <path d="M12 6.6v2.4" />
    <path d="M15 7.2v1.8" />
  `,
  snack: `
    <path d="M6.6 11.5h10.8l-1.1 7.6a2 2 0 0 1-2 1.7H9.7a2 2 0 0 1-2-1.7l-1.1-7.6Z" />
    <path d="M9 11.5c0-2 1.5-3.6 3.3-3.6 1.8 0 3.3 1.6 3.3 3.6" fill="none" />
    <path d="M8.4 15h7.2" />
  `,
  dinner: `
    <path d="M7 6v8" />
    <path d="M5 6v4a2 2 0 0 0 4 0V6" />
    <path d="M14.5 6v15" />
    <path d="M14.5 6c2.7 1.4 2.7 4.8 0 6.2" fill="none" />
  `,
};

const activeDay = computed(() => days.value.find((item) => item.id === activeDayId.value) || days.value[0]);
const filteredMeals = computed(() => {
  if (!activeDay.value) {
    return [];
  }

  if (activeMealFilter.value === "all") {
    return activeDay.value.meals;
  }

  return activeDay.value.meals.filter((meal) => meal.key === activeMealFilter.value);
});

const recordTitle = computed(() => {
  const activeFilter = filterOptions.find((item) => item.key === activeMealFilter.value)?.label || "全部";
  if (activeFilter === "全部") {
    return `今日记录 (${filteredMeals.value.length})`;
  }

  return `${activeFilter}记录 (${filteredMeals.value.length})`;
});

function syncDietDays() {
  const nextDays = getDietRecordDays();
  const storedDayId = readStoredActiveDayId();

  days.value = nextDays;

  if (storedDayId && nextDays.some((item) => item.id === storedDayId)) {
    activeDayId.value = storedDayId;
  } else if (!nextDays.some((item) => item.id === activeDayId.value)) {
    activeDayId.value = nextDays[0]?.id || "";
  }

  clearStoredActiveDayId();
}

onMounted(syncDietDays);
onActivated(syncDietDays);

function goBack() {
  if (!props.navigation.navigateBack()) {
    props.navigation.reLaunch("home/dashboard");
  }
}

function selectMealFilter(filterKey: "all" | DietMealKey) {
  activeMealFilter.value = filterKey;
}

function openHistoryData() {
  props.navigation.navigateTo("diet-record/history-data");
}

function closeDatePicker() {
  showDatePicker.value = false;
}

function selectDay(dayId: string) {
  activeDayId.value = dayId;
  closeDatePicker();
}

function handleAddRecord(meal: { key: DietMealKey; label: string }) {
  if (typeof window !== "undefined") {
    window.sessionStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({
        date: activeDay.value?.id || new Date().toISOString().slice(0, 10),
        mealKey: meal.key,
      }),
    );
    window.sessionStorage.setItem(RETURN_PATH_KEY, "diet-record");
  }

  props.navigation.navigateTo("diet-record/add-record");
}

function openFoodItem(foodName: string) {
  props.showToast(`${foodName}详情待接入`);
}

function getMealIconMarkup(key: DietMealKey) {
  return mealIconMarkup[key] || mealIconMarkup.breakfast;
}

function getFoodThumbLabel(thumb: DietFoodThumb) {
  const labelMap: Record<DietFoodThumb, string> = {
    bread: "麦",
    milk: "奶",
    oat: "燕",
    egg: "蛋",
    fish: "鱼",
    salad: "菜",
    fruit: "果",
    porridge: "粥",
  };

  return labelMap[thumb];
}
</script>

<template>
  <section class="diet-record-page">
    <header class="hero-panel">
      <div class="hero-toolbar">
        <button class="icon-btn back-btn" type="button" aria-label="返回" @click="goBack">
          <span class="back-arrow" aria-hidden="true"></span>
        </button>

        <button class="date-chip" type="button" @click="openHistoryData">
          {{ activeDay?.titleDate }}
        </button>

        <button class="icon-btn calendar-btn" type="button" aria-label="历史数据" @click="openHistoryData">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <rect x="4" y="6" width="16" height="14" rx="2"></rect>
            <path d="M8 4v4"></path>
            <path d="M16 4v4"></path>
            <path d="M4 10h16"></path>
            <path d="M8 14h3"></path>
            <path d="M13 14h3"></path>
          </svg>
        </button>
      </div>

      <div class="hero-copy">
        <span class="hero-caption">每日营养追踪</span>
        <h1>饮食记录</h1>
        <p>记录三餐与加餐，查看每日能量和营养摄入。</p>
      </div>

      <nav class="filter-tabs" aria-label="餐次筛选">
        <button
          v-for="item in filterOptions"
          :key="item.key"
          type="button"
          class="filter-tab"
          :class="{ 'filter-tab--active': activeMealFilter === item.key }"
          @click="selectMealFilter(item.key)"
        >
          {{ item.label }}
        </button>
      </nav>
      <section v-if="activeDay" class="summary-card">
        <div class="summary-total">
          <strong>{{ activeDay.totalCalories }}</strong>
          <span>热量（千卡）</span>
        </div>
        <span class="summary-divider" aria-hidden="true"></span>
        <div class="macro-list">
          <div v-for="macro in activeDay.macros" :key="macro.key" class="macro-item">
            <span class="macro-dot" :style="{ background: macro.color }"></span>
            <span class="macro-label">{{ macro.label }}</span>
            <strong>{{ macro.value }}</strong>
          </div>
        </div>
      </section>

    </header>

    <main class="page-content">
      <section class="record-section">
        <header class="section-header">
          <h2>{{ recordTitle }}</h2>
          <button class="section-more" type="button" @click="openHistoryData">
            <span></span>
            <span></span>
            <span></span>
          </button>
        </header>

        <div class="meal-list">
          <article
            v-for="meal in filteredMeals"
            :key="meal.key"
            class="meal-card"
            :class="{ 'meal-card--empty': !meal.foods.length }"
          >
            <header class="meal-header">
              <div class="meal-main">
                <span class="meal-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <g v-html="getMealIconMarkup(meal.key)"></g>
                  </svg>
                </span>

                <div class="meal-copy">
                  <div class="meal-line">
                    <h3>{{ meal.label }}</h3>
                    <span class="meal-calories">
                      {{ meal.totalCalories }}<template v-if="meal.foods.length">千卡</template><template v-else>（千卡）</template>
                    </span>
                    <span v-if="meal.eatenAt" class="meal-time">用餐时间{{ meal.eatenAt }}</span>
                  </div>
                </div>
              </div>

              <button class="add-btn" type="button" @click="handleAddRecord(meal)">+添加记录</button>
            </header>

            <div v-if="meal.foods.length" class="food-list">
              <button
                v-for="food in meal.foods"
                :key="food.id"
                class="food-item"
                type="button"
                @click="openFoodItem(food.name)"
              >
                <span class="food-thumb" :class="`food-thumb--${food.thumb}`" aria-hidden="true">
                  <span class="food-thumb-letter">{{ getFoodThumbLabel(food.thumb) }}</span>
                </span>

                <span class="food-copy">
                  <strong>{{ food.name }}</strong>
                  <small>{{ food.amount }}</small>
                </span>

                <span class="food-meta">
                  <span>{{ food.caloriesLabel }}</span>
                  <i class="food-arrow"></i>
                </span>
              </button>
            </div>
          </article>
        </div>
      </section>
    </main>

    <div v-if="showDatePicker" class="picker-mask" @click.self="closeDatePicker">
      <section class="picker-sheet" role="dialog" aria-modal="true" aria-label="选择日期">
        <header class="picker-header">
          <h2>历史数据</h2>
          <button class="picker-close" type="button" aria-label="关闭" @click="closeDatePicker">关闭</button>
        </header>

        <div class="picker-list">
          <button
            v-for="day in days"
            :key="day.id"
            class="picker-item"
            :class="{ 'picker-item--active': activeDay?.id === day.id }"
            type="button"
            @click="selectDay(day.id)"
          >
            <span>{{ day.sheetLabel }}</span>
            <strong>{{ day.totalCalories }} 千卡</strong>
          </button>
        </div>
      </section>
    </div>
  </section>
</template>

<style scoped>
.diet-record-page {
  --hero-start: #95da18;
  --hero-mid: #8bd610;
  --hero-end: #7fd204;
  --hero-surface: rgba(255, 255, 255, 0.14);
  --hero-surface-strong: rgba(255, 255, 255, 0.94);
  --hero-border: rgba(255, 255, 255, 0.24);
  --hero-border-soft: rgba(255, 255, 255, 0.18);
  --hero-shadow: rgba(57, 63, 74, 0.08);
  --hero-text-subtle: rgba(247, 249, 248, 0.82);
  --hero-text-soft: rgba(247, 249, 248, 0.74);
  --hero-accent: #7ecb0f;
  --cta-start: #82ce0f;
  --cta-end: #9be31f;
  position: relative;
  left: 50%;
  display: flex;
  flex-direction: column;
  width: min(390px, 100vw);
  height: auto;
  min-height: var(--ihc-page-min-height);
  max-height: none;
  margin: -18px 0;
  overflow: hidden;
  background: #f5f6f8;
  color: #31353b;
  font-family: var(--ihc-font-family);
  transform: translateX(-50%);
  -webkit-font-smoothing: antialiased;
}

.hero-panel {
  position: relative;
  overflow: hidden;
  margin: 14px 14px 0;
  padding: 14px 14px 18px;
  border-bottom-right-radius: 30px;
  border-bottom-left-radius: 30px;
  background: linear-gradient(140deg, var(--hero-start) 0%, var(--hero-mid) 48%, var(--hero-end) 100%);
  box-shadow: 0 18px 36px var(--hero-shadow);
}

.hero-toolbar {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr) 48px;
  align-items: center;
  gap: 10px;
}

.icon-btn {
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  padding: 0;
  border: 1px solid var(--hero-border);
  border-radius: 18px;
  background: var(--hero-surface);
  color: #ffffff;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.16),
    0 10px 18px rgba(47, 60, 55, 0.12);
}

.back-arrow {
  width: 12px;
  height: 12px;
  border-bottom: 2px solid #ffffff;
  border-left: 2px solid #ffffff;
  transform: rotate(45deg);
}

.date-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  justify-self: center;
  max-width: 100%;
  height: 42px;
  padding: 0 18px;
  border: 1px solid var(--hero-border-soft);
  border-radius: 999px;
  background: var(--hero-surface);
  color: #ffffff;
  font-size: 17px;
  font-weight: 600;
  white-space: nowrap;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.16),
    0 10px 18px rgba(47, 60, 55, 0.1);
}

.calendar-btn svg,
.meal-icon svg {
  display: block;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.9;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.calendar-btn svg {
  width: 23px;
  height: 23px;
}

.hero-copy {
  position: relative;
  z-index: 1;
  margin-top: 16px;
  padding: 0 6px;
  color: #ffffff;
}

.hero-caption {
  display: none;
  align-items: center;
  height: 24px;
  padding: 0 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.14);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
}

.hero-copy h1 {
  margin: 0;
  font-size: 26px;
  line-height: 1;
  font-weight: 800;
  letter-spacing: -0.03em;
}

.hero-copy p {
  display: none;
  max-width: 250px;
  margin: 9px 0 0;
  color: rgba(255, 255, 255, 0.88);
  font-size: 12px;
  line-height: 1.5;
}

.filter-tabs {
  position: relative;
  z-index: 1;
  display: flex;
  gap: 10px;
  margin-top: 14px;
  overflow-x: auto;
  scrollbar-width: none;
}

.filter-tabs::-webkit-scrollbar {
  display: none;
}

.filter-tab {
  flex: 0 0 auto;
  height: 38px;
  padding: 0 18px;
  border: 1px solid var(--hero-border-soft);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.92);
  font-size: 14px;
  font-weight: 700;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.12);
}

.filter-tab--active {
  background: var(--hero-surface-strong);
  color: var(--hero-accent);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.2),
    0 12px 20px rgba(44, 56, 52, 0.12);
}

.page-content {
  flex: 1;
  min-height: 0;
  padding: 16px 18px 26px;
  overflow-y: auto;
  scrollbar-width: none;
}

.page-content::-webkit-scrollbar {
  display: none;
}

.summary-card {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: 1.02fr auto 1fr;
  align-items: center;
  gap: 18px;
  margin-top: 18px;
  padding: 16px 4px 0;
  border-top: 1px solid var(--hero-border-soft);
  background: transparent;
}

.summary-total {
  text-align: center;
}

.summary-total strong {
  display: block;
  font-size: 34px;
  line-height: 1;
  font-weight: 800;
  letter-spacing: -0.04em;
  color: #ffffff;
}

.summary-total span {
  display: block;
  margin-top: 8px;
  color: var(--hero-text-subtle);
  font-size: 12px;
}

.summary-divider {
  width: 1px;
  height: 66px;
  background: var(--hero-border);
}

.macro-list {
  display: grid;
  gap: 11px;
}

.macro-item {
  display: grid;
  grid-template-columns: 10px auto 1fr;
  align-items: center;
  gap: 8px;
  color: var(--hero-text-subtle);
  font-size: 12px;
}

.macro-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.macro-label {
  color: var(--hero-text-soft);
}

.macro-item strong {
  justify-self: end;
  color: #ffffff;
  font-size: 12px;
  font-weight: 600;
}

.record-section {
  margin-top: 0;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.section-header h2 {
  margin: 0;
  color: #202632;
  font-size: 18px;
  font-weight: 800;
}

.section-more {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  width: 38px;
  height: 32px;
  padding: 0;
  border: 1px solid #e8ecf1;
  border-radius: 12px;
  background: linear-gradient(180deg, #ffffff 0%, #f6f8fb 100%);
  box-shadow: 0 8px 16px rgba(57, 63, 74, 0.06);
}

.section-more span {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #7b868f;
}

.meal-list {
  display: grid;
  gap: 14px;
}

.meal-card {
  padding: 18px 18px 10px;
  border: 1px solid #eceef2;
  border-radius: 22px;
  background: #ffffff;
  box-shadow: 0 10px 28px rgba(57, 63, 74, 0.05);
}

.meal-card--empty {
  padding-bottom: 18px;
}

.meal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.meal-main {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
}

.meal-icon {
  display: grid;
  place-items: center;
  width: 46px;
  height: 46px;
  flex: 0 0 46px;
  border: 1px solid #eceef2;
  border-radius: 50%;
  color: #45484e;
  background: #ffffff;
  box-shadow: 0 4px 10px rgba(57, 63, 74, 0.04);
}

.meal-icon svg {
  width: 22px;
  height: 22px;
}

.meal-copy {
  min-width: 0;
}

.meal-line {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 8px;
}

.meal-line h3 {
  margin: 0;
  color: #32353c;
  font-size: 18px;
  font-weight: 800;
}

.meal-calories,
.meal-time {
  color: #979ea7;
  font-size: 12px;
}

.meal-time {
  white-space: nowrap;
}

.add-btn {
  flex: 0 0 auto;
  min-width: 92px;
  height: 34px;
  padding: 0 14px;
  border: 0;
  border-radius: 999px;
  background: linear-gradient(135deg, var(--cta-start) 0%, var(--cta-end) 100%);
  color: #ffffff;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.01em;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.18),
    0 12px 18px rgba(77, 96, 89, 0.18);
}

.icon-btn,
.date-chip,
.filter-tab,
.section-more,
.add-btn {
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease,
    background-color 0.18s ease,
    border-color 0.18s ease,
    color 0.18s ease;
}

.icon-btn:active,
.date-chip:active,
.filter-tab:active,
.section-more:active,
.add-btn:active {
  transform: translateY(1px) scale(0.98);
}

.icon-btn:hover,
.date-chip:hover,
.filter-tab:hover,
.section-more:hover,
.add-btn:hover {
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.18),
    0 14px 22px rgba(47, 60, 55, 0.14);
}

.food-list {
  margin-top: 16px;
  border-top: 1px solid #f0f2f5;
}

.food-item {
  width: 100%;
  display: grid;
  grid-template-columns: 60px minmax(0, 1fr) auto;
  align-items: center;
  gap: 14px;
  padding: 16px 0;
  border: 0;
  border-bottom: 1px solid #f0f2f5;
  background: transparent;
  text-align: left;
}

.food-item:last-child {
  border-bottom: 0;
}

.food-thumb {
  position: relative;
  display: grid;
  place-items: center;
  width: 60px;
  height: 60px;
  overflow: hidden;
  border-radius: 14px;
  box-shadow: inset 0 0 0 1px rgba(233, 236, 240, 0.86);
}

.food-thumb-letter {
  position: relative;
  z-index: 2;
  color: rgba(59, 63, 69, 0.82);
  font-size: 18px;
  font-weight: 700;
}

.food-thumb--bread {
  background: linear-gradient(180deg, #efe7dd 0%, #d8cbc0 100%);
}

.food-thumb--bread::before,
.food-thumb--bread::after {
  position: absolute;
  width: 24px;
  height: 32px;
  content: "";
  border-radius: 14px 14px 10px 10px;
  background:
    radial-gradient(circle at 36% 42%, rgba(139, 108, 74, 0.24) 0 8%, transparent 9%),
    radial-gradient(circle at 65% 58%, rgba(139, 108, 74, 0.24) 0 8%, transparent 9%),
    linear-gradient(180deg, #b88a5c 0%, #8e623f 100%);
  box-shadow: inset 0 0 0 1px rgba(123, 86, 54, 0.16);
}

.food-thumb--bread::before {
  left: 10px;
  top: 16px;
  transform: rotate(-13deg);
}

.food-thumb--bread::after {
  right: 10px;
  top: 12px;
  transform: rotate(13deg);
}

.food-thumb--milk {
  background: linear-gradient(180deg, #f0f3f8 0%, #dce3ed 100%);
}

.food-thumb--milk::before {
  position: absolute;
  left: 19px;
  top: 11px;
  width: 22px;
  height: 36px;
  content: "";
  border-radius: 8px 8px 10px 10px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.95) 0%, rgba(245, 247, 252, 0.9) 100%);
  box-shadow:
    inset 0 0 0 1px rgba(210, 217, 228, 0.8),
    0 8px 16px rgba(130, 142, 161, 0.12);
}

.food-thumb--milk::after {
  position: absolute;
  left: 20px;
  top: 9px;
  width: 20px;
  height: 8px;
  content: "";
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.9);
}

.food-thumb--oat {
  background: linear-gradient(180deg, #fff1d8 0%, #f1d6a8 100%);
}

.food-thumb--oat::before {
  position: absolute;
  left: 12px;
  bottom: 12px;
  width: 36px;
  height: 18px;
  content: "";
  border-radius: 0 0 18px 18px;
  background: #ffffff;
  box-shadow: inset 0 -3px 0 rgba(228, 232, 238, 0.8);
}

.food-thumb--oat::after {
  position: absolute;
  left: 15px;
  bottom: 21px;
  width: 30px;
  height: 12px;
  content: "";
  border-radius: 999px;
  background:
    radial-gradient(circle at 25% 45%, #c99e63 0 12%, transparent 13%),
    radial-gradient(circle at 55% 55%, #d3ab70 0 14%, transparent 15%),
    radial-gradient(circle at 78% 40%, #c79b5f 0 11%, transparent 12%),
    #efd7ab;
}

.food-thumb--egg {
  background: linear-gradient(180deg, #fff4dc 0%, #f4e4bd 100%);
}

.food-thumb--egg::before,
.food-thumb--egg::after {
  position: absolute;
  width: 19px;
  height: 25px;
  content: "";
  border-radius: 50% 50% 48% 48%;
  background:
    radial-gradient(circle at 50% 54%, #f0b84c 0 24%, transparent 25%),
    #ffffff;
  box-shadow: inset 0 0 0 1px rgba(221, 224, 229, 0.8);
}

.food-thumb--egg::before {
  left: 14px;
  top: 18px;
}

.food-thumb--egg::after {
  right: 14px;
  top: 14px;
}

.food-thumb--fish {
  background: linear-gradient(180deg, #ecf5ff 0%, #d6e7fb 100%);
}

.food-thumb--fish::before {
  position: absolute;
  left: 13px;
  top: 21px;
  width: 32px;
  height: 18px;
  content: "";
  border-radius: 50% 45% 45% 50%;
  background: linear-gradient(180deg, #79aee6 0%, #4d88cc 100%);
}

.food-thumb--fish::after {
  position: absolute;
  right: 10px;
  top: 24px;
  width: 10px;
  height: 10px;
  content: "";
  border-radius: 2px;
  background: #4d88cc;
  transform: rotate(45deg);
}

.food-thumb--salad {
  background: linear-gradient(180deg, #eefaf3 0%, #dbeedd 100%);
}

.food-thumb--salad::before {
  position: absolute;
  left: 10px;
  top: 17px;
  width: 40px;
  height: 26px;
  content: "";
  border-radius: 0 0 20px 20px;
  background: #ffffff;
  box-shadow: inset 0 -2px 0 rgba(226, 232, 239, 0.8);
}

.food-thumb--salad::after {
  position: absolute;
  left: 14px;
  top: 12px;
  width: 32px;
  height: 18px;
  content: "";
  border-radius: 50%;
  background:
    radial-gradient(circle at 18% 70%, #62bf76 0 18%, transparent 19%),
    radial-gradient(circle at 45% 35%, #4caf61 0 20%, transparent 21%),
    radial-gradient(circle at 72% 60%, #6ac779 0 18%, transparent 19%),
    radial-gradient(circle at 88% 28%, #ff8d73 0 10%, transparent 11%);
}

.food-thumb--fruit {
  background: linear-gradient(180deg, #f9f1ff 0%, #ecdff8 100%);
}

.food-thumb--fruit::before {
  position: absolute;
  left: 12px;
  top: 22px;
  width: 14px;
  height: 14px;
  content: "";
  border-radius: 50%;
  background: #4da6ff;
  box-shadow:
    10px -4px 0 #6f57df,
    20px 2px 0 #f36f66,
    12px 10px 0 #56c48d;
}

.food-thumb--porridge {
  background: linear-gradient(180deg, #fff5df 0%, #f1dfb2 100%);
}

.food-thumb--porridge::before {
  position: absolute;
  left: 12px;
  bottom: 13px;
  width: 36px;
  height: 18px;
  content: "";
  border-radius: 0 0 18px 18px;
  background: #ffffff;
  box-shadow: inset 0 -2px 0 rgba(224, 228, 233, 0.8);
}

.food-thumb--porridge::after {
  position: absolute;
  left: 14px;
  bottom: 21px;
  width: 32px;
  height: 12px;
  content: "";
  border-radius: 999px;
  background: #f3c66c;
}

.food-copy {
  min-width: 0;
}

.food-copy strong {
  display: block;
  color: #3a3f46;
  font-size: 14px;
  font-weight: 600;
}

.food-copy small {
  display: block;
  margin-top: 6px;
  color: #9aa0aa;
  font-size: 12px;
}

.food-meta {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: #8f96a0;
  font-size: 12px;
  white-space: nowrap;
}

.food-arrow {
  width: 8px;
  height: 8px;
  border-top: 1.6px solid #c3c8d0;
  border-right: 1.6px solid #c3c8d0;
  transform: rotate(45deg);
}

.picker-mask {
  position: fixed;
  inset: 0;
  z-index: 20;
  display: grid;
  align-items: end;
  background: rgba(28, 31, 36, 0.22);
}

.picker-sheet {
  border-radius: 24px 24px 0 0;
  background: #ffffff;
  box-shadow: 0 -12px 34px rgba(57, 63, 74, 0.12);
}

.picker-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 18px 10px;
}

.picker-header h2 {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
}

.picker-close {
  padding: 0;
  border: 0;
  background: transparent;
  color: #7f8791;
  font-size: 13px;
}

.picker-list {
  display: grid;
  gap: 8px;
  padding: 0 18px 20px;
}

.picker-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border: 1px solid #eceef2;
  border-radius: 16px;
  background: #fbfbfc;
  color: #40444b;
}

.picker-item span {
  font-size: 14px;
}

.picker-item strong {
  color: #8f96a0;
  font-size: 12px;
  font-weight: 600;
}

.picker-item--active {
  border-color: rgba(90, 116, 255, 0.24);
  background: rgba(90, 116, 255, 0.06);
}
</style>
