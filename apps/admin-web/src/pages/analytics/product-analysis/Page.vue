<script setup lang="ts">
import { onMounted, ref } from "vue";
import type { PageComponentProps } from "@ihc/page-core/types";
import { getAnalyticsProductAnalysis } from "@/shared/api/analytics";
import { handleAdminPageError } from "@/shared/api/error";
import SimpleTablePage from "../_shared/SimpleTablePage.vue";
import mock from "./mock";

type Column = {
  key: string;
  label: string;
  align?: "left" | "center" | "right";
  width?: string;
  minWidth?: string;
  nowrap?: boolean;
};

type ImageCell = {
  type: "image-text";
  image: string;
  primary: string;
  secondary?: string;
};

type Row = {
  info: ImageCell;
  category: string;
  browse: number;
  visitors: number;
  favorites: number;
  shares: number;
  payUsers: number;
  payOrders: number;
  amount: string;
  conversion: string;
};

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

<style scoped src="../_shared/analysis-ui.css"></style>

<style scoped>
.product-analysis-page {
  display: grid;
  gap: 16px;
  width: 100%;
  min-width: 0;
  color: #253244;
  font-family: "PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif;
}

.trade-hero,
.metrics-panel,
.metric-card,
.panel {
  border: 1px solid rgba(224, 240, 238, 0.86);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 8px 24px rgba(66, 122, 116, 0.08);
}

.trade-hero {
  position: relative;
  overflow: hidden;
  padding: 18px;
  background:
    radial-gradient(circle at top right, rgba(170, 235, 255, 0.34), transparent 26%),
    radial-gradient(circle at left top, rgba(102, 214, 174, 0.18), transparent 28%),
    linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(245, 251, 248, 0.96));
}

.trade-hero::after {
  content: "";
  position: absolute;
  right: -40px;
  top: -52px;
  width: 180px;
  height: 180px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(95, 224, 186, 0.2), rgba(95, 224, 186, 0));
  pointer-events: none;
}

.trade-hero__main {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
}

