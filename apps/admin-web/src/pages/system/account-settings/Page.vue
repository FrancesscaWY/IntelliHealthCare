<script setup lang="ts">
import type { PageComponentProps } from "@ihc/page-core/types";
import PagePlaceholder from "@/components/PagePlaceholder.vue";
import mock from "./mock";

const props = defineProps<PageComponentProps>();
</script>

<template>
  <PagePlaceholder :page-entry="props.pageEntry" :notes="mock.sections" />
</template>
