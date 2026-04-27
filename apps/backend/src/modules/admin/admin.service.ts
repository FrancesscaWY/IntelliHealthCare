import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import {
  Gender,
  InstitutionStatus,
  InstitutionType,
  MetricType,
  OrderStatus,
  Prisma,
  ReportType,
  ServiceCategory,
  StaffApplicationStatus,
  StaffRole,
  StaffStatus,
  UserStatus,
  UserType,
  WorkOrderStatus
} from "@prisma/client";
import { hashPassword } from "../../common/auth/password";
import type { AuthenticatedUser } from "../../common/auth/auth.types";
import {
  ensureArray,
  ensureRecord,
  getAge,
  paginate,
  toDateString,
  toDateTimeString,
  toNumber,
  toPrismaJson
} from "../../common/utils/serializers";
import { PrismaService } from "../../infra/prisma/prisma.service";

const MEMBER_TAG_TONES = ["mint", "peach", "lavender", "gold"] as const;
const ADMIN_ROLE_NAME_TO_CODE: Record<string, string> = {
  "平台管理员": "PLATFORM_ADMIN",
  "客服人员": "CUSTOMER_SERVICE",
  "机构主管": "ORG_MANAGER",
  "派单员": "PLATFORM_ADMIN",
  "医生": "DOCTOR",
  "护理员": "CAREGIVER"
};
const PRODUCT_STATUS_OPTIONS = ["全部状态", "已上架", "已下架", "草稿"] as const;

@Injectable()
export class AdminService {
  constructor(private readonly prismaService: PrismaService) {}

  async getAnalyticsDataBoard(range?: "weekly" | "monthly") {
    const users = await this.prismaService.user.findMany({
      where: {
        type: {
          in: [UserType.ELDER, UserType.FAMILY]
        }
      },
      orderBy: { createdAt: "asc" }
    });
    const orders = await this.prismaService.order.findMany({
      include: {
        service: true
      },
      orderBy: { createdAt: "asc" }
    });

    const periods = {
      weekly: this.buildAnalyticsUserPeriod(users, orders, 7),
      monthly: this.buildAnalyticsUserPeriod(users, orders, 30)
    };

    return {
      title: "用户概况",
      subtitle: "围绕新增、活跃与结构分布查看近阶段用户变化。",
      rangeOptions: [
        { key: "weekly", label: "近 7 天", caption: "每日趋势" },
        { key: "monthly", label: "近 30 天", caption: "阶段趋势" }
      ],
      activeRange: range ?? "weekly",
      periods
    };
  }

  async getAnalyticsTradeOverview() {
    const [orders, payments, refunds, footprints] = await Promise.all([
      this.prismaService.order.findMany({
        orderBy: { createdAt: "asc" }
      }),
      this.prismaService.paymentOrder.findMany({
        orderBy: { createdAt: "asc" }
      }),
      this.prismaService.afterSaleRequest.findMany({
        orderBy: { createdAt: "asc" }
      }),
      this.prismaService.userFootprint.findMany({
        orderBy: { viewedAt: "asc" }
      })
    ]);

    const browseCount = footprints.length;
    const visitorCount = new Set(footprints.map((item) => item.userId)).size;
    const orderCount = orders.length;
    const orderUserCount = new Set(orders.map((item) => item.ownerId)).size;
    const paidOrders = payments.filter((item) => item.status === "PAID");
    const paidUserCount = new Set(paidOrders.map((item) => item.payerId)).size;
    const paidAmount = paidOrders.reduce((sum, item) => sum + (toNumber(item.amount) ?? 0), 0);
    const refundAmount = refunds.reduce(
      (sum, item) => sum + (toNumber(item.amountRequested) ?? 0),
      0
    );

    const labels = this.buildRecentDateLabels(7);
    const absoluteDates = labels.map((label) => this.buildAbsoluteDayLabelFromShort(label));
    const actualPaidOrderTrend = this.buildExactRecentCountSeries(
      paidOrders.map((item) => ({
        createdAt: item.paidAt ?? item.createdAt
      })),
      absoluteDates
    );
    const paidOrderTrend = this.buildAdaptiveRecentCountSeries(
      actualPaidOrderTrend,
      paidOrders.length,
      absoluteDates,
      "analytics-trade-paid-orders",
      {
        share: 0.42,
        minimumWindowTotal: 5
      }
    );
    const averagePaidAmount = paidOrders.length > 0 ? paidAmount / paidOrders.length : 0;
    const amountTrend = this.scaleAmountSeriesToTotal(
      paidOrderTrend.map((count, index) => {
        const dayFactor = 0.88 + (this.hashString(`analytics-trade-amount:${absoluteDates[index]}`) % 9) * 0.035;
        return count * averagePaidAmount * dayFactor;
      }),
      Math.min(
        paidAmount,
        Math.max(
          paidOrders
            .filter((item) => {
              const day = toDateString(item.paidAt ?? item.createdAt);
              return Boolean(day && absoluteDates.includes(day));
            })
            .reduce((sum, item) => sum + (toNumber(item.amount) ?? 0), 0),
          paidAmount * 0.42
        )
      ),
      "analytics-trade-amount"
    );

    const amountBuckets = [
      { label: "100以下", min: 0, max: 100 },
      { label: "100-500", min: 100, max: 500 },
      { label: "500-1000", min: 500, max: 1000 },
      { label: "1000-1500", min: 1000, max: 1500 },
      { label: "1500-2000", min: 1500, max: 2000 },
      { label: "2000-2500", min: 2000, max: 2500 },
      { label: "2500-3000", min: 2500, max: 3000 },
      { label: "3000以上", min: 3000, max: Number.MAX_SAFE_INTEGER }
    ];

    const bucketValues = amountBuckets.map((bucket) =>
      orders.filter((item) => {
        const amount = toNumber(item.payableAmount) ?? 0;
        return amount >= bucket.min && amount < bucket.max;
      }).length
    );

    return {
      title: "交易概况",
      filterLabel: "选择日期",
      rangeLabel: `${labels[0]} ~ ${labels[labels.length - 1]}`,
      overviewRows: [
        [
          { label: "浏览量", value: String(browseCount) },
          { label: "访客量", value: String(visitorCount) }
        ],
        [
          { label: "下单人数", value: String(orderUserCount) },
          { label: "下单笔数", value: String(orderCount) },
          { label: "下单金额（元）", value: this.formatAmount(orders, "payableAmount") }
        ],
        [
          { label: "支付人数", value: String(paidUserCount) },
          { label: "支付订单数", value: String(paidOrders.length) },
          { label: "支付金额（元）", value: paidAmount.toFixed(2) },
          {
            label: "客单价（元）",
            value: (paidOrders.length ? paidAmount / paidOrders.length : 0).toFixed(2)
          }
        ],
        [
          { label: "退款订单数", value: String(refunds.length) },
          { label: "退款金额（元）", value: refundAmount.toFixed(2) },
          {
            label: "退款率",
            value: `${((refunds.length / Math.max(paidOrders.length, 1)) * 100).toFixed(2)}%`
          }
        ]
      ],
      funnel: [
        { label: "访客", width: "100%", color: "rgba(65, 209, 167, 0.98)" },
        {
          label: "下单",
          width: `${Math.max(24, Math.round((orderUserCount / Math.max(visitorCount, 1)) * 100))}%`,
          color: "rgba(65, 209, 167, 0.72)"
        },
        {
          label: "支付",
          width: `${Math.max(16, Math.round((paidUserCount / Math.max(visitorCount, 1)) * 100))}%`,
          color: "rgba(65, 209, 167, 0.42)"
        },
        {
          label: "退款",
          width: `${Math.max(12, Math.round((refunds.length / Math.max(visitorCount, 1)) * 100))}%`,
          color: "rgba(65, 209, 167, 0.2)"
        }
      ],
      lineChart: {
        title: "成交趋势",
        legend: "订单金额",
        labels,
        values: amountTrend,
        highlightIndex: amountTrend.findIndex((value) => value === Math.max(...amountTrend))
      },
      barChart: {
        title: "订单金额分布",
        legend: "订单数量",
        labels: amountBuckets.map((item) => item.label),
        values: bucketValues,
        highlightIndex: bucketValues.findIndex((value) => value === Math.max(...bucketValues))
      }
    };
  }

  async getAnalyticsProductAnalysis(
    page: number,
    pageSize: number,
    keyword?: string
  ) {
    const normalizedKeyword = keyword?.trim().toLowerCase();
    const services = await this.prismaService.serviceItem.findMany({
      include: {
        orders: true
      },
      orderBy: [{ salesVolume: "desc" }, { createdAt: "desc" }]
    });

    const rows = services
      .filter((item) => {
        if (!normalizedKeyword) {
          return true;
        }

        return [item.title, item.code].some((field) =>
          String(field).toLowerCase().includes(normalizedKeyword)
        );
      })
      .map((item) => {
        const payOrders = item.orders.filter((row) => row.status !== OrderStatus.CANCELLED);
        const payUsers = new Set(payOrders.map((row) => row.ownerId)).size;
        const browse = Math.max(item.salesVolume * 6, payOrders.length * 10, 30);
        const visitors = Math.max(Math.round(browse * 0.82), payUsers);
        const favorites = Math.round(visitors * 0.18);
        const shares = Math.round(visitors * 0.12);
        const amount = payOrders.reduce(
          (sum, row) => sum + (toNumber(row.actualAmount) ?? toNumber(row.payableAmount) ?? 0),
          0
        );

        return {
          info: {
            type: "image-text",
            image: item.coverUrl,
            primary: item.title,
            secondary: item.code
          },
          category: this.getServiceCategoryText(item.category),
          browse,
          visitors,
          favorites,
          shares,
          payUsers,
          payOrders: payOrders.length,
          amount: amount.toFixed(2),
          conversion: `${((payUsers / Math.max(visitors, 1)) * 100).toFixed(1)}%`
        };
      });

    const result = paginate(rows, page, pageSize);

    return {
      title: "产品分析",
      filters: [
        [
          { type: "select", label: "产品类别", placeholder: "请选择", span: 8 },
          {
            type: "number-range",
            label: "价格",
            startPlaceholder: "最低价格",
            endPlaceholder: "最高价格",
            span: 12
          }
        ],
        [
          {
            type: "date-range",
            label: "选择日期",
            startPlaceholder: "请选择日期",
            endPlaceholder: "请选择日期",
            span: 10
          },
          { type: "keyword", placeholder: "请输入关键字", span: 10 },
          { type: "actions", actions: ["search", "reset"], span: 4 }
        ]
      ],
      bulkActionLabel: "批量操作",
      tableMinWidth: 1520,
      columns: [
        { key: "info", label: "产品信息", width: "320px" },
        { key: "category", label: "产品\n类别", align: "center", width: "120px" },
        { key: "browse", label: "浏览\n量", align: "center", width: "108px" },
        { key: "visitors", label: "访客\n量", align: "center", width: "108px" },
        { key: "favorites", label: "收藏\n量", align: "center", width: "108px" },
        { key: "shares", label: "分享\n次数", align: "center", width: "108px" },
        { key: "payUsers", label: "支付\n人数", align: "center", width: "108px" },
        { key: "payOrders", label: "支付\n订单数", align: "center", width: "124px" },
        { key: "amount", label: "订单金额\n（元）", align: "center", width: "132px" },
        { key: "conversion", label: "访问支付\n转化率", align: "center", width: "132px" }
      ],
      rows: result.list,
      ...result
    };
  }

