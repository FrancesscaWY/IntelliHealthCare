<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type { PageComponentProps } from '@ihc/page-core/types'
import { Alignment, Fit, Layout, Rive } from '@rive-app/canvas'
import assistantRiveUrl from '@/assets/home/sections/assistant.riv?url'
import mock from './mock'

const props = defineProps<PageComponentProps>()

const activeCategory = ref(mock.categories[0]?.key ?? '')
const assistantCanvasRef = ref<HTMLCanvasElement | null>(null)

const packageList = computed(() => mock.packages)

let assistantRive: Rive | null = null
let assistantResizeObserver: ResizeObserver | null = null

const goBack = () => {
  if (!props.navigation.navigateBack()) {
    props.navigation.reLaunch('home/dashboard')
  }
}

const openPackage = () => {
  props.navigation.navigateTo('service/home-exam-detail')
}

const openSmartRecommend = () => {
  props.showToast('AI 推荐入口暂时关闭')
}

const resizeAssistant = () => {
  assistantRive?.resizeDrawingSurfaceToCanvas()
}

onMounted(() => {
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
  <div class="home-exam-page">
    <header class="page-header">
      <button class="back-button" type="button" aria-label="返回" @click="goBack">‹</button>
      <h1>上门体检</h1>
    </header>

    <button class="smart-recommend-entry" type="button" @click="openSmartRecommend">
      <span class="smart-assistant" aria-hidden="true">
        <canvas ref="assistantCanvasRef" width="110" height="110"></canvas>
      </span>
      <span class="smart-entry-text">点击为您推荐最合适项目</span>
      <span class="smart-entry-action">进入</span>
    </button>

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
  background: #ffffff;
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

.smart-recommend-entry {
  position: relative;
  width: 100%;
  height: 80px;
  display: grid;
  grid-template-columns: 74px 1fr 58px;
  align-items: center;
  gap: 10px;
  margin: 4px 0 18px;
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
  color: #1f2a44;
  font-size: 16px;
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

.exam-layout {
  display: grid;
  grid-template-columns: 98px 1fr;
  gap: 14px;
  align-items: start;
  margin-top: 0;
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
  background: rgba(26, 231, 206, 0.13);
  color: #2d90f0;
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
  color: #006DFF;
  font-size: 17px;
  font-weight: 800;
}
</style>
