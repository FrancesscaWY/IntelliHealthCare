# 后端开发进度审计日志（2026-04-22）

## 1. 记录信息

- 审计时间：`2026-04-22`（UTC）
- 审计对象：`/home/wy/IntelliHealthCare/apps/backend`
- 审计方式：代码静态审计 + TypeScript 编译校验
- 审计基线：以当前仓库代码为准，不以旧蓝图或历史文档为准
- 已执行校验：
  - `npm run check:backend`
  - `npm run build:backend`
- 本次未执行：
  - 本地 API 冒烟联调
  - Redis / MinIO / PostgreSQL 真实连通性验证
  - `RAG` 重建脚本实跑
  - BullMQ Worker 运行态压测

## 2. 审计结论

本次审查结论如下：

1. 当前后端已经明显超过“脚手架/空壳模块”阶段，已形成可编译、可挂载、可联调的模块化单体后端。
2. `P0` 主业务域已经具备较完整 API 面，包括认证、用户/家庭、健康档案、健康指标、健康生活方式、服务目录、订单、支付、报告、后台总览。
3. `P1` 扩展域也并非空壳，`messaging`、`content`、`community`、`files`、`agents` 都已经有控制器和服务实现。
4. Hermes 多智能体运行时已经达到 `MVP 已打通` 状态，包含任务入库、队列调度、Worker 执行、受控工具、App AI 接口和内部 Agent 管理接口。
5. 当前主要短板已经从“有没有模块”转为“是否达到生产级”，集中体现在鉴权演示逻辑、文件上传落地方式、自动化测试覆盖、Embedding/RAG 生产化能力等方面。

一句话判断：当前状态更接近“联调级业务后端 + Hermes MVP + RAG 首版底座”，还不能直接定义为“生产级后端已完成”。

## 3. 静态指标

基于当前代码静态统计得到：

| 指标 | 数值 | 说明 |
| --- | ---: | --- |
| Nest 模块目录数 | `17` | `apps/backend/src/modules/*` |
| 控制器文件数 | `18` | 含 `agents` 下 2 个控制器 |
| 服务文件数 | `21` | 含 Agent / RAG / 网关服务 |
| REST 路由数 | `188` | 仅统计 `@Get/@Post/@Put/@Patch/@Delete` |
| Prisma Model 数 | `60` | 当前 `schema.prisma` |
| Prisma Enum 数 | `49` | 当前 `schema.prisma` |
| Migration 数 | `3` | 当前已提交迁移目录 |

按 API 面拆分的路由分布：

| API 面 | 路由数 |
| --- | ---: |
| `app` | `157` |
| `admin` | `12` |
| `internal` | `8` |
| `system` | `2` |
| `public` | `9` |

## 4. 代码实现进度

### 4.1 基础工程与基础设施

| 领域 | 状态 | 审计结论 |
| --- | --- | --- |
| 启动与全局中间件 | 已完成 | `main.ts` 已接入全局参数校验、统一异常过滤、统一响应包装、Swagger、CORS。 |
| 环境变量治理 | 已完成 | `env.schema.ts` 已对数据库、JWT、Redis、MinIO、LLM、Embedding、Agent 预算等参数做集中校验。 |
| 数据库层 | 已完成 | `PrismaModule + PrismaService + schema.prisma + migrations + seed.ts` 已成体系。 |
| 开发态数据库 fallback | 已完成 | `database-bootstrap.ts` 已支持开发机 PostgreSQL 不可达时自动切换嵌入式 `PGlite`。 |
| Redis / BullMQ | 已完成 | `QueueService`、`AgentDispatchService`、`AgentTaskProcessor` 已打通异步任务基础链路。 |
| MinIO 客户端封装 | 已完成 | `StorageService` 已封装 MinIO Client 与 bucket 配置。 |
| 系统健康检查 | 部分完成 | `system/health` 会检查 PostgreSQL 和 Redis，但对象存储当前只返回 `configured`，未做真实探活。 |

### 4.2 业务域进度

以下状态定义：

- `已完成（联调级）`：控制器、服务、数据访问已落地，编译通过，可用于联调。
- `部分完成`：功能已存在，但仍以复用、占位或演示实现为主，暂不建议按生产级口径表述。
- `MVP 已完成`：主链路已打通，但治理、评测或生产化仍待补齐。

