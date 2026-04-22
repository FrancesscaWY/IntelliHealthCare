import { Logger } from "@nestjs/common";
import {
  ContentStatus,
  MetricType,
  Prisma,
  PrismaClient,
  RagDocumentStatus,
  RagIngestionStatus,
  RagKnowledgeType,
  RagSourceType,
  RagVisibilityScope,
  ReportStatus,
  ShiftStatus,
  StaffStatus
} from "@prisma/client";
import { bootstrapDatabase } from "../src/common/bootstrap/database-bootstrap";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const PROCESS_OUTPUT_BUFFER_SIZE = 20 * 1024 * 1024;
const DEFAULT_LANGUAGE = "zh-CN";
const DEFAULT_CHUNK_CONFIG = {
  strategy: "paragraph-window",
  targetChars: 820,
  overlapChars: 140,
  minChunkChars: 180
} as const;

const PUBLIC_HEALTH_SOURCES = [
  {
    key: "who-hypertension",
    titleHint: "Hypertension",
    sourceName: "World Health Organization",
    url: "https://www.who.int/news-room/fact-sheets/detail/hypertension",
    tags: ["hypertension", "who", "public-health"]
  },
  {
    key: "who-ageing-health",
    titleHint: "Ageing and health",
    sourceName: "World Health Organization",
    url: "https://www.who.int/news-room/fact-sheets/detail/ageing-and-health",
    tags: ["ageing", "who", "healthy-ageing"]
  },
  {
    key: "cdc-falls",
    titleHint: "Falls",
    sourceName: "Centers for Disease Control and Prevention",
    url: "https://www.cdc.gov/falls/index.html",
    tags: ["falls", "cdc", "injury-prevention"]
  },
  {
    key: "medlineplus-high-blood-pressure",
    titleHint: "High Blood Pressure",
    sourceName: "MedlinePlus",
    url: "https://medlineplus.gov/highbloodpressure.html",
    tags: ["blood-pressure", "medlineplus", "consumer-health"]
  }
] as const;

type SeedDocument = {
  accessPolicy?: Prisma.InputJsonValue;
  externalId?: string;
  institutionId?: string;
  language: string;
  metadata?: Prisma.InputJsonValue;
  ownerUserId?: string;
  publishedAt?: Date | null;
  retrievedAt?: Date | null;
  sectionHeadings?: string[];
  sourceType: RagSourceType;
  sourceUri?: string;
  status?: RagDocumentStatus;
  summary?: string;
  tags?: string[];
  title: string;
  visibility: RagVisibilityScope;
  contentText: string;
};

type KnowledgeBaseConfig = {
  chunkConfig: Prisma.InputJsonValue;
  code: string;
  description: string;
  knowledgeType: RagKnowledgeType;
  metadata?: Prisma.InputJsonValue;
  name: string;
  ownerUserId?: string;
  refreshPolicy: Prisma.InputJsonValue;
  sourceConfig: Prisma.InputJsonValue;
  visibility: RagVisibilityScope;
  institutionId?: string;
};

type BuildOutcome = {
  chunkCount: number;
  code: string;
  documentCount: number;
  knowledgeType: RagKnowledgeType;
  name: string;
  visibility: RagVisibilityScope;
};

type ChildProcessError = NodeJS.ErrnoException & {
  stderr?: string;
  stdout?: string;
};

async function main() {
  const logger = new Logger("RagDatabaseBuilder");
  const databaseBootstrap = await bootstrapDatabase(logger);
  const backendRoot = resolve(__dirname, "..");
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: databaseBootstrap.databaseUrl
      }
    }
  });

  try {
    await runPrismaCommand(
      "prisma migrate deploy",
      [getPrismaCliEntry(backendRoot), "migrate", "deploy", "--schema", join(backendRoot, "prisma", "schema.prisma")],
      backendRoot,
      databaseBootstrap.databaseUrl,
      logger
    );

    await seedBusinessDataIfEmpty(prisma, backendRoot, databaseBootstrap.databaseUrl, logger);

    const outcomes: BuildOutcome[] = [];
    outcomes.push(await buildServiceCatalogKnowledge(prisma));
    outcomes.push(await buildHealthKnowledge(prisma));
    outcomes.push(await buildPlatformRuleKnowledge(prisma, backendRoot));

    const institutionOutcomes = await buildInstitutionKnowledge(prisma);
    outcomes.push(...institutionOutcomes);

    const privateOutcomes = await buildUserPrivateKnowledge(prisma);
    outcomes.push(...privateOutcomes);

    const totals = outcomes.reduce(
      (accumulator, item) => {
        accumulator.knowledgeBases += 1;
        accumulator.documents += item.documentCount;
        accumulator.chunks += item.chunkCount;
        return accumulator;
      },
      { knowledgeBases: 0, documents: 0, chunks: 0 }
    );

    const summary = {
      builtAt: new Date().toISOString(),
      totals,
      knowledgeBases: outcomes
    };

    logger.log(`RAG knowledge build completed: ${JSON.stringify(summary)}`);
  } finally {
    await prisma.$disconnect().catch(() => undefined);
    await databaseBootstrap.cleanup().catch(() => undefined);
  }
}

async function buildServiceCatalogKnowledge(prisma: PrismaClient) {
  const knowledgeBase = await upsertKnowledgeBase(prisma, {
    code: "rag-service-catalog-public",
    name: "服务目录知识库",
    knowledgeType: RagKnowledgeType.SERVICE_CATALOG,
    visibility: RagVisibilityScope.PUBLIC,
    description: "面向服务推荐、服务检索和订单前置解释的服务目录与服务规则知识。",
    sourceConfig: {
      sourceSystems: ["ServiceItem", "Institution"],
      buildMode: "db-seed-sync"
    },
    refreshPolicy: {
      mode: "manual",
      recommendedTrigger: ["service-item-updated", "institution-updated"],
      recommendedFrequency: "daily"
    },
    chunkConfig: DEFAULT_CHUNK_CONFIG,
    metadata: {
      citationMode: "chunk",
      citationFields: ["documentId", "chunkId", "title", "sourceUri", "chunkIndex"]
    }
  });

  const services = await prisma.serviceItem.findMany({
    where: { enabled: true },
    include: {
      institution: true
    },
    orderBy: [{ category: "asc" }, { salesVolume: "desc" }]
  });

  const documents = services.map<SeedDocument>((service) => {
    const tags = toStringArray(service.tags);
    const regionScope = toStringArray(service.regionScope);
    const serviceContent = toStringArray(service.serviceContent);
    const ragSnippet = toJsonRecord(service.ragSnippet);
    const snippetLines = Object.entries(ragSnippet)
      .flatMap(([key, value]) =>
        toStringArray(value).map((item) => `${translateSnippetKey(key)}：${item}`)
      );

    return {
      externalId: service.id,
      sourceType: RagSourceType.INTERNAL_TABLE,
      sourceUri: `record://ServiceItem/${service.id}`,
      title: service.title,
      summary: service.summary ?? undefined,
      language: DEFAULT_LANGUAGE,
      tags,
      visibility: RagVisibilityScope.PUBLIC,
      institutionId: service.institutionId ?? undefined,
      metadata: {
        recordType: "ServiceItem",
        serviceId: service.id,
        serviceCode: service.code,
        category: service.category,
        institutionId: service.institutionId,
        regionScope
      },
      accessPolicy: {
        scope: "public"
      },
      sectionHeadings: ["服务信息", "服务内容", "适用区域", "知识片段"],
      contentText: buildTextDocument([
        ["服务信息", [
          `服务标题：${service.title}`,
          `服务编码：${service.code}`,
          `服务分类：${translateServiceCategory(service.category)}`,
          `所属机构：${service.institution?.name ?? "平台直营/通用服务"}`,
          `服务摘要：${service.summary ?? "无"}`,
          `价格：${service.price.toString()} 元`,
          `市场价：${service.marketPrice?.toString() ?? "无"} 元`,
          `服务时长：${service.durationMinutes ?? "未配置"} 分钟`,
          `评分：${service.rating?.toString() ?? "暂无"}`,
          `销量：${service.salesVolume}`
        ]],
        ["服务内容", serviceContent],
        ["适用区域", regionScope],
        ["知识片段", snippetLines.length > 0 ? snippetLines : ["暂无额外知识片段"]]
      ])
    };
  });

  return rebuildKnowledgeBase(prisma, knowledgeBase.id, documents, "build-rag-db:service-catalog");
}

