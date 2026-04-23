import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { AuthenticatedUser } from "./auth.types";

export const CurrentUser = createParamDecorator(
  (
    field: keyof AuthenticatedUser | undefined,
    context: ExecutionContext
  ): AuthenticatedUser | AuthenticatedUser[keyof AuthenticatedUser] | undefined => {
    const request = context
      .switchToHttp()
      .getRequest<{ user?: AuthenticatedUser }>();

    if (!field) {
      return request.user;
    }

    return request.user?.[field];
  }
);
