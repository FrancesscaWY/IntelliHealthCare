<template>
  <div class="home-care-page"><div class="page-header">
      <button class="back" type="button" aria-label="返回首页" @click="goBack">‹</button>
      <div class="title">家政护理</div>
    </div>

    <div class="search-box">
      <el-icon class="search-icon"><Search /></el-icon>
      <input v-model="keyword" type="text" placeholder="搜索" />
    </div>

    <button class="smart-recommend-entry" type="button" @click="openSmartRecommend">
      <span class="smart-assistant" aria-hidden="true">
        <canvas ref="assistantCanvasRef" width="110" height="110"></canvas>
      </span>
      <span class="smart-entry-text">试试豆沙包帮你推荐～</span>
      <span class="smart-entry-action">进入</span>
    </button>

    <view class="service-grid">
      <view
          v-for="item in serviceList"
          :key="item.id"
          class="service-item"
          @click="handleServiceClick(item)"
      >
        <view class="icon-box">
          <component
              :is="iconMap[item.type]"
              theme="outline"
              size="28"
              :fill="getIconColor(item.type)"
          />
        </view>
        <text>{{ item.name }}</text>
      </view>
    </view>

    <div class="discount-section">
      <div class="discount-header">
        <div class="discount-title">限时优惠</div>
        <div class="countdown">
          <span class="time-box">{{ countdown.hours }}</span>
          <span class="colon">:</span>
          <span class="time-box">{{ countdown.minutes }}</span>
          <span class="colon">:</span>
          <span class="time-box">{{ countdown.seconds }}</span>
        </div>
      </div>

      <div class="discount-scroll">
        <div
            v-for="item in discountList"
            :key="item.id"
            class="discount-card"
            @click="goDiscountDetail(item)"
        >
          <img class="discount-image" :src="item.image" :alt="item.title" />
          <div class="discount-card-title">{{ item.title }}</div>
          <div class="price-row">
            <span class="current-price">¥{{ item.price }}</span>
            <span class="old-price">¥{{ item.oldPrice }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="recommend-section">
      <div class="section-title">为您推荐</div>

      <div
          v-for="(item, index) in filteredRecommendList"
          :key="`${item.id}-${index}`"
          class="recommend-card"
          :style="{ zIndex: filteredRecommendList.length - index }"
          @click="goDetail(item)"
      >
        <div class="recommend-image-box">
          <img class="recommend-image" :src="item.image" :alt="item.title" />
        </div>
        <div class="recommend-content">
          <div class="recommend-title">{{ item.title }}</div>
          <div class="recommend-desc">{{ item.desc }}</div>
          <div class="recommend-bottom">
            <span class="recommend-price">¥{{ item.price }}</span>
            <span class="recommend-sales">已预约 {{ item.sales }} 次</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, reactive, ref } from 'vue'
import type { PageComponentProps } from '@ihc/page-core/types'
import { Alignment, Fit, Layout, Rive } from '@rive-app/canvas'
import assistantRiveUrl from '@/assets/home/sections/assistant.riv?url'
import { getHomeCareServices, type ServiceCatalogItem } from '@/shared/api/service-catalog'
import { normalizeServiceStringArray, saveSelectedServiceContext } from '@/shared/service/catalog'

import {
  Home,
  Heart,
  Cooking,
  Hospital,
  HeartRate,
  HospitalBed,
  MedicalFiles,
}
from '@icon-park/vue-next'
import mock, { type ServiceItem, type CareItem } from './mock'

const props = defineProps<PageComponentProps>()
const keyword = ref('')
const assistantCanvasRef = ref<HTMLCanvasElement | null>(null)

interface DisplayCareItem {
  id: string
  serviceId: string
  title: string
  desc: string
  image: string
  price: number
  oldPrice: number
  sales: number
  category: string
}

const serviceList = ref<ServiceItem[]>(mock.serviceList)
const recommendList = ref<DisplayCareItem[]>(createMockDisplayCareItems(mock.recommendList))
const discountList = ref<DisplayCareItem[]>(createMockDisplayCareItems(mock.discountList))

const iconMap: Record<string, any> = {
  life: Home,
  mental: HeartRate,
  medical:HospitalBed,
  cooking: Cooking,
  accompany:Hospital,
  health: Heart,
  clean: Home,
  rehab:MedicalFiles,
}

const getIconColor = (type: string): string => {
  const colorMap: Record<string, string> = {
    life: '#1AE7CE',
    medical: '#2D90F0',
    rehab: '#BE2DEA',
    mental: '#4B63FC',
    cooking: '#2D90F0',
    health: '#1AE7CE',
    accompany: '#2D90F0',
    clean: '#BE2DEA',
  }

  return colorMap[type] || '#999999'
}
const countdown = reactive({
  hours: mock.countdown.hour,
  minutes: mock.countdown.minute,
  seconds: mock.countdown.second,
})

let totalSeconds =
    Number(countdown.hours) * 3600 +
    Number(countdown.minutes) * 60 +
    Number(countdown.seconds)

