import {
  ForbiddenException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import {
  ActivityStatus,
  CommunityPostStatus,
  NotificationType,
  ReactionType,
  RegistrationStatus,
  UserType
} from "@prisma/client";
import type { AuthenticatedUser } from "../../common/auth/auth.types";
import {
  ensureArray,
  ensureRecord,
  paginate,
  toDateTimeString,
  toNumber,
  toPrismaNullableJson
} from "../../common/utils/serializers";
import { PrismaService } from "../../infra/prisma/prisma.service";
import {
  resolvePresentedCommunityActivityCover,
  resolvePresentedCommunityAvatar,
  resolvePresentedCommunityPostImages,
  resolvePresentedCommunityTopicCover,
} from "./community-presentation";

type PostReactionAction = "LIKE" | "FAVORITE" | "SHARE";
type ActivityReactionAction = "LIKE" | "FAVORITE" | "SHARE";
type PostFeedType = "FOLLOWING" | "RECOMMENDED" | "LATEST";
type ActivitySort = "HOT" | "LATEST";

@Injectable()
export class AppCommunityService {
  constructor(private readonly prismaService: PrismaService) {}

  async listTopics() {
    const topics = await this.prismaService.communityTopic.findMany({
      orderBy: { participantCount: "desc" }
    });

    return topics.map((item) => ({
      topicId: item.id,
      id: item.id,
      title: item.title,
      coverUrl: resolvePresentedCommunityTopicCover(item),
      participantCount: item.participantCount,
      tone: item.tone
    }));
  }

  async listPosts(
    userId: string,
    page: number,
    pageSize: number,
    topicId?: string,
    feedType?: string
  ) {
    const feedConfig = await this.normalizePostFeedType(userId, feedType);
    const where =
      feedConfig.feedType === "FOLLOWING"
        ? {
            status: CommunityPostStatus.PUBLISHED,
            topicId: topicId ?? undefined,
            authorId: {
              in: feedConfig.followedUserIds
            }
          }
        : {
            status: CommunityPostStatus.PUBLISHED,
            topicId: topicId ?? undefined
          };

    const posts = await this.prismaService.communityPost.findMany({
      where,
      include: {
        author: true,
        topic: true
      },
      orderBy: { createdAt: "desc" }
    });

    const reactions = await this.prismaService.communityPostReaction.findMany({
      where: {
        userId,
        postId: { in: posts.map((item) => item.id) }
      }
    });

    const likedPostIds = new Set(
      reactions
        .filter((item) => item.reactionType === ReactionType.LIKE)
        .map((item) => item.postId)
    );
    const favoritedPostIds = new Set(
      reactions
        .filter((item) => item.reactionType === ReactionType.FAVORITE)
        .map((item) => item.postId)
    );

    const list = posts.map((item) =>
      this.mapPost(item, likedPostIds.has(item.id), favoritedPostIds.has(item.id), userId)
    );

    return paginate(this.sortPosts(list, feedConfig.feedType), page, pageSize);
  }

  async createPost(
    user: AuthenticatedUser,
    payload: {
      topicId?: string;
      content: string;
      images?: string[];
      tagLabel?: string;
    }
  ) {
    if (payload.topicId) {
      const topic = await this.prismaService.communityTopic.findUnique({
        where: { id: payload.topicId },
        select: { id: true }
      });
      if (!topic) {
        throw new NotFoundException("Topic not found");
      }
    }

    const post = await this.prismaService.communityPost.create({
      data: {
        authorId: user.id,
        topicId: payload.topicId,
        content: payload.content,
        images: payload.images ?? [],
        tagLabel: payload.tagLabel
      }
    });

    return {
      postId: post.id,
      createdAt: toDateTimeString(post.createdAt)
    };
  }

  async getPostDetail(userId: string, postId: string) {
    const post = await this.prismaService.communityPost.findFirst({
      where: {
        id: postId,
        status: CommunityPostStatus.PUBLISHED
      },
      include: {
        author: true,
        topic: true
      }
    });

    if (!post) {
      throw new NotFoundException("Post not found");
    }

    const reactions = await this.prismaService.communityPostReaction.findMany({
      where: {
        userId,
        postId
      }
    });

    return this.mapPost(
      post,
      reactions.some((item) => item.reactionType === ReactionType.LIKE),
      reactions.some((item) => item.reactionType === ReactionType.FAVORITE),
      userId
    );
  }

  async updatePost(
    user: AuthenticatedUser,
    postId: string,
    payload: {
      content?: string;
      images?: string[];
      tagLabel?: string;
    }
  ) {
    const post = await this.prismaService.communityPost.findUnique({
      where: { id: postId }
    });

    if (!post || post.status !== CommunityPostStatus.PUBLISHED) {
      throw new NotFoundException("Post not found");
    }

    this.assertPostEditPermission(user, post.authorId);

    const updated = await this.prismaService.communityPost.update({
      where: { id: postId },
      data: {
        content: payload.content ?? post.content,
        images: toPrismaNullableJson(payload.images ?? post.images),
        tagLabel: payload.tagLabel ?? post.tagLabel
      }
    });

    return {
      postId: updated.id,
      updatedAt: toDateTimeString(updated.updatedAt)
    };
  }

  async deletePost(user: AuthenticatedUser, postId: string) {
    const post = await this.prismaService.communityPost.findUnique({
      where: { id: postId }
    });

    if (!post || post.status === CommunityPostStatus.DELETED) {
      throw new NotFoundException("Post not found");
    }

    this.assertPostEditPermission(user, post.authorId);

    await this.prismaService.communityPost.update({
      where: { id: postId },
      data: {
        status: CommunityPostStatus.DELETED
      }
    });

    return {
      deleted: true
    };
  }

  async reactPost(userId: string, postId: string, action: PostReactionAction) {
    const post = await this.prismaService.communityPost.findFirst({
      where: {
        id: postId,
        status: CommunityPostStatus.PUBLISHED
      },
      select: {
        id: true,
        authorId: true,
        content: true,
        images: true
      }
    });
    if (!post) {
      throw new NotFoundException("Post not found");
    }

    const reactionType = action as ReactionType;
    const existing = await this.prismaService.communityPostReaction.findUnique({
      where: {
        postId_userId_reactionType: {
          postId,
          userId,
          reactionType
        }
      }
    });

    if (!existing) {
      await this.prismaService.$transaction(async (tx) => {
        await tx.communityPostReaction.create({
          data: {
            postId,
            userId,
            reactionType
          }
        });
        await tx.communityPost.update({
          where: { id: postId },
          data: this.getReactionCounterIncrement(action)
        });

        if (post.authorId !== userId && action !== "SHARE") {
          await this.createPostNotice(tx, {
            recipientUserId: post.authorId,
            actorUserId: userId,
            type: NotificationType.LIKE,
            title: "赞和收藏",
            content:
              action === "FAVORITE"
                ? "有人收藏了你的帖子"
                : "有人点赞了你的帖子",
            metadata: {
              postId,
              postContent: this.getTextSnippet(post.content),
              postImage: ensureArray<string>(post.images)[0] ?? null,
              action: action === "FAVORITE" ? "favorite" : "like"
            }
          });
        }
      });
    }

    return {
      postId,
      action,
      recorded: true
    };
  }

  async listPostComments(
    userId: string | undefined,
    postId: string,
    page: number,
    pageSize: number
  ) {
    await this.assertPostExists(postId);

    const comments = await this.prismaService.communityComment.findMany({
      where: { postId },
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
        const avatarUrl = resolvePresentedCommunityAvatar({
          userId: item.user.id,
          avatarUrl: item.user.avatarUrl,
        });

        return {
          commentId: item.id,
          id: item.id,
          parentId: item.parentId,
          content: item.content,
          createdAt: toDateTimeString(item.createdAt),
          author: item.user.realName ?? item.user.nickname ?? item.user.phone,
          avatarUrl,
          city: item.user.city,
          replyTo: item.parentId ? commentUserNameMap.get(item.parentId) ?? undefined : undefined,
          likes: 0,
          liked: false,
          isMine: item.userId === userId,
          user: {
            userId: item.user.id,
            name: item.user.realName ?? item.user.nickname ?? item.user.phone,
            avatar: avatarUrl
          }
        };
      }),
      page,
      pageSize
    );
  }

  async createPostComment(
    userId: string,
    postId: string,
    payload: {
      parentId?: string;
      content: string;
    }
  ) {
    const post = await this.getPublishedPost(postId);

    if (payload.parentId) {
      const parent = await this.prismaService.communityComment.findUnique({
        where: { id: payload.parentId },
        select: { postId: true }
      });
      if (!parent || parent.postId !== postId) {
        throw new NotFoundException("Parent comment not found");
      }
    }

    const result = await this.prismaService.$transaction(async (tx) => {
      const comment = await tx.communityComment.create({
        data: {
          postId,
          userId,
          parentId: payload.parentId,
          content: payload.content
        }
      });

      await tx.communityPost.update({
        where: { id: postId },
        data: {
          commentsCount: { increment: 1 }
        }
      });

      if (post.authorId !== userId) {
        await this.createPostNotice(tx, {
          recipientUserId: post.authorId,
          actorUserId: userId,
          type: NotificationType.COMMENT,
          title: "评论&回复",
          content: "有人评论了你的帖子",
          metadata: {
            postId,
            postContent: this.getTextSnippet(post.content),
            postImage: ensureArray<string>(post.images)[0] ?? null,
            replyExcerpt: payload.content
          }
        });
      }

      return comment;
    });

    return {
      commentId: result.id,
      createdAt: toDateTimeString(result.createdAt)
    };
  }

  async listActivities(
    userId: string,
    page: number,
    pageSize: number,
    status?: ActivityStatus | string,
    sort?: string
  ) {
    const activities = await this.prismaService.activity.findMany({
      where: {
        status: (status as ActivityStatus | undefined) ?? undefined
      },
      orderBy: [{ startAt: "desc" }, { createdAt: "desc" }]
    });

    const [registrations, interactions] = await Promise.all([
      this.prismaService.activityRegistration.findMany({
        where: {
          userId,
          activityId: { in: activities.map((item) => item.id) },
          status: { in: [RegistrationStatus.REGISTERED, RegistrationStatus.CHECKED_IN] }
        }
      }),
      this.prismaService.activityInteraction.findMany({
        where: {
          userId,
          activityId: { in: activities.map((item) => item.id) }
        }
      })
    ]);

    const registeredIds = new Set(registrations.map((item) => item.activityId));
    const likedIds = new Set(
      interactions
        .filter((item) => item.reactionType === ReactionType.LIKE)
        .map((item) => item.activityId)
    );
    const favoritedIds = new Set(
      interactions
        .filter((item) => item.reactionType === ReactionType.FAVORITE)
        .map((item) => item.activityId)
    );

    const list = activities.map((item) =>
      this.mapActivity(
        item,
        registeredIds.has(item.id),
        likedIds.has(item.id),
        favoritedIds.has(item.id)
      )
    );

    return paginate(this.sortActivities(list, sort), page, pageSize);
  }

  async getActivityDetail(userId: string, activityId: string) {
    const activity = await this.prismaService.activity.findUnique({
      where: { id: activityId }
    });

    if (!activity) {
      throw new NotFoundException("Activity not found");
    }

    const [registration, interactions, comments] = await Promise.all([
      this.prismaService.activityRegistration.findUnique({
        where: {
          activityId_userId: {
            activityId,
            userId
          }
        }
      }),
      this.prismaService.activityInteraction.findMany({
        where: { activityId, userId }
      }),
      this.listActivityComments(userId, activityId, 1, 20)
    ]);

    const content = ensureRecord(activity.detailContent);
    const sections = ensureArray<Record<string, unknown>>(content.sections).map((item) => ({
      title: String(item.title ?? ""),
      paragraphs: ensureArray<string>(item.paragraphs)
    }));

    return {
      ...this.mapActivity(
        activity,
        Boolean(
          registration &&
            ([RegistrationStatus.REGISTERED, RegistrationStatus.CHECKED_IN] as RegistrationStatus[]).includes(
              registration.status
            )
        ),
        interactions.some((item) => item.reactionType === ReactionType.LIKE),
        interactions.some((item) => item.reactionType === ReactionType.FAVORITE)
      ),
      detailContent: activity.detailContent,
      sections,
      comments: comments.list,
      registration: registration
        ? {
            registrationId: registration.id,
            status: registration.status,
            registeredAt: toDateTimeString(registration.registeredAt),
            checkedInAt: toDateTimeString(registration.checkedInAt),
            cancellationReason: registration.cancellationReason
          }
        : null
    };
  }

  async reactActivity(
    userId: string,
    activityId: string,
    action: ActivityReactionAction
  ) {
    const activity = await this.prismaService.activity.findUnique({
      where: { id: activityId },
      select: { id: true }
    });

    if (!activity) {
      throw new NotFoundException("Activity not found");
    }

    const reactionType = action as ReactionType;
    const existing = await this.prismaService.activityInteraction.findUnique({
      where: {
        activityId_userId_reactionType: {
          activityId,
          userId,
          reactionType
        }
      }
    });

    if (!existing) {
      if (action === "SHARE") {
        await this.prismaService.activityInteraction.create({
          data: {
            activityId,
            userId,
            reactionType
          }
        });
      } else {
        await this.prismaService.$transaction([
          this.prismaService.activityInteraction.create({
            data: {
              activityId,
              userId,
              reactionType
            }
          }),
          this.prismaService.activity.update({
            where: { id: activityId },
            data: this.getActivityReactionCounterIncrement(action)
          })
        ]);
      }
    }

    return {
      activityId,
      action,
      recorded: true
    };
  }

  async listActivityComments(
    userId: string | undefined,
    activityId: string,
    page: number,
    pageSize: number
  ) {
    await this.assertActivityExists(activityId);

    const comments = await this.prismaService.activityComment.findMany({
      where: { activityId },
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
        const avatarUrl = resolvePresentedCommunityAvatar({
          userId: item.user.id,
          avatarUrl: item.user.avatarUrl,
        });

        return {
          commentId: item.id,
          id: item.id,
          parentId: item.parentId,
          content: item.content,
          createdAt: toDateTimeString(item.createdAt),
          author: item.user.realName ?? item.user.nickname ?? item.user.phone,
          avatarUrl,
          city: item.user.city,
          replyTo: item.parentId ? commentUserNameMap.get(item.parentId) ?? undefined : undefined,
          likes: 0,
          liked: false,
          isMine: item.userId === userId,
          user: {
            userId: item.user.id,
            name: item.user.realName ?? item.user.nickname ?? item.user.phone,
            avatar: avatarUrl
          }
        };
      }),
      page,
      pageSize
    );
  }

  async createActivityComment(
    userId: string,
    activityId: string,
    payload: {
      parentId?: string;
      content: string;
    }
  ) {
    await this.assertActivityExists(activityId);

    if (payload.parentId) {
      const parent = await this.prismaService.activityComment.findUnique({
        where: { id: payload.parentId },
        select: { activityId: true }
      });
      if (!parent || parent.activityId !== activityId) {
        throw new NotFoundException("Parent comment not found");
      }
    }

    const comment = await this.prismaService.$transaction(async (tx) => {
      const created = await tx.activityComment.create({
        data: {
          activityId,
          userId,
          parentId: payload.parentId,
          content: payload.content
        }
      });

      await tx.activity.update({
        where: { id: activityId },
        data: {
          commentsCount: { increment: 1 }
        }
      });

      return created;
    });

    return {
      commentId: comment.id,
      createdAt: toDateTimeString(comment.createdAt)
    };
  }

  async registerActivity(userId: string, activityId: string, remark?: string) {
    const activity = await this.prismaService.activity.findUnique({
      where: { id: activityId }
    });

    if (!activity) {
      throw new NotFoundException("Activity not found");
    }

    const registration = await this.prismaService.activityRegistration.upsert({
      where: {
        activityId_userId: {
          activityId,
          userId
        }
      },
      update: {
        status: RegistrationStatus.REGISTERED,
        cancellationReason: null,
        registeredAt: new Date()
      },
      create: {
        activityId,
        userId,
        status: RegistrationStatus.REGISTERED,
        cancellationReason: null
      }
    });

    return {
      registrationId: registration.id,
      status: registration.status,
      registeredAt: toDateTimeString(registration.registeredAt),
      remarkAccepted: Boolean(remark?.trim())
    };
  }

  async cancelActivity(userId: string, activityId: string, reason?: string) {
    const registration = await this.prismaService.activityRegistration.findUnique({
      where: {
        activityId_userId: {
          activityId,
          userId
        }
      }
    });
    if (!registration) {
      throw new NotFoundException("Activity registration not found");
    }

    const updated = await this.prismaService.activityRegistration.update({
      where: { id: registration.id },
      data: {
        status: RegistrationStatus.CANCELLED,
        cancellationReason: reason ?? "用户取消"
      }
    });

    return {
      registrationId: updated.id,
      status: updated.status
    };
  }

  async listMyActivities(userId: string, page: number, pageSize: number) {
    const registrations = await this.prismaService.activityRegistration.findMany({
      where: { userId },
      include: { activity: true },
      orderBy: { registeredAt: "desc" }
    });

    return paginate(
      registrations.map((item) => {
        const coverUrl = resolvePresentedCommunityActivityCover(item.activity);

        return {
          registrationId: item.id,
          status: item.status,
          registeredAt: toDateTimeString(item.registeredAt),
          checkedInAt: toDateTimeString(item.checkedInAt),
          cancellationReason: item.cancellationReason,
          activity: {
            activityId: item.activity.id,
            title: item.activity.title,
            category: item.activity.category,
            status: item.activity.status,
            location: item.activity.location,
            coverUrl,
            startAt: toDateTimeString(item.activity.startAt),
            endAt: toDateTimeString(item.activity.endAt)
          }
        };
      }),
      page,
      pageSize
    );
  }

  private mapPost(
    item: {
      id: string;
      authorId: string;
      content: string;
      images: unknown;
      tagLabel: string | null;
      likesCount: number;
      favoritesCount: number;
      commentsCount: number;
      sharesCount: number;
      createdAt: Date;
      author: {
        id: string;
        realName: string | null;
        nickname: string | null;
        phone: string;
        avatarUrl: string | null;
      };
      topic: {
        id: string;
        title: string;
      } | null;
    },
    liked: boolean,
    favorited: boolean,
    currentUserId?: string
  ) {
    const authorName = item.author.realName ?? item.author.nickname ?? item.author.phone;
    const images = resolvePresentedCommunityPostImages({
      id: item.id,
      images: ensureArray<string>(item.images),
    });
    const authorAvatar = resolvePresentedCommunityAvatar({
      userId: item.author.id,
      avatarUrl: item.author.avatarUrl,
    });
    const headline = this.buildPostHeadline(item.content, item.tagLabel ?? item.topic?.title ?? "");

    return {
      postId: item.id,
      id: item.id,
      headline,
      excerpt: this.getTextSnippet(item.content),
      content: item.content,
      images,
      primaryImage: images[0] ?? null,
      imageCount: images.length,
      tagLabel: item.tagLabel,
      likesCount: item.likesCount,
      favoritesCount: item.favoritesCount,
      commentsCount: item.commentsCount,
      sharesCount: item.sharesCount,
      createdAt: toDateTimeString(item.createdAt),
      time: this.formatRelativeTime(item.createdAt),
      author: {
        userId: item.author.id,
        name: authorName,
        avatar: authorAvatar
      },
      authorName,
      avatar: authorAvatar,
      badge: item.topic?.title?.replace(/^#/, "") ?? "社区成员",
      topic: item.topic
        ? {
            topicId: item.topic.id,
            title: item.topic.title
          }
        : null,
      tag: item.tagLabel ?? item.topic?.title ?? "",
      liked,
      favorited,
      isMine: item.authorId === currentUserId,
      likes: item.likesCount,
      stars: item.favoritesCount,
      comments: item.commentsCount,
      shares: item.sharesCount
    };
  }

  private mapActivity(
    item: {
      id: string;
      title: string;
      category: string;
      status: ActivityStatus;
      fee: unknown;
      location: string;
      coverUrl: string | null;
      startAt: Date;
      endAt: Date;
      signupDeadline: Date;
      maxParticipants: number | null;
      likesCount: number;
      favoritesCount: number;
      commentsCount: number;
      createdAt: Date;
    },
    registered: boolean,
    liked: boolean,
    favorited: boolean
  ) {
    const fee = toNumber(item.fee);
    const coverUrl = resolvePresentedCommunityActivityCover(item);

    return {
      activityId: item.id,
      id: item.id,
      title: item.title,
      category: item.category,
      type: item.category,
      status: item.status,
      fee,
      price: fee && fee > 0 ? `${fee}元` : "免费",
      location: item.location,
      coverUrl,
      image: coverUrl,
      startAt: toDateTimeString(item.startAt),
      endAt: toDateTimeString(item.endAt),
      signupDeadline: toDateTimeString(item.signupDeadline),
      signupDeadlineText: toDateTimeString(item.signupDeadline)?.slice(0, 10) ?? null,
      maxParticipants: item.maxParticipants,
      likesCount: item.likesCount,
      favoritesCount: item.favoritesCount,
      commentsCount: item.commentsCount,
      registered,
      liked,
      favorited,
      publishDate: toDateTimeString(item.createdAt)?.slice(0, 10) ?? null,
      dateRange: `${toDateTimeString(item.startAt)?.slice(0, 10) ?? ""}-${toDateTimeString(item.endAt)?.slice(0, 10) ?? ""}`,
      time: `${toDateTimeString(item.startAt)?.slice(0, 10) ?? ""}~${toDateTimeString(item.endAt)?.slice(0, 10) ?? ""}`,
      stats: {
        likes: item.likesCount,
        stars: item.favoritesCount,
        comments: item.commentsCount
      }
    };
  }

  private sortPosts<T extends {
    likesCount: number;
    favoritesCount: number;
    commentsCount: number;
    sharesCount: number;
    createdAt: string | null;
  }>(posts: T[], feedType: PostFeedType) {
    if (feedType === "LATEST" || feedType === "FOLLOWING") {
      return posts;
    }

    return [...posts].sort((left, right) => {
      const scoreDiff = this.getPostHotScore(right) - this.getPostHotScore(left);
      if (scoreDiff !== 0) {
        return scoreDiff;
      }

      return (right.createdAt ?? "").localeCompare(left.createdAt ?? "");
    });
  }

  private sortActivities<T extends {
    likesCount: number;
    favoritesCount: number;
    commentsCount: number;
    startAt: string | null;
  }>(activities: T[], sort?: string) {
    if (this.normalizeActivitySort(sort) !== "HOT") {
      return activities;
    }

    return [...activities].sort((left, right) => {
      const scoreDiff = this.getActivityHotScore(right) - this.getActivityHotScore(left);
      if (scoreDiff !== 0) {
        return scoreDiff;
      }

      return (right.startAt ?? "").localeCompare(left.startAt ?? "");
    });
  }

  private getPostHotScore(item: {
    likesCount: number;
    favoritesCount: number;
    commentsCount: number;
    sharesCount: number;
  }) {
    return (
      item.likesCount * 4 +
      item.favoritesCount * 3 +
      item.commentsCount * 5 +
      item.sharesCount * 2
    );
  }

  private getActivityHotScore(item: {
    likesCount: number;
    favoritesCount: number;
    commentsCount: number;
  }) {
    return item.likesCount * 4 + item.favoritesCount * 3 + item.commentsCount * 5;
  }

  private normalizeActivitySort(sort?: string): ActivitySort {
    return sort?.toUpperCase() === "HOT" ? "HOT" : "LATEST";
  }

  private async normalizePostFeedType(
    userId: string,
    feedType?: string
  ): Promise<{ feedType: PostFeedType; followedUserIds: string[] }> {
    const normalizedFeedType = (feedType ?? "recommended").toUpperCase() as PostFeedType;

    if (normalizedFeedType !== "FOLLOWING") {
      return {
        feedType:
          normalizedFeedType === "LATEST" ? "LATEST" : "RECOMMENDED",
        followedUserIds: [] as string[]
      };
    }

    const followedRows = await this.prismaService.userFollow.findMany({
      where: { followerId: userId },
      select: { followeeId: true }
    });

    return {
      feedType: "FOLLOWING" as const,
      followedUserIds: followedRows.map((item) => item.followeeId)
    };
  }

  private formatRelativeTime(value: Date) {
    const diffSeconds = Math.max(0, Math.floor((Date.now() - value.getTime()) / 1000));

    if (diffSeconds < 60) {
      return `${Math.max(diffSeconds, 1)}秒前`;
    }
    if (diffSeconds < 3600) {
      return `${Math.floor(diffSeconds / 60)}分钟前`;
    }
    if (diffSeconds < 86400) {
      return `${Math.floor(diffSeconds / 3600)}小时前`;
    }

    return `${Math.floor(diffSeconds / 86400)}天前`;
  }

  private getReactionCounterIncrement(action: PostReactionAction) {
    if (action === "LIKE") {
      return { likesCount: { increment: 1 } };
    }
    if (action === "FAVORITE") {
      return { favoritesCount: { increment: 1 } };
    }
    return { sharesCount: { increment: 1 } };
  }
  private getActivityReactionCounterIncrement(action: Exclude<ActivityReactionAction, "SHARE">) {
    if (action === "LIKE") {
      return { likesCount: { increment: 1 } };
    }

    return { favoritesCount: { increment: 1 } };
  }

  private assertPostEditPermission(user: AuthenticatedUser, postAuthorId: string) {
    if (user.id === postAuthorId) {
      return;
    }

    if (
      ([UserType.ADMIN, UserType.ORG_MANAGER, UserType.STAFF] as UserType[]).includes(
        user.type
      )
    ) {
      return;
    }

    throw new ForbiddenException("No permission to edit this post");
  }

  private async assertPostExists(postId: string) {
    await this.getPublishedPost(postId);
  }

  private async assertActivityExists(activityId: string) {
    const activity = await this.prismaService.activity.findUnique({
      where: { id: activityId },
      select: { id: true }
    });

    if (!activity) {
      throw new NotFoundException("Activity not found");
    }
  }

  private async getPublishedPost(postId: string) {
    const post = await this.prismaService.communityPost.findFirst({
      where: { id: postId, status: CommunityPostStatus.PUBLISHED },
      select: {
        id: true,
        authorId: true,
        content: true,
        images: true
      }
    });

    if (!post) {
      throw new NotFoundException("Post not found");
    }

    return post;
  }

  private getTextSnippet(value: string | null | undefined) {
    return (value ?? "").slice(0, 80);
  }

  private buildPostHeadline(content: string, fallbackTag: string) {
    const firstSentence = content
      .split(/[。！？!?]/)
      .map((item) => item.trim())
      .find(Boolean);

    if (firstSentence) {
      return firstSentence.length > 24 ? `${firstSentence.slice(0, 24)}...` : firstSentence;
    }

    return fallbackTag.replace(/^#/, "") || "生活圈动态";
  }

  private async createPostNotice(
    tx: Pick<PrismaService, "user" | "notification" | "notificationRecipient">,
    input: {
      recipientUserId: string;
      actorUserId: string;
      type: NotificationType;
      title: string;
      content: string;
      metadata: Record<string, unknown>;
    }
  ) {
    const actor = await tx.user.findUnique({
      where: { id: input.actorUserId },
      select: {
        id: true,
        realName: true,
        nickname: true,
        phone: true,
        avatarUrl: true
      }
    });

    const actorName = actor
      ? actor.realName ?? actor.nickname ?? actor.phone
      : "社区用户";

    const notification = await tx.notification.create({
      data: {
        senderId: input.actorUserId,
        type: input.type,
        title: input.title,
        content: input.content,
        metadata: {
          ...input.metadata,
          actorUserId: input.actorUserId,
          actorName,
          actorAvatar: actor?.avatarUrl ?? null
        }
      }
    });

    await tx.notificationRecipient.create({
      data: {
        notificationId: notification.id,
        userId: input.recipientUserId
      }
    });
  }
}