async function buildHealthKnowledge(prisma: PrismaClient) {
  const knowledgeBase = await upsertKnowledgeBase(prisma, {
    code: "rag-health-knowledge-public",
    name: "健康知识库",
    knowledgeType: RagKnowledgeType.HEALTH_KNOWLEDGE,
    visibility: RagVisibilityScope.PUBLIC,
    description: "公共健康百科与平台内容知识，覆盖真实公开页面和仓库内健康内容样例。",
    sourceConfig: {
      sourceSystems: ["WHO", "CDC", "MedlinePlus", "Article", "Lecture", "DiseaseKnowledge"],
      buildMode: "crawl-and-db-sync"
    },
    refreshPolicy: {
      mode: "manual",
      recommendedFrequency: "weekly",
      recommendedTrigger: ["content-published", "scheduled-crawl"]
    },
    chunkConfig: DEFAULT_CHUNK_CONFIG,
    metadata: {
      citationMode: "chunk",
      citationFields: ["documentId", "chunkId", "title", "sourceUri", "chunkIndex", "sourceName"]
    }
  });

  const documents: SeedDocument[] = [];
  const crawledDocuments = await buildPublicHealthWebDocuments();
  documents.push(...crawledDocuments);

  const [articles, lectures, diseases] = await Promise.all([
    prisma.article.findMany({
      where: { status: ContentStatus.PUBLISHED },
      orderBy: [{ sortOrder: "desc" }, { publishedAt: "desc" }]
    }),
    prisma.lecture.findMany({
      where: { status: ContentStatus.PUBLISHED },
      orderBy: { publishedAt: "desc" }
    }),
    prisma.diseaseKnowledge.findMany({
      where: { status: ContentStatus.PUBLISHED },
      include: { department: true },
      orderBy: { publishedAt: "desc" }
    })
  ]);

  documents.push(
    ...articles.map((article) => {
      const sections = toRecordArray(toJsonRecord(article.content).sections);
      return {
        externalId: article.id,
        sourceType: RagSourceType.INTERNAL_TABLE,
        sourceUri: `record://Article/${article.id}`,
        title: article.title,
        summary: article.summary,
        language: DEFAULT_LANGUAGE,
        tags: toStringArray(article.tags),
        visibility: RagVisibilityScope.PUBLIC,
        metadata: {
          recordType: "Article",
          articleId: article.id,
          slug: article.slug,
          sourceName: article.sourceName,
          authorName: article.authorName
        },
        accessPolicy: { scope: "public" },
        publishedAt: article.publishedAt,
        sectionHeadings: sections.map((section) => String(section.title ?? "")).filter(Boolean),
        contentText: buildTextDocument([
          ["基础信息", [
            `文章标题：${article.title}`,
            `摘要：${article.summary}`,
            `作者：${article.authorName ?? "未标注"}`,
            `来源：${article.sourceName ?? "未标注"}`
          ]],
          ...sections.map<[string, string[]]>((section) => [
            String(section.title ?? "正文"),
            toStringArray(section.paragraphs)
          ])
        ])
      };
    })
  );

  documents.push(
    ...lectures.map((lecture) => {
      const content = toJsonRecord(lecture.content);
      return {
        externalId: lecture.id,
        sourceType: RagSourceType.INTERNAL_TABLE,
        sourceUri: `record://Lecture/${lecture.id}`,
        title: lecture.title,
        summary: lecture.summary,
        language: DEFAULT_LANGUAGE,
        tags: ["lecture", lecture.speakerName ?? ""].filter(Boolean),
        visibility: RagVisibilityScope.PUBLIC,
        metadata: {
          recordType: "Lecture",
          lectureId: lecture.id,
          slug: lecture.slug,
          speakerName: lecture.speakerName,
          speakerTitle: lecture.speakerTitle,
          videoUrl: lecture.videoUrl
        },
        accessPolicy: { scope: "public" },
        publishedAt: lecture.publishedAt,
        sectionHeadings: ["讲座信息", "课程大纲", "重点摘要"],
        contentText: buildTextDocument([
          ["讲座信息", [
            `讲座标题：${lecture.title}`,
            `摘要：${lecture.summary}`,
            `讲者：${lecture.speakerName ?? "未标注"}`,
            `讲者头衔：${lecture.speakerTitle ?? "未标注"}`,
            `时长：${lecture.durationMinutes ?? "未标注"} 分钟`
          ]],
          ["课程大纲", toStringArray(content.outline)],
          ["重点摘要", toStringArray(content.highlights)]
        ])
      };
    })
  );

  documents.push(
    ...diseases.map((disease) => ({
      externalId: disease.id,
      sourceType: RagSourceType.INTERNAL_TABLE,
      sourceUri: `record://DiseaseKnowledge/${disease.id}`,
      title: disease.title,
      summary: disease.summary,
      language: DEFAULT_LANGUAGE,
      tags: ["disease", disease.department.name],
      visibility: RagVisibilityScope.PUBLIC,
      metadata: {
        recordType: "DiseaseKnowledge",
        diseaseId: disease.id,
        slug: disease.slug,
        department: disease.department.name
      },
      accessPolicy: { scope: "public" },
      publishedAt: disease.publishedAt,
      sectionHeadings: ["疾病概览", "常见症状", "常见原因", "预防方式", "干预建议"],
      contentText: buildTextDocument([
        ["疾病概览", [
          `疾病名称：${disease.title}`,
          `科室：${disease.department.name}`,
          `摘要：${disease.summary}`
        ]],
        ["常见症状", toStringArray(disease.symptoms)],
        ["常见原因", toStringArray(disease.causes)],
        ["预防方式", toStringArray(disease.preventions)],
        ["干预建议", toStringArray(disease.treatments)]
      ])
    }))
  );

  return rebuildKnowledgeBase(prisma, knowledgeBase.id, documents, "build-rag-db:health-knowledge");
}

