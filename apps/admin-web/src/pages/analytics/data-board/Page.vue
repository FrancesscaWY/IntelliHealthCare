<script setup lang="ts">
import { computed, ref } from "vue";
import type { PageComponentProps } from "@ihc/page-core/types";
import mock from "./mock";

type PeriodKey = (typeof mock.periodOptions)[number]["key"];

const props = defineProps<PageComponentProps>();

const currentPeriod = ref<PeriodKey>(mock.periodOptions[0].key);

const activePeriod = computed(() => mock.periods[currentPeriod.value]);
const trendMax = computed(() =>
  Math.max(...activePeriod.value.trend.map((item) => Math.max(item.value, item.goal))),
);

function getBarHeight(value: number) {
  return `${Math.max(22, Math.round((value / trendMax.value) * 100))}%`;
}

function triggerAction(label: string) {
  props.showToast(`${label}功能为演示状态`);
}
</script>

<template>
  <section class="analytics-page">
    <article class="hero-panel">
      <div class="hero-panel__title">
        <span class="hero-panel__accent"></span>
        <div>
          <h1>{{ mock.title }}</h1>
          <p>{{ mock.subtitle }}</p>
        </div>
      </div>

      <div class="hero-panel__tools">
        <div class="period-switch" role="tablist" aria-label="统计周期">
          <button
            v-for="option in mock.periodOptions"
            :key="option.key"
            class="period-switch__item"
            :class="{ 'period-switch__item--active': currentPeriod === option.key }"
            type="button"
            role="tab"
            :aria-selected="currentPeriod === option.key"
            @click="currentPeriod = option.key"
          >
            <strong>{{ option.label }}</strong>
            <span>{{ option.caption }}</span>
          </button>
        </div>

        <div class="hero-actions">
          <button class="hero-button hero-button--ghost" type="button" @click="triggerAction('刷新数据')">
            {{ activePeriod.periodLabel }}
          </button>
          <button class="hero-button hero-button--primary" type="button" @click="triggerAction('导出简报')">导出简报</button>
        </div>
      </div>
    </article>

    <article class="digest-panel">
      <div class="digest-panel__meta">
        <div>
          <span class="digest-panel__label">统计区间</span>
          <strong>{{ activePeriod.periodLabel }}</strong>
        </div>
        <div>
          <span class="digest-panel__label">更新时间</span>
          <strong>{{ activePeriod.updatedAt }}</strong>
        </div>
      </div>

      <div class="digest-panel__badges">
        <span v-for="badge in activePeriod.badges" :key="badge" class="digest-badge">{{ badge }}</span>
      </div>
    </article>

    <section class="metric-grid">
      <article v-for="metric in activePeriod.metrics" :key="metric.label" class="metric-card">
        <div class="metric-card__head">
          <span>{{ metric.label }}</span>
          <strong :class="[`metric-card__delta`, `metric-card__delta--${metric.trend}`]">{{ metric.delta }}</strong>
        </div>
        <div class="metric-card__value">{{ metric.value }}</div>
        <p>{{ metric.note }}</p>
      </article>
    </section>

    <section class="analytics-grid">
      <article class="panel panel--wide">
        <header class="panel__head">
          <div>
            <h2>关键趋势</h2>
            <p>对照目标线观察服务与健康管理执行度</p>
          </div>
          <button class="panel-link" type="button" @click="triggerAction('查看趋势详情')">趋势详情</button>
        </header>

        <div class="trend-board">
          <div v-for="item in activePeriod.trend" :key="item.label" class="trend-item">
            <div class="trend-item__bars">
              <span class="trend-item__bar trend-item__bar--goal" :style="{ height: getBarHeight(item.goal) }"></span>
              <span class="trend-item__bar trend-item__bar--value" :style="{ height: getBarHeight(item.value) }"></span>
            </div>
            <div class="trend-item__meta">
              <strong>{{ item.value }}%</strong>
              <span>{{ item.label }}</span>
            </div>
          </div>
        </div>

        <div class="note-list">
          <p v-for="note in activePeriod.notes" :key="note">{{ note }}</p>
        </div>
      </article>

      <article class="panel">
        <header class="panel__head">
          <div>
            <h2>服务构成</h2>
            <p>按当前周期的主要服务类型分布</p>
          </div>
        </header>

        <div class="stack-list">
          <div v-for="item in activePeriod.categories" :key="item.name" class="stack-item">
            <div class="stack-item__line">
              <span>{{ item.name }}</span>
              <strong>{{ item.value }}%</strong>
            </div>
            <div class="stack-item__track">
              <span :class="['stack-item__fill', `stack-item__fill--${item.tone}`]" :style="{ width: `${item.value}%` }"></span>
            </div>
          </div>
        </div>
      </article>

      <article class="panel">
        <header class="panel__head">
          <div>
            <h2>重点发现</h2>
            <p>保留适老化阅读节奏的简明摘要</p>
          </div>
        </header>

        <div class="highlight-list">
          <article v-for="item in activePeriod.highlights" :key="item.title" class="highlight-card">
            <div class="highlight-card__top">
              <span class="highlight-card__title">{{ item.title }}</span>
              <strong :class="[`highlight-card__value`, `highlight-card__value--${item.tone}`]">{{ item.value }}</strong>
            </div>
            <p>{{ item.detail }}</p>
          </article>
        </div>
      </article>

      <article class="panel panel--wide">
        <header class="panel__head">
          <div>
            <h2>机构执行情况</h2>
            <p>报告归档、上门准时与满意度并排展示</p>
          </div>
          <button class="panel-link" type="button" @click="triggerAction('导出机构明细')">导出明细</button>
        </header>

        <div class="compact-table">
          <div class="compact-table__row compact-table__row--head">
            <span>机构</span>
            <span>归档率</span>
            <span>准时率</span>
            <span>满意度</span>
          </div>
          <div v-for="item in activePeriod.institutions" :key="item.name" class="compact-table__row">
            <span>{{ item.name }}</span>
            <span>{{ item.reportRate }}</span>
            <span>{{ item.onTime }}</span>
            <span>{{ item.satisfaction }}</span>
          </div>
        </div>
      </article>

      <article class="panel">
        <header class="panel__head">
          <div>
            <h2>待跟进预警</h2>
            <p>把重点事件压缩成一屏完成判断</p>
          </div>
        </header>

        <div class="alert-list">
          <article v-for="item in activePeriod.alerts" :key="item.title" class="alert-item">
            <div class="alert-item__top">
              <span :class="['alert-level', `alert-level--${item.level}`]">{{ item.level }}</span>
              <strong>{{ item.title }}</strong>
            </div>
            <p>{{ item.detail }}</p>
            <span class="alert-item__action">{{ item.action }}</span>
          </article>
        </div>
      </article>

      <article class="panel">
        <header class="panel__head">
          <div>
            <h2>重点长者</h2>
            <p>半结构化展示，减少大段说明文字</p>
          </div>
        </header>

        <div class="member-list">
          <article v-for="item in activePeriod.members" :key="item.name" class="member-item">
            <div class="member-item__top">
              <strong>{{ item.name }}</strong>
              <span>{{ item.score }}</span>
            </div>
            <div class="member-item__tag">{{ item.tag }}</div>
            <p>{{ item.note }}</p>
          </article>
        </div>
      </article>
    </section>
  </section>
