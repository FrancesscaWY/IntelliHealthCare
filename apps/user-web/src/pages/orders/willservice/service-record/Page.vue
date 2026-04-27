<script setup lang="ts">
import { onMounted } from "vue";
import type { PageComponentProps } from "@ihc/page-core/types";
import { formatOrderTime, useOrderCenter } from "@/pages/service/order-center";

const props = defineProps<PageComponentProps>();
const { currentOrderServiceRecords, ensureCurrentServiceRecords, cancelCurrentOrder } = useOrderCenter();

function goBack() {
  if (!props.navigation.navigateBack()) {
    props.navigation.reLaunch("orders/rehab-therapy");
  }
}

async function handleCancel() {
  try {
    await cancelCurrentOrder("用户主动取消");
    props.showToast("预约已取消");
  } catch (error) {
    props.showToast(error instanceof Error ? error.message : "取消预约失败");
  }
}

function openVoucherPage() {
  props.navigation.navigateTo("orders/checkup-voucher");
}

function openRehabReport() {
  props.navigation.navigateTo("orders/willservice/rehab-report");
}

onMounted(() => {
  void ensureCurrentServiceRecords();
});
</script>

<template>
  <section class="record-page">
    <header class="page-header">
      <button class="back-btn" type="button" aria-label="返回" @click="goBack">
        <span class="back-arrow" aria-hidden="true"></span>
      </button>
      <h1>服务记录</h1>
    </header>

    <main class="page-content">
      <article v-for="record in currentOrderServiceRecords" :key="record.workOrderId" class="record-card">
        <header class="record-header">
          <h2>{{ record.institutionName || "服务记录" }}</h2>
          <span class="record-status">{{ record.status }}</span>
        </header>

        <div class="record-meta">
          <p>预约时间：{{ formatOrderTime(record.scheduleAt) }}</p>
          <p>服务人员：{{ record.assigneeName || "--" }}</p>
          <p v-if="record.startedAt">开始时间：{{ formatOrderTime(record.startedAt) }}</p>
          <p v-if="record.completedAt">完成时间：{{ formatOrderTime(record.completedAt) }}</p>
          <p v-if="record.dispatchNote">派单备注：{{ record.dispatchNote }}</p>
        </div>

        <footer class="record-actions">
          <button class="action-btn" type="button" @click="handleCancel">取消预约</button>
          <button class="action-btn" type="button" @click="openVoucherPage">服务券码</button>
          <button class="action-btn action-btn--primary" type="button" @click="openRehabReport">康复报告</button>
        </footer>
      </article>
    </main>
  </section>
</template>

<style scoped>
.record-page { position: relative; left: 50%; width: min(390px, 100vw); min-height: var(--ihc-page-min-height); margin: -18px 0; background: #f3f4f6; color: #2e3136; font-family: var(--ihc-font-family); transform: translateX(-50%); -webkit-font-smoothing: antialiased; }
.page-header { display: grid; grid-template-columns: 28px minmax(0, 1fr); align-items: center; gap: 12px; height: 52px; padding: 0 16px; }
.back-btn,.action-btn { padding: 0; border: 0; background: transparent; color: inherit; }
.back-btn { display: grid; place-items: center; width: 28px; height: 28px; }
.back-arrow { width: 11px; height: 11px; border-bottom: 2px solid #343936; border-left: 2px solid #343936; transform: rotate(45deg); }
.page-header h1 { margin: 0; font-size: 18px; font-weight: 700; }
.page-content { padding: 12px 0 24px; }
.record-card { margin-bottom: 16px; padding: 22px 16px 20px; border-radius: 18px; background: #ffffff; box-shadow: 0 10px 26px rgba(43,51,65,.05); }
.record-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.record-header h2 { margin: 0; font-size: 18px; font-weight: 800; }
.record-status { font-size: 14px; font-weight: 700; color: #6f78ff; white-space: nowrap; }
.record-meta { margin-top: 16px; }
.record-meta p { margin: 8px 0 0; color: #7e8590; font-size: 14px; line-height: 1.45; }
.record-actions { display: flex; justify-content: flex-end; flex-wrap: wrap; gap: 12px; margin-top: 20px; }
.action-btn { min-width: 114px; height: 48px; padding: 0 20px; border-radius: 16px; background: #ffffff; color: #4a515c; font-size: 15px; font-weight: 600; box-shadow: inset 0 0 0 1px #e8ebf0; }
.action-btn--primary { background: #6f78ff; color: #ffffff; box-shadow: 0 12px 20px rgba(111,120,255,.2); }
</style>