async function buildPlatformRuleKnowledge(prisma: PrismaClient, backendRoot: string) {
  const knowledgeBase = await upsertKnowledgeBase(prisma, {
    code: "rag-platform-rule-public",
    name: "平台规则知识库",
    knowledgeType: RagKnowledgeType.PLATFORM_RULE,
    visibility: RagVisibilityScope.PUBLIC,
    description: "Agent 接入、RAG 知识治理、内部接口边界和私有数据隔离规则。",
    sourceConfig: {
      sourceSystems: [
        "docs/hermes-multi-agent-implementation.md",
        "docs/智诊康养后端开发文档.md",
        "FamilyBinding",
        "HealthArchive",
        "Report",
        "Order"
      ],
      buildMode: "repo-doc-sync"
    },
    refreshPolicy: {
      mode: "manual",
      recommendedFrequency: "when-docs-change",
      recommendedTrigger: ["docs-updated", "auth-policy-updated", "agent-boundary-updated"]
    },
    chunkConfig: DEFAULT_CHUNK_CONFIG,
    metadata: {
      citationMode: "chunk",
      citationFields: ["documentId", "chunkId", "title", "sourceUri", "chunkIndex"]
    }
  });

  const repoRoot = resolve(backendRoot, "..", "..");
  const hermesDoc = await readFile(join(repoRoot, "docs", "hermes-multi-agent-implementation.md"), "utf8");
  const backendDoc = await readFile(join(repoRoot, "docs", "智诊康养后端开发文档.md"), "utf8");

  const phase3Section = extractMarkdownSection(hermesDoc, "## 3.4 Phase 3：建设 RAG 与知识分层");
  const ragSpecSection = extractMarkdownSection(hermesDoc, "## 5.4 RAG / 知识说明");
  const agentGapSection = extractMarkdownSection(backendDoc, "### 10.2 当前尚未实现的关键能力");
  const agentAccessSection = extractMarkdownSection(backendDoc, "### 10.3 在当前项目中的正确接入方式");

  const documents: SeedDocument[] = [
    {
      externalId: "platform-rag-governance",
      sourceType: RagSourceType.SYSTEM_RULE,
      sourceUri: "repo://docs/hermes-multi-agent-implementation.md#3-4-phase-3",
      title: "RAG 知识分层治理规则",
      summary: "定义 5 类知识库、来源系统、更新频率、分块策略、元数据和权限边界。",
      language: DEFAULT_LANGUAGE,
      tags: ["rag", "governance", "knowledge-layer"],
      visibility: RagVisibilityScope.PUBLIC,
      metadata: {
        repoPath: "docs/hermes-multi-agent-implementation.md",
        sections: ["3.4", "5.4"]
      },
      accessPolicy: { scope: "public" },
      sectionHeadings: ["Phase 3", "RAG 说明"],
      contentText: buildTextDocument([
        ["Phase 3：建设 RAG 与知识分层", markdownToReadableLines(phase3Section)],
        ["5.4 RAG / 知识说明", markdownToReadableLines(ragSpecSection)]
      ])
    },
    {
      externalId: "platform-agent-execution-boundary",
      sourceType: RagSourceType.SYSTEM_RULE,
      sourceUri: "repo://docs/智诊康养后端开发文档.md#10-2-10-3",
      title: "Agent 接入与执行边界",
      summary: "规范 Agent 的正确接入方式，明确哪些能力未实现，以及为何不能让 Agent 直接落库。",
      language: DEFAULT_LANGUAGE,
      tags: ["agent", "boundary", "orchestration"],
      visibility: RagVisibilityScope.PUBLIC,
      metadata: {
        repoPath: "docs/智诊康养后端开发文档.md",
        sections: ["10.2", "10.3"]
      },
      accessPolicy: { scope: "public" },
      sectionHeadings: ["未实现能力", "正确接入方式"],
      contentText: buildTextDocument([
        ["10.2 当前尚未实现的关键能力", markdownToReadableLines(agentGapSection)],
        ["10.3 在当前项目中的正确接入方式", markdownToReadableLines(agentAccessSection)]
      ])
    },
    {
      externalId: "platform-private-archive-access",
      sourceType: RagSourceType.SYSTEM_RULE,
      sourceUri: "record://policy/private-archive-access",
      title: "用户私有知识访问边界",
      summary: "用户私有知识必须绑定 ownerUserId，并通过 FamilyBinding 授权范围进行额外校验，不能按公共知识处理。",
      language: DEFAULT_LANGUAGE,
      tags: ["privacy", "archive", "authorization"],
      visibility: RagVisibilityScope.PUBLIC,
      metadata: {
        relatedTables: ["FamilyBinding", "HealthArchive", "Report", "Order", "HealthMetricRecord"],
        enforcement: ["ownerUserId", "accessPolicy", "family-binding-scope"]
      },
      accessPolicy: { scope: "public" },
      sectionHeadings: ["边界原则", "落地规则", "引用回传要求"],
      contentText: buildTextDocument([
        ["边界原则", [
          "公共知识与用户私有知识必须分库存放，不能共用同一套可见性规则。",
          "用户私有文档必须带 ownerUserId，并在 accessPolicy 中列出允许访问的家庭成员与授权范围。",
          "家属关系以 FamilyBinding 为准，且不同文档类型要分别校验 archive、order、alerts 等授权维度。"
        ]],
        ["落地规则", [
          "档案类文档来自 HealthArchive，报告类文档来自 Report，历史服务类文档来自 Order，指标类文档来自 HealthMetricRecord。",
          "用户私有文档的 visibility 固定为 USER_PRIVATE，不参与公共知识召回。",
          "机构知识的 visibility 固定为 INSTITUTION，服务目录和健康百科则使用 PUBLIC。"
        ]],
        ["引用回传要求", [
          "引用必须返回 documentId、chunkId、title、sourceUri、chunkIndex。",
          "当 sourceUri 为业务记录时，格式统一为 record://表名/主键。",
          "当 sourceUri 为仓库文档时，格式统一为 repo://相对路径#章节标识。"
        ]]
      ])
    }
  ];

  return rebuildKnowledgeBase(prisma, knowledgeBase.id, documents, "build-rag-db:platform-rule");
}

