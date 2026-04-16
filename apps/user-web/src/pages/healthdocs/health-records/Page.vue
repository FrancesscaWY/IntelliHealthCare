<script setup lang="ts">
import type { PageComponentProps } from "@ihc/page-core/types";
import mock from "./mock";

const props = defineProps<PageComponentProps>();

const sectionIconMarkup: Record<string, string> = {
  basic: `
    <rect x="7" y="6.5" width="18" height="19" rx="4" />
    <path d="M11.5 11.5h9" />
    <path d="M11.5 16h9" />
    <path d="M11.5 20.5h6" />
  `,
  health: `
    <path d="M16 25s-7.5-4.8-9.8-9.3C4.6 12.5 6.4 8.6 10.4 8.6c2.3 0 4.2 1.2 5.6 3.1 1.4-1.9 3.3-3.1 5.6-3.1 4 0 5.8 3.9 4.2 7.1C23.5 20.2 16 25 16 25Z" />
    <path d="M10.7 16.5h3.1l2-3.2 2.7 5 1.7-2.6h1.9" />
  `,
  medication: `
    <path d="M11 9.6a4.2 4.2 0 0 1 5.9 0l4.5 4.5a4.2 4.2 0 0 1-5.9 5.9L11 15.5a4.2 4.2 0 0 1 0-5.9Z" />
    <path d="m12.3 20.6 8.3-8.3" />
  `,
  data: `
    <path d="M8 7.5v17" />
    <path d="M8 24.5h16" />
    <path d="m11.5 18.2 4.3-4.4 3.1 3 4.1-5.2" />
    <circle cx="11.5" cy="18.2" r="1.3" fill="currentColor" stroke="none" />
    <circle cx="15.8" cy="13.8" r="1.3" fill="currentColor" stroke="none" />
    <circle cx="18.9" cy="16.8" r="1.3" fill="currentColor" stroke="none" />
    <circle cx="23" cy="11.6" r="1.3" fill="currentColor" stroke="none" />
  `,
  report: `
    <path d="M10 6.5h10.5l4.5 4.6v14.4a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2v-17a2 2 0 0 1 2-2Z" />
    <path d="M20.5 6.5v4.6H25" />
    <path d="M16.5 13v9" />
    <path d="M12 17.5h9" />
  `,
};

const metricIconMarkup: Record<string, string> = {
  age: `
    <path d="M6.5 9.5h8.8l3.7 3.7v9.3H6.5z" />
    <path d="M15.3 9.5v3.7H19" />
    <path d="M9.5 14.2h6.6" />
    <path d="M9.5 17.5h4.6" />
  `,
  height: `
    <path d="M16 6v20" />
    <path d="M12.7 9.3 16 6l3.3 3.3" />
    <path d="M12.7 22.7 16 26l3.3-3.3" />
    <path d="M10.5 11h3" />
    <path d="M10.5 16h3" />
    <path d="M10.5 21h3" />
  `,
  weight: `
    <path d="M8.2 12.5c0-4.3 3.5-7.8 7.8-7.8s7.8 3.5 7.8 7.8v6.2a3 3 0 0 1-3 3H11.2a3 3 0 0 1-3-3z" />
    <path d="M12.4 12.6a3.6 3.6 0 0 1 7.2 0" />
    <path d="m16 12.6 2 2" />
  `,
};

function getMetricIconMarkup(key: string) {
  return metricIconMarkup[key] || metricIconMarkup.age;
}

function goBack() {
  if (!props.navigation.navigateBack()) {
    props.navigation.reLaunch("home/dashboard");
  }
}

function openPage(pageId: string) {
  props.navigation.navigateTo(pageId);
}

function showSupport() {
  props.showToast("档案助手功能待接入");
}

function getSectionIconMarkup(key: string) {
  return sectionIconMarkup[key] || sectionIconMarkup.basic;
}
</script>

