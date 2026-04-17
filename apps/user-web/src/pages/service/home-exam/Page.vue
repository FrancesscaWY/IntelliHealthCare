<script setup lang="ts">
import { computed, ref } from 'vue'
import type { PageComponentProps } from '@ihc/page-core/types'
import mock from './mock'

const props = defineProps<PageComponentProps>()

const activeCategory = ref(mock.categories[0]?.key ?? '')

const packageList = computed(() => mock.packages)

const goBack = () => {
  if (!props.navigation.navigateBack()) {
    props.navigation.reLaunch('home/dashboard')
  }
}

const openPackage = () => {
  props.navigation.navigateTo('service/home-exam-detail')
}
</script>

<template>
  <div class="home-exam-page">
    <header class="page-header">
      <button class="back-button" type="button" aria-label="返回" @click="goBack">‹</button>
      <h1>上门体检</h1>
    </header>

    <main class="exam-layout">
      <aside class="category-panel" aria-label="体检分类">
        <button
          v-for="item in mock.categories"
          :key="item.key"
          class="category-button"
          :class="{ active: activeCategory === item.key }"
          type="button"
          @click="activeCategory = item.key"
        >
          {{ item.label }}
        </button>
      </aside>

      <section class="package-list" aria-label="体检套餐">
        <article v-for="item in packageList" :key="item.id" class="package-card" @click="openPackage">
          <img class="package-image" :src="item.image" :alt="item.title" />
          <div class="package-content">
            <h2>{{ item.title }}</h2>
            <span class="price">¥{{ item.price }}</span>
          </div>
        </article>
      </section>
    </main>
  </div>
</template>

<style scoped>
.home-exam-page {
  position: relative;
  left: 50%;
  width: min(402px, 100vw);
  min-height: 874px;
  margin: -18px 0;
  padding: 16px 18px 28px;
  box-sizing: border-box;
  transform: translateX(-50%);
  overflow-x: hidden;
  background: #f6f7f8;
  color: #34383f;
  font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif;
}

.page-header {
  height: 54px;
  display: flex;
  align-items: center;
}

.back-button {
  width: 28px;
  height: 36px;
  margin: 0 4px 0 -2px;
  padding: 0;
  border: 0;
  background: transparent;
  color: #30343a;
  font-size: 40px;
  line-height: 32px;
  cursor: pointer;
}

.page-header h1 {
  margin: 0;
  color: #34383f;
  font-size: 20px;
  font-weight: 500;
  letter-spacing: 0;
}

.exam-layout {
  display: grid;
  grid-template-columns: 98px 1fr;
  gap: 14px;
  align-items: start;
  margin-top: 12px;
}

.category-panel {
  display: flex;
  flex-direction: column;
  padding: 10px 9px;
  border-radius: 10px;
  background: #fff;
  box-shadow: 0 6px 18px rgba(36, 42, 55, 0.04);
}

.category-button {
  width: 100%;
  min-height: 46px;
  display: grid;
  place-items: center;
  padding: 0 4px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: #60656f;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0;
  cursor: pointer;
}

.category-button.active {
  background: #eef0ff;
  color: #6a72f4;
}

.package-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding-bottom: 12px;
}

.package-card {
  min-height: 74px;
  display: grid;
  grid-template-columns: 60px 1fr;
  gap: 14px;
  align-items: center;
  padding: 10px 14px;
  box-sizing: border-box;
  border-radius: 10px;
  background: #fff;
  box-shadow: 0 6px 18px rgba(36, 42, 55, 0.04);
  cursor: pointer;
}

.package-image {
  width: 55px;
  height: 55px;
  display: block;
  border-radius: 6px;
  object-fit: cover;
  background: #e7edf2;
}

.package-content {
  min-width: 0;
}

.package-content h2 {
  margin: 0 0 8px;
  color: #34383f;
  font-size: 15px;
  font-weight: 800;
  line-height: 1.28;
  letter-spacing: 0;
}

.price {
  color: #f2736d;
  font-size: 17px;
  font-weight: 800;
}
</style>
