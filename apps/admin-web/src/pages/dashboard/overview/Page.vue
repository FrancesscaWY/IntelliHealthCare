<script setup lang="ts">
import type { PageComponentProps } from "@ihc/page-core/types";
import mock from "./mock";

const props = defineProps<PageComponentProps>();

function openPage(pageId: string, label: string) {
  props.navigation.reLaunch(pageId);
  props.showToast(`已切换到${label}`);
}
</script>

<template>
  <section class="overview-page">
    <section class="hero-grid">
      <article class="hero-card hero-card--summary">
        <p class="hero-eyebrow">Command Center</p>
        <h1>{{ mock.greeting }}</h1>
        <p>{{ mock.dateText }}</p>
        <div class="hero-actions">
          <button type="button" @click="openPage('service/order-dispatch', '服务调度')">处理今日工单</button>
          <button type="button" class="ghost-btn" @click="openPage('health/alert-center', '健康预警')">查看风险预警</button>
        </div>
      </article>

      <article class="hero-card hero-card--tasks">
        <p class="hero-eyebrow">今日待办</p>
        <ul>
          <li v-for="task in mock.tasks" :key="task">{{ task }}</li>
        </ul>
      </article>
    </section>

    <section class="stats-grid">
      <article v-for="item in mock.stats" :key="item.label" class="stat-card" :class="`stat-card--${item.tone}`">
        <span>{{ item.label }}</span>
        <strong>{{ item.value }}</strong>
        <small>{{ item.delta }}</small>
      </article>
    </section>

    <section class="content-grid">
      <article class="panel-card">
        <header class="panel-head">
          <div>
            <p class="panel-eyebrow">快捷入口</p>
            <h2>后台功能导航</h2>
          </div>
        </header>

        <div class="quick-grid">
          <button v-for="item in mock.quickLinks" :key="item.title" type="button" class="quick-card" @click="openPage(item.pageId, item.title)">
            <strong>{{ item.title }}</strong>
            <p>{{ item.description }}</p>
            <span>{{ item.actionLabel }}</span>
          </button>
        </div>
      </article>

      <article class="panel-card">
        <header class="panel-head">
          <div>
            <p class="panel-eyebrow">风险中心</p>
            <h2>最新预警</h2>
          </div>
          <button type="button" class="panel-link" @click="openPage('health/alert-center', '健康预警')">进入预警中心</button>
        </header>

        <div class="alert-list">
          <article v-for="item in mock.alerts" :key="item.title" class="alert-item">
            <span class="alert-level">{{ item.level }}</span>
            <div>
              <strong>{{ item.title }}</strong>
              <p>{{ item.detail }}</p>
            </div>
            <small>{{ item.owner }}</small>
          </article>
        </div>
      </article>
    </section>

    <section class="content-grid content-grid--bottom">
      <article class="panel-card">
        <header class="panel-head">
          <div>
            <p class="panel-eyebrow">服务流转</p>
            <h2>调度看板</h2>
          </div>
          <button type="button" class="panel-link" @click="openPage('service/order-dispatch', '服务调度')">查看全部</button>
        </header>

        <div class="dispatch-grid">
          <article v-for="item in mock.dispatchBoard" :key="item.label" class="dispatch-card">
            <span>{{ item.label }}</span>
            <strong>{{ item.value }}</strong>
            <small>{{ item.helper }}</small>
          </article>
        </div>
      </article>

      <article class="panel-card">
        <header class="panel-head">
          <div>
            <p class="panel-eyebrow">人员关注</p>
            <h2>当班团队</h2>
          </div>
          <button type="button" class="panel-link" @click="openPage('staff/caregiver-roster', '人员排班')">进入排班</button>
        </header>

        <div class="staff-list">
          <article v-for="item in mock.staffFocus" :key="item.name" class="staff-item">
            <div>
              <strong>{{ item.name }}</strong>
              <p>{{ item.role }}</p>
            </div>
            <span>{{ item.status }}</span>
            <small>{{ item.shift }}</small>
          </article>
        </div>
      </article>
    </section>
  </section>
</template>

<style scoped>
.overview-page {
  display: grid;
  gap: 18px;
}

.hero-grid,
.content-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr);
  gap: 18px;
}

.content-grid--bottom {
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
}

.hero-card,
.stat-card,
.panel-card {
  border: 1px solid var(--admin-border);
  border-radius: var(--admin-radius-lg);
  background: var(--admin-surface-strong);
  box-shadow: var(--admin-shadow);
}

.hero-card {
  padding: 26px;
}

