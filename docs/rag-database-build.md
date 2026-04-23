# RAG 数据库设计与构建说明

## 1. 目标与当前状态

本文档对应 IntelliHealthCare 多智能体框架 `Phase 3：建设 RAG 与知识分层` 的首版落地实现。

截至 2026-04-22（UTC），后端已经完成以下工作：

- 为 5 类知识库建立独立 RAG 数据模型，而不是继续复用业务表里的零散 `ragSnippet`
- 新增可重复执行的 RAG 构建脚本：`apps/backend/scripts/build-rag-db.ts`
- 已完成检索服务与 API 层正式接入，支持 App、内部管理面和 Agent 工具三条调用链路
- 已完成一轮实际构建，当前库内共有：
  - `9` 个知识库
  - `40` 篇文档
  - `81` 个 chunk
- 已导入一批真实公开健康知识页面，以及一批本地业务样例数据

构建命令：

```bash
npm run db:build-rag:backend
```

该命令会自动执行：

1. `prisma migrate deploy`
2. 若业务表为空，则执行 `prisma seed`
3. 构建并回填 RAG 知识库、文档、chunk、导入批次记录

---

## 2. 数据模型

本次新增了 4 张核心表和 5 个枚举：

- `RagKnowledgeBase`
- `RagDocument`
- `RagChunk`
- `RagIngestionRun`

枚举：

- `RagKnowledgeType`
- `RagVisibilityScope`
- `RagDocumentStatus`
- `RagIngestionStatus`
- `RagSourceType`

### 2.1 表职责

`RagKnowledgeBase`

- 描述知识库本身
- 承载知识类型、可见性、来源配置、刷新策略、分块策略
- 对机构知识和用户私有知识绑定 `institutionId` / `ownerUserId`

`RagDocument`

- 表示一篇可引用的原始知识文档
- 保存标题、摘要、全文文本、来源 URI、元数据、权限策略
- 是引用回传时的第一层追踪单位

`RagChunk`

- 表示检索最小单元
- 保存 chunk 文本、关键词、heading、embedding、可见性
- 是召回、排序、引用定位时的直接单位

`RagIngestionRun`

- 记录一次导入任务
- 保存导入状态、文档数、chunk 数、失败原因

### 2.2 权限相关字段

`PUBLIC`

- 面向公共健康知识、服务目录、平台规则

`INSTITUTION`

- 面向机构资源知识
- 通过 `institutionId` 做隔离

`USER_PRIVATE`

- 面向用户个体档案知识
- 通过 `ownerUserId` + `accessPolicy` 做隔离

---

## 3. 五层知识库设计

### 3.1 服务目录知识

知识类型：`SERVICE_CATALOG`

当前知识库：

- `rag-service-catalog-public`

来源系统：

- `ServiceItem`
- `Institution`

更新频率：

- 建议按日同步
- 服务目录、机构信息更新后可触发重建

分块策略：

- 单服务单文档
- 当前样例数据较短，通常 1 服务 = 1 chunk

核心元数据：

- `serviceId`
- `serviceCode`
- `category`
- `institutionId`
- `regionScope`

权限边界：

- `visibility = PUBLIC`

当前已导入：

- `8` 篇服务目录文档

### 3.2 健康知识

知识类型：`HEALTH_KNOWLEDGE`

当前知识库：

- `rag-health-knowledge-public`

来源系统：

- 公开网页抓取
  - WHO 高血压事实页
  - WHO Ageing and health
  - CDC Older Adult Fall Prevention
  - MedlinePlus High Blood Pressure
- 本地内容表
  - `Article`
  - `Lecture`
  - `DiseaseKnowledge`

更新频率：

- 公开网页建议按周更新
- 内容表建议在发布后增量重建

分块策略：

- 网页正文按段落窗口切块
- 本地文章/讲堂/疾病知识按结构段落切块
- 默认目标 `820` 字符，重叠 `140` 字符

核心元数据：

- `sourceName`
- `recordType`
- `slug`
- `department`
- `fetchedAt`
- `sourceUri`

权限边界：

- `visibility = PUBLIC`

当前已导入：

- `14` 篇文档
- 其中包含真实公开网页抓取文档 `4` 篇

### 3.3 平台规则知识

知识类型：`PLATFORM_RULE`

当前知识库：

- `rag-platform-rule-public`

来源系统：

- `docs/hermes-multi-agent-implementation.md`
- `docs/智诊康养后端开发文档.md`
- 当前业务边界规则的结构化整理

更新频率：

