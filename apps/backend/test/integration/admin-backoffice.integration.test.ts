import "reflect-metadata";
import assert from "node:assert/strict";
import test from "node:test";
import { ConfigService } from "@nestjs/config";
import { JwtModule, JwtService } from "@nestjs/jwt";
import { Test } from "@nestjs/testing";
import {
  AdminMessageCampaignChannel,
  AdminMessageCampaignStatus,
  Gender,
  OrderStatus,
  StaffApplicationStatus,
  UserStatus,
  UserType
} from "@prisma/client";
import { JwtAuthGuard } from "../../src/common/auth/jwt-auth.guard";
import { RolesGuard } from "../../src/common/auth/roles.guard";
import { AdminAnalyticsController } from "../../src/modules/admin/admin-analytics.controller";
import { AdminEldersController } from "../../src/modules/admin/admin.controller";
import { AdminService } from "../../src/modules/admin/admin.service";
import { AdminOrdersController } from "../../src/modules/orders/orders.controller";
import { OrdersService } from "../../src/modules/orders/orders.service";
import { AdminMessagingController } from "../../src/modules/messaging/messaging.controller";
import { AppMessagingService } from "../../src/modules/messaging/messaging.service";
import { PrismaService } from "../../src/infra/prisma/prisma.service";
import { requestJson, startTestApp, stopTestApp } from "../support/test-app";

