<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import type { PageComponentProps } from "@ihc/page-core/types";
import { AtSign, Close, LocalTwo, Pound } from "@icon-park/vue-next";
import blossomCover from "@/assets/community/publish/blossom.jpg";
import { savePublishedProfilePost } from "@/pages/home/profile/published-post";
import { getCurrentUserProfile } from "@/shared/api/auth";
import { createCommunityPost, getCommunityTopics, type CommunityTopicItem } from "@/shared/api/community";
import { uploadAppFile } from "@/shared/api/files";

type UploadImage = {
  id: string;
  src: string;
  fileId?: string;
};

type VisibilityOption = {
  key: "public" | "private";
  label: string;
  description: string;
};

const MAX_UPLOAD_IMAGES = 6;

const props = defineProps<PageComponentProps>();
const fileInput = ref<HTMLInputElement | null>(null);
const title = ref("");
const content = ref("");
const visibility = ref<VisibilityOption>({
  key: "public",
  label: "公开",
  description: "所有人可见"
});
const showVisibilityPanel = ref(false);
const uploadedImages = ref<UploadImage[]>([]);
const isUploadingImages = ref(false);
const isSubmitting = ref(false);
const topics = ref<CommunityTopicItem[]>([]);
const topicIndex = ref(0);
const currentUserName = ref("我");

const visibilityOptions: VisibilityOption[] = [
  { key: "public", label: "公开", description: "所有人可见" }
];

const selectedTopic = computed(() => topics.value[topicIndex.value] || null);
const canSubmit = computed(() => buildSubmitContent().length > 0 && !isSubmitting.value);
const remainingImageSlots = computed(() => Math.max(MAX_UPLOAD_IMAGES - uploadedImages.value.length, 0));
const canAddMoreImages = computed(() => remainingImageSlots.value > 0);

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "请求失败，请稍后重试";
}

function buildSubmitContent() {
  const trimmedTitle = title.value.trim();
  const trimmedContent = content.value.trim();

  if (trimmedTitle && trimmedContent) {
    return `${trimmedTitle}\n${trimmedContent}`;
  }

  return trimmedTitle || trimmedContent;
}

function goBack() {
  showVisibilityPanel.value = false;

  if (!props.navigation.navigateBack()) {
    props.navigation.reLaunch("community/circle");
  }
}

function triggerUpload() {
  if (!isUploadingImages.value) {
    fileInput.value?.click();
  }
}

async function loadTopics() {
  try {
    topics.value = await getCommunityTopics();
  } catch (error) {
    props.showToast(getErrorMessage(error));
  }
}

