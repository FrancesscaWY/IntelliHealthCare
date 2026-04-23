# 智诊康养后端技术栈与基础架构

## 1. 选型结论

结合 [`智诊康养项目文档0420.pdf`](./智诊康养项目文档0420.pdf) 的业务要求，后端建议采用：

- `Node.js 20 + TypeScript`
- `NestJS` 作为主框架
- `PostgreSQL + Prisma` 作为核心事务数据层
- `Redis + BullMQ` 作为缓存、会话辅助、异步任务与 Agent 调度队列
- `MinIO` 作为本地对象存储，后续可切换到 S3/OSS
- `Swagger/OpenAPI` 作为接口契约输出
- `JWT + RBAC` 作为统一鉴权与后台权限模型

当前阶段选择 `模块化单体`，不直接拆微服务。

原因：

- 项目文档强调的是“健康建档 -> 服务预约 -> 后台派单 -> 报告回填 -> 风险提醒”的强业务闭环，核心域之间强关联，先拆微服务会显著增加联调和事务复杂度。
- 仓库当前已采用 TypeScript Monorepo，后端继续使用 TS 技术栈，能复用接口契约、校验思路和团队认知。
- 文档中的 AI/Agent 是协同层，不是独立主业务系统；它更适合作为后端中的异步域能力接入，而不是一开始就独立成多套服务。
- 平台角色虽多，但访问量形态更偏“中后台 + 预约业务 + 异步任务”，模块化单体足以支撑首期落地，并为后续按域拆分预留边界。

补充口径：

- 系统边界只区分用户侧、后台侧与内部协同层。
- 老人和家属属于同一用户侧内的不同业务角色，不对应两套前端或两套后端系统。

## 2. 为什么是这套技术栈

### 2.1 NestJS

适合本项目的原因：

- 天然支持模块化组织，能对应文档里的认证、档案、订单、报告、消息、Agent 等业务域
- 内建守卫、拦截器、过滤器，适合做统一响应格式、权限控制和审计
- 后续接 WebSocket、定时任务、Swagger、JWT、RBAC 成本低

### 2.2 PostgreSQL + Prisma

适合本项目的原因：

- 订单、工单、档案、角色权限、报告等核心数据强事务、强关联，关系型数据库更合适
- PostgreSQL 对 `JSONB` 支持成熟，适合承接健康摘要、Agent 输出、RAG 命中结果、结构化报告内容
- Prisma 在 TypeScript 项目中开发效率高，便于先快速稳定模型，再演进复杂查询

### 2.3 Redis + BullMQ

适合本项目的原因：

- 风险扫描、报告生成、消息推送、回访提醒、Agent 编排都更适合异步任务
- Redis 还可以承接验证码、限流、短期缓存、会话辅助和消息未读计数

### 2.4 MinIO

适合本项目的原因：

- 文档明确存在体检报告、服务照片、会话图片/语音等文件场景
- 本地开发用 MinIO，部署时可以平滑替换为云对象存储

## 3. 后端模块边界

首期建议按以下业务域落模块：

- `auth`：登录、刷新令牌、后台 RBAC、权限守卫
- `users`：用户侧账号（含老人、家属）、后台账号、个人资料、紧急联系人
- `family`：家庭成员、家属绑定、地址、授权
- `health-archive`：基础档案、病史、慢病标签、长期记忆
- `health-metrics`：健康数据、设备指标、异常提醒、趋势解释
- `service-catalog`：服务目录、服务规则、知识库素材
- `orders`：预约、订单、工单、售后入口
- `payments`：支付单、支付状态同步、退款入口
- `reports`：体检报告、服务报告、回填档案
- `messaging`：通知、客服会话、医生咨询、助手会话
- `community`：生活圈、活动报名、互动行为
- `content`：健康资讯、讲堂、疾病知识
- `agents`：需求理解、服务推荐、订单调度、报告生成、风险识别
- `admin`：后台工作台、运营统计、配置中心

## 4. 数据层设计原则

数据库不追求一次性把所有字段定满，而是先稳定以下核心实体：

- 用户与角色：`User`、`Role`、`UserRole`
- 家属关系：`FamilyBinding`
- 健康档案：`HealthArchive`
- 设备：`Device`
- 服务目录：`ServiceItem`
- 订单与工单：`Order`、`WorkOrder`
- 报告：`Report`
- 会话：`Conversation`、`ConversationParticipant`、`ConversationMessage`
- Agent 任务：`AgentTask`

其中 `HealthArchive.longTermMemory`、`Order.aiSummary`、`Report.summary` 等字段采用 `JSON`，用于容纳 Agent 输出和逐步稳定中的结构化摘要。

## 5. 基础设施落地

当前仓库已新增：

- `/home/wy/IntelliHealthCare/apps/backend`
- `/home/wy/IntelliHealthCare/apps/backend/prisma/schema.prisma`
- `/home/wy/IntelliHealthCare/docker-compose.backend.yml`

本地基础设施包括：

- PostgreSQL：`5432`
- Redis：`6379`
- MinIO API：`9000`
- MinIO Console：`9001`

## 6. Agent 层接入策略

按照 PDF 中“需求理解 Agent、健康档案 Agent、服务推荐 Agent、订单调度 Agent、智能派单 Agent、报告生成 Agent、风险识别 Agent”的设计，首期不建议把 Agent 直接做成独立部署集群，而是先采用：

- API 层负责同步请求接入和权限判断
- 队列层负责任务投递
- `agents` 模块负责 Prompt/工具编排、结果入库、状态回写
- RAG 知识库按服务目录、健康知识、平台规则、机构资源、用户档案五类组织

这样可以先把“Agent 是业务协同能力”落到系统中，而不是先搭复杂的 AI 基础平台。

## 7. 未来拆分建议

当出现以下信号时，再考虑按域拆分：

- 订单/工单流量与 Agent 任务流量明显不对称
- 会话消息与普通业务 API 的吞吐差异过大
- 报告生成或风险扫描形成独立批处理集群需求
- 机构协同和平台运营需要独立部署节奏

优先拆分顺序建议：

1. `messaging + websocket`
2. `agents + queue workers`
3. `orders/work-orders`
4. `content/community`
