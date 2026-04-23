<script setup lang="ts">
import type { PageComponentProps } from "@ihc/page-core/types";
import SimpleTablePage from "../_shared/SimpleTablePage.vue";
import mock from "./mock";

const props = defineProps<PageComponentProps>();
</script>

<template>
  <SimpleTablePage :config="mock" :show-toast="props.showToast" />
</template>
