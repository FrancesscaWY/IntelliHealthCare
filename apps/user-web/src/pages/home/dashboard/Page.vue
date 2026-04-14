<script setup lang="ts">
import { ref } from "vue";
import type { PageComponentProps } from "@ihc/page-core/types";
import locationIcon from "@/assets/home/topbar/定位.png";
import scanIcon from "@/assets/home/topbar/二维码.png";
import mock from "./mock";

const props = defineProps<PageComponentProps>();
const searchValue = ref("");

const navIconMarkup: Record<string, string> = {
  home: `
    <path d="M7.3 18.2 24 5.2l16.7 13v20a2.5 2.5 0 0 1-2.5 2.5h-8.9V29.2H18.7v11.5H9.8a2.5 2.5 0 0 1-2.5-2.5v-20Z" />
  `,
  circle: `
    <circle cx="24" cy="24" r="14.2" />
    <path d="m29.7 14.3-3.6 10.4-10.4 3.6 3.6-10.4 10.4-3.6Z" />
    <circle cx="24" cy="24" r="2.2" />
  `,
  message: `
    <path d="M38.3 22.2c0 7.1-6.15 12.75-14.3 12.75-1.8 0-3.55-.3-5.1-.85l-8.45 4.45 2.45-7.25c-2.05-2.3-3.2-5.4-3.2-9.1 0-7.1 6.15-12.75 14.3-12.75S38.3 15.1 38.3 22.2Z" />
  `,
  mine: `
    <circle cx="24" cy="16.7" r="7.3" />
    <path d="M10.2 39.2c1.45-7.3 6.05-11.2 13.8-11.2s12.35 3.9 13.8 11.2" />
  `,
};

function getNavIconMarkup(key: string) {
  return navIconMarkup[key] || navIconMarkup.home;
}

function getNavGradientId(key: string) {
  return `tab-gradient-${key}`;
}

const serviceIconColors: Record<string, readonly [string, string]> = {
  care: ["#6a74f1", "#f08093"],
  rehab: ["#6f78ee", "#8fd8c8"],
  exam: ["#7e80ee", "#f28a9b"],
};

const serviceIconMarkup: Record<string, string> = {
  care: `
    <path d="M8.5 21.7 24 9.2l15.5 12.5v17.1a2.6 2.6 0 0 1-2.6 2.6H11.1a2.6 2.6 0 0 1-2.6-2.6V21.7Z" />
    <path d="M18.4 31.4c-2.6-2.3-4.35-4.1-4.35-6.5 0-2.15 1.6-3.75 3.7-3.75 1.25 0 2.3.6 3.25 1.72.95-1.12 2-1.72 3.25-1.72 2.1 0 3.7 1.6 3.7 3.75 0 2.4-1.75 4.2-4.35 6.5L21 33.8l-2.6-2.4Z" fill="#fff" opacity=".9" />
    <path d="M27.5 19.2h5.2v5.2h-5.2z" fill="#fff" opacity=".45" />
  `,
  rehab: `
    <circle cx="24" cy="12.8" r="5.1" />
    <path d="M14.2 23.2c1.8-4 5.1-6.2 9.8-6.2s8 2.2 9.8 6.2l-5.6 2.05c-.75-1.55-2.15-2.45-4.2-2.45s-3.45.9-4.2 2.45l-5.6-2.05Z" opacity=".92" />
    <path d="M12.2 33.5c3.45-3.3 7.35-5 11.8-5s8.35 1.7 11.8 5v6.9H12.2v-6.9Z" />
    <path d="M16.2 31.3c3.3 1.95 6.3 2.15 9 .6 1.9-1.1 3.6-1.15 5.05-.1 1.05.76 1.88 1.7 2.5 2.8" fill="none" stroke="#fff" stroke-linecap="round" stroke-width="3.1" opacity=".82" />
  `,
  exam: `
    <path d="M15.4 8.6h17.2v12.2c0 4.75-3.85 8.6-8.6 8.6s-8.6-3.85-8.6-8.6V8.6Z" />
    <path d="M17.8 8.6v9.8a6.2 6.2 0 0 0 12.4 0V8.6" fill="none" stroke="#fff" stroke-linecap="round" stroke-width="3" opacity=".85" />
    <path d="M13.2 9.1h5.4" stroke="#fff" stroke-linecap="round" stroke-width="3" opacity=".7" />
    <path d="M29.4 9.1h5.4" stroke="#fff" stroke-linecap="round" stroke-width="3" opacity=".7" />
    <path d="M24 29.4v2.2c0 3.75 3.05 6.8 6.8 6.8 2.8 0 5.1-2.25 5.1-5.05" fill="none" stroke="url(#service-gradient-exam)" stroke-linecap="round" stroke-width="4" />
    <circle cx="35.9" cy="33.3" r="4.1" fill="#fff" opacity=".9" />
    <circle cx="35.9" cy="33.3" r="2" />
  `,
};

