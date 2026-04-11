<script setup lang="ts">
import { ref } from "vue";
import type { PageComponentProps } from "@ihc/page-core/types";
import mock from "./mock";

const props = defineProps<PageComponentProps>();
const fileInput = ref<HTMLInputElement | null>(null);
const title = ref("");
const content = ref("");
const images = ref<string[]>([]);

function goBack() {
  if (!props.navigation.navigateBack()) {
    props.navigation.reLaunch("community/circle");
  }
}

function triggerUpload() {
  fileInput.value?.click();
}

function handleFileChange(event: Event) {
  const target = event.target as HTMLInputElement;
  images.value = Array.from(target.files || [])
    .map((file) => file.name)
    .slice(0, 6);
}

function submitPost() {
  if (!title.value.trim()) {
    props.showToast("请输入标题");
    return;
  }

  if (!content.value.trim()) {
    props.showToast("请输入内容");
    return;
  }

  props.showToast("发布成功");
  window.setTimeout(() => {
    props.navigation.reLaunch("community/circle");
  }, 280);
}
</script>

<template>
  <section class="publish-page">
    <article class="publish-header">
      <div>
        <p class="page-eyebrow">Create Post</p>
        <h1>发布动态</h1>
        <p>记录今天的康养生活，把照片和心情分享给家人和社区。</p>
      </div>
      <button type="button" class="publish-close" @click="goBack">关</button>
    </article>

    <section class="publish-editor">
      <input v-model="title" type="text" placeholder="输入标题" />
      <textarea v-model="content" placeholder="输入内容" />
      <div class="publish-image-list">
        <span v-for="item in images" :key="item" class="publish-image-pill">{{ item }}</span>
      </div>
      <button type="button" class="publish-upload" @click="triggerUpload">添加图片</button>
      <input ref="fileInput" type="file" accept="image/*" multiple hidden @change="handleFileChange" />
      <button type="button" class="publish-submit" @click="submitPost">发布</button>
    </section>

    <section class="publish-tips">
      <p class="page-eyebrow">Tips</p>
      <ul>
        <li v-for="item in mock.tips" :key="item">{{ item }}</li>
      </ul>
    </section>
  </section>
</template>

<style scoped>
.publish-page {
  display: grid;
  gap: 18px;
}

.publish-header,
.publish-editor,
.publish-tips {
  padding: 18px;
  border-radius: 26px;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 18px 42px rgba(34, 67, 118, 0.1);
}

.publish-header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
}

.publish-header h1 {
  margin: 6px 0 0;
}

.publish-header p,
.publish-tips li {
  margin: 0;
  color: #607089;
  line-height: 1.6;
}

.publish-close,
.publish-submit,
.publish-upload {
  border: 0;
  border-radius: 18px;
  font-weight: 700;
}

.publish-close {
  width: 48px;
  height: 48px;
  background: rgba(36, 87, 245, 0.08);
  color: #2457f5;
}

.publish-submit {
  padding: 12px 18px;
  background: linear-gradient(135deg, #2457f5, #4f84ff);
  color: #ffffff;
}

.publish-editor {
  display: grid;
  gap: 12px;
}

.publish-editor input,
.publish-editor textarea {
  width: 100%;
  padding: 14px 16px;
  border: 1px solid rgba(35, 82, 173, 0.12);
  border-radius: 18px;
  background: #f8fbff;
}

.publish-editor textarea {
  min-height: 180px;
  resize: vertical;
}

.publish-upload {
  padding: 12px 16px;
  background: rgba(36, 87, 245, 0.08);
  color: #2457f5;
}

.publish-image-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.publish-image-pill {
  padding: 8px 12px;
  border-radius: 999px;
  background: #edf3ff;
  color: #3f5d9b;
  font-size: 12px;
}

.publish-tips ul {
  margin: 10px 0 0;
  padding-left: 18px;
}
</style>
