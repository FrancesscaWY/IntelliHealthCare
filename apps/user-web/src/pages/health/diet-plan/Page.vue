<script setup lang="ts">
import { computed, ref } from "vue";
import type { PageComponentProps } from "@ihc/page-core/types";
import type { DietMealKey, DietRecipe } from "../diet-recipes";
import mock from "./mock";
import { selectedDietRecipeId } from "./state";

const props = defineProps<PageComponentProps>();
const activeMeal = ref<DietMealKey>((mock.mealTabs[0]?.key as DietMealKey) || "breakfast");
const searchValue = ref("");

const mealIconMarkup: Record<string, string> = {
  breakfast: `
    <path d="M7 8h11v5.5a5.5 5.5 0 0 1-5.5 5.5A5.5 5.5 0 0 1 7 13.5V8Z" />
    <path d="M18 10h2.5a2.5 2.5 0 0 1 0 5H18" />
    <path d="M5 21h16" />
  `,
  lunch: `
    <path d="M5 11h18v1.5A8.5 8.5 0 0 1 14.5 21h-1A8.5 8.5 0 0 1 5 12.5V11Z" />
    <path d="M7 23h14" />
    <path d="M8 5v3" />
    <path d="M14 4v4" />
    <path d="M20 5v3" />
  `,
  dinner: `
    <path d="M8 4v18" />
    <path d="M4 4v6a4 4 0 0 0 8 0V4" />
    <path d="M18 4v18" />
    <path d="M18 4c4 2.4 4 7.6 0 10" />
  `,
  snack: `
    <path d="M7 10h14l-1.4 11H8.4L7 10Z" />
    <path d="M9 10c0-2.4 2-4 4-2.5C14.2 4.7 18 5.6 18 9.5" />
    <path d="M10 14h.01" />
    <path d="M14 16h.01" />
    <path d="M18 14h.01" />
  `,
};

const heroFoodMarkup = `
  <ellipse cx="62" cy="99" rx="41" ry="8" fill="#dfeee5" opacity=".7" />
  <path d="M25 55h74c-2.4 26.6-17.1 43-37 43S27.4 81.6 25 55Z" fill="#62cfa1" />
  <path d="M31 61h62c-4.7 18.5-15.6 28.1-31 28.1S35.7 79.5 31 61Z" fill="#ffffff" opacity=".84" />
  <path d="M23 54c3.4 8.6 19.2 14.7 39 14.7s35.6-6.1 39-14.7c-3.4-8.6-19.2-14.7-39-14.7S26.4 45.4 23 54Z" fill="#f7fbf8" />
  <path d="M32 48c10-16 25.5-18.8 36-7-13.6 1.2-24.7 7-33.2 17.2A20.4 20.4 0 0 1 32 48Z" fill="#4fcf97" />
  <path d="M53 37c7.7-14.5 22-18.6 35-9-11.7 5.4-19.2 14.7-22.4 27.8A24.8 24.8 0 0 1 53 37Z" fill="#7bddaf" />
  <path d="M74 43c10.2-12.1 23.4-12.1 34 0-11.2 2.3-19.5 8-25 17.1A23.5 23.5 0 0 1 74 43Z" fill="#42bd83" />
  <circle cx="43" cy="58" r="7" fill="#ff836f" />
  <circle cx="77" cy="55" r="7" fill="#ff836f" />
  <circle cx="60" cy="61" r="6" fill="#f7cf5f" />
  <path d="M35 69c15.8 10.4 39.8 10.4 55.6 0" fill="none" stroke="#36aa78" stroke-width="3.2" stroke-linecap="round" />
`;

function goBack() {
  if (!props.navigation.navigateBack()) {
    props.navigation.reLaunch("home/dashboard");
  }
}

function selectMeal(key: string) {
  activeMeal.value = key as DietMealKey;
}

function openRecipe(recipe: DietRecipe) {
  selectedDietRecipeId.value = recipe.id;
  props.navigation.navigateTo("health/diet-recipe-detail");
}

function getMealIconMarkup(key: string) {
  return mealIconMarkup[key] || mealIconMarkup.breakfast;
}

