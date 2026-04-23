<script setup lang="ts">
import type { PageComponentProps } from "@ihc/page-core/types";
import { setHealthDataBackTarget } from "@/pages/health/health-data/source";
import avatarImage from "@/assets/community/activities/people.png";
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

function goBack() {
  if (!props.navigation.navigateBack()) {
    props.navigation.reLaunch("home/dashboard");
  }
}

function openPage(pageId: string) {
  if (pageId === "health/health-data") {
    setHealthDataBackTarget("healthdocs/health-records");
  }

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
          <img class="profile-avatar" :src="avatarImage" :alt="mock.profile.name" draggable="false" />

          <div class="hero-copy">
            <div class="hero-copy__top">
              <h1>{{ mock.profile.name }}</h1>
            </div>
            <p class="hero-caption">{{ mock.profile.subtitle }}</p>

            <div class="stats-card" aria-label="基础指标">
              <article v-for="item in mock.profile.metrics" :key="item.key" class="stat-item">
                <span class="stat-item__label">{{ item.label }}</span>
                <strong class="stat-item__value">{{ item.value }}</strong>
              </article>
            </div>
          </div>
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
    radial-gradient(circle at 82% 8%, rgba(117, 214, 223, 0.18) 0, rgba(117, 214, 223, 0) 28%),
    linear-gradient(180deg, #f1f8ff 0%, #f7f9fb 42%, #f5f6f7 100%);
  color: #252939;
  font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif;
  transform: translateX(-50%);
  -webkit-font-smoothing: antialiased;
  text-rendering: geometricPrecision;
}

.page-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 62px;
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
  height: 40px;
  padding: 0;
}

.back-arrow {
  width: 14px;
  height: 14px;
  border-bottom: 3px solid #252939;
  border-left: 3px solid #252939;
  transform: rotate(45deg);
}

.support-btn {
  width: 36px;
  height: 36px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.7);
  box-shadow: 0 8px 18px rgba(72, 104, 148, 0.06);
}

.support-btn svg {
  width: 22px;
  height: 22px;
  fill: none;
  stroke: #48bfa3;
  stroke-width: 2.2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.page-scroll {
  display: grid;
  gap: 10px;
  height: calc(100% - 62px);
  padding: 6px 31px 24px;
  overflow-y: auto;
  scrollbar-width: none;
}

.page-scroll::-webkit-scrollbar {
  display: none;
}

.hero-card,
.menu-item {
  border: 1px solid rgba(255, 255, 255, 0.74);
  border-radius: 15px;
  background: rgba(255, 255, 255, 0.86);
  box-shadow: 0 16px 34px rgba(82, 105, 148, 0.08);
}

.hero-card {
  align-self: start;
  height: auto;
  min-height: 0;
  padding: 14px 16px;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.97) 0%, rgba(244, 248, 255, 0.94) 56%, rgba(240, 250, 246, 0.88) 100%);
}

.hero-main {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.profile-avatar {
  flex: 0 0 82px;
  width: 82px;
  height: 82px;
  display: block;
  box-sizing: border-box;
  border: 2px solid rgba(255, 255, 255, 0.96);
  border-radius: 50%;
  object-fit: cover;
  box-shadow: 0 10px 20px rgba(54, 67, 92, 0.1);
  user-select: none;
}

.hero-copy {
  display: grid;
  align-content: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.hero-copy__top {
  display: flex;
  align-items: center;
  min-height: auto;
}

.hero-copy h1 {
  margin: 0;
  color: #222733;
  font-size: 22px;
  font-weight: 900;
  line-height: 1;
  letter-spacing: 0;
}

.hero-caption {
  margin: 0;
  color: #8f95a2;
  font-size: 12px;
  font-weight: 800;
  line-height: 1.35;
}

.stats-card {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  align-items: flex-start;
  width: 100%;
  max-width: 198px;
  padding: 7px 9px;
  border: 1px solid rgba(255, 255, 255, 0.66);
  border-radius: 15px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.62) 0%, rgba(243, 247, 254, 0.66) 100%);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.72);
}

.stat-item {
  position: relative;
  display: grid;
  gap: 5px;
  min-width: 0;
  padding-right: 9px;
  text-align: left;
}

.stat-item:not(:last-child) {
  margin-right: 9px;
}

.stat-item:not(:last-child)::after {
  position: absolute;
  top: 6px;
  right: 0;
  width: 1px;
  height: 30px;
  content: "";
  background: linear-gradient(180deg, rgba(193, 200, 214, 0) 0%, rgba(193, 200, 214, 0.34) 20%, rgba(193, 200, 214, 0.34) 80%, rgba(193, 200, 214, 0) 100%);
}

.stat-item__label {
  display: block;
  color: #8f95a2;
  font-size: 12px;
  font-weight: 800;
  line-height: 1;
  letter-spacing: 0;
}

.stat-item__value {
  display: block;
  color: #222733;
  font-size: 16px;
  font-weight: 900;
  line-height: 1;
  letter-spacing: 0;
  font-variant-numeric: tabular-nums;
}

.menu-list {
  display: grid;
  gap: 10px;
}

.menu-item {
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr) 10px;
  gap: 12px;
  align-items: center;
  width: 100%;
  min-height: 78px;
  padding: 0 16px;
  text-align: left;
}

.menu-item__icon {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
}

.menu-item__icon svg {
  width: 24px;
  height: 24px;
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
  background: rgba(105, 213, 209, 0.12);
  color: #69d5d1;
}

.menu-item__icon--medication {
  background: rgba(241, 196, 77, 0.14);
  color: #f1c44d;
}

.menu-item__icon--data {
  background: rgba(117, 214, 223, 0.12);
  color: #4fbfca;
}

.menu-item__icon--report {
  background: rgba(255, 123, 107, 0.12);
  color: #ff7b6b;
}

.menu-item__copy {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.menu-item__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.menu-item__top strong {
  color: #222733;
  font-size: 16px;
  font-weight: 900;
  letter-spacing: 0;
}

.menu-item__top em {
  font-style: normal;
  color: #8f95a2;
  font-size: 12px;
  font-weight: 800;
  white-space: nowrap;
}

.menu-item__desc {
  color: #8f95a2;
  font-size: 12px;
  font-weight: 800;
  line-height: 1.45;
}

.menu-arrow {
  width: 9px;
  height: 9px;
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
    gap: 12px;
  }

  .profile-avatar {
    flex-basis: 76px;
    width: 76px;
    height: 76px;
    border-radius: 50%;
  }

  .hero-copy {
    gap: 7px;
  }

  .hero-copy h1 {
    font-size: 20px;
  }

  .hero-caption {
    font-size: 11px;
  }

  .stats-card {
    max-width: 176px;
    padding: 6px 7px;
  }

  .stat-item {
    gap: 5px;
    min-width: 0;
    padding-right: 7px;
  }

  .stat-item:not(:last-child) {
    margin-right: 7px;
  }

  .stat-item:not(:last-child)::after {
    height: 26px;
  }

  .stat-item__label {
    font-size: 11px;
  }

  .stat-item__value {
    font-size: 15px;
  }

  .menu-item__top {
    align-items: flex-start;
    flex-direction: column;
    gap: 4px;
  }

  .menu-item__top strong {
    font-size: 16px;
  }
}
</style>
