import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class RequestPerformanceInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RequestPerformanceInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const startedAt = Date.now();
    const http = context.switchToHttp();
    const request = http.getRequest<any>();
    const response = http.getResponse<any>();

    const method = request?.method ?? 'UNKNOWN';
    const path = request?.originalUrl ?? request?.url ?? 'unknown';
    const actorKind = request?.user?.actorKind ?? 'ANON';
    const role = request?.user?.role ?? '-';
    const actorId = request?.user?.userId ?? '-';
    const branchCode = request?.user?.branchCode ?? '-';

    return next.handle().pipe(
      tap({
        next: () => {
          this.logRequest({
            method,
            path,
            actorKind,
            role,
            actorId,
            branchCode,
            statusCode: response?.statusCode ?? 200,
            durationMs: Date.now() - startedAt,
          });
        },
        error: (error) => {
          this.logRequest({
            method,
            path,
            actorKind,
            role,
            actorId,
            branchCode,
            statusCode: error?.status ?? response?.statusCode ?? 500,
            durationMs: Date.now() - startedAt,
            isError: true,
          });
        },
      }),
    );
  }

  private logRequest(input: {
    method: string;
    path: string;
    actorKind: string;
    role: string;
    actorId: string;
    branchCode: string;
    statusCode: number;
    durationMs: number;
    isError?: boolean;
  }) {
    const message =
      `${input.method} ${input.path} ` +
      `status=${input.statusCode} durationMs=${input.durationMs} ` +
      `actorKind=${input.actorKind} role=${input.role} actorId=${input.actorId} branchCode=${input.branchCode}`;

    if (input.isError || input.durationMs >= 1000) {
      this.logger.warn(message);
      return;
    }

    if (input.durationMs >= 300) {
      this.logger.log(message);
    }
  }
}
