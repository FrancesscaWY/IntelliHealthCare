import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from "class-validator";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { FileCategory } from "@prisma/client";
import { CurrentUser } from "../../common/auth/current-user.decorator";
import { JwtAuthGuard } from "../../common/auth/jwt-auth.guard";
import { AppFilesService } from "./files.service";

class PresignUploadDto {
  @IsEnum(FileCategory)
  category!: FileCategory;

  @IsString()
  fileName!: string;

  @IsString()
  mimeType!: string;

  @IsInt()
  @Min(1)
  @Max(20 * 1024 * 1024)
  size!: number;
}

class CompleteUploadDto {
  @IsEnum(FileCategory)
  category!: FileCategory;

  @IsString()
  fileName!: string;

  @IsString()
  objectKey!: string;

  @IsString()
  mimeType!: string;

  @IsInt()
  @Min(1)
  @Max(20 * 1024 * 1024)
  size!: number;

  @IsOptional()
  metadata?: Record<string, unknown>;
}

@ApiTags("文件上传")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("app/files")
export class AppFilesController {
  constructor(private readonly filesService: AppFilesService) {}

  @Post("presign")
  @ApiOperation({ summary: "获取上传凭证" })
  createPresign(
    @CurrentUser("id") userId: string,
    @Body() body: PresignUploadDto
  ) {
    return this.filesService.createPresign(userId, body);
  }

  @Post("complete")
  @ApiOperation({ summary: "通知上传完成并落库" })
  completeUpload(
    @CurrentUser("id") userId: string,
    @Body() body: CompleteUploadDto
  ) {
    return this.filesService.completeUpload(userId, body);
  }

  @Get(":fileId")
  @ApiOperation({ summary: "获取文件信息" })
  getFileInfo(
    @CurrentUser("id") userId: string,
    @Param("fileId") fileId: string
  ) {
    return this.filesService.getFileInfo(userId, fileId);
  }
}
