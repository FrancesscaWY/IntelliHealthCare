import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { ContentActionType, ContentStatus, ContentTargetType } from "@prisma/client";
import {
  ensureArray,
  ensureRecord,
  paginate,
  toDateTimeString
} from "../../common/utils/serializers";
import { PrismaService } from "../../infra/prisma/prisma.service";
import {
  isInvalidPlaceholderContentComment,
  normalizePresentedContentComment,
  resolvePresentedContentCommentAvatar,
} from "./content-comment-presentation";
import { resolveCuratedLectureMedia } from "./content-curated-lectures";
import { resolveCuratedNewsMedia } from "./content-curated-news";
import { extractPublishedContentMeta } from "./content-metadata";

type InteractionAction = "LIKE" | "FAVORITE" | "SHARE";
type ContentSort = "LATEST" | "HOT";
type CommentableContentTarget = "ARTICLE" | "LECTURE";

type InteractionCounts = {
  likesCount: number;
  favoritesCount: number;
  sharesCount: number;
  viewsCount: number;
  commentsCount: number;
};

const EMPTY_INTERACTION_COUNTS: InteractionCounts = {
  likesCount: 0,
  favoritesCount: 0,
  sharesCount: 0,
  viewsCount: 0,
  commentsCount: 0
};

@Injectable()
export class AppContentService {
  constructor(private readonly prismaService: PrismaService) {}

  async listNews(
    userId: string,
    page: number,
    pageSize: number,
    sort?: string
  ) {
    const articles = await this.prismaService.article.findMany({
      where: { status: ContentStatus.PUBLISHED },
      orderBy: [{ sortOrder: "desc" }, { publishedAt: "desc" }]
    });

    const summary = await this.getInteractionSummary(
      userId,
      ContentTargetType.ARTICLE,
      articles.map((item) => item.id)
    );

    const list = articles.map((item) => {
      const counts = this.getCounts(summary.counts, item.id);
      const meta = this.resolveArticleContentMeta(item);

      return {
        newsId: item.id,
        id: item.id,
        title: item.title,
        summary: item.summary,
        coverUrl: meta.coverUrl,
        images: meta.gallery.map((image) => image.url),
        authorName: item.authorName,
        sourceName: meta.sourceName ?? item.sourceName,
        sourceUrl: meta.sourceUrl,
        sourceTitle: meta.sourceTitle,
        sourcePublishedAt: meta.sourcePublishedAt,
        readingMinutes: meta.readingMinutes,
        imageAlt: meta.imageAlt,
        tags: ensureArray<string>(item.tags),
        publishedAt: toDateTimeString(item.publishedAt),
        liked: summary.likes.has(item.id),
        favorited: summary.favorites.has(item.id),
        likesCount: counts.likesCount,
        favoritesCount: counts.favoritesCount,
        sharesCount: counts.sharesCount,
        viewsCount: counts.viewsCount,
        commentsCount: counts.commentsCount,
        stats: this.buildStats(counts)
      };
    });

    return paginate(this.sortContentItems(list, sort), page, pageSize);
  }

