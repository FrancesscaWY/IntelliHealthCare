<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { PageComponentProps } from '@ihc/page-core/types'
import { Headset, Share, Star } from '@icon-park/vue-next'
import { getHomeCareServiceDetail, getHomeCareServices, type ServiceCatalogDetail } from '@/shared/api/service-catalog'
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

  if (durationText) {
    rows.push({ label: '服务时长', value: durationText })
  }

  if (regions.length) {
    rows.push({ label: '服务区域', value: regions.join('、') })
  }

  if (tags.length) {
    rows.push({ label: '服务标签', value: tags.join('、') })
  }

  if (contentItems.length) {
    rows.push({ label: '服务内容', value: contentItems.join('、') })
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
    props.navigation.reLaunch('service/home-care')
  }
}

function persistSelectedService(detail: ServiceCatalogDetail) {
  saveSelectedServiceContext({
    categorySlug: 'home-care',
    serviceId: detail.serviceId,
    title: detail.title,
    coverUrl: detail.coverUrl,
    price: detail.price,
  })
}

async function resolveServiceId() {
  const selectedService = readSelectedServiceContext()

  if (selectedService?.categorySlug === 'home-care' && selectedService.serviceId.trim()) {
    return selectedService.serviceId.trim()
  }

  const services = await getHomeCareServices()
  return services.list[0]?.serviceId || ''
}

