<script setup lang="ts">
import { reactive, ref } from "vue";
import type { PageComponentProps } from "@ihc/page-core/types";
import mock from "./mock";

type ParameterRow = {
  id: string;
  name: string;
  value: string;
  suffix: string;
  placeholder: string;
};

const props = defineProps<PageComponentProps>();

const form = reactive({
  productName: "",
  code: mock.code,
  category: mock.categoryOptions[0],
  remark: "",
  price: mock.sellInfo.price,
  strikePrice: mock.sellInfo.strikePrice,
  sales: mock.sellInfo.sales,
  commission: mock.sellInfo.commission,
  duration: mock.sellInfo.duration,
  staffCount: mock.sellInfo.staffCount,
  publishMode: mock.sellInfo.publishMode,
  validity: mock.sellInfo.validity,
  bookingRules: mock.sellInfo.bookingRules,
});

const parameterSelect = ref(mock.parameterOptions[0]);
const uploadedImages = ref<string[]>([]);
const parameterRows = ref<ParameterRow[]>(mock.parameterRows.map((item) => ({ ...item })));

function uploadImage() {
  if (uploadedImages.value.length >= 9) {
    props.showToast("最多可上传 9 张图片");
    return;
  }

  uploadedImages.value = [...uploadedImages.value, `图片 ${uploadedImages.value.length + 1}`];
  props.showToast("图片上传为演示状态");
}

function addParameter() {
  if (!parameterSelect.value || parameterSelect.value === mock.parameterOptions[0]) {
    props.showToast("请先选择参数");
    return;
  }

  const exists = parameterRows.value.some((item) => item.name === parameterSelect.value);
  if (exists) {
    props.showToast("该参数已添加");
    return;
  }

  parameterRows.value = [
    ...parameterRows.value,
    {
      id: `param-${Date.now()}`,
      name: parameterSelect.value,
      value: "",
      suffix: parameterSelect.value === "适用年龄" ? "岁" : "",
      placeholder: "请输入",
    },
  ];
  props.showToast(`已添加参数：${parameterSelect.value}`);
}

function removeParameter(id: string) {
  parameterRows.value = parameterRows.value.filter((item) => item.id !== id);
}

function submitForm() {
  props.showToast("提交审核为演示状态");
}

function goBack() {
  props.showToast("返回为演示状态");
}
</script>

