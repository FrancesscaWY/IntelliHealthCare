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
  gap: 8px;
  padding: 12px 16px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.85);
  box-shadow: 0 12px 32px rgba(42, 58, 74, 0.08);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

.mobile-tabbar__item {
  border: 0;
  background: transparent;
  display: grid;
  justify-items: center;
  gap: 4px;
  padding: 6px 0;
  color: #a0acb8;
  transition: color 0.2s ease;
}

.mobile-tabbar__item.is-active {
  color: var(--brand);
}

.mobile-tabbar__item.is-center .mobile-tabbar__icon {
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--brand-light) 0%, var(--brand) 100%);
  color: #ffffff;
  box-shadow: 0 8px 20px rgba(91, 184, 166, 0.25);
}

.mobile-tabbar__icon {
  font-size: 16px;
  font-weight: 600;
}

.mobile-tabbar__label {
  font-size: 11px;
  font-weight: 500;
}
</style>
