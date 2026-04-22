<script setup lang="ts">
import { computed, ref } from "vue";
import type { PageComponentProps } from "@ihc/page-core/types";
import { AddPic, AtSign, Close, LocalTwo, Pound } from "@icon-park/vue-next";
import { savePublishedProfilePost } from "@/pages/home/profile/published-post";
import mock from "./mock";

type UploadImage = {
  id: string;
  src: string;
};

type VisibilityOption = (typeof mock.visibilityOptions)[number];

const MAX_UPLOAD_IMAGES = 6;
const props = defineProps<PageComponentProps>();
const fileInput = ref<HTMLInputElement | null>(null);
const title = ref("");
const content = ref("");
const visibility = ref<VisibilityOption>(mock.visibilityOptions[0]);
const showVisibilityPanel = ref(false);
const uploadedImages = ref<UploadImage[]>([]);

const displayImages = computed<UploadImage[]>(() => uploadedImages.value);
const remainingImageSlots = computed(() => Math.max(MAX_UPLOAD_IMAGES - uploadedImages.value.length, 0));
const canAddMoreImages = computed(() => remainingImageSlots.value > 0);

const canSubmit = computed(() => title.value.trim().length > 0 && content.value.trim().length > 0);

function goBack() {
  if (!props.navigation.navigateBack()) {
    props.navigation.reLaunch("community/circle");
  }
}

