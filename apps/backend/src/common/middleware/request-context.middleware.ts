import { Injectable, NestMiddleware } from "@nestjs/common";
import { randomUUID } from "node:crypto";

const REQUEST_ID_HEADER = "x-request-id";

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  use(
    request: { headers: Record<string, string | string[] | undefined>; requestId?: string },
    response: { setHeader: (name: string, value: string) => void },
    next: () => void
  ) {
    const headerValue = request.headers[REQUEST_ID_HEADER];
    const requestId =
      typeof headerValue === "string" && headerValue.trim().length > 0
        ? headerValue
        : randomUUID();

    request.requestId = requestId;
    response.setHeader(REQUEST_ID_HEADER, requestId);
    next();
  }
}
