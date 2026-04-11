<script setup lang="ts">
import { bottomTabItems } from "@ihc/page-core/runtime";

defineProps<{
  activeKey: string;
}>();

const emit = defineEmits<{
  navigate: [pageId: string];
  pending: [message: string];
}>();

function handleClick(pageId: string, label: string) {
  if (pageId) {
    emit("navigate", pageId);
    return;
  }

  emit("pending", `${label}功能待接入`);
}
</script>

<template>
  <nav class="mobile-tabbar">
    <button
      v-for="item in bottomTabItems"
      :key="item.key"
      class="mobile-tabbar__item"
      :class="{
        'is-active': item.key === activeKey,
        'is-center': item.key === 'publish',
      }"
      type="button"
      @click="handleClick(item.pageId, item.label)"
    >
      <span class="mobile-tabbar__icon">{{ item.icon }}</span>
      <span v-if="item.label" class="mobile-tabbar__label">{{ item.label }}</span>
    </button>
  </nav>
</template>

<style scoped>
.mobile-tabbar {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 10px;
  padding: 14px;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 18px 40px rgba(24, 42, 77, 0.08);
}

.mobile-tabbar__item {
  border: 0;
  background: transparent;
  display: grid;
  justify-items: center;
  gap: 5px;
  color: #8a96ac;
}

.mobile-tabbar__item.is-active {
  color: var(--brand);
}

.mobile-tabbar__item.is-center .mobile-tabbar__icon {
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--accent), #ffad61);
  color: #fff;
}

.mobile-tabbar__icon {
  font-size: 18px;
  font-weight: 700;
}

.mobile-tabbar__label {
  font-size: 11px;
}
</style>
