import { Injectable, NotFoundException } from "@nestjs/common";
import { ContentActionType, ContentStatus, ContentTargetType } from "@prisma/client";
import { paginate, toDateTimeString } from "../../common/utils/serializers";
import { PrismaService } from "../../infra/prisma/prisma.service";

type InteractionAction = "LIKE" | "FAVORITE" | "SHARE";

@Injectable()
export class AppContentService {
  constructor(private readonly prismaService: PrismaService) {}

  async listNews(userId: string, page: number, pageSize: number) {
    const articles = await this.prismaService.article.findMany({
      where: { status: ContentStatus.PUBLISHED },
      orderBy: [{ sortOrder: "desc" }, { publishedAt: "desc" }]
    });

    const actions = await this.getInteractions(
      userId,
      ContentTargetType.ARTICLE,
      articles.map((item) => item.id)
    );

    return paginate(
      articles.map((item) => ({
        newsId: item.id,
        title: item.title,
        summary: item.summary,
        coverUrl: item.coverUrl,
        authorName: item.authorName,
        sourceName: item.sourceName,
        tags: item.tags,
        publishedAt: toDateTimeString(item.publishedAt),
        liked: actions.likes.has(item.id),
        favorited: actions.favorites.has(item.id)
      })),
      page,
      pageSize
    );
  }

  async getNewsDetail(userId: string, newsId: string) {
    const article = await this.prismaService.article.findFirst({
      where: { id: newsId, status: ContentStatus.PUBLISHED }
    });

    if (!article) {
      throw new NotFoundException("News not found");
    }

    await this.recordView(userId, ContentTargetType.ARTICLE, article.id);

    const actions = await this.getInteractions(userId, ContentTargetType.ARTICLE, [article.id]);

    return {
      newsId: article.id,
      title: article.title,
      summary: article.summary,
      coverUrl: article.coverUrl,
      authorName: article.authorName,
      sourceName: article.sourceName,
      tags: article.tags,
      content: article.content,
      publishedAt: toDateTimeString(article.publishedAt),
      liked: actions.likes.has(article.id),
      favorited: actions.favorites.has(article.id)
    };
  }

  async reactNews(userId: string, newsId: string, action: InteractionAction) {
    const article = await this.prismaService.article.findFirst({
      where: { id: newsId, status: ContentStatus.PUBLISHED },
      select: { id: true }
    });

    if (!article) {
      throw new NotFoundException("News not found");
    }

    await this.createUniqueInteraction(userId, ContentTargetType.ARTICLE, newsId, action);

    return {
      newsId,
      action,
      recorded: true
    };
  }

  async listLectures(userId: string, page: number, pageSize: number) {
    const lectures = await this.prismaService.lecture.findMany({
      where: { status: ContentStatus.PUBLISHED },
      orderBy: { publishedAt: "desc" }
    });

    const actions = await this.getInteractions(
      userId,
      ContentTargetType.LECTURE,
      lectures.map((item) => item.id)
    );

    return paginate(
      lectures.map((item) => ({
        lectureId: item.id,
        title: item.title,
        summary: item.summary,
        speakerName: item.speakerName,
        speakerTitle: item.speakerTitle,
        coverUrl: item.coverUrl,
        videoUrl: item.videoUrl,
        durationMinutes: item.durationMinutes,
        publishedAt: toDateTimeString(item.publishedAt),
        liked: actions.likes.has(item.id),
        favorited: actions.favorites.has(item.id)
      })),
      page,
      pageSize
    );
  }

  async getLectureDetail(userId: string, lectureId: string) {
    const lecture = await this.prismaService.lecture.findFirst({
      where: { id: lectureId, status: ContentStatus.PUBLISHED }
    });

    if (!lecture) {
      throw new NotFoundException("Lecture not found");
    }

    await this.recordView(userId, ContentTargetType.LECTURE, lecture.id);
    const actions = await this.getInteractions(userId, ContentTargetType.LECTURE, [lecture.id]);

    return {
      lectureId: lecture.id,
      title: lecture.title,
      summary: lecture.summary,
      speakerName: lecture.speakerName,
      speakerTitle: lecture.speakerTitle,
      coverUrl: lecture.coverUrl,
      videoUrl: lecture.videoUrl,
      durationMinutes: lecture.durationMinutes,
      content: lecture.content,
      publishedAt: toDateTimeString(lecture.publishedAt),
      liked: actions.likes.has(lecture.id),
      favorited: actions.favorites.has(lecture.id)
    };
  }