function getServiceIconColors(key: string) {
  return serviceIconColors[key] || serviceIconColors.care;
}

function getServiceGradientId(key: string) {
  return `service-gradient-${key}`;
}

function getServiceIconMarkup(key: string) {
  return serviceIconMarkup[key] || serviceIconMarkup.care;
}

const featureIconColors: Record<string, readonly [string, string]> = {
  chart: ["#35cfa4", "#a8efdc"],
  device: ["#6b70ee", "#bbbffd"],
  medicine: ["#efc84f", "#ffe6a6"],
  meal: ["#4f84ff", "#a5c8ff"],
  book: ["#f36e70", "#ffb7b1"],
  archive: ["#45c89c", "#9ee8d2"],
  activity: ["#7478f0", "#bdc0fb"],
  news: ["#f0c85b", "#ffe5a1"],
  building: ["#2f78ef", "#9bc8ff"],
  video: ["#f36b68", "#ffb3ad"],
  bowl: ["#42d2ad", "#a8f0dd"],
  test: ["#7277ee", "#bdc1fb"],
};

const featureIconMarkup: Record<string, string> = {
  chart: `
    <path d="M15.2 4.5a11.5 11.5 0 1 0 11.5 11.5H15.2V4.5Z" />
    <path d="M17.7 4.8v8.7h8.7a10.7 10.7 0 0 0-8.7-8.7Z" opacity=".62" />
  `,
  device: `
    <rect x="6" y="4.8" width="20" height="7.3" rx="1.5" />
    <rect x="6" y="13.5" width="20" height="7.3" rx="1.5" opacity=".86" />
    <rect x="6" y="22.2" width="20" height="5" rx="1.5" opacity=".64" />
    <circle cx="10" cy="8.45" r="1.15" fill="#fff" opacity=".95" />
    <circle cx="10" cy="17.15" r="1.15" fill="#fff" opacity=".9" />
  `,
  medicine: `
    <path d="M11 4.4h10v4.1H11z" />
    <path d="M9.2 8.5h13.6v18.3a1.9 1.9 0 0 1-1.9 1.9h-9.8a1.9 1.9 0 0 1-1.9-1.9V8.5Z" opacity=".9" />
    <rect x="14.7" y="15" width="2.6" height="8.1" rx=".6" fill="#fff" opacity=".9" />
    <rect x="12.25" y="17.75" width="7.5" height="2.6" rx=".6" fill="#fff" opacity=".9" />
  `,
  meal: `
    <path d="M6.4 15.2h19.2v2.1c0 5-4.1 9.1-9.1 9.1h-1c-5 0-9.1-4.1-9.1-9.1v-2.1Z" />
    <rect x="8" y="27.1" width="16" height="2" rx="1" opacity=".52" />
    <rect x="8.8" y="4.6" width="2.2" height="7.2" rx="1.1" transform="rotate(10 9.9 8.2)" />
    <rect x="15" y="3.8" width="2.2" height="8" rx="1.1" transform="rotate(10 16.1 7.8)" />
    <rect x="21.2" y="4.6" width="2.2" height="7.2" rx="1.1" transform="rotate(10 22.3 8.2)" />
  `,
  book: `
    <path d="M8.3 6.1h15.4a1.8 1.8 0 0 1 1.8 1.8v17.8H9.1a2.6 2.6 0 0 1-2.6-2.6V7.9a1.8 1.8 0 0 1 1.8-1.8Z" />
    <path d="M6.5 22.8c0-1.4 1.2-2.6 2.6-2.6h16.4v5.5H9.1a2.9 2.9 0 0 1-2.6-2.9Z" opacity=".56" />
    <rect x="11" y="10.3" width="8.9" height="2.2" rx="1.1" fill="#fff" opacity=".92" />
  `,
  archive: `
    <path d="M9 4.8h11.2l5 5v17.4H9a2 2 0 0 1-2-2V6.8a2 2 0 0 1 2-2Z" />
    <path d="M20.2 4.8v5h5" fill="#fff" opacity=".36" />
    <rect x="11.6" y="12.5" width="8.8" height="2.2" rx="1.1" fill="#fff" opacity=".9" />
    <rect x="11.6" y="17.7" width="8.8" height="2.2" rx="1.1" fill="#fff" opacity=".72" />
    <circle cx="23.6" cy="24.2" r="2.9" fill="#fff" opacity=".58" />
  `,
  activity: `
    <circle cx="10.8" cy="11.1" r="4" />
    <circle cx="22.2" cy="12" r="3.4" opacity=".82" />
    <path d="M4.8 27.2c.55-5.2 3.1-8.2 7.4-8.2 2.6 0 4.55 1.1 5.85 3.2-1.1 1.2-1.9 2.9-2.4 5H4.8Z" />
    <path d="M18.3 27.2c.75-4.05 2.85-6.45 6.2-6.45 1.15 0 2.1.23 2.85.72-1.2 2.6-3.7 4.7-7.45 5.73h-1.6Z" opacity=".7" />
    <path d="M21.9 18.3c2.4-.25 4.1-1.4 5.2-3.5.2 2.55-1 4.25-3.65 5.1-.55-.7-1.05-1.2-1.55-1.6Z" fill="#fff" opacity=".62" />
  `,
  news: `
    <path d="M6.8 9h18.4v13.2a4.3 4.3 0 0 1-4.3 4.3H11.1a4.3 4.3 0 0 1-4.3-4.3V9Z" />
    <path d="M4.2 12.6h4v9.5a4 4 0 0 1-4 4v-13.5Z" opacity=".64" />
    <path d="M23.8 12.6h4v13.5a4 4 0 0 1-4-4v-9.5Z" opacity=".64" />
    <rect x="11.5" y="13.4" width="9" height="2.1" rx="1.05" fill="#fff" opacity=".72" />
    <rect x="11.5" y="18.3" width="9" height="2.1" rx="1.05" fill="#fff" opacity=".55" />
  `,
  building: `
    <path d="M7 5.7h12.3v22H7z" />
    <path d="M18.2 12.3h7v15.4h-7z" opacity=".68" />
    <rect x="10" y="9.6" width="3.4" height="3.2" rx=".6" fill="#fff" opacity=".86" />
    <rect x="10" y="16.2" width="3.4" height="3.2" rx=".6" fill="#fff" opacity=".68" />
    <rect x="21" y="18" width="2.2" height="7" rx=".6" fill="#fff" opacity=".48" />
    <rect x="5.2" y="27.1" width="22.2" height="1.8" rx=".9" opacity=".45" />
  `,
  video: `
    <path d="M7 7.1h14.3a2 2 0 0 1 2 2v13.8a2 2 0 0 1-2 2H7z" />
    <path d="M23.3 12.2 28 9.3v13.4l-4.7-2.9v-7.6Z" opacity=".62" />
    <path d="M13.2 12.2v7.6l6-3.8-6-3.8Z" fill="#fff" opacity=".9" />
  `,
  bowl: `
    <path d="M6.1 16.1h19.8v2.2a8.8 8.8 0 0 1-8.8 8.8h-2.2a8.8 8.8 0 0 1-8.8-8.8v-2.2Z" />
    <rect x="8.4" y="27.6" width="15.2" height="1.9" rx=".95" opacity=".55" />
    <rect x="9" y="5" width="2.2" height="7.4" rx="1.1" transform="rotate(12 10.1 8.7)" />
    <rect x="15" y="3.9" width="2.2" height="8.6" rx="1.1" transform="rotate(12 16.1 8.2)" />
    <rect x="21" y="5" width="2.2" height="7.4" rx="1.1" transform="rotate(12 22.1 8.7)" />
  `,
  test: `
    <path d="M10.1 5.6h12.7a2 2 0 0 1 2 2v20H10.1z" />
    <path d="M7.2 8.4h5.1v19.2H7.2z" opacity=".66" />
    <path d="M20.1 8.1h4.7l2.2 19.5h-5.1L20.1 8.1Z" opacity=".56" />
    <rect x="12.7" y="11.6" width="4" height="4" rx=".7" fill="#fff" opacity=".75" />
    <rect x="12.7" y="20" width="4" height="4" rx=".7" fill="#fff" opacity=".58" />
  `,
};

