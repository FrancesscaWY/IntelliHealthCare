import { Module } from "@nestjs/common";
import { AdminFilesController, AppFilesController } from "./files.controller";
import { AppFilesService } from "./files.service";

@Module({
  controllers: [AppFilesController, AdminFilesController],
  providers: [AppFilesService]
})
export class FilesModule {}
