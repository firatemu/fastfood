import type { ErrorEnvelope } from '@fastfood/contracts';
import { getRequestContext } from '@fastfood/observability';
import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { v7 as uuidv7 } from 'uuid';

/**
 * Translates every error thrown by the Nest application into the canonical
 * error envelope from document 40 §4. Internal stack traces and provider
 * secrets are never exposed to clients.
 */
@Catch()
export class AppExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(AppExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const reply = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest>();
    const ctxReq = getRequestContext();
    const requestId = ctxReq?.requestId ?? request.id ?? uuidv7();

    const { status, body } = this.toEnvelope(exception, requestId);

    if (status >= 500) {
      this.logger.error(
        {
          requestId,
          url: request.url,
          method: request.method,
          err:
            exception instanceof Error
              ? { message: exception.message, name: exception.name }
              : exception,
        },
        'unhandled exception',
      );
    }

    void reply.status(status).send(body);
  }

  private toEnvelope(
    exception: unknown,
    requestId: string,
  ): { status: number; body: ErrorEnvelope } {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();
      if (
        typeof response === 'object' &&
        response !== null &&
        'code' in response &&
        'message' in response
      ) {
        const r = response as { code?: unknown; message?: unknown; details?: unknown };
        return {
          status,
          body: {
            error: {
              code: typeof r.code === 'string' ? r.code : 'INTERNAL_ERROR',
              message: typeof r.message === 'string' ? r.message : 'Request failed.',
              details: r.details ?? null,
              requestId,
            },
          },
        };
      }
      if (typeof response === 'string') {
        return {
          status,
          body: {
            error: {
              code: this.statusToCode(status),
              message: response,
              details: null,
              requestId,
            },
          },
        };
      }
      return {
        status,
        body: {
          error: {
            code: this.statusToCode(status),
            message: exception.message || 'Request failed.',
            details: null,
            requestId,
          },
        },
      };
    }
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      body: {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Beklenmeyen bir hata oluştu.',
          details: null,
          requestId,
        },
      },
    };
  }

  private statusToCode(status: number): string {
    switch (status) {
      case 400:
        return 'VALIDATION_ERROR';
      case 401:
        return 'AUTH_UNAUTHENTICATED';
      case 403:
        return 'AUTH_PERMISSION_DENIED';
      case 404:
        return 'NOT_FOUND';
      case 409:
        return 'CHECKOUT_QUOTE_EXPIRED';
      case 422:
        return 'VALIDATION_ERROR';
      case 429:
        return 'RATE_LIMITED';
      default:
        return 'INTERNAL_ERROR';
    }
  }
}
