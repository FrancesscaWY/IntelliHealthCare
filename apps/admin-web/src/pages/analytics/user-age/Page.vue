<script setup lang="ts">
import type { PageComponentProps } from "@ihc/page-core/types";
import RingStatsPage from "../_shared/RingStatsPage.vue";
import mock from "./mock";

const props = defineProps<PageComponentProps>();
</script>

<template>
  <RingStatsPage :config="mock" :show-toast="props.showToast" />
</template>
