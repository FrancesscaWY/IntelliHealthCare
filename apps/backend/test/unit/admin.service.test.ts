import assert from "node:assert/strict";
import test from "node:test";
import { StaffApplicationStatus, StaffRole } from "@prisma/client";
import { AdminService } from "../../src/modules/admin/admin.service";

function createAdminService() {
  let lastReviewUpdate:
    | {
        where: { id: string };
        data: Record<string, unknown>;
      }
    | null = null;

  const prismaService = {
    staffApplication: {
      findMany: async () => [
        {
          id: "application_001",
          staffId: "staff_001",
          status: StaffApplicationStatus.APPROVED,
          reviewerUserId: "user_admin_001",
          createdAt: new Date("2026-04-10T10:00:00Z"),
          reviewedAt: new Date("2026-04-10T11:00:00Z"),
        },
        {
          id: "application_002",
          staffId: "staff_002",
          status: StaffApplicationStatus.PENDING,
          reviewerUserId: null,
          createdAt: new Date("2026-04-11T09:00:00Z"),
          reviewedAt: null,
        },
      ],
      update: async (payload: {
        where: { id: string };
        data: Record<string, unknown>;
      }) => {
        lastReviewUpdate = payload;
        return {
          id: payload.where.id,
          ...payload.data,
        };
      },
    },
    staff: {
      findMany: async () => [
        {
          id: "staff_001",
          staffNo: "THERAPIST-001",
          name: "周明",
          role: StaffRole.THERAPIST,
          phone: "13700137001",
          avatarUrl: "/demo/zhouming.jpg",
        },
        {
          id: "staff_002",
          staffNo: "NURSE-002",
          name: "李秀兰",
          role: StaffRole.NURSE,
          phone: "13700137002",
          avatarUrl: "/demo/lixiulan.jpg",
        },
      ],
    },
    user: {
      findMany: async () => [
        {
          id: "user_admin_001",
          realName: "赵晨",
          nickname: "运营中心",
          phone: "13600136000",
        },
      ],
    },
  };

  return {
    service: new AdminService(prismaService as never),
    getLastReviewUpdate: () => lastReviewUpdate,
  };
}

test("listStaffApplications resolves reviewer name from reviewerUserId", async () => {
  const { service } = createAdminService();

  const result = await service.listStaffApplications(1, 10);
  const rowsById = new Map(result.rows.map((row) => [row.id, row]));

  assert.equal(result.rows.length, 2);
  assert.equal(rowsById.get("application_001")?.reviewer, "赵晨");
  assert.equal(rowsById.get("application_002")?.reviewer, "待审核");
  assert.ok(result.serviceTypes.includes("客服接待"));
});

test("reviewStaffApplication persists reviewer id instead of display name", async () => {
  const { service, getLastReviewUpdate } = createAdminService();

  await service.reviewStaffApplication(
    "application_001",
    StaffApplicationStatus.REJECTED,
    "资料不完整",
    {
      id: "user_admin_001",
      phone: "13600136000",
      type: "ADMIN" as never,
      roles: ["PLATFORM_ADMIN"],
      scope: "admin",
      realName: "赵晨",
    }
  );

  assert.equal(getLastReviewUpdate()?.where.id, "application_001");
  assert.equal(getLastReviewUpdate()?.data.reviewerUserId, "user_admin_001");
  assert.equal(getLastReviewUpdate()?.data.reviewRemark, "资料不完整");
});