</template>

<style scoped>
.analytics-page {
  display: grid;
  gap: 12px;
  font-family: var(--admin-font-family);
  color: #2f3946;
  font-size: 13px;
  line-height: 1.45;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.hero-panel,
.digest-panel,
.panel,
.metric-card {
  border: 1px solid rgba(22, 53, 45, 0.06);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 8px 24px rgba(24, 51, 45, 0.04);
}

.hero-panel {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 18px;
}

.hero-panel__title {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.hero-panel__accent {
  width: 5px;
  height: 22px;
  border-radius: 999px;
  background: linear-gradient(180deg, #39cf9d 0%, #1f8c67 100%);
}

.hero-panel h1 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  line-height: 1.2;
}

.hero-panel p {
  margin: 5px 0 0;
  color: #788490;
  font-size: 12px;
}

.hero-panel__tools {
  display: flex;
  align-items: center;
  gap: 10px;
}

.period-switch {
  display: inline-grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
  padding: 4px;
  border-radius: 12px;
  background: #f3f8f5;
}

.period-switch__item {
  display: grid;
  gap: 2px;
  min-width: 88px;
  padding: 8px 12px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: #6f7c87;
  text-align: left;
}

.period-switch__item strong {
  font-size: 13px;
  font-weight: 600;
}

.period-switch__item span {
  font-size: 11px;
}

.period-switch__item--active {
  background: #ffffff;
  color: #1d7d5b;
  box-shadow: 0 4px 10px rgba(24, 51, 45, 0.06);
}

.hero-actions {
  display: flex;
  gap: 8px;
}

.hero-button {
  height: 36px;
  padding: 0 14px;
  border: 1px solid #d7e6dd;
  border-radius: 10px;
  background: #ffffff;
  color: #41505c;
  font-size: 12px;
  font-weight: 500;
}

.hero-button--primary {
  border-color: #39cf9d;
  background: #39cf9d;
  color: #ffffff;
}

.digest-panel {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 12px 16px;
}

.digest-panel__meta {
  display: flex;
  gap: 26px;
}

.digest-panel__label {
  display: block;
  margin-bottom: 3px;
  color: #8a95a0;
  font-size: 11px;
}

.digest-panel__meta strong {
  font-size: 13px;
  font-weight: 600;
}

.digest-panel__badges {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
}

.digest-badge {
  padding: 6px 10px;
  border-radius: 999px;
  background: #edf9f4;
  color: #1e8562;
  font-size: 11px;
  font-weight: 500;
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.metric-card {
  padding: 14px 16px;
}

.metric-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  color: #7d8893;
  font-size: 12px;
}

.metric-card__value {
  margin-top: 8px;
  color: #243240;
  font-size: 24px;
  font-weight: 600;
  line-height: 1.1;
}

.metric-card p {
  margin: 7px 0 0;
  color: #8a96a1;
  font-size: 11px;
}

.metric-card__delta {
  font-size: 12px;
  font-weight: 600;
}

.metric-card__delta--up {
  color: #1f9d72;
}

.metric-card__delta--down {
  color: #d8665e;
}

.analytics-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr) minmax(0, 1fr);
  gap: 12px;
}

