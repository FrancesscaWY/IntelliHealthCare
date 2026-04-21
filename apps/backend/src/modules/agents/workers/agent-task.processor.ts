import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  Job,
  UnrecoverableError,
  Worker
} from "bullmq";
import type IORedis from "ioredis";
import type { EnvironmentVariables } from "../../../common/config/env.schema";
import { QueueService } from "../../../infra/queue/queue.service";
import { AGENT_TASK_QUEUE } from "../agents.constants";
import { AgentOrchestratorService } from "../application/agent-orchestrator.service";
import { AgentTaskService } from "../application/agent-task.service";
import type { AgentQueueJobData } from "../domain/agent-types";
import { AgentExecutionError } from "../domain/agent-types";

@Injectable()
export class AgentTaskProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AgentTaskProcessor.name);
  private workerConnection?: IORedis;
  private worker?: Worker<AgentQueueJobData>;

  constructor(
    private readonly queueService: QueueService,
    private readonly taskService: AgentTaskService,
    private readonly orchestrator: AgentOrchestratorService,
    private readonly configService: ConfigService<EnvironmentVariables, true>
  ) {}

  async onModuleInit() {
    this.workerConnection = this.queueService.createClient();
    this.worker = new Worker<AgentQueueJobData>(
      AGENT_TASK_QUEUE,
      (job) => this.process(job),
      {
        connection: this.workerConnection,
        concurrency: this.configService.get("AGENT_WORKER_CONCURRENCY", {
          infer: true
        })
      }
    );

    this.worker.on("completed", (_job) => {
      this.logger.debug("Agent task completed");
    });

    this.worker.on("failed", (job, error) => {
      this.logger.warn(
        `Agent task ${job?.data.taskId ?? "unknown"} failed: ${error.message}`
      );
    });
  }

  async onModuleDestroy() {
    if (this.worker) {
      await this.worker.close();
    }

    if (!this.workerConnection) {
      return;
    }

    if (this.workerConnection.status === "wait") {
      this.workerConnection.disconnect();
      return;
    }

    if (this.workerConnection.status !== "end") {
      await this.workerConnection.quit();
    }
  }

  private async process(job: Job<AgentQueueJobData>) {
    const task = await this.taskService.findByIdOrThrow(job.data.taskId);
    const attempt = job.attemptsMade + 1;
    const maxAttempts =
      typeof job.opts.attempts === "number" ? job.opts.attempts : 1;
    const runningEnvelope = this.orchestrator.buildRunningEnvelope(task, {
      attempt,
      maxAttempts
    });

    await this.taskService.markRunning(task.id, runningEnvelope);

    try {
      const result = await this.orchestrator.executeTask(task, {
        attempt,
        maxAttempts
      });

      await this.taskService.markSucceeded(task.id, result);
      return result;
    } catch (error) {
      const failureResult =
        error instanceof AgentExecutionError
          ? error.failureResult
          : this.orchestrator.buildDispatchFailureEnvelope(task, error);
      const retryable = this.isRetryable(error);

      if (retryable && attempt < maxAttempts) {
        await this.taskService.markPendingRetry(
          task.id,
          this.orchestrator.buildRetryEnvelope(task, { attempt, maxAttempts }, failureResult)
        );
        throw error;
      }

      await this.taskService.markFailed(task.id, failureResult);

      if (!retryable) {
        throw new UnrecoverableError(
          error instanceof Error ? error.message : "Unrecoverable agent error"
        );
      }

      throw error;
    }
  }

  private isRetryable(error: unknown) {
    if (
      error instanceof BadRequestException ||
      error instanceof ConflictException ||
      error instanceof NotFoundException
    ) {
      return false;
    }

    if (error instanceof HttpException) {
      return error.getStatus() >= 500;
    }

    return true;
  }
}