function getFeatureIconColors(icon: string) {
  return featureIconColors[icon] || featureIconColors.chart;
}

function getFeatureGradientId(icon: string) {
  return `feature-gradient-${icon}`;
}

function getFeatureIconMarkup(icon: string) {
  return featureIconMarkup[icon] || featureIconMarkup.chart;
}

function openPage(pageId: string, label?: string) {
  if (!pageId) {
    props.showToast(`${label || "该"}功能待接入`);
    return;
  }

  props.navigation.navigateTo(pageId);
}

function applyTag(tag: string) {
  searchValue.value = tag;
}

function showAction(label: string) {
  props.showToast(`${label}功能待接入`);
}
</script>

<template>
  <section class="home-page">
    <main class="home-scroll">
      <header class="home-topbar">
        <button class="location-btn" type="button" @click="openPage('home/location-select', '选择地区')">
          <img class="location-icon" :src="locationIcon" alt="定位" draggable="false" />
          <span>{{ mock.city }}</span>
          <span class="location-caret" aria-hidden="true"></span>
        </button>

        <button class="scan-btn" type="button" aria-label="扫一扫" @click="showAction('扫一扫')">
          <img :src="scanIcon" alt="扫一扫" draggable="false" />
        </button>
      </header>

      <section class="search-wrap">
        <button class="search-box" type="button" @click="openPage('home/search', '搜索')">
          <span class="search-icon" aria-hidden="true"></span>
          <span class="search-placeholder">搜索</span>
        </button>

        <div class="search-tags">
          <button v-for="tag in mock.searchTags" :key="tag" type="button" @click="applyTag(tag)">{{ tag }}</button>
        </div>
      </section>

      <section class="service-grid" aria-label="上门服务">
        <button v-for="item in mock.services" :key="item.key" class="service-card" type="button" @click="openPage(item.pageId, item.title)">
          <span class="service-icon" :class="`service-icon--${item.key}`" aria-hidden="true">
            <svg class="service-svg" viewBox="0 0 48 48" focusable="false">
              <defs>
                <linearGradient :id="getServiceGradientId(item.key)" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" :stop-color="getServiceIconColors(item.key)[0]" />
                  <stop offset="100%" :stop-color="getServiceIconColors(item.key)[1]" />
                </linearGradient>
              </defs>
              <g :fill="`url(#${getServiceGradientId(item.key)})`" v-html="getServiceIconMarkup(item.key)"></g>
            </svg>
          </span>
          <strong>{{ item.title }}</strong>
          <small>{{ item.desc }}</small>
        </button>
      </section>

      <section class="feature-panel" aria-label="功能导航">
        <button v-for="item in mock.features" :key="item.title" class="feature-item" type="button" @click="openPage(item.pageId, item.title)">
          <span class="feature-icon" aria-hidden="true">
            <svg class="feature-svg" viewBox="0 0 32 32" focusable="false">
              <defs>
                <linearGradient :id="getFeatureGradientId(item.icon)" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" :stop-color="getFeatureIconColors(item.icon)[0]" />
                  <stop offset="100%" :stop-color="getFeatureIconColors(item.icon)[1]" />
                </linearGradient>
              </defs>
              <g :fill="`url(#${getFeatureGradientId(item.icon)})`" v-html="getFeatureIconMarkup(item.icon)"></g>
            </svg>
          </span>
          <strong>{{ item.title }}</strong>
        </button>
      </section>

      <section
        class="reminder-card"
        role="button"
        tabindex="0"
        @click="openPage('health/medication-info', '用药信息')"
        @keydown.enter="openPage('health/medication-info', '用药信息')"
      >
        <div class="reminder-label">
          <span>健康</span>
          <span>提醒</span>
        </div>
        <span class="reminder-divider" aria-hidden="true"></span>
        <div class="reminder-content">
          <strong>
            <span class="bell-icon" aria-hidden="true"></span>
            {{ mock.reminder.title }}
          </strong>
          <p>{{ mock.reminder.detail }}</p>
        </div>
      </section>

      <section class="disease-section">
        <header class="section-header">
          <h2>疾病宝典</h2>
          <button type="button" @click="openPage('content/disease-guide', '疾病宝典')">
            更多
            <span aria-hidden="true"></span>
          </button>
        </header>

        <div class="disease-list">
          <button v-for="item in mock.diseases" :key="item" type="button" class="disease-pill" @click="openPage('content/disease-guide', item)">
            {{ item }}
          </button>
        </div>

        <div class="article-list">
          <article v-for="item in mock.articles" :key="item.title" class="article-card">
            <section class="article-copy">
              <h3>{{ item.title }}</h3>
              <p>{{ item.desc }}</p>
            </section>

            <div class="article-photos" aria-hidden="true">
              <span class="article-photo article-photo--fruit"></span>
              <span class="article-photo article-photo--needle"></span>
              <span class="article-photo article-photo--food"></span>
            </div>

            <footer class="article-actions">
              <button class="article-action article-action--share" type="button" aria-label="分享" @click="showAction('分享')">
                <svg class="article-icon article-icon--share" viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="18" cy="5" r="2.7" />
                  <circle cx="6" cy="12" r="2.7" />
                  <circle cx="18" cy="19" r="2.7" />
                  <path d="M8.45 10.85 15.55 6.3" />
                  <path d="M8.45 13.15 15.55 17.7" />
                </svg>
              </button>
              <button class="article-action article-action--like" type="button" @click="showAction('点赞')">
                <svg class="article-icon article-icon--heart" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 20.8 5.25 14.1C3.55 12.4 2.4 10.85 2.4 8.65 2.4 5.75 4.65 3.6 7.5 3.6c1.65 0 3.15.78 4.5 2.28 1.35-1.5 2.85-2.28 4.5-2.28 2.85 0 5.1 2.15 5.1 5.05 0 2.2-1.15 3.75-2.85 5.45L12 20.8Z" />
                </svg>
                {{ item.likes }}
              </button>
              <button class="article-action article-action--star" type="button" @click="showAction('收藏')">
                <svg class="article-icon article-icon--star" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="m12 3.15 2.68 5.43 5.99.87-4.33 4.22 1.02 5.96L12 16.82l-5.36 2.81 1.02-5.96-4.33-4.22 5.99-.87L12 3.15Z" />
                </svg>
                {{ item.stars }}
              </button>
              <button class="article-action article-action--comment" type="button" @click="showAction('评论')">
                <svg class="article-icon article-icon--comment" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M20.3 11.3c0 4.1-3.55 7.35-8.25 7.35-1.05 0-2.05-.17-2.97-.5L4.2 20.7l1.42-4.18C4.45 15.2 3.8 13.4 3.8 11.3c0-4.1 3.55-7.35 8.25-7.35s8.25 3.25 8.25 7.35Z" />
                </svg>
                {{ item.comments }}
              </button>
            </footer>
          </article>
        </div>
      </section>
    </main>

    <nav class="home-tabbar" aria-label="底部导航">
      <button
        v-for="item in mock.tabs"
        :key="item.key"
        class="tab-item"
        :class="[
          `tab-item--${item.key}`,
          { 'tab-item--active': item.key === 'home', 'tab-item--publish': item.key === 'publish' },
        ]"
        type="button"
        @click="openPage(item.pageId, item.label || '发布')"
      >
        <span v-if="item.key === 'publish'" class="tab-icon tab-icon--publish" aria-hidden="true"></span>
        <span v-else class="tab-image" :class="`tab-image--${item.key}`" aria-hidden="true">
          <svg class="tab-svg" viewBox="0 0 48 48" focusable="false">
            <defs>
              <linearGradient :id="getNavGradientId(item.key)" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#6a74f1" />
                <stop offset="100%" stop-color="#ef6f8e" />
              </linearGradient>
            </defs>
            <g
              :fill="item.key === 'home' ? `url(#${getNavGradientId(item.key)})` : 'none'"
              :stroke="item.key === 'home' ? 'none' : 'currentColor'"
              stroke-width="3.2"
              stroke-linecap="round"
              stroke-linejoin="round"
              v-html="getNavIconMarkup(item.key)"
            ></g>
          </svg>
        </span>
        <span v-if="item.label" class="tab-label">{{ item.label }}</span>
      </button>
    </nav>
  </section>
