<script setup lang="ts">
import { RouterView } from "vue-router";
import { useToastQueue } from "./useToastQueue";
import ToastViewport from "@/components/ToastViewport.vue";

const { items: toastItems } = useToastQueue();
</script>

<template>
  <main class="app-shell">
    <section class="app-canvas">
      <div class="mobile-page-root">
        <RouterView />
      </div>
    </section>

    <ToastViewport :items="toastItems" />
  </main>
</template>
