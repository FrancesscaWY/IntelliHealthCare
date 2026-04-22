<script setup lang="ts">
import { computed, reactive } from "vue";
import type { PageComponentProps } from "@ihc/page-core/types";
import mock from "./mock";

const props = defineProps<PageComponentProps>();

const form = reactive({
  name: "",
  receiverType: mock.receiverOptions[0] as string,
  insertProductLink: true,
  sendTimeType: mock.sendTimeOptions[0] as string,
  publishDate: "2026-04-24",
  publishTime: "09:30",
  content: "",
  channel: mock.channelOptions[0] as string,
});

const receiverSummary = computed(() =>
  form.receiverType === "全部用户" ? "当前将发送给全部用户" : `已选择 ${mock.selectedUsers.length} 个用户分组`,
);

const productSummary = computed(() =>
  form.insertProductLink ? `已关联 ${mock.selectedProducts.length} 个商品` : "未插入商品链接",
);

function saveMessage() {
  if (!form.name.trim()) {
    props.showToast("请输入消息名称");
    return;
  }

  if (!form.content.trim()) {
    props.showToast("请输入消息内容");
    return;
  }

  props.showToast("消息已保存，当前为演示状态");
}

function goBack() {
  if (!props.navigation.navigateBack()) {
    props.navigation.reLaunch("content/mass-message");
  }
}

function chooseUsers() {
  props.showToast("选择用户为演示状态");
}

function chooseProducts() {
  props.showToast("选择商品为演示状态");
}
</script>

<template>
  <section class="mass-message-create-page">
    <article class="panel">
      <header class="panel-head">
        <span class="panel-head__accent"></span>
        <h1>{{ mock.title }}</h1>
      </header>

      <section class="form-panel">
        <div class="form-row">
          <label class="form-label" for="message-name">消息名称<i>*</i></label>
          <div class="form-content">
            <div class="field-control">
              <input id="message-name" v-model="form.name" type="text" placeholder="请输入消息名称" />
            </div>
          </div>
        </div>

        <div class="form-row">
          <span class="form-label">接收人</span>
          <div class="form-content form-content--stack">
            <div class="choice-line">
              <label class="radio-item">
                <input v-model="form.receiverType" type="radio" :value="mock.receiverOptions[0]" />
                <span>全部用户</span>
              </label>
              <label class="radio-item">
                <input v-model="form.receiverType" type="radio" :value="mock.receiverOptions[1]" />
                <span>部分用户</span>
              </label>
              <button v-if="form.receiverType === '部分用户'" class="text-link" type="button" @click="chooseUsers">+ 选择用户</button>
            </div>
            <p class="helper-text">{{ receiverSummary }}</p>
          </div>
        </div>

        <div class="form-row">
          <span class="form-label">插入商品链接</span>
          <div class="form-content form-content--stack">
            <div class="choice-line">
              <label class="checkbox-item">
                <input v-model="form.insertProductLink" type="checkbox" />
                <span>插入商品链接</span>
              </label>
              <button v-if="form.insertProductLink" class="text-link" type="button" @click="chooseProducts">+ 选择商品</button>
            </div>
            <p class="helper-text">{{ productSummary }}</p>
          </div>
        </div>

        <div class="form-row">
          <span class="form-label">发送时间</span>
          <div class="form-content form-content--stack">
            <div class="choice-line">
              <label class="radio-item">
                <input v-model="form.sendTimeType" type="radio" :value="mock.sendTimeOptions[0]" />
                <span>立即发送</span>
              </label>
              <label class="radio-item">
                <input v-model="form.sendTimeType" type="radio" :value="mock.sendTimeOptions[1]" />
                <span>定时发布</span>
              </label>
            </div>

            <div v-if="form.sendTimeType === '定时发布'" class="schedule-line">
              <div class="field-control field-control--date">
                <input v-model="form.publishDate" type="date" />
              </div>
              <div class="field-control field-control--time">
                <input v-model="form.publishTime" type="time" />
              </div>
            </div>
          </div>
        </div>

        <div class="form-row form-row--textarea">
          <label class="form-label" for="message-content">消息内容<i>*</i></label>
          <div class="form-content">
            <div class="field-control field-control--textarea">
              <textarea id="message-content" v-model="form.content" placeholder="请输入消息内容"></textarea>
            </div>
          </div>
        </div>

        <div class="form-row">
          <span class="form-label">发送方式</span>
          <div class="form-content">
            <div class="choice-line">
              <label v-for="item in mock.channelOptions" :key="item" class="radio-item">
                <input v-model="form.channel" type="radio" :value="item" />
                <span>{{ item }}</span>
              </label>
            </div>
          </div>
        </div>
      </section>

      <footer class="page-actions">
        <button class="action action--primary" type="button" @click="saveMessage">保存</button>
        <button class="action" type="button" @click="goBack">返回</button>
      </footer>
    </article>
  </section>
