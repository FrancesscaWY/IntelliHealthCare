import { computed, ref } from "vue";

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
  attachmentPreviewKind?: AttachmentPreviewKind;
};

export type UploadReportOptions = {
  title?: string;
  reportDate?: string;
};

const initialReports: HealthCheckReport[] = [
  {
    id: "cbc-20240324",
    title: "血脂四项检查",
    source: "上门体检",
    reportTime: "2024-03-24 10:23",
    uploadTime: "2024-03-25 10:23",
    hospital: "上海市某某医院",
    reportName: "血脂四项检查报告",
    patient: [
      { label: "姓名", value: "张爱清" },
      { label: "病历号", value: "" },
      { label: "样本号", value: "34" },
      { label: "性别", value: "女" },
      { label: "年龄", value: "65" },
      { label: "科别", value: "老年科" },
      { label: "送检医生", value: "王伟" },
      { label: "送检日期", value: "2024-03-24" },
      { label: "样本类型", value: "血清" },
      { label: "备注", value: "" },
    ],
    metrics: [
      { name: "总胆固醇", result: "5.4 ↑", unit: "mmol/L", reference: "<5.20" },
      { name: "甘油三酯", result: "1.4", unit: "mmol/L", reference: "<1.70" },
      { name: "高密度脂蛋白胆固醇", result: "0.96 ↓", unit: "mmol/L", reference: ">1.04" },
      { name: "低密度脂蛋白胆固醇", result: "3.6 ↑", unit: "mmol/L", reference: "<3.40" },
    ],
    doctors: [
      { label: "报告医生", value: "王晓倩" },
      { label: "审核医生", value: "王伟" },
      { label: "签名", value: "" },
    ],
    reviewTime: "2024-03-24 10:40",
    conclusion:
      "总胆固醇及低密度脂蛋白胆固醇偏高，高密度脂蛋白胆固醇偏低，建议结合饮食与运动管理，按医嘱复查。",
    interpretationHeading: "体检报告解读",
    interpretationDoctor: "王晓倩",
    interpretationTime: "2024-03-24 10:40",
    interpretationNotes: [
      {
        title: "总胆固醇",
        content:
          "当前总胆固醇略高于参考范围上限，建议减少高脂肪饮食，配合规律运动，并持续关注后续复查结果。",
      },
      {
        title: "高密度脂蛋白胆固醇",
        content:
          "该指标偏低，提示心血管保护作用有所减弱，建议增加步行、骑行等有氧活动，并注意作息规律。",
      },
      {
        title: "低密度脂蛋白胆固醇",
        content:
          "该指标偏高，需重点关注饮食结构与体重管理，必要时在医生指导下进一步评估是否需要干预。",
      },
    ],
    interpretationSuggestion:
      "建议保持清淡饮食，减少高油高糖摄入，适量增加蔬果和优质蛋白，同时坚持每周规律运动，并按时复查血脂。",
  },
  {
    id: "cbc-20240218",
    title: "血脂四项复查",
    source: "上门体检",
    reportTime: "2024-02-18 09:16",
    uploadTime: "2024-02-19 09:40",
    hospital: "上海市某某医院",
    reportName: "血脂四项复查报告",
    patient: [
      { label: "姓名", value: "张爱清" },
      { label: "病历号", value: "" },
      { label: "样本号", value: "29" },
      { label: "性别", value: "女" },
      { label: "年龄", value: "65" },
      { label: "科别", value: "老年科" },
      { label: "送检医生", value: "王伟" },
      { label: "送检日期", value: "2024-02-18" },
      { label: "样本类型", value: "血清" },
      { label: "备注", value: "" },
    ],
    metrics: [
      { name: "总胆固醇", result: "5.1", unit: "mmol/L", reference: "<5.20" },
      { name: "甘油三酯", result: "1.6", unit: "mmol/L", reference: "<1.70" },
      { name: "高密度脂蛋白胆固醇", result: "1.02 ↓", unit: "mmol/L", reference: ">1.04" },
      { name: "低密度脂蛋白胆固醇", result: "3.3", unit: "mmol/L", reference: "<3.40" },
    ],
    doctors: [
      { label: "报告医生", value: "王晓倩" },
      { label: "审核医生", value: "王伟" },
      { label: "签名", value: "" },
    ],
    reviewTime: "2024-02-18 10:08",
    conclusion: "本次血脂整体接近正常，建议继续保持规律饮食与作息，并重点关注高密度脂蛋白胆固醇。",
    interpretationHeading: "体检报告解读",
    interpretationDoctor: "王晓倩",
    interpretationTime: "2024-02-18 10:08",
    interpretationNotes: [
      {
        title: "总胆固醇",
        content: "当前总胆固醇处于参考范围内，整体脂质代谢控制较稳定，可继续保持现有生活方式。",
      },
      {
        title: "甘油三酯",
        content: "该指标接近上限，建议减少夜宵和高糖食物摄入，避免体重继续波动。",
      },
      {
        title: "高密度脂蛋白胆固醇",
        content: "该指标略低，建议增加有氧运动频率，并减少久坐时间。",
      },
    ],
    interpretationSuggestion:
      "建议继续保持低油低糖饮食，适量增加步行等有氧活动，按时复查血脂指标。如出现不适，请及时就医。",
  },
];

