import {
  createAiOrderPrefill,
  createAiServiceRecommendations,
  getAiHealthMetricExplanations,
  getAiHealthSummary,
  getAiReportFollowUpSuggestions,
  getAiReportInterpretation,
  getAiRiskAlertDetail,
  listAiRiskAlerts,
  searchAiKnowledge,
  type AiKnowledgeSearchResult,
  type AiServiceCategory,
  type ServiceRecommendationItem
} from "@/shared/api/ai";
import { getCheckupReport, listCheckupReports } from "@/shared/api/reports";
import { getAiServiceImage } from "@/shared/ai/service-assets";
import {
  normalizeBookingPrefill,
  setAiReportAnalysisResult,
  setAiServiceRecommendationResult,
  setSelectedAiReportId,
  type AiReportAnalysisState,
  type AiServiceRecommendationState,
  type AiServiceScene,
  type NormalizedAiRecommendation
} from "@/shared/ai/state";

interface SceneConfig {
  scene: AiServiceScene;
  title: string;
  category: AiServiceCategory;
  query: string;
  bookingRequest: string;
  knowledgeQuery: string;
  metricTypes: string[];
}

const sceneConfigMap: Record<AiServiceScene, SceneConfig> = {
  "home-care": {
    scene: "home-care",
    title: "家政护理",
    category: "HOME_CARE",
    query: "需要适合居家长者的家政护理与生活照护服务",
    bookingRequest: "帮我预约适合长者的家政护理服务",
    knowledgeQuery: "居家照护 家政护理 老人照护",
    metricTypes: ["bloodPressure", "heartRate", "sleep"]
  },
  "home-exam": {
    scene: "home-exam",
    title: "上门体检",
    category: "HOME_EXAM",
    query: "需要适合长者慢病管理的上门体检项目",
    bookingRequest: "帮我预约上门体检并给出合适时间",
    knowledgeQuery: "上门体检 慢病 体检准备",
    metricTypes: ["bloodPressure", "bloodGlucose", "oxygen"]
  },
  rehab: {
    scene: "rehab",
    title: "康复理疗",
    category: "REHAB_THERAPY",
    query: "需要适合长者康复训练与理疗的上门服务",
    bookingRequest: "帮我预约上门康复评估和训练服务",
    knowledgeQuery: "康复训练 居家理疗 长者康复",
    metricTypes: ["heartRate", "steps", "sleep"]
  }
};

function normalizeServiceRecommendations(
  items: ServiceRecommendationItem[]
): NormalizedAiRecommendation[] {
  return items.map((item) => ({
    serviceId: item.serviceId,
    title: item.title,
    category: item.category,
    price: item.price,
    priceLabel: `¥${item.price.toFixed(0)}`,
    reason: item.reason,
    regionScope: item.regionScope,
    imageUrl: item.imageUrl || getAiServiceImage(item.serviceId, item.category)
  }));
}

function collectSettledErrorMessage(results: PromiseSettledResult<unknown>[]) {
  const messages = results
    .filter((item): item is PromiseRejectedResult => item.status === "rejected")
    .map((item) => (item.reason instanceof Error ? item.reason.message : "AI 请求失败"));

  return messages[0] || "";
}

function ensureStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
}

function flattenSummaryRecord(value: unknown): string[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return [];
  }

  const lines: string[] = [];

  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry === "string" && entry.trim()) {
      lines.push(entry.trim());
      continue;
    }

    if (Array.isArray(entry)) {
      const items = entry
        .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
        .map((item) => item.trim());

      if (items.length > 0) {
        lines.push(`${key}：${items.join("、")}`);
      }
    }
  }

  return lines;
}

function uniqueStrings(items: string[]) {
  return Array.from(new Set(items.filter((item) => item.trim().length > 0)));
}

function pickKnowledgeResults(results?: AiKnowledgeSearchResult[]) {
  return Array.isArray(results) ? results.slice(0, 3) : [];
}

