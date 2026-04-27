<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { PageComponentProps } from '@ihc/page-core/types'
import { Headset, Share, Star } from '@icon-park/vue-next'
import {
  getElderlyCareServiceDetail,
  getElderlyCareServices,
  type ServiceCatalogDetail,
} from '@/shared/api/service-catalog'
import {
  extractServiceTexts,
  normalizeServiceStringArray,
  readSelectedServiceContext,
  saveSelectedServiceContext,
} from '@/shared/service/catalog'
import mock from './mock'

const props = defineProps<PageComponentProps>()
const detailData = ref<ServiceCatalogDetail | null>(null)

const title = computed(() => detailData.value?.title || mock.title)
const subtitle = computed(() => {
  if (!detailData.value) {
    return mock.subtitle
  }

  const tags = normalizeServiceStringArray(detailData.value.tags)
  return detailData.value.summary || tags.join(' · ') || mock.subtitle
})
const priceText = computed(() => `¥ ${Math.round(detailData.value?.price ?? Number.parseInt(mock.price, 10))}起/月`)
const ratingText = computed(() => (detailData.value?.rating ?? Number(mock.rating)).toFixed(1))
const reviewCountText = computed(() => {
  if (detailData.value?.salesVolume) {
    return `${detailData.value.salesVolume}次服务`
  }

  return `${mock.ratingCount}人评价`
})
const addressText = computed(() => {
  if (!detailData.value?.institution) {
    return mock.address
  }

  return [
    detailData.value.institution.city,
    detailData.value.institution.district,
    detailData.value.institution.address,
  ]
    .filter(Boolean)
    .join(' ')
})
const coverUrl = computed(() => detailData.value?.coverUrl || '')
const tagList = computed(() => {
  const tags = normalizeServiceStringArray(detailData.value?.tags)
  return tags.length ? tags : mock.tags
})
const baseInfoRows = computed(() => {
  if (!detailData.value) {
    return mock.baseInfo
  }

  const regions = normalizeServiceStringArray(detailData.value.regionScope)
  const rows = [
    {
      label: '服务机构',
      value: detailData.value.institution?.name || title.value,
    },
    {
      label: '所在城市',
      value: [detailData.value.institution?.city, detailData.value.institution?.district].filter(Boolean).join(' ') || '待确认',
    },
    {
      label: '详细地址',
      value: detailData.value.institution?.address || '待确认',
    },
  ]

  if (regions.length) {
    rows.push({
      label: '覆盖区域',
      value: regions.join('、'),
    })
  }

  return rows
})
const serviceCards = computed(() => {
  const items = normalizeServiceStringArray(detailData.value?.serviceContent)

  if (!items.length) {
    return mock.services
  }

  return items.map((item) => ({
    title: item,
    desc: detailData.value?.summary || '可联系机构了解该项服务的具体安排和收费标准。',
  }))
})
const facilityRows = computed(() => {
  if (!detailData.value) {
    return mock.facilities
  }

  const rows = []
  const tags = normalizeServiceStringArray(detailData.value.tags)

  if (tags.length) {
    rows.push({
      label: '服务标签',
      value: tags.join('、'),
    })
  }

  if (detailData.value.institution?.rating !== null && detailData.value.institution?.rating !== undefined) {
    rows.push({
      label: '机构评分',
      value: detailData.value.institution.rating.toFixed(1),
    })
  }

  rows.push({
    label: '服务编码',
    value: detailData.value.code,
  })

  return rows.length ? rows : mock.facilities
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
    label: index === 0 ? '参观提醒' : `提醒${index + 1}`,
    value,
  }))
})

const goBack = () => {
  if (!props.navigation.navigateBack()) {
    props.navigation.reLaunch('service/elderly-care')
  }
}

function persistSelectedService(detail: ServiceCatalogDetail) {
  saveSelectedServiceContext({
    categorySlug: 'elderly-care',
    serviceId: detail.serviceId,
    title: detail.title,
    coverUrl: detail.coverUrl,
    price: detail.price,
  })
}

async function resolveServiceId() {
  const selectedService = readSelectedServiceContext()

  if (selectedService?.categorySlug === 'elderly-care' && selectedService.serviceId.trim()) {
    return selectedService.serviceId.trim()
  }

  const services = await getElderlyCareServices()
  return services.list[0]?.serviceId || ''
}

async function loadServiceDetail() {
  try {
    const serviceId = await resolveServiceId()

    if (!serviceId) {
      throw new Error('暂无可用养老机构服务')
    }

    const nextDetail = await getElderlyCareServiceDetail(serviceId)
    detailData.value = nextDetail
    persistSelectedService(nextDetail)
  } catch (error) {
    props.showToast(error instanceof Error ? error.message : '养老机构详情加载失败')
  }
}

const reserveVisit = () => {
  props.showToast('已为您提交参观预约')
}

