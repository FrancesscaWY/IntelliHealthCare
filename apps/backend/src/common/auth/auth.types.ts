import type { UserType } from "@prisma/client";

export type AuthScope = "app" | "admin";

export interface AuthenticatedUser {
  id: string;
  phone: string;
  type: UserType;
  roles: string[];
  scope: AuthScope;
  realName: string | null;
}

export interface AccessTokenPayload {
  sub: string;
  phone: string;
  type: UserType;
  roles: string[];
  scope: AuthScope;
  realName: string | null;
}
