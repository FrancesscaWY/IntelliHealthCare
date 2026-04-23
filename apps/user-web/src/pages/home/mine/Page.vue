<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import type { Component } from "vue";
import type { PageComponentProps } from "@ihc/page-core/types";
import { Alignment, Fit, Layout, Rive } from "@rive-app/canvas";
import {
  Comment,
  Coupon,
  Headset,
  Help,
  MedicalFiles,
  Setting,
  Star,
} from "@icon-park/vue-next";
import assistantRiveUrl from "@/assets/home/sections/assistant.riv?url";
import mock from "./mock";

const props = defineProps<PageComponentProps>();
const assistantCanvasRef = ref<HTMLCanvasElement | null>(null);

let assistantRive: Rive | null = null;
let assistantResizeObserver: ResizeObserver | null = null;

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

function openCheckupHistory() {
  props.navigation.navigateTo("orders/checkup-history");
}

function resizeAssistant() {
  assistantRive?.resizeDrawingSurfaceToCanvas();
}

onMounted(() => {
  if (!assistantCanvasRef.value) return;

  assistantRive = new Rive({
    canvas: assistantCanvasRef.value,
    src: assistantRiveUrl,
    stateMachines: "State Machine 1",
    autoplay: true,
    layout: new Layout({
      fit: Fit.Contain,
      alignment: Alignment.Center,
    }),
    onLoad: resizeAssistant,
  });

  assistantResizeObserver = new ResizeObserver(resizeAssistant);
  assistantResizeObserver.observe(assistantCanvasRef.value);
});

onBeforeUnmount(() => {
  assistantResizeObserver?.disconnect();
  assistantResizeObserver = null;
  assistantRive?.cleanup();
  assistantRive = null;
});
</script>

<template>
  <section class="mine-page">
    <main class="mine-scroll">
      <header class="profile-header">
        <button class="support-button" type="button" aria-label="客服" @click="props.showToast('客服功能待接入')">
          <Headset theme="outline" size="22" fill="#1aaeba" />
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

      <section class="health-analyse" aria-label="报告分析">
        <div class="assistant-entry-avatar" aria-hidden="true">
          <canvas ref="assistantCanvasRef" width="92" height="92"></canvas>
        </div>
        <span>AI评估报告入口</span>
        <button type="button" @click="openCheckupHistory">立即体验</button>
      </section>

      <button class="order-entry-card" type="button" @click="openPage(mock.orderEntry.pageId, mock.orderEntry.label)">
        <span class="order-entry-icon">
          <MedicalFiles theme="outline" size="21" fill="currentColor" />
        </span>
        <span class="order-entry-copy">
          <strong>{{ mock.orderEntry.label }}</strong>
          <small>{{ mock.orderEntry.desc }}</small>
        </span>
        <span class="chevron">›</span>
      </button>

      <section class="menu-card">
        <button
          v-for="item in mock.menus"
          :key="item.key"
          class="menu-row"
          type="button"
          @click="openSubPage(item.pageId || '', item.label)"
        >
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
                <stop offset="0%" stop-color="#75d6df" />
                <stop offset="100%" stop-color="#7be28e" />
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
  background:
    radial-gradient(circle at 12% 7%, rgba(117, 214, 223, 0.26), transparent 25%),
    radial-gradient(circle at 88% 0%, rgba(123, 226, 142, 0.2), transparent 24%),
    linear-gradient(180deg, #eef5ff 0%, #f7fbff 46%, #eef4fb 100%);
  color: #252939;
  font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif;
  -webkit-font-smoothing: antialiased;
  text-rendering: geometricPrecision;
}

.mine-scroll {
  position: relative;
  z-index: 1;
  height: 100%;
  padding: 16px 22px 100px;
  box-sizing: border-box;
  overflow-y: auto;
  scrollbar-width: none;
}

.mine-scroll::-webkit-scrollbar {
  display: none;
}

.profile-header {
  position: relative;
  padding: 0 8px 4px;
  margin-bottom: 18px;
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
  border-radius: 12px;
  background: linear-gradient(135deg, rgba(117, 214, 223, 0.18) 0%, rgba(123, 226, 142, 0.16) 100%);
  cursor: pointer;
}

.profile-main {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 0;
  text-align: center;
}

