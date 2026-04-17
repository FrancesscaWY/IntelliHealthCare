<script setup lang="ts">
import type { Component } from "vue";
import type { PageComponentProps } from "@ihc/page-core/types";
import {
  Comment,
  Coupon,
  Headset,
  Help,
  Home,
  Hospital,
  MedicalFiles,
  Setting,
  Star,
} from "@icon-park/vue-next";
import mock from "./mock";

const props = defineProps<PageComponentProps>();

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

const orderIconMap: Record<string, Component> = {
  home: Home,
  medical: MedicalFiles,
  hospital: Hospital,
};

const menuIconMap: Record<string, Component> = {
  coupon: Coupon,
  points: MedicalFiles,
  star: Star,
  comment: Comment,
  help: Help,
  setting: Setting,
};

function getNavIconMarkup(key: string) {
  return navIconMarkup[key] || navIconMarkup.home;
}

function getNavGradientId(key: string) {
  return `mine-tab-gradient-${key}`;
}

function openPage(pageId: string, label: string) {
  if (!pageId) {
    props.showToast(`${label}功能待接入`);
    return;
  }

  props.navigation.reLaunch(pageId);
}

function openSubPage(pageId: string, label: string) {
  if (!pageId) {
    props.showToast(`${label}功能待接入`);
    return;
  }

  props.navigation.navigateTo(pageId);
}
</script>

<template>
  <section class="mine-page">
    <svg class="profile-vector" viewBox="0 0 396 348" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <path
        fill-rule="evenodd"
        clip-rule="evenodd"
        d="M0 0H142.5L231.4 86.4C288.1 78.5 342.2 61.7 396 38.2V139.6L280.5 172C285.2 191 287.5 211.4 286.2 233C282.1 299 230.5 339 151.6 347.1C67 355.8 1.2 307.4 0 224C-0.8 166.7 42.7 123 123.1 107.5L0 28.2V0ZM94.3 225.3C99.5 251.5 141.1 260.9 174.8 246.4C193.5 238.4 197.6 221.8 187.4 189.4C129.6 195.4 90 204.8 94.3 225.3Z"
      />
    </svg>
    <main class="mine-scroll">
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

      <header class="profile-header">
        <button class="support-button" type="button" aria-label="客服" @click="props.showToast('客服功能待接入')">
          <Headset theme="outline" size="22" fill="#34383f" />
        </button>
        <div class="profile-main">
          <img class="avatar" :src="mock.profile.avatar" :alt="mock.profile.name" />
          <button class="homepage-link" type="button" @click="openSubPage(mock.profile.homepagePageId, '个人主页')">
            个人主页 >
          </button>
          <div class="profile-text">
            <div class="name-row">
              <h1>{{ mock.profile.name }}</h1>
            </div>
            <span class="level-badge">{{ mock.profile.level }}</span>
          </div>

          <section class="stats-row" aria-label="用户数据">
            <div v-for="item in mock.profile.stats" :key="item.label" class="stat-item">
              <strong>{{ item.value }}</strong>
              <span>{{ item.label }}</span>
            </div>
          </section>
        </div>
      </header>

      <section class="order-card">
        <h2>我的订单</h2>
        <div class="order-grid">
          <button
            v-for="item in mock.orders"
            :key="item.key"
            class="order-item"
            type="button"
            @click="openSubPage(item.pageId, item.label)"
          >
            <span class="order-icon" :class="`order-icon--${item.key}`">
              <component :is="orderIconMap[item.icon]" theme="outline" size="20" fill="currentColor" />
            </span>
            <span>{{ item.label }}</span>
          </button>
        </div>
      </section>

      <section class="menu-card">
        <button v-for="item in mock.menus" :key="item.key" class="menu-row" type="button">
          <span class="menu-icon">
            <component :is="menuIconMap[item.icon]" theme="outline" size="18" fill="currentColor" />
          </span>
          <span>{{ item.label }}</span>
          <span class="chevron">></span>
        </button>
      </section>
    </main>

    <nav class="home-tabbar" aria-label="底部导航">
      <button
        v-for="item in mock.tabs"
        :key="item.key"
        class="tab-item"
        :class="[
          `tab-item--${item.key}`,
          { 'tab-item--active': item.key === 'mine', 'tab-item--publish': item.key === 'publish' },
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
              :fill="item.key === 'mine' ? `url(#${getNavGradientId(item.key)})` : 'none'"
              :stroke="item.key === 'mine' ? 'none' : 'currentColor'"
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
.mine-page {
  position: relative;
  left: 50%;
  width: min(402px, 100vw);
  height: min(874px, calc(100vh - 36px));
  min-height: min(874px, calc(100vh - 36px));
  max-height: 874px;
  margin: -18px 0;
  transform: translateX(-50%);
  overflow: hidden;
  background: linear-gradient(180deg, #ccdafd 0%, #f2f5fe 34%, #ffffff 58%, #ffffff 100%);
  color: #252939;
  font-family: "HarmonyOS Sans SC", "MiSans", "Source Han Sans SC", "Noto Sans SC", "PingFang SC", "Microsoft YaHei UI", sans-serif;
  -webkit-font-smoothing: antialiased;
  text-rendering: geometricPrecision;
}

.profile-vector {
  display: block;
  width: 217.7px;
  height: 156.55px;
  margin: 0 0 -156.55px auto;
  color: rgba(255, 255, 255, 0.2);
  fill: currentColor;
  pointer-events: none;
}

.mine-scroll {
  position: relative;
  z-index: 1;
  height: 100%;
  padding: 0 22px 100px;
  box-sizing: border-box;
  overflow-y: auto;
  scrollbar-width: none;
}

.mine-scroll::-webkit-scrollbar {
  display: none;
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
  font-size: 16px;
  font-weight: 600;
  color: #2e3033;
}

.status-icons {
  display: flex;
  align-items: center;
  gap: 8px;
}

.signal {
  width: 18px;
  height: 13px;
  display: flex;
  align-items: flex-end;
  gap: 2px;
}

.signal i {
  width: 3px;
  border-radius: 1px;
  background: #111;
}

.signal i:nth-child(1) {
  height: 4px;
}

.signal i:nth-child(2) {
  height: 7px;
}

.signal i:nth-child(3) {
  height: 10px;
}

.signal i:nth-child(4) {
  height: 13px;
}

.wifi {
  position: relative;
  width: 18px;
  height: 13px;
  overflow: hidden;
}

.wifi::before,
.wifi::after {
  content: "";
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
  width: 24px;
  height: 13px;
  border: 2px solid #111;
  border-radius: 3px;
  box-sizing: border-box;
}

.battery::before {
  content: "";
  position: absolute;
  top: 3px;
  right: -5px;
  width: 3px;
  height: 5px;
  border-radius: 0 2px 2px 0;
  background: #111;
}

.profile-header {
  position: relative;
  padding-top: 14px;
  margin-bottom: 16px;
}

.support-button {
  position: absolute;
  top: 0;
  right: 0;
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
}

.profile-main {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 12px;
  text-align: center;
}

.avatar {
  width: 92px;
  height: 92px;
  border: 3px solid rgba(255, 255, 255, 0.86);
  border-radius: 50%;
  object-fit: cover;
  display: block;
  box-shadow: 0 12px 28px rgba(38, 54, 77, 0.12);
}

.profile-text {
  margin-top: 10px;
}

.name-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.name-row h1 {
  margin: 0;
  color: #34383f;
  font-size: 21px;
  font-weight: 800;
  letter-spacing: 0;
}

.level-badge {
  width: 44px;
  height: 20px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-top: 4px;
  border-radius: 10px;
  background: #f6d36a;
  color: #fff;
  font-size: 12px;
  font-weight: 800;
}

.homepage-link {
  min-width: 84px;
  height: 26px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-top: -15px;
  padding: 0 11px;
  border: 0;
  border-radius: 13px;
  background: rgba(112, 117, 126, 0.72);
  color: #fff;
  font-size: 12px;
  font-weight: 800;
  backdrop-filter: blur(8px);
}

.stats-row {
  width: 100%;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  margin: 16px 0 0;
}

.stat-item {
  display: grid;
  justify-items: center;
  gap: 6px;
}

.stat-item strong {
  color: #4a4f57;
  font-size: 16px;
  font-weight: 800;
}

.stat-item span {
  color: #5c626c;
  font-size: 12px;
  font-weight: 700;
}

.order-card,
.menu-card {
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.86);
  box-shadow: 0 10px 26px rgba(35, 48, 70, 0.04);
}

