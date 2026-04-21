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
import { Type } from "class-transformer";
import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength
} from "class-validator";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../../common/auth/current-user.decorator";
import { JwtAuthGuard } from "../../common/auth/jwt-auth.guard";
import type { AuthenticatedUser } from "../../common/auth/auth.types";
import { PaginationQueryDto } from "../../common/dto/pagination-query.dto";
import { AppCommunityService } from "./community.service";

class PostListQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  topicId?: string;
}

class CreatePostDto {
  @IsOptional()
  @IsString()
  topicId?: string;

  @IsString()
  @MaxLength(500)
  content!: string;

  @IsOptional()
  @IsArray()
  images?: string[];

  @IsOptional()
  @IsString()
  tagLabel?: string;
}

class UpdatePostDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  content?: string;

  @IsOptional()
  @IsArray()
  images?: string[];

  @IsOptional()
  @IsString()
  tagLabel?: string;
}

class CreateCommentDto {
  @IsOptional()
  @IsString()
  parentId?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  content!: string;
}

class ActivityListQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  status?: string;
}

class ActivityRegisterDto {
  @IsOptional()
  @IsString()
  remark?: string;
}

class ActivityCancelDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

@ApiTags("社区与活动")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("app/community")
export class AppCommunityController {
  constructor(private readonly communityService: AppCommunityService) {}

  @Get("topics")
  @ApiOperation({ summary: "获取热门话题列表" })
  listTopics() {
    return this.communityService.listTopics();
  }

  @Get("posts")
  @ApiOperation({ summary: "获取帖子流" })
  listPosts(
    @CurrentUser("id") userId: string,
    @Query() query: PostListQueryDto
  ) {
    return this.communityService.listPosts(userId, query.page, query.pageSize, query.topicId);
  }

  @Post("posts")
  @ApiOperation({ summary: "发布帖子" })
  createPost(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreatePostDto
  ) {
    return this.communityService.createPost(user, body);
  }

  @Get("posts/:postId")
  @ApiOperation({ summary: "获取帖子详情" })
  getPostDetail(
    @CurrentUser("id") userId: string,
    @Param("postId") postId: string
  ) {
    return this.communityService.getPostDetail(userId, postId);
  }

  @Put("posts/:postId")
  @ApiOperation({ summary: "编辑帖子" })
  updatePost(
    @CurrentUser() user: AuthenticatedUser,
    @Param("postId") postId: string,
    @Body() body: UpdatePostDto
  ) {
    return this.communityService.updatePost(user, postId, body);
  }

  @Delete("posts/:postId")
  @ApiOperation({ summary: "删除帖子" })
  deletePost(
    @CurrentUser() user: AuthenticatedUser,
    @Param("postId") postId: string
  ) {
    return this.communityService.deletePost(user, postId);
  }

  @Post("posts/:postId/like")
  @ApiOperation({ summary: "点赞帖子" })
  likePost(
    @CurrentUser("id") userId: string,
    @Param("postId") postId: string
  ) {
    return this.communityService.reactPost(userId, postId, "LIKE");
  }

  @Post("posts/:postId/favorite")
  @ApiOperation({ summary: "收藏帖子" })
  favoritePost(
    @CurrentUser("id") userId: string,
    @Param("postId") postId: string
  ) {
    return this.communityService.reactPost(userId, postId, "FAVORITE");
  }

  @Post("posts/:postId/share")
  @ApiOperation({ summary: "记录帖子分享" })
  sharePost(
    @CurrentUser("id") userId: string,
    @Param("postId") postId: string
  ) {
    return this.communityService.reactPost(userId, postId, "SHARE");
  }

  @Get("posts/:postId/comments")
  @ApiOperation({ summary: "获取评论列表" })
  listPostComments(
    @Param("postId") postId: string,
    @Query() query: PaginationQueryDto
  ) {
    return this.communityService.listPostComments(postId, query.page, query.pageSize);
  }

  @Post("posts/:postId/comments")
  @ApiOperation({ summary: "发表评论" })
  createPostComment(
    @CurrentUser("id") userId: string,
    @Param("postId") postId: string,
    @Body() body: CreateCommentDto
  ) {
    return this.communityService.createPostComment(userId, postId, body);
  }

  @Get("activities")
  @ApiOperation({ summary: "获取活动列表" })
  listActivities(
    @CurrentUser("id") userId: string,
    @Query() query: ActivityListQueryDto
  ) {
    return this.communityService.listActivities(
      userId,
      query.page,
      query.pageSize,
      query.status
    );
  }

  @Get("activities/my")
  @ApiOperation({ summary: "获取我参加的活动" })
  listMyActivities(
    @CurrentUser("id") userId: string,
    @Query() query: PaginationQueryDto
  ) {
    return this.communityService.listMyActivities(userId, query.page, query.pageSize);
  }

  @Get("activities/:activityId")
  @ApiOperation({ summary: "获取活动详情" })
  getActivityDetail(
    @CurrentUser("id") userId: string,
    @Param("activityId") activityId: string
  ) {
    return this.communityService.getActivityDetail(userId, activityId);
  }

  @Post("activities/:activityId/register")
  @ApiOperation({ summary: "活动报名" })
  registerActivity(
    @CurrentUser("id") userId: string,
    @Param("activityId") activityId: string,
    @Body() body: ActivityRegisterDto
  ) {
    return this.communityService.registerActivity(userId, activityId, body.remark);
  }

  @Post("activities/:activityId/cancel")
  @ApiOperation({ summary: "取消活动报名" })
  cancelActivity(
    @CurrentUser("id") userId: string,
    @Param("activityId") activityId: string,
    @Body() body: ActivityCancelDto
  ) {
    return this.communityService.cancelActivity(userId, activityId, body.reason);
  }
}
