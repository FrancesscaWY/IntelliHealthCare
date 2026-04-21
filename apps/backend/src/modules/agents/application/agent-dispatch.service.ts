import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Queue } from "bullmq";
import type IORedis from "ioredis";
import type { EnvironmentVariables } from "../../../common/config/env.schema";
import { QueueService } from "../../../infra/queue/queue.service";
import { AGENT_TASK_JOB, AGENT_TASK_QUEUE } from "../agents.constants";
import type { AgentQueueJobData } from "../domain/agent-types";

@Injectable()
export class AgentDispatchService implements OnModuleDestroy {
  private readonly logger = new Logger(AgentDispatchService.name);
  private readonly queueConnection: IORedis;
  private readonly queue: Queue<AgentQueueJobData>;

  constructor(
    private readonly queueService: QueueService,
    private readonly configService: ConfigService<EnvironmentVariables, true>
  ) {
    this.queueConnection = this.queueService.createClient();
    this.queue = new Queue<AgentQueueJobData>(AGENT_TASK_QUEUE, {
      connection: this.queueConnection,
      defaultJobOptions: {
        attempts: this.configService.get("AGENT_MAX_RETRIES", { infer: true }),
        backoff: {
          type: "exponential",
          delay: 1_000
        },
        removeOnComplete: 100,
        removeOnFail: 100
      }
    });
  }

  async enqueueTask(taskId: string) {
    const job = await this.queue.add(AGENT_TASK_JOB, {
      taskId
    });

    this.logger.debug(`Queued agent task ${taskId} as job ${job.id}`);

    return job;
  }

  async onModuleDestroy() {
    await this.queue.close();

    if (this.queueConnection.status === "wait") {
      this.queueConnection.disconnect();
      return;
    }

    if (this.queueConnection.status !== "end") {
      await this.queueConnection.quit();
    }
  }
}