</template>

<style scoped>
.home-page {
  position: relative;
  left: 50%;
  width: min(390px, 100vw);
  height: min(844px, calc(100vh - 36px));
  min-height: min(844px, calc(100vh - 36px));
  max-height: 844px;
  margin: -18px 0;
  transform: translateX(-50%);
  overflow: hidden;
  background:
    linear-gradient(180deg, rgba(255, 242, 246, 0) 0%, rgba(255, 235, 241, 0.2) 7%, rgba(255, 217, 229, 0.26) 18%, rgba(255, 238, 243, 0.18) 31%, rgba(255, 246, 249, 0) 44%),
    linear-gradient(180deg, #cce6ff 0%, #edf4ff 32%, #f0f8fb 100%);
  color: #252939;
  font-family: "HarmonyOS Sans SC", "MiSans", "Source Han Sans SC", "Noto Sans SC", "PingFang SC", "Microsoft YaHei UI", sans-serif;
  -webkit-font-smoothing: antialiased;
  text-rendering: geometricPrecision;
}

.home-scroll {
  height: 100%;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 22px 22px 108px;
  scrollbar-width: none;
}

.home-scroll::-webkit-scrollbar {
  display: none;
}

.home-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.location-btn,
.scan-btn,
.search-box,
.search-tags button,
.service-card,
.feature-item,
.section-header button,
.tab-item {
  border: 0;
  background: transparent;
  color: inherit;
}

.location-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0;
  color: #222733;
  font-size: 17px;
  font-weight: 400;
}