.avatar {
  width: 92px;
  height: 92px;
  border: 4px solid #fff;
  border-radius: 50%;
  object-fit: cover;
  display: block;
  box-shadow: 0 14px 28px rgba(106, 116, 241, 0.18);
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
  color: #252939;
  font-size: 24px;
  font-weight: 900;
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
  background: #ffd15d;
  color: #fff;
  font-size: 12px;
  font-weight: 900;
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
  background: rgba(37, 41, 57, 0.72);
  color: #fff;
  font-size: 12px;
  font-weight: 900;
  backdrop-filter: blur(8px);
}

.stats-row {
  width: 100%;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  margin: 18px 0 0;
}

.stat-item {
  display: grid;
  justify-items: center;
  gap: 6px;
}

.stat-item strong {
  color: #34383f;
  font-size: 17px;
  font-weight: 900;
}

.stat-item span {
  color: #70757d;
  font-size: 12px;
  font-weight: 800;
}

.menu-card,
.order-entry-card {
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 10px 28px rgba(31, 40, 58, 0.045);
}

.section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.section-heading h2 {
  margin: 0;
  color: #34383f;
  font-size: 20px;
  font-weight: 900;
}

.section-heading span {
  color: #b8babd;
  font-size: 18px;
  font-weight: 900;
}

.health-section {
  margin-bottom: 16px;
}

.health-analyse {
  position: relative;
  min-height: 88px;
  display: grid;
  grid-template-columns: 74px 1fr 86px;
  align-items: center;
  gap: 10px;
  margin: 0 0 16px;
  padding: 10px 13px 10px 8px;
  overflow: hidden;
  border-radius: 18px;
  background:
    radial-gradient(circle at 16% 28%, rgba(255, 255, 255, 0.92), transparent 34%),
    linear-gradient(105deg, rgba(117, 214, 223, 0.98) 0%, rgba(45, 144, 240, 0.72) 52%, rgba(123, 226, 142, 0.88) 100%);
  box-shadow: 0 14px 30px rgba(45, 144, 240, 0.14);
}

.health-analyse::after {
  position: absolute;
  right: -38px;
  bottom: -48px;
  width: 124px;
  height: 124px;
  content: "";
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.22);
}

.assistant-entry-avatar {
  position: relative;
  transform: translateX(-10px) translateY(-18px);
  z-index: 1;
  width: 74px;
  height: 68px;
  display: grid;
  place-items: center;
}

.assistant-entry-avatar canvas {
  display: block;
  width: 120px;
  height: 120px;
  filter: drop-shadow(0 8px 10px rgba(31, 42, 68, 0.13));
}

.health-analyse span {
  position: relative;
  z-index: 1;
  color: #1f2a44;
  font-size: 17px;
  font-weight: 900;
  line-height: 1.2;
}

