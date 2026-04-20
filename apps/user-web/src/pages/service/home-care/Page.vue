<template>
  <div class="home-care-page"><div class="page-header">
      <button class="back" type="button" aria-label="返回首页" @click="goBack">‹</button>
      <div class="title">家政护理</div>
    </div>

    <div class="search-box">
      <el-icon class="search-icon"><Search /></el-icon>
      <input v-model="keyword" type="text" placeholder="搜索" />
    </div>

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

const serviceList = ref<ServiceItem[]>(mock.serviceList)
const recommendList = ref<CareItem[]>(mock.recommendList)
const discountList = ref<CareItem[]>(mock.discountList)

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
    life: '#44c7a1',
    medical: '#6875f5',
    rehab: '#f0c85c',
    mental: '#3567e8',
    cooking: '#f47c73',
    health: '#42caa1',
    accompany: '#6b76f2',
    clean: '#e9c95f',
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

const handleServiceClick = (item: ServiceItem) => {
  if (item.type === 'clean') {
    props.navigation.navigateTo('service/daily-clean')
    return
  }

  console.log('点击服务分类：', item.name)
}

const goDiscountDetail = (_item: CareItem) => {
  props.navigation.navigateTo('service/home-care-detail')
}

const goDetail = (item: CareItem) => {
  console.log('跳转详情：', item.title)
}

onMounted(() => {
  startCountdown()
})

onBeforeUnmount(() => {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
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
  background: #f5f6f8;
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
  height: 52px;
  background: #fff;
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
  background: #dfeaf7;
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
  background: #eef3fb;
  color: #f27f79;
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
  color: #f37a72;
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
  color: #f37a72;
}

.recommend-sales {
  font-size: 12px;
  color: #999;
}
</style>
