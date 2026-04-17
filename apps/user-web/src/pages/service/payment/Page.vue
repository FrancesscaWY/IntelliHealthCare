<script setup lang="ts">
import { ref } from 'vue'
import type { PageComponentProps } from '@ihc/page-core/types'
import mock from './mock'

const props = defineProps<PageComponentProps>()

const selectedPayment = ref('alipay')

const goBack = () => {
  if (!props.navigation.navigateBack()) {
    props.navigation.reLaunch('service/order-confirm')
  }
}

const confirmPay = () => {
  props.navigation.navigateTo('service/payment-result')
}
</script>

<template>
  <div class="payment-page">
    <header class="page-header">
      <button class="back-button" type="button" aria-label="返回" @click="goBack">‹</button>
      <h1>支付订单</h1>
    </header>

    <main class="payment-content">
      <section class="amount-card">
        <div class="amount-block">
          <span>支付金额</span>
          <strong><small>¥</small>{{ mock.amount }}</strong>
        </div>
        <div class="countdown">
          支付剩余时间：<span>{{ mock.remainingTime }}</span>
        </div>
      </section>

      <section class="method-section">
        <h2>选择支付方式</h2>
        <div class="method-card">
          <button
            v-for="method in mock.methods"
            :key="method.id"
            class="method-row"
            type="button"
            @click="selectedPayment = method.id"
          >
            <span class="method-icon" :class="`method-icon--${method.id}`">
              <img v-if="method.icon" :src="method.icon" :alt="method.name" />
              <span v-else>银</span>
            </span>
            <span class="method-info">
              <strong>{{ method.name }}</strong>
              <small v-if="method.cardNo">{{ method.cardNo }}</small>
            </span>
            <span class="radio" :class="{ active: selectedPayment === method.id }"></span>
          </button>
        </div>
      </section>
    </main>

    <div class="pay-bar">
      <button class="pay-button" type="button" @click="confirmPay">确认支付</button>
    </div>
  </div>
</template>

<style scoped>
.payment-page {
  position: relative;
  left: 50%;
  width: min(402px, 100vw);
  min-height: 874px;
  margin: -18px 0;
  transform: translateX(-50%);
  padding: 16px 14px 96px;
  box-sizing: border-box;
  background: #f5f6f7;
  color: #34383f;
  font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif;
}

.page-header {
  height: 58px;
  display: flex;
  align-items: center;
  margin-bottom: 26px;
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

.payment-content {
  display: flex;
  flex-direction: column;
}

.amount-card {
  min-height: 132px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  align-items: start;
  padding: 24px 22px;
  box-sizing: border-box;
  border-radius: 16px;
  background: #fff;
}

.amount-block span,
.countdown {
  color: #34383f;
  font-size: 17px;
  font-weight: 700;
}

.amount-block strong {
  display: block;
  margin-top: 18px;
  color: #f3706b;
  font-size: 38px;
  line-height: 1;
  font-weight: 800;
  letter-spacing: 0;
}

.amount-block small {
  margin-right: 6px;
  font-size: 16px;
}

.countdown {
  padding-top: 2px;
  font-size: 15px;
  white-space: nowrap;
}

.countdown span {
  color: #6c73f0;
}

.method-section {
  margin-top: 28px;
}

.method-section h2 {
  margin: 0 0 20px;
  color: #9a9da4;
  font-size: 17px;
  font-weight: 600;
}

.method-card {
  padding: 6px 22px;
  border-radius: 16px;
  background: #fff;
}

.method-row {
  width: 100%;
  min-height: 76px;
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr) 24px;
  gap: 14px;
  align-items: center;
  padding: 0;
  border: 0;
  border-bottom: 1px solid #ededee;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.method-row:last-child {
  border-bottom: 0;
}

.method-icon {
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  overflow: hidden;
}

.method-icon img {
  width: 26px;
  height: 26px;
  object-fit: contain;
  display: block;
}

.method-icon--bank {
  background: #d92234;
  color: #fff;
  font-size: 15px;
  font-weight: 800;
}

.method-info strong,
.method-info small {
  display: block;
}

.method-info strong {
  color: #34383f;
  font-size: 20px;
  font-weight: 800;
}

.method-info small {
  margin-top: 6px;
  color: #c4c6cc;
  font-size: 14px;
  font-weight: 700;
}

.radio {
  width: 20px;
  height: 20px;
  border: 2px solid #c4c6cc;
  border-radius: 50%;
  box-sizing: border-box;
}

.radio.active {
  border: 7px solid #6970f0;
}

.pay-bar {
  position: fixed;
  left: 50%;
  bottom: 0;
  z-index: 20;
  width: 100%;
  max-width: 402px;
  padding: 12px 26px 28px;
  box-sizing: border-box;
  transform: translateX(-50%);
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 -8px 20px rgba(20, 24, 36, 0.04);
}

.pay-button {
  width: 350px;
  max-width: 100%;
  height: 48px;
  display: block;
  margin: 0 auto;
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
