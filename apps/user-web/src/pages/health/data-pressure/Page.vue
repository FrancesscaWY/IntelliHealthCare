<script setup lang="ts">
import PagePlaceholder from "@/components/PagePlaceholder.vue";
import mock from "./mock";

const pageEntry = {
  id: "health/data-pressure",
  title: "压力",
  group: "health",
  route: "/health/data-pressure",
  owner: "joy",
  status: "planned",
  summary: mock.summary,
  folderPath: "/apps/user-web/src/pages/health/data-pressure",
  modulePath: "/apps/user-web/src/pages/health/data-pressure/Page.vue",
  mockPath: "/apps/user-web/src/pages/health/data-pressure/mock.ts",
  legacySources: [],
};
</script>

<template>
  <PagePlaceholder :page-entry="pageEntry" />
</template>
