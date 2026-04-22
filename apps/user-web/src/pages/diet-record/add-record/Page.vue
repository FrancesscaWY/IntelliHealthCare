<script setup lang="ts">
import { computed, ref } from "vue";
import type { PageComponentProps } from "@ihc/page-core/types";
import { dietMealOptions, dietThumbOptions, getDefaultMealKey, saveDietCustomRecord } from "../state";
import type { DietFoodThumb, DietMealKey } from "../mock";

const props = defineProps<PageComponentProps>();

const DRAFT_KEY = "ihc:diet-record:add-draft";
const RETURN_PATH_KEY = "ihc:diet-record:return-path";
const ACTIVE_DAY_KEY = "ihc:diet-record:active-day";

type DietAddDraft = {
  date?: string;
  mealKey?: DietMealKey;
};

function readDraft(): DietAddDraft {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw = window.sessionStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as DietAddDraft) : {};
  } catch {
    return {};
  }
}

function readReturnPath() {
  if (typeof window === "undefined") {
    return "diet-record";
  }

  return window.sessionStorage.getItem(RETURN_PATH_KEY) || "diet-record";
}

function clearDraftState() {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(DRAFT_KEY);
  window.sessionStorage.removeItem(RETURN_PATH_KEY);
}

const draft = readDraft();
const returnPath = ref(readReturnPath());
const selectedDate = ref(draft.date || new Date().toISOString().slice(0, 10));
const mealKey = ref<DietMealKey>(draft.mealKey || getDefaultMealKey());
const foodName = ref("");
const amount = ref("");
const calories = ref("");
const eatenAt = ref("08:00");
const thumb = ref<DietFoodThumb>("bread");

const currentMealLabel = computed(() => dietMealOptions.find((item) => item.key === mealKey.value)?.label || "早餐");
const pageTitle = computed(() => `添加${currentMealLabel.value}记录`);
const isFormValid = computed(
  () =>
    Boolean(selectedDate.value) &&
    Boolean(foodName.value.trim()) &&
    Boolean(amount.value.trim()) &&
    Number(calories.value) > 0 &&
    Boolean(eatenAt.value),
);

function navigateBackToSource() {
  clearDraftState();

  if (props.navigation?.reLaunch) {
    props.navigation.reLaunch(returnPath.value || "diet-record");
    return;
  }

  if (props.navigation?.navigateTo) {
    props.navigation.navigateTo(returnPath.value || "diet-record");
    return;
  }

  window.history.back();
}

function goBack() {
  navigateBackToSource();
}

function onSubmit() {
  if (!isFormValid.value) {
    return;
  }

  saveDietCustomRecord({
    date: selectedDate.value,
    mealKey: mealKey.value,
    foodName: foodName.value.trim(),
    amount: amount.value.trim(),
    calories: Number(calories.value),
    eatenAt: eatenAt.value,
    thumb: thumb.value,
  });

  if (typeof window !== "undefined") {
    window.sessionStorage.setItem(ACTIVE_DAY_KEY, selectedDate.value);
  }

  props.showToast("已添加饮食记录");
  navigateBackToSource();
}
</script>

<template>
  <section class="diet-add-page">
    <header class="page-nav">
      <button class="back-btn" type="button" aria-label="返回" @click="goBack">
        <span class="back-arrow" aria-hidden="true"></span>
      </button>
      <h1>{{ pageTitle }}</h1>
    </header>

    <main class="page-body">
      <section class="intro-card">
        <span>饮食记录</span>
        <strong>补充一条新的饮食内容</strong>
        <p>保存后会自动回到饮食记录页，并显示到对应餐次下。</p>
      </section>

      <section class="form-card">
        <label class="form-row">
          <span>日期</span>
          <input v-model="selectedDate" type="date" />
        </label>

        <label class="form-row">
          <span>餐次</span>
          <select v-model="mealKey">
            <option v-for="item in dietMealOptions" :key="item.key" :value="item.key">{{ item.label }}</option>
          </select>
        </label>

        <label class="form-row">
          <span>食物名称</span>
          <input v-model="foodName" type="text" placeholder="请输入食物名称" />
        </label>

        <label class="form-row">
          <span>份量</span>
          <input v-model="amount" type="text" placeholder="如 120克 / 1份" />
        </label>

        <label class="form-row">
          <span>热量</span>
          <div class="input-inline">
            <input v-model="calories" type="number" min="1" step="1" placeholder="请输入热量" />
            <em>千卡</em>
          </div>
        </label>

        <label class="form-row">
          <span>用餐时间</span>
          <input v-model="eatenAt" type="time" />
        </label>
      </section>

      <section class="thumb-card">
        <header class="thumb-header">
          <strong>食物分类</strong>
          <small>用于生成列表缩略图样式</small>
        </header>

        <div class="thumb-grid">
          <button
            v-for="item in dietThumbOptions"
            :key="item.key"
            class="thumb-chip"
            :class="{ 'thumb-chip--active': thumb === item.key }"
            type="button"
            @click="thumb = item.key"
          >
            {{ item.label }}
          </button>
        </div>
      </section>
    </main>

    <footer class="save-area">
      <button class="save-btn" type="button" :disabled="!isFormValid" @click="onSubmit">保存记录</button>
    </footer>
  </section>
