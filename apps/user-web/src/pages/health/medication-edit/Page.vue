<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import type { PageComponentProps } from "@ihc/page-core/types";
import { deleteHealthMedication } from "@/shared/api/health";
import {
  clearSelectedMedication,
  getSelectedMedication
} from "@/shared/health/medication-selection";
import type { StoredMedicationSelection } from "@/shared/health/medication-selection";

const props = defineProps<PageComponentProps>();

type PickerType = "time" | "frequency" | "unit";
const labels = {
  title: "\u7f16\u8f91\u7528\u836f\u63d0\u9192",
  back: "\u8fd4\u56de",
  name: "\u836f\u54c1\u540d\u79f0",
  time: "\u7528\u836f\u65f6\u95f4",
  select: "\u8bf7\u9009\u62e9",
  addTime: "\u6dfb\u52a0\u7528\u836f\u65f6\u95f4",
  frequency: "\u7528\u836f\u9891\u7387",
  unit: "\u5355\u4f4d",
  dose: "\u5242\u91cf",
  reminder: "\u7528\u836f\u63d0\u9192",
  save: "\u4fdd\u5b58",
  delete: "\u5220\u9664",
  deleting: "\u5220\u9664\u4e2d...",
  cancel: "\u53d6\u6d88",
  remove: "\u5220\u9664",
  confirm: "\u786e\u5b9a",
  selectTime: "\u9009\u62e9\u7528\u836f\u65f6\u95f4",
  selectFrequency: "\u8bf7\u9009\u62e9\u7528\u836f\u9891\u7387",
  selectUnit: "\u8bf7\u9009\u62e9\u5355\u4f4d",
  noMedication: "\u672a\u627e\u5230\u53ef\u5220\u9664\u7684\u7528\u836f\u8bb0\u5f55",
  deleted: "\u5220\u9664\u6210\u529f",
  deleteFailed: "\u5220\u9664\u5931\u8d25",
  saved: "\u4fdd\u5b58\u6210\u529f",
  daily: "\u6bcf\u5929",
  everyOtherDay: "\u9694\u5929\u4e00\u6b21",
  everyThreeDays: "\u6bcf3\u5929\u4e00\u6b21",
  weekly: "\u6bcf\u5468\u4e00\u6b21",
  asNeeded: "\u6309\u9700\u670d\u7528",
  tablet: "\u7247",
  capsule: "\u7c92",
  pack: "\u5305",
  hourSuffix: "\u65f6",
  minuteSuffix: "\u5206"
} as const;

function inferUnitFromDosage(dosage?: string) {
  if (!dosage) {
    return labels.tablet;
  }

  if (dosage.toLowerCase().includes("mg")) return "mg";
  if (dosage.toLowerCase().includes("ml")) return "ml";
  if (dosage.includes(labels.tablet)) return labels.tablet;
  if (dosage.includes(labels.capsule)) return labels.capsule;
  if (dosage.includes(labels.pack)) return labels.pack;

  return labels.tablet;
}

const selectedMedication = ref<StoredMedicationSelection | null>(getSelectedMedication());
const isDeleting = ref(false);
const form = reactive({
  times: [...(selectedMedication.value?.scheduleTimes?.length ? selectedMedication.value.scheduleTimes : [])],
  frequency: selectedMedication.value?.frequency ?? labels.daily,
  unit: inferUnitFromDosage(selectedMedication.value?.dosage),
  reminder: false
});
const activePicker = ref<PickerType | null>(null);
const selectedHour = ref(10);
const selectedMinute = ref(3);
const editingTimeIndex = ref<number | null>(null);
const frequencies = [
  labels.daily,
  labels.everyOtherDay,
  labels.everyThreeDays,
  labels.weekly,
  labels.asNeeded
];
const units = [labels.tablet, labels.capsule, "mg", "ml", labels.pack];
const pageTitle = computed(() => labels.title);
const medicationName = computed(() => selectedMedication.value?.name ?? "--");
const medicationDosage = computed(() => selectedMedication.value?.dosage ?? "--");

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

async function deleteMedication() {
  if (isDeleting.value) {
    return;
  }

  const medicationId = selectedMedication.value?.medicationId;

  if (!medicationId) {
    props.showToast(labels.noMedication);
    return;
  }

  try {
    isDeleting.value = true;
    await deleteHealthMedication(medicationId);
    clearSelectedMedication();
    props.showToast(labels.deleted);
    window.setTimeout(() => {
      props.navigation.reLaunch("health/medication-info");
    }, 220);
  } catch (error) {
    props.showToast(error instanceof Error ? error.message : labels.deleteFailed);
  } finally {
    isDeleting.value = false;
  }
}