async function buildInstitutionKnowledge(prisma: PrismaClient) {
  const institutions = await prisma.institution.findMany({
    orderBy: { name: "asc" },
    include: {
      services: {
        where: { enabled: true },
        orderBy: [{ salesVolume: "desc" }, { rating: "desc" }]
      },
      staffMembers: {
        where: { employmentStatus: StaffStatus.ACTIVE },
        orderBy: { name: "asc" },
        include: {
          schedules: {
            orderBy: { shiftDate: "asc" },
            take: 5
          }
        }
      }
    }
  });

  const outcomes: BuildOutcome[] = [];

  for (const institution of institutions) {
    const knowledgeBase = await upsertKnowledgeBase(prisma, {
      code: `rag-institution-resource-${institution.code.toLowerCase()}`,
      name: `${institution.name} 机构资源知识库`,
      knowledgeType: RagKnowledgeType.INSTITUTION_RESOURCE,
      visibility: RagVisibilityScope.INSTITUTION,
      institutionId: institution.id,
      description: "机构能力、可服务区域、员工专长和排班资源。",
      sourceConfig: {
        sourceSystems: ["Institution", "Staff", "StaffSchedule", "ServiceItem"],
        buildMode: "db-seed-sync"
      },
      refreshPolicy: {
        mode: "manual",
        recommendedFrequency: "daily",
        recommendedTrigger: ["staff-schedule-updated", "service-item-updated", "institution-updated"]
      },
      chunkConfig: DEFAULT_CHUNK_CONFIG,
      metadata: {
        citationMode: "chunk",
        citationFields: ["documentId", "chunkId", "title", "sourceUri", "chunkIndex", "institutionId"]
      }
    });

    const staffLines = institution.staffMembers.flatMap((staffMember) => {
      const schedules = staffMember.schedules.map((schedule) => {
        const remainingCapacity = Math.max(schedule.capacity - schedule.assignedCount, 0);
        return [
          `${formatDate(schedule.shiftDate)} ${formatTime(schedule.startAt)}-${formatTime(schedule.endAt)}`,
          `状态：${translateShiftStatus(schedule.status)}`,
          `容量：${schedule.assignedCount}/${schedule.capacity}`,
          `剩余容量：${remainingCapacity}`,
          `备注：${schedule.notes ?? "无"}`
        ].join("；");
      });

      return [
        `人员：${staffMember.name}，角色：${translateStaffRole(staffMember.role)}，职称：${staffMember.title ?? "未标注"}，评分：${staffMember.rating?.toString() ?? "暂无"}，服务半径：${staffMember.serviceRadiusKm ?? 0}km`,
        `专长：${joinList(toStringArray(staffMember.expertise))}`,
        `资质：${joinList(toStringArray(staffMember.certifications))}`,
        schedules.length > 0 ? `排班：${schedules.join(" | ")}` : "排班：暂无"
      ];
    });

    const serviceLines = institution.services.map(
      (service) =>
        `${service.title}；分类：${translateServiceCategory(service.category)}；价格：${service.price.toString()} 元；区域：${joinList(toStringArray(service.regionScope))}`
    );

    const documents: SeedDocument[] = [
      {
        externalId: institution.id,
        sourceType: RagSourceType.INTERNAL_TABLE,
        sourceUri: `record://Institution/${institution.id}`,
        title: `${institution.name} 机构资源概览`,
        summary: institution.intro ?? undefined,
        language: DEFAULT_LANGUAGE,
        tags: toStringArray(institution.tags),
        visibility: RagVisibilityScope.INSTITUTION,
        institutionId: institution.id,
        metadata: {
          recordType: "Institution",
          institutionId: institution.id,
          institutionCode: institution.code,
          serviceCount: institution.services.length,
          staffCount: institution.staffMembers.length
        },
        accessPolicy: {
          scope: "institution",
          institutionId: institution.id
        },
        sectionHeadings: ["机构概况", "服务能力", "人员与排班"],
        contentText: buildTextDocument([
          ["机构概况", [
            `机构名称：${institution.name}`,
            `机构编码：${institution.code}`,
            `机构地址：${institution.city}${institution.district ?? ""}${institution.address}`,
            `联系电话：${institution.phone ?? "未标注"}`,
            `机构简介：${institution.intro ?? "无"}`,
            `床位数：${institution.bedCount ?? "未配置"}`,
            `服务范围：${joinList(toStringArray(institution.serviceScope))}`,
            `标签：${joinList(toStringArray(institution.tags))}`
          ]],
          ["服务能力", serviceLines.length > 0 ? serviceLines : ["暂无启用服务"]],
          ["人员与排班", staffLines.length > 0 ? staffLines : ["暂无在岗人员"]]
        ])
      }
    ];

    outcomes.push(
      await rebuildKnowledgeBase(
        prisma,
        knowledgeBase.id,
        documents,
        `build-rag-db:institution:${institution.code.toLowerCase()}`
      )
    );
  }

  return outcomes;
}

