/**
 * Browser-safe request / correlation IDs for the API client.
 * Avoids pulling `@fastfood/observability` (AsyncLocalStorage / Pino) into
 * Next.js client bundles.
 */

export interface ClientRequestContext {
  requestId: string;
  correlationId: string;
}

function mintId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `01900000-0000-7000-8000-${Date.now().toString(16).padStart(12, '0').slice(-12)}`;
}

export function generateRequestId(): string {
  return mintId();
}

export function startRequestContext(input?: {
  requestId?: string;
  correlationId?: string;
}): ClientRequestContext {
  return {
    requestId: input?.requestId ?? mintId(),
    correlationId: input?.correlationId ?? mintId(),
  };
}