<template>
  <section class="product-editor-page">
    <article class="product-editor-panel">
      <header class="panel-head">
        <span class="panel-head__accent"></span>
        <h1>{{ mock.title }}</h1>
      </header>

      <section class="section-block">
        <h2>基础信息</h2>

        <div class="form-grid form-grid--basic">
          <label class="field">
            <span class="field__label">商品名称<i>*</i></span>
            <div class="field__control">
              <input v-model="form.productName" type="text" placeholder="请输入" />
            </div>
          </label>

          <label class="field">
            <span class="field__label">商品编码</span>
            <div class="field__control field__control--readonly">
              <input v-model="form.code" type="text" readonly />
            </div>
          </label>

          <label class="field">
            <span class="field__label">分类<i>*</i></span>
            <div class="field__control field__control--select">
              <select v-model="form.category">
                <option v-for="item in mock.categoryOptions" :key="item" :value="item">{{ item }}</option>
              </select>
              <svg viewBox="0 0 16 16" focusable="false" aria-hidden="true">
                <path d="m3 6 5 5 5-5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.7" />
              </svg>
            </div>
          </label>
        </div>

        <div class="upload-row">
          <div class="upload-row__label">图片<i>*</i></div>
          <div class="upload-row__content">
            <button class="upload-box" type="button" @click="uploadImage">
              <span v-if="!uploadedImages.length">+ 上传图片</span>
              <div v-else class="upload-preview">
                <span v-for="item in uploadedImages" :key="item" class="upload-preview__chip">{{ item }}</span>
              </div>
            </button>
            <p class="upload-row__hint">支持 jpg、png 等格式文件上传，文件大小不超过 10MB，最多可上传 9 张</p>
          </div>
        </div>

        <label class="field field--textarea">
          <span class="field__label">商品备注</span>
          <div class="field__control field__control--textarea">
            <textarea v-model="form.remark" placeholder="请输入"></textarea>
          </div>
        </label>
      </section>

      <section class="section-block">
        <h2>参数设置</h2>

        <div class="parameter-toolbar">
          <label class="field field--parameter-select">
            <span class="field__label">添加参数</span>
            <div class="field__control field__control--select field__control--search">
              <select v-model="parameterSelect">
                <option v-for="item in mock.parameterOptions" :key="item" :value="item">{{ item }}</option>
              </select>
              <svg viewBox="0 0 20 20" focusable="false" aria-hidden="true">
                <circle cx="9" cy="9" r="5.8" fill="none" stroke="currentColor" stroke-width="1.7" />
                <path d="m13.2 13.2 3.4 3.4" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.7" />
              </svg>
            </div>
          </label>

          <button class="text-action" type="button" @click="addParameter">+ 参数管理</button>
        </div>

        <div class="parameter-list">
          <article v-for="item in parameterRows" :key="item.id" class="parameter-row">
            <div class="parameter-row__drag" aria-hidden="true">
              <span></span>
              <span></span>
              <span></span>
            </div>
            <div class="parameter-row__name">{{ item.name }}</div>
            <div class="field__control parameter-row__input" :class="{ 'parameter-row__input--unit': !!item.suffix }">
              <input v-model="item.value" type="text" :placeholder="item.placeholder" />
              <span v-if="item.suffix" class="parameter-row__unit">{{ item.suffix }}</span>
            </div>
            <button class="parameter-row__delete" type="button" aria-label="删除参数" @click="removeParameter(item.id)">
              <svg viewBox="0 0 18 18" focusable="false" aria-hidden="true">
                <path d="M4.5 5.2h9M7 5.2V3.6h4v1.6M6.1 7.2v6M9 7.2v6M11.9 7.2v6M5.2 5.2l.5 9a1.4 1.4 0 0 0 1.4 1.3h3.8a1.4 1.4 0 0 0 1.4-1.3l.5-9" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" />
              </svg>
            </button>
          </article>
        </div>
      </section>

      <section class="section-block">
        <h2>售卖信息</h2>

        <div class="form-grid form-grid--sell">
          <label class="field">
            <span class="field__label">商品价格<i>*</i></span>
            <div class="field__control field__control--unit">
              <input v-model="form.price" type="text" />
              <span class="field__unit">元</span>
            </div>
          </label>

          <label class="field">
            <span class="field__label">划线价</span>
            <div class="field__control field__control--unit">
              <input v-model="form.strikePrice" type="text" />
              <span class="field__unit">元</span>
            </div>
          </label>

          <label class="field">
            <span class="field__label">销量<i>*</i></span>
            <div class="field__control">
              <input v-model="form.sales" type="text" />
            </div>
          </label>

          <label class="field">
            <span class="field__label">佣金（元）<i>*</i></span>
            <div class="field__control field__control--unit">
              <input v-model="form.commission" type="text" />
              <span class="field__unit">元</span>
            </div>
          </label>

          <label class="field">
            <span class="field__label">服务时长<i>*</i></span>
            <div class="field__control field__control--unit">
              <input v-model="form.duration" type="text" />
              <span class="field__unit">h</span>
            </div>
          </label>

          <label class="field">
            <span class="field__label">服务人数<i>*</i></span>
            <div class="field__control field__control--unit">
              <input v-model="form.staffCount" type="text" />
              <span class="field__unit">人</span>
            </div>
          </label>
        </div>

        <div class="radio-row">
          <span class="radio-row__label">售卖时间</span>
          <label class="radio-pill">
            <input v-model="form.publishMode" type="radio" value="immediate" />
            <span>立即上架</span>
          </label>
          <label class="radio-pill">
            <input v-model="form.publishMode" type="radio" value="later" />
            <span>暂不上架</span>
          </label>
        </div>

        <div class="form-grid form-grid--single">
          <label class="field">
            <span class="field__label">有效期</span>
            <div class="field__control field__control--select">
              <select v-model="form.validity">
                <option v-for="item in mock.validityOptions" :key="item" :value="item">{{ item }}</option>
              </select>
              <svg viewBox="0 0 16 16" focusable="false" aria-hidden="true">
                <path d="m3 6 5 5 5-5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.7" />
              </svg>
            </div>
          </label>
        </div>

        <label class="field field--textarea field--rules">
          <span class="field__label">预约规则</span>
          <div class="field__control field__control--textarea">
            <textarea v-model="form.bookingRules" placeholder="请输入"></textarea>
          </div>
        </label>
      </section>

      <footer class="page-actions">
        <button class="action-submit" type="button" @click="submitForm">提交审核</button>
        <button class="action-cancel" type="button" @click="goBack">返回</button>
      </footer>
    </article>
  </section>