</template>

<style scoped>
.mass-message-create-page {
  display: grid;
  font-family: var(--admin-font-family);
  color: #2f3946;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.panel {
  border-radius: 18px;
  background: #ffffff;
  box-shadow: 0 8px 24px rgba(59, 103, 82, 0.05);
  padding: 18px 22px 24px;
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
  background: linear-gradient(180deg, #49d3ae 0%, #32c69d 100%);
}

.panel-head h1 {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
}

.form-panel {
  display: grid;
  gap: 20px;
  padding: 24px 8px 8px 0;
}

.form-row {
  display: grid;
  grid-template-columns: 108px minmax(0, 1fr);
  gap: 18px;
  align-items: start;
}

.form-row--textarea {
  align-items: stretch;
}

.form-label {
  display: inline-flex;
  align-items: center;
  min-height: 42px;
  color: #7f8b97;
  font-size: 12px;
}

.form-label i {
  margin-left: 2px;
  color: #ff8b84;
  font-style: normal;
}

.form-content {
  min-width: 0;
}

.form-content--stack {
  display: grid;
  gap: 10px;
}

.field-control {
  position: relative;
  display: flex;
  align-items: center;
  min-height: 42px;
  border: 1px solid #e5ece8;
  border-radius: 8px;
  background: #ffffff;
}

.field-control input,
.field-control textarea {
  width: 100%;
  border: 0;
  background: transparent;
  color: #42505c;
  font-size: 13px;
  outline: none;
}

.field-control input {
  padding: 0 14px;
}

.field-control textarea {
  min-height: 168px;
  resize: none;
  padding: 12px 14px;
  line-height: 1.65;
}

.field-control input::placeholder,
.field-control textarea::placeholder {
  color: #c2cad2;
}

.field-control--textarea {
  align-items: stretch;
}

.choice-line {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 24px;
  min-height: 42px;
}

.radio-item,
.checkbox-item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #42505c;
  font-size: 13px;
}

.radio-item input,
.checkbox-item input {
  width: 16px;
  height: 16px;
  accent-color: #39cf9d;
}

.text-link {
  padding: 0;
  border: 0;
  background: transparent;
  color: #3bc79d;
  font-size: 13px;
}

.helper-text {
  margin: 0;
  color: #9ea8b3;
  font-size: 12px;
  line-height: 1.5;
}

.schedule-line {
  display: flex;
  gap: 12px;
}

.field-control--date {
  width: 220px;
}

.field-control--time {
  width: 160px;
}

.page-actions {
  display: flex;
  gap: 14px;
  padding-top: 26px;
  margin-top: 18px;
  border-top: 1px solid #edf2ef;
}

.action {
  min-width: 96px;
  height: 42px;
  border: 1px solid #dfe6e2;
  border-radius: 8px;
  background: #ffffff;
  color: #3d4a57;
  font-size: 13px;
  font-weight: 500;
}

.action--primary {
  border-color: #39cf9d;
  background: #39cf9d;
  color: #ffffff;
}

@media (max-width: 980px) {
  .panel {
    padding: 16px;
  }

  .form-panel {
    padding: 20px 0 0;
  }

  .form-row {
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .form-label {
    min-height: auto;
  }

  .schedule-line,
  .page-actions {
    flex-wrap: wrap;
  }

  .field-control--date,
  .field-control--time {
    width: 100%;
  }
}
</style>