.panel {
  padding: 14px 16px;
}

.panel--wide {
  grid-column: span 2;
}

.panel__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.panel__head h2 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}

.panel__head p {
  margin: 4px 0 0;
  color: #86929d;
  font-size: 11px;
}

.panel-link {
  padding: 0;
  border: 0;
  background: transparent;
  color: #1f8c67;
  font-size: 12px;
}

.trend-board {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(72px, 1fr));
  gap: 10px;
  align-items: end;
  min-height: 176px;
}

.trend-item {
  display: grid;
  gap: 8px;
}

.trend-item__bars {
  display: flex;
  align-items: end;
  justify-content: center;
  gap: 8px;
  height: 128px;
  padding: 0 6px;
  border-radius: 12px;
  background: linear-gradient(180deg, rgba(239, 247, 243, 0.88) 0%, rgba(248, 251, 249, 0.98) 100%);
}

.trend-item__bar {
  width: 14px;
  border-radius: 999px 999px 4px 4px;
}

.trend-item__bar--goal {
  background: #dfe8e3;
}

.trend-item__bar--value {
  background: linear-gradient(180deg, #45d3a3 0%, #1f8c67 100%);
}

.trend-item__meta {
  display: grid;
  justify-items: center;
  gap: 2px;
}

.trend-item__meta strong {
  font-size: 13px;
  font-weight: 600;
}

.trend-item__meta span {
  color: #8a95a0;
  font-size: 11px;
}

.note-list {
  display: grid;
  gap: 6px;
  margin-top: 12px;
}

.note-list p {
  margin: 0;
  padding-left: 10px;
  border-left: 2px solid #d6efe3;
  color: #5f6d79;
  font-size: 12px;
}

.stack-list,
.highlight-list,
.alert-list,
.member-list {
  display: grid;
  gap: 10px;
}

.stack-item {
  display: grid;
  gap: 6px;
}

.stack-item__line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  font-size: 12px;
}

