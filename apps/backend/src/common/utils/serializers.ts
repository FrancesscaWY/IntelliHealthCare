import { Prisma } from "@prisma/client";

export function toNumber(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  if (typeof value === "object" && value !== null && "toString" in value) {
    const parsed = Number(String(value));
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

export function toDateString(value: Date | string | null | undefined) {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  return date.toISOString().slice(0, 10);
}

export function toDateTimeString(value: Date | string | null | undefined) {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  return date.toISOString();
}

export function getAge(value: Date | string | null | undefined) {
  if (!value) {
    return null;
  }

  const birthday = value instanceof Date ? value : new Date(value);
  const today = new Date();
  let age = today.getUTCFullYear() - birthday.getUTCFullYear();
  const hasHadBirthday =
    today.getUTCMonth() > birthday.getUTCMonth() ||
    (today.getUTCMonth() === birthday.getUTCMonth() &&
      today.getUTCDate() >= birthday.getUTCDate());

  if (!hasHadBirthday) {
    age -= 1;
  }

  return age;
}

export function paginate<T>(
  list: T[],
  page: number,
  pageSize: number
) {
  const start = (page - 1) * pageSize;
  const sliced = list.slice(start, start + pageSize);

  return {
    list: sliced,
    page,
    pageSize,
    total: list.length,
    hasMore: start + pageSize < list.length
  };
}

export function ensureRecord(value: unknown): Record<string, unknown> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

export function ensureArray<T = unknown>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export function toPrismaJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

export function toPrismaNullableJson(
  value: unknown
): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return Prisma.JsonNull;
  }

  return value as Prisma.InputJsonValue;
}