- 文档或权限策略变更后手动重建

分块策略：

- 单规则主题单文档
- 当前规模较小，基本 1 文档 = 1 chunk

核心元数据：

- `repoPath`
- `sections`
- `relatedTables`
- `enforcement`

权限边界：

- 当前作为系统公共规则知识处理，`visibility = PUBLIC`

当前已导入：

- `3` 篇规则文档

### 3.4 机构资源知识

知识类型：`INSTITUTION_RESOURCE`

当前知识库：

- `rag-institution-resource-qsyz001`
- `rag-institution-resource-nykyz002`
- `rag-institution-resource-rhkf003`

来源系统：

- `Institution`
- `Staff`
- `StaffSchedule`
- `ServiceItem`

更新频率：

- 建议按日重建
- 排班、人员、可售服务变化后增量重建

分块策略：

- 当前按机构聚合为单文档
- 若后续机构规模扩大，建议拆成：
  - 机构概况文档
  - 人员技能文档
  - 排班可用性文档
  - 服务覆盖区域文档

核心元数据：

- `institutionId`
- `institutionCode`
- `serviceCount`
- `staffCount`

权限边界：

- `visibility = INSTITUTION`
- 通过 `institutionId` 做数据隔离

当前已导入：

- `3` 个机构知识库
- 每个机构 1 篇概览文档

### 3.5 用户个体档案知识

知识类型：`USER_PRIVATE_ARCHIVE`

当前知识库：

- `rag-user-private-user_elder_joy`
- `rag-user-private-user_elder_zhou`
- `rag-user-private-user_elder_lin`

来源系统：

- `HealthArchive`
- `Report`
- `HealthMetricRecord`
- `Order`
- `FamilyBinding`

更新频率：

- 建议按日重建
- 档案更新、报告发布、指标同步、订单状态变化后增量重建

分块策略：

- 每个用户一个私有知识库
- 文档按主题拆分：
  - 基础档案
  - 近期指标
  - 单篇报告
  - 历史订单

核心元数据：

- `archiveId`
- `reportId`
- `subjectUserId`
- `ownerUserId`
- `orderCount`
- `metricCount`

权限边界：

- `visibility = USER_PRIVATE`
- 文档强制写入 `ownerUserId`
- `accessPolicy.authorizedFamilyMembers` 保存家属授权范围
- 家属访问必须结合 `FamilyBinding.authScope` 二次校验，不能直接按公共知识处理

当前已导入：

- 王秀珍：`6` 篇文档
- 周国华：`4` 篇文档
- 林素云：`2` 篇文档

---

## 4. 当前样例数据明细

### 4.1 真实公开数据

当前已抓取的真实公开页面：

- `https://www.who.int/news-room/fact-sheets/detail/hypertension`
- `https://www.who.int/news-room/fact-sheets/detail/ageing-and-health`
- `https://www.cdc.gov/falls/index.html`
- `https://medlineplus.gov/highbloodpressure.html`

处理方式：

- WHO：抽取 `<article>` 正文
- CDC：抽取 `<main>` 正文
- MedlinePlus：抽取 `topsum_section` 摘要正文

### 4.2 本地示例数据

当前已纳入 RAG 构建的本地业务/内容样例：

- 服务目录：`ServiceItem`
- 机构资源：`Institution` / `Staff` / `StaffSchedule`
- 用户私有档案：`HealthArchive` / `Report` / `HealthMetricRecord` / `Order`
- 健康内容：`Article` / `Lecture` / `DiseaseKnowledge`
- 平台规则：仓库文档与当前权限边界规则

---

## 5. 引用回传规范

当前文档和 chunk 元数据已经支持引用回传。建议 Agent/RAG 统一按以下字段返回：

```json
{
  "knowledgeBaseCode": "rag-health-knowledge-public",
  "documentId": "cmxxxxxxxxxxxx",
  "chunkId": "cmxxxxxxxxxxxx",
  "title": "Hypertension",
  "sourceUri": "https://www.who.int/news-room/fact-sheets/detail/hypertension",
  "chunkIndex": 0
}
```

`sourceUri` 约定：

- 业务记录：`record://表名/主键`
- 仓库文档：`repo://相对路径#章节`
- 公开网页：直接使用原始 URL

---

## 6. 分块与 embedding 策略

### 6.1 分块策略

默认参数：

- `targetChars = 820`
- `overlapChars = 140`
- `minChunkChars = 180`

切块逻辑：

