<script setup lang="ts">
import { reactive } from "vue";
import type { PageComponentProps } from "@ihc/page-core/types";
import mock from "./mock";

const props = defineProps<PageComponentProps>();

const form = reactive({
  reminder: mock.medicine.reminder,
});

function goBack() {
  if (!props.navigation.navigateBack()) {
    props.navigation.reLaunch("health/medication-info");
  }
}

function openPicker(label: string) {
  props.showToast(`${label}选择待接入`);
}

function deleteMedication() {
  props.showToast("删除成功");
  window.setTimeout(() => {
    props.navigation.reLaunch("health/medication-info");
  }, 220);
}

function saveMedication() {
  props.showToast("保存成功");
  window.setTimeout(() => {
    props.navigation.reLaunch("health/medication-info");
  }, 220);
}
</script>

<template>
  <section class="medication-edit-page">
    <header class="edit-nav">
      <button class="back-btn" type="button" aria-label="返回" @click="goBack">
        <span class="back-arrow" aria-hidden="true"></span>
      </button>
      <h1>{{ mock.title }}</h1>
      <button class="delete-btn" type="button" @click="deleteMedication">删除</button>
    </header>

    <main class="edit-form">
      <div class="form-row">
        <span>药品名称</span>
        <strong>{{ mock.medicine.name }}</strong>
      </div>

      <button class="form-row form-row--action" type="button" @click="openPicker('用药时间')">
        <span>用药时间</span>
        <em class="time-chips">
          <b v-for="time in mock.medicine.times" :key="time">{{ time }}</b>
        </em>
        <i class="plus-icon" aria-hidden="true"></i>
      </button>

      <button class="form-row form-row--action" type="button" @click="openPicker('用药频率')">
        <span>用药频率</span>
        <strong>{{ mock.medicine.frequency }}</strong>
        <i class="arrow-icon" aria-hidden="true"></i>
      </button>

      <button class="form-row form-row--action" type="button" @click="openPicker('单位')">
        <span>单位</span>
        <strong>{{ mock.medicine.unit }}</strong>
        <i class="arrow-icon" aria-hidden="true"></i>
      </button>

      <div class="form-row">
        <span>计量</span>
        <strong>{{ mock.medicine.dose }}</strong>
      </div>

      <label class="form-row reminder-row">
        <span>用药提醒</span>
        <input v-model="form.reminder" type="checkbox" />
        <i class="switch-track" :class="{ 'switch-track--active': form.reminder }">
          <b></b>
        </i>
      </label>
    </main>

    <footer class="save-area">
      <button class="save-btn" type="button" @click="saveMedication">保存</button>
    </footer>
  </section>
</template>

<style scoped>
.medication-edit-page {
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

.edit-nav {
  display: grid;
  grid-template-columns: 28px 1fr auto;
  align-items: center;
  height: 72px;
  padding: 0 31px;
}

.back-btn,
.delete-btn,
.form-row--action,
.save-btn {
  border: 0;
  background: transparent;
  color: inherit;
}

.back-btn {
  display: grid;
  place-items: center;
  width: 28px;
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

.edit-nav h1 {
  margin: 0 0 0 8px;
  color: #30343f;
  font-size: 24px;
  font-weight: 500;
  letter-spacing: 0.03em;
}

.delete-btn {
  padding: 0;
  color: #6670f0;
  font-size: 18px;
  font-weight: 400;
}

.edit-form {
  margin-top: 9px;
}

.form-row {
  display: grid;
  grid-template-columns: 126px minmax(0, 1fr) 28px;
  align-items: center;
  width: 100%;
  height: 66px;
  padding: 0 31px 0 37px;
  border-top: 1px solid #eeeeee;
  color: #9ea2a8;
  text-align: left;
}

.form-row:last-child {
  border-bottom: 1px solid #eeeeee;
}

.form-row span {
  font-size: 20px;
  font-weight: 500;
  letter-spacing: 0.03em;
  white-space: nowrap;
}

.form-row strong,
.form-row em {
  min-width: 0;
  color: #333333;
  font-size: 20px;
  font-style: normal;
  font-weight: 400;
}

.time-chips {
  display: flex;
  gap: 14px;
}

.time-chips b {
  min-width: 67px;
  height: 33px;
  border: 1px solid #e1e1e1;
  border-radius: 7px;
  background: #f0f0f0;
  color: #606060;
  font-size: 17px;
  font-weight: 400;
  line-height: 33px;
  text-align: center;
}

.plus-icon {
  position: relative;
  justify-self: end;
  width: 22px;
  height: 22px;
  border: 2px solid #c7c7c7;
  border-radius: 50%;
}

.plus-icon::before,
.plus-icon::after {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 11px;
  height: 2px;
  content: "";
  border-radius: 999px;
  background: #c7c7c7;
  transform: translate(-50%, -50%);
}

.plus-icon::after {
  transform: translate(-50%, -50%) rotate(90deg);
}

.arrow-icon {
  justify-self: end;
  width: 10px;
  height: 10px;
  border-top: 3px solid #c7c7c7;
  border-right: 3px solid #c7c7c7;
  transform: rotate(45deg);
}

.reminder-row {
  grid-template-columns: 1fr auto;
}

.reminder-row input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}

.switch-track {
  position: relative;
  display: block;
  width: 56px;
  height: 28px;
  border-radius: 999px;
  background: #c7c7c7;
  transition: background 0.2s ease;
}

.switch-track b {
  position: absolute;
  top: -5px;
  left: -1px;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: #f7f7f7;
  box-shadow: 0 4px 10px rgba(80, 80, 80, 0.08);
  transition: transform 0.2s ease;
}

.switch-track--active {
  background: #6670f0;
}

.switch-track--active b {
  transform: translateX(20px);
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
  .medication-edit-page {
    height: 844px;
    min-height: 844px;
  }
}

@media (max-width: 389px) {
  .form-row {
    grid-template-columns: 118px minmax(0, 1fr) 28px;
    padding-right: 28px;
    padding-left: 32px;
  }

  .time-chips {
    gap: 9px;
  }
}
</style>