.stack-item__track {
  height: 7px;
  border-radius: 999px;
  background: #edf2ef;
  overflow: hidden;
}

.stack-item__fill {
  display: block;
  height: 100%;
  border-radius: inherit;
}

.stack-item__fill--green {
  background: linear-gradient(90deg, #48d2a4 0%, #1f8c67 100%);
}

.stack-item__fill--teal {
  background: linear-gradient(90deg, #5bd0d3 0%, #2b9f9d 100%);
}

.stack-item__fill--amber {
  background: linear-gradient(90deg, #f7ca65 0%, #e39a36 100%);
}

.stack-item__fill--red {
  background: linear-gradient(90deg, #ffb39f 0%, #eb7465 100%);
}

.highlight-card,
.alert-item,
.member-item {
  padding: 10px 11px;
  border: 1px solid #edf2ef;
  border-radius: 12px;
  background: #fbfdfc;
}

.highlight-card__top,
.alert-item__top,
.member-item__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.highlight-card__title {
  color: #33404d;
  font-size: 12px;
  font-weight: 500;
}

.highlight-card__value {
  font-size: 15px;
  font-weight: 600;
}

.highlight-card__value--green {
  color: #1f9d72;
}

.highlight-card__value--amber {
  color: #d98d22;
}

.highlight-card__value--red {
  color: #db6c61;
}

.highlight-card p,
.alert-item p,
.member-item p {
  margin: 6px 0 0;
  color: #84909b;
  font-size: 11px;
}

.compact-table {
  border: 1px solid #edf2ef;
  border-radius: 12px;
  overflow: hidden;
}

.compact-table__row {
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) repeat(3, minmax(64px, 0.6fr));
  gap: 10px;
  align-items: center;
  padding: 10px 12px;
  border-bottom: 1px solid #f1f4f2;
  font-size: 12px;
}

.compact-table__row:last-child {
  border-bottom: 0;
}

.compact-table__row--head {
  background: #f7faf8;
  color: #7c8894;
  font-size: 11px;
}

.alert-level {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 26px;
  height: 20px;
  padding: 0 7px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
}

.alert-level--高 {
  background: #fff1ef;
  color: #dc695f;
}

.alert-level--中 {
  background: #fff7e8;
  color: #de9a2b;
}

.alert-level--低 {
  background: #eef8f2;
  color: #2b996f;
}

.alert-item__action {
  display: inline-block;
  margin-top: 8px;
  color: #1f8c67;
  font-size: 11px;
  font-weight: 500;
}

.member-item__top strong {
  font-size: 12px;
  font-weight: 600;
}

.member-item__top span {
  color: #1f8c67;
  font-size: 12px;
  font-weight: 600;
}

.member-item__tag {
  display: inline-flex;
  align-items: center;
  width: fit-content;
  margin-top: 7px;
  padding: 4px 8px;
  border-radius: 999px;
  background: #edf9f4;
  color: #1f8c67;
  font-size: 11px;
}

@media (max-width: 1380px) {
  .metric-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .analytics-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 1080px) {
  .hero-panel,
  .digest-panel {
    flex-direction: column;
    align-items: stretch;
  }

  .hero-panel__tools,
  .digest-panel__meta {
    flex-direction: column;
    align-items: stretch;
  }

  .analytics-grid {
    grid-template-columns: 1fr;
  }

  .panel--wide {
    grid-column: span 1;
  }
}

@media (max-width: 720px) {
  .metric-grid {
    grid-template-columns: 1fr;
  }

  .period-switch {
    width: 100%;
  }

  .hero-actions {
    width: 100%;
  }

  .hero-button {
    flex: 1;
  }

  .compact-table__row {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