</template>

<style scoped>
.product-editor-page {
  display: grid;
  font-family: var(--admin-font-family);
  color: #2f3946;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.product-editor-panel {
  border-radius: 16px;
  background: #ffffff;
  box-shadow: 0 6px 20px rgba(59, 103, 82, 0.05);
  padding: 18px 20px 22px;
}

.panel-head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-bottom: 18px;
  border-bottom: 1px solid #edf2ef;
}

.panel-head__accent {
  width: 6px;
  height: 28px;
  border-radius: 999px;
  background: #43d1a6;
}

.panel-head h1 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.section-block {
  padding-top: 26px;
}

.section-block + .section-block {
  margin-top: 4px;
}

.section-block h2 {
  margin: 0 0 24px;
  font-size: 15px;
  font-weight: 600;
}

.form-grid {
  display: grid;
  gap: 22px 28px;
}

.form-grid--basic,
.form-grid--sell {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.form-grid--single {
  grid-template-columns: 340px;
}

.field {
  display: grid;
  gap: 8px;
}

.field--textarea {
  margin-top: 18px;
}

.field__label {
  color: #8f9aa6;
  font-size: 12px;
  font-weight: 400;
  letter-spacing: 0.01em;
}

.field__label i,
.upload-row__label i {
  margin-left: 2px;
  color: #ff8c86;
  font-style: normal;
}

.field__control {
  position: relative;
  display: flex;
  align-items: center;
  min-height: 42px;
  border: 1px solid #e7eeea;
  border-radius: 8px;
  background: #ffffff;
}

.field__control input,
.field__control select,
.field__control textarea {
  width: 100%;
  border: 0;
  background: transparent;
  color: #42505c;
  font-size: 13px;
  font-weight: 400;
  outline: none;
}

.field__control input,
.field__control select {
  padding: 0 16px;
}

.field__control input::placeholder,
.field__control textarea::placeholder {
  color: #c2c9d0;
}

.field__control--readonly {
  background: #f3f5f7;
}

.field__control--select select {
  appearance: none;
  padding-right: 38px;
}

.field__control--select svg {
  position: absolute;
  right: 14px;
  width: 16px;
  height: 16px;
  color: #c5cbd1;
}

.field__control--textarea {
  min-height: 116px;
  align-items: stretch;
}

.field__control--textarea textarea {
  min-height: 116px;
  resize: none;
  padding: 14px 16px;
  line-height: 1.6;
}

.field__control--unit {
  padding-right: 56px;
}

.field__unit {
  position: absolute;
  top: 0;
  right: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 100%;
  border-left: 1px solid #e7eeea;
  background: #f7f8f9;
  color: #7f8b97;
  font-size: 13px;
}

.upload-row {
  display: grid;
  grid-template-columns: 92px minmax(0, 1fr);
  gap: 18px;
  align-items: start;
  margin-top: 28px;
}

.upload-row__label {
  padding-top: 70px;
  color: #8f9aa6;
  font-size: 12px;
}

.upload-box {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 284px;
  height: 172px;
  padding: 14px;
  border: 1px solid #e7eeea;
  border-radius: 8px;
  background: #ffffff;
  color: #c3cad1;
  font-size: 13px;
}

.upload-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.upload-preview__chip {
  display: inline-flex;
  align-items: center;
  height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  background: #eef8f4;
  color: #32b88e;
  font-size: 12px;
}

.upload-row__hint {
  margin: 14px 0 0;
  color: #c0c7ce;
  font-size: 12px;
}

.parameter-toolbar {
  display: flex;
  align-items: flex-end;
  gap: 18px;
}

.field--parameter-select {
  width: 346px;
}

.field__control--search svg {
  width: 18px;
  height: 18px;
}

.text-action {
  height: 42px;
  padding: 0;
  border: 0;
  background: transparent;
  color: #39cf9d;
  font-size: 13px;
  font-weight: 500;
}

.parameter-list {
  display: grid;
  gap: 14px;
  margin-top: 18px;
}

.parameter-row {
  display: grid;
  grid-template-columns: 54px 92px minmax(0, 1fr) 50px;
  align-items: center;
  min-height: 94px;
  border-radius: 12px;
  background: #fafafa;
  overflow: hidden;
}

.parameter-row__drag {
  display: grid;
  place-items: center;
  gap: 4px;
  color: #c5ccd2;
}

.parameter-row__drag span {
  width: 14px;
  height: 2px;
  border-radius: 999px;
  background: currentColor;
}

.parameter-row__name {
  color: #7f8a95;
  font-size: 13px;
  font-weight: 500;
}

.parameter-row__input {
  margin: 12px 0;
}

.parameter-row__input--unit {
  padding-right: 58px;
}

.parameter-row__unit {
  position: absolute;
  top: 0;
  right: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 58px;
  height: 100%;
  border-left: 1px solid #e7eeea;
  background: #f7f8f9;
  color: #7f8b97;
  font-size: 13px;
}

.parameter-row__delete {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  margin: 0 auto;
  padding: 0;
  border: 0;
  background: transparent;
  color: #c5ccd2;
}

.parameter-row__delete svg {
  width: 18px;
  height: 18px;
}

.radio-row {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-top: 24px;
}

.radio-row__label {
  color: #8f9aa6;
  font-size: 12px;
}

.radio-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #495765;
  font-size: 13px;
}

