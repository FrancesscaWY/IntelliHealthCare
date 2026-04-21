import {
  Body,
  Controller,
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
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min
} from "class-validator";
import { AfterSaleType, OrderStatus, WorkOrderStatus } from "@prisma/client";
import { CurrentUser } from "../../common/auth/current-user.decorator";
import { JwtAuthGuard } from "../../common/auth/jwt-auth.guard";
import { Roles } from "../../common/auth/roles.decorator";
import { RolesGuard } from "../../common/auth/roles.guard";
import type { AuthenticatedUser } from "../../common/auth/auth.types";
import { PaginationQueryDto } from "../../common/dto/pagination-query.dto";
import { OrdersService } from "./orders.service";

class BookingOptionsQueryDto {
  @IsOptional()
  @IsString()
  serviceId?: string;
}

class PreviewOrderDto {
  @IsString()
  serviceId!: string;

  @IsString()
  addressId!: string;

  @IsOptional()
  @IsString()
  elderId?: string;

  @IsOptional()
  @IsString()
  bookingDate?: string;

  @IsOptional()
  @IsString()
  bookingTimeSlot?: string;

  @IsOptional()
  @IsString()
  couponId?: string;

  @IsOptional()
  @IsString()
  remark?: string;
}

class CreateOrderDto extends PreviewOrderDto {
  @IsOptional()
  @IsString()
  contactName?: string;

  @IsOptional()
  @IsString()
  contactPhone?: string;
}

class OrdersQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;
}

class UpdateScheduleDto {
  @IsString()
  bookingDate!: string;

  @IsString()
  bookingTimeSlot!: string;
}

class CancelOrderDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

class SubmitReviewDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  score!: number;

  @IsOptional()
  @IsArray()
  tags?: string[];

  @IsOptional()
  @IsString()
  content?: string;
}

class AfterSaleDto {
  @IsEnum(AfterSaleType)
  type!: AfterSaleType;

  @IsString()
  reason!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  amountRequested?: number;
}

class DispatchOrderDto {
  @IsOptional()
  @IsString()
  institutionId?: string;

  @IsOptional()
  @IsString()
  assigneeStaffId?: string;

  @IsOptional()
  @IsString()
  scheduleId?: string;

  @IsOptional()
  @IsString()
  dispatchNote?: string;
}

class UpdateWorkOrderStatusDto {
  @IsEnum(WorkOrderStatus)
  status!: WorkOrderStatus;
}

@Controller("app/orders")
@UseGuards(JwtAuthGuard)
export class AppOrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get("booking/options")
  getBookingOptions(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: BookingOptionsQueryDto
  ) {
    return this.ordersService.getBookingOptions(user, query.serviceId);
  }

  @Post("preview")
  previewOrder(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: PreviewOrderDto
  ) {
    return this.ordersService.previewOrder(user, body);
  }

  @Post()
  createOrder(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateOrderDto
  ) {
    return this.ordersService.createOrder(user, body);
  }

  @Get()
  listOrders(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: OrdersQueryDto
  ) {
    return this.ordersService.listOrders(user, query.page, query.pageSize, query.status);
  }

  @Get(":orderId")
  getOrderDetail(
    @CurrentUser() user: AuthenticatedUser,
    @Param("orderId") orderId: string
  ) {
    return this.ordersService.getOrderDetail(user, orderId);
  }

  @Put(":orderId/schedule")
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
  cancelOrder(
    @CurrentUser() user: AuthenticatedUser,
    @Param("orderId") orderId: string,
    @Body() body: CancelOrderDto
  ) {
    return this.ordersService.cancelOrder(user, orderId, body.reason);
  }

  @Get(":orderId/timeline")
  getTimeline(
    @CurrentUser() user: AuthenticatedUser,
    @Param("orderId") orderId: string
  ) {
    return this.ordersService.getTimeline(user, orderId);
  }

  @Get(":orderId/voucher")
  getVoucher(
    @CurrentUser() user: AuthenticatedUser,
    @Param("orderId") orderId: string
  ) {
    return this.ordersService.getVoucher(user, orderId);
  }

  @Get(":orderId/service-records")
  getServiceRecords(
    @CurrentUser() user: AuthenticatedUser,
    @Param("orderId") orderId: string
  ) {
    return this.ordersService.getServiceRecords(user, orderId);
  }

  @Get(":orderId/assessment-report")
  getAssessmentReport(
    @CurrentUser() user: AuthenticatedUser,
    @Param("orderId") orderId: string
  ) {
    return this.ordersService.getReportByType(user, orderId, "ASSESSMENT");
  }

  @Get(":orderId/rehab-report")
  getRehabReport(
    @CurrentUser() user: AuthenticatedUser,
    @Param("orderId") orderId: string
  ) {
    return this.ordersService.getReportByType(user, orderId, "REHAB");
  }

  @Post(":orderId/reviews")
  submitReview(
    @CurrentUser() user: AuthenticatedUser,
    @Param("orderId") orderId: string,
    @Body() body: SubmitReviewDto
  ) {
    return this.ordersService.submitReview(user, orderId, body);
  }

  @Get(":orderId/reviews")
  getReview(
    @CurrentUser() user: AuthenticatedUser,
    @Param("orderId") orderId: string
  ) {
    return this.ordersService.getReview(user, orderId);
  }

  @Post(":orderId/after-sales")
  createAfterSale(
    @CurrentUser() user: AuthenticatedUser,
    @Param("orderId") orderId: string,
    @Body() body: AfterSaleDto
  ) {
    return this.ordersService.createAfterSale(user, orderId, body);
  }

  @Get(":orderId/after-sales")
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
export class AdminOrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get("orders")
  listOrders(@Query() query: OrdersQueryDto) {
    return this.ordersService.listAdminOrders(query.page, query.pageSize, query.status);
  }

  @Get("orders/:orderId")
  getOrderDetail(@Param("orderId") orderId: string) {
    return this.ordersService.getAdminOrderDetail(orderId);
  }

  @Post("orders/:orderId/dispatch")
  dispatchOrder(
    @CurrentUser() user: AuthenticatedUser,
    @Param("orderId") orderId: string,
    @Body() body: DispatchOrderDto
  ) {
    return this.ordersService.dispatchOrder(user, orderId, body);
  }

  @Put("work-orders/:workOrderId/status")
  updateWorkOrderStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param("workOrderId") workOrderId: string,
    @Body() body: UpdateWorkOrderStatusDto
  ) {
    return this.ordersService.updateWorkOrderStatus(user, workOrderId, body.status);
  }
}