const activeMealMeta = computed(() => mock.mealTabs.find((item) => item.key === activeMeal.value) || mock.mealTabs[0]);

const visibleRecipes = computed(() => {
  const keyword = searchValue.value.trim().toLowerCase();

  return mock.recipes.filter((item) => {
    if (!item.mealKeys.includes(activeMeal.value)) {
      return false;
    }

    if (!keyword) {
      return true;
    }

    const searchText = [item.title, item.subtitle, item.energy, item.time, ...item.tags, ...item.ingredients.map((ingredient) => ingredient.name)]
      .join(" ")
      .toLowerCase();
    return searchText.includes(keyword);
  });
});
</script>

<template>
  <section class="diet-page">
    <header class="diet-nav">
      <button class="back-btn" type="button" aria-label="返回" @click="goBack">‹</button>
      <h1>{{ mock.title }}</h1>
      <span></span>
    </header>

    <main class="diet-scroll">
      <section class="diet-hero">
        <div class="hero-copy">
          <span>营养计划</span>
          <h2>{{ mock.overview.title }}</h2>
          <p>{{ mock.overview.subtitle }}</p>
        </div>
        <div class="hero-plate" aria-hidden="true">
          <svg viewBox="0 0 124 116" focusable="false">
            <g v-html="heroFoodMarkup"></g>
          </svg>
        </div>
      </section>

      <section class="nutrition-card" aria-label="今日营养概览">
        <div>
          <strong>{{ mock.overview.calories }}</strong>
          <span>热量 kcal</span>
        </div>
        <div>
          <strong>{{ mock.overview.protein }}</strong>
          <span>蛋白质</span>
        </div>
        <div>
          <strong>{{ mock.overview.fiber }}</strong>
          <span>膳食纤维</span>
        </div>
      </section>

      <label class="diet-search">
        <span class="search-icon" aria-hidden="true"></span>
        <input v-model="searchValue" type="search" :placeholder="mock.searchPlaceholder" />
      </label>

      <section class="meal-tabs" aria-label="餐次分类">
        <button
          v-for="item in mock.mealTabs"
          :key="item.key"
          type="button"
          :class="{ 'meal-tab--active': activeMeal === item.key }"
          @click="selectMeal(item.key)"
        >
          <span class="meal-tab-icon" :class="`meal-tab-icon--${item.key}`" aria-hidden="true">
            <svg viewBox="0 0 24 24" focusable="false">
              <g v-html="getMealIconMarkup(item.key)"></g>
            </svg>
          </span>
          <strong>{{ item.label }}</strong>
          <small>{{ item.desc }}</small>
        </button>
      </section>

      <section class="recommend-section">
        <header class="section-header">
          <h2>{{ activeMealMeta?.label }}推荐</h2>
          <span>{{ activeMealMeta?.highlight || "适合长者的低盐轻食" }}</span>
        </header>

        <div v-if="visibleRecipes.length" class="recipe-grid">
          <article v-for="item in visibleRecipes" :key="item.id" class="recipe-card" @click="openRecipe(item)">
            <img class="recipe-photo" :src="item.imageUrl" :alt="item.title" draggable="false" />
            <h3>{{ item.title }}</h3>
            <p>{{ item.energy }} · {{ item.time }}</p>
            <div class="recipe-tags">
              <span v-for="tag in item.tags" :key="tag">{{ tag }}</span>
            </div>
          </article>
        </div>

        <section v-else class="recipe-empty">
          <strong>{{ activeMealMeta?.label }}暂无匹配餐品</strong>
          <p>可以切换其他餐次，或换个关键词试试。</p>
        </section>
      </section>
    </main>
  </section>
</template>

<style scoped>
.diet-page {
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
  font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif;
  -webkit-font-smoothing: antialiased;
  text-rendering: geometricPrecision;
  transform: translateX(-50%);
}

.diet-nav {
  display: grid;
  grid-template-columns: 34px 1fr 34px;
  align-items: center;
  height: 52px;
}

.back-btn,
.meal-tabs button,
.diet-search input {
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
}