.location-icon {
  display: block;
  width: 20px;
  height: 20px;
  object-fit: contain;
  user-select: none;
}

.location-caret {
  width: 7px;
  height: 7px;
  margin-top: -2px;
  border-right: 2px solid #252939;
  border-bottom: 2px solid #252939;
  transform: rotate(45deg);
}

.scan-btn {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.66);
  box-shadow: 0 10px 24px rgba(80, 111, 156, 0.08);
  transform: translateX(-8px);
}

.scan-btn img {
  display: block;
  width: 38px;
  height: 38px;
  object-fit: contain;
  transform: translateX(-6px);
  user-select: none;
}

.search-wrap {
  margin-top: 24px;
}

.search-box {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
  height: 40px;
  padding: 0 28px;
  border: 3px solid transparent;
  border-radius: 19px;
  background:
    linear-gradient(#ffffff, #ffffff) padding-box,
    linear-gradient(90deg, #6b72f1 0%, #ff6d68 100%) border-box;
  box-shadow: 0 12px 30px rgba(121, 124, 196, 0.08);
}

.search-icon {
  position: relative;
  width: 16px;
  height: 16px;
  margin-right: 6px;
  border: 2px solid #c9c9c9;
  border-radius: 50%;
}

.search-icon::after {
  position: absolute;
  right: -7px;
  bottom: -3px;
  width: 8px;
  height: 2px;
  content: "";
  border-radius: 999px;
  background: #c9c9c9;
  transform: rotate(45deg);
}

.search-placeholder {
  color: #a7a9b0;
  font-size: 16px;
}

.search-tags {
  display: flex;
  gap: 11px;
  margin-top: 16px;
}

.search-tags button {
  height: 24px;
  padding: 0 14px;
  border: 1px solid rgba(255, 255, 255, 0.72);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.84);
  box-shadow: 0 8px 18px rgba(107, 126, 160, 0.06);
  color: #8f95a2;
  font-size: 13px;
}

.service-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-top: 46px;
}

