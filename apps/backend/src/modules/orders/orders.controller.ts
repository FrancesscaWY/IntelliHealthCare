import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards
} from "@nestjs/common";
import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min
} from "class-validator";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiProperty,
  ApiPropertyOptional,
  ApiTags
} from "@nestjs/swagger";
import {
  AfterSaleType,
  OrderStatus,
  PaymentChannel,
  ServiceCategory,
  WorkOrderStatus
} from "@prisma/client";
import { CurrentUser } from "../../common/auth/current-user.decorator";
import { JwtAuthGuard } from "../../common/auth/jwt-auth.guard";
import { Roles } from "../../common/auth/roles.decorator";
import { RolesGuard } from "../../common/auth/roles.guard";
import type { AuthenticatedUser } from "../../common/auth/auth.types";
import { PaginationQueryDto } from "../../common/dto/pagination-query.dto";
import { SwaggerTags } from "../../common/http/swagger-tags";
import { OrdersService } from "./orders.service";

class BookingOptionsQueryDto {
  @ApiPropertyOptional({
    description: "服务 ID。预约页通常从服务详情页带入。",
    example: "srv_rehab_stroke"
  })
  @IsOptional()
  @IsString()
  serviceId?: string;
}

class PreviewOrderDto {
  @ApiProperty({
    description: "服务 ID。请先从服务列表或服务详情中获取。",
    example: "srv_rehab_stroke"
  })
  @IsString()
  serviceId!: string;

  @ApiProperty({
    description: "地址 ID。请先从地址列表接口获取。",
    example: "addr_joy_daughter"
  })
  @IsString()
  addressId!: string;

  @ApiPropertyOptional({
    description: "长者用户 ID。家属代长者预约时填写。",
    example: "user_elder_joy"
  })
  @IsOptional()
  @IsString()
  elderId?: string;

  @ApiPropertyOptional({
    description: "预约日期，建议使用 YYYY-MM-DD。",
    example: "2026-04-24"
  })
  @IsOptional()
  @IsString()
  bookingDate?: string;

  @ApiPropertyOptional({
    description: "预约时间段。",
    example: "13:00-15:00"
  })
  @IsOptional()
  @IsString()
  bookingTimeSlot?: string;

  @ApiPropertyOptional({
    description: "优惠券 ID，不使用可不填。",
    example: "coupon_new_user_001"
  })
  @IsOptional()
  @IsString()
  couponId?: string;

  @ApiPropertyOptional({
    description: "备注说明。",
    example: "需要电梯可达，家属会在现场"
  })
  @IsOptional()
  @IsString()
  remark?: string;
}

class CreateOrderDto extends PreviewOrderDto {
  @ApiPropertyOptional({
    description: "联系人姓名。",
    example: "王兰"
  })
  @IsOptional()
  @IsString()
  contactName?: string;

  @ApiPropertyOptional({
    description: "联系人手机号。",
    example: "13900139000"
  })
  @IsOptional()
  @IsString()
  contactPhone?: string;
}

class OrdersQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: "订单状态筛选。",
    enum: OrderStatus,
    example: OrderStatus.PENDING_PAYMENT
  })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;
}

class AdminOrdersQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: "订单状态筛选。",
    enum: OrderStatus,
    example: OrderStatus.PENDING_PAYMENT
  })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @ApiPropertyOptional({
    description: "服务分类筛选。",
    enum: ServiceCategory,
    example: ServiceCategory.HOME_CARE
  })
  @IsOptional()
  @IsEnum(ServiceCategory)
  serviceCategory?: ServiceCategory;

  @ApiPropertyOptional({
    description: "支付渠道筛选。",
    enum: PaymentChannel,
    example: PaymentChannel.ALIPAY
  })
  @IsOptional()
  @IsEnum(PaymentChannel)
  paymentChannel?: PaymentChannel;

  @ApiPropertyOptional({
    description: "关键字，可匹配订单号、服务名称、下单人姓名或手机号。",
    example: "王兰"
  })
  @IsOptional()
  @IsString()
  keyword?: string;
}

class UpdateScheduleDto {
  @ApiProperty({
    description: "新的预约日期。",
    example: "2026-04-25"
  })
  @IsString()
  bookingDate!: string;

  @ApiProperty({
    description: "新的预约时间段。",
    example: "15:00-17:00"
  })
  @IsString()
  bookingTimeSlot!: string;
}

