import { Transform, Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min
} from "class-validator";
import {
  RagKnowledgeType,
  RagVisibilityScope
} from "@prisma/client";

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

function parseBoolean(value: unknown) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    return value === "true";
  }

  return undefined;
}

export class AppRagSearchQueryDto {
  @IsString()
  @IsNotEmpty()
  query!: string;

  @IsOptional()
  @IsString()
  elderId?: string;

  @IsOptional()
  @Transform(({ value }) => parseBoolean(value))
  @IsBoolean()
  includePrivate?: boolean;

  @IsOptional()
  @Transform(({ value }) => parseStringList(value))
  @IsArray()
  @IsEnum(RagKnowledgeType, { each: true })
  knowledgeTypes?: RagKnowledgeType[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(8)
  limit = 5;
}

export class InternalRagSearchDto {
  @IsString()
  @IsNotEmpty()
  query!: string;

  @IsOptional()
  @IsString()
  ownerUserId?: string;

  @IsOptional()
  @IsString()
  institutionId?: string;

  @IsOptional()
  @Transform(({ value }) => parseStringList(value))
  @IsArray()
  @IsEnum(RagKnowledgeType, { each: true })
  knowledgeTypes?: RagKnowledgeType[];

  @IsOptional()
  @Transform(({ value }) => parseStringList(value))
  @IsArray()
  @IsEnum(RagVisibilityScope, { each: true })
  visibilityScopes?: RagVisibilityScope[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  limit = 8;
}

export class InternalRagKnowledgeBaseQueryDto {
  @IsOptional()
  @IsString()
  ownerUserId?: string;

  @IsOptional()
  @IsString()
  institutionId?: string;

  @IsOptional()
  @Transform(({ value }) => parseStringList(value))
  @IsArray()
  @IsEnum(RagKnowledgeType, { each: true })
  knowledgeTypes?: RagKnowledgeType[];

  @IsOptional()
  @Transform(({ value }) => parseStringList(value))
  @IsArray()
  @IsEnum(RagVisibilityScope, { each: true })
  visibilityScopes?: RagVisibilityScope[];
}
