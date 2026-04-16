<script setup lang="ts">
import type { PageComponentProps } from "@ihc/page-core/types";
import BottomTabBar from "@/components/BottomTabBar.vue";
import avatarMe from "@/assets/content/avatar-me.jpg";
import mock from "./mock";

const props = defineProps<PageComponentProps>();

function showPendingMessage(label: string) {
  props.showToast(`${label}功能待接入`);
}

function handleBack() {
  props.navigation.reLaunch("home/dashboard");
}
</script>

<template>
  <section class="mine-page">
    <header class="profile-cover">
      <div class="profile-cover__scene" aria-hidden="true">
        <span class="scene-wire"></span>
        <div class="scene-book">
          <span class="scene-page scene-page--left"></span>
          <span class="scene-page scene-page--right"></span>
          <span class="scene-shadow"></span>
        </div>
      </div>

      <div class="profile-cover__topbar">
        <button class="cover-icon cover-icon--back" type="button" aria-label="返回" @click="handleBack"></button>
        <button class="cover-icon cover-icon--expand" type="button" aria-label="更多" @click="showPendingMessage('更多')"></button>
      </div>

      <div class="profile-card">
        <div class="profile-card__head">
          <img class="profile-avatar" :src="avatarMe" alt="笑看人生头像" draggable="false" />
          <div class="profile-meta">
            <div class="profile-name-row">
              <h1>{{ mock.profile.name }}</h1>
              <span class="profile-gender" :class="`profile-gender--${mock.profile.gender}`" aria-label="男"></span>
            </div>
            <p class="profile-region">{{ mock.profile.region }}</p>
          </div>
        </div>

        <p class="profile-motto">{{ mock.profile.motto }}</p>

        <div class="profile-actions">
          <div class="profile-stats">
            <div v-for="item in mock.profile.stats" :key="item.label" class="profile-stat">
              <strong>{{ item.value }}</strong>
              <span>{{ item.label }}</span>
            </div>
          </div>

          <div class="profile-cta">
            <button class="outline-button" type="button" aria-label="私信" @click="showPendingMessage('私信')">
              <span class="outline-button__icon"></span>
            </button>
            <button class="follow-button" type="button" @click="showPendingMessage('关注')">+ 关注</button>
          </div>
        </div>
      </div>
    </header>

    <section class="feed-panel">
      <div class="feed-heading">
        <h2>动态 {{ mock.feedCount }}</h2>
      </div>

      <article v-for="post in mock.posts" :key="post.id" class="feed-item">
        <div class="feed-item__meta">
          <img class="feed-item__avatar" :src="avatarMe" :alt="`${post.author}头像`" draggable="false" />
          <div>
            <strong>{{ post.author }}</strong>
            <span>{{ post.date }}</span>
          </div>
        </div>

        <p class="feed-item__content">{{ post.content }}</p>

        <div v-if="post.gallery.length" class="feed-gallery">
          <div class="feed-gallery__main" :class="`feed-gallery__main--${post.gallery[0]}`"></div>
          <div class="feed-gallery__side">
            <div
              v-for="item in post.gallery.slice(1)"
              :key="item"
              class="feed-gallery__thumb"
              :class="`feed-gallery__thumb--${item}`"
            ></div>
          </div>
        </div>

        <div class="feed-item__actions">
          <button type="button" aria-label="分享" @click="showPendingMessage('分享')">
            <span class="action-icon action-icon--share"></span>
          </button>
          <button type="button" @click="showPendingMessage('点赞')">
            <span class="action-icon action-icon--heart"></span>
            <span>{{ post.likes }}</span>
          </button>
          <button type="button" @click="showPendingMessage('收藏')">
            <span class="action-icon action-icon--star"></span>
            <span>{{ post.favorites }}</span>
          </button>
          <button type="button" @click="showPendingMessage('评论')">
            <span class="action-icon action-icon--comment"></span>
            <span>{{ post.comments }}</span>
          </button>
        </div>
      </article>
    </section>

    <BottomTabBar active-key="mine" @navigate="props.navigation.reLaunch" @pending="props.showToast" />
  </section>
</template>