.hero-card--summary {
  background:
    radial-gradient(circle at top right, rgba(224, 138, 58, 0.18), transparent 26%),
    linear-gradient(135deg, rgba(31, 122, 90, 0.96), rgba(20, 78, 58, 0.92));
  color: #fff;
}

.hero-card--tasks {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(249, 251, 249, 0.92));
}

.hero-eyebrow,
.panel-eyebrow {
  margin: 0;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.hero-card--summary .hero-eyebrow {
  color: rgba(255, 255, 255, 0.78);
}

.hero-card h1 {
  margin: 10px 0 10px;
  font-size: 34px;
}

.hero-card p,
.quick-card p,
.alert-item p,
.staff-item p {
  margin: 0;
  line-height: 1.7;
}

.hero-card--summary p {
  color: rgba(255, 255, 255, 0.82);
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 20px;
}

.hero-actions button,
.panel-link,
.quick-card {
  border: 0;
}

.hero-actions button {
  padding: 10px 14px;
  border-radius: 999px;
  background: #fff;
  color: #154e3c;
  font-weight: 700;
}

.hero-actions .ghost-btn {
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
}

.hero-card--tasks ul {
  display: grid;
  gap: 12px;
  margin: 16px 0 0;
  padding-left: 18px;
  color: var(--admin-muted);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.stat-card {
  padding: 20px;
}

.stat-card span,
.dispatch-card span {
  display: block;
  color: var(--admin-muted);
  font-size: 13px;
}

.stat-card strong,
.dispatch-card strong {
  display: block;
  margin-top: 10px;
  font-size: 30px;
}

.stat-card small,
.dispatch-card small,
.alert-item small,
.staff-item small {
  display: block;
  margin-top: 8px;
  color: var(--admin-muted);
}

.stat-card--brand {
  background: linear-gradient(180deg, rgba(31, 122, 90, 0.08), rgba(31, 122, 90, 0.02));
}

.stat-card--danger {
  background: linear-gradient(180deg, rgba(216, 87, 79, 0.08), rgba(216, 87, 79, 0.02));
}

.stat-card--accent {
  background: linear-gradient(180deg, rgba(224, 138, 58, 0.1), rgba(224, 138, 58, 0.02));
}

.stat-card--neutral {
  background: linear-gradient(180deg, rgba(22, 53, 45, 0.06), rgba(22, 53, 45, 0.02));
}

.panel-card {
  padding: 24px;
}

.panel-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 18px;
}

.panel-head h2 {
  margin: 6px 0 0;
  font-size: 24px;
}

.panel-link {
  padding: 10px 14px;
  border-radius: 999px;
  background: rgba(31, 122, 90, 0.08);
  color: var(--admin-brand);
  font-weight: 700;
}

.quick-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.quick-card {
  padding: 18px;
  border-radius: 18px;
  background: linear-gradient(180deg, rgba(31, 122, 90, 0.08), rgba(255, 255, 255, 0.96));
  text-align: left;
}

.quick-card strong,
.alert-item strong,
.staff-item strong {
  font-size: 18px;
}

.quick-card p {
  margin-top: 8px;
  color: var(--admin-muted);
}

.quick-card span {
  display: inline-flex;
  margin-top: 14px;
  color: var(--admin-brand);
  font-size: 13px;
  font-weight: 700;
}

.alert-list,
.staff-list {
  display: grid;
  gap: 12px;
}

.alert-item,
.staff-item {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: start;
  gap: 14px;
  padding: 16px 18px;
  border-radius: 18px;
  background: rgba(22, 53, 45, 0.04);
}

.alert-level {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 34px;
  padding: 6px 8px;
  border-radius: 999px;
  background: rgba(216, 87, 79, 0.12);
  color: var(--admin-danger);
  font-size: 12px;
  font-weight: 700;
}

.alert-item p,
.staff-item p {
  margin-top: 6px;
  color: var(--admin-muted);
}

.dispatch-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.dispatch-card {
  padding: 18px;
  border-radius: 18px;
  background: rgba(31, 122, 90, 0.05);
}

.staff-item span {
  display: inline-flex;
  align-items: center;
  padding: 7px 10px;
  border-radius: 999px;
  background: rgba(31, 122, 90, 0.08);
  color: var(--admin-brand);
  font-size: 12px;
  font-weight: 700;
}

@media (max-width: 1200px) {
  .hero-grid,
  .content-grid,
  .content-grid--bottom,
  .stats-grid {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 900px) {
  .hero-grid,
  .content-grid,
  .content-grid--bottom,
  .stats-grid,
  .quick-grid,
  .dispatch-grid {
    grid-template-columns: 1fr;
  }

  .alert-item,
  .staff-item {
    grid-template-columns: 1fr;
  }
}
</style>
