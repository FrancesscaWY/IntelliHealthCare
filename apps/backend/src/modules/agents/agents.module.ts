import { Module } from "@nestjs/common";
import { AgentDispatchService } from "./application/agent-dispatch.service";
import { AgentOrchestratorService } from "./application/agent-orchestrator.service";
import { AgentTaskService } from "./application/agent-task.service";
import { AgentsController } from "./controllers/agents.controller";
import { AgentRegistry } from "./domain/agent-registry";
import { LlmGateway } from "./gateways/llm.gateway";
import { HealthArchiveTool } from "./tools/health-archive.tool";
import { HealthMetricsTool } from "./tools/health-metrics.tool";
import { ReportsTool } from "./tools/reports.tool";
import { ServiceCatalogTool } from "./tools/service-catalog.tool";
import { AgentTaskProcessor } from "./workers/agent-task.processor";

@Module({
  controllers: [AgentsController],
  providers: [
    AgentRegistry,
    AgentTaskService,
    AgentDispatchService,
    AgentOrchestratorService,
    LlmGateway,
    ReportsTool,
    HealthArchiveTool,
    HealthMetricsTool,
    ServiceCatalogTool,
    AgentTaskProcessor
  ],
  exports: [AgentRegistry, AgentTaskService, AgentDispatchService]
})
export class AgentsModule {}