async function buildUserPrivateKnowledge(prisma: PrismaClient) {
  const archives = await prisma.healthArchive.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      user: true,
      reports: {
        where: { status: ReportStatus.PUBLISHED },
        orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
        include: {
          author: true,
          order: {
            include: {
              service: true
            }
          }
        }
      },
      alerts: {
        orderBy: { triggeredAt: "desc" },
        take: 5
      }
    }
  });

  const familyBindings = await prisma.familyBinding.findMany({
    where: {
      elderMemberId: {
        in: archives.map((item) => item.userId)
      }
    },
    include: {
      familyMember: true
    }
  });

  const outcomes: BuildOutcome[] = [];

  for (const archive of archives) {
    const relatedFamilyBindings = familyBindings.filter(
      (binding) => binding.elderMemberId === archive.userId
    );
    const baseAccessPolicy = buildPrivateAccessPolicy(archive.userId, relatedFamilyBindings);

    const knowledgeBase = await upsertKnowledgeBase(prisma, {
      code: `rag-user-private-${archive.userId}`,
      name: `${archive.user.realName ?? archive.user.nickname ?? archive.user.id} 用户私有档案知识库`,
      knowledgeType: RagKnowledgeType.USER_PRIVATE_ARCHIVE,
      visibility: RagVisibilityScope.USER_PRIVATE,
      ownerUserId: archive.userId,
      description: "用户私有档案、报告、健康指标和历史订单知识。",
      sourceConfig: {
        sourceSystems: ["HealthArchive", "Report", "HealthMetricRecord", "Order", "FamilyBinding"],
        buildMode: "db-seed-sync"
      },
      refreshPolicy: {
        mode: "manual",
        recommendedFrequency: "daily",
        recommendedTrigger: ["archive-updated", "report-published", "metric-synced", "order-updated"]
      },
      chunkConfig: DEFAULT_CHUNK_CONFIG,
      metadata: {
        citationMode: "chunk",
        citationFields: ["documentId", "chunkId", "title", "sourceUri", "chunkIndex", "ownerUserId"]
      }
    });

    const documents: SeedDocument[] = [];
    const metrics = await prisma.healthMetricRecord.findMany({
      where: { userId: archive.userId },
      orderBy: { measuredAt: "desc" },
      take: 24
    });

    const orders = await prisma.order.findMany({
      where: {
        OR: [{ ownerId: archive.userId }, { elderId: archive.userId }]
      },
      include: {
        service: true
      },
      orderBy: [{ bookingDate: "desc" }, { createdAt: "desc" }],
      take: 8
    });

    documents.push({
      externalId: archive.id,
      sourceType: RagSourceType.USER_ARCHIVE,
      sourceUri: `record://HealthArchive/${archive.id}`,
      title: `${archive.user.realName ?? archive.user.nickname ?? archive.user.id} 基础档案`,
      summary: `用户基础档案、病史、风险标签和长期记忆汇总。`,
      language: DEFAULT_LANGUAGE,
      tags: ["archive", "private-profile", ...toStringArray(archive.riskTags)],
      visibility: RagVisibilityScope.USER_PRIVATE,
      ownerUserId: archive.userId,
      metadata: {
        recordType: "HealthArchive",
        archiveId: archive.id,
        subjectUserId: archive.userId
      },
      accessPolicy: baseAccessPolicy,
      sectionHeadings: ["基础档案", "病史", "风险标签", "长期记忆", "近期告警"],
      contentText: buildTextDocument([
        ["基础档案", flattenRecord("档案", toJsonRecord(archive.baseProfile))],
        ["病史", flattenRecord("病史", toJsonRecord(archive.medicalHistory))],
        ["风险标签", toStringArray(archive.riskTags)],
        ["长期记忆", flattenRecord("长期记忆", toJsonRecord(archive.longTermMemory))],
        [
          "近期告警",
          archive.alerts.length > 0
            ? archive.alerts.map(
                (alert) =>
                  `${formatDateTime(alert.triggeredAt)} ${translateAlertLevel(alert.level)} ${alert.title}；状态：${translateAlertStatus(alert.status)}；摘要：${alert.summary}`
              )
            : ["暂无近期告警"]
        ]
      ])
    });

    if (metrics.length > 0) {
      documents.push({
        externalId: `${archive.userId}-metrics`,
        sourceType: RagSourceType.USER_ARCHIVE,
        sourceUri: `record://HealthMetricRecord/user/${archive.userId}`,
        title: `${archive.user.realName ?? archive.user.nickname ?? archive.user.id} 近期健康指标`,
        summary: "按指标类型汇总近期监测记录与异常情况。",
        language: DEFAULT_LANGUAGE,
        tags: ["metrics", "private-health-data"],
        visibility: RagVisibilityScope.USER_PRIVATE,
        ownerUserId: archive.userId,
        metadata: {
          recordType: "HealthMetricRecord",
          subjectUserId: archive.userId,
          metricCount: metrics.length
        },
        accessPolicy: baseAccessPolicy,
        sectionHeadings: ["指标汇总", "近期记录"],
        contentText: buildTextDocument([
          ["指标汇总", summarizeMetrics(metrics)],
          [
            "近期记录",
            metrics.map(
              (metric) =>
                `${formatDateTime(metric.measuredAt)} ${translateMetricType(metric.metricType)}：${formatMetricValue(metric)}；来源：${metric.source}${metric.abnormal ? "；异常：是" : ""}`
            )
          ]
        ])
      });
    }

    for (const report of archive.reports) {
      documents.push({
        externalId: report.id,
        sourceType: RagSourceType.USER_ARCHIVE,
        sourceUri: `record://Report/${report.id}`,
        title: report.title,
        summary: summarizeOneLine(toJsonRecord(report.summary)),
        language: DEFAULT_LANGUAGE,
        tags: ["report", report.type.toLowerCase()],
        visibility: RagVisibilityScope.USER_PRIVATE,
        ownerUserId: archive.userId,
        metadata: {
          recordType: "Report",
          reportId: report.id,
          reportType: report.type,
          orderId: report.orderId,
          authorStaffId: report.authorStaffId
        },
        accessPolicy: baseAccessPolicy,
        publishedAt: report.publishedAt,
        sectionHeadings: ["报告信息", "摘要内容", "附件"],
        contentText: buildTextDocument([
          ["报告信息", [
            `报告标题：${report.title}`,
            `报告类型：${report.type}`,
            `作者：${report.author?.name ?? "未标注"}`,
            `关联服务：${report.order?.service.title ?? "无"}`,
            `发布时间：${report.publishedAt ? formatDateTime(report.publishedAt) : "未发布"}`
          ]],
          ["摘要内容", flattenRecord("摘要", toJsonRecord(report.summary))],
          ["附件", renderAttachmentLines(report.attachment)]
        ])
      });
    }

    if (orders.length > 0) {
      documents.push({
        externalId: `${archive.userId}-orders`,
        sourceType: RagSourceType.USER_ARCHIVE,
        sourceUri: `record://Order/user/${archive.userId}`,
        title: `${archive.user.realName ?? archive.user.nickname ?? archive.user.id} 历史订单`,
        summary: "近期服务订单、预约时间、支付情况与 AI 摘要。",
        language: DEFAULT_LANGUAGE,
        tags: ["orders", "service-history"],
        visibility: RagVisibilityScope.USER_PRIVATE,
        ownerUserId: archive.userId,
        metadata: {
          recordType: "Order",
          subjectUserId: archive.userId,
          orderCount: orders.length
        },
        accessPolicy: baseAccessPolicy,
        sectionHeadings: ["订单汇总"],
        contentText: buildTextDocument([
          [
            "订单汇总",
            orders.map((order) =>
              [
                `订单号：${order.orderNo}`,
                `服务：${order.service.title}`,
                `状态：${order.status}`,
                `预约时间：${order.bookingDate ? formatDateTime(order.bookingDate) : "未预约"}`,
                `金额：${order.payableAmount.toString()} 元`,
                `备注：${order.remark ?? "无"}`,
                `AI 摘要：${summarizeOneLine(toJsonRecord(order.aiSummary)) || "无"}`
              ].join("；")
            )
          ]
        ])
      });
    }

    outcomes.push(
      await rebuildKnowledgeBase(
        prisma,
        knowledgeBase.id,
        documents,
        `build-rag-db:user-private:${archive.userId}`
      )
    );
  }

  return outcomes;
}

async function buildPublicHealthWebDocuments() {
  const logger = new Logger("PublicHealthCrawler");
  const documents: SeedDocument[] = [];
  const retrievedAt = new Date();

  for (const source of PUBLIC_HEALTH_SOURCES) {
    try {
      const html = await fetchHtml(source.url);
      const title = extractHtmlTitle(html) || source.titleHint;
      const summary = extractMetaDescription(html);
      const contentText = htmlToReadableText(extractRelevantHtmlFragment(source.url, html));

      if (contentText.length < 500) {
        throw new Error(`Extracted content from ${source.url} is unexpectedly short`);
      }

      documents.push({
        externalId: source.key,
        sourceType: RagSourceType.WEB_CRAWL,
        sourceUri: source.url,
        title,
        summary,
        language: "en",
        tags: [...source.tags],
        visibility: RagVisibilityScope.PUBLIC,
        metadata: {
          sourceName: source.sourceName,
          fetchMethod: "html-crawl",
          fetchedAt: retrievedAt.toISOString()
        },
        accessPolicy: {
          scope: "public"
        },
        retrievedAt,
        sectionHeadings: ["Source", "Content"],
        contentText: buildTextDocument([
          ["Source", [
            `Source name: ${source.sourceName}`,
            `Source URL: ${source.url}`,
            `Fetched at: ${retrievedAt.toISOString()}`
          ]],
          ["Content", [contentText]]
        ])
      });
    } catch (error) {
      logger.warn(`Failed to crawl ${source.url}: ${getErrorMessage(error)}`);
    }
  }

  if (documents.length === 0) {
    throw new Error("No public health web pages could be crawled");
  }

  return documents;
}

