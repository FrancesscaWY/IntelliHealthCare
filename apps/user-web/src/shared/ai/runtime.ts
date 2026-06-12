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

function ensureRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function normalizeSummaryLookupKey(key: string) {
  return key
    .replace(/([a-z])([A-Z])/g, "$1_$2")
    .replace(/[\s-]+/g, "_")
    .trim()
    .toLowerCase();
}

const summaryLabelMap: Record<string, string> = {
  hospital: "检查机构",
  department: "检查科室",
  diagnosis: "检查结论",
  result: "结果",
  note: "补充说明",
  notes: "补充说明",
  summary: "摘要",
  recommendation: "建议",
  recommendations: "建议",
  suggestion: "建议",
  suggestions: "建议",
  advice: "建议",
  follow_up: "后续跟进",
  follow_up_suggestions: "后续建议",
  follow_up_actions: "后续建议",
  blood_pressure: "血压",
  blood_glucose: "血糖",
  blood_lipid: "血脂",
  heart_rate: "心率",
  oxygen: "血氧",
  weight: "体重"
};

const hiddenSummaryKeys = new Set([
  "conclusion",
  "highlight",
  "highlights",
  "report_highlights",
  "advice",
  "suggestion",
  "suggestions",
  "recommendation",
  "recommendations",
  "follow_up",
  "follow_up_suggestions",
  "follow_up_actions",
  "patient",
  "doctor"
]);

function resolveSummaryLabel(key: string) {
  const lookupKey = normalizeSummaryLookupKey(key);

  if (summaryLabelMap[lookupKey]) {
    return summaryLabelMap[lookupKey];
  }

  return /[A-Za-z]/.test(key) ? "" : key.trim();
}

function collectSummaryTextList(value: unknown) {
  if (typeof value === "string" && value.trim()) {
    return [value.trim()];
  }

  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    .map((item) => item.trim());
}

function formatSummaryLine(label: string, text: string) {
  return label ? `${label}：${text}` : text;
}

function extractReportSummaryLines(value: unknown): string[] {
  const summary = ensureRecord(value);

  if (!summary) {
    return [];
  }

  const lines: string[] = [];
  const conclusion = collectSummaryTextList(summary.conclusion);

  if (conclusion.length > 0) {
    lines.push(...conclusion);
  }

  for (const [key, entry] of Object.entries(summary)) {
    const normalizedKey = normalizeSummaryLookupKey(key);

    if (hiddenSummaryKeys.has(normalizedKey)) {
      continue;
    }

    const label = resolveSummaryLabel(key);
    const textItems = collectSummaryTextList(entry);

    if (textItems.length > 0) {
      lines.push(formatSummaryLine(label, textItems.join("、")));
      continue;
    }

    const nestedRecord = ensureRecord(entry);

    if (!nestedRecord) {
      continue;
    }

    const outerLabel = resolveSummaryLabel(key);

    for (const [nestedKey, nestedValue] of Object.entries(nestedRecord)) {
      const nestedLabel = resolveSummaryLabel(nestedKey);
      const nestedTextItems = collectSummaryTextList(nestedValue);

      if (nestedTextItems.length === 0) {
        continue;
      }

      const combinedLabel = [outerLabel, nestedLabel].filter(Boolean).join(" / ");
      lines.push(formatSummaryLine(combinedLabel, nestedTextItems.join("、")));
    }
  }

  return uniqueStrings(lines);
}

function extractSummaryFieldList(value: unknown, candidateKeys: string[]) {
  const summary = ensureRecord(value);

  if (!summary) {
    return [];
  }

  const wantedKeys = new Set(candidateKeys.map((key) => normalizeSummaryLookupKey(key)));
  const list: string[] = [];

  for (const [key, entry] of Object.entries(summary)) {
    if (!wantedKeys.has(normalizeSummaryLookupKey(key))) {
      continue;
    }

    list.push(...collectSummaryTextList(entry));
  }

  return uniqueStrings(list);
}