| 模块 | 路由数 | 状态 | 审计结论 |
| --- | ---: | --- | --- |
| `auth` | `12` | 部分完成 | 用户端/后台端登录、刷新、短信验证码、重置密码已接入；但当前仍使用固定验证码和演示密码匹配逻辑。 |
| `users` | `21` | 已完成（联调级） | 已覆盖 `me/profile`、实名认证、首页聚合、定位、热搜/历史搜索、全局搜索等核心入口。 |
| `family` | `4` | 部分完成 | API 已可用，但 `FamilyService` 当前主要复用 `UsersService` 的绑定与地址逻辑，领域尚未完全独立。 |
| `health-archive` | `5` | 已完成（联调级） | 档案摘要、基础信息、病史与长期记忆的查询与更新已实现。 |
| `health-metrics` | `21` | 已完成（联调级） | 指标概览、趋势、记录 CRUD、设备绑定/详情/设置、用药管理已实现。 |
| `health-lifestyle` | `10` | 已完成（联调级） | 饮食、食谱、自测等健康生活方式能力已经落到独立模块。 |
| `service-catalog` | `9` | 已完成（联调级） | 服务分类、列表、详情、机构信息读取已实现。 |
| `orders` | `20` | 已完成（联调级） | 预约选项、预览、创建、列表、详情、改约、取消、评价、售后、后台派单/工单状态更新已实现。 |
| `payments` | `4` | 已完成（联调级） | 支付渠道、支付单创建、支付确认、支付详情已实现。 |
| `reports` | `7` | 已完成（联调级） | 体检报告列表、新增、详情、删除、后台审核已实现；非 AI 报告解读仍是模板化结果。 |
| `admin` | `3` | 部分完成 | 已有总览、长者详情、工单列表等后台核心页数据接口，但后台业务面明显未覆盖完整运营场景。 |
| `messaging` | `8` | 已完成（联调级） | 消息概览、通知、医生咨询会话、消息列表、发送消息、已读处理已实现。 |
| `content` | `17` | 已完成（联调级） | 资讯、讲堂、疾病知识、点赞收藏分享、评论等接口已实现。 |
| `community` | `21` | 已完成（联调级） | 话题、帖子、评论、活动列表、报名、互动能力已实现。 |
| `files` | `3` | 部分完成 | 已支持上传前置申请、上传完成后落库、文件信息查询；但预签名上传当前仍是占位 URL 方案。 |
| `system` | `2` | 已完成 | 健康检查与后端架构说明接口可用。 |

### 4.3 Agents / Hermes / RAG 进度

| 领域 | 状态 | 审计结论 |
| --- | --- | --- |
| Agent 模块装配 | 已完成 | `AgentsModule` 已注册 2 个控制器、5 个核心服务、5 个工具、2 个网关、1 个 Worker。 |
| 内部 Agent API | 已完成 | `/api/v1/internal/agents/*` 已提供蓝图、定义、任务创建、任务列表、重试、RAG 知识库查询、RAG 检索。 |
| App AI API | 已完成 | `/api/v1/app/ai/*` 已提供助手会话、服务推荐、预约预填、健康摘要、风险提醒、知识检索等接口。 |
| AgentTask 生命周期 | 已完成 | 已支持 `PENDING -> RUNNING -> SUCCEEDED/FAILED` 状态流转及失败重试。 |
| BullMQ Worker | 已完成 | `agent-task.processor.ts` 已负责消费队列、执行任务、处理重试与失败回写。 |
| Agent Registry | 已完成 | 当前已注册 `9` 个核心 Agent，已支持 `21` 个可执行任务类型。 |
| 受控工具层 | 已完成 | 已有报告、健康档案、健康指标、服务目录、RAG 检索五类工具。 |
| LLM Gateway | MVP 已完成 | 已支持 `deepseek`、`openrouter`、`openai-compatible`、`mock`，并带结构化输出与 tool calling。 |
| Embedding Gateway | MVP 已完成 | 已支持 embedding 请求，但在 `deepseek` 直连模式下仍回落到确定性向量。 |
| RAG 数据底座 | 已完成首版 | Prisma 枚举、知识库表、检索服务、构建脚本、App/内部/Agent 三条调用链路已落地。 |
| 多 Agent 编排 | MVP 已完成 | `AgentOrchestratorService` 已支持受控协作链路，不再只是单 Agent 占位。 |

## 5. 关键证据

本次结论主要依据以下代码事实：

- 应用装配：
  - `apps/backend/src/app.module.ts`
  - `apps/backend/src/main.ts`
- 基础设施：
  - `apps/backend/src/common/config/env.schema.ts`
  - `apps/backend/src/common/bootstrap/database-bootstrap.ts`
  - `apps/backend/src/infra/prisma/*`
  - `apps/backend/src/infra/queue/*`
  - `apps/backend/src/infra/storage/*`