async function rebuildKnowledgeBase(
  prisma: PrismaClient,
  knowledgeBaseId: string,
  documents: SeedDocument[],
  triggerSource: string
) {
  const knowledgeBase = await prisma.ragKnowledgeBase.findUniqueOrThrow({
    where: { id: knowledgeBaseId }
  });

  const ingestionRun = await prisma.ragIngestionRun.create({
    data: {
      knowledgeBaseId,
      triggerSource,
      status: RagIngestionStatus.RUNNING,
      metadata: {
        requestedDocumentCount: documents.length
      }
    }
  });

  if (documents.length === 0) {
    await prisma.ragIngestionRun.update({
      where: { id: ingestionRun.id },
      data: {
        status: RagIngestionStatus.FAILED,
        errorMessage: "No documents were generated for this knowledge base",
        completedAt: new Date()
      }
    });

    throw new Error(`Knowledge base ${knowledgeBase.code} produced no documents`);
  }

  try {
    const chunkRecords = documents.flatMap((document) => chunkSeedDocument(knowledgeBaseId, document));

    await prisma.$transaction(async (tx) => {
      await tx.ragChunk.deleteMany({
        where: { knowledgeBaseId }
      });

      await tx.ragDocument.deleteMany({
        where: { knowledgeBaseId }
      });

      for (const document of documents) {
        const createdDocument = await tx.ragDocument.create({
          data: {
            knowledgeBaseId,
            sourceType: document.sourceType,
            sourceUri: document.sourceUri,
            externalId: document.externalId,
            title: document.title,
            summary: document.summary,
            contentText: document.contentText,
            language: document.language,
            tags: toJsonValue(document.tags),
            metadata: toJsonValue(document.metadata),
            accessPolicy: toJsonValue(document.accessPolicy),
            contentHash: hashText(document.contentText),
            status: document.status ?? RagDocumentStatus.ACTIVE,
            ownerUserId: document.ownerUserId,
            institutionId: document.institutionId,
            retrievedAt: document.retrievedAt ?? undefined,
            publishedAt: document.publishedAt ?? undefined
          }
        });

        const preparedChunks = chunkSeedDocument(knowledgeBaseId, document).map((chunk) => ({
          ...chunk,
          documentId: createdDocument.id
        }));

        if (preparedChunks.length > 0) {
          await tx.ragChunk.createMany({
            data: preparedChunks
          });
        }
      }
    });

    await prisma.ragIngestionRun.update({
      where: { id: ingestionRun.id },
      data: {
        status: RagIngestionStatus.SUCCEEDED,
        documentCount: documents.length,
        chunkCount: chunkRecords.length,
        completedAt: new Date(),
        metadata: {
          requestedDocumentCount: documents.length,
          insertedDocumentCount: documents.length,
          insertedChunkCount: chunkRecords.length
        }
      }
    });

    return {
      code: knowledgeBase.code,
      name: knowledgeBase.name,
      visibility: knowledgeBase.visibility,
      knowledgeType: knowledgeBase.knowledgeType,
      documentCount: documents.length,
      chunkCount: chunkRecords.length
    };
  } catch (error) {
    await prisma.ragIngestionRun.update({
      where: { id: ingestionRun.id },
      data: {
        status: RagIngestionStatus.FAILED,
        errorMessage: getErrorMessage(error),
        completedAt: new Date()
      }
    });
    throw error;
  }
}

async function upsertKnowledgeBase(prisma: PrismaClient, config: KnowledgeBaseConfig) {
  return prisma.ragKnowledgeBase.upsert({
    where: { code: config.code },
    create: {
      code: config.code,
      name: config.name,
      knowledgeType: config.knowledgeType,
      visibility: config.visibility,
      description: config.description,
      sourceConfig: toJsonValue(config.sourceConfig),
      refreshPolicy: toJsonValue(config.refreshPolicy),
      chunkConfig: toJsonValue(config.chunkConfig),
      metadata: toJsonValue(config.metadata),
      ownerUserId: config.ownerUserId,
      institutionId: config.institutionId
    },
    update: {
      name: config.name,
      knowledgeType: config.knowledgeType,
      visibility: config.visibility,
      description: config.description,
      sourceConfig: toJsonValue(config.sourceConfig),
      refreshPolicy: toJsonValue(config.refreshPolicy),
      chunkConfig: toJsonValue(config.chunkConfig),
      metadata: toJsonValue(config.metadata),
      ownerUserId: config.ownerUserId,
      institutionId: config.institutionId
    }
  });
}

function chunkSeedDocument(knowledgeBaseId: string, document: SeedDocument) {
  const chunks = chunkText(document.contentText, DEFAULT_CHUNK_CONFIG.targetChars, DEFAULT_CHUNK_CONFIG.overlapChars);

  return chunks.map((chunk, index) => ({
    knowledgeBaseId,
    documentId: "",
    chunkIndex: index,
    title: document.title,
    content: chunk,
    contentHash: hashText(chunk),
    tokenCount: estimateTokenCount(chunk),
    charCount: chunk.length,
    headings: toJsonValue(document.sectionHeadings),
    keywords: toJsonValue(extractKeywords(chunk)),
    metadata: toJsonValue({
      sourceUri: document.sourceUri,
      title: document.title,
      visibility: document.visibility,
      chunkIndex: index
    }),
    embedding: toJsonValue(buildDeterministicVector(chunk)),
    embeddingModel: "deterministic-hash-v1",
    visibility: document.visibility,
    ownerUserId: document.ownerUserId,
    institutionId: document.institutionId
  }));
}

function chunkText(text: string, targetChars: number, overlapChars: number) {
  const normalized = normalizeText(text);
  const rawParagraphs = normalized
    .split(/\n{2,}/)
    .map((item) => item.trim())
    .filter(Boolean);
  const paragraphs = rawParagraphs.flatMap((paragraph) => splitLongParagraph(paragraph, targetChars));

  if (paragraphs.length === 0) {
    return normalized ? [normalized] : [];
  }

  const chunks: string[] = [];
  let current = "";

  for (const paragraph of paragraphs) {
    const nextChunk = current ? `${current}\n\n${paragraph}` : paragraph;

    if (nextChunk.length <= targetChars || current.length < DEFAULT_CHUNK_CONFIG.minChunkChars) {
      current = nextChunk;
      continue;
    }

    chunks.push(current);
    const overlap = current.slice(Math.max(0, current.length - overlapChars));
    current = `${overlap}\n\n${paragraph}`.trim();
  }

  if (current) {
    chunks.push(current);
  }

  return chunks.map((item) => item.trim()).filter(Boolean);
}

function splitLongParagraph(paragraph: string, targetChars: number) {
  if (paragraph.length <= targetChars) {
    return [paragraph];
  }

  const sentences = paragraph
    .split(/(?<=[。！？.!?；;])/)
    .map((item) => item.trim())
    .filter(Boolean);

  if (sentences.length <= 1) {
    return paragraph.match(new RegExp(`.{1,${targetChars}}`, "g")) ?? [paragraph];
  }

  const segments: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    const merged = current ? `${current} ${sentence}` : sentence;

    if (merged.length <= targetChars) {
      current = merged;
      continue;
    }

    if (current) {
      segments.push(current);
    }

    current = sentence;
  }

  if (current) {
    segments.push(current);
  }

  return segments;
}

function buildTextDocument(sections: Array<[string, string[]]>) {
  return normalizeText(
    sections
      .filter(([, lines]) => lines.length > 0)
      .map(([title, lines]) => `${title}\n${lines.map((line) => `- ${line}`).join("\n")}`)
      .join("\n\n")
  );
}

function flattenRecord(prefix: string, value: Record<string, unknown>, parentKey = ""): string[] {
  const lines: string[] = [];

  for (const [key, rawValue] of Object.entries(value)) {
    const displayKey = parentKey ? `${parentKey}.${key}` : key;

    if (Array.isArray(rawValue)) {
      lines.push(`${prefix}.${displayKey}：${rawValue.map((item) => stringifyValue(item)).join("、")}`);
      continue;
    }

    if (isPlainRecord(rawValue)) {
      lines.push(...flattenRecord(prefix, rawValue, displayKey));
      continue;
    }

    lines.push(`${prefix}.${displayKey}：${stringifyValue(rawValue)}`);
  }

  return lines;
}