async function loadCurrentUser() {
  try {
    const profile = await getCurrentUserProfile();
    currentUserName.value = profile.nickname || profile.realName || "我";
  } catch {
    currentUserName.value = "我";
  }
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

  isUploadingImages.value = true;

  try {
    const nextImages = await Promise.all(
      selectedFiles.map(async (file, index) => {
        const uploaded = await uploadAppFile("POST_IMAGE", file, {
          sourcePage: "community/publish"
        });

        return {
          id: `${file.name}-${file.lastModified}-${uploadedImages.value.length + index}`,
          src: uploaded.url,
          fileId: uploaded.fileId
        };
      })
    );

    uploadedImages.value = [...uploadedImages.value, ...nextImages].slice(0, MAX_UPLOAD_IMAGES);
    props.showToast(`已上传 ${nextImages.length} 张图片`);
  } catch (error) {
    props.showToast(getErrorMessage(error));
  } finally {
    isUploadingImages.value = false;
    target.value = "";
  }

  if (rawFiles.length > selectedFiles.length) {
    props.showToast(`最多可添加 ${MAX_UPLOAD_IMAGES} 张图片`);
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

function cycleTopic() {
  if (!topics.value.length) {
    props.showToast("暂无可选话题");
    return;
  }

  topicIndex.value = (topicIndex.value + 1) % topics.value.length;
  props.showToast(`已选择话题 ${selectedTopic.value?.title}`);
}

function formatPostDate() {
  const now = new Date();
  return `${now.getMonth() + 1}月${now.getDate()}日`;
}

async function submitPost() {
  const submitContent = buildSubmitContent();

  if (!submitContent) {
    props.showToast("请输入内容");
    return;
  }

  isSubmitting.value = true;

  try {
    await createCommunityPost({
      topicId: selectedTopic.value?.topicId,
      tagLabel: selectedTopic.value?.title.replace(/^#/, ""),
      content: submitContent,
      images: uploadedImages.value.map((item) => item.src)
    });

    savePublishedProfilePost({
      id: `published-${Date.now()}`,
      author: currentUserName.value,
      date: formatPostDate(),
      title: title.value.trim(),
      content: content.value.trim() || submitContent,
      likes: 0,
      favorites: 0,
      comments: 0,
      gallery: uploadedImages.value.map((item) => ({
        src: item.src,
        position: "center",
        fileId: item.fileId
      }))
    });

    props.showToast(`${visibility.value.label}发布成功`);
    window.setTimeout(() => {
      props.navigation.reLaunch("community/circle");
    }, 300);
  } catch (error) {
    props.showToast(getErrorMessage(error));
  } finally {
    isSubmitting.value = false;
  }
}

onMounted(() => {
  void loadTopics();
  void loadCurrentUser();
});
</script>

<template>
  <section class="publish-shell" @click="showVisibilityPanel = false">
    <div class="publish-page">
      <header class="publish-nav">
        <button class="icon-button close-button" type="button" aria-label="关闭" @click.stop="goBack">
          <Close theme="outline" size="24" fill="#2e3135" />
        </button>
        <button
          class="publish-button"
          :class="{ 'publish-button--disabled': !canSubmit }"
          type="button"
          @click.stop="submitPost"
        >
          {{ isSubmitting ? "发布中" : "发布" }}
        </button>
      </header>

      <section class="publish-gallery" aria-label="图片预览">
        <article class="gallery-card gallery-card--cover">
          <img class="gallery-cover" :src="blossomCover" alt="示例封面" />
        </article>

        <article
          v-for="image in uploadedImages"
          :key="image.id"
          class="gallery-card gallery-card--image"
        >
          <img class="gallery-photo" :src="image.src" alt="已选择图片" />
          <button class="gallery-remove" type="button" aria-label="删除图片" @click.stop="removeImage(image.id)">
            <Close theme="outline" size="14" fill="#ffffff" />
          </button>
        </article>

        <button
          v-if="canAddMoreImages"
          class="gallery-card gallery-card--adder"
          type="button"
          :disabled="isUploadingImages"
          @click.stop="triggerUpload"
        >
          <span class="adder-icon" aria-hidden="true">
            <span class="adder-frame"></span>
            <span class="adder-sun"></span>
            <span class="adder-mountain"></span>
            <span class="adder-plus adder-plus--horizontal"></span>
            <span class="adder-plus adder-plus--vertical"></span>
          </span>
          <strong>{{ isUploadingImages ? "上传中" : "添加图片" }}</strong>
          <small>{{ uploadedImages.length }}/{{ MAX_UPLOAD_IMAGES }}</small>
        </button>

        <input ref="fileInput" type="file" accept="image/*" multiple hidden @change="handleFileChange" />
      </section>

      <section class="publish-editor">
        <input v-model="title" class="publish-title" type="text" placeholder="输入标题" />
        <div class="editor-divider"></div>
        <textarea v-model="content" class="publish-content" placeholder="输入内容"></textarea>
      </section>

      <footer class="publish-footer">
        <div class="publish-toolbar">
          <button type="button" class="toolbar-icon" aria-label="提及" @click.stop="props.showToast('提及功能暂未接入')">
            <AtSign theme="outline" size="20" fill="#2f3237" />
          </button>
          <button type="button" class="toolbar-icon" aria-label="话题" @click.stop="cycleTopic">
            <Pound theme="outline" size="20" fill="#2f3237" />
          </button>
          <button type="button" class="toolbar-icon" aria-label="位置" @click.stop="props.showToast('位置功能暂未接入')">
            <LocalTwo theme="outline" size="20" fill="#2f3237" />
          </button>
        </div>

        <div class="footer-meta">
          <span v-if="selectedTopic" class="topic-pill">{{ selectedTopic.title }}</span>

          <div class="visibility">
            <button type="button" class="visibility-button" @click.stop="visibilityOptions.length > 1 && toggleVisibilityPanel()">
              {{ visibility.label }}
            </button>

            <div v-if="showVisibilityPanel" class="visibility-panel" @click.stop>
              <button
                v-for="option in visibilityOptions"
                :key="option.key"
                class="visibility-option"
                :class="{ 'visibility-option--active': option.key === visibility.key }"
                type="button"
                @click="handleVisibilitySelect(option)"
              >
                <strong>{{ option.label }}</strong>
                <span>{{ option.description }}</span>
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  </section>
</template>

<style scoped>
.publish-shell {
  position: relative;
  left: 50%;
  width: min(402px, 100vw);
  height: min(874px, calc(100vh - 36px));
  min-height: min(874px, calc(100vh - 36px));
  max-height: 874px;
  margin: -18px 0;
  transform: translateX(-50%);
  overflow: hidden;
  background: #ffffff;
  color: #2b2b2b;
  font-family: "HarmonyOS Sans SC", "PingFang SC", "Microsoft YaHei UI", sans-serif;
}

.publish-page {
  height: 100%;
  padding: 16px 18px 28px;
  box-sizing: border-box;
  overflow-y: auto;
  background: linear-gradient(180deg, #ffffff 0%, #fbfcff 44%, #ffffff 100%);
  scrollbar-width: none;
}

.publish-page::-webkit-scrollbar {
  display: none;
}

.publish-nav {
  position: sticky;
  top: 0;
  z-index: 5;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: -16px -18px 0;
  padding: 16px 18px 18px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(255, 255, 255, 0.92) 100%);
  backdrop-filter: blur(12px);
}

.icon-button {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
}

.publish-button {
  min-width: 82px;
  height: 40px;
  padding: 0 18px;
  border: 0;
  border-radius: 999px;
  background: linear-gradient(135deg, #6e79f2 0%, #6570f0 100%);
  box-shadow: 0 10px 24px rgba(101, 112, 240, 0.22);
  color: #ffffff;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0.04em;
}

.publish-button--disabled {
  opacity: 0.6;
}

.publish-gallery {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-top: 24px;
}

.gallery-card {
  position: relative;
  aspect-ratio: 212 / 176;
  border: 0;
  border-radius: 20px;
  overflow: hidden;
}

.gallery-card--cover,
.gallery-card--image {
  box-shadow: 0 14px 30px rgba(37, 51, 84, 0.12);
}

.gallery-card--cover {
  background: linear-gradient(180deg, #a8dcff 0%, #dff4ff 70%, #f3f5ff 100%);
}

.gallery-cover,
.gallery-photo {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
}

.gallery-card--cover::after {
  position: absolute;
  inset: 0;
  content: "";
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.02) 0%, rgba(255, 255, 255, 0.12) 100%);
}

.gallery-card--adder {
  display: grid;
  align-content: center;
  justify-items: center;
  gap: 8px;
  background: linear-gradient(180deg, #f6f7f9 0%, #eff1f4 100%);
  color: #9299a4;
}

.gallery-card--adder strong {
  font-size: 14px;
  font-weight: 600;
  color: #7b8089;
}

.gallery-card--adder small {
  font-size: 11px;
  color: #9ba1ab;
}

.adder-icon {
  position: relative;
  width: 46px;
  height: 40px;
}

.adder-frame {
  position: absolute;
  left: 0;
  top: 4px;
  width: 28px;
  height: 20px;
  border: 2px solid #a6a6a6;
  border-radius: 4px;
}

.adder-sun {
  position: absolute;
  left: 6px;
  top: 9px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #a6a6a6;
}

.adder-mountain {
  position: absolute;
  left: 7px;
  top: 19px;
  width: 12px;
  height: 8px;
  border-left: 2px solid #a6a6a6;
  border-bottom: 2px solid #a6a6a6;
  transform: skew(-24deg);
}

.adder-plus {
  position: absolute;
  right: 0;
  bottom: 0;
  border-radius: 999px;
  background: #a6a6a6;
}

.adder-plus--horizontal {
  width: 16px;
  height: 2px;
  right: 0;
  bottom: 7px;
}

.adder-plus--vertical {
  width: 2px;
  height: 16px;
  right: 7px;
  bottom: 0;
}

.gallery-remove {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 2;
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: rgba(23, 29, 38, 0.68);
  box-shadow: 0 8px 18px rgba(15, 19, 28, 0.18);
}

.publish-editor {
  margin-top: 32px;
}

.publish-title,
.publish-content {
  width: 100%;
  border: 0;
  outline: 0;
  background: transparent;
  color: #2b2b2b;
  font-family: inherit;
}

.publish-title::placeholder,
.publish-content::placeholder {
  color: #d2d5da;
}

.publish-title {
  height: 54px;
  padding: 0 4px;
  font-size: 18px;
  font-weight: 500;
}

.editor-divider {
  height: 1px;
  background: #efefef;
}

.publish-content {
  min-height: 320px;
  padding: 18px 4px 0;
  resize: none;
  font-size: 16px;
  line-height: 1.8;
}

.publish-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-top: 24px;
  padding-top: 18px;
  border-top: 1px solid #f1f1f1;
}

.publish-toolbar {
  display: flex;
  align-items: center;
  gap: 14px;
}

.toolbar-icon {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: #f8f9fb;
  box-shadow: inset 0 0 0 1px rgba(47, 50, 55, 0.04);
}

.footer-meta {
  display: flex;
  align-items: center;
  gap: 10px;
}

.topic-pill {
  max-width: 140px;
  overflow: hidden;
  padding: 0 12px;
  border-radius: 999px;
  background: #eef1ff;
  color: #5d6df0;
  font-size: 12px;
  line-height: 32px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.visibility {
  position: relative;
}

.visibility-button {
  min-width: 72px;
  height: 36px;
  padding: 0 14px;
  border: 0;
  border-radius: 999px;
  background: #f2f3f5;
  color: #44484f;
  font-size: 14px;
  font-weight: 500;
}

.visibility-panel {
  position: absolute;
  right: 0;
  bottom: 48px;
  display: grid;
  gap: 8px;
  width: 176px;
  padding: 10px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 12px 32px rgba(33, 43, 71, 0.12);
}

.visibility-option {
  display: grid;
  gap: 4px;
  padding: 10px 12px;
  border: 0;
  border-radius: 14px;
  background: #f6f6f7;
  color: #43474d;
  text-align: left;
}

.visibility-option strong {
  font-size: 13px;
  font-weight: 600;
}

.visibility-option span {
  font-size: 11px;
  color: #8b9097;
  line-height: 1.5;
}

.visibility-option--active {
  background: #eef1ff;
  color: #5d6df0;
}

.visibility-option--active span {
  color: #7a85da;
}

@media (max-width: 389px) {
  .publish-page {
    padding-right: 16px;
    padding-left: 16px;
  }

  .publish-nav {
    margin-right: -16px;
    margin-left: -16px;
    padding-right: 16px;
    padding-left: 16px;
  }

  .publish-gallery {
    gap: 10px;
  }

  .publish-footer {
    align-items: flex-end;
  }

  .publish-toolbar {
    gap: 10px;
  }
}
</style>
