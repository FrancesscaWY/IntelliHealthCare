<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import type { PageComponentProps } from "@ihc/page-core/types";
import { getCurrentUserSettings, updateMessageSettings, type MessageSettingsPayload } from "@/shared/api/auth";
import mock from "./mock";

const props = defineProps<PageComponentProps>();

type SettingKey = "interactive" | "system" | "health" | "order" | "sms";

const loading = ref(false);
const saving = ref(false);
const switches = reactive(
  mock.items.map((item) => ({
    ...item,
  })),
);
const masterEnabled = computed(() => switches.every((item) => item.enabled));

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "请求失败，请稍后重试";
}

function findSwitch(key: SettingKey) {
  return switches.find((item) => item.key === key);
}

function syncFromPayload(payload: Required<MessageSettingsPayload>) {
  const mapping: Record<SettingKey, boolean> = {
    interactive: payload.communityNotice,
    system: payload.systemNotice,
    health: payload.healthAlert,
    order: payload.orderNotice,
    sms: payload.smsEnabled,
  };

  switches.forEach((item) => {
    item.enabled = mapping[item.key as SettingKey] ?? false;
  });
}

function buildPayload() {
  return {
    communityNotice: Boolean(findSwitch("interactive")?.enabled),
    systemNotice: Boolean(findSwitch("system")?.enabled),
    healthAlert: Boolean(findSwitch("health")?.enabled),
    orderNotice: Boolean(findSwitch("order")?.enabled),
    smsEnabled: Boolean(findSwitch("sms")?.enabled),
  } satisfies MessageSettingsPayload;
}

function goBack() {
  if (!props.navigation.navigateBack()) {
    props.navigation.reLaunch("home/MyJ/setting");
  }
}

async function loadSettings() {
  loading.value = true;

  try {
    const settings = await getCurrentUserSettings();
    syncFromPayload(settings.messageSettings);
  } catch (error) {
    props.showToast(getErrorMessage(error));
  } finally {
    loading.value = false;
  }
}

async function persistSettings() {
  if (saving.value) {
    return;
  }

  try {
    saving.value = true;
    const result = await updateMessageSettings(buildPayload());
    syncFromPayload(result.messageSettings);
  } catch (error) {
    props.showToast(getErrorMessage(error));
    await loadSettings();
  } finally {
    saving.value = false;
  }
}

async function toggleMaster() {
  const nextValue = !masterEnabled.value;

  switches.forEach((item) => {
    item.enabled = nextValue;
  });

  await persistSettings();
}

async function toggleItem(key: string) {
  const target = switches.find((item) => item.key === key);

  if (!target) {
    return;
  }

  target.enabled = !target.enabled;
  await persistSettings();
}

onMounted(() => {
  void loadSettings();
});
</script>

<template>
  <section class="message-settings-page">
    <header class="page-header">
      <button class="back-btn" type="button" aria-label="返回设置页" @click="goBack">
        <span class="back-arrow" aria-hidden="true"></span>
      </button>
      <h1>{{ mock.title }}</h1>
    </header>

    <main class="page-content">
      <section class="master-card">
        <span>{{ mock.masterLabel }}</span>
        <button
          class="switch"
          :class="{ 'switch--active': masterEnabled }"
          type="button"
          :aria-pressed="masterEnabled"
          :disabled="loading || saving"
          @click="toggleMaster"
        >
          <span class="switch-thumb"></span>
        </button>
      </section>

      <section class="list-card">
        <button
          v-for="item in switches"
          :key="item.key"
          class="setting-row"
          type="button"
          :disabled="loading || saving"
          @click="toggleItem(item.key)"
        >
          <span>{{ item.label }}</span>
          <span class="switch switch--small" :class="{ 'switch--active': item.enabled }" aria-hidden="true">
            <span class="switch-thumb"></span>
          </span>
        </button>
      </section>
    </main>
  </section>
</template>

<style scoped>
.message-settings-page {
  position: relative;
  left: 50%;
  width: min(390px, 100vw);
  min-height: min(844px, calc(100vh - 36px));
  margin: -18px 0;
  background: #f5f6f7;
  color: #2c322d;
  font-family: "HarmonyOS Sans SC", "MiSans", var(--ihc-font-family);
  transform: translateX(-50%);
  -webkit-font-smoothing: antialiased;
}

.page-header {
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr);
  align-items: center;
  gap: 10px;
  height: 70px;
  padding: 0 18px;
}

.back-btn,
.setting-row,
.switch {
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
  display: grid;
  gap: 18px;
  padding: 0 18px 24px;
}

.master-card,
.list-card {
  overflow: hidden;
  border-radius: 20px;
  background: #ffffff;
  box-shadow: inset 0 0 0 1px #eceff3;
}

.master-card {
  min-height: 84px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 18px;
  font-size: 16px;
  font-weight: 500;
}

.setting-row {
  width: 100%;
  min-height: 84px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 0 18px;
  border-top: 1px solid #eef1f4;
  text-align: left;
  font-size: 16px;
  font-weight: 500;
}

.setting-row:first-child {
  border-top: 0;
}

.switch {
  position: relative;
  width: 58px;
  height: 34px;
  border-radius: 999px;
  background: #d6d8de;
  transition: background 0.18s ease;
}

.switch--small {
  width: 48px;
  height: 28px;
  flex: 0 0 auto;
}

.switch--active {
  background: #6872f0;
}

.switch-thumb {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #ffffff;
  box-shadow: 0 2px 8px rgba(87, 96, 113, 0.18);
  transition: transform 0.18s ease;
}

.switch--small .switch-thumb {
  width: 22px;
  height: 22px;
}

.switch--active .switch-thumb {
  transform: translateX(24px);
}

.switch--small.switch--active .switch-thumb {
  transform: translateX(20px);
}
</style>

