import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../../../common/auth/current-user.decorator";
import type { AuthenticatedUser } from "../../../common/auth/auth.types";
import { InternalAccessGuard } from "../../../common/auth/internal-access.guard";
import { JwtAuthGuard } from "../../../common/auth/jwt-auth.guard";
import { Roles } from "../../../common/auth/roles.decorator";
import { RolesGuard } from "../../../common/auth/roles.guard";
import { SwaggerTags } from "../../../common/http/swagger-tags";
import { AgentDispatchService } from "../application/agent-dispatch.service";
import { AgentGovernanceService } from "../application/agent-governance.service";
import { AgentOrchestratorService } from "../application/agent-orchestrator.service";
import { AgentTaskService } from "../application/agent-task.service";
import { RagKnowledgeService } from "../application/rag-knowledge.service";
import { RagEvaluationService } from "../application/rag-evaluation.service";
import { INTELLIHEALTHCARE_MULTI_AGENT_BLUEPRINT } from "../domain/framework-blueprint";
import { AgentRegistry } from "../domain/agent-registry";
import { EmbeddingGateway } from "../gateways/embedding.gateway";
import { LlmGateway } from "../gateways/llm.gateway";
import {
  CreateAgentTaskDto,
  ListAgentTasksQueryDto
} from "../dto/create-agent-task.dto";
import {
  ListAgentAuditLogsQueryDto,
  ListAgentReviewsQueryDto,
  ListRagEvalRunsQueryDto,
  ResolveAgentReviewDto
} from "../dto/governance.dto";
import {
  InternalRagKnowledgeBaseQueryDto,
  InternalRagSearchDto
} from "../dto/rag-search.dto";

@ApiTags(SwaggerTags.InternalAgents)
@ApiBearerAuth()
@Controller("internal/agents")
@UseGuards(JwtAuthGuard, InternalAccessGuard, RolesGuard)
@Roles("PLATFORM_ADMIN", "ORG_MANAGER", "DOCTOR", "CAREGIVER", "THERAPIST", "CUSTOMER_SERVICE")
export class AgentsController {
  constructor(
    private readonly agentRegistry: AgentRegistry,
    private readonly taskService: AgentTaskService,
    private readonly dispatchService: AgentDispatchService,
    private readonly orchestrator: AgentOrchestratorService,
    private readonly ragKnowledgeService: RagKnowledgeService,
    private readonly governanceService: AgentGovernanceService,
    private readonly ragEvaluationService: RagEvaluationService,
    private readonly llmGateway: LlmGateway,
    private readonly embeddingGateway: EmbeddingGateway
  ) {}

  @Get("definitions")
  getDefinitions() {
    return this.agentRegistry.listSummaries();
  }

  @Get("blueprint")
  getBlueprint() {
    return INTELLIHEALTHCARE_MULTI_AGENT_BLUEPRINT;
  }

  @Get("runtime-status")
  @ApiOperation({ summary: "查询多智能体运行时与模型接入状态" })
  getRuntimeStatus() {
    return {
      llm: this.llmGateway.getRuntimeStatus(),
      embedding: this.embeddingGateway.getRuntimeStatus()
    };
  }

  @Post("tasks")
  async createTask(@Body() body: CreateAgentTaskDto) {
    const task = await this.taskService.createTask(body);

    try {
      const job = await this.dispatchService.enqueueTask(task.id);

      return {
        task,
        queued: true,
        jobId: job.id
      };
    } catch (error) {
      await this.taskService.markFailed(
        task.id,
        this.orchestrator.buildDispatchFailureEnvelope(task, error)
      );
      throw error;
    }
  }

  @Get("tasks")
  listTasks(@Query() query: ListAgentTasksQueryDto) {
    return this.taskService.listTasks(query);
  }

  @Get("tasks/:taskId")
  getTask(@Param("taskId") taskId: string) {
    return this.taskService.findByIdOrThrow(taskId);
  }

  @Post("tasks/:taskId/retry")
  async retryTask(@Param("taskId") taskId: string) {
    const task = await this.taskService.retryTask(taskId);

    try {
      const job = await this.dispatchService.enqueueTask(task.id);

      return {
        task,
        queued: true,
        jobId: job.id
      };
    } catch (error) {
      await this.taskService.markFailed(
        task.id,
        this.orchestrator.buildDispatchFailureEnvelope(task, error)
      );
      throw error;
    }
  }

  @Get("reviews")
  @ApiOperation({ summary: "查询人工复核队列" })
  listReviews(@Query() query: ListAgentReviewsQueryDto) {
    return this.governanceService.listReviews(query);
  }

  @Get("reviews/:reviewId")
  @ApiOperation({ summary: "获取人工复核详情" })
  getReview(@Param("reviewId") reviewId: string) {
    return this.governanceService.getReviewById(reviewId);
  }

  @Post("reviews/:reviewId/decision")
  @ApiOperation({ summary: "提交人工复核决策" })
  resolveReview(
    @CurrentUser() user: AuthenticatedUser,
    @Param("reviewId") reviewId: string,
    @Body() body: ResolveAgentReviewDto
  ) {
    return this.governanceService.resolveReview(reviewId, user, body);
  }

  @Get("audit-logs")
  @ApiOperation({ summary: "查询智能体审计日志" })
  listAuditLogs(@Query() query: ListAgentAuditLogsQueryDto) {
    return this.governanceService.listAuditLogs(query);
  }

  @Get("rag/knowledge-bases")
  @ApiOperation({ summary: "查询 RAG 知识库列表" })
  listKnowledgeBases(@Query() query: InternalRagKnowledgeBaseQueryDto) {
    return this.ragKnowledgeService.listKnowledgeBasesForInternal(query);
  }

  @Post("rag/search")
  @ApiOperation({ summary: "执行 RAG 检索" })
  searchKnowledge(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: InternalRagSearchDto
  ) {
    return this.ragKnowledgeService.searchForInternal(user, body);
  }

  @Get("rag/evals")
  @ApiOperation({ summary: "查询 RAG 评测结果" })
  listRagEvalRuns(@Query() query: ListRagEvalRunsQueryDto) {
    return this.ragEvaluationService.listRuns(query);
  }

  @Get("rag/evals/:runId")
  @ApiOperation({ summary: "获取 RAG 评测详情" })
  getRagEvalRun(@Param("runId") runId: string) {
    return this.ragEvaluationService.getRunById(runId);
  }
}
