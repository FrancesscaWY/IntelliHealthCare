import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { AgentTaskStatus, Prisma } from "@prisma/client";
import { PrismaService } from "../../../infra/prisma/prisma.service";
import { AgentRegistry } from "../domain/agent-registry";
import type { AgentExecutionEnvelope } from "../domain/agent-types";
import { AgentGovernanceService } from "./agent-governance.service";
import type {
  CreateAgentTaskDto,
  ListAgentTasksQueryDto
} from "../dto/create-agent-task.dto";

@Injectable()
export class AgentTaskService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly agentRegistry: AgentRegistry,
    private readonly governanceService: AgentGovernanceService
  ) {}

  async createTask(input: CreateAgentTaskDto) {
    const normalizedAgentName = this.agentRegistry.normalizeAgentName(input.agentName);
    const normalizedTaskType = this.agentRegistry.normalizeTaskType(input.taskType);
    const { resolved } = this.agentRegistry.resolve(
      normalizedAgentName,
      normalizedTaskType
    );

    let normalizedPayload: unknown;

    try {
      normalizedPayload = resolved.inputSchema.parse(input.payload);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : "Invalid agent payload"
      );
    }

    const task = await this.prismaService.agentTask.create({
      data: {
        ownerId: input.ownerId ?? null,
        agentName: normalizedAgentName,
        taskType: normalizedTaskType,
        triggerSource: input.triggerSource,
        payload: normalizedPayload as unknown as Prisma.InputJsonValue
      }
    });

    await this.governanceService.recordTaskCreated(task);
    return task;
  }

  async findByIdOrThrow(taskId: string) {
    const task = await this.prismaService.agentTask.findUnique({
      where: { id: taskId }
    });

    if (!task) {
      throw new NotFoundException(`Agent task ${taskId} not found`);
    }

    return task;
  }

  async listTasks(query: ListAgentTasksQueryDto) {
    return this.prismaService.agentTask.findMany({
      where: {
        ...(query.status ? { status: query.status } : {}),
        ...(query.ownerId ? { ownerId: query.ownerId } : {}),
        ...(query.agentName ? { agentName: query.agentName } : {}),
        ...(query.taskType ? { taskType: query.taskType } : {})
      },
      orderBy: {
        updatedAt: "desc"
      },
      take: query.limit
    });
  }

  async retryTask(taskId: string) {
    const existingTask = await this.findByIdOrThrow(taskId);

    if (existingTask.status === AgentTaskStatus.RUNNING) {
      throw new ConflictException("Running task cannot be retried");
    }

    const task = await this.prismaService.agentTask.update({
      where: { id: taskId },
      data: {
        status: AgentTaskStatus.PENDING
      }
    });

    await this.governanceService.recordTaskRetried(task);
    return task;
  }

  async markRunning(taskId: string, result: AgentExecutionEnvelope) {
    const task = await this.prismaService.agentTask.update({
      where: { id: taskId },
      data: {
        status: AgentTaskStatus.RUNNING,
        result: result as unknown as Prisma.InputJsonValue
      }
    });

    await this.governanceService.recordTaskRunning(taskId, result);
    return task;
  }

  async markPendingRetry(taskId: string, result: AgentExecutionEnvelope) {
    const task = await this.prismaService.agentTask.update({
      where: { id: taskId },
      data: {
        status: AgentTaskStatus.PENDING,
        result: result as unknown as Prisma.InputJsonValue
      }
    });

    await this.governanceService.recordTaskPendingRetry(taskId, result);
    return task;
  }

  async markSucceeded(taskId: string, result: AgentExecutionEnvelope) {
    const nextResult = await this.governanceService.finalizeSucceededTask(taskId, result);
    return this.prismaService.agentTask.update({
      where: { id: taskId },
      data: {
        status: AgentTaskStatus.SUCCEEDED,
        result: nextResult as unknown as Prisma.InputJsonValue
      }
    });
  }

  async markFailed(taskId: string, result: AgentExecutionEnvelope) {
    const task = await this.prismaService.agentTask.update({
      where: { id: taskId },
      data: {
        status: AgentTaskStatus.FAILED,
        result: result as unknown as Prisma.InputJsonValue
      }
    });

    await this.governanceService.recordTaskFailed(taskId, result);
    return task;
  }
}