<template>
  <section class="healthdocs-page">
    <header class="page-nav">
      <button class="back-btn" type="button" aria-label="返回" @click="goBack">
        <span class="back-arrow" aria-hidden="true"></span>
      </button>

      <button class="support-btn" type="button" aria-label="档案助手" @click="showSupport">
        <svg viewBox="0 0 32 32" focusable="false" aria-hidden="true">
          <path d="M8.5 15.5a7.5 7.5 0 0 1 15 0" />
          <rect x="7.5" y="15.5" width="4.6" height="8" rx="2.3" />
          <rect x="19.9" y="15.5" width="4.6" height="8" rx="2.3" />
          <path d="M24.5 23.5c0 2.3-1.9 4.2-4.2 4.2H16" />
        </svg>
      </button>
    </header>

    <main class="page-scroll">
      <section class="hero-card">
        <div class="hero-main">
          <div class="profile-avatar" aria-hidden="true">
            <span class="profile-avatar__glow"></span>
            <span class="profile-avatar__head"></span>
            <span class="profile-avatar__body"></span>
          </div>

          <div class="hero-copy">
            <h1>{{ mock.profile.name }}</h1>
            <span class="hero-pill">最近更新 {{ mock.profile.updatedAt }}</span>
            <p>{{ mock.profile.subtitle }}</p>
          </div>
        </div>

        <div class="stats-card">
          <article v-for="item in mock.profile.metrics" :key="item.key" class="stat-item">
            <span class="stat-item__icon" :class="`stat-item__icon--${item.key}`" aria-hidden="true">
              <svg viewBox="0 0 32 32" focusable="false">
                <g v-html="getMetricIconMarkup(item.key)"></g>
              </svg>
            </span>
            <span class="stat-item__label">{{ item.label }}</span>
            <strong class="stat-item__value">{{ item.value }}</strong>
          </article>
        </div>
      </section>

      <section class="menu-list" :aria-label="mock.title">
        <button
          v-for="item in mock.sections"
          :key="item.key"
          class="menu-item"
          type="button"
          @click="openPage(item.pageId)"
        >
          <span class="menu-item__icon" :class="`menu-item__icon--${item.key}`" aria-hidden="true">
            <svg viewBox="0 0 32 32" focusable="false">
              <g v-html="getSectionIconMarkup(item.key)"></g>
            </svg>
          </span>

          <span class="menu-item__copy">
            <span class="menu-item__top">
              <strong>{{ item.title }}</strong>
              <em>{{ item.meta }}</em>
            </span>
            <span class="menu-item__desc">{{ item.desc }}</span>
          </span>

          <span class="menu-arrow" aria-hidden="true"></span>
        </button>
      </section>
    </main>
  </section>
</template>

<style scoped>
.healthdocs-page {
  position: relative;
  left: 50%;
  width: min(390px, 100vw);
  height: min(844px, calc(100vh - 36px));
  min-height: min(844px, calc(100vh - 36px));
  max-height: 844px;
  margin: -18px 0;
  overflow: hidden;
  background:
    radial-gradient(circle at 82% 8%, rgba(102, 112, 240, 0.13) 0, rgba(102, 112, 240, 0) 28%),
    linear-gradient(180deg, #f1f8ff 0%, #f7f9fb 42%, #f5f6f7 100%);
  color: #30343f;
  font-family: "HarmonyOS Sans SC", "MiSans", "Source Han Sans SC", "Noto Sans SC", "PingFang SC", "Microsoft YaHei UI", sans-serif;
  transform: translateX(-50%);
  -webkit-font-smoothing: antialiased;
}

.page-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 66px;
  padding: 0 29px;
}

.back-btn,
.support-btn,
.menu-item {
  border: 0;
  background: transparent;
  color: inherit;
}

.back-btn,
.support-btn {
  display: grid;
  place-items: center;
  width: 36px;
  height: 44px;
  padding: 0;
}

.back-arrow {
  width: 14px;
  height: 14px;
  border-bottom: 4px solid #333333;
  border-left: 4px solid #333333;
  transform: rotate(45deg);
}

.support-btn {
  width: 40px;
  height: 40px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.66);
  box-shadow: 0 10px 24px rgba(72, 104, 148, 0.08);
}