.trade-hero__eyebrow {
  margin: 0 0 8px;
  color: #4f8a7b;
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.trade-hero h1 {
  margin: 0;
  color: #1f6f67;
  font-size: 28px;
  font-weight: 900;
  line-height: 1.15;
}

.trade-hero__description {
  max-width: 700px;
  margin: 12px 0 0;
  color: #5d6876;
  font-size: 14px;
  font-weight: 600;
}

.date-range {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  min-height: 44px;
  padding: 0 14px;
  border: 1px solid rgba(218, 236, 231, 0.95);
  border-radius: 12px;
  background: #ffffff;
  color: #43515d;
}

.date-range--hero {
  flex: none;
  min-width: 260px;
  justify-content: space-between;
  align-self: center;
  box-shadow: 0 6px 18px rgba(66, 122, 116, 0.08);
}

.date-range__label {
  color: #8b96a1;
  font-size: 11px;
  font-weight: 800;
}

.date-range strong {
  font-size: 12px;
  font-weight: 800;
}

.date-range svg,
.filter-field__icon--calendar {
  width: 18px;
  height: 18px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.panel {
  min-width: 0;
  padding: 16px;
  overflow: hidden;
}

.panel-head {
  margin-bottom: 12px;
}

.panel-head--between {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}

.panel-head h2 {
  margin: 0;
  color: #1f6f67;
  font-size: 18px;
  font-weight: 900;
  line-height: 1.2;
}

.panel-head small {
  color: #557c77;
  font-size: 14px;
  font-weight: 900;
}

.panel-subtitle {
  margin: 8px 0 0;
  color: #697483;
  font-size: 12px;
  font-weight: 700;
}

.filter-panel {
  background:
    radial-gradient(circle at top left, rgba(110, 215, 183, 0.08), transparent 34%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(246, 251, 248, 0.96));
}

.dashboard-filter {
  padding: 2px 0 0;
}

.metrics-panel {
  padding: 16px;
}

.metrics-panel__head {
  margin-bottom: 12px;
}

.metrics-panel__head h2 {
  margin: 0;
  color: #1f6f67;
  font-size: 18px;
  font-weight: 900;
  line-height: 1.2;
}

.metric-grid {
  display: grid;
  gap: 12px;
}

.metric-grid--product {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.metric-card {
  position: relative;
  min-height: 108px;
  padding: 14px 16px;
  overflow: hidden;
}

.metric-card::after {
  content: "";
  position: absolute;
  right: -14px;
  bottom: -16px;
  width: 86px;
  height: 86px;
  border-radius: 50%;
  background: radial-gradient(circle, color-mix(in srgb, var(--tone) 16%, #ffffff), transparent 72%);
}

.metric-card--green {
  --tone: #4dbc8c;
}

.metric-card--teal {
  --tone: #5aaef5;
}

.metric-card--amber {
  --tone: #ffa63d;
}

.metric-card--blue {
  --tone: #7b8dff;
}

.metric-copy {
  position: relative;
  z-index: 1;
}

.metric-copy strong {
  display: block;
  color: #263244;
  font-size: 32px;
  font-weight: 900;
  line-height: 1;
}

.metric-copy h2 {
  margin: 10px 0 0;
  color: #55616f;
  font-size: 13px;
  font-weight: 900;
}

.metric-copy p {
  margin: 8px 0 0;
  color: var(--tone);
  font-size: 12px;
  font-weight: 800;
}

.trade-grid--product {
  display: grid;
  grid-template-columns: minmax(0, 1.25fr) minmax(340px, 0.92fr);
  gap: 12px;
}

.chart-panel {
  display: grid;
  align-content: start;
}

.chart-panel--wide {
  background:
    radial-gradient(circle at top left, rgba(145, 226, 178, 0.14), transparent 30%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(247, 251, 249, 0.96));
}

.chart-box {
  width: 100%;
}

.chart-box--bar {
  height: 360px;
}

.chart-card__canvas--ring {
  min-width: 240px;
  height: 300px;
}

.chart-legend {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin: 6px auto 0;
  color: #64707b;
  font-size: 12px;
  font-weight: 800;
}

.chart-legend__dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: linear-gradient(135deg, #91e2b2, #4dbc8c);
  box-shadow: 0 0 0 3px rgba(235, 247, 243, 0.9);
}

.ring-panel {
  display: grid;
  align-items: center;
  gap: 10px;
}

.ring-panel--panel {
  grid-template-columns: minmax(220px, 1fr) minmax(220px, 1fr);
}

.side-legend {
  display: grid;
  gap: 10px;
}

.side-legend__row {
  display: grid;
  grid-template-columns: 10px minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 8px;
  padding: 12px;
  border: 1px solid rgba(224, 240, 238, 0.86);
  border-radius: 10px;
  background: linear-gradient(180deg, rgba(244, 251, 247, 0.98), rgba(255, 255, 255, 0.96));
  color: #5f6d79;
}

.side-legend__row i {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.side-legend__row strong {
  color: #33404d;
  font-size: 12px;
  font-weight: 700;
}

.side-legend__row em {
  color: #8b96a1;
  font-style: normal;
  font-weight: 700;
}

.table-panel {
  background:
    radial-gradient(circle at top right, rgba(170, 235, 255, 0.2), transparent 22%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(247, 251, 249, 0.96));
}

.ghost-button {
  min-width: 118px;
  height: 40px;
  padding: 0 16px;
  border: 1px solid #dfe9e4;
  border-radius: 12px;
  background: #ffffff;
  color: #33404d;
  font-size: 13px;
  font-weight: 700;
}

.ghost-button--compact {
  min-width: 96px;
  height: 38px;
  padding: 0 14px;
}

.image-cell {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.image-cell img {
  width: 64px;
  height: 64px;
  border-radius: 14px;
  object-fit: cover;
  background: #eef4f1;
  box-shadow: 0 8px 18px rgba(51, 97, 88, 0.08);
}

.image-cell__text {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.image-cell__text strong {
  color: #2f3946;
  font-size: 12px;
  font-weight: 700;
}

.image-cell__text span {
  color: #8b96a1;
  font-size: 11px;
}

@media (max-width: 1280px) {
  .metric-grid--product {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .trade-grid--product,
  .ring-panel--panel {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 780px) {
  .trade-hero__main,
  .panel-head--between {
    flex-direction: column;
  }

  .date-range--hero,
  .metric-grid--product {
    width: 100%;
  }

  .metric-grid--product {
    grid-template-columns: 1fr;
  }

  .chart-box--bar,
  .chart-card__canvas--ring {
    height: 300px;
  }
}
</style>
