<script setup lang="ts">
import type { PageComponentProps } from '@ihc/page-core/types'
import { Check } from '@icon-park/vue-next'

const props = defineProps<PageComponentProps>()

const goBack = () => {
  if (!props.navigation.navigateBack()) {
    props.navigation.reLaunch('service/payment')
  }
}

const viewOrder = () => {
  props.navigation.navigateTo('service/order-detail')
}
</script>

<template>
  <div class="payment-result-page">
    <header class="page-header">
      <button class="back-button" type="button" aria-label="返回" @click="goBack">‹</button>
      <h1>支付结果</h1>
    </header>

    <main class="result-content">
      <div class="success-icon">
        <Check theme="outline" size="58" fill="#fff" stroke-linejoin="round" stroke-linecap="round" />
      </div>
      <h2>支付成功</h2>
      <p>您的订单已支付成功！</p>
    </main>

    <div class="result-bar">
      <button class="result-button" type="button" @click="viewOrder">查看订单</button>
    </div>
  </div>
</template>

<style scoped>
  .payment-result-page {
    position: relative;
    left: 50%;
    width: min(402px, 100vw);
    min-height: 874px;
    margin: -18px 0;
    transform: translateX(-50%);
    padding: 16px 14px 96px;
    box-sizing: border-box;
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

  .result-content {
    min-height: 602px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
  }

  .success-icon {
    width: 96px;
    height: 96px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: #75d6df;
  }

  .result-content h2 {
    margin: 34px 0 16px;
    color: #34383f;
    font-size: 30px;
    font-weight: 700;
    letter-spacing: 0;
  }

  .result-content p {
    margin: 0;
    color: #a8abb1;
    font-size: 17px;
    font-weight: 700;
    letter-spacing: 0;
  }

  .result-bar {
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

  .result-button {
    width: 350px;
    max-width: 100%;
    height: 48px;
    display: block;
    margin: 0 auto;
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
