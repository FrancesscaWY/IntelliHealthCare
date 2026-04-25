<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type { PageComponentProps } from '@ihc/page-core/types'
import { Alignment, Fit, Layout, Rive } from '@rive-app/canvas'
import assistantRiveUrl from '@/assets/home/sections/assistant.riv?url'
import mock from './mock'
import { setOrderFlowService } from '@/pages/service/order-flow'

const props = defineProps<PageComponentProps>()

type FilterKey = 'popular' | 'sales' | 'price'

const activeFilter = ref<FilterKey>('popular')
const assistantCanvasRef = ref<HTMLCanvasElement | null>(null)

let assistantRive: Rive | null = null
let assistantResizeObserver: ResizeObserver | null = null

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
  const product = productList.value[0]
  setOrderFlowService({
    type: 'rehab',
    serviceId: 'srv_rehab_stroke',
    title: product?.title || '脑卒中术后康复套餐',
    price: product?.price || 1990,
    image: product?.image || '',
    detailPageId: 'service/rehab-therapy-detail',
    listPageId: 'service/rehab-therapy',
    couponAmount: 100,
    addressId: 'addr_joy_home',
    addressText: '上海市浦东新区丁香路168弄12号302室',
    contactName: '王秀珍',
    contactPhone: '13800138000',
  })
  props.navigation.navigateTo('service/rehab-therapy-detail')
}

const openSmartRecommend = () => {
  props.navigation.navigateTo('service/rehab-recommend-waiting')
}

const resizeAssistant = () => {
  assistantRive?.resizeDrawingSurfaceToCanvas()
}

onMounted(() => {
  const product = productList.value[0]
  setOrderFlowService({
    type: 'rehab',
    serviceId: 'srv_rehab_stroke',
    title: product?.title || '脑卒中术后康复套餐',
    price: product?.price || 1990,
    image: product?.image || '',
    detailPageId: 'service/rehab-therapy-detail',
    listPageId: 'service/rehab-therapy',
    couponAmount: 100,
    addressId: 'addr_joy_home',
    addressText: '上海市浦东新区丁香路168弄12号302室',
    contactName: '王秀珍',
    contactPhone: '13800138000',
  })
  if (!assistantCanvasRef.value) return

  assistantRive = new Rive({
    canvas: assistantCanvasRef.value,
    src: assistantRiveUrl,
    stateMachines: 'State Machine 1',
    autoplay: true,
    layout: new Layout({
      fit: Fit.Contain,
      alignment: Alignment.Center,
    }),
    onLoad: resizeAssistant,
  })

  assistantResizeObserver = new ResizeObserver(resizeAssistant)
  assistantResizeObserver.observe(assistantCanvasRef.value)
})

onBeforeUnmount(() => {
  assistantResizeObserver?.disconnect()
  assistantResizeObserver = null
  assistantRive?.cleanup()
  assistantRive = null
})
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

    <button class="smart-recommend-entry" type="button" @click="openSmartRecommend">
      <span class="smart-assistant" aria-hidden="true">
        <canvas ref="assistantCanvasRef" width="110" height="110"></canvas>
      </span>
      <span class="smart-entry-text">试试豆沙包为您推荐～</span>
      <span class="smart-entry-action">进入</span>
    </button>

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
  margin: 10px 0 18px;
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

.smart-recommend-entry {
  position: relative;
  width: 100%;
  height: 80px;
  display: grid;
  grid-template-columns: 74px 1fr 58px;
  align-items: center;
  gap: 10px;
  margin: 0 0 24px;
  padding: 10px 13px 12px 8px;
  overflow: hidden;
  border: 0;
  border-radius: 20px;
  background:
      radial-gradient(circle at 16% 28%, rgba(255, 255, 255, 0.92), transparent 34%),
      linear-gradient(105deg, rgba(117, 214, 223, 0.98) 0%, rgba(45, 144, 240, 0.72) 52%, rgba(123, 226, 142, 0.88) 100%);
  box-shadow: 0 14px 30px rgba(45, 144, 240, 0.14);
  color: #0a0e17;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  opacity: 0.86;
}

.smart-recommend-entry::after {
  position: absolute;
  right: -38px;
  bottom: -48px;
  width: 124px;
  height: 124px;
  content: "";
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.22);
}

.smart-assistant {
  position: relative;
  z-index: 1;
  width: 74px;
  height: 68px;
  display: grid;
  place-items: center;
  transform: translateX(-10px) translateY(-18px);
}

.smart-assistant canvas {
  display: block;
  width: 120px;
  height: 120px;
  filter: drop-shadow(0 8px 10px rgba(31, 42, 68, 0.13));
}

.smart-entry-text {
  position: relative;
  z-index: 1;
  color: #050303;
  font-size: 18px;
  font-weight: 900;
  line-height: 1.3;
}

.smart-entry-action {
  position: relative;
  z-index: 1;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.88);
  color: #1f2a44;
  font-size: 13px;
  font-weight: 900;
  box-shadow: 0 8px 16px rgba(31, 42, 68, 0.08);
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