.support-btn svg {
  width: 24px;
  height: 24px;
  fill: none;
  stroke: #3e4350;
  stroke-width: 2.2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.page-scroll {
  display: grid;
  gap: 16px;
  height: calc(100% - 66px);
  padding: 12px 31px 34px;
  overflow-y: auto;
  scrollbar-width: none;
}

.page-scroll::-webkit-scrollbar {
  display: none;
}

.hero-card,
.menu-item {
  border: 1px solid rgba(255, 255, 255, 0.74);
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 15px 34px rgba(72, 104, 148, 0.075);
}

.hero-card {
  display: grid;
  gap: 18px;
  padding: 20px 18px 18px;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.96) 0%, rgba(241, 247, 255, 0.93) 50%, rgba(236, 249, 245, 0.9) 100%);
}

.hero-main {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
}

.profile-avatar {
  position: relative;
  width: 76px;
  height: 76px;
  overflow: hidden;
  border: 2px solid rgba(255, 255, 255, 0.92);
  border-radius: 50%;
  background: linear-gradient(135deg, #d6d8de 0%, #7f848f 100%);
  box-shadow: 0 10px 18px rgba(54, 67, 92, 0.12);
}

.profile-avatar__glow {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 26% 24%, rgba(255, 255, 255, 0.78), transparent 28%),
    radial-gradient(circle at 72% 78%, rgba(0, 0, 0, 0.18), transparent 34%);
}

.profile-avatar__head,
.profile-avatar__body {
  position: absolute;
  z-index: 1;
  background: rgba(35, 35, 38, 0.84);
}

.profile-avatar__head {
  top: 16px;
  left: 23px;
  width: 21px;
  height: 21px;
  border-radius: 50%;
}

.profile-avatar__body {
  bottom: 14px;
  left: 15px;
  width: 46px;
  height: 34px;
  border-radius: 22px 22px 16px 16px;
  transform: rotate(-14deg);
}

.hero-copy {
  display: grid;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.hero-pill {
  display: inline-flex;
  align-items: center;
  justify-self: start;
  height: 24px;
  padding: 0 11px;
  border-radius: 999px;
  background: rgba(102, 112, 240, 0.1);
  color: #6670f0;
  font-size: 12px;
  font-weight: 500;
}

.hero-copy h1 {
  margin: 0;
  color: #293445;
  font-size: 28px;
  font-weight: 600;
  line-height: 1.2;
}

.hero-copy p {
  margin: 0;
  color: #7f8998;
  font-size: 14px;
  font-weight: 400;
}

.stats-card {
  position: relative;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0;
  padding: 10px 6px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.68);
  border-radius: 20px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.5) 0%, rgba(246, 249, 255, 0.78) 100%);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.78),
    0 8px 20px rgba(112, 130, 170, 0.05);
  backdrop-filter: blur(8px);
}

.stats-card::before {
  position: absolute;
  top: 0;
  right: 10px;
  left: 10px;
  height: 1px;
  content: "";
  background: linear-gradient(90deg, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0.95) 18%, rgba(255, 255, 255, 0.95) 82%, rgba(255, 255, 255, 0) 100%);
}

.stats-card::after {
  position: absolute;
  top: -24px;
  right: -18px;
  width: 112px;
  height: 60px;
  content: "";
  border-radius: 50%;
  background: radial-gradient(circle, rgba(126, 196, 255, 0.1) 0%, rgba(126, 196, 255, 0) 72%);
  pointer-events: none;
}

.stat-item {
  position: relative;
  display: grid;
  justify-items: center;
  align-content: center;
  gap: 4px;
  min-height: 72px;
  padding: 4px 8px;
  text-align: center;
}

.stat-item:not(:last-child)::after {
  position: absolute;
  top: 50%;
  right: 0;
  width: 1px;
  height: 34px;
  content: "";
  transform: translateY(-50%);
  background: linear-gradient(180deg, rgba(161, 170, 193, 0) 0%, rgba(161, 170, 193, 0.3) 22%, rgba(161, 170, 193, 0.3) 78%, rgba(161, 170, 193, 0) 100%);
}

