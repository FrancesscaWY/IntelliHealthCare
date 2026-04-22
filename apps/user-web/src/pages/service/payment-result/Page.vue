<script setup lang="ts">
import type { PageComponentProps } from "@ihc/page-core/types";

const props = defineProps<PageComponentProps>();

function goBack() {
  props.navigation.navigateBack();
}

function viewOrder() {
  props.navigation.navigateTo("service/order-detail");
}
</script>

<template>
  <div class="payment-result-page">
    <header class="page-header">
      <button class="back-button" type="button" aria-label="返回" @click="goBack">‹</button>
      <h1>支付结果</h1>
    </header>

    <main class="result-content" aria-label="支付结果">
      <div class="success-icon" aria-hidden="true">
        <span class="success-check"></span>
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
  padding: 16px 14px 120px;
  box-sizing: border-box;
  background: #ffffff;
  color: #34383f;
  font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif;
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
  margin: 0 16px 0 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: #34383f;
  font-size: 42px;
  line-height: 28px;
  font-weight: 300;
  cursor: pointer;
}

.page-header h1 {
  margin: 0;
  color: #34383f;
  font-size: 22px;
  line-height: 1;
  font-weight: 600;
  letter-spacing: 0;
}

.result-content {
  min-height: 540px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding-top: 286px;
  box-sizing: border-box;
}

.success-icon {
  width: 120px;
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #75d6df;
}

.success-check {
  width: 54px;
  height: 30px;
  margin-top: -10px;
  border-left: 9px solid #ffffff;
  border-bottom: 9px solid #ffffff;
  transform: rotate(-45deg);
  box-sizing: border-box;
}

.result-content h2 {
  margin: 44px 0 0;
  color: #34383f;
  font-size: 40px;
  line-height: 1.2;
  font-weight: 600;
  letter-spacing: 0;
}

.result-content p {
  margin: 26px 0 0;
  color: #a8adb4;
  font-size: 24px;
  line-height: 1.4;
  font-weight: 600;
  letter-spacing: 0;
}

.result-bar {
  position: fixed;
  left: 50%;
  bottom: 0;
  z-index: 20;
  width: min(402px, 100vw);
  transform: translateX(-50%);
  padding: 16px 16px 28px;
  box-sizing: border-box;
  background: #ffffff;
  border-top: 1px solid #f0f1f3;
}

.result-button {
  width: 100%;
  max-width: 100%;
  height: 86px;
  display: block;
  margin: 0 auto;
  border: 0;
  border-radius: 14px;
  background: #75d6df;
  color: #ffffff;
  font-size: 28px;
  font-weight: 600;
  letter-spacing: 0;
  cursor: pointer;
}
</style>
