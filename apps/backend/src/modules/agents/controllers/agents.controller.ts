import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { InternalAccessGuard } from "../../../common/auth/internal-access.guard";
import { JwtAuthGuard } from "../../../common/auth/jwt-auth.guard";
import { Roles } from "../../../common/auth/roles.decorator";
import { RolesGuard } from "../../../common/auth/roles.guard";
import { AgentDispatchService } from "../application/agent-dispatch.service";
import { AgentOrchestratorService } from "../application/agent-orchestrator.service";
import { AgentTaskService } from "../application/agent-task.service";
import { INTELLIHEALTHCARE_MULTI_AGENT_BLUEPRINT } from "../domain/framework-blueprint";
import { AgentRegistry } from "../domain/agent-registry";
import {
  CreateAgentTaskDto,
  ListAgentTasksQueryDto
} from "../dto/create-agent-task.dto";

@ApiTags("agents")
@ApiBearerAuth()
@Controller("internal/agents")
@UseGuards(JwtAuthGuard, InternalAccessGuard, RolesGuard)
@Roles("PLATFORM_ADMIN", "ORG_MANAGER", "DOCTOR", "CAREGIVER", "THERAPIST", "CUSTOMER_SERVICE")
export class AgentsController {
  constructor(
    private readonly agentRegistry: AgentRegistry,
    private readonly taskService: AgentTaskService,
    private readonly dispatchService: AgentDispatchService,
    private readonly orchestrator: AgentOrchestratorService
  ) {}

  @Get("definitions")
  getDefinitions() {
    return this.agentRegistry.listSummaries();
  }

  @Get("blueprint")
  getBlueprint() {
    return INTELLIHEALTHCARE_MULTI_AGENT_BLUEPRINT;
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
}
