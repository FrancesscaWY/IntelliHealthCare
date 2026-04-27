<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { AssistantConversationHistoryEntry } from "@/shared/ai/state";

const props = withDefaults(
  defineProps<{
    open: boolean;
    entries: AssistantConversationHistoryEntry[];
    activeConversationId?: string;
    title?: string;
    loading?: boolean;
  }>(),
  {
    activeConversationId: "",
    title: "历史对话记录",
    loading: false
  }
);

const emit = defineEmits<{
  close: [];
  create: [];
  select: [conversationId: string];
}>();

const keyword = ref("");
const normalizedEntries = computed(() =>
  Array.isArray(props.entries) ? props.entries : []
);

const filteredEntries = computed(() => {
  const normalizedKeyword = keyword.value.trim().toLowerCase();

  if (!normalizedKeyword) {
    return normalizedEntries.value;
  }

  return normalizedEntries.value.filter((item) => {
    return [item.topic, item.preview]
      .filter(Boolean)
      .some((value) => value.toLowerCase().includes(normalizedKeyword));
  });
});

function formatTimeLabel(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${month}-${day} ${hours}:${minutes}`;
}

watch(
  () => props.open,
  (open) => {
    if (!open) {
      keyword.value = "";
    }
  }
);
</script>

<template>
  <transition name="history-sheet-fade">
    <div v-if="open" class="history-sheet-mask" @click.self="emit('close')">
      <section class="history-sheet">
        <header class="history-sheet__header">
          <div>
            <strong>{{ title }}</strong>
            <p>点击任一记录可继续原会话</p>
          </div>
          <button type="button" aria-label="关闭历史记录" @click="emit('close')">
            <span aria-hidden="true"></span>
          </button>
        </header>

        <label class="history-sheet__search">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M10.5 4.5a6 6 0 1 0 0 12a6 6 0 0 0 0-12Zm0 0l8.25 8.25"
            />
          </svg>
          <input v-model="keyword" type="text" placeholder="搜索历史对话" />
        </label>

        <button class="history-sheet__create" type="button" @click="emit('create')">
          新建对话
        </button>

        <div v-if="loading" class="history-sheet__empty">
          <strong>会话加载中</strong>
          <p>正在同步最新的历史消息。</p>
        </div>

        <div v-else-if="filteredEntries.length === 0" class="history-sheet__empty">
          <strong>暂无历史对话</strong>
          <p>开始一次新的咨询后，会自动出现在这里。</p>
        </div>

        <div v-else class="history-sheet__list" aria-label="历史对话列表">
          <button
            v-for="entry in filteredEntries"
            :key="entry.conversationId"
            class="history-sheet__item"
            :class="{ 'history-sheet__item--active': activeConversationId === entry.conversationId }"
            type="button"
            @click="emit('select', entry.conversationId)"
          >
            <div class="history-sheet__item-main">
              <strong>{{ entry.topic || "豆沙包健康咨询" }}</strong>
              <p>{{ entry.preview || "暂无预览内容" }}</p>
            </div>
            <time>{{ formatTimeLabel(entry.updatedAt) }}</time>
          </button>
        </div>
      </section>
    </div>
  </transition>
</template>

<style scoped>
.history-sheet-mask {
  position: absolute;
  inset: 0;
  z-index: 18;
  background: rgba(24, 35, 58, 0.18);
  backdrop-filter: blur(8px);
}

.history-sheet {
  position: absolute;
  top: 78px;
  right: 16px;
  width: min(344px, calc(100% - 28px));
  max-height: calc(100% - 108px);
  display: grid;
  gap: 14px;
  padding: 18px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.74);
  border-radius: 28px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.97), rgba(246, 250, 255, 0.94));
  box-shadow: 0 24px 52px rgba(23, 44, 82, 0.14);
  backdrop-filter: blur(18px);
}

.history-sheet__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.history-sheet__header strong,
.history-sheet__item strong,
.history-sheet__empty strong {
  color: #1f2a44;
  font-size: 16px;
  font-weight: 900;
}

.history-sheet__header p,
.history-sheet__item p,
.history-sheet__empty p,
.history-sheet__item time {
  margin: 0;
  color: rgba(56, 69, 94, 0.62);
  font-size: 12px;
  font-weight: 700;
  line-height: 1.5;
}

.history-sheet__header button,
.history-sheet__create,
.history-sheet__item {
  border: 0;
  background: transparent;
  color: inherit;
  font-family: inherit;
}

.history-sheet__header button {
  position: relative;
  width: 28px;
  height: 28px;
  padding: 0;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.72);
  background: rgba(255, 255, 255, 0.82);
  box-shadow: 0 10px 20px rgba(69, 105, 149, 0.08);
}

.history-sheet__header span,
.history-sheet__header span::after {
  position: absolute;
  top: 13px;
  left: 7px;
  width: 14px;
  height: 2px;
  content: "";
  border-radius: 999px;
  background: rgba(31, 42, 68, 0.68);
}

.history-sheet__header span {
  transform: rotate(45deg);
}

.history-sheet__header span::after {
  top: 0;
  left: 0;
  transform: rotate(90deg);
}

.history-sheet__search {
  display: grid;
  grid-template-columns: 18px 1fr;
  align-items: center;
  gap: 8px;
  min-height: 42px;
  padding: 0 12px;
  border: 1px solid rgba(120, 140, 168, 0.14);
  border-radius: 14px;
  background: rgba(244, 248, 253, 0.94);
}

.history-sheet__search svg {
  width: 18px;
  height: 18px;
  fill: none;
  stroke: rgba(91, 108, 138, 0.7);
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.history-sheet__search input {
  width: 100%;
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: #1f2a44;
  font-size: 13px;
  font-weight: 700;
}

.history-sheet__search input::placeholder {
  color: rgba(93, 108, 136, 0.55);
}

.history-sheet__create {
  justify-self: start;
  min-height: 36px;
  padding: 0 16px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.72);
  background: linear-gradient(120deg, rgba(117, 214, 223, 0.16), rgba(145, 198, 239, 0.18));
  color: #24405f;
  font-size: 13px;
  font-weight: 900;
  box-shadow: 0 10px 20px rgba(77, 104, 142, 0.08);
}

.history-sheet__list {
  display: grid;
  gap: 10px;
  max-height: min(408px, calc(100vh - 260px));
  padding-right: 2px;
  overflow-y: auto;
}

.history-sheet__list::-webkit-scrollbar {
  width: 6px;
}

.history-sheet__list::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: rgba(138, 153, 178, 0.34);
}

.history-sheet__item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  align-items: start;
  padding: 13px 14px;
  border: 1px solid rgba(255, 255, 255, 0.72);
  border-radius: 18px;
  background: rgba(247, 250, 254, 0.92);
  box-shadow: 0 10px 18px rgba(77, 104, 142, 0.04);
  text-align: left;
}

.history-sheet__item--active {
  background: linear-gradient(140deg, rgba(117, 214, 223, 0.16), rgba(145, 198, 239, 0.16));
  box-shadow:
    0 12px 24px rgba(77, 104, 142, 0.06),
    inset 0 0 0 1px rgba(117, 214, 223, 0.14);
}

.history-sheet__item-main {
  min-width: 0;
}

.history-sheet__item p {
  margin-top: 4px;
  display: -webkit-box;
  overflow: hidden;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.history-sheet__item time {
  white-space: nowrap;
}

.history-sheet__empty {
  display: grid;
  gap: 6px;
  padding: 18px 4px 8px;
  text-align: center;
}

.history-sheet-fade-enter-active,
.history-sheet-fade-leave-active {
  transition: opacity 0.2s ease;
}

.history-sheet-fade-enter-from,
.history-sheet-fade-leave-to {
  opacity: 0;
}
</style>