</template>

<style scoped>
.diet-add-page {
  --accent-start: #8dd72c;
  --accent-end: #6fc01b;
  position: relative;
  left: 50%;
  width: min(390px, 100vw);
  height: min(844px, calc(100vh - 36px));
  min-height: min(844px, calc(100vh - 36px));
  max-height: 844px;
  margin: -18px 0;
  overflow: hidden;
  background: linear-gradient(180deg, #f4f7ef 0%, #f6f7f9 24%, #f7f8fa 100%);
  color: #2f333a;
  font-family: var(--ihc-font-family);
  transform: translateX(-50%);
  -webkit-font-smoothing: antialiased;
}

.page-nav {
  display: flex;
  align-items: center;
  height: 72px;
  padding: 0 22px;
}

.back-btn {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
}

.back-arrow {
  width: 12px;
  height: 12px;
  border-bottom: 2px solid #373c45;
  border-left: 2px solid #373c45;
  transform: rotate(45deg);
}

.page-nav h1 {
  margin: 0 0 0 8px;
  font-size: 22px;
  font-weight: 700;
  letter-spacing: 0.01em;
}

.page-body {
  display: grid;
  gap: 14px;
  height: calc(100% - 72px);
  padding: 8px 18px 114px;
  overflow-y: auto;
  scrollbar-width: none;
}

.page-body::-webkit-scrollbar {
  display: none;
}

.intro-card,
.form-card,
.thumb-card {
  border: 1px solid rgba(234, 237, 241, 0.96);
  border-radius: 24px;
  background: #ffffff;
  box-shadow: 0 14px 30px rgba(67, 74, 90, 0.06);
}

.intro-card {
  padding: 18px 18px 16px;
  background: linear-gradient(135deg, rgba(141, 215, 44, 0.14) 0%, rgba(255, 255, 255, 0.96) 54%, rgba(255, 255, 255, 0.98) 100%);
}

.intro-card span {
  display: inline-flex;
  align-items: center;
  height: 28px;
  padding: 0 12px;
  border-radius: 999px;
  background: rgba(111, 192, 27, 0.12);
  color: #629d27;
  font-size: 12px;
  font-weight: 700;
}

.intro-card strong {
  display: block;
  margin-top: 12px;
  font-size: 20px;
  font-weight: 700;
}

.intro-card p {
  margin: 10px 0 0;
  color: #88919c;
  font-size: 13px;
  line-height: 1.6;
}

.form-card {
  overflow: hidden;
}

.form-row {
  display: grid;
  grid-template-columns: 82px minmax(0, 1fr);
  align-items: center;
  gap: 12px;
  min-height: 58px;
  padding: 0 18px;
}

.form-row + .form-row {
  border-top: 1px solid #f0f2f5;
}

.form-row span {
  color: #4e5561;
  font-size: 14px;
  font-weight: 600;
}

.form-row input,
.form-row select {
  min-width: 0;
  width: 100%;
  border: 0;
  outline: 0;
  background: transparent;
  color: #2f333a;
  font-size: 14px;
  font-family: inherit;
}

.form-row input::placeholder {
  color: #a5adb8;
}

.input-inline {
  display: flex;
  align-items: center;
  gap: 10px;
}

.input-inline em {
  flex: 0 0 auto;
  color: #a0a8b3;
  font-size: 13px;
  font-style: normal;
}

.thumb-card {
  padding: 16px 18px 18px;
}

.thumb-header {
  display: grid;
  gap: 6px;
}

.thumb-header strong {
  font-size: 16px;
  font-weight: 700;
}

.thumb-header small {
  color: #97a0ac;
  font-size: 12px;
}

.thumb-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  margin-top: 14px;
}

.thumb-chip {
  height: 38px;
  padding: 0;
  border: 1px solid #e8ecf1;
  border-radius: 14px;
  background: #f8f9fb;
  color: #616973;
  font-size: 13px;
  font-weight: 600;
}

.thumb-chip--active {
  border-color: rgba(111, 192, 27, 0.24);
  background: linear-gradient(135deg, rgba(141, 215, 44, 0.18) 0%, rgba(111, 192, 27, 0.12) 100%);
  color: #4f811f;
}

.save-area {
  position: absolute;
  right: 18px;
  bottom: 24px;
  left: 18px;
}

.save-btn {
  width: 100%;
  height: 54px;
  border: 0;
  border-radius: 18px;
  background: linear-gradient(135deg, var(--accent-start) 0%, var(--accent-end) 100%);
  box-shadow: 0 14px 24px rgba(111, 192, 27, 0.2);
  color: #ffffff;
  font-size: 16px;
  font-weight: 700;
}

.save-btn:disabled {
  opacity: 0.42;
  box-shadow: none;
}
</style>
