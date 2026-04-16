<script setup lang="ts">
import { nextTick, ref } from "vue";
import type { PageComponentProps } from "@ihc/page-core/types";
import mock from "./mock";

const props = defineProps<PageComponentProps>();
const scrollRef = ref<HTMLElement | null>(null);
const activeLetter = ref(mock.cityGroups[0]?.letter || "A");

function goBack() {
  if (!props.navigation.navigateBack()) {
    props.navigation.reLaunch("home/dashboard");
  }
}

function relocate() {
  props.showToast("正在重新定位");
}

function selectCity(city: string) {
  props.showToast(`已选择${city}`);
  window.setTimeout(() => {
    goBack();
  }, 220);
}

function jumpToLetter(letter: string) {
  const target = document.getElementById(`city-${letter}`);
  if (!target || !scrollRef.value) {
    return;
  }

  activeLetter.value = letter;
  scrollRef.value.scrollTo({
    top: target.offsetTop - scrollRef.value.offsetTop,
    behavior: "smooth",
  });
}

function syncActiveLetter() {
  const container = scrollRef.value;
  if (!container) {
    return;
  }

  const baseline = container.getBoundingClientRect().top + 12;
  let current = mock.cityGroups[0]?.letter || "A";

  for (const group of mock.cityGroups) {
    const target = document.getElementById(`city-${group.letter}`);
    if (!target) {
      continue;
    }

    if (target.getBoundingClientRect().top <= baseline) {
      current = group.letter;
    } else {
      break;
    }
  }

  activeLetter.value = current;
}

nextTick(syncActiveLetter);
</script>

<template>
  <section class="location-page">
    <header class="location-nav">
      <button class="back-btn" type="button" aria-label="返回" @click="goBack">
        <span class="back-arrow" aria-hidden="true"></span>
      </button>
      <h1>{{ mock.title }}</h1>
    </header>

    <main ref="scrollRef" class="location-scroll" @scroll.passive="syncActiveLetter">
      <section class="current-section">
        <h2>当前定位城市</h2>
        <div class="current-row">
          <button class="city-current" type="button" @click="selectCity(mock.currentCity)">
            <svg class="location-icon location-icon--pin" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            {{ mock.currentCity }}
          </button>
          <button class="relocate-btn" type="button" @click="relocate">
            <svg class="location-icon location-icon--refresh" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M21 12a9 9 0 0 0-15.3-6.36L3 8" />
              <path d="M3 3v5h5" />
              <path d="M3 12a9 9 0 0 0 15.3 6.36L21 16" />
              <path d="M16 16h5v5" />
            </svg>
            重新定位
          </button>
        </div>
      </section>

      <section class="hot-section">
        <h2>热门地区</h2>
        <div class="hot-grid">
          <button v-for="city in mock.hotCities" :key="city" type="button" @click="selectCity(city)">
            {{ city }}
          </button>
        </div>
      </section>

      <section class="all-section">
        <h2>所有地区</h2>
        <div v-for="group in mock.cityGroups" :id="`city-${group.letter}`" :key="group.letter" class="city-group">
          <h3>{{ group.letter }}</h3>
          <button v-for="city in group.cities" :key="`${group.letter}-${city}`" type="button" @click="selectCity(city)">
            {{ city }}
          </button>
        </div>
      </section>
    </main>

    <aside class="letter-index" aria-label="地区索引">
      <button
        v-for="letter in mock.indexLetters"
        :key="letter"
        type="button"
        :class="{ 'letter-index--active': letter === activeLetter }"
        @click="jumpToLetter(letter)"
      >
        {{ letter }}
      </button>
    </aside>
  </section>
</template>

<style scoped>
.location-page {
  position: relative;
  left: 50%;
  width: min(390px, 100vw);
  height: min(844px, calc(100vh - 36px));
  min-height: min(844px, calc(100vh - 36px));
  max-height: 844px;
  margin: -18px 0;
  overflow: hidden;
  background: #ffffff;
  color: #30343f;
  font-family: var(--ihc-font-family);
  transform: translateX(-50%);
  -webkit-font-smoothing: antialiased;
}

