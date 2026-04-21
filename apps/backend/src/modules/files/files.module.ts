import { Module } from "@nestjs/common";
import { AppFilesController } from "./files.controller";
import { AppFilesService } from "./files.service";

@Module({
  controllers: [AppFilesController],
  providers: [AppFilesService]
})
export class FilesModule {}