function summarizeMetrics(
  metrics: Array<{
    abnormal: boolean;
    measuredAt: Date;
    metricType: MetricType;
    payload: Prisma.JsonValue | null;
    source: string;
    unit: string | null;
    value: Prisma.Decimal | null;
  }>
) {
  const grouped = new Map<MetricType, typeof metrics>();

  for (const metric of metrics) {
    const existing = grouped.get(metric.metricType) ?? [];
    existing.push(metric);
    grouped.set(metric.metricType, existing);
  }

  return Array.from(grouped.entries()).map(([metricType, items]) => {
    const latest = items[0];
    const abnormalCount = items.filter((item) => item.abnormal).length;
    return [
      `指标：${translateMetricType(metricType)}`,
      `最近值：${formatMetricValue(latest)}`,
      `最近时间：${formatDateTime(latest.measuredAt)}`,
      `记录数：${items.length}`,
      `异常次数：${abnormalCount}`,
      `最近来源：${latest.source}`
    ].join("；");
  });
}

function renderAttachmentLines(attachment: Prisma.JsonValue | null) {
  const attachments = Array.isArray(attachment) ? attachment : [];

  if (attachments.length === 0) {
    return ["无附件"];
  }

  return attachments.map((item) => {
    if (!isPlainRecord(item)) {
      return stringifyValue(item);
    }

    return `fileId=${String(item.fileId ?? "")}；fileName=${String(item.fileName ?? "")}`;
  });
}

function buildPrivateAccessPolicy(
  ownerUserId: string,
  bindings: Array<{
    authScope: Prisma.JsonValue | null;
    familyMemberId: string;
    relationLabel: string;
    familyMember: {
      id: string;
      nickname: string | null;
      realName: string | null;
    };
  }>
) {
  return {
    scope: "user-private",
    ownerUserId,
    authorizedFamilyMembers: bindings.map((binding) => ({
      userId: binding.familyMemberId,
      relationLabel: binding.relationLabel,
      name: binding.familyMember.realName ?? binding.familyMember.nickname ?? binding.familyMember.id,
      authScope: binding.authScope
    }))
  };
}

async function seedBusinessDataIfEmpty(
  prisma: PrismaClient,
  backendRoot: string,
  databaseUrl: string,
  logger: Logger
) {
  const existingUsers = await prisma.user.count().catch(() => 0);

  if (existingUsers > 0) {
    return;
  }

  logger.log("Business tables are empty. Running Prisma seed before building RAG database.");
  await runPrismaCommand(
    "prisma seed",
    [getTsxCliEntry(backendRoot), "prisma/seed.ts"],
    backendRoot,
    databaseUrl,
    logger
  );
}

async function fetchHtml(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "IntelliHealthCare-RAG-Builder/1.0 (+https://intellihealthcare.local)",
        Accept: "text/html,application/xhtml+xml"
      },
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return response.text();
  } finally {
    clearTimeout(timeout);
  }
}

function htmlToReadableText(html: string) {
  const withoutScripts = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ");

  const withLineBreaks = withoutScripts
    .replace(/<(br|hr)\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|section|article|main|aside|li|ul|ol|table|tr|h1|h2|h3|h4|h5|h6)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "\n- ");

  const plainText = decodeHtmlEntities(withLineBreaks.replace(/<[^>]+>/g, " "));
  const lines = plainText
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !isBoilerplateLine(line));

  const deduped: string[] = [];

  for (const line of lines) {
    if (deduped[deduped.length - 1] !== line) {
      deduped.push(line);
    }
  }

  return normalizeText(deduped.join("\n\n"));
}