- 数据模型：
  - `apps/backend/prisma/schema.prisma`
  - `apps/backend/prisma/migrations/*`
  - `apps/backend/prisma/seed.ts`
- 业务模块：
  - `apps/backend/src/modules/auth/*`
  - `apps/backend/src/modules/users/*`
  - `apps/backend/src/modules/family/*`
  - `apps/backend/src/modules/health-archive/*`
  - `apps/backend/src/modules/health-metrics/*`
  - `apps/backend/src/modules/health-lifestyle/*`
  - `apps/backend/src/modules/service-catalog/*`
  - `apps/backend/src/modules/orders/*`
  - `apps/backend/src/modules/payments/*`
  - `apps/backend/src/modules/reports/*`
  - `apps/backend/src/modules/admin/*`
  - `apps/backend/src/modules/messaging/*`
  - `apps/backend/src/modules/content/*`
  - `apps/backend/src/modules/community/*`
  - `apps/backend/src/modules/files/*`
- 智能体与 RAG：
  - `apps/backend/src/modules/agents/agents.module.ts`
  - `apps/backend/src/modules/agents/controllers/*`
  - `apps/backend/src/modules/agents/application/*`
  - `apps/backend/src/modules/agents/domain/*`
  - `apps/backend/src/modules/agents/gateways/*`
  - `apps/backend/scripts/build-rag-db.ts`

## 6. 风险与缺口

以下问题不影响“当前代码已具备联调级能力”的判断，但会直接影响是否能按生产级口径对外描述：

| 事项 | 当前情况 | 影响判断 | 建议优先级 |
| --- | --- | --- | --- |
| 鉴权实现仍为演示逻辑 | `sendSmsCode()` 返回固定验证码；密码校验仍兼容明文/演示 hash。 | 不能按生产级安全能力描述。 | `P0` |
| 文件上传未真实预签名 | `createPresign()` 当前返回占位上传地址，未调用 MinIO `presignedPutObject`。 | 文件域只能算“接口形态已建”，不能算完整对象存储链路。 | `P0` |
| 自动化测试薄弱 | 后端 workspace 没有独立 `test` 脚本；当前主要依赖编译和根目录 smoke 脚本。 | 回归稳定性不足，影响持续交付。 | `P0` |
| Embedding 仍有回退方案 | `deepseek` 官方直连模式下，Embedding 仍使用确定性向量回退。 | 检索效果与线上质量评估暂不稳定。 | `P1` |
| RAG 评测与增量治理未补齐 | 数据底座、检索 API 已有，但缺少评测、增量同步、排序优化闭环。 | 影响知识检索质量和运维效率。 | `P1` |
| 后台业务面仍偏薄 | 当前后台只覆盖总览、长者详情、工单等核心页。 | 不适合描述为“后台全量完成”。 | `P1` |
| 健康检查未探活 MinIO | `system/health` 对对象存储仅返回 `configured`。 | 运维观测不完整。 | `P2` |

## 7. 校验结果

本次执行结果：

```bash
npm run check:backend
npm run build:backend
```

结果：

- `check:backend` 通过
- `build:backend` 通过
- 当前审计未发现 TypeScript 编译错误

说明：

- 本次结论已确认“当前代码可以编译”。
- 但“可编译”不等于“已完成生产化验证”。

## 8. 建议的下一阶段推进顺序

建议后续按以下顺序推进：

1. 先补生产化短板：
   - 替换演示鉴权逻辑
   - 接通真实 MinIO 预签名上传
   - 为后端补单测 / 集成测试 / 冒烟回归
2. 再补智能体质量闭环：
   - 接入真实 embedding 能力
   - 建立 RAG 评测与增量更新机制
   - 对高风险 Agent 输出补人工复核和审计策略
3. 最后扩后台与运营面：
   - 完整后台业务域
   - 更丰富的运营管理与内容治理能力

## 9. 最终判断

截至 `2026-04-22`，IntelliHealthCare 后端应被表述为：

- 已完成模块化单体基础工程
- 已完成核心业务域的联调级 API 实现
- 已完成 Hermes 多智能体运行时 `MVP`
- 已完成首版 `RAG` 数据底座与检索接入
- 尚未完成生产级安全、测试、文件链路与检索质量治理

不建议继续沿用“部分模块仍为空壳”这一旧判断；更准确的说法应当是“模块已基本落地，但生产化深度不一”。