.back-btn {
  width: 28px;
  height: 38px;
  padding: 0;
  color: #252939;
  font-size: 38px;
  font-weight: 300;
  line-height: 30px;
}

.diet-nav h1 {
  margin: 0;
  overflow: hidden;
  color: #222733;
  font-size: 20px;
  font-weight: 900;
  letter-spacing: 0;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.diet-scroll {
  height: calc(100% - 52px);
  padding: 8px 0 0;
  overflow-y: auto;
  scrollbar-width: none;
}

.diet-scroll::-webkit-scrollbar {
  display: none;
}

.diet-hero {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 96px;
  gap: 12px;
  min-height: 128px;
  padding: 18px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.68);
  border-radius: 15px;
  background: rgba(255, 255, 255, 0.86);
  box-shadow: 0 16px 34px rgba(82, 105, 148, 0.08);
}

.hero-copy {
  position: relative;
  z-index: 1;
}

.hero-copy span {
  display: inline-flex;
  align-items: center;
  height: 24px;
  padding: 0 14px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.72);
  background: rgba(255, 255, 255, 0.84);
  box-shadow: 0 8px 18px rgba(107, 126, 160, 0.06);
  color: #66cfa7;
  font-size: 12px;
  font-weight: 900;
}

.hero-copy h2 {
  margin: 10px 0 0;
  color: #222733;
  font-size: 21px;
  font-weight: 900;
  line-height: 1.35;
}

.hero-copy p {
  margin: 8px 0 0;
  color: #8f95a2;
  font-size: 13px;
  font-weight: 800;
  line-height: 1.55;
}

.hero-plate {
  position: relative;
  z-index: 1;
  align-self: center;
  width: 96px;
  height: 94px;
  filter: drop-shadow(0 14px 18px rgba(89, 132, 90, 0.12));
}

.hero-plate svg {
  display: block;
  width: 96px;
  height: 94px;
}

.nutrition-card {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0;
  margin-top: 12px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.68);
  border-radius: 15px;
  background: rgba(255, 255, 255, 0.86);
  box-shadow: 0 16px 34px rgba(82, 105, 148, 0.08);
}

.nutrition-card div {
  display: grid;
  place-items: center;
  min-height: 64px;
}

.nutrition-card div + div {
  border-left: 1px solid rgba(205, 207, 215, 0.72);
}

.nutrition-card strong {
  color: #222733;
  font-size: 16px;
  font-weight: 900;
}

.nutrition-card span {
  margin-top: -2px;
  color: #8f95a2;
  font-size: 12px;
  font-weight: 800;
}