function saveMedication() {
  props.showToast(labels.saved);
  window.setTimeout(() => {
    props.navigation.reLaunch("health/medication-info");
  }, 220);
}
</script>

<template>
  <section class="medication-edit-page">
    <header class="edit-nav">
      <button class="back-btn" type="button" :aria-label="labels.back" @click="goBack">
        <span class="back-arrow" aria-hidden="true"></span>
      </button>
      <h1>{{ pageTitle }}</h1>
      <button
        class="delete-btn"
        type="button"
        :disabled="isDeleting || !selectedMedication?.medicationId"
        @click="deleteMedication"
      >
        {{ isDeleting ? labels.deleting : labels.delete }}
      </button>
    </header>

    <main class="edit-form">
      <div class="form-row">
        <span>{{ labels.name }}</span>
        <strong>{{ medicationName }}</strong>
      </div>

      <div class="form-row form-row--time">
        <span>{{ labels.time }}</span>
        <em v-if="form.times.length" class="time-chips">
          <button
            v-for="(time, index) in form.times"
            :key="`${time}-${index}`"
            class="time-chip"
            type="button"
            @click="openTimePicker(index)"
          >
            {{ time }}
          </button>
        </em>
        <em v-else>{{ labels.select }}</em>
        <button class="time-add-btn" type="button" :aria-label="labels.addTime" @click="openTimePicker()">
          <i class="plus-icon" aria-hidden="true"></i>
        </button>
      </div>

      <button class="form-row form-row--action" type="button" @click="openPicker('frequency')">
        <span>{{ labels.frequency }}</span>
        <strong>{{ form.frequency }}</strong>
        <i class="arrow-icon" aria-hidden="true"></i>
      </button>

      <button class="form-row form-row--action" type="button" @click="openPicker('unit')">
        <span>{{ labels.unit }}</span>
        <strong>{{ form.unit }}</strong>
        <i class="arrow-icon" aria-hidden="true"></i>
      </button>

      <div class="form-row">
        <span>{{ labels.dose }}</span>
        <strong>{{ medicationDosage }}</strong>
      </div>

      <label class="form-row reminder-row">
        <span>{{ labels.reminder }}</span>
        <input v-model="form.reminder" type="checkbox" />
        <i class="switch-track" :class="{ 'switch-track--active': form.reminder }">
          <b></b>
        </i>
      </label>
    </main>

    <footer class="save-area">
      <button class="save-btn" type="button" @click="saveMedication">{{ labels.save }}</button>
    </footer>

    <div v-if="activePicker" class="picker-mask" @click.self="closePicker">
      <section v-if="activePicker === 'time'" class="time-picker-panel" :aria-label="labels.selectTime">
        <header class="time-picker-header">
          <button type="button" @click="closePicker">{{ labels.cancel }}</button>
          <button v-if="editingTimeIndex !== null" class="time-delete-btn" type="button" @click="deleteSelectedTime">
            {{ labels.remove }}
          </button>
          <span v-else></span>
          <button type="button" @click="confirmTime">{{ labels.confirm }}</button>
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
              {{ hour }}{{ labels.hourSuffix }}
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
              {{ minute }}{{ labels.minuteSuffix }}
            </button>
          </div>
          <span class="time-wheel-highlight" aria-hidden="true"></span>
        </div>
      </section>

      <section v-else class="choice-panel" :aria-label="labels.select">
        <h2>{{ activePicker === "frequency" ? labels.selectFrequency : labels.selectUnit }}</h2>
        <button
          v-for="item in activePicker === 'frequency' ? frequencies : units"
          :key="item"
          class="choice-item"
          type="button"
          @click="activePicker === 'frequency' ? selectFrequency(item) : selectUnit(item)"
        >
          {{ item }}
        </button>
        <button class="choice-cancel" type="button" @click="closePicker">{{ labels.cancel }}</button>
      </section>
    </div>
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
  font-family: var(--ihc-font-family);
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

.delete-btn:disabled {
  color: #b8bed0;
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

.time-chip {
  min-width: 67px;
  height: 33px;
  padding: 0 10px;
  border: 1px solid #e1e1e1;
  border-radius: 7px;
  background: #f0f0f0;
  color: #606060;
  font-size: 17px;
  font-weight: 400;
  line-height: 33px;
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