1. 先按段落切
2. 超长段落再按句子切
3. 相邻 chunk 保留尾部重叠，降低跨段信息断裂

### 6.2 embedding 策略

当前 chunk embedding 存在 `RagChunk.embedding`，但当前实现使用：

- `embeddingModel = deterministic-hash-v1`

原因：

- 当前多智能体 backbone 已确认走 `deepseek-chat`
- 但仓库现阶段尚未把 DeepSeek 官方直连模式接到正式 embedding 接口
- 因此当前采用“落库 deterministic embedding + 查询侧 fallback embedding”的折中方案，保证 RAG 表结构、导入链路、检索 API、Agent 检索扩展位全部就绪

后续若接入正式 embedding 服务，只需替换构建脚本中的向量生成逻辑，不需要改表结构。

---

## 7. 访问控制要求

这是本项目最重要的 RAG 约束之一。

### 7.1 公共知识

适用：

- 健康百科
- 服务目录
- 平台规则

规则：

- 允许作为通用召回库
- 不允许混入用户私有文档

### 7.2 机构知识

适用：

- 机构能力
- 排班资源
- 可服务区域

规则：

- 必须绑定 `institutionId`
- 检索时先按机构过滤，再做召回

### 7.3 用户私有知识

适用：

- 档案
- 报告
- 指标
- 历史订单

规则：

- 必须绑定 `ownerUserId`
- 必须带 `accessPolicy`
- 家属访问必须结合 `FamilyBinding.authScope`
- 绝不能与公共知识同库同权处理

---

## 8. 检索服务与 API 层

当前检索能力已经在后端正式接入，统一收口于：

- `apps/backend/src/modules/agents/application/rag-knowledge.service.ts`

### 8.1 App 检索 API

路由：

- `GET /api/v1/app/ai/knowledge/search`

当前能力：

- 默认检索 `PUBLIC` 知识
- 允许显式传入 `includePrivate=true` 后联查 `USER_PRIVATE`
- 若家属传入 `elderId`，会结合 `FamilyBinding` 做授权校验
- 不开放 `INSTITUTION_RESOURCE` 给用户端直接查询

### 8.2 内部检索 API

路由：

- `GET /api/v1/internal/agents/rag/knowledge-bases`
- `POST /api/v1/internal/agents/rag/search`

当前能力：

- 支持按 `knowledgeTypes`、`visibilityScopes`、`ownerUserId`、`institutionId` 过滤
- 支持统一查看已建知识库清单、最近导入批次和文档/chunk 数量
- 继续受后台 `JWT(admin scope) + 来源 IP + 可选共享密钥` 约束

### 8.3 Agent 工具层接入

当前工具：

- `searchKnowledgeBase`

已接入的 Agent：

- `HealthManagementAgent`
- `CareCoordinationAgent`

当前行为：

- 检索结果会压缩后注入 prompt
- 同时把 citation 回填到 evidence，便于前后端联调时核对来源

### 8.4 当前检索实现

当前不是向量数据库方案，而是首版可用实现：

1. 先按 `RagChunk.title/content contains` 做词法候选召回
2. 再用 query embedding 与 chunk embedding 做余弦相似度重排
3. 最终返回 chunk excerpt、knowledge base 信息、document 信息和 citation

截至 2026-04-22（UTC）已做过一次运行时 smoke check，验证结果包括：

- App 公共检索可命中 `rag-health-knowledge-public`
- App 私有检索可在授权后命中 `rag-user-private-user_elder_joy`
- 内部检索可同时命中 `PUBLIC + INSTITUTION` 范围知识

## 9. 已落地文件

- Prisma schema：
  - `apps/backend/prisma/schema.prisma`
- 迁移：
  - `apps/backend/prisma/migrations/20260422000200_add_rag_knowledge_db/migration.sql`
- 构建脚本：
  - `apps/backend/scripts/build-rag-db.ts`
- 运行命令：
  - `apps/backend/package.json`
  - `package.json`

---

## 10. 后续建议

当前已经完成的是“RAG 数据底座 + 首批数据 + 检索服务/API 正式接入”。下一步建议按下面顺序推进：

1. 接入正式 embedding 服务，替换当前 deterministic 向量与查询侧 fallback 向量
2. 增加增量重建任务，而不是每次全量重建某个知识库
3. 为检索链路补评测集、召回率指标和错误样本回放
4. 视规模引入更强的索引能力，例如 `pg_trgm`、全文检索或专用向量索引
5. 继续把 citation 输出前端化，形成“答案 - 证据 - 来源”可核验闭环
