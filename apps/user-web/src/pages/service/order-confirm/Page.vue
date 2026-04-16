<script setup lang="ts">
import type { PageComponentProps } from '@ihc/page-core/types'
import mock from './mock'

const props = defineProps<PageComponentProps>()

const goBack = () => {
  if (!props.navigation.navigateBack()) {
    props.navigation.reLaunch('service/booking')
  }
}

const submitOrder = () => {
  props.navigation.navigateTo('service/payment')
}
</script>

<template>
  <div class="order-confirm-page">
    <div class="status-bar">
      <span class="time">8:30</span>
      <div class="status-icons">
        <span class="signal">
          <i></i>
          <i></i>
          <i></i>
          <i></i>
        </span>
        <span class="wifi"></span>
        <span class="battery"></span>
      </div>
    </div>

    <header class="page-header">
      <button class="back-button" type="button" aria-label="返回" @click="goBack">‹</button>
      <h1>订单确认</h1>
    </header>

    <main class="order-content">
      <section class="card product-card">
        <div class="product-main">
          <img class="product-image" :src="mock.service.image" :alt="mock.service.title" />
          <div class="product-info">
            <h2>{{ mock.service.title }}</h2>
            <span>¥{{ mock.service.price }}</span>
          </div>
        </div>

        <div class="price-list">
          <div class="price-row">
            <span>商品总价</span>
            <strong>¥{{ mock.price.total }}</strong>
          </div>
          <div class="price-row">
            <span>优惠券</span>
            <strong class="discount">{{ mock.price.coupon }}</strong>
          </div>
          <div class="divider"></div>
          <div class="price-row subtotal">
            <span>小计</span>
            <strong>{{ mock.price.subtotal }}</strong>
          </div>
        </div>
      </section>

      <section class="card info-card">
        <h2>预约信息</h2>
        <dl>
          <div>
            <dt>上门地址</dt>
            <dd>{{ mock.booking.address }}</dd>
          </div>
          <div>
            <dt>预约时间</dt>
            <dd>{{ mock.booking.time }}</dd>
          </div>
          <div>
            <dt>联系方式</dt>
            <dd>{{ mock.booking.phone }}</dd>
          </div>
        </dl>
      </section>

      <section class="card notice-card">
        <h2>购买须知</h2>
        <dl>
          <div v-for="item in mock.notice" :key="item.label">
            <dt>{{ item.label }}</dt>
            <dd>{{ item.value }}</dd>
          </div>
        </dl>
      </section>
    </main>

    <div class="submit-bar">
      <div class="total">合计：¥<strong>{{ mock.price.subtotal }}</strong></div>
      <button class="submit-button" type="button" @click="submitOrder">提交订单</button>
    </div>
  </div>
</template>

<style scoped>
.order-confirm-page {
  position: relative;
  left: 50%;
  width: min(402px, 100vw);
  min-height: 874px;
  margin: -18px 0;
  transform: translateX(-50%);
  padding: 0 14px 118px;
  box-sizing: border-box;
  background: #f5f6f7;
  color: #34383f;
  font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif;
}

.status-bar {
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 8px 0;
  box-sizing: border-box;
}

.time {
  font-size: 18px;
  font-weight: 500;
  color: #2e3033;
}

.status-icons {
  display: flex;
  align-items: center;
  gap: 9px;
  color: #111;
}

.signal {
  width: 22px;
  height: 16px;
  display: flex;
  align-items: flex-end;
  gap: 3px;
}

.signal i {
  width: 4px;
  border-radius: 1px;
  background: #111;
}

.signal i:nth-child(1) {
  height: 5px;
}

.signal i:nth-child(2) {
  height: 8px;
}

.signal i:nth-child(3) {
  height: 12px;
}

.signal i:nth-child(4) {
  height: 16px;
}

.wifi {
  position: relative;
  width: 19px;
  height: 14px;
  overflow: hidden;
}