export async function prepareAiServiceScene(scene: AiServiceScene) {
  const config = sceneConfigMap[scene];

  const settledResults = await Promise.allSettled([
    createAiServiceRecommendations({
      category: config.category,
      query: config.query,
      limit: 5
    }),
    createAiOrderPrefill({
      serviceRequest: config.bookingRequest
    }),
    getAiHealthSummary({
      metricTypes: config.metricTypes
    }),
    getAiHealthMetricExplanations({
      metricTypes: config.metricTypes
    }),
    searchAiKnowledge({
      query: config.knowledgeQuery,
      limit: 3
    })
  ]);

  const recommendationResult =
    settledResults[0].status === "fulfilled" ? settledResults[0].value : null;
  const prefillResult = settledResults[1].status === "fulfilled" ? settledResults[1].value : null;
  const healthSummaryResult =
    settledResults[2].status === "fulfilled" ? settledResults[2].value : null;
  const metricBriefResult =
    settledResults[3].status === "fulfilled" ? settledResults[3].value : null;
  const knowledgeResult = settledResults[4].status === "fulfilled" ? settledResults[4].value : null;

  const nextState: AiServiceRecommendationState = {
    scene,
    title: config.title,
    category: config.category,
    query: config.query,
    conclusion:
      recommendationResult?.conclusion ||
      healthSummaryResult?.summary ||
      "已为您生成 AI 推荐结果。",
    matchingSignals: uniqueStrings([
      ...(recommendationResult?.matchingSignals ?? []),
      ...(healthSummaryResult?.riskSignals ?? []),
      ...(metricBriefResult?.keyFindings ?? [])
    ]),
    recommendations: normalizeServiceRecommendations(recommendationResult?.recommendations ?? []),
    bookingPrefill: prefillResult ? normalizeBookingPrefill(prefillResult.bookingPrefill) : null,
    rankingReasons: prefillResult?.rankingReasons ?? [],
    missingInfo: prefillResult?.missingInfo ?? [],
    healthSummary: healthSummaryResult
      ? {
          summary: healthSummaryResult.summary,
          keyFindings: healthSummaryResult.keyFindings,
          riskSignals: healthSummaryResult.riskSignals,
          followUpSuggestions: healthSummaryResult.followUpSuggestions
        }
      : null,
    metricBrief: metricBriefResult
      ? {
          brief: metricBriefResult.brief,
          keyFindings: metricBriefResult.keyFindings,
          riskSignals: metricBriefResult.riskSignals,
          followUpSuggestions: metricBriefResult.followUpSuggestions
        }
      : null,
    knowledgeResults: pickKnowledgeResults(knowledgeResult?.results),
    fetchedAt: new Date().toISOString(),
    errorMessage: collectSettledErrorMessage(settledResults)
  };

  setAiServiceRecommendationResult(scene, nextState);
  return nextState;
}

export async function resolveAiReportId() {
  const reportList = await listCheckupReports({
    page: 1,
    pageSize: 1
  });
  const reportId = reportList.list[0]?.reportId || "";

  if (reportId) {
    setSelectedAiReportId(reportId);
  }

  return reportId;
}

export async function prepareAiReportAnalysis(reportId: string) {
  const settledResults = await Promise.allSettled([
    getCheckupReport(reportId),
    getAiReportInterpretation(reportId),
    getAiReportFollowUpSuggestions(reportId),
    listAiRiskAlerts({
      page: 1,
      pageSize: 1
    })
  ]);

  const reportDetail = settledResults[0].status === "fulfilled" ? settledResults[0].value : null;
  const interpretation = settledResults[1].status === "fulfilled" ? settledResults[1].value : null;
  const followUp = settledResults[2].status === "fulfilled" ? settledResults[2].value : null;
  const riskAlerts = settledResults[3].status === "fulfilled" ? settledResults[3].value : null;

  let latestRiskAlert = null;
  const firstAlertId = riskAlerts?.list[0]?.alertId || "";

  if (firstAlertId) {
    try {
      latestRiskAlert = await getAiRiskAlertDetail(firstAlertId);
    } catch {
      latestRiskAlert = null;
    }
  }

  const reportState: AiReportAnalysisState = {
    reportId,
    reportTitle: reportDetail?.title || "体检报告",
    summaryLines: flattenSummaryRecord(reportDetail?.summary),
    highlights: uniqueStrings([
      ...ensureStringArray((reportDetail?.summary as Record<string, unknown> | undefined)?.highlights),
      ...(interpretation?.highlights ?? [])
    ]),
    interpretation:
      interpretation?.interpretation ||
      flattenSummaryRecord(reportDetail?.summary)[0] ||
      "暂无 AI 报告解读结果。",
    riskSignals: uniqueStrings([
      ...(interpretation?.riskSignals ?? []),
      ...(followUp?.riskSignals ?? []),
      ...(latestRiskAlert ? [latestRiskAlert.summary] : [])
    ]),
    followUpSuggestions: uniqueStrings([
      ...(interpretation?.followUpSuggestions ?? []),
      ...(followUp?.followUpSuggestions ?? [])
    ]),
    latestRiskAlert,
    fetchedAt: new Date().toISOString(),
    errorMessage: collectSettledErrorMessage(settledResults)
  };

  setSelectedAiReportId(reportId);
  setAiReportAnalysisResult(reportState);
  return reportState;
}
