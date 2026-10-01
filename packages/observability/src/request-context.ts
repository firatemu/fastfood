import { AsyncLocalStorage } from 'node:async_hooks';

import type { CorrelationId, RequestId } from '@fastfood/domain-types';
import { asId } from '@fastfood/domain-types';
import { v7 as uuidv7 } from 'uuid';

/**
 * Per-request context propagated through HTTP, queue jobs, and downstream calls.
 * Stored in AsyncLocalStorage so log lines, audit events, and provider calls can
 * surface the same identifiers.
 */
export interface RequestContext {
  requestId: RequestId;
  correlationId: CorrelationId;
  actorId?: string;
  branchId?: string;
}

const storage = new AsyncLocalStorage<RequestContext>();

export function runWithRequestContext<T>(ctx: RequestContext, fn: () => T): T {
  return storage.run(ctx, fn);
}

export function getRequestContext(): RequestContext | undefined {
  return storage.getStore();
}

export function requireRequestContext(): RequestContext {
  const ctx = storage.getStore();
  if (!ctx) {
    throw new Error('Request context is not active. wrap call in runWithRequestContext().');
  }
  return ctx;
}

export function generateRequestId(): RequestId {
  return asId<RequestId>(uuidv7());
}

export function generateCorrelationId(): CorrelationId {
  return asId<CorrelationId>(uuidv7());
}

/**
 * Build a fresh request context. When the caller provides a trusted request ID
 * header value (validated upstream), that value is reused; otherwise a fresh
 * UUIDv7 is generated.
 */
export function startRequestContext(input?: {
  requestId?: string;
  correlationId?: string;
  actorId?: string;
  branchId?: string;
}): RequestContext {
  return {
    requestId: input?.requestId ? asId<RequestId>(input.requestId) : generateRequestId(),
    correlationId: input?.correlationId
      ? asId<CorrelationId>(input.correlationId)
      : generateCorrelationId(),
    ...(input?.actorId !== undefined ? { actorId: input.actorId } : {}),
    ...(input?.branchId !== undefined ? { branchId: input.branchId } : {}),
  };
}
