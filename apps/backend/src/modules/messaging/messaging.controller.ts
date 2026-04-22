import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards
} from "@nestjs/common";
import { IsArray, IsIn, IsOptional, IsString } from "class-validator";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../../common/auth/current-user.decorator";
import { JwtAuthGuard } from "../../common/auth/jwt-auth.guard";
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