onMounted(() => {
  void loadServiceDetail()
})
</script>

<template>
  <div class="elderly-detail-page">
    <section class="hero">
      <img v-if="coverUrl" class="hero-image" :src="coverUrl" :alt="title" />
      <div v-else class="hero-placeholder">
        <span>养老机构图片待添加</span>
      </div>
      <div class="hero-mask"></div>
      <div class="hero-actions">
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
        <p class="subtitle">{{ subtitle }}</p>
        <div class="price-line">
          <span class="price">{{ priceText }}</span>
          <span class="address">{{ addressText }}</span>
        </div>
        <div class="rating-line">
          <span class="stars">★★★★★</span>
          <strong>{{ ratingText }}</strong>
          <span>({{ reviewCountText }})</span>
        </div>
        <div class="tag-row">
          <span v-for="tag in tagList" :key="tag">{{ tag }}</span>
        </div>
      </section>

      <section class="content-section">
        <h2>机构信息</h2>
        <dl class="info-list">
          <div v-for="row in baseInfoRows" :key="row.label" class="info-row">
            <dt>{{ row.label }}</dt>
            <dd>{{ row.value }}</dd>
          </div>
        </dl>
      </section>

      <section class="content-section">
        <h2>服务内容</h2>
        <div class="service-grid">
          <article v-for="item in serviceCards" :key="item.title" class="service-card">
            <strong>{{ item.title }}</strong>
            <p>{{ item.desc }}</p>
          </article>
        </div>
      </section>

      <section class="content-section">
        <h2>服务配置</h2>
        <dl class="info-list">
          <div v-for="row in facilityRows" :key="row.label" class="info-row">
            <dt>{{ row.label }}</dt>
            <dd>{{ row.value }}</dd>
          </div>
        </dl>
      </section>

      <section class="content-section">
        <h2>机构详情</h2>
        <p class="detail-text">{{ detailText }}</p>
      </section>

      <section class="content-section">
        <h2>入住须知</h2>
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

    <div class="reserve-bar">
      <button class="reserve-button" type="button" @click="reserveVisit">预约参观</button>
    </div>
  </div>
</template>

<style scoped>
.elderly-detail-page {
  position: relative;
  left: 50%;
  width: min(402px, 100vw);
  min-height: var(--ihc-page-min-height);
  margin: -18px 0;
  padding-top: 16px;
  padding-bottom: 82px;
  box-sizing: border-box;
  transform: translateX(-50%);
  background: #f3f4f6;
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

.hero-placeholder {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  background:
    linear-gradient(135deg, rgba(106, 114, 244, 0.16), rgba(118, 214, 184, 0.16)),
    #edf1f7;
  color: #7f8899;
  font-size: 15px;
  font-weight: 800;
}

.hero-mask {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(0, 0, 0, 0.22) 0%, rgba(0, 0, 0, 0.03) 56%, rgba(0, 0, 0, 0) 100%);
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
  margin: 0 0 8px;
  color: #34383f;
  font-size: 24px;
  font-weight: 800;
  line-height: 1.35;
  letter-spacing: 0;
}

.subtitle {
  margin: 0 0 16px;
  color: #8e9299;
  font-size: 14px;
  font-weight: 700;
}

.price-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 18px;
}

.price {
  flex: 0 0 auto;
  color: #f2736d;
  font-size: 23px;
  font-weight: 800;
}

.address {
  min-width: 0;
  overflow: hidden;
  color: #9b9ea3;
  font-size: 13px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
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

.tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 16px;
}

.tag-row span {
  height: 25px;
  display: inline-flex;
  align-items: center;
  padding: 0 9px;
  border-radius: 5px;
  background: rgba(77, 205, 162, 0.1);
  color: #31bf99;
  font-size: 12px;
  font-weight: 800;
}

.tag-row span:nth-child(2) {
  background: rgba(247, 194, 75, 0.12);
  color: #e0aa2a;
}

.tag-row span:nth-child(3) {
  background: rgba(106, 114, 244, 0.1);
  color: #6a72f4;
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

.service-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.service-card {
  min-height: 118px;
  padding: 14px 12px;
  box-sizing: border-box;
  border: 1px solid #eeeeef;
  border-radius: 8px;
  background: #fbfbfc;
}

.service-card strong {
  display: block;
  margin-bottom: 8px;
  color: #34383f;
  font-size: 16px;
  font-weight: 800;
}

.service-card p,
.detail-text {
  margin: 0;
  color: #34383f;
  font-size: 14px;
  font-weight: 700;
  line-height: 1.75;
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

.reserve-bar {
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

.reserve-button {
  width: 350px;
  height: 48px;
  display: block;
  margin: 0 auto;
  border: 0;
  border-radius: 8px;
  background: #6a72f4;
  color: #fff;
  font-size: 19px;
  font-weight: 800;
  letter-spacing: 0;
  cursor: pointer;
}
</style>
