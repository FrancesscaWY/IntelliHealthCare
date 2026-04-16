<script setup lang="ts">
import { reactive, ref } from "vue";
import type { PageComponentProps } from "@ihc/page-core/types";
import mock from "./mock";

const props = defineProps<PageComponentProps>();
type PickerType = "time" | "frequency" | "unit";

const form = reactive({
  name: "",
  times: [] as string[],
  frequency: "",
  unit: "",
  dose: "",
  reminder: false,
});
const activePicker = ref<PickerType | null>(null);
const selectedHour = ref(10);
const selectedMinute = ref(3);
const editingTimeIndex = ref<number | null>(null);
const frequencies = ["每天", "每隔1天", "每隔2天", "每隔3天", "每隔4天", "每隔5天"];
const units = ["瓶", "片", "包"];

function goBack() {
  if (!props.navigation.navigateBack()) {
    props.navigation.reLaunch("health/medication-info");
  }
}

function openPicker(type: PickerType) {
  activePicker.value = type;
}

function closePicker() {
  activePicker.value = null;
  editingTimeIndex.value = null;
}

function formatTime(hour: number, minute: number) {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function getWheelOptions(selected: number, max: number) {
  const visibleCount = 7;
  const start = Math.min(Math.max(selected - 3, 0), max - visibleCount + 1);

  return Array.from({ length: visibleCount }, (_, offset) => start + offset);
}

function openTimePicker(index?: number) {
  editingTimeIndex.value = typeof index === "number" ? index : null;

  if (editingTimeIndex.value !== null) {
    const [hour = "10", minute = "03"] = (form.times[editingTimeIndex.value] || "10:03").split(":");
    selectedHour.value = Number(hour);
    selectedMinute.value = Number(minute);
  }

  openPicker("time");
}

function confirmTime() {
  const time = formatTime(selectedHour.value, selectedMinute.value);

  if (editingTimeIndex.value !== null) {
    form.times[editingTimeIndex.value] = time;
  } else if (!form.times.includes(time)) {
    form.times.push(time);
  }

  closePicker();
}

function deleteSelectedTime() {
  if (editingTimeIndex.value !== null) {
    form.times.splice(editingTimeIndex.value, 1);
  }

  closePicker();
}

function selectFrequency(value: string) {
  form.frequency = value;
  closePicker();
}

function selectUnit(value: string) {
  form.unit = value;
  closePicker();
}

function saveMedication() {
  props.showToast("保存成功");
  window.setTimeout(() => {
    props.navigation.reLaunch("health/medication-info");
  }, 220);
}
</script>

<template>
  <section class="medication-add-page">
    <header class="add-nav">
      <button class="back-btn" type="button" aria-label="返回" @click="goBack">
        <span class="back-arrow" aria-hidden="true"></span>
      </button>
      <h1>{{ mock.title }}</h1>
    </header>

    <main class="add-form">
      <label class="form-row" for="medicineName">
        <span>药品名称</span>
        <input id="medicineName" v-model="form.name" type="text" placeholder="请填写" />
      </label>

      <div class="form-row form-row--time">
        <span>用药时间</span>
        <em v-if="form.times.length" class="time-chips">
          <button v-for="(time, index) in form.times" :key="`${time}-${index}`" class="time-chip" type="button" @click="openTimePicker(index)">
            {{ time }}
          </button>
        </em>
        <em v-else>请选择</em>
        <button class="time-add-btn" type="button" aria-label="添加用药时间" @click="openTimePicker()">
          <i class="plus-icon" aria-hidden="true"></i>
        </button>
      </div>

      <button class="form-row form-row--action" type="button" @click="openPicker('frequency')">
        <span>用药频率</span>
        <em :class="{ 'field-value--selected': form.frequency }">{{ form.frequency || "请选择" }}</em>
        <i class="arrow-icon" aria-hidden="true"></i>
      </button>

      <button class="form-row form-row--action" type="button" @click="openPicker('unit')">
        <span>单位</span>
        <em :class="{ 'field-value--selected': form.unit }">{{ form.unit || "请选择" }}</em>
        <i class="arrow-icon" aria-hidden="true"></i>
      </button>

      <label class="form-row" for="medicineDose">
        <span>计量</span>
        <input id="medicineDose" v-model="form.dose" type="text" placeholder="请填写" />
      </label>

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

    <div v-if="activePicker" class="picker-mask" @click.self="closePicker">
      <section v-if="activePicker === 'time'" class="time-picker-panel" aria-label="选择用药时间">
        <header class="time-picker-header">
          <button type="button" @click="closePicker">取消</button>
          <button v-if="editingTimeIndex !== null" class="time-delete-btn" type="button" @click="deleteSelectedTime">删除</button>
          <span v-else></span>
          <button type="button" @click="confirmTime">确定</button>
        </header>
        <div class="time-wheel">
          <div class="time-column">
            <button
              v-for="hour in getWheelOptions(selectedHour, 23)"
              :key="hour"
              type="button"
              :class="{ 'time-option--active': hour === selectedHour }"
              @click="selectedHour = hour"
            >
              {{ hour }}时
            </button>
          </div>
          <div class="time-column">
            <button
              v-for="minute in getWheelOptions(selectedMinute, 59)"
              :key="minute"
              type="button"
              :class="{ 'time-option--active': minute === selectedMinute }"
              @click="selectedMinute = minute"
            >
              {{ minute }}分
            </button>
          </div>
          <span class="time-wheel-highlight" aria-hidden="true"></span>
        </div>
      </section>

      <section v-else class="choice-panel" aria-label="选择">
        <h2>{{ activePicker === "frequency" ? "请选择用药频率" : "请选择" }}</h2>
        <button
          v-for="item in activePicker === 'frequency' ? frequencies : units"
          :key="item"
          class="choice-item"
          type="button"
          @click="activePicker === 'frequency' ? selectFrequency(item) : selectUnit(item)"
        >
          {{ item }}
        </button>
        <button class="choice-cancel" type="button" @click="closePicker">取消</button>
      </section>
    </div>
  </section>
</template>

<style scoped>
.medication-add-page {
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
  font-family: var(--ihc-font-family);
  transform: translateX(-50%);
  -webkit-font-smoothing: antialiased;
}

.add-nav {
  display: flex;
  align-items: center;
  height: 72px;
  padding: 0 31px;
}

.back-btn,
.form-row--action,
.time-add-btn,
.time-chip,
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

.add-nav h1 {
  margin: 0 0 0 8px;
  color: #30343f;
  font-size: 24px;
  font-weight: 500;
  letter-spacing: 0.03em;
}

.add-form {
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

.form-row input[type="text"],
.form-row em {
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: #b5b7bc;
  font-size: 20px;
  font-style: normal;
  font-weight: 500;
}

.form-row input[type="text"] {
  grid-column: 2 / 4;
}

.form-row input[type="text"]::placeholder {
  color: #b5b7bc;
  opacity: 1;
}

.field-value--selected {
  color: #333333 !important;
}

.time-chips {
  display: flex;
  gap: 10px;
}

.time-chip {
  min-width: 62px;
  height: 31px;
  padding: 0 10px;
  border: 1px solid #e1e1e1;
  border-radius: 7px;
  background: #f0f0f0;
  color: #606060;
  font-size: 16px;
  font-weight: 400;
  line-height: 31px;
  text-align: center;
}

.time-add-btn {
  display: grid;
  justify-self: end;
  place-items: center;
  width: 28px;
  height: 44px;
  padding: 0;
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
  padding-right: 31px;
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

.picker-mask {
  position: absolute;
  inset: 0;
  z-index: 10;
  display: flex;
  align-items: flex-end;
  background: rgba(0, 0, 0, 0.18);
}

.time-picker-panel,
.choice-panel {
  width: 100%;
  overflow: hidden;
  border-radius: 10px 10px 0 0;
  background: #ffffff;
}

.time-picker-panel button,
.choice-panel button {
  border: 0;
  background: transparent;
  color: inherit;
}

.time-picker-header {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  align-items: center;
  height: 72px;
  padding: 0 35px;
}

.time-picker-header button {
  padding: 0;
  color: #9aa1aa;
  font-size: 20px;
  font-weight: 400;
}

.time-picker-header button:first-child {
  justify-self: start;
}

.time-picker-header button:last-child {
  justify-self: end;
  color: #2b76e5;
}

.time-picker-header span,
.time-delete-btn {
  justify-self: center;
}

.time-delete-btn {
  color: #e25a5a !important;
}

.time-wheel {
  position: relative;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  height: 330px;
  padding: 24px 60px 42px;
  overflow: hidden;
}

.time-column {
  position: relative;
  z-index: 1;
  height: 100%;
  overflow-y: auto;
  scroll-snap-type: y mandatory;
  scrollbar-width: none;
}

.time-column::-webkit-scrollbar {
  display: none;
}

.time-column button {
  display: block;
  width: 100%;
  height: 42px;
  padding: 0;
  color: #9aa1aa;
  font-size: 19px;
  font-weight: 400;
  scroll-snap-align: center;
}

.time-option--active {
  color: #20242c !important;
  font-size: 20px !important;
  font-weight: 700 !important;
}

.time-wheel-highlight {
  position: absolute;
  top: 150px;
  right: 0;
  left: 0;
  height: 44px;
  border-top: 1px solid #eeeeee;
  border-bottom: 1px solid #eeeeee;
  background: rgba(247, 247, 247, 0.72);
}

.choice-panel h2 {
  height: 66px;
  margin: 0;
  border-bottom: 1px solid #eeeeee;
  color: #8f96a0;
  font-size: 17px;
  font-weight: 400;
  line-height: 66px;
  text-align: center;
}

.choice-item {
  display: block;
  width: 100%;
  height: 83px;
  border-bottom: 1px solid #eeeeee !important;
  color: #20242c;
  font-size: 22px;
  font-weight: 400;
}

.choice-cancel {
  display: block;
  width: 100%;
  height: 86px;
  margin-top: 12px;
  border-top: 12px solid #f6f6f6 !important;
  color: #9aa1aa;
  font-size: 22px;
  font-weight: 400;
}

@media (min-width: 561px) {
  .medication-add-page {
    height: 844px;
    min-height: 844px;
  }
}

@media (max-width: 389px) {
  .form-row {
    grid-template-columns: 118px minmax(0, 1fr) 24px;
    padding-right: 28px;
    padding-left: 32px;
  }
}
</style>
