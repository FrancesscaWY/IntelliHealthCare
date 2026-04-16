<script setup lang="ts">
import { reactive } from "vue";
import type { PageComponentProps } from "@ihc/page-core/types";
import mock from "./mock";

const props = defineProps<PageComponentProps>();

const formState = reactive<Record<string, string>>(
  Object.fromEntries(
    mock.groups
      .flatMap((group) => group.fields)
      .filter((item) => item.type !== "record")
      .map((item) => [item.key, ""]),
  ),
);
const recordState = reactive<Record<string, string[]>>(
  Object.fromEntries(
    mock.groups
      .flatMap((group) => group.fields)
      .filter((item) => item.type === "record")
      .map((item) => [item.key, []]),
  ),
);

function goBack() {
  if (!props.navigation.navigateBack()) {
    props.navigation.reLaunch("healthdocs/health-records");
  }
}

function addRecord(key: string) {
  recordState[key].push("");
}

function removeRecord(key: string, index: number) {
  recordState[key].splice(index, 1);
}

function saveProfile() {
  props.showToast("健康信息已暂存");
}
</script>

<template>
  <section class="detail-page">
    <header class="page-nav">
      <button class="back-btn" type="button" aria-label="返回" @click="goBack">
        <span class="back-arrow" aria-hidden="true"></span>
      </button>
      <h1>{{ mock.title }}</h1>
    </header>

    <main class="page-scroll">
      <section v-for="group in mock.groups" :key="group.title" class="form-section">
        <header class="section-heading">
          <h2>{{ group.title }}</h2>
          <p v-if="group.hint">{{ group.hint }}</p>
        </header>

        <section class="form-group">
          <article
            v-for="item in group.fields"
            :key="item.key"
            class="form-row"
            :class="{ 'form-row--record': item.type === 'record' }"
          >
            <div class="form-label" :class="{ 'form-label--record': item.type === 'record' }">
              <span class="form-label__text">{{ item.label }}</span>
            </div>

            <div
              class="field-wrap"
              :class="{
                'field-wrap--select': item.type === 'select',
                'field-wrap--record': item.type === 'record',
                'field-wrap--empty': !formState[item.key],
              }"
            >
              <select
                v-if="item.type === 'select'"
                v-model="formState[item.key]"
                class="field-control field-control--select"
                :class="{ 'field-control--empty': !formState[item.key] }"
              >
                <option value="" disabled>{{ item.placeholder }}</option>
                <option v-for="option in item.options" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </select>

              <div v-else-if="item.type === 'record'" class="record-panel">
                <button class="record-add" type="button" @click="addRecord(item.key)">
                  <span class="record-add__icon" aria-hidden="true">+</span>
                  <span class="record-add__text">添加一条记录</span>
                </button>

                <div v-if="recordState[item.key].length" class="record-list">
                  <article
                    v-for="(_, index) in recordState[item.key]"
                    :key="`${item.key}-${index}`"
                    class="record-card"
                  >
                    <div class="record-card__top">
                      <span class="record-card__index">记录 {{ index + 1 }}</span>
                      <button
                        class="record-card__remove"
                        type="button"
                        @click="removeRecord(item.key, index)"
                      >
                        删除
                      </button>
                    </div>

                    <textarea
                      v-model="recordState[item.key][index]"
                      class="field-control field-control--record"
                      :placeholder="item.placeholder"
                    ></textarea>
                  </article>
                </div>
              </div>

              <input
              v-else
                v-model="formState[item.key]"
                class="field-control"
                :class="{
                  'field-control--number': item.type === 'number',
                  'field-control--empty': !formState[item.key],
                }"
                :type="item.type === 'number' ? 'number' : 'text'"
                :placeholder="item.placeholder"
              />

              <small v-if="item.suffix" class="field-suffix">{{ item.suffix }}</small>
              <span
                v-if="item.type === 'select'"
                class="field-icon field-icon--arrow"
                aria-hidden="true"
              ></span>
            </div>
          </article>
        </section>
      </section>
    </main>

    <footer class="save-area">
      <button class="save-btn" type="button" @click="saveProfile">保存</button>
    </footer>
  </section>
</template>

<style scoped>
.detail-page {
  position: relative;
  left: 50%;
  width: min(390px, 100vw);
  height: min(844px, calc(100vh - 36px));
  min-height: min(844px, calc(100vh - 36px));
  max-height: 844px;
  margin: -18px 0;
  overflow: hidden;
  background: #ffffff;
  color: #333333;
  font-family: "HarmonyOS Sans SC", "MiSans", "Source Han Sans SC", "Noto Sans SC", "PingFang SC", "Microsoft YaHei UI", sans-serif;
  transform: translateX(-50%);
  -webkit-font-smoothing: antialiased;
}

.page-nav {
  display: flex;
  align-items: center;
  height: 72px;
  padding: 0 31px;
}

