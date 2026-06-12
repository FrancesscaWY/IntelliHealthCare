import { computed, ref } from "vue";
import { hasUserAuthSession } from "@/shared/auth/session";
import { ApiClientError } from "@/shared/api/client";
import {
  completeFileUpload,
  createFilePresign,
  getFileInfo,
  uploadFileByPresign
} from "@/shared/api/files";
import {
  createCheckupReport,
  deleteCheckupReport,
  getCheckupReport,
  getCheckupReportInterpretation,
  listCheckupReports,
  type CheckupReportAttachment,
  type CheckupReportDetail,
  type CheckupReportInterpretationResponse,
  type ReportListItem
} from "@/shared/api/health-reports";

export type ReportField = {
  label: string;
  value: string;
};

export type ReportMetric = {
  name: string;
  result: string;
  unit: string;
  reference: string;
};

export type ReportInterpretation = {
  title: string;
  content: string;
};

export type AttachmentPreviewKind = "image" | "pdf" | "unsupported";

export type HealthCheckReport = {
  id: string;
  title: string;
  status: string;
  statusText: string;
  source: string;
  reportTime: string;
  uploadTime: string;
  hospital: string;
  reportName: string;
  patient: ReportField[];
  metrics: ReportMetric[];
  doctors: ReportField[];
  reviewTime: string;
  conclusion: string;
  interpretationHeading: string;
  interpretationDoctor: string;
  interpretationTime: string;
  interpretationNotes: ReportInterpretation[];
  interpretationSuggestion: string;
  attachmentName?: string;
  attachmentType?: string;
  attachmentUrl?: string;
  attachmentFileId?: string;
  attachmentPreviewKind?: AttachmentPreviewKind;
};

export type UploadReportOptions = {
  title?: string;
  reportDate?: string;
};

const demoReports: HealthCheckReport[] = [
  {
    id: "demo-report-001",
    title: "春季体检报告",
    status: "DEMO",
    statusText: "演示数据",
    source: "本地演示",
    reportTime: "2026-04-16 09:30",
    uploadTime: "2026-04-16 09:35",
    hospital: "智诊康养健康中心",
    reportName: "春季体检报告",
    patient: [
      { label: "姓名", value: "张爱渝" },
      { label: "状态", value: "演示数据" },
      { label: "上传时间", value: "2026-04-16 09:35" }
    ],
    metrics: [
      { name: "血压", result: "128/82", unit: "mmHg", reference: "90/60-140/90" },
      { name: "血糖", result: "5.4", unit: "mmol/L", reference: "3.9-6.1" }
    ],
    doctors: [
      { label: "处理状态", value: "演示数据" },
      { label: "审核时间", value: "2026-04-16 10:00" }
    ],
    reviewTime: "2026-04-16 10:00",
    conclusion: "当前为演示数据。登录后可查看真实报告列表并上传附件。",
    interpretationHeading: "报告解读",
    interpretationDoctor: "系统",
    interpretationTime: "2026-04-16 10:00",
    interpretationNotes: [
      {
        title: "演示说明",
        content: "当前页面会在已登录状态下自动切换到真实 API 数据。"
      }
    ],
    interpretationSuggestion: "登录后可上传 PDF 或图片报告并同步到健康档案。"
  }
];

const reports = ref<HealthCheckReport[]>(cloneReports(demoReports));
const currentReportId = ref(reports.value[0]?.id || "");
const reportCount = computed(() => reports.value.length);
const isReportsLoading = ref(false);
const reportsLoaded = ref(false);
const reportsError = ref("");
const isCurrentReportLoading = ref(false);
const isUploadingReport = ref(false);

function cloneReports(source: HealthCheckReport[]) {
  return source.map((item) => ({
    ...item,
    patient: item.patient.map((field) => ({ ...field })),
    metrics: item.metrics.map((metric) => ({ ...metric })),
    doctors: item.doctors.map((field) => ({ ...field })),
    interpretationNotes: item.interpretationNotes.map((note) => ({ ...note }))
  }));
}

function ensureCurrentReport() {
  if (!reports.value.some((item) => item.id === currentReportId.value)) {
    currentReportId.value = reports.value[0]?.id || "";
  }
}

function formatDisplayTime(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  return String(value).replace("T", " ").slice(0, 16);
}

function formatNow() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

