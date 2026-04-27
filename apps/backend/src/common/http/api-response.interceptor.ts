import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor
} from "@nestjs/common";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";
import { normalizeApiMediaPayload } from "../utils/media-response";

interface ApiSuccessResponse<T> {
  code: 0;
  message: "ok";
  requestId: string | null;
  data: T;
}

type ApiRequestHeaders = Record<string, string | string[] | undefined>;

type ApiRequest = {
  requestId?: string;
  originalUrl?: string;
  url?: string;
  protocol?: string;
  headers?: ApiRequestHeaders;
  socket?: {
    encrypted?: boolean;
  };
};

function shouldDisableDemoContentImageFallback(pathname: string) {
  return /(?:^|\/)app\/content\/(?:news|lectures)(?:\/|$)/.test(pathname);
}

function readFirstHeader(headers: ApiRequestHeaders | undefined, key: string) {
  const value = headers?.[key];

  if (Array.isArray(value)) {
    return value[0]?.split(",")[0]?.trim() ?? "";
  }

  return value?.split(",")[0]?.trim() ?? "";
}

function resolveAbsoluteBaseUrl(request: ApiRequest) {
  const protocol =
    readFirstHeader(request.headers, "x-forwarded-proto") ||
    request.protocol ||
    (request.socket?.encrypted ? "https" : "http");
  const host =
    readFirstHeader(request.headers, "x-forwarded-host") ||
    readFirstHeader(request.headers, "host");

  if (!host) {
    return undefined;
  }

  return `${protocol}://${host}`;
}

@Injectable()
export class ApiResponseInterceptor<T>
  implements NestInterceptor<T, ApiSuccessResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>
  ): Observable<ApiSuccessResponse<T>> {
    const request = context
      .switchToHttp()
      .getRequest<ApiRequest>();
    const requestPath = (request.originalUrl ?? request.url ?? "").split("?")[0];
    const absoluteBaseUrl = resolveAbsoluteBaseUrl(request);

    return next.handle().pipe(
      map((data) => ({
        code: 0 as const,
        message: "ok" as const,
        requestId: request.requestId ?? null,
        data: normalizeApiMediaPayload(data, {
          disableDemoContentImageFallback:
            shouldDisableDemoContentImageFallback(requestPath),
          absoluteBaseUrl,
        }),
      }))
    );
  }
}
