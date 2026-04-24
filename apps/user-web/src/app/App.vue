<script setup lang="ts">
import { computed } from "vue";
import { RouterView, useRoute } from "vue-router";
import { useToastQueue } from "./useToastQueue";
import ToastViewport from "@/components/ToastViewport.vue";

const route = useRoute();
const { items: toastItems } = useToastQueue();

const routeDebugLines = computed(() => [
  `href: ${typeof window === "undefined" ? "server" : window.location.href}`,
  `fullPath: ${route.fullPath || "(empty)"}`,
  `path: ${route.path || "(empty)"}`,
  `name: ${typeof route.name === "string" ? route.name : "(none)"}`,
  `matched: ${route.matched.map((record) => record.path).join(" -> ") || "(none)"}`,
]);
</script>

<template>
  <main class="app-shell">
    <section class="app-canvas">
      <div class="mobile-page-root">
        <RouterView />
      </div>
    </section>

    <aside class="runtime-debug" aria-label="runtime-debug">
      <strong>App Runtime</strong>
      <p v-for="line in routeDebugLines" :key="line">{{ line }}</p>
    </aside>

    <ToastViewport :items="toastItems" />
  </main>
</template>

<style scoped>
.runtime-debug {
  position: fixed;
  right: 12px;
  bottom: 12px;
  z-index: 9999;
  width: min(420px, calc(100vw - 24px));
  display: grid;
  gap: 4px;
  padding: 10px 12px;
  border: 1px solid rgba(20, 24, 34, 0.18);
  border-radius: 12px;
  background: rgba(20, 24, 34, 0.9);
  color: #f3f6fb;
  font-size: 12px;
  line-height: 1.45;
  box-shadow: 0 10px 24px rgba(12, 18, 28, 0.26);
}

.runtime-debug strong {
  font-size: 12px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.runtime-debug p {
  margin: 0;
  word-break: break-all;
}
</style>