.health-analyse button {
  position: relative;
  z-index: 1;
  height: 34px;
  padding: 0 12px;
  border: 0;
  border-radius: 17px;
  background: linear-gradient(135deg, #0b0b0f 0%, #2a2111 42%, #d8a844 100%);
  color: #fff6d5;
  font-size: 13px;
  font-weight: 900;
  box-shadow: 0 9px 18px rgba(43, 31, 10, 0.24), inset 0 1px 0 rgba(255, 238, 178, 0.34);
}

.health-card-list {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: 170px;
  gap: 12px;
  overflow-x: auto;
  padding-bottom: 4px;
  scrollbar-width: none;
}

.health-card-list::-webkit-scrollbar {
  display: none;
}

.health-card {
  height: 174px;
  padding: 20px 18px 16px;
  border-radius: 28px;
  box-sizing: border-box;
  overflow: hidden;
}

.health-card--green {
  background: #e4ffb6;
}

.health-card--pink {
  background: #ffe0e7;
}

.health-card--blue {
  background: #dff0ff;
}

.health-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.health-card-top span {
  color: #252939;
  font-size: 17px;
  font-weight: 900;
}

.health-card-top i {
  width: 22px;
  height: 20px;
  border-radius: 999px 999px 12px 12px;
  background: #aee42c;
  transform: rotate(45deg);
}

.health-card--pink .health-card-top i {
  width: 20px;
  height: 20px;
  border-radius: 4px 4px 12px 12px;
  background: #ff5976;
  transform: rotate(0deg);
}

.health-card--blue .health-card-top i {
  background: #4aa4ff;
}

.health-card strong {
  display: block;
  color: #252939;
  font-size: 34px;
  font-weight: 900;
}

.health-card em {
  color: #65736e;
  font-size: 16px;
  font-style: normal;
  font-weight: 900;
}

.health-visual {
  position: relative;
  height: 62px;
  margin-top: 14px;
}

.health-visual span {
  position: absolute;
  bottom: 0;
  width: 16px;
  border-radius: 999px;
  opacity: 0.82;
}

.health-visual--heart span {
  height: 4px;
  background: transparent;
}

.health-visual--heart::before,
.health-visual--heart::after {
  content: '';
  position: absolute;
  right: 6px;
  bottom: 6px;
  left: 0;
  height: 46px;
  border-bottom: 7px solid #85d80d;
  border-radius: 50%;
  transform: rotate(-8deg);
}

.health-visual--heart::after {
  left: 42px;
  border-color: rgba(139, 216, 20, 0.55);
  transform: rotate(16deg);
}

.health-visual--steps span,
.health-visual--water span {
  background: #ff4668;
}

.health-visual--steps span:nth-child(1),
.health-visual--water span:nth-child(1) {
  left: 0;
  height: 34px;
  opacity: 0.25;
}

.health-visual--steps span:nth-child(2),
.health-visual--water span:nth-child(2) {
  left: 24px;
  height: 52px;
  opacity: 0.3;
}

.health-visual--steps span:nth-child(3),
.health-visual--water span:nth-child(3) {
  left: 48px;
  height: 74px;
  opacity: 0.55;
}

.health-visual--steps span:nth-child(4),
.health-visual--water span:nth-child(4) {
  left: 72px;
  height: 96px;
}

.health-visual--steps span:nth-child(5),
.health-visual--water span:nth-child(5) {
  left: 96px;
  height: 62px;
  opacity: 0.45;
}

.health-visual--steps span:nth-child(6),
.health-visual--water span:nth-child(6) {
  left: 120px;
  height: 36px;
  opacity: 0.28;
}

.health-visual--steps span:nth-child(7),
.health-visual--water span:nth-child(7) {
  left: 144px;
  height: 20px;
  opacity: 0.22;
}

.health-visual--water span {
  background: #3f98ff;
}

.order-entry-card {
  width: 100%;
  min-height: 72px;
  display: grid;
  grid-template-columns: 42px 1fr 20px;
  gap: 12px;
  align-items: center;
  margin-bottom: 16px;
  padding: 0 18px;
  border: 0;
  color: #4a4f57;
  text-align: left;
}

.order-entry-icon {
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  border-radius: 13px;
  background: linear-gradient(135deg, rgba(117, 214, 223, 0.22) 0%, rgba(45, 144, 240, 0.14) 100%);
  color: #1aaeba;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.82), 0 8px 16px rgba(45, 144, 240, 0.08);
}

.order-entry-copy {
  display: grid;
  gap: 5px;
}

.order-entry-copy strong {
  color: #252939;
  font-size: 16px;
  font-weight: 900;
}

.order-entry-copy small {
  color: #a2a7af;
  font-size: 12px;
  font-weight: 800;
}

.menu-card {
  overflow: hidden;
}

.menu-row {
  width: 100%;
  height: 58px;
  display: grid;
  grid-template-columns: 36px 1fr 18px;
  gap: 10px;
  align-items: center;
  padding: 0 18px;
  border: 0;
  border-bottom: 1px solid rgba(220, 225, 232, 0.7);
  background: transparent;
  color: #34383f;
  text-align: left;
  font-size: 14px;
  font-weight: 900;
}

.menu-row:last-child {
  border-bottom: 0;
}

.menu-icon {
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  border-radius: 12px;
  background: linear-gradient(135deg, rgba(117, 214, 223, 0.2) 0%, rgba(123, 226, 142, 0.14) 100%);
  color: #1aaeba;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.78);
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
  z-index: 100;
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  align-items: end;
  height: 74px;
  padding: 9px 12px 10px;
  background: #fff;
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
  background: #fff;
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
  color: #66cfa7;
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
  background: linear-gradient(100deg, #75d6df 0%, #7be28e 100%);
  box-shadow: 0 15px 25px rgba(89, 200, 162, 0.26);
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