class CancelOrderDto {
  @ApiPropertyOptional({
    description: "取消原因。",
    example: "时间冲突，需要重新预约"
  })
  @IsOptional()
  @IsString()
  reason?: string;
}

class SubmitReviewDto {
  @ApiProperty({
    description: "评分，1 到 5 分。",
    example: 5
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  score!: number;

  @ApiPropertyOptional({
    description: "评价标签。",
    example: ["服务准时", "态度好"]
  })
  @IsOptional()
  @IsArray()
  tags?: string[];

  @ApiPropertyOptional({
    description: "文字评价。",
    example: "服务人员很专业，沟通顺畅。"
  })
  @IsOptional()
  @IsString()
  content?: string;
}

class AfterSaleDto {
  @ApiProperty({
    description: "售后类型。",
    enum: AfterSaleType,
    example: AfterSaleType.REFUND
  })
  @IsEnum(AfterSaleType)
  type!: AfterSaleType;

  @ApiProperty({
    description: "售后原因。",
    example: "服务未按约定时间到达"
  })
  @IsString()
  reason!: string;

  @ApiPropertyOptional({
    description: "售后补充说明。",
    example: "预约 13:00-15:00，实际 16:10 才上门。"
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: "申请金额。",
    example: 299
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  amountRequested?: number;
}

class DispatchOrderDto {
  @ApiPropertyOptional({
    description: "机构 ID。",
    example: "org_shanghai_001"
  })
  @IsOptional()
  @IsString()
  institutionId?: string;

  @ApiPropertyOptional({
    description: "分派员工 ID。",
    example: "staff_caregiver_001"
  })
  @IsOptional()
  @IsString()
  assigneeStaffId?: string;

  @ApiPropertyOptional({
    description: "排班 ID。",
    example: "schedule_20260424_pm"
  })
  @IsOptional()
  @IsString()
  scheduleId?: string;

  @ApiPropertyOptional({
    description: "派单备注。",
    example: "优先安排熟悉康复护理的治疗师"
  })
  @IsOptional()
  @IsString()
  dispatchNote?: string;
}

class UpdateWorkOrderStatusDto {
  @ApiProperty({
    description: "工单状态。",
    enum: WorkOrderStatus,
    example: WorkOrderStatus.SERVING
  })
  @IsEnum(WorkOrderStatus)
  status!: WorkOrderStatus;
}

class AdminWorkOrdersQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: "工单状态筛选。",
    enum: WorkOrderStatus,
    example: WorkOrderStatus.ASSIGNED
  })
  @IsOptional()
  @IsEnum(WorkOrderStatus)
  status?: WorkOrderStatus;

  @ApiPropertyOptional({
    description: "服务分类筛选。",
    enum: ServiceCategory,
    example: ServiceCategory.REHAB_THERAPY
  })
  @IsOptional()
  @IsEnum(ServiceCategory)
  serviceCategory?: ServiceCategory;

  @ApiPropertyOptional({
    description: "关键字，可匹配工单号、订单号、服务标题、客户姓名或手机号。",
    example: "王兰"
  })
  @IsOptional()
  @IsString()
  keyword?: string;
}

class AdminBookingBoardQueryDto {
  @ApiPropertyOptional({
    description: "看板日期，建议 YYYY-MM-DD。",
    example: "2026-04-24"
  })
  @IsOptional()
  @IsString()
  date?: string;

  @ApiPropertyOptional({
    description: "服务类型。",
    example: "康复训练"
  })
  @IsOptional()
  @IsString()
  serviceType?: string;

  @ApiPropertyOptional({
    description: "服务人员 ID。",
    example: "staff_lixiulan"
  })
  @IsOptional()
  @IsString()
  staffId?: string;
}

class UpdateAdminOrderPriceDto {
  @ApiProperty({
    description: "新的应付金额。",
    example: 299
  })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  payableAmount!: number;