.back-btn,
.save-btn {
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

.page-nav h1 {
  margin: 0 0 0 8px;
  color: #30343f;
  font-size: 24px;
  font-weight: 500;
  letter-spacing: 0.03em;
}

.page-scroll {
  height: calc(100% - 72px);
  padding: 10px 0 112px;
  overflow-y: auto;
  scrollbar-width: none;
}

.page-scroll::-webkit-scrollbar {
  display: none;
}

.form-section + .form-section {
  margin-top: 22px;
}

.section-heading {
  padding: 0 31px 14px 37px;
}

.section-heading h2 {
  margin: 0;
  color: #3f4654;
  font-size: 20px;
  font-weight: 600;
  line-height: 1.2;
  letter-spacing: 0.03em;
}

.section-heading p {
  margin: 6px 0 0;
  color: #a0a8b5;
  font-size: 13px;
  line-height: 1.4;
}

.form-group {
  overflow: hidden;
  border-top: 1px solid #eeeeee;
  border-bottom: 1px solid #eeeeee;
  background: #ffffff;
}

.form-row {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 66px;
  padding: 0 31px 0 37px;
  border-top: 1px solid #eeeeee;
}

.form-row:first-child {
  border-top: 0;
}

.form-row--record {
  display: block;
  min-height: 0;
  padding-top: 18px;
  padding-bottom: 18px;
}

.form-label {
  display: flex;
  align-items: center;
  gap: 2px;
  flex: 0 0 126px;
  min-width: 126px;
}

.form-label--record {
  flex: none;
  min-width: 0;
  margin-bottom: 12px;
}

.form-label__text {
  color: #9ea2a8;
  font-size: 20px;
  font-weight: 500;
  line-height: 1.2;
  letter-spacing: 0.03em;
  white-space: nowrap;
}

.field-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
  min-height: 66px;
}

.field-wrap--record {
  min-height: 0;
}

.field-control {
  width: 100%;
  min-width: 0;
  padding: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: #3c4250;
  font-size: 20px;
  font-weight: 500;
  line-height: 1.5;
}

.field-control::placeholder {
  color: #c0c4cc;
  font-weight: 400;
}

.field-control--empty {
  color: #c0c4cc;
  font-weight: 400;
}

.field-control--select {
  appearance: none;
  -webkit-appearance: none;
  padding-right: 18px;
  background: transparent;
}

.field-control--number::-webkit-outer-spin-button,
.field-control--number::-webkit-inner-spin-button {
  margin: 0;
  -webkit-appearance: none;
}

.field-suffix {
  flex: 0 0 auto;
  color: #b4bac5;
  font-size: 20px;
  font-weight: 500;
}

.field-icon {
  flex: 0 0 auto;
}

.field-icon--arrow {
  width: 10px;
  height: 10px;
  margin-right: 2px;
  border-top: 3px solid #c7c7c7;
  border-right: 3px solid #c7c7c7;
  transform: rotate(45deg);
}

.record-panel {
  width: 100%;
}

.record-add,
.record-card__remove {
  border: 0;
  background: transparent;
}

.record-add {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-height: 52px;
  padding: 0 14px;
  border-radius: 16px;
  background: #f6f8fc;
  box-shadow: inset 0 0 0 1px rgba(222, 227, 236, 0.9);
  color: #8390a3;
  text-align: left;
}

.record-add__icon {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: rgba(102, 112, 240, 0.12);
  color: #6670f0;
  font-size: 18px;
  font-weight: 500;
  line-height: 1;
}

.record-add__text {
  font-size: 17px;
  font-weight: 500;
}

.record-list {
  display: grid;
  gap: 12px;
  margin-top: 12px;
}

.record-card {
  padding: 14px;
  border-radius: 18px;
  background: #f8faff;
  box-shadow: inset 0 0 0 1px rgba(222, 227, 236, 0.92);
}

.record-card__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.record-card__index {
  color: #7c8698;
  font-size: 14px;
  font-weight: 500;
}

.record-card__remove {
  padding: 0;
  color: #a0a8b5;
  font-size: 14px;
  font-weight: 500;
}

.field-control--record {
  min-height: 78px;
  padding: 0;
  resize: none;
  line-height: 1.6;
}

.save-area {
  position: absolute;
  right: 32px;
  bottom: 24px;
  left: 32px;
}

.save-btn {
  width: 100%;
  height: 66px;
  border-radius: 13px;
  background: #6670f0;
  box-shadow: 0 14px 28px rgba(102, 112, 240, 0.18);
  color: #ffffff;
  font-size: 23px;
  font-weight: 500;
  letter-spacing: 0.06em;
}

@media (min-width: 561px) {
  .detail-page {
    height: 844px;
    min-height: 844px;
  }
}

@media (max-width: 389px) {
  .page-nav,
  .section-heading,
  .form-row,
  .save-area {
    padding-right: 28px;
    padding-left: 32px;
  }

  .form-label {
    flex-basis: 118px;
    min-width: 118px;
  }

  .form-label__text,
  .field-control,
  .field-suffix {
    font-size: 18px;
  }

  .record-add__text {
    font-size: 16px;
  }
}
</style>
