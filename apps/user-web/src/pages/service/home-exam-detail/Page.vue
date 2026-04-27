<script setup lang="ts">
import { computed, onMounted, ref, type Component } from 'vue'
import type { PageComponentProps } from '@ihc/page-core/types'
import Calendar from '@icon-park/vue-next/es/icons/Calendar'
import Check from '@icon-park/vue-next/es/icons/Check'
import Headset from '@icon-park/vue-next/es/icons/Headset'
import Hospital from '@icon-park/vue-next/es/icons/Hospital'
import MedicalFiles from '@icon-park/vue-next/es/icons/MedicalFiles'
import Share from '@icon-park/vue-next/es/icons/Share'
import Star from '@icon-park/vue-next/es/icons/Star'
import { getHomeExamServiceDetail, getHomeExamServices, type ServiceCatalogDetail } from '@/shared/api/service-catalog'
import {
  extractServiceTexts,
  formatServiceDiscountLabel,
  formatServiceDurationLabel,
  normalizeServiceStringArray,
  readSelectedServiceContext,
  saveSelectedServiceContext,
} from '@/shared/service/catalog'
import mock from './mock'
import { setOrderFlowService } from '@/pages/service/order-flow'

const props = defineProps<PageComponentProps>()
const detailData = ref<ServiceCatalogDetail | null>(null)

const flowIconMap: Record<string, Component> = {
  calendar: Calendar,
  medical: MedicalFiles,
  hospital: Hospital,
  check: Check,
}

const title = computed(() => detailData.value?.title || mock.title)
const image = computed(() => detailData.value?.coverUrl || mock.image)
const priceText = computed(() => `${(detailData.value?.price ?? Number(mock.price)).toFixed(2)}`)
const discountText = computed(() => {
  if (!detailData.value) {
    return mock.discount
  }

  return formatServiceDiscountLabel(detailData.value.price, detailData.value.marketPrice)
})
const ratingText = computed(() => (detailData.value?.rating ?? Number(mock.rating)).toFixed(1))
const reviewCountText = computed(() => {
  if (detailData.value?.salesVolume) {
    return `${detailData.value.salesVolume}次服务`
  }

  return `${mock.ratingCount}人评论`
})

const serviceContentRows = computed(() => {
  if (!detailData.value) {
    return mock.serviceContent
  }

  const durationText = formatServiceDurationLabel(detailData.value.durationMinutes)
  const regions = normalizeServiceStringArray(detailData.value.regionScope)
  const tags = normalizeServiceStringArray(detailData.value.tags)
  const contentItems = normalizeServiceStringArray(detailData.value.serviceContent)
  const rows = []

  if (contentItems.length) {
    rows.push({ label: '检查项目', value: contentItems.join('、') })
  }

  if (tags.length) {
    rows.push({ label: '服务标签', value: tags.join('、') })
  }

  if (regions.length) {
    rows.push({ label: '服务区域', value: regions.join('、') })
  }

  if (durationText) {
    rows.push({ label: '服务时长', value: durationText })
  }

  if (detailData.value.institution?.name) {
    rows.push({ label: '服务机构', value: detailData.value.institution.name })
  }

  return rows.length ? rows : mock.serviceContent
})

const detailText = computed(() => {
  if (!detailData.value) {
    return mock.detail
  }

  const snippetText = extractServiceTexts(detailData.value.ragSnippet)[0]
  const contentText = normalizeServiceStringArray(detailData.value.serviceContent).join('，')

  return detailData.value.summary || snippetText || contentText || mock.detail
})

const noticeRows = computed(() => {
  const texts = extractServiceTexts(detailData.value?.ragSnippet)

  if (!texts.length) {
    return mock.notice
  }

  return texts.map((value, index) => ({
    label: index === 0 ? '服务提醒' : `提醒${index + 1}`,
    value,
  }))
})

const goBack = () => {
  if (!props.navigation.navigateBack()) {
    props.navigation.reLaunch('service/home-exam')
  }
}