.radio-pill input {
  width: 16px;
  height: 16px;
  accent-color: #39cf9d;
}

.field--rules {
  max-width: 852px;
}

.page-actions {
  display: flex;
  gap: 14px;
  padding-top: 32px;
  margin-top: 22px;
  border-top: 1px solid #edf2ef;
}

.action-submit,
.action-cancel {
  min-width: 104px;
  height: 44px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
}

.action-submit {
  border: 1px solid #39cf9d;
  background: #39cf9d;
  color: #ffffff;
}

.action-cancel {
  border: 1px solid #dfe6e2;
  background: #ffffff;
  color: #3d4a57;
}

@media (max-width: 1380px) {
  .form-grid--basic,
  .form-grid--sell {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 980px) {
  .form-grid--basic,
  .form-grid--sell,
  .form-grid--single {
    grid-template-columns: 1fr;
  }

  .upload-row {
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .upload-row__label {
    padding-top: 0;
  }

  .parameter-toolbar,
  .radio-row,
  .page-actions {
    flex-wrap: wrap;
  }

  .field--parameter-select,
  .upload-box,
  .field--rules {
    width: 100%;
    max-width: none;
  }

  .parameter-row {
    grid-template-columns: 40px 78px minmax(0, 1fr) 40px;
  }
}
</style>
