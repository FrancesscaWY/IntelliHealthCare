<script setup lang="ts">
import { computed } from "vue";
import { getStatusMeta } from "@ihc/page-core/runtime";
import type { PageEntry } from "@ihc/page-core/types";

interface PlaceholderStat {
  label: string;
  value: string;
}

const props = defineProps<{
  pageEntry: PageEntry;
  notes?: string[];
  stats?: PlaceholderStat[];
  errorMessage?: string;
}>();

const statusMeta = computed(() => getStatusMeta(props.pageEntry.status));
</script>

<template>
  <section class="placeholder-page">
    <article class="placeholder-card placeholder-card--hero">
      <div>
        <p class="placeholder-eyebrow">{{ pageEntry.group.toUpperCase() }}</p>
        <h1>{{ pageEntry.title }}</h1>
        <p class="placeholder-summary">{{ pageEntry.summary }}</p>
      </div>
      <span class="placeholder-status" :class="`placeholder-status--${statusMeta.tone}`">{{ statusMeta.label }}</span>
    </article>

    <article v-if="stats?.length" class="placeholder-card placeholder-card--stats">
      <div v-for="item in stats" :key="item.label" class="placeholder-stat">
        <span>{{ item.label }}</span>
        <strong>{{ item.value }}</strong>
      </div>
    </article>

    <article class="placeholder-card">
      <strong>{{ errorMessage ? "页面加载失败" : "页面骨架已就绪" }}</strong>
      <p v-if="errorMessage" class="placeholder-copy">{{ errorMessage }}</p>
      <p v-else class="placeholder-copy">当前页面已纳入后台端工作区，可直接用于整站预览、单页预览与后续接口联调。</p>
      <ul v-if="notes?.length" class="placeholder-list">
        <li v-for="note in notes" :key="note">{{ note }}</li>
      </ul>
    </article>
  </section>
</template>

<style scoped>
.placeholder-page {
  display: grid;
  gap: 18px;
}

.placeholder-card {
  padding: 24px;
  border: 1px solid var(--admin-border);
  border-radius: var(--admin-radius-lg);
  background: var(--admin-surface-strong);
  box-shadow: var(--admin-shadow);
}

.placeholder-card--hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.placeholder-card--stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
}

.placeholder-eyebrow {
  margin: 0;
  color: var(--admin-brand);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.placeholder-card h1 {
  margin: 8px 0 10px;
  font-size: 32px;
}

.placeholder-summary,
.placeholder-copy {
  margin: 0;
  color: var(--admin-muted);
  line-height: 1.7;
}

.placeholder-status {
  display: inline-flex;
  align-items: center;
  padding: 8px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
}

.placeholder-status--implemented {
  background: rgba(31, 122, 90, 0.12);
  color: var(--admin-brand);
}

.placeholder-status--in-progress {
  background: rgba(31, 122, 90, 0.18);
  color: #16543d;
}

.placeholder-status--planned {
  background: rgba(224, 138, 58, 0.14);
  color: #9d5b1a;
}

.placeholder-stat {
  padding: 16px 18px;
  border-radius: var(--admin-radius-md);
  background: linear-gradient(180deg, rgba(31, 122, 90, 0.06), rgba(31, 122, 90, 0.02));
}

.placeholder-stat span {
  display: block;
  color: var(--admin-muted);
  font-size: 13px;
}

.placeholder-stat strong {
  display: block;
  margin-top: 8px;
  font-size: 24px;
}

.placeholder-card strong {
  display: block;
  margin-bottom: 10px;
  font-size: 18px;
}

.placeholder-list {
  display: grid;
  gap: 10px;
  margin: 16px 0 0;
  padding-left: 18px;
  color: var(--admin-muted);
}
</style>