let timer: number | null = null
let assistantRive: Rive | null = null
let assistantResizeObserver: ResizeObserver | null = null

const formatTime = (value: number): string => {
  return value < 10 ? `0${value}` : `${value}`
}

const startCountdown = () => {
  timer = window.setInterval(() => {
    if (totalSeconds <= 0) {
      if (timer) {
        clearInterval(timer)
      }
      return
    }

    totalSeconds--

    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60

    countdown.hours = formatTime(hours)
    countdown.minutes = formatTime(minutes)
    countdown.seconds = formatTime(seconds)
  }, 1000)
}

const filteredRecommendList = computed(() => {
  const text = keyword.value.trim()
  if (!text) return recommendList.value

  return recommendList.value.filter((item) => {
    return (
        item.title.includes(text) ||
        item.desc?.includes(text) ||
        item.category.includes(text)
    )
  })
})

const goBack = () => {
  props.navigation.reLaunch('home/dashboard')
}

const openSmartRecommend = () => {
  props.navigation.navigateTo('service/home-care-recommend-waiting')
}

const resizeAssistant = () => {
  assistantRive?.resizeDrawingSurfaceToCanvas()
}

function createMockDisplayCareItems(items: CareItem[]): DisplayCareItem[] {
  return items.map((item, index) => ({
    id: `mock-home-care-${index + 1}`,
    serviceId: `mock-home-care-${index + 1}`,
    title: item.title,
    desc: item.desc || '',
    image: item.image,
    price: item.price,
    oldPrice: item.oldPrice ?? item.price,
    sales: item.sales ?? 0,
    category: item.category,
  }))
}

function mapServiceItemToDisplayCareItem(item: ServiceCatalogItem): DisplayCareItem {
  const tags = normalizeServiceStringArray(item.tags)

  return {
    id: item.serviceId,
    serviceId: item.serviceId,
    title: item.title,
    desc: item.summary || tags.join('、') || item.institution?.name || '',
    image: item.coverUrl || mock.recommendList[0]?.image || '',
    price: item.price,
    oldPrice: item.marketPrice ?? item.price,
    sales: item.salesVolume,
    category: tags[0] || item.institution?.name || '家政护理',
  }
}

function openServiceDetail(item: DisplayCareItem) {
  saveSelectedServiceContext({
    categorySlug: 'home-care',
    serviceId: item.serviceId,
    title: item.title,
    coverUrl: item.image,
    price: item.price,
  })

  props.navigation.navigateTo('service/home-care-detail')
}

async function loadHomeCareServices() {
  try {
    const services = await getHomeCareServices()

    if (!services.list.length) {
      return
    }

    const nextItems = services.list.map(mapServiceItemToDisplayCareItem)
    recommendList.value = nextItems
    discountList.value = nextItems.slice(0, 5).map((item) => ({
      ...item,
      oldPrice: item.oldPrice || item.price,
    }))
  } catch (error) {
    props.showToast(error instanceof Error ? error.message : '家政护理加载失败')
  }
}

const handleServiceClick = (item: ServiceItem) => {
  if (item.type === 'clean') {
    props.navigation.navigateTo('service/daily-clean')
    return
  }

  console.log('点击服务分类：', item.name)
}

const goDiscountDetail = (item: DisplayCareItem) => {
  openServiceDetail(item)
}

const goDetail = (item: DisplayCareItem) => {
  openServiceDetail(item)
}

onMounted(() => {
  setOrderFlowService({
    type: 'homeCare',
    serviceId: 'srv_home_clean_2h',
    title: '日常清洁 2小时1人上门服务',
    price: 298,
    image: mock.discountList[0]?.image || mock.recommendList[0]?.image || '',
    detailPageId: 'service/home-care-detail',
    listPageId: 'service/home-care',
    couponAmount: 20,
    addressId: 'addr_joy_home',
    addressText: '上海市浦东新区丁香路168弄12号302室',
    contactName: '王秀珍',
    contactPhone: '13800138000',
  })
  startCountdown()
  void loadHomeCareServices()

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
  if (timer) {
    clearInterval(timer)
    timer = null
  }
  assistantResizeObserver?.disconnect()
  assistantResizeObserver = null
  assistantRive?.cleanup()
  assistantRive = null
})
</script>
<style scoped>
.home-care-page {
  position: relative;
  left: 50%;
  width: min(402px, 100vw);
  min-height: 874px;
  margin: -18px 0;
  transform: translateX(-50%);
  background: #ffffff;
  padding: 16px 16px 24px;
  box-sizing: border-box;
  font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei',
  sans-serif;
  color: #333;
}

.page-header {
  display: flex;
  align-items: center;
  margin-top: 4px;
  margin-bottom: 22px;
}

.back {
  width: 28px;
  height: 32px;
  padding: 0;
  border: 0;
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 6px;
  font-size: 40px;
  line-height: 28px;
  font-weight: 300;
  color: #333;
  cursor: pointer;
}

.title {
  font-size: 18px;
  font-weight: 700;
  color: #2a2a2a;
}

