<script setup lang="ts">
import type { PageComponentProps } from "@ihc/page-core/types";
import PagePlaceholder from "@/components/PagePlaceholder.vue";
import mock from "./mock";

const props = defineProps<PageComponentProps>();
</script>

<template>
  <section class="report-detail-page">
    <PagePlaceholder :page-entry="props.pageEntry" />

    <article class="report-detail-card">
      <p class="page-eyebrow">Roadmap</p>
      <strong>{{ mock.title }}</strong>
      <p>{{ mock.summary }}</p>
      <ol>
        <li v-for="item in mock.nextSteps" :key="item">{{ item }}</li>
      </ol>
    </article>
  </section>
</template>

<style scoped>
.report-detail-page {
  display: grid;
  gap: 16px;
}

.report-detail-card {
  padding: 18px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 18px 40px rgba(21, 44, 88, 0.08);
}

.report-detail-card strong {
  display: block;
  margin: 10px 0 8px;
  font-size: 20px;
}

.report-detail-card p,
.report-detail-card li {
  color: var(--muted);
  line-height: 1.7;
}

.report-detail-card ol {
  margin: 12px 0 0;
  padding-left: 20px;
}
</style>