function createMockPrisma() {
  const users = [
    {
      id: "user_elder_joy",
      phone: "13800138000",
      nickname: "JOY",
      passwordHash: "hash",
      type: UserType.ELDER,
      status: UserStatus.ACTIVE,
      realName: "王秀珍",
      avatarUrl: "https://cdn/avatar.jpg",
      gender: Gender.FEMALE,
      birthday: new Date("1961-08-01T00:00:00Z"),
      idCard: null,
      city: "上海市",
      realNameStatus: "VERIFIED",
      lastLoginAt: new Date("2026-04-20T07:52:00Z"),
      createdAt: new Date("2026-04-19T07:52:00Z"),
      updatedAt: new Date("2026-04-20T07:52:00Z")
    },
    {
      id: "user_admin_ops",
      phone: "13600136000",
      nickname: "运营中心",
      passwordHash: "hash",
      type: UserType.ADMIN,
      status: UserStatus.ACTIVE,
      realName: "赵晨",
      avatarUrl: null,
      gender: Gender.MALE,
      birthday: null,
      idCard: null,
      city: "上海市",
      realNameStatus: "VERIFIED",
      lastLoginAt: new Date("2026-04-20T08:15:00Z"),
      createdAt: new Date("2026-04-18T08:15:00Z"),
      updatedAt: new Date("2026-04-20T08:15:00Z")
    }
  ];
  const archives = [
    {
      id: "archive_joy",
      userId: "user_elder_joy",
      baseProfile: {
        bloodType: "A",
        education: "高中",
        maritalStatus: "已婚",
        address: "上海市浦东新区"
      },
      medicalHistory: { chronicDiseases: ["高血压"] },
      riskTags: ["高血压", "康复训练"],
      longTermMemory: { source: "后台创建" },
      createdAt: new Date("2026-04-19T07:52:00Z"),
      updatedAt: new Date("2026-04-20T07:52:00Z")
    }
  ];
  const service = {
    id: "srv_home_clean",
    code: "QJ-FW-2201",
    category: "HOME_CARE",
    title: "日常清洁 2小时",
    summary: "上门深度保洁",
    price: 300,
    marketPrice: 399,
    durationMinutes: 120,
    rating: 4.9,
    salesVolume: 12,
    coverUrl: "https://cdn/service.jpg",
    tags: [],
    regionScope: null,
    serviceContent: {},
    ragSnippet: null,
    enabled: true,
    createdAt: new Date("2026-04-18T08:15:00Z"),
    updatedAt: new Date("2026-04-20T08:15:00Z")
  };
  const order = {
    id: "order_001",
    orderNo: "2400126670",
    ownerId: "user_elder_joy",
    elderId: "user_elder_joy",
    serviceId: service.id,
    addressId: null,
    couponId: null,
    status: OrderStatus.PENDING_PAYMENT,
    source: "app",
    bookingDate: new Date("2026-04-24T00:00:00Z"),
    bookingTimeSlot: "09:00-11:00",
    urgencyLevel: 0,
    remark: null,
    originalAmount: 399,
    discountAmount: 99,
    payableAmount: 300,
    actualAmount: null,
    addressSnapshot: { city: "上海市", district: "浦东新区", detailAddress: "丹桂路 68 号" },
    contactSnapshot: { name: "王秀珍", phone: "13800138000" },
    healthSummarySnapshot: null,
    aiSummary: null,
    paidAt: null,
    cancelledAt: null,
    completedAt: null,
    createdAt: new Date("2026-04-22T10:12:07Z"),
    updatedAt: new Date("2026-04-22T10:12:07Z"),
    service,
    owner: users[0],
    elder: users[0],
    payments: [],
    workOrders: [],
    afterSales: []
  };
  const campaigns = [
    {
      id: "campaign_001",
      title: "春季健康服务上新提醒",
      content: "春季护理服务已开放预约。",
      status: AdminMessageCampaignStatus.SENT,
      channel: AdminMessageCampaignChannel.SYSTEM,
      receiverType: "ALL_USERS",
      receiverSnapshot: { label: "全部用户" },
      insertProductLink: false,
      productSnapshot: null,
      scheduledAt: null,
      sentAt: new Date("2026-04-20T09:20:00Z"),
      withdrawnAt: null,
      createdByUserId: "user_admin_ops",
      updatedByUserId: "user_admin_ops",
      createdAt: new Date("2026-04-20T09:10:00Z"),
      updatedAt: new Date("2026-04-20T09:20:00Z")
    }
  ];

  return {
    user: {
      findMany: async (args?: { where?: { type?: UserType | { in?: UserType[] }; status?: { not?: UserStatus } } }) => {
        const typeFilter = args?.where?.type;
        const allowedTypes =
          typeof typeFilter === "object" && typeFilter?.in
            ? typeFilter.in
            : typeFilter
              ? [typeFilter]
              : null;

        return users.filter((user) => {
          const matchesType = !allowedTypes || allowedTypes.includes(user.type);
          const matchesStatus = args?.where?.status?.not
            ? user.status !== args.where.status.not
            : true;
          return matchesType && matchesStatus;
        });
      },
      findUnique: async ({ where }: { where: { id?: string; phone?: string } }) =>
        users.find((user) => user.id === where.id || user.phone === where.phone) ?? null,
      update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const user = users.find((item) => item.id === where.id);
        Object.assign(user ?? {}, data);
        return user;
      }
    },
    healthArchive: {
      findMany: async () => archives,
      findUnique: async ({ where }: { where: { userId: string } }) =>
        archives.find((item) => item.userId === where.userId) ?? null
    },
    order: {
      findMany: async () => [order],
      findUnique: async () => ({
        ...order,
        payments: [],
        workOrders: [],
        afterSales: [],
        reviews: [],
        reports: [],
        timeline: []
      }),
      count: async () => 1,
      update: async ({ data }: { data: Record<string, unknown> }) => {
        Object.assign(order, data);
        return order;
      }
    },
    serviceItem: {
      findMany: async () => [service]
    },
    workOrder: {
      findMany: async () => [],
      count: async () => 0
    },
    communityPost: {
      findMany: async () => []
    },
    staff: {
      findMany: async () => []
    },
    healthAlert: {
      findMany: async () => [],
      count: async () => 0
    },
    device: {
      findMany: async () => []
    },
    medication: {
      findMany: async () => []
    },
    healthMetricRecord: {
      findMany: async () => []
    },
    report: {
      findMany: async () => [],
      count: async () => 0
    },
    userCoupon: {
      findMany: async () => []
    },
    userPointLedger: {
      findMany: async () => []
    },
    staffApplication: {
      findMany: async () => [],
      findUnique: async () => null,
      update: async () => ({ status: StaffApplicationStatus.APPROVED })
    },
    orderTimeline: {
      findMany: async () => [],
      create: async ({ data }: { data: Record<string, unknown> }) => data
    },
    paymentOrder: {
      findMany: async () => []
    },
    afterSaleRequest: {
      findMany: async () => []
    },
    userFootprint: {
      findMany: async () => []
    },
    communityComment: {
      findMany: async () => []
    },
    communityPostReaction: {
      findMany: async () => []
    },
    adminMessageCampaign: {
      findMany: async () => campaigns,
      findUnique: async ({ where }: { where: { id: string } }) =>
        campaigns.find((item) => item.id === where.id) ?? null,
      create: async ({ data }: { data: Record<string, unknown> }) => ({
        id: "campaign_created",
        createdAt: new Date("2026-04-23T00:00:00Z"),
        updatedAt: new Date("2026-04-23T00:00:00Z"),
        withdrawnAt: null,
        sentAt: null,
        scheduledAt: null,
        ...data
      }),
      update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const campaign = campaigns.find((item) => item.id === where.id) ?? campaigns[0];
        Object.assign(campaign, data);
        return campaign;
      }
    },
    conversation: {
      findMany: async () => [],
      findUnique: async () => null
    },
    $transaction: async <T>(callback: (tx: Record<string, unknown>) => Promise<T>) =>
      callback(createMockPrisma() as unknown as Record<string, unknown>)
  };
}

