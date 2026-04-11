<script setup lang="ts">
import { computed } from "vue";
import { getStatusMeta } from "@ihc/page-core/runtime";
import type { PageEntry } from "@ihc/page-core/types";

const props = defineProps<{
  pageEntry: PageEntry;
  errorMessage?: string;
}>();

const statusMeta = computed(() => getStatusMeta(props.pageEntry.status));
</script>

<template>
  <section class="placeholder-page">
    <article class="placeholder-page__hero">
      <p class="page-eyebrow">{{ pageEntry.group.toUpperCase() }}</p>
      <h1>{{ pageEntry.title }}</h1>
      <p>{{ pageEntry.summary }}</p>
      <div class="placeholder-page__status">
        <span class="status-pill" :class="`status-pill--${statusMeta.tone}`">{{ statusMeta.label }}</span>
      </div>
    </article>

    <article class="placeholder-page__notice">
      <strong>{{ errorMessage ? "页面加载失败" : "功能建设中" }}</strong>
      <p v-if="errorMessage">{{ errorMessage }}</p>
      <p v-else>当前页面目录与基础 Vue 组件约定已就绪，可以继续补充结构、状态和接口联调。</p>
      <p>建议先在 `mock.ts` 中补足调试数据，再完善交互与接口对接。</p>
    </article>
  </section>
</template>

<style scoped>
.placeholder-page {
  display: grid;
  gap: 16px;
}

.placeholder-page__hero,
.placeholder-page__notice {
  padding: 20px;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 18px 42px rgba(34, 67, 118, 0.1);
}

.placeholder-page__hero h1 {
  margin: 8px 0 10px;
  font-size: 30px;
  line-height: 1.15;
}

.placeholder-page__hero p,
.placeholder-page__notice p {
  margin: 0;
  color: var(--muted);
  line-height: 1.7;
}

.placeholder-page__notice strong {
  display: block;
  margin-bottom: 8px;
  font-size: 18px;
}

.placeholder-page__status {
  margin-top: 14px;
}
</style>
