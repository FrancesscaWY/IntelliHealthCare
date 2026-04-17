<script setup lang="ts">
import { computed, ref } from 'vue'
import type { PageComponentProps } from '@ihc/page-core/types'
import mock, { type FilterKey } from './mock'

const props = defineProps<PageComponentProps>()

const activeFilter = ref<FilterKey>('popular')

const institutionList = computed(() => {
  if (activeFilter.value === 'price') {
    return [...mock.institutions].sort((a, b) => a.price - b.price)
  }

  if (activeFilter.value === 'rating') {
    return [...mock.institutions].sort((a, b) => b.rating - a.rating)
  }

  return mock.institutions
})

const goBack = () => {
  if (!props.navigation.navigateBack()) {
    props.navigation.reLaunch('home/dashboard')
  }
}

const openInstitution = () => {
  props.navigation.navigateTo('service/elderly-care-detail')
}
</script>

<template>
  <div class="elderly-care-page">
    <header class="page-header">
      <button class="back-button" type="button" aria-label="返回" @click="goBack">‹</button>
      <h1>养老机构</h1>
    </header>

    <div class="filter-row" role="tablist" aria-label="养老机构筛选">
      <button
        v-for="item in mock.filters"
        :key="item.key"
        class="filter-button"
        :class="{ active: activeFilter === item.key, 'filter-button--price': item.key === 'price' }"
        type="button"
        role="tab"
        :aria-selected="activeFilter === item.key"
        @click="activeFilter = item.key"
      >
        <span>{{ item.label }}</span>
        <span v-if="item.key === 'price'" class="price-arrows" aria-hidden="true">
          <i></i>
          <i></i>
        </span>
      </button>
    </div>

    <section class="institution-grid" aria-label="养老机构列表">
      <article v-for="item in institutionList" :key="item.id" class="institution-card" @click="openInstitution">
        <div class="image-placeholder">
          <span>图片待添加</span>
        </div>
        <h2>{{ item.name }}</h2>
        <p>{{ item.subtitle }}</p>
        <div class="tag-row">
          <span v-for="tag in item.tags" :key="tag" class="institution-tag">{{ tag }}</span>
        </div>
        <div class="meta-row">
          <span class="price">¥{{ item.price }}起</span>
          <span class="rating">★ {{ item.rating }}</span>
        </div>
        <div class="info-row">
          <span>{{ item.distance }}</span>
          <span>余{{ item.beds }}床</span>
        </div>
      </article>
    </section>
  </div>
</template>

<style scoped>
.elderly-care-page {
  position: relative;
  left: 50%;
  width: min(402px, 100vw);
  min-height: 874px;
  margin: -18px 0;
  padding: 16px 22px 28px;
  box-sizing: border-box;
  transform: translateX(-50%);
  overflow-x: hidden;
  background: #f6f7f8;
  color: #34383f;
  font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif;
}

.page-header {
  height: 58px;
  display: flex;
  align-items: center;
}

.back-button {
  width: 30px;
  height: 38px;
  margin: 0 6px 0 -4px;
  padding: 0;
  border: 0;
  background: transparent;
  color: #30343a;
  font-size: 42px;
  line-height: 34px;
  cursor: pointer;
}

.page-header h1 {
  margin: 0;
  color: #34383f;
  font-size: 22px;
  font-weight: 500;
  letter-spacing: 0;
}

.filter-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin: 10px 0 30px;
}

.filter-button {
  height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0;
  border: 1px solid #ebedf0;
  border-radius: 9px;
  background: #fff;
  color: #777a81;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 1px 4px rgba(40, 44, 55, 0.04);
}

.filter-button.active {
  border-color: #6a72f4;
  background: #6a72f4;
  color: #fff;
  box-shadow: none;
}

.price-arrows {
  display: grid;
  gap: 2px;
}

.price-arrows i {
  width: 0;
  height: 0;
  display: block;
  border-right: 4px solid transparent;
  border-left: 4px solid transparent;
}

.price-arrows i:first-child {
  border-bottom: 5px solid #d2d4d8;
}

.price-arrows i:last-child {
  border-top: 5px solid #d2d4d8;
}

.institution-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  column-gap: 18px;
  row-gap: 34px;
  padding-bottom: 24px;
}

.institution-card {
  min-width: 0;
  cursor: pointer;
  transition: transform 0.18s ease;
}

.institution-card:nth-child(even) {
  transform: translateY(28px);
}

.image-placeholder {
  width: 100%;
  height: 158px;
  display: grid;
  place-items: center;
  border: 1px dashed #cfd6e6;
  border-radius: 10px;
  background:
    linear-gradient(135deg, rgba(106, 114, 244, 0.12), rgba(118, 214, 184, 0.12)),
    #eef2f7;
  color: #8b93a4;
  font-size: 13px;
  font-weight: 700;
}

.institution-card h2 {
  margin: 13px 0 7px;
  color: #34383f;
  font-size: 18px;
  font-weight: 800;
  line-height: 1.25;
  letter-spacing: 0;
}

.institution-card p {
  min-height: 34px;
  margin: 0 0 10px;
  color: #8d929a;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.4;
}

.tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.institution-tag {
  height: 24px;
  display: inline-flex;
  align-items: center;
  padding: 0 7px;
  border-radius: 4px;
  background: rgba(77, 205, 162, 0.1);
  color: #31bf99;
  font-size: 12px;
  font-weight: 700;
}

.institution-tag:nth-child(2) {
  background: rgba(247, 194, 75, 0.12);
  color: #e0aa2a;
}

.meta-row,
.info-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.price {
  color: #f2736d;
  font-size: 18px;
  font-weight: 800;
}

.rating {
  color: #f2b820;
  font-size: 14px;
  font-weight: 800;
}

.info-row {
  margin-top: 8px;
  color: #b7bbc2;
  font-size: 12px;
  font-weight: 700;
}
</style>