function extractRelevantHtmlFragment(url: string, html: string) {
  const lowerUrl = url.toLowerCase();

  if (lowerUrl.includes("who.int")) {
    return extractHtmlBlock(html, /<article[^>]*>([\s\S]*?)<\/article>/i) ?? html;
  }

  if (lowerUrl.includes("cdc.gov")) {
    return extractHtmlBlock(html, /<main[^>]*>([\s\S]*?)<\/main>/i) ?? html;
  }

  if (lowerUrl.includes("medlineplus.gov")) {
    return (
      extractHtmlBlock(html, /<section[^>]+id=["']topsum_section["'][^>]*>([\s\S]*?)<\/section>/i) ??
      extractHtmlBlock(html, /<div[^>]+id=["']topic-summary["'][^>]*>([\s\S]*?)<\/div>/i) ??
      extractHtmlBlock(html, /<article[^>]*>([\s\S]*?)<\/article>/i) ??
      html
    );
  }

  return (
    extractHtmlBlock(html, /<main[^>]*>([\s\S]*?)<\/main>/i) ??
    extractHtmlBlock(html, /<article[^>]*>([\s\S]*?)<\/article>/i) ??
    html
  );
}

function extractHtmlBlock(html: string, pattern: RegExp) {
  const match = html.match(pattern);
  return match?.[1]?.trim();
}

function decodeHtmlEntities(text: string) {
  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&rsquo;/gi, "'")
    .replace(/&lsquo;/gi, "'")
    .replace(/&ldquo;/gi, '"')
    .replace(/&rdquo;/gi, '"')
    .replace(/&ndash;/gi, "-")
    .replace(/&mdash;/gi, "-")
    .replace(/&ge;/gi, ">=")
    .replace(/&le;/gi, "<=")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(Number.parseInt(code, 16)));
}

function extractHtmlTitle(html: string) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? normalizeText(decodeHtmlEntities(match[1])) : "";
}

function extractMetaDescription(html: string) {
  const patterns = [
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["'][^>]*>/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["'][^>]*>/i,
    /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["'][^>]*>/i
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      return normalizeText(decodeHtmlEntities(match[1]));
    }
  }

  return "";
}

function markdownToReadableLines(markdown: string) {
  return markdown
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.startsWith("##") && !line.startsWith("###"))
    .map((line) => line.replace(/^-\s*/, "").replace(/`/g, ""));
}

function extractMarkdownSection(markdown: string, heading: string) {
  const lines = markdown.split(/\r?\n/);
  const startIndex = lines.findIndex((line) => line.trim() === heading.trim());

  if (startIndex === -1) {
    return "";
  }

  const levelMatch = lines[startIndex].match(/^(#+)\s+/);
  const level = levelMatch?.[1].length ?? 1;
  const sectionLines = [lines[startIndex]];

  for (let index = startIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];
    const match = line.match(/^(#+)\s+/);

    if (match && match[1].length <= level) {
      break;
    }

    sectionLines.push(line);
  }

  return sectionLines.join("\n").trim();
}

function translateServiceCategory(category: string) {
  const map: Record<string, string> = {
    HOME_CARE: "家政护理",
    REHAB_THERAPY: "康复理疗",
    HOME_EXAM: "上门体检",
    ELDERLY_CARE: "养老机构"
  };

  return map[category] ?? category;
}

function translateSnippetKey(key: string) {
  const map: Record<string, string> = {
    faq: "常见问题",
    notice: "注意事项",
    cases: "适用人群"
  };

  return map[key] ?? key;
}

function translateStaffRole(role: string) {
  const map: Record<string, string> = {
    CAREGIVER: "护理员",
    DOCTOR: "医生",
    THERAPIST: "治疗师",
    NURSE: "护士",
    CUSTOMER_SERVICE: "客服",
    OPERATOR: "运营"
  };

  return map[role] ?? role;
}

function translateShiftStatus(status: ShiftStatus) {
  const map: Record<ShiftStatus, string> = {
    SCHEDULED: "待执行",
    ON_DUTY: "值班中",
    COMPLETED: "已完成",
    CANCELLED: "已取消"
  };

  return map[status];
}

function translateMetricType(metricType: MetricType) {
  const map: Record<MetricType, string> = {
    STEPS: "步数",
    HEART_RATE: "心率",
    SLEEP: "睡眠",
    WEIGHT: "体重",
    BLOOD_GLUCOSE: "血糖",
    BLOOD_PRESSURE: "血压",
    OXYGEN: "血氧",
    STRESS: "压力",
    TEMPERATURE: "体温"
  };

  return map[metricType];
}

function translateAlertLevel(level: string) {
  const map: Record<string, string> = {
    LOW: "低",
    MEDIUM: "中",
    HIGH: "高",
    CRITICAL: "紧急"
  };

  return map[level] ?? level;
}

function translateAlertStatus(status: string) {
  const map: Record<string, string> = {
    OPEN: "待处理",
    ACKNOWLEDGED: "已确认",
    RESOLVED: "已解决"
  };

  return map[status] ?? status;
}

function normalizeText(text: string) {
  return text
    .replace(/\r/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function extractKeywords(text: string, limit = 12) {
  const tokens = text.match(/[A-Za-z][A-Za-z-]{2,}|[\u4e00-\u9fa5]{2,}/g) ?? [];
  const stopwords = new Set([
    "the",
    "and",
    "for",
    "with",
    "that",
    "this",
    "from",
    "have",
    "will",
    "into",
    "about",
    "以及",
    "需要",
    "建议",
    "可以",
    "进行",
    "平台",
    "用户",
    "知识",
    "服务",
    "报告",
    "档案",
    "机构",
    "规则",
    "health",
    "blood",
    "pressure"
  ]);

  const frequency = new Map<string, number>();

  for (const token of tokens) {
    const normalizedToken = token.toLowerCase();
    if (stopwords.has(normalizedToken)) {
      continue;
    }
    frequency.set(normalizedToken, (frequency.get(normalizedToken) ?? 0) + 1);
  }

  return Array.from(frequency.entries())
    .sort((left, right) => right[1] - left[1])
    .slice(0, limit)
    .map(([token]) => token);
}

function buildDeterministicVector(text: string, dimensions = 64) {
  const vector = Array.from({ length: dimensions }, () => 0);

  for (let index = 0; index < text.length; index += 1) {
    const slot = index % dimensions;
    vector[slot] += text.charCodeAt(index);
  }

  const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value ** 2, 0));

  if (magnitude === 0) {
    return vector;
  }

  return vector.map((value) => Number((value / magnitude).toFixed(8)));
}

function estimateTokenCount(text: string) {
  return Math.max(1, Math.ceil(text.length / 4));
}

function hashText(text: string) {
  return createHash("sha256").update(text).digest("hex");
}

function toStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.map((item) => stringifyValue(item)).filter(Boolean)
    : [];
}

function toRecordArray(value: unknown) {
  return Array.isArray(value) ? value.filter(isPlainRecord) : [];
}

function toJsonRecord(value: unknown) {
  return isPlainRecord(value) ? value : {};
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringifyValue(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map((item) => stringifyValue(item)).join("、");
  }

  if ("toString" in Object(value)) {
    return String(value);
  }

  return JSON.stringify(value);
}

function summarizeOneLine(record: Record<string, unknown>) {
  return Object.entries(record)
    .flatMap(([key, value]) => {
      if (Array.isArray(value)) {
        return `${key}: ${value.map((item) => stringifyValue(item)).join("、")}`;
      }

      if (isPlainRecord(value)) {
        return Object.entries(value).map(
          ([nestedKey, nestedValue]) => `${key}.${nestedKey}: ${stringifyValue(nestedValue)}`
        );
      }

      return `${key}: ${stringifyValue(value)}`;
    })
    .join("；");
}

function formatMetricValue(metric: {
  metricType: MetricType;
  payload: Prisma.JsonValue | null;
  unit: string | null;
  value: Prisma.Decimal | null;
}) {
  if (metric.metricType === MetricType.BLOOD_PRESSURE && isPlainRecord(metric.payload)) {
    const systolic = metric.payload.systolic;
    const diastolic = metric.payload.diastolic;
    if (systolic !== undefined && diastolic !== undefined) {
      return `${stringifyValue(systolic)}/${stringifyValue(diastolic)} mmHg`;
    }
  }

  return `${metric.value?.toString() ?? "未知"}${metric.unit ? ` ${metric.unit}` : ""}`.trim();
}

function joinList(items: string[]) {
  return items.length > 0 ? items.join("、") : "无";
}

function formatDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function formatTime(value: Date) {
  return value.toISOString().slice(11, 16);
}

function formatDateTime(value: Date) {
  return value.toISOString().replace("T", " ").slice(0, 16);
}

function isBoilerplateLine(line: string) {
  const normalized = line.toLowerCase();
  if (normalized === "-") {
    return true;
  }
  const blacklist = [
    "cookie",
    "privacy policy",
    "skip to",
    "main content",
    "sign up",
    "subscribe",
    "follow us",
    "search",
    "menu",
    "home",
    "facebook",
    "twitter",
    "instagram"
  ];

  return blacklist.some((item) => normalized === item || normalized.startsWith(`${item} `));
}

function toJsonValue(value: unknown): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return Prisma.JsonNull;
  }

  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

async function runPrismaCommand(
  label: string,
  args: string[],
  cwd: string,
  databaseUrl: string,
  logger: Logger
) {
  try {
    const { stdout, stderr } = await execFileAsync(process.execPath, args, {
      cwd,
      env: {
        ...process.env,
        DATABASE_URL: databaseUrl
      },
      maxBuffer: PROCESS_OUTPUT_BUFFER_SIZE
    });

    if (stdout.trim()) {
      logger.log(stdout.trim());
    }

    if (stderr.trim()) {
      logger.warn(stderr.trim());
    }
  } catch (error) {
    const childProcessError = error as ChildProcessError;
    throw new Error(
      `${label} failed: ${
        childProcessError.stderr?.trim() ||
        childProcessError.stdout?.trim() ||
        childProcessError.message
      }`
    );
  }
}

function getPrismaCliEntry(backendRoot: string) {
  return require.resolve("prisma/build/index.js", {
    paths: [backendRoot, process.cwd()]
  });
}

function getTsxCliEntry(backendRoot: string) {
  return require.resolve("tsx/cli", {
    paths: [backendRoot, process.cwd()]
  });
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

void main().catch((error) => {
  const logger = new Logger("RagDatabaseBuilder");
  logger.error(getErrorMessage(error));
  process.exit(1);
});
