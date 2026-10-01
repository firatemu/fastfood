/**
 * Canonical API client. All web and mobile apps use this instead of bespoke
 * fetch wrappers so response envelope, error handling, and request IDs stay
 * consistent across the product.
 *
 * Documents 17 + 40.
 *
 * Request IDs are minted locally (see `request-ids.ts`) so the client stays
 * safe to import from Next.js / Expo UI bundles without Node-only
 * observability dependencies.
 */
import { errorEnvelopeSchema, type ErrorEnvelope } from '@fastfood/contracts';
import type { z } from 'zod';

import {
  generateRequestId,
  startRequestContext,
  type ClientRequestContext,
} from './request-ids.js';

export interface ApiClientConfig {
  baseUrl: string;
  /** Bearer access token source. Called before every request. */
  getAccessToken?: () => string | undefined | Promise<string | undefined>;
  /** Logger used for diagnostic logging. */
  logger?: {
    error: (fields: Record<string, unknown>, message: string) => void;
  };
  /** Optional default headers. */
  defaultHeaders?: Record<string, string>;
  /** Network timeout in ms. */
  timeoutMs?: number;
  /** Optional fetch implementation (for tests/SSR). */
  fetchImpl?: typeof fetch;
}

export class ApiError extends Error {
  readonly envelope: ErrorEnvelope;
  readonly status: number;
  constructor(status: number, envelope: ErrorEnvelope) {
    super(envelope.error.message);
    this.name = 'ApiError';
    this.status = status;
    this.envelope = envelope;
  }
}

export class ApiNetworkError extends Error {
  override readonly cause: unknown;
  constructor(message: string, cause: unknown) {
    super(message);
    this.name = 'ApiNetworkError';
    this.cause = cause;
  }
}

export class ApiTimeoutError extends Error {
  constructor() {
    super('API request timed out');
    this.name = 'ApiTimeoutError';
  }
}

export interface ApiRequestOptions<TBody, TResponseSchema extends z.ZodTypeAny> {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  path: string;
  body?: TBody;
  query?: Record<string, string | number | boolean | undefined>;
  schema: TResponseSchema;
  /** Optional idempotency key (POST/PATCH endpoints that support it). */
  idempotencyKey?: string;
  /** Optional parent request context for correlation propagation. */
  context?: ClientRequestContext;
  /** Extra headers merged for this request (e.g. X-Session-Id for guest cart). */
  headers?: Record<string, string>;
}

function buildUrl(
  baseUrl: string,
  path: string,
  query?: ApiRequestOptions<unknown, z.ZodTypeAny>['query'],
): string {
  // Keep `/api/v1` (or any base path) when joining. Absolute paths starting
  // with `/` would otherwise replace the entire URL pathname.
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  const relativePath = path.replace(/^\//, '');
  const url = new URL(relativePath, normalizedBase);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined) continue;
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

export class ApiClient {
  private readonly config: Required<Pick<ApiClientConfig, 'timeoutMs'>> & ApiClientConfig;
  private readonly fetchImpl: typeof fetch;

  constructor(config: ApiClientConfig) {
    this.config = { timeoutMs: 30_000, ...config };
    this.fetchImpl = config.fetchImpl ?? globalThis.fetch.bind(globalThis);
  }

  async request<TBody, TSchema extends z.ZodTypeAny>(
    options: ApiRequestOptions<TBody, TSchema>,
  ): Promise<z.infer<TSchema>> {
    const url = buildUrl(this.config.baseUrl, options.path, options.query);
    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...this.config.defaultHeaders,
      ...options.headers,
    };
    const ctx = options.context ?? startRequestContext();
    headers['X-Request-Id'] = ctx.requestId;
    headers['X-Correlation-Id'] = ctx.correlationId;
    if (options.idempotencyKey) headers['Idempotency-Key'] = options.idempotencyKey;

    const accessToken = await this.config.getAccessToken?.();
    if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

    let bodyPayload: string | undefined;
    if (options.body !== undefined) {
      headers['Content-Type'] = 'application/json';
      bodyPayload = JSON.stringify(options.body, (_key, value) =>
        typeof value === 'bigint' ? value.toString() : value,
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);

    let response: Response;
    try {
      response = await this.fetchImpl(url, {
        method: options.method ?? (bodyPayload ? 'POST' : 'GET'),
        headers,
        ...(bodyPayload !== undefined ? { body: bodyPayload } : {}),
        signal: controller.signal,
      });
    } catch (error) {
      if ((error as { name?: string }).name === 'AbortError') {
        throw new ApiTimeoutError();
      }
      throw new ApiNetworkError('API request failed', error);
    } finally {
      clearTimeout(timeout);
    }

    if (response.status === 204) {
      return options.schema.parse(undefined) as z.infer<TSchema>;
    }

    let raw: unknown;
    try {
      raw = await response.json();
    } catch {
      throw new ApiError(response.status, {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'API returned a non-JSON response.',
          requestId: ctx.requestId,
        },
      });
    }

    if (!response.ok) {
      const parsed = errorEnvelopeSchema.safeParse(raw);
      const envelope: ErrorEnvelope = parsed.success
        ? parsed.data
        : {
            error: {
              code: 'INTERNAL_ERROR',
              message: 'API returned an unrecognized error envelope.',
              requestId: ctx.requestId,
            },
          };
      throw new ApiError(response.status, envelope);
    }

    const parsed = options.schema.safeParse(raw);
    if (!parsed.success) {
      this.config.logger?.error(
        { requestId: ctx.requestId, issues: parsed.error.issues },
        'API response failed schema validation',
      );
      throw new ApiError(response.status, {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'API returned a payload that did not match the shared contract.',
          requestId: ctx.requestId,
        },
      });
    }
    return parsed.data;
  }

  /** Convenience helper to mint a fresh request ID for outbound flows. */
  newRequestContext(): ClientRequestContext {
    return startRequestContext();
  }

  /** Build a fresh request ID string. */
  newRequestId(): string {
    return generateRequestId();
  }
}
