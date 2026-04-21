import {
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards
} from "@nestjs/common";
import { IsOptional, IsString } from "class-validator";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../../common/auth/current-user.decorator";
import { JwtAuthGuard } from "../../common/auth/jwt-auth.guard";
import type { AuthenticatedUser } from "../../common/auth/auth.types";
import { PaginationQueryDto } from "../../common/dto/pagination-query.dto";
import { AppContentService } from "./content.service";

class DiseaseListQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  departmentId?: string;
}

@ApiTags("健康内容")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("app/content")
export class AppContentController {
  constructor(private readonly contentService: AppContentService) {}

  @Get("news")
  @ApiOperation({ summary: "获取健康资讯列表" })
  listNews(
    @CurrentUser("id") userId: string,
    @Query() query: PaginationQueryDto
  ) {
    return this.contentService.listNews(userId, query.page, query.pageSize);
  }

  @Get("news/:newsId")
  @ApiOperation({ summary: "获取资讯详情" })
  getNewsDetail(
    @CurrentUser("id") userId: string,
    @Param("newsId") newsId: string
  ) {
    return this.contentService.getNewsDetail(userId, newsId);
  }

  @Post("news/:newsId/like")
  @ApiOperation({ summary: "点赞资讯" })
  likeNews(
    @CurrentUser("id") userId: string,
    @Param("newsId") newsId: string
  ) {
    return this.contentService.reactNews(userId, newsId, "LIKE");
  }

  @Post("news/:newsId/favorite")
  @ApiOperation({ summary: "收藏资讯" })
  favoriteNews(
    @CurrentUser("id") userId: string,
    @Param("newsId") newsId: string
  ) {
    return this.contentService.reactNews(userId, newsId, "FAVORITE");
  }

  @Post("news/:newsId/share")
  @ApiOperation({ summary: "记录资讯分享" })
  shareNews(
    @CurrentUser("id") userId: string,
    @Param("newsId") newsId: string
  ) {
    return this.contentService.reactNews(userId, newsId, "SHARE");
  }

  @Get("lectures")
  @ApiOperation({ summary: "获取健康讲堂列表" })
  listLectures(
    @CurrentUser("id") userId: string,
    @Query() query: PaginationQueryDto
  ) {
    return this.contentService.listLectures(userId, query.page, query.pageSize);
  }

  @Get("lectures/:lectureId")
  @ApiOperation({ summary: "获取讲堂详情" })
  getLectureDetail(
    @CurrentUser("id") userId: string,
    @Param("lectureId") lectureId: string
  ) {
    return this.contentService.getLectureDetail(userId, lectureId);
  }

  @Post("lectures/:lectureId/like")
  @ApiOperation({ summary: "点赞讲堂" })
  likeLecture(
    @CurrentUser("id") userId: string,
    @Param("lectureId") lectureId: string
  ) {
    return this.contentService.reactLecture(userId, lectureId, "LIKE");
  }

  @Post("lectures/:lectureId/favorite")
  @ApiOperation({ summary: "收藏讲堂" })
  favoriteLecture(
    @CurrentUser("id") userId: string,
    @Param("lectureId") lectureId: string
  ) {
    return this.contentService.reactLecture(userId, lectureId, "FAVORITE");
  }

  @Get("diseases/departments")
  @ApiOperation({ summary: "获取疾病科室分类" })
  listDiseaseDepartments() {
    return this.contentService.listDiseaseDepartments();
  }

  @Get("diseases")
  @ApiOperation({ summary: "获取疾病列表" })
  listDiseases(
    @CurrentUser("id") userId: string,
    @Query() query: DiseaseListQueryDto
  ) {
    return this.contentService.listDiseases(
      userId,
      query.page,
      query.pageSize,
      query.departmentId
    );
  }

  @Get("diseases/:diseaseId")
  @ApiOperation({ summary: "获取疾病详情" })
  getDiseaseDetail(
    @CurrentUser("id") userId: string,
    @Param("diseaseId") diseaseId: string
  ) {
    return this.contentService.getDiseaseDetail(userId, diseaseId);
  }
}
