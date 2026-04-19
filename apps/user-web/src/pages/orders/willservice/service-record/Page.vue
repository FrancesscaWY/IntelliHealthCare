<script setup lang="ts">
import { ref } from "vue";
import type { PageComponentProps } from "@ihc/page-core/types";
import { ensureHomeCareOrders, setActiveHomeCareOrderId } from "@/pages/service/home-care-orders/store";
import mock, { type ServiceRecordActionKey } from "./mock";

const props = defineProps<PageComponentProps>();

const showCancelDialog = ref(false);

function goBack() {
  if (!props.navigation.navigateBack()) {
    props.navigation.reLaunch("orders/rehab-therapy");
  }
}

function openVoucherPage() {
  ensureHomeCareOrders();
  setActiveHomeCareOrderId("hc-order-003");
  props.navigation.navigateTo("service/payment-result");
}

function openCancelDialog() {
  showCancelDialog.value = true;
}

function closeCancelDialog() {
  showCancelDialog.value = false;
}

function confirmCancel() {
  showCancelDialog.value = false;
  props.showToast("预约已取消");
}

function handleAction(actionKey: ServiceRecordActionKey, label: string) {
  if (actionKey === "cancel") {
    openCancelDialog();
    return;
  }

  if (actionKey === "edit" || actionKey === "again") {
    props.navigation.navigateTo("service/booking");
    return;
  }

  if (actionKey === "voucher") {
    openVoucherPage();
    return;
  }

  if (actionKey === "rehab-report") {
    props.navigation.navigateTo("orders/willservice/rehab-report");
    return;
  }

  props.showToast(`${label}功能待接入`);
}
</script>

<template>
  <section class="record-page">
    <header class="page-header">
      <button class="back-btn" type="button" aria-label="返回" @click="goBack">
        <span class="back-arrow" aria-hidden="true"></span>
      </button>
      <h1>{{ mock.title }}</h1>
    </header>

    <main class="page-content">
      <article v-for="record in mock.records" :key="record.id" class="record-card">
        <header class="record-header">
          <h2>{{ record.title }}</h2>
          <span class="record-status" :class="`record-status--${record.statusTone}`">{{ record.status }}</span>
        </header>

        <div class="record-meta">
          <p>上门地址：{{ record.address }}</p>
          <p>预约时间：{{ record.bookingTime }}</p>
          <p>申请时间：{{ record.applyTime }}</p>
          <p v-if="record.staff">服务人员：{{ record.staff }}</p>
          <p v-if="record.reviewTime">审核通过时间：{{ record.reviewTime }}</p>
          <p v-if="record.completedTime">完成时间：{{ record.completedTime }}</p>
        </div>

        <footer class="record-actions">
          <button
            v-for="action in record.actions"
            :key="action.key"
            class="action-btn"
            :class="{ 'action-btn--primary': action.type === 'primary' }"
            type="button"
            @click="handleAction(action.key, action.label)"
          >
            {{ action.label }}
          </button>
        </footer>
      </article>
    </main>

    <div v-if="showCancelDialog" class="dialog-mask" @click.self="closeCancelDialog">
      <section class="dialog-card" role="dialog" aria-modal="true" aria-label="取消预约确认">
        <h2>确定取消该预约吗？</h2>
        <div class="dialog-actions">
          <button class="dialog-btn dialog-btn--ghost" type="button" @click="closeCancelDialog">取消</button>
          <button class="dialog-btn dialog-btn--primary" type="button" @click="confirmCancel">确定</button>
        </div>
      </section>
    </div>
  </section>
</template>

<style scoped>
.record-page {
  position: relative;
  left: 50%;
  width: min(390px, 100vw);
  min-height: min(844px, calc(100vh - 36px));
  margin: -18px 0;
  background: #f3f4f6;
  color: #2e3136;
  font-family: var(--ihc-font-family);
  transform: translateX(-50%);
  -webkit-font-smoothing: antialiased;
}

.page-header {
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr);
  align-items: center;
  gap: 12px;
  height: 52px;
  padding: 0 16px;
}

.back-btn,
.action-btn,
.dialog-btn {
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
}

.back-btn {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
}

.back-arrow {
  width: 11px;
  height: 11px;
  border-bottom: 2px solid #343936;
  border-left: 2px solid #343936;
  transform: rotate(45deg);
}

.page-header h1 {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
}

.page-content {
  padding: 12px 0 24px;
}

.record-card {
  margin-bottom: 16px;
  padding: 22px 16px 20px;
  border-radius: 18px;
  background: #ffffff;
  box-shadow: 0 10px 26px rgba(43, 51, 65, 0.05);
}

.record-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.record-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 800;
}

.record-status {
  font-size: 14px;
  font-weight: 700;
  white-space: nowrap;
}

.record-status--pending,
.record-status--active,
.record-status--cancelled,
.record-status--completed {
  color: #6f78ff;
}

.record-meta {
  margin-top: 16px;
}

.record-meta p {
  margin: 8px 0 0;
  color: #7e8590;
  font-size: 14px;
  line-height: 1.45;
}

.record-actions {
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 20px;
}

.action-btn {
  min-width: 114px;
  height: 48px;
  padding: 0 20px;
  border-radius: 16px;
  background: #ffffff;
  color: #4a515c;
  font-size: 15px;
  font-weight: 600;
  box-shadow: inset 0 0 0 1px #e8ebf0;
}

.action-btn--primary {
  background: #6f78ff;
  color: #ffffff;
  box-shadow: 0 12px 20px rgba(111, 120, 255, 0.2);
}

.dialog-mask {
  position: fixed;
  inset: 0;
  z-index: 20;
  display: grid;
  place-items: center;
  background: rgba(22, 24, 29, 0.22);
}

.dialog-card {
  width: min(340px, calc(100vw - 28px));
  overflow: hidden;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 18px 48px rgba(36, 40, 48, 0.16);
}

.dialog-card h2 {
  margin: 0;
  padding: 28px 20px 26px;
  text-align: center;
  font-size: 18px;
  font-weight: 700;
  color: #3a3d43;
}

.dialog-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  border-top: 1px solid #d8d8dc;
}

.dialog-btn {
  height: 72px;
  font-size: 18px;
  font-weight: 500;
}

.dialog-btn + .dialog-btn {
  border-left: 1px solid #d8d8dc;
}

.dialog-btn--ghost {
  color: #4f5258;
}

.dialog-btn--primary {
  color: #1677ff;
  font-weight: 600;
}
</style>
