<script setup lang="ts">
import type { PageComponentProps } from '@ihc/page-core/types'
import { Headset, Share, Star } from '@icon-park/vue-next'
import mock from './mock'

const props = defineProps<PageComponentProps>()

const goBack = () => {
  if (!props.navigation.navigateBack()) {
    props.navigation.reLaunch('service/home-care')
  }
}

const buyNow = () => {
  props.navigation.navigateTo('service/booking')
}
</script>

<template>
  <div class="service-detail-page">
    <section class="hero">
      <img class="hero-image" :src="mock.image" :alt="mock.title" />
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
        <h1>{{ mock.title }}</h1>
        <div class="price-line">
          <span class="price">¥ {{ mock.price }}</span>
          <span class="discount">{{ mock.discount }}</span>
        </div>
        <div class="rating-line">
          <span class="stars">★★★★★</span>
          <strong>{{ mock.rating }}</strong>
          <span>({{ mock.ratingCount }}人评论)</span>
        </div>
      </section>

      <section class="content-section">
        <h2>服务内容</h2>
        <dl class="info-list">
          <div v-for="row in mock.serviceContent" :key="row.label" class="info-row">
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
        <p class="detail-text">{{ mock.detail }}</p>
      </section>

      <section class="content-section">
        <h2>购买须知</h2>
        <dl class="info-list">
          <div v-for="row in mock.notice" :key="row.label" class="info-row">
            <dt>{{ row.label }}</dt>
            <dd>{{ row.value }}</dd>
          </div>
        </dl>
      </section>

      <section class="review-section">
        <div class="review-heading">
          <h2>用户评价（{{ mock.ratingCount }}）</h2>
          <span>{{ mock.rating }}</span>
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
  color: #f1726c;
  font-size: 22px;
  font-weight: 800;
}

.discount {
  height: 24px;
  display: inline-flex;
  align-items: center;
  padding: 0 8px;
  border: 1px solid #f1726c;
  border-radius: 8px;
  color: #f1726c;
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
  background: linear-gradient(90deg, #ff7d74 0%, #f5c65d 100%);
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
  background: #6870f2;
  color: #fff;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 0;
  cursor: pointer;
}
</style>
