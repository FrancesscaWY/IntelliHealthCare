import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { SwaggerTags } from "../../common/http/swagger-tags";
import { SystemService } from "./system.service";

@ApiTags(SwaggerTags.SystemHealth)
@Controller("system")
export class SystemController {
  constructor(private readonly systemService: SystemService) {}

  @Get("health")
  @ApiOperation({
    summary: "获取服务健康状态",
    description: "前端第一次打开 Swagger 后建议先执行该接口，确认联调环境是否可用。"
  })
  getHealth() {
    return this.systemService.getHealth();
  }

  @Get("architecture")
  @ApiOperation({
    summary: "获取系统架构摘要",
    description: "用于查看当前服务模块、依赖和整体架构信息，一般用于排查和说明。"
  })
  getArchitecture() {
    return this.systemService.getArchitecture();
  }
}
