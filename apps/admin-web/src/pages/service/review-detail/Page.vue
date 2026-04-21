<script setup lang="ts">
import type { PageComponentProps } from "@ihc/page-core/types";
import mock from "./mock";

const props = defineProps<PageComponentProps>();

function goBack() {
  props.navigation.reLaunch("service/review-management");
}

function rejectReview() {
  props.showToast("已驳回该服务人员审核申请");
}

function approveReview() {
  props.showToast("已通过该服务人员审核申请");
}
</script>

<template>
  <section class="review-detail-page">
    <article class="detail-panel">
      <header class="page-head">
        <div class="section-head">
          <span class="section-head__accent"></span>
          <h1>{{ mock.title }}</h1>
        </div>

        <div class="page-head__actions">
          <button type="button" class="head-button head-button--ghost" @click="goBack">返回列表</button>
          <button type="button" class="head-button head-button--danger" @click="rejectReview">驳回</button>
          <button type="button" class="head-button head-button--primary" @click="approveReview">审核通过</button>
        </div>
      </header>

      <section class="hero-card">
        <div class="hero-card__profile">
          <img :src="mock.basicInfo.avatar" :alt="mock.basicInfo.name" />

          <div class="hero-card__copy">
            <div class="hero-card__title">
              <strong>{{ mock.basicInfo.name }}</strong>
              <span class="status-chip">{{ mock.status }}</span>
              <span class="tag-chip">{{ mock.basicInfo.tag }}</span>
            </div>
            <p>{{ mock.basicInfo.serviceType }} ｜ {{ mock.basicInfo.phone }}</p>
            <span>申请加入时间：{{ mock.extraInfo.applyAt }}</span>
          </div>
        </div>

        <div class="hero-card__meta">
          <div class="hero-stat">
            <span>服务人员ID</span>
            <strong>{{ mock.basicInfo.staffId }}</strong>
          </div>
          <div class="hero-stat">
            <span>添加渠道</span>
            <strong>{{ mock.extraInfo.channel }}</strong>
          </div>
          <div class="hero-stat">
            <span>最近登录</span>
            <strong>{{ mock.extraInfo.lastLoginAt }}</strong>
          </div>
        </div>
      </section>

      <section class="detail-section">
        <header class="detail-section__head">
          <span class="detail-section__accent"></span>
          <h2>基础信息</h2>
        </header>

        <div class="info-grid info-grid--basic">
          <div class="info-card">
            <span>服务人员ID</span>
            <strong>{{ mock.basicInfo.staffId }}</strong>
          </div>
          <div class="info-card">
            <span>姓名</span>
            <strong>{{ mock.basicInfo.name }}</strong>
          </div>
          <div class="info-card">
            <span>手机号码</span>
            <strong>{{ mock.basicInfo.phone }}</strong>
          </div>
          <div class="info-card">
            <span>服务类型</span>
            <strong>{{ mock.basicInfo.serviceType }}</strong>
          </div>
          <div class="info-card info-card--chip">
            <span>标签</span>
            <strong>{{ mock.basicInfo.tag }}</strong>
          </div>
          <div class="info-card info-card--wide">
            <span>简介</span>
            <strong>{{ mock.basicInfo.bio }}</strong>
          </div>
        </div>
      </section>

      <section class="detail-section">
        <header class="detail-section__head">
          <span class="detail-section__accent"></span>
          <h2>实名信息</h2>
        </header>

        <div class="info-grid">
          <div class="info-card">
            <span>身份证号</span>
            <strong>{{ mock.realInfo.idCardNo }}</strong>
          </div>
          <div class="info-card">
            <span>银行卡号</span>
            <strong>{{ mock.realInfo.bankCardNo }}</strong>
          </div>
          <div class="info-card info-card--wide">
            <span>开户行</span>
            <strong>{{ mock.realInfo.bankName }}</strong>
          </div>
        </div>

        <div class="document-grid">
          <article class="document-card">
            <header class="document-card__head">
              <span>身份证人像面</span>
            </header>
            <img :src="mock.realInfo.idCardFront" alt="身份证人像面" />
          </article>

          <article class="document-card">
            <header class="document-card__head">
              <span>身份证国徽面</span>
            </header>
            <img :src="mock.realInfo.idCardBack" alt="身份证国徽面" />
          </article>

          <article class="document-card">
            <header class="document-card__head">
              <span>职业证书</span>
            </header>
            <img :src="mock.realInfo.certificate" alt="职业证书" />
          </article>
        </div>
      </section>

      <section class="detail-section">
        <header class="detail-section__head">
          <span class="detail-section__accent"></span>
          <h2>其它信息</h2>
        </header>

        <div class="info-grid info-grid--compact">
          <div class="info-card">
            <span>打赏</span>
            <strong>{{ mock.extraInfo.rewardEnabled }}</strong>
          </div>
          <div class="info-card">
            <span>登录密码</span>
            <strong>{{ mock.extraInfo.loginPassword }}</strong>
          </div>
          <div class="info-card">
            <span>添加渠道</span>
            <strong>{{ mock.extraInfo.channel }}</strong>
          </div>
          <div class="info-card">
            <span>注册时间</span>
            <strong>{{ mock.extraInfo.registerAt }}</strong>
          </div>
          <div class="info-card">
            <span>申请加入时间</span>
            <strong>{{ mock.extraInfo.applyAt }}</strong>
          </div>
          <div class="info-card">
            <span>最近登录时间</span>
            <strong>{{ mock.extraInfo.lastLoginAt }}</strong>
          </div>
        </div>
      </section>
    </article>
  </section>
