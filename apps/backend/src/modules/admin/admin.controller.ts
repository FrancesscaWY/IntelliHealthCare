import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import { Roles } from "../../common/auth/roles.decorator";
import { RolesGuard } from "../../common/auth/roles.guard";
import { JwtAuthGuard } from "../../common/auth/jwt-auth.guard";
import { PaginationQueryDto } from "../../common/dto/pagination-query.dto";
import { AdminService } from "./admin.service";

@Controller("admin")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("PLATFORM_ADMIN", "ORG_MANAGER", "DOCTOR", "CAREGIVER", "THERAPIST", "CUSTOMER_SERVICE")
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get("dashboard/overview")
  getDashboardOverview() {
    return this.adminService.getDashboardOverview();
  }

  @Get("elders/:elderId")
  getElderDetail(@Param("elderId") elderId: string) {
    return this.adminService.getElderDetail(elderId);
  }

  @Get("work-orders")
  listWorkOrders(@Query() query: PaginationQueryDto) {
    return this.adminService.listWorkOrders(query.page, query.pageSize);
  }
}