.search-box {
  height: 40px;
  border: 2px solid transparent;
  background:
      linear-gradient(#ffffff, #ffffff) padding-box,
      linear-gradient(92deg, #8e72e8 0%, #69d5d1 48%, #68db87 100%) border-box;
  border-radius: 18px;
  display: flex;
  align-items: center;
  padding: 0 16px;
  box-sizing: border-box;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03);
  margin-bottom: 28px;
}

.search-icon {
  font-size: 20px;
  color: #c7c7c7;
  margin-right: 10px;
}

.search-box input {
  flex: 1;
  height: 100%;
  border: none;
  outline: none;
  font-size: 16px;
  color: #333;
  background: transparent;
}

.search-box input::placeholder {
  color: #c7c7c7;
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
  color: #131b2e;
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

.service-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 22px 14px;
  margin-bottom: 28px;
}

.service-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
}

.service-icon {
  width: 72px;
  height: 72px;
  background: #fff;
  border-radius: 20px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.04);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30px;
  margin-bottom: 12px;
}

.service-name {
  font-size: 14px;
  font-weight: 600;
  color: #2f2f2f;
  text-align: center;
  line-height: 1.4;
}

.discount-section {
  background: #e9f8fb;
  border-radius: 22px;
  padding: 20px 14px 18px;
  margin-bottom: 28px;
}

.discount-header {
  display: flex;
  align-items: center;
  margin-bottom: 18px;
}

.discount-title {
  font-size: 18px;
  font-weight: 700;
  color: #2a2a2a;
  margin-right: 14px;
}

.countdown {
  display: flex;
  align-items: center;
}

.time-box {
  min-width: 38px;
  height: 34px;
  padding: 0 8px;
  background: #e9f8fb;
  color: #2d90f0;
  font-size: 15px;
  font-weight: 700;
  border-radius: 17px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
}

.colon {
  margin: 0 6px;
  color: #444;
  font-size: 16px;
  font-weight: 700;
}

.discount-scroll {
  display: flex;
  gap: 14px;
  overflow-x: auto;
  padding-bottom: 4px;
  scrollbar-width: none;
}

.discount-scroll::-webkit-scrollbar {
  display: none;
}

.discount-card {
  flex: 0 0 170px;
  background: #fff;
  border-radius: 18px;
  padding: 12px;
  box-sizing: border-box;
  cursor: pointer;
}

.discount-image {
  width: 100%;
  height: 120px;
  object-fit: cover;
  border-radius: 14px;
  display: block;
  margin-bottom: 12px;
}

.discount-card-title {
  font-size: 14px;
  font-weight: 600;
  line-height: 1.5;
  color: #2f2f2f;
  min-height: 42px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.price-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-top: 10px;
}

.current-price {
  font-size: 18px;
  font-weight: 700;
  color: #006DFF;
}

.old-price {
  font-size: 14px;
  color: #bfbfbf;
  text-decoration: line-through;
}

.recommend-section {
  margin-top: 4px;
  padding-bottom: 36px;
}

.section-title {
  font-size: 18px;
  font-weight: 700;
  color: #2a2a2a;
  margin-bottom: 18px;
}

.recommend-card {
  position: relative;
  background: #fff;
  border-radius: 22px;
  overflow: hidden;
  min-height: 168px;
  display: grid;
  grid-template-columns: 134px minmax(0, 1fr);
  align-items: stretch;
  margin-bottom: -26px;
  box-shadow:
      0 18px 34px rgba(42, 49, 69, 0.12),
      inset 0 1px 0 rgba(255, 255, 255, 0.72);
  cursor: pointer;
  transform: translateZ(0);
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}

.recommend-card:hover {
  transform: translateY(-4px);
  box-shadow:
      0 24px 42px rgba(42, 49, 69, 0.16),
      inset 0 1px 0 rgba(255, 255, 255, 0.72);
}

.recommend-card:nth-child(3n + 1) {
  background: #ffffff;
}

.recommend-card:nth-child(3n + 2) {
  background: #f8fbff;
}

.recommend-card:nth-child(3n) {
  background: #fffafa;
}

.recommend-card:last-child {
  margin-bottom: 0;
}

.recommend-image-box {
  align-self: center;
  width: 112px;
  height: 132px;
  margin-left: 14px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.72);
  padding: 8px;
  box-sizing: border-box;
  box-shadow: 0 12px 22px rgba(42, 49, 69, 0.12);
}

.recommend-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 12px;
  display: block;
}

.recommend-content {
  min-width: 0;
  padding: 20px 18px 18px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.recommend-title {
  font-size: 17px;
  font-weight: 700;
  color: #2f2f2f;
  line-height: 1.45;
  letter-spacing: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.recommend-desc {
  margin-top: 10px;
  font-size: 13px;
  line-height: 1.55;
  color: #888;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.recommend-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 16px;
}

.recommend-price {
  font-size: 18px;
  font-weight: 700;
  color: #006DFF;
}

.recommend-sales {
  font-size: 12px;
  color: #999;
}
</style>
