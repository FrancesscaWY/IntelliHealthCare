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
import type {
  CreateAgentTaskDto,
  ListAgentTasksQueryDto
} from "../dto/create-agent-task.dto";

@Injectable()
export class AgentTaskService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly agentRegistry: AgentRegistry
  ) {}

  async createTask(input: CreateAgentTaskDto) {
    const { resolved } = this.agentRegistry.resolve(input.agentName, input.taskType);

    let normalizedPayload: unknown;

    try {
      normalizedPayload = resolved.inputSchema.parse(input.payload);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : "Invalid agent payload"
      );
    }

    return this.prismaService.agentTask.create({
      data: {
        ownerId: input.ownerId ?? null,
        agentName: input.agentName,
        taskType: input.taskType,
        triggerSource: input.triggerSource,
        payload: normalizedPayload as unknown as Prisma.InputJsonValue
      }
    });
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
    const task = await this.findByIdOrThrow(taskId);

    if (task.status === AgentTaskStatus.RUNNING) {
      throw new ConflictException("Running task cannot be retried");
    }

    return this.prismaService.agentTask.update({
      where: { id: taskId },
      data: {
        status: AgentTaskStatus.PENDING
      }
    });
  }

  async markRunning(taskId: string, result: AgentExecutionEnvelope) {
    return this.prismaService.agentTask.update({
      where: { id: taskId },
      data: {
        status: AgentTaskStatus.RUNNING,
        result: result as unknown as Prisma.InputJsonValue
      }
    });
  }

  async markPendingRetry(taskId: string, result: AgentExecutionEnvelope) {
    return this.prismaService.agentTask.update({
      where: { id: taskId },
      data: {
        status: AgentTaskStatus.PENDING,
        result: result as unknown as Prisma.InputJsonValue
      }
    });
  }

  async markSucceeded(taskId: string, result: AgentExecutionEnvelope) {
    return this.prismaService.agentTask.update({
      where: { id: taskId },
      data: {
        status: AgentTaskStatus.SUCCEEDED,
        result: result as unknown as Prisma.InputJsonValue
      }
    });
  }

  async markFailed(taskId: string, result: AgentExecutionEnvelope) {
    return this.prismaService.agentTask.update({
      where: { id: taskId },
      data: {
        status: AgentTaskStatus.FAILED,
        result: result as unknown as Prisma.InputJsonValue
      }
    });
  }
}
