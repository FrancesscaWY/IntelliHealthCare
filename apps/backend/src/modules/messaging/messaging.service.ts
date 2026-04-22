import {
  ForbiddenException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import {
  ConversationScene,
  MessageContentType,
  NotificationType,
  StaffRole
} from "@prisma/client";
import type { AuthenticatedUser } from "../../common/auth/auth.types";
import {
  ensureRecord,
  paginate,
  toDateTimeString
} from "../../common/utils/serializers";
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
          include: {
            notification: {
              include: {
                sender: true
              }
            }
          },
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

    const latestConversationIds = latestConversations.map((item) => item.conversationId);
    const [latestMessages, latestConversationParticipants] = await Promise.all([
      this.prismaService.conversationMessage.findMany({
        where: { conversationId: { in: latestConversationIds } },
        orderBy: { createdAt: "desc" }
      }),
      this.prismaService.conversationParticipant.findMany({
        where: { conversationId: { in: latestConversationIds } },
        include: { user: true }
      })
    ]);

    return {
      unreadNoticeCount,
      unreadConversationCount,
      latestNotices: latestNotices.map((item) =>
        this.mapNotice(item, item.notification.sender, item.isRead)
      ),
      latestConversations: latestConversations.map((item) => {
        const lastMessage = latestMessages.find(
          (row) => row.conversationId === item.conversationId
        );
        const peers = latestConversationParticipants
          .filter((row) => row.conversationId === item.conversationId && row.userId !== userId)
          .map((row) => ({
            userId: row.userId,
            name: row.user.realName ?? row.user.nickname ?? row.user.phone,
            avatar: row.user.avatarUrl,
            roleLabel: row.roleLabel
          }));

        return this.mapConversation(item, peers, lastMessage);
      })
    };
  }

  async listNotices(
    userId: string,
    page: number,
    pageSize: number,
    type?: NotificationType | string
  ) {
    const rows = await this.prismaService.notificationRecipient.findMany({
      where: {
        userId,
        notification: {
          type: (type as NotificationType | undefined) ?? undefined
        }
      },
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
      rows.map((item) =>
        this.mapNotice(item, item.notification.sender, item.isRead)
      ),
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

        return this.mapConversation(item, peers, lastMessage);
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
    const doctor = await this.findDoctorUser(payload.doctorUserId);

    const existingConversation = await this.prismaService.conversation.findFirst({
      where: {
        scene: ConversationScene.DOCTOR,
        AND: [
          {
            participants: {
              some: {
                userId: user.id
              }
            }
          },
          {
            participants: {
              some: {
                userId: doctor.id
              }
            }
          }
        ]
      },
      orderBy: { updatedAt: "desc" }
    });

    if (existingConversation) {
      return {
        conversationId: existingConversation.id,
        scene: existingConversation.scene,
        topic: existingConversation.topic
      };
    }

    const doctorName = doctor.realName ?? doctor.nickname ?? doctor.phone;
    const conversation = await this.prismaService.$transaction(async (tx) => {
      const created = await tx.conversation.create({
        data: {
          scene: ConversationScene.DOCTOR,
          topic: payload.topic ?? `${doctorName}医生咨询`,
          metadata: {
            doctorUserId: doctor.id,
            doctorName,
            doctorTitle: doctor.staffProfile?.title ?? "医生"
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
        id: item.id,
        contentType: item.contentType,
        content: this.extractMessageContent(item.contentType, item.content),
        createdAt: toDateTimeString(item.createdAt),
        time: this.formatMonthDayTime(item.createdAt),
        from: item.senderId === userId ? "me" : "doctor",
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
          content: this.buildMessagePayload(payload.contentType as MessageContentType, payload.content)
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
      content: this.extractMessageContent(message.contentType, message.content),
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

  private mapNotice(
    item: {
      notificationId: string;
      isRead: boolean;
      readAt: Date | null;
      notification: {
        type: NotificationType;
        title: string;
        content: string;
        metadata: unknown;
        createdAt: Date;
      };
    },
    sender:
      | {
          id: string;
          realName: string | null;
          nickname: string | null;
          phone: string;
        }
      | null,
    isRead: boolean
  ) {
    const metadata = ensureRecord(item.notification.metadata);

    return {
      noticeId: item.notificationId,
      id: item.notificationId,
      isRead,
      readAt: toDateTimeString(item.readAt),
      type: item.notification.type,
      title: item.notification.title,
      content: item.notification.content,
      desc: item.notification.content,
      metadata,
      createdAt: toDateTimeString(item.notification.createdAt),
      date: this.formatMonthDay(item.notification.createdAt),
      count: isRead ? 0 : 1,
      icon: this.getNoticeIcon(item.notification.type),
      tone: this.getNoticeTone(item.notification.type),
      sender: sender
        ? {
            userId: sender.id,
            name: sender.realName ?? sender.nickname ?? sender.phone
          }
        : null
    };
  }

  private mapConversation(
    item: {
      conversationId: string;
      unreadCount: number;
      conversation: {
        scene: ConversationScene;
        topic: string | null;
        metadata: unknown;
        lastMessageAt: Date | null;
      };
    },
    peers: Array<{
      userId: string;
      name: string;
      avatar: string | null;
      roleLabel: string | null;
    }>,
    lastMessage:
      | {
          id: string;
          contentType: MessageContentType;
          content: unknown;
          createdAt: Date;
        }
      | undefined
  ) {
    const previewText = lastMessage
      ? this.extractMessageContent(lastMessage.contentType, lastMessage.content)
      : "";
    const title = peers[0]?.name ?? item.conversation.topic ?? "会话";

    return {
      conversationId: item.conversationId,
      id: item.conversationId,
      scene: item.conversation.scene,
      topic: item.conversation.topic,
      title,
      metadata: item.conversation.metadata,
      unreadCount: item.unreadCount,
      count: item.unreadCount,
      desc: previewText,
      lastMessageAt: toDateTimeString(item.conversation.lastMessageAt),
      date: item.conversation.lastMessageAt
        ? this.formatMonthDay(item.conversation.lastMessageAt)
        : null,
      icon: this.getConversationIcon(item.conversation.scene),
      tone: this.getConversationTone(item.conversation.scene),
      lastMessage: lastMessage
        ? {
            messageId: lastMessage.id,
            contentType: lastMessage.contentType,
            content: previewText,
            createdAt: toDateTimeString(lastMessage.createdAt)
          }
        : null,
      peers
    };
  }

  private buildMessagePayload(contentType: MessageContentType, content: string) {
    if (contentType === MessageContentType.TEXT) {
      return { text: content };
    }

    return { url: content };
  }

  private extractMessageContent(contentType: MessageContentType, value: unknown) {
    if (typeof value === "string") {
      return value;
    }

    const record = ensureRecord(value);

    if (contentType === MessageContentType.TEXT) {
      return String(record.text ?? record.content ?? "");
    }

    return String(record.url ?? record.fileUrl ?? record.text ?? record.content ?? "");
  }

  private getNoticeIcon(type: NotificationType) {
    if (type === NotificationType.SYSTEM) {
      return "system";
    }
    if (type === NotificationType.HEALTH_ALERT) {
      return "health";
    }
    if (type === NotificationType.ORDER) {
      return "order";
    }
    if (type === NotificationType.COMMENT) {
      return "comment";
    }
    if (type === NotificationType.LIKE) {
      return "like";
    }
    if (type === NotificationType.FOLLOW) {
      return "user";
    }
    return "message";
  }

  private getNoticeTone(type: NotificationType) {
    if (type === NotificationType.SYSTEM) {
      return "purple";
    }
    if (type === NotificationType.HEALTH_ALERT) {
      return "green";
    }
    if (type === NotificationType.ORDER) {
      return "mint";
    }
    if (type === NotificationType.COMMENT) {
      return "pink";
    }
    if (type === NotificationType.LIKE) {
      return "violet";
    }
    if (type === NotificationType.FOLLOW) {
      return "yellow";
    }
    return "blue";
  }

  private getConversationIcon(scene: ConversationScene) {
    if (scene === ConversationScene.DOCTOR) {
      return "doctor";
    }
    if (scene === ConversationScene.ASSISTANT) {
      return "assistant";
    }
    if (scene === ConversationScene.AFTER_SALE) {
      return "message";
    }
    return "mail";
  }

  private getConversationTone(scene: ConversationScene) {
    if (scene === ConversationScene.DOCTOR) {
      return "purple";
    }
    if (scene === ConversationScene.ASSISTANT) {
      return "green";
    }
    if (scene === ConversationScene.AFTER_SALE) {
      return "yellow";
    }
    return "blue";
  }

  private formatMonthDay(value: Date) {
    return `${String(value.getUTCMonth() + 1).padStart(2, "0")}-${String(value.getUTCDate()).padStart(2, "0")}`;
  }

  private formatMonthDayTime(value: Date) {
    return `${this.formatMonthDay(value)} ${String(value.getUTCHours()).padStart(2, "0")}:${String(value.getUTCMinutes()).padStart(2, "0")}`;
  }

  private async findDoctorUser(doctorUserId?: string) {
    const doctor = await this.prismaService.user.findFirst({
      where: doctorUserId
        ? {
            id: doctorUserId,
            OR: [
              {
                staffProfile: {
                  is: {
                    role: StaffRole.DOCTOR
                  }
                }
              },
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
          }
        : {
            OR: [
              {
                staffProfile: {
                  is: {
                    role: StaffRole.DOCTOR
                  }
                }
              },
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
      include: {
        staffProfile: true
      },
      orderBy: { createdAt: "asc" }
    });

    if (!doctor) {
      throw new NotFoundException("Doctor user not found");
    }

    return doctor;
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