.service-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 122px;
  padding: 18px 8px 15px;
  border: 1px solid rgba(255, 255, 255, 0.68);
  border-radius: 15px;
  background: rgba(255, 255, 255, 0.86);
  box-shadow: 0 16px 34px rgba(82, 105, 148, 0.08);
}

.service-icon {
  display: grid;
  place-items: center;
  width: 55px;
  height: 55px;
  border-radius: 50%;
  background: linear-gradient(180deg, rgba(234, 234, 255, 0.92) 0%, rgba(247, 248, 255, 0.74) 100%);
}

.service-svg {
  display: block;
  width: 44px;
  height: 44px;
  overflow: visible;
  filter: drop-shadow(0 7px 9px rgba(92, 102, 164, 0.13));
}

.service-card strong {
  margin-top: 13px;
  color: #252939;
  font-size: 17px;
  font-weight: 500;
  letter-spacing: 0.01em;
  white-space: nowrap;
}

.service-card small {
  margin-top: 6px;
  color: #90949f;
  font-size: 13px;
  white-space: nowrap;
}

.feature-panel {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  row-gap: 24px;
  margin-top: 16px;
  padding: 24px 16px 25px;
  border: 1px solid rgba(255, 255, 255, 0.7);
  border-radius: 15px;
  background: rgba(255, 255, 255, 0.86);
  box-shadow: 0 15px 34px rgba(82, 105, 148, 0.065);
}

.feature-item {
  display: grid;
  justify-items: center;
  gap: 9px;
  padding: 0;
}