test("admin backoffice integration covers analytics, elders, orders and campaigns", async () => {
  const prismaService = createMockPrisma();
  const configService = {
    get: (key: string) => {
      const values: Record<string, string> = {
        JWT_ACCESS_SECRET: "test-access-secret-1234567890"
      };

      return values[key];
    }
  };

  const moduleRef = await Test.createTestingModule({
    imports: [
      JwtModule.register({
        secret: "test-access-secret-1234567890"
      })
    ],
    controllers: [
      AdminAnalyticsController,
      AdminEldersController,
      AdminOrdersController,
      AdminMessagingController
    ],
    providers: [
      AdminService,
      OrdersService,
      AppMessagingService,
      JwtAuthGuard,
      RolesGuard,
      {
        provide: PrismaService,
        useValue: prismaService
      },
      {
        provide: ConfigService,
        useValue: configService
      }
    ]
  }).compile();

  const { app, baseUrl } = await startTestApp(moduleRef);
  const jwtService = moduleRef.get(JwtService);
  const token = await jwtService.signAsync({
    sub: "user_admin_ops",
    phone: "13600136000",
    type: UserType.ADMIN,
    roles: ["PLATFORM_ADMIN"],
    scope: "admin",
    realName: "赵晨"
  });
  const headers = { authorization: `Bearer ${token}` };

  try {
    const analytics = await requestJson<{ code: number; data: { title: string } }>(
      baseUrl,
      "/admin/analytics/data-board",
      { headers }
    );
    assert.equal(analytics.status, 200);
    assert.equal(analytics.json.data.title, "用户概况");

    const elders = await requestJson<{ code: number; data: { members: unknown[] } }>(
      baseUrl,
      "/admin/elders",
      { headers }
    );
    assert.equal(elders.status, 200);
    assert.equal(elders.json.data.members.length, 1);

    const orders = await requestJson<{ code: number; data: { rows: Array<{ id: string }> } }>(
      baseUrl,
      "/admin/orders",
      { headers }
    );
    assert.equal(orders.status, 200);
    assert.equal(orders.json.data.rows[0].id, "2400126670");

    const campaigns = await requestJson<{ code: number; data: { rows: unknown[] } }>(
      baseUrl,
      "/admin/message-campaigns",
      { headers }
    );
    assert.equal(campaigns.status, 200);
    assert.equal(campaigns.json.data.rows.length, 1);
  } finally {
    await stopTestApp(app);
  }
});