function getReportTitle(fileName: string) {
  const plainName = fileName.replace(/\.[^.]+$/, "").trim();
  return plainName || "上传体检报告";
}

function formatFileSize(size: number) {
  if (size >= 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(1)}MB`;
  }

  return `${Math.max(1, Math.round(size / 1024))}KB`;
}

function getAttachmentPreviewKind(file: Pick<File, "name" | "type">): AttachmentPreviewKind {
  const fileName = file.name.toLowerCase();
  const fileType = file.type.toLowerCase();

  if (fileType.startsWith("image/") || /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(fileName)) {
    return "image";
  }

  if (fileType === "application/pdf" || /\.pdf$/i.test(fileName)) {
    return "pdf";
  }

  return "unsupported";
}

function isBrokenAttachmentUrl(value: string | null | undefined) {
  return typeof value === "string" && value.includes(".intellihealthcare.demo/");
}

function statusToText(status: string) {
  switch (status) {
    case "PUBLISHED":
      return "已归档";
    case "PENDING_REVIEW":
      return "待审核";
    case "ARCHIVED":
      return "已归档";
    case "DRAFT":
      return "草稿";
    case "DEMO":
      return "演示数据";
    default:
      return status || "未知状态";
  }
}

function normalizeText(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return "--";
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return JSON.stringify(value);
}

function startCaseLabel(value: string) {
  return value
    .replace(/[_-]+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function buildFields(section: unknown, fallback: ReportField[]) {
  if (!section || typeof section !== "object" || Array.isArray(section)) {
    return fallback;
  }

  const entries = Object.entries(section as Record<string, unknown>);
  if (entries.length === 0) {
    return fallback;
  }

  return entries.map(([key, value]) => ({
    label: startCaseLabel(key),
    value: normalizeText(value)
  }));
}

function buildMetrics(summary: Record<string, unknown> | null, attachmentName?: string) {
  const metrics: ReportMetric[] = [];

  if (summary) {
    for (const [key, value] of Object.entries(summary)) {
      if (key === "patient" || key === "doctor" || key === "conclusion" || key === "highlights") {
        continue;
      }

      if (Array.isArray(value)) {
        metrics.push({
          name: startCaseLabel(key),
          result: value.map((item) => normalizeText(item)).join("、"),
          unit: "--",
          reference: "--"
        });
        continue;
      }

      if (value && typeof value === "object") {
        for (const [nestedKey, nestedValue] of Object.entries(value as Record<string, unknown>)) {
          metrics.push({
            name: `${startCaseLabel(key)} / ${startCaseLabel(nestedKey)}`,
            result: normalizeText(nestedValue),
            unit: "--",
            reference: "--"
          });
        }
        continue;
      }

      metrics.push({
        name: startCaseLabel(key),
        result: normalizeText(value),
        unit: "--",
        reference: "--"
      });
    }
  }

  if (metrics.length === 0 && attachmentName) {
    metrics.push({
      name: "附件",
      result: attachmentName,
      unit: "--",
      reference: "--"
    });
  }

  return metrics;
}

function toReportFromCard(item: ReportListItem): HealthCheckReport {
  const reportTime = formatDisplayTime(item.publishedAt || item.createdAt) || formatNow();

  return {
    id: item.reportId,
    title: item.title,
    status: item.status,
    statusText: statusToText(item.status),
    source: "健康档案",
    reportTime,
    uploadTime: formatDisplayTime(item.createdAt) || reportTime,
    hospital: "健康档案中心",
    reportName: item.title,
    patient: [
      { label: "报告编号", value: item.reportId },
      { label: "状态", value: statusToText(item.status) }
    ],
    metrics: [],
    doctors: [{ label: "处理状态", value: statusToText(item.status) }],
    reviewTime: formatDisplayTime(item.publishedAt) || "",
    conclusion: "报告已同步到健康档案，可继续查看详情或进入解读页。",
    interpretationHeading: "报告解读",
    interpretationDoctor: "系统",
    interpretationTime: formatDisplayTime(item.publishedAt || item.createdAt) || "",
    interpretationNotes: [
      {
        title: "状态说明",
        content: `当前报告状态为“${statusToText(item.status)}”。`
      }
    ],
    interpretationSuggestion: "建议先查看原始报告，再结合解读关注重点指标。"
  };
}

function toReportFromDetail(
  detail: CheckupReportDetail,
  fileInfo: {
    fileId?: string | null;
    fileName?: string | null;
    mimeType?: string | null;
    url?: string | null;
    size?: number | null;
  } | null,
  interpretation: CheckupReportInterpretationResponse | null
) {
  const summary = detail.summary ?? null;
  const attachment = detail.attachment ?? null;
  const attachmentName = fileInfo?.fileName || attachment?.fileName || undefined;
  const attachmentType = fileInfo?.mimeType || attachment?.mimeType || undefined;
  const attachmentUrlCandidate = fileInfo?.url || attachment?.url || undefined;
  const attachmentUrl = isBrokenAttachmentUrl(attachmentUrlCandidate) ? undefined : attachmentUrlCandidate;
  const reportTime = formatDisplayTime(detail.publishedAt || detail.createdAt) || formatNow();
  const highlights = Array.isArray(summary?.highlights) ? summary.highlights : [];
  const notes: ReportInterpretation[] = [
    ...highlights.map((item, index) => ({
      title: `重点提示 ${index + 1}`,
      content: normalizeText(item)
    })),
    ...((interpretation?.followupSuggestions || []).map((item, index) => ({
      title: `建议 ${index + 1}`,
      content: item
    })) as ReportInterpretation[])
  ];

  return {
    id: detail.reportId,
    title: detail.title,
    status: detail.status,
    statusText: statusToText(detail.status),
    source: attachmentName ? "用户上传附件" : "健康档案",
    reportTime,
    uploadTime: formatDisplayTime(detail.createdAt) || reportTime,
    hospital:
      typeof summary?.hospital === "string" && summary.hospital.trim()
        ? summary.hospital
        : "健康档案中心",
    reportName: detail.title,
    patient: buildFields(summary?.patient, [
      { label: "报告编号", value: detail.reportId },
      { label: "状态", value: statusToText(detail.status) },
      { label: "上传时间", value: formatDisplayTime(detail.createdAt) || "--" }
    ]),
    metrics: buildMetrics(summary, attachmentName),
    doctors: buildFields(summary?.doctor, [
      { label: "处理状态", value: statusToText(detail.status) },
      { label: "审核时间", value: formatDisplayTime(detail.reviewedAt) || "--" }
    ]),
    reviewTime: formatDisplayTime(detail.reviewedAt) || "",
    conclusion:
      (typeof summary?.conclusion === "string" && summary.conclusion) ||
      interpretation?.interpretation ||
      "暂未生成结构化结论，请先查看原始附件。",
    interpretationHeading: "报告解读",
    interpretationDoctor: "系统",
    interpretationTime: formatDisplayTime(detail.reviewedAt || detail.publishedAt || detail.createdAt) || "",
    interpretationNotes:
      notes.length > 0
        ? notes
        : [
            {
              title: "解读状态",
              content: "该报告已同步到健康档案，可继续查看原始附件。"
            }
          ],
    interpretationSuggestion:
      interpretation?.followupSuggestions?.join("；") || "建议先查看原始报告，再结合健康数据继续跟踪。",
    attachmentName,
    attachmentType,
    attachmentUrl,
    attachmentFileId: fileInfo?.fileId || attachment?.fileId || undefined,
    attachmentPreviewKind: attachmentName
      ? getAttachmentPreviewKind({
          name: attachmentName,
          type: attachmentType || ""
        })
      : undefined
  } satisfies HealthCheckReport;
}

function mergeReport(nextReport: HealthCheckReport) {
  const nextReports = [...reports.value];
  const index = nextReports.findIndex((item) => item.id === nextReport.id);

  if (index >= 0) {
    nextReports.splice(index, 1, nextReport);
  } else {
    nextReports.unshift(nextReport);
  }

  reports.value = nextReports;
}

async function fetchReportDetailBundle(reportId: string) {
  const detail = await getCheckupReport(reportId);
  const attachment = detail.attachment as CheckupReportAttachment | null;
  const [fileInfo, interpretation] = await Promise.all([
    attachment?.fileId ? getFileInfo(String(attachment.fileId)).catch(() => null) : Promise.resolve(null),
    getCheckupReportInterpretation(reportId).catch(() => null)
  ]);

  return toReportFromDetail(detail, fileInfo, interpretation);
}

export function useReportCenter() {
  const currentReport = computed(() => {
    ensureCurrentReport();
    return reports.value.find((item) => item.id === currentReportId.value) || null;
  });

  async function ensureReportsLoaded(force = false) {
    if (isReportsLoading.value) {
      return;
    }

    if (reportsLoaded.value && !force) {
      return;
    }

    reportsLoaded.value = true;
    reportsError.value = "";

    if (!hasUserAuthSession()) {
      reports.value = cloneReports(demoReports);
      ensureCurrentReport();
      return;
    }

    isReportsLoading.value = true;

    try {
      const response = await listCheckupReports({
        page: 1,
        pageSize: 50
      });

      reports.value = response.list.map((item) => {
        const existing = reports.value.find((report) => report.id === item.reportId);
        return existing && existing.metrics.length > 0 ? existing : toReportFromCard(item);
      });
      ensureCurrentReport();

      if (currentReportId.value) {
        void ensureCurrentReportReady(currentReportId.value);
      }
    } catch (error) {
      reportsError.value = error instanceof Error ? error.message : "报告列表加载失败";
    } finally {
      isReportsLoading.value = false;
    }
  }

  async function ensureCurrentReportReady(reportId = currentReportId.value, force = false) {
    if (!reportId) {
      return null;
    }

    const existing = reports.value.find((item) => item.id === reportId) || null;

    if (!hasUserAuthSession()) {
      return existing;
    }

    if (existing?.metrics.length && !force) {
      return existing;
    }

    isCurrentReportLoading.value = true;

    try {
      const nextReport = await fetchReportDetailBundle(reportId);
      mergeReport(nextReport);
      return nextReport;
    } catch (error) {
      if (!existing) {
        throw error;
      }
      return existing;
    } finally {
      isCurrentReportLoading.value = false;
    }
  }

  function selectReport(reportId: string) {
    currentReportId.value = reportId;
    ensureCurrentReport();
    void ensureCurrentReportReady(reportId);
  }

  async function removeReport(reportId: string) {
    if (hasUserAuthSession()) {
      await deleteCheckupReport(reportId);
    }

    reports.value = reports.value.filter((item) => item.id !== reportId);
    ensureCurrentReport();
  }

  async function removeCurrentReport() {
    if (!currentReport.value) {
      return;
    }

    await removeReport(currentReport.value.id);
  }

  async function addUploadedReport(file: File, options: UploadReportOptions = {}) {
    if (!hasUserAuthSession()) {
      throw new ApiClientError("请先登录后再上传报告");
    }

    isUploadingReport.value = true;

    try {
      const title = options.title?.trim() || getReportTitle(file.name);
      const reportDate = options.reportDate || new Date().toISOString().slice(0, 10);
      const mimeType = file.type || "application/octet-stream";
      const presign = await createFilePresign({
        category: "REPORT",
        fileName: file.name,
        mimeType,
        size: file.size
      });

      await uploadFileByPresign(presign, file);

      const uploadedFile = await completeFileUpload({
        category: "REPORT",
        fileName: file.name,
        objectKey: presign.objectKey,
        mimeType,
        size: file.size,
        metadata: {
          reportDate,
          originalName: file.name,
          lastModified: file.lastModified
        }
      });

      const createdReport = await createCheckupReport({
        title,
        summary: {
          reportDate,
          attachmentName: file.name,
          attachmentType: mimeType,
          attachmentSize: formatFileSize(file.size),
          uploadSource: "手动上传",
          conclusion: "报告原件已上传成功，可查看附件并等待进一步解读。",
          highlights: ["已完成文件上传", "已同步到健康档案"]
        },
        attachment: {
          fileId: uploadedFile.fileId,
          fileName: uploadedFile.fileName,
          url: uploadedFile.url,
          mimeType: uploadedFile.mimeType
        }
      });

      currentReportId.value = createdReport.reportId;
      await ensureReportsLoaded(true);
      return createdReport.reportId;
    } finally {
      isUploadingReport.value = false;
    }
  }

  return {
    reports,
    currentReportId,
    currentReport,
    reportCount,
    isReportsLoading,
    reportsError,
    isCurrentReportLoading,
    isUploadingReport,
    ensureReportsLoaded,
    ensureCurrentReportReady,
    selectReport,
    removeReport,
    removeCurrentReport,
    addUploadedReport
  };
}
