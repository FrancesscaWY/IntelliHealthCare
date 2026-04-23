<script setup lang="ts">
import { ref } from "vue";
import type { PageComponentProps } from "@ihc/page-core/types";
import mock from "./mock";

const props = defineProps<PageComponentProps>();
const searchValue = ref("");
const activeDepartment = ref(mock.activeDepartment);

function goBack() {
  if (!props.navigation.navigateBack()) {
    props.navigation.reLaunch("home/dashboard");
  }
}

function selectDepartment(name: string) {
  activeDepartment.value = name;
}

function openDisease(name: string) {
  props.navigation.navigateTo("content/disease-detail");
}
</script>

<template>
  <section class="disease-guide-page">
    <header class="disease-nav">
      <button class="back-btn" type="button" aria-label="返回" @click="goBack">
        <span class="back-arrow" aria-hidden="true"></span>
      </button>
      <h1>{{ mock.title }}</h1>
    </header>

    <main class="disease-main">
      <label class="disease-search">
        <span class="search-icon" aria-hidden="true"></span>
        <input v-model="searchValue" type="search" :placeholder="mock.searchPlaceholder" />
      </label>

      <section class="disease-content">
        <aside class="department-list" aria-label="科室分类">
          <button
            v-for="department in mock.departments"
            :key="department"
            type="button"
            :class="{ 'department-item--active': activeDepartment === department }"
            @click="selectDepartment(department)"
          >
            {{ department }}
          </button>
        </aside>

        <section class="disease-list-panel" aria-label="疾病列表">
          <button v-for="(item, index) in mock.diseases" :key="`${item}-${index}`" type="button" @click="openDisease(item)">
            {{ item }}
          </button>
        </section>
      </section>
    </main>
  </section>
</template>

<style scoped>
.disease-guide-page {
  position: relative;
  left: 50%;
  width: min(390px, 100vw);
  height: min(844px, calc(100vh - 36px));
  min-height: min(844px, calc(100vh - 36px));
  max-height: 844px;
  margin: -18px 0;
  overflow: hidden;
  background: #f5f6f7;
  color: #252939;
  font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif;
  transform: translateX(-50%);
  -webkit-font-smoothing: antialiased;
  text-rendering: geometricPrecision;
}

.disease-nav {
  display: flex;
  align-items: center;
  height: 74px;
  padding: 0 28px;
}

.back-btn,
.department-list button,
.disease-list-panel button {
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
  border-bottom: 3px solid #252939;
  border-left: 3px solid #252939;
  transform: rotate(45deg);
}

.disease-nav h1 {
  margin: 0 0 0 10px;
  color: #222733;
  font-size: 20px;
  font-weight: 900;
  letter-spacing: 0;
}

.disease-main {
  height: calc(100% - 74px);
  padding: 20px 34px 0;
  overflow: hidden;
}

.disease-search {
  display: flex;
  align-items: center;
  height: 40px;
  padding: 3px 14px;
  border: 2px solid transparent;
  border-radius: 999px;
  background:
    linear-gradient(#ffffff, #ffffff) padding-box,
    linear-gradient(92deg, #8e72e8 0%, #69d5d1 48%, #68db87 100%) border-box;
  box-shadow: 0 13px 28px rgba(68, 144, 162, 0.08);
}

.search-icon {
  position: relative;
  width: 18px;
  height: 18px;
  margin-right: 10px;
  border: 2.5px solid #9a9da6;
  border-radius: 50%;
}

.search-icon::after {
  position: absolute;
  right: -7px;
  bottom: -5px;
  width: 9px;
  height: 2.5px;
  content: "";
  border-radius: 999px;
  background: #9a9da6;
  transform: rotate(45deg);
}

.disease-search input {
  flex: 1;
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: #252939;
  font-size: 14px;
  font-weight: 700;
}

.disease-search input::placeholder {
  color: #9a9da6;
  opacity: 1;
}

.disease-content {
  display: grid;
  grid-template-columns: 101px minmax(0, 1fr);
  gap: 24px;
  height: calc(100% - 72px);
  margin-top: 24px;
}

.department-list {
  display: grid;
  align-content: start;
  gap: 10px;
  height: 100%;
  padding: 14px 0;
  overflow-y: auto;
  border: 1px solid rgba(255, 255, 255, 0.68);
  border-radius: 15px;
  background: rgba(255, 255, 255, 0.86);
  box-shadow: 0 16px 34px rgba(82, 105, 148, 0.08);
  scrollbar-width: none;
}

.department-list::-webkit-scrollbar,
.disease-list-panel::-webkit-scrollbar {
  display: none;
}

.department-list button {
  width: calc(100% - 20px);
  height: 53px;
  margin: 0 auto;
  padding: 0;
  border-radius: 15px;
  color: #8f95a2;
  font-size: 14px;
  font-weight: 800;
  letter-spacing: 0;
}

.department-item--active {
  background: rgba(102, 207, 167, 0.14) !important;
  color: #39a980 !important;
  font-weight: 900 !important;
}

.disease-list-panel {
  height: 100%;
  padding: 0 24px;
  overflow-y: auto;
  border: 1px solid rgba(255, 255, 255, 0.68);
  border-radius: 15px 15px 0 0;
  background: rgba(255, 255, 255, 0.86);
  box-shadow: 0 16px 34px rgba(82, 105, 148, 0.08);
  scrollbar-width: none;
}

.disease-list-panel button {
  display: block;
  width: 100%;
  height: 64px;
  padding: 0;
  border-bottom: 1px solid rgba(205, 207, 215, 0.72);
  color: #222733;
  font-size: 15px;
  font-weight: 800;
  text-align: left;
}

@media (min-width: 561px) {
  .disease-guide-page {
    height: 844px;
    min-height: 844px;
  }
}

@media (max-width: 389px) {
  .disease-main {
    padding-right: 28px;
    padding-left: 28px;
  }

  .disease-content {
    grid-template-columns: 94px minmax(0, 1fr);
    gap: 20px;
  }

  .department-list button {
    font-size: 17px;
  }
}
</style>