function persistSelectedService(detail: ServiceCatalogDetail) {
  saveSelectedServiceContext({
    categorySlug: 'home-exam',
    serviceId: detail.serviceId,
    title: detail.title,
    coverUrl: detail.coverUrl,
    price: detail.price,
  })
}

async function resolveServiceId() {
  const selectedService = readSelectedServiceContext()

  if (selectedService?.categorySlug === 'home-exam' && selectedService.serviceId.trim()) {
    return selectedService.serviceId.trim()
  }

  const services = await getHomeExamServices()
  return services.list[0]?.serviceId || ''
}

async function loadServiceDetail() {
  try {
    const serviceId = await resolveServiceId()

    if (!serviceId) {
      throw new Error('暂无可用上门体检服务')
    }

    const nextDetail = await getHomeExamServiceDetail(serviceId)
    detailData.value = nextDetail
    persistSelectedService(nextDetail)
  } catch (error) {
    props.showToast(error instanceof Error ? error.message : '上门体检详情加载失败')
  }
}

const buyNow = () => {
  if (detailData.value) {
    persistSelectedService(detailData.value)
  }

  props.navigation.navigateTo('service/booking')
}

onMounted(() => {
  void loadServiceDetail()
})
</script>

<template>
  <div class="exam-detail-page">
    <section class="hero">
      <img class="hero-image" :src="image" :alt="title" />
      <div class="hero-mask"></div><div class="hero-actions">
        <button class="back-button" type="button" aria-label="返回" @click="goBack">‹</button>
        <div class="action-icons">
          <button class="icon-button" type="button" aria-label="客服" @click="props.showToast('客服功能待接入')">
            <Headset theme="outline" size="22" fill="#fff" />
          </button>
          <button class="icon-button" type="button" aria-label="收藏" @click="props.showToast('已收藏')">
            <Star theme="outline" size="22" fill="#fff" />
          </button>
          <button class="icon-button" type="button" aria-label="转发" @click="props.showToast('转发功能待接入')">
            <Share theme="outline" size="22" fill="#fff" />
          </button>
        </div>
      </div>
    </section>

    <main class="detail-panel">
      <section class="summary-section">
        <h1>{{ title }}</h1>
        <div class="price-line">
          <span class="price">¥ {{ priceText }}</span>
          <span class="discount">{{ discountText }}</span>
        </div>
        <div class="rating-line">
          <span class="stars">★★★★★</span>
          <strong>{{ ratingText }}</strong>
          <span>({{ reviewCountText }})</span>
        </div>
      </section>

      <section class="content-section flow-section">
        <h2>服务流程</h2>
        <div class="flow-row">
          <template v-for="(item, index) in mock.flow" :key="item.id">
            <div class="flow-item">
              <span class="flow-icon">
                <component :is="flowIconMap[item.icon]" theme="filled" size="20" fill="#34383f" />
              </span>
              <strong>{{ item.label }}</strong>
            </div>
            <span v-if="index < mock.flow.length - 1" class="flow-arrow">→</span>
          </template>
        </div>
      </section>

      <section class="content-section">
        <h2>服务内容</h2>
        <dl class="info-list">
          <div v-for="row in serviceContentRows" :key="row.label" class="info-row">
            <dt>{{ row.label }}</dt>
            <dd>{{ row.value }}</dd>
          </div>
        </dl>
      </section>

      <section class="content-section">
        <h2>服务人员</h2>
        <div class="staff-list">
          <article v-for="person in mock.staff" :key="person.id" class="staff-card">
            <img class="staff-photo" :src="person.image" :alt="person.name" />
            <div class="staff-badge">{{ person.badge }}</div>
            <strong>{{ person.name }}</strong>
            <p>{{ person.description }}</p>
          </article>
        </div>
      </section>

      <section class="content-section">
        <h2>服务详情</h2>
        <p class="detail-text">{{ detailText }}</p>
      </section>

      <section class="content-section">
        <h2>购买须知</h2>
        <dl class="info-list">
          <div v-for="row in noticeRows" :key="row.label" class="info-row">
            <dt>{{ row.label }}</dt>
            <dd>{{ row.value }}</dd>
          </div>
        </dl>
      </section>

      <section class="review-section">
        <div class="review-heading">
          <h2>用户评价（{{ reviewCountText }}）</h2>
          <span>{{ ratingText }}</span>
        </div>

        <article v-for="review in mock.reviews" :key="review.id" class="review-card">
          <div class="review-top">
            <div class="review-avatar">{{ review.name.slice(0, 1) }}</div>
            <div class="review-user">
              <strong>{{ review.name }}</strong>
              <span>{{ review.meta }}</span>
            </div>
            <div class="review-score">
              <strong>{{ review.score }}</strong>
              <span>★★★★★</span>
            </div>
          </div>
          <p>{{ review.content }}</p>
        </article>
      </section>
    </main>

    <div class="buy-bar">
      <button class="buy-button" type="button" @click="buyNow">立即购买</button>
    </div>
  </div>
