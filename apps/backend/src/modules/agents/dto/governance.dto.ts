import { Transform, Type } from "class-transformer";
import {
  IsArray,
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min
} from "class-validator";
import { AgentHumanReviewStatus, RagEvalRunStatus } from "@prisma/client";

function parseStringList(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return undefined;
}

export class ListAgentReviewsQueryDto {
  @IsOptional()
  @IsEnum(AgentHumanReviewStatus)
  status?: AgentHumanReviewStatus;

  @IsOptional()
  @IsString()
  queueName?: string;

  @IsOptional()
  @IsString()
  agentTaskId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;
}

export class ResolveAgentReviewDto {
  @IsIn(["approved", "rejected", "blocked"])
  @IsString()
  @IsNotEmpty()
  decision!: "approved" | "rejected" | "blocked";

  @IsOptional()
  @Transform(({ value }) => parseStringList(value))
  @IsArray()
  @IsString({ each: true })
  notes?: string[];

  @IsOptional()
  @IsString()
  blockedAction?: string;
}

export class ListAgentAuditLogsQueryDto {
  @IsOptional()
  @IsString()
  agentTaskId?: string;

  @IsOptional()
  @IsString()
  humanReviewId?: string;

  @IsOptional()
  @IsString()
  eventType?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit: number = 50;
}

export class ListRagEvalRunsQueryDto {
  @IsOptional()
  @IsEnum(RagEvalRunStatus)
  status?: RagEvalRunStatus;

  @IsOptional()
  @IsString()
  datasetName?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;
}
