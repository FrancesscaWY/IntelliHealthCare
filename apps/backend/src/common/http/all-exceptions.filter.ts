import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus
} from "@nestjs/common";

const BUSINESS_CODE_BY_STATUS = new Map<number, number>([
  [HttpStatus.BAD_REQUEST, 40001],
  [HttpStatus.UNAUTHORIZED, 40003],
  [HttpStatus.FORBIDDEN, 40004],
  [HttpStatus.NOT_FOUND, 40400],
  [HttpStatus.CONFLICT, 40900],
  [HttpStatus.UNPROCESSABLE_ENTITY, 42200],
  [HttpStatus.INTERNAL_SERVER_ERROR, 50000]
]);

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<{
      status: (code: number) => { json: (body: unknown) => void };
    }>();
    const request = ctx.getRequest<{ requestId?: string }>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = "Internal server error";
    let details: unknown = null;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const errorResponse = exception.getResponse();

      if (typeof errorResponse === "string") {
        message = errorResponse;
      } else if (typeof errorResponse === "object" && errorResponse !== null) {
        const payload = errorResponse as {
          message?: string | string[];
          error?: string;
        };

        if (Array.isArray(payload.message)) {
          message = payload.message.join("; ");
        } else if (payload.message) {
          message = payload.message;
        }

        if (payload.error) {
          details = { error: payload.error };
        }
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    response.status(status).json({
      code: BUSINESS_CODE_BY_STATUS.get(status) ?? 50000,
      message,
      requestId: request.requestId ?? null,
      data: details
    });
  }
}
