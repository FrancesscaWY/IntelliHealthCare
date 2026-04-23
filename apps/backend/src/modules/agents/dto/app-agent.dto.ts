import { Transform, Type } from "class-transformer";
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min
} from "class-validator";
import { ServiceCategory } from "@prisma/client";
import { PaginationQueryDto } from "../../../common/dto/pagination-query.dto";

export class CreateAssistantConversationDto {
  @IsOptional()
  @IsString()
  topic?: string;

  @IsOptional()
  @IsString()
  welcomeMessage?: string;
}

export class SendAssistantMessageDto {
  @IsString()
  @IsNotEmpty()
  content!: string;

  @IsOptional()
  @IsString()
  pageId?: string;

  @IsOptional()
  @IsString()
  route?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class ServiceRecommendationDto {
  @IsOptional()
  @IsString()
  elderId?: string;

  @IsOptional()
  @IsString()
  query?: string;

  @IsOptional()
  @IsEnum(ServiceCategory)
  category?: ServiceCategory;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  limit?: number;
}

export class ResourceConstraintDto {
  @IsString()
  @IsNotEmpty()
  key!: string;

  @IsString()
  @IsNotEmpty()
  value!: string;
}

export class OrderPrefillDto {
  @IsOptional()
  @IsString()
  elderId?: string;

  @IsOptional()
  @IsString()
  orderId?: string;

  @IsOptional()
  @IsString()
  serviceRequest?: string;

  @IsOptional()
  @IsString()
  healthContextRef?: string;

  @IsOptional()
  @IsArray()
  resourceConstraints?: ResourceConstraintDto[];
}

export class AiHealthSummaryQueryDto {
  @IsOptional()
  @IsString()
  elderId?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (Array.isArray(value)) {
      return value.map((item) => String(item)).filter(Boolean);
    }
    if (typeof value === "string") {
      return value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }
    return undefined;
  })
  @IsArray()
  @IsString({ each: true })
  metricTypes?: string[];
}

export class AiRiskAlertsQueryDto extends PaginationQueryDto {}