.order-card {
  padding: 18px 18px 20px;
  margin-bottom: 16px;
}

.order-card h2 {
  margin: 0 0 18px;
  color: #4a4f57;
  font-size: 16px;
  font-weight: 700;
}

.order-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.order-item {
  display: grid;
  justify-items: center;
  gap: 10px;
  padding: 0;
  border: 0;
  background: transparent;
  color: #5b6069;
  font-size: 13px;
  font-weight: 700;
}

.order-icon {
  width: 30px;
  height: 30px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: #eef5f3;
  color: #4bc99e;
}

.order-icon--therapy {
  background: #f0efff;
  color: #7b82f2;
}

.order-icon--exam {
  background: #fff2f4;
  color: #ee7f8f;
}

.menu-card {
  overflow: hidden;
}

.menu-row {
  width: 100%;
  height: 58px;
  display: grid;
  grid-template-columns: 26px 1fr 18px;
  gap: 10px;
  align-items: center;
  padding: 0 18px;
  border: 0;
  border-bottom: 1px solid rgba(220, 225, 232, 0.7);
  background: transparent;
  color: #4a4f57;
  text-align: left;
  font-size: 15px;
  font-weight: 700;
}

.menu-row:last-child {
  border-bottom: 0;
}

.menu-icon {
  color: #5a626d;
  display: grid;
  place-items: center;
}

.chevron {
  color: #c7cbd1;
  font-size: 18px;
  line-height: 1;
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
  border: 0;
  background: transparent;
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
  .mine-page {
    height: 874px;
    min-height: 874px;
  }
}
</style>
