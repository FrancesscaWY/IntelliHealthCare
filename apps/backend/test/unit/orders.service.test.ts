import assert from "node:assert/strict";
import test from "node:test";
import {
  AlertLevel,
  AlertStatus,
  MetricType,
  OrderStatus,
  ServiceCategory,
  UserType,
  WorkOrderStatus
} from "@prisma/client";
import { OrdersService } from "../../src/modules/orders/orders.service";

const currentUser = {
  id: "user_family",
  phone: "13800138000",
  type: UserType.FAMILY,
  realName: "赵女士"
};

function createOrdersService(prismaOverrides: Record<string, unknown>) {
  return new OrdersService(prismaOverrides as never);
}

test("createOrder persists optional aiSummary to Order.aiSummary", async () => {
  const aiSummary = {
    scene: "rehab",
    serviceTitle: "脑卒中术后康复套餐",
    recommendationReason: "结合康复需求优先推荐。",
    matchingSignals: ["近 7 天步数下降", "需上门康复评估"]
  };
  let createdOrderData: Record<string, unknown> | null = null;

  const service = createOrdersService({
    serviceItem: {
      findUnique: async () => ({
        id: "srv_rehab",
        title: "脑卒中术后康复套餐",
        category: ServiceCategory.REHAB_THERAPY,
        price: 399,
        coverUrl: "/service.png"
      })
    },
    address: {
      findUnique: async () => ({
        id: "addr_1",
        ownerId: "user_family",
        elderId: null,
        receiverName: "赵女士",
        receiverPhone: "13800138000",
        province: "上海市",
        city: "上海市",
        district: "徐汇区",
        detailAddress: "钦州南路 88 号",
        isDefault: true,
        createdAt: new Date("2026-04-20T00:00:00Z")
      })
    },
    familyBinding: {
      findFirst: async () => null
    },
    healthArchive: {
      findUnique: async () => ({
        riskTags: ["高血压"],
        longTermMemory: { careNeeds: ["康复训练"] }
      })
    },
    $transaction: async (callback: (tx: Record<string, unknown>) => Promise<unknown>) =>
      callback({
        order: {
          create: async ({ data }: { data: Record<string, unknown> }) => {
            createdOrderData = data;
            return {
              id: "order_1",
              orderNo: "OD202604270001",
              status: OrderStatus.PENDING_PAYMENT
            };
          }
        },
        orderTimeline: {
          create: async () => ({})
        }
      })
  });

  const result = await service.createOrder(currentUser as never, {
    serviceId: "srv_rehab",
    addressId: "addr_1",
    bookingDate: "2026-04-29",
    bookingTimeSlot: "09:00-11:00",
    aiSummary
  });

  assert.equal(result.orderId, "order_1");
  const writtenOrderData = createdOrderData as Record<string, unknown> | null;
  assert.ok(writtenOrderData);
  assert.deepEqual(writtenOrderData.aiSummary, aiSummary);
});

test("listAdminWorkOrders returns front-end contract fields", async () => {
  const service = createOrdersService({
    workOrder: {
      findMany: async () => [
        {
          id: "wo_1",
          orderId: "order_1",
          status: WorkOrderStatus.ASSIGNED,
          assigneeName: "刘康复师",
          institutionName: "智诊康养中心",
          scheduleAt: new Date("2026-04-29T09:00:00Z"),
          createdAt: new Date("2026-04-27T08:00:00Z"),
          dispatchNote: "优先安排康复师",
          agentDispatchSuggestion: {
            summary: "匹配康复服务经验和可用排班。"
          },
          assignee: { name: "刘康复师" },
          institution: { name: "智诊康养中心" },
          order: {
            orderNo: "OD202604270001",
            bookingDate: new Date("2026-04-29T00:00:00Z"),
            bookingTimeSlot: "09:00-11:00",
            payableAmount: 399,
            owner: {
              realName: "王强",
              nickname: null,
              phone: "13900139000",
              avatarUrl: null
            },
            service: {
              category: ServiceCategory.REHAB_THERAPY,
              title: "康复训练上门评估",
              summary: "康复师上门进行评估与训练。",
              coverUrl: "/rehab.png"
            }
          }
        }
      ]
    }
  });

  const result = await service.listAdminWorkOrders(1, 10);
  const row = result.list[0];

  assert.equal(row.workOrderId, "wo_1");
  assert.equal(row.orderId, "order_1");
  assert.equal(row.serviceTitle, "康复训练上门评估");
  assert.equal(row.customerName, "王强");
  assert.equal(row.bookingDate, "2026-04-29");
  assert.equal(row.scheduleAt, "2026-04-29T09:00:00.000Z");
  assert.deepEqual(row.agentDispatchSuggestion, {
    summary: "匹配康复服务经验和可用排班。"
  });
});

test("admin health alerts list and detail expose risk and follow-up suggestions", async () => {
  const alert = {
    id: "alert_1",
    level: AlertLevel.HIGH,
    status: AlertStatus.OPEN,
    sourceType: "metric",
    title: "连续血压偏高",
    summary: "最近 3 次血压高于个人基线。",
    suggestion: {
      riskSignals: ["收缩压连续偏高"],
      followUpSuggestions: ["今日内电话回访", "确认服药与复测计划"]
    },
    triggeredAt: new Date("2026-04-27T09:20:00Z"),
    handledAt: null,
    owner: {
      id: "user_elder",
      realName: "王强",
      nickname: null,
      phone: "13900139000",
      avatarUrl: null
    },
    archive: {
      riskTags: ["高血压"]
    },
    metricRecord: {
      metricType: MetricType.BLOOD_PRESSURE,
      value: "156/96"
    },
    handler: null
  };
  const service = createOrdersService({
    healthAlert: {
      findMany: async () => [alert],
      findUnique: async () => alert
    }
  });

  const list = await service.listAdminHealthAlerts(1, 10, AlertLevel.HIGH, AlertStatus.OPEN, "血压");
  const detail = await service.getAdminHealthAlertDetail("alert_1");

  assert.equal(list.list.length, 1);
  assert.equal(list.list[0]?.levelText, "高风险");
  assert.equal(list.list[0]?.relatedMetric, "血压");
  assert.deepEqual(detail.riskSignals, ["收缩压连续偏高"]);
  assert.deepEqual(detail.followUpSuggestions, ["今日内电话回访", "确认服药与复测计划"]);
  assert.equal(detail.metricValue, "156/96");
});
