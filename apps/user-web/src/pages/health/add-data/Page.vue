<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import type { PageComponentProps } from "@ihc/page-core/types";

const props = defineProps<PageComponentProps>();

// 获取指标类型（优先从 sessionStorage，其次 URL query）
const getMetric = () => {
  const stored = sessionStorage.getItem('addMetric');
  if (stored) {
    sessionStorage.removeItem('addMetric');
    return stored;
  }
  const params = new URLSearchParams(window.location.search);
  return params.get('metric');
};

const metric = ref<string>(getMetric() || 'steps');
const selectedDate = ref<string>(new Date().toISOString().slice(0, 10));
const value = ref<number | null>(null);
// 血压特殊字段
const systolic = ref<number | null>(null);
const diastolic = ref<number | null>(null);

// 获取指标类型
const initMetric = () => {
  // 优先从 sessionStorage 获取
  const stored = sessionStorage.getItem('addMetric');
  if (stored) {
    sessionStorage.removeItem('addMetric');
    metric.value = stored;
    return;
  }
  // 其次从 URL query 获取
  const params = new URLSearchParams(window.location.search);
  const urlMetric = params.get('metric');
  if (urlMetric) {
    metric.value = urlMetric;
  }
};

onMounted(() => {
  initMetric();
});


// 根据指标类型显示不同的标签和单位
const metricConfig = computed(() => {
  const configs: Record<string, { label: string; unit: string; placeholder: string; isBloodPressure?: boolean }> = {
    steps: { label: '步数', unit: '步', placeholder: '请输入步数' },
    heartRate: { label: '心率', unit: 'bpm', placeholder: '请输入心率' },
    sleep: { label: '睡眠时长', unit: '小时', placeholder: '请输入睡眠时长' },
    weight: { label: '体重', unit: 'kg', placeholder: '请输入体重' },
    bloodSugar: { label: '血糖', unit: 'mmol/L', placeholder: '请输入血糖值' },
    bloodPressure: { label: '血压', unit: 'mmHg', placeholder: '收缩压/舒张压', isBloodPressure: true },
    oxygen: { label: '血氧', unit: '%', placeholder: '请输入血氧饱和度' },
    stress: { label: '压力', unit: '', placeholder: '请输入压力值 (0-100)' },
  };
  return configs[metric.value] || configs.steps;
});

const pageTitle = computed(() => `添加${metricConfig.value.label}`);

// 表单验证
const isFormValid = computed(() => {
  if (!selectedDate.value) return false;
  if (metricConfig.value.isBloodPressure) {
    return systolic.value !== null && diastolic.value !== null && systolic.value > 0 && diastolic.value > 0;
  }
  return value.value !== null && value.value > 0;
});

// 提交处理
const onSubmit = async () => {
  if (!isFormValid.value) return;

  let record: any = {
    date: selectedDate.value,
  };

  if (metricConfig.value.isBloodPressure) {
    record.bloodPressure = `${systolic.value}/${diastolic.value}`;
  } else {
    record[metric.value] = value.value;
  }

  console.log('提交数据:', record);
  // TODO: 调用真实 API

  // 提交成功后返回健康数据主页
  if (props.navigation?.navigateTo) {
    props.navigation.navigateTo('health/health-data');
  } else {
    window.history.back();
  }
};

// 返回上一页
function goBack() {
  if (props.navigation?.navigateTo) {
    props.navigation.navigateTo('health/health-data');
  } else {
    window.history.back();
  }
}
</script>

<template>
  <section class="add-data-page">
    <div class="hero-card">
      <div>
        <p class="page-eyebrow">添加数据</p>
        <h1>{{ pageTitle }}</h1>
        <p class="hero-card__desc">请填写以下信息，保存后数据将同步到健康记录。</p>
      </div>
      <button class="back-button" @click="goBack">← 返回</button>
    </div>

    <div class="form-card">
      <form @submit.prevent="onSubmit">
        <!-- 日期选择 -->
        <div class="form-field">
          <label>日期</label>
          <input type="date" v-model="selectedDate" required />
        </div>

        <!-- 动态指标输入 -->
        <div class="form-field" v-if="!metricConfig.isBloodPressure">
          <label>{{ metricConfig.label }}</label>
          <div class="input-wrapper">
            <input
              type="number"
              step="any"
              v-model="value"
              :placeholder="metricConfig.placeholder"
              required
            />
            <span class="unit">{{ metricConfig.unit }}</span>
          </div>
        </div>

        <!-- 血压特殊：收缩压/舒张压 -->
        <div v-if="metricConfig.isBloodPressure" class="bp-fields">
          <div class="form-field">
            <label>收缩压 (SYS)</label>
            <div class="input-wrapper">
              <input type="number" v-model="systolic" placeholder="收缩压" required />
              <span class="unit">mmHg</span>
            </div>
          </div>
          <div class="form-field">
            <label>舒张压 (DIA)</label>
            <div class="input-wrapper">
              <input type="number" v-model="diastolic" placeholder="舒张压" required />
              <span class="unit">mmHg</span>
            </div>
          </div>
        </div>

        <div class="form-actions">
          <button type="button" class="cancel-btn" @click="goBack">取消</button>
          <button type="submit" class="submit-btn" :disabled="!isFormValid">保存</button>
        </div>
      </form>
    </div>
  </section>
</template>

<style scoped>
.add-data-page {
  display: grid;
  gap: 18px;
  min-height: 100vh;
  overflow-y: auto;
}

.hero-card,
.form-card {
  background: rgba(255, 255, 255, 0.96);
  border-radius: 26px;
  box-shadow: 0 18px 42px rgba(34, 67, 118, 0.1);
}

.hero-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  background: radial-gradient(circle at top right, rgba(43, 136, 255, 0.18), transparent 28%),
              linear-gradient(135deg, rgba(255, 255, 255, 0.96), rgba(238, 246, 255, 0.98));
}
.hero-card h1 {
  margin: 6px 0 0;
  font-size: 28px;
}
.hero-card__desc {
  margin: 10px 0 0;
  color: var(--muted, #6c7a8e);
  line-height: 1.7;
}
.back-button {
  background: none;
  border: none;
  font-size: 16px;
  color: #2f7cf6;
  cursor: pointer;
  padding: 8px 16px;
  border-radius: 40px;
  transition: background 0.2s;
}
.back-button:hover {
  background: rgba(47, 124, 246, 0.1);
}

.form-card {
  padding: 24px;
}
.form-field {
  margin-bottom: 20px;
}
.form-field label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: #2b4469;
}
.form-field input {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid #e2e8f0;
  border-radius: 20px;
  font-size: 16px;
  transition: border 0.2s;
}
.form-field input:focus {
  outline: none;
  border-color: #2f7cf6;
  box-shadow: 0 0 0 3px rgba(47, 124, 246, 0.1);
}
.input-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
}
.input-wrapper input {
  flex: 1;
}
.unit {
  color: var(--muted, #6c7a8e);
  font-size: 14px;
}
.bp-fields {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
}
.cancel-btn,
.submit-btn {
  padding: 10px 20px;
  border-radius: 40px;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s;
}
.cancel-btn {
  background: transparent;
  border: 1px solid #cbd5e1;
  color: #475569;
}
.cancel-btn:hover {
  background: #f1f5f9;
}
.submit-btn {
  background: #2f7cf6;
  border: none;
  color: white;
}
.submit-btn:hover:not(:disabled) {
  background: #1a66d9;
}
.submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@media (max-width: 720px) {
  .hero-card {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }
  .bp-fields {
    grid-template-columns: 1fr;
  }
}
</style>