  @ApiPropertyOptional({
    description: "改价备注。",
    example: "补贴活动手工减免"
  })
  @IsOptional()
  @IsString()
  remark?: string;
}

class CloseAdminOrderDto {
  @ApiPropertyOptional({
    description: "关单原因。",
    example: "用户主动取消，已线下处理"
  })
  @IsOptional()
  @IsString()
  reason?: string;
}

class SaveAdminOrderRemarkDto {
  @ApiProperty({
    description: "订单备注。",
    example: "用户偏好上午上门，并需提前 30 分钟电话确认。"
  })
  @IsString()
  remark!: string;
}

class AdminAfterSalesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: "售后状态。",
    example: "处理中"
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({
    description: "关键字，可匹配售后单号、订单号、商品标题。",
    example: "AS202604220031"
  })
  @IsOptional()
  @IsString()
  keyword?: string;
}

class AdminAfterSaleDecisionDto {
  @ApiPropertyOptional({
    description: "处理备注。",
    example: "核实服务延迟，按约退款 80 元。"
  })
  @IsOptional()
  @IsString()
  remark?: string;

  @ApiPropertyOptional({
    description: "退款金额。",
    example: 80
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  refundAmount?: number;
}

class AdminOrderReviewsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: "服务类型。",
    example: "家政护工"
  })
  @IsOptional()
  @IsString()
  serviceType?: string;

  @ApiPropertyOptional({
    description: "评分筛选，可传 5、4、3、2。",
    example: 5
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;

  @ApiPropertyOptional({
    description: "是否置顶。",
    example: true
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isPinned?: boolean;
}

class UpdateReviewVisibilityDto {
  @ApiProperty({
    description: "是否显示。",
    example: true
  })
  @Type(() => Boolean)
  @IsBoolean()
  isVisible!: boolean;
}

class UpdateReviewPinDto {
  @ApiProperty({
    description: "是否置顶。",
    example: true
  })
  @Type(() => Boolean)
  @IsBoolean()
  isPinned!: boolean;
}

class AdminOrderReviewBatchDto {
  @ApiProperty({
    description: "评价 ID 列表。",
    example: ["review_rehab_done", "review_exam_done"]
  })
  @IsArray()
  reviewIds!: string[];

  @ApiProperty({
    description: "批量动作。",
    enum: ["SHOW", "HIDE", "PIN", "UNPIN", "DELETE"],
    example: "PIN"
  })
  @IsIn(["SHOW", "HIDE", "PIN", "UNPIN", "DELETE"])
  action!: "SHOW" | "HIDE" | "PIN" | "UNPIN" | "DELETE";
}

@Controller("app/orders")
@UseGuards(JwtAuthGuard)
@ApiTags(SwaggerTags.AppOrders)
@ApiBearerAuth()
export class AppOrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get("booking/options")
  @ApiOperation({
    summary: "获取预约选项",
    description: "预约页进入时先调用，用于回显可约日期、时间段、地址候选等信息。"
  })
  getBookingOptions(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: BookingOptionsQueryDto
  ) {
    return this.ordersService.getBookingOptions(user, query.serviceId);
  }

  @Post("preview")
  @ApiOperation({
    summary: "预览订单",
    description: "订单确认页的核心接口。前端先填 serviceId、addressId、预约时间等信息，再看价格和服务摘要。"
  })
  previewOrder(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: PreviewOrderDto
  ) {
    return this.ordersService.previewOrder(user, body);
  }

  @Post()
  @ApiOperation({
    summary: "创建订单",
    description: "订单确认页点击提交订单时调用。成功后重点查看 data.orderId，支付链路会继续使用。"
  })
  createOrder(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateOrderDto
  ) {
    return this.ordersService.createOrder(user, body);
  }

  @Get()
  @ApiOperation({
    summary: "获取订单列表",
    description: "我的订单页、家政护理订单页等列表接口。orderId 需要从该接口返回中获取。"
  })
  listOrders(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: OrdersQueryDto
  ) {
    return this.ordersService.listOrders(user, query.page, query.pageSize, query.status);
  }

  @Get(":orderId")
  @ApiOperation({
    summary: "获取订单详情",
    description: "订单详情页接口。orderId 请先从订单列表获取。"
  })
  getOrderDetail(
    @CurrentUser() user: AuthenticatedUser,
    @Param("orderId") orderId: string
  ) {
    return this.ordersService.getOrderDetail(user, orderId);
  }

  @Put(":orderId/schedule")
  @ApiOperation({
    summary: "修改预约时间",
    description: "改约页保存接口。"
  })
  updateSchedule(
    @CurrentUser() user: AuthenticatedUser,
    @Param("orderId") orderId: string,
    @Body() body: UpdateScheduleDto
  ) {
    return this.ordersService.updateSchedule(
      user,
      orderId,
      body.bookingDate,
      body.bookingTimeSlot
    );
  }

  @Post(":orderId/cancel")
  @ApiOperation({
    summary: "取消订单",
    description: "订单详情页取消订单动作接口。"
  })
  cancelOrder(
    @CurrentUser() user: AuthenticatedUser,
    @Param("orderId") orderId: string,
    @Body() body: CancelOrderDto
  ) {
    return this.ordersService.cancelOrder(user, orderId, body.reason);
  }

  @Get(":orderId/timeline")
  @ApiOperation({
    summary: "获取订单时间线",
    description: "服务跟踪页接口，用于展示订单从创建到完成的节点记录。"
  })
  getTimeline(
    @CurrentUser() user: AuthenticatedUser,
    @Param("orderId") orderId: string
  ) {
    return this.ordersService.getTimeline(user, orderId);
  }

  @Get(":orderId/voucher")
  @ApiOperation({
    summary: "获取服务凭证",
    description: "订单详情或服务跟踪页接口。"
  })
  getVoucher(
    @CurrentUser() user: AuthenticatedUser,
    @Param("orderId") orderId: string
  ) {
    return this.ordersService.getVoucher(user, orderId);
  }

  @Get(":orderId/service-records")
  @ApiOperation({
    summary: "获取服务记录",
    description: "服务记录页接口。"
  })
  getServiceRecords(
    @CurrentUser() user: AuthenticatedUser,
    @Param("orderId") orderId: string
  ) {
    return this.ordersService.getServiceRecords(user, orderId);
  }

  @Get(":orderId/assessment-report")
  @ApiOperation({
    summary: "获取评估报告",
    description: "评估报告页接口。"
  })
  getAssessmentReport(
    @CurrentUser() user: AuthenticatedUser,
    @Param("orderId") orderId: string
  ) {
    return this.ordersService.getReportByType(user, orderId, "ASSESSMENT");
  }

  @Get(":orderId/rehab-report")
  @ApiOperation({
    summary: "获取康复报告",
    description: "康复报告页接口。"
  })
  getRehabReport(
    @CurrentUser() user: AuthenticatedUser,
    @Param("orderId") orderId: string
  ) {
    return this.ordersService.getReportByType(user, orderId, "REHAB");
  }

  @Post(":orderId/reviews")
  @ApiOperation({
    summary: "提交订单评价",
    description: "评价弹窗或评价页提交接口。"
  })
  submitReview(
    @CurrentUser() user: AuthenticatedUser,
    @Param("orderId") orderId: string,
    @Body() body: SubmitReviewDto
  ) {
    return this.ordersService.submitReview(user, orderId, body);
  }

  @Get(":orderId/reviews")
  @ApiOperation({
    summary: "获取订单评价",
    description: "订单详情页回显已评价内容时调用。"
  })
  getReview(
    @CurrentUser() user: AuthenticatedUser,
    @Param("orderId") orderId: string
  ) {
    return this.ordersService.getReview(user, orderId);
  }

  @Post(":orderId/after-sales")
  @ApiOperation({
    summary: "提交售后申请",
    description: "订单详情页售后申请接口。"
  })
  createAfterSale(
    @CurrentUser() user: AuthenticatedUser,
    @Param("orderId") orderId: string,
    @Body() body: AfterSaleDto
  ) {
    return this.ordersService.createAfterSale(user, orderId, body);
  }

  @Get(":orderId/after-sales")
  @ApiOperation({
    summary: "获取售后记录",
    description: "查看订单售后进度时调用。"
  })
  getAfterSales(
    @CurrentUser() user: AuthenticatedUser,
    @Param("orderId") orderId: string
  ) {
    return this.ordersService.getAfterSales(user, orderId);
  }
}

@Controller("admin")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("PLATFORM_ADMIN", "ORG_MANAGER", "DOCTOR", "CAREGIVER", "THERAPIST", "CUSTOMER_SERVICE")
@ApiTags(SwaggerTags.AdminOrders)
@ApiBearerAuth()
export class AdminOrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get("dashboard/overview")
  @ApiOperation({
    summary: "获取后台履约总览",
    description: "dashboard/overview 页面接口。"
  })
  getDashboardOverview() {
    return this.ordersService.getAdminDashboardOverview();
  }

  @Get("booking-board")
  @ApiOperation({
    summary: "获取预约看板",
    description: "dashboard/booking-board 页面接口。"
  })
  getBookingBoard(@Query() query: AdminBookingBoardQueryDto) {
    return this.ordersService.getAdminBookingBoard(
      query.date,
      query.serviceType,
      query.staffId
    );
  }

  @Get("orders")
  @ApiOperation({
    summary: "后台获取订单列表",
    description: "后台订单管理页接口，可按状态筛选。"
  })
  listOrders(@Query() query: AdminOrdersQueryDto) {
    return this.ordersService.listAdminOrders(
      query.page,
      query.pageSize,
      query.status,
      query.serviceCategory,
      query.paymentChannel,
      query.keyword
    );
  }

  @Get("orders/:orderId")
  @ApiOperation({
    summary: "后台获取订单详情",
    description: "后台订单详情页接口。"
  })
  getOrderDetail(@Param("orderId") orderId: string) {
    return this.ordersService.getAdminOrderDetail(orderId);
  }

  @Put("orders/:orderId/price")
  @ApiOperation({
    summary: "后台修改订单价格",
    description: "后台订单详情页改价动作接口。"
  })
  updateOrderPrice(
    @CurrentUser() user: AuthenticatedUser,
    @Param("orderId") orderId: string,
    @Body() body: UpdateAdminOrderPriceDto
  ) {
    return this.ordersService.updateAdminOrderPrice(
      user,
      orderId,
      body.payableAmount,
      body.remark
    );
  }

  @Post("orders/:orderId/close")
  @ApiOperation({
    summary: "后台关闭订单",
    description: "后台订单详情页关闭订单动作接口。"
  })
  closeOrder(
    @CurrentUser() user: AuthenticatedUser,
    @Param("orderId") orderId: string,
    @Body() body: CloseAdminOrderDto
  ) {
    return this.ordersService.closeAdminOrder(user, orderId, body.reason);
  }

  @Post("orders/:orderId/remark")
  @ApiOperation({
    summary: "保存订单备注",
    description: "后台订单详情页备注保存接口。"
  })
  saveOrderRemark(
    @CurrentUser() user: AuthenticatedUser,
    @Param("orderId") orderId: string,
    @Body() body: SaveAdminOrderRemarkDto
  ) {
    return this.ordersService.saveAdminOrderRemark(user, orderId, body.remark);
  }

  @Get("orders/:orderId/timeline")
  @ApiOperation({
    summary: "获取后台订单时间线",
    description: "后台订单详情页时间线接口。"
  })
  getOrderTimeline(@Param("orderId") orderId: string) {
    return this.ordersService.getAdminOrderTimeline(orderId);
  }

  @Post("orders/:orderId/dispatch")
  @ApiOperation({
    summary: "后台派单",
    description: "后台分派服务机构、员工或排班时调用。"
  })
  dispatchOrder(
    @CurrentUser() user: AuthenticatedUser,
    @Param("orderId") orderId: string,
    @Body() body: DispatchOrderDto
  ) {
    return this.ordersService.dispatchOrder(user, orderId, body);
  }

  @Get("work-orders")
  @ApiOperation({
    summary: "获取后台工单列表",
    description: "dashboard/work-order 页面接口。"
  })
  listWorkOrders(@Query() query: AdminWorkOrdersQueryDto) {
    return this.ordersService.listAdminWorkOrders(
      query.page,
      query.pageSize,
      query.status,
      query.serviceCategory,
      query.keyword
    );
  }

  @Get("work-orders/:workOrderId")
  @ApiOperation({
    summary: "获取后台工单详情",
    description: "工单详情接口。"
  })
  getWorkOrderDetail(@Param("workOrderId") workOrderId: string) {
    return this.ordersService.getAdminWorkOrderDetail(workOrderId);
  }

  @Put("work-orders/:workOrderId/status")
  @ApiOperation({
    summary: "更新工单状态",
    description: "后台工单执行过程中的状态流转接口。"
  })
  updateWorkOrderStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param("workOrderId") workOrderId: string,
    @Body() body: UpdateWorkOrderStatusDto
  ) {
    return this.ordersService.updateWorkOrderStatus(user, workOrderId, body.status);
  }

  @Get("after-sales")
  @ApiOperation({
    summary: "获取售后列表",
    description: "dashboard/after-sale 页面接口。"
  })
  listAfterSales(@Query() query: AdminAfterSalesQueryDto) {
    return this.ordersService.listAdminAfterSales(
      query.page,
      query.pageSize,
      query.status,
      query.keyword
    );
  }

  @Get("after-sales/:afterSaleId")
  @ApiOperation({
    summary: "获取售后详情",
    description: "dashboard/after-sale-detail 页面接口。"
  })
  getAfterSaleDetail(@Param("afterSaleId") afterSaleId: string) {
    return this.ordersService.getAdminAfterSaleDetail(afterSaleId);
  }

  @Put("after-sales/:afterSaleId/approve")
  @ApiOperation({
    summary: "同意售后退款",
    description: "后台售后同意退款动作接口。"
  })
  approveAfterSale(
    @CurrentUser() user: AuthenticatedUser,
    @Param("afterSaleId") afterSaleId: string,
    @Body() body: AdminAfterSaleDecisionDto
  ) {
    return this.ordersService.approveAdminAfterSale(
      user,
      afterSaleId,
      body.remark,
      body.refundAmount
    );
  }

  @Put("after-sales/:afterSaleId/reject")
  @ApiOperation({
    summary: "驳回售后申请",
    description: "后台售后驳回动作接口。"
  })
  rejectAfterSale(
    @CurrentUser() user: AuthenticatedUser,
    @Param("afterSaleId") afterSaleId: string,
    @Body() body: AdminAfterSaleDecisionDto
  ) {
    return this.ordersService.rejectAdminAfterSale(user, afterSaleId, body.remark);
  }

  @Put("after-sales/:afterSaleId/close")
  @ApiOperation({
    summary: "关闭售后申请",
    description: "后台售后关闭动作接口。"
  })
  closeAfterSale(
    @CurrentUser() user: AuthenticatedUser,
    @Param("afterSaleId") afterSaleId: string,
    @Body() body: AdminAfterSaleDecisionDto
  ) {
    return this.ordersService.closeAdminAfterSale(user, afterSaleId, body.remark);
  }

  @Get("order-reviews")
  @ApiOperation({
    summary: "获取评价管理列表",
    description: "dashboard/comment-management 页面接口。"
  })
  listOrderReviews(@Query() query: AdminOrderReviewsQueryDto) {
    return this.ordersService.listAdminOrderReviews(
      query.page,
      query.pageSize,
      query.serviceType,
      query.rating,
      query.isPinned
    );
  }

  @Get("order-reviews/:reviewId")
  @ApiOperation({
    summary: "获取评价详情",
    description: "评价详情接口。"
  })
  getOrderReviewDetail(@Param("reviewId") reviewId: string) {
    return this.ordersService.getAdminOrderReviewDetail(reviewId);
  }

  @Put("order-reviews/:reviewId/visibility")
  @ApiOperation({
    summary: "更新评价显示状态",
    description: "评价管理显示/隐藏接口。"
  })
  updateReviewVisibility(
    @Param("reviewId") reviewId: string,
    @Body() body: UpdateReviewVisibilityDto
  ) {
    return this.ordersService.updateAdminOrderReviewVisibility(
      reviewId,
      body.isVisible
    );
  }

  @Put("order-reviews/:reviewId/pin")
  @ApiOperation({
    summary: "更新评价置顶状态",
    description: "评价管理置顶/取消置顶接口。"
  })
  updateReviewPin(
    @Param("reviewId") reviewId: string,
    @Body() body: UpdateReviewPinDto
  ) {
    return this.ordersService.updateAdminOrderReviewPin(reviewId, body.isPinned);
  }

  @Delete("order-reviews/:reviewId")
  @ApiOperation({
    summary: "删除评价",
    description: "评价管理删除接口，当前实现为软删除。"
  })
  deleteReview(@Param("reviewId") reviewId: string) {
    return this.ordersService.deleteAdminOrderReview(reviewId);
  }

  @Post("order-reviews/batch")
  @ApiOperation({
    summary: "批量处理评价",
    description: "评价管理批量显示、隐藏、置顶或删除接口。"
  })
  batchOperateReviews(@Body() body: AdminOrderReviewBatchDto) {
    return this.ordersService.batchOperateAdminOrderReviews(
      body.reviewIds,
      body.action
    );
  }
}
