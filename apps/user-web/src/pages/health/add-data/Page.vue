<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import type { PageComponentProps } from "@ihc/page-core/types";
import { createHealthMetricRecord } from "@/shared/api/health";
import type { HealthMetricKey } from "@/shared/api/health";

const props = defineProps<PageComponentProps>();

type MetricConfig = {
  label: string;
  unit: string;
  placeholder: string;
  isBloodPressure?: boolean;
  isSleep?: boolean;
};

function readMetric() {
  const stored = sessionStorage.getItem("addMetric");
  if (stored) return stored;
  const params = new URLSearchParams(window.location.search);
  return params.get("metric") || "steps";
}

function readReturnPath() {
  const stored = sessionStorage.getItem("addReturnPath");
  if (stored) return stored;
  return "health/health-data";
}

const metric = ref<string>(readMetric());
const returnPath = ref<string>(readReturnPath());
const selectedDate = ref<string>(new Date().toISOString().slice(0, 10));
const value = ref<number | null>(null);
const systolic = ref<number | null>(null);
const diastolic = ref<number | null>(null);
const sleepHours = ref<number | null>(null);
const sleepMinutes = ref<number | null>(null);
const isSubmitting = ref(false);

const metricConfig = computed<Record<string, MetricConfig>>(() => ({
  steps: { label: "步数", unit: "步", placeholder: "请填写" },
  heartRate: { label: "心率", unit: "bpm", placeholder: "请填写" },
  sleep: { label: "睡眠时长", unit: "小时", placeholder: "", isSleep: true },
  weight: { label: "体重", unit: "kg", placeholder: "请填写" },
  bloodSugar: { label: "血糖", unit: "mmol/L", placeholder: "请填写" },
  bloodPressure: { label: "血压", unit: "mmHg", placeholder: "", isBloodPressure: true },
  oxygen: { label: "血氧", unit: "%", placeholder: "请填写" },
  stress: { label: "压力", unit: "", placeholder: "请填写" },
}));

const currentConfig = computed(() => metricConfig.value[metric.value] ?? metricConfig.value.steps);
const pageTitle = computed(() => `添加${currentConfig.value.label}`);

const isFormValid = computed(() => {
  if (!selectedDate.value) return false;

  if (currentConfig.value.isBloodPressure) {
    return (
      systolic.value !== null &&
      diastolic.value !== null &&
      systolic.value > 0 &&
      diastolic.value > 0
    );
  }

  if (currentConfig.value.isSleep) {
    return (
      sleepHours.value !== null &&
      sleepMinutes.value !== null &&
      sleepHours.value >= 0 &&
      sleepMinutes.value >= 0 &&
      sleepMinutes.value <= 59
    );
  }

  return value.value !== null && value.value > 0;
});

onMounted(() => {
  const storedMetric = sessionStorage.getItem("addMetric");
  if (storedMetric) {
    metric.value = storedMetric;
  }
});

function clearSessionState() {
  sessionStorage.removeItem("addMetric");
  sessionStorage.removeItem("addReturnPath");
}

function navigateBackToSource() {
  const targetPath = returnPath.value || "health/health-data";
  clearSessionState();
  props.navigation.navigateTo(targetPath);
}

function goBack() {
  navigateBackToSource();
}

async function onSubmit() {
  if (!isFormValid.value || isSubmitting.value) return;

  isSubmitting.value = true;

  try {
    const metricKey = metric.value as HealthMetricKey;
    const measuredAt = new Date(selectedDate.value).toISOString();

    let valuePayload: number | undefined;
    let payload: Record<string, unknown> | undefined;

    if (currentConfig.value.isBloodPressure) {
      payload = {
        systolic: systolic.value,
        diastolic: diastolic.value,
        displayValue: `${systolic.value}/${diastolic.value}`,
      };
    } else if (currentConfig.value.isSleep) {
      const totalHours = (sleepHours.value || 0) + (sleepMinutes.value || 0) / 60;
      valuePayload = Number(totalHours.toFixed(1));
    } else {
      valuePayload = Number(value.value);
    }

    await createHealthMetricRecord(metricKey, {
      value: valuePayload,
      payload,
      measuredAt,
    });

    props.showToast("保存成功");
    navigateBackToSource();
  } catch (error) {
    props.showToast(error instanceof Error ? error.message : "保存失败");
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <section class="health-add-page">
    <header class="add-nav">
      <button class="back-btn" type="button" aria-label="返回" @click="goBack">
        <span class="back-arrow" aria-hidden="true"></span>
      </button>
      <h1>{{ pageTitle }}</h1>
    </header>

    <main class="add-form">
      <label class="form-row" for="dateInput">
        <span>日期</span>
        <input id="dateInput" v-model="selectedDate" type="date" />
      </label>

      <template v-if="currentConfig.isBloodPressure">
        <label class="form-row" for="systolicInput">
          <span>收缩压</span>
          <input id="systolicInput" v-model="systolic" type="number" placeholder="请填写" />
          <em>mmHg</em>
        </label>

        <label class="form-row" for="diastolicInput">
          <span>舒张压</span>
          <input id="diastolicInput" v-model="diastolic" type="number" placeholder="请填写" />
          <em>mmHg</em>
        </label>
      </template>

      <template v-else-if="currentConfig.isSleep">
        <label class="form-row" for="sleepHoursInput">
          <span>小时</span>
          <input id="sleepHoursInput" v-model="sleepHours" type="number" min="0" max="23" placeholder="请填写" />
          <em>小时</em>
        </label>

        <label class="form-row" for="sleepMinutesInput">
          <span>分钟</span>
          <input id="sleepMinutesInput" v-model="sleepMinutes" type="number" min="0" max="59" placeholder="请填写" />
          <em>分钟</em>
        </label>
      </template>

      <template v-else>
        <label class="form-row" for="valueInput">
          <span>{{ currentConfig.label }}</span>
          <input id="valueInput" v-model="value" type="number" step="any" :placeholder="currentConfig.placeholder" />
          <em>{{ currentConfig.unit || "请填写" }}</em>
        </label>
      </template>
    </main>

    <footer class="save-area">
      <button class="save-btn" type="button" :disabled="!isFormValid" @click="onSubmit">保存</button>
    </footer>
  </section>
</template>

<style scoped>
.health-add-page {
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

.add-nav {
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
  grid-template-columns: 126px minmax(0, 1fr) auto;
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

.form-row input,
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

.form-row input {
  width: 100%;
  padding: 0;
}

.form-row input::placeholder {
  color: #b5b7bc;
  opacity: 1;
}

.form-row input[type="date"] {
  color: #b5b7bc;
}

.form-row em {
  justify-self: end;
  margin-left: 12px;
  font-size: 16px;
  color: #c7c7c7;
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

.save-btn:disabled {
  opacity: 0.45;
}

@media (min-width: 561px) {
  .health-add-page {
    height: 844px;
    min-height: 844px;
  }
}

@media (max-width: 389px) {
  .form-row {
    grid-template-columns: 118px minmax(0, 1fr) auto;
    padding-right: 28px;
    padding-left: 32px;
  }

  .form-row span,
  .form-row input {
    font-size: 18px;
  }
}
</style>