.diet-search {
  position: relative;
  display: flex;
  align-items: center;
  height: 40px;
  margin-top: 12px;
  padding: 3px 14px;
  border: 2px solid transparent;
  border-radius: 999px;
  background:
    linear-gradient(#ffffff, #ffffff) padding-box,
    linear-gradient(92deg, #8e72e8 0%, #69d5d1 48%, #68db87 100%) border-box;
  box-shadow: 0 13px 28px rgba(68, 144, 162, 0.08);
}

.search-icon {
  position: relative;
  width: 18px;
  height: 18px;
  margin-right: 10px;
  border: 2.5px solid #9a9da6;
  border-radius: 50%;
}

.search-icon::after {
  position: absolute;
  right: -7px;
  bottom: -5px;
  width: 9px;
  height: 2.5px;
  content: "";
  border-radius: 999px;
  background: #9a9da6;
  transform: rotate(45deg);
}

.diet-search input {
  flex: 1;
  min-width: 0;
  outline: 0;
  color: #252939;
  font-size: 14px;
  font-weight: 700;
}

.diet-search input::placeholder {
  color: #9a9da6;
  opacity: 1;
}

.meal-tabs {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
  margin-top: 14px;
}

.meal-tabs button {
  display: grid;
  justify-items: center;
  min-height: 86px;
  padding: 8px 4px 7px;
  border: 1px solid rgba(255, 255, 255, 0.68);
  border-radius: 15px;
  background: rgba(255, 255, 255, 0.86);
  box-shadow: 0 16px 34px rgba(82, 105, 148, 0.08);
}

.meal-tabs button strong {
  margin-top: 6px;
  color: #222733;
  font-size: 12px;
  font-weight: 900;
}

.meal-tabs button small {
  margin-top: 2px;
  color: #8f95a2;
  font-size: 10px;
  font-weight: 800;
  white-space: nowrap;
}

.meal-tab--active {
  border-color: transparent;
  background:
    linear-gradient(rgba(255, 255, 255, 0.92), rgba(255, 255, 255, 0.92)) padding-box,
    linear-gradient(100deg, #75d6df 0%, #7be28e 100%) border-box !important;
  color: #66cfa7;
  box-shadow: 0 16px 30px rgba(89, 200, 162, 0.16);
}

.meal-tab--active strong {
  color: #48bfa3;
}

.meal-tab-icon {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border-radius: 13px;
  background: #f6f7f9;
}

.meal-tab-icon svg {
  display: block;
  width: 24px;
  height: 24px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2.1;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.meal-tab-icon--breakfast {
  color: #42cfa0;
  background: rgba(66, 207, 160, 0.11);
}

.meal-tab-icon--lunch {
  color: #ff846f;
  background: rgba(255, 132, 111, 0.12);
}

.meal-tab-icon--dinner {
  color: #f0c45c;
  background: rgba(240, 196, 92, 0.15);
}

.meal-tab-icon--snack {
  color: #69d5d1;
  background: rgba(105, 213, 209, 0.12);
}

.meal-tab-icon--breakfast svg,
.meal-tab-icon--lunch svg,
.meal-tab-icon--snack svg {
  transform: translateX(-2px);
}

.recommend-section {
  margin-top: 18px;
}

.section-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
}

.section-header h2 {
  margin: 0;
  color: #222733;
  font-size: 18px;
  font-weight: 900;
}

.section-header span {
  color: #8f95a2;
  font-size: 12px;
  font-weight: 800;
}

.recipe-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 12px;
}

.recipe-empty {
  display: grid;
  gap: 6px;
  margin-top: 12px;
  padding: 18px 16px;
  border: 1px solid rgba(255, 255, 255, 0.68);
  border-radius: 15px;
  background: rgba(255, 255, 255, 0.86);
  box-shadow: 0 16px 34px rgba(82, 105, 148, 0.08);
  text-align: center;
}

.recipe-empty strong {
  color: #222733;
  font-size: 14px;
  font-weight: 900;
}

.recipe-empty p {
  margin: 0;
  color: #8f95a2;
  font-size: 12px;
  font-weight: 800;
  line-height: 1.5;
}

.recipe-card {
  overflow: hidden;
  padding: 0 0 9px;
  border: 1px solid rgba(255, 255, 255, 0.68);
  border-radius: 15px;
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 16px 34px rgba(82, 105, 148, 0.08);
}

.recipe-photo {
  display: block;
  width: 100%;
  height: 104px;
  object-fit: cover;
  background: #eaf6ee;
}

.recipe-card h3 {
  margin: 9px 10px 0;
  color: #222733;
  font-size: 14px;
  font-weight: 900;
  line-height: 1.35;
}

.recipe-card p {
  margin: 6px 10px 0;
  color: #8f95a2;
  font-size: 11px;
  font-weight: 800;
}

.recipe-tags {
  display: flex;
  gap: 6px;
  margin: 8px 10px 0;
  overflow: hidden;
}

.recipe-tags span {
  height: 22px;
  padding: 0 7px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.72);
  background: rgba(255, 255, 255, 0.84);
  color: #66cfa7;
  font-size: 10px;
  font-weight: 900;
  line-height: 22px;
  white-space: nowrap;
}

@media (min-width: 561px) {
  .diet-page {
    height: auto;
    min-height: var(--ihc-page-min-height);
  }
}

@media (max-width: 389px) {
  .diet-page {
    padding-right: 16px;
    padding-left: 16px;
  }

  .meal-tabs {
    gap: 6px;
  }

  .recipe-grid {
    gap: 10px;
  }
}
</style>
