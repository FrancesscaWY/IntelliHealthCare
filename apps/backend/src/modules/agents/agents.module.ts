import { Module } from "@nestjs/common";
import { AppAgentService } from "./application/app-agent.service";
import { AgentDispatchService } from "./application/agent-dispatch.service";
import { AgentOrchestratorService } from "./application/agent-orchestrator.service";
import { AgentTaskService } from "./application/agent-task.service";
import { RagKnowledgeService } from "./application/rag-knowledge.service";
import { AppAgentsController } from "./controllers/app-agents.controller";
import { AgentsController } from "./controllers/agents.controller";
import { AgentRegistry } from "./domain/agent-registry";
import { EmbeddingGateway } from "./gateways/embedding.gateway";
import { LlmGateway } from "./gateways/llm.gateway";
import { HealthArchiveTool } from "./tools/health-archive.tool";
import { HealthMetricsTool } from "./tools/health-metrics.tool";
import { RagRetrievalTool } from "./tools/rag-retrieval.tool";
import { ReportsTool } from "./tools/reports.tool";
import { ServiceCatalogTool } from "./tools/service-catalog.tool";
import { AgentTaskProcessor } from "./workers/agent-task.processor";

@Module({
  controllers: [AgentsController, AppAgentsController],
  providers: [
    AgentRegistry,
    AgentTaskService,
    AppAgentService,
    AgentDispatchService,
    AgentOrchestratorService,
    RagKnowledgeService,
    LlmGateway,
    EmbeddingGateway,
    ReportsTool,
    HealthArchiveTool,
    HealthMetricsTool,
    RagRetrievalTool,
    ServiceCatalogTool,
    AgentTaskProcessor
  ],
  exports: [AgentRegistry, AgentTaskService, AgentDispatchService]
})
export class AgentsModule {}
