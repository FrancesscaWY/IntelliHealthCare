import { Controller, Get } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { SystemService } from "./system.service";

@ApiTags("system")
@Controller("system")
export class SystemController {
  constructor(private readonly systemService: SystemService) {}

  @Get("health")
  getHealth() {
    return this.systemService.getHealth();
  }

  @Get("architecture")
  getArchitecture() {
    return this.systemService.getArchitecture();
  }
}
