<script setup lang="ts">
import { reactive, ref } from "vue";
import type { PageComponentProps } from "@ihc/page-core/types";
import mock from "./mock";
import type { HealthInfoField, HealthInfoOption } from "./mock";

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

const activeSelect = ref<{
  key: string;
  placeholder?: string;
  options: HealthInfoOption[];
} | null>(null);

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

function openSelect(field: HealthInfoField) {
  if (field.type !== "select" || !field.options?.length) {
    return;
  }

  activeSelect.value = {
    key: field.key,
    placeholder: field.placeholder,
    options: field.options,
  };
}

function closeSelect() {
  activeSelect.value = null;
}

function chooseOption(value: string) {
  if (!activeSelect.value) {
    return;
  }

  formState[activeSelect.value.key] = value;
  closeSelect();
}

function getSelectedLabel(field: HealthInfoField) {
  if (field.type !== "select") {
    return "";
  }

  const currentValue = formState[field.key];
  const currentOption = field.options?.find((option) => option.value === currentValue);

  return currentOption?.label || field.placeholder || "请选择";
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
                'field-wrap--record': item.type === 'record',
                'field-wrap--empty': item.type !== 'record' && !formState[item.key],
              }"
            >
              <button
                v-if="item.type === 'select'"
                class="select-trigger"
                type="button"
                @click="openSelect(item)"
              >
                <span class="field-value" :class="{ 'field-value--empty': !formState[item.key] }">
                  {{ getSelectedLabel(item) }}
                </span>
                <span class="field-icon field-icon--arrow" aria-hidden="true"></span>
              </button>

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
            </div>
          </article>
        </section>
      </section>
    </main>

    <footer class="save-area">
      <button class="save-btn" type="button" @click="saveProfile">保存</button>
    </footer>

    <div v-if="activeSelect" class="sheet-mask" @click.self="closeSelect">
      <section class="choice-sheet">
        <header class="choice-sheet__header">{{ activeSelect.placeholder || "请选择" }}</header>
        <button
          v-for="option in activeSelect.options"
          :key="option.value"
          class="choice-sheet__option"
          type="button"
          @click="chooseOption(option.value)"
        >
          {{ option.label }}
        </button>
      </section>
    </div>
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
  background:
    radial-gradient(circle at 82% 8%, rgba(102, 112, 240, 0.13) 0, rgba(102, 112, 240, 0) 28%),
    linear-gradient(180deg, #f1f8ff 0%, #f7f9fb 42%, #f5f6f7 100%);
  color: #30343f;
  font-family: var(--ihc-font-family);
  transform: translateX(-50%);
  -webkit-font-smoothing: antialiased;
}

.page-nav {
  display: flex;
  align-items: center;
  height: 74px;
  padding: 0 29px;
}

.back-btn,
.save-btn,
.select-trigger,
.record-add,
.record-card__remove,
.choice-sheet__option {
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
  margin: 0 0 0 9px;
  color: #30343f;
  font-size: 24px;
  font-weight: 500;
  letter-spacing: 0.03em;
}

.page-scroll {
  height: calc(100% - 74px);
  padding: 20px 31px 104px;
  overflow-y: auto;
  scrollbar-width: none;
}

.page-scroll::-webkit-scrollbar {
  display: none;
}

.form-section + .form-section {
  margin-top: 10px;
}

.section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 47px;
  padding: 0 20px;
  background: linear-gradient(90deg, rgba(247, 249, 255, 0.9) 0%, rgba(255, 255, 255, 0) 100%);
}

.section-heading h2 {
  margin: 0;
  color: #30343f;
  font-size: 17px;
  font-weight: 600;
  line-height: 1.2;
  letter-spacing: 0.03em;
  white-space: nowrap;
}

.section-heading p {
  min-width: 0;
  margin: 0;
  color: #b7b7bb;
  font-size: 12px;
  font-weight: 500;
  line-height: 1.4;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.form-section {
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.74);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 10px 24px rgba(72, 104, 148, 0.06);
}

.form-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 60px;
  padding: 0 20px;
  border-top: 1px solid #eeeeee;
}

.form-row:first-child {
  border-top: 0;
}

.form-row--record {
  display: block;
  min-height: 0;
  padding-top: 16px;
  padding-bottom: 16px;
}

.form-label {
  display: flex;
  align-items: center;
  gap: 2px;
  flex: 0 0 108px;
  min-width: 108px;
}

.form-label--record {
  flex: none;
  min-width: 0;
  margin-bottom: 10px;
}