const reports = ref<HealthCheckReport[]>(
  initialReports.map((item) => ({
    ...item,
    patient: item.patient.map((field) => ({ ...field })),
    metrics: item.metrics.map((metric) => ({ ...metric })),
    doctors: item.doctors.map((field) => ({ ...field })),
    interpretationNotes: item.interpretationNotes.map((note) => ({ ...note })),
  })),
);
const currentReportId = ref<string>(initialReports[0]?.id || "");

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

function ensureCurrentReport() {
  if (!reports.value.some((item) => item.id === currentReportId.value)) {
    currentReportId.value = reports.value[0]?.id || "";
  }
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

function revokeAttachmentUrl(report: HealthCheckReport | undefined) {
  if (report?.attachmentUrl?.startsWith("blob:")) {
    URL.revokeObjectURL(report.attachmentUrl);
  }
}

export function useReportCenter() {
  const currentReport = computed(() => {
    ensureCurrentReport();
    return reports.value.find((item) => item.id === currentReportId.value) || null;
  });

  function selectReport(reportId: string) {
    currentReportId.value = reportId;
    ensureCurrentReport();
  }

  function removeReport(reportId: string) {
    const targetReport = reports.value.find((item) => item.id === reportId);

    revokeAttachmentUrl(targetReport);
    reports.value = reports.value.filter((item) => item.id !== reportId);
    ensureCurrentReport();
  }

  function removeCurrentReport() {
    if (!currentReport.value) {
      return;
    }

    removeReport(currentReport.value.id);
  }

  function addUploadedReport(file: File, options: UploadReportOptions = {}) {
    const timestamp = formatNow();
    const reportId = `upload-${Date.now()}`;
    const reportDate = options.reportDate || timestamp.slice(0, 10);
    const title = options.title?.trim() || getReportTitle(file.name);
    const attachmentUrl = URL.createObjectURL(file);
    const attachmentPreviewKind = getAttachmentPreviewKind(file);
    const fileType = file.type || "未知类型";

    const nextReport: HealthCheckReport = {
      id: reportId,
      title,
      source: "手动上传",
      reportTime: `${reportDate} 09:00`,
      uploadTime: timestamp,
      hospital: "上海市某某医院",
      reportName: `${title}电子报告`,
      patient: [
        { label: "姓名", value: "张爱清" },
        { label: "病历号", value: "" },
        { label: "样本号", value: "附件" },
        { label: "性别", value: "女" },
        { label: "年龄", value: "65" },
        { label: "科别", value: "体检科" },
        { label: "送检医生", value: "" },
        { label: "送检日期", value: reportDate },
        { label: "样本类型", value: fileType },
        { label: "备注", value: file.name },
      ],
      metrics: [
        { name: "附件名称", result: file.name, unit: "--", reference: "--" },
        { name: "附件类型", result: fileType, unit: "--", reference: "--" },
        { name: "附件大小", result: formatFileSize(file.size), unit: "--", reference: "--" },
        { name: "上传状态", result: "已上传", unit: "--", reference: "--" },
      ],
      doctors: [
        { label: "报告医生", value: "系统上传" },
        { label: "审核医生", value: "" },
        { label: "签名", value: "" },
      ],
      reviewTime: timestamp,
      conclusion:
        "该电子报告由前端附件上传生成，当前为演示数据，可继续接入真实报告解析或后端存储。",
      interpretationHeading: "体检报告解读",
      interpretationDoctor: "系统上传",
      interpretationTime: timestamp,
      interpretationNotes: [
        {
          title: "附件说明",
          content: `当前上传附件名称为“${file.name}”，前端已接收该文件并生成一条可查看、可删除的体检报告记录。`,
        },
        {
          title: "文件类型",
          content: `当前文件类型为“${fileType}”，后续可按需接入 PDF、图片 OCR 或结构化报告解析能力。`,
        },
      ],
      interpretationSuggestion:
        "建议后续接入后端存储与报告解析接口，以便保留上传附件、提取关键指标并生成更完整的医学解读内容。",
      attachmentName: file.name,
      attachmentType: fileType,
      attachmentUrl,
      attachmentPreviewKind,
    };

    reports.value = [nextReport, ...reports.value];
    currentReportId.value = reportId;

    return reportId;
  }

  return {
    reports,
    currentReportId,
    currentReport,
    selectReport,
    removeReport,
    removeCurrentReport,
    addUploadedReport,
  };
}