  async reactLecture(userId: string, lectureId: string, action: InteractionAction) {
    const lecture = await this.prismaService.lecture.findFirst({
      where: { id: lectureId, status: ContentStatus.PUBLISHED },
      select: { id: true }
    });

    if (!lecture) {
      throw new NotFoundException("Lecture not found");
    }

    await this.createUniqueInteraction(userId, ContentTargetType.LECTURE, lectureId, action);

    return {
      lectureId,
      action,
      recorded: true
    };
  }

  async listDiseaseDepartments() {
    const departments = await this.prismaService.diseaseDepartment.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
    });

    return departments.map((item) => ({
      departmentId: item.id,
      code: item.code,
      name: item.name,
      sortOrder: item.sortOrder
    }));
  }

  async listDiseases(userId: string, page: number, pageSize: number, departmentId?: string) {
    const diseases = await this.prismaService.diseaseKnowledge.findMany({
      where: {
        status: ContentStatus.PUBLISHED,
        departmentId: departmentId ?? undefined
      },
      include: {
        department: true
      },
      orderBy: { publishedAt: "desc" }
    });

    const views = await this.prismaService.contentInteraction.findMany({
      where: {
        userId,
        targetType: ContentTargetType.DISEASE,
        targetId: { in: diseases.map((item) => item.id) },
        actionType: ContentActionType.VIEW
      }
    });
    const viewedDiseaseIds = new Set(views.map((item) => item.targetId));

    return paginate(
      diseases.map((item) => ({
        diseaseId: item.id,
        title: item.title,
        summary: item.summary,
        department: {
          departmentId: item.department.id,
          code: item.department.code,
          name: item.department.name
        },
        viewed: viewedDiseaseIds.has(item.id),
        publishedAt: toDateTimeString(item.publishedAt)
      })),
      page,
      pageSize
    );
  }

  async getDiseaseDetail(userId: string, diseaseId: string) {
    const disease = await this.prismaService.diseaseKnowledge.findFirst({
      where: {
        id: diseaseId,
        status: ContentStatus.PUBLISHED
      },
      include: {
        department: true
      }
    });

    if (!disease) {
      throw new NotFoundException("Disease not found");
    }

    await this.recordView(userId, ContentTargetType.DISEASE, disease.id);

    return {
      diseaseId: disease.id,
      title: disease.title,
      summary: disease.summary,
      department: {
        departmentId: disease.department.id,
        code: disease.department.code,
        name: disease.department.name
      },
      symptoms: disease.symptoms,
      causes: disease.causes,
      preventions: disease.preventions,
      treatments: disease.treatments,
      publishedAt: toDateTimeString(disease.publishedAt)
    };
  }

  private async recordView(userId: string, targetType: ContentTargetType, targetId: string) {
    await this.prismaService.contentInteraction.create({
      data: {
        userId,
        targetType,
        targetId,
        actionType: ContentActionType.VIEW
      }
    });
  }

  private async createUniqueInteraction(
    userId: string,
    targetType: ContentTargetType,
    targetId: string,
    action: InteractionAction
  ) {
    const actionType = action as ContentActionType;
    if (action === "SHARE") {
      await this.prismaService.contentInteraction.create({
        data: {
          userId,
          targetType,
          targetId,
          actionType
        }
      });
      return;
    }

    const exists = await this.prismaService.contentInteraction.findFirst({
      where: {
        userId,
        targetType,
        targetId,
        actionType
      },
      select: { id: true }
    });

    if (!exists) {
      await this.prismaService.contentInteraction.create({
        data: {
          userId,
          targetType,
          targetId,
          actionType
        }
      });
    }
  }

  private async getInteractions(
    userId: string,
    targetType: ContentTargetType,
    targetIds: string[]
  ) {
    if (!targetIds.length) {
      return {
        likes: new Set<string>(),
        favorites: new Set<string>()
      };
    }

    const rows = await this.prismaService.contentInteraction.findMany({
      where: {
        userId,
        targetType,
        targetId: { in: targetIds },
        actionType: { in: [ContentActionType.LIKE, ContentActionType.FAVORITE] }
      }
    });

    return {
      likes: new Set(
        rows.filter((item) => item.actionType === ContentActionType.LIKE).map((item) => item.targetId)
      ),
      favorites: new Set(
        rows
          .filter((item) => item.actionType === ContentActionType.FAVORITE)
          .map((item) => item.targetId)
      )
    };
  }
}
