<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import type { PageComponentProps } from "@ihc/page-core/types";
import { listDiseaseDepartments, listDiseases, type DiseaseDepartmentItem, type DiseaseListItem } from "@/shared/api/content";
import mock from "./mock";
import { selectedDiseaseId } from "./state";

const props = defineProps<PageComponentProps>();
const searchValue = ref("");
const activeDepartmentId = ref("");

type DepartmentViewModel = {
  id: string;
  name: string;
};

type DiseaseViewModel = {
  id: string;
  diseaseId: string;
  title: string;
  summary: string;
  departmentId: string;
  departmentName: string;
  publishedAt: string;
};

const departments = ref<DepartmentViewModel[]>(
  mock.departments.map((item) => ({
    id: item.id,
    name: item.name
  }))
);

const diseases = ref<DiseaseViewModel[]>(
  mock.diseases.map((item) => ({
    ...item,
    publishedAt: ""
  }))
);

const filteredDiseases = computed(() => {
  const keyword = searchValue.value.trim().toLowerCase();

  return diseases.value.filter((item) => {
    const matchesDepartment = !activeDepartmentId.value || item.departmentId === activeDepartmentId.value;
    const matchesKeyword =
      !keyword ||
      item.title.toLowerCase().includes(keyword) ||
      item.summary.toLowerCase().includes(keyword) ||
      item.departmentName.toLowerCase().includes(keyword);

    return matchesDepartment && matchesKeyword;
  });
});

function mapDepartment(item: DiseaseDepartmentItem): DepartmentViewModel {
  return {
    id: item.departmentId || item.id,
    name: item.name
  };
}

function mapDisease(item: DiseaseListItem, index: number): DiseaseViewModel {
  const diseaseId = item.diseaseId || item.id || `disease-${index + 1}`;

  return {
    id: item.id || diseaseId,
    diseaseId,
    title: item.title || item.name || "未命名疾病",
    summary: item.summary || "暂无疾病简介",
    departmentId: item.department?.departmentId || "unknown",
    departmentName: item.department?.name || "未分类",
    publishedAt: item.publishedAt || ""
  };
}

function applyFallbackData() {
  departments.value = mock.departments.map((item) => ({
    id: item.id,
    name: item.name
  }));
  diseases.value = mock.diseases.map((item) => ({
    ...item,
    publishedAt: ""
  }));
  activeDepartmentId.value = departments.value[0]?.id || "";
}

async function loadDiseaseGuide() {
  try {
    const [departmentList, diseaseList] = await Promise.all([
      listDiseaseDepartments(),
      listDiseases({
        page: 1,
        pageSize: 100
      })
    ]);

    departments.value = departmentList.map(mapDepartment);
    diseases.value = diseaseList.list.map(mapDisease);
    activeDepartmentId.value =
      departments.value.find((item) => item.id === activeDepartmentId.value)?.id || departments.value[0]?.id || "";

    if (diseases.value.length === 0) {
      diseases.value = mock.diseases.map((item) => ({
        ...item,
        publishedAt: ""
      }));
    }
  } catch {
    applyFallbackData();
    props.showToast("疾病内容加载失败，已显示本地示例");
  }
}

function goBack() {
  if (!props.navigation.navigateBack()) {
    props.navigation.reLaunch("home/dashboard");
  }
}

function selectDepartment(departmentId: string) {
  activeDepartmentId.value = departmentId;
}

function openDisease(item: DiseaseViewModel) {
  selectedDiseaseId.value = item.diseaseId;
  props.navigation.navigateTo("content/disease-detail");
}

onMounted(() => {
  applyFallbackData();
  void loadDiseaseGuide();
});
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
        <aside class="department-list" aria-label="疾病科室">
          <button
            v-for="department in departments"
            :key="department.id"
            type="button"
            :class="{ 'department-item--active': activeDepartmentId === department.id }"
            @click="selectDepartment(department.id)"
          >
            {{ department.name }}
          </button>
        </aside>

        <section class="disease-list-panel" aria-label="疾病列表">
          <button
            v-for="item in filteredDiseases"
            :key="item.id"
            type="button"
            class="disease-card"
            @click="openDisease(item)"
          >
            <strong>{{ item.title }}</strong>
            <span>{{ item.departmentName }}</span>
            <p>{{ item.summary }}</p>
          </button>

          <p v-if="filteredDiseases.length === 0" class="empty-text">{{ mock.emptyText }}</p>
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
  min-height: 53px;
  margin: 0 auto;
  padding: 0 10px;
  border-radius: 15px;
  color: #8f95a2;
  font-size: 14px;
  font-weight: 800;
}

.department-item--active {
  background: rgba(102, 207, 167, 0.14) !important;
  color: #39a980 !important;
  font-weight: 900 !important;
}

.disease-list-panel {
  height: 100%;
  padding: 12px 18px 20px;
  overflow-y: auto;
  border: 1px solid rgba(255, 255, 255, 0.68);
  border-radius: 15px 15px 0 0;
  background: rgba(255, 255, 255, 0.86);
  box-shadow: 0 16px 34px rgba(82, 105, 148, 0.08);
  scrollbar-width: none;
}

.disease-card {
  display: block;
  width: 100%;
  padding: 16px 0 14px;
  border-bottom: 1px solid rgba(205, 207, 215, 0.72);
  text-align: left;
}

.disease-card strong {
  display: block;
  color: #222733;
  font-size: 15px;
  font-weight: 800;
}

.disease-card span {
  display: inline-flex;
  margin-top: 8px;
  padding: 0 10px;
  border-radius: 999px;
  background: #eef7f3;
  color: #39a980;
  font-size: 12px;
  line-height: 24px;
}

.disease-card p {
  margin: 10px 0 0;
  color: #6f7888;
  font-size: 13px;
  line-height: 1.7;
}

.empty-text {
  margin: 22px 0 0;
  color: #9aa3b1;
  font-size: 14px;
  text-align: center;
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
}
</style>
