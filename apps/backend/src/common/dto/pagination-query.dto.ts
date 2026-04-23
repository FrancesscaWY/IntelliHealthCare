import { Type } from "class-transformer";
import { IsInt, IsOptional, Max, Min } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class PaginationQueryDto {
  @ApiPropertyOptional({
    type: Number,
    description: "页码，从 1 开始。列表页首次联调时通常填写 1。",
    example: 1
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({
    type: Number,
    description: "每页条数，默认 20，最大 100。前端联调建议先用 10 或 20。",
    example: 20
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize: number = 20;
}