.stat-item__icon {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  border-radius: 10px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.74) 0%, rgba(241, 245, 255, 0.92) 100%);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.78),
    0 4px 10px rgba(112, 130, 170, 0.06);
}

.stat-item__icon svg {
  width: 15px;
  height: 15px;
}

.stat-item__icon g {
  fill: none;
  stroke: currentColor;
  stroke-width: 1.9;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.stat-item__icon--age {
  color: #6b74f2;
}

.stat-item__icon--height {
  color: #35bfa0;
}

.stat-item__icon--weight {
  color: #f0b84f;
}

.stat-item__label {
  display: block;
  text-align: center;
  color: #98a1b2;
  font-size: 11px;
  font-weight: 400;
  line-height: 1.1;
  letter-spacing: 0.04em;
}

.stat-item__value {
  display: block;
  text-align: center;
  color: #2f3746;
  font-size: 17px;
  font-weight: 600;
  line-height: 1.1;
  letter-spacing: -0.02em;
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.55);
}

.menu-list {
  display: grid;
  gap: 14px;
}

.menu-item {
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr) 10px;
  gap: 14px;
  align-items: center;
  width: 100%;
  min-height: 92px;
  padding: 0 18px;
  text-align: left;
}

.menu-item__icon {
  display: grid;
  place-items: center;
  width: 46px;
  height: 46px;
  border-radius: 50%;
}

.menu-item__icon svg {
  width: 27px;
  height: 27px;
}

.menu-item__icon g {
  fill: none;
  stroke: currentColor;
  stroke-width: 2.1;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.menu-item__icon--basic {
  background: rgba(63, 200, 168, 0.12);
  color: #34c9a7;
}

.menu-item__icon--health {
  background: rgba(106, 122, 248, 0.1);
  color: #6678ff;
}

.menu-item__icon--medication {
  background: rgba(241, 196, 77, 0.14);
  color: #f1c44d;
}

.menu-item__icon--data {
  background: rgba(53, 119, 255, 0.1);
  color: #3577ff;
}

.menu-item__icon--report {
  background: rgba(255, 123, 107, 0.12);
  color: #ff7b6b;
}

.menu-item__copy {
  display: grid;
  gap: 6px;
  min-width: 0;
}

.menu-item__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.menu-item__top strong {
  color: #3a3f4b;
  font-size: 20px;
  font-weight: 600;
  letter-spacing: 0.01em;
}

.menu-item__top em {
  font-style: normal;
  color: #9aa2b1;
  font-size: 13px;
  white-space: nowrap;
}

.menu-item__desc {
  color: #7f8998;
  font-size: 14px;
  line-height: 1.5;
}

.menu-arrow {
  width: 10px;
  height: 10px;
  border-top: 2px solid #c4c9d3;
  border-right: 2px solid #c4c9d3;
  transform: rotate(45deg);
}

@media (min-width: 561px) {
  .healthdocs-page {
    height: 844px;
    min-height: 844px;
  }
}

@media (max-width: 389px) {
  .page-scroll {
    padding-right: 24px;
    padding-left: 24px;
  }

  .hero-main {
    align-items: flex-start;
  }

  .stats-card {
    grid-template-columns: 1fr;
    gap: 0;
    padding-top: 10px;
  }

  .stat-item {
    min-height: 68px;
    padding: 8px 8px 10px;
  }

  .stat-item:not(:last-child)::after {
    top: auto;
    right: auto;
    bottom: 0;
    left: 50%;
    width: 72%;
    height: 1px;
    transform: translateX(-50%);
    background: linear-gradient(90deg, rgba(161, 170, 193, 0) 0%, rgba(161, 170, 193, 0.45) 22%, rgba(161, 170, 193, 0.45) 78%, rgba(161, 170, 193, 0) 100%);
  }

  .menu-item__top {
    align-items: flex-start;
    flex-direction: column;
    gap: 4px;
  }

  .menu-item__top strong {
    font-size: 18px;
  }
}
</style>
