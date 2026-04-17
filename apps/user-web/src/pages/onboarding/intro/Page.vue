<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import type { PageComponentProps } from "@ihc/page-core/types";
import mock from "./mock";

const props = defineProps<PageComponentProps>();
const activeIndex = ref(0);
const trackRef = ref<HTMLElement | null>(null);
const loginPageId = "auth/login";
let autoplayTimer: number | undefined;

function goBack() {
  if (!props.navigation.navigateBack()) {
    props.navigation.reLaunch("home/dashboard");
  }
}

function skipIntro() {
  props.navigation.redirectTo(loginPageId);
}

function startExperience() {
  props.navigation.redirectTo(loginPageId);
}

function updateActiveSlide(event: Event) {
  const track = event.currentTarget as HTMLElement;
  activeIndex.value = Math.round(track.scrollLeft / track.clientWidth);
}

function stopAutoplay() {
  if (autoplayTimer === undefined) {
    return;
  }

  window.clearInterval(autoplayTimer);
  autoplayTimer = undefined;
}

function goToSlide(index: number, behavior: ScrollBehavior = "smooth") {
  const track = trackRef.value;
  if (!track) {
    return;
  }

  const slideCount = mock.slides.length;
  const normalizedIndex = ((index % slideCount) + slideCount) % slideCount;
  activeIndex.value = normalizedIndex;
  track.scrollTo({
    left: track.clientWidth * normalizedIndex,
    behavior,
  });
}

function startAutoplay() {
  stopAutoplay();
  autoplayTimer = window.setInterval(() => {
    goToSlide(activeIndex.value + 1);
  }, 3000);
}

function handleDotClick(index: number) {
  goToSlide(index);
  startAutoplay();
}

onMounted(() => {
  startAutoplay();
});

onBeforeUnmount(() => {
  stopAutoplay();
});
</script>

<template>
  <section class="intro-page">
    <header class="intro-topbar">
      <button class="intro-back" type="button" aria-label="返回" @click="goBack">
        <span aria-hidden="true"></span>
      </button>
      <button class="intro-skip" type="button" @click="skipIntro">跳过</button>
    </header>

    <section ref="trackRef" class="intro-track" aria-label="引导页轮播" @scroll.passive="updateActiveSlide">
      <article v-for="item in mock.slides" :key="item.key" class="intro-slide">
        <div class="intro-visual">
          <img class="intro-image" :src="item.image" :alt="item.imageAlt" draggable="false" />
        </div>

        <section class="intro-copy">
          <h1>{{ item.title }}</h1>
          <p>
            <span v-for="line in item.descLines" :key="line">{{ line }}</span>
          </p>
        </section>
      </article>
    </section>

    <footer class="intro-footer">
      <button class="intro-primary" type="button" @click="startExperience">立即体验</button>
      <div class="intro-dots" aria-label="引导页进度">
        <button
          v-for="(item, index) in mock.slides"
          :key="item.key"
          class="intro-dot"
          :class="{ 'intro-dot--active': activeIndex === index }"
          type="button"
          :aria-label="`切换到${item.title}`"
          :aria-current="activeIndex === index ? 'step' : undefined"
          @click="handleDotClick(index)"
        ></button>
      </div>
    </footer>
  </section>
</template>

<style scoped>
.intro-page {
  --intro-blue: #6873f6;
  --intro-text: #263241;
  --intro-muted: #a3abb6;
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
    linear-gradient(180deg, rgba(203, 229, 252, 0.96) 0%, rgba(232, 240, 248, 0.96) 40%, #f7f8fa 100%),
    #eef4f8;
  font-family: var(--ihc-font-family);
}

.intro-topbar {
  position: absolute;
  z-index: 5;
  top: 0;
  right: 0;
  left: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 58px;
  padding: 0 29px 0 31px;
}

.intro-back,
.intro-skip,
.intro-dot {
  border: 0;
  background: transparent;
  color: inherit;
}

.intro-back {
  position: relative;
  width: 28px;
  height: 28px;
  padding: 0;
}

.intro-back span,
.intro-back::before {
  position: absolute;
  left: 3px;
  content: "";
  background: #263241;
}

.intro-back::before {
  top: 13px;
  width: 22px;
  height: 2px;
  border-radius: 999px;
}

.intro-back span {
  top: 7px;
  width: 14px;
  height: 14px;
  border-bottom: 2px solid #263241;
  border-left: 2px solid #263241;
  background: transparent;
  transform: rotate(45deg);
}

.intro-skip {
  padding: 0;
  color: #2f3742;
  font-size: 18px;
  line-height: 1;
}

.intro-track {
  display: flex;
  min-height: inherit;
  overflow-x: auto;
  overflow-y: hidden;
  scroll-snap-type: x mandatory;
  scroll-behavior: smooth;
  scrollbar-width: none;
  touch-action: pan-x;
  -webkit-overflow-scrolling: touch;
}

.intro-track::-webkit-scrollbar {
  display: none;
}

.intro-slide {
  display: flex;
  flex: 0 0 100%;
  flex-direction: column;
  align-items: center;
  min-height: inherit;
  padding: 88px 30px 156px;
  scroll-snap-align: start;
}

.intro-visual {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  width: 100%;
  height: 372px;
}

.intro-image {
  display: block;
  width: min(100%, 390px);
  max-height: 100%;
  object-fit: contain;
  user-select: none;
}

.intro-copy {
  width: 100%;
  margin-top: 47px;
  text-align: center;
}

.intro-copy h1 {
  margin: 0;
  color: var(--intro-blue);
  font-size: 29px;
  font-weight: 300;
  line-height: 1.2;
  letter-spacing: 0.05em;
}

.intro-copy p {
  display: grid;
  gap: 11px;
  margin: 20px 0 0;
  color: var(--intro-muted);
  font-size: 16px;
  font-weight: 300;
  line-height: 1.5;
  letter-spacing: 0.09em;
  white-space: nowrap;
}

.intro-footer {
  position: absolute;
  z-index: 6;
  right: 30px;
  bottom: 17px;
  left: 30px;
  display: grid;
  gap: 43px;
  justify-items: center;
  pointer-events: none;
}

.intro-primary,
.intro-dots {
  pointer-events: auto;
}

.intro-primary {
  width: 100%;
  height: 66px;
  border: 0;
  border-radius: 17px;
  background: var(--intro-blue);
  box-shadow: 0 16px 24px rgba(93, 104, 220, 0.16);
  color: #ffffff;
  font-size: 22px;
  font-weight: 300;
  letter-spacing: 0.06em;
}

.intro-dots {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 15px;
}

.intro-dot {
  width: 12px;
  height: 12px;
  padding: 0;
  border-radius: 50%;
  background: #c8c8c8;
  transition:
    background 0.2s ease,
    transform 0.2s ease;
}

.intro-dot--active {
  background: var(--intro-blue);
}

@media (min-width: 561px) {
  .intro-page {
    height: 844px;
    min-height: 844px;
  }
}

@media (max-width: 389px) {
  .intro-slide {
    padding-right: 24px;
    padding-left: 24px;
  }

  .intro-copy h1 {
    font-size: 27px;
  }

  .intro-copy p {
    font-size: 14px;
  }

  .intro-primary {
    height: 60px;
    font-size: 20px;
  }
}
</style>