.wifi::before,
.wifi::after {
  content: '';
  position: absolute;
  left: 50%;
  border: 3px solid #111;
  border-color: #111 transparent transparent;
  border-radius: 50%;
  transform: translateX(-50%);
}

.wifi::before {
  top: 0;
  width: 22px;
  height: 22px;
}

.wifi::after {
  top: 7px;
  width: 10px;
  height: 10px;
}

.battery {
  position: relative;
  width: 22px;
  height: 12px;
  border: 2px solid #111;
  border-radius: 3px;
  box-sizing: border-box;
}

.battery::before {
  content: '';
  position: absolute;
  top: 2px;
  right: -5px;
  width: 3px;
  height: 6px;
  border-radius: 0 2px 2px 0;
  background: #111;
}

.page-header {
  height: 58px;
  display: flex;
  align-items: center;
  margin-bottom: 18px;
}

.back-button {
  width: 24px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 8px 0 -4px;
  padding: 0;
  border: 0;
  background: transparent;
  color: #34383f;
  font-size: 34px;
  line-height: 26px;
  font-weight: 300;
  cursor: pointer;
}

.page-header h1 {
  margin: 0;
  color: #34383f;
  font-size: 22px;
  font-weight: 600;
  letter-spacing: 0;
}

.order-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.card {
  padding: 24px 22px;
  border-radius: 16px;
  background: #fff;
  box-sizing: border-box;
}

.product-main {
  display: grid;
  grid-template-columns: 96px 1fr;
  gap: 18px;
  align-items: center;
  margin-bottom: 26px;
}

.product-image {
  width: 96px;
  height: 96px;
  border-radius: 8px;
  object-fit: cover;
  display: block;
}

.product-info h2 {
  margin: 0 0 14px;
  color: #34383f;
  font-size: 18px;
  font-weight: 800;
  line-height: 1.45;
  letter-spacing: 0;
}

.product-info span {
  color: #34383f;
  font-size: 17px;
  font-weight: 700;
}

.price-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.price-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  color: #a0a3aa;
  font-size: 17px;
  font-weight: 600;
}

.price-row strong {
  color: #34383f;
  font-size: 18px;
}

.price-row .discount {
  color: #f1736d;
}

.divider {
  height: 1px;
  margin: 8px 0 10px;
  background: #ededee;
}

.subtotal {
  color: #a0a3aa;
}

.subtotal strong {
  color: #f1736d;
  font-size: 24px;
}

.info-card h2,
.notice-card h2 {
  margin: 0 0 24px;
  color: #34383f;
  font-size: 22px;
  font-weight: 800;
  letter-spacing: 0;
}

dl {
  margin: 0;
}

dl div {
  display: grid;
  grid-template-columns: 104px 1fr;
  gap: 14px;
  margin-bottom: 14px;
  align-items: start;
}

dl div:last-child {
  margin-bottom: 0;
}

dt {
  color: #a0a3aa;
  font-size: 16px;
  font-weight: 700;
}

dd {
  margin: 0;
  color: #34383f;
  font-size: 17px;
  font-weight: 700;
  line-height: 1.45;
  text-align: right;
}

.notice-card dd {
  text-align: left;
}

.submit-bar {
  position: fixed;
  left: 50%;
  bottom: 0;
  z-index: 20;
  width: 100%;
  max-width: 402px;
  padding: 18px 24px 24px;
  box-sizing: border-box;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 -8px 20px rgba(20, 24, 36, 0.04);
}

.total {
  flex-shrink: 0;
  color: #34383f;
  font-size: 16px;
  font-weight: 700;
  white-space: nowrap;
}

.total strong {
  font-size: 32px;
  line-height: 1;
}

.submit-button {
  width: 160px;
  flex-shrink: 0;
  height: 46px;
  display: block;
  border: 0;
  border-radius: 8px;
  background: #6870f2;
  color: #fff;
  font-size: 17px;
  font-weight: 700;
  letter-spacing: 0;
  cursor: pointer;
}
</style>