</template>

<style scoped>
.exam-detail-page {
  position: relative;
  left: 50%;
  width: min(402px, 100vw);
  min-height: var(--ihc-page-min-height);
  margin: -18px 0;
  padding-top: 16px;
  padding-bottom: 82px;
  box-sizing: border-box;
  transform: translateX(-50%);
  background: #ffffff;
  color: #34383f;
  font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif;
}

.hero {
  position: relative;
  height: 250px;
  overflow: hidden;
  background: #d8d8d8;
}

.hero-image {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
}

.hero-mask {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(0, 0, 0, 0.2) 0%, rgba(0, 0, 0, 0.03) 56%, rgba(0, 0, 0, 0) 100%);
}

.hero-actions {
  position: absolute;
  top: 52px;
  left: 18px;
  right: 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.back-button,
.icon-button {
  display: grid;
  place-items: center;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
}

.back-button {
  width: 28px;
  height: 34px;
  color: #fff;
  font-size: 38px;
  line-height: 30px;
}

.action-icons {
  display: flex;
  align-items: center;
  gap: 22px;
}

.icon-button {
  width: 28px;
  height: 28px;
}

.detail-panel {
  position: relative;
  margin-top: -26px;
  padding: 0 21px 12px;
  border-radius: 20px 20px 0 0;
  background: #fff;
  overflow: hidden;
}

.summary-section,
.content-section,
.review-section {
  border-bottom: 1px solid #eeeeef;
}

.summary-section {
  padding: 28px 0 22px;
}

.summary-section h1 {
  margin: 0 0 18px;
  color: #34383f;
  font-size: 22px;
  font-weight: 800;
  line-height: 1.35;
  letter-spacing: 0;
}

.price-line {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 20px;
}

.price {
  color: #006DFF;
  font-size: 24px;
  font-weight: 800;
}

.discount {
  height: 21px;
  display: inline-flex;
  align-items: center;
  padding: 0 8px;
  border: 1px solid #75d6df;
  border-radius: 5px;
  color: #2d90f0;
  font-size: 13px;
  font-weight: 700;
}

.rating-line {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #9b9ea3;
  font-size: 15px;
  font-weight: 700;
}

.stars {
  color: #f7bf24;
  font-size: 15px;
  letter-spacing: 1px;
}

.rating-line strong {
  color: #34383f;
  font-size: 16px;
}

.content-section {
  padding: 24px 0 26px;
}

.content-section h2,
.review-heading h2 {
  margin: 0 0 20px;
  color: #34383f;
  font-size: 21px;
  font-weight: 800;
  letter-spacing: 0;
}

.flow-section {
  padding-bottom: 24px;
}

.flow-row {
  display: grid;
  grid-template-columns: 1fr 20px 1fr 20px 1fr 20px 1fr;
  align-items: start;
  gap: 4px;
}

.flow-item {
  min-width: 0;
  display: grid;
  justify-items: center;
  gap: 12px;
  text-align: center;
}

.flow-icon {
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  border: 1px solid #eeeeef;
  border-radius: 50%;
  background: #fbfbfc;
  box-shadow: 0 2px 8px rgba(35, 39, 50, 0.04);
}

.flow-item strong {
  color: #34383f;
  font-size: 13px;
  font-weight: 800;
  line-height: 1.25;
}

.flow-arrow {
  padding-top: 11px;
  color: #111;
  font-size: 22px;
  font-weight: 600;
  text-align: center;
}

.info-list {
  margin: 0;
}

.info-row {
  display: grid;
  grid-template-columns: 86px 1fr;
  column-gap: 8px;
  margin-bottom: 12px;
}

.info-row:last-child {
  margin-bottom: 0;
}

.info-row dt {
  color: #9da0a6;
  font-size: 15px;
  font-weight: 800;
}

.info-row dd {
  min-width: 0;
  margin: 0;
  color: #34383f;
  font-size: 15px;
  font-weight: 700;
  line-height: 1.65;
}

.staff-list {
  display: flex;
  gap: 12px;
  overflow-x: auto;
  padding-bottom: 2px;
  scrollbar-width: none;
}

.staff-list::-webkit-scrollbar {
  display: none;
}

.staff-card {
  width: 112px;
  flex: 0 0 112px;
  min-height: 158px;
  position: relative;
  padding: 12px 10px 10px;
  box-sizing: border-box;
  border: 1px solid #eeeeef;
  border-radius: 8px;
  background: #fff;
  text-align: center;
}

.staff-photo {
  width: 62px;
  height: 62px;
  display: block;
  margin: 0 auto 4px;
  border-radius: 50%;
  object-fit: cover;
}

.staff-badge {
  width: 72px;
  height: 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin: -9px auto 8px;
  border-radius: 6px;
  background: #75d6df;
  color: #fff;
  font-size: 11px;
  font-weight: 800;
}

.staff-card strong {
  display: block;
  margin-bottom: 5px;
  color: #34383f;
  font-size: 17px;
  font-weight: 800;
}

.staff-card p {
  display: -webkit-box;
  margin: 0;
  overflow: hidden;
  color: #8e9299;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.45;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
}

.detail-text {
  margin: 0;
  color: #34383f;
  font-size: 15px;
  font-weight: 700;
  line-height: 1.8;
}

.review-section {
  padding: 24px 0 26px;
  border-bottom: 0;
}

.review-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.review-heading span {
  color: #f4bf25;
  font-size: 21px;
  font-weight: 800;
}

.review-card {
  padding: 16px 0;
  border-bottom: 1px solid #eeeeef;
}

.review-top {
  display: grid;
  grid-template-columns: 42px 1fr auto;
  gap: 12px;
  align-items: center;
  margin-bottom: 12px;
}

.review-avatar {
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: #e8edf7;
  color: #59616f;
  font-size: 16px;
  font-weight: 800;
}

.review-user strong,
.review-score strong {
  display: block;
  color: #34383f;
  font-size: 15px;
  font-weight: 800;
}

.review-user span {
  color: #b2b5bb;
  font-size: 13px;
  font-weight: 700;
}

.review-score {
  text-align: right;
}

.review-score span {
  color: #f4bf25;
  font-size: 12px;
  letter-spacing: 1px;
}

.review-card p {
  margin: 0;
  color: #34383f;
  font-size: 15px;
  font-weight: 700;
  line-height: 1.8;
}

.buy-bar {
  position: fixed;
  left: 50%;
  bottom: 0;
  width: min(402px, 100vw);
  transform: translateX(-50%);
  padding: 14px 0 20px;
  box-sizing: border-box;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 -8px 20px rgba(37, 41, 57, 0.04);
}

.buy-button {
  width: 350px;
  height: 48px;
  display: block;
  margin: 0 auto;
  border: 0;
  border-radius: 8px;
  background: #75d6df;
  color: #fff;
  font-size: 19px;
  font-weight: 800;
  letter-spacing: 0;
  cursor: pointer;
}
</style>
