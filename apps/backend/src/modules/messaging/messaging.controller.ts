import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards
} from "@nestjs/common";
import {
  AdminMessageCampaignChannel,
  AdminMessageCampaignStatus
} from "@prisma/client";
import {
  IsArray,
  IsEnum,
  IsIn,
  IsObject,
  IsOptional,
  IsString
} from "class-validator";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiProperty,
  ApiPropertyOptional,
  ApiTags
} from "@nestjs/swagger";
import { CurrentUser } from "../../common/auth/current-user.decorator";
import { JwtAuthGuard } from "../../common/auth/jwt-auth.guard";
import { Roles } from "../../common/auth/roles.decorator";
import { RolesGuard } from "../../common/auth/roles.guard";
import type { AuthenticatedUser } from "../../common/auth/auth.types";
import { PaginationQueryDto } from "../../common/dto/pagination-query.dto";
import { SwaggerTags } from "../../common/http/swagger-tags";
import { AppMessagingService } from "./messaging.service";

class ReadNoticesDto {
  @IsOptional()
  @IsArray()
  noticeIds?: string[];
}

class NoticeListQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn([
    "SYSTEM",
    "HEALTH_ALERT",
    "ORDER",
    "CONTENT",
    "COMMUNITY",
    "COMMENT",
    "LIKE",
    "FOLLOW"
  ])
  type?:
    | "SYSTEM"
    | "HEALTH_ALERT"
    | "ORDER"
    | "CONTENT"
    | "COMMUNITY"
    | "COMMENT"
    | "LIKE"
    | "FOLLOW";
}

class CreateDoctorConversationDto {
  @IsOptional()
  @IsString()
  doctorUserId?: string;

  @IsOptional()
  @IsString()
  topic?: string;
}

class SendConversationMessageDto {
  @IsIn(["TEXT", "IMAGE", "AUDIO"])
  contentType!: "TEXT" | "IMAGE" | "AUDIO";

  @IsString()
  content!: string;
}

class AdminCampaignsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: "群发状态。",
    enum: AdminMessageCampaignStatus,
    example: AdminMessageCampaignStatus.SENT
  })
  @IsOptional()
  @IsEnum(AdminMessageCampaignStatus)
  status?: AdminMessageCampaignStatus;
}

class UpsertAdminCampaignDto {
  @ApiProperty({
    description: "消息标题。",
    example: "春季健康服务上新提醒"
  })
  @IsString()
  title!: string;

  @ApiProperty({
    description: "消息正文。",
    example: "春季护理、上门理疗与康复评估服务已开放预约。"
  })
  @IsString()
  content!: string;

  @ApiProperty({
    description: "消息渠道。",
    enum: AdminMessageCampaignChannel,
    example: AdminMessageCampaignChannel.SYSTEM
  })
  @IsEnum(AdminMessageCampaignChannel)
  channel!: AdminMessageCampaignChannel;

  @ApiProperty({
    description: "消息状态。",
    enum: AdminMessageCampaignStatus,
    example: AdminMessageCampaignStatus.DRAFT
  })
  @IsEnum(AdminMessageCampaignStatus)
  status!: AdminMessageCampaignStatus;

  @ApiProperty({
    description: "接收人类型。",
    example: "ALL_USERS"
  })
  @IsString()
  receiverType!: string;

  @ApiPropertyOptional({
    description: "接收人快照。",
    example: {
      label: "部分用户",
      tags: ["高血压重点关怀用户"]
    }
  })
  @IsOptional()
  @IsObject()
  receiverSnapshot?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: "是否插入商品推荐。",
    example: true
  })
  insertProductLink?: boolean;

  @ApiPropertyOptional({
    description: "推荐商品快照。",
    example: [{ serviceId: "srv_rehab_stroke", title: "脑卒中术后康复套餐" }]
  })
  @IsOptional()
  @IsArray()
  productSnapshot?: Record<string, unknown>[];

  @ApiPropertyOptional({
    description: "定时发送时间。",
    example: "2026-04-24T09:30:00.000Z"
  })
  @IsOptional()
  @IsString()
  scheduledAt?: string;
}

class AdminCampaignBatchDto {
  @ApiProperty({
    description: "活动 ID 列表。",
    example: ["campaign_member_welfare", "campaign_order_progress"]
  })
  @IsArray()
  campaignIds!: string[];

  @ApiProperty({
    description: "批量动作。",
    enum: ["DELETE", "WITHDRAW"],
    example: "WITHDRAW"
  })
  @IsIn(["DELETE", "WITHDRAW"])
  action!: "DELETE" | "WITHDRAW";
}

class AdminConversationsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: "关键字。",
    example: "笑看人生"
  })
  @IsOptional()
  @IsString()
  keyword?: string;
}

@ApiTags(SwaggerTags.AppMessaging)
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("app")
export class AppMessagingController {
  constructor(private readonly messagingService: AppMessagingService) {}

  @Get("messages/overview")
  @ApiOperation({ summary: "获取消息聚合概览" })
  getMessageOverview(@CurrentUser("id") userId: string) {
    return this.messagingService.getMessageOverview(userId);
  }

  @Get("messages/notices")
  @ApiOperation({ summary: "获取通知列表" })
  listNotices(
    @CurrentUser("id") userId: string,
    @Query() query: NoticeListQueryDto
  ) {
    return this.messagingService.listNotices(userId, query.page, query.pageSize, query.type);
  }

  @Post("messages/notices/read")
  @ApiOperation({ summary: "批量已读通知" })
  markNoticesAsRead(
    @CurrentUser("id") userId: string,
    @Body() body: ReadNoticesDto
  ) {
    return this.messagingService.markNoticesAsRead(userId, body.noticeIds);
  }

