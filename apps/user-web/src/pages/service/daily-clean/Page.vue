<script setup lang="ts">
import { computed, ref } from 'vue'
import type { PageComponentProps } from '@ihc/page-core/types'
import mock from './mock'

const props = defineProps<PageComponentProps>()

const activeTab = ref<'hot' | 'new'>('hot')
const tabs = [
  { key: 'hot', label: '最热' },
  { key: 'new', label: '最新' },
] as const

const serviceList = computed(() => {
  if (activeTab.value === 'new') {
    return [...mock.serviceList].reverse()
  }

  return mock.serviceList
})

const goBack = () => {
  if (!props.navigation.navigateBack()) {
    history.back()
  }
}
</script>

<template>
  <div class="daily-clean-page"><div class="page-header">
      <button class="back-button" type="button" aria-label="返回" @click="goBack">‹</button>
      <h1>日常清洁</h1>
    </div>

    <div class="tabs" role="tablist" aria-label="清洁服务排序">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        class="tab-button"
        :class="{ active: activeTab === tab.key }"
        type="button"
        role="tab"
        :aria-selected="activeTab === tab.key"
        @click="activeTab = tab.key"
      >
        {{ tab.label }}
      </button>
    </div>

    <div class="service-list">
      <article v-for="item in serviceList" :key="item.id" class="service-card">
        <img class="service-image" :src="item.image" :alt="item.title" />
        <div class="service-content">
          <h2>{{ item.title }}</h2>
          <div class="service-bottom">
            <span class="price">¥{{ item.price }}</span>
            <span class="sales">已售 {{ item.sales }}</span>
          </div>
        </div>
      </article>
    </div>
  </div>
</template>

<style scoped>
.daily-clean-page {
  position: relative;
  left: 50%;
  width: min(402px, 100vw);
  min-height: var(--ihc-page-min-height);
  margin: -18px 0;
  transform: translateX(-50%);
  padding: 16px 20px 28px;
  box-sizing: border-box;
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
  font-size: 20px;
  font-weight: 500;
  color: #34383f;
}

.tabs {
  height: 34px;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  align-items: center;
  margin: 0 0 20px;
  padding: 4px;
  box-sizing: border-box;
  border-radius: 8px;
  background: #f0f0f0;
}

.tab-button {
  height: 26px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: #9d9fa4;
  font-size: 16px;
  font-weight: 700;
  line-height: 26px;
  cursor: pointer;
}

.tab-button.active {
  background: #fff;
  color: #777df4;
}

.service-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.service-card {
  min-height: 92px;
  display: grid;
  grid-template-columns: 108px 1fr;
  gap: 14px;
  padding: 10px 12px;
  box-sizing: border-box;
  border: 1px solid #ededed;
  border-radius: 14px;
  background: #fff;
}

.service-image {
  width: 108px;
  height: 72px;
  align-self: center;
  border-radius: 8px;
  object-fit: cover;
  display: block;
}

.service-content {
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.service-content h2 {
  margin: 2px 0 8px;
  color: #32363c;
  font-size: 18px;
  font-weight: 700;
  line-height: 1.28;
  letter-spacing: 0;
}

.service-bottom {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

.price {
  color: #f1736d;
  font-size: 22px;
  font-weight: 700;
}

.sales {
  color: #b9bbc1;
  font-size: 15px;
  font-weight: 600;
  white-space: nowrap;
}
</style>
