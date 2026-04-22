<script setup lang="ts">
import { reactive } from "vue";
import type { PageComponentProps } from "@ihc/page-core/types";
import mock from "./mock";

const props = defineProps<PageComponentProps>();

const form = reactive({
  name: mock.name,
  employeeId: mock.employeeId,
  phone: mock.phone,
  role: mock.role,
  note: mock.note,
});

function saveProfile() {
  if (!form.name.trim() || !form.phone.trim()) {
    props.showToast("请完整填写姓名和手机号。");
    return;
  }

  props.showToast("个人资料已保存。");
}
</script>

<template>
  <section class="profile-page">
    <article class="profile-panel">
      <header class="section-head">
        <span class="section-head__accent"></span>
        <h1>{{ mock.title }}</h1>
      </header>

      <div class="profile-form">
        <div class="form-grid">
          <label class="form-row">
            <span class="form-row__label">姓名<span class="form-row__required">*</span></span>
            <div class="form-row__control">
              <input v-model="form.name" type="text" />
            </div>
          </label>

          <label class="form-row">
            <span class="form-row__label">员工编号</span>
            <div class="form-row__control form-row__control--readonly">
              <input v-model="form.employeeId" type="text" readonly />
            </div>
          </label>

          <div class="form-row form-row--avatar">
            <span class="form-row__label">头像</span>
            <div class="avatar-upload">
              <div class="avatar-upload__box">
                <svg viewBox="0 0 48 48" focusable="false" aria-hidden="true">
                  <circle cx="24" cy="16" r="9" fill="currentColor" opacity="0.24" />
                  <path d="M10 38c2.2-6.5 7.6-10.3 14-10.3S35.8 31.5 38 38" fill="currentColor" opacity="0.24" />
                </svg>
              </div>
              <button type="button" class="avatar-upload__button" @click="props.showToast('上传头像功能为演示状态')">
                +点击上传
              </button>
            </div>
          </div>

          <label class="form-row">
            <span class="form-row__label">手机号码<span class="form-row__required">*</span></span>
            <div>
              <div class="form-row__control">
                <input v-model="form.phone" type="text" />
              </div>
              <p class="form-row__hint">登录账号，请确认填写的信息正确</p>
            </div>
          </label>

          <label class="form-row">
            <span class="form-row__label">角色</span>
            <div class="form-row__control form-row__control--select">
              <select v-model="form.role">
                <option v-for="item in mock.roleOptions" :key="item" :value="item">{{ item }}</option>
              </select>
              <svg viewBox="0 0 16 16" focusable="false" aria-hidden="true">
                <path d="m3 6 5 5 5-5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.7" />
              </svg>
            </div>
          </label>
        </div>

        <label class="form-row form-row--textarea">
          <span class="form-row__label">备注</span>
          <div class="form-row__control form-row__control--textarea">
            <textarea v-model="form.note" placeholder="请输入"></textarea>
          </div>
        </label>
      </div>

      <footer class="profile-footer">
        <button type="button" class="save-button" @click="saveProfile">保存</button>
      </footer>
    </article>
  </section>
</template>

<style scoped>
.profile-page {
  font-family: "PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.profile-panel {
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

.profile-form {
  padding: 28px 14px 0;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr auto;
  gap: 28px 34px;
  align-items: start;
}

.form-row {
  display: grid;
  grid-template-columns: 110px minmax(0, 1fr);
  align-items: start;
  gap: 16px;
}

.form-row--avatar {
  grid-template-columns: 52px auto;
  justify-self: start;
  gap: 16px;
}

.form-row__label {
  padding-top: 14px;
  color: #9aa4af;
  font-size: 13px;
  font-weight: 400;
  letter-spacing: 0.01em;
  text-align: right;
}

.form-row__required {
  color: #ff847c;
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

.form-row__control input,
.form-row__control select,
.form-row__control textarea {
  width: 100%;
  border: 0;
  background: transparent;
  color: #42505c;
  font-size: 13px;
  font-weight: 400;
  letter-spacing: 0.01em;
  outline: none;
}

.form-row__control input::placeholder,
.form-row__control textarea::placeholder {
  color: #c3c9cf;
}

.form-row__control--readonly {
  background: #f6f7f8;
}

.form-row__control--select {
  position: relative;
}

.form-row__control--select select {
  appearance: none;
  padding-right: 20px;
}

.form-row__control--select svg {
  position: absolute;
  right: 16px;
  width: 16px;
  height: 16px;
  color: #c2c8ce;
}

.form-row__hint {
  margin: 12px 0 0;
  color: #c1c8cf;
  font-size: 12px;
  font-weight: 400;
  letter-spacing: 0.01em;
}

.avatar-upload {
  display: flex;
  align-items: center;
  gap: 14px;
  padding-top: 2px;
}

.avatar-upload__box {
  display: grid;
  place-items: center;
  width: 62px;
  height: 62px;
  border-radius: 8px;
  background: #f5f6f7;
  color: #c7cbd0;
}

.avatar-upload__box svg {
  width: 40px;
  height: 40px;
}

.avatar-upload__button {
  padding: 0;
  border: 0;
  background: transparent;
  color: #42d1a6;
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.01em;
}

.form-row--textarea {
  grid-template-columns: 110px minmax(0, 1fr);
  margin-top: 28px;
}

.form-row__control--textarea {
  min-height: 136px;
  padding: 14px 18px;
  align-items: flex-start;
}

.form-row__control--textarea textarea {
  min-height: 100px;
  resize: none;
}

.profile-footer {
  margin-top: 280px;
  padding: 30px 14px 60px;
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

@media (max-width: 1200px) {
  .form-grid {
    grid-template-columns: 1fr;
  }

  .form-row,
  .form-row--avatar,
  .form-row--textarea {
    grid-template-columns: 1fr;
  }

  .form-row__label {
    padding-top: 0;
    text-align: left;
  }

  .profile-footer {
    margin-top: 120px;
    padding: 24px 16px 32px;
  }
}
</style>