<style scoped>
.mine-page {
  display: grid;
  gap: 10px;
  margin: -18px;
  padding-bottom: 18px;
  background: linear-gradient(180deg, #f4ede4 0%, #f3eee8 38%, #f6f4f0 39%, #f7f7f5 100%);
  color: #332a22;
}

.profile-cover {
  position: relative;
  min-height: 396px;
  padding: 16px 16px 0;
  overflow: hidden;
  background:
    linear-gradient(180deg, rgba(103, 74, 45, 0.18), rgba(173, 111, 44, 0.5) 62%, rgba(205, 145, 68, 0.84) 100%),
    radial-gradient(circle at 12% 12%, rgba(255, 255, 255, 0.18), transparent 22%),
    linear-gradient(135deg, #7f5d3d 0%, #986c41 24%, #a87647 52%, #bf854c 100%);
}

.profile-cover__scene {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.scene-wire {
  position: absolute;
  top: 14px;
  left: 44px;
  width: 172px;
  height: 42px;
  border-top: 3px solid rgba(249, 245, 236, 0.8);
  border-left: 3px solid rgba(249, 245, 236, 0.8);
  border-top-left-radius: 30px;
  opacity: 0.75;
}

.scene-book {
  position: absolute;
  top: 34px;
  right: 34px;
  width: 216px;
  height: 180px;
  transform: rotate(10deg);
}

.scene-page {
  position: absolute;
  top: 0;
  width: 105px;
  height: 158px;
  border-radius: 7px;
  background:
    repeating-linear-gradient(180deg, transparent 0 8px, rgba(150, 132, 104, 0.16) 8px 9px),
    linear-gradient(180deg, rgba(250, 245, 234, 0.98), rgba(238, 229, 213, 0.95));
  box-shadow: 0 18px 34px rgba(60, 36, 12, 0.18);
}

.scene-page--left {
  left: 0;
  transform: skewY(4deg);
}

.scene-page--right {
  right: 0;
  transform: skewY(-4deg);
}

.scene-page::before {
  position: absolute;
  inset: 18px 14px auto;
  height: 78px;
  content: "";
  background:
    repeating-linear-gradient(180deg, rgba(145, 126, 101, 0.22) 0 2px, transparent 2px 8px),
    linear-gradient(180deg, rgba(255, 255, 255, 0.28), transparent);
  opacity: 0.88;
}

.scene-shadow {
  position: absolute;
  right: -12px;
  bottom: -10px;
  width: 118px;
  height: 52px;
  border-radius: 999px;
  background: rgba(97, 58, 18, 0.26);
  filter: blur(14px);
}

.profile-cover__topbar {
  position: relative;
  z-index: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.cover-icon {
  position: relative;
  width: 28px;
  height: 28px;
  border: 0;
  background: transparent;
}

.cover-icon::before,
.cover-icon::after {
  position: absolute;
  content: "";
}

.cover-icon--back::before {
  top: 8px;
  left: 10px;
  width: 10px;
  height: 10px;
  border-left: 3px solid #fff;
  border-bottom: 3px solid #fff;
  transform: rotate(45deg);
}

.cover-icon--expand::before,
.cover-icon--expand::after {
  width: 10px;
  height: 10px;
  border-color: #fff;
}

.cover-icon--expand::before {
  top: 5px;
  left: 5px;
  border-top: 3px solid #fff;
  border-left: 3px solid #fff;
}

.cover-icon--expand::after {
  right: 5px;
  bottom: 5px;
  border-right: 3px solid #fff;
  border-bottom: 3px solid #fff;
}

.profile-card {
  position: relative;
  z-index: 1;
  margin-top: 46px;
  color: #fff;
}

.profile-card__head {
  display: flex;
  align-items: center;
  gap: 14px;
}

.profile-avatar {
  width: 92px;
  height: 92px;
  border: 3px solid rgba(255, 255, 255, 0.92);
  border-radius: 50%;
  object-fit: cover;
  box-shadow: 0 12px 24px rgba(41, 23, 7, 0.18);
}

.profile-meta {
  min-width: 0;
}

.profile-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.profile-name-row h1 {
  margin: 0;
  font-size: 23px;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.profile-gender {
  position: relative;
  width: 20px;
  height: 20px;
  border-radius: 6px;
  background: #8ce7d8;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.34);
}

.profile-gender::before,
.profile-gender::after {
  position: absolute;
  content: "";
}

.profile-gender::before {
  top: 4px;
  left: 4px;
  width: 7px;
  height: 7px;
  border: 2px solid #fff;
  border-radius: 50%;
}

.profile-gender::after {
  right: 3px;
  top: 3px;
  width: 6px;
  height: 6px;
  border-top: 2px solid #fff;
  border-right: 2px solid #fff;
  transform: rotate(0deg);
}

.profile-region {
  margin: 8px 0 0;
  font-size: 13px;
  font-weight: 400;
  color: rgba(255, 255, 255, 0.78);
}

.profile-motto {
  width: min(100%, 326px);
  margin: 22px 0 0;
  font-size: 13px;
  line-height: 1.75;
  font-weight: 400;
}

.profile-actions {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 14px;
  margin-top: 20px;
  padding-bottom: 30px;
}

.profile-stats {
  display: flex;
  gap: 28px;
}

.profile-stat {
  display: grid;
  gap: 6px;
  min-width: 52px;
}

.profile-stat strong {
  font-size: 18px;
  font-weight: 600;
  line-height: 1;
}

.profile-stat span {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.84);
}

.profile-cta {
  display: flex;
  align-items: center;
  gap: 10px;
}

.outline-button,
.follow-button,
.feed-item__actions button {
  font: inherit;
}

.outline-button {
  display: grid;
  place-items: center;
  width: 52px;
  height: 40px;
  border: 1.5px solid rgba(255, 255, 255, 0.88);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.02);
  color: #fff;
}

.outline-button__icon {
  position: relative;
  width: 18px;
  height: 14px;
  border: 2px solid currentColor;
  border-radius: 10px;
}

.outline-button__icon::after {
  position: absolute;
  right: 1px;
  bottom: -4px;
  width: 7px;
  height: 7px;
  content: "";
  border-right: 2px solid currentColor;
  border-bottom: 2px solid currentColor;
  border-bottom-right-radius: 6px;
  transform: rotate(36deg);
}

.follow-button {
  min-width: 92px;
  height: 40px;
  padding: 0 18px;
  border: 0;
  border-radius: 999px;
  background: linear-gradient(135deg, #6f79ff, #6375ff 58%, #5972ff);
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  box-shadow: 0 12px 24px rgba(78, 98, 255, 0.24);
}

.feed-panel {
  margin-top: -18px;
  padding: 20px 18px 8px;
  border-radius: 28px 28px 0 0;
  background: #f8f8f7;
}

.feed-heading {
  padding: 8px 8px 6px;
}

.feed-heading h2 {
  margin: 0;
  color: #c1c5cc;
  font-size: 14px;
  font-weight: 600;
}

.feed-item {
  padding: 14px 8px 18px;
  border-bottom: 1px solid rgba(40, 51, 68, 0.08);
}

.feed-item:last-of-type {
  border-bottom: 0;
}

.feed-item__meta {
  display: flex;
  align-items: center;
  gap: 10px;
}

.feed-item__avatar {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  object-fit: cover;
}

.feed-item__meta strong {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #2d2d31;
}

.feed-item__meta span {
  display: block;
  margin-top: 3px;
  font-size: 12px;
  color: #b4b8be;
}

.feed-item__content {
  margin: 14px 0 0;
  color: #4d4f55;
  font-size: 13px;
  line-height: 1.9;
}

.feed-gallery {
  display: grid;
  grid-template-columns: minmax(0, 1.8fr) minmax(0, 0.95fr);
  gap: 10px;
  margin-top: 14px;
}

.feed-gallery__main,
.feed-gallery__thumb {
  position: relative;
  overflow: hidden;
  border-radius: 18px;
  background-color: #ece5d8;
}

.feed-gallery__main {
  min-height: 178px;
}

.feed-gallery__side {
  display: grid;
  gap: 10px;
}

.feed-gallery__thumb {
  min-height: 84px;
}

.feed-gallery__main::before,
.feed-gallery__main::after,
.feed-gallery__thumb::before,
.feed-gallery__thumb::after {
  position: absolute;
  content: "";
}

.feed-gallery__main--shelf {
  background:
    linear-gradient(90deg, #3b3a3d 0 18%, transparent 18% 100%),
    linear-gradient(180deg, transparent 0 33%, rgba(49, 44, 41, 0.85) 33% 35%, transparent 35% 67%, rgba(49, 44, 41, 0.85) 67% 69%, transparent 69%),
    linear-gradient(90deg, transparent 0 15%, #d67944 15% 21%, #c6553d 21% 24%, #cf8a43 24% 29%, #de6a3d 29% 34%, transparent 34%),
    linear-gradient(180deg, #d4dce0 0%, #edf1f2 42%, #d7ddd8 42%, #f0f1ed 100%);
}

.feed-gallery__main--shelf::before {
  left: 40%;
  bottom: 0;
  width: 39%;
  height: 88%;
  border-radius: 28px 28px 0 0;
  background:
    radial-gradient(circle at 50% 12%, #5d422b 0 10%, transparent 11%),
    radial-gradient(circle at 52% 16%, #e2ddd5 0 16%, transparent 16.5%),
    linear-gradient(180deg, #faf8f2 0 34%, #e6e0d7 34% 35%, #f6f2ec 35% 100%);
}

.feed-gallery__main--shelf::after {
  left: 46%;
  bottom: 16%;
  width: 26%;
  height: 32%;
  border-radius: 8px;
  background:
    linear-gradient(165deg, #ece7dd 0 44%, #d8d0c4 44% 46%, #f8f3ea 46% 100%);
  box-shadow: 10px 0 0 -4px rgba(138, 118, 91, 0.16);
  transform: rotate(-8deg);
}

.feed-gallery__thumb--book {
  background:
    radial-gradient(circle at 70% 74%, rgba(153, 102, 51, 0.32) 0 18%, transparent 19%),
    linear-gradient(135deg, #9f7247 0%, #b68148 55%, #c89155 100%);
}

.feed-gallery__thumb--book::before {
  inset: 16px 20px;
  border-radius: 6px;
  background:
    linear-gradient(90deg, #f0e7d9 0 49%, #cab69e 49% 51%, #f5eee2 51% 100%);
  transform: rotate(-26deg);
}

.feed-gallery__thumb--book::after {
  inset: 26px 30px;
  background: repeating-linear-gradient(180deg, rgba(145, 128, 104, 0.28) 0 1px, transparent 1px 6px);
  transform: rotate(-26deg);
}

.feed-gallery__thumb--hall {
  background:
    linear-gradient(90deg, #4d4643 0 18%, transparent 18% 100%),
    repeating-linear-gradient(90deg, transparent 0 10%, rgba(206, 120, 52, 0.82) 10% 13%, rgba(195, 86, 63, 0.8) 13% 16%, transparent 16% 27%),
    linear-gradient(180deg, #f4f0ea 0%, #ece8e2 100%);
}

.feed-gallery__thumb--hall::before {
  left: 42%;
  bottom: 0;
  width: 20%;
  height: 58%;
  background: linear-gradient(180deg, #2b2b2f, #5a4940 40%, #d9c4a1 40%, #f0e7da 100%);
}

.feed-gallery__thumb--hall::after {
  inset: auto 8px 8px 8px;
  height: 14px;
  border-radius: 10px;
  background:
    repeating-linear-gradient(90deg, #d3b88a 0 12%, #f6ead1 12% 24%);
}

.feed-item__actions {
  display: grid;
  grid-template-columns: 1fr auto auto auto;
  align-items: center;
  gap: 14px;
  margin-top: 14px;
}

.feed-item__actions button {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 0;
  border: 0;
  background: transparent;
  color: #3e4045;
  font-size: 13px;
  font-weight: 400;
}

.feed-item__actions button:first-child {
  justify-self: start;
}

.action-icon {
  position: relative;
  display: inline-block;
  width: 20px;
  height: 20px;
}

.action-icon::before,
.action-icon::after {
  position: absolute;
  content: "";
}

.action-icon--share::before {
  inset: 4px;
  border-left: 2px solid currentColor;
  border-bottom: 2px solid currentColor;
}

.action-icon--share::after {
  top: 2px;
  right: 2px;
  width: 9px;
  height: 9px;
  border-top: 2px solid currentColor;
  border-right: 2px solid currentColor;
}

.action-icon--heart::before {
  inset: 4px 5px 5px 5px;
  border-radius: 10px 10px 3px 3px;
  border-left: 2px solid currentColor;
  border-top: 2px solid currentColor;
  border-right: 2px solid currentColor;
  transform: rotate(-45deg);
}

.action-icon--heart::after {
  left: 6px;
  top: 9px;
  width: 8px;
  height: 8px;
  border-left: 2px solid currentColor;
  border-bottom: 2px solid currentColor;
  transform: rotate(-45deg);
}

.action-icon--star::before {
  top: 1px;
  left: 4px;
  width: 12px;
  height: 12px;
  border-top: 2px solid currentColor;
  border-right: 2px solid currentColor;
  transform: rotate(35deg) skewX(-18deg);
}

.action-icon--star::after {
  left: 5px;
  bottom: 3px;
  width: 10px;
  height: 10px;
  border-left: 2px solid currentColor;
  border-bottom: 2px solid currentColor;
  transform: rotate(45deg) skewX(18deg);
}

.action-icon--comment::before {
  inset: 3px 3px 5px;
  border: 2px solid currentColor;
  border-radius: 999px;
}

.action-icon--comment::after {
  right: 4px;
  bottom: 1px;
  width: 6px;
  height: 6px;
  border-right: 2px solid currentColor;
  border-bottom: 2px solid currentColor;
  border-bottom-right-radius: 6px;
  transform: rotate(28deg);
}

@media (max-width: 389px) {
  .profile-cover {
    min-height: 380px;
  }

  .profile-stats {
    gap: 18px;
  }

  .feed-gallery {
    grid-template-columns: minmax(0, 1.55fr) minmax(0, 0.9fr);
  }
}
</style>