.form-label__text {
  color: #8f96a0;
  font-size: 15px;
  font-weight: 500;
  line-height: 1.3;
  letter-spacing: 0.01em;
  white-space: nowrap;
}

.field-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
  min-height: 60px;
}

.field-wrap--record {
  min-height: 0;
}

.field-control,
.field-value {
  width: 100%;
  min-width: 0;
  padding: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: #30343f;
  font-size: 15px;
  font-weight: 500;
  line-height: 1.5;
}

.field-control::placeholder {
  color: #b7b7bb;
  font-weight: 500;
  opacity: 1;
}

.field-control--empty,
.field-value--empty {
  color: #b7b7bb;
  font-weight: 500;
}

.field-control--number::-webkit-outer-spin-button,
.field-control--number::-webkit-inner-spin-button {
  margin: 0;
  -webkit-appearance: none;
}

.field-suffix {
  flex: 0 0 auto;
  color: #b4bac5;
  font-size: 15px;
  font-weight: 500;
}

.select-trigger {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 0;
  text-align: left;
}

.field-icon {
  flex: 0 0 auto;
}

.field-icon--arrow {
  width: 9px;
  height: 9px;
  margin-right: 2px;
  border-top: 2px solid #c7c7c7;
  border-right: 2px solid #c7c7c7;
  transform: rotate(45deg);
}

.record-panel {
  width: 100%;
}

.record-add {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-height: 48px;
  padding: 0 14px;
  border-radius: 11px;
  background: #f7f7f9;
  box-shadow: inset 0 0 0 1px #e3e5ea;
  color: #9ea2a8;
  text-align: left;
}

.record-add__icon {
  display: grid;
  place-items: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 2px solid #c7c7c7;
  color: #c7c7c7;
  font-size: 15px;
  font-weight: 500;
  line-height: 1;
}

.record-add__text {
  font-size: 14px;
  font-weight: 500;
}

.record-list {
  display: grid;
  gap: 12px;
  margin-top: 12px;
}

.record-card {
  padding: 12px;
  border-radius: 11px;
  background: #ffffff;
  box-shadow: inset 0 0 0 1px #eeeeee;
}

.record-card__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}

.record-card__index {
  color: #9ea2a8;
  font-size: 12px;
  font-weight: 500;
}

.record-card__remove {
  padding: 0;
  color: #a0a8b5;
  font-size: 12px;
  font-weight: 500;
}

.field-control--record {
  min-height: 64px;
  resize: none;
  line-height: 1.6;
}

.save-area {
  position: absolute;
  right: 54px;
  bottom: 28px;
  left: 54px;
}

.save-btn {
  width: 100%;
  height: 54px;
  border-radius: 11px;
  background: #6670f0;
  box-shadow: 0 14px 28px rgba(102, 112, 240, 0.18);
  color: #ffffff;
  font-size: 19px;
  font-weight: 500;
  letter-spacing: 0.04em;
}

.sheet-mask {
  position: absolute;
  inset: 0;
  z-index: 12;
  display: flex;
  align-items: flex-end;
  background: rgba(31, 40, 58, 0.18);
  backdrop-filter: blur(2px);
}

.choice-sheet {
  width: 100%;
  overflow: hidden;
  border-radius: 24px 24px 0 0;
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 -10px 30px rgba(63, 83, 117, 0.12);
}

.choice-sheet__header {
  height: 64px;
  border-bottom: 1px solid #eeeeee;
  color: #c2a281;
  font-size: 16px;
  font-weight: 500;
  line-height: 64px;
  text-align: center;
}

.choice-sheet__option {
  display: block;
  width: 100%;
  min-height: 84px;
  border-top: 1px solid #eeeeee;
  color: #30343f;
  font-size: 22px;
  font-weight: 400;
}

.choice-sheet__option:first-of-type {
  border-top: 0;
}

@media (min-width: 561px) {
  .detail-page {
    height: 844px;
    min-height: 844px;
  }
}

@media (max-width: 389px) {
  .page-scroll {
    padding-right: 26px;
    padding-left: 26px;
  }

  .form-label {
    flex-basis: 104px;
    min-width: 104px;
  }

  .form-label__text,
  .field-control,
  .field-value,
  .field-suffix {
    font-size: 14px;
  }

  .record-add__text {
    font-size: 13px;
  }

  .choice-sheet__option {
    min-height: 76px;
    font-size: 20px;
  }
}
</style>
