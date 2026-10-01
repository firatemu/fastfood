import { asId, type RequestId } from '@fastfood/domain-types';
import { runWithRequestContext, startRequestContext } from '@fastfood/observability';
import { Injectable, type NestMiddleware } from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';

/**
 * Foundation request middleware — establishes the per-request context used by
 * the structured logger, audit metadata, and downstream queue jobs.
 *
 * Phase 0 does not yet perform auth, but the hook is here so feature code
 * can rely on a stable request ID from day one.
 */
@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(
    req: FastifyRequest['raw'] & { id?: string },
    res: FastifyReply['raw'],
    next: () => void,
  ): void {
    const incomingRequestId = req.headers['x-request-id'];
    const incomingCorrelationId = req.headers['x-correlation-id'];
    const headerValue = Array.isArray(incomingRequestId) ? incomingRequestId[0] : incomingRequestId;
    const corrValue = Array.isArray(incomingCorrelationId)
      ? incomingCorrelationId[0]
      : incomingCorrelationId;
    const ctx = startRequestContext({
      requestId: headerValue,
      correlationId: corrValue,
    });
    res.setHeader('X-Request-Id', ctx.requestId);
    res.setHeader('X-Correlation-Id', ctx.correlationId);
    runWithRequestContext(ctx, () => next());
    // Suppress unused vars warning while keeping type signatures honest.
    void asId<RequestId>(ctx.requestId);
  }
}
