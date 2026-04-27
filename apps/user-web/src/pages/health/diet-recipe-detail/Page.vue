<script setup lang="ts">
import { computed } from "vue";
import type { PageComponentProps } from "@ihc/page-core/types";
import { getDietRecipeById } from "../diet-recipes";
import { selectedDietRecipeId } from "../diet-plan/state";

const props = defineProps<PageComponentProps>();

const recipe = computed(() => getDietRecipeById(selectedDietRecipeId.value));

function goBack() {
  if (!props.navigation.navigateBack()) {
    props.navigation.reLaunch("health/diet-plan");
  }
}
</script>

<template>
  <section class="recipe-detail-page">
    <header class="detail-nav">
      <button class="nav-btn nav-btn--back" type="button" aria-label="返回" @click="goBack">
        <span class="back-arrow" aria-hidden="true"></span>
      </button>
      <h1>食谱详情</h1>
      <div class="nav-actions">
        <button class="nav-btn" type="button" aria-label="收藏" @click="props.showToast('收藏功能待接入')">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m12 3.15 2.68 5.43 5.99.87-4.33 4.22 1.02 5.96L12 16.82l-5.36 2.81 1.02-5.96-4.33-4.22 5.99-.87L12 3.15Z" />
          </svg>
        </button>
        <button class="nav-btn" type="button" aria-label="分享" @click="props.showToast('分享功能待接入')">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M14 3h7v7" />
            <path d="M10 14 21 3" />
            <path d="M21 14v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h6" />
          </svg>
        </button>
      </div>
    </header>

    <main class="detail-scroll">
      <section class="hero-section">
        <h2>{{ recipe.title }}</h2>
        <p class="publish-date">{{ recipe.publishDate }}</p>
        <img class="hero-image" :src="recipe.imageUrl" :alt="recipe.title" draggable="false" />
      </section>

      <section class="content-section">
        <h3>原料</h3>
        <div class="ingredient-list">
          <div v-for="item in recipe.ingredients" :key="item.name" class="ingredient-row">
            <span>{{ item.name }}</span>
            <strong>{{ item.amount }}</strong>
          </div>
        </div>
      </section>

      <section class="content-section">
        <h3>制作步骤</h3>
        <article v-for="(step, index) in recipe.steps" :key="index" class="step-card">
          <h4>步骤{{ index + 1 }}</h4>
          <p>{{ step }}</p>
        </article>
      </section>
    </main>
  </section>
</template>

<style scoped>
.recipe-detail-page {
  position: relative;
  left: 50%;
  width: min(390px, 100vw);
  height: auto;
  min-height: var(--ihc-page-min-height);
  max-height: none;
  margin: -18px 0;
  overflow: hidden;
  background: #ffffff;
  color: #333333;
  font-family: var(--ihc-font-family);
  transform: translateX(-50%);
  -webkit-font-smoothing: antialiased;
}

.detail-nav {
  display: grid;
  grid-template-columns: 28px 1fr auto;
  align-items: center;
  gap: 10px;
  padding: 12px 16px 6px;
}

.detail-nav h1 {
  margin: 0;
  color: #2f3138;
  font-size: 18px;
  font-weight: 500;
}

.nav-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.nav-btn {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 0;
  background: transparent;
  color: #2f3138;
}

.nav-btn svg {
  width: 20px;
  height: 20px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.nav-btn--back {
  width: 28px;
  height: 28px;
}

.back-arrow {
  width: 12px;
  height: 12px;
  border-bottom: 2px solid #2f3138;
  border-left: 2px solid #2f3138;
  transform: rotate(45deg);
}

.detail-scroll {
  height: calc(100% - 56px);
  padding: 18px 16px 16px;
  overflow-y: auto;
  scrollbar-width: none;
}

.detail-scroll::-webkit-scrollbar {
  display: none;
}

.hero-section h2,
.content-section h3,
.step-card h4,
.ingredient-row strong {
  margin: 0;
}

.hero-section h2 {
  color: #373b43;
  font-size: 20px;
  font-weight: 500;
}

.publish-date {
  margin: 6px 0 0;
  color: #c6c7cc;
  font-size: 11px;
  font-weight: 400;
}

.hero-image {
  display: block;
  width: 100%;
  margin-top: 10px;
  aspect-ratio: 1.18;
  object-fit: cover;
  border-radius: 16px;
}

.content-section {
  margin-top: 16px;
}

.content-section h3 {
  color: #373b43;
  font-size: 18px;
  font-weight: 500;
}

.ingredient-list {
  margin-top: 8px;
  border-top: 1px solid #f0f1f3;
}

.ingredient-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 42px;
  border-bottom: 1px solid #f0f1f3;
  color: #4b4f57;
  font-size: 14px;
}

.ingredient-row strong {
  color: #3b3f47;
  font-size: 14px;
  font-weight: 500;
}

.step-card {
  margin-top: 10px;
}

.step-card h4 {
  color: #3b3f47;
  font-size: 15px;
  font-weight: 500;
}

.step-card p {
  margin: 6px 0 0;
  color: #565b64;
  font-size: 13px;
  line-height: 1.72;
}

@media (min-width: 561px) {
  .recipe-detail-page {
    height: auto;
    min-height: var(--ihc-page-min-height);
  }
}

@media (max-width: 389px) {
  .detail-nav,
  .detail-scroll {
    padding-right: 12px;
    padding-left: 12px;
  }
}
</style>
