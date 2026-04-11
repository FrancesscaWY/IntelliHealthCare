<script setup lang="ts">
import type { ToastItem } from "@/app/useToastQueue";

defineProps<{
  items: ToastItem[];
}>();
</script>

<template>
  <TransitionGroup name="toast" tag="div" class="toast-root">
    <div v-for="item in items" :key="item.id" class="toast-item">
      {{ item.message }}
    </div>
  </TransitionGroup>
</template>

<style scoped>
.toast-root {
  position: fixed;
  left: 50%;
  bottom: 28px;
  z-index: 999;
  display: grid;
  gap: 8px;
  transform: translateX(-50%);
}

.toast-item {
  padding: 10px 14px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.88);
  color: #fff;
  font-size: 13px;
}

.toast-enter-active,
.toast-leave-active {
  transition: opacity 180ms ease, transform 180ms ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