.feature-item strong {
  color: #202534;
  font-size: 16px;
  font-weight: 400;
  letter-spacing: 0.015em;
  line-height: 1.1;
  white-space: nowrap;
}

.feature-icon {
  display: grid;
  place-items: center;
  width: 31px;
  height: 31px;
}

.feature-svg {
  display: block;
  width: 31px;
  height: 31px;
  overflow: visible;
  filter: drop-shadow(0 5px 6px rgba(103, 113, 151, 0.1));
}

.reminder-card {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-top: 16px;
  padding: 18px 32px;
  border: 1px solid rgba(255, 255, 255, 0.72);
  border-radius: 15px;
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 14px 30px rgba(82, 105, 148, 0.06);
  cursor: pointer;
}

.reminder-label {
  display: grid;
  gap: 2px;
  min-width: 52px;
  color: #35d19c;
  font-size: 19px;
  font-weight: 500;
  line-height: 1.18;
  letter-spacing: 0.06em;
  white-space: nowrap;
}

.reminder-divider {
  width: 1px;
  height: 38px;
  background: #c9c9c9;
}

.reminder-content {
  min-width: 0;
}

.reminder-content strong {
  display: flex;
  align-items: center;
  gap: 11px;
  color: #252939;
  font-size: 16px;
  font-weight: 500;
}

.bell-icon {
  position: relative;
  width: 15px;
  height: 17px;
  border-radius: 10px 10px 5px 5px;
  background: #35d19c;
}

.bell-icon::after {
  position: absolute;
  bottom: -5px;
  left: 5px;
  width: 7px;
  height: 4px;
  content: "";
  border-radius: 0 0 999px 999px;
  background: #35d19c;
}

.reminder-content p {
  margin: 8px 0 0;
  color: #9ca0aa;
  font-size: 14px;
  white-space: nowrap;
}

.disease-section {
  margin-top: 28px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.section-header h2 {
  margin: 0;
  color: #202534;
  font-size: 22px;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.section-header button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0;
  color: #8f96a3;
  font-size: 15px;
  font-weight: 500;
}

.section-header button span {
  width: 8px;
  height: 8px;
  border-top: 2px solid #c9c9c9;
  border-right: 2px solid #c9c9c9;
  transform: rotate(45deg);
}

.disease-list {
  display: flex;
  flex-wrap: wrap;
  gap: 11px 12px;
  margin-top: 28px;
}

.disease-pill {
  min-width: 62px;
  height: 34px;
  padding: 0 16px;
  border: 1px solid rgba(255, 255, 255, 0.72);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.82);
  box-shadow: 0 9px 20px rgba(82, 105, 148, 0.045);
  color: #202534;
  font-size: 17px;
  font-weight: 400;
  letter-spacing: 0.03em;
  white-space: nowrap;
}

.article-list {
  display: grid;
  gap: 20px;
  margin-top: 49px;
}

.article-card {
  padding: 26px 22px 24px;
  border: 1px solid rgba(255, 255, 255, 0.72);
  border-radius: 15px;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 16px 34px rgba(82, 105, 148, 0.065);
}

.article-copy h3 {
  margin: 0;
  color: #202534;
  font-size: 21px;
  font-weight: 500;
  line-height: 1.35;
}

.article-copy p {
  margin: 15px 0 0;
  color: #828b99;
  font-size: 15px;
  font-weight: 400;
  line-height: 1.85;
}

.article-photos {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-top: 13px;
}

.article-photo {
  position: relative;
  height: 81px;
  overflow: hidden;
  border-radius: 13px;
  background: #eef4f8;
}