  async getNewsDetail(userId: string, newsId: string) {
    const article = await this.prismaService.article.findFirst({
      where: { id: newsId, status: ContentStatus.PUBLISHED }
    });

    if (!article) {
      throw new NotFoundException("News not found");
    }

    await this.recordView(userId, ContentTargetType.ARTICLE, article.id);

    const [summary, comments] = await Promise.all([
      this.getInteractionSummary(userId, ContentTargetType.ARTICLE, [article.id]),
      this.listContentComments(userId, "ARTICLE", article.id, 1, 20)
    ]);
    const counts = this.getCounts(summary.counts, article.id);
    const content = ensureRecord(article.content);
    const sections = ensureArray<Record<string, unknown>>(content.sections);
    const meta = this.resolveArticleContentMeta(article);

    return {
      newsId: article.id,
      id: article.id,
      title: article.title,
      summary: article.summary,
      coverUrl: meta.coverUrl,
      heroImage: meta.gallery[0]?.url ?? meta.coverUrl,
      authorName: article.authorName,
      sourceName: meta.sourceName ?? article.sourceName,
      sourceUrl: meta.sourceUrl,
      sourceTitle: meta.sourceTitle,
      sourceDescription: meta.sourceDescription,
      sourcePublishedAt: meta.sourcePublishedAt,
      readingMinutes: meta.readingMinutes,
      imageAlt: meta.imageAlt,
      gallery: meta.gallery,
      references: meta.references,
      tags: ensureArray<string>(article.tags),
      content: article.content,
      sections: sections.map((item) => ({
        title: String(item.title ?? ""),
        paragraphs: ensureArray<string>(item.paragraphs)
      })),
      paragraphs: sections.flatMap((item) => ensureArray<string>(item.paragraphs)),
      publishedAt: toDateTimeString(article.publishedAt),
      liked: summary.likes.has(article.id),
      favorited: summary.favorites.has(article.id),
      likesCount: counts.likesCount,
      favoritesCount: counts.favoritesCount,
      sharesCount: counts.sharesCount,
      viewsCount: counts.viewsCount,
      commentsCount: counts.commentsCount,
      stats: this.buildStats(counts),
      comments: comments.list
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

  async listLectures(
    userId: string,
    page: number,
    pageSize: number,
    sort?: string
  ) {
    const lectures = await this.prismaService.lecture.findMany({
      where: { status: ContentStatus.PUBLISHED },
      orderBy: { publishedAt: "desc" }
    });

    const summary = await this.getInteractionSummary(
      userId,
      ContentTargetType.LECTURE,
      lectures.map((item) => item.id)
    );

    const list = lectures.map((item) => {
      const counts = this.getCounts(summary.counts, item.id);
      const meta = this.resolveLectureContentMeta(item);

      return {
        lectureId: item.id,
        id: item.id,
        title: item.title,
        summary: item.summary,
        speakerName: item.speakerName,
        speakerTitle: item.speakerTitle,
        coverUrl: meta.coverUrl,
        imageUrl: meta.gallery[0]?.url ?? meta.coverUrl,
        videoUrl: meta.videoUrl,
        sourceName: meta.sourceName,
        watchUrl: meta.watchUrl,
        watchLabel: meta.watchLabel,
        sourceUrl: meta.sourceUrl,
        sourceTitle: meta.sourceTitle,
        sourceDescription: meta.sourceDescription,
        sourcePublishedAt: meta.sourcePublishedAt,
        readingMinutes: meta.readingMinutes,
        imageAlt: meta.imageAlt,
        durationMinutes: item.durationMinutes,
        publishedAt: toDateTimeString(item.publishedAt),
        liked: summary.likes.has(item.id),
        favorited: summary.favorites.has(item.id),
        likesCount: counts.likesCount,
        favoritesCount: counts.favoritesCount,
        sharesCount: counts.sharesCount,
        viewsCount: counts.viewsCount,
        commentsCount: counts.commentsCount,
        stats: this.buildStats(counts)
      };
    });

    return paginate(this.sortContentItems(list, sort), page, pageSize);
  }

  async getLectureDetail(userId: string, lectureId: string) {
    const lecture = await this.prismaService.lecture.findFirst({
      where: { id: lectureId, status: ContentStatus.PUBLISHED }
    });

    if (!lecture) {
      throw new NotFoundException("Lecture not found");
    }

    await this.recordView(userId, ContentTargetType.LECTURE, lecture.id);

    const [summary, comments] = await Promise.all([
      this.getInteractionSummary(userId, ContentTargetType.LECTURE, [lecture.id]),
      this.listContentComments(userId, "LECTURE", lecture.id, 1, 20)
    ]);
    const counts = this.getCounts(summary.counts, lecture.id);
    const content = ensureRecord(lecture.content);
    const meta = this.resolveLectureContentMeta(lecture);
    const presentationContent: Record<string, unknown> = {
      ...content,
      sourceName: meta.sourceName,
      sourceUrl: meta.sourceUrl,
      sourceTitle: meta.sourceTitle,
      sourceDescription: meta.sourceDescription,
      sourcePublishedAt: meta.sourcePublishedAt,
      watchUrl: meta.watchUrl,
      watchLabel: meta.watchLabel,
      readingMinutes: meta.readingMinutes,
      imageAlt: meta.imageAlt,
      gallery: meta.gallery,
      references: meta.references,
    };

    return {
      lectureId: lecture.id,
      id: lecture.id,
      title: lecture.title,
      summary: lecture.summary,
      speakerName: lecture.speakerName,
      speakerTitle: lecture.speakerTitle,
      coverUrl: meta.coverUrl,
      heroImage: meta.gallery[0]?.url ?? meta.coverUrl,
      videoUrl: meta.videoUrl,
      sourceName: meta.sourceName,
      watchUrl: meta.watchUrl,
      watchLabel: meta.watchLabel,
      sourceUrl: meta.sourceUrl,
      sourceTitle: meta.sourceTitle,
      sourceDescription: meta.sourceDescription,
      sourcePublishedAt: meta.sourcePublishedAt,
      readingMinutes: meta.readingMinutes,
      imageAlt: meta.imageAlt,
      gallery: meta.gallery,
      references: meta.references,
      durationMinutes: lecture.durationMinutes,
      content: presentationContent,
      outline: ensureArray<string>(presentationContent.outline),
      highlights: ensureArray<string>(presentationContent.highlights),
      publishedAt: toDateTimeString(lecture.publishedAt),
      liked: summary.likes.has(lecture.id),
      favorited: summary.favorites.has(lecture.id),
      likesCount: counts.likesCount,
      favoritesCount: counts.favoritesCount,
      sharesCount: counts.sharesCount,
      viewsCount: counts.viewsCount,
      commentsCount: counts.commentsCount,
      stats: this.buildStats(counts),
      comments: comments.list
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
      id: item.id,
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
        id: item.id,
        title: item.title,
        name: item.title,
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

    const symptoms = ensureArray<string>(disease.symptoms);
    const causes = ensureArray<string>(disease.causes);
    const preventions = ensureArray<string>(disease.preventions);
    const treatments = ensureArray<string>(disease.treatments);

    return {
      diseaseId: disease.id,
      id: disease.id,
      title: disease.title,
      diseaseName: disease.title,
      summary: disease.summary,
      department: {
        departmentId: disease.department.id,
        code: disease.department.code,
        name: disease.department.name
      },
      symptoms,
      causes,
      preventions,
      treatments,
      tags: [disease.department.name],
      quickFacts: [
        {
          label: "常见症状",
          value: symptoms.slice(0, 2).join("、") || "请查看下方详情"
        },
        {
          label: "建议科室",
          value: disease.department.name
        },
        {
          label: "治疗重点",
          value: treatments[0] ?? "结合医生建议规范治疗"
        }
      ],
      sections: [
        {
          title: "症状",
          content: symptoms.join("；")
        },
        {
          title: "病因",
          content: causes.join("；")
        },
        {
          title: "预防",
          content: preventions.join("；")
        },
        {
          title: "治疗",
          content: treatments.join("；")
        }
      ],
      publishedAt: toDateTimeString(disease.publishedAt)
    };
  }

  async listContentComments(
    userId: string | undefined,
    targetType: CommentableContentTarget,
    targetId: string,
    page: number,
    pageSize: number
  ) {
    await this.assertContentTargetExists(targetType, targetId);

    const comments = await this.prismaService.contentComment.findMany({
      where: { targetType: targetType as ContentTargetType, targetId },
      include: { user: true },
      orderBy: { createdAt: "asc" }
    });
    const commentUserNameMap = new Map(
      comments.map((item) => [
        item.id,
        item.user.realName ?? item.user.nickname ?? item.user.phone
      ])
    );

    return paginate(
      comments.map((item) => {
        const authorName =
          item.user.realName ?? item.user.nickname ?? item.user.phone;
        const avatarUrl = resolvePresentedContentCommentAvatar({
          userId: item.user.id,
          avatarUrl: item.user.avatarUrl,
        });
        const content = normalizePresentedContentComment({
          targetId,
          content: item.content,
          commentId: item.id,
        });

        return {
          commentId: item.id,
          id: item.id,
          parentId: item.parentId,
          content,
          createdAt: toDateTimeString(item.createdAt),
          author: authorName,
          avatarUrl,
          city: item.user.city,
          replyTo: item.parentId ? commentUserNameMap.get(item.parentId) ?? undefined : undefined,
          likes: 0,
          liked: false,
          isMine: item.userId === userId,
          user: {
            userId: item.user.id,
            name: authorName,
            avatar: avatarUrl
          }
        };
      }),
      page,
      pageSize
    );
  }

  async createContentComment(
    userId: string,
    targetType: CommentableContentTarget,
    targetId: string,
    payload: {
      parentId?: string;
      content: string;
    }
  ) {
    await this.assertContentTargetExists(targetType, targetId);
    const normalizedContent = payload.content.trim();

    if (!normalizedContent) {
      throw new BadRequestException("请输入评论内容");
    }

    if (isInvalidPlaceholderContentComment(normalizedContent)) {
      throw new BadRequestException("请输入有效评论内容");
    }

    if (payload.parentId) {
      const parent = await this.prismaService.contentComment.findUnique({
        where: { id: payload.parentId },
        select: { targetType: true, targetId: true }
      });

      if (
        !parent ||
        parent.targetType !== (targetType as ContentTargetType) ||
        parent.targetId !== targetId
      ) {
        throw new NotFoundException("Parent comment not found");
      }
    }

    const comment = await this.prismaService.contentComment.create({
      data: {
        userId,
        targetType: targetType as ContentTargetType,
        targetId,
        parentId: payload.parentId,
        content: normalizedContent
      }
    });

    return {
      commentId: comment.id,
      createdAt: toDateTimeString(comment.createdAt)
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

  private async getInteractionSummary(
    userId: string,
    targetType: ContentTargetType,
    targetIds: string[]
  ) {
    if (!targetIds.length) {
      return {
        likes: new Set<string>(),
        favorites: new Set<string>(),
        counts: new Map<string, InteractionCounts>()
      };
    }

    const [userRows, countRows, commentRows] = await Promise.all([
      this.prismaService.contentInteraction.findMany({
        where: {
          userId,
          targetType,
          targetId: { in: targetIds },
          actionType: { in: [ContentActionType.LIKE, ContentActionType.FAVORITE] }
        }
      }),
      this.prismaService.contentInteraction.findMany({
        where: {
          targetType,
          targetId: { in: targetIds },
          actionType: {
            in: [
              ContentActionType.LIKE,
              ContentActionType.FAVORITE,
              ContentActionType.SHARE,
              ContentActionType.VIEW
            ]
          }
        },
        select: {
          targetId: true,
          actionType: true
        }
      }),
      targetType === ContentTargetType.DISEASE
        ? Promise.resolve([])
        : this.prismaService.contentComment.findMany({
            where: {
              targetType,
              targetId: { in: targetIds }
            },
            select: { targetId: true }
          })
    ]);

    const counts = new Map<string, InteractionCounts>();

    for (const targetId of targetIds) {
      counts.set(targetId, { ...EMPTY_INTERACTION_COUNTS });
    }

    for (const row of countRows) {
      const current = this.getCounts(counts, row.targetId);

      if (row.actionType === ContentActionType.LIKE) {
        current.likesCount += 1;
      }
      if (row.actionType === ContentActionType.FAVORITE) {
        current.favoritesCount += 1;
      }
      if (row.actionType === ContentActionType.SHARE) {
        current.sharesCount += 1;
      }
      if (row.actionType === ContentActionType.VIEW) {
        current.viewsCount += 1;
      }

      counts.set(row.targetId, current);
    }

    for (const row of commentRows) {
      const current = this.getCounts(counts, row.targetId);
      current.commentsCount += 1;
      counts.set(row.targetId, current);
    }

    return {
      likes: new Set(
        userRows
          .filter((item) => item.actionType === ContentActionType.LIKE)
          .map((item) => item.targetId)
      ),
      favorites: new Set(
        userRows
          .filter((item) => item.actionType === ContentActionType.FAVORITE)
          .map((item) => item.targetId)
      ),
      counts
    };
  }

  private getCounts(
    counts: Map<string, InteractionCounts>,
    targetId: string
  ): InteractionCounts {
    return counts.get(targetId) ?? { ...EMPTY_INTERACTION_COUNTS };
  }

  private buildStats(counts: InteractionCounts) {
    return {
      likes: counts.likesCount,
      stars: counts.favoritesCount,
      comments: counts.commentsCount,
      shares: counts.sharesCount,
      views: counts.viewsCount
    };
  }

  private sortContentItems<
    T extends InteractionCounts & { publishedAt: string | null }
  >(items: T[], sort?: string) {
    if (this.normalizeSort(sort) !== "HOT") {
      return items;
    }

    return [...items].sort((left, right) => {
      const scoreDiff = this.getHotScore(right) - this.getHotScore(left);
      if (scoreDiff !== 0) {
        return scoreDiff;
      }

      return (right.publishedAt ?? "").localeCompare(left.publishedAt ?? "");
    });
  }

  private getHotScore(item: InteractionCounts) {
    return (
      item.likesCount * 4 +
      item.favoritesCount * 3 +
      item.commentsCount * 5 +
      item.sharesCount * 2 +
      item.viewsCount
    );
  }

  private normalizeSort(sort?: string): ContentSort {
    return sort?.toUpperCase() === "HOT" ? "HOT" : "LATEST";
  }

  private resolveArticleContentMeta(article: {
    id: string;
    slug: string;
    content: unknown;
    coverUrl: string | null;
  }) {
    const extracted = extractPublishedContentMeta(article.content, article.coverUrl);
    const curated = resolveCuratedNewsMedia(article);

    if (!curated) {
      return {
        ...extracted,
        coverUrl: article.coverUrl,
      };
    }

    return {
      ...extracted,
      ...curated,
      coverUrl: curated.coverUrl,
      gallery: curated.gallery.length > 0 ? curated.gallery : extracted.gallery,
      references: curated.references.length > 0 ? curated.references : extracted.references,
      imageAlt: curated.imageAlt ?? extracted.imageAlt,
      readingMinutes: curated.readingMinutes ?? extracted.readingMinutes,
      sourceName: curated.sourceName ?? extracted.sourceName,
      sourceUrl: curated.sourceUrl ?? extracted.sourceUrl,
      sourceTitle: curated.sourceTitle ?? extracted.sourceTitle,
      sourceDescription: curated.sourceDescription ?? extracted.sourceDescription,
      sourcePublishedAt: curated.sourcePublishedAt ?? extracted.sourcePublishedAt,
    };
  }

  private resolveLectureContentMeta(lecture: {
    id: string;
    slug: string;
    content: unknown;
    coverUrl: string | null;
    videoUrl: string | null;
  }) {
    const extracted = extractPublishedContentMeta(lecture.content, lecture.coverUrl);
    const curated = resolveCuratedLectureMedia(lecture);

    if (!curated) {
      return {
        ...extracted,
        coverUrl: lecture.coverUrl,
        videoUrl: lecture.videoUrl,
      };
    }

    return {
      ...extracted,
      ...curated,
      coverUrl: curated.coverUrl,
      videoUrl: curated.videoUrl,
      gallery: curated.gallery.length > 0 ? curated.gallery : extracted.gallery,
      references: curated.references.length > 0 ? curated.references : extracted.references,
      imageAlt: curated.imageAlt ?? extracted.imageAlt,
      readingMinutes: curated.readingMinutes ?? extracted.readingMinutes,
      sourceName: curated.sourceName ?? extracted.sourceName,
      sourceUrl: curated.sourceUrl ?? extracted.sourceUrl,
      sourceTitle: curated.sourceTitle ?? extracted.sourceTitle,
      sourceDescription: curated.sourceDescription ?? extracted.sourceDescription,
      sourcePublishedAt: curated.sourcePublishedAt ?? extracted.sourcePublishedAt,
      watchUrl: curated.watchUrl ?? extracted.watchUrl,
      watchLabel: curated.watchLabel ?? extracted.watchLabel,
    };
  }

  private async assertContentTargetExists(
    targetType: CommentableContentTarget,
    targetId: string
  ) {
    if (targetType === "ARTICLE") {
      const article = await this.prismaService.article.findFirst({
        where: { id: targetId, status: ContentStatus.PUBLISHED },
        select: { id: true }
      });

      if (!article) {
        throw new NotFoundException("News not found");
      }

      return;
    }

    const lecture = await this.prismaService.lecture.findFirst({
      where: { id: targetId, status: ContentStatus.PUBLISHED },
      select: { id: true }
    });

    if (!lecture) {
      throw new NotFoundException("Lecture not found");
    }
  }
}
