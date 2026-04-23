import { AgentTaskStatus } from "@prisma/client";
import { Type } from "class-transformer";
import {
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmptyObject,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min
} from "class-validator";
import { DEFAULT_AGENT_NAME } from "../agents.constants";

export class CreateAgentTaskDto {
  @IsOptional()
  @IsString()
  agentName: string = DEFAULT_AGENT_NAME;

  @IsString()
  taskType!: string;

  @IsOptional()
  @IsString()
  ownerId?: string;

  @IsOptional()
  @IsString()
  @IsIn(["assistant", "internal-api", "event", "schedule"])
  triggerSource: "assistant" | "internal-api" | "event" | "schedule" =
    "internal-api";

  @IsObject()
  @IsNotEmptyObject()
  payload!: Record<string, unknown>;
}

export class ListAgentTasksQueryDto {
  @IsOptional()
  @IsEnum(AgentTaskStatus)
  status?: AgentTaskStatus;

  @IsOptional()
  @IsString()
  ownerId?: string;

  @IsOptional()
  @IsString()
  agentName?: string;

  @IsOptional()
  @IsString()
  taskType?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit: number = 20;
}
