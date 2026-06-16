<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import type { PageComponentProps } from "@ihc/page-core/types";
import mock from "./mock";
import { getOrderBookingOptions, updateOrderSchedule } from "@/shared/api/orders";
import { useOrderCenter } from "@/pages/service/order-center";

const props = defineProps<PageComponentProps>();
const { currentOrder, currentOrderId, ensureCurrentOrderReady } = useOrderCenter();

const selectedDay = ref("");
const selectedTime = ref("");
const availableDates = ref<Array<{ date: string; timeSlots: string[] }>>([]);

const activeDate = computed(() => availableDates.value.find((item) => item.date === selectedDay.value) || null);
const visibleDates = computed(() => availableDates.value.length > 0 ? availableDates.value : mock.days.map((day) => ({
  date: `2026-04-${String(day).padStart(2, "0")}`,
  timeSlots: mock.timeSlots.slice(0, 12).map((item) => item.label)
})));
const visibleTimeSlots = computed(() => activeDate.value?.timeSlots || mock.timeSlots.slice(0, 12).map((item) => item.label));

function formatDayLabel(dateText: string) {
  return String(Number(dateText.split("-").pop() || "1"));
}

async function loadOptions() {
  await ensureCurrentOrderReady();
  try {
    const response = await getOrderBookingOptions();
    availableDates.value = response.availableDates || [];
  } catch {
    availableDates.value = [];
  }

  selectedDay.value = currentOrder.value?.bookingDate || visibleDates.value[0]?.date || "";
  selectedTime.value =
    currentOrder.value?.bookingTimeSlot ||
    availableDates.value.find((item) => item.date === selectedDay.value)?.timeSlots[0] ||
    visibleTimeSlots.value[0] ||
    "";
}

function goBack() {
  if (!props.navigation.navigateBack()) {
    props.navigation.reLaunch("service/order-detail");
  }
}

function selectDate(date: string) {
  selectedDay.value = date;
  selectedTime.value = availableDates.value.find((item) => item.date === date)?.timeSlots[0] || visibleTimeSlots.value[0] || "";
}

async function submit() {
  if (!currentOrderId.value || !selectedDay.value || !selectedTime.value) {
    return;
  }

  try {
    await updateOrderSchedule(currentOrderId.value, {
      bookingDate: selectedDay.value,
      bookingTimeSlot: selectedTime.value
    });
    props.showToast("订单信息已提交");
    props.navigation.navigateBack();
  } catch (error) {
    props.showToast(error instanceof Error ? error.message : "修改订单失败");
  }
}

onMounted(() => {
  void loadOptions();
});
</script>

<template>
  <div class="order-edit-page">
    <header class="page-header">
      <button class="back-button" type="button" aria-label="返回" @click="goBack">‹</button>
      <h1>修改订单信息</h1>
    </header>

    <main class="edit-content">
      <section class="form-section">
        <h2>选择预约时间</h2>
        <div class="calendar-card">
          <div class="month-title">{{ mock.monthTitle }}</div>
          <div class="weekdays">
            <span v-for="day in mock.weekdays" :key="day">{{ day }}</span>
          </div>
          <div class="calendar-divider"></div>
          <div class="days-grid">
            <button
              v-for="item in visibleDates"
              :key="item.date"
              class="day-button"
              :class="{ active: selectedDay === item.date }"
              type="button"
              @click="selectDate(item.date)"
            >
              {{ formatDayLabel(item.date) }}
            </button>
          </div>
        </div>
      </section>

      <div class="time-grid">
        <button
          v-for="slot in visibleTimeSlots"
          :key="slot"
          class="time-button"
          :class="{ active: selectedTime === slot }"
          type="button"
          @click="selectedTime = slot"
        >
          {{ slot }}
        </button>
      </div>
    </main>

    <div class="submit-bar">
      <button class="submit-button" type="button" @click="submit">提交</button>
    </div>
  </div>
</template>

<style scoped>
.order-edit-page { position: relative; left: 50%; width: min(402px, 100vw); min-height: var(--ihc-page-min-height); margin: -18px 0; transform: translateX(-50%); padding: 16px 14px 96px; box-sizing: border-box; background: #f5f6f7; color: #34383f; font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif; }
.page-header { height: 64px; display: flex; align-items: center; margin-bottom: 24px; }
.back-button { width: 24px; height: 32px; display: flex; align-items: center; justify-content: center; margin: 0 8px 0 -4px; padding: 0; border: 0; background: transparent; color: #34383f; font-size: 34px; line-height: 26px; font-weight: 300; cursor: pointer; }
.page-header h1 { margin: 0; color: #34383f; font-size: 22px; font-weight: 600; }
.form-section h2 { margin: 0 0 36px; color: #9a9da4; font-size: 16px; font-weight: 600; }
.calendar-card { padding: 26px 22px 40px; border-radius: 16px; background: #fff; }
.month-title { margin-bottom: 28px; text-align: center; color: #34383f; font-size: 22px; font-weight: 800; }
.weekdays,.days-grid { display: grid; grid-template-columns: repeat(7, 1fr); align-items: center; }
.weekdays { color: #b7bac0; font-size: 16px; font-weight: 700; text-align: center; }
.calendar-divider { height: 1px; margin: 24px 0 16px; background: #f0f0f1; }
.days-grid { row-gap: 22px; }
.day-button { width: 40px; height: 40px; justify-self: center; border: 0; border-radius: 8px; background: transparent; color: #34383f; font-size: 17px; font-weight: 700; cursor: pointer; }
.day-button.active { background: #6d74f2; color: #fff; box-shadow: 0 12px 28px rgba(104, 112, 242, 0.24); }
.time-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px 10px; margin-top: 24px; }
.time-button { height: 42px; border: 0; border-radius: 8px; background: #fff; color: #34383f; font-size: 16px; font-weight: 500; cursor: pointer; }
.time-button.active { background: #6d74f2; color: #fff; }
.submit-bar { position: fixed; left: 50%; bottom: 0; z-index: 20; width: 100%; max-width: 402px; padding: 12px 26px 28px; box-sizing: border-box; transform: translateX(-50%); background: rgba(255,255,255,.96); box-shadow: 0 -8px 20px rgba(20,24,36,.04); }
.submit-button { width: 350px; max-width: 100%; height: 48px; display: block; margin: 0 auto; border: 0; border-radius: 8px; background: #6870f2; color: #fff; font-size: 18px; font-weight: 700; cursor: pointer; }
</style>
