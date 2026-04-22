<script setup lang="ts">
import { reactive } from "vue";
import type { PageComponentProps } from "@ihc/page-core/types";
import mock from "./mock";

const props = defineProps<PageComponentProps>();

const form = reactive({
  oldPassword: "",
  newPassword: "",
  confirmPassword: "",
});

function submitForm() {
  if (!form.oldPassword || !form.newPassword || !form.confirmPassword) {
    props.showToast("请完整填写密码信息。");
    return;
  }

  if (form.newPassword !== form.confirmPassword) {
    props.showToast("两次输入的新密码不一致。");
    return;
  }

  props.showToast("密码修改成功。");
}
</script>

<template>
  <section class="reset-page">
    <article class="reset-panel">
      <header class="section-head">
        <span class="section-head__accent"></span>
        <h1>{{ mock.title }}</h1>
      </header>

      <div class="reset-form">
        <label v-for="field in mock.fields" :key="field.key" class="form-row">
          <span class="form-row__label">{{ field.label }}</span>
          <div class="form-row__control">
            <input
              v-model="form[field.key as keyof typeof form]"
              type="password"
              :placeholder="field.placeholder"
            />
          </div>
        </label>
      </div>

      <footer class="reset-footer">
        <button type="button" class="save-button" @click="submitForm">保存</button>
      </footer>
    </article>
  </section>
</template>

<style scoped>
.reset-page {
  font-family: "PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.reset-panel {
  min-height: 920px;
  border-radius: 16px;
  background: #ffffff;
  box-shadow: 0 6px 20px rgba(59, 103, 82, 0.05);
}

.section-head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 24px 28px 18px;
  border-bottom: 1px solid #eef2ef;
}

.section-head__accent {
  width: 6px;
  height: 28px;
  border-radius: 999px;
  background: #42d1a6;
}

.section-head h1 {
  margin: 0;
  color: #2f3946;
  font-size: 15px;
  font-weight: 500;
  letter-spacing: 0.01em;
}

.reset-form {
  display: grid;
  gap: 30px;
  width: min(720px, 100%);
  margin: 112px auto 0;
}

.form-row {
  display: grid;
  grid-template-columns: 120px minmax(0, 1fr);
  align-items: center;
  gap: 26px;
}

.form-row__label {
  color: #9aa4af;
  font-size: 13px;
  font-weight: 400;
  letter-spacing: 0.01em;
  text-align: right;
}

.form-row__control {
  display: flex;
  align-items: center;
  min-height: 58px;
  padding: 0 18px;
  border: 1px solid #e8eeeb;
  border-radius: 8px;
  background: #ffffff;
}

.form-row__control input {
  width: 100%;
  border: 0;
  background: transparent;
  color: #42505c;
  font-size: 13px;
  font-weight: 400;
  letter-spacing: 0.01em;
  outline: none;
}

.form-row__control input::placeholder {
  color: #c3c9cf;
}

.reset-footer {
  margin-top: 360px;
  padding: 30px 28px 60px;
  border-top: 1px solid #eef2ef;
}

.save-button {
  min-width: 98px;
  height: 60px;
  border: 0;
  border-radius: 8px;
  background: #42d1a6;
  color: #ffffff;
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 0.01em;
}

@media (max-width: 980px) {
  .reset-form {
    width: 100%;
    margin-top: 48px;
    padding: 0 16px;
  }

  .form-row {
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .form-row__label {
    text-align: left;
  }

  .reset-footer {
    margin-top: 120px;
    padding: 24px 16px 32px;
  }
}
</style>
