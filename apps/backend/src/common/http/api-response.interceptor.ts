import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor
} from "@nestjs/common";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";

interface ApiSuccessResponse<T> {
  code: 0;
  message: "ok";
  requestId: string | null;
  data: T;
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
      .getRequest<{ requestId?: string }>();

    return next.handle().pipe(
      map((data) => ({
        code: 0 as const,
        message: "ok" as const,
        requestId: request.requestId ?? null,
        data
      }))
    );
  }
}