function triggerUpload() {
  fileInput.value?.click();
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

async function handleFileChange(event: Event) {
  const target = event.target as HTMLInputElement;
  const rawFiles = Array.from(target.files || []);
  const selectedFiles = rawFiles.slice(0, remainingImageSlots.value);

  if (selectedFiles.length === 0) {
    target.value = "";
    if (!canAddMoreImages.value) {
      props.showToast(`最多可添加 ${MAX_UPLOAD_IMAGES} 张图片`);
    }
    return;
  }

  const nextImages = await Promise.all(
    selectedFiles.map(async (file, index) => ({
      id: `${file.name}-${file.lastModified}-${uploadedImages.value.length + index}`,
      src: await readFileAsDataUrl(file),
    })),
  );

  uploadedImages.value = [...uploadedImages.value, ...nextImages].slice(0, MAX_UPLOAD_IMAGES);
  target.value = "";

  if (rawFiles.length > selectedFiles.length) {
    props.showToast(`最多可添加 ${MAX_UPLOAD_IMAGES} 张图片`);
    return;
  }

  if (uploadedImages.value.length >= MAX_UPLOAD_IMAGES) {
    props.showToast(`已添加 ${MAX_UPLOAD_IMAGES} 张图片`);
  }
}

function removeImage(imageId: string) {
  uploadedImages.value = uploadedImages.value.filter((item) => item.id !== imageId);
}

function handleVisibilitySelect(option: VisibilityOption) {
  visibility.value = option;
  showVisibilityPanel.value = false;
}

function toggleVisibilityPanel() {
  showVisibilityPanel.value = !showVisibilityPanel.value;
}

function formatPostDate() {
  const now = new Date();
  return `${now.getMonth() + 1}月${now.getDate()}日`;
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

  savePublishedProfilePost({
    id: `published-${Date.now()}`,
    author: "笑看人生",
    date: formatPostDate(),
    title: title.value.trim(),
    content: content.value.trim(),
    likes: 0,
    favorites: 0,
    comments: 0,
    gallery: displayImages.value.map((item, index) => ({
      src: item.src,
      position: index === 0 ? "center" : "center",
    })),
  });

  props.showToast(`${visibility.value.label}发布成功`);
  window.setTimeout(() => {
    props.navigation.reLaunch("home/profile");
  }, 220);
}
</script>

<template>
  <section class="publish-page" @click="showVisibilityPanel = false">
    <header class="publish-topbar">
      <button class="icon-button icon-button--close" type="button" aria-label="关闭" @click.stop="goBack">
        <Close theme="outline" size="24" fill="#2e3135" />
      </button>
      <button
        class="publish-button"
        :class="{ 'publish-button--disabled': !canSubmit }"
        type="button"
        @click.stop="submitPost"
      >
        发布
      </button>
    </header>

    <section class="publish-gallery" aria-label="图片预览">
      <div
        v-for="image in displayImages"
        :key="image.id"
        class="publish-gallery__item publish-gallery__item--image"
      >
        <div class="publish-gallery__image" :style="{ backgroundImage: `url(${image.src})` }"></div>
        <button class="publish-gallery__remove" type="button" aria-label="删除图片" @click.stop="removeImage(image.id)">
          <Close theme="outline" size="14" fill="#ffffff" />
        </button>
      </div>
      <button
        v-if="canAddMoreImages"
        class="publish-gallery__item publish-gallery__item--adder"
        type="button"
        @click.stop="triggerUpload"
      >
        <AddPic theme="outline" size="30" fill="#a8abb0" />
        <span class="publish-gallery__adder-text">添加图片</span>
        <small>{{ uploadedImages.length }}/{{ MAX_UPLOAD_IMAGES }}</small>
      </button>
      <input ref="fileInput" type="file" accept="image/*" multiple hidden @change="handleFileChange" />
    </section>

    <section class="publish-editor">
      <input v-model="title" class="publish-title" type="text" :placeholder="mock.placeholders.title" />
      <textarea v-model="content" class="publish-content" :placeholder="mock.placeholders.content"></textarea>
    </section>

    <footer class="publish-toolbar">
      <div class="publish-toolbar__actions">
        <button type="button" class="toolbar-icon" @click.stop="props.showToast('提及功能待接入')">
          <AtSign theme="outline" size="22" fill="#2f3237" />
        </button>
        <button type="button" class="toolbar-icon" @click.stop="props.showToast('话题功能待接入')">
          <Pound theme="outline" size="22" fill="#2f3237" />
        </button>
        <button type="button" class="toolbar-icon" @click.stop="props.showToast('位置功能待接入')">
          <LocalTwo theme="outline" size="22" fill="#2f3237" />
        </button>
      </div>

      <div class="visibility">
        <button type="button" class="visibility-button" @click.stop="toggleVisibilityPanel">
          {{ visibility.label }}
        </button>

        <div v-if="showVisibilityPanel" class="visibility-panel" @click.stop>
          <button
            v-for="option in mock.visibilityOptions"
            :key="option.key"
            class="visibility-panel__item"
            :class="{ 'is-active': option.key === visibility.key }"
            type="button"
            @click="handleVisibilitySelect(option)"
          >
            <strong>{{ option.label }}</strong>
            <span>{{ option.description }}</span>
          </button>
        </div>
      </div>
    </footer>
  </section>
</template>

<style scoped>
.publish-page {
  height: calc(100vh - 36px);
  display: grid;
  grid-template-rows: auto auto 1fr auto;
  gap: 18px;
  margin: -18px;
  padding: 16px 22px 16px;
  overflow-y: auto;
  overflow-x: hidden;
  background: #ffffff;
  color: #2e3135;
  font-family: "HarmonyOS Sans SC", "PingFang SC", "Microsoft YaHei UI", sans-serif;
  scrollbar-width: none;
}

.publish-page::-webkit-scrollbar {
  display: none;
}

.publish-topbar {
  position: sticky;
  top: 0;
  z-index: 5;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: -16px -22px 0;
  padding: 16px 22px 10px;
  background: rgba(255, 255, 255, 0.96);
  backdrop-filter: blur(10px);
}

.icon-button {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 0;
  background: transparent;
}

.publish-button {
  min-width: 70px;
  height: 34px;
  padding: 0 14px;
  border: 0;
  border-radius: 17px;
  background: linear-gradient(135deg, #6d78f3 0%, #6270ef 100%);
  color: #ffffff;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.02em;
  transition: opacity 160ms ease;
}

.publish-button--disabled {
  opacity: 0.55;
}

.publish-gallery {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  min-width: 0;
  padding-bottom: 4px;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none;
}

.publish-gallery::-webkit-scrollbar {
  display: none;
}

.publish-gallery__item {
  position: relative;
  width: 156px;
  height: 128px;
  border-radius: 20px;
  overflow: hidden;
  flex: 0 0 auto;
}

.publish-gallery__item--image {
  box-shadow: 0 14px 30px rgba(37, 51, 84, 0.12);
}

.publish-gallery__image {
  width: 100%;
  height: 100%;
  background-color: #eef1f4;
  background-position: center;
  background-repeat: no-repeat;
  background-size: cover;
  transition:
    transform 180ms ease,
    filter 180ms ease;
}

.publish-gallery__item--adder {
  display: grid;
  align-content: center;
  justify-items: center;
  gap: 6px;
  place-items: center;
  border: 0;
  background: linear-gradient(180deg, #f6f7f9 0%, #eceff3 100%);
  color: #8f96a0;
}

.publish-gallery__adder-text {
  font-size: 12px;
  font-weight: 600;
}

.publish-gallery__item--adder small {
  font-size: 10px;
}

.publish-gallery__remove {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 2;
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 0;
  border-radius: 999px;
  background: rgba(32, 38, 49, 0.72);
  box-shadow: 0 8px 18px rgba(15, 19, 28, 0.18);
  opacity: 0;
  transform: translateY(-4px) scale(0.94);
  transition:
    opacity 160ms ease,
    transform 160ms ease,
    background 160ms ease;
}

.publish-gallery__item--image:hover .publish-gallery__remove {
  opacity: 1;
  transform: translateY(0) scale(1);
}

.publish-gallery__item--image:hover .publish-gallery__image {
  transform: scale(1.03);
  filter: brightness(0.92);
}

.publish-gallery__remove:hover {
  background: rgba(232, 76, 92, 0.92);
}

.publish-editor {
  display: grid;
  align-content: start;
}

.publish-title,
.publish-content {
  width: 100%;
  border: 0;
  outline: 0;
  background: transparent;
  color: #2f3237;
  font-family: inherit;
  font-weight: 400;
}

.publish-title::placeholder,
.publish-content::placeholder {
  color: #d2d5da;
}

.publish-title {
  height: 54px;
  padding: 0 6px;
  border-bottom: 1px solid #efefef;
  font-size: 12px;
}

.publish-content {
  min-height: 360px;
  padding: 18px 6px 0;
  resize: none;
  font-size: 12px;
  line-height: 1.75;
}

.publish-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 12px;
  border-top: 1px solid #f2f2f2;
}

.publish-toolbar__actions {
  display: flex;
  align-items: center;
  gap: 28px;
}

.toolbar-icon {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 0;
  background: transparent;
}

.visibility {
  position: relative;
}

.visibility-button {
  min-width: 66px;
  height: 32px;
  padding: 0 12px;
  border: 0;
  border-radius: 16px;
  background: #f2f2f2;
  color: #44484f;
  font-size: 12px;
  font-weight: 500;
}

.visibility-panel {
  position: absolute;
  right: 0;
  bottom: 42px;
  display: grid;
  gap: 8px;
  width: 164px;
  padding: 10px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 12px 32px rgba(33, 43, 71, 0.12);
}

.visibility-panel__item {
  display: grid;
  gap: 3px;
  padding: 10px 12px;
  border: 0;
  border-radius: 14px;
  background: #f6f6f7;
  color: #43474d;
  text-align: left;
}

.visibility-panel__item strong {
  font-size: 12px;
  font-weight: 600;
}

.visibility-panel__item span {
  font-size: 10px;
  color: #8b9097;
  line-height: 1.5;
}

.visibility-panel__item.is-active {
  background: #eef1ff;
  color: #5d6df0;
}

.visibility-panel__item.is-active span {
  color: #7a85da;
}

@media (max-width: 389px) {
  .publish-page {
    padding-right: 18px;
    padding-left: 18px;
  }

  .publish-topbar {
    margin-right: -18px;
    margin-left: -18px;
    padding-right: 18px;
    padding-left: 18px;
  }

  .publish-gallery {
    gap: 12px;
  }

  .publish-gallery__item {
    width: 138px;
    height: 116px;
  }

  .publish-toolbar__actions {
    gap: 20px;
  }
}
</style>
