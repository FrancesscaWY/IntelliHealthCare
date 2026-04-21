import {
  ForbiddenException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import {
  ConversationScene,
  MessageContentType,
  NotificationType,
  UserType
} from "@prisma/client";
import type { AuthenticatedUser } from "../../common/auth/auth.types";
import { paginate, toDateTimeString } from "../../common/utils/serializers";
import { PrismaService } from "../../infra/prisma/prisma.service";

@Injectable()
export class AppMessagingService {
  constructor(private readonly prismaService: PrismaService) {}

  async getMessageOverview(userId: string) {
    const [unreadNoticeCount, unreadConversationCount, latestNotices, latestConversations] =
      await Promise.all([
        this.prismaService.notificationRecipient.count({
          where: { userId, isRead: false }
        }),
        this.prismaService.conversationParticipant.count({
          where: {
            userId,
            unreadCount: { gt: 0 }
          }
        }),
        this.prismaService.notificationRecipient.findMany({
          where: { userId },
          include: { notification: true },
          orderBy: { notification: { createdAt: "desc" } },
          take: 5
        }),
        this.prismaService.conversationParticipant.findMany({
          where: { userId },
          include: {
            conversation: true
          },
          orderBy: { conversation: { updatedAt: "desc" } },
          take: 5
        })
      ]);

    return {
      unreadNoticeCount,
      unreadConversationCount,
      latestNotices: latestNotices.map((item) => ({
        noticeId: item.notificationId,
        title: item.notification.title,
        type: item.notification.type,
        isRead: item.isRead,
        createdAt: toDateTimeString(item.notification.createdAt)
      })),
      latestConversations: latestConversations.map((item) => ({
        conversationId: item.conversationId,
        scene: item.conversation.scene,
        topic: item.conversation.topic,
        unreadCount: item.unreadCount,
        lastMessageAt: toDateTimeString(item.conversation.lastMessageAt)
      }))
    };
  }

  async listNotices(userId: string, page: number, pageSize: number) {
    const rows = await this.prismaService.notificationRecipient.findMany({
      where: { userId },
      include: {
        notification: {
          include: {
            sender: true
          }
        }
      },
      orderBy: { notification: { createdAt: "desc" } }
    });

    return paginate(
      rows.map((item) => ({
        noticeId: item.notificationId,
        isRead: item.isRead,
        readAt: toDateTimeString(item.readAt),
        type: item.notification.type,
        title: item.notification.title,
        content: item.notification.content,
        metadata: item.notification.metadata,
        createdAt: toDateTimeString(item.notification.createdAt),
        sender: item.notification.sender
          ? {
              userId: item.notification.sender.id,
              name:
                item.notification.sender.realName ??
                item.notification.sender.nickname ??
                item.notification.sender.phone
            }
          : null
      })),
      page,
      pageSize
    );
  }

  async markNoticesAsRead(userId: string, noticeIds?: string[]) {
    const where = noticeIds?.length
      ? {
          userId,
          notificationId: { in: noticeIds }
        }
      : { userId };

    const result = await this.prismaService.notificationRecipient.updateMany({
      where,
      data: {
        isRead: true,
        readAt: new Date()
      }
    });

    return {
      updated: result.count
    };
  }

  async listConversations(userId: string, page: number, pageSize: number) {
    const participants = await this.prismaService.conversationParticipant.findMany({
      where: { userId },
      include: { conversation: true },
      orderBy: { conversation: { updatedAt: "desc" } }
    });

    const conversationIds = participants.map((item) => item.conversationId);
    const [messages, participantRows] = await Promise.all([
      this.prismaService.conversationMessage.findMany({
        where: { conversationId: { in: conversationIds } },
        orderBy: { createdAt: "desc" }
      }),
      this.prismaService.conversationParticipant.findMany({
        where: { conversationId: { in: conversationIds } },
        include: { user: true }
      })
    ]);

    return paginate(
      participants.map((item) => {
        const lastMessage = messages.find((row) => row.conversationId === item.conversationId);
        const peers = participantRows
          .filter((row) => row.conversationId === item.conversationId && row.userId !== userId)
          .map((row) => ({
            userId: row.userId,
            name: row.user.realName ?? row.user.nickname ?? row.user.phone,
            avatar: row.user.avatarUrl,
            roleLabel: row.roleLabel
          }));

        return {
          conversationId: item.conversationId,
          scene: item.conversation.scene,
          topic: item.conversation.topic,
          metadata: item.conversation.metadata,
          unreadCount: item.unreadCount,
          lastMessageAt: toDateTimeString(item.conversation.lastMessageAt),
          lastMessage: lastMessage
            ? {
                messageId: lastMessage.id,
                contentType: lastMessage.contentType,
                content: lastMessage.content,
                createdAt: toDateTimeString(lastMessage.createdAt)
              }
            : null,
          peers
        };
      }),
      page,
      pageSize
    );
  }

  async createDoctorConversation(
    user: AuthenticatedUser,
    payload: {
      doctorUserId?: string;
      topic?: string;
    }
  ) {
    const doctor = payload.doctorUserId
      ? await this.prismaService.user.findUnique({
          where: { id: payload.doctorUserId }
        })
      : await this.prismaService.user.findFirst({
          where: {
            OR: [
              { type: UserType.STAFF },
              {
                roles: {
                  some: {
                    role: {
                      code: "DOCTOR"
                    }
                  }
                }
              }
            ]
          },
          orderBy: { createdAt: "asc" }
        });

    if (!doctor) {
      throw new NotFoundException("Doctor user not found");
    }

    const conversation = await this.prismaService.$transaction(async (tx) => {
      const created = await tx.conversation.create({
        data: {
          scene: ConversationScene.DOCTOR,
          topic: payload.topic ?? "医生咨询",
          metadata: {
            doctorUserId: doctor.id
          }
        }
      });

      await tx.conversationParticipant.createMany({
        data: [
          {
            conversationId: created.id,
            userId: user.id,
            roleLabel: "咨询者"
          },
          {
            conversationId: created.id,
            userId: doctor.id,
            roleLabel: "医生"
          }
        ]
      });

      return created;
    });

    return {
      conversationId: conversation.id,
      scene: conversation.scene,
      topic: conversation.topic
    };
  }

  async listConversationMessages(
    userId: string,
    conversationId: string,
    page: number,
    pageSize: number
  ) {
    await this.assertConversationParticipant(userId, conversationId);

    const messages = await this.prismaService.conversationMessage.findMany({
      where: { conversationId },
      include: { sender: true },
      orderBy: { createdAt: "asc" }
    });

    return paginate(
      messages.map((item) => ({
        messageId: item.id,
        contentType: item.contentType,
        content: item.content,
        createdAt: toDateTimeString(item.createdAt),
        sender: item.sender
          ? {
              userId: item.sender.id,
              name: item.sender.realName ?? item.sender.nickname ?? item.sender.phone,
              avatar: item.sender.avatarUrl
            }
          : null
      })),
      page,
      pageSize
    );
  }

  async sendConversationMessage(
    userId: string,
    conversationId: string,
    payload: {
      contentType: "TEXT" | "IMAGE" | "AUDIO";
      content: string;
    }
  ) {
    await this.assertConversationParticipant(userId, conversationId);

    const message = await this.prismaService.$transaction(async (tx) => {
      const created = await tx.conversationMessage.create({
        data: {
          conversationId,
          senderId: userId,
          contentType: payload.contentType as MessageContentType,
          content: {
            text: payload.content
          }
        }
      });

      await tx.conversation.update({
        where: { id: conversationId },
        data: {
          lastMessageAt: created.createdAt
        }
      });

      await tx.conversationParticipant.updateMany({
        where: {
          conversationId,
          userId: { not: userId }
        },
        data: {
          unreadCount: { increment: 1 }
        }
      });

      return created;
    });

    return {
      messageId: message.id,
      conversationId: message.conversationId,
      contentType: message.contentType,
      content: message.content,
      createdAt: toDateTimeString(message.createdAt)
    };
  }

  async markConversationAsRead(userId: string, conversationId: string) {
    await this.assertConversationParticipant(userId, conversationId);

    await this.prismaService.conversationParticipant.update({
      where: {
        conversationId_userId: {
          conversationId,
          userId
        }
      },
      data: {
        unreadCount: 0
      }
    });

    return {
      read: true
    };
  }

  private async assertConversationParticipant(userId: string, conversationId: string) {
    const row = await this.prismaService.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId
        }
      }
    });

    if (!row) {
      throw new ForbiddenException("No permission to access this conversation");
    }
  }
}
