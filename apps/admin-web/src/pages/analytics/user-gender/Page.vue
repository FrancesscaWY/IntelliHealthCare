<script setup lang="ts">
import { onMounted, ref } from "vue";
import type { PageComponentProps } from "@ihc/page-core/types";
import { getAnalyticsUserGender } from "@/shared/api/analytics";
import { handleAdminPageError } from "@/shared/api/error";
import RingStatsPage from "../_shared/RingStatsPage.vue";
import mock from "./mock";

const props = defineProps<PageComponentProps>();
const pageData = ref<typeof mock>(mock);

async function syncPageData() {
  try {
    pageData.value = (await getAnalyticsUserGender()) as typeof mock;
  } catch (error) {
    handleAdminPageError(error, {
      navigation: props.navigation,
      showToast: props.showToast,
      fallbackMessage: "用户性别分析加载失败，已回退到演示数据"
    });
  }
}

onMounted(() => {
  void syncPageData();
});
</script>

<template>
  <RingStatsPage :config="pageData" :show-toast="props.showToast" />
</template>
