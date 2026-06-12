<script setup lang="ts">
import { reactive, ref } from "vue";
import type { PageComponentProps } from "@ihc/page-core/types";
import { updateAdminPassword } from "@/shared/api/auth";
import { handleAdminPageError } from "@/shared/api/error";
import mockSeed from "./mock";

const props = defineProps<PageComponentProps>();
const mock = ref<typeof mockSeed>(mockSeed);

const form = reactive({
  oldPassword: "",
  newPassword: "",
  confirmPassword: "",
});

async function submitForm() {
  if (!form.oldPassword || !form.newPassword || !form.confirmPassword) {
    props.showToast("请完整填写密码信息。");
    return;
  }

  if (form.newPassword !== form.confirmPassword) {
    props.showToast("两次输入的新密码不一致。");
    return;
  }

  try {
    await updateAdminPassword({
      oldPassword: form.oldPassword,
      newPassword: form.newPassword,
      confirmPassword: form.confirmPassword,
    });
    form.oldPassword = "";
    form.newPassword = "";
    form.confirmPassword = "";
    props.showToast("密码修改成功。");
  } catch (error) {
    handleAdminPageError(error, {
      navigation: props.navigation,
      showToast: props.showToast,
      fallbackMessage: "密码修改失败，请稍后重试",
    });
  }
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
  min-height: 100%;
  font-family: "PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.reset-panel {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  min-height: 100%;
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
  align-content: start;
  gap: 30px;
  width: min(720px, 100%);
  padding: clamp(40px, 8vh, 112px) 28px 48px;
  box-sizing: border-box;
  margin: 0 auto;
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
  padding: 24px 28px 40px;
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
    padding: 40px 16px 32px;
  }

  .form-row {
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .form-row__label {
    text-align: left;
  }

  .reset-footer {
    padding: 24px 16px 32px;
  }
}
</style>
