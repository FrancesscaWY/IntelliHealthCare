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
  color: #333844;
  font-family: var(--ihc-font-family);
  transform: translateX(-50%);
  -webkit-font-smoothing: antialiased;
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
  border-bottom: 4px solid #333333;
  border-left: 4px solid #333333;
  transform: rotate(45deg);
}

.disease-nav h1 {
  margin: 0 0 0 10px;
  color: #30343d;
  font-size: 23px;
  font-weight: 500;
  letter-spacing: 0.04em;
}

.disease-main {
  height: calc(100% - 74px);
  padding: 20px 34px 0;
  overflow: hidden;
}

.disease-search {
  display: flex;
  align-items: center;
  height: 59px;
  padding: 0 22px;
  border: 1px solid #eeeeee;
  border-radius: 16px;
  background: #ffffff;
  box-shadow: 0 10px 24px rgba(70, 84, 110, 0.025);
}

.search-icon {
  position: relative;
  width: 21px;
  height: 21px;
  margin-right: 10px;
  border: 3px solid #c9c9c9;
  border-radius: 50%;
}

.search-icon::after {
  position: absolute;
  right: -8px;
  bottom: -5px;
  width: 10px;
  height: 3px;
  content: "";
  border-radius: 999px;
  background: #c9c9c9;
  transform: rotate(45deg);
}

.disease-search input {
  flex: 1;
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: #333844;
  font-size: 20px;
}

.disease-search input::placeholder {
  color: #b9bbc1;
  opacity: 1;
}

.disease-content {
  display: grid;
  grid-template-columns: 101px minmax(0, 1fr);
  gap: 24px;
  height: calc(100% - 91px);
  margin-top: 31px;
}

.department-list {
  display: grid;
  align-content: start;
  gap: 10px;
  height: 100%;
  padding: 14px 0;
  overflow-y: auto;
  border-radius: 12px;
  background: #ffffff;
  box-shadow: 0 13px 32px rgba(76, 85, 112, 0.04);
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
  border-radius: 12px;
  color: #646873;
  font-size: 18px;
  font-weight: 400;
  letter-spacing: 0.03em;
}

.department-item--active {
  background: #f0f2ff !important;
  color: #6872f0 !important;
  font-weight: 600 !important;
}

.disease-list-panel {
  height: 100%;
  padding: 0 30px;
  overflow-y: auto;
  border-radius: 16px 16px 0 0;
  background: #ffffff;
  box-shadow: 0 13px 32px rgba(76, 85, 112, 0.035);
  scrollbar-width: none;
}

.disease-list-panel button {
  display: block;
  width: 100%;
  height: 73px;
  padding: 0;
  border-bottom: 1px solid #eeeeee;
  color: #30343d;
  font-size: 20px;
  font-weight: 400;
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