.article-photo--fruit {
  background:
    radial-gradient(circle at 38% 50%, #d71f24 0 12%, transparent 13%),
    radial-gradient(circle at 57% 42%, #e33a35 0 11%, transparent 12%),
    radial-gradient(circle at 70% 62%, #c91520 0 9%, transparent 10%),
    radial-gradient(circle at 24% 66%, #ef3e37 0 10%, transparent 11%),
    radial-gradient(ellipse at 55% 78%, rgba(92, 183, 87, 0.9) 0 20%, transparent 22%),
    linear-gradient(135deg, #f8fbff 0%, #d9eff0 100%);
}

.article-photo--fruit::before {
  position: absolute;
  top: 25px;
  left: 37px;
  width: 42px;
  height: 4px;
  content: "";
  border-radius: 999px;
  background: #8cc849;
  transform: rotate(-23deg);
}

.article-photo--needle {
  background:
    linear-gradient(90deg, transparent 0 36%, #2d8fe6 36% 39%, transparent 39%),
    linear-gradient(24deg, transparent 0 51%, #df555b 51% 54%, transparent 54%),
    radial-gradient(circle at 27% 69%, #45a9f0 0 16%, transparent 17%),
    linear-gradient(135deg, #daf8ff 0%, #98e0ef 100%);
}

.article-photo--needle::before {
  position: absolute;
  right: 26px;
  bottom: 21px;
  width: 54px;
  height: 16px;
  content: "";
  border-radius: 10px;
  background: #2f84d4;
  transform: rotate(-18deg);
}

.article-photo--food {
  background:
    radial-gradient(circle at 72% 22%, #e4302c 0 7%, transparent 8%),
    radial-gradient(circle at 82% 31%, #f26522 0 8%, transparent 9%),
    radial-gradient(circle at 63% 46%, #df4050 0 6%, transparent 7%),
    radial-gradient(circle at 43% 53%, rgba(255, 120, 116, 0.45) 0 18%, transparent 19%),
    linear-gradient(150deg, #fff9e5 0 37%, #ffe6a7 38% 49%, #ffffff 50% 100%);
}

.article-photo--food::before {
  position: absolute;
  top: 32px;
  left: 31px;
  width: 32px;
  height: 32px;
  content: "";
  border: 2px solid rgba(247, 124, 133, 0.8);
  border-radius: 50%;
}

.article-actions {
  display: grid;
  grid-template-columns: 1fr auto auto auto;
  align-items: center;
  gap: 20px;
  margin-top: 19px;
}

.article-action {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 9px;
  min-width: 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: #202534;
  font-size: 18px;
  font-weight: 400;
}

.article-action--share {
  justify-self: start;
}

.article-icon {
  display: block;
  width: 24px;
  height: 24px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2.15;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.article-icon--share {
  width: 23px;
  height: 23px;
}

.article-icon--heart,
.article-icon--star,
.article-icon--comment {
  width: 25px;
  height: 25px;
}

.home-tabbar {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  align-items: end;
  height: 74px;
  padding: 9px 12px 10px;
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 -7px 18px rgba(40, 58, 90, 0.04);
}

.home-tabbar::before {
  position: absolute;
  top: -29px;
  left: 50%;
  z-index: 0;
  width: 58px;
  height: 58px;
  content: "";
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 -10px 24px rgba(102, 112, 240, 0.08);
  transform: translateX(-50%);
}

.tab-item {
  position: relative;
  z-index: 1;
  display: grid;
  justify-items: center;
  gap: 0;
  padding: 0;
  color: #252939;
  font-size: 12px;
  transform: translateY(-6px);
}

.tab-item--active {
  color: #6872f0;
}

.tab-image {
  display: grid;
  place-items: center;
  width: 40px;
  height: 32px;
}

.tab-svg {
  display: block;
  width: 30px;
  height: 30px;
  filter: drop-shadow(0 5px 7px rgba(37, 41, 57, 0.08));
}

.tab-label {
  margin-top: 2px;
}

.tab-item--publish {
  align-self: start;
  z-index: 2;
  transform: none;
}

.tab-icon--publish {
  position: relative;
  display: block;
  width: 42px;
  height: 42px;
  margin-top: -29px;
  border-radius: 50%;
  background: linear-gradient(135deg, #6872f0 0%, #ed6d88 100%);
  box-shadow: 0 15px 25px rgba(102, 112, 240, 0.26);
}

.tab-icon--publish::before,
.tab-icon--publish::after {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 20px;
  height: 2px;
  content: "";
  border-radius: 999px;
  background: #ffffff;
  transform: translate(-50%, -50%);
}

.tab-icon--publish::after {
  transform: translate(-50%, -50%) rotate(90deg);
}

@media (min-width: 561px) {
  .home-page {
    height: 844px;
    min-height: 844px;
  }
}

@media (max-width: 389px) {
  .home-scroll {
    padding-right: 20px;
    padding-left: 20px;
  }

  .service-grid {
    gap: 10px;
  }

  .service-card strong {
    font-size: 20px;
  }

  .service-card small,
  .reminder-content p {
    font-size: 14px;
  }

  .feature-panel {
    padding-right: 14px;
    padding-left: 14px;
  }

  .feature-item strong {
    font-size: 16px;
  }
}
</style>
