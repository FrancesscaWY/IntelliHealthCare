import { Module } from "@nestjs/common";
import { AppServiceCatalogController } from "./service-catalog.controller";
import { ServiceCatalogService } from "./service-catalog.service";

@Module({
  controllers: [AppServiceCatalogController],
  providers: [ServiceCatalogService],
  exports: [ServiceCatalogService]
})
export class ServiceCatalogModule {}