async function loadServiceDetail() {
  try {
    const serviceId = await resolveServiceId()

    if (!serviceId) {
      throw new Error('暂无可用家政护理服务')
    }

    const nextDetail = await getHomeCareServiceDetail(serviceId)
    detailData.value = nextDetail
    persistSelectedService(nextDetail)
  } catch (error) {
    props.showToast(error instanceof Error ? error.message : '家政护理详情加载失败')
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
  <div class="service-detail-page">
    <section class="hero">
      <img class="hero-image" :src="image" :alt="title" />
      <div class="hero-mask"></div><div class="hero-actions">
        <button class="back-button" type="button" aria-label="返回" @click="goBack">‹</button>
        <div class="action-icons">
          <button class="icon-button" type="button" aria-label="客服">
            <Headset theme="outline" size="22" fill="#fff" />
          </button>
          <button class="icon-button" type="button" aria-label="收藏">
            <Star theme="outline" size="22" fill="#fff" />
          </button>
          <button class="icon-button" type="button" aria-label="转发">
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
.service-detail-page {
  position: relative;
  left: 50%;
  width: min(402px, 100vw);
  min-height: 874px;
  margin: -18px 0;
  transform: translateX(-50%);
  padding-top: 16px;
  padding-bottom: 82px;
  box-sizing: border-box;
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
  object-fit: cover;
  display: block;
}

.hero-mask {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(0, 0, 0, 0.28) 0%, rgba(0, 0, 0, 0.04) 52%, rgba(0, 0, 0, 0) 100%);
}

.hero-actions {
  position: absolute;
  top: 40px;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  box-sizing: border-box;
  color: #fff;
}

.back-button {
  width: 28px;
  height: 34px;
  padding: 0;
  border: 0;
  background: transparent;
  color: #fff;
  font-size: 38px;
  line-height: 30px;
  font-weight: 300;
  cursor: pointer;
}

.action-icons {
  display: flex;
  align-items: center;
  gap: 18px;
}

.icon-button {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 0;
  background: transparent;
  color: #fff;
  cursor: pointer;
}

.detail-panel {
  position: relative;
  z-index: 2;
  margin-top: -22px;
  padding: 24px 22px 0;
  border-radius: 18px 18px 0 0;
  background: #fff;
}

.summary-section {
  padding-bottom: 20px;
  border-bottom: 1px solid #ececec;
}

.summary-section h1 {
  margin: 0 0 14px;
  color: #34383f;
  font-size: 20px;
  font-weight: 800;
  line-height: 1.35;
  letter-spacing: 0;
}

.price-line {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}

.price {
  color: #006DFF;
  font-size: 22px;
  font-weight: 800;
}

.discount {
  height: 24px;
  display: inline-flex;
  align-items: center;
  padding: 0 8px;
  border: 1px solid #75d6df;
  border-radius: 8px;
  color: #2d90f0;
  font-size: 13px;
  font-weight: 600;
}

.rating-line {
  display: flex;
  align-items: center;
  gap: 7px;
  color: #a6a8ad;
  font-size: 15px;
  font-weight: 600;
}

.stars {
  color: #f7bf22;
  letter-spacing: 0;
}

.rating-line strong {
  color: #34383f;
}

.content-section,
.review-section {
  padding: 24px 0;
  border-bottom: 1px solid #ececec;
}

.content-section h2,
.review-section h2 {
  margin: 0 0 18px;
  color: #34383f;
  font-size: 20px;
  font-weight: 800;
  letter-spacing: 0;
}

.info-list {
  margin: 0;
}

.info-row {
  display: grid;
  grid-template-columns: 84px 1fr;
  gap: 8px;
  margin-bottom: 10px;
  color: #34383f;
  font-size: 15px;
  line-height: 1.5;
}

.info-row:last-child {
  margin-bottom: 0;
}

.info-row dt {
  color: #a1a4aa;
  font-weight: 800;
}

.info-row dd {
  margin: 0;
  font-weight: 500;
}

.staff-list {
  display: flex;
  gap: 14px;
  overflow-x: auto;
  padding-bottom: 4px;
  scrollbar-width: none;
}

.staff-list::-webkit-scrollbar {
  display: none;
}

.staff-card {
  flex: 0 0 132px;
  min-height: 176px;
  padding: 14px 12px 16px;
  box-sizing: border-box;
  border: 1px solid #eceef1;
  border-radius: 8px;
  background: #fff;
  text-align: center;
}

.staff-photo {
  width: 72px;
  height: 72px;
  display: block;
  margin: 0 auto;
  border-radius: 50%;
  object-fit: cover;
  object-position: center;
}

.staff-badge {
  width: 76px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: -17px auto 16px;
  border-radius: 8px;
  background: #75d6df;
  color: #fff;
  font-size: 13px;
  font-weight: 800;
}

.staff-card strong,
.staff-card p {
  display: block;
}

.staff-card strong {
  font-size: 20px;
  color: #34383f;
}

.staff-card p {
  margin: 10px 0 0;
  color: #a1a4aa;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.55;
  text-align: left;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.detail-text {
  margin: 0;
  color: #34383f;
  font-size: 15px;
  line-height: 1.65;
  font-weight: 500;
}

.review-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.review-heading span {
  color: #f7bf22;
  font-size: 20px;
  font-weight: 800;
}

.review-card {
  padding: 18px 0;
  border-bottom: 1px solid #ececec;
}

.review-card:last-child {
  border-bottom: 0;
}

.review-top {
  display: grid;
  grid-template-columns: 48px 1fr auto;
  gap: 10px;
  align-items: center;
}

.review-avatar {
  width: 42px;
  height: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #34383f;
  color: #fff;
  font-size: 18px;
  font-weight: 800;
}

.review-user strong,
.review-user span,
.review-score strong,
.review-score span {
  display: block;
}

.review-user strong {
  color: #34383f;
  font-size: 16px;
}

.review-user span {
  margin-top: 5px;
  color: #b5b7bd;
  font-size: 13px;
  font-weight: 600;
}

.review-score {
  text-align: right;
}

.review-score strong {
  color: #34383f;
  font-size: 17px;
}

.review-score span {
  margin-top: 6px;
  color: #f7bf22;
  font-size: 13px;
  letter-spacing: 0;
}

.review-card p {
  margin: 14px 0 0;
  color: #34383f;
  font-size: 15px;
  line-height: 1.7;
  font-weight: 500;
}

.buy-bar {
  position: fixed;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);

  width: 100%;
  max-width: 402px;
  padding: 12px 0;
  background: #fff;
  box-sizing: border-box;
  z-index: 999;
}

.buy-button {
  width: 100%;
  height: 48px;
  border: 0;
  border-radius: 8px;
  background: #75d6df;
  color: #fff;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 0;
  cursor: pointer;
}
</style>
