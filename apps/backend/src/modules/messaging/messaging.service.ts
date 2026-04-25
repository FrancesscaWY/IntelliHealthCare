import {
  ForbiddenException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import {
  ConversationScene,
  AdminMessageCampaignChannel,
  AdminMessageCampaignStatus,
  MessageContentType,
  NotificationType,
  StaffRole
} from "@prisma/client";
import type { AuthenticatedUser } from "../../common/auth/auth.types";
import {
  ensureRecord,
  paginate,
  toDateTimeString,
  toNumber,
  toPrismaJson,
  toPrismaNullableJson
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

  async listAdminCampaigns(
    page: number,
    pageSize: number,
    status?: AdminMessageCampaignStatus
  ) {
    const campaigns = await this.prismaService.adminMessageCampaign.findMany({
      where: {
        status: status ?? undefined
      },
      orderBy: { createdAt: "desc" }
    });
    const rows = campaigns.map((item) => ({
      id: item.id,
      sendTime: this.toDisplayDateTime(item.sentAt ?? item.scheduledAt ?? item.createdAt),
      title: item.title,
      status: this.getCampaignStatusText(item.status),
      content: item.content,
      receiver: this.getCampaignReceiverText(item.receiverType, item.receiverSnapshot),
      channel: this.getCampaignChannelText(item.channel)
    }));
    const result = paginate(rows, page, pageSize);

    return {
      title: "消息群发",
      statusOptions: ["全部状态", "待发送", "已发送", "审批中", "已撤回"],
      rows: result.list,
      ...result
    };
  }

  getAdminCampaignOptions() {
    return {
      title: "新增消息",
      receiverOptions: ["全部用户", "部分用户"],
      sendTimeOptions: ["立即发送", "定时发布"],
      channelOptions: ["系统消息", "短信", "会话消息"],
      selectedUsers: ["高血压重点关怀用户", "4 月新注册用户", "近 30 天未复购用户"],
      selectedProducts: ["春季康复理疗套餐", "居家护理上门服务"]
    };
  }

  async getAdminCampaignDetail(campaignId: string) {
    const campaign = await this.prismaService.adminMessageCampaign.findUnique({
      where: { id: campaignId }
    });

    if (!campaign) {
      throw new NotFoundException("Campaign not found");
    }

    return {
      campaignId: campaign.id,
      title: campaign.title,
      content: campaign.content,
      status: campaign.status,
      statusText: this.getCampaignStatusText(campaign.status),
      channel: campaign.channel,
      channelText: this.getCampaignChannelText(campaign.channel),
      receiverType: campaign.receiverType,
      receiverSnapshot: campaign.receiverSnapshot,
      insertProductLink: campaign.insertProductLink,
      productSnapshot: campaign.productSnapshot,
      scheduledAt: toDateTimeString(campaign.scheduledAt),
      sentAt: toDateTimeString(campaign.sentAt),
      withdrawnAt: toDateTimeString(campaign.withdrawnAt),
      createdAt: toDateTimeString(campaign.createdAt)
    };
  }

  async createAdminCampaign(
    user: AuthenticatedUser,
    payload: {
      title: string;
      content: string;
      channel: AdminMessageCampaignChannel;
      status: AdminMessageCampaignStatus;
      receiverType: string;
      receiverSnapshot?: Record<string, unknown>;
      insertProductLink?: boolean;
      productSnapshot?: Record<string, unknown>[];
      scheduledAt?: string;
    }
  ) {
    const campaign = await this.prismaService.adminMessageCampaign.create({
      data: {
        title: payload.title,
        content: payload.content,
        channel: payload.channel,
        status: payload.status,
        receiverType: payload.receiverType,
        receiverSnapshot: toPrismaNullableJson(payload.receiverSnapshot ?? null),
        insertProductLink: payload.insertProductLink ?? false,
        productSnapshot: toPrismaNullableJson(payload.productSnapshot ?? null),
        scheduledAt: payload.scheduledAt ? new Date(payload.scheduledAt) : null,
        sentAt: payload.status === AdminMessageCampaignStatus.SENT ? new Date() : null,
        createdByUserId: user.id,
        updatedByUserId: user.id
      }
    });

    return {
      campaignId: campaign.id,
      status: campaign.status
    };
  }

  async updateAdminCampaign(
    user: AuthenticatedUser,
    campaignId: string,
    payload: {
      title: string;
      content: string;
      channel: AdminMessageCampaignChannel;
      status: AdminMessageCampaignStatus;
      receiverType: string;
      receiverSnapshot?: Record<string, unknown>;
      insertProductLink?: boolean;
      productSnapshot?: Record<string, unknown>[];
      scheduledAt?: string;
    }
  ) {
    const campaign = await this.prismaService.adminMessageCampaign.update({
      where: { id: campaignId },
      data: {
        title: payload.title,
        content: payload.content,
        channel: payload.channel,
        status: payload.status,
        receiverType: payload.receiverType,
        receiverSnapshot: toPrismaNullableJson(payload.receiverSnapshot ?? null),
        insertProductLink: payload.insertProductLink ?? false,
        productSnapshot: toPrismaNullableJson(payload.productSnapshot ?? null),
        scheduledAt: payload.scheduledAt ? new Date(payload.scheduledAt) : null,
        sentAt: payload.status === AdminMessageCampaignStatus.SENT ? new Date() : undefined,
        updatedByUserId: user.id
      }
    });

    return {
      campaignId: campaign.id,
      status: campaign.status
    };
  }

  async deleteAdminCampaign(campaignId: string) {
    await this.prismaService.adminMessageCampaign.delete({
      where: { id: campaignId }
    });

    return {
      deleted: true,
      campaignId
    };
  }

  async withdrawAdminCampaign(user: AuthenticatedUser, campaignId: string) {
    const campaign = await this.prismaService.adminMessageCampaign.update({
      where: { id: campaignId },
      data: {
        status: AdminMessageCampaignStatus.WITHDRAWN,
        withdrawnAt: new Date(),
        updatedByUserId: user.id
      }
    });

    return {
      campaignId: campaign.id,
      status: campaign.status
    };
  }

  async batchOperateAdminCampaigns(
    user: AuthenticatedUser,
    campaignIds: string[],
    action: "DELETE" | "WITHDRAW"
  ) {
    if (action === "DELETE") {
      const result = await this.prismaService.adminMessageCampaign.deleteMany({
        where: {
          id: {
            in: campaignIds
          }
        }
      });

      return {
        deleted: result.count
      };
    }

    const result = await this.prismaService.adminMessageCampaign.updateMany({
      where: {
        id: {
          in: campaignIds
        }
      },
      data: {
        status: AdminMessageCampaignStatus.WITHDRAWN,
        withdrawnAt: new Date(),
        updatedByUserId: user.id
      }
    });

    return {
      updated: result.count
    };
  }

  async listAdminConversations(page: number, pageSize: number, keyword?: string) {
    const normalizedKeyword = keyword?.trim().toLowerCase();
    const conversations = await this.prismaService.conversation.findMany({
      include: {
        participants: {
          include: {
            user: true
          }
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1
        }
      },
      orderBy: { updatedAt: "desc" }
    });

    const rows = conversations
      .map((item, index) => {
        const customerParticipant =
          item.participants.find((participant) =>
            ["ELDER", "FAMILY"].includes(participant.user.type)
          ) ?? item.participants[0];
        const customer = customerParticipant?.user;
        const latestMessage = item.messages[0] ?? null;

        return {
          id: item.id,
          name: customer
            ? customer.realName ?? customer.nickname ?? customer.phone
            : item.topic ?? "未知客户",
          preview: latestMessage
            ? this.extractMessageContent(latestMessage.contentType, latestMessage.content)
            : item.topic ?? "",
          time: item.lastMessageAt ? this.formatHourMinute(item.lastMessageAt) : "",
          unread: item.participants.reduce((sum, participant) => sum + participant.unreadCount, 0),
          avatar: customer?.avatarUrl ?? null,
          active: index === 0
        };
      })
      .filter((item) => {
        if (!normalizedKeyword) {
          return true;
        }

        return [item.name, item.preview, item.id].some((field) =>
          String(field).toLowerCase().includes(normalizedKeyword)
        );
      });

    const result = paginate(rows, page, pageSize);

    return {
      title: "会话",
      conversations: result.list,
      ...result
    };
  }

  async getAdminConversationDetail(conversationId: string) {
    const [conversation, messages, services] = await Promise.all([
      this.prismaService.conversation.findUnique({
        where: { id: conversationId },
        include: {
          participants: {
            include: {
              user: {
                include: {
                  archive: true,
                  ownedOrders: {
                    include: {
                      service: true
                    },
                    orderBy: { createdAt: "desc" },
                    take: 5
                  }
                }
              }
            }
          }
        }
      }),
      this.prismaService.conversationMessage.findMany({
        where: { conversationId },
        include: { sender: true },
        orderBy: { createdAt: "asc" }
      }),
      this.prismaService.serviceItem.findMany({
        where: { enabled: true },
        orderBy: [{ salesVolume: "desc" }, { rating: "desc" }],
        take: 6
      })
    ]);

    if (!conversation) {
      throw new NotFoundException("Conversation not found");
    }

    const customer =
      conversation.participants.find((participant) =>
        ["ELDER", "FAMILY"].includes(participant.user.type)
      )?.user ?? conversation.participants[0]?.user;
    const consultant =
      conversation.participants.find((participant) =>
        ["ADMIN", "STAFF", "ORG_MANAGER"].includes(participant.user.type)
      )?.user ?? null;

    return {
      title: "会话",
      currentSessionName: customer
        ? customer.realName ?? customer.nickname ?? customer.phone
        : conversation.topic ?? "会话",
      conversationId: conversation.id,
      topic: conversation.topic,
      metadata: conversation.metadata,
      messages: messages.map((item) => ({
        id: item.id,
        side: item.senderId === consultant?.id ? "left" : "right",
        text: this.extractMessageContent(item.contentType, item.content),
        avatar: item.sender?.avatarUrl ?? null
      })),
      customer: customer
        ? {
            name: customer.realName ?? customer.nickname ?? customer.phone,
            avatar: customer.avatarUrl,
            tags: ensureRecord(customer.archive).riskTags ?? [],
            orderCount: customer.ownedOrders.length,
            amount: customer.ownedOrders
              .reduce((sum, item) => sum + (toNumber(item.payableAmount) ?? 0), 0)
              .toFixed(2)
          }
        : null,
      orders:
        customer?.ownedOrders.map((item) => ({
          id: item.id,
          status: item.status,
          title: item.service.title,
          image: item.service.coverUrl,
          time: this.toDisplayDateTime(item.createdAt),
          amount: `${(toNumber(item.payableAmount) ?? 0).toFixed(2)}元`
        })) ?? [],
      goods: services.map((item) => ({
        id: item.id,
        title: item.title,
        image: item.coverUrl,
        price: (toNumber(item.price) ?? 0).toFixed(2)
      }))
    };
  }

  async listAdminConversationMessages(
    conversationId: string,
    page: number,
    pageSize: number
  ) {
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

  async sendAdminConversationMessage(
    user: AuthenticatedUser,
    conversationId: string,
    payload: {
      contentType: "TEXT" | "IMAGE" | "AUDIO";
      content: string;
    }
  ) {
    const message = await this.prismaService.$transaction(async (tx) => {
      const exists = await tx.conversation.findUnique({
        where: { id: conversationId }
      });

      if (!exists) {
        throw new NotFoundException("Conversation not found");
      }

      const created = await tx.conversationMessage.create({
        data: {
          conversationId,
          senderId: user.id,
          contentType: payload.contentType as MessageContentType,
          content: this.buildMessagePayload(
            payload.contentType as MessageContentType,
            payload.content
          )
        }
      });

      await tx.conversation.update({
        where: { id: conversationId },
        data: {
          lastMessageAt: created.createdAt
        }
      });

      return created;
    });

    return {
      messageId: message.id,
      conversationId,
      contentType: message.contentType,
      content: this.extractMessageContent(message.contentType, message.content),
      createdAt: toDateTimeString(message.createdAt)
    };
  }

  async endAdminConversation(user: AuthenticatedUser, conversationId: string) {
    const conversation = await this.prismaService.conversation.findUnique({
      where: { id: conversationId }
    });

    if (!conversation) {
      throw new NotFoundException("Conversation not found");
    }

    await this.prismaService.conversation.update({
      where: { id: conversationId },
      data: {
        metadata: toPrismaJson({
          ...ensureRecord(conversation.metadata),
          endedAt: new Date().toISOString(),
          endedBy: user.id
        })
      }
    });

    return {
      conversationId,
      ended: true
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

  private getCampaignStatusText(status: AdminMessageCampaignStatus) {
    switch (status) {
      case AdminMessageCampaignStatus.DRAFT:
      case AdminMessageCampaignStatus.SCHEDULED:
        return "待发送";
      case AdminMessageCampaignStatus.REVIEWING:
        return "审批中";
      case AdminMessageCampaignStatus.SENT:
        return "已发送";
      case AdminMessageCampaignStatus.WITHDRAWN:
        return "已撤回";
    }
  }

  private getCampaignChannelText(channel: AdminMessageCampaignChannel) {
    switch (channel) {
      case AdminMessageCampaignChannel.SYSTEM:
        return "系统消息";
      case AdminMessageCampaignChannel.SMS:
        return "短信";
      case AdminMessageCampaignChannel.CONVERSATION:
        return "会话消息";
    }
  }

  private getCampaignReceiverText(receiverType: string, snapshot: unknown) {
    const record = ensureRecord(snapshot);
    if (typeof record.label === "string") {
      return record.label;
    }

    return receiverType === "ALL_USERS" ? "全部用户" : "部分用户";
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

  private formatHourMinute(value: Date) {
    return `${String(value.getUTCHours()).padStart(2, "0")}:${String(value.getUTCMinutes()).padStart(2, "0")}`;
  }

  private toDisplayDateTime(value: Date | string | null | undefined) {
    const iso = toDateTimeString(value);
    return iso ? iso.replace("T", " ").slice(0, 16) : null;
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