</template>

<style scoped>
.review-detail-page {
  font-family: "PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.detail-panel {
  display: grid;
  gap: 10px;
  padding: 12px;
  border-radius: 16px;
  background: #ffffff;
  box-shadow: 0 6px 20px rgba(59, 103, 82, 0.05);
}

.page-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 10px;
  border-bottom: 1px solid #edf2ef;
}

.section-head {
  display: flex;
  align-items: center;
  gap: 10px;
}

.section-head__accent,
.detail-section__accent {
  width: 6px;
  border-radius: 999px;
  background: #39cf9d;
}

.section-head__accent {
  height: 22px;
}

.section-head h1,
.detail-section__head h2 {
  margin: 0;
  color: #2f3946;
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 0.01em;
}

.page-head__actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.head-button {
  height: 32px;
  padding: 0 12px;
  border: 1px solid #dfe8e4;
  border-radius: 9px;
  background: #ffffff;
  color: #44505d;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.01em;
}

.head-button--ghost {
  background: #f7faf8;
}

.head-button--danger {
  border-color: #ffd6d2;
  background: #fff5f4;
  color: #f26d62;
}

.head-button--primary {
  border-color: #39cf9d;
  background: #39cf9d;
  color: #ffffff;
}

.hero-card {
  display: grid;
  grid-template-columns: minmax(0, 1.45fr) minmax(280px, 0.88fr);
  gap: 10px;
  padding: 12px;
  border-radius: 14px;
  background: linear-gradient(135deg, #f4fffb 0%, #f9fcfb 100%);
  border: 1px solid #ecf3ef;
}

.hero-card__profile {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.hero-card__profile img {
  width: 64px;
  height: 64px;
  border-radius: 18px;
  object-fit: cover;
  box-shadow: 0 8px 18px rgba(57, 207, 157, 0.18);
}

.hero-card__copy {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.hero-card__title {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.hero-card__title strong {
  color: #2d3844;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 0.01em;
}

.hero-card__copy p,
.hero-card__copy span {
  margin: 0;
  color: #73808c;
  font-size: 12px;
  font-weight: 400;
  letter-spacing: 0.01em;
}

.status-chip,
.tag-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 22px;
  padding: 0 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.01em;
}

.status-chip {
  background: rgba(57, 207, 157, 0.14);
  color: #1fb784;
}

.tag-chip {
  background: rgba(248, 206, 87, 0.18);
  color: #c88913;
}

.hero-card__meta {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.hero-stat {
  display: grid;
  gap: 6px;
  padding: 10px 11px;
  border-radius: 12px;
  background: #ffffff;
  border: 1px solid #edf2ef;
}

.hero-stat span,
.info-card span,
.document-card__head span {
  color: #99a4af;
  font-size: 11px;
  font-weight: 400;
  letter-spacing: 0.01em;
}

.hero-stat strong,
.info-card strong {
  color: #2f3946;
  font-size: 12px;
  font-weight: 500;
  line-height: 1.6;
  letter-spacing: 0.01em;
}

.detail-section {
  display: grid;
  gap: 8px;
}

.detail-section__head {
  display: flex;
  align-items: center;
  gap: 7px;
}

.detail-section__accent {
  height: 16px;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.info-grid--basic {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.info-grid--compact {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.info-card {
  display: grid;
  gap: 6px;
  min-height: 60px;
  padding: 10px 12px;
  border: 1px solid #edf2ef;
  border-radius: 12px;
  background: #ffffff;
}

.info-card--wide {
  grid-column: span 2;
}

.info-card--chip strong {
  color: #1fa579;
}

.document-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.document-card {
  overflow: hidden;
  border: 1px solid #edf2ef;
  border-radius: 14px;
  background: #ffffff;
}

.document-card__head {
  display: flex;
  align-items: center;
  padding: 9px 12px;
  border-bottom: 1px solid #edf2ef;
  background: #fbfcfc;
}

.document-card img {
  display: block;
  width: 100%;
  height: 148px;
  object-fit: cover;
}

@media (max-width: 1440px) {
  .hero-card,
  .info-grid--basic,
  .info-grid,
  .document-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .hero-card__meta {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 1100px) {
  .page-head,
  .hero-card {
    display: grid;
    grid-template-columns: 1fr;
  }

  .page-head__actions {
    justify-content: flex-start;
    flex-wrap: wrap;
  }

  .info-grid--basic,
  .info-grid,
  .info-grid--compact,
  .document-grid {
    grid-template-columns: 1fr;
  }

  .info-card--wide {
    grid-column: span 1;
  }
}
</style>
