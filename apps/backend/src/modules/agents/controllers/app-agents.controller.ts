import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../../../common/auth/current-user.decorator";
import { JwtAuthGuard } from "../../../common/auth/jwt-auth.guard";
import type { AuthenticatedUser } from "../../../common/auth/auth.types";
import { PaginationQueryDto } from "../../../common/dto/pagination-query.dto";
import { AppAgentService } from "../application/app-agent.service";
import { RagKnowledgeService } from "../application/rag-knowledge.service";
import {
  AiHealthSummaryQueryDto,
  AiRiskAlertsQueryDto,
  CreateAssistantConversationDto,
  OrderPrefillDto,
  SendAssistantMessageDto,
  ServiceRecommendationDto
} from "../dto/app-agent.dto";
import { AppRagSearchQueryDto } from "../dto/rag-search.dto";

@ApiTags("app-ai")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("app/ai")
export class AppAgentsController {
  constructor(
    private readonly appAgentService: AppAgentService,
    private readonly ragKnowledgeService: RagKnowledgeService
  ) {}

  @Post("assistant/conversations")
  @ApiOperation({ summary: "创建智能助手会话" })
  createAssistantConversation(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateAssistantConversationDto
  ) {
    return this.appAgentService.createAssistantConversation(user, body);
  }

  @Get("assistant/conversations/:conversationId")
  @ApiOperation({ summary: "获取智能助手会话详情" })
  getAssistantConversation(
    @CurrentUser() user: AuthenticatedUser,
    @Param("conversationId") conversationId: string
  ) {
    return this.appAgentService.getAssistantConversation(user, conversationId);
  }

  @Get("assistant/conversations/:conversationId/messages")
  @ApiOperation({ summary: "获取智能助手会话消息" })
  listAssistantMessages(
    @CurrentUser() user: AuthenticatedUser,
    @Param("conversationId") conversationId: string,
    @Query() query: PaginationQueryDto
  ) {
    return this.appAgentService.listAssistantMessages(user, conversationId, query);
  }

  @Post("assistant/conversations/:conversationId/messages")
  @ApiOperation({ summary: "发送智能助手消息并获取 AI 回复" })
  sendAssistantMessage(
    @CurrentUser() user: AuthenticatedUser,
    @Param("conversationId") conversationId: string,
    @Body() body: SendAssistantMessageDto
  ) {
    return this.appAgentService.sendAssistantMessage(user, conversationId, body);
  }

  @Post("service-recommendations")
  @ApiOperation({ summary: "生成 AI 服务推荐" })
  createServiceRecommendations(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: ServiceRecommendationDto
  ) {
    return this.appAgentService.createServiceRecommendations(user, body);
  }

  @Post("order-prefill")
  @ApiOperation({ summary: "生成 AI 预约预填草稿" })
  createOrderPrefill(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: OrderPrefillDto
  ) {
    return this.appAgentService.createOrderPrefill(user, body);
  }

  @Get("health-summary")
  @ApiOperation({ summary: "生成 AI 健康摘要" })
  getHealthSummary(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: AiHealthSummaryQueryDto
  ) {
    return this.appAgentService.getHealthSummary(user, query);
  }

  @Get("health-metric-explanations")
  @ApiOperation({ summary: "生成 AI 指标趋势解释" })
  getHealthMetricExplanations(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: AiHealthSummaryQueryDto
  ) {
    return this.appAgentService.getHealthMetricExplanations(user, query);
  }

  @Get("reports/:reportId/interpretation")
  @ApiOperation({ summary: "生成 AI 报告解读" })
  getReportInterpretation(
    @CurrentUser() user: AuthenticatedUser,
    @Param("reportId") reportId: string,
    @Query() query: AiHealthSummaryQueryDto
  ) {
    return this.appAgentService.getReportInterpretation(user, reportId, query);
  }

  @Get("reports/:reportId/followup-suggestions")
  @ApiOperation({ summary: "生成 AI 报告后续建议" })
  getReportFollowUpSuggestions(
    @CurrentUser() user: AuthenticatedUser,
    @Param("reportId") reportId: string,
    @Query() query: AiHealthSummaryQueryDto
  ) {
    return this.appAgentService.getReportFollowUpSuggestions(user, reportId, query);
  }

  @Get("risk-alerts")
  @ApiOperation({ summary: "获取 AI 风险提醒列表" })
  listRiskAlerts(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: AiRiskAlertsQueryDto
  ) {
    return this.appAgentService.listRiskAlerts(user, query);
  }

  @Get("risk-alerts/:alertId")
  @ApiOperation({ summary: "获取 AI 风险提醒详情" })
  getRiskAlertDetail(
    @CurrentUser() user: AuthenticatedUser,
    @Param("alertId") alertId: string
  ) {
    return this.appAgentService.getRiskAlertDetail(user, alertId);
  }

  @Get("knowledge/search")
  @ApiOperation({ summary: "检索 AI 知识库上下文" })
  searchKnowledge(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: AppRagSearchQueryDto
  ) {
    return this.ragKnowledgeService.searchForAppUser(user, query);
  }
}
