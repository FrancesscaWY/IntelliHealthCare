<script setup lang="ts">
import { onMounted, ref } from "vue";
import type { PageComponentProps } from "@ihc/page-core/types";
import { getAnalyticsProductAnalysis } from "@/shared/api/analytics";
import { handleAdminPageError } from "@/shared/api/error";
import SimpleTablePage from "../_shared/SimpleTablePage.vue";
import mock from "./mock";

const props = defineProps<PageComponentProps>();
const pageData = ref<typeof mock>(mock);

async function syncPageData() {
  try {
    pageData.value = (await getAnalyticsProductAnalysis({
      page: 1,
      pageSize: 20
    })) as typeof mock;
  } catch (error) {
    handleAdminPageError(error, {
      navigation: props.navigation,
      showToast: props.showToast,
      fallbackMessage: "产品分析加载失败，已回退到演示数据"
    });
  }
}

onMounted(() => {
  void syncPageData();
});
</script>

<template>
  <SimpleTablePage :config="pageData" :show-toast="props.showToast" />
</template>