  @Get("conversations")
  @ApiOperation({ summary: "获取会话列表" })
  listConversations(
    @CurrentUser("id") userId: string,
    @Query() query: PaginationQueryDto
  ) {
    return this.messagingService.listConversations(userId, query.page, query.pageSize);
  }

  @Post("conversations/doctor")
  @ApiOperation({ summary: "创建医生咨询会话" })
  createDoctorConversation(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateDoctorConversationDto
  ) {
    return this.messagingService.createDoctorConversation(user, body);
  }

  @Get("conversations/:conversationId/messages")
  @ApiOperation({ summary: "获取会话消息列表" })
  listConversationMessages(
    @CurrentUser("id") userId: string,
    @Param("conversationId") conversationId: string,
    @Query() query: PaginationQueryDto
  ) {
    return this.messagingService.listConversationMessages(
      userId,
      conversationId,
      query.page,
      query.pageSize
    );
  }

  @Post("conversations/:conversationId/messages")
  @ApiOperation({ summary: "发送会话消息" })
  sendConversationMessage(
    @CurrentUser("id") userId: string,
    @Param("conversationId") conversationId: string,
    @Body() body: SendConversationMessageDto
  ) {
    return this.messagingService.sendConversationMessage(userId, conversationId, body);
  }

  @Post("conversations/:conversationId/read")
  @ApiOperation({ summary: "会话已读" })
  markConversationAsRead(
    @CurrentUser("id") userId: string,
    @Param("conversationId") conversationId: string
  ) {
    return this.messagingService.markConversationAsRead(userId, conversationId);
  }
}

@ApiTags(SwaggerTags.AdminMessaging)
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("PLATFORM_ADMIN", "ORG_MANAGER", "DOCTOR", "CUSTOMER_SERVICE")
@Controller("admin")
export class AdminMessagingController {
  constructor(private readonly messagingService: AppMessagingService) {}

  @Get("message-campaigns")
  @ApiOperation({ summary: "获取群发消息列表" })
  listCampaigns(@Query() query: AdminCampaignsQueryDto) {
    return this.messagingService.listAdminCampaigns(
      query.page,
      query.pageSize,
      query.status
    );
  }

  @Get("message-campaigns/options")
  @ApiOperation({ summary: "获取群发消息创建页初始化数据" })
  getCampaignOptions() {
    return this.messagingService.getAdminCampaignOptions();
  }

  @Get("message-campaigns/:campaignId")
  @ApiOperation({ summary: "获取群发消息详情" })
  getCampaignDetail(@Param("campaignId") campaignId: string) {
    return this.messagingService.getAdminCampaignDetail(campaignId);
  }

  @Post("message-campaigns")
  @ApiOperation({ summary: "创建群发消息" })
  createCampaign(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: UpsertAdminCampaignDto
  ) {
    return this.messagingService.createAdminCampaign(user, body);
  }

  @Put("message-campaigns/:campaignId")
  @ApiOperation({ summary: "更新群发消息" })
  updateCampaign(
    @CurrentUser() user: AuthenticatedUser,
    @Param("campaignId") campaignId: string,
    @Body() body: UpsertAdminCampaignDto
  ) {
    return this.messagingService.updateAdminCampaign(user, campaignId, body);
  }

  @Delete("message-campaigns/:campaignId")
  @ApiOperation({ summary: "删除群发消息" })
  deleteCampaign(@Param("campaignId") campaignId: string) {
    return this.messagingService.deleteAdminCampaign(campaignId);
  }

  @Post("message-campaigns/:campaignId/withdraw")
  @ApiOperation({ summary: "撤回群发消息" })
  withdrawCampaign(
    @CurrentUser() user: AuthenticatedUser,
    @Param("campaignId") campaignId: string
  ) {
    return this.messagingService.withdrawAdminCampaign(user, campaignId);
  }

  @Post("message-campaigns/batch")
  @ApiOperation({ summary: "批量处理群发消息" })
  batchOperateCampaigns(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: AdminCampaignBatchDto
  ) {
    return this.messagingService.batchOperateAdminCampaigns(
      user,
      body.campaignIds,
      body.action
    );
  }

  @Get("conversations")
  @ApiOperation({ summary: "获取后台会话列表" })
  listConversations(@Query() query: AdminConversationsQueryDto) {
    return this.messagingService.listAdminConversations(
      query.page,
      query.pageSize,
      query.keyword
    );
  }

  @Get("conversations/:conversationId")
  @ApiOperation({ summary: "获取后台会话详情" })
  getConversationDetail(@Param("conversationId") conversationId: string) {
    return this.messagingService.getAdminConversationDetail(conversationId);
  }

  @Get("conversations/:conversationId/messages")
  @ApiOperation({ summary: "获取后台会话消息列表" })
  listConversationMessages(
    @Param("conversationId") conversationId: string,
    @Query() query: PaginationQueryDto
  ) {
    return this.messagingService.listAdminConversationMessages(
      conversationId,
      query.page,
      query.pageSize
    );
  }

  @Post("conversations/:conversationId/messages")
  @ApiOperation({ summary: "后台发送会话消息" })
  sendConversationMessage(
    @CurrentUser() user: AuthenticatedUser,
    @Param("conversationId") conversationId: string,
    @Body() body: SendConversationMessageDto
  ) {
    return this.messagingService.sendAdminConversationMessage(
      user,
      conversationId,
      body
    );
  }

  @Post("conversations/:conversationId/end")
  @ApiOperation({ summary: "结束后台会话" })
  endConversation(
    @CurrentUser() user: AuthenticatedUser,
    @Param("conversationId") conversationId: string
  ) {
    return this.messagingService.endAdminConversation(user, conversationId);
  }
}
