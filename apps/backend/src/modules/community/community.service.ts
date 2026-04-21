import {
  ForbiddenException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import {
  ActivityStatus,
  CommunityPostStatus,
  ReactionType,
  RegistrationStatus,
  UserType
} from "@prisma/client";
import type { AuthenticatedUser } from "../../common/auth/auth.types";
import {
  paginate,
  toDateTimeString,
  toNumber,
  toPrismaNullableJson
} from "../../common/utils/serializers";
import { PrismaService } from "../../infra/prisma/prisma.service";

type PostReactionAction = "LIKE" | "FAVORITE" | "SHARE";

@Injectable()
export class AppCommunityService {
  constructor(private readonly prismaService: PrismaService) {}

  async listTopics() {
    const topics = await this.prismaService.communityTopic.findMany({
      orderBy: { participantCount: "desc" }
    });

    return topics.map((item) => ({
      topicId: item.id,
      title: item.title,
      coverUrl: item.coverUrl,
      participantCount: item.participantCount,
      tone: item.tone
    }));
  }

  async listPosts(userId: string, page: number, pageSize: number, topicId?: string) {
    const posts = await this.prismaService.communityPost.findMany({
      where: {
        status: CommunityPostStatus.PUBLISHED,
        topicId: topicId ?? undefined
      },
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

    return paginate(
      posts.map((item) => ({
        postId: item.id,
        content: item.content,
        images: item.images,
        tagLabel: item.tagLabel,
        likesCount: item.likesCount,
        favoritesCount: item.favoritesCount,
        commentsCount: item.commentsCount,
        sharesCount: item.sharesCount,
        createdAt: toDateTimeString(item.createdAt),
        author: {
          userId: item.author.id,
          name: item.author.realName ?? item.author.nickname ?? item.author.phone,
          avatar: item.author.avatarUrl
        },
        topic: item.topic
          ? {
              topicId: item.topic.id,
              title: item.topic.title
            }
          : null,
        liked: likedPostIds.has(item.id),
        favorited: favoritedPostIds.has(item.id)
      })),
      page,
      pageSize
    );
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

    return {
      postId: post.id,
      content: post.content,
      images: post.images,
      tagLabel: post.tagLabel,
      likesCount: post.likesCount,
      favoritesCount: post.favoritesCount,
      commentsCount: post.commentsCount,
      sharesCount: post.sharesCount,
      createdAt: toDateTimeString(post.createdAt),
      author: {
        userId: post.author.id,
        name: post.author.realName ?? post.author.nickname ?? post.author.phone,
        avatar: post.author.avatarUrl
      },
      topic: post.topic
        ? {
            topicId: post.topic.id,
            title: post.topic.title
          }
        : null,
      liked: reactions.some((item) => item.reactionType === ReactionType.LIKE),
      favorited: reactions.some((item) => item.reactionType === ReactionType.FAVORITE)
    };
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
      await this.prismaService.$transaction([
        this.prismaService.communityPostReaction.create({
          data: {
            postId,
            userId,
            reactionType
          }
        }),
        this.prismaService.communityPost.update({
          where: { id: postId },
          data: this.getReactionCounterIncrement(action)
        })
      ]);
    }

    return {
      postId,
      action,
      recorded: true
    };
  }

  async listPostComments(postId: string, page: number, pageSize: number) {
    await this.assertPostExists(postId);

    const comments = await this.prismaService.communityComment.findMany({
      where: { postId },
      include: { user: true },
      orderBy: { createdAt: "asc" }
    });

    return paginate(
      comments.map((item) => ({
        commentId: item.id,
        parentId: item.parentId,
        content: item.content,
        createdAt: toDateTimeString(item.createdAt),
        user: {
          userId: item.user.id,
          name: item.user.realName ?? item.user.nickname ?? item.user.phone,
          avatar: item.user.avatarUrl
        }
      })),
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
    await this.assertPostExists(postId);

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

      return comment;
    });

    return {
      commentId: result.id,
      createdAt: toDateTimeString(result.createdAt)
    };
  }

  async listActivities(userId: string, page: number, pageSize: number, status?: string) {
    const activities = await this.prismaService.activity.findMany({
      where: {
        status: status ? (status as ActivityStatus) : undefined
      },
      orderBy: [{ startAt: "asc" }, { createdAt: "desc" }]
    });

    const registrations = await this.prismaService.activityRegistration.findMany({
      where: {
        userId,
        activityId: { in: activities.map((item) => item.id) },
        status: { in: [RegistrationStatus.REGISTERED, RegistrationStatus.CHECKED_IN] }
      }
    });
    const registeredIds = new Set(registrations.map((item) => item.activityId));

    return paginate(
      activities.map((item) => ({
        activityId: item.id,
        title: item.title,
        category: item.category,
        status: item.status,
        fee: toNumber(item.fee),
        location: item.location,
        coverUrl: item.coverUrl,
        startAt: toDateTimeString(item.startAt),
        endAt: toDateTimeString(item.endAt),
        signupDeadline: toDateTimeString(item.signupDeadline),
        maxParticipants: item.maxParticipants,
        likesCount: item.likesCount,
        favoritesCount: item.favoritesCount,
        commentsCount: item.commentsCount,
        registered: registeredIds.has(item.id)
      })),
      page,
      pageSize
    );
  }

  async getActivityDetail(userId: string, activityId: string) {
    const activity = await this.prismaService.activity.findUnique({
      where: { id: activityId }
    });

    if (!activity) {
      throw new NotFoundException("Activity not found");
    }

    const registration = await this.prismaService.activityRegistration.findUnique({
      where: {
        activityId_userId: {
          activityId,
          userId
        }
      }
    });

    return {
      activityId: activity.id,
      title: activity.title,
      category: activity.category,
      status: activity.status,
      fee: toNumber(activity.fee),
      location: activity.location,
      coverUrl: activity.coverUrl,
      startAt: toDateTimeString(activity.startAt),
      endAt: toDateTimeString(activity.endAt),
      signupDeadline: toDateTimeString(activity.signupDeadline),
      maxParticipants: activity.maxParticipants,
      detailContent: activity.detailContent,
      likesCount: activity.likesCount,
      favoritesCount: activity.favoritesCount,
      commentsCount: activity.commentsCount,
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
        cancellationReason: remark ?? null
      }
    });

    return {
      registrationId: registration.id,
      status: registration.status,
      registeredAt: toDateTimeString(registration.registeredAt)
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
      registrations.map((item) => ({
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
          coverUrl: item.activity.coverUrl,
          startAt: toDateTimeString(item.activity.startAt),
          endAt: toDateTimeString(item.activity.endAt)
        }
      })),
      page,
      pageSize
    );
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
    const post = await this.prismaService.communityPost.findFirst({
      where: { id: postId, status: CommunityPostStatus.PUBLISHED },
      select: { id: true }
    });

    if (!post) {
      throw new NotFoundException("Post not found");
    }
  }
}