function normalizeReportText(value: string) {
  return value
    .replace(/^[\s•·\-]+/u, "")
    .replace(/^[（(]?\d+[）).、]\s*/u, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeReportSentence(value: string) {
  return normalizeReportText(value)
    .replace(/^(内容评估|风险提醒|后续建议|建议|提示|摘要|结论|分析|重点)[：:]\s*/u, "")
    .replace(/[；;、，,]+$/u, "")
    .trim();
}

function ensureReportSentence(value: string) {
  const normalized = normalizeReportSentence(value);

  if (!normalized) {
    return "";
  }

  return /[。！？!?]$/u.test(normalized) ? normalized : `${normalized}。`;
}

function isDisplayEvaluationLine(value: string) {
  return !/^(检查机构|检查科室|医院|科室)[：:]/u.test(value.trim());
}

function splitKeywordCandidates(value: string) {
  const normalized = normalizeReportSentence(value);

  if (!normalized) {
    return [];
  }

  const segments = normalized
    .split(/[；;、，,]/u)
    .map((item) => normalizeReportSentence(item))
    .filter(Boolean);
  const nextSegments = segments.length > 1 ? segments : [normalized];

  return nextSegments.filter((item) => item.length >= 2 && item.length <= 18);
}

function buildReportKeywords(values: string[]) {
  const keywords: string[] = [];

  for (const value of values) {
    for (const candidate of splitKeywordCandidates(value)) {
      if (keywords.includes(candidate)) {
        continue;
      }

      keywords.push(candidate);

      if (keywords.length >= 4) {
        return keywords;
      }
    }
  }

  return keywords;
}

function buildEvaluationSummary(
  interpretation: string,
  highlights: string[],
  summaryLines: string[]
) {
  const preferred = [
    ensureReportSentence(interpretation),
    ...highlights.map((item) => ensureReportSentence(item)),
    ...summaryLines
      .filter((item) => isDisplayEvaluationLine(item))
      .map((item) => ensureReportSentence(item))
  ].find(Boolean);

  return preferred || "本次体检报告已完成智能评估，建议结合既往病史持续观察重点指标变化。";
}

function buildEvaluationPoints(highlights: string[], summaryLines: string[]) {
  return uniqueStrings(
    [
      ...highlights.map((item) => ensureReportSentence(item)),
      ...summaryLines
        .filter((item) => isDisplayEvaluationLine(item))
        .map((item) => ensureReportSentence(item))
    ].filter(Boolean)
  ).slice(0, 3);
}

function buildRiskReminderItems(riskSignals: string[]) {
  const items = uniqueStrings(riskSignals.map((item) => ensureReportSentence(item)).filter(Boolean));

  if (items.length > 0) {
    return items.slice(0, 3);
  }

  return ["当前未识别到需要立即处置的高风险提示，建议继续保持规律监测。"];
}

function buildFollowUpItems(followUpSuggestions: string[]) {
  const items = uniqueStrings(
    followUpSuggestions.map((item) => ensureReportSentence(item)).filter(Boolean)
  );

  if (items.length > 0) {
    return items.slice(0, 3);
  }

  return ["建议按既定周期复查重点指标，并在出现不适或指标波动时及时咨询医生。"];
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

  const summaryLines = extractReportSummaryLines(reportDetail?.summary);
  const summaryHighlights = extractSummaryFieldList(reportDetail?.summary, [
    "highlights",
    "highlight",
    "reportHighlights"
  ]);
  const summaryFollowUps = extractSummaryFieldList(reportDetail?.summary, [
    "advice",
    "suggestions",
    "recommendations",
    "followUpSuggestions",
    "followUpActions"
  ]);
  const highlights = uniqueStrings([
    ...summaryHighlights,
    ...(interpretation?.highlights ?? [])
  ]);
  const reportInterpretation =
    interpretation?.interpretation ||
    summaryLines[0] ||
    "暂无 AI 报告解读结果。";
  const riskSignals = uniqueStrings([
    ...(interpretation?.riskSignals ?? []),
    ...(followUp?.riskSignals ?? []),
    ...(latestRiskAlert ? [latestRiskAlert.summary] : [])
  ]);
  const followUpSuggestions = uniqueStrings([
    ...(interpretation?.followUpSuggestions ?? []),
    ...(followUp?.followUpSuggestions ?? []),
    ...summaryFollowUps
  ]);
  const keywords = uniqueStrings([
    ...((interpretation?.keywords ?? []).map((item) => normalizeReportSentence(item)).filter(Boolean)),
    ...buildReportKeywords([
      ...highlights,
      ...riskSignals,
      ...followUpSuggestions
    ])
  ]).slice(0, 4);

  const reportState: AiReportAnalysisState = {
    reportId,
    reportTitle: reportDetail?.title || "体检报告",
    keywords,
    summaryLines,
    highlights,
    interpretation: reportInterpretation,
    evaluationSummary: buildEvaluationSummary(reportInterpretation, highlights, summaryLines),
    evaluationPoints: buildEvaluationPoints(highlights, summaryLines),
    riskSignals,
    riskReminderItems: buildRiskReminderItems(riskSignals),
    followUpSuggestions,
    followUpItems: buildFollowUpItems(followUpSuggestions),
    latestRiskAlert,
    fetchedAt: new Date().toISOString(),
    errorMessage: collectSettledErrorMessage(settledResults)
  };

  setSelectedAiReportId(reportId);
  setAiReportAnalysisResult(reportState);
  return reportState;
}
