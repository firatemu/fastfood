import 'reflect-metadata';

import { API_PREFIX } from '@fastfood/contracts';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { SwaggerModule } from '@nestjs/swagger';

import { AppModule, AppExceptionFilter } from './app.module.js';
import { getAppConfig } from './bootstrap/app-config.js';
import { buildOpenApiDocument } from './bootstrap/openapi-document.js';

/**
 * FASTFOOD API entry point. Phase 0 boots the modular monolith foundation
 * with Fastify, /api/v1 global prefix, OpenAPI generation, canonical error
 * envelope, request ID propagation, and structured logging.
 *
 * Document 03 §5 — Fastify is the only HTTP adapter.
 * Document 17 §1 / Document 40 — every public endpoint is versioned under `/api/v1`.
 * Document 45 — structured Pino logging.
 * Document 40 — error envelope + request ID propagation.
 */
async function bootstrap(): Promise<void> {
  const cfg = getAppConfig();
  const fastifyAdapter = new FastifyAdapter({
    trustProxy: true,
    bodyLimit: 14 * 1024 * 1024, // 10 MB image + base64 overhead
    logger: false,
    // NestJS owns the canonical X-Request-Id middleware and our own logger
    // already records requestId via the AsyncLocalStorage-backed context
    // (document 45 §2/§3), so we let Fastify log only its own structural
    // fields without a duplicated label. Avoids FastifyDep-024.
  });

  const app = await NestFactory.create<NestFastifyApplication>(AppModule, fastifyAdapter, {
    bufferLogs: false,
  });

  // Canonical API versioning (document 17 §1). Health and OpenAPI endpoints
  // stay outside the prefix because Kubernetes/HAProxy/Sidecar probes and the
  // OpenAPI tooling/UI must reach fixed unauthenticated paths.
  // Exclusion entries MUST start with `/` — Nest's `isRouteExcluded` calls
  // `addLeadingSlash(path)` against the route but the regex is matched
  // against the slashed form, so an unprefixed `health` pattern fails to
  // match `/health/live`. The `/{*splat}` form is required because
  // path-to-regexp@8 rejects the legacy `*` and `(.*)` syntax.
  app.setGlobalPrefix(API_PREFIX, {
    exclude: ['/health/{*splat}', '/api/docs/{*splat}', '/api/docs-json'],
  });

  // Validation is performed by project-owned Zod pipes (@fastfood/validation).
  // We deliberately do not install class-validator or attach Nest's built-in
  // ValidationPipe to avoid duplicating schema definitions (document 03 §5).
  app.useGlobalFilters(new AppExceptionFilter());

  // CORS for development storefront/admin origins. Document 44 §8.
  const origins = cfg.API_CORS_ORIGINS.split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  app.enableCors({
    origin: origins.length > 0 ? origins : true,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Request-Id',
      'X-Correlation-Id',
      'Idempotency-Key',
      'X-Session-Id',
      'X-User-Id',
    ],
  });

  // Nest 12's `RoutesResolver.registerNotFoundHandler()` (called inside
  // `init()`) already wires a 404 handler that funnels through the global
  // `AppExceptionFilter` and emits the canonical error envelope (document 40 §4).
  // We deliberately do NOT call `setNotFoundHandler` here — Nest 12 throws
  // "Not found handler already set" if it is invoked a second time.

  const document = buildOpenApiDocument(app);
  // OpenAPI UI stays outside /api/v1 for the same operational reason as
  // health endpoints (document 40 §9, document 45 §6).
  SwaggerModule.setup('api/docs', app, document);

  await app.listen({ host: cfg.API_HOST, port: cfg.API_PORT });
  new Logger('Bootstrap').log(
    `FASTFOOD API listening on http://${cfg.API_HOST}:${cfg.API_PORT}${API_PREFIX}`,
  );
}

bootstrap().catch((error) => {
  console.error('Fatal startup error', error);
  process.exit(1);
});
