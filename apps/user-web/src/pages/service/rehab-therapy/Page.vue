<script setup lang="ts">
import { computed, ref } from 'vue'
import type { PageComponentProps } from '@ihc/page-core/types'
import mock from './mock'

const props = defineProps<PageComponentProps>()

type FilterKey = 'popular' | 'sales' | 'price'

const activeFilter = ref<FilterKey>('popular')

const productList = computed(() => {
  if (activeFilter.value === 'price') {
    return [...mock.products].sort((a, b) => a.price - b.price)
  }

  if (activeFilter.value === 'sales') {
    return [...mock.products].sort((a, b) => b.sales - a.sales)
  }

  return mock.products
})

const goBack = () => {
  if (!props.navigation.navigateBack()) {
    props.navigation.reLaunch('home/dashboard')
  }
}

const openProduct = () => {
  props.navigation.navigateTo('service/rehab-therapy-detail')
}
</script>

<template>
  <div class="rehab-page">
    <header class="page-header">
      <button class="back-button" type="button" aria-label="返回" @click="goBack">‹</button>
      <h1>康复理疗</h1>
    </header>

    <div class="filter-row" role="tablist" aria-label="康复理疗排序">
      <button
        v-for="item in mock.filters"
        :key="item.key"
        class="filter-button"
        :class="{ active: activeFilter === item.key, 'filter-button--price': item.key === 'price' }"
        type="button"
        role="tab"
        :aria-selected="activeFilter === item.key"
        @click="activeFilter = item.key as FilterKey"
      >
        <span>{{ item.label }}</span>
        <span v-if="item.key === 'price'" class="price-arrows" aria-hidden="true">
          <i></i>
          <i></i>
        </span>
      </button>
    </div>

    <section class="product-grid" aria-label="康复理疗项目">
      <article v-for="item in productList" :key="item.id" class="product-card" @click="openProduct">
        <img class="product-image" :src="item.image" :alt="item.title" />
        <h2>{{ item.title }}</h2>
        <div class="tag-row">
          <span v-for="tag in item.tags" :key="tag" class="product-tag">{{ tag }}</span>
        </div>
        <div class="meta-row">
          <span class="price">¥{{ item.price }}</span>
          <span class="sales">已售 {{ item.sales }}</span>
        </div>
      </article>
    </section>
  </div>
</template>

<style scoped>
.rehab-page {
  position: relative;
  left: 50%;
  width: min(402px, 100vw);
  min-height: 874px;
  margin: -18px 0;
  padding: 16px 22px 28px;
  box-sizing: border-box;
  transform: translateX(-50%);
  overflow-x: hidden;
  background: #ffffff;
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
  border-color: #75d6df;
  background: #75d6df;
  color: #fff;
  box-shadow: 0 8px 18px rgba(45, 144, 240, 0.16);
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

.product-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  column-gap: 18px;
  row-gap: 34px;
  padding-bottom: 24px;
}

.product-card {
  min-width: 0;
  cursor: pointer;
  transition: transform 0.18s ease;
}

.product-card:nth-child(even) {
  transform: translateY(28px);
}

.product-image {
  width: 100%;
  height: 186px;
  display: block;
  border-radius: 10px;
  object-fit: cover;
  background: #e9eef6;
}

.product-card h2 {
  margin: 13px 0 10px;
  color: #34383f;
  font-size: 18px;
  font-weight: 800;
  line-height: 1.25;
  letter-spacing: 0;
}

.tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.product-tag {
  height: 24px;
  display: inline-flex;
  align-items: center;
  padding: 0 7px;
  border-radius: 4px;
  background: rgba(51, 201, 158, 0.1);
  color: #12bfae;
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
}

.product-tag:nth-child(2) {
  background: rgba(246, 201, 92, 0.12);
  color: #BE2DEA;
}

.meta-row {
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.price {
  color: #006DFF;
  font-size: 20px;
  font-weight: 800;
}

.sales {
  color: #c4c6cc;
  font-size: 14px;
  font-weight: 700;
  white-space: nowrap;
}
</style>