  async getAnalyticsServicePerformance(
    page: number,
    pageSize: number,
    keyword?: string
  ) {
    const normalizedKeyword = keyword?.trim().toLowerCase();
    const staffs = await this.prismaService.staff.findMany({
      include: {
        assignedWorkOrders: {
          include: {
            order: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    const rows = staffs
      .filter((item) => {
        if (!normalizedKeyword) {
          return true;
        }

        return [item.staffNo, item.name, item.phone].some((field) =>
          String(field).toLowerCase().includes(normalizedKeyword)
        );
      })
      .map((item) => {
        const workOrders = item.assignedWorkOrders;
        const orders = workOrders.map((row) => row.order);
        const customerCount = new Set(orders.map((row) => row.ownerId)).size;
        const orderTotal = orders.reduce(
          (sum, row) => sum + (toNumber(row.actualAmount) ?? toNumber(row.payableAmount) ?? 0),
          0
        );
        const commissionTotal = Number((orderTotal * 0.3).toFixed(2));
        const tipsTotal = Number((workOrders.length * 6).toFixed(2));

        return {
          staffNo: item.staffNo,
          staffInfo: {
            type: "avatar-name",
            avatar: item.avatarUrl,
            primary: item.name
          },
          joinTime: toDateTimeString(item.hireDate ?? item.createdAt),
          workOrders: workOrders.length,
          orders: orders.length,
          customers: customerCount,
          orderTotal: orderTotal.toFixed(2),
          commissionTotal: commissionTotal.toFixed(2),
          tipsTotal: tipsTotal.toFixed(2),
          incomeTotal: (commissionTotal + tipsTotal).toFixed(2)
        };
      });

    const result = paginate(rows, page, pageSize);

    return {
      title: "业绩统计",
      filters: [
        [
          {
            type: "date-range",
            label: "加入日期",
            startPlaceholder: "请选择日期",
            endPlaceholder: "请选择日期",
            span: 10
          },
          { type: "keyword", placeholder: "请输入关键字", span: 10 },
          { type: "actions", actions: ["search", "reset"], span: 4 }
        ]
      ],
      bulkActionLabel: "批量操作",
      columns: [
        { key: "staffNo", label: "服务人员编号", align: "center" },
        { key: "staffInfo", label: "服务人员信息" },
        { key: "joinTime", label: "加入时间", align: "center" },
        { key: "workOrders", label: "服务工单数量", align: "center" },
        { key: "orders", label: "订单数量", align: "center" },
        { key: "customers", label: "服务客户数量", align: "center" },
        { key: "orderTotal", label: "订单总金额（元）", align: "center" },
        { key: "commissionTotal", label: "佣金总金额（元）", align: "center" },
        { key: "tipsTotal", label: "打赏金额（元）", align: "center" },
        { key: "incomeTotal", label: "总收入（元）", align: "center" }
      ],
      rows: result.list,
      ...result
    };
  }

  async getAnalyticsServiceRepurchase(
    page: number,
    pageSize: number,
    keyword?: string
  ) {
    const normalizedKeyword = keyword?.trim().toLowerCase();
    const users = await this.prismaService.user.findMany({
      where: {
        type: {
          in: [UserType.ELDER, UserType.FAMILY]
        }
      },
      include: {
        ownedOrders: true
      }
    });

    const rows = users
      .map((item) => {
        const purchaseCount = item.ownedOrders.length;
        const amount = item.ownedOrders.reduce(
          (sum, row) => sum + (toNumber(row.actualAmount) ?? toNumber(row.payableAmount) ?? 0),
          0
        );

        return {
          profile: {
            type: "avatar-name",
            avatar: item.avatarUrl,
            primary: item.nickname ?? item.realName ?? item.phone
          },
          id: item.id,
          phone: item.phone,
          purchaseCount,
          productCount: purchaseCount,
          amount: amount.toFixed(2),
          unitPrice: (purchaseCount ? amount / purchaseCount : 0).toFixed(2)
        };
      })
      .filter((item) => {
        if (!normalizedKeyword) {
          return true;
        }

        return [item.id, item.phone, item.profile.primary].some((field) =>
          String(field).toLowerCase().includes(normalizedKeyword)
        );
      })
      .sort((left, right) => right.purchaseCount - left.purchaseCount);

    const result = paginate(rows, page, pageSize);

    return {
      title: "复购分析",
      filters: [
        [
          {
            type: "number-range",
            label: "购买次数",
            startPlaceholder: "最低次数",
            endPlaceholder: "最高次数",
            span: 12
          },
          { type: "keyword", placeholder: "请输入关键字", span: 8 },
          { type: "actions", actions: ["search", "reset"], span: 4 }
        ]
      ],
      bulkActionLabel: "批量操作",
      columns: [
        { key: "profile", label: "头像/昵称" },
        { key: "id", label: "ID", align: "center" },
        { key: "phone", label: "手机号码", align: "center" },
        { key: "purchaseCount", label: "购买次数", align: "center" },
        { key: "productCount", label: "购买商品数量", align: "center" },
        { key: "amount", label: "支付金额（元）", align: "center" },
        { key: "unitPrice", label: "次单价（元）", align: "center" }
      ],
      rows: result.list,
      pagination: {
        total: result.total,
        pageSize: result.pageSize,
        current: result.page,
        pages: this.buildSimplePages(result.total, result.pageSize)
      },
      ...result
    };
  }

  async getAnalyticsServiceReview(
    page: number,
    pageSize: number,
    keyword?: string
  ) {
    const normalizedKeyword = keyword?.trim().toLowerCase();
    const staffs = await this.prismaService.staff.findMany({
      include: {
        assignedWorkOrders: {
          include: {
            order: {
              include: {
                reviews: true
              }
            }
          }
        }
      }
    });

    const rows = staffs
      .filter((item) => {
        if (!normalizedKeyword) {
          return true;
        }

        return [item.staffNo, item.name, item.phone].some((field) =>
          String(field).toLowerCase().includes(normalizedKeyword)
        );
      })
      .map((item) => {
        const workOrders = item.assignedWorkOrders;
        const reviews = workOrders.flatMap((row) => row.order.reviews);
        const satisfied = reviews.filter((row) => row.score >= 4).length;
        const unsatisfied = reviews.filter((row) => row.score <= 2).length;
        const customers = new Set(workOrders.map((row) => row.order.ownerId)).size;

        return {
          staffNo: item.staffNo,
          staffInfo: {
            type: "avatar-name",
            avatar: item.avatarUrl,
            primary: item.name
          },
          serviceType: this.getStaffServiceTypeLabel(item.role),
          phone: item.phone,
          customers,
          workOrders: workOrders.length,
          reviews: reviews.length,
          satisfied,
          unsatisfied,
          satisfaction: `${((satisfied / Math.max(reviews.length, 1)) * 100).toFixed(1)}%`
        };
      });

    const result = paginate(rows, page, pageSize);

    return {
      title: "评价统计",
      filters: [
        [
          {
            type: "date-range",
            label: "加入日期",
            startPlaceholder: "请选择日期",
            endPlaceholder: "请选择日期",
            span: 10
          },
          { type: "keyword", placeholder: "请输入关键字", span: 10 },
          { type: "actions", actions: ["search", "reset"], span: 4 }
        ]
      ],
      bulkActionLabel: "批量操作",
      columns: [
        { key: "staffNo", label: "服务人员编号", align: "center" },
        { key: "staffInfo", label: "服务人员信息" },
        { key: "serviceType", label: "服务类型", align: "center" },
        { key: "phone", label: "手机号码", align: "center" },
        { key: "customers", label: "服务客户量", align: "center" },
        { key: "workOrders", label: "服务工单量", align: "center" },
        { key: "reviews", label: "参评量", align: "center" },
        { key: "satisfied", label: "满意数量", align: "center" },
        { key: "unsatisfied", label: "不满意数量", align: "center" },
        { key: "satisfaction", label: "满意率", align: "center" }
      ],
      rows: result.list,
      ...result
    };
  }

  async getAnalyticsServiceWorkOrder(
    page: number,
    pageSize: number,
    keyword?: string
  ) {
    const normalizedKeyword = keyword?.trim().toLowerCase();
    const workOrders = await this.prismaService.workOrder.findMany({
      include: {
        assignee: true,
        order: {
          include: {
            owner: true,
            reviews: true,
            service: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    const rows = workOrders
      .filter((item) => {
        if (!normalizedKeyword) {
          return true;
        }

        return [
          item.id,
          item.order.orderNo,
          item.assignee?.name,
          item.order.owner.realName,
          item.order.owner.phone
        ]
          .filter(Boolean)
          .some((field) => String(field).toLowerCase().includes(normalizedKeyword));
      })
      .map((item) => ({
        workOrderNo: item.id,
        staffInfo: {
          type: "avatar-name",
          avatar: item.assignee?.avatarUrl ?? null,
          primary: item.assignee?.name ?? item.assigneeName ?? "待分配",
          secondary: item.assignee ? `工号 ${item.assignee.staffNo}` : "未派单"
        },
        customerInfo: {
          type: "avatar-name",
          avatar: item.order.owner.avatarUrl,
          primary:
            item.order.owner.realName ?? item.order.owner.nickname ?? item.order.owner.phone,
          secondary: item.order.owner.phone
        },
        serviceType: this.getServiceCategoryText(item.order.service.category),
        scheduleTime: toDateTimeString(item.scheduleAt ?? item.order.bookingDate),
        duration: this.getServiceDurationText(item.order.service.durationMinutes),
        status: this.getWorkOrderStatusText(item.status),
        rating: (
          item.order.reviews.reduce((sum, row) => sum + row.score, 0) /
          Math.max(item.order.reviews.length, 1)
        ).toFixed(1)
      }));

    const result = paginate(rows, page, pageSize);

    return {
      title: "工单分析",
      filters: [
        [
          {
            type: "date-range",
            label: "预约日期",
            startPlaceholder: "请选择日期",
            endPlaceholder: "请选择日期",
            span: 10
          },
          { type: "keyword", placeholder: "请输入关键字", span: 10 },
          { type: "actions", actions: ["search", "reset"], span: 4 }
        ]
      ],
      bulkActionLabel: "批量操作",
      columns: [
        { key: "workOrderNo", label: "工单编号", align: "center" },
        { key: "staffInfo", label: "服务人员信息" },
        { key: "customerInfo", label: "客户信息" },
        { key: "serviceType", label: "服务类型", align: "center" },
        { key: "scheduleTime", label: "预约时间", align: "center" },
        { key: "duration", label: "服务时长", align: "center" },
        { key: "status", label: "工单状态", align: "center" },
        { key: "rating", label: "评分", align: "center" }
      ],
      rows: result.list,
      ...result
    };
  }

  async getAnalyticsUserAge() {
    const users = await this.prismaService.user.findMany({
      where: {
        type: {
          in: [UserType.ELDER, UserType.FAMILY]
        }
      }
    });
    const distribution = this.buildAgeDistribution(users);

    return {
      title: "用户年龄分析",
      filterLabel: "注册日期",
      rangeLabel: `${this.buildRecentDateLabels(7)[0]} ~ ${this.buildRecentDateLabels(7).slice(-1)[0]}`,
      sectionTitle: "用户年龄构成",
      chartTitle: "用户年龄构成",
      totalLabel: "用户总数",
      total: distribution.total,
      items: distribution.items,
      columns: [
        { key: "index", label: "序号", align: "center" },
        { key: "label", label: "年龄段", align: "center" },
        { key: "value", label: "人次", align: "center" },
        { key: "ratio", label: "比例", align: "center" }
      ],
      rows: distribution.items.map((item, index) => ({
        index: index + 1,
        label: item.label,
        value: item.value,
        ratio: `${((item.value / Math.max(distribution.total, 1)) * 100).toFixed(1)}%`
      }))
    };
  }

  async getAnalyticsUserGender() {
    const users = await this.prismaService.user.findMany({
      where: {
        type: {
          in: [UserType.ELDER, UserType.FAMILY]
        }
      }
    });
    const distribution = this.buildGenderDistribution(users);

    return {
      title: "用户性别分析",
      filterLabel: "注册日期",
      rangeLabel: `${this.buildRecentDateLabels(7)[0]} ~ ${this.buildRecentDateLabels(7).slice(-1)[0]}`,
      sectionTitle: "用户性别构成",
      chartTitle: "用户性别构成",
      totalLabel: "用户总数",
      total: distribution.total,
      items: distribution.items,
      columns: [
        { key: "index", label: "序号", align: "center" },
        { key: "label", label: "性别", align: "center" },
        { key: "value", label: "人次", align: "center" },
        { key: "ratio", label: "比例", align: "center" }
      ],
      rows: distribution.items.map((item, index) => ({
        index: index + 1,
        label: item.label,
        value: item.value,
        ratio: `${((item.value / Math.max(distribution.total, 1)) * 100).toFixed(1)}%`
      }))
    };
  }

  async getAnalyticsUserSocial(
    page: number,
    pageSize: number,
    keyword?: string
  ) {
    const normalizedKeyword = keyword?.trim().toLowerCase();
    const users = await this.prismaService.user.findMany({
      where: {
        type: {
          in: [UserType.ELDER, UserType.FAMILY]
        }
      },
      include: {
        communityPosts: true,
        following: true,
        followers: true
      }
    });

    const postIds = users.flatMap((item) => item.communityPosts.map((post) => post.id));
    const [comments, reactions] = await Promise.all([
      this.prismaService.communityComment.findMany({
        where: {
          postId: {
            in: postIds
          }
        }
      }),
      this.prismaService.communityPostReaction.findMany({
        where: {
          postId: {
            in: postIds
          }
        }
      })
    ]);

    const rows = users
      .filter((item) => {
        if (!normalizedKeyword) {
          return true;
        }

        return [item.id, item.realName, item.nickname, item.phone]
          .filter(Boolean)
          .some((field) => String(field).toLowerCase().includes(normalizedKeyword));
      })
      .map((item) => {
        const posts = item.communityPosts;
        const targetPostIds = posts.map((post) => post.id);
        const userComments = comments.filter((comment) => targetPostIds.includes(comment.postId));
        const userReactions = reactions.filter((reaction) => targetPostIds.includes(reaction.postId));
        const likes = userReactions.filter((reaction) => reaction.reactionType === "LIKE").length;
        const favorites = userReactions.filter((reaction) => reaction.reactionType === "FAVORITE").length;
        const shares = userReactions.filter((reaction) => reaction.reactionType === "SHARE").length;
        const reads = posts.reduce((sum, post) => sum + post.likesCount + post.commentsCount + post.favoritesCount, 0);

        return {
          profile: {
            type: "avatar-name",
            avatar: item.avatarUrl,
            primary: item.nickname ?? item.realName ?? item.phone
          },
          id: item.id,
          realName: item.realName ?? item.nickname ?? item.phone,
          phone: item.phone,
          posts: posts.length,
          reads,
          follow: item.following.length,
          fans: item.followers.length,
          likes,
          favorites,
          comments: userComments.length,
          shares
        };
      });

    const result = paginate(rows, page, pageSize);

    return {
      title: "用户社交统计",
      filters: [
        [
          {
            type: "date-range",
            label: "注册日期",
            startPlaceholder: "请选择日期",
            endPlaceholder: "请选择日期",
            span: 10
          },
          { type: "keyword", placeholder: "请输入关键字", span: 10 },
          { type: "actions", actions: ["search", "reset"], span: 4 }
        ]
      ],
      bulkActionLabel: "批量操作",
      columns: [
        { key: "profile", label: "头像/姓名" },
        { key: "id", label: "ID", align: "center" },
        { key: "realName", label: "真实姓名", align: "center" },
        { key: "phone", label: "手机号码", align: "center" },
        { key: "posts", label: "动态数量", align: "center" },
        { key: "reads", label: "阅读量", align: "center" },
        { key: "follow", label: "关注", align: "center" },
        { key: "fans", label: "粉丝", align: "center" },
        { key: "likes", label: "点赞", align: "center" },
        { key: "favorites", label: "收藏", align: "center" },
        { key: "comments", label: "评论", align: "center" },
        { key: "shares", label: "转发", align: "center" }
      ],
      rows: result.list,
      ...result
    };
  }

  async listElders(
    page: number,
    pageSize: number,
    keyword?: string,
    tag?: string
  ) {
    const normalizedKeyword = keyword?.trim().toLowerCase();
    const normalizedTag = tag?.trim();
    const elders = await this.prismaService.user.findMany({
      where: {
        type: UserType.ELDER,
        status: {
          not: UserStatus.DISABLED
        }
      },
      include: {
        archive: true
      },
      orderBy: { createdAt: "desc" }
    });

    const members = elders
      .map((item, index) => {
        const tags = ensureArray<string>(item.archive?.riskTags).map((label) => ({
          label,
          tone: this.getMemberTagTone(label, index)
        }));
        const palette = this.getAvatarPalette(index);

        return {
          id: item.id,
          elderId: item.id,
          nickname: item.nickname ?? item.realName ?? item.phone,
          realName: item.realName ?? item.nickname ?? item.phone,
          phone: item.phone,
          registeredAt: this.toDisplayDateTime(item.createdAt),
          createdAt: toDateTimeString(item.createdAt),
          tags,
          avatarAccent: palette.accent,
          avatarShadow: palette.shadow
        };
      })
      .filter((item) => {
        const matchesKeyword =
          !normalizedKeyword ||
          [item.id, item.nickname, item.realName, item.phone]
            .filter(Boolean)
            .some((field) => String(field).toLowerCase().includes(normalizedKeyword));
        const matchesTag =
          !normalizedTag || item.tags.some((entry) => entry.label === normalizedTag);

        return matchesKeyword && matchesTag;
      });

    const result = paginate(members, page, pageSize);

    return {
      title: "全部用户",
      summary: "用户标签筛选、注册时间过滤与用户档案卡片管理。",
      tagOptions: Array.from(
        new Set(
          elders.flatMap((item) => ensureArray<string>(item.archive?.riskTags))
        )
      ),
      members: result.list,
      rows: result.list,
      ...result
    };
  }

  async createElder(payload: {
    realName: string;
    phone: string;
    nickname?: string;
    gender?: Gender;
    birthday?: string;
    ethnicity?: string;
    education?: string;
    maritalStatus?: string;
    bloodType?: string;
    city?: string;
    address?: string;
    tags?: string[];
    emergencyContact?: Record<string, unknown>;
  }) {
    const existed = await this.prismaService.user.findUnique({
      where: { phone: payload.phone }
    });

    if (existed) {
      throw new ConflictException("Phone already exists");
    }

    const user = await this.prismaService.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          phone: payload.phone,
          passwordHash: await hashPassword("123456"),
          nickname: payload.nickname ?? payload.realName,
          type: UserType.ELDER,
          status: UserStatus.ACTIVE,
          realName: payload.realName,
          gender: payload.gender ?? Gender.UNKNOWN,
          birthday: payload.birthday ? new Date(payload.birthday) : null,
          city: payload.city ?? null
        }
      });

      await tx.healthArchive.create({
        data: {
          userId: created.id,
          baseProfile: toPrismaJson({
            ethnicity: payload.ethnicity ?? null,
            education: payload.education ?? null,
            maritalStatus: payload.maritalStatus ?? null,
            bloodType: payload.bloodType ?? null,
            address: payload.address ?? null
          }),
          medicalHistory: toPrismaJson({
            chronicDiseases: [],
            surgeries: [],
            allergies: []
          }),
          riskTags: toPrismaJson(payload.tags ?? []),
          longTermMemory: toPrismaJson({
            source: "后台创建",
            emergencyContact: payload.emergencyContact ?? null
          })
        }
      });

      return created;
    });

    return {
      created: true,
      elderId: user.id
    };
  }

  async deleteElder(elderId: string) {
    await this.assertElderExists(elderId);
    await this.prismaService.user.update({
      where: { id: elderId },
      data: {
        status: UserStatus.DISABLED
      }
    });

    return {
      deleted: true,
      elderId
    };
  }

  async batchUpdateElderTags(elderIds: string[], tags: string[]) {
    const archives = await this.prismaService.healthArchive.findMany({
      where: {
        userId: {
          in: elderIds
        }
      }
    });

    await Promise.all(
      archives.map((archive) => {
        const currentTags = ensureArray<string>(archive.riskTags);
        const nextTags = Array.from(new Set([...currentTags, ...tags]));

        return this.prismaService.healthArchive.update({
          where: { id: archive.id },
          data: {
            riskTags: toPrismaJson(nextTags)
          }
        });
      })
    );

    return {
      updated: archives.length
    };
  }

  async getElderOverview(elderId: string) {
    const context = await this.getElderContext(elderId);
    const { user, archive, devices, orders, reports, workOrders, coupons, points } = context;
    const longTermMemory = ensureRecord(archive.longTermMemory);
    const emergencyContact = ensureRecord(longTermMemory.emergencyContact);

    return {
      title: "用户详情",
      member: {
        id: user.id,
        nickname: user.nickname ?? user.realName ?? user.phone,
        realName: user.realName ?? user.nickname ?? user.phone,
        phone: user.phone,
        avatar: user.avatarUrl,
        city: user.city,
        gender: user.gender,
        birthday: toDateString(user.birthday),
        age: getAge(user.birthday),
        registeredAt: this.toDisplayDateTime(user.createdAt)
      },
      archiveNo: `HA-${user.id.slice(-8).toUpperCase()}`,
      age: getAge(user.birthday),
      gender: this.getGenderText(user.gender),
      birthday: toDateString(user.birthday),
      bloodType: String(ensureRecord(archive.baseProfile).bloodType ?? "-"),
      maritalStatus: String(ensureRecord(archive.baseProfile).maritalStatus ?? "-"),
      education: String(ensureRecord(archive.baseProfile).education ?? "-"),
      residenceType: String(ensureRecord(longTermMemory).residenceType ?? "居家养老"),
      address: String(ensureRecord(archive.baseProfile).address ?? user.city ?? "-"),
      source: String(longTermMemory.source ?? "后台创建"),
      advisor: String(longTermMemory.advisor ?? "健康顾问"),
      carePlan: String(longTermMemory.carePlan ?? "长期跟踪管理"),
      note: String(longTermMemory.note ?? ""),
      emergencyContact: {
        name: String(emergencyContact.name ?? "-"),
        relation: String(emergencyContact.relation ?? "-"),
        phone: String(emergencyContact.phone ?? "-")
      },
      healthTags: ensureArray<string>(archive.riskTags),
      tabs: [
        { key: "profile", label: "档案信息" },
        { key: "health", label: "健康信息" },
        { key: "medication", label: "用药信息" },
        { key: "metrics", label: "健康数据" },
        { key: "device", label: "设备信息" },
        { key: "report", label: "报告信息" },
        { key: "order", label: "订单信息" },
        { key: "asset", label: "资产信息" },
        { key: "content", label: "发布内容" },
        { key: "service", label: "服务记录" }
      ],
      summaryMetrics: [
        {
          label: "累计订单",
          value: String(orders.length),
          helper: "关联订单总数",
          tone: "brand"
        },
        {
          label: "已归档报告",
          value: String(reports.length),
          helper: "全部体检/服务报告",
          tone: "accent"
        },
        {
          label: "绑定设备",
          value: String(devices.length),
          helper: "活跃健康设备数",
          tone: "neutral"
        },
        {
          label: "服务工单",
          value: String(workOrders.length),
          helper: "履约工单累计",
          tone: "danger"
        }
      ],
      assetMetrics: [
        {
          label: "优惠券",
          value: String(coupons.length),
          helper: "账户下优惠券张数",
          tone: "brand"
        },
        {
          label: "积分余额",
          value: String(points[0]?.balanceAfter ?? 0),
          helper: "最近一次积分余额",
          tone: "accent"
        }
      ],
      operationTimeline: [
        {
          time: this.toDisplayDateTime(user.createdAt),
          title: "创建长者档案",
          description: "后台已建立基础档案",
          operator: "系统",
          tone: "brand"
        }
      ],
      serviceTimeline: workOrders.slice(0, 5).map((item) => ({
        time: this.toDisplayDateTime(item.createdAt),
        title: `工单${this.getWorkOrderStatusText(item.status)}`,
        description: item.dispatchNote ?? item.order.service.title,
        operator: item.assigneeName ?? "平台调度",
        tone: item.status === WorkOrderStatus.COMPLETED ? "accent" : "neutral"
      }))
    };
  }

  async getElderProfileTab(elderId: string) {
    const { user, archive } = await this.getElderContext(elderId);
    const profile = ensureRecord(archive.baseProfile);
    const memory = ensureRecord(archive.longTermMemory);
    const emergencyContact = ensureRecord(memory.emergencyContact);

    return {
      title: "档案信息",
      sections: [
        {
          title: "基础信息",
          description: "长者基础身份、居住和联系方式。",
          fields: [
            { label: "昵称", value: user.nickname ?? user.realName ?? user.phone },
            { label: "姓名", value: user.realName ?? "-" },
            { label: "手机号", value: user.phone },
            { label: "性别", value: this.getGenderText(user.gender) },
            { label: "出生日期", value: toDateString(user.birthday) ?? "-" },
            { label: "民族", value: String(profile.ethnicity ?? "-") },
            { label: "学历", value: String(profile.education ?? "-") },
            { label: "婚姻状态", value: String(profile.maritalStatus ?? "-") },
            { label: "血型", value: String(profile.bloodType ?? "-") },
            { label: "所在城市", value: user.city ?? "-" },
            { label: "居住地址", value: String(profile.address ?? "-"), wide: true }
          ]
        },
        {
          title: "护理信息",
          description: "来源、顾问、计划和紧急联系人。",
          fields: [
            { label: "来源", value: String(memory.source ?? "后台创建") },
            { label: "顾问", value: String(memory.advisor ?? "健康顾问") },
            { label: "照护方案", value: String(memory.carePlan ?? "长期跟踪管理") },
            { label: "紧急联系人", value: String(emergencyContact.name ?? "-") },
            { label: "关系", value: String(emergencyContact.relation ?? "-") },
            { label: "联系电话", value: String(emergencyContact.phone ?? "-") },
            { label: "备注", value: String(memory.note ?? "暂无"), wide: true }
          ]
        }
      ]
    };
  }

  async getElderHealthTab(elderId: string) {
    const { archive, alerts, metrics } = await this.getElderContext(elderId);
    const medicalHistory = ensureRecord(archive.medicalHistory);
    const longTermMemory = ensureRecord(archive.longTermMemory);

    return {
      title: "健康信息",
      summaryMetrics: [
        {
          label: "风险标签",
          value: String(ensureArray<string>(archive.riskTags).length),
          helper: "已标记慢病/关注项",
          tone: "brand"
        },
        {
          label: "异常告警",
          value: String(alerts.filter((item) => item.status === "OPEN").length),
          helper: "当前待处理告警",
          tone: "danger"
        },
        {
          label: "最近测量",
          value: this.toDisplayDateTime(metrics[0]?.measuredAt) ?? "-",
          helper: "最近一次健康数据上报",
          tone: "accent"
        }
      ],
      sections: [
        {
          title: "档案摘要",
          description: "基础病史、照护记忆与重点关注信息。",
          fields: [
            {
              label: "慢病史",
              value: ensureArray<string>(medicalHistory.chronicDiseases).join("、") || "暂无"
            },
            {
              label: "过敏史",
              value: ensureArray<string>(medicalHistory.allergies).join("、") || "暂无"
            },
            {
              label: "手术史",
              value: ensureArray<string>(medicalHistory.surgeries).join("、") || "暂无"
            },
            {
              label: "长期记忆",
              value: String(longTermMemory.summary ?? longTermMemory.note ?? "暂无"),
              wide: true
            }
          ]
        }
      ],
      healthMetricCards: this.buildHealthMetricCards(metrics),
      healthMetricLogs: metrics.slice(0, 8).map((item) => ({
        time: this.toDisplayDateTime(item.measuredAt),
        item: this.getMetricTypeText(item.metricType),
        value: this.getMetricDisplayValue(item.metricType, item.value, item.payload, item.unit),
        result: item.abnormal ? "异常" : "正常",
        source: item.source,
        tone: item.abnormal ? "danger" : "accent"
      }))
    };
  }

  async getElderMedicationTab(elderId: string) {
    const { medications } = await this.getElderContext(elderId);

    return {
      title: "用药信息",
      medications: medications.map((item) => ({
        name: item.name,
        dosage: item.dosage,
        schedule: item.frequency,
        adherence: item.active ? "进行中" : "已停用",
        note: item.indication ?? item.mealTiming ?? "按计划服用",
        tone: item.active ? "brand" : "neutral"
      })),
      medicationTips: [
        "优先关注慢病长期药物的漏服风险。",
        "如存在同类药物叠加，请由医生复核。",
        "药品变更后建议同步更新家属提醒。"
      ]
    };
  }

  async getElderMetricsTab(elderId: string) {
    const { metrics } = await this.getElderContext(elderId);

    return {
      title: "健康数据",
      modules: this.buildHealthMetricModules(metrics)
    };
  }

  async getElderDevicesTab(elderId: string) {
    const { devices } = await this.getElderContext(elderId);

    return {
      title: "设备信息",
      devices: devices.map((item) => ({
        name: item.nickname ?? this.getDeviceTypeText(item.type),
        model: item.type,
        serial: item.serialNo,
        location: item.locationLabel ?? "-",
        lastSync: this.toDisplayDateTime(item.lastSyncedAt) ?? "-",
        status: item.status,
        tone: item.status === "ONLINE" ? "accent" : "neutral"
      }))
    };
  }

  async getElderReportsTab(elderId: string) {
    const { reports } = await this.getElderContext(elderId);

    return {
      title: "报告信息",
      rows: reports.map((item) => ({
        id: item.id,
        uploadedAt: this.toDisplayDateTime(item.createdAt),
        name: item.title,
        type: this.getReportTypeText(item.type),
        source: item.author ? "后台上传" : item.orderId ? "订单关联" : "用户上传",
        uploader: item.author?.name ?? "系统",
        orderId: item.order?.orderNo ?? "-",
        reportDate: toDateString(item.publishedAt ?? item.createdAt) ?? "-"
      }))
    };
  }

  async getElderOrdersTab(elderId: string) {
    const { orders } = await this.getElderContext(elderId);

    return {
      title: "订单信息",
      rows: orders.map((item) => ({
        id: item.id,
        orderTime: this.toDisplayDateTime(item.createdAt),
        orderNo: item.orderNo,
        serviceType: this.getServiceCategoryText(item.service.category),
        image: item.service.coverUrl,
        productName: item.service.title,
        productSummary: item.service.summary ?? "",
        price: (toNumber(item.originalAmount) ?? 0).toFixed(2),
        payAmount: (toNumber(item.actualAmount) ?? toNumber(item.payableAmount) ?? 0).toFixed(2),
        buyerName: item.owner.realName ?? item.owner.nickname ?? item.owner.phone,
        buyerPhone: item.owner.phone,
        orderStatus: this.getOrderStatusText(item.status),
        paymentMethod: item.payments[0] ? this.getPaymentChannelText(item.payments[0].channel) : "-",
        tone: item.status === OrderStatus.COMPLETED ? "accent" : "brand"
      }))
    };
  }

  async getElderAssetsTab(elderId: string) {
    const { coupons, points } = await this.getElderContext(elderId);

    return {
      title: "资产信息",
      assetMetrics: [
        {
          label: "优惠券",
          value: String(coupons.length),
          helper: "累计领券数",
          tone: "brand"
        },
        {
          label: "积分记录",
          value: String(points.length),
          helper: "累计积分流水数",
          tone: "accent"
        }
      ],
      coupons: coupons.map((item) => ({
        id: item.id,
        name: item.couponTemplate.title,
        status: item.status,
        amount: this.getCouponAmountText(item.couponTemplate.discountType, item.couponTemplate.discountValue),
        condition: item.couponTemplate.minSpend
          ? `满${toNumber(item.couponTemplate.minSpend) ?? 0}可用`
          : "无门槛",
        scope: ensureArray<string>(item.couponTemplate.applicableScope).join("、") || "全场可用",
        receivedAt: this.toDisplayDateTime(item.claimedAt),
        expiresAt: this.toDisplayDateTime(item.expiresAt) ?? "-",
        tone: item.status === "UNUSED" ? "brand" : "neutral"
      })),
      points: points.map((item) => ({
        id: item.id,
        type: item.type === "INCOME" ? "积分收入" : "积分支出",
        amount: `${item.type === "INCOME" ? "+" : "-"}${Math.abs(item.delta)}`,
        reason: item.title,
        remark: item.relatedOrderNo ?? "-",
        operator: "系统",
        time: this.toDisplayDateTime(item.createdAt),
        tone: item.type === "INCOME" ? "accent" : "danger"
      })),
      growthRecords: points.map((item) => ({
        id: item.id,
        type: item.type === "INCOME" ? "成长值增加" : "成长值扣减",
        amount: `${item.type === "INCOME" ? "+" : "-"}${Math.abs(item.delta)}`,
        reason: item.title,
        remark: item.relatedOrderNo ?? "-",
        operator: "系统",
        time: this.toDisplayDateTime(item.createdAt),
        tone: item.type === "INCOME" ? "brand" : "neutral"
      })),
      records: [
        ...coupons.slice(0, 5).map((item) => ({
          title: item.couponTemplate.title,
          detail: item.status,
          status: "优惠券",
          tone: "brand",
          time: this.toDisplayDateTime(item.claimedAt)
        })),
        ...points.slice(0, 5).map((item) => ({
          title: item.title,
          detail: `${item.delta > 0 ? "+" : ""}${item.delta}`,
          status: item.type === "INCOME" ? "积分收入" : "积分支出",
          tone: item.type === "INCOME" ? "accent" : "danger",
          time: this.toDisplayDateTime(item.createdAt)
        }))
      ]
    };
  }

  async getElderContentsTab(elderId: string) {
    const posts = await this.prismaService.communityPost.findMany({
      where: { authorId: elderId },
      orderBy: { createdAt: "desc" },
      take: 20
    });

    return {
      title: "发布内容",
      rows: posts.map((item) => ({
        id: item.id,
        content: item.content,
        topic: item.tagLabel ?? "生活圈",
        image: ensureArray<string>(item.images)[0] ?? null,
        likes: item.likesCount,
        favorites: item.favoritesCount,
        shares: item.sharesCount,
        comments: item.commentsCount,
        publishedAt: this.toDisplayDateTime(item.createdAt),
        visible: item.status === "PUBLISHED"
      }))
    };
  }

  async getElderServiceRecordsTab(elderId: string) {
    const { workOrders } = await this.getElderContext(elderId);

    return {
      title: "服务记录",
      rows: workOrders.map((item) => ({
        id: item.id,
        orderNo: item.order.orderNo,
        serviceType: this.getServiceCategoryText(item.order.service.category),
        image: item.order.service.coverUrl,
        orderName: item.order.service.title,
        productSummary: item.order.service.summary ?? "",
        serviceItem: item.dispatchNote ?? item.order.service.title,
        price: (toNumber(item.order.originalAmount) ?? 0).toFixed(2),
        couponAmount: (toNumber(item.order.discountAmount) ?? 0).toFixed(2),
        payAmount: (toNumber(item.order.actualAmount) ?? toNumber(item.order.payableAmount) ?? 0).toFixed(2),
        status: this.getWorkOrderStatusText(item.status),
        tone: item.status === WorkOrderStatus.COMPLETED ? "accent" : "neutral",
        staff: item.assignee?.name ?? item.assigneeName ?? "待分配",
        serviceTime: this.toDisplayDateTime(item.scheduleAt) ?? "-",
        createdAt: this.toDisplayDateTime(item.createdAt),
        paidAt: this.toDisplayDateTime(item.order.paidAt) ?? "-",
        serviceCode: `SV-${item.order.orderNo.slice(-6)}`,
        serviceCodeHint: "现场核销码",
        remark: item.dispatchNote ?? ""
      }))
    };
  }

  async listProducts(
    page: number,
    pageSize: number,
    category?: ServiceCategory,
    status?: string,
    keyword?: string
  ) {
    const normalizedKeyword = keyword?.trim().toLowerCase();
    const services = await this.prismaService.serviceItem.findMany({
      include: {
        institution: true
      },
      orderBy: { updatedAt: "desc" }
    });

    const filtered = services.filter((item) => {
      const matchesCategory = !category || item.category === category;
      const itemStatus = this.getProductStatusText(item.enabled, item.serviceContent);
      const matchesStatus = !status || status === "全部状态" || itemStatus === status;
      const matchesKeyword =
        !normalizedKeyword ||
        [item.title, item.code, item.summary]
          .filter(Boolean)
          .some((field) => String(field).toLowerCase().includes(normalizedKeyword));

      return matchesCategory && matchesStatus && matchesKeyword;
    });

    const rows = filtered.map((item) => ({
      id: item.id,
      title: item.title,
      code: item.code,
      category: this.getProductCategoryLabel(item.category),
      tags: ensureArray<string>(item.tags),
      price: (toNumber(item.price) ?? 0).toFixed(2),
      status: this.getProductStatusText(item.enabled, item.serviceContent),
      image: item.coverUrl,
      updater: String(ensureRecord(item.serviceContent).updatedBy ?? "系统"),
      updatedAt: this.toDisplayDateTime(item.updatedAt) ?? ""
    }));
    const result = paginate(rows, page, pageSize);
    const groupedRows = this.groupProductRowsByLine(rows);

    return {
      title: "商品管理",
      lineOptions: [
        { key: "housekeeping", label: "家政护理" },
        { key: "exam", label: "上门体检" },
        { key: "rehab", label: "康复理疗" }
      ],
      statusOptions: PRODUCT_STATUS_OPTIONS,
      lineConfigs: groupedRows,
      rows: result.list,
      ...result
    };
  }

  async getProductEditorOptions() {
    return this.buildProductEditorResponse(null);
  }

  async getProductDetail(productId: string) {
    const service = await this.prismaService.serviceItem.findUnique({
      where: { id: productId }
    });

    if (!service) {
      throw new NotFoundException("Product not found");
    }

    return this.buildProductEditorResponse(service);
  }

  async createProduct(payload: {
    title: string;
    category: ServiceCategory;
    code?: string;
    summary?: string;
    price: number;
    marketPrice?: number;
    tags?: string[];
    coverUrl?: string;
    institutionId?: string;
    serviceContent?: Record<string, unknown>;
    enabled?: boolean;
  }) {
    const created = await this.prismaService.serviceItem.create({
      data: {
        code: payload.code?.trim() || this.generateProductCode(payload.category),
        category: payload.category,
        title: payload.title,
        summary: payload.summary ?? null,
        price: payload.price,
        marketPrice: payload.marketPrice ?? null,
        coverUrl: payload.coverUrl ?? null,
        institutionId: payload.institutionId ?? null,
        tags: toPrismaJson(payload.tags ?? []),
        serviceContent: toPrismaJson({
          ...(payload.serviceContent ?? {}),
          updatedBy: "系统"
        }),
        enabled: payload.enabled ?? true
      }
    });

    return {
      created: true,
      productId: created.id
    };
  }

  async updateProduct(
    productId: string,
    payload: {
      title: string;
      category: ServiceCategory;
      code?: string;
      summary?: string;
      price: number;
      marketPrice?: number;
      tags?: string[];
      coverUrl?: string;
      institutionId?: string;
      serviceContent?: Record<string, unknown>;
      enabled?: boolean;
    }
  ) {
    const current = await this.prismaService.serviceItem.findUnique({
      where: { id: productId }
    });

    if (!current) {
      throw new NotFoundException("Product not found");
    }

    await this.prismaService.serviceItem.update({
      where: { id: productId },
      data: {
        code: payload.code?.trim() || current.code,
        category: payload.category,
        title: payload.title,
        summary: payload.summary ?? null,
        price: payload.price,
        marketPrice: payload.marketPrice ?? null,
        coverUrl: payload.coverUrl ?? null,
        institutionId: payload.institutionId ?? null,
        tags: toPrismaJson(payload.tags ?? []),
        serviceContent: toPrismaJson({
          ...(payload.serviceContent ?? {}),
          updatedBy: "系统"
        }),
        enabled: payload.enabled ?? current.enabled
      }
    });

    return {
      updated: true,
      productId
    };
  }

  async updateProductStatus(productId: string, enabled: boolean) {
    await this.assertProductExists(productId);
    await this.prismaService.serviceItem.update({
      where: { id: productId },
      data: {
        enabled
      }
    });

    return {
      productId,
      enabled
    };
  }

  async deleteProduct(productId: string) {
    await this.assertProductExists(productId);
    await this.prismaService.serviceItem.update({
      where: { id: productId },
      data: {
        enabled: false,
        serviceContent: toPrismaJson({
          ...ensureRecord(
            (
              await this.prismaService.serviceItem.findUnique({
                where: { id: productId },
                select: { serviceContent: true }
              })
            )?.serviceContent
          ),
          deletedAt: new Date().toISOString()
        })
      }
    });

    return {
      deleted: true,
      productId
    };
  }

  async listStaffs(
    page: number,
    pageSize: number,
    serviceType?: string,
    tag?: string
  ) {
    const [staffs, applications] = await Promise.all([
      this.prismaService.staff.findMany({
        include: {
          institution: true
        },
        orderBy: { createdAt: "desc" }
      }),
      this.prismaService.staffApplication.findMany()
    ]);

    const applicationMap = new Map(applications.map((item) => [item.staffId, item]));
    const rows = staffs
      .map((item) => {
        const application = applicationMap.get(item.id);
        const attachments = ensureRecord(application?.attachments);
        return {
          id: item.id,
          avatar: item.avatarUrl,
          name: item.name,
          phone: item.phone,
          staffId: item.staffNo,
          serviceType: this.getStaffServiceTypeLabel(item.role),
          tag: String(attachments.tag ?? ensureArray<string>(item.expertise)[0] ?? "待补充"),
          district: `${item.institution.city}${item.institution.district ? ` ${item.institution.district}` : ""}`.trim(),
          joinMethod: application?.channel ?? "平台录入",
          joinTime: this.toDisplayDateTime(item.hireDate ?? item.createdAt),
          enabled: item.employmentStatus !== StaffStatus.DISABLED
        };
      })
      .filter((item) => {
        const matchesServiceType =
          !serviceType || serviceType === "请选择" || item.serviceType === serviceType;
        const matchesTag = !tag || tag === "请选择" || item.tag === tag;
        return matchesServiceType && matchesTag;
      });

    const result = paginate(rows, page, pageSize);

    return {
      title: "全部服务人员",
      serviceTypeOptions: [
        "请选择",
        "家政护工",
        "康复理疗",
        "上门体检",
        "客服接待",
        "平台运营"
      ],
      tagOptions: ["请选择", ...Array.from(new Set(rows.map((item) => item.tag)))],
      rows: result.list,
      ...result
    };
  }

  async updateStaffStatus(staffId: string, enabled: boolean) {
    const staff = await this.prismaService.staff.findUnique({
      where: { id: staffId }
    });

    if (!staff) {
      throw new NotFoundException("Staff not found");
    }

    await this.prismaService.staff.update({
      where: { id: staffId },
      data: {
        employmentStatus: enabled ? StaffStatus.ACTIVE : StaffStatus.DISABLED
      }
    });

    return {
      staffId,
      enabled
    };
  }

  async listStaffApplications(
    page: number,
    pageSize: number,
    status?: StaffApplicationStatus,
    serviceType?: string
  ) {
    const [applications, staffs] = await Promise.all([
      this.prismaService.staffApplication.findMany({
        where: {
          status: status ?? undefined
        },
        orderBy: { createdAt: "desc" }
      }),
      this.prismaService.staff.findMany()
    ]);

    const reviewerIds = Array.from(
      new Set(
        applications
          .map((item) => item.reviewerUserId)
          .filter((item): item is string => Boolean(item))
      )
    );
    const reviewers =
      reviewerIds.length > 0
        ? await this.prismaService.user.findMany({
            where: {
              id: {
                in: reviewerIds
              }
            },
            select: {
              id: true,
              realName: true,
              nickname: true,
              phone: true
            }
          })
        : [];

    const staffMap = new Map(staffs.map((item) => [item.id, item]));
    const reviewerMap = new Map(reviewers.map((item) => [item.id, item]));
    const rows = applications
      .map((item) => {
        const staff = staffMap.get(item.staffId);
        if (!staff) {
          return null;
        }

        return {
          id: item.id,
          name: staff.name,
          avatar: staff.avatarUrl,
          staffId: staff.staffNo,
          serviceType: this.getStaffServiceTypeLabel(staff.role),
          status: this.getStaffApplicationStatusText(item.status),
          phone: staff.phone,
          reviewer: this.getStaffApplicationReviewerText(
            item.reviewerUserId,
            reviewerMap
          ),
          applyTime: this.toDisplayDateTime(item.createdAt),
          reviewTime: item.reviewedAt ? this.toDisplayDateTime(item.reviewedAt) : "-"
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
      .filter((item) => {
        return !serviceType || serviceType === "全部类型" || item.serviceType === serviceType;
      });

    const result = paginate(rows, page, pageSize);

    return {
      title: "审核管理",
      statuses: ["全部状态", "待审核", "已通过", "已驳回"],
      serviceTypes: [
        "全部类型",
        "家政护工",
        "康复理疗",
        "上门体检",
        "客服接待",
        "平台运营"
      ],
      rows: result.list,
      ...result
    };
  }

  async getStaffApplicationDetail(applicationId: string) {
    const application = await this.prismaService.staffApplication.findUnique({
      where: { id: applicationId }
    });

    if (!application) {
      throw new NotFoundException("Staff application not found");
    }

    const staff = await this.prismaService.staff.findUnique({
      where: { id: application.staffId },
      include: {
        user: true
      }
    });

    if (!staff) {
      throw new NotFoundException("Staff not found");
    }

    const attachments = ensureRecord(application.attachments);
    return {
      title: "审核详情",
      status: this.getStaffApplicationStatusText(application.status),
      basicInfo: {
        staffId: staff.staffNo,
        name: staff.name,
        avatar: staff.avatarUrl,
        phone: staff.phone,
        serviceType: this.getStaffServiceTypeLabel(staff.role),
        tag: String(attachments.tag ?? ensureArray<string>(staff.expertise)[0] ?? "-"),
        bio: application.note ?? "暂无简介"
      },
      realInfo: {
        idCardNo: String(attachments.idCardNo ?? staff.user?.idCard ?? "-"),
        idCardFront: String(attachments.idCardFront ?? ""),
        idCardBack: String(attachments.idCardBack ?? ""),
        certificate: String(attachments.certificate ?? ""),
        bankCardNo: String(attachments.bankCardNo ?? "-"),
        bankName: String(attachments.bankName ?? "-")
      },
      extraInfo: {
        rewardEnabled: application.rewardEnabled ? "开启" : "关闭",
        loginPassword: String(attachments.displayPassword ?? "******"),
        channel: application.channel ?? "平台录入",
        registerAt: this.toDisplayDateTime(staff.createdAt),
        applyAt: this.toDisplayDateTime(application.createdAt),
        lastLoginAt: this.toDisplayDateTime(staff.user?.lastLoginAt) ?? "-"
      }
    };
  }

  async reviewStaffApplication(
    applicationId: string,
    status: StaffApplicationStatus,
    remark: string | undefined,
    reviewer: AuthenticatedUser
  ) {
    await this.prismaService.staffApplication.update({
      where: { id: applicationId },
      data: {
        status,
        reviewRemark: remark ?? null,
        reviewerUserId: reviewer.id,
        reviewedAt: new Date()
      }
    });

    return {
      applicationId,
      status
    };
  }

  async listInstitutions(
    page: number,
    pageSize: number,
    region?: string,
    status?: string
  ) {
    const institutions = await this.prismaService.institution.findMany({
      where: {
        status: {
          not: InstitutionStatus.CLOSED
        }
      },
      orderBy: { updatedAt: "desc" }
    });

    const rows = institutions
      .map((item) => {
        const scope = ensureRecord(item.serviceScope);
        const tags = ensureArray<string>(item.tags);
        const published = typeof scope.published === "boolean" ? Boolean(scope.published) : item.status === InstitutionStatus.ACTIVE;

        return {
          id: item.id,
          institutionNo: item.code,
          name: item.name,
          region: item.district ?? item.city,
          address: item.address,
          contactName: String(scope.contactName ?? item.managerUserId ?? "待补充"),
          contactPhone: String(scope.contactPhone ?? item.phone ?? "待补充"),
          serviceTags: tags,
          shareCount: Number(scope.shareCount ?? 0),
          favoriteCount: Number(scope.favoriteCount ?? 0),
          coverName: String(scope.coverName ?? ""),
          businessHours: String(scope.businessHours ?? ""),
          publishMode: String(scope.publishMode ?? (published ? "immediate" : "scheduled")),
          publishDate: String(scope.publishDate ?? ""),
          publishTime: String(scope.publishTime ?? "12:00"),
          updatedBy: String(scope.updatedBy ?? "系统"),
          updatedAt: this.toDisplayDateTime(item.updatedAt),
          note: String(scope.note ?? item.intro ?? ""),
          published
        };
      })
      .filter((item) => {
        const matchesRegion = !region || item.region === region;
        const matchesStatus =
          !status ||
          status === "全部" ||
          (status === "已发布" ? item.published : !item.published);
        return matchesRegion && matchesStatus;
      });

    const result = paginate(rows, page, pageSize);

    return {
      title: "机构列表",
      summary: "管理机构展示信息、特色服务和发布状态。",
      statusOptions: ["全部", "已发布", "未发布"],
      regionOptions: Array.from(new Set(rows.map((item) => item.region))),
      rows: result.list,
      ...result
    };
  }

  async getInstitutionDetail(institutionId: string) {
    const institution = await this.prismaService.institution.findUnique({
      where: { id: institutionId }
    });

    if (!institution) {
      throw new NotFoundException("Institution not found");
    }

    const scope = ensureRecord(institution.serviceScope);

    return {
      institutionId: institution.id,
      institutionNo: institution.code,
      name: institution.name,
      type: institution.type,
      city: institution.city,
      district: institution.district,
      address: institution.address,
      contactName: String(scope.contactName ?? ""),
      contactPhone: String(scope.contactPhone ?? institution.phone ?? ""),
      serviceTags: ensureArray<string>(institution.tags),
      note: String(scope.note ?? institution.intro ?? ""),
      coverName: String(scope.coverName ?? ""),
      businessHours: String(scope.businessHours ?? ""),
      shareCount: Number(scope.shareCount ?? 0),
      favoriteCount: Number(scope.favoriteCount ?? 0),
      publishMode: String(scope.publishMode ?? "immediate"),
      publishDate: String(scope.publishDate ?? ""),
      publishTime: String(scope.publishTime ?? "12:00"),
      published:
        typeof scope.published === "boolean"
          ? Boolean(scope.published)
          : institution.status === InstitutionStatus.ACTIVE
    };
  }

  async createInstitution(payload: {
    name: string;
    code?: string;
    type?: InstitutionType;
    city: string;
    district?: string;
    address: string;
    contactName?: string;
    contactPhone?: string;
    serviceTags?: string[];
    note?: string;
    coverName?: string;
    businessHours?: string;
    shareCount?: number;
    favoriteCount?: number;
    publishMode?: string;
    publishDate?: string;
    publishTime?: string;
  }) {
    const institution = await this.prismaService.institution.create({
      data: {
        code: payload.code?.trim() || this.generateInstitutionCode(),
        name: payload.name,
        type: payload.type ?? InstitutionType.SERVICE_PROVIDER,
        city: payload.city,
        district: payload.district ?? null,
        address: payload.address,
        phone: payload.contactPhone ?? null,
        tags: toPrismaJson(payload.serviceTags ?? []),
        serviceScope: toPrismaJson({
          contactName: payload.contactName ?? "",
          contactPhone: payload.contactPhone ?? "",
          note: payload.note ?? "",
          coverName: payload.coverName ?? "",
          businessHours: payload.businessHours ?? "",
          published: false,
          shareCount: payload.shareCount ?? 0,
          favoriteCount: payload.favoriteCount ?? 0,
          publishMode: payload.publishMode ?? "immediate",
          publishDate: payload.publishDate ?? "",
          publishTime: payload.publishTime ?? "12:00",
          updatedBy: "系统"
        })
      }
    });

    return {
      created: true,
      institutionId: institution.id
    };
  }

  async updateInstitution(
    institutionId: string,
    payload: {
      name: string;
      code?: string;
      type?: InstitutionType;
      city: string;
      district?: string;
      address: string;
      contactName?: string;
      contactPhone?: string;
      serviceTags?: string[];
      note?: string;
      coverName?: string;
      businessHours?: string;
      shareCount?: number;
      favoriteCount?: number;
      publishMode?: string;
      publishDate?: string;
      publishTime?: string;
    }
  ) {
    const institution = await this.prismaService.institution.findUnique({
      where: { id: institutionId }
    });

    if (!institution) {
      throw new NotFoundException("Institution not found");
    }

    const scope = ensureRecord(institution.serviceScope);

    await this.prismaService.institution.update({
      where: { id: institutionId },
      data: {
        code: payload.code?.trim() || institution.code,
        name: payload.name,
        type: payload.type ?? institution.type,
        city: payload.city,
        district: payload.district ?? null,
        address: payload.address,
        phone: payload.contactPhone ?? null,
        tags: toPrismaJson(payload.serviceTags ?? []),
        serviceScope: toPrismaJson({
          ...scope,
          contactName: payload.contactName ?? "",
          contactPhone: payload.contactPhone ?? "",
          note: payload.note ?? "",
          coverName: payload.coverName ?? "",
          businessHours: payload.businessHours ?? "",
          shareCount: payload.shareCount ?? Number(scope.shareCount ?? 0),
          favoriteCount: payload.favoriteCount ?? Number(scope.favoriteCount ?? 0),
          publishMode: payload.publishMode ?? String(scope.publishMode ?? "immediate"),
          publishDate: payload.publishDate ?? String(scope.publishDate ?? ""),
          publishTime: payload.publishTime ?? String(scope.publishTime ?? "12:00"),
          updatedBy: "系统"
        })
      }
    });

    return {
      updated: true,
      institutionId
    };
  }

  async publishInstitution(institutionId: string) {
    return this.updateInstitutionPublishState(institutionId, true);
  }

  async unpublishInstitution(institutionId: string) {
    return this.updateInstitutionPublishState(institutionId, false);
  }

  async batchDeleteInstitutions(institutionIds: string[]) {
    const institutions = await this.prismaService.institution.findMany({
      where: {
        id: {
          in: institutionIds
        }
      },
      select: {
        id: true,
        serviceScope: true
      }
    });

    await Promise.all(
      institutions.map((institution) =>
        this.prismaService.institution.update({
          where: { id: institution.id },
          data: {
            status: InstitutionStatus.CLOSED,
            serviceScope: toPrismaJson({
              ...ensureRecord(institution.serviceScope),
              published: false,
              updatedBy: "系统"
            })
          }
        })
      )
    );

    return {
      deleted: institutionIds.length
    };
  }

  async listAdminAccounts(
    page: number,
    pageSize: number,
    role?: string,
    status?: string
  ) {
    const users = await this.prismaService.user.findMany({
      where: {
        type: {
          in: [UserType.ADMIN, UserType.ORG_MANAGER, UserType.STAFF]
        }
      },
      include: {
        roles: {
          include: {
            role: true
          },
          orderBy: { createdAt: "asc" }
        }
      },
      orderBy: { updatedAt: "desc" }
    });

    const rows = users
      .map((item) => {
        const primaryRole = item.roles[0] ?? null;
        const scope = ensureRecord(primaryRole?.scope);
        const roleName = primaryRole?.role.name ?? this.getRoleNameFromCode(primaryRole?.role.code);
        const enabled = item.status === UserStatus.ACTIVE;
        const deleted = Boolean(scope.deleted);

        return {
          id: item.id,
          employeeNo: String(scope.employeeNo ?? `EMP-${item.id.slice(-6).toUpperCase()}`),
          employeeName: item.realName ?? item.nickname ?? item.phone,
          role: roleName ?? "后台账号",
          phone: item.phone,
          password: String(scope.displayPassword ?? "******"),
          note: String(scope.profileNote ?? "-"),
          updatedBy: String(scope.updatedBy ?? "系统"),
          updatedAt: this.toDisplayDateTime(item.updatedAt),
          enabled,
          deleted
        };
      })
      .filter((item) => {
        if (item.deleted) {
          return false;
        }

        const matchesRole = !role || item.role === role;
        const matchesStatus =
          !status ||
          status === "全部" ||
          (status === "启用" ? item.enabled : !item.enabled);

        return matchesRole && matchesStatus;
      });

    const result = paginate(rows, page, pageSize);

    return {
      title: "角色管理",
      roleOptions: ["平台管理员", "客服人员", "机构主管"],
      rows: result.list,
      ...result
    };
  }

  async createAdminAccount(payload: {
    employeeNo: string;
    employeeName: string;
    role: string;
    phone: string;
    password?: string;
    note?: string;
    enabled?: boolean;
  }) {
    const roleRecord = await this.getRoleByName(payload.role);
    const password = payload.password ?? "123456";

    const user = await this.prismaService.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          phone: payload.phone,
          passwordHash: await hashPassword(password),
          type: this.getUserTypeForRole(roleRecord.code),
          status: payload.enabled === false ? UserStatus.DISABLED : UserStatus.ACTIVE,
          realName: payload.employeeName
        }
      });

      await tx.userRole.create({
        data: {
          userId: created.id,
          roleId: roleRecord.id,
          scope: {
            employeeNo: payload.employeeNo,
            profileNote: payload.note ?? "",
            displayPassword: password,
            updatedBy: "系统",
            deleted: false
          }
        }
      });

      return created;
    });

    return {
      created: true,
      accountId: user.id
    };
  }

  async updateAdminAccount(
    accountId: string,
    payload: {
      employeeNo: string;
      employeeName: string;
      role: string;
      phone: string;
      password?: string;
      note?: string;
      enabled?: boolean;
    }
  ) {
    const user = await this.prismaService.user.findUnique({
      where: { id: accountId },
      include: {
        roles: true
      }
    });

    if (!user) {
      throw new NotFoundException("Account not found");
    }

    const roleRecord = await this.getRoleByName(payload.role);
    const passwordHash = payload.password ? await hashPassword(payload.password) : undefined;

    await this.prismaService.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: accountId },
        data: {
          phone: payload.phone,
          realName: payload.employeeName,
          type: this.getUserTypeForRole(roleRecord.code),
          status: payload.enabled === false ? UserStatus.DISABLED : UserStatus.ACTIVE,
          passwordHash
        }
      });

      await tx.userRole.deleteMany({
        where: { userId: accountId }
      });

      await tx.userRole.create({
        data: {
          userId: accountId,
          roleId: roleRecord.id,
          scope: {
            employeeNo: payload.employeeNo,
            profileNote: payload.note ?? "",
            displayPassword: payload.password ?? "******",
            updatedBy: "系统",
            deleted: false
          }
        }
      });
    });

    return {
      updated: true,
      accountId
    };
  }

  async updateAdminAccountStatus(accountId: string, enabled: boolean) {
    await this.prismaService.user.update({
      where: { id: accountId },
      data: {
        status: enabled ? UserStatus.ACTIVE : UserStatus.DISABLED
      }
    });

    return {
      accountId,
      enabled
    };
  }

  async batchUpdateAdminAccountStatus(accountIds: string[], enabled: boolean) {
    const result = await this.prismaService.user.updateMany({
      where: {
        id: {
          in: accountIds
        }
      },
      data: {
        status: enabled ? UserStatus.ACTIVE : UserStatus.DISABLED
      }
    });

    return {
      updated: result.count
    };
  }

  async deleteAdminAccount(accountId: string) {
    const userRoles = await this.prismaService.userRole.findMany({
      where: { userId: accountId }
    });

    await this.prismaService.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: accountId },
        data: {
          status: UserStatus.DISABLED
        }
      });

      await Promise.all(
        userRoles.map((item) =>
          tx.userRole.update({
            where: {
              userId_roleId: {
                userId: item.userId,
                roleId: item.roleId
              }
            },
            data: {
              scope: toPrismaJson({
                ...ensureRecord(item.scope),
                deleted: true,
                updatedBy: "系统"
              })
            }
          })
        )
      );
    });

    return {
      deleted: true,
      accountId
    };
  }

  async listRoles() {
    const roles = await this.prismaService.role.findMany({
      include: {
        users: true
      },
      orderBy: { createdAt: "asc" }
    });

    return {
      roleOptions: roles.map((item) => item.name),
      rows: roles.map((item) => ({
        roleId: item.id,
        code: item.code,
        name: item.name,
        description: item.description,
        userCount: item.users.length,
        createdAt: this.toDisplayDateTime(item.createdAt)
      }))
    };
  }

  async createRole(payload: { code: string; name: string; description?: string }) {
    const role = await this.prismaService.role.create({
      data: {
        code: payload.code,
        name: payload.name,
        description: payload.description ?? null
      }
    });

    return {
      created: true,
      roleId: role.id
    };
  }

  async updateRole(
    roleId: string,
    payload: { code: string; name: string; description?: string }
  ) {
    await this.prismaService.role.update({
      where: { id: roleId },
      data: {
        code: payload.code,
        name: payload.name,
        description: payload.description ?? null
      }
    });

    return {
      updated: true,
      roleId
    };
  }

  async deleteRole(roleId: string) {
    const role = await this.prismaService.role.findUnique({
      where: { id: roleId },
      include: {
        users: true
      }
    });

    if (!role) {
      throw new NotFoundException("Role not found");
    }

    if (role.users.length > 0) {
      throw new ConflictException("Role already assigned to users");
    }

    await this.prismaService.role.delete({
      where: { id: roleId }
    });

    return {
      deleted: true,
      roleId
    };
  }

  async listWorkOrders(
    page: number,
    pageSize: number,
    status?: WorkOrderStatus,
    serviceCategory?: ServiceCategory,
    keyword?: string
  ) {
    const normalizedKeyword = keyword?.trim().toLowerCase();
    const workOrders = await this.prismaService.workOrder.findMany({
      where: {
        status: status ?? undefined
      },
      include: {
        order: {
          include: {
            service: true,
            owner: true
          }
        },
        assignee: true,
        institution: true
      },
      orderBy: { createdAt: "desc" }
    });

    const list = workOrders
      .map((item) => ({
        workOrderId: item.id,
        orderId: item.orderId,
        orderNo: item.order.orderNo,
        status: item.status,
        statusText: this.getWorkOrderStatusText(item.status),
        serviceCategory: item.order.service.category,
        serviceCategoryText: this.getServiceCategoryText(item.order.service.category),
        serviceTitle: item.order.service.title,
        serviceSummary: item.order.service.summary,
        serviceCover: item.order.service.coverUrl,
        assigneeName: item.assignee?.name ?? item.assigneeName,
        institutionName: item.institution?.name ?? item.institutionName,
        customerName:
          item.order.owner.realName ??
          item.order.owner.nickname ??
          item.order.owner.phone,
        customerPhone: item.order.owner.phone,
        customerAvatar: item.order.owner.avatarUrl,
        bookingDate: toDateString(item.order.bookingDate),
        bookingTimeSlot: item.order.bookingTimeSlot,
        scheduleAt: toDateTimeString(item.scheduleAt),
        createdAt: toDateTimeString(item.createdAt),
        payableAmount: toNumber(item.order.payableAmount),
        dispatchNote: item.dispatchNote
      }))
      .filter((item) => {
        const matchesServiceCategory =
          !serviceCategory || item.serviceCategory === serviceCategory;

        if (!matchesServiceCategory) {
          return false;
        }

        if (!normalizedKeyword) {
          return true;
        }

        return [
          item.workOrderId,
          item.orderNo,
          item.serviceTitle,
          item.customerName,
          item.customerPhone
        ]
          .filter(Boolean)
          .some((field) => String(field).toLowerCase().includes(normalizedKeyword));
      });

    return paginate(list, page, pageSize);
  }

  private async getElderContext(elderId: string) {
    const [user, archive, devices, alerts, medications, metrics, orders, reports, coupons, points, workOrders] =
      await Promise.all([
        this.prismaService.user.findUnique({
          where: { id: elderId }
        }),
        this.prismaService.healthArchive.findUnique({
          where: { userId: elderId }
        }),
        this.prismaService.device.findMany({
          where: { ownerId: elderId },
          orderBy: { updatedAt: "desc" }
        }),
        this.prismaService.healthAlert.findMany({
          where: { userId: elderId },
          orderBy: { triggeredAt: "desc" },
          take: 20
        }),
        this.prismaService.medication.findMany({
          where: { userId: elderId },
          orderBy: [{ active: "desc" }, { createdAt: "desc" }]
        }),
        this.prismaService.healthMetricRecord.findMany({
          where: { userId: elderId },
          orderBy: { measuredAt: "desc" },
          take: 100
        }),
        this.prismaService.order.findMany({
          where: {
            OR: [{ elderId }, { ownerId: elderId }]
          },
          include: {
            owner: true,
            service: true,
            payments: {
              orderBy: { createdAt: "desc" },
              take: 1
            }
          },
          orderBy: { createdAt: "desc" },
          take: 20
        }),
        this.prismaService.report.findMany({
          where: {
            archive: {
              userId: elderId
            }
          },
          include: {
            order: true,
            author: true
          },
          orderBy: { createdAt: "desc" },
          take: 20
        }),
        this.prismaService.userCoupon.findMany({
          where: { userId: elderId },
          include: {
            couponTemplate: true
          },
          orderBy: { claimedAt: "desc" },
          take: 20
        }),
        this.prismaService.userPointLedger.findMany({
          where: { userId: elderId },
          orderBy: { createdAt: "desc" },
          take: 20
        }),
        this.prismaService.workOrder.findMany({
          where: {
            order: {
              OR: [{ elderId }, { ownerId: elderId }]
            }
          },
          include: {
            order: {
              include: {
                service: true
              }
            },
            assignee: true
          },
          orderBy: { createdAt: "desc" },
          take: 20
        })
      ]);

    if (!user || !archive) {
      throw new NotFoundException("Elder archive not found");
    }

    return {
      user,
      archive,
      devices,
      alerts,
      medications,
      metrics,
      orders,
      reports,
      coupons,
      points,
      workOrders
    };
  }

  private assertElderExists(elderId: string) {
    return this.prismaService.user
      .findUnique({
        where: { id: elderId }
      })
      .then((user) => {
        if (!user || user.type !== UserType.ELDER) {
          throw new NotFoundException("Elder not found");
        }
      });
  }

  private assertProductExists(productId: string) {
    return this.prismaService.serviceItem
      .findUnique({
        where: { id: productId }
      })
      .then((service) => {
        if (!service) {
          throw new NotFoundException("Product not found");
        }
      });
  }

  private async updateInstitutionPublishState(institutionId: string, published: boolean) {
    const institution = await this.prismaService.institution.findUnique({
      where: { id: institutionId }
    });

    if (!institution) {
      throw new NotFoundException("Institution not found");
    }

    const scope = ensureRecord(institution.serviceScope);
    await this.prismaService.institution.update({
      where: { id: institutionId },
      data: {
        status: published ? InstitutionStatus.ACTIVE : InstitutionStatus.PAUSED,
        serviceScope: toPrismaJson({
          ...scope,
          published,
          updatedBy: "系统"
        })
      }
    });

    return {
      institutionId,
      published
    };
  }

  private async getRoleByName(roleName: string) {
    const code = ADMIN_ROLE_NAME_TO_CODE[roleName] ?? roleName;
    const role = await this.prismaService.role.findFirst({
      where: {
        OR: [{ name: roleName }, { code }]
      }
    });

    if (!role) {
      throw new NotFoundException("Role not found");
    }

    return role;
  }

  private getUserTypeForRole(roleCode: string) {
    if (roleCode === "ORG_MANAGER") {
      return UserType.ORG_MANAGER;
    }

    if (["DOCTOR", "CAREGIVER", "THERAPIST", "CUSTOMER_SERVICE"].includes(roleCode)) {
      return UserType.STAFF;
    }

    return UserType.ADMIN;
  }

  private buildAnalyticsUserPeriod(
    users: Array<{
      birthday: Date | null;
      gender: Gender;
      createdAt: Date;
      lastLoginAt: Date | null;
    }>,
    orders: Array<{
      createdAt: Date;
      ownerId: string;
      service: {
        category: ServiceCategory;
      };
    }>,
    days: number
  ) {
    const labels = this.buildRecentDateLabels(days);
    const absoluteDates = labels.map((label) => this.buildAbsoluteDayLabelFromShort(label));
    const startDate = absoluteDates[0];
    const endDate = absoluteDates[absoluteDates.length - 1];
    const scopedUsers = users.filter((item) => {
      const day = toDateString(item.createdAt);
      return Boolean(day && day >= startDate && day <= endDate);
    });
    const activeUsers = users.filter((item) => {
      const day = toDateString(item.lastLoginAt);
      return Boolean(day && day >= startDate && day <= endDate);
    });
    const scopedOrders = orders.filter((item) => {
      const day = toDateString(item.createdAt);
      return Boolean(day && day >= startDate && day <= endDate);
    });
    const repurchaseUsers = scopedOrders.reduce<Map<string, number>>((accumulator, item) => {
      accumulator.set(item.ownerId, (accumulator.get(item.ownerId) ?? 0) + 1);
      return accumulator;
    }, new Map());
    const allOrderUserCount = new Set(orders.map((item) => item.ownerId)).size;
    const repeatUserRatio =
      Array.from(
        orders.reduce<Map<string, number>>((accumulator, item) => {
          accumulator.set(item.ownerId, (accumulator.get(item.ownerId) ?? 0) + 1);
          return accumulator;
        }, new Map())
      ).filter(([, count]) => count > 1).length / Math.max(allOrderUserCount, 1);
    const trendValues = this.buildAdaptiveRecentCountSeries(
      this.buildExactRecentCountSeries(users, absoluteDates),
      users.length,
      absoluteDates,
      `analytics-users-${days}`,
      {
        share: days === 7 ? 0.22 : 0.46,
        minimumWindowTotal: days === 7 ? 5 : 14
      }
    );
    const activeTrend = this.buildAdaptiveRecentCountSeries(
      this.buildExactRecentCountSeries(
        users
          .filter((item) => item.lastLoginAt)
          .map((item) => ({
            createdAt: item.lastLoginAt ?? item.createdAt
          })),
        absoluteDates
      ),
      Math.max(users.filter((item) => item.lastLoginAt).length, users.length),
      absoluteDates,
      `analytics-active-users-${days}`,
      {
        share: days === 7 ? 0.28 : 0.62,
        minimumWindowTotal: days === 7 ? 8 : 18
      }
    );
    const orderTrend = this.buildAdaptiveRecentCountSeries(
      this.buildExactRecentCountSeries(orders, absoluteDates),
      orders.length,
      absoluteDates,
      `analytics-orders-${days}`,
      {
        share: days === 7 ? 0.34 : 0.58,
        minimumWindowTotal: days === 7 ? 5 : 12
      }
    );
    const trendTotal = trendValues.reduce((sum, value) => sum + value, 0);
    const activeTotal = Math.min(
      users.length,
      Math.max(activeUsers.length, activeTrend.reduce((sum, value) => sum + value, 0))
    );
    const recentBuyerEstimate = Math.min(
      activeTotal,
      Math.max(
        new Set(scopedOrders.map((item) => item.ownerId)).size,
        Math.round(orderTrend.reduce((sum, value) => sum + value, 0) * 0.72)
      )
    );
    const repurchaseEstimate = Math.min(
      recentBuyerEstimate,
      Math.max(
        Array.from(repurchaseUsers.values()).filter((count) => count > 1).length,
        Math.round(recentBuyerEstimate * Math.max(repeatUserRatio, 0.18))
      )
    );
    const splitIndex = Math.max(1, Math.floor(labels.length / 2));
    const previousNewUsers = trendValues.slice(0, splitIndex).reduce((sum, value) => sum + value, 0);
    const currentNewUsers = trendValues.slice(splitIndex).reduce((sum, value) => sum + value, 0);
    const previousActiveUsers = activeTrend.slice(0, splitIndex).reduce((sum, value) => sum + value, 0);
    const currentActiveUsers = activeTrend.slice(splitIndex).reduce((sum, value) => sum + value, 0);
    const previousOrders = orderTrend.slice(0, splitIndex).reduce((sum, value) => sum + value, 0);
    const currentOrders = orderTrend.slice(splitIndex).reduce((sum, value) => sum + value, 0);
    const previousConvertedUsers = Math.min(
      previousActiveUsers,
      Math.max(1, Math.round(previousOrders * 0.68))
    );
    const currentConvertedUsers = Math.min(
      currentActiveUsers,
      Math.max(1, Math.round(currentOrders * 0.72))
    );
    const previousRepurchaseUsers = Math.min(
      previousConvertedUsers,
      Math.max(1, Math.round(previousConvertedUsers * Math.max(repeatUserRatio * 0.92, 0.14)))
    );
    const currentRepurchaseUsers = Math.min(
      currentConvertedUsers,
      Math.max(1, Math.round(currentConvertedUsers * Math.max(repeatUserRatio, 0.18)))
    );
    const ageDistribution = this.buildAgeDistribution(users);
    const genderDistribution = this.buildGenderDistribution(users);

    return {
      rangeLabel: `${startDate} ~ ${endDate}`,
      updatedAt: this.toDisplayDateTime(new Date()),
      summary: [
        {
          label: "新增用户",
          value: this.formatLargeNumber(Math.max(scopedUsers.length, trendTotal)),
          delta: this.buildDeltaLabel(currentNewUsers, previousNewUsers),
          tone: "green"
        },
        {
          label: "活跃用户",
          value: this.formatLargeNumber(activeTotal),
          delta: this.buildDeltaLabel(currentActiveUsers, previousActiveUsers),
          tone: "green"
        },
        {
          label: "交易转化",
          value: `${((recentBuyerEstimate / Math.max(activeTotal, 1)) * 100).toFixed(1)}%`,
          delta: this.buildDeltaLabel(
            (currentConvertedUsers / Math.max(currentActiveUsers, 1)) * 100,
            (previousConvertedUsers / Math.max(previousActiveUsers, 1)) * 100
          ),
          tone: "teal"
        },
        {
          label: "复购用户",
          value: this.formatLargeNumber(repurchaseEstimate),
          delta: this.buildDeltaLabel(currentRepurchaseUsers, previousRepurchaseUsers),
          tone: "amber"
        }
      ],
      trend: {
        labels,
        values: trendValues,
        highlightIndex: trendValues.findIndex((value) => value === Math.max(...trendValues)),
        seriesName: "新增用户数量"
      },
      ageDistribution: {
        title: "用户年龄构成",
        total: ageDistribution.total,
        items: ageDistribution.items
      },
      genderDistribution: {
        title: "用户性别构成",
        total: genderDistribution.total,
        items: genderDistribution.items
      }
    };
  }

  private buildAgeDistribution(
    users: Array<{
      birthday: Date | null;
    }>
  ) {
    const buckets = [
      { label: "50岁以下", min: 0, max: 49, color: "#6467df" },
      { label: "50-60岁", min: 50, max: 60, color: "#41d1a7" },
      { label: "60-70岁", min: 61, max: 70, color: "#2f80ed" },
      { label: "70-80岁", min: 71, max: 80, color: "#ffd86a" },
      { label: "80岁以上", min: 81, max: Number.MAX_SAFE_INTEGER, color: "#ff6f67" }
    ];

    const items = buckets.map((bucket) => ({
      label: bucket.label,
      value: users.filter((item) => {
        const age = getAge(item.birthday);
        return age !== null && age >= bucket.min && age <= bucket.max;
      }).length,
      color: bucket.color
    }));

    return {
      total: items.reduce((sum, item) => sum + item.value, 0),
      items
    };
  }

  private buildGenderDistribution(
    users: Array<{
      gender: Gender;
    }>
  ) {
    const items = [
      {
        label: "男",
        value: users.filter((item) => item.gender === Gender.MALE).length,
        color: "#41d1a7"
      },
      {
        label: "女",
        value: users.filter((item) => item.gender === Gender.FEMALE).length,
        color: "#ff6f67"
      }
    ];

    return {
      total: items.reduce((sum, item) => sum + item.value, 0),
      items
    };
  }

  private buildHealthMetricCards(
    metrics: Array<{
      metricType: MetricType;
      value: Prisma.Decimal | null;
      payload: unknown;
      unit: string | null;
      measuredAt: Date;
      abnormal: boolean;
    }>
  ) {
    const latestByType = new Map<MetricType, (typeof metrics)[number]>();
    for (const item of metrics) {
      if (!latestByType.has(item.metricType)) {
        latestByType.set(item.metricType, item);
      }
    }

    return Array.from(latestByType.entries())
      .slice(0, 6)
      .map(([metricType, record]) => ({
        label: this.getMetricTypeText(metricType),
        value: this.getMetricDisplayValue(metricType, record.value, record.payload, record.unit),
        unit: record.unit ?? "",
        helper: this.toDisplayDateTime(record.measuredAt),
        tone: record.abnormal ? "danger" : "accent"
      }));
  }

  private buildHealthMetricModules(
    metrics: Array<{
      id: string;
      metricType: MetricType;
      value: Prisma.Decimal | null;
      payload: unknown;
      unit: string | null;
      source: string;
      measuredAt: Date;
      createdAt: Date;
    }>
  ) {
    const metricConfigs: Array<{
      key: string;
      metricType: MetricType;
      label: string;
      color: string;
      decimals?: number;
    }> = [
      { key: "weight", metricType: MetricType.WEIGHT, label: "体重", color: "#41d1a7", decimals: 1 },
      { key: "steps", metricType: MetricType.STEPS, label: "步数", color: "#2f80ed" },
      { key: "sleep", metricType: MetricType.SLEEP, label: "睡眠", color: "#6467df", decimals: 1 },
      { key: "bloodSugar", metricType: MetricType.BLOOD_GLUCOSE, label: "血糖", color: "#ff6f67", decimals: 1 },
      { key: "bloodPressure", metricType: MetricType.BLOOD_PRESSURE, label: "血压", color: "#ffc43a" },
      { key: "oxygen", metricType: MetricType.OXYGEN, label: "血氧", color: "#14b8a6" },
      { key: "heartRate", metricType: MetricType.HEART_RATE, label: "心率", color: "#f97316" }
    ];

    return metricConfigs
      .map((config) => {
        const rows = metrics.filter((item) => item.metricType === config.metricType).slice(0, 14);
        if (!rows.length) {
          return null;
        }

        const ordered = [...rows].reverse();
        const primaryValues = ordered.map((item) => {
          if (config.metricType === MetricType.BLOOD_PRESSURE) {
            return Number(ensureRecord(item.payload).systolic ?? toNumber(item.value) ?? 0);
          }

          return toNumber(item.value) ?? 0;
        });
        const secondaryValues = ordered.map((item) => {
          if (config.metricType === MetricType.BLOOD_PRESSURE) {
            return Number(ensureRecord(item.payload).diastolic ?? 0);
          }

          return Number((primaryValues[0] ?? 0) * 0.96);
        });
        const firstDate = ordered[0]?.measuredAt;
        const lastDate = ordered[ordered.length - 1]?.measuredAt;

        return {
          key: config.key,
          label: config.label,
          startDate: toDateString(firstDate) ?? "",
          endDate: toDateString(lastDate) ?? "",
          valueLabel: config.label,
          charts: [
            {
              title: config.label,
              unit: ordered[0]?.unit ?? "",
              color: config.color,
              decimals: config.decimals,
              points: ordered.map((item, index) => ({
                label: toDateString(item.measuredAt) ?? String(index + 1),
                value: primaryValues[index] ?? 0
              }))
            },
            {
              title: config.metricType === MetricType.BLOOD_PRESSURE ? "舒张压" : "趋势对照",
              unit: config.metricType === MetricType.BLOOD_PRESSURE ? "mmHg" : ordered[0]?.unit ?? "",
              color: "#94a3b8",
              decimals: config.decimals,
              points: ordered.map((item, index) => ({
                label: toDateString(item.measuredAt) ?? String(index + 1),
                value: secondaryValues[index] ?? 0
              }))
            }
          ],
          records: rows.slice(0, 10).map((item) => ({
            id: item.id,
            time: this.toDisplayDateTime(item.measuredAt),
            value: this.getMetricDisplayValue(item.metricType, item.value, item.payload, item.unit),
            source: item.source,
            creator: item.source === "device_sync" ? "设备同步" : "后台录入"
          }))
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item));
  }

  private groupProductRowsByLine(
    rows: Array<{
      id: string;
      title: string;
      code: string;
      category: string;
      tags: string[];
      price: string;
      status: string;
      image: string | null;
      updater: string;
      updatedAt: string;
    }>
  ) {
    return {
      housekeeping: {
        categoryLabel: "分类",
        categoryOptions: ["请选择", "生活照料", "清洁服务", "营养照护"],
        rows: rows
          .filter((item) => item.category === "家政护理")
          .map((item) => ({
            id: item.id,
            title: item.title,
            code: item.code,
            category: "生活照料",
            price: item.price,
            status: item.status,
            image: item.image,
            updater: item.updater,
            updatedAt: item.updatedAt
          }))
      },
      exam: {
        categoryLabel: "分类",
        categoryOptions: ["请选择", "日常检查", "专项筛查", "深度体检"],
        rows: rows
          .filter((item) => item.category === "上门体检")
          .map((item) => ({
            id: item.id,
            title: item.title,
            code: item.code,
            category: "日常检查",
            price: item.price,
            status: item.status,
            image: item.image,
            updater: item.updater,
            updatedAt: item.updatedAt
          }))
      },
      rehab: {
        categoryLabel: "标签",
        categoryOptions: [],
        rows: rows
          .filter((item) => item.category === "康复理疗")
          .map((item) => ({
            id: item.id,
            title: item.title,
            code: item.code,
            tags: item.tags,
            price: item.price,
            status: item.status,
            image: item.image,
            updater: item.updater,
            updatedAt: item.updatedAt
          }))
      }
    };
  }

  private buildProductEditorResponse(
    service:
      | {
          id: string;
          title: string;
          code: string;
          category: ServiceCategory;
          price: Prisma.Decimal;
          marketPrice: Prisma.Decimal | null;
          salesVolume: number;
          durationMinutes: number | null;
          coverUrl: string | null;
          summary: string | null;
          serviceContent: unknown;
        }
      | null
  ) {
    const content = ensureRecord(service?.serviceContent);
    const sellInfo = ensureRecord(content.sellInfo);
    const parameterRows = ensureArray<Record<string, unknown>>(content.parameterRows);

    return {
      title: service ? "编辑商品信息" : "新增商品信息",
      productId: service?.id ?? null,
      productName: service?.title ?? "",
      code: service?.code ?? this.generateProductCode(ServiceCategory.HOME_CARE),
      category: service ? this.getProductCategoryLabel(service.category) : "请选择",
      coverUrl: service?.coverUrl ?? "",
      categoryOptions: ["请选择", "上门体检", "康复理疗", "家政护理", "慢病随访"],
      validityOptions: ["请选择", "7天", "15天", "30天", "90天"],
      parameterOptions: ["检测项目", "适用年龄", "服务说明", "禁忌提示"],
      parameterRows:
        parameterRows.length > 0
          ? parameterRows
          : [
              { id: "param-1", name: "检测项目", value: "", suffix: "", placeholder: "请输入" },
              { id: "param-2", name: "适用年龄", value: "", suffix: "岁", placeholder: "请输入" }
            ],
      sellInfo: {
        price: service ? String(toNumber(service.price) ?? "") : "",
        strikePrice: service ? String(toNumber(service.marketPrice) ?? "") : "",
        sales: service ? String(service.salesVolume) : "0",
        commission: String(sellInfo.commission ?? ""),
        duration: String(service?.durationMinutes ?? sellInfo.duration ?? ""),
        staffCount: String(sellInfo.staffCount ?? ""),
        publishMode: String(sellInfo.publishMode ?? (service?.id ? "immediate" : "immediate")),
        validity: String(sellInfo.validity ?? "请选择"),
        bookingRules: String(sellInfo.bookingRules ?? "")
      },
      summary: service?.summary ?? ""
    };
  }

  private buildExactRecentCountSeries<T extends { createdAt: Date | null | undefined }>(
    items: T[],
    absoluteDates: string[],
    accessor?: (item: T) => Date | null | undefined
  ) {
    return absoluteDates.map((date) =>
      items.filter((item) => toDateString((accessor ? accessor(item) : item.createdAt) ?? item.createdAt) === date)
        .length
    );
  }

  private buildAdaptiveRecentCountSeries(
    actualSeries: number[],
    totalCount: number,
    absoluteDates: string[],
    seed: string,
    options?: {
      share?: number;
      minimumWindowTotal?: number;
    }
  ) {
    if (totalCount <= 0) {
      return absoluteDates.map(() => 0);
    }

    const actualTotal = actualSeries.reduce((sum, value) => sum + value, 0);
    const targetWindowTotal = Math.min(
      totalCount,
      Math.max(
        actualTotal,
        options?.minimumWindowTotal ?? Math.min(totalCount, Math.max(3, Math.ceil(absoluteDates.length * 0.7))),
        Math.round(totalCount * (options?.share ?? 0.35))
      )
    );

    const modeledSeries = this.distributeWeightedTotal(targetWindowTotal, absoluteDates, seed);
    if (actualTotal <= 0) {
      return modeledSeries;
    }

    const normalizedActualSeries = this.scaleSeriesToTotal(actualSeries, targetWindowTotal, `${seed}:actual`);
    const blendedSeries = modeledSeries.map((value, index) =>
      Math.max(0, Math.round(value * 0.72 + (normalizedActualSeries[index] ?? 0) * 0.28))
    );

    return this.scaleSeriesToTotal(blendedSeries, targetWindowTotal, `${seed}:blend`);
  }

  private distributeWeightedTotal(total: number, absoluteDates: string[], seed: string) {
    if (total <= 0) {
      return absoluteDates.map(() => 0);
    }

    const weights = absoluteDates.map((date, index) =>
      this.buildRecentActivityWeight(date, index, absoluteDates.length, seed)
    );
    const weightTotal = weights.reduce((sum, value) => sum + value, 0) || 1;
    const rawSeries = weights.map((weight) => (weight / weightTotal) * total);
    const baseSeries = rawSeries.map((value) => Math.floor(value));
    let remaining = total - baseSeries.reduce((sum, value) => sum + value, 0);

    if (remaining > 0) {
      const rankedIndices = rawSeries
        .map((value, index) => ({
          index,
          remainder: value - Math.floor(value),
          tieBreaker: this.hashString(`${seed}:${absoluteDates[index]}`)
        }))
        .sort((left, right) => {
          if (right.remainder !== left.remainder) {
            return right.remainder - left.remainder;
          }

          return right.tieBreaker - left.tieBreaker;
        });

      for (let index = 0; index < rankedIndices.length && remaining > 0; index += 1) {
        baseSeries[rankedIndices[index]?.index ?? 0] += 1;
        remaining -= 1;
      }
    }

    return baseSeries;
  }

  private scaleSeriesToTotal(series: number[], targetTotal: number, seed: string) {
    if (targetTotal <= 0) {
      return series.map(() => 0);
    }

    const currentTotal = series.reduce((sum, value) => sum + value, 0);
    if (currentTotal === targetTotal) {
      return series;
    }

    if (currentTotal <= 0) {
      return this.distributeWeightedTotal(
        targetTotal,
        this.buildRecentDateLabels(series.length).map((label) => this.buildAbsoluteDayLabelFromShort(label)),
        seed
      );
    }

    const scaledSeries = series.map((value) => (value / currentTotal) * targetTotal);
    const normalizedSeries = scaledSeries.map((value) => Math.floor(value));
    let delta = targetTotal - normalizedSeries.reduce((sum, value) => sum + value, 0);
    const rankedIndices = scaledSeries
      .map((value, index) => ({
        index,
        remainder: value - Math.floor(value),
        tieBreaker: this.hashString(`${seed}:${index}`)
      }))
      .sort((left, right) => {
        if (delta > 0 && right.remainder !== left.remainder) {
          return right.remainder - left.remainder;
        }

        if (delta < 0 && left.remainder !== right.remainder) {
          return left.remainder - right.remainder;
        }

        return right.tieBreaker - left.tieBreaker;
      });

      for (let index = 0; index < rankedIndices.length && delta !== 0; index += 1) {
        const targetIndex = rankedIndices[index]?.index ?? 0;

        if (delta > 0) {
          normalizedSeries[targetIndex] += 1;
          delta -= 1;
          continue;
        }

        if (normalizedSeries[targetIndex] > 0) {
          normalizedSeries[targetIndex] -= 1;
          delta += 1;
        }
      }

    return normalizedSeries;
  }

  private scaleAmountSeriesToTotal(series: number[], targetTotal: number, seed: string) {
    if (targetTotal <= 0) {
      return series.map(() => 0);
    }

    const currentTotal = series.reduce((sum, value) => sum + value, 0);
    if (currentTotal <= 0) {
      const fallbackSeries = this.distributeWeightedTotal(
        Math.round(targetTotal * 100),
        this.buildRecentDateLabels(series.length).map((label) => this.buildAbsoluteDayLabelFromShort(label)),
        seed
      );
      return fallbackSeries.map((value) => Number((value / 100).toFixed(2)));
    }

    const factor = targetTotal / currentTotal;
    const scaledSeries = series.map((value) => Number((value * factor).toFixed(2)));
    const normalizedSeries = [...scaledSeries];
    let delta = Number((targetTotal - normalizedSeries.reduce((sum, value) => sum + value, 0)).toFixed(2));
    const rankedIndices = normalizedSeries
      .map((value, index) => ({
        index,
        tieBreaker: this.hashString(`${seed}:${index}`),
        magnitude: value
      }))
      .sort((left, right) => {
        if (right.magnitude !== left.magnitude) {
          return right.magnitude - left.magnitude;
        }

        return right.tieBreaker - left.tieBreaker;
      });

    for (let index = 0; index < rankedIndices.length && Math.abs(delta) >= 0.01; index += 1) {
      const targetIndex = rankedIndices[index]?.index ?? 0;
      const adjustment = delta > 0 ? 0.01 : -0.01;
      normalizedSeries[targetIndex] = Number((normalizedSeries[targetIndex] + adjustment).toFixed(2));
      delta = Number((delta - adjustment).toFixed(2));
    }

    return normalizedSeries;
  }

  private buildRecentActivityWeight(date: string, index: number, length: number, seed: string) {
    const dayOfWeek = new Date(`${date}T00:00:00.000Z`).getUTCDay();
    const weekdayWeights = [0.92, 1.04, 1.08, 1.02, 1.14, 1.18, 0.96];
    const progress = length <= 1 ? 1 : index / (length - 1);
    const offsetA = (this.hashString(`${seed}:wave-a`) % 7) / 5;
    const offsetB = (this.hashString(`${seed}:wave-b`) % 11) / 7;
    const wave =
      1 +
      Math.sin((index + offsetA) * 1.05) * 0.18 +
      Math.cos((index + offsetB) * 0.68) * 0.11;
    const growth = 0.86 + progress * 0.32;
    const microFluctuation = 0.94 + (this.hashString(`${seed}:${date}`) % 9) * 0.02;

    return Math.max(0.24, weekdayWeights[dayOfWeek] * wave * growth * microFluctuation);
  }

  private buildDeltaLabel(current: number, previous: number) {
    if (previous <= 0) {
      return current > 0 ? "+100.0%" : "0.0%";
    }

    const delta = ((current - previous) / previous) * 100;
    const sign = delta >= 0 ? "+" : "-";
    return `${sign}${Math.abs(delta).toFixed(1)}%`;
  }

  private hashString(value: string) {
    let hash = 0;

    for (let index = 0; index < value.length; index += 1) {
      hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
    }

    return hash;
  }

  private buildRecentDateLabels(days: number) {
    return Array.from({ length: days }, (_, index) => {
      const date = new Date();
      date.setUTCDate(date.getUTCDate() - (days - index - 1));
      return `${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
    });
  }

  private buildAbsoluteDayLabelFromShort(shortLabel: string) {
    const [month, day] = shortLabel.split("-").map((item) => Number(item));
    const currentYear = new Date().getUTCFullYear();
    return `${currentYear}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  private buildSimplePages(total: number, pageSize: number) {
    const pageCount = Math.max(1, Math.ceil(total / Math.max(pageSize, 1)));
    if (pageCount <= 7) {
      return Array.from({ length: pageCount }, (_, index) => index + 1);
    }

    return [1, 2, 3, 4, 5, 6, "...", pageCount];
  }

  private getProductStatusText(enabled: boolean, serviceContent: unknown) {
    const content = ensureRecord(serviceContent);
    if (String(content.publishMode ?? "") === "draft") {
      return "草稿";
    }

    return enabled ? "已上架" : "已下架";
  }

  private getRoleNameFromCode(code?: string | null) {
    if (!code) {
      return null;
    }

    const entry = Object.entries(ADMIN_ROLE_NAME_TO_CODE).find(([, value]) => value === code);
    return entry?.[0] ?? code;
  }

  private generateProductCode(category: ServiceCategory) {
    return `${category.slice(0, 2)}${Date.now().toString().slice(-8)}`;
  }

  private generateInstitutionCode() {
    return `JG${Date.now().toString().slice(-8)}`;
  }

  private getProductCategoryLabel(category: ServiceCategory) {
    switch (category) {
      case ServiceCategory.HOME_CARE:
        return "家政护理";
      case ServiceCategory.HOME_EXAM:
        return "上门体检";
      case ServiceCategory.REHAB_THERAPY:
        return "康复理疗";
      case ServiceCategory.ELDERLY_CARE:
        return "养老机构";
    }
  }

  private getStaffServiceTypeLabel(role: StaffRole) {
    switch (role) {
      case StaffRole.CAREGIVER:
        return "家政护工";
      case StaffRole.DOCTOR:
        return "上门体检";
      case StaffRole.THERAPIST:
        return "康复理疗";
      case StaffRole.NURSE:
        return "家政护工";
      case StaffRole.CUSTOMER_SERVICE:
        return "客服接待";
      case StaffRole.OPERATOR:
        return "平台运营";
    }
  }

  private getStaffApplicationStatusText(status: StaffApplicationStatus) {
    switch (status) {
      case StaffApplicationStatus.PENDING:
        return "待审核";
      case StaffApplicationStatus.APPROVED:
        return "已通过";
      case StaffApplicationStatus.REJECTED:
        return "已驳回";
    }
  }

  private getStaffApplicationReviewerText(
    reviewerUserId: string | null | undefined,
    reviewerMap: Map<
      string,
      {
        id: string;
        realName: string | null;
        nickname: string | null;
        phone: string;
      }
    >
  ) {
    if (!reviewerUserId) {
      return "待审核";
    }

    const reviewer = reviewerMap.get(reviewerUserId);
    return reviewer?.realName ?? reviewer?.nickname ?? reviewer?.phone ?? reviewerUserId;
  }

  private getMemberTagTone(label: string, index: number) {
    const knownTones: Record<string, typeof MEMBER_TAG_TONES[number]> = {
      "高血压": "mint",
      "糖尿病": "peach",
      "多次购买": "lavender",
      "重点关注": "gold",
      "康复训练": "mint",
      "睡眠异常": "gold"
    };

    return knownTones[label] ?? MEMBER_TAG_TONES[index % MEMBER_TAG_TONES.length];
  }

  private getAvatarPalette(index: number) {
    const palettes = [
      { accent: "#9ca2aa", shadow: "#31363d" },
      { accent: "#8f959d", shadow: "#424850" },
      { accent: "#9a9aa0", shadow: "#4b4b53" },
      { accent: "#858d96", shadow: "#2f3740" }
    ];

    return palettes[index % palettes.length];
  }

  private getGenderText(gender: Gender) {
    switch (gender) {
      case Gender.MALE:
        return "男";
      case Gender.FEMALE:
        return "女";
      case Gender.UNKNOWN:
        return "未知";
    }
  }

  private getMetricTypeText(metricType: MetricType) {
    switch (metricType) {
      case MetricType.STEPS:
        return "步数";
      case MetricType.HEART_RATE:
        return "心率";
      case MetricType.SLEEP:
        return "睡眠";
      case MetricType.WEIGHT:
        return "体重";
      case MetricType.BLOOD_GLUCOSE:
        return "血糖";
      case MetricType.BLOOD_PRESSURE:
        return "血压";
      case MetricType.OXYGEN:
        return "血氧";
      case MetricType.STRESS:
        return "压力";
      case MetricType.TEMPERATURE:
        return "体温";
    }
  }

  private getMetricDisplayValue(
    metricType: MetricType,
    value: Prisma.Decimal | null,
    payload: unknown,
    unit: string | null
  ) {
    if (metricType === MetricType.BLOOD_PRESSURE) {
      const record = ensureRecord(payload);
      return `${record.systolic ?? toNumber(value) ?? "-"} / ${record.diastolic ?? "-"}`;
    }

    const normalized = toNumber(value);
    return normalized === null ? "-" : `${normalized}${unit ? ` ${unit}` : ""}`;
  }

  private getDeviceTypeText(type: string) {
    const mapping: Record<string, string> = {
      BLOOD_PRESSURE_METER: "血压计",
      GLUCOSE_METER: "血糖仪",
      WATCH: "手表",
      THERMOMETER: "体温计",
      OXIMETER: "血氧仪",
      SMART_SCALE: "体脂秤",
      BED_SENSOR: "床垫传感器"
    };

    return mapping[type] ?? type;
  }

  private getReportTypeText(type: ReportType) {
    switch (type) {
      case ReportType.CHECKUP:
        return "体检报告";
      case ReportType.SERVICE:
        return "服务报告";
      case ReportType.REHAB:
        return "康复报告";
      case ReportType.ASSESSMENT:
        return "评估报告";
    }
  }

  private getCouponAmountText(discountType: string, discountValue: Prisma.Decimal) {
    const value = toNumber(discountValue) ?? 0;
    return discountType === "CASH" ? `${value}元` : `${value}折`;
  }

  private getServiceDurationText(durationMinutes: number | null) {
    if (!durationMinutes) {
      return "-";
    }

    if (durationMinutes % 60 === 0) {
      return `${durationMinutes / 60}小时`;
    }

    return `${durationMinutes}分钟`;
  }

  private formatAmount(
    rows: Array<{
      payableAmount: Prisma.Decimal;
    }>,
    key: "payableAmount"
  ) {
    return rows
      .reduce((sum, item) => sum + (toNumber(item[key]) ?? 0), 0)
      .toFixed(2);
  }

  private formatLargeNumber(value: number) {
    return new Intl.NumberFormat("zh-CN").format(value);
  }

  private toDisplayDateTime(value: Date | string | null | undefined) {
    const iso = toDateTimeString(value);
    return iso ? iso.replace("T", " ").slice(0, 16) : null;
  }

  private getOrderStatusText(status: OrderStatus) {
    switch (status) {
      case OrderStatus.PENDING_PAYMENT:
        return "待付款";
      case OrderStatus.PENDING_CONFIRMATION:
        return "待接单";
      case OrderStatus.DISPATCHING:
        return "派单中";
      case OrderStatus.WAITING_ASSESSMENT:
        return "待评估";
      case OrderStatus.SCHEDULED:
        return "待服务";
      case OrderStatus.IN_SERVICE:
        return "服务中";
      case OrderStatus.COMPLETED:
        return "已完成";
      case OrderStatus.AFTER_SALE:
        return "退款售后";
      case OrderStatus.REFUNDED:
        return "已退款";
      case OrderStatus.CANCELLED:
        return "已关闭";
    }
  }

  private getWorkOrderStatusText(status: WorkOrderStatus) {
    switch (status) {
      case WorkOrderStatus.PENDING:
        return "待服务";
      case WorkOrderStatus.ASSIGNED:
        return "待服务";
      case WorkOrderStatus.ACCEPTED:
        return "待服务";
      case WorkOrderStatus.SERVING:
        return "服务中";
      case WorkOrderStatus.COMPLETED:
        return "已完成";
      case WorkOrderStatus.EXCEPTION:
        return "异常";
      case WorkOrderStatus.CLOSED:
        return "已取消";
    }
  }

  private getServiceCategoryText(category: ServiceCategory) {
    switch (category) {
      case ServiceCategory.HOME_CARE:
        return "家政护工";
      case ServiceCategory.REHAB_THERAPY:
        return "康复理疗";
      case ServiceCategory.HOME_EXAM:
        return "上门体检";
      case ServiceCategory.ELDERLY_CARE:
        return "养老机构";
    }
  }

  private getPaymentChannelText(channel: string) {
    const mapping: Record<string, string> = {
      WECHAT: "微信支付",
      ALIPAY: "支付宝",
      BALANCE: "余额",
      OFFLINE: "线下"
    };
    return mapping[channel] ?? channel;
  }
}