.location-nav {
  display: flex;
  align-items: center;
  height: 73px;
  padding: 0 22px;
}

.back-btn,
.relocate-btn,
.hot-grid button,
.city-current,
.city-group button,
.letter-index button {
  border: 0;
  background: transparent;
  color: inherit;
}

.back-btn {
  display: grid;
  place-items: center;
  width: 30px;
  height: 44px;
  padding: 0;
}

.back-arrow {
  width: 14px;
  height: 14px;
  border-bottom: 3px solid #333333;
  border-left: 3px solid #333333;
  transform: rotate(45deg);
}

.location-nav h1 {
  margin: 0 0 0 9px;
  color: #2f333c;
  font-size: 23px;
  font-weight: 400;
  letter-spacing: 0.03em;
}

.location-scroll {
  height: calc(100% - 73px);
  padding: 0 49px 32px 28px;
  overflow-y: auto;
  scrollbar-width: none;
}

.location-scroll::-webkit-scrollbar {
  display: none;
}

.current-section h2,
.hot-section h2,
.all-section h2 {
  margin: 0;
  color: #3e424b;
  font-size: 20px;
  font-weight: 500;
  letter-spacing: 0.04em;
}

.current-section h2 {
  color: #888c95;
  font-size: 17px;
}

.current-row {
  display: flex;
  align-items: center;
  gap: 28px;
  margin-top: 20px;
}

.city-current {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  padding: 0;
  color: #32363f;
  font-size: 24px;
  font-weight: 400;
}

.relocate-btn {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  padding: 0;
  color: #6872f0;
  font-size: 18px;
  font-weight: 400;
}

.location-icon {
  display: block;
  width: 23px;
  height: 23px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2.2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.location-icon--pin {
  color: #20242c;
}

.location-icon--refresh {
  width: 22px;
  height: 22px;
  color: #7180ff;
}

.hot-section {
  margin-top: 34px;
}

.hot-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px 26px;
  margin-top: 22px;
}

.hot-grid button {
  height: 54px;
  padding: 0;
  border: 1px solid #f0f0f0;
  border-radius: 12px;
  background: #fbfbfb;
  box-shadow: 0 4px 12px rgba(52, 64, 84, 0.025);
  color: #30343c;
  font-size: 19px;
  font-weight: 400;
}

.all-section {
  margin-top: 34px;
}

.city-group {
  margin-top: 32px;
}

.city-group h3 {
  margin: 0;
  padding-bottom: 17px;
  border-bottom: 1px solid #f1f1f1;
  color: #d3d4d8;
  font-size: 18px;
  font-weight: 500;
}

.city-group button {
  display: block;
  width: 100%;
  height: 66px;
  padding: 0;
  border-bottom: 1px solid #f1f1f1;
  color: #30343c;
  font-size: 20px;
  font-weight: 400;
  text-align: left;
}

.letter-index {
  position: absolute;
  top: 153px;
  right: 18px;
  z-index: 3;
  display: grid;
  justify-items: center;
  gap: 5px;
}

.letter-index button {
  display: grid;
  place-items: center;
  width: 20px;
  height: 24px;
  padding: 0;
  border-radius: 50%;
  color: #3e424b;
  font-size: 16px;
  font-weight: 400;
  line-height: 1;
}

.letter-index--active {
  width: 26px !important;
  height: 26px !important;
  background: #6872f0 !important;
  color: #ffffff !important;
  font-weight: 600 !important;
}

@media (min-width: 561px) {
  .location-page {
    height: 844px;
    min-height: 844px;
  }
}

@media (max-width: 389px) {
  .location-scroll {
    padding-right: 44px;
    padding-left: 24px;
  }

  .hot-grid {
    column-gap: 18px;
  }
}
</style>